#!/usr/bin/python
# -*- coding: utf-8 -*-

import os
import cherrypy

directoryName = os.path.abspath(os.path.dirname(__file__))

# at Ubuntu 10.04 LTS requires higher version of python-twisted: 12.2.0 shall be ok
# sudo -E add-apt-repository ppa:twisted-dev/ppa
# sudo apt-get update
# sudo apt-get upgrade
# sudo apt-get install python-twisted

# @ 12.04 LTS python-twisted 11.1.0-1 is OK
# sudo apt-get install python-twisted

from twisted.protocols.ftp import FTPFactory, FTPRealm, FTP, FTPShell, IFTPShell, \
                                  IsADirectoryError, IsNotADirectoryError, \
                                  BadCmdSequenceError, FileNotFoundError, \
                                  InvalidPath, toSegments, errnoToFailure, \
                                  PermissionDeniedError, IsNotADirectoryError, \
                                  FTPCmdError, ASCIIConsumerWrapper, \
                                  FILE_NOT_FOUND, \
                                  TXFR_COMPLETE_OK, CNX_CLOSED_TXFR_ABORTED, \
                                  DATA_CNX_ALREADY_OPEN_START_XFR, \
                                  FILE_STATUS_OK_OPEN_DATA_CNX, _FileWriter
from twisted.cred.portal import Portal
#from twisted.cred.checkers import AllowAnonymousAccess, FilePasswordDB
from twisted.cred.checkers import ICredentialsChecker
from twisted.cred.credentials import IUsernamePassword
from twisted.internet import reactor, defer
from twisted.cred import error
from zope.interface import implements

from database import db
# possible redundancy!!! TODO: think about instance instead of class
from userBase import UserBase
from tileBase import TileBase # NON-USED ?
from threading import Thread

class CredentialsDB:
  implements(ICredentialsChecker)

  def __init__(self, ftpDirectory = None):
    self.userBase = UserBase(db)

    self.credentialInterfaces = (IUsernamePassword,)
    #self.ftpDirectory = ftpDirectory

  def requestAvatarId(self, c):
    up = IUsernamePassword(c)

    uid = self.userBase.getUserId(up.username, up.password)
    if uid == None:
      return defer.fail(error.UnauthorizedLogin())

    return defer.succeed(up.username.lower())


class ImageFTPShell(FTPShell):
  def openForAppending(self, path):
    """
    Open C{path} for appending.

    @param path: The path, as a list of segments, to open.
    @type path: C{list} of C{unicode}
    @return: A L{Deferred} is returned that will fire with an object
        implementing L{IWriteFile} if the file is successfully opened.  If
        C{path} is a directory, or if an exception is raised while trying
        to open the file, the L{Deferred} will fire with an error.
    """
    p = self._path(path)
    if p.isdir():
      # Normally, we would only check for EISDIR in open, but win32
      # returns EACCES in this case, so we check before
      return defer.fail(IsADirectoryError(path))

    try:
      fObj = p.open('a')

    except (IOError, OSError), e:
      return errnoToFailure(e.errno, path)

    except:
      return defer.fail()

    return defer.succeed(_FileWriter(fObj))


class ImageFTPRealm(FTPRealm):
  def requestAvatar(self, avatarId, mind, *interfaces):
    for iface in interfaces:
      if iface is IFTPShell:
        avatar = ImageFTPShell(self.getHomeDirectory(avatarId))
        return (IFTPShell, avatar,
                getattr(avatar, 'logout', lambda: None))

    raise NotImplementedError(
          "Only IFTPShell interface is supported by this realm")


