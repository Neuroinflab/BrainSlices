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
  parser.add_option('-p', '--password', action='store', type='string',
                    dest='password', default=None,
                    help='user password (REQUIRED)')
  parser.add_option('-e', '--email', action='store', type='string',
                    dest='email', default='', help='user e-mail address')
  parser.add_option('-n', '--name', action='store', type='string',
                    dest='name', default='', help='user real name')
  options, args = parser.parse_args()

  if len(args) > 0 or options.login == None or options.password == None:
    parser.print_help()
    exit()

  ub = UserBase(db)
  login = options.login.lower()
  salt = random.randint(0, 2**31)
  if not ub.registerUser(login, options.password, options.email,
                         options.name, salt):
    exit(1)

  ub.confirmationSent(login)

  confirmId = hashlib.md5(login + str(salt)).hexdigest()
  print ub.confirmRegistration(login, confirmId)

