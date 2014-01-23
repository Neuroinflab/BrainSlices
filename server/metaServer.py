#!/usr/bin/python
# -*- coding: utf-8 -*-
###############################################################################
#                                                                             #
#    BrainSlices Software                                                     #
#                                                                             #
#    Copyright (C) 2014 Jakub M. Kowalski                                     #
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
from cherrypy.lib import static
import json

from request import GetImagesPropertiesRequest
from server import generateJson, Generator, Server, serveContent, useTemplate

# privileges: o - owner, g - group, a - all # e - 'every logged' ;-)

class MetaServer(Generator, Server):
  def __init__(self, metaBase, tileBase, servicePath):
    Generator.__init__(self, os.path.join(servicePath, 'templates'))

    properties = self.templateEngine('properties_panel.html')
    properties['<!--%userPanel%-->'] = self.templateEngine('loginWindow.html')
    self['properties'] = properties

    self.metaBase = metaBase
    self.tileBase = tileBase

  @cherrypy.expose
  @serveContent()
  @useTemplate('properties')
  def index(self):
    return [], []

  @cherrypy.expose
  @serveContent(GetImagesPropertiesRequest)
  def getImagesProperties(self, request):
    uid = request.session.get('userID')
    result = []
    for iid in request.iids:
      if self.tileBase.canViewImage(iid, uid):
        result.append((iid, self.metaBase.getProperties(iid)))

    return generateJson(data = result,
                        status = True,
                        message = None,
                        logged = uid != None)

