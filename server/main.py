#!/usr/bin/python
# -*- coding: utf-8 -*-
###############################################################################
#                                                                             #
#    BrainSlices Software                                                     #
#                                                                             #
#    Copyright (C) 2012-2013 Jakub M. Kowalski, J. Potworowski                #
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

