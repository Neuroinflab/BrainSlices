#!/usr/bin/python
# -*- coding: utf-8 -*-
###############################################################################
#                                                                             #
#    BrainSlices Software                                                     #
#                                                                             #
#    Copyright (C) 2012-2014 Jakub M. Kowalski, J. Potworowski                #
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

from request import ImageRequest, Request
from server import generateJson, Server, serveContent, unwrapRow


class OutlineServer(Server):
  def __init__(self, outlineDir):
    self.serviceDir = outlineDir

  def __getOutline(self, outline):
    """
    UNSAFE!!!
    """
    outlinePath = os.path.join(self.serviceDir,
                               outline)

    if not os.path.exists(outlinePath):
      raise cherrypy.HTTPError("404 Not found",
                               "Outline not found in the database.")

    return static.serve_file(outlinePath,
                             content_type = 'image/svg+xml')

  @cherrypy.expose
  @cherrypy.tools.gzip(mime_types=['image/*+xml'])
  def wholeOutline(self, outline):
    return self.__getOutline(outline)


#TODO: remove after tests
class TestImageServer(Server):
  def __init__(self, servicePath):
    #self._cp_config = {}
    self.serviceDir = servicePath

  @cherrypy.tools.gzip(mime_types=['application/json'])
  def __call__(self):
    """
    UNSAFE^2!!!
    """
    if self.serviceDir == None:
      raise cherrypy.HTTPError("404 Not found",
                               "No test tiles available.")

    setList = os.listdir(self.serviceDir)
    setTree = dict((s, os.listdir(os.path.join(self.serviceDir, s))) for s in setList)
    cherrypy.response.headers['Content-Type'] = 'application/json'
    cherrypy.response.headers['Content-Disposition'] = 'inline'
    return json.dumps(setTree)


class TileServer(Server):
  def __init__(self, tileBase):
    self.tileBase = tileBase

  @serveContent(ImageRequest)
  def __call__(self, request):
    if request.method == 'info.json':
      data = self.tileBase.info(request)
      if data:
        return generateJson(data = unwrapRow(data),
                            status = data != None,
                            message = None,
                            logged = request.session.get('userID') != None)

      return generateJson(status = False,
                          message = "Image not available in the database."\
                          if data is None\
                          else "Not enough privileges to access the image.")

    if request.method == 'tiles':
      path = self.tileBase.tile(request)
      if path:
        return True, path, "tile.jpg", 'image/jpeg'

    elif request.method == 'image.png':
      path = self.tileBase.source(request)
      if path:
        return True, path, 'image_%d.png' % request.id, 'image/png'

    return None

  #TODO: remove after tests
  @cherrypy.expose
  @serveContent(Request)
  def _allImages(self, request):
    uid = request.session.get('userID')
    data = self.tileBase._allImages(uid)
    return generateJson(data = data,
                        status = data != None,
                        message = None,
                        logged = uid != None)
