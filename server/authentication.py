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

import hmac
import hashlib

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
  
  def generateHash(self, login, password, salt):
    return hmac.new(str(salt) + self.name + login,
                    password,
                    self.__algorithm).hexdigest()
  
  def checkHash(self, login, password, salt, hashed):
    return self.generateHash(login, password, salt) == hashed


class BcryptHash(IHash):
  name = 'bcrypt'

  def __init__(self, complexity = 0):
    from bcrypt import hashpw, gensalt
    self.__hashpw = hashpw
    self.__gensalt = gensalt
    self.__complexity = complexity
    
  def generateHash(self, login, password, salt):
    return self.__hashpw(password, self.__gensalt(self.__complexity))
    
  def checkHash(self, login, password, salt, hashed):
    return self.__hashpw(password, hashed) == hashed
    

algs = ('md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512', 'bcrypt')
complexity = 10

HashAlgorithms = dict((alg, HashlibHash(alg)) for alg in algs if hasattr(hashlib, alg))

try:
  HashAlgorithms['bcrypt%d' % complexity] = BcryptHash(complexity)

except ImportError:
  pass

if __name__ == '__main__':
  pass
