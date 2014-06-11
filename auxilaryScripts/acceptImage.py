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

import sys
import os

from optparse import OptionParser

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__),
                                             '../server')))

from database import db, dbPool
from tileBase import TileBase

#TODO change when moved to server directory
directoryName = os.path.abspath(os.path.dirname(__file__))
serverDirectory = os.path.abspath(os.path.join(directoryName, '../server'))
sourceDirectory = os.path.join(serverDirectory, 'sourceImages')
tileDirectory = os.path.join(serverDirectory, 'tiles')
tb = TileBase(db, dbPool, tileDirectory, sourceDirectory)

def acceptImage(uid, iid, imageRes, imageLeft = 0., imageTop = 0.):
  tb.acceptImage(uid, iid, imageRes, imageLeft, imageTop)

if __name__ == '__main__':
  usage = "Usage: %prog [options] <user id> [<image id> [<image id> ...]]"
  parser = OptionParser(usage=usage)
  parser.add_option('-b', '--batch', '--bid',
                    action='store', type='int', dest='bid', default=None,
                    help='batch identifier')
  parser.add_option('-X', '--left', action='store', type='float', dest='left',
                    default=0., help='left offset [um]')
  parser.add_option('-Y', '--top', action='store', type='float', dest='top',
                    default=0., help='top offset [um]')
  parser.add_option('-p', '--pixel', action='store', type='float',
                    dest='pixel', default=None, help='pixel size [um]')
  parser.add_option('-r', '--res', '--dpi', action='store', type='float',
                    dest='dpi', default=72.,help='image resolution [DPI]')
  parser.add_option('-c', '--comment', action='store', type='string',
                    dest='comment', default=None, help='batch comment')
  options, args = parser.parse_args()

  if len(args) < 1:
    parser.print_help()
    exit()

  uid = int(args[0])

  iids = set(int(x) for x in args[1:])
  if options.bid != None:
    iids.update(set(tb.listBatchImages(options.bid)))
    tb.closeBatch(uid, options.bid, options.comment)

  if len(iids) == 0:
    parser.print_help()
    exit()

  imageRes = options.pixel if options.pixel != None else 25400. / options.dpi

  accepted = tb.acceptImage(uid, iids, imageRes, options.left, options.top)
  if len(iids) != accepted:
    print "some images has not been accepted"

  exit(len(iids) - accepted)

