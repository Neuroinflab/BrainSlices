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
"""
G{importgraph}
"""
import unittest
from datetime import datetime

import re
from math import isnan, isinf

import json

LOGIN_RE = re.compile('^[a-z0-9-+_.*]+$')
#EMAIL_RE = re.compile('^((\w|-)+(\.(\w|-)+)*@(\w|-)+(\.(\w|-)+)+)$')
EMAIL_RE = re.compile('^.+@.+$')
MIN_FILE_SIZE = 8
MAX_FILE_SIZE = 1024 * 1024 * 1024

def validFloat(x):
  return not (isnan(x) or isinf(x))

def isstr(s):
  return type(s) is str or type(s) is unicode

def encodeValue(value):
  encoding = 'utf-8'
  if type(value) is list:
    return [x.encode(encoding) for x in value]

  return value.encode(encoding)


class Request(object):
  _required = frozenset()
  _optional = {}
  _pathargs = []
  _binary = frozenset()
  _secret = frozenset()
  _atoms = {}
  _constraints = {}
  
  def __init__(self, args, kwargs, headers = {}, session = None):
    self.time = datetime.now()
    self._path = [x.encode('utf-8') for x in args]
    self._raw = dict((k.encode('utf-8'),
                      v if k in self._binary else encodeValue(v)) for (k, v) in kwargs.items())
    self.valid = True
    self.reason = []
    self._allArgsSet = frozenset(self._allArgs())
    self._normalize()
    self._parse()
    self._remoteAddr = headers.get('Remote-Addr', '')
    self._referer = headers.get('Referer', '')
    self.session = session

  @classmethod
  def newRequest(cls, args, kwargs, headers = {}, session = None):
    return cls(args, kwargs, headers = headers, session = session)

  def _normalize(self):
    """
    Check if every required argument is set and if only known
    arguments are set.
    """
    ## ENABLE if aliases necessary => bad design of service
    #arguments = {}
    #
    #for alias, value in self._raw.iteritems():
    #  name = self._aliases.get(alias, alias) #get true name of alias
    #  arguments[name] = arguments.get(name, []) + [(alias, value)]

    #self._normalized = {}

    #for name, values in arguments.iteritems():
    #  if len(values) > 1:
    #    self._invalid(", ".join(x[0] for x in values) + " are aliases of %s." % name)
    #  else:
    #    self._normalized[name] = values[0][1]
    self._normalized = dict(self._raw)

    # looks for the required arguments
    for key in self._required:
      if key not in self._normalized:
        self._invalid("required argument (%s) missing" % key)
    
    # looks for unknown arguments
    for (key, val) in self._normalized.iteritems():
      if key not in self._allArgsSet:
        self._invalid("unknown argument: %s: %s" % (key, val))

    # check if all necessary arguments are given in a path
    if len(self._path) != len(self._pathargs):
      self._invalid("Bad number of path elements: %s given; %s expected" % \
                    ("/".join(self._path), "/".join(self._pathargs)))
      return

    self._normalized.update(zip(self._pathargs, self._path))

    # checks if value of every argument is a string
    for (k, v) in self._normalized.iteritems():
      if not isstr(v) and k not in self._binary:
        self._invalid("argument %s is not a string" % k)


  def __str__(self):
    """
    Return a string describing the request.

    The string is composed of fields separated with tabs ('\t').

    The first six fields are components of the date and the time
    the request was created. The order is: the year, the month,
    the day, the hour, the minute and the second.

    The seventh field indicates if the request is valid. If yes it
    is 'valid' else it is 'invalid'.

    The eighth and ninth field are (respectively) the 'Remote-Addr' and
    'Referer' HTTP header content (if given - '' otherwise).

    The tenth field is the name of the request class (indicatinig
    what kind of a request is the object).

    The content of next fields depends on the request validity.
    If the request is valid - they are a serie of pairs: the name of
    the request attribute (at odd position) and the value of that
    attribute (at even position). The first of the pairs is the attribute
    describing CAF dataset name, the next are ordered by attribute name.

    If the request is invalid the next fields are also a serie of pairs,
    but they are describing names and values of the arguments passed
    to the constructor.
    The order of arguments is like the order of attributes in the case
    of valid request.

    @return: a string describing the object
    """
    
    # the list of the result string components
    resultString = [self.time.strftime("%Y\t%m\t%d\t%H\t%M\t%S"),
                    self._remoteAddr,
                    self._referer]
    
    if self.valid:
      resultString.append('valid')
      pairDictionary = dict((k, getattr(self, k)) for k in self._allArgsSet)

    else:
      resultString.append('invalid')
      pairDictionary = self._raw
    
    resultString.append(self.__class__.__name__)
    
    # ordered list of attributes/arguments names except of CAF_DATASET_NAME
    pairDictionaryKeys = sorted(pairDictionary.keys())
    for key in pairDictionaryKeys:
      if key in self._secret:
        resultString.extend([key, '[TOP SECRET]'])

      else:
        resultString.extend([key, unicode(pairDictionary[key]).encode('utf-8')])

    # return all components of resultString sticked together
    return '\t'.join(resultString)
  
  def _allArgs(self, path = False):
    for arg in self._required:
      yield arg

    for arg in self._optional.iterkeys():
      yield arg

    if path:
      for arg in self._pathargs:
        yield arg

  def _invalid(self, reason):
    self.valid = False
    self.reason.append(reason)
  
  def _invalidArg(self, name, value):
    self._invalid(("Invalid value of argument %s" % name) + \
                  ('.' if name in self._secret \
                   else (": %s" % value)))
  
  def _getDefault(self, key):
    val = self._normalized.get(key)
    if val == None:
      setattr(self, key, self._optional[key])

    return val

  def _parseArgument(self, argument, condition=None, transformation=None):
    """
    If the request argument being parsed is set to a valid value
    the attribute of the same name is set to that value, otherwise
    the invalidity is reported.

    If the parsed argument is not present in the request argument list,
    the attribute is set to its default value. It is assumed that value
    of every required argument is already in the request.

    If a transformation is given - it is applied to the value before
    assigning and validating.
     
    @type argument: str
    @param argument: name of the argument to parse

    @type condition: function
    @param condition: a function indicating if the request argument being
                      parsed is value attribute; if
                      None - every value is valid

    @type transformation: function
    @param transformation: a function that converts string to required
                           attribute type

    @return: True
    """

    if argument in self._optional and not argument in self._normalized:
      setattr(self, argument, self._optional[argument])
      return True

    else:
      valueString = self._normalized[argument]

    # if transformation is given - apply it to the val
    value = valueString
    try:
    # ValueError might be raised if value of argument can not be converted
    # by the transformation function
      if transformation != None:
        value = transformation(valueString)

      if condition != None and not condition(value):
        raise ValueError

      setattr(self, argument, value)

    except:
      self._invalidArg(argument, valueString)
      return False

    return True

  def _parse(self):
    """
    @return: False if invalid, otherwise True
    """
    if not self.valid:
      return False

    for argument, (condition, transformation) in self._atoms.items():
      self._parseArgument(argument, condition, transformation)

    if not self.valid:
      return False

    for constraint in self._constraints.values():
      message = constraint(self)
      if message != None:
        self._invalid(message)

    return self.valid
  
  def getFullRequest(self):
    if self.valid:
      return dict((x, getattr(self,x)) for x in self._allArgs(True))

    else:
      raise ValueError, (self.reason, self._raw)

  @classmethod
  def extend(cls, name, docstring="", pathargs = [], required = frozenset(),
             optional = {}, secret = frozenset(), binary = frozenset(),
             atoms = {}, constraints = {}, parents=[]):
    parents = (cls,) + tuple(parents)
    path = []
    required = set([required]) \
               if isinstance(required, basestring) \
               else set(required)
    secret = set([secret]) \
             if isinstance(secret, basestring) \
             else set(secret)
    binary = set([binary]) \
             if isinstance(binary, basestring) \
             else set(binary)
    optionalTmp = {}
    atomsTmp = {}
    constraintsTmp = {}

    for parent in parents:
      path.extend(x for x in parent._pathargs if x not in path)
      required |= parent._required
      secret |= parent._secret
      binary |= parent._binary

    for parent in reversed(parents):
      optionalTmp.update(parent._optional)
      atomsTmp.update(parent._atoms)
      constraintsTmp.update(parent._constraints)

    optionalTmp.update(optional)
    atomsTmp.update(atoms)
    constraintsTmp.update(constraints)
    path.extend(x for x in pathargs if x not in path)

    return type(name, parents,
                {
                  '__doc__': docstring,
                  '_pathargs': tuple(path),
                  '_required': frozenset(required),
                  '_secret': frozenset(secret),
                  '_binary': frozenset(binary),
                  '_optional': optionalTmp,
                  '_atoms': atomsTmp,
                  '_constraints': constraintsTmp
                })



