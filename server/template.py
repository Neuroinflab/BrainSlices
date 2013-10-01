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

class templateEngine(object):
  """
  Class of templates.

  @type __filename: str
  @ivar __filename: A filesyetem path to the template.

  @type _templates: {unicode: L{templateEngine}}
  @ivar _templates: A mapping of markers to subtemplates.

  @type _globalTemplates: {unicode: L{templateEngine}}
  @ivar _globalTemplates: A mapping of markers to global subtemplates
                          (applied to the whole subtree of templates).

  @type _compiled: bool
  @ivar _compiled: Indicator if the L{_body} contains already compiled template.

  @type _body: unicode
  @ivar _body: The template (compiled or not).

  @attention: The graph of templating must not contain loops.
  """
  def __init__(self, filename):
    """
    @type filename: str
    @param filename: A filesystem path to the file containing the template.
    """
    self.__filename = filename
    self._templates = {}
    self._globalTemplates = {}
    self.update()

  def __unicode__(self):
    if self._compiled:
      return self._body

    return self._substitute(self._substitute(self._body,
                         self._templates),
                self._globalTemplates)
  
  def __str__(self):
    """
    @return: UTF-8 encoded template.
    """
    return unicode(self).encode('utf-8')

  def __call__(self, parameters):
    """
    @param parameters: A marker to its replacement mapping.
    @type parameters: {unicode: convertable to unicode}

    @return: A template with markers replaced according to given L{parameters}.
    @rtype: unicode
    """
    return self._substitute(unicode(self), parameters)

  def __setitem__(self, key, item):
    """
    Assign a subtemplate to its marker.

    @type key: unicode
    @param key: A marker.

    @type item: convertable to unicode
    @param item: A subtemplate.
    """
    self._templates[key] = item

  def __getitem__(self, key):
    """
    @return: The subtemplate assigned to a marker.
    @rtype: convertable to unicode

    @param key: A marker.
    @type key: unicode

    @note: Does not apply to global subtemplates.
    """
    return self._templates[key]

  def __contains__(self, key):
    """
    Chcecki if marker is already subtemplated.

    @note: Does not apply to global subtemplates.

    @param key: A marker.
    @type key: unicode
    """
    return key in self._templates

  def compile(self):
    """
    Cache the compiled template.
    """
    self._body = unicode(self)
    self._compiled = True

  @staticmethod
  def _substitute(template, parameters):
    """
    @param parameters: A marker to its replacement mapping.
    @type parameters: {unicode: convertable to unicode}

    @param template: A template.
    @type template: unicode

    @return: The L{template} with markers replaced according to given
             L{parameters}.
    @rtype: unicode
    """
    def substitute(x, (y, z)):
      if hasattr(z, '__iter__'):
        return x.replace(y, ''.join(unicode(item) for item in z))

      return x.replace(y, unicode(z))

    return reduce(substitute,
            parameters.iteritems(),
            template)

  def update(self):
    """
    Load (or reload) the template and all its subtemplates.

    @attention: Thread-unsafe!
    """
    fh = open(self.__filename)
    self._body = fh.read().decode('utf-8')
    fh.close()

    for subtemplate in self._templates.values() + self._globalTemplates.values():
      if hasattr(subtemplate, 'update'):
        subtemplate.update()

    self._compiled = False

  def globalTemplate(self, key, value):
    """
    Assign a global subtemplate to its marker.

    A global subtemplate is a subtemplate that is applied not only to the raw
    template, but to whole (non-global) subtemplate tree.

    @type key: unicode
    @param key: A marker of the global subtemplate.

    @type value: convertable to unicode
    @param value: The global subtemplate.

    @note: The result of applying global subtemplates containing markers of
           other global subtemplates is not defined - so it is a good way
           to mess your content.
    """
    self._globalTemplates[key] = value


#TODO: class for iterating over mapping of multiple markers.

class templateIterator(templateEngine):
  """
  Class for iterable templates.

  An iterable template is a template that is being iterated with multiple
  replacements of a single marker.

  @ivar __key: A marker.
  @type __key: unicode

  @ivar __values: Replacements of marker to be iterated over.
  @type __values: sequence(convertable to unicode)
  """
  def __init__(self, filename, key, values):
    """
    @type filename: str
    @param filename: A filesystem path to the file containing the template.

    @param key: A marker.
    @type key: unicode

    @param values: Replacements of marker to be iterated over.
    @type values: sequence(convertable to unicode)
    """
    self.__key = key
    self.__values = values
    templateEngine.__init__(self, filename)

  def __str__(self):
    if self._compiled:
      return self._body

    pattern = self._substitute(self._body, self._templates)
    combined = ''.join(pattern.replace(self.__key, unicode(x)) for x in self.__values)
    return self._substitute(combined, self._globalTemplates)

  def update(self):
    for subtemplate in self.__values:
      if hasattr(subtemplate, 'update'):
        subtemplate.update()

    templateEngine.update(self)

#def getTemplates():
#  templates = {}
#  welcomePage = templateEngine('templates/welcome_page.html')
#  welcomePage['<!--%essentialScripts%--!>'] = templateEngine('templates/essential_scripts.html')
#  welcomePage['<!--%loginRegisterScripts%--!>'] = templateEngine('templates/login_register_scripts.html')
#  welcomePage['<!--%loginRegisterForms%--!>'] = templateEngine('templates/login_register_forms.html')
#  templates['welcomePage'] = welcomePage
#  templates['userPanel'] = templateEngine('templates/user_panel.html')
#  userPanelNormalMode = templateEngine('templates/user_panel.html')
#  userPanelNormalMode['<!--%modeHere%--!>'] = "'normal'"
#  userPanelConfirmMode = templateEngine('templates/user_panel.html')
#  userPanelConfirmMode['<!--%modeHere%--!>'] = "'confirmation'"
#  templates['userPanelNormalMode'] = userPanelNormalMode
#  templates['userPanelConfirmMode'] = userPanelConfirmMode
#  return templates

