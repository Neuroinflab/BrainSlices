#!/usr/bin/python
# -*- coding: utf-8 -*-

import os
import cherrypy

from webService import WebService


directoryName = os.path.abspath(os.path.dirname(__file__))

from database import db
# possible redundancy!!! TODO: think about instance instead of class
from userBase import UserBase
from tileBase import TileBase


if __name__ == '__main__':
  srv = WebService(directoryName)
  siteconf = os.path.join(directoryName, 'site.conf')
  appconf  = os.path.join(directoryName, 'app.conf')
  cherrypy.config.update(siteconf)

  cherrypy.tree.mount(root=srv, script_name='/', config=appconf)
  cherrypy.engine.start()
  cherrypy.engine.block()