IndexerRequest = Request.extend('IndexerRequest',
"""
A class for parsing indexer requests
""",
optional = {'id': None},
atoms = {'id': (lambda x: x > 0, int)}
)

#########################################################
#                    User Requests                      #
#########################################################

PasswordRequest = Request.extend('PasswordRequest',
"""
A virtual class introducing password argument parsing.
""",
required = 'password',
secret = 'password',
atoms = {'password': (lambda x: len(x) > 0, None)})


DoublePasswordRequest = PasswordRequest.extend('DoublePasswordRequest',
"""
A virtual class introducing password confirmation.
""",
required = 'password2',
secret = 'password2',
atoms = {'password2': (lambda x: len(x) > 0, None)},
constraints = {'passwordsMatches': lambda x: "Passwords don't match." if x.password != x.password2 else None})


LoginRequestAux = Request.extend('LoginRequestAux',
"""
A virtual class introducing login argument parsing.
""",
required = 'login',
atoms = {'login': (lambda x: re.match(LOGIN_RE, x) != None,
                   lambda x: x.strip().lower())})


LoginRequest = LoginRequestAux.extend('LoginRequest',
"""
A class for login request.
""",
parents = [PasswordRequest])


EmailRequest = Request.extend('EmailRequest',
"""
A virtual class introducing e-mail argument parsing.
""",
required = 'email',
atoms = {'email': (lambda x: re.match(EMAIL_RE, x) != None,
                   lambda x: x.strip())})


