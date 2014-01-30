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

from request import GetImagesPropertiesRequest, ChangeImagesPropertiesRequest,\
                    SearchImagesRequest
from server import generateJson, Generator, Server, serveContent, useTemplate

from tileBase import NO_PRIVILEGE
from metaBase import MetaBase


# privileges: o - owner, g - group, a - all # e - 'every logged' ;-)

class MetaServer(Generator, Server):
  def __init__(self, metaBase, tileBase, servicePath):
    Generator.__init__(self, os.path.join(servicePath, 'templates'))

    properties = self.templateEngine('properties_panel.html')
    properties['<!--%userPanel%-->'] = self.templateEngine('loginWindow.html')
    self['properties'] = properties

    self.metaBase = metaBase
    self.tileBase = tileBase
    self.selectorClass = {'f': MetaBase.SelectNumber,
                          's': MetaBase.SelectString,}

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

  @cherrypy.expose
  @serveContent(ChangeImagesPropertiesRequest)
  def changeImagesProperties(self, request):
    uid = request.session.get('userID')
    result = []
    for iid, pUnset, pSet in request.changes:
      privileges = self.tileBase.getPrivileges(iid, uid)
      if privileges == None or privileges[3] == NO_PRIVILEGE:
        continue

      success = True
      successfullUnset = []
      for name in pUnset:
        if self.metaBase.unsetProperty(iid, name):
          successfullUnset.append(name)

        else:
          success = False

      successfullSet =[]
      for prop in pSet:
        n, t, v, e = prop[:4]
        if self.metaBase.setProperty(iid, n, prop[4] if t != 't' else None,
                                     t, v, e):
          
          successfullSet.append(n)

        else:
          success = False

      result.append((iid, True if success else (successfullUnset,
                                                successfullSet)))

    return generateJson(data = dict(result),
                        status = True,
                        message = None,
                        logged = uid != None)


  @cherrypy.expose
  @serveContent(SearchImagesRequest)
  def searchImages(self, request):
    uid = request.session.get('userID')
    selectors = [self.selectorClass[prop[1]](prop[0], **prop[2]) if prop[1] != 't'\
                 else MetaBase.SelectTag(prop[0]) for prop in request.query]
    selectors.append(MetaBase.SelectVisible(uid))
    result = self.metaBase.searchImagesProperties(selectors)
    return generateJson(data = result,
                        status = True,
                        message = None,
                        logged = uid != None)
    
