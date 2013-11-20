#!/usr/bin/python
# -*- coding: utf-8 -*-
###############################################################################
#                                                                             #
#    BrainSlices Software                                                     #
#                                                                             #
#    Copyright (C) 2012-2013 Jakub M. Kowalski, J. Potworowski, N. Pasumarthy #
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
import cherrypy, simplejson
from cherrypy.lib import static
import cgi
import tempfile

#from tileBase import UploadSlot
from server import jsonStd, generateJson, Server, serveContent, ensureLogged,\
                   Generator, useTemplate
from request import NewBatchRequest, ContinueImageUploadRequest,\
                    UploadNewImageRequest, BatchListRequest, BatchDetailsRequest,\
                    GetBrokenDuplicatesRequest, GetImageStatusRequest


class UploadGenerator(Generator):
  """
  Class of objects responsible for generation of content related to file
  (image) upload.

  @type tileBase: L{TileBase}
  @ivar tileBase: An object supporting image-related manipulations in the
                  repository database.

  @type uploadDir: str
  @ivar uploadDir: A filesystem path to directory containing the uploaded
                   files.
  """
  def __init__(self, templatesPath, uploadDir, tileBase):
    """
    @type templatesPath: str
    @param templatesPath: A filesystem path to directory containing HTML
                          templates.

    @type uploadDir: str
    @param uploadDir: A filesystem path to directory containing the uploaded
                      files.

    @type tileBase: L{TileBase}
    @param tileBase: An object supporting image-related manipulations in the
                     repository database.
    """
    Generator.__init__(self, templatesPath)
    self.tileBase = tileBase
    self.uploadDir = uploadDir

    controlPanel = self.templateEngine('draggableWindow.html')
    controlPanel['__windowId__'] = 'controlPanel'
    controlPanel['<!--%title%-->'] = 'Control panel; cursor at: <span class="mouseX"></span>, <span class="mouseY"></span>'

    acceptControlPanel = self.templateEngine('acceptPanel.html')
    controlPanel['<!--%content%-->'] = acceptControlPanel

    upload = self.templateEngine('upload.html')
    upload['<!--%controlPanel%-->'] = controlPanel
    upload['<!--%brokenDuplicatePanel%-->'] = self.templateEngine('brokenDuplicatePanel.html')
    self['index'] = upload

  @useTemplate('index')
  def index(self):
    return [], []

  def getBrokenDuplicateFiles(self, uid, key, size):
    '''
    Gets the list of broken and duplicate uploads for the file
    Creates a new slot by inserting a new row in DB facilitating new uploads 
    '''
    broken = self.tileBase.getBrokenImages(uid, key, size)
    duplicates = self.tileBase.getDuplicateImages(uid, key, size)
    return (broken, duplicates)

  def getImagesStatuses(self, iids):
    '''
    Makes a DB call to get the status of each IID passed
    Returns a hash of {iid: status}
    '''
    iids_statuses = self.tileBase.getImagesStatuses(iids)
    return iids_statuses

  @ensureLogged
  def uploadNewImage(self, uid, request):
    slot = self.tileBase.UploadSlot(uid, filename = request.filename,
                                    declared_size = request.size,
                                    declared_md5 = request.key,
                                    bid = request.bid)
    return self.appendSlot(slot, request.data)

  @ensureLogged
  def continueImageUpload(self, uid, request):
    slot = self.tileBase.UploadSlot(uid, iid = request.iid)
    return self.appendSlot(slot, request.data, offset = request.offset)

  def appendSlot(self, slot, data, offset = 0):
    if offset != slot.size:
      print offset, slot.size
      return generateJson(status = False,
                          logged = True,
                          message = "Invalid offset.")

    slot.write(data)
    slot.close()
    return generateJson({'iid': slot.iid,
                         'size': slot.size,
                         'crc32': format(slot.crc32 & 0xffffffff, "08x")},
                        logged = True)

  @ensureLogged
  def newBatch(self, uid, request):
    bid = self.tileBase.newBatch(uid, comment = request.comment)
    return generateJson(bid, logged = True)

  @ensureLogged
  def batchList(self, uid, request):
    batches = self.tileBase.listOpenBatches(uid)
    return generateJson(batches, logged = True)

  @ensureLogged
  def batchDetails(self, uid, request):
    details = self.tileBase.getBatchDetails(uid, request.bid)
    #TODO: check for None
    return generateJson(details, logged = True)


class UploadServer(Server):
  def __init__(self, servicePath, tileBase):
    self.serviceDir = servicePath # remove after tests
    self.uploadDir = os.path.join(servicePath, 'uploadSlots')
    self.tileBase = tileBase
    templatesDir = os.path.join(servicePath, 'templates')
    self.generator = UploadGenerator(templatesDir, self.uploadDir, tileBase)

  @cherrypy.expose
  @serveContent()
  def index(self):
    return self.generator.index()
    # remove after tests

#TODO: move to generator...
  @cherrypy.expose
  @serveContent(GetBrokenDuplicatesRequest)
  @ensureLogged
  def getBrokenDuplicates(self, uid, request):
    '''
    Returns the list of broken and duplicate files found for the array of files passed.
    For each file creates a new slot (row) in DB. Depending on the user's selection this new
    row is either retained or removed during upload call.
    '''
    images_path = self.tileBase.sourceDir
    data = []
    for key, size in request.files_details:
      broken, duplicates = self.generator.getBrokenDuplicateFiles(uid, key, size)
      data.append((broken, duplicates))

    return generateJson(data = data, status = True, logged = True)

  @cherrypy.expose
  @serveContent(GetImageStatusRequest)
  @ensureLogged
  def getImagesStatuses(self, uid, request):
    '''
    Returns the status of each iid passed. Bulk API
    '''
    iids_statuses = self.generator.getImagesStatuses(request.iids)
    return generateJson(data = iids_statuses, status = True, logged = True)

#  def getFilesize(self, file_path):
#    '''
#    Returns the file size if the file exists in file system, else returns 0
#    '''
#    if os.path.isfile(file_path):
#      return int(os.path.getsize(file_path))
#
#    return 0

  @cherrypy.expose
  @serveContent(UploadNewImageRequest)
  def uploadNewImage(self, request):
    return self.generator.uploadNewImage(request)

  @cherrypy.expose
  @serveContent(ContinueImageUploadRequest)
  def continueImageUpload(self, request):
    return self.generator.continueImageUpload(request)

  @cherrypy.expose
  @serveContent(NewBatchRequest)
  def newBatch(self, request):
    return self.generator.newBatch(request)

  @cherrypy.expose
  @serveContent(BatchListRequest)
  def batchList(self, request):
    return self.generator.batchList(request)

  @cherrypy.expose
  @serveContent(BatchDetailsRequest)
  def batchDetails(self, request):
    return self.generator.batchDetails(request)