RegeneratePasswordRequest = LoginRequestAux.extend('RegeneratePasswordRequest',
"""
A class for password regeneration request.
""",
parents = [EmailRequest])


ConfirmIdRequest = Request.extend('ConfirmIdRequest',
"""
A virtual class parsing confirmation ID.
""",
required = 'confirm',
atoms = {'confirm': (lambda x: len(x) > 0 and '\0' not in x,
                     lambda x: x.strip())})


ChangePasswordRegenerateRequest = DoublePasswordRequest.extend('ChangePasswordRegenerateRequest',
"""
A class for changing password when regenerating it.
""",
parents = [ConfirmIdRequest, LoginRequestAux])
 

RegisterRequest = RegeneratePasswordRequest.extend('RegisterRequest',
"""
A class for registration request.
""",
required = 'name',
atoms = {'name': (lambda x: len(x) > 0, lambda x: x.strip())},
parents = [DoublePasswordRequest])


ConfirmRegistrationRequest = LoginRequestAux.extend('ConfirmRegistrationRequest',
"""
A class for registration confirmation request.
""",
parents = [ConfirmIdRequest])


class LogoutRequest(Request):
  pass


class LoggedRequest(Request):
  pass


class ChangePasswordRequest(Request):
  _required = Request._required | frozenset(['oldPassword', 'newPassword', 'passwordRetype'])
  _secret = Request._secret | frozenset(['oldPassword', 'newPassword', 'passwordRetype'])

  def _parse(self):
    if not Request._parse(self):
      return False

    self._parseArgument('oldPassword', lambda x: len(x) > 0)
    self._parseArgument('newPassword', lambda x: len(x) > 0)
    self._parseArgument('passwordRetype', lambda x: len(x) > 0)

    if not self.valid:
      return False

    if self.newPassword != self.passwordRetype:
      self._invalid("Passwords don't match.")

    return self.valid


#########################################################
#                   Upload Request                      #
#########################################################

#TODO: tests

class UploadDataRequest(Request):
  _required = Request._required | frozenset(['data'])
  _binary = Request._binary | frozenset(['data'])

  def _parse(self):
    if not Request._parse(self):
      return False

    self._parseArgument('data', lambda x: len(x) > 0, lambda x: x.fullvalue())

    return self.valid


