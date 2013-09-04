#!/usr/bin/python
# -*- coding: utf-8 -*-
"""
G{importgraph}
"""
from keyboard import keyboard
import unittest
from datetime import datetime

import re

LOGIN_RE = re.compile('^[a-z0-9-+_.*]+$')
EMAIL_RE = re.compile('^((\w|-)+(\.(\w|-)+)*@(\w|-)+(\.(\w|-)+)+)$')

def isstr(s):
  return type(s) is str or type(s) is unicode

def encodeValue(value, binary):
  encoding = 'iso-8859-1' if binary else 'utf-8'
  if type(value) is list:
    return [x.encode(encoding) for x in value]

  return value.encode(encoding)

class Request(object):
  _required = []
  _optional = {}
  _pathargs = []
  _binary = frozenset()
  _secret = frozenset()
  
  def __init__(self, args, kwargs, headers = {}, session = None):
    self.time = datetime.now()
    self._path = [x.encode('utf-8') for x in args]
    self._raw = dict((k.encode('utf-8'),
                      encodeValue(v, k in self._binary)) for (k, v) in kwargs.items())
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
      if not isstr(v):
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
    self._invalid("Invalid value of argument %s: %s" % (name, value))
  
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

    return True

  def _parse(self):
    """
    @return: False if invalid, otherwise True
    """
    return self.valid
  
  def getFullRequest(self):
    if self.valid:
      return dict((x, getattr(self,x)) for x in self._allArgs(True))

    else:
      raise ValueError, (self.reason, self._raw)


#########################################################
#                    User Requests                      #
#########################################################

class LoginRequest(Request):
  _required = Request._required + ['login', 'password']
  _secret = Request._secret | frozenset(['password'])
  
  def _parse(self):
    if not Request._parse(self):
      return False
    
    self._parseArgument('login', transformation = lambda x: x.strip().lower(),
                                 condition = lambda x: re.match(LOGIN_RE, x) != None)
    self._parseArgument('password')
    return self.valid


class RegisterRequest(LoginRequest):
  _required = LoginRequest._required + ['email', 'password2', 'name']
  _secret = LoginRequest._secret | frozenset(['password2'])

  def _parse(self):
    if not LoginRequest._parse(self):
      return False
  
    self._parseArgument('password2')
    self._parseArgument('name', transformation = lambda x: x.strip(),
                                 condition = lambda x: x != '')
    self._parseArgument('email', transformation = lambda x: x.strip().lower(),
                                 condition = lambda x: re.match(EMAIL_RE, x) != None)

    if not self.valid:
      return False

    if self.password != self.password2:
      self._invalid("Passwords don't match.")

    return self.valid


class RegeneratePasswordRequest(Request):
	_required = Request._required + ['login', 'email']
	
	def _parse(self):
		if not Request._parse(self):
			return False
		self._parseArgument('login')
		self._parseArgument('email', transformation = lambda x: x.strip().lower(),
		                             condition = lambda x: re.match(EMAIL_RE, x) != None)

		return self.valid

class ChangePasswordRegenerateRequest(Request):
	_required = Request._required + ['confirmId', 'login', 'npass']

	def _parse(self):
		if not Request._parse(self):
			return False
		self._parseArgument('confirmId')
		self._parseArgument('login')
		self._parseArgument('npass')

		return self.valid
		

class ConfirmRegistrationRequest(Request):
  _required = Request._required + ['login', 'id']

  def _parse(self):
    if not Request._parse(self):
      return False

    self._parseArgument('login')
    self._parseArgument('id')
    #TODO: return???


class LogoutRequest(Request):
  pass


class LoggedRequest(Request):
  pass


class ChangePasswordRequest(Request):
  _required = Request._required + ['oldPassword', 'newPassword', 'passwordRetype']

  def _parse(self):
    if not Request._parse(self):
      return False

    self._parseArgument('oldPassword')
    self._parseArgument('newPassword')
    self._parseArgument('passwordRetype')
    #TODO: return???


#########################################################
#                   Upload Request                      #
#########################################################

#TODO: tests

class UploadDataRequest(Request):
  _required = Request._required + ['data']
  _binary = Request._binary | frozenset(['data'])

  def _parse(self):
    if not Request._parse(self):
      return False

    self._parseArgument('data')

    return self.valid


