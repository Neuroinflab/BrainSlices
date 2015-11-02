#!/usr/bin/python
# -*- coding: utf-8 -*-
###############################################################################
#                                                                             #
#    BrainSlices Software                                                     #
#                                                                             #
#    Copyright (C) 2012-2015 Jakub M. Kowalski, J. Potworowski                #
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

import hmac
import hashlib
import bcrypt

BCRYPT_COMPLEXITY = 12

class IHash:
  name = None

  def generateHash(self, login, password, salt):
    raise NotImplementedError, "Virtual class method call"
  
  def checkHash(self, login, password, salt, hashed):
    raise NotImplementedError, "Virtual class method call"


class HashlibHash(IHash):  
  def __init__(self, algorithm):
    self.name = algorithm
    self.__algorithm = getattr(hashlib, algorithm)

  def __getDigest(self, login, password, salt):
    return hmac.new(str(salt) + self.name + login,
                    password,
                    self.__algorithm).hexdigest()

  def generateHash(self, login, password, salt):
    return bcrypt.hashpw(self.__getDigest(login, password, salt),
                         bcrypt.gensalt(BCRYPT_COMPLEXITY))

  def checkHash(self, login, password, salt, hashed):
    return bcrypt.hashpw(self.__getDigest(login, password, salt),
                         hashed) == hashed


class BcryptHash(IHash):
  name = 'bcrypt'

  def __init__(self, complexity = 0):
    self.__complexity = complexity
    self.name = 'bcrypt{:d}'.format(complexity)

  def __saltPassword(self, login, password, salt):
    return str(salt) + self.name + login + password

  def generateHash(self, login, password, salt):
    return bcrypt.hashpw(self.__saltPassword(login, password, salt),
                         bcrypt.gensalt(self.__complexity))

  def checkHash(self, login, password, salt, hashed):
    return bcrypt.hashpw(self.__saltPassword(login, password, salt),
                         hashed) == hashed

algs = ('md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512', 'bcrypt')

HashAlgorithms = dict((alg, HashlibHash(alg)) for alg in algs if hasattr(hashlib, alg))
HashAlgorithms['bcrypt%d' % BCRYPT_COMPLEXITY] = BcryptHash(BCRYPT_COMPLEXITY)

if __name__ == '__main__':
  import unittest

  class HashTest(object):
    @classmethod
    def subclass(cls, name):
      return type('{}{}'.format(name, cls.__name__),
                  (cls, unittest.TestCase),
                  {'algorithm': HashAlgorithms[name]})

    def generateHash(self, login, password, salt):
      return self.algorithm.generateHash(login, password, salt)

    def checkHash(self, login, password, salt, hashed):
      return self.algorithm.checkHash(login, password, salt, hashed)

    def testCheckableHash(self):
      hashed = self.generateHash('login', 'password', 42)
      self.assertTrue(self.checkHash('login', 'password', 42, hashed))

    def testPasswordCollisions(self):
      hashed = self.generateHash('logina', 'password', 42)
      self.assertFalse(self.checkHash('logina', 'pSSAword', 42, hashed))

    def testSaltCollisions(self):
      hashed = self.generateHash('loginek', 'pSSAword', 42)
      self.assertFalse(self.checkHash('loginek', 'pSSAword', 1337, hashed))

    def testLoginCollisions(self):
      hashed = self.generateHash('user', 'password', 42)
      self.assertFalse(self.checkHash('resu', 'password', 42, hashed))

  testSuite = []
  for name in HashAlgorithms:
    testSuite.append(unittest.defaultTestLoader.loadTestsFromTestCase(HashTest.subclass(name)))

  unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(testSuite))
