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

from keyboard import keyboard
from authentication import HashAlgorithms
from database import provideCursor, handlePgException, provideDictCursor, dbBase


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

  #XXX: not used
  @provideCursor
  def userRegistered(self, login, cursor = None):
    query = "SELECT login FROM users WHERE login = %s;"
    cursor.execute(query, (login.lower(),))
    return cursor.rowcount == 1

  @provideCursor
  def registerUser(self, login, password, email, name, registrationValid =  7, cursor = None):
    '''Stores a user in DB'''
    salt = random.randint(0, 2**31)
    row = {'login': login,
           'salt': salt,
           'email': email,
           'name': name}

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
    hashId = rawID + str(last)
    algs, devs = zip(*HashAlgorithms.items())
    hashes = tuple(dev.generateHash(login, hashId, salt) for dev in devs)
    query = """
            UPDATE users
            SET %s
            WHERE login = %%s;
            """ % (', '.join("confirm_%s = %%s" % alg for alg in algs))
    cursor.execute(query, hashes + (login,))
    if cursor.rowcount == 1:
      return rawID

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
    for dev, hsh in zip(devs, row[3:]):
      if hsh != None and not dev.checkHash(login, hashId, salt, hsh):
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


# TODO: refactoring

  @provideCursor
  def addGroup(self, group_name, group_administrator, group_description, cursor = None):
    insert_command = """INSERT INTO groups(group_name, group_administrator, group_description)
                        VALUES (%s, %s, %s)"""
    row = (group_name, group_administrator, group_description)
    try:
      cursor.execute(insert_command, row)
    except psycopg2.IntegrityError as e:
      handlePgException(e)
    else:
      select_command = """SELECT gid FROM groups where group_name = %s and group_administrator = %s"""
      cursor.execute(select_command, (group_name, group_administrator))
      l = []
      for v in cursor:
        l.append(v)
      return l[0][0]

  @provideCursor
  def deleteGroup(self, gid, cursor = None):
    
    data = {'gid':gid}
    try:
      delete_from_groups = """DELETE FROM groups WHERE gid = %(gid)s"""
      cursor.execute(delete_from_groups, data) 

      delete_from_image_privileges = """DELETE FROM image_privileges WHERE gid = %(gid)s"""
      cursor.execute(delete_from_image_privileges, (data))

      delete_from_members = """DELETE FROM members WHERE gid = %(gid)s"""
      cursor.execute(delete_from_members, (data))   
       
      delete_from_image_privileges_cache = """DELETE FROM image_privileges_cache WHERE gid = %(gid)s"""
      cursor.execute(delete_from_image_privileges_cache, data)

      return True
    except:
    	return False

  @provideCursor
  def addGroupMember(self, uid, gid, member_add = False, member_del = False, cursor = None):
    
    #add to  members
    insert_command = "INSERT INTO"\
    " members(gid, uid, member_add, member_del) "\
    "VALUES (%s, %s, %s, %s)"\
    
    data = (gid, uid, member_add, member_del)
    try:
      cursor.execute(insert_command, data)
    except psycopg2.IntegrityError as e:
      handlePgException(e)

    #add to image_privilleges_cache
    insert_command = \
    "INSERT INTO" \
    "  image_privileges_cache"\
    "(SELECT iid, a.gid, uid, image_edit, image_annotate from image_privileges a join members b on a.gid = b.gid where b.uid = %s and b.gid = %s)"
    data = (uid, gid)
    cursor.execute(insert_command, data)
      
        
  @provideCursor
  def deleteGroupMember(self, uid, gid, cursor = None):

    #delete from members
    delete_command = """DELETE FROM members WHERE uid = %(uid)s and gid = %(gid)s"""
    data = {'uid':uid, 'gid':gid}
    cursor.execute(delete_command, data)

    #delete from image_privileges_cache
    delete_command = """DELETE FROM image_privileges_cache where uid = %(uid)s and gid = %(gid)s"""
    cursor.execute(delete_command, data)

  @provideCursor
  def addImagePrivilege(self, iid, gid, image_edit, image_annotate, cursor = None):

    #check if the group already has privileges to this image
    select_command = """SELECT * FROM image_privileges WHERE iid = %s AND gid = %s"""
    data = (iid, gid)
    cursor.execute(select_command, data)
    l = []
    for v in cursor:
      l.append(v)

    # if yes, 
    if len(l)>0:
      #then update table image_privileges
      update_command = """UPDATE image_privileges SET image_edit = %s, image_annotate = %s WHERE iid = %s and gid = %s"""
      data = (image_edit, image_annotate, iid, gid)
      cursor.execute(update_command, data)

    # and update table images_privileges_cached
      update_command = """UPDATE image_privileges_cache SET image_edit = %s, image_annotate = %s WHERE iid = %s and gid = %s"""
      data = (image_edit, image_annotate, iid, gid)
      cursor.execute(update_command, data)
    
    #if not
    else:
      #insert into image_privileges
      insert_command = """INSERT INTO image_privileges(iid, gid, image_edit, image_annotate) VALUES (%s, %s, %s, %s)"""
      data = (iid, gid, image_edit, image_annotate)
      try:
        cursor.execute(insert_command, data)
      except psycopg2.IntegrityError as e:
        handlePgException(e)

      #insert into image_privileges_cache
      insert_command = \
      "INSERT INTO image_privileges_cache "\
      "(SELECT iid, a.gid, b.uid, image_edit, image_annotate from image_privileges a join members b on a.gid = b.gid where iid = %s and a.gid = %s)"
      data = (iid, gid)
      try:
        cursor.execute(insert_command, data)
      except psycopg2.IntegrityError as e:
        handlePgException(e)

  @provideCursor
  def grantGroupPrivilegesToUser(self, uid, gid, members_add, members_del, cursor = None):
    
    update_command = """UPDATE members SET member_add = %s, member_del = %s WHERE uid = %s and gid = %s"""
    data = (members_add, members_del, uid, gid)
    cursor.execute(update_command, data)

  #TODO: wylistowanie grup uzytkownika, wylistowanie wszystkich grup, ktorych administratorem jest uzytkownik i ostatnia rzecz z kartki..  
    
  @provideCursor
  def listUsersGroups(self, uid, member_add = None, member_del = None, cursor = None):

    select_command = \
    "SELECT" \
    "  a.gid, group_name, group_administrator, member_add, member_del "\
    "FROM" \
    "  groups a" \
    "  JOIN members b on a.gid = b.gid " \
    "WHERE" \
    "  uid = %s"
    data = (uid,)

    if member_add != None:
      select_command = select_command + " and member_add = %s"
      data = data + (str(member_add),)
    if member_del != None:
      select_command = select_command + " and member_del = %s"
      data = data + (str(member_del),)

    cursor.execute(select_command, data)
    l = []
    for v in cursor:
      l.append(v)
    return l

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
     








