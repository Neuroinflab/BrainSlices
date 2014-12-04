#!/usr/bin/python
# -*- coding: utf-8 -*-
###############################################################################
#                                                                             #
#    BrainSlices Software                                                     #
#                                                                             #
#    Copyright (C) 2012-2014 Jakub M. Kowalski, J. Potworowski, N. Pasumarthy #
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
from datetime import datetime

#from tileBase import UploadSlot
from server import jsonStd, generateJson, Server, serveContent, ensureLogged,\
                   Generator, useTemplate, unwrapRow
from request import NewBatchRequest, ContinueImageUploadRequest,\
                    UploadNewImageRequest, BatchListRequest, BatchDetailsRequest,\
                    GetBrokenDuplicatesRequest, GetImagesStatusesRequest,\
                    UpdateMetadataRequest, UpdateStatusRequest, DeleteImagesRequest,\
                    GetImagesPrivilegesRequest, ChangePublicPrivilegesRequest

from tileBase import NO_PRIVILEGE, PixelLimitException, DiskLimitException
from serviceTools import hSize, hSI


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
    @param servicePath: A filesystem path to directory containing service
                        files.

    @type tileBase: L{TileBase}
    @param tileBase: An object supporting image-related manipulations in the
                     repository database.
    """
    Generator.__init__(self, os.path.join(servicePath, 'templates'))
    self.tileBase = tileBase

  def checkUploadLimits(self, uid, size, pixels):
    try:
      self.tileBase.checkLimits(uid, size, pixels)

    except DiskLimitException as e:
      return generateJson(status=False,
                          logged = uid != None,
                          message = 'Disk limit (%s of %s left) exceeded by %s.'\
                          % (hSize(e.limit - e.used),
                             hSize(e.limit),
                             hSize(e.used + e.value - e.limit)))

    except PixelLimitException as e:
      return generateJson(status=False,
                          logged = uid != None,
                          message = 'Pixel limit (%spx of %spx left) exceeded by %spx (%spx of raw data upload assumed; try to upload images in format of better compression if mistaken).'\
                          % (hSI(e.limit - e.used),
                             hSI(e.limit),
                             hSI(e.used + e.value - e.limit),
                             hSI(e.value)))

  @serveContent(GetBrokenDuplicatesRequest)
  @ensureLogged
  def getBrokenDuplicates(self, uid, request):
    '''
    Gets the list of broken and duplicate uploads for the file
    Creates a new slot by inserting a new row in DB facilitating new uploads 
    '''
    images_path = self.tileBase.sourceDir

    size = sum(x for _, x in request.files_details)
    pixels = size / 3

    fail = self.checkUploadLimits(uid, size, pixels)
    if fail is not None:
      return fail

    data = []
    cursor = self.tileBase._getCursor()
    for key, size in request.files_details:
      broken = self.tileBase.getBrokenImages(uid, key, size, cursor=cursor)
      duplicates = self.tileBase.getDuplicateImages(uid, key, size, cursor=cursor)
      data.append((broken, duplicates))

    cursor.close()
    return generateJson(data = data, status = True, logged = uid != None)

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

  @serveContent(UploadNewImageRequest)
  @ensureLogged
  def uploadNewImage(self, uid, request):
    fail = self.checkUploadLimits(uid, request.size, request.size / 3)
    if fail is not None:
      return fail

    slot = self.tileBase.UploadSlot(uid, filename = request.filename,
                                    declared_size = request.size,
                                    declared_md5 = request.key,
                                    pixel_size = request.ps,
                                    image_top = request.top,
                                    image_left = request.left,
                                    bid = request.bid)

    return self.appendSlot(slot, request.data)

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

  @serveContent(NewBatchRequest)
  @ensureLogged
  def newBatch(self, uid, request):
    comment = request.comment
    if comment is None:
      today = datetime.today()
      comment = today.strftime(' Batch automatically generated %Y.%m.%d %H:%M %Z')

    bid = self.tileBase.newBatch(uid, comment = comment)
    return generateJson({'bid': bid, 'comment': comment}, logged = True)

  @serveContent(BatchListRequest)
  @ensureLogged
  def batchList(self, uid, request):
    batches = self.tileBase.listOpenBatches(uid)
    return generateJson(batches, logged = True)

  @serveContent(BatchDetailsRequest)
  @ensureLogged
  def batchDetails(self, uid, request):
    details = self.tileBase.getBatchDetails(uid, request.bid)
    data = [unwrapRow(row, ['status', 'viewPrivilege', 'editPrivilege',
                            'annotatePrivilege', 'outlinePrivilege',
                            'imageTop', 'imageLeft', 'imageWidth',
                            'imageHeight', 'tileWidth', 'tileHeight',
                            'pixelSize', 'crc32', 'md5', 'iid',
                            'invalid', 'sourceCRC32',
                            'sourceFilesize', 'declaredFilesize',
                            'filename']) for row in details]
    return generateJson(data, logged = True)

  @serveContent(UpdateMetadataRequest)
  @ensureLogged
  def updateMetadata(self, uid, request):
    result = []
    for iid, left, top, ps in request.updated:
      privileges = self.tileBase.getPrivileges(iid, uid)
      if privileges is None or privileges[2] == NO_PRIVILEGE:
        continue

      if self.tileBase.updateMetadata(iid, pixelSize = ps, imageLeft = left,
                                      imageTop = top):
        result.append(iid)

    return generateJson(result, logged = True)

  @serveContent(UpdateStatusRequest)
  @ensureLogged
  def updateStatus(self, uid, request):
    result = []
    for iid, status in request.updated:
      privileges = self.tileBase.getPrivileges(iid, uid)
      if privileges is None or privileges[2] == NO_PRIVILEGE:
        continue

      if self.tileBase.updateMetadata(iid, status = status):
        result.append(iid)

    return generateJson(result, logged = True)

  @serveContent(DeleteImagesRequest)
  @ensureLogged
  def deleteImages(self, uid, request):
    result = []
    for iid in request.iids:
      privileges = self.tileBase.getPrivileges(iid, uid)
      if privileges is None: # image already not in database
        result.append(iid)

      elif privileges[2] > NO_PRIVILEGE: # can delete
        if self.tileBase.deleteImage(iid): # deleted
          result.append(iid)

    return generateJson(result, logged = True)

  @serveContent(GetImagesPrivilegesRequest)
  @ensureLogged
  def getPrivileges(self, uid, request):
    result = []
    for iid in request.iids:
      #TODO2: make @manageConnection() NOT handling exceptions if connection
      #       already provided
      privileges = self.tileBase.getPrivilegesToEdit(iid, uid)
      if privileges is not None:
        result.append((iid,) + privileges)

    return generateJson(result, logged = True)

  @serveContent(ChangePublicPrivilegesRequest)
  @ensureLogged
  def changePublicPrivileges(self, uid, request):
    result = []
    for iid, view, edit, annotate, outline in request.privileges:
      if self.tileBase.setPublicPrivileges(uid, iid, view, edit, annotate, outline) > 0:
        result.append(iid)
    
    return generateJson(result, logged = True)

