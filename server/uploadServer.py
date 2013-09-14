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

from tileBase import UploadSlot
from server import jsonStd, generateJson, Server, serveContent, ensureLogged,\
                   Generator, useTemplate
from request import NewBatchRequest, ContinueImageUploadRequest,\
                    UploadNewImageRequest, BatchListRequest, BatchDetailsRequest,\
                    UploadImageWithFieldStorageRequest


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
    self['index'] = upload

  @useTemplate('index')
  def index(self):
    return [], []

  def uploadFieldStorage(self, uid, formFields):
    if not 'theFile' in formFields:
      raise cherrypy.HTTPError("400 Bad request", "No files sent.")

    bid = None
    if 'bid' in formFields:
      try:
        bid_ = formFields['bid'].value
        if bid_ != 'None':
          bid = int(bid_)
      except:
        raise cherrypy.HTTPError("400 Bad request", "Bad value of bid field.")

    theFile = formFields['theFile']
    if isinstance(theFile, cgi.FieldStorage):
      files = [theFile]

    else:
      files = theFile

    summary = []
    for theFile in files:
      if isinstance(theFile.file, UploadSlot):
        slot = theFile.file

      else:
        value = theFile.value
        slot = UploadSlot(self.uploadDir)
        slot.write(value)
      
      #XXX: redundant with upload().myFieldStorage.__del__
      try:
        iid = int(cherrypy.request.headers['IID'])

      except:
        raise cherrypy.HTTPError("400 Bad request",
                                 "Bad value (%s) of IID field." % \
                                 cherrypy.request.headers['IID'])

      try:
        actioniid = int(cherrypy.request.headers['ACTIONONIID'])

      except:
        raise cherrypy.HTTPError("400 Bad request",
                                 "Bad value (%s) of ACTIONONIID field." % \
                                 cherrypy.request.headers['ACTIONONIID'])
      iid = self.tileBase.saveSlotAndFinishUpload(slot, 
                iid, 
                cherrypy.request.headers['ACTION'],
                actioniid)
      summary.append({'name': cherrypy.request.headers['NAME'], # theFile.filename,
                      'iid': iid,
                      'size': slot.size,
                      'crc32': format(slot.crc32 & 0xffffffff, "08x")})
      
    return generateJson(summary, logged = True)

  def createSlotAndGetBrokenDuplicateFiles(self, uid, request):
    '''
    Gets the list of broken and duplicate uploads for the file
    Creates a new slot by inserting a new row in DB facilitating new uploads 
    '''
    bid = request['bid'] if 'bid' in request else None
    broken = self.tileBase.getBrokenImages(uid, request['filekey'], request['size'])
    duplicates = self.tileBase.getDuplicateImages(uid, request['filekey'], request['size'])
    iid = self.tileBase.createNewImageSlot(uid, request['filekey'], request['filename'], request['size'], bid)
    data =  {'iid': iid, 'broken': broken, 'duplicates': duplicates}
    return data

  @ensureLogged
  def uploadNewImage(self, uid, request):
    slot = self.tileBase.UploadSlot(uid, filename = request.filename,
                                    declared_size = request.size,
                                    bid = request.bid)
    return self.appendSlot(slot, request.data)

  @ensureLogged
  def continueImageUpload(self, uid, request):
    slot = self.tileBase.UploadSlot(uid, iid = request.iid)
    return self.appendSlot(slot, request.data, offset = request.offset)

  def appendSlot(self, slot, data, offset = 0):
    if offset != slot.size:
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

  @cherrypy.expose
  @serveContent(UploadImageWithFieldStorageRequest)
  @ensureLogged
  def getBrokenDuplicatesAndCreateSlot(self, uid, request):
    '''
    Returns the list of broken and duplicate files found for the array of files passed.
    For each file creates a new slot (row) in DB. Depending on the user's selection this new
    row is either retained or removed during upload call.
    '''
    images_path = self.tileBase.sourceDir
    data = {}
    for file in request.files_details:
        types = self.generator.createSlotAndGetBrokenDuplicateFiles(uid, file)
        broken_amts = []
        for (name, source_filename) in types['broken']: 
            broken_amts.append((name, self.getFilesize(os.path.join(images_path, name)), source_filename))
        types['broken'] = broken_amts
        data[file['filename'].encode('base64').strip()] = types
    return generateJson(data = data, status = True, logged = True)

  def getFilesize(self, file_path):
    '''
    Returns the file size if the file exists in file system, else returns 0
    '''
    if os.path.isfile(file_path):
      return int(os.path.getsize(file_path))
    return 0

  @cherrypy.expose
  @cherrypy.config(**{'request.process_request_body': False})
  @serveContent()
  def upload(self):
    '''
    Uploads the image byte data passed as a stream. 
    Overrides the default request processing of cherrypy facilitating resuming image upload
    '''
    uid = cherrypy.session.get('userID')
    if uid == None:
      return generateJson(status = False,
                          message = "Unknown user identity.")

    # remove after proper implementation
    cherrypy.response.timeout = 1000 # 3600
    incomingBytes = int(cherrypy.request.headers['content-length'])
    if incomingBytes > cherrypy.server.max_request_body_size:
      return generateJson(status = False,
                          logged = True,
                          message = "Too big data transmitted (%d > %d)." %\
                                    (incomingBytes,
                                     cherrypy.server.max_request_body_size))

    generator = self.generator
    class myFieldStorage(cgi.FieldStorage):
      def make_file(self, binary=None):
        self.slot = UploadSlot(generator.uploadDir)
        return self.slot

      def __del__(self):
        try:
          iid = int(cherrypy.request.headers['IID'])
        except:
          raise cherrypy.HTTPError("400 Bad request",
                                   "Bad value (%s) of IID field." % \
                                   cherrypy.request.headers['IID'])
        try:
          actioniid = int(cherrypy.request.headers['ACTIONONIID'])
        except:
          raise cherrypy.HTTPError("400 Bad request",
                                   "Bad value (%s) of ACTIONONIID field." % \
                                   cherrypy.request.headers['ACTIONONIID'])

        iid =  generator.tileBase.saveSlotAndFinishUpload(
                        self.slot, 
                        iid, 
                        cherrypy.request.headers['ACTION'],
                        actioniid)
      
    formFields = myFieldStorage(fp=cherrypy.request.rfile,
                                headers=cherrypy.request.headers,
                                environ={'REQUEST_METHOD':'POST'},
                                keep_blank_values=True)
    return self.generator.uploadFieldStorage(uid, formFields)

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
