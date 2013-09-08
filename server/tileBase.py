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
import shutil

import psycopg2
import psycopg2.extras
import zlib
import tempfile
import subprocess

from database import provideCursor, dbBase


IMAGE_STATUS_UPLOADING = 0
IMAGE_STATUS_RECEIVING = 1
IMAGE_STATUS_RECEIVED = 2
IMAGE_STATUS_PROCESSING = 3
IMAGE_STATUS_IDENTIFIED = 4
IMAGE_STATUS_TILED = 5
IMAGE_STATUS_COMPLETED = 6
IMAGE_STATUS_ACCEPTED = 7
IMAGE_STATUS_REMOVED = -1
IMAGE_STATUS_ERROR = -2


from config import BS_TILER_THREADS, BS_TILER_MEMORY 

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
  launch.communicate("python %(command)s %(iid)d --threads %(threads)d --limit %(limit)d > %(log)s/%(iid)d_out.txt 2> %(log)s/%(iid)d_err.txt\n" % {'command': tilingCommand, 'iid': iid, 'log': tilingLogs, 'threads': BS_TILER_THREADS, 'limit': BS_TILER_MEMORY})


class UploadSlot(object):
  def __init__(self, directory):
    self.fh = tempfile.NamedTemporaryFile('w+b', dir=directory)
    self.crc32 = 0
    self.size = 0

  def write(self, data):
#     print('Came to write')
    if not self.fh.closed:
      self.crc32 = zlib.crc32(data, self.crc32)
      self.size += len(data)

    return self.fh.write(data)

  def close(self):
    return self.fh.close()

  def flush(self):
    return self.fh.flush()

  def seek(self, *args, **kwargs):
    return self.fh.seek(*args, **kwargs)

  def finish(self, filename):
    '''
    Appends the slot data to file passed in bytes
    Closes the slot which is must for chunk image upload 
    '''
    try:
      self.fh.flush()
      fd = open(filename, 'ab')
      self.fh.seek(0)
      data = self.fh.read(1024 * 1024)
      while data:
        fd.write(data)
        data = self.fh.read(1024 * 1024)

      #fd.write(self.fh.read())# XXX: DANGEROUS - read() reads a whole file, so if the file size is about 1GiB and server is running on a PC eith only 512 MiB of RAM - the server is fried
      fd.close()
      self.fh.close()
    except:
      pass


