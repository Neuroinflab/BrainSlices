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

from request import IndexerRequest
from server import Server, Generator, serveContent, useTemplate


class IndexerServer(Generator, Server):
  def __init__(self, tileBase, metaBase, servicePath):
    Generator.__init__(self, os.path.join(servicePath, 'templates'))
    self.tileBase = tileBase
    self.metaBase = metaBase

    self['index'] = self.templateEngine('index.html')
    self['info'] = self.templateEngine('info.html')

  @useTemplate('index')
  def index(self):
    iids = self.metaBase.searchImages([])
    iids = ['<a href="?id=%d">#%d</a>' % (x,x) for x in iids]
    return [('<!--%content%-->', '<br>'.join(iids))], []

#  index.exposed = True

  @useTemplate('info')
  def info(self, iid):
    data = self.tileBase.accessImage(iid,  extraFields = """, image_width,
                                                              image_height,
                                                              image_md5,
                                                              image_crc32""")
    width, height, md5, crc32 = data[5:]
    strings = [('<!--%size%-->', '%dx%d' % (width, height)),
               ('%md5%', md5),
               ('%iid%', str(iid))]
    if self.metaBase:
      properties = self.metaBase.getProperties(iid)
      tags = []
      content = []
      name = properties.pop('name', None)
      if name:
        if name['type'] == 't':
          tags.append('name')
          namestring = ''

        else:
          namestring = name['value'].decode('utf-8')
          strings.append(('<!--%name%-->',
                          '<h1>%s</h1>' % namestring))

      else:
        namestring = ''

      strings.append(('<!--%nameTitle%-->', namestring))

      desc = properties.pop('description', None)
      if desc:
        if desc['type'] == 't':
          tags.append('description')

        else:
          strings.append(('<!--%description%-->',
                          '<p>%s</p>' % desc['value']))
      
      for name, prop in properties.items():
        if prop['type'] == 't':
          tags.append(name)

        else:
          content.append('<tr><th>%s</th><td>%s</td></tr>' %\
                         (name, prop['value']))

      strings.append(('<!--%properties%-->', (''.join(content)).decode('utf-8')))
      strings.append(('%tags%', ', '.join(tags).decode('utf-8')))

    return strings, []

  @serveContent(IndexerRequest)
  def __call__(self, request):
    if request.id is not None:
      return self.info(request.id)

    return self.index()

