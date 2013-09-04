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
#include <cstdio>

#include <string>

#include <boost/thread.hpp>
//libboost-thread-dev

#ifndef THREADSAFEIO_H
#define THREADSAFEIO_H

class ThreadSafeIO
{
  private:
    FILE * fh;
    boost::mutex mutex;

  public:
    ThreadSafeIO(FILE * fh)
    {
      this->fh = fh;
    }

    void lock()
    {
      this->mutex.lock();
    }

    void unlock()
    {
      this->mutex.unlock();
    }

    bool try_lock()
    {
      return this->mutex.try_lock();
    }

    int putc(int);
    int fputs(const char *);
    int puts(const char *);
    int printf(const char *, ...);
    int ferror();

    int fputs(const std::string str)
    {
      return this->fputs(str.c_str());
    }

    int puts(const std::string str)
    {
      return this->puts(str.c_str());
    }
};

extern ThreadSafeIO tsErr;

#endif
