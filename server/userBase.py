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

import psycopg2
import random
import hashlib
import os
import base64

from authentication import HashAlgorithms
from database import provideCursor, handlePgException, provideConnection,\
                     dbBase, UNIQUE_VIOLATION, FOREIGN_KEY_VIOLATION,\
                     TransactionRollbackError


#TODO: dokumentacja w formacie epydoc, "meaningfull names" dla zmiennych,
#      oznaczenie metod tymczasowych / napisanych napredce, abysmy wiedzieli, 
#      co trzeba usunac / poprawic

class UserBase(dbBase):
  #XXX: not used
  def getUserID(self, login, cursor=None):
    return self._getOneValue("""
                             SELECT uid
                             FROM users
                             WHERE login = %s;
                             """,
                             (login,),
                             cursor=cursor)

  def getUserEnabled(self, identifier):
    return self._getOneValue("""
                             SELECT user_enabled
                             FROM users
                             WHERE %s = %%s;
                             """ % ('login' \
                                    if isinstance(identifier, (str, unicode)) \
                                    else 'uid'),
                             (identifier,))

  @provideCursor
  def checkPassword(self, identifier, password, record = True, cursor = None):
    query = """
    SELECT login, uid, salt, %s
    FROM users
    WHERE %s = %%s AND user_enabled AND first_login_date IS NOT NULL;
    """
    algs, devs = zip(*HashAlgorithms.items())
    cursor.execute(query % (', '.join(algs),
                            'login' if isinstance(identifier, (str, unicode))\
                            else 'uid'),
                   (identifier,))
    if cursor.rowcount != 1:
      return None

    row = cursor.fetchone()
    login, uid, salt = row[:3]
    setAlgs = []
    setDevs = []
    for alg, dev, hsh in zip(algs, devs, row[3:]):
      if hsh is None:
        setAlgs.append(alg)
        setDevs.append(dev)

      else:
        if not dev.checkHash(login, password, salt, hsh):
          return None

    toSet = ['last_login_date = now()'] if record else []
    toSet += ["%s = %%s" % alg for alg in setAlgs]
    if len(toSet) > 0:
      data = [dev.generateHash(login, password, salt) for dev in setDevs] + [uid]
  
      query = """
              UPDATE users
              SET %s
              WHERE uid = %%s
              """ % (', '.join(toSet))
      cursor.execute(query, data)

    return uid if isinstance(identifier, (str, unicode)) else login

  @provideCursor
  def userRegistered(self, login, cursor = None):
    query = "SELECT login FROM users WHERE login = %s;"
    cursor.execute(query, (login.lower(),))
    return cursor.rowcount == 1

  @provideCursor
  def registerUser(self, login, password, email, name, registrationValid = 7,
                   pixelLimit = None, diskLimit = None, cursor = None):
    '''Stores a user in DB'''
    salt = random.randint(0, 2**31)
    row = {'login': login,
           'salt': salt,
           'email': email,
           'name': name,
           'pixel_limit': pixelLimit,
           'disk_limit': diskLimit,
           }

    for alg, device in HashAlgorithms.iteritems():
      row[alg] = device.generateHash(login, password, salt)

    columns = row.keys()
    db_columns = ', '.join(columns)
    db_values = ', '.join('%%(%s)s' % x for x in columns)
    template = "INSERT INTO users(%s) VALUES (%s);"
    insert_command = template %(db_columns, db_values)
    cursor.execute('DELETE FROM users WHERE first_login_date IS NULL AND extract(epoch from now() - confirmation_sent)/(3600*24) > %s;', (registrationValid,))
    try:
      cursor.execute(insert_command, row)
      return cursor.rowcount == 1
      
    except psycopg2.IntegrityError:
      cursor.execute("SELECT 1 FROM users WHERE login = %s LIMIT 1", (login,))
      if cursor.rowcount == 1:
        return "Login %s is already registered in the database." % login
    
      cursor.execute("SELECT 1 FROM users WHERE email = %s LIMIT 1", (email,))
      if cursor.rowcount == 1:
        return "E-mail address %s is already registered in the database." % email

      return False

    except:
      return None

  @provideCursor
  def confirmationSent(self, login, cursor = None):
    cursor.execute('UPDATE users SET confirmation_sent = now() WHERE login = %s;', (login,))

  @provideCursor
  def changePassword(self, login, newPassword, cursor=None):
    salt = random.randint(0, 2**31)
    algs, devs = zip(*HashAlgorithms.items())
    hashes = tuple(dev.generateHash(login, newPassword, salt) for dev in devs)
    query = """
            UPDATE users
            SET %s, salt = %%s
            WHERE login = %%s;
            """ % (', '.join("%s = %%s" % alg for alg in algs))
    cursor.execute(query, hashes + (salt, login))
    return cursor.rowcount == 1

  @provideCursor
  def changePixelLimit(self, login, newPixelLimit, cursor=None): 
    query = """
            UPDATE users
            SET pixel_limit = %s
            WHERE login = %s;
            """
    cursor.execute(query, (newPixelLimit, login))
    return cursor.rowcount == 1

  @provideCursor
  def changeDiskLimit(self, login, newDiskLimit, cursor=None): 
    query = """
            UPDATE users
            SET disk_limit = %s
            WHERE login = %s;
            """
    cursor.execute(query, (newDiskLimit, login))
    return cursor.rowcount == 1

  @provideCursor
  def deleteUser(self, login, password, cursor = None):
    #TODO: WTF??? why testing method to be None?
    if not self.loginUser == None:
      delete_command = 'DELETE FROM users WHERE login = %(login)s'
      data = {'login': login}
      cursor.execute(delete_command, data)

  def getUserLogin(self, uid, cursor = None):
    return self._getOneValue("""
                             SELECT login
                             FROM users
                             WHERE uid = %s;
                             """, (uid,),
                             cursor = cursor)

  def getEmailInformation(self, login):
    return self._getOneRow("""
                           SELECT email, name, user_enabled
                           FROM users
                           WHERE login = %s;
                           """, (login,))

  @provideCursor
  def newConfirmationID(self, login, cursor=None):
    row = self._getOneRow("""
                          SELECT salt, last_login_date
                          FROM users
                          WHERE login = %s;
                          """, (login,),
                          cursor=cursor)
    if row == None:
      return None

    salt, last = row
    rawID = os.urandom(12)
    confirmID = base64.urlsafe_b64encode(rawID)
    hashId = confirmID + str(last)
    algs, devs = zip(*HashAlgorithms.items())
    hashes = tuple(dev.generateHash(login, hashId, salt) for dev in devs)
    query = """
            UPDATE users
            SET %s
            WHERE login = %%s;
            """ % (', '.join("confirm_%s = %%s" % alg for alg in algs))
    cursor.execute(query, hashes + (login,))
    if cursor.rowcount == 1:
      return confirmID

  @provideCursor
  def checkConfirmationID(self, login, rawID, cursor=None):
    query = """
            SELECT uid, salt, last_login_date, %s
            FROM users
            WHERE login = %%s AND user_enabled;
            """
    algs, devs = zip(*HashAlgorithms.items())
    row = self._getOneRow(query % (', '.join('confirm_%s' % alg for alg in algs)),
                          (login,),
                          cursor=cursor)
    if row == None:
      return None

    uid, salt, last = row[:3]
    hashId = rawID + str(last)
    confirmed = False
    for dev, hsh in zip(devs, row[3:]):
      if hsh != None:
        if not dev.checkHash(login, hashId, salt, hsh):
          return None

        confirmed = True

    if not confirmed:
      return None

    query = """
            UPDATE users
            SET %s, last_login_date = now(),
                first_login_date = CASE
                   WHEN first_login_date IS NULL THEN now()
                   ELSE first_login_date END
            WHERE login = %%s;
            """ % (', '.join("confirm_%s = NULL" % alg for alg in algs))
    cursor.execute(query, (login,))
    if cursor.rowcount == 1:
      return uid


  @provideConnection()
  def addGroup(self, uid, name, description = "", cursor = None, db = None):
    """
    Define a new privilege group.

    @param uid: Identifier of user being owner of the group.
    @type uid: int

    @param name: Name of the group.
    @type name: str or unicode

    @param description: Description of the group.
    @type description: str or unicode

    @return: Group identifier.
    @rtype: int

    @raise ValueError: Group for L{uid}, L{name} pair already defined.

    @raise KeyError: User #L{uid} not found.
    """
    done = False
    while not done:
      query = """
              INSERT INTO groups(group_name, group_administrator, group_description)
              VALUES (%s, %s, %s);
              """
      try:
        cursor.execute(query, (name, uid, description))
  
      except psycopg2.IntegrityError as e:
        db.rollback()
        if e.pgcode == '23505':
          raise ValueError('Group %s of %d already exists.' % (name, uid))
  
        if e.pgcode == '23503':
          raise KeyError('User #%d does not exist.' % uid)
  
        raise
  
      else:
        try:
          result = self._getOneValue("""
                                     SELECT gid
                                     FROM groups
                                     WHERE group_name = %s
                                           AND group_administrator = %s;
                                     """,
                                     (name, uid),
                                     cursor = cursor)
        except TransactionRollbackError:
          db.rollback()

        else:
          db.commit()
          done = True

    return result


  @provideConnection()
  def deleteGroup(self, gid, cursor = None, db = None):
    """
    Remove existing privilege group.

    @param gid: identifier of the group
    @type gid: int
    """
    done = False
    while not done:
      try:
        cursor.execute("DELETE FROM image_privileges_cache WHERE gid = %s;", (gid,))
        cursor.execute("DELETE FROM image_privileges WHERE gid = %s;", (gid,))
        cursor.execute("DELETE FROM members WHERE gid = %s", (gid,))
        cursor.execute("DELETE FROM groups WHERE gid = %s;", (gid,))

      except TransactionRollbackError:
        db.rollback()

      else:
        db.commit()
        done = True

  @provideConnection()
  def addGroupMember(self, uid, gid, memberAdd = False, memberDel = False,
                     cursor = None, db = None):
    """
    Add a new member to the group.

    @param uid: identifier of the user
    @type uid: int

    @param gid: identifier of the group
    @type gid: int

    @param memberAdd: member adding privilege
    @type memberAdd: bool

    @param memberDel: member removing privilege
    @type memberDel: bool
    """
    while True:
      try:
        cursor.execute("""
                       INSERT INTO members(gid, uid, member_add, member_del)
                       VALUES (%s, %s, %s, %s);
                       """,
                       (gid, uid, memberAdd, memberDel))
  
      except psycopg2.IntegrityError as e:
        db.rollback()
        if e.pgcode == '23505':
          raise ValueError('User #%d is already a member of a group #%d.'\
                           % (uid, gid))
  
        if e.pgcode == '23503':
          if 'users' in e.pgerror:
            raise KeyError('User #%d does not exist.' % uid)
  
          if 'groups' in e.pgerror:
            raise KeyError('Group #%d does not exist.' % gid)
  
          raise KeyError('User #%d or group # %d do not exist.' % (uid, gid))
  
        raise
  
      try:
        #add to image_privilleges_cache
        cursor.execute("""
                       INSERT INTO image_privileges_cache(iid, gid, uid,
                                   image_edit, image_annotate, image_outline)
                       SELECT iid, gid, uid,
                              image_edit, image_annotate, image_outline
                       FROM image_privileges NATURAL JOIN members
                       WHERE uid = %s AND gid = %s;
                       """,
                       (uid, gid))

      except TransactionRollbackError:
        db.rollback()

      else:
        db.commit()
        return
        
  @provideConnection()
  def deleteGroupMember(self, uid, gid, cursor = None, db = None):
    """
    Remove a member from privilege group.

    @param uid: identifier of the member
    @type uid: int

    @param gid: identifier of the group
    @type gid: int
    """
    while True:
      try:
        cursor.execute("""
                       DELETE FROM image_privileges_cache
                       WHERE uid = %s AND gid = %s;
                       """,
                       (uid, gid))
        cursor.execute("DELETE FROM members WHERE uid = %s AND gid = %s;",
                       (uid, gid))

      except TransactionRollbackError:
        db.rollback()

      else:
        db.commit()
        return

  @provideConnection()
  def revokeImagePrivilege(self, iid, gid, db = None, cursor = None):
    """
    Revoke privilege to view the image from given group.

    @param iid: identifier of the image
    @type iid: int

    @param gid: identifier of the group
    @type gid: int
    """
    while True:
      try:
        cursor.execute("""
                       DELETE FROM image_privileges_cache
                       WHERE iid = %s AND gid = %s;
                       """,
                       (iid, gid))
        cursor.execute("""
                       DELETE FROM image_privileges
                       WHERE iid = %s AND gid = %s;
                       """,
                       (iid, gid))

      except psycopg2.IntegrityError as e:
        db.rollback()
        if e.pgcode != FOREIGN_KEY_VIOLATION:
          # not the case someone has inserted something to cache
          raise

      except TransactionRollbackError:
        db.rollback()

      else:
        db.commit()
        return

  @provideConnection()
  def changeImagePrivilege(self, iid, gid, imageEdit = None,
                           imageAnnotate = None, imageOutline = None,
                           db = None, cursor = None):
    """
    Change privileges to edit/annotate/outline the image from given group.

    @param iid: identifier of the image
    @type iid: int

    @param gid: identifier of the group
    @type gid: int

    @param imageEdit: privilege to edit the image
    @type imageEdit: bool

    @param imageAnnotate: privilege to annotate the image
    @type imageAnnotate: bool

    @param imageOutline: privilege to outline the image
    @type imageOutline: bool

    @note: Obsoleted by L{grantImagePrivilege>}.
    """
    toUpdate = []
    if imageEdit is not None:
      toUpdate.append(('image_edit = %s', imageEdit))

    if imageAnnotate is not None:
      toUpdate.append(('image_annotate = %s', imageAnnotate))

    if imageOutline is not None:
      toUpdate.append(('image_outline = %s', imageOutline))

    if len(toUpdate) > 0:
      updateStrings, updateValues = zip(*toUpdate)
      updateStrings = ', '.join(updateStrings)
      updateValues = updateValues + (iid, gid)
      while True:
        try:
          cursor.execute("""
                         UPDATE image_privileges
                         SET %s
                         WHERE iid = %%s AND gid = %%s;
                         """ % updateStrings,
                         updateValues)
          cursor.execute("""
                         UPDATE image_privileges_cache
                         SET %s
                         WHERE iid = %%s AND gid = %%s;
                         """ % updateStrings,
                         updateValues)

        except TransactionRollbackError:
          db.rollback()
  
        except psycopg2.IntegrityError as e:
          db.rollback()
          if e.pgcode != UNIQUE_VIOLATION:
            raise
  
        else:
          db.commit()
          return

  @provideConnection()
  def grantImagePrivilege(self, iid, gid, imageEdit = None,
                          imageAnnotate = None, imageOutline = None,
                          db = None, cursor = None):
    """
    Grant privilege to view the image by members of a given group.

    Given edit/annotate and outline privileges are being granted/revoked
    simultaneously.

    @param iid: identifier of the image
    @type iid: int

    @param gid: identifier of the group
    @type gid: int

    @param imageEdit: privilege to edit the image
    @type imageEdit: bool

    @param imageAnnotate: privilege to annotate the image
    @type imageAnnotate: bool

    @param imageOutline: privilege to outline the image
    @type imageOutline: bool
    """
    toUpdate = []
    if imageEdit is not None:
      toUpdate.append(('image_edit', imageEdit))

    if imageAnnotate is not None:
      toUpdate.append(('image_annotate', imageAnnotate))

    if imageOutline is not None:
      toUpdate.append(('image_outline', imageOutline))

    if len(toUpdate) > 0:
      query = """
              UPDATE %%s SET %s
              WHERE iid = %%%%s AND gid = %%%%s;
              """ % (', '.join('%s = %%%%s' % k for (k, _) in toUpdate))
      queryUpdate = query % 'image_privileges'
      queryUpdateCache = query % 'image_privileges_cache'

    data = tuple(v for (_, v) in toUpdate) + (iid, gid)
    fields = tuple(k for (k, _) in toUpdate) + ('iid', 'gid')
    queryInsert = """
                  INSERT INTO image_privileges(%s)
                  VALUES (%s);
                  """ % (', '.join(fields), ', '.join('%s' for k in fields))

    # TODO:check if has privileges to do so
    while True:
      try:
        if len(toUpdate) > 0:
          cursor.execute(queryUpdate, data)
          if cursor.rowcount == 1:
            cursor.execute(queryUpdateCache, data)
            db.commit()
            return True # no exceptions => success

        try:
          cursor.execute(queryInsert, data)

        except psycopg2.IntegrityError as e:
          if e.pgcode == UNIQUE_VIOLATION and len(toUpdate) == 0:
            # view privilege exists and no update is necessary
            db.rollback()
            return True

          raise

        cursor.execute("""
                       INSERT INTO image_privileges_cache(iid, gid, uid,
                                   image_edit, image_annotate, image_outline)
                       SELECT iid, gid, uid, image_edit, image_annotate,
                              image_outline
                       FROM image_privileges NATURAL JOIN members
                       WHERE iid = %s AND gid = %s;
                       """, (iid, gid))
        db.commit()
        return True

      except psycopg2.IntegrityError as e:
        db.rollback()
        if e.pgcode not in (UNIQUE_VIOLATION, FOREIGN_KEY_VIOLATION):
          # image/member pair privilege not present nor image removed from
          # group in meanwhile nor member removed from group in meanwhile
          # - so unknown integrity error
          raise

      except TransactionRollbackError:
        db.rollback()

  @provideCursor
  def grantGroupPrivilegesToUser(self, uid, gid, memberAdd, memberDel,
                                 cursor = None):
    
    query = """
            UPDATE members
            SET member_add = %s, member_del = %s
            WHERE uid = %s AND gid = %s;
            """
    cursor.execute(query, (memberAdd, memberDel, uid, gid))

