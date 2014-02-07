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

from tileBase import IMAGE_STATUS_COMPLETED

def unwrapProperties(type_, number, string, visible, editable):
  prop = {'type': type_,
          'view': visible,
          'edit': editable}
  if type_ in 'fi':
    prop['value'] = number if type_ == 'f' else int(number)

  elif type_ in 'sx':
    prop['value'] = string

  return prop


class MetaBase(dbBase):
  class SelectBase(object):
    def __init__(self):
      self.data = []
      self.cond = []

    def getQuery(self):
      raise NotImplemented('Abstract class method called.')


  class SelectVisible(SelectBase):
    def __init__(self, uid=None):
      if uid == None:
        self.cond = """
                    (tmp%%(n)d.status > %d AND (tmp%%(n)s.public_image_view OR
                                          tmp%%(n)d.public_image_annotate OR
                                          tmp%%(n)d.public_image_outline)
                     OR tmp%%(n)d.status >= %d AND tmp%%(n)s.public_image_edit)
                    """ % (IMAGE_STATUS_COMPLETED, IMAGE_STATUS_COMPLETED)
        self.query = 'images AS tmp%d'

      else:
        self.cond = """
                    (tmp%%(n)d.status > %d AND (tmp%%(n)s.public_image_view OR
                                      tmp%%(n)d.public_image_annotate OR
                                      tmp%%(n)d.public_image_outline OR
                                      tmp%%(n)d.uid = %d)
                     OR tmp%%(n)d.status >= %d AND (tmp%%(n)s.public_image_edit OR
                                          tmp%%(n)d.owner = %d OR
                                          tmp%%(n)d.uid = %d AND tmp%%(n)s.image_edit))
                    """ % (IMAGE_STATUS_COMPLETED, uid,
                           IMAGE_STATUS_COMPLETED, uid, uid)
        self.query = '(images LEFT JOIN image_privileges_cache USING (iid)) AS tmp%d'

    def getQuery(self, tail=None):
      if tail == None:
        return (1, [self.query % 0], [self.cond % {'n': 0}], [])

      n, query, cond, data = tail

      query.append(self.query % n + ' USING (iid)')
      cond.append(self.cond % {'n': n})

      return (n + 1, query, cond, data)


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
    def __init__(self, name=None, eq=None, like=None, similar=None, posix=None):
      super(self.__class__, self).__init__(name)

      cond, data = zip(*[(op, s) for (op, s) in [('=' , eq),
                                                 ('LIKE', like),
                                                 ('SIMILAR TO', similar),
                                                 ('~', posix)] if s != None])

      self.cond.extend('LOWER(%%s.property_string) %s %%%%s' % op for op in cond)
      self.data.extend(data)

    def getQuery(self, tail = None):
      if tail == None:
        return (1, ["properties AS tmp0"], [x % tmp0 for x in self.cond], list(self.data))

      n, query, cond, data = tail

      tmp = 'tmp%d' % n
      query.append('properties AS ' + tmp + ' USING (iid)')
      cond.extend(x % tmp for x in self.cond)
      data.extend(self.data)

      return (n+1, query, cond, data)


  class SelectText(SelectTag):
    def __init__(self, name=None, match=None, plain=None):
      super(self.__class__, self).__init__(name)

      cond, data = zip(*[(op, s) for (op, s) in \
                         [('', match),
                          ('PLAIN', plain)]\
                         if s != None])

      self.cond.extend("TO_TSVECTOR('english', %%s.property_string) @@ %sTO_TSQUERY('english', %%%%s)" % op for op in cond)
      self.data.extend(data)

    def getQuery(self, tail = None):
      if tail == None:
        return (1, ["properties AS tmp0"], [x % tmp0 for x in self.cond], list(self.data))

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
               for row in cursor)

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

    if t in 'tsx':
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
  def searchImages(self, selectors, limit=None, cursor=None):
    _, tables, cond, data = reduce(lambda x, y: y.getQuery(x), selectors, None)
    query = """
            SELECT tmp0.iid
            FROM %s
            WHERE %s
            %s;
            """ % (' JOIN '.join(tables), ' AND '.join(cond),
                   ('%d' % limit) if limit != None else '')

    cursor.execute(query, data)
    return cursor.fetchall()

  @provideCursor
  def searchImagesProperties(self, selectors, limit=None, cursor=None):
    _, tables, cond, data = reduce(lambda x, y: y.getQuery(x), selectors,
                                   (1, ["properties AS tmp0"], [], []))
    query = """
            SELECT tmp0.iid, tmp0.property_name, tmp0.property_type,
                   tmp0.property_number, tmp0.property_string,
                   tmp0.property_visible, tmp0.property_editable
            FROM %s
            WHERE %s
            ORDER BY tmp0.iid
            """ % (' JOIN '.join(tables), ' AND '.join(cond))
    cursor.execute(query, data)
    res = []
    if cursor.rowcount > 0:
      lastIID, name, t, n, s, v, e = cursor.fetchone()
      last = {name: unwrapProperties(t, n, s, v, e)}
      for iid, name, t, n, s, v, e in cursor:
        if iid != lastIID:
          res.append([lastIID, last])
          if limit != None and len(res) >= limit:
            return res

          last = {}

        lastIID = iid
        last[name] = unwrapProperties(t, n, s, v, e)

      res.append([lastIID, last])

    return res

if __name__ == '__main__':
  from database import db, dbPool
  mb = MetaBase(db, dbPool)

