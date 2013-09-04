#!/usr/bin/python
# -*- coding: utf-8 -*-
from keyboard import keyboard

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
  keyboard()
