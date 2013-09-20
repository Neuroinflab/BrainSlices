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

from keyboard import keyboard
from authentication import HashAlgorithms
from database import provideCursor, handlePgException, provideDictCursor, dbBase


#TODO: dokumentacja w formacie epydoc, "meaningfull names" dla zmiennych,
#      oznaczenie metod tymczasowych / napisanych napredce, abysmy wiedzieli, 
#      co trzeba usunac / poprawic

class UserBase(dbBase):
  @provideDictCursor
  def __getUserRowByColumn(self, columnName, columnVal, password = None, cursor = None):
    '''
    Return all fields in DB for a given login if given password matches.
    Return None if given password doesn't match.
    Set every unset hash if password match.
    '''
    #TODO: zmmienic to ponizej, poki co nie wiem jak nazwe kolumny przekazac madrzej
    if columnName in('uid', 'login'):
      query = "select * from users where %s = %%s" %columnName 
    else:
      return None

    data = (columnVal,)
    row = self._getOneDict(query, data, cursor = cursor)

    toSet = {}
    if not row == None:
      login = row['login']
      for alg, device in HashAlgorithms.iteritems():
        if row[alg] == None:
          toSet[alg] = device

        else:
          if not device.checkHash(login, password, row['salt'], row[alg]):
            return None

      if toSet != {}:
        data = {'login': login}
        salt = row['salt']

        for alg, device in toSet.iteritems():
          data[alg] = device.generateHash(login, password, salt)

        query = 'UPDATE users SET %s where login = %%(login)s;' % \
                ', '.join('%s = %%(%s)s' % (alg, alg) for alg in toSet)
        cursor.execute(query, data)

      return row

  @provideCursor
  def __getUserRow(self, login, password = None, cursor = None):
    return self.__getUserRowByColumn('login', login, password)

  @provideCursor
  def __getUserRowById(self, uid, password = None, cursor = None):
    return  self.__getUserRowByColumn('uid', uid, password)

  def getUserID(self, login):
    return self._getOneValue("""
                             SELECT uid
                             FROM users
                             WHERE login = %s;
                             """, (login,))
  
  def loginUser(self, login, password = None):
    '''Returns user ID for a given login if given password matches. Returns None if given password doesn't match'''
    row = self.__getUserRow(login, password)
    if row == None:
      return None
    return row['uid']

  def getUserLogin(self, uid, password = None):
    row = self.__getUserRowById(uid, password)



  @provideCursor
  def userRegistered(self, login, cursor = None):
    query = "SELECT login FROM users WHERE login = %s;"
    cursor.execute(query, (login.lower(),))
    return cursor.rowcount == 1

  def __makeRow(self, login, password, email, name, salt):
    '''Given a login and password prepares a dictionairy of fields ready to insert into DB (with all available hashes).
    Used in registerUser'''
    row = {}
    row['login'] = login
    row['salt'] = salt
    row['email'] = email
    row['name'] = name
    for alg, device in HashAlgorithms.iteritems():
      row[alg] = device.generateHash(login, password, row['salt'])

    return row
    
  @provideCursor
  def registerUser(self, login, password, email, name, salt, cursor = None, registrationValid =  7*24*60*60):
    '''Stores a user in DB'''
    row = self.__makeRow(login, password, email, name, salt)
    l = row.keys()
    db_columns = ', '.join(l)
    db_values = ', '.join('%%(%s)s' % x for x in l)
    template = "INSERT INTO users(%s) VALUES (%s);"
    insert_command = template %(db_columns, db_values)
    cursor.execute('DELETE FROM users WHERE first_login_date IS NULL AND extract(epoch from now() - confirmation_sent)/(3600*24)>%s;', (registrationValid,))
    try:
      cursor.execute(insert_command, row)
      return cursor.rowcount == 1
      
    except psycopg2.IntegrityError:
      print('login already exists')
      return False
    
    except:
      return None

  @provideCursor
  def confirmationSent(self, login, cursor = None):
    cursor.execute('UPDATE users SET confirmation_sent = now() WHERE login = %s;', (login,))

  @provideCursor
  def confirmRegistration(self, login, confirmId, cursor = None):
    select_command = "SELECT login, salt, uid FROM users where login = '%s'" % login
    cursor.execute(select_command);
    # XXX: Jest bardzo niejasne, co tu sie dzieje...
    # TODO: uproscic
    l = []
    for v in cursor:
      l.append(v)
    #print(l)
    l = l[0]
    if confirmId == hashlib.md5(l[0] + str(l[1])).hexdigest():
      cursor.execute('UPDATE users SET first_login_date = now(), last_login_date = now() WHERE login = %s;', (login,))
      return l[2]
    else:
      return False

  @provideCursor
  def changePassword(self, uid, oldPassword, newPassword, cursor = None):
    '''Changes users password in DB if passwords match. Does nothing if passwords don't match'''    
    row = self.__getUserRowByColumn('uid', uid, oldPassword)
    if not row == None:
      login = row['login']
      data = {}
      for alg, device in HashAlgorithms.iteritems():
        data[alg] = device.generateHash(login, newPassword, row['salt'])
      
      base = '%s =%%(%s)s'
      insertions = ', '.join(base % (x,x) for x in data.keys())
      update_command = 'UPDATE users SET %s WHERE login = %%(login)s;' % insertions
      data['login'] = login
      cursor.execute(update_command, data)
      return True
    else:
      return False

  @provideCursor
  def changePasswordRegenerate(self, confirmId, login, npass, cursor = None):
    row = self.__getUserRowByColumn('login', login)
    select_command = "SELECT login, salt FROM users WHERE login = %(login)s"
    data = {'login': login}
    cursor.execute(select_command, data)
    l = []
    for v in cursor:
      l.append(v)

    l = l[0]
    salt = l[1]
    #sprawdzic, czy confirmId jest dobry
    if confirmId == hashlib.md5(l[0] + str(l[1])).hexdigest():
      data = {}
      for alg, device in HashAlgorithms.iteritems():
        data[alg] = device.generateHash(login, npass, salt)

      base = '%s =%%(%s)s'
      insertions = ', '.join(base % (x,x) for x in data.keys())
      update_command = 'UPDATE users SET %s WHERE login = %%(login)s;' %insertions
      data['login'] = login
      cursor.execute(update_command, data)
      return True
    else:
      return False

  @provideCursor
  def deleteUser(self, login, password, cursor = None):
    #TODO: WTF??? why testing method to be None?
    if not self.loginUser == None:
      delete_command = 'DELETE FROM users WHERE login = %(login)s'
      data = {'login': login}
      cursor.execute(delete_command, data)

  @provideCursor    
  def getUserList(self, cursor = None):
    cursor.execute('SELECT login FROM users');
    l = []
    for v in cursor:
      l.append(v)

    return l

  @provideCursor
  def getUserRow(self, login, cursor = None):
    select_command = 'SELECT login, confirmation_sent, registration_date, user_enabled, last_login_date, first_login_date FROM users WHERE login = %(login)s'
    data = {'login': login}
    cursor.execute(select_command, data)
    l = []
    for v in cursor:
      l.append(v)

    return l

  @provideCursor
  def getUserLogin(self, uid, cursor = None):
    select_command = 'SELECT login FROM users WHERE uid = %(uid)s'
    data = {'uid': uid}
    cursor.execute(select_command, data)
    l = []
    for v in cursor:
      l.append(v)
    return l[0][0]

  @provideCursor
  def getSalt(self, login, email, cursor = None):
    select_command = 'SELECT salt FROM users WHERE login = %(login)s and email = %(email)s'
    data = {'login': login, 'email': email}
    cursor.execute(select_command, data)
    l = []
    for v in cursor:
      l.append(v)
    if len(l)>0:
      return l[0][0] 
    else:
      return None

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
     