class ContinueImageUploadRequest(UploadDataRequest):
  _required = UploadDataRequest._required + ['iid', 'offset']

  def _parse(self):
    if not UploadDataRequest._parse(self):
      return False

    self._parseArgument('iid', lambda x: x >= 0, int)
    self._parseArgument('offset', lambda x: x >= 0, int)

    return self.valid


class UploadNewImageRequest(UploadDataRequest):
  _required = UploadDataRequest._required + ['filename', 'size']
  _optional = dict(UploadDataRequest._optional)
  _optional.update({'bid': None})

  def _parse(self):
    if not UploadDataRequest._parse(self):
      return False

    self._parseArgument('filename')
    self._parseArgument('size', lambda x: x >= 0, int)
    self._parseArgument('bid', lambda x: x >= 0, int)

    return self.valid

class UploadImageWithFieldStorageRequest(Request):
  _required = Request._required + ['files_details']

  def _parse(self):
    if not Request._parse(self):
      return False

    self._parseArgument('files_details')
    
    return self.valid


class NewBatchRequest(Request):
  _required = Request._required + ['comment']

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


class test_LoginRequest(test_Request):
  _testClass = LoginRequest
  _validTests = [(([], {'login' : 'reksio', 'password' : 'reksio'}, {}), 
                       {'login' : 'reksio', 'password' : 'reksio'}, LoginRequest),

                 (([], {'login' : 'Reksio', 'password' : 'reksio'}, {}), 
                       {'login' : 'reksio', 'password' : 'reksio'}, LoginRequest),

                 (([], {'login' : ' REKSIO*_*  ', 'password' : 'reksio'}, {}), 
                       {'login' : 'reksio*_*', 'password' : 'reksio'}, LoginRequest)]
                  
  _invalidTests = [([], {'login' : 'dwojcik%', 'password' : 'reksio'}, {})
                  ,([], {'login' : 'dwoj cik%', 'password' : 'reksio'}, {})]

class test_RegisterRequest(test_Request):
  _testClass = RegisterRequest
  _validTests = [(([], {'login' : 'reksio', 'password' : 'reksio', 'email' : 'R.eks-io@gmail.com'
                        , 'name' : 'REKS', 'password2' : 'reksio'}, {}), 
                      {'login' : 'reksio', 'password' : 'reksio', 'email' : 'r.eks-io@gmail.com'
                        , 'name' : 'REKS', 'password2' : 'reksio'}, LoginRequest),

                 (([], {'login' : 'reksio', 'password' : 'reksio', 'email' : ' reksio@gmail.com'
                        , 'name' : 'REKS ', 'password2' : 'reksio'}, {}), 
                      {'login' : 'reksio', 'password' : 'reksio', 'email' : 'reksio@gmail.com'
                        , 'name' : 'REKS', 'password2' : 'reksio'}, LoginRequest),

                 (([], {'login' : 'reksio', 'password' : 'reksio', 'email' : ' reksio@gmail.com'
                        , 'name' : 'REKS ', 'password2' : 'reksio'}, {}), 
                      {'login' : 'reksio', 'password' : 'reksio', 'email' : 'reksio@gmail.com'
                        , 'name' : 'REKS', 'password2' : 'reksio'}, LoginRequest),

  
                 (([], {'login' : 'reksio', 'password' : 'reksio', 'email' : ' reksio@gmail.com'
                        , 'name' : 'REKS ', 'password2' : 'reksio'}, {}), 
                      {'login' : 'reksio', 'password' : 'reksio', 'email' : 'reksio@gmail.com'
                        , 'name' : 'REKS', 'password2' : 'reksio'}, LoginRequest)                     
  ]

  _invalidTests = [([], {'login' : 'reksio', 'password' : 'reksio', 'email' : 'reksio.gmail.com'
                        , 'name' : 'REKS', 'password2' : 'reksio'}, {}), 

                      ([], {'login' : 'reksio', 'password' : 'reksio', 'email' : 'reksio@gmail.com'
                        , 'name' : 'REKS', 'password2' : 'reksioO'}, {}),
                      
                      ([], {'login' : 'reksio', 'password' : 'reksio', 'email' : 'reksio@gmail.com'
                        , 'name' : '', 'password2' : 'reksio'}, {})
                      ] 




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
