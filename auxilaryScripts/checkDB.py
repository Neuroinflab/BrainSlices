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

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__),
                                             '../server')))
from database import db
from tileBase import IMAGE_STATUS_COMPLETED

def checkTiledLayer(directory, imageWidth, imageHeight, tileWidth, tileHeight, scaleFactor):
  result = True
  levelWidth = int(round(scaleFactor * imageWidth))
  levelHeight = int(round(scaleFactor * imageHeight))
  xTiles = int(math.ceil(levelWidth / float(tileWidth)))
  yTiles = int(math.ceil(levelHeight / float(tileHeight)))

  for x in xrange(xTiles):
    columnPath = os.path.join(directory, '%d' % x)

    for y in xrange(yTiles):
      checkPath = os.path.join(columnPath, '%d.jpg' % y)
      if not os.path.exists(checkPath):
        result = False
        print "ERROR: %s not found" % checkPath

  return result

def checkImages(directory, imageWidth, imageHeight, tileWidth, tileHeight):
  result = True
  checkPath = os.path.join(directory, 'image.png')
  if not os.path.exists(checkPath):
    result = False
    print "ERROR: %s not found" % checkPath

  maxZoomLevel = int(math.ceil(math.log(max(float(imageWidth) / tileWidth,
                                            float(imageHeight) / tileHeight), 2)))

  for zoomLevel in xrange(maxZoomLevel + 1):
    zoomLevelPath = os.path.join(directory, "tiles", "%d" % zoomLevel)
    scaleFactor = 0.5 ** (maxZoomLevel - zoomLevel)
    if not checkTiledLayer(zoomLevelPath, imageWidth, imageHeight, tileWidth, tileHeight, scaleFactor):
      result = False

  return result


def checkStaticImages(directory):
  filename = os.path.join(directory, 'info.json')
  if not os.path.exists(filename):
    print "ERROR: %s not found" % filename
    return False

#   fh = open(os.path.join(destDir, 'info.json'), 'w')
#   json.dump({'status': True,
#              'logged': False,
#              'message': None,
#              'data': {'imageWidth': self.imageWidth,
#                       'imageHeight': self.imageHeight,
#                       'pixelSize': self.imageRes,
#                       'imageLeft': imageLeft,
#                       'imageTop': imageTop,
#                       'tileWidth': tileWidth,
#                       'tileHeight': tileHeight}}, fh)
#   fh.close()
  
  fh = open(os.path.join(directory, 'info.json'))
  data = json.load(fh)['data']
  fh.close()
  return checkImages(directory, data['imageWidth'], data['imageHeight'],
                     data['tileWidth'], data['tileHeight'])

def checkTestTiles(directory):
  result = True
  for setName in os.listdir(directory):
    setPath = os.path.join(directory, setName)
    for subsetName in os.listdir(setPath):
      if not checkStaticImages(os.path.join(setPath, subsetName)):
        result = False

  return result

def checkTiles(directory):
  result = True
  cursor = db.cursor()
  cursor.execute("""
                 SELECT iid, "imageWidth", "imageHeight", "tileWidth",
                 "tileHeight"
                 FROM images
                 WHERE status >= %s
                 """ % IMAGE_STATUS_COMPLETED)
  for row in cursor:
    if not checkImages(os.path.join(directory, "%d" % row[0]), *row[1:]):
      result = False

  cursor.close()
  return result

if __name__ == '__main__':
  if len(sys.argv) != 2:
    print "USAGE: %s <service path>" % sys.argv[0]
    exit()

  if checkTestTiles(os.path.join(sys.argv[1], 'testTiles')):
    print "testTiles OK :)"

  if checkTiles(os.path.join(sys.argv[1], 'tiles')):
    print "tiles OK :)"
