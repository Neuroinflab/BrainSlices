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
import ConfigParser

# requires python-psycopg2 package
import psycopg2
import psycopg2.extras

configFile = os.path.join(os.path.abspath(os.path.dirname(__file__)),
                          'brainslices.conf')

config = ConfigParser.RawConfigParser()
config.read(configFile)

BS_DB_NAME = config.get('SQL Database', 'name')
BS_DB_USER = config.get('SQL Database', 'user')
BS_DB_HOST = config.get('SQL Database', 'host')
BS_DB_PORT = config.getint('SQL Database', 'port')
BS_DB_PASSWORD = config.get('SQL Database', 'password')
BS_DB_ENCODING = config.get('SQL Database', 'encoding')
BS_DB_ISOLATION_LEVEL = psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT
BS_DB_CONNECTIONS_MAX = 30

BS_EMAIL_SERVER = config.get('Email', 'host')
BS_EMAIL_PORT = config.getint('Email', 'port')
BS_EMAIL_LOGIN = config.get('Email', 'user')
BS_EMAIL_PASSWORD = config.get('Email', 'password')
BS_EMAIL_ADDRESS = config.get('Email', 'address')
BS_EMAIL_ENCODING = config.get('Email', 'encoding')
BS_EMAIL_EHLO = None
if config.has_option('Email', 'ehlo'):
  BS_EMAIL_EHLO = config.get('Email', 'ehlo')

BS_SERVICE_SERVER = config.get('Service', 'server')
BS_SERVICE_NAME = config.get('Service', 'name')
BS_SERVICE_SIGNATURE = config.get('Service', 'signature')

BS_TILER_THREADS = config.getint('Tiler', 'threads')
BS_TILER_MEMORY = config.getint('Tiler', 'memory')

BS_STREAM_FILES = config.getint('Stream', 'files')
BS_STREAM_TIMEOUT  = config.getint('Stream', 'timeout')

BS_USER_DEFAULT_PIXEL_LIMIT = None
BS_USER_DEFAULT_DISK_LIMIT = None
if config.has_section('User'):
  if config.has_option('User', 'defaultPixelLimit'):
    BS_USER_DEFAULT_PIXEL_LIMIT = config.getint('User', 'defaultPixelLimit')

  if config.has_option('User', 'defaultDiskLimit'):
    BS_USER_DEFAULT_DISK_LIMIT = config.getint('User', 'defaultDiskLimit')
