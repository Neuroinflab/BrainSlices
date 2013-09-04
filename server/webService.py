#!/usr/bin/python
# -*- coding: utf-8 -*-

import os
import cherrypy
from cherrypy.lib import static

# Importowanie wszystkiego jest niebezpieczne (w sensie nieeleganckie),
# importujemy tylko to, czego uzywamy
from database import db
from userBase import UserBase
from tileBase import TileBase

from server import Server, Generator, useTemplate, serveContent
from uploadServer import UploadServer
from tileServer import TileServer, TestImageServer, OutlineServer
from userServer import UserServer


class WebGenerator(Generator):
  def __init__(self, templatesPath):
    Generator.__init__(self, templatesPath)
    controlPanel = self.templateEngine('draggableWindow.html')
    controlPanel['__windowId__'] = 'controlPanel'
    controlPanel['<!--%title%-->'] = """Control panel; cursor at: <span class="mouseX"></span>, <span class="mouseY"></span>
                                        <a href="javascript:void(0)" id="loginLink">login</a><a href="javascript:void(0)" id="logoutLink"></a>"""
    stackControlPanel = self.templateEngine('controlPanel.html')
    stackControlPanel['<!--%searchbox%-->'] = self.templateEngine('searchbox.html')
    controlPanel['<!--%content%-->'] = stackControlPanel

    index = self.templateEngine('myapi.html')
    index['<!--%controlPanel%-->'] = controlPanel
    index['<!--%userPanel%-->'] = self.templateEngine('loginWindow.html')

    self['index'] = index

  @useTemplate('index')
  def index(self):
    return [], []


class WebService(Server):
  def __init__(self, servicePath):
    self.serviceDir = servicePath
    self.generator = WebGenerator(os.path.join(servicePath, 'templates'))

    tileDir = os.path.join(servicePath, 'tiles')
    sourceDir = os.path.join(servicePath, 'sourceImages')
    tileBase = TileBase(db, tileDir, sourceDir)
    userBase = UserBase(db)

    self.images = TileServer(tileBase)
    self.outlines = OutlineServer(os.path.join(servicePath, 'outlines'))
    self.user = UserServer(servicePath, userBase)
    self.upload = UploadServer(servicePath, tileBase) #TODO: remove servicePath after tests

    #TODO: remove after tests
    self._testImages = TestImageServer(os.path.join(servicePath, 'testTiles'))

    Server.__init__(self)

  @cherrypy.expose()
  @serveContent()
  def index(self):
    return self.generator.index()

