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


class MetaBase(dbBase):
  class SelectBase(object):
    @staticmethod
    def getSelectQuery(*args):
      _, query, cond, data = reduce(lambda x, y: y.getQuery(x), args, None)
      return ("""
              SELECT tmp0.iid
              FROM %s
              WHERE %s;
              """ % (' JOIN '.join(query), ' AND '.join(cond)) , data)

    def getQuery(self):
      raise NotImplemented('Abstract class method called.')


  class SelectVisible(SelectBase):
    def __init__(self, uid=None, tail=None):
      self.tail = tail
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
    def __init__(self, name, types='t', tail=None):
      self.data = [name]
      self.tail = tail
      self.cond = [".property_type IN (%s)" % (', '.join("'%s'" % x for x in types)),
                   ".property_name = %s"]

    def getQuery(self, tail=None):
      if tail == None:
        return (1, ["properties AS tmp0"], ['tmp0' + x for x in self.cond], list(self.data))

      
      n, query, cond, data = tail

      tmp = 'tmp%d' % n
      query.append('properties AS ' + tmp + ' USING (iid)')
      cond.extend(tmp + x for x in self.cond)
      data.extend(self.data)

      return (n+1, query, cond, data)

  class SelectNumber(SelectTag):
    def __init__(self, name, lt=None, eq=None, gt=None, lteq=None, gteq=None,
                 tail=None):
      super(self.__class__, self).__init__(name, tail=tail, types='if')

      self.cond.extend('.property_number %s %d' % (op, n) for (op, n) in [('<', lt),
                                                      ('=', eq),
                                                      ('>', gt),
                                                      ('<=', lteq),
                                                      ('>=', gteq)] if n != None)

    def getQuery(self, tail = None):
      if tail == None:
        return (1, ["properties AS tmp0"], ['tmp0' + x for x in self.cond], list(self.data))

      n, query, cond, data = tail

      tmp = 'tmp%d' % n
      query.append('properties AS ' + tmp + ' USING (iid)')
      cond.extend(tmp + x for x in self.cond)
      data.extend(self.data)

      return (n+1, query, cond, data)

  class SelectString(SelectTag):
    def __init__(self, name, eq=None, like=None, similar=None, posix=None,
                 tail=None):
      super(self.__class__, self).__init__(name, tail=tail, types='sx')

      cond, data = zip(*[(op, s) for (op, s) in [('=' , eq),
                                                 ('LIKE', like),
                                                 ('SIMILAR TO', similar),
                                                 ('~', posix)] if s != None])

      self.cond.extend('.property_string %s %%s' % op for op in cond)
      self.data.extend(data)

    def getQuery(self, tail = None):
      if tail == None:
        return (1, ["properties AS tmp0"], ['tmp0' + x for x in self.cond], list(self.data))

      n, query, cond, data = tail

      tmp = 'tmp%d' % n
      query.append('properties AS ' + tmp + ' USING (iid)')
      cond.extend(tmp + x for x in self.cond)
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
    res = {}
    for n, t, pn, ps, pv, pe in cursor.fetchall():
      d = {'type': t,
           'view': pv,
           'edit': pe}
      if t in "fi":
        d['value'] = pn if t == 'f' else int(pn)

      elif t in 'sx':
        d['value'] = ps

      res[n] = d

    return res

  @manageConnection()
  def unsetProperty(self, iid, name, privileges='a', cursor=None, db=None):
    cursor.execute("""
                   DELETE FROM properties
                   WHERE iid = %s AND property_name = %s
                         AND property_editable <= %s;
                   """, (iid, name, privileges))
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

    if t == 't':
      update = """
               UPDATE properties
               SET property_type = 't', property_visible = %s,
                   property_editable = %s
               WHERE iid = %s AND property_name = %s
                     AND property_editable <= %s;
               """
      insert = """
               INSERT INTO properties(property_visible, property_editable,
                                      iid, property_name, property_type)
               VALUES (%s, %s, %s, %s, 't');
               """
      data = (visible, editable, iid, name)

    else:
      if t in "if":
        field = 'property_number'

      elif t in "sx":
        field = 'property_string'

      update = """
               UPDATE properties
               SET property_type = %%s, %s = %%s,
                   property_visible = %%s, property_editable = %%s
               WHERE iid = %%s AND property_name = %%s
                     AND property_editable <= %%s;
               """ % field
      insert = """
               INSERT INTO properties(property_type, %s, property_visible,
                                      property_editable, iid, property_name)
               VALUES (%%s, %%s, %%s, %%s, %%s, %%s);
               """ % field
      data = (t, value, visible, editable, iid, name)

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

if __name__ == '__main__':
  from database import db, dbPool
  mb = MetaBase(db, dbPool)

