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

import zlib
import hashlib

from optparse import OptionParser

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__),
                                             '../server')))

from database import db
from tileBase import TileBase

#redundant with tileImageDB.py
def ensureDirPath(directory):
  if not os.path.exists(directory):
    os.makedirs(directory)

def ensureDir(directory):
  if not os.path.exists(directory):
    os.mkdir(directory)

#TODO change when moved to server directory 
uploadDirectory = os.path.abspath(os.path.join(os.path.dirname(__file__),
                                  '../server/uploadSlots'))
sourceDirectory = os.path.abspath(os.path.join(os.path.dirname(__file__),
                                  '../server/sourceImages'))
tileDirectory = os.path.abspath(os.path.join(os.path.dirname(__file__),
                                  '../server/tiles'))

tb = TileBase(db, tileDirectory, sourceDirectory)

def uploadImage(uid, srcFilename, bid = None):
  ifh = open(srcFilename, "rb")
  md5 = hashlib.md5()
  size = 0
  for data in ifh:
    md5.update(data)
    size += len(data)

  slot = tb.UploadSlot(uid, filename=srcFilename, bid=bid, declared_size = size,
                       declared_md5 = md5.hexdigest())
  ifh.seek(0)
  for data in ifh:
    slot.write(data)

  ifh.close()
  slot.close(False)
  return slot.iid

if __name__ == '__main__':
  usage = "Usage: %prog [options] <uid> <filename> [<filename> ...]"
  parser = OptionParser(usage=usage)
  parser.add_option('-b', '--batch', '--bid',
                    action='store', type='int', dest='bid', default=None,
                    help='batch identifier')
  parser.add_option('-n', '--newbatch',
                    action='store', dest='newbatch', default=None,
                    type = 'string',
                    help='generate a new batch identifier')
  options, args = parser.parse_args()

  if len(args) < 2:
    parser.print_help()
    exit()

  uid = int(args[0])
  if options.newbatch != None:
    bid = tb.newBatch(uid, options.newbatch)

  else:
    bid = options.bid

  if bid != None:
    print 'Batch ID:', bid

  for filename in args[1:]:
    print filename, uploadImage(uid, filename, bid)
