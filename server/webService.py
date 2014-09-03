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
from database import db, dbPool
from userBase import UserBase
from tileBase import TileBase
from metaBase import MetaBase

from server import Server, Generator, useTemplate, serveContent
from uploadServer import UploadServer
from tileServer import TileServer, OutlineServer
from userServer import UserServer
from metaServer import MetaServer
from indexerServer import IndexerServer

class WebGenerator(Generator):
  def __init__(self, templatesPath):
    Generator.__init__(self, templatesPath)

    passwordStrength = self.templateEngine('passwordStrength.html')
    loginWindow = self.templateEngine('loginWindow.html')
    loginWindow['<!--%passwordStrength%-->'] = passwordStrength

    userPanel = self.templateEngine('userPanel.html')
    userPanel['<!--%passwordStrength%-->'] = passwordStrength

    index = self.templateEngine('main.html')
    index['<!--%imageCart%-->'] = self.templateEngine('imageCart.html')
    index['<!--%loginWindow%-->'] = loginWindow
    index['<!--%alertWindow%-->'] = self.templateEngine('alertWindow.html')
    index['<!--%waitWindow%-->'] = self.templateEngine('waitWindow.html')
    index['<!--%homePanel%-->'] = self.templateEngine('homePanel.html')
    index['<!--%browsePanel%-->'] = self.templateEngine('browsePanel.html')
    index['<!--%uploadPanel%-->'] = self.templateEngine('uploadPanel.html')
    index['<!--%userPanel%-->'] = userPanel
    index['<!--%brokenDuplicatePanel%-->'] = self.templateEngine('brokenDuplicatePanel.html')

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
    tileBase = TileBase(db, dbPool, tileDir, sourceDir)
    userBase = UserBase(db, dbPool)
    metaBase = MetaBase(db, dbPool)

    self.images = TileServer(tileBase, metaBase)
    self.outlines = OutlineServer(os.path.join(servicePath, 'outlines'))
    self.user = UserServer(servicePath, userBase)
    self.upload = UploadServer(servicePath, tileBase) #TODO: remove servicePath after tests
    self.meta = MetaServer(metaBase, tileBase, servicePath) # tileBase as privilege manager
    self.indexer = IndexerServer(tileBase, metaBase, servicePath)

    Server.__init__(self)

  @cherrypy.expose()
  @serveContent() #ignores any parameters -> a very nice behaviour for my purpose :-)
  def index(self):
    return self.generator.index()

