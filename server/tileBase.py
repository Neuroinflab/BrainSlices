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
import stat
import shutil

import psycopg2
import psycopg2.extras
import zlib
import tempfile
import subprocess

from database import provideCursor, provideConnection, manageConnection,\
                     dbBase, TransactionRollbackError, FOREIGN_KEY_VIOLATION


import ctypes


IMAGE_STATUS_UPLOADING = 0
IMAGE_STATUS_RECEIVING = 1
IMAGE_STATUS_RECEIVED = 2
IMAGE_STATUS_PROCESSING = 3
IMAGE_STATUS_IDENTIFIED = 4
#IMAGE_STATUS_STREAMED =
IMAGE_STATUS_TILED = 5
IMAGE_STATUS_COMPLETED = 6
IMAGE_STATUS_ACCEPTED = 7
IMAGE_STATUS_REMOVED = -1
IMAGE_STATUS_ERROR = -2
IMAGE_STATUS_MIN = -10

IMAGE_STATUS_PREVIEWABLE = IMAGE_STATUS_COMPLETED

NO_PRIVILEGE = 0
PUBLIC_PRIVILEGE = 1
LOGGED_PRIVILEGE = 2
GROUP_PRIVILEGE = 3
OWNER_PRIVILEGE = 4

from bsConfig import BS_TILER_THREADS, BS_TILER_MEMORY, BS_STREAM_FILES, BS_STREAM_TIMEOUT 

directory = os.path.abspath(os.path.dirname(__file__))
tilingCommand = os.path.abspath(os.path.join(directory,
                                             '../auxilaryScripts/tileImageDB.py'))
tilingLogs = os.path.join(directory, 'tilingLogs')
launchCommand = ['at']
launchCommand += ['-q', 'T']
launchCommand += ['-M']
launchCommand += ['now']
#launchCommand += ['now', '+', '2', 'minutes']

def launchImageTiling(iid):
  launch = subprocess.Popen(launchCommand, stdin=subprocess.PIPE)
  command = "python %(command)s %(iid)d --threads %(threads)d --limit  %(limit)d --timeout %(timeout)d --files %(files)d > %(log)s/%(iid)d_out.txt 2> %(log)s/%(iid)d_err.txt\n" % {'command': tilingCommand, 'iid': iid, 'log': tilingLogs, 'threads': BS_TILER_THREADS, 'limit': BS_TILER_MEMORY, 'files': BS_STREAM_FILES, 'timeout': BS_STREAM_TIMEOUT}
  print command
  launch.communicate(command)


class LimitException(Exception):
  def __init__(self, *args, **kwargs):
    limit = kwargs.pop('limit')
    used = kwargs.pop('used')
    value = kwargs.pop('value')
    Exception.__init__(self, *args, **kwargs)
    self.limit = limit
    self.used = used
    self.value = value


class PixelLimitException(LimitException):
  pass


class DiskLimitException(LimitException):
  pass


