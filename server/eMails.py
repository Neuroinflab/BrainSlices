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
import smtplib
import re
import hashlib
import os
import email.utils as eutils
from email.mime.text import MIMEText
from datetime import datetime
from bsConfig import BS_EMAIL_PASSWORD, BS_EMAIL_SERVER, BS_EMAIL_PORT,\
                     BS_EMAIL_LOGIN, BS_EMAIL_ADDRESS, BS_EMAIL_ENCODING, \
                     BS_SERVICE_SERVER, BS_SERVICE_NAME, BS_SERVICE_SIGNATURE


BS_EMAIL_FROM = ("%s<%s>" % (BS_SERVICE_SIGNATURE, BS_EMAIL_ADDRESS)).encode(BS_EMAIL_ENCODING)

#registration templates
#CONFIRMATION_LINK_TEMPLATE = 'http://%s/user/confirmRegistration?confirm=%%s&login=%%s' % BS_SERVICE_SERVER
CONFIRMATION_LINK_TEMPLATE = 'http://%s/?user=confirm&confirm=%%s&login=%%s' % BS_SERVICE_SERVER

REGISTRATION_EMAIL_SUBJECT = u'%s account registration' % BS_SERVICE_NAME

REGISTRATION_EMAIL_TEMPLATE = u'''Dear %%(name)s,
please follow the link below to confirm your account registration (%%(login)s)
in %s:
%%(link)s
or enter the following confirmation key manually:
%%(key)s

Sincerely yours,
%s''' % (BS_SERVICE_NAME, BS_SERVICE_SIGNATURE)

#regeneration templates
#REGENERATION_LINK_TEMPLATE = 'http://%s/user/confirmPasswordRegeneration?confirm=%%s&login=%%s' % BS_SERVICE_SERVER
REGENERATION_LINK_TEMPLATE = 'http://%s/?user=regenerate&confirm=%%s&login=%%s' % BS_SERVICE_SERVER
 
REGENERATION_EMAIL_SUBJECT = u'%s password regeneration' % BS_SERVICE_NAME

REGENERATION_EMAIL_TEMPLATE = u'''Dear %%(name)s,
please follow the link below to regenerate your account password (%%(login)s) in %s:
%%(link)s
or enter the following confirmation key manually:
%%(key)s

Sincerely yours,
%s''' % (BS_SERVICE_NAME, BS_SERVICE_SIGNATURE)


def sendConfirmationEmail(request, confirmId):
  name = request.name.decode('utf-8')
  email = request.email.decode('utf-8')
  login = request.login.decode('utf-8')
  return sendConfirmationEmailAux(name, email, login, confirmId)

def sendConfirmationEmailAux(name, email, login, confirmId):
  emailAdress = u"%s<%s>" % (name, email)
  #now = datetime.now().strftime('%Y.%m.%d %H:%M:%S') #XXX: not used
  confirmationLink = CONFIRMATION_LINK_TEMPLATE % (confirmId, login)

  #prepare email
  templateDict = {'name': name, 
                  'login': login, 
                  'link': confirmationLink,
                  'key': confirmId}

  content = REGISTRATION_EMAIL_TEMPLATE % templateDict
  customerMsg = MIMEText(content.encode(BS_EMAIL_ENCODING),
                         'plain',
                         BS_EMAIL_ENCODING)
  customerMsg['Subject'] = REGISTRATION_EMAIL_SUBJECT
  customerMsg['From'] = BS_EMAIL_FROM
  customerMsg['To'] = emailAdress.encode(BS_EMAIL_ENCODING)
  customerMsg['Date'] = eutils.formatdate()
  
  smtp = smtplib.SMTP(BS_EMAIL_SERVER, BS_EMAIL_PORT)
  smtp.ehlo(BS_SERVICE_SERVER)
  smtp.starttls()
  smtp.login(BS_EMAIL_LOGIN, BS_EMAIL_PASSWORD)
  try:
    smtp.sendmail(BS_EMAIL_ADDRESS,
                  email,
                  customerMsg.as_string())
  except smtplib.SMTPRecipientsRefused as e:
    smtp.quit()
    return e.recipients

  smtp.quit()

  return True


#regeneration scripts

def sendRegenerationEmail(request, name, confirmId):
  email = request.email.decode('utf-8')
  login = request.login.decode('utf-8')
  return sendRegenerationEmailAux(email, name, login, confirmId)

def sendRegenerationEmailAux(email, name, login, confirmId):
  emailAdress = "%s<%s>" % (name, email)
  regenerationLink = REGENERATION_LINK_TEMPLATE % (confirmId, login)

  #prepare email
  templateDict = {'login': login, 
                  'link': regenerationLink,
                  'name': name,
                  'key': confirmId}

  content = REGENERATION_EMAIL_TEMPLATE % templateDict
  customerMsg = MIMEText(content.encode(BS_EMAIL_ENCODING),
                         'plain',
                         BS_EMAIL_ENCODING)
  customerMsg['Subject'] = REGENERATION_EMAIL_SUBJECT
  customerMsg['From'] = BS_EMAIL_FROM
  customerMsg['To'] = emailAdress.encode(BS_EMAIL_ENCODING)
  customerMsg['Date'] = eutils.formatdate()
  
  smtp = smtplib.SMTP(BS_EMAIL_SERVER, BS_EMAIL_PORT)
  smtp.ehlo(BS_SERVICE_SERVER)
  smtp.starttls()
  smtp.login(BS_EMAIL_LOGIN, BS_EMAIL_PASSWORD)
  try:
    smtp.sendmail(BS_EMAIL_ADDRESS,
                  email,
                  customerMsg.as_string())
  except smtplib.SMTPRecipientsRefused as e:
    smtp.quit()
    return e.recipients

  smtp.quit()

  return True


