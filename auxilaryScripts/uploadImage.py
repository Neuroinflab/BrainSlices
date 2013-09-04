#!/usr/bin/python
# -*- coding: utf-8 -*-

import os
import sys

import zlib

from optparse import OptionParser

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__),
                                             '../server')))

from database import db
from tileBase import TileBase, UploadSlot

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
  slot = UploadSlot(uploadDirectory)
  ifh = open(srcFilename, "rb")
  for data in ifh:
    slot.write(data)

  iid = tb.appendSlot(uid, slot, srcFilename, bid = bid, launch = False)

  ifh.close()
  slot.close()
  return iid

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