class ImageFTP(FTP):
  def ftp_APPE(self, path):
    print "APPE", self.workingDirectory, path
    if self.dtpInstance is None:
      raise BadCmdSequenceError('PORT or PASV required before APPE')

    try:
      newsegs = toSegments(self.workingDirectory, path)

    except InvalidPath:
      return defer.fail(FileNotFoundError(path))
    
    # XXX For now, just disable the timeout.  Later we'll want to
    # leave it active and have the DTP connection reset it
    # periodically.
    self.setTimeout(None)
    
    # Put it back later
    def enableTimeout(result):
      self.setTimeout(self.factory.timeOut)
      return result
    
    def cbSent(result):
      return (TXFR_COMPLETE_OK,)
    
    def ebSent(err):
      log.msg("Unexpected error receiving file from client:")
      log.err(err)
      if err.check(FTPCmdError):
        return err

      return (CNX_CLOSED_TXFR_ABORTED,)
    
    def cbConsumer(cons):
      if not self.binary:
        cons = ASCIIConsumerWrapper(cons)
      
      d = self.dtpInstance.registerConsumer(cons)
      
      # Tell them what to doooo
      if self.dtpInstance.isConnected:
        self.reply(DATA_CNX_ALREADY_OPEN_START_XFR)

      else:
        self.reply(FILE_STATUS_OK_OPEN_DATA_CNX)
      
      return d
    
    def cbOpened(file):
      d = file.receive()
      d.addCallback(cbConsumer)
      d.addCallback(lambda ignored: file.close())
      d.addCallbacks(cbSent, ebSent)
      return d
    
    def ebOpened(err):
      if not err.check(PermissionDeniedError, FileNotFoundError, IsNotADirectoryError):
        log.msg("Unexpected error attempting to open file for upload:")
        log.err(err)

      if isinstance(err.value, FTPCmdError):
        return (err.value.errorCode, '/'.join(newsegs))

      return (FILE_NOT_FOUND, '/'.join(newsegs))
    
    d = self.shell.openForAppending(newsegs) # the only change...
    d.addCallbacks(cbOpened, ebOpened)
    d.addBoth(enableTimeout)
    
    # Pass back Deferred that fires when the transfer is done
    return d

