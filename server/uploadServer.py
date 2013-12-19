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
from datetime import datetime

#from tileBase import UploadSlot
from server import jsonStd, generateJson, Server, serveContent, ensureLogged,\
                   Generator, useTemplate, unwrapRow
from request import NewBatchRequest, ContinueImageUploadRequest,\
                    UploadNewImageRequest, BatchListRequest, BatchDetailsRequest,\
                    GetBrokenDuplicatesRequest, GetImagesStatusesRequest,\
                    UpdateMetadataRequest, DeleteImagesRequest,\
                    GetImagesPrivilegesRequest, ChangePublicPrivilegesRequest

from tileBase import NO_PRIVILEGE


class UploadServer(Generator, Server):
  """
  Class of objects responsible for generation of content related to file
  (image) upload.

  @type tileBase: L{TileBase}
  @ivar tileBase: An object supporting image-related manipulations in the
                  repository database.
  """
  def __init__(self, servicePath, tileBase):
    """
    @type servicePath: str
    @param templatesPath: A filesystem path to directory containing service
                          files.

    @type tileBase: L{TileBase}
    @param tileBase: An object supporting image-related manipulations in the
                     repository database.
    """
    Generator.__init__(self, os.path.join(servicePath, 'templates'))
    self.tileBase = tileBase

    controlPanel = self.templateEngine('draggableWindow.html')
    controlPanel['__windowId__'] = 'controlPanel'
    controlPanel['<!--%title%-->'] = """Control panel; cursor at: <span class="mouseX"></span>, <span class="mouseY"></span>
                                        <a href="javascript:void(0)" id="loginLink">login</a><a href="javascript:void(0)" id="logoutLink"></a>"""

    acceptControlPanel = self.templateEngine('acceptPanel.html')
    controlPanel['<!--%content%-->'] = acceptControlPanel

    upload = self.templateEngine('upload.html')
    upload['<!--%controlPanel%-->'] = controlPanel
    upload['<!--%brokenDuplicatePanel%-->'] = self.templateEngine('brokenDuplicatePanel.html')
    upload['<!--%userPanel%-->'] = self.templateEngine('loginWindow.html')
    self['index'] = upload

    privileges = self.templateEngine('privileges_panel.html')
    privileges['<!--%userPanel%-->'] = self.templateEngine('loginWindow.html')
    self['privileges'] = privileges

  @cherrypy.expose
  @serveContent()
  @useTemplate('index')
  def index(self):
    return [], []

  @cherrypy.expose
  @serveContent()
  @useTemplate('privileges')
  def privileges(self):
    return [], []

  @cherrypy.expose
  @serveContent(GetBrokenDuplicatesRequest)
  @ensureLogged
  def getBrokenDuplicates(self, uid, request):
    '''
    Gets the list of broken and duplicate uploads for the file
    Creates a new slot by inserting a new row in DB facilitating new uploads 
    '''
    images_path = self.tileBase.sourceDir
    data = []
    for key, size in request.files_details:
      broken = self.tileBase.getBrokenImages(uid, key, size)
      duplicates = self.tileBase.getDuplicateImages(uid, key, size)
      data.append((broken, duplicates))

    return generateJson(data = data, status = True, logged = uid != None)

  @cherrypy.expose
  @serveContent(GetImagesStatusesRequest)
  @ensureLogged
  def getImagesStatuses(self, uid, request):
    '''
    Makes a DB call to get the status of each IID passed
    Returns a hash of {iid: status}
    '''
    iids_statuses = self.tileBase.getImagesStatuses(uid, request.iids)
    return generateJson(data = [unwrapRow(row) for row in iids_statuses],
                        status = True,
                        logged = uid != None)

  @cherrypy.expose
  @serveContent(UploadNewImageRequest)
  @ensureLogged
  def uploadNewImage(self, uid, request):
    slot = self.tileBase.UploadSlot(uid, filename = request.filename,
                                    declared_size = request.size,
                                    declared_md5 = request.key,
                                    bid = request.bid)
    return self.appendSlot(slot, request.data)

  @cherrypy.expose
  @serveContent(ContinueImageUploadRequest)
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
                         'crc32': slot.crc32}, logged = True)

  @cherrypy.expose
  @serveContent(NewBatchRequest)
  @ensureLogged
  def newBatch(self, uid, request):
    comment = request.comment
    if comment is None:
      today = datetime.today()
      comment = today.strftime(' Batch automatically generated %Y.%m.%d %H:%M %Z')

    bid = self.tileBase.newBatch(uid, comment = comment)
    return generateJson({'bid': bid, 'comment': comment}, logged = True)

  @cherrypy.expose
  @serveContent(BatchListRequest)
  @ensureLogged
  def batchList(self, uid, request):
    batches = self.tileBase.listOpenBatches(uid)
    return generateJson(batches, logged = True)

  @cherrypy.expose
  @serveContent(BatchDetailsRequest)
  @ensureLogged
  def batchDetails(self, uid, request):
    details = self.tileBase.getBatchDetails(uid, request.bid)
    data = [unwrapRow(row, ['imageTop', 'imageLeft', 'imageWidth',
                            'imageHeight', 'tileWidth', 'tileHeight',
                            'pixelSize', 'crc32', 'md5', 'iid',
                            'status', 'invalid', 'sourceCRC32',
                            'sourceFilesize', 'declaredFilesize',
                            'filename']) for row in details]
    return generateJson(data, logged = True)

  @cherrypy.expose
  @serveContent(UpdateMetadataRequest)
  @ensureLogged
  def updateMetadata(self, uid, request):
    result = []
    for iid, left, top, ps, status in request.updated:
      privileges = self.tileBase.getPrivileges(iid, uid)
      if privileges is None:
        continue

      if privileges[2] == NO_PRIVILEGE:
        result.append((iid, False))
        continue

      if self.tileBase.updateMetadata(iid, pixelSize = ps, imageLeft = left,
                                      imageTop = top, status = status):
        result.append((iid, True))

    return generateJson(result, logged = True)


  @cherrypy.expose
  @serveContent(DeleteImagesRequest)
  @ensureLogged
  def deleteImages(self, uid, request):
    # TODO: expand the stub
    result = []
    for iid in request.iids:
      privileges = self.tileBase.getPrivileges(iid, uid)
      if privileges is None:
        continue

      if privileges[2] == NO_PRIVILEGE:
        result.append((iid, False))
        continue

      if self.tileBase.deleteImage(iid):
        result.append((iid, True))

    return generateJson(result, logged = True)

  @cherrypy.expose
  @serveContent(GetImagesPrivilegesRequest)
  @ensureLogged
  def getPrivileges(self, uid, request):
    result = []
    for iid in request.iids:
      #TODO: pass uid to getPrivilegesToEdit to perform privileges check
      #TODO2: make @manageConnection() NOT handling exceptions if connection
      #       already provided
      privileges = self.tileBase.getPrivilegesToEdit(iid)
      if privileges is not None:
        result.append((iid,) + privileges)

    return generateJson(result, logged = True)

  @cherrypy.expose
  @serveContent(ChangePublicPrivilegesRequest)
  @ensureLogged
  def changePublicPrivileges(self, uid, request):
    result = []
    for iid, view, edit, annotate, outline in request.privileges:
      if self.tileBase.setPublicPrivileges(uid, iid, view, edit, annotate, outline) > 0:
        result.append(iid)
    
    return generateJson(result, logged = True)