class ContinueImageUploadRequest(UploadDataRequest):
  _required = UploadDataRequest._required | frozenset(['iid', 'offset'])

  def _parse(self):
    if not UploadDataRequest._parse(self):
      return False

    self._parseArgument('iid', lambda x: x >= 0, int)
    self._parseArgument('offset',
                        lambda x: x >= 0 and x <= MAX_FILE_SIZE - len(self.data),
                        int)

    return self.valid


class UploadNewImageRequest(UploadDataRequest):
  _required = UploadDataRequest._required | frozenset(['filename', 'size', 'key'])
  _optional = dict(UploadDataRequest._optional)
  _optional.update({'bid': None,
                    'top': None,
                    'left': None,
                    'ps': None})

  def _parse(self):
    if not UploadDataRequest._parse(self):
      return False

    self._parseArgument('filename')
    self._parseArgument('size',
                        lambda x: x >= MIN_FILE_SIZE and x <= MAX_FILE_SIZE,
                        int)
    self._parseArgument('bid', lambda x: x >= 0, int)
    self._parseArgument('ps', lambda x: x > 0, float)
    self._parseArgument('top', None, float)
    self._parseArgument('left', None, float)
    self._parseArgument('key', lambda x: len(x) > 0,
                        lambda x: x.strip().lower())

    return self.valid


class GetBrokenDuplicatesRequest(Request):
  _required = Request._required | frozenset(['files_details'])

  def _parse(self):
    if not Request._parse(self):
      return False

    self._parseArgument('files_details',
                        lambda x: len(x) > 0 and all(s >= MIN_FILE_SIZE and s <= MAX_FILE_SIZE and len(k) > 0 for (k, s) in x),
                        lambda x: [(k, int(s)) for (k, s) in (y.split(',') for y in x.split(':'))])
    
    return self.valid


IidsRequestAux = Request.extend('IidsRequestAux',
"""
A virtual class introducing iids list parsing.
""",
required = 'iids',
atoms = {'iids': (lambda x: len(x) > 0 and all(y >= 0 for y in x),
                  lambda x: [int(y) for y in x.split(',')])})


GetImagesStatusesRequest = IidsRequestAux.extend('GetImagesStatusesRequest',
"""
A class for image status querying.
""")

GetImagesPrivilegesRequest = IidsRequestAux.extend('GetImagesPrivilegesRequest',
"""
A class for image privileges querying.
""")

DeleteImagesRequest = IidsRequestAux.extend('DeleteImagesRequest',
"""
A class for image deletion.
""")


UpdateMetadataRequest = Request.extend('UpdateMetadataRequest',
"""
A class for image metadata (offset, resolution and status) update .
""",
required = 'updated',
atoms = {'updated': (lambda x:\
                       len(x) > 0 and\
                       all(iid >= 0 and\
                           validFloat(left) and\
                           validFloat(top) and\
                           pixelSize > 0\
                           for (iid, left, top, pixelSize) in x),
                     lambda x, unwrap = lambda x:\
                                          (int(x[0]), float(x[1]),
                                           float(x[2]), float(x[3])):\
                       [unwrap(y.split(',')) for y in x.split(':')])})

UpdateStatusRequest =  Request.extend('UpdateStatusRequest',
"""
A class for image status update.
""",
required = 'updated',
atoms = {'updated': (lambda x:\
                      len(x) > 0 and\
                      all(iid >= 0 and\
                          status in (6, 7)\
                          for (iid, status) in x),
                      lambda x:\
                        [tuple(map(int, y.split(','))) for y in x.split(':')])})

ChangePublicPrivilegesRequest = Request.extend('ChangePublicPrivilegesRequest',
"""
A class for image public privileges update.
""",
required = 'privileges',
atoms = {'privileges': (lambda x: len(x) > 0 and\
                                  all(len(y) == 5 and\
                                      all(z >= 0 for z in y) and\
                                      all(z <= 1 for z in y[1:]) for y in x),
                  lambda x, unwrap = lambda x:\
                                     [int(x[0])] + [y == '1' for y in x[1:]]:\
                        [unwrap(y.split(',')) for y in x.split(':')])})

class NewBatchRequest(Request):
  _optional = dict(Request._optional)
  _optional.update({'comment': None})

  def _parse(self):
    if not Request._parse(self):
      return False

    self._parseArgument('comment')

    return self.valid


class BatchListRequest(Request):
  pass