# def ftp_STOR(self, path):
#   print "STOR", self.workingDirectory, path
#   d = FTP.ftp_STOR(self, path)
#   return d

  def ftp_STOR(self, path):
    print "STOR", self.workingDirectory, path
    if self.dtpInstance is None:
      raise BadCmdSequenceError('PORT or PASV required before STOR')

    try:
      newsegs = toSegments(self.workingDirectory, path)

    except InvalidPath:
      return defer.fail(FileNotFoundError(path))
    
    # XXX For now, just disable the timeout.  Later we'll want to
    # leave it active and have the DTP connection reset it
    # periodically.
    self.setTimeout(None)
    
    # Put it back later
    def enableTimeout(result):
      self.setTimeout(self.factory.timeOut)
      return result
    
    def cbSent(result):
      print "Received"
      return (TXFR_COMPLETE_OK,)
    
    def ebSent(err):
      print "Unexpected error receiving file from client:", err
      log.msg("Unexpected error receiving file from client:")
      log.err(err)
      if err.check(FTPCmdError):
        return err

      return (CNX_CLOSED_TXFR_ABORTED,)
    
    def cbConsumer(cons):
      if not self.binary:
        cons = ASCIIConsumerWrapper(cons)
      
      d = self.dtpInstance.registerConsumer(cons)
      
      # Tell them what to doooo
      if self.dtpInstance.isConnected:
        self.reply(DATA_CNX_ALREADY_OPEN_START_XFR)

      else:
        self.reply(FILE_STATUS_OK_OPEN_DATA_CNX)
      
      return d
    
    def cbOpened(file):
      print "opened"
      d = file.receive()
      d.addCallback(cbConsumer)
      d.addCallback(lambda ignored: file.close())
      d.addCallbacks(cbSent, ebSent)
      return d
    
    def ebOpened(err):
      print "not opened"
      if not err.check(PermissionDeniedError, FileNotFoundError, IsNotADirectoryError):
        log.msg("Unexpected error attempting to open file for upload:")
        log.err(err)

      if isinstance(err.value, FTPCmdError):
        return (err.value.errorCode, '/'.join(newsegs))

      return (FILE_NOT_FOUND, '/'.join(newsegs))
    
    d = self.shell.openForWriting(newsegs)
    d.addCallbacks(cbOpened, ebOpened)
    d.addBoth(enableTimeout)
    
    # Pass back Deferred that fires when the transfer is done
    return d

  def ftp_USER(self, username):
    print "USER", username
    return FTP.ftp_USER(self, username)

  def ftp_PASS(self, password):
    print "PASS", "********"
    return FTP.ftp_PASS(self, password)

  def ftp_PASV(self):
    print "PASV"
    return FTP.ftp_PASV(self)

  def ftp_PORT(self, address):
    print "PORT", address
    return FTP.ftp_PORT(self, address)

  def ftp_LIST(self, path=''):
    print "LIST", path
    return FTP.ftp_LIST(self, path)

  def ftp_NLST(self, path):
    print "NLST", path
    return FTP.ftp_NLST(self, path)

  def ftp_CWD(self, path):
    print "CWD", path
    return FTP.ftp_CWD(self, path)

  def ftp_CDUP(self):
    print "CDUP"
    return FTP.ftp_CDUP(self)

  def ftp_PWD(self):
    print "PWD"
    return FTP.ftp_PWD(self)

  def ftp_RETR(self, path):
    print "RETR", path
    return FTP.ftp_RETR(self, path)

  def ftp_SIZE(self, path):
    print "SIZE", path
    return FTP.ftp_SIZE(self, path)

  def ftp_MDTM(self, path):
    print "MDTM", path
    return FTP.ftp_MDTM(self, path)

  def ftp_TYPE(self, type):
    print "TYPE", type
    return FTP.ftp_TYPE(self, type)

  def ftp_SYST(self):
    print "SYST"
    return FTP.ftp_SYST(self)

  def ftp_STRU(self, structure):
    print "STRU", structure
    return FTP.ftp_STRU(self, structure)

  def ftp_MODE(self, mode):
    print "MODE", mode
    return FTP.ftp_MODE(self, mode)

  def ftp_MKD(self, path):
    print "MKD", path
    return FTP.ftp_MKD(self, path)

  def ftp_RMD(self, path):
    print "RMD", path
    return FTP.ftp_RMD(self, path)

  def ftp_DELE(self, path):
    print "DELE", path
    return FTP.ftp_DELE(self, path)

  def ftp_NOOP(self):
    print "NOOP"
    return FTP.ftp_NOOP(self)

  def ftp_RNFR(self, fromName):
    print "RNFR", fromName
    return FTP.ftp_RNFR(self, fromName)

  def ftp_RNTO(self, toName):
    print "RNTO", toName
    return FTP.ftp_RNTO(self, toName)

  def ftp_QUIT(self):
    print "QUIT"
    return FTP.ftp_QUIT(self)


class ImageFTPFactory(FTPFactory):
  protocol = ImageFTP


class ServerFTP(Thread):
  def __init__(self, ftpDir, host = 'localhost', port = 21, certfile = None):
    Thread.__init__(self)
    self.__ftpDir = ftpDir
    self.__address = (host, port)
    self.__certfile = certfile

  def run(self):
    print self.__ftpDir
    p = Portal(ImageFTPRealm(self.__ftpDir,
                             userHome = self.__ftpDir),
               [CredentialsDB()])
    f = ImageFTPFactory(p)
    reactor.listenTCP(self.__address[1], f, interface = self.__address[0])
    reactor.run()


if __name__ == '__main__':
  siteconf = os.path.join(directoryName, 'site.conf')
  cherrypy.config.update(siteconf)

  ftpServer = ServerFTP(os.path.join(directoryName, 'ftp'),
                         host = cherrypy.config['server.socket_host'],
                         port = 8081,
                         certfile = os.path.join(directoryName, 'keycert.pem'))
  #ftpServer.start()
  #print "press [ctrl][c] for web service d-_-b"
  ftpServer.run()