class TileBase(dbBase):
  def __init__(self, db, dbPool, tileDir, sourceDir):
    dbBase.__init__(self, db, dbPool)
    self.tileDir = tileDir
    self.sourceDir = sourceDir
    self.UploadSlot = self.getUploadSlotClass()

  def getDiskLimit(self, uid, cursor=None):
    return self._getOneValue("""
                             SELECT disk_limit
                             FROM users
                             WHERE uid = %s;
                             """, (uid,),
                             cursor = cursor)

  @manageConnection()
  def getDiskUsed(self, uid, cursor=None, db=None):
    return self._getOneValue("""
                             SELECT COALESCE(SUM(CASE
                               WHEN status < %s THEN declared_size
                               WHEN status < %s THEN image_width * image_height
                               WHEN status < %s THEN jpeg_size + image_width * image_height
                               ELSE png_size + jpeg_size END), 0)
                             FROM images
                             WHERE owner = %s AND status >= 0;
                             """, (IMAGE_STATUS_IDENTIFIED, IMAGE_STATUS_TILED,
                                   IMAGE_STATUS_COMPLETED, uid),
                             cursor = cursor)

  def getPixelLimit(self, uid, cursor=None):
    return self._getOneValue("""
                             SELECT pixel_limit
                             FROM users
                             WHERE uid = %s;
                             """, (uid,),
                             cursor = cursor)

  @manageConnection()
  def getPixelUsed(self, uid, cursor=None, db = None):
    return self._getOneValue("""
                             SELECT COALESCE(SUM(image_width * image_height), 0)
                             FROM images
                             WHERE owner = %s AND status >= %s;
                             """, (uid, IMAGE_STATUS_IDENTIFIED),
                             cursor = cursor)

  @manageConnection()
  def getUserStats(self, uid, cursor=None, db = None):
    row = self._getOneRow("""
                          SELECT COUNT(*),
                            COALESCE(SUM(CASE
                            WHEN status < %s THEN declared_size
                            WHEN status < %s THEN image_width * image_height
                            WHEN status < %s THEN jpeg_size + image_width * image_height
                            ELSE png_size + jpeg_size END), 0),
                            COALESCE(SUM(CASE
                              WHEN status  < %s THEN declared_size / 3
                              ELSE image_width * image_height END), 0)
                          FROM images
                          WHERE owner = %s AND status >= 0;
                          """, (IMAGE_STATUS_IDENTIFIED, IMAGE_STATUS_TILED,
                                IMAGE_STATUS_COMPLETED, IMAGE_STATUS_IDENTIFIED,
                                uid),
                          cursor = cursor)
    images, diskUsed, pixelUsed = row
    row = self._getOneRow("""
                          SELECT disk_limit, pixel_limit
                          FROM users
                          WHERE uid = %s;
                          """, (uid,),
                          cursor = cursor)
    diskLimit, pixelLimit = row
    return {'diskLimit': diskLimit, 'diskUsed': diskUsed,
            'pixelLimit': pixelLimit, 'pixelUsed': pixelUsed,
            'images': images}
    


  @manageConnection()
  def checkLimits(self, uid, size=None, pixels=None, cursor=None, db=None):
    if size is not None:
      diskLimit = self.getDiskLimit(uid, cursor=cursor)
      if diskLimit is not None:
        diskUsed = self.getDiskUsed(uid, cursor=cursor, db=db)
        if diskUsed + size > diskLimit:
          raise DiskLimitException(limit = diskLimit,
                                   used = diskUsed,
                                   value = size)

    if pixels is not None:
      pixelLimit = self.getPixelLimit(uid, cursor=cursor)
      if pixelLimit is not None:
        pixelUsed = self.getPixelUsed(uid, cursor=cursor, db=db)
        if pixelUsed + pixels > pixelLimit:
          raise PixelLimitException(limit = pixelLimit,
                                    used = pixelUsed,
                                    value = pixels)
      

  @manageConnection()
  def setSize(self, iid, width, height, cursor = None, db = None):
    uid = self._getOneValue("SELECT owner FROM images WHERE iid = %s;", (iid,))
    limit = self.getPixelLimit(uid, cursor = cursor)
    if limit is not None:
      used = self.getPixelUsed(uid, cursor = cursor, db = db)
      if width * height + used > limit:
        # XXX: rethink that - might be wise to keep previous status or have "hold"
        #      status???
        tb.imageInvalid(self.iid, "Pixel limit exceeded.", cursor = cursor)
        return False

    cursor.execute("""
                   UPDATE images
                   SET image_width = %s, image_height = %s
                   WHERE iid = %s;
                   """, (width, height, iid))
    if cursor.rowcount != 1:
      raise KeyError("Unable to set size of image #%d." % iid)

    return True

  @provideCursor
  def setPublicPrivileges(self, uid, iids, view = None, edit = None,
                          annotate = None, outline = None, cursor = None):
    if isinstance(iids, (int, long)):
      iids = [iids]

    change = [('public_image_%s' % k, v) \
              for (k, v) in (('view', view),
                             ('edit', edit),
                             ('annotate', annotate),
                             ('outline', outline)) if v != None]
    fields, values = zip(*change)
    update = ', '.join('%s = %%s' % k for k in fields)
    query = """
            UPDATE images
            SET %s
            WHERE iid = %%s;
            """ % update
    rowcount = 0
    for iid in iids:
      row = self.getPrivileges(iid, uid, cursor = cursor)
      if row is not None and row[2] > NO_PRIVILEGE:
        cursor.execute(query, values + (iid,))
        rowcount += cursor.rowcount

    return rowcount

  @manageConnection()
  def getPrivilegesToEdit(self, iid, uid = None, cursor = None, db = None):
    row = self.getPrivileges(iid, uid = uid, extraFields=""",
                             public_image_view, public_image_edit,
                             public_image_annotate, public_image_outline""",
                             cursor = cursor)
    if row is None or row[0] < IMAGE_STATUS_RECEIVED:
      return None

    if row[2] == NO_PRIVILEGE:
      return False

    public = row[5:]
    if row[2] < GROUP_PRIVILEGE:
      return (public, None)

    cursor.execute("""
                   SELECT gid, image_edit, image_annotate, image_outline
                   FROM image_privileges
                   WHERE iid = %s;
                   """, (iid,))
    return (public, cursor.fetchall())


  def canViewImage(self, iid, uid = None, extraFields = ''):
    return self.canAccessImage(iid, uid = uid, extraFields = extraFields,
                               thresholdStatus = IMAGE_STATUS_PREVIEWABLE)

  def canAccessImage(self, iid, uid = None, extraFields = '',
                     thresholdStatus = IMAGE_STATUS_COMPLETED, cursor = None):
    row = self.accessImage(iid, uid = uid, extraFields = extraFields,
                           thresholdStatus = thresholdStatus,
                           cursor = cursor)
    if not row: #row in (False, None):
      return row

    return row[5:] if extraFields != '' else True

  @provideCursor
  def accessImage(self, iid, uid = None, extraFields = '',
                  thresholdStatus = IMAGE_STATUS_COMPLETED,
                  cursor = None):
    row = self.getPrivileges(iid, uid = uid, extraFields = extraFields,
                             cursor = cursor)
    if row is None: # no image
      return None

    status, view, edit, annotate, outline = row[:5]
    if status < thresholdStatus: # technically unable to access the image
      return False

    if status == IMAGE_STATUS_ACCEPTED: # image technically can be accessed
      if view > NO_PRIVILEGE:
        return row

      else:
        return False

    if edit > NO_PRIVILEGE: # editor privilege
      return row

    return False

  @provideCursor
  def getPrivileges(self, iid, uid = None, extraFields='', cursor = None):
    cursor.execute("""
                   SELECT status, owner,
                          CASE WHEN public_image_view THEN %d ELSE %d END,
                          CASE WHEN public_image_edit THEN %d ELSE %d END,
                          CASE WHEN public_image_annotate THEN %d ELSE %d END,
                          CASE WHEN public_image_outline THEN %d ELSE %d END
                          %s
                   FROM images
                   WHERE iid = %%s;
                   """ % (PUBLIC_PRIVILEGE, NO_PRIVILEGE, 
                          PUBLIC_PRIVILEGE, NO_PRIVILEGE,
                          PUBLIC_PRIVILEGE, NO_PRIVILEGE,
                          PUBLIC_PRIVILEGE, NO_PRIVILEGE, extraFields),
                   (iid,))
    if cursor.rowcount != 1:
      # not found
      return None

    row = cursor.fetchone()
    status, owner, view, edit, annotate, outline = row[:6]
    if owner == uid:
      return (status, OWNER_PRIVILEGE, OWNER_PRIVILEGE, OWNER_PRIVILEGE,
              OWNER_PRIVILEGE) + tuple(row[6:])

    if uid == None: #anonymous user cannot be in a group
      return (status, max(view, edit, annotate, outline), edit,
              max(annotate, edit), max(outline, edit)) + tuple(row[6:])

    cursor.execute("""
                   SELECT CASE WHEN COUNT(*) > 0 THEN %s ELSE %s END,
                          CASE WHEN COALESCE(BOOL_OR(image_edit), FALSE) THEN %s ELSE %s END,
                          CASE WHEN COALESCE(BOOL_OR(image_annotate), FALSE) THEN %s ELSE %s END,
                          CASE WHEN COALESCE(BOOL_OR(image_outline), FALSE) THEN %s ELSE %s END
                   FROM image_privileges_cache
                   WHERE iid = %s AND uid = %s;
                   """, (GROUP_PRIVILEGE, view, GROUP_PRIVILEGE, edit,
                         GROUP_PRIVILEGE, annotate, GROUP_PRIVILEGE, outline,
                         iid, uid))
    view, edit, annotate, outline = cursor.fetchone()
    return (status, max(view, edit, annotate, outline), edit,
            max(annotate, edit), max(outline, edit)) + tuple(row[6:])

  def tile(self, request):
    fid = self.canViewImage(request.id,
                            uid = request.session.get('userID'),
                            extraFields = ', fid')
    if isinstance(fid, tuple):
      fid = fid[0]
      path = os.path.join(self.tileDir,
                          "%d" % fid,
                          "tiles",
                          "%d" % request.zoom,
                          "%d" % request.x,
                          "%d.jpg" % request.y)

      if os.path.exists(path):
        return path

    return None

  def source(self, request):
    # redundency with tile()
    fid = self.canAccessImage(request.id,
                              uid = request.session.get('userID'),
                              extraFields = ', fid')
    if isinstance(fid, tuple):
      fid = fid[0]
      path = os.path.join(self.tileDir,
                          '%d' % fid,
                          'image.png')

      if os.path.exists(path):
        return path

    return None

  def info(self, request):
    return self.accessImage(request.id, uid = request.session.get('userID'),
                            extraFields = """, image_top, image_left,
                            image_width, image_height, tile_width,
                            tile_height, pixel_size, image_crc32, image_md5,
                            iid, public_image_view, public_image_edit,
                            public_image_annotate, public_image_outline""",
                            thresholdStatus = IMAGE_STATUS_PREVIEWABLE)

    #return self.canViewImage(request.id,
    #                        uid = request.session.get('userID'),
    #                        extraFields = """,
    #                        image_top, image_left, image_width, image_height,
    #                        tile_width, tile_height, pixel_size,
    #                        image_crc32, image_md5, iid, status""")
    #if isinstance(row, tuple):
    #  return {'imageTop': row[0],
    #          'imageLeft': row[1],
    #          'imageWidth': row[2],
    #          'imageHeight': row[3],
    #          'tileWidth': row[4],
    #          'tileHeight': row[5],
    #          'pixelSize': row[6],
    #          'crc32': row[7], # previously was a hex string
    #          'md5': row[8],
    #          'iid': row[9],
    #          'status': row[10]}

    #if isinstance(row, bool):
    #  return row

  #TODO: remove after tests
  @provideCursor
  def _allImages(self, uid = None, cursor = None):
    if uid != None:
      cursor.execute("""
                     SELECT filename, iid
                     FROM images
                     WHERE status > %s AND (public_image_view OR
                                            public_image_annotate OR
                                            public_image_outline)
                        OR status >= %s AND (public_image_edit
                                             OR owner = %s)
                     UNION
                     SELECT filename, iid
                     FROM images NATURAL JOIN 
                       ( SELECT iid, image_edit
                         FROM image_privileges_cache
                         WHERE uid = %s ) AS foo
                     WHERE status > %s OR status >= %s AND image_edit
                     ORDER BY filename;
                     """, (IMAGE_STATUS_COMPLETED,
                           IMAGE_STATUS_COMPLETED,
                           uid, uid,
                           IMAGE_STATUS_COMPLETED,
                           IMAGE_STATUS_COMPLETED))

    else:
      cursor.execute("""
                     SELECT filename, iid
                     FROM images
                     WHERE status > %s AND (public_image_view OR
                                            public_image_annotate OR
                                            public_image_outline)
                        OR status >= %s AND public_image_edit
                     ORDER BY filename;
                     """, (IMAGE_STATUS_COMPLETED,
                           IMAGE_STATUS_COMPLETED))

    return cursor.fetchall()

