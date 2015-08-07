#!/usr/bin/python
# -*- coding: utf-8 -*-
###############################################################################
#                                                                             #
#    BrainSlices Software                                                     #
#                                                                             #
#    Copyright (C) 2012-2014 Jakub M. Kowalski, J. Potworowski                #
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
import cherrypy
from cherrypy.lib import static
import json

import template

# Hack, hack, hack
import tempfile
cherrypy._cpreqbody.Part.make_file = lambda x: tempfile.SpooledTemporaryFile(max_size=1024*1024)

def unwrapRow(row, fields=['status', 'viewPrivilege', 'editPrivilege',
                           'annotatePrivilege', 'outlinePrivilege',
                           'imageTop', 'imageLeft', 'imageWidth',
                           'imageHeight', 'tileWidth', 'tileHeight',
                           'pixelSize', 'crc32', 'md5', 'iid']):
  return dict(zip(fields, row))

def jsonStd(data = None, status = True, message = None, logged = False):
  """
  Prepare standart JSON object.

  The response returned by the server after AJAX query is a standarised JSON
  object.

  A standarised JSON object contains following attributes:
    - status - A boolean indicating if the requested operation has succeeded.
    - logged - A boolean indicating if the user is logged to the repository.
    - message - A string containing an user-friendly message (important in
                case of a failure
    - data - Additional data provided by the server.

  @return: Representation of a <standart JSON object> with attributes
           set according to function parameters.
  @rtype: str
  """
  return json.dumps({'data': data,
                     'status': status,
                     'message': message,
                     'logged': logged})

def generateJson(data = None, status = True, message = None, logged = False):
  """
  @return: Output that is served to the client as a standart JSON object
           (see L{jsonStd}) with attributes set according to function
           parameters.

  @note: In order to have the content served properly the L{serveContent}
         decorator has to be used.
  """
  return (False,
          jsonStd(data = data,
                  status = status,
                  message = message,
                  logged = logged),
          'application/json')

def ensureLogged(f):
  """
  Decorator that ensures if the user is already logged to the service.

  @type f: function(self, uid, request)
  @param f: A function to be decorated.

  @rtype: function(self, request)
  @return: Function ensuring the user is already logged, then executing
           the function C{L{f}(self, uid, request)} where C{uid} is an
           unique user identifier in the repository.
  """
  def toBeReturned(self, request):
    """
    Function returned by the decorator L{ensureLogged} with embeded decorated
    function.

    @type request: L{Request}
    @param request: Object representing the client request.
    """
    uid = request.session.get('userID')
    if uid is None:
      return generateJson(status = False,
                          message = "Unknown user identity.")

    return f(self, uid, request)

  return toBeReturned


def useTemplate(templateName):
  """
  Create decorator to extend the decorated function with:
    - embedding provided strings and objects into template,
    - prepare the content to be served properly with L{serveContent}
      decorator.

  @type templateName: str
  @param templateName: Name (key) of the template to be used.

  @rtype: function(f)
  @return: The decorator function.

  @note: The data returned by the decorated function should be
         in format: C{([(key, string), ...] ,[(key, object), ...])}.
  """
  def decoratorFunction(function):
    def toBeExecuted(self, *args, **kwargs):
      variables = function(self, *args, **kwargs)
      if variables is None:
         raise cherrypy.HTTPError("404 Not found")

      strings, jsons = variables
      strings += [(k, json.dumps(v)) for (k, v) in jsons]
      html = reduce(lambda x, (y, z): x.replace(y, z),#XXX: template is unicode
                    strings, self[templateName])
      return False, html, 'text/html'

    return toBeExecuted

  return decoratorFunction


class Generator(object):
  """
  A base class of objects responsible for content generation. Its objects
  bind HTTP server with database and coordinate processing of user requests.

  @type __templatePath: str
  @ivar __templatePath: A filesystem path to directory containing HTML
                        templates for the generator.

  @type __templates: {str or int: L{templateEngine<template.templateEngine>} or
                                  L{templateIterator<templateIterator>}}
  @ivar __templates: A mapping of keys to templates. Numbers are reserved for
                     templates of HTTP error responses (like 404).
  """
  def __init__(self, templatePath = None):
    if templatePath == None:
      templatePath = os.path.abs(os.path.dirname(__file__))

    self.__templatePath = templatePath
    self.__templates = {}
    self[404] = self.templateEngine('404.html') # for fun ;)

  def templateEngine(self, filename):
    """
    An alias for C{L{template.templateEngine}(os.path.join(self.L{__templatePath<Generator.__templatePath>}, L{filename}))}.

    @type filename: str
    @param filename: Name (or rather relative path) of file with template.

    @return: template object
    @rtype: L{template.templateEngine}
    """
    return template.templateEngine(os.path.join(self.__templatePath, filename))

  def templateIterator(self, filename, key, values):
    """
    An alias for C{L{template.templateIterator}(os.path.join(self.L{__templatePath<Generator.__templatePath>}, L{filename}), L{key}, L{values})}.

    @type filename: str
    @param filename: Name (or rather relative path) of file with template.

    @type key: unicode
    @param key: A marker to be replaced with value.

    @type values: [convertable to unicode, ...]
    @param values: A list of values.

    @return: template iterator object
    @rtype: L{template.templateIterator}
    """
    return template.templateIterator(os.path.join(self.__templatePath,
                                                  filename),
                                     key, values)

  def __setitem__(self, key, item):
    self.__templates[key] = item

