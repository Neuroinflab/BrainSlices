#!/usr/bin/python
# -*- coding: utf-8 -*-
###############################################################################
#                                                                             #
#    BrainSlices Software                                                     #
#                                                                             #
#    Copyright (C) 2012-2013 Jakub M. Kowalski                                #
#                                                                             #
#    This software is free software: you can redistribute it and/or modify    #
#    it under the terms of the GNU General Public License as published by     #
#    the Free Software Foundation, either version 3 of the License, or        #
#    (at your option) any later version.                                      #
#                                                                             #
#    This software is distributed in the hope that it will be useful,         #
#    but WITHOUT ANY WARRANTY; without even the implied warranty of           #
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the            #
#    GNU General Public License for more details.                             #
#                                                                             #
#    You should have received a copy of the GNU General Public License        #
#    along with this software.  If not, see http://www.gnu.org/licenses/.     #
#                                                                             #
###############################################################################

import os
import stat
import sys

import math
import subprocess

import zlib
import hashlib

from optparse import OptionParser

#TODO change when moved to server directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__),
                                             '../server')))

from database import db, dbPool
from tileBase import TileBase, IMAGE_STATUS_RECEIVED, \
                     IMAGE_STATUS_PROCESSING, IMAGE_STATUS_IDENTIFIED, \
                     IMAGE_STATUS_TILED, IMAGE_STATUS_COMPLETED, \
                     IMAGE_STATUS_REMOVED, IMAGE_STATUS_ERROR

BUFFER_SIZE = 128 * 1024

def ensureDirPath(directory):
  if not os.path.exists(directory):
    os.umask(stat.S_IRWXG | stat.S_IRWXO)
    os.makedirs(directory)

def ensureDir(directory):
  if not os.path.exists(directory):
    os.umask(stat.S_IRWXG | stat.S_IRWXO)
    os.mkdir(directory)

#TODO change when moved to server directory
directoryName = os.path.abspath(os.path.dirname(__file__))
serverDirectory = os.path.abspath(os.path.join(directoryName, '../server'))
sourceDirectory = os.path.join(serverDirectory, 'sourceImages')
tileDirectory = os.path.join(serverDirectory, 'tiles')
tb = TileBase(db, dbPool, tileDirectory, sourceDirectory)

class CorruptedImageError(Exception):
  pass

class StreamingError(Exception):
  pass

class imageTiler(object):
  def __init__(self, iid, tileWidth=256, tileHeight=256, jpgQuality=None,
               threads=1, limit=512*1024*1024, streamFiles=5,
               streamTimeout=60):
    self.iid = iid
    self.invalid = None
    self.filename = os.path.join('/tmp', 'SkwarkiTiledImage_%d.raw' % iid)
    self.source = os.path.join(tb.sourceDir, '%d' % self.iid)
    self.directory = os.path.join(tb.tileDir, '%d' % self.iid)
    self.tileWidth = tileWidth
    self.tileHeight = tileHeight
    self.jpgQuality = jpgQuality

    if threads <= 0:
      raise ValueError("Number of threads must be positive.")

    if limit < 0:
      raise ValueError("Memory limit must be non negative number.")

    if streamFiles < 0:
      raise ValueError("File limit must be non negative number.")

    if streamTimeout < 0:
      raise ValueError("Timeout must be non negative number.")

    self.threads = threads
    self.limit = limit
    self.streamFiles = streamFiles
    self.streamTimeout = streamTimeout

    self.magick = None
    self.meta = None

  def __del__(self):
    pass

  def tileStack(self, resume = False):
    status, self.imageWidth, self.imageHeight = tb.processingImage(self.iid)
    if status == IMAGE_STATUS_RECEIVED:
      self.__identify()
      return

    if status >= IMAGE_STATUS_COMPLETED:
      raise KeyError("Image #%d already completed - nothing to do." % self.iid)

    fixed = False
    if resume:
      fixed = True
      if status == IMAGE_STATUS_PROCESSING:
        self.__identify()

      elif status == IMAGE_STATUS_IDENTIFIED:
        self.__tileImage()

      elif status == IMAGE_STATUS_TILED:
        self.__complete()

      else:
        fixed = False

    if not fixed:
      raise KeyError("Source image #%d not found in processing queue. Image status = %s." % (self.iid, status))

  def __identify(self):
    # JPEG2000 walkaround
    fh = open(self.source, 'rb')
    magick = fh.read(10)
    fh.close()
    if magick == '\x00\x00\x00\x0cjP  \r\n':
      self.invalid = 'The format JPEG 2000 is not supported yet. Sorry.'
      tb.imageInvalid(self.iid, self.invalid)
      os.remove(self.source)
      raise NotImplementedError

    identify = ['identify', '-regard-warnings',
                '-units', 'PixelsPerInch',
                '-format', '%w %h %m %x %y ---COLORSPACE---\n%[colorspace]\n---CHANNELS---\n%[channels]\n---LABEL---\n%l\n---COMMENT---\n%c\n---PROPERTIES---\n%[*]',
                '-ping',
                self.source]

    print ' '.join(identify)

    processIdentify = subprocess.Popen(identify,
                                       stdout = subprocess.PIPE,
                                       stderr = subprocess.PIPE)
    pStdOut, pStdErr = processIdentify.communicate()