class BatchDetailsRequest(Request):
  _optional = dict(Request._optional)
  _optional.update({'bid': None})

  def _parse(self):
    if not Request._parse(self):
      return False

    self._parseArgument('bid', lambda x: x >= 0, int)

    return self.valid


class ImageRequest(Request):
  _pathargs = Request._pathargs + ['id', 'method']
  _method = None

  @classmethod
  def _knownMethods(cls):
    if not hasattr(cls, '_methods'):
      methods = {}

      #print cls, cls._method
      if cls._method != None:
        methods[cls._method] = cls

      try:
        scs = cls.__subclasses__()

      except TypeError: # cls was type ;)
        scs = cls.__subclasses__(cls)

      #print scs

      for sc in scs:
        #print sc
        methods.update(sc._knownMethods())

      cls._methods = methods

    #print cls, "methods", cls._methods

    return cls._methods
    

  @classmethod
  def newRequest(cls, args, kwargs, headers = {}, session = None):
    methods = cls._knownMethods()

    newcls = cls
    if len(args) > 1:
      newcls = methods.get(str(args[1]), cls)

    return newcls(args, kwargs, headers = headers, session = session)


  def _parse(self):
    Request._parse(self)

    if not self.valid:
      return False

    self._parseArgument('id', lambda x: x >= 0, int)

    self._parseArgument('method', lambda x: x in self._knownMethods(), str)

    return self.valid

class ImageInfoRequest(ImageRequest):
  _method = 'info.json'

class ImageSourceRequest(ImageRequest):
  _method = 'image.png'

class TileRequest(ImageRequest):
  _pathargs = ImageRequest._pathargs + ['zoom', 'x', 'y']
  _method = 'tiles'

  def _parse(self):
    ImageRequest._parse(self)
    if not self.valid:
      return False

    for arg in ['zoom', 'x']:
      self._parseArgument(arg, lambda x: x >= 0, int)

    self._parseArgument('y', lambda x: x >= 0, lambda x: int(x[:-4]))

    if not self.valid:
      return False

    for arg in ['x', 'y']:
      if getattr(self, arg) >= 2 ** self.zoom:
        self._invalidArg(arg, str(getattr(self, arg)))

    return self.valid



GetImagesPropertiesRequest = IidsRequestAux.extend('GetImagesPropertiesRequest',
"""
A class for image property querying.
""")

_validType = frozenset('tfisxe')
_valueType = {'e': basestring,
              's': basestring,
              'x': basestring,
              'i': int,
              'f': (int, float)}
_validPriv = frozenset('ago')
def _ValidAlterImagesProperties(changes):
  #print changes
  try:
    if not isinstance(changes, list) or len(changes) == 0:
      return False

    for altered in changes:
      if not isinstance(altered, list) or len(altered) != 3:
        #print 'a'
        return False

      iid, pUnset, pSet = altered
      if not isinstance(iid, int) or iid <= 0 or not isinstance(pUnset, list)\
        or not isinstance(pSet, list) or len(pUnset) + len(pSet) == 0\
        or any(not isinstance(x, basestring) for x in pUnset):
        #print 'b'
        return False

      for prop in pSet:
        if not isinstance(prop, list) or len(prop) not in (4, 5):
          #print 'c', prop
          return False

        n, t, v, e = prop[:4]
        if not isinstance(n, basestring) or not t in _validType\
          or not e in _validPriv or not v in _validPriv:
          #print 'd', prop
          return False

        if t == 't':
          if len(prop) != 4:
            #print 'e'
            return False

        else:
          if not isinstance(prop[4], _valueType[t]):
            #print 'f', prop
            return False

    return True

  except:
    #print 'exc'
    return False

ChangeImagesPropertiesRequest = Request.extend('ChangeImagesPropertiesRequest',
"""
A class for image property altering.
""",
required = 'changes',
atoms = {'changes': (_ValidAlterImagesProperties, json.loads)})


