/*****************************************************************************\
*                                                                             *
*    This file is part of Graphic Streaming Toolkit                           *
*    (a detached part of Brainslices Software).                               *
*                                                                             *
*    Copyright (C) 2012 Jakub M. Kowalski                                     *
*                                                                             *
*    Graphic Streaming Toolkit is a free software: you can redistribute it    *
*    and/or modify it under the terms of the GNU General Public License as    *
*    published by the Free Software Foundation, either version 3 of the       *
*    License, or (at your option) any later version.                          *
*                                                                             *
*    Graphic Streaming Toolkit is distributed in the hope that it will be     *
*    useful, but WITHOUT ANY WARRANTY; without even the implied warranty      *
*    of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.                  *
*    See the GNU General Public License for more details.                     *
*                                                                             *
*    You should have received a copy of the GNU General Public License        *
*    along with Graphic Streaming Toolkit.                                    *
*    If not, see http://www.gnu.org/licenses/.                                *
*                                                                             *
\*****************************************************************************/
#include <cstdarg>
#include <cstdio>

#include <boost/thread.hpp>
//libboost-thread-dev

#include "ThreadSafeIO.h"

int ThreadSafeIO::putc(int character)
{
  this->lock();
  int result = std::fputc(character, this->fh);
  this->unlock();
  return result;
}

int ThreadSafeIO::fputs(const char * str)
{
  this->lock();
  int result = std::fputs(str, this->fh);
  this->unlock();
  return result;
}

int ThreadSafeIO::puts(const char * str)
{
  this->lock();
  if (std::fputs(str, this->fh) == EOF)
  {
    this->unlock();
    return EOF;
  }
  int result = std::fputc('\n', this->fh);
  this->unlock();
  return result;
}

int ThreadSafeIO::printf(const char * fmt, ...)
{
  va_list args;
  va_start (args, fmt);
  this->lock();
  int result = std::vfprintf(this->fh, fmt, args);
  this->unlock();
  va_end (args);
  return result;
}

int ThreadSafeIO::ferror()
{
  this->lock();
  int result = std::ferror(this->fh);
  this->unlock();
  return result;
}

ThreadSafeIO tsErr(stderr); 