#   if processIdentify.returncode != 0:
#     raise CorruptedImageError, pStdErr  

    try:
      parts = pStdOut.split(' ', 7)
      # all bytes preserved as they are - bushes if not ASCII encoded ;-)
      self.magick = parts[2].decode('iso_8859_1').encode('utf-8')
      xps = 25400. / float(parts[3])
      yps = 25400. / float(parts[5])
      self.meta = parts[7].decode('iso_8859_1').encode('utf-8')
      self.imageWidth, self.imageHeight = map(int, parts[:2])

      if not tb.setSize(self.iid, self.imageWidth, self.imageHeight):
        # remove source file
        if os.path.exists(self.source): # XXX: rethink that - might be wise to
          os.remove(self.source)        # keep the file for further processing

        return

    except (ValueError, IndexError):
      self.invalid = pStdErr
      if processIdentify.returncode != 0:

        tb.imageInvalid(self.iid, self.invalid)

        # remove source file
        if os.path.exists(self.source):
          os.remove(self.source)

        raise CorruptedImageError(pStdErr)

      else:
        raise

    except:
      self.invalid = pStdErr
      raise

    # ...and rip the RGB data

    stream = ['bash',os.path.join(directoryName, 'streamImage.sh'),
              self.source, self.filename,
              str(int(self.limit / 1000)), str(self.threads),
              str(self.streamFiles), str(self.streamTimeout)]

    ## suggested ImageMagick 6.6.9-7
    #stream =  ['stream']
    #stream += ['-map', 'rgb']
    #stream += ['-storage-type', 'char']
    #stream += ['-regard-warnings']
    #stream += [self.source, self.filename]

    print ' '.join(stream)

    os.umask(stat.S_IRWXG | stat.S_IRWXO | stat.S_IXUSR | stat.S_IWUSR)
    processStream = subprocess.Popen(stream, stderr = subprocess.PIPE)
    pStdOut, pStdErr = processStream.communicate()

    if processStream.returncode != 0:
      self.invalid = pStdErr
      if not os.path.exists(self.filename) or\
         os.path.getsize(self.filename) == 0:
        os.remove(self.source)
        if os.path.exists(self.filename):
          os.remove(self.filename)

        tb.imageInvalid(self.iid, self.invalid)

        raise StreamingError(pStdErr)

    fh = open(self.filename, "rb")
    crc32 = 0
    #md5 = hashlib.md5()
    line = fh.read(BUFFER_SIZE) #readline does not work well with lines 2GiB+
    while line:
      crc32 = zlib.crc32(line, crc32)
      #md5.update(line)
      line = fh.read(BUFFER_SIZE)

    fh.close()

    tb.imageIdentified(self.iid, crc32,
                       self.invalid, self.meta, self.magick) #, md5 = md5.hexdigest())

    # setting default metadata
    pixelSize, imageTop, imageLeft = tb.getMetadata(self.iid)
    toUpdate = {'pixelSizeX' : xps, 'pixelSizeY': yps}
    if pixelSize is None:
      pixelSize = xps #math.sqrt(xps * yps)
      toUpdate['pixelSize'] = pixelSize

    if imageTop is None:
      toUpdate['imageTop'] = -0.5 * pixelSize * self.imageHeight

    if imageLeft is None:
      toUpdate['imageLeft'] = -0.5 * pixelSize * self.imageWidth

    tb.updateMetadata(self.iid, **toUpdate)


    # remove source file
    if os.path.exists(self.source):
      os.remove(self.source)

    self.__tileImage()

  def __tileImage(self):
    # tile the image
    maxZoomLevel = int(math.ceil(math.log(max(float(self.imageWidth) / self.tileWidth,
                                              float(self.imageHeight) / self.tileHeight), 2)))
    jpegSize = 0

    tilePath = os.path.join(self.directory, 'tiles')
    for zoomLevel in xrange(maxZoomLevel + 1):
      print zoomLevel
      zoomLevelPath = os.path.join(tilePath, "%d" % zoomLevel)
      scaleFactor = 0.5 ** (maxZoomLevel - zoomLevel)
      jpegSize += self.tile(zoomLevelPath,
                            self.tileWidth,
                            self.tileHeight,
                            scaleFactor,
                            quality = self.jpgQuality)

    os.chmod(tilePath, stat.S_IXUSR | stat.S_IRUSR)
    tb.imageTiled(self.iid, self.tileWidth, self.tileHeight,
                  jpegSize = jpegSize)

    # create image containing the original bitmap
    self.__complete()

  def __complete(self):
    # create image containing the original bitmap
    pngPath = os.path.join(self.directory, 'image.png')
    raw2png = [os.path.join(directoryName, 'imageProcessing', 'raw2pngMD5'),
               '-size', str(self.imageWidth), str(self.imageHeight),
               '-compression', '9', '-rle',
               '-limit', str(self.limit / 4), # just for safety
               '-src', self.filename,
               '-dst', pngPath]

    print ' '.join(raw2png)

    os.umask(stat.S_IRWXG | stat.S_IRWXO | stat.S_IXUSR | stat.S_IWUSR)
    process2png = subprocess.Popen(raw2png, stdout = subprocess.PIPE)
    pStdOut, pStdErr = process2png.communicate()
    os.chmod(self.directory, stat.S_IXUSR | stat.S_IRUSR)
    #process2png.wait()

    pngSize = os.path.getsize(pngPath)

    tb.imageCompleted(self.iid, pngSize = pngSize, md5 = pStdOut)
    os.remove(self.filename)
  
  def tile(self, destDir, tileWidth, tileHeight, scaleFactor = 1, quality = None):

    levelWidth = int(round(scaleFactor * self.imageWidth))
    levelHeight = int(round(scaleFactor * self.imageHeight))
    xTiles = int(math.ceil(levelWidth / float(tileWidth)))
    yTiles = int(math.ceil(levelHeight / float(tileHeight)))

    ensureDirPath(destDir)
    for x in xrange(xTiles):
      columnPath = os.path.join(destDir, '%d' % x)
      ensureDir(columnPath)

    os.chmod(destDir, stat.S_IXUSR | stat.S_IRUSR)
    tile =  [os.path.join(directoryName, 'imageProcessing', 'tileStreamedImageJPG'),
             '-size', str(self.imageWidth), str(self.imageHeight),
             '-scale', str(levelWidth), str(levelHeight),
             '-lanczos' if scaleFactor != 1 else '-box',
             '-limit', str(self.limit),
             '-threads', str(self.threads),
             '-tile', str(tileWidth), str(tileHeight),
             '-pattern', os.path.join(destDir, '%X/%Y.jpg'),
             '-src', self.filename]

    if quality != None:
      tile += ['-quality', str(quality)]

    print ' '.join(tile)

    os.umask(stat.S_IRWXG | stat.S_IRWXO | stat.S_IXUSR | stat.S_IWUSR)
    processTile = subprocess.Popen(tile)
    processTile.wait()

    jpegSize = 0
    for x in xrange(xTiles):
      columnPath = os.path.join(destDir, '%d' % x)
      os.chmod(columnPath, stat.S_IXUSR | stat.S_IRUSR)
      for y in xrange(yTiles):
        jpegSize += os.path.getsize(os.path.join(columnPath, '%d.jpg' % y))

    return jpegSize