def _ValidSearchProperty(prop):
  try:
    t = prop[0]
    if t == 't':
      return len(prop) == 1

    if len(prop) != 2 or t not in ('e', 'f', 'x'):
      return False

    conditions = prop[1]

    if t == 'e':
      if not isinstance(conditions, list) or len(conditions) == 0 or\
        any(not isinstance(v, basestring) for v in conditions):
        return False

    elif t == 'x':
      if not isinstance(conditions, basestring):
        return False
        
    else: # t == 'f'
      if not isinstance(conditions, dict) or len(conditions) > 2 or \
        'eq' in conditions and len(conditions) != 1 or \
        'lteq' in conditions and 'lt' in conditions or \
        'gteq' in conditions and 'gt' in conditions:
        return False

      if any(k not in ('eq', 'lt', 'gt', 'lteq', 'gteq')
             or not isinstance(v, (int, long, float)) for (k, v) in conditions.items()):
        return False

    return True

  except:
    return False

def _ValidSearchImages(query):
  try:
    if not isinstance(query, list):
      return False

    properties, nonames = query

    for prop in properties:
      if not isinstance(prop, list) or not isinstance(prop[0], basestring):
        return False

      if not _ValidSearchProperty(prop[1:]):
        return False

    for prop in nonames:
      if not isinstance(prop, list) or not _ValidSearchProperty(prop):
        return False

    return True

  except:
    print 'exception'
    return False

SearchImagesRequest = Request.extend('SearchImagesRequest',
"""
A class for image searching.
""",
required = ['query', 'privilege'],
atoms = {'query': (_ValidSearchImages, json.loads),
         'privilege': (lambda x: x in frozenset('vaeom'), None),
         'bid': (lambda x: x >= 0, int)},
optional = {'bid': None})

#---------------------------------------------------------------------------
#----------------------------   TESTS   ------------------------------------
#---------------------------------------------------------------------------
class test_Request(unittest.TestCase):
  _testClass = Request
  _validTests = [(([], {}, {}), {}, Request),
                 (([], {}, {'a': 12}), {}, Request)]
  _invalidTests = [([], {'a': u'b'}, {}),
                   (['a', 'b'], {}, {})]

  def test_valid(self):
    for (args, kwargs, session), res, cls in self._validTests:
      req = self._testClass.newRequest(args, kwargs, session = session)
      #print args, kwargs, session
      #print type(req)
      #print req
      self.assertEqual(req.valid, True)
      self.assertEqual(isinstance(req, cls), True)
      self.assertEqual(req.getFullRequest(), res)

  def test_invalid(self):
    for (args, kwargs, session) in self._invalidTests:
      req = self._testClass.newRequest(args, kwargs, session = session)
      #print args, kwargs, session
      #print type(req)
      #print req
      self.assertEqual(req.valid, False)
      self.assertRaises(ValueError, req.getFullRequest)
      self.assertTrue(len(req.reason) > 0)


class test_LoginRequestAux(test_Request):
  _testClass = LoginRequestAux
  _validTests = [(([], {'login' : 'reksio'}, {}), 
                       {'login' : 'reksio'}, LoginRequestAux),

                 (([], {'login' : 'Reksio'}, {}), 
                       {'login' : 'reksio'}, LoginRequestAux),

                 (([], {'login' : ' REKSIO*_* '}, {}), 
                       {'login' : 'reksio*_*'}, LoginRequestAux)]
                  
  _invalidTests = [([], {'login' : 'reksio%'}, {}),
                   ([], {'login' : 'reks IO%'}, {}),
                   ([], {'login' : ' '}, {})]



class test_LoginRequest(test_Request):
  _testClass = LoginRequest
  _validTests = [(([], {'login' : ' REKSIO*_*  ', 'password' : 'reksio'}, {}), 
                       {'login' : 'reksio*_*', 'password' : 'reksio'}, LoginRequest)]
                  
  _invalidTests = [([], {'login' : '', 'password' : 'reksio'}, {})
                  ,([], {'login' : 'reks io', 'password' : 'reksio'}, {})]


