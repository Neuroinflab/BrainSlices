#!/usr/bin/python
# -*- coding: utf-8 -*-
###############################################################################
#                                                                             #
#    BrainSlices Software                                                     #
#                                                                             #
#    Copyright (C) 2014 Jakub M. Kowalski                                     #
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

import psycopg2
import psycopg2.extras

from database import provideCursor, provideConnection, manageConnection,\
                     dbBase, TransactionRollbackError, FOREIGN_KEY_VIOLATION,\
                     UNIQUE_VIOLATION

from tileBase import IMAGE_STATUS_COMPLETED, NO_PRIVILEGE, PUBLIC_PRIVILEGE, \
                     GROUP_PRIVILEGE, OWNER_PRIVILEGE, IMAGE_STATUS_REMOVED,\
                     IMAGE_STATUS_UPLOADING, IMAGE_STATUS_RECEIVED

def unwrapProperties(type_, number, string, visible, editable):
  prop = {'type': type_,
          'view': visible,
          'edit': editable}
  if type_ in 'fi':
    prop['value'] = number if type_ == 'f' else int(number)

  elif type_ in 'esx':
    prop['value'] = string

  return prop


class MetaBase(dbBase):
  class SelectBase(object):
    def __init__(self):
      self.data = []
      self.cond = []

    def getQuery(self):
      raise NotImplemented('Abstract class method called.')


  class SelectTag(SelectBase):
    def __init__(self, name = None):
      if name != None:
        self.data = [name.lower()]
        self.cond = ["%s.property_name = %%s"]

      else:
        self.data = []
        self.cond = []

    def getQuery(self, tail=None):
      if tail == None:
        return (1, ["properties AS tmp0"], [x % 'tmp0' for x in self.cond], list(self.data))

      
      n, query, cond, data = tail

      tmp = 'tmp%d' % n
      query.append('properties AS ' + tmp + ' USING (iid)')
      cond.extend(x % tmp for x in self.cond)
      data.extend(self.data)

      return (n+1, query, cond, data)


  class SelectNumber(SelectTag):
    def __init__(self, name=None, lt=None, eq=None, gt=None, lteq=None, gteq=None):
      super(self.__class__, self).__init__(name)

      self.cond.extend('%%s.property_number %s %f' % (op, n) for (op, n) in [('<', lt),
                                                      ('=', eq),
                                                      ('>', gt),
                                                      ('<=', lteq),
                                                      ('>=', gteq)] if n != None)

    def getQuery(self, tail = None):
      if tail == None:
        return (1, ["properties AS tmp0"], [x % 'tmp0' for x in self.cond], list(self.data))

      n, query, cond, data = tail

      tmp = 'tmp%d' % n
      query.append('properties AS ' + tmp + ' USING (iid)')
      cond.extend(x % tmp for x in self.cond)
      data.extend(self.data)

      return (n+1, query, cond, data)


  class SelectString(SelectTag):
    def __init__(self, name=None, oneof = None):
      super(self.__class__, self).__init__(name)

      if oneof:
        self.cond.append('LOWER(%%s.property_string) in (%s)' % \
                         ', '.join(['%%s'] * len(oneof)))

        self.data.extend(oneof)

    def getQuery(self, tail = None):
      if tail == None:
        return (1, ["properties AS tmp0"], [x % 'tmp0' for x in self.cond], list(self.data))

      n, query, cond, data = tail

      tmp = 'tmp%d' % n
      query.append('properties AS ' + tmp + ' USING (iid)')
      cond.extend(x % tmp for x in self.cond)
      data.extend(self.data)

      return (n+1, query, cond, data)


  class SelectText(SelectTag):
    def __init__(self, name=None, plain=None):
      super(self.__class__, self).__init__(name)

      #cond, data = zip(*[(op, s) for (op, s) in \
      #                   [('', match),
      #                    ('PLAIN', plain)]\
      #                   if s != None])
      #self.cond.extend("TO_TSVECTOR('english', %%s.property_string) @@ %sTO_TSQUERY('english', %%%%s)" % op for op in cond)
      #self.data.extend(data)
      if plain != None:
        self.cond.append("TO_TSVECTOR('english', %s.property_string) @@ PLAINTO_TSQUERY('english', %%s)")
        self.data.append(plain)

    def getQuery(self, tail = None):
      if tail == None:
        return (1, ["properties AS tmp0"], [x % 'tmp0' for x in self.cond], list(self.data))

      n, query, cond, data = tail

      tmp = 'tmp%d' % n
      query.append('properties AS ' + tmp + ' USING (iid)')
      cond.extend(x % tmp for x in self.cond)
      data.extend(self.data)

      return (n+1, query, cond, data)


  @provideCursor
  def getProperties(self, iid, privileges='a', cursor=None):
    cursor.execute("""
                   SELECT property_name, property_type,
                          property_number, property_string,
                          property_visible, property_editable
                   FROM properties
                   WHERE iid = %s AND property_visible <= %s;
                   """, (iid, privileges))
    res = dict((row[0], unwrapProperties(*row[1:]))\
               for row in cursor) # XXX Good design :-D

    return res

  @manageConnection()
  def unsetProperty(self, iid, name, privileges='a', cursor=None, db=None):
    cursor.execute("""
                   DELETE FROM properties
                   WHERE iid = %s AND property_name = %s
                         AND property_editable <= %s;
                   """, (iid, name.lower(), privileges))
    return cursor.rowcount == 1

  @provideConnection()
  def setProperty(self, iid, name, value=None, t=None,
                  visible='a', editable='a', privileges='a',
                  cursor=None, db=None):
    if privileges < visible or privileges < editable:
      print 'ERROR: An attempt to set too restrictive privileges.'
      return False

    if t == None:
      if isinstance(value, basestring):
        t='x'

      else:
        t='t' if value is None else 'f'

    else:
      t = t[0]

    name = name.lower()

    if t in 'tsxe':
      update = """
               UPDATE properties
               SET property_type = %s, property_string = %s,
                   property_visible = %s, property_editable = %s,
                   property_number = NULL
               WHERE iid = %s AND property_name = %s
                     AND property_editable <= %s;
               """
      insert = """
               INSERT INTO properties(property_type, property_string,
                                      property_visible, property_editable,
                                      iid, property_name)
               VALUES (%s, %s, %s, %s, %s, %s);
               """
      data = (t, name if t == 't' else value, visible, editable, iid, name)

    else: # 'i' or 'f'
      update = """
               UPDATE properties
               SET property_type = %s, property_number = %s,
                   property_string = %s,
                   property_visible = %s, property_editable = %s
               WHERE iid = %s AND property_name = %s
                     AND property_editable <= %s;
               """
      insert = """
               INSERT INTO properties(property_type, property_number,
                                      property_string, property_visible,
                                      property_editable, iid, property_name)
               VALUES (%s, %s, %s, %s, %s, %s, %s);
               """
      data = (t, value, str(value), visible, editable, iid, name)

    while True:
      try:
        cursor.execute(update, data + (privileges,))
        if cursor.rowcount == 0:
          cursor.execute(insert, data)

      except TransactionRollbackError:
        db.rollback()

      except psycopg2.IntegrityError as e:
        db.rollback()
        if e.pgcode == FOREIGN_KEY_VIOLATION:
          print "ERROR: No related image found."
          return False

        elif e.pgcode == UNIQUE_VIOLATION:
          print "ERROR: Property already exists (and access to it is restricted)."
          return False

        else:
          raise

      else:
        db.commit()
        return True

  @provideCursor
  def getPropertyList(self, cursor=None):
    cursor.execute("""
                   SELECT
                   property_name, BOOL_OR(property_number IS NOT NULL),
                   BOOL_OR(property_type != 't'),
                   BOOL_OR(property_type = 'e')
                   FROM properties
                   GROUP BY property_name
                   """)
    return dict((name, ('f' if number else '') + ('x' if string else '')\
                       + ('e' if enum else ''))\
                for (name, number, string, enum) in cursor)

  @provideCursor
  def getEnumeratedPropertyList(self, cursor=None):
    cursor.execute("""
                   SELECT
                   property_name, LOWER(property_string) AS s
                   FROM properties
                   WHERE property_type = 'e'
                   GROUP BY property_name, s
                   ORDER BY property_name;
                   """)
    res = {}
    if cursor.rowcount > 0:
      lastName, value = cursor.fetchone()
      last = [value]
      for name, value in cursor:
        if name != lastName:
          res[lastName] = last
          lastName = name
          last = []

        last.append(value)

      res[lastName] = last

    return res

  @provideCursor
  def searchImages(self, selectors, uid=None, privilege='v', limit=None, cursor=None):
    cond = "img.status >%s %d AND " % ('=' if privilege == 'e' else '',
                                       IMAGE_STATUS_COMPLETED)

    if uid is None:
      if privilege == 'v': # view
        cond += """
                (img.public_image_view OR
                 img.public_image_annotate OR
                 img.public_image_outline OR
                 img.public_image_edit)
                """

      elif privilege == 'a': # annotate
        cond += """
                (img.public_image_annotate OR
                 img.public_image_edit)
                """

      elif privilege == 'e': # edit
        cond += """
                img.public_image_edit
                """

      elif privilege == 'o': # outline
        cond += """
                (img.public_image_outline OR
                 img.public_image_edit)
                """

      elif privilege == 'm': # meta
        cond += """
                (img.public_image_edit OR
                 (img.public_image_outline AND
                  img.public_image_annotate))
                """

      tables = 'images AS img'

    else:
      if privilege == 'v': # view 
        cond += """
                (img.public_image_view OR
                 img.public_image_annotate OR
                 img.public_image_outline OR
                 img.public_image_edit OR
                 img.owner = %d OR
                 img.uid = %d)
                """ % (uid, uid)

      elif privilege == 'a': # annotate
        cond += """
                (img.public_image_annotate OR
                 img.public_image_edit OR
                 img.owner = %d OR
                 ((img.image_annotate OR
                   img.image_edit) AND
                  img.uid = %d))
                """ % (uid, uid)

      elif privilege == 'e': # edit
        cond += """
                (img.public_image_edit OR
                 img.owner = %d OR
                 (img.image_edit AND
                  img.uid = %d))
                """ % (uid, uid)

      elif privilege == 'o': # outline
        cond += """
                (img.public_image_outline OR
                 img.public_image_edit OR
                 img.owner = %d OR
                 ((img.image_outline OR
                   img.image_edit) AND
                  img.uid = %d)
                """ % (uid, uid)

      elif privilege == 'm': # meta
        #FIXME: would not detect privileges from different groups
        cond += """
                ((img.public_image_annotate AND
                  img.public_image_outline) OR
                 img.public_image_edit OR
                 img.owner = %d OR
                 (((img.image_outline AND
                    img.image_annotate) OR
                   img.image_edit) AND
                 img.uid = %d)
                """ % (uid, uid)

      tables = """
               (images LEFT JOIN image_privileges_cache USING (iid))
               """
    query = """
            SELECT img.iid
            FROM %s
            WHERE %s
            ORDER BY img.iid;
            """
    _, tables, cond, data = reduce(lambda x, y: y.getQuery(x), selectors,
                                   (0, [tables], [cond], []))


    query = query % (' JOIN '.join(tables), ' AND '.join(cond))

    print query
    cursor.execute(query, data)
    return [row[0] for row in cursor]

  @provideCursor
  def searchImagesPropertiesInfo(self, selectors, uid=None, privilege='v', bid=None, limit=None, cursor=None):
    cond = "img.status > %d AND " % IMAGE_STATUS_COMPLETED if privilege == 'c' else\
           "img.status <= %d AND img.status != %d AND " % (IMAGE_STATUS_COMPLETED, IMAGE_STATUS_REMOVED)

    if uid is None:
      if privilege == 'v': # view
        cond += """
                (img.public_image_view OR
                 img.public_image_annotate OR
                 img.public_image_outline OR
                 img.public_image_edit)
                """

      elif privilege == 'a': # annotate
        cond += """
                (img.public_image_annotate OR
                 img.public_image_edit)
                """

      elif privilege == 'e': # edit
        cond += """
                img.public_image_edit
                """

      elif privilege == 'o': # outline
        cond += """
                (img.public_image_outline OR
                 img.public_image_edit)
                """

      elif privilege == 'm': # meta
        cond += """
                (img.public_image_edit OR
                 (img.public_image_outline AND
                  img.public_image_annotate))
                """
      else: #elif privilege == 'c': # accept
        return []

      tables = 'images AS img'
      query = """
              SELECT prop.property_name, prop.property_type,
                     prop.property_number, prop.property_string,
                     prop.property_visible, prop.property_editable,

                     img.iid,
                     CASE WHEN img.public_image_view THEN %d
                          ELSE %d END,
                     CASE WHEN img.public_image_annotate THEN %d
                          ELSE %d END,
                     CASE WHEN img.public_image_edit THEN %d
                          ELSE %d END,
                     CASE WHEN img.public_image_outline THEN %d
                          ELSE %d END,

                     img.public_image_view, img.public_image_edit,
                     img.public_image_annotate, img.public_image_outline,

                     img.invalid,

                     img.image_top, img.image_left,
                     img.image_width, img.image_height,
                     img.tile_width, img.tile_height,
                     img.pixel_size, img.image_crc32, img.image_md5,

                     img.status

              FROM
              (
                SELECT img.iid,
                       img.public_image_view, img.public_image_annotate,
                       img.public_image_edit, img.public_image_outline,
                       img.invalid,
                       img.image_top, img.image_left,
                       img.image_width, img.image_height,
                       img.tile_width, img.tile_height,
                       img.pixel_size, img.image_crc32, img.image_md5,
                       img.status
                FROM %%s
                WHERE %%s
                LIMIT %%s
              ) AS img LEFT JOIN properties AS prop USING (iid)
              ORDER BY img.iid;
              """ % (PUBLIC_PRIVILEGE, NO_PRIVILEGE,
                     PUBLIC_PRIVILEGE, NO_PRIVILEGE,
                     PUBLIC_PRIVILEGE, NO_PRIVILEGE,
                     PUBLIC_PRIVILEGE, NO_PRIVILEGE)

    else:
      if bid is not None:
        cond += "img.owner = %d AND img.bid = %d AND " % (uid, bid)

      if privilege == 'v': # view 
        cond += """
                (img.public_image_view OR
                 img.public_image_annotate OR
                 img.public_image_outline OR
                 img.public_image_edit OR
                 img.owner = %d OR
                 img.uid = %d)
                """ % (uid, uid)

      elif privilege == 'a': # annotate
        cond += """
                (img.public_image_annotate OR
                 img.public_image_edit OR
                 img.owner = %d OR
                 ((img.image_annotate OR
                   img.image_edit) AND
                  img.uid = %d))
                """ % (uid, uid)

      elif privilege == 'e': # edit
        cond += """
                (img.public_image_edit OR
                 img.owner = %d OR
                 (img.image_edit AND
                  img.uid = %d))
                """ % (uid, uid)

      elif privilege == 'o': # outline
        cond += """
                (img.public_image_outline OR
                 img.public_image_edit OR
                 img.owner = %d OR
                 ((img.image_outline OR
                   img.image_edit) AND
                  img.uid = %d)
                """ % (uid, uid)

      elif privilege == 'm': # meta
        #FIXME: would not detect privileges from different groups
        cond += """
                ((img.public_image_annotate AND
                  img.public_image_outline) OR
                 img.public_image_edit OR
                 img.owner = %d OR
                 (((img.image_outline AND
                    img.image_annotate) OR
                   img.image_edit) AND
                 img.uid = %d)
                """ % (uid, uid)
      else: #elif privilege == 'c': # aCcept Completed
        cond += " img.owner = %d " % uid

      tables = """
               (images LEFT JOIN image_privileges_cache USING (iid)) AS img
               """
      query = """
              SELECT prop.property_name, prop.property_type,
                     prop.property_number, prop.property_string,
                     prop.property_visible, prop.property_editable,

                     img.iid,
                     img.image_view, img.image_annotate,
                     img.image_edit, img.image_outline,

                     img.public_image_view, img.public_image_edit,
                     img.public_image_annotate, img.public_image_outline,

                     img.invalid,

                     img.image_top, img.image_left,
                     img.image_width, img.image_height,
                     img.tile_width, img.tile_height,
                     img.pixel_size, img.image_crc32, img.image_md5,
                     img.status

              FROM 
              (
                SELECT img.iid,
                       CASE WHEN img.owner = %d THEN %d
                            WHEN COUNT(img.gid) > 0 THEN %d
                            WHEN img.public_image_view THEN %d
                            ELSE %d END AS image_view,
                       CASE WHEN img.owner = %d THEN %d
                            WHEN COALESCE(BOOL_OR(img.image_annotate), FALSE) THEN %d
                            WHEN img.public_image_annotate THEN %d
                            ELSE %d END AS image_annotate,
                       CASE WHEN img.owner = %d THEN %d
                            WHEN COALESCE(BOOL_OR(img.image_edit), FALSE) THEN %d
                            WHEN img.public_image_edit THEN %d
                            ELSE %d END AS image_edit,
                       CASE WHEN img.owner = %d THEN %d
                            WHEN COALESCE(BOOL_OR(img.image_outline), FALSE) THEN %d
                            WHEN img.public_image_outline THEN %d
                            ELSE %d END AS image_outline,
                       img.public_image_view, img.public_image_annotate,
                       img.public_image_edit, img.public_image_outline,
                       img.invalid,
                       img.image_top, img.image_left,
                       img.image_width, img.image_height,
                       img.tile_width, img.tile_height,
                       img.pixel_size, img.image_crc32, img.image_md5,
                       img.status
                FROM %%s
                WHERE %%s
                GROUP BY img.iid,
                         img.owner,
                         img.public_image_view, img.public_image_annotate,
                         img.public_image_edit, img.public_image_outline,
                         img.image_top, img.image_left,
                         img.image_width, img.image_height,
                         img.image_top, img.image_left,
                         img.tile_width, img.tile_height,
                         img.pixel_size, img.image_crc32, img.image_md5,
                         img.status
                LIMIT %%s
              ) AS img LEFT JOIN properties AS prop USING (iid)
              ORDER BY img.iid;
              """ % (uid, OWNER_PRIVILEGE, GROUP_PRIVILEGE, PUBLIC_PRIVILEGE, NO_PRIVILEGE,
                     uid, OWNER_PRIVILEGE, GROUP_PRIVILEGE, PUBLIC_PRIVILEGE, NO_PRIVILEGE,
                     uid, OWNER_PRIVILEGE, GROUP_PRIVILEGE, PUBLIC_PRIVILEGE, NO_PRIVILEGE,
                     uid, OWNER_PRIVILEGE, GROUP_PRIVILEGE, PUBLIC_PRIVILEGE, NO_PRIVILEGE)

    _, tables, cond, data = reduce(lambda x, y: y.getQuery(x), selectors,
                                   (0, [tables], [cond], []))


    query = query % (' JOIN '.join(tables), ' AND '.join(cond),
                     'ALL' if limit is None else '%d' % limit)

    print query
    cursor.execute(query, data)
    res = []
    if cursor.rowcount > 0:
      row = cursor.fetchone()
      name, t, n, s, v, e, lastIID = row[:7]
      last = {name: unwrapProperties(t, n, s, v, e)} if name is not None else {}
      info = (lastIID, last,
              max(row[7:11]), row[9], max(row[8:10]), max(row[9:11]))
      info = dict(zip(['iid', 'properties',
                       'viewPrivilege', 'editPrivilege',
                       'annotatePrivilege', 'outlinePrivilege',
                       'imageTop', 'imageLeft', 'imageWidth',
                       'imageHeight', 'tileWidth', 'tileHeight',
                       'pixelSize', 'crc32', 'md5', 'status'],
                      info + row[16:]))
      info['privileges'] = dict(zip(['publicView', 'publicEdit',
                                     'publicAnnotate', 'publicOutline'],
                                    row[11:15]))

      for row in cursor:
        name, t, n, s, v, e, iid = row[:7] #, w, h = row[:9]

        if iid != lastIID:
          if privilege == 'c':
            status = info['status']
            if status < IMAGE_STATUS_COMPLETED:
              if status >= IMAGE_STATUS_UPLOADING:
                if status >= IMAGE_STATUS_RECEIVED:
                  last['PROCESSING...'] = {'type': 't', 'view': 'a', 'edit': 'a'}

                else:
                  last['RECEIVING...'] = {'type': 't', 'view': 'a', 'edit': 'a'}

              else:
                invalid = row[15]
                last['ERROR'] = {'type': 'x', 'view': 'a', 'edit': 'a',
                                 'value': 'unknown error' if invalid is None else invalid}

          res.append(info)
          if limit != None and len(res) >= limit:
            return res

          last = {}
          lastIID = iid
          info = (iid, last,
                  max(row[7:11]), row[9], max(row[8:10]), max(row[9:11]))
          info = dict(zip(['iid', 'properties',
                           'viewPrivilege', 'editPrivilege',
                           'annotatePrivilege', 'outlinePrivilege',
                           'imageTop', 'imageLeft', 'imageWidth',
                           'imageHeight', 'tileWidth', 'tileHeight',
                           'pixelSize', 'crc32', 'md5', 'status'],
                          info + row[16:]))
          info['privileges'] = dict(zip(['publicView', 'publicEdit',
                                         'publicAnnotate', 'publicOutline'],
                                        row[11:15]))

        if name is not None:
          last[name] = unwrapProperties(t, n, s, v, e)

      if privilege == 'c':
        status = info['status']
        if status < IMAGE_STATUS_COMPLETED:
          if status >= IMAGE_STATUS_UPLOADING:
            if status >= IMAGE_STATUS_RECEIVED:
              last['PROCESSING...'] = {'type': 't', 'view': 'a', 'edit': 'a'}

            else:
              last['RECEIVING...'] = {'type': 't', 'view': 'a', 'edit': 'a'}

          else:
            invalid = row[15]
            last['ERROR'] = {'type': 'x', 'view': 'a', 'edit': 'a',
                             'value': 'unknown error' if invalid is None else invalid}

      res.append(info)

    return res

if __name__ == '__main__':
  from database import db, dbPool
  mb = MetaBase(db, dbPool)

