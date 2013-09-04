#!/usr/bin/python
# -*- coding: utf-8 -*-

import os
import cherrypy
import eMails
import random


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
    uid = self.userBase.getUserId(login, password)
    if uid != None:
      request.session['userID'] = uid
      message = 'logged in'

    else:
      message = 'incorrect login or password'

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
    salt = random.randint(0, 2**31)
    success = self.userBase.registerUser(login, password, email, name, salt)
    if success == True:
      mail = eMails.sendConfirmationEmail(request, salt)
      if mail == True:
        self.userBase.confirmationSent(login)
        status = True
        message = 'confirmation sent'
      
      else:
        status = False
        errorKey = mail[email][0]
        if errorKey in smtpErrors.keys():
          status = False
          message = 'smtp error: ' + smtpErrors[errorKey]
          self.userBase.deleteUser(login, password)

        else:
          status = False
          message = "Account crearted however there was a problem with sending the confirmation e-mail, please contact admin."

    else:
      status = False
      message = "Couldn't register user"

    return generateJson(data = login, status = status, message = message)

  def regeneratePassword(self, request):
    login = request.login
    email = request.email
    salt = self.userBase.getSalt(login, email) #napisac getSalt
    if salt != None:
      mail = eMails.sendRegenerationEmail(request, salt) #napisac sendRegenerationEmail!
      if mail == True:
        status = True
        message = 'regeneration link sent'

      else:
        status = False
        errorKey = mail[email][0]
        if errorKey in smtpErrors.keys():
          status = False
          message = 'smtp error: ' + smtpErrors[errorKey]

        else:
          status = False
          message = "there was a problem with sending the confirmation e-mail, please contact admin."

    else:
      status = False
      message = "Bad login or E-mail"
    return generateJson(data = login, status = status, message = message)

  @useTemplate('userPanel')
  def confirmPasswordRegeneration(self, request):
    login = request.login
    confirmId = request.id
    uid = self.userBase.confirmRegistration(login, confirmId)
    if uid:
      request.session['userID'] = uid
      return [], [('<!--%modeHere%--!>', 'regeneration'), ("'confirmIdForRegenerateHere'", confirmId), ("'loginForRegenerateHere'", login)]
    else:
      status = False
      message = 'confirmation failed'
      return generateJson(data=login, status=status, message=message)

  def changePasswordRegenerate(self, request):
    confirmId = request.confirmId
    login = request.login
    npass = request.npass
    changeSuccess = self.userBase.changePasswordRegenerate(confirmId, login, npass)
    if changeSuccess == True:
      status = True
      message = 'password regenerated'
    else:
      status = False
      message = 'Failed to regenerate password'
    
    return generateJson(data = login, status = status, message = message)
      



  @useTemplate('userPanel')
  def confirmRegistration(self, request):
    login = request.login
    confirmId = request.id
    uid = self.userBase.confirmRegistration(login, confirmId)
    if uid:
      status = True
      message = 'registration confirmed'
      request.session['userID'] = uid
    else:
      status = False
      message = 'confirmation failed'

    return [], [('<!--%modeHere%--!>', 'confirmation')]

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
