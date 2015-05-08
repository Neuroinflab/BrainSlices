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

import os
import cherrypy

from webService import WebService
from bsConfig import BS_HTTPS_PORT, BS_HTTPS_CERTIFICATE, BS_HTTPS_KEY, BS_HTTPS_CHAIN


directoryName = os.path.abspath(os.path.dirname(__file__))

# possible redundancy!!! TODO: think about instance instead of class


if __name__ == '__main__':
  srv = WebService(directoryName)
  siteconf = os.path.join(directoryName, 'site.conf')
  appconf  = os.path.join(directoryName, 'app.conf')
  cherrypy.config.update(siteconf)

  cherrypy.tree.mount(root=srv, script_name='/', config=appconf)

  if BS_HTTPS_PORT is not None:
    httpsServer = cherrypy._cpserver.Server()
    httpsServer.socket_port = BS_HTTPS_PORT
    httpsServer.ssl_module = 'pyopenssl'
    httpsServer.ssl_certificate = BS_HTTPS_CERTIFICATE
    httpsServer.ssl_private_key = BS_HTTPS_KEY
    httpsServer.ssl_certificate_chain = BS_HTTPS_CHAIN

    for attr in ['socket_host',
                 'thread_pool',
                 'socket_queue_size',
                 'max_request_body_size',
                 'socket_timeout',
                ]:
      setattr(httpsServer, attr, getattr(cherrypy.server, attr))

    httpsServer.subscribe()

  cherrypy.engine.start()
  cherrypy.engine.block()

