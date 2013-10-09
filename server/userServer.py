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
import eMails
import base64


from template import templateEngine

from request import LoginRequest, LogoutRequest, LoggedRequest,\
                    RegisterRequest, ConfirmRegistrationRequest,\
                    ChangePasswordRequest, RegeneratePasswordRequest,\
                    ChangePasswordRegenerateRequest

from server import Generator, useTemplate,  generateJson, Server, serveContent

smtpErrors = {450: "Requested mail action not taken: mailbox unavailable",
              550: "Requested action not taken: mailbox unavailable", 
              552: "Requested mail action aborted: exceeded storage allocation",
              553: "Requested action not taken: mailbox name not allowed"}

class UserGenerator(Generator):
  def __init__(self, templatesPath, userBase):
    Generator.__init__(self, templatesPath) 
    self.userBase = userBase
    userPanel = self.templateEngine('user_panel.html')
    userPanel['<!--%userPanel%-->'] = self.templateEngine('loginWindow.html')
    self['userPanel'] = userPanel


  def login(self, request):
    login = request.login
    password = request.password
    uid = self.userBase.loginUser(login, password)
    if uid != None:
      request.session['userID'] = uid
      message = 'logged in'

    else:
      message = 'Incorrect login or password.'
      if self.userBase.getUserEnabled(login) == False:
        message = 'Account disabled.'

    return generateJson(data = login, 
                        status = uid != None, 
                        message = message, 
                        logged = uid != None)
            
  def logout(self, request):
    request.session['userID'] = None
    
    return generateJson(message = 'logged out')

  def logged(self, request):
    #TODO: what if session['userID'] does not exist (e.g. before login)?
    # HTTP returncode 500 because of KeyError: 'userID'
    # see server.py for solution (ensureLogged decorator)
    uid = request.session.get('userID')
    if uid!=None:
      login = self.userBase.getUserLogin(uid)
      return  generateJson(logged = request.session.get('userID') != None, data= login) 

    return generateJson(logged = request.session.get('userID') != None)

  def generateUser(self, request):
    login = request.login
    password = request.password
    name = request.name
    email = request.email
    status = False
    success = self.userBase.registerUser(login, password, email, name)
    if success == True:
      message = "Account crearted however there was a problem with sending the confirmation e-mail, please contact admin."
      rawID = self.userBase.newConfirmationID(login)
      if rawID:
        confirmID = base64.urlsafe_b64encode(rawID)
        mail = eMails.sendConfirmationEmail(request, confirmID)
        if mail == True:
          self.userBase.confirmationSent(login)
          status = True
          message = """Registration confirmation e-mail has been sent to your
  e&#8209;mail.<br/>
  To complete registration process please check your e&#8209;mail box and follow
  instructions in the e&#8209;mail."""
        
        else:
          errorKey = mail[email][0]
          if errorKey in smtpErrors.keys():
            message = 'smtp error: ' + smtpErrors[errorKey]
            self.userBase.deleteUser(login, password)

    else:
      message = success if isinstance(success, (str, unicode)) \
                else "Unable to register user (unknown error)."

    return generateJson(data = login, status = status, message = message)

  def regeneratePassword(self, request):
    status = False
    message = """No match for login and e&#8209;mail addres pair found in the
database. Please note, that we consider e&#8209;mail address to be case-sensitive."""
    login = request.login
    email = request.email
    row = self.userBase.getEmailInformation(login)
    if row != None:
      email_, name, enabled = row
      if email_ == email:
        if enabled:
          message = """Some problem occured sending the confirmation
e&#8209;mail, please contact the administrator."""
          rawID = self.userBase.newConfirmationID(login)
          if rawID:
            confirmID = base64.urlsafe_b64encode(rawID)
            mail = eMails.sendRegenerationEmail(request, name, confirmID)
            if mail == True:
              status = True
              message = """Password regeneration e&#8209;mail has been sent to your e&#8209;mail address.
To complet  e the regeneration process please check your e&#8209;mail box and follow instructions in the e&#8209;mail."""

            else:
              errorKey = mail[email][0]
              if errorKey in smtpErrors.keys():
                message = 'SMTP error: ' + smtpErrors[errorKey]

        else:
          message = "The account is disabled."

    return generateJson(data = login, status = status, message = message)

  @useTemplate('userPanel')
  def confirmPasswordRegeneration(self, request):
    login = request.login
    rawId = request.confirm
    #TODO: simplify!!!
    uid = self.userBase.checkConfirmationID(login, rawId)
    if uid != None:
      #request.session['userID'] = uid
      rawId = self.userBase.newConfirmationID(login)
      if rawId:
        confirmID = base64.urlsafe_b64encode(rawId)
        return ([('<!--%confirmHere%--!>', confirmID),
                 ('<!--%loginHere%--!>', login)],
                [('<!--%modeHere%--!>', 'regeneration')])

    return [], [('<!--%modeHere%--!>', 'regeneration failed')]

  def changePasswordRegenerate(self, request):
    confirmId = request.confirm
    login = request.login
    npass = request.password
    uid = self.userBase.changePasswordRegenerate(confirmId, login, npass)
    if uid:
      status = True
      message = 'password regenerated'

    else:
      status = False
      message = 'Failed to regenerate password'

    request.session['userID'] = uid
    return generateJson(data = login, status = status, message = message, logged = status)

  @useTemplate('userPanel')
  def confirmRegistration(self, request):
    login = request.login
    confirmId = request.confirm
    uid = self.userBase.checkConfirmationID(login, confirmId)
    if uid:
      #status = True
      mode = 'confirmation'
      request.session['userID'] = uid

    else:
      #status = False
      mode = 'confirmation failed'

    return [], [('<!--%modeHere%--!>', mode)]

  @useTemplate('userPanel')
  def index(self):
    return [], [('<!--%modeHere%--!>', 'normal')]

  def changePassword(self, request):
    #print(request)
    uid = request.session.get('userID')
    oldPassword = request.oldPassword
    newPassword = request.newPassword
    passwordRetype = request.passwordRetype
    success = self.userBase.changePassword(uid, oldPassword, newPassword)
    if success:
      status = True
      message = 'password changed'

    else:
      status = False
      message = 'password change failed'

    return generateJson(data = uid,
                        status = status,
                        message = message,
                        logged = uid != None)


