#!/usr/bin/python
# -*- coding: utf-8 -*-
###############################################################################
#                                                                             #
#    BrainSlices Software                                                     #
#                                                                             #
#    Copyright (C) 2016 Jakub M. Kowalski                                     #
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


class SmtpManagerBase(object):
  SMTPRecipientsRefused = smtplib.SMTPRecipientsRefused

  def __init__(self, server, port, login, password, ehlo=None):
    self._server = server
    self._port = port
    self._login = login
    self._password = password
    self._ehlo = ehlo

  def __exit__(self, exception_type, exception_value, traceback):
    self._connection.quit()

  def __enter__(self):
    self._loginToServer()
    return self._connection

  def _sendEhloIfGiven(self):
    if self._ehlo is not None:
      self._connection.ehlo(self._ehlo)


class SmtpSslManager(SmtpManagerBase):
  def _loginToServer(self):
    self._connection = smtplib.SMTP_SSL(self._server,
                                        self._port)
    self._sendEhloIfGiven()
    self._connection.login(self._login, self._password)


class SmtpStarttlsManager(SmtpManagerBase):
  def _loginToServer(self):
    self._connection = smtplib.SMTP(self._server,
                                    self._port)
    self._sendEhloIfGiven()
    self._connection.starttls()
    self._connection.login(self._login, self._password)


class SmtpManager(SmtpManagerBase):
  def _loginToServer(self):
    self._connection = smtplib.SMTP(self._server,
                                    self._port)
    self._sendEhloIfGiven()
    self._connection.login(self._login, self._password)


MANAGERS_BY_SECURITY = {
  'none': SmtpManager,
  'starttls': SmtpStarttlsManager,
  'ssl': SmtpSslManager,
}