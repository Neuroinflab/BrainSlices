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
import sys

import math
import subprocess

import zlib
import hashlib

from optparse import OptionParser

#TODO change when moved to server directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__),
                                             '../server')))

from database import db
from tileBase import TileBase, IMAGE_STATUS_RECEIVED, \
                     IMAGE_STATUS_PROCESSING, IMAGE_STATUS_IDENTIFIED, \
                     IMAGE_STATUS_TILED, IMAGE_STATUS_COMPLETED, \
                     IMAGE_STATUS_REMOVED, IMAGE_STATUS_ERROR

def ensureDirPath(directory):
  if not os.path.exists(directory):
    os.makedirs(directory)

def ensureDir(directory):
  if not os.path.exists(directory):
    os.mkdir(directory)

#TODO change when moved to server directory
directoryName = os.path.abspath(os.path.dirname(__file__))
serverDirectory = os.path.abspath(os.path.join(directoryName, '../server'))
sourceDirectory = os.path.join(serverDirectory, 'sourceImages')
tileDirectory = os.path.join(serverDirectory, 'tiles')
tb = TileBase(db, tileDirectory, sourceDirectory)

class CorruptedImageError(Exception):
  pass

class imageTiler(object):
  def __init__(self, iid, tileWidth = 256, tileHeight = 256, jpgQuality = None,
               threads = 1, limit = 512*1024*1024):
    self.iid = iid
    self.invalid = None
    self.filename = os.path.join('/tmp', 'SkwarkiTiledImage_%d.raw' % iid)
    self.source = os.path.join(tb.sourceDir, '%d' % self.iid)
    self.directory = os.path.join(tb.tileDir, '%d' % self.iid)
    self.tileWidth = tileWidth
    self.tileHeight = tileHeight
    self.jpgQuality = jpgQuality

    if (threads <= 0):
      raise ValueError("Number of threads must be positive.")

    if (limit < 0):
      raise ValueError("Memory limit must be non negative number.")

    self.threads = threads
    self.limit = limit

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
      raise KeyError("Source image #%d not found in processing queue. Image status = %s, source image status = %d." % (self.iid, status, source_status))

  def __identify(self):
    identify = ['identify', '-regard-warnings']
    identify += ['-format', '%w %h %m ---XRES---\n%x\n---YRES---\n%y\n---COLORSPACE---\n%[colorspace]\n---CHANNELS---\n%[channels]\n---LABEL---\n%l\n---COMMENT---\n%c\n---PROPERTIES---\n%[*]']
    identify += [self.source]

    print ' '.join(identify)

    processIdentify = subprocess.Popen(identify,
                                       stdout = subprocess.PIPE,
                                       stderr = subprocess.PIPE)
    pStdOut, pStdErr = processIdentify.communicate()

#   if processIdentify.returncode != 0:
#     raise CorruptedImageError, pStdErr  

    try:
      parts = pStdOut.split(' ', 3)
      # all bytes preserved as they are - bushes if not ASCII encoded ;-)
      self.magick = parts[2].decode('iso_8859_1').encode('utf-8')
      self.meta = parts[3].decode('iso_8859_1').encode('utf-8')
      self.imageWidth, self.imageHeight = map(int, parts[:2])

    except (ValueError, IndexError):
      self.invalid = pStdErr
      if processIdentify.returncode != 0:

        tb.identificationFailed(self.iid, self.invalid)

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

    # suggested ImageMagick 6.6.9-7
    stream =  ['stream']
    stream += ['-map', 'rgb']
    stream += ['-storage-type', 'char']
    stream += ['-regard-warnings']
    stream += [self.source, self.filename]

    print ' '.join(stream)

    processStream = subprocess.Popen(stream, stderr = subprocess.PIPE)

    pStdOut, pStdErr = processStream.communicate()
    if processStream.returncode != 0:
      self.invalid = pStdErr

    fh = open(self.filename, "rb")
    crc32 = 0
    #md5 = hashlib.md5()
    for line in fh:
      crc32 = zlib.crc32(line, crc32)
      #md5.update(line)

    fh.close()
    tb.imageIdentified(self.iid, self.imageWidth, self.imageHeight, crc32,
                       self.invalid, self.meta, self.magick)#, md5.hexdigest())

    # remove source file
    if os.path.exists(self.source):
      os.remove(self.source)

    self.__tileImage()

  def __tileImage(self):
    # tile the image
    maxZoomLevel = int(math.ceil(math.log(max(float(self.imageWidth) / self.tileWidth,
                                              float(self.imageHeight) / self.tileHeight), 2)))

    for zoomLevel in xrange(maxZoomLevel + 1):
      print zoomLevel
      zoomLevelPath = os.path.join(self.directory, "tiles", "%d" % zoomLevel)
      scaleFactor = 0.5 ** (maxZoomLevel - zoomLevel)
      self.tile(zoomLevelPath,
                self.tileWidth,
                self.tileHeight,
                scaleFactor,
                quality = self.jpgQuality)


    tb.imageTiled(self.iid, self.tileWidth, self.tileHeight)

    # create image containing the original bitmap
    self.__complete()

  def __complete(self):
    # create image containing the original bitmap
    raw2png = [os.path.join(directoryName, 'imageProcessing', 'raw2pngMD5')]
    raw2png += ['-size', str(self.imageWidth), str(self.imageHeight)]
    raw2png += ['-compression', '9', '-rle']
    raw2png += ['-limit', str(self.limit / 4)] # just for safety
    raw2png += ['-src', self.filename]
    raw2png += ['-dst', os.path.join(self.directory, 'image.png')]

    print ' '.join(raw2png)

    process2png = subprocess.Popen(raw2png, stdout = subprocess.PIPE)
    pStdOut, pStdErr = process2png.communicate()
    #process2png.wait()

    tb.imageCompleted(self.iid, md5 = pStdOut)
    os.remove(self.filename)
  
  def tile(self, destDir, tileWidth, tileHeight, scaleFactor = 1, quality = None):
    ensureDirPath(destDir)

    levelWidth = int(round(scaleFactor * self.imageWidth))
    levelHeight = int(round(scaleFactor * self.imageHeight))
    xTiles = int(math.ceil(levelWidth / float(tileWidth)))
    yTiles = int(math.ceil(levelHeight / float(tileHeight)))

    for x in xrange(xTiles):
      columnPath = os.path.join(destDir, '%d' % x)
      ensureDir(columnPath)

    tile =  [os.path.join(directoryName, 'imageProcessing', 'tileStreamedImageJPG')]
    tile += ['-size', str(self.imageWidth), str(self.imageHeight)]
    tile += ['-scale', str(levelWidth), str(levelHeight)]
    tile += ['-lanczos' if scaleFactor != 1 else '-box']
    tile += ['-limit', str(self.limit)]
    tile += ['-threads', str(self.threads)]
    tile += ['-tile', str(tileWidth), str(tileHeight)]
    tile += ['-pattern', os.path.join(destDir, '%X/%Y.jpg')]
    tile += ['-src', self.filename]

    if quality != None:
      tile += ['-quality', str(quality)]

    print ' '.join(tile)

    processTile = subprocess.Popen(tile)
    processTile.wait()


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
                    dest='limit', default=512*1024*1024, help='Memory limit')
  options, args = parser.parse_args()

  iids = set(int(x) for x in args)
  if options.bid != None:
    iids.update(set(tb.listBatchImages(options.bid)))

  if len(iids) == 0:
    parser.print_help()
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