#################################
#        Upload methods         #
#################################

  @provideCursor
  def newBatch(self, uid, comment = '', cursor = None):
    if uid == None:
      return None

    cursor.execute("SELECT nextval('batches_bid_seq');")
    bid = cursor.fetchone()[0]

    cursor.execute("""
                   INSERT INTO batches(bid, owner, batch_comment)
                   VALUES(%s, %s, %s);
                   """, (bid, uid, comment))
    return bid

  @provideCursor
  def listOpenBatches(self, uid, cursor = None):
    if uid == None:
      return None

    cursor.execute("""
                   SELECT bid, batch_comment
                   FROM batches
                   WHERE batch_closed IS NULL AND owner = %s;
                   """, (uid,))
    return cursor.fetchall()

  @provideCursor
  def listBatchImages(self, bid, cursor = None):
    cursor.execute("SELECT iid FROM images WHERE bid = %s;", (bid,))
    return [x[0] for x in cursor.fetchall()]

  @provideCursor
  def getBatchDetails(self, uid, bid, cursor = None):
    if bid != None:
      cursor.execute("""
                     SELECT status, %s, %s, %s, %s,
                            image_top, image_left, image_width, image_height,
                            tile_width, tile_height, pixel_size,
                            image_crc32, image_md5, iid,
                            invalid, source_crc32,
                            source_filesize, declared_size, filename
                     FROM images
                     WHERE owner = %s AND bid = %s;
                     """, (OWNER_PRIVILEGE, OWNER_PRIVILEGE, OWNER_PRIVILEGE,
                           OWNER_PRIVILEGE, uid, bid))
    else:
      cursor.execute("""
                     SELECT status, %s, %s, %s, %s,
                            image_top, image_left, image_width, image_height,
                            tile_width, tile_height, pixel_size,
                            image_crc32, image_md5,
                            iid, invalid, source_crc32,
                            source_filesize, declared_size, filename
                     FROM images
                     WHERE owner = %s AND bid IS NULL;
                     """, (OWNER_PRIVILEGE, OWNER_PRIVILEGE, OWNER_PRIVILEGE,
                           OWNER_PRIVILEGE, uid))

    #TODO: check for batch existence???
    return cursor.fetchall()

  @provideCursor
  def closeBatch(self, uid, bid, comment = None, cursor = None):
    if uid == None:
      return False

    if comment == None:
      cursor.execute("""
                     UPDATE batches
                     SET batch_closed = now()
                     WHERE owner = %s AND bid = %s AND batch_closed IS NULL;
                     """, (uid, bid))

    else:
      cursor.execute("""
                     UPDATE batches
                     SET batch_closed = now(), batch_comment = %s
                     WHERE owner = %s AND bid = %s AND batch_closed IS NULL;
                     """, (comment, uid, bid))

    return cursor.rowcount == 1

  def getUploadSlotClass(self):
    thisInstance = self
    class UploadSlot(object):
      def __init__(self, uid, iid = None, filename = None,
                   declared_size = None, declared_md5 = None, bid = None,
                   pixel_size = None, image_top = None, image_left = None):
        if iid is None:
          iid = thisInstance.makeUploadSlot(uid, filename, declared_size,
                                            bid = bid,
                                            declared_md5 = declared_md5,
                                            pixel_size = pixel_size,
                                            image_top = image_top,
                                            image_left = image_left)
          crc32 = 0
          size = 0
          todo = declared_size
          os.umask(stat.S_IRWXG | stat.S_IRWXO | stat.S_IXUSR)

        else:
          crc32, size, filename, todo = thisInstance.readUploadSlot(uid, iid)

        self.iid = iid
        self.crc32 = crc32
        self.size = size
        self.todo = todo
        self.filename = filename
        self.name = os.path.join(thisInstance.sourceDir, "%d" % iid)
        self.fh = open(self.name, 'wb' if size == 0 else 'r+b')

        if size != 0:
          self.fh.seek(size)

      def write(self, data):
        if self.fh.closed:
          raise ValueError("The slot is already closed.")

        self.crc32 = zlib.crc32(data, self.crc32)
        ld = len(data)
        self.todo -= ld
        if self.todo < 0:
          raise ValueError("More data requested to be written than expected.")

        self.fh.seek(self.size)
        self.size += ld
        return self.fh.write(data)

      def flush(self):
        return self.fh.flush()

      def seek(self, *args, **kwargs):
        return self.fh.seek(*args, **kwargs)

      def close(self, launch = True):
        if not self.fh.closed:
          self.fh.flush()
          thisInstance.writeUploadSlot(self.iid, self.crc32, self.size,
                                       finish = self.todo == 0, launch = launch)

        return self.fh.close()

      def __del__(self):
        if not self.fh.closed:
          self.close()

    return UploadSlot

  @provideCursor
  def getDuplicateImages(self, uid, imageHash, filesize, cursor = None):
    """
    Gets all duplicate images by comparing the source_md5 and file size
    User must also privilege to view the image for it to be considered as a duplicate
    """
    cursor.execute("""
                   SELECT iid, filename
                   FROM images 
                   WHERE source_md5 = %s AND declared_size = %s
                         AND ((status >= %s AND owner = %s) OR status = %s); 
                   """, (imageHash.lower(), filesize, IMAGE_STATUS_RECEIVED, uid,
                         IMAGE_STATUS_ACCEPTED))
    return [row for row in cursor if self.canAccessImage(row[0], uid,
                                   thresholdStatus = IMAGE_STATUS_RECEIVED)]