class test_RegisterRequest(test_Request):
  _testClass = RegisterRequest
  _validTests = [(([], {'login' : 'reksio', 'password' : 'reksio',
                        'email' : 'R.eks-io@gmail.com', 'name' : 'REKS',
                        'password2' : 'reksio'}, {}), 
                  {'login' : 'reksio', 'password' : 'reksio',
                   'email' : 'R.eks-io@gmail.com', 'name' : 'REKS',
                   'password2' : 'reksio'}, RegisterRequest),

                 (([], {'login' : 'reksio', 'password' : 'reksio',
                        'email' : ' "reksio "@gmail.com', 'name' : 'REKS ',
                        'password2' : 'reksio'}, {}), 
                  {'login' : 'reksio', 'password' : 'reksio',
                   'email' : '"reksio "@gmail.com', 'name' : 'REKS',
                   'password2' : 'reksio'}, RegisterRequest),

                 (([], {'login' : 'reksio', 'password' : 'reksio',
                        'email' : ' reksio@gmail.com', 'name' : 'REKS ',
                        'password2' : 'reksio'}, {}), 
                  {'login' : 'reksio', 'password' : 'reksio',
                   'email' : 'reksio@gmail.com', 'name' : 'REKS',
                   'password2' : 'reksio'}, RegisterRequest),

                 (([], {'login' : 'reksio', 'password' : 'reksio',
                        'email' : ' reksio@gmail.com', 'name' : 'REKS ',
                        'password2' : 'reksio'}, {}), 
                  {'login' : 'reksio', 'password' : 'reksio',
                   'email' : 'reksio@gmail.com', 'name' : 'REKS',
                   'password2' : 'reksio'}, RegisterRequest)]

  _invalidTests = [([], {'login' : 'reksio', 'password' : 'reksio',
                         'email' : 'reksio.gmail.com', 'name' : 'REKS',
                         'password2' : 'reksio'}, {}), 

                   ([], {'login' : 'reksio', 'password' : 'reksio',
                         'email' : 'reksio@gmail.com' , 'name' : 'REKS',
                         'password2' : 'reksioO'}, {}),
                      
                   ([], {'login' : 'reksio', 'password' : 'reksio',
                         'email' : 'reksio@gmail.com', 'name' : ' ',
                         'password2' : 'reksio'}, {}),
                   ([], {'login' : 'rek$io', 'password' : 'reksio',
                         'email' : 'reksio@gmail.com', 'name' : 'i',
                         'password2' : 'reksio'}, {})] 


class test_ImageRequest(test_Request):
  _testClass = ImageRequest
  _validTests = [((['0', 'info.json'], {}, {}),
                  {'id': 0, 'method': 'info.json'},
                  ImageInfoRequest),
                 ((['42', 'image.png'], {}, {}),
                  {'id': 42, 'method': 'image.png'},
                  ImageSourceRequest),
                 ((['0', 'tiles', '0', '0', '0.jpg'], {}, {}),
                  {'x': 0, 'y': 0, 'zoom': 0, 'id': 0, 'method': 'tiles'},
                  TileRequest),
                 ((['42', 'tiles', '2', '3', '3coko'], {}, {}),
                  {'x': 3, 'y': 3, 'zoom': 2, 'id': 42, 'method': 'tiles'},
                  TileRequest)]
  _invalidTests = [(['0', 'info.json', '0'], {}, {}),
                   ([], {}, {}),
                   (['b', 'info.json'], {}, {}),
                   (['b', 'unknown_method'], {}, {}),
                   (['0', 'image.png'], {'id': '1'}, {}),
                   ([], {'id': u'42'}, {}),
                   (['0', 'tiles', '0', '0', '0'], {}, {}),
                   (['0', 'tiles', '0', '0', 'bla'], {}, {}),
                   (['0', 'tiles', '0', '0', '1', 'tile.jpg'], {}, {}),
                   (['0', 'tiles', '0', '0', '0.jpeg'], {}, {}),
                   (['0', 'tiles', '0', '0', '0.jpg'], {'dummy': u'dummy'}, {}),
                   (['0', 'tiles', '-1', '0', '0.jpg'], {}, {}),
                   (['0', 'tiles', '3', '4', '8.jpg'], {}, {}),
                   (['0', 'tiles', '3', '8', '4.jpg'], {}, {}),
                   (['0', 'tiles', '3', '-1', '4.jpg'], {}, {}),
                   (['0', 'tiles', '3', '1', '-1.jpg'], {}, {}),
                   (['-42', 'tiles', '2', '3', '3.jpg'], {}, {})]


if __name__ == '__main__':
  for cls in [test_LoginRequest, test_RegisterRequest, test_Request, test_ImageRequest]:
    suite = unittest.TestLoader().loadTestsFromTestCase(cls)
    unittest.TextTestRunner(verbosity=2).run(suite)
