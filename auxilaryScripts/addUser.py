#!/usr/bin/python
# -*- coding: utf-8 -*-

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

