#!/usr/bin/python
# -*- coding: utf-8 -*-

import os
import cherrypy
from cherrypy.lib import static
import json

from request import ImageRequest, Request
from server import generateJson, Server, serveContent


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


class TileGenerator(object):
  def __init__(self, tileBase):
    self.tileBase = tileBase

  def tile(self, request):
    path = self.tileBase.tile(request)
    if path:
      return True, path, "tile.jpg", 'image/jpeg'

    return None

  def source(self, request):
    path = self.tileBase.source(request)
    if path:
      return True, path, 'image_%d.png' % request.id, 'image/png'

    return None

  def info(self, request):
    data = self.tileBase.info(request)
    if data:
      return generateJson(data = data,
                          status = data != None,
                          message = None,
                          logged = request.session.get('userID') != None)

    return generateJson(status = False,
                        message = "No such imagestack in the database.")

  #TODO: remove after tests
  def _allImages(self, request):
    uid = request.session.get('userID')
    data = self.tileBase._allImages(uid)
    return generateJson(data = data,
                        status = data != None,
                        message = None,
                        logged = uid != None)

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
    self.tileGenerator = TileGenerator(tileBase)

  @serveContent(ImageRequest)
  def __call__(self, request):
    if request.method == 'tiles':
      return self.tileGenerator.tile(request)

    elif request.method == 'info.json':
      return self.tileGenerator.info(request)

    elif request.method == 'image.png':
      return self.tileGenerator.source(request)

  #TODO: remove after tests
  @cherrypy.expose
  @serveContent(Request)
  def _allImages(self, request):
    return self.tileGenerator._allImages(request)