# broken image -> view privileges are not enough!!!
# TODO: refactoring
# TODO: think about safety of status check
  @provideCursor
  def getBrokenImages(self, uid, imageHash, filesize, cursor = None):
    """
    Gets all images that are broken uploads by comparing the source_md5
    User must also privilege to view the image for it to be considered as a broken upload
    """
    cursor.execute('''
                   SELECT iid, source_filesize, filename, source_crc32
                   FROM images 
                   WHERE source_md5 = %s AND declared_size = %s
                                         AND status IN (%s, %s);
                   ''', (imageHash.lower(), filesize, IMAGE_STATUS_UPLOADING,
                         IMAGE_STATUS_RECEIVING))
    r = cursor.fetchall()
    if r:
      print r
      return [row for row in r if self.getPrivileges(row[0], uid = uid)[2] > NO_PRIVILEGE]

    return []
  
  @provideCursor
  def getImagesStatuses(self, uid, iids, cursor = None):
    '''
    Returns an array of tuples of iid and status
    '''
    statuses = []
    for iid in iids:
      row = self.accessImage(iid, uid, thresholdStatus = IMAGE_STATUS_RECEIVED,
      extraFields = """,
                    image_top, image_left, image_width, image_height,
                    tile_width, tile_height, pixel_size,
                    image_crc32, image_md5, iid""")
      if row:
        statuses.append(row)

    return statuses

  @manageConnection()
  def makeUploadSlot(self, uid, filename, declared_size, bid = None,
                     declared_md5 = None, pixel_size = None,
                     image_top = None, image_left = None,
                     cursor = None, db = None):
    if uid is None:
      return None

    if bid is not None:
      cursor.execute("""
                     SELECT EXISTS (SELECT *
                                    FROM batches
                                    WHERE bid = %s AND owner = %s);
                     """,
                     (bid, uid))
      if not cursor.fetchone()[0]:
        return None

    cursor.execute("SELECT nextval('images_iid_seq');")
    iid = cursor.fetchone()[0]

    cursor.execute("""
                   INSERT INTO images(iid, status, owner, filename,
                                      declared_size, bid, source_md5,
                                      pixel_size, image_top, image_left)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                   """, (iid, IMAGE_STATUS_RECEIVING, uid, filename,
                         declared_size, bid,
                         declared_md5.lower() if declared_md5 is not None else None,
                         pixel_size, image_top, image_left))
    if cursor.rowcount:
      return iid

  @provideCursor
  def readUploadSlot(self, uid, iid, cursor = None):
    if uid == None:
      return None

    cursor.execute("""
                   UPDATE images
                   SET status = %s
                   WHERE owner = %s AND iid = %s AND status = %s;
                   """, (IMAGE_STATUS_RECEIVING, uid, iid, IMAGE_STATUS_UPLOADING))

    if cursor.rowcount != 1:
      return None
      # not such iid or iid not associated with uid,
      # or not in IMAGE_STATUS_UPLOADING state

    cursor.execute("""
                   SELECT source_crc32, source_filesize, filename,
                   declared_size - source_filesize
                   FROM images
                   WHERE iid = %s;
                   """, (iid,))

    return cursor.fetchone()

  @provideCursor
  def writeUploadSlot(self, iid, crc32, size, finish = False, launch = True, cursor = None):
    cursor.execute("""
                   UPDATE images
                   SET source_crc32 = %s, source_filesize = %s, status = %s,
                       upload_end = now()
                   WHERE iid = %s;
                   """, (ctypes.c_int32(crc32).value, size,
                         IMAGE_STATUS_RECEIVED if finish else IMAGE_STATUS_UPLOADING,
                         iid))
    if cursor.rowcount == 1:
      if finish and launch:
        launchImageTiling(iid)

      return True

    return False

  @provideCursor
  def getMetadata(self, iid, cursor = None):
    cursor.execute("""
                   SELECT pixel_size, image_top, image_left
                   FROM images
                   WHERE iid = %s;
                   """, (iid,))
    if cursor.rowcount > 0:
      return cursor.fetchone()

  @provideCursor
  def updateMetadata(self, iid, pixelSize = None, imageLeft = None,
                     imageTop = None, status = None,
                     pixelSizeX = None, pixelSizeY = None, cursor = None):
    toUpdate = [(x, y) for (x, y) in [('pixel_size', pixelSize),
                                      ('image_left', imageLeft),
                                      ('image_top', imageTop),
                                      ('status', status),
                                      ('pixel_size_x', pixelSizeX),
                                      ('pixel_size_y', pixelSizeY)]\
                if y is not None]
    if len(toUpdate) == 0:
      return False

    fields, data = zip(*toUpdate)
    data += iid,
    query = """
            UPDATE images
            SET %s
            WHERE iid = %%s;
            """ % (', '.join("%s = %%s" % x for x in fields))
    cursor.execute(query, data)
    return cursor.rowcount == 1

  @manageConnection()
  def deleteImage(self, iid, cursor = None, db = None):
    cursor.execute("""
                   UPDATE images
                   SET status = %s
                   WHERE iid = %s AND status >= %s;
                   """,
                   (IMAGE_STATUS_REMOVED, iid, IMAGE_STATUS_COMPLETED))
    if cursor.rowcount != 1:
      return False

    cursor.execute("""
                   DELETE FROM properties
                   WHERE iid = %s;
                   """, (iid,))
    cursor.execute("""
                   DELETE FROM image_privileges_cache
                   WHERE iid = %s;
                   """, (iid,))
    cursor.execute("""
                   DELETE FROM image_privileges
                   WHERE iid = %s;
                   """, (iid,))
    return True

  @provideCursor
  def acceptImage(self, uid, iids, imageRes, imageLeft = 0., imageTop = 0.,
                  cursor = None):
    if uid == None:
      return None

    if isinstance(iids, (int, long)):
      iids = [iids]

    data = [(imageTop, imageLeft, imageRes, IMAGE_STATUS_ACCEPTED,
             iid, uid, IMAGE_STATUS_COMPLETED) for iid in iids]

    cursor.executemany("""
                       UPDATE images
                       SET image_top = %s, image_left = %s,
                           pixel_size = %s, status = %s
                       WHERE iid = %s AND owner = %s AND status = %s;
                       """, data)
    return cursor.rowcount

  @provideCursor
  def processingImage(self, iid, cursor = None):
    cursor.execute("""
                   UPDATE images
                   SET status = %s
                   WHERE iid = %s AND status = %s;
                   """, (IMAGE_STATUS_PROCESSING,
                         iid, IMAGE_STATUS_RECEIVED))
    if cursor.rowcount == 1:
      return IMAGE_STATUS_RECEIVED, None, None

    cursor.execute("""
                   SELECT status, image_width, image_height
                   FROM images
                   WHERE iid = %s;
                   """, (iid,))
    if cursor.rowcount == 1:
      return cursor.fetchone()

    raise KeyError("Source image #%d not found in processing queue." % iid)

  @provideCursor
  def imageInvalid(self, iid, invalid, cursor = None):
    """
    Mark image as invalid.

    @param iid: Image identifier.
    @type iid: int

    @param invalid: Comment on image invalidity.
    @type invalid: str or unicode
    """
    cursor.execute("""
                   UPDATE images
                   SET status = %s, invalid = %s
                   WHERE iid = %s;
                   """, (IMAGE_STATUS_ERROR, invalid, iid))

  @manageConnection()
  def imageIdentified(self, iid, crc32, invalid, meta, magick, md5 = None,
                      cursor = None, db = None):
    cursor.execute("""
                   UPDATE images
                   SET status = %s, invalid = %s, image_crc32 = %s,
                       source_meta = %s, source_magick = %s, image_md5 = %s
                   WHERE iid = %s;
                   """, (IMAGE_STATUS_IDENTIFIED, invalid,
                         ctypes.c_int32(crc32).value, meta, magick,
                         md5.lower() if md5 is not None else md5, iid))
    if cursor.rowcount != 1:
      raise KeyError("ERROR: Unable to mark image #%d as identified." % iid)
    
  @provideCursor
  def imageTiled(self, iid, tileWidth, tileHeight, jpegSize = None,
                 cursor = None):
    cursor.execute("""
                   UPDATE images
                   SET status = %s, tile_width = %s, tile_height = %s,
                       fid = iid, jpeg_size = %s
                   WHERE iid = %s AND status = %s;
                   """, (IMAGE_STATUS_TILED, tileWidth, tileHeight,
                         jpegSize, iid, IMAGE_STATUS_IDENTIFIED))
    if cursor.rowcount != 1:
      raise KeyError("ERROR: Unable to mark image #%d as tiled." % iid)

  @provideCursor
  def imageCompleted(self, iid, pngSize = None, md5 = None, cursor = None):
    if md5 == None:
      cursor.execute("""
                     UPDATE images
                     SET status = %s, png_size = %s
                     WHERE iid = %s AND status = %s;
                     """, (IMAGE_STATUS_COMPLETED, pngSize,
                           iid, IMAGE_STATUS_TILED))
    else:
      cursor.execute("""
                     UPDATE images
                     SET status = %s, image_md5 = %s, png_size = %s
                     WHERE iid = %s AND status = %s;
                     """, (IMAGE_STATUS_COMPLETED, md5.lower(), pngSize,
                           iid, IMAGE_STATUS_TILED))

    if cursor.rowcount != 1:
      raise KeyError("ERROR: Unable to mark image #%d as completed." % iid)



  @manageConnection()
  def clean(self, cursor = None, db = None):
    """
    Deduplicate and remove files of removed images.
    """
    #XXX WARNING: should be executed only when there is no tiling in progress!
    # and the service is paused
    cursor.execute("""
                   SELECT image_crc32, image_md5, image_width, image_height
                   FROM images
                   WHERE image_md5 IS NOT NULL AND image_crc32 IS NOT NULL
                         AND iid = fid AND status IN (%s, %s, %s)
                   GROUP BY image_crc32, image_md5, image_width, image_height
                   HAVING COUNT(*) > 1;
                   """,
                   (IMAGE_STATUS_REMOVED, IMAGE_STATUS_COMPLETED,
                    IMAGE_STATUS_ACCEPTED))
    rows = cursor.fetchall()
    for row in rows:
      # only FID-s of non-deleted images are important for deduplication -
      # other would be deleted later
      cursor.execute("""
                     SELECT fid, tile_width, tile_height
                     FROM images
                     WHERE image_crc32 = %s AND image_md5 = %s AND
                           image_width = %s AND image_height = %s AND
                           status IN (%s, %s)
                     GROUP BY fid, tile_width, tile_height
                     ORDER BY MAX(CASE WHEN iid = fid THEN status
                                  ELSE %s END) DESC, fid ASC;
                     """,
                     row + (IMAGE_STATUS_COMPLETED, IMAGE_STATUS_ACCEPTED,
                            IMAGE_STATUS_MIN))
      suspected = cursor.fetchall()
      while len(suspected) > 0:
        fid, tileWidth, tileHeight = suspected.pop(0)
        path = os.path.join(self.tileDir,
                            '%d' % fid,
                            'image.png')
        if not os.path.exists(path):
          #TODO: error handling
          print "ERROR: unable to find %s" % path
          continue

        original = os.path.join('/tmp', 'SkwarkiOriginal_%d.raw' % fid) 
        # suggested ImageMagick 6.6.9-7
        stream =  ['stream']
        stream += ['-map', 'rgb']
        stream += ['-storage-type', 'char']
        stream += ['-regard-warnings']
        stream += [path, original]

        processStream = subprocess.Popen(stream)
        processStream.wait()

        fh = open(original, 'rb')
        newSuspected = []
        for investigated in suspected:

          path = os.path.join(self.tileDir,
                              '%d' % investigated[0],
                              'image.png')
          if not os.path.exists(path):
            #TODO: error handling
            print "ERROR: unable to find %s" % path
            continue

          fh.seek(0)

          stream =  ['stream']
          stream += ['-map', 'rgb']
          stream += ['-storage-type', 'char']
          stream += ['-regard-warnings']
          stream += [path, '-']
          processStream = subprocess.Popen(stream, stdout = subprocess.PIPE)

          line = processStream.stdout.read(1024)
          same = line == fh.read(1024)
          while same and line != '':
            line = processStream.stdout.read(1024)
            same = line == fh.read(1024)

          if same:
            processStream.wait()
            print "File of ID %d is a duplicate of file of ID %d. Removed."\
                  % (investigated[0], fid)
            cursor.execute("""
                           UPDATE images
                           SET fid = %s, tile_width = %s, tile_height = %s
                           WHERE fid = %s;
                           """, (fid, tileWidth, tileHeight, investigated[0]))
            investigatedPath = os.path.join(self.tileDir, '%d' % investigated[0])
            os.chmod(investigatedPath, stat.S_IRWXU)
            for root, dirs, files in os.walk(investigatedPath):
              for filename in dirs:
                os.chmod(os.path.join(root, filename), stat.S_IRWXU)

              for filename in files:
                os.chmod(os.path.join(root, filename), stat.S_IRUSR | stat.S_IWUSR)

            shutil.rmtree(investigatedPath)

          else:
            processStream.kill()
            print "WARNING: Files of ID %d and %d have the same hashes but differs"\
                  % (fid, investigated[0])
            newSuspected.append(investigated)

        os.remove(original)
        suspected = newSuspected

    # look for tile stacks requiring renaming/deletion
    cursor.execute("""
                   SELECT fid, MIN(CASE WHEN status != %s THEN iid
                                   ELSE NULL END) AS new_fid
                   FROM images
                   WHERE fid IS NOT NULL
                   GROUP BY fid
                   HAVING MIN(CASE WHEN status != %s THEN iid
                              ELSE NULL END) != fid
                          OR BOOL_AND(status = %s);
                   """, (IMAGE_STATUS_REMOVED, IMAGE_STATUS_REMOVED,
                         IMAGE_STATUS_REMOVED))
    for fid, newFid in cursor.fetchall():
      path = os.path.join(self.tileDir, '%d' % fid)
      if newFid is None:
        # all images assigned to the stack are deleted
        print "No images assigned to tile stack of ID %d. Removing." % fid
        os.chmod(path, stat.S_IRWXU)
        for root, dirs, files in os.walk(path):
          for filename in dirs:
            os.chmod(os.path.join(root, filename), stat.S_IRWXU)

          for filename in files:
            os.chmod(os.path.join(root, filename), stat.S_IRUSR | stat.S_IWUSR)

        shutil.rmtree(path)

      else:
        print "Tile stack of ID %d renamed to ID %d." % (fid, newFid)
        os.rename(path, os.path.join(self.tileDir, '%d' % newFid))

        cursor.execute("""
                       UPDATE images
                       SET fid = %s
                       WHERE fid = %s;
                       """, (newFid, fid))

    cursor.execute("""
                   UPDATE images
                   SET fid = NULL,
                       tile_width = NULL,
                       tile_height = NULL
                   WHERE fid IS NOT NULL AND status = %s;
                   """, (IMAGE_STATUS_REMOVED,))

if __name__ == '__main__':
  from database import db, dbPool
  servicePath = os.path.abspath(os.path.dirname(__file__))
  tileDir = os.path.join(servicePath, 'tiles')
  sourceDir = os.path.join(servicePath, 'sourceImages')
  tb = TileBase(db, dbPool, tileDir, sourceDir)

