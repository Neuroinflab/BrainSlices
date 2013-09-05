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
import json
import subprocess
import tempfile

from optparse import OptionParser

def ensureDirPath(directory):
  if not os.path.exists(directory):
    os.makedirs(directory)

def ensureDir(directory):
  if not os.path.exists(directory):
    os.mkdir(directory)

directoryName = os.path.abspath(os.path.dirname(__file__))
class CorruptedImageError(Exception):
  pass

class imageTiler(object):
  def __init__(self, filename, imageRes, threads = 1, limit = 512*1024*1024):
    self.filename = filename
    self.imageRes = imageRes
    self.invalid = None

    if (threads <= 0):
      raise ValueError("Number of threads must be positive.")

    if (limit < 0):
      raise ValueError("Memory limit must be non negative number.")

    self.threads = threads
    self.limit = limit

    self.tmpfile = tempfile.NamedTemporaryFile(dir='/tmp',
                                               prefix='SkwarkiTiledImage_',
                                               suffix='.raw')

  def tileStack(self, destDir, tileWidth, tileHeight, imageLeft = 0., imageTop = 0., jpgQuality = None):
    # identify an image...
    try:
      self.identify()

    except:
      print "ERROR:"
      print self.invalid
      raise

    # ...and rip the RGB data

    # suggested ImageMagick 6.6.9-7
    stream =  ['stream']
    stream += ['-map', 'rgb']
    stream += ['-storage-type', 'char']
    stream += ['-regard-warnings']
    stream += [self.filename, self.tmpfile.name]

    print ' '.join(stream)

    processStream = subprocess.Popen(stream, stderr = subprocess.PIPE)

    pStdOut, pStdErr = processStream.communicate()
    if processStream.returncode != 0:
      self.invalid = pStdErr
      print pStdErr

    maxZoomLevel = int(math.ceil(math.log(max(float(self.imageWidth) / tileWidth,
                                              float(self.imageHeight) / tileHeight), 2)))
    ensureDirPath(destDir)
  
    fh = open(os.path.join(destDir, 'info.json'), 'w')
    json.dump({'status': True,
               'logged': False,
               'message': None,
               'data': {'imageWidth': self.imageWidth,
                        'imageHeight': self.imageHeight,
                        'pixelSize': self.imageRes,
                        'imageLeft': imageLeft,
                        'imageTop': imageTop,
                        'tileWidth': tileWidth,
                        'tileHeight': tileHeight}}, fh)
    fh.close()
  
    for zoomLevel in xrange(maxZoomLevel + 1):
      print zoomLevel
      zoomLevelPath = os.path.join(destDir, "tiles", "%d" % zoomLevel)
      scaleFactor = 0.5 ** (maxZoomLevel - zoomLevel)
      self.tile(zoomLevelPath,
                tileWidth,
                tileHeight,
                scaleFactor,
                quality = jpgQuality)

    # create image containing the original bitmap
    raw2png = [os.path.join(directoryName, 'imageProcessing', 'raw2png')]
    raw2png += ['-size', str(self.imageWidth), str(self.imageHeight)]
    raw2png += ['-compression', '9', '-rle']
    raw2png += ['-limit', str(self.limit / 4)] # just for safety
    raw2png += ['-src', self.tmpfile.name]
    raw2png += ['-dst', os.path.join(destDir, 'image.png')]
    process2png = subprocess.Popen(raw2png)
    process2png.wait()

  def identify(self):
    identify = ['identify', '-regard-warnings']
    identify += ['-format', '%w %h']
    identify += [self.filename]

    processIdentify = subprocess.Popen(identify,
                                       stdout = subprocess.PIPE,
                                       stderr = subprocess.PIPE)
    pStdOut, pStdErr = processIdentify.communicate()

#   if processIdentify.returncode != 0:
#     raise CorruptedImageError, pStdErr  

    try:
      self.imageWidth, self.imageHeight = map(int, pStdOut.split())

    except ValueError:
      self.invalid = pStdErr
      if processIdentify.returncode != 0:
        raise CorruptedImageError, pStdErr

      else:
        raise

    except:
      self.invalid = pStdErr
      raise
  
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
    tile += ['-src', self.tmpfile.name]

    if quality != None:
      tile += ['-quality', str(quality)]

    print ' '.join(tile)

    processTile = subprocess.Popen(tile)
    processTile.wait()


def tileImage(filename, tileWidth, tileHeight, imageRes, destDir, imageLeft = 0., imageTop = 0., jpgQuality = None):
  tiler = imageTiler(filename, imageRes)
  tiler.tileStack(destDir, tileWidth, tileHeight, imageLeft, imageTop, jpgQuality)
  return tiler.invalid

if __name__ == '__main__':
  usage = "Usage: %prog [options] <filename> <destination>"
  parser = OptionParser(usage=usage)
  parser.add_option('-x', '--width', action='store', type='int', dest='width',
                    default=256, help='tile width')
  parser.add_option('-y', '--height', action='store', type='int', dest='height',
                    default=256, help='tile height')
  parser.add_option('-X', '--left', action='store', type='float', dest='left',
                    default=0., help='left offset [um]')
  parser.add_option('-Y', '--top', action='store', type='float', dest='top',
                    default=0., help='top offset [um]')
  parser.add_option('-p', '--pixel', action='store', type='float',
                    dest='pixel', default=None, help='pixel size [um]')
  parser.add_option('-r', '--res', '--dpi', action='store', type='float',
                    dest='dpi', default=72.,help='image resolution [DPI]')
  parser.add_option('-q', '--quality', action='store', type='int',
                    dest='quality', default=None, help='JPG quality')
  parser.add_option('-t', '--threads', action='store', type='int',
                    dest='threads', default=1, help='Number of threads')
  parser.add_option('-l', '--limit', action='store', type='int',
                    dest='limit', default=512*1024*1024, help='Memory limit')
  options, args = parser.parse_args()

  if len(args) != 2:
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

  if options.dpi <= 0:
    sys.stderr.write("Error: image resolution must be positive.\n")
    exit()

  if options.pixel != None and options.pixel <= 0:
    sys.stderr.write("Error: pixel size must be positive.\n")
    exit()

  filename = args[0]
  imageRes = options.pixel if options.pixel != None else 25400. / options.dpi
  destDir = args[1]


  sys.exit(tileImage(filename, options.width, options.height, imageRes,
                     destDir, options.left, options.top, options.quality))