def tileImage(iid, tileWidth, tileHeight, jpgQuality = None, resume = False,
              threads = 1, limit = 512*1024*1024):
  tiler = imageTiler(iid, tileWidth, tileHeight, jpgQuality,
                     threads = threads, limit = limit)
  tiler.tileStack(resume = resume)

if __name__ == '__main__':
  usage = "Usage: %prog [options] [<image id> [<image id> ...]]"
  parser = OptionParser(usage=usage)
  parser.add_option('-b', '--batch', '--bid',
                    action='store', type='int', dest='bid', default=None,
                    help='batch identifier')
  parser.add_option('-x', '--width', action='store', type='int', dest='width',
                    default=256, help='tile width')
  parser.add_option('-y', '--height', action='store', type='int', dest='height',
                    default=256, help='tile height')
  parser.add_option('-q', '--quality', action='store', type='int',
                    dest='quality', default=None, help='JPG quality')
  parser.add_option('-r', '--resume', action='store_true',
                    dest='resume', default=False, help='resume previously failed processing')
  parser.add_option('-t', '--threads', action='store', type='int',
                    dest='threads', default=1, help='Number of threads')
  parser.add_option('-l', '--limit', action='store', type='int',
                    dest='limit', default=512*1024*1024, help='Memory limit [B]')
  parser.add_option('--timeout', action='store', type='int',
                    dest='timeout', default=60, help='Stream timeout [s]')
  parser.add_option('-f', '--files', action='store', type='int',
                    dest='files', default=60, help='Stream file limit')
  options, args = parser.parse_args()

  iids = set(int(x) for x in args)
  if options.bid != None:
    iids.update(set(tb.listBatchImages(options.bid)))

  if len(iids) == 0:
    parser.print_help()
    exit()

  if options.files < 0:
     sys.stderr.write("Error: file limit mustn't be negative.\n")
     exit()

  if options.timeout < 0:
    sys.stderr.write("Error: timeout mustn't be negative.\n")
    exit()

  if options.threads <= 0:
    sys.stderr.write("Error: number of threads must be positive.\n")
    exit()

  if options.limit < 0:
    sys.stderr.write("Error: memory limit mustn't be negative.\n")
    exit()

  if options.quality != None and (options.quality < 0 or options.quality > 100):
    sys.stderr.write("Error: quality must be within range [0, 100].\n")
    exit()

  if options.height <= 0:
    sys.stderr.write("Error: tile height must be positive.\n")
    exit()

  if options.width <= 0:
    sys.stderr.write("Error: tile width must be positive.\n")
    exit()

  for iid in sorted(iids):
    tileImage(iid, options.width, options.height, options.quality, options.resume, options.threads, options.limit)