class TileBase(dbBase):
  def __init__(self, db, tileDir, sourceDir):
    dbBase.__init__(self, db)
    self.tileDir = tileDir
    self.sourceDir = sourceDir
    self.UploadSlot = self.getUploadSlotClass()

  @provideCursor
  def canViewImage(self, iid, uid = None, extraFields = '', cursor = None):
    cursor.execute("""
                   SELECT status, uid, public_image_view, public_image_edit %s
                   FROM images
                   WHERE iid = %%s;
                   """ % extraFields, (iid,))
    if cursor.rowcount != 1:
      # not found
      return None

    row = cursor.fetchone()
    status, owner, view, edit = row[:4]

    if status < IMAGE_STATUS_COMPLETED:
      # not completed
      return False

    if status > IMAGE_STATUS_COMPLETED and view or owner == uid or edit:
      # completed & public or owner or publicly editible
      return row[4:]

    if uid == None: #anonymous user cannot be in a group
      return False

    cursor.execute("""
                   SELECT COUNT(*), BOOL_OR(image_edit)
                   FROM image_privileges_cache
                   WHERE iid = %s AND uid = %s;
                   """, (iid, uid))
    view, edit = cursor.fetchone()
    if edit == True or view > 0 and status > IMAGE_STATUS_COMPLETED:
      return row[4:]

    return False

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
    fid = self.canViewImage(request.id,
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
    row = self.canViewImage(request.id,
                            uid = request.session.get('userID'),
                            extraFields = """,
                            image_top, image_left, image_width, image_height,
                            tile_width, tile_height, pixel_size,
                            image_crc32, image_md5""")
    if isinstance(row, tuple):
      return {'imageTop': row[0],
              'imageLeft': row[1],
              'imageWidth': row[2],
              'imageHeight': row[3],
              'tileWidth': row[4],
              'tileHeight': row[5],
              'pixelSize': row[6],
              'crc32': row[7],
              'md5': row[8]}

    return None

  #TODO: remove after tests
  @provideCursor
  def _allImages(self, uid = None, cursor = None):
    if uid != None:
      cursor.execute("""
                     SELECT filename, iid
                     FROM images
                     WHERE status > %s AND public_image_view
                        OR status >= %s AND (public_image_edit
                                             OR uid = %s)
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
                           IMAGE_STATUS_COMPLETED,
                           IMAGE_STATUS_COMPLETED,
                           uid, uid))

    else:
      cursor.execute("""
                     SELECT filename, iid
                     FROM images
                     WHERE status > %s AND public_image_view
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
                   INSERT INTO batches(bid, uid, batch_comment)
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
                   WHERE batch_closed IS NULL AND uid = %s;
                   """, (uid,))
    return cursor.fetchall()

  @provideCursor
  def listBatchImages(self, bid, cursor = None):
    cursor.execute("SELECT iid FROM images WHERE bid = %s;", (bid,))
    return [x[0] for x in cursor.fetchall()]

  @provideCursor
  def getBatchDetails(self, uid, bid, cursor = None):
    if uid == None:
      return None

    if bid != None:
      cursor.execute("""
                     SELECT iid, status, image_crc32, invalid, source_crc32,
                            source_filesize, declared_size, filename
                     FROM images
                     WHERE uid = %s AND bid = %s;
                     """, (uid, bid))
    else:
      cursor.execute("""
                     SELECT iid, status, image_crc32, invalid, source_crc32,
                            source_filesize, declared_size, filename
                     FROM images
                     WHERE uid = %s AND bid IS NULL;
                     """, (uid,))

    #TODO: check for batch existence???

    return dict((x[0], x[1:]) for x in cursor.fetchall())

  @provideCursor
  def closeBatch(self, uid, bid, comment = None, cursor = None):
    if uid == None:
      return False

    if comment == None:
      cursor.execute("""
                     UPDATE batches
                     SET batch_closed = now()
                     WHERE uid = %s AND bid = %s AND batch_closed IS NULL;
                     """, (uid, bid))

    else:
      cursor.execute("""
                     UPDATE batches
                     SET batch_closed = now(), batch_comment = %s
                     WHERE uid = %s AND bid = %s AND batch_closed IS NULL;
                     """, (comment, uid, bid))

    return cursor.rowcount == 1

  def getUploadSlotClass(self):
    thisInstance = self
    class UploadSlot(object):
      def __init__(self, uid, iid = None, filename = None,
                   declared_size = None, bid = None):
        if iid == None:
          iid = thisInstance.makeUploadSlot(uid, filename, declared_size, bid)
          crc32 = 0
          size = 0
          todo = declared_size

        else:
          crc32, size, filename, todo = thisInstance.readUploadSlot(uid, iid)

        self.iid = iid
        self.crc32 = crc32
        self.size = size
        self.todo = todo
        self.filename = filename
        self.name = os.path.join(thisInstance.sourceDir, "%d" % iid)
        self.fh = open(self.name, 'wb' if size == 0 else 'ab')

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

      def close(self):
        if not self.fh.closed:
          self.fh.flush()
          thisInstance.writeUploadSlot(self.iid, self.crc32, self.size,
                                       finish = self.todo == 0)

        return self.fh.close()

      def __del__(self):
        if not self.fh.closed:
          self.close()

    return UploadSlot

  @provideCursor
  def checkDuplicateImages(self, uid, imageHash, cursor = None):
    '''
    Gets all duplicate images
    '''
    cursor.execute('''
                    select iid from images 
                    where status >= %s and 
                    source_md5 = %s
                    ''', (IMAGE_STATUS_RECEIVED, imageHash))
    r = cursor.fetchall()
    if r: return [str(row[0]) for row in r if self.hasPrivilege(uid, row[0])]
    return []

  @provideCursor
  def checkBrokenImages(self, uid, imageHash, cursor = None):
    '''
    Gets all images that are broken uploads
    '''
    cursor.execute('''
                    select iid from images 
                    where status = %s and 
                    source_md5 = %s
                    ''', (IMAGE_STATUS_UPLOADING, imageHash))
    r = cursor.fetchall()
    if r: return [str(row[0]) for row in r if self.hasPrivilege(uid, row[0])]
    return []
  
  @provideCursor
  def createNewImageSlot(self, uid, imageHash, filename, file_size, bid, cursor = None):
    cursor.execute("SELECT nextval('images_iid_seq');")
    iid = cursor.fetchone()[0]
    cursor.execute("""
                   INSERT INTO images(iid, uid, status, source_md5, filename, declared_size, bid)
                   VALUES(%s, %s, %s, %s, %s, %s, %s);
                   """, (iid, uid, IMAGE_STATUS_UPLOADING, imageHash, filename, file_size, bid))
    return str(iid)

  @provideCursor
  def hasPrivilege(self, uid, iid, cursor = None):
    '''
    Checks if the given user has privilege to view the given image. 
    If yes, returns True, else False
    '''
    return True

  @provideCursor
  def makeUploadSlot(self, uid, filename, declared_size, bid, cursor = None):
    if uid == None:
      return None

    if bid != None:
      cursor.execute("SELECT EXISTS (SELECT * FROM batches WHERE bid = %s AND uid = %s);",
                     (bid, uid))
      if not cursor.fetchone()[0]:
        return None

    cursor.execute("SELECT nextval('images_iid_seq');")
    iid = cursor.fetchone()[0]

    cursor.execute("""
                   INSERT INTO images(iid, status, uid, filename,
                                      source_crc32, source_filesize,
                                      declared_size, bid)
                   VALUES(%s, %s, %s, %s, '00000000', 0, %s, %s);
                   """, (iid, IMAGE_STATUS_RECEIVING, uid, filename,
                         declared_size, bid))
    return iid

  @provideCursor
  def readUploadSlot(self, uid, iid, cursor = None):
    if uid == None:
      return None

    cursor.execute("""
                   UPDATE images
                   SET status = %s
                   WHERE uid = %s AND iid = %s AND status = %s;
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

    crc32, size, filename, todo = cursor.fetchone()
    return int(crc32, 16), size, filename, todo

  @provideCursor
  def writeUploadSlot(self, iid, crc32, size, finish = False, launch = True, cursor = None):
    cursor.execute("""
                   UPDATE images
                   SET source_crc32 = %s, source_filesize = %s, status = %s,
                       upload_end = now()
                   WHERE iid = %s;
                   """, (format(crc32 & 0xffffffff, "08x"), size,
                         IMAGE_STATUS_RECEIVED if finish else IMAGE_STATUS_UPLOADING,
                         iid))
    if cursor.rowcount == 1:
      if finish and launch:
#         pass
        launchImageTiling(iid)

      return True

    return False


  @provideCursor
  def appendSlot(self, uid, slot, filename, bid = None, launch = True, cursor = None):
    if uid == None:
      return None

    iid = self.makeUploadSlot(uid, filename, slot.size, bid, cursor = cursor)
    if iid == None:
      return None

    slot.finish(os.path.join(self.sourceDir, "%d" % iid))
    if self.writeUploadSlot(iid, slot.crc32, slot.size, True, launch = launch, cursor = cursor):
      return iid
    
    return None
  
  def saveSlotAndFinishUpload(self, slot, iid, action, actionOnIid):
    '''
    Gets details of the image passed
    Appends slot data to existing image (in case of resuming upload)
    If image completely uploaded updates the DB and triggers tiling
    '''
    if action is 's' or action is 'r':
      self.removeIid(iid)
  
    if action is 'r': 
      iid = actionOnIid

    if action is 'n' or action is 'r':
      filepath = os.path.join(self.sourceDir, "%s" % iid) 
      slot.finish(filepath)
    
      filesystem_size = 0
      if os.path.isfile(filepath):
        filesystem_size = int(os.path.getsize(filepath)) 

      declared_size = self.getDeclaredFileSize(iid)
      if filesystem_size == declared_size:  # Check the declared_filesize in DB with existing filesize in FileSystem
        self.writeUploadSlot(iid, slot.crc32, declared_size, True)
      else:
        self.writeUploadSlot(iid, slot.crc32, filesystem_size, False)
    
    return iid

  @provideCursor
  def getDeclaredFileSize(self, iid, cursor = None):
    '''
    Returns the declared filesize from DB
    '''
    cursor.execute('SELECT declared_size from images where iid = %s', (iid,))
    return cursor.fetchone()[0]
  
  @provideCursor
  def removeIid(self, iid, cursor = None):
    '''
    Removes row with iid from DB
    '''
    cursor.execute('DELETE from images where iid = %s', (iid,))  

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
                       WHERE iid = %s AND uid = %s AND status = %s;
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
  def identificationFailed(self, iid, invalid, cursor = None):
    # mark image as invalid
    cursor.execute("""
                   UPDATE images
                   SET status = %s, invalid = %s
                   WHERE iid = %s;
                   """, (IMAGE_STATUS_ERROR, invalid, iid))

  @provideCursor
  def imageIdentified(self, iid, width, height, crc32, invalid,
                      meta, magick, md5 = None, cursor = None):
    cursor.execute("""
                   UPDATE images
                   SET status = %s, invalid = %s, image_width = %s,
                       image_height = %s, image_crc32 = %s, source_meta = %s,
                       source_magick = %s, image_md5 = %s
                   WHERE iid = %s;
                   """, (IMAGE_STATUS_IDENTIFIED, invalid, width, height,
                         format(crc32 & 0xffffffff, "08x"), meta, magick, md5,
                         iid))
    if cursor.rowcount != 1:
      raise KeyError("ERROR: Unable to mark image #%d as identified." % iid)
    
  @provideCursor
  def imageTiled(self, iid, tileWidth, tileHeight, cursor = None):
    cursor.execute("""
                   UPDATE images
                   SET status = %s, tile_width = %s, tile_height = %s, fid = iid
                   WHERE iid = %s AND status = %s;
                   """, (IMAGE_STATUS_TILED, tileWidth, tileHeight,
                         iid, IMAGE_STATUS_IDENTIFIED))
    if cursor.rowcount != 1:
      raise KeyError("ERROR: Unable to mark image #%d as tiled." % iid)

  @provideCursor
  def imageCompleted(self, iid, md5 = None, cursor = None):
    if md5 == None:
      cursor.execute("""
                     UPDATE images
                     SET status = %s
                     WHERE iid = %s AND status = %s;
                     """, (IMAGE_STATUS_COMPLETED,
                           iid, IMAGE_STATUS_TILED))
    else:
      cursor.execute("""
                     UPDATE images
                     SET status = %s, image_md5 = %s
                     WHERE iid = %s AND status = %s;
                     """, (IMAGE_STATUS_COMPLETED, md5,
                           iid, IMAGE_STATUS_TILED))

    if cursor.rowcount != 1:
      raise KeyError("ERROR: Unable to mark image #%d as completed." % iid)


  @provideCursor
  def deduplicate(self, cursor = None):
    #XXX WARNING: should be executed only when there is no tiling in progress!
    cursor.execute("""
                   SELECT image_crc32, image_md5
                   FROM (SELECT image_crc32, image_md5, COUNT(*) AS n
                         FROM images
                         WHERE image_md5 IS NOT NULL
                               AND image_crc32 IS NOT NULL
                               AND iid = fid
                         GROUP BY image_crc32, image_md5) AS foo
                   WHERE n > 1;
                   """)
    rows = cursor.fetchall()
    for row in rows:
      cursor.execute("""
                     SELECT fid, tile_width, tile_height
                     FROM images
                     WHERE image_crc32 = %s AND image_md5 = %s
                     ORDER BY fid;
                     """, row)
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
            shutil.rmtree(os.path.join(self.tileDir, '%d' % investigated[0]))

          else:
            processStream.kill()
            print "WARNING: Files of ID %d and %d have the same hashes but differs"\
                  % (fid, investigated[0])
            newSuspected.append(investigated)

        os.remove(original)
        suspected = newSuspected