class UserServer(Server):
  def __init__(self, servicePath, userBase):
    self.serviceDir = servicePath
    self.userGenerator = UserGenerator(os.path.join(servicePath, 'templates'), userBase)

  @serveContent()
  def index(self):
    return self.userGenerator.index()

  @serveContent(LoginRequest)
  def login(self, request):
    return self.userGenerator.login(request)

  @serveContent(LogoutRequest)
  def logout(self, request):
    return self.userGenerator.logout(request)

  @serveContent(LoggedRequest)
  def logged(self, request):
    return self.userGenerator.logged(request)

  @serveContent(ChangePasswordRequest)
  def changePassword(self, request):
    return self.userGenerator.changePassword(request)

  @cherrypy.expose
  @serveContent(RegisterRequest)
  def registerUser(self, request):  
      return self.userGenerator.generateUser(request)

  @cherrypy.expose
  @serveContent(ConfirmRegistrationRequest)
  def confirmRegistration(self, request):
    return self.userGenerator.confirmRegistration(request)

  @cherrypy.expose
  @serveContent(RegeneratePasswordRequest)
  def regeneratePassword(self, request):
    return self.userGenerator.regeneratePassword(request)

  @cherrypy.expose
  @serveContent(ChangePasswordRegenerateRequest)
  def changePasswordRegenerate(self, request):
    return self.userGenerator.changePasswordRegenerate(request)

  @cherrypy.expose
  @serveContent(ConfirmRegistrationRequest)
  def confirmPasswordRegeneration(self, request):
    return self.userGenerator.confirmPasswordRegeneration(request)