#TODO: remove template updating
  def __getitem__(self, key):
    self.__templates[key].update()
    return unicode(self.__templates[key])

  def __contains__(self, key):
    return key in self.__templates

  def compileTemplates(self):
    """
    Compile templates.
    """
    for item in self.__templates.values():
      if hasattr(item, 'compile'):
        item.compile()

  def updateTemplates(self):
    """
    Update templates.
    """
    for item in self.__templates.values():
      if hasattr(item, 'update'):
        item.update()

  #TODO: think about move to webService.py
  def errorPage404(self, status, message, traceback, version):
    """
    
    """
    return self[404].replace('<!--%status%:-->', unicode(status))


class Server(object):
  exposed = True

  def __init__(self):
    if not hasattr(self, 'generator'):
      self.generator = Generator()

    if not hasattr(self, '_cp_config'):
      self._cp_config = {}

    if 'error_page.404' not in self._cp_config:
      self._cp_config['error_page.404'] = self.errorPage404

  def errorPage404(self, status, message, traceback, version):
    """
    An alias of C{self.L{generator<Generator>}.L{errorPage404<Generator.errorPage404>}(status, message, traceback, version)
    providing custom 404 error page (see U{http://docs.cherrypy.org/stable/refman/_cperror.html?highlight=exception#anticipated-http-responses} for details).
    """
    return self.generator.errorPage404(status, message, traceback, version)

  def __call__(self,  *args, **kwargs):
    raise cherrypy.HTTPError("404 Not found")

  def _createRequest(self, requestClass, args, kwargs):
    """
    Create a new request object.

    @param requestClass: A class of requested request.
    @type requestClass: a subclass of L{request.request}.

    @param args: Elements of the path component of the requested URL.
    @type args: [unicode, ...]

    @param kwargs: Arguments passed in the query string of the requested URL.
    @type kwargs: {unicode: unicode or [unicode, ...]}

    @rtype: L{requestClass}
    @return: The new request object.
    """
    request = requestClass.newRequest(args, kwargs,
                                      session = cherrypy.session,
                                      headers = cherrypy.request.headers)
    # no logger available at the moment
    #self.logger.log(request)

    if not request.valid:
      raise cherrypy.HTTPError("400 Bad request",
                               "; <br>\n".join(request.reason))

    return request


def serveContent(requestClass = None):
  """
  Prepare a decorator to extend the decorated function with:
    - appriopriate request creation,
    - HTTP 404 error generation if no content has been generated,
    - appropriate content serving.

  @type requestClass: class (a sublass of L{Request})
  @param requestClass: A class of request expected by the decorated function
                       (None if no request is expected).

  @rtype: function(f)
  @return: Decorator of server function.
  """
  def decoratorFunction(function):
    def toBeExecuted(self, *args, **kwargs):
      if requestClass != None:
        request = self._createRequest(requestClass, args, kwargs)
        response = function(self, request)

      else:
        response = function(self)

      if not response:
        raise cherrypy.HTTPError("404 Not found")

      if response[0]: # path to a file
        filePath, clientFilename, mimeType = response[1:]

        disposition = 'attachment'
        if mimeType in ('image/jpeg', 'text/html'):
          disposition = 'inline'

        return static.serve_file(filePath,
                                 mimeType,
                                 disposition = disposition,
                                 name = clientFilename)

      else: # ready data
        string, mimeType = response[1:3]

        disposition = None
        if len(response) >= 4:
          disposition = response[3]

        elif len(response) == 3 and mimeType in ('aplication/json', 'image/jpeg'):
          disposition = 'inline'

        if disposition != None:
          cherrypy.response.headers['Content-Disposition'] = disposition

        cherrypy.response.headers['Content-Type'] = mimeType

        return string

    if hasattr(function, '_cp_config'):
      toBeExecuted._cp_config = dict(function._cp_config)

    return cherrypy.expose(toBeExecuted)

  return decoratorFunction