#class UploadServer(Server):
#  def __init__(self, servicePath, tileBase):
#    self.serviceDir = servicePath # remove after tests
#    self.tileBase = tileBase
#    templatesDir = os.path.join(servicePath, 'templates')
#
#  @cherrypy.expose
#  @serveContent()
#  def index(self):
#    return self.generator.index()
#    # remove after tests
#
#  @cherrypy.expose
#  @serveContent(GetBrokenDuplicatesRequest)
#  def getBrokenDuplicates(self, request):
#    '''
#    Returns the list of broken and duplicate files found for the array of files passed.
#    For each file creates a new slot (row) in DB. Depending on the user's selection this new
#    row is either retained or removed during upload call.
#    '''
#    return self.generator.getBrokenDuplicates(request)
#
#  @cherrypy.expose
#  @serveContent(GetImagesStatusesRequest)
#  def getImagesStatuses(self, request):
#    '''
#    Returns the status of each iid passed. Bulk API
#    '''
#    return self.generator.getImagesStatuses(request)
#
#  @cherrypy.expose
#  @serveContent(UploadNewImageRequest)
#  def uploadNewImage(self, request):
#    return self.generator.uploadNewImage(request)
#
#  @cherrypy.expose
#  @serveContent(ContinueImageUploadRequest)
#  def continueImageUpload(self, request):
#    return self.generator.continueImageUpload(request)
#
#  @cherrypy.expose
#  @serveContent(NewBatchRequest)
#  def newBatch(self, request):
#    return self.generator.newBatch(request)
#
#  @cherrypy.expose
#  @serveContent(BatchListRequest)
#  def batchList(self, request):
#    return self.generator.batchList(request)
#
#  @cherrypy.expose
#  @serveContent(BatchDetailsRequest)
#  def batchDetails(self, request):
#    return self.generator.batchDetails(request)
