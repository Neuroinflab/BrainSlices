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

# requires python-psycopg2 package
import psycopg2
import psycopg2.extras

from config import BS_DB_PASSWORD, BS_DB_NAME, BS_DB_USER, BS_DB_HOST,\
                   BS_DB_PORT, BS_DB_ISOLATION_LEVEL, BS_DB_ENCODING

db = psycopg2.connect(database=BS_DB_NAME,
                      user=BS_DB_USER,
                      password=BS_DB_PASSWORD,
                      host=BS_DB_HOST,
                      port=BS_DB_PORT)
db.set_isolation_level(BS_DB_ISOLATION_LEVEL)
db.set_client_encoding(BS_DB_ENCODING)

pg_exceptions_dict = {
  """ERROR:  duplicate key value violates unique constraint "groups_name_administrator"\n""":
  (KeyError, 'group_name, administrator pair already exists'),

  """ERROR:  insert or update on table "groups" violates foreign key constraint "Ref_groups_to_users"\n""":
  (KeyError, 'given administrator not present in users'),

  """ERROR:  insert or update on table "members" violates foreign key constraint "Ref_members_to_users"\n""":
  (KeyError, 'trying to add nonexistent user to group'),

  """ERROR:  duplicate key value violates unique constraint "members_pkey"\n""":
  (KeyError, 'user already in group'),

  """unidentified database error: ERROR:  insert or update on table "members" violates foreign key constraint "Ref_members_to_groups"\n""":
  (KeyError, 'trying to add member to nonexistent group'),

  """ERROR:  insert or update on table "image_privileges" violates foreign key constraint "Ref_image_privileges_to_groups"\n""":
  (KeyError, 'trying to add privilege to nonexistent group'),

  """ERROR:  insert or update on table "image_privileges" violates foreign key constraint "Ref_image_privileges_to_images"\n""":
  (KeyError, 'trying to add privilege to nonexistent image')
  }

def provideCursor(function):
  """
  Provide function with cursor if not given.

  @param function: method to be decorated
  @type function: function(self, ..., cursor = None)

  @return: decorated method
  @rtype: function(self, ..., cursor = self._db.cursor())
  """
  def toBeExecuted(self, *args, **kwargs):
    newCursor = kwargs.get('cursor') == None
    if newCursor:
      kwargs['cursor'] = self._db.cursor()

    try:
      result = function(self, *args, **kwargs)

    finally:
      if newCursor:
        kwargs['cursor'].close()

    return result

  return toBeExecuted

def provideDictCursor(function):
  """
  Provide function with realDictCursor if not given.

  @param function: method to be decorated
  @type function: function(self, ..., cursor = None)

  @return: decorated method
  @rtype: function(self, ..., cursor = self._db.cursor())
  """
  def toBeExecuted(self, *args, **kwargs):
    newCursor = kwargs.get('cursor') == None
    if newCursor:
      kwargs['cursor'] = self._db.cursor(cursor_factory = psycopg2.extras.RealDictCursor)
    result = function(self, *args, **kwargs)
    if newCursor:
      kwargs['cursor'].close()
    return result

  return toBeExecuted

def handlePgException(e):

  for key in pg_exceptions_dict:
    if key in e.pgerror:
      raise pg_exceptions_dict[key][0](pg_exceptions_dict[key][1])

  raise Exception('unidentified database error: '+e.pgerror)


class dbBase(object):
  def __init__(self, db):
    self._db = db

  @provideCursor #epydoc warning because of the decorator
  def _getOneRow(self, query, data = (), value = None, cursor = None, unwrap = False):
    """
    Return the only row result of a query.

    @param query: query template
    @type query: str

    @param data: query template data
    @type data: tuple or dict

    @param value: default return value
    @type value: any

    @param unwrap: True if only first firld of a row has to be returned, False
                   otherwise.
    @type unwrap: bool

    @param cursor: database cursor

    @return: only result row of a query, L{value} if more or no rows in the
             result.
    @rtype: tuple if C{L{unwrap} == False} and only one row in result of query,
            any otherwise
    """
    cursor.execute(query, data)
    value = cursor.fetchone()

    return value
  
  def _getOneValue(self, query, data = (), value = None, cursor = None):
    """
    An alias for C{L{_getOneRow}(query, data, value, cursor = cursor, unwrap=True)}
    """
    return self._getOneRow(query, data, value, cursor = cursor, unwrap=True)

  @provideDictCursor
  def _getOneDict(self, query, data = (), value = None, cursor = None):
    """
    An alias for C{L{_getOneRow}(query, data, value, cursor = cursor, unwrap=False}
    with realDictCursor provided.
    """
    return self._getOneRow(query, data, value, cursor = cursor, unwrap=False)

    