#TODO: wylistowanie grup uzytkownika, wylistowanie wszystkich grup, ktorych administratorem jest uzytkownik i ostatnia rzecz z kartki..  
    
  @provideCursor
  def listUsersGroups(self, uid, memberAdd = None, memberDel = None, cursor = None):
    query = """
            SELECT
            gid, group_name, group_administrator, member_add, member_del
            FROM groups NATURAL JOIN members
            WHERE %s;
            """

    data = [uid]
    condition = ['uid = %s']
    if memberAdd != None:
      data.append(memberAdd)
      condition.append('member_add = %s')

    if memberDel != None:
      data.append(memberDel)
      condition.append('member_del = %s')

    cursor.execute(query % (' AND '.join(condition)), data)
    return cursor.fetchall()

  @provideCursor
  def listGroupsByAdministrator(self, uid, cursor = None):
    select_command = """SELECT gid, group_name FROM groups WHERE group_administrator = %s"""
    data = (uid,)
    cursor.execute(select_command, data)
    l = []
    for v in cursor:
      l.append(v)
    return l

  @provideCursor
  def testUserGroupPrivileges(self, gid, uid, cursor = None):
    result_dict = {'member': None, 'administrator': None, 'member_del': None, 'member_add': True}
    select_command = \
    "SELECT a.gid, b.uid, group_administrator, member_add, member_del FROM groups a join members b on a.gid = b.gid " \
    "where a.gid = %s and uid =%s"

    data = (gid, uid)
    cursor.execute(select_command, data)
    l = []
    for v in cursor:
      l.append(v)

    if len(l) == 0:
      for key in result_dict:
        result_dict[key] = False

    else:
      result_dict['member'] = True
      result_dict['administrator'] = (l[0][1]==l[0][2])
      result_dict['member_del'] = l[0][3]
      result_dict['member_add'] = l[0][4]

    print l  

    return result_dict  
