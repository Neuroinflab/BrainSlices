#!/usr/bin/python
# -*- coding: utf-8 -*-

import os
import ConfigParser

# requires python-psycopg2 package
import psycopg2
import psycopg2.extras

configFile = os.path.join(os.path.abspath(os.path.dirname(__file__)),
                          'brainslices.conf')

config = ConfigParser.SafeConfigParser()
config.read(configFile)

BS_DB_NAME = config.get('SQL Database', 'name')
BS_DB_USER = config.get('SQL Database', 'user')
BS_DB_HOST = config.get('SQL Database', 'host')
BS_DB_PORT = config.getint('SQL Database', 'port')
BS_DB_PASSWORD = config.get('SQL Database', 'password', raw = True)
BS_DB_ENCODING = config.get('SQL Database', 'encoding')
BS_DB_ISOLATION_LEVEL = psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT

BS_EMAIL_SERVER = config.get('Email', 'host')
BS_EMAIL_PORT = config.getint('Email', 'port')
BS_EMAIL_LOGIN = config.get('Email', 'user')
BS_EMAIL_PASSWORD = config.get('Email', 'password', raw = True)
BS_EMAIL_ADDRESS = config.get('Email', 'address')
BS_EMAIL_ENCODING = config.get('Email', 'encoding')

BS_SERVICE_SERVER = config.get('Service', 'server')

BS_TILER_THREADS = config.getint('Tiler', 'threads')
BS_TILER_MEMORY = config.getint('Tiler', 'memory')
