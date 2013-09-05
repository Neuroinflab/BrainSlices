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

