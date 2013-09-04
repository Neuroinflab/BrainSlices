import smtplib
import re
import hashlib
import os
import email.utils as eutils
from email.mime.text import MIMEText
from datetime import datetime
from config import BS_EMAIL_PASSWORD, BS_EMAIL_SERVER, BS_EMAIL_PORT,\
                   BS_EMAIL_LOGIN, BS_EMAIL_ADDRESS, BS_SERVICE_SERVER,\
                   BS_EMAIL_ENCODING

#registration templates
CONFIRMATION_LINK_TEMPLATE = 'http://%s/user/confirmRegistration?login=%s;id=%s'

REGISTRATION_EMAIL_SUBJECT = 'Brainslices account registration'

REGISTRATION_EMAIL_TEMPLATE = '''Dear %(name)s,
Please click the link below to confirm your account registration (%(login)s)
in brainslices.org:
%(link)s '''

#regeneration templates
REGENERATION_LINK_TEMPLATE = 'http://%s/user/confirmPasswordRegeneration?login=%s;id=%s'
 
REGENERATION_EMAIL_SUBJECT = 'Brainslices password regeneration'

REGENERATION_EMAIL_TEMPLATE = '''Please click the link below to regenerate your account password
(%(login)s) in brainslices.org:
%(link)s'''


#registration scripts
def generateConfirmHash(login, salt):
  return hashlib.md5(login + str(salt)).hexdigest()

def sendConfirmationEmail(request, salt):
  name = request.name
  email = request.email
  login = request.login
  confirmId = generateConfirmHash(login, salt)
  return sendConfirmationEmailAux(name, email, login, confirmId)

def sendConfirmationEmailAux(name, email, login, confirmId):
  emailAdress = "%s<%s>" %(name, email)
  #now = datetime.now().strftime('%Y.%m.%d %H:%M:%S') #XXX: not used
  confirmationLink = CONFIRMATION_LINK_TEMPLATE % (BS_SERVICE_SERVER, login, confirmId)

  #prepare email
  templateDict = {'name': name, 
                  'login': login, 
                  'link': confirmationLink}

  content = REGISTRATION_EMAIL_TEMPLATE % templateDict
  customerMsg = MIMEText(content.encode(BS_EMAIL_ENCODING),
                         'plain',
                         BS_EMAIL_ENCODING)
  customerMsg['Subject'] = REGISTRATION_EMAIL_SUBJECT
  customerMsg['From'] = BS_EMAIL_ADDRESS
  customerMsg['To'] = emailAdress.encode(BS_EMAIL_ENCODING)
  customerMsg['Date'] = eutils.formatdate()
  
  smtp = smtplib.SMTP(BS_EMAIL_SERVER, BS_EMAIL_PORT)
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

def sendRegenerationEmail(request, salt):
  email = request.email
  login = request.login
  confirmId = generateConfirmHash(login, salt)
  return sendRegenerationEmailAux(email, login, confirmId)

def sendRegenerationEmailAux(email, login, confirmId):
  emailAdress = email
  regenerationLink = REGENERATION_LINK_TEMPLATE % (BS_SERVICE_SERVER, login, confirmId)

  #prepare email
  templateDict = {'login': login, 
                  'link': regenerationLink}

  content = REGENERATION_EMAIL_TEMPLATE % templateDict
  customerMsg = MIMEText(content.encode(BS_EMAIL_ENCODING),
                         'plain',
                         BS_EMAIL_ENCODING)
  customerMsg['Subject'] = REGENERATION_EMAIL_SUBJECT
  customerMsg['From'] = BS_EMAIL_ADDRESS
  customerMsg['To'] = emailAdress.encode(BS_EMAIL_ENCODING)
  customerMsg['Date'] = eutils.formatdate()
  
  smtp = smtplib.SMTP(BS_EMAIL_SERVER, BS_EMAIL_PORT)
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


