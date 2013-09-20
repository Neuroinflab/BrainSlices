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
import random
import hashlib

from optparse import OptionParser

#TODO change when moved to server directory
directoryName = os.path.abspath(os.path.dirname(__file__))
sys.path.append(os.path.abspath(os.path.join(directoryName,
                                             '../server')))

from database import db
from userBase import UserBase


if __name__ == '__main__':
  usage = "Usage: %prog [options]"
  parser = OptionParser(usage=usage)
  parser.add_option('-l', '--login',
                    action='store', type='string', dest='login', default=None,
                    help='user login (REQUIRED)')
  options, args = parser.parse_args()

  if len(args) > 0 or options.login == None:
    parser.print_help()
    exit()

  ub = UserBase(db)
  login = options.login.lower()
  uid = ub.getUserID(login)
  if uid == None:
    exit(1)

  print uid

