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
import eMails

from template import templateEngine

from request import LoginRequest, LogoutRequest, LoggedRequest,\
                    RegisterRequest, ConfirmRegistrationRequest,\
                    ChangePasswordRequest, RegeneratePasswordRequest,\
                    ChangePasswordRegenerateRequest

from server import generateJson, Server, serveContent, ensureLogged

from bsConfig import BS_USER_DEFAULT_PIXEL_LIMIT 

smtpErrors = {450: "Requested mail action not taken: mailbox unavailable",
              550: "Requested action not taken: mailbox unavailable", 
              552: "Requested mail action aborted: exceeded storage allocation",
              553: "Requested action not taken: mailbox name not allowed"}


class UserServer(Server):
  def __init__(self, servicePath, userBase):
    self.userBase = userBase

  @serveContent(LoginRequest)
  def login(self, request):
    login = request.login
    password = request.password
    uid = self.userBase.checkPassword(login, password)
    if uid is not None:
      request.session['userID'] = uid
      message = 'logged in'

    else:
      message = 'Login not registered.'
      if self.userBase.userRegistered(login):
        message = 'Password mismatch.' if self.userBase.getUserEnabled(login)\
                  else 'Account disabled.'

    return generateJson(data = login, 
                        status = uid != None, 
                        message = message, 
                        logged = uid != None)

  @serveContent(LogoutRequest)
  def logout(self, request):
    if 'userID' in request.session:
      del request.session['userID']

    return generateJson(message = 'logged out')

  @serveContent(LoggedRequest)
  def logged(self, request):
    uid = request.session.get('userID')
    if uid is not None:
      login = self.userBase.getUserLogin(uid)
      return generateJson(logged=True, data= login) 

    return generateJson(logged=False)

  @serveContent(ChangePasswordRequest)
  @ensureLogged
  def changePassword(self, uid, request):
    oldPassword = request.oldPassword
    newPassword = request.newPassword
    status = False
    message = "Unable to change the password."
    login = self.userBase.checkPassword(uid, oldPassword, record=False)
    if login != None:
      if self.userBase.changePassword(login, newPassword):
        status = True
        message = 'Password changed successfully.'

    return generateJson(#data = uid,
                        status = status,
                        message = message,
                        logged = True)

  @serveContent(RegisterRequest)
  def registerUser(self, request):
    login = request.login
    password = request.password
    name = request.name
    email = request.email
    status = False
    success = self.userBase.registerUser(login, password, email, name,
                                         pixelLimit = BS_USER_DEFAULT_PIXEL_LIMIT)
    if success == True:
      message = "Account created however there was a problem with sending the confirmation e&#8209;mail, please contact admin."
      confirmID = self.userBase.newConfirmationID(login)
      if confirmID:
        mail = eMails.sendConfirmationEmail(request, confirmID)
        if mail == True:
          self.userBase.confirmationSent(login)
          status = True
          message = """Registration confirmation e&#8209;mail has been sent to your e&#8209;mail.
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

  @serveContent(ConfirmRegistrationRequest)
  def confirmRegistration(self, request):
    uid = self.userBase.checkConfirmationID(request.login, request.confirm)
    request.session['userID'] = uid
    return generateJson(status=uid is not None,
                        message=("""
                                 Thank you for registration in our service, %s.<br>
                                 Your account has been successfully activated.
                                 """ % request.login) if uid is not None\
                                 else """
                                 Confirmation of registration failed.<br>
                                 Please check your credentials carefully.
                                 """,
                        logged = uid is not None)

  @serveContent(RegeneratePasswordRequest)
  def regeneratePassword(self, request):
    status = False
    login = request.login
    email = request.email
    row = self.userBase.getEmailInformation(login)
    message = "Login not registered."
    if row != None:
      email_, name, enabled = row
      message = "E&#8209;mail address mismatch. Please note, that we consider e&#8209;mail address to be case-sensitive."
      if email_ == email:
        message = "Account disabled."
        if enabled:
          message = """Some problem occured sending the confirmation
e&#8209;mail, please contact the administrator."""
          confirmID = self.userBase.newConfirmationID(login)
          if confirmID:
            mail = eMails.sendRegenerationEmail(request, name, confirmID)
            if mail == True:
              status = True
              message = """Password regeneration e&#8209;mail has been sent to your e&#8209;mail address.
To complete the regeneration process please check your e&#8209;mail box and follow instructions in the e&#8209;mail."""

            else:
              errorKey = mail[email][0]
              if errorKey in smtpErrors.keys():
                message = 'SMTP error: ' + smtpErrors[errorKey]

    return generateJson(data = login, status = status, message = message)

  @serveContent(ChangePasswordRegenerateRequest)
  def changePasswordRegenerate(self, request):
    confirmId = request.confirm
    login = request.login
    npass = request.password
    status = False
    message = 'Failed to change the password.'
    uid = self.userBase.checkConfirmationID(login, confirmId)
    if uid:
      if self.userBase.changePassword(login, npass):
        status = True
        message = 'Password changed successfuly.'

    else:
      message = 'Login not registered.'
      if self.userBase.userRegistered(login):
        message = 'Confirmation key mismatch' \
                  if self.userBase.getUserEnabled(login) \
                  else 'Account disabled.'

    request.session['userID'] = uid
    return generateJson(data = login,
                        status = status,
                        message = message,
                        logged = status)

