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

#include <algorithm>
#include <queue>

#include <boost/thread.hpp>
//libboost-thread-dev

#include "CacheableFilter.h"
#include "ThreadSafeIO.h"

#ifndef STREAMEDIMAGEPRESCALEDINPUTWINDOW_H
#define STREAMEDIMAGEPRESCALEDINPUTWINDOW_H

template <class T> class StreamedImagePrescaledInputWindow
{
  private:
    FILE * fh;
    unsigned char * charRow;
    unsigned short * shortRow;
    T * * windowRows;
    unsigned int d;
    unsigned int maxval;
    unsigned long width;
    unsigned long height;
    unsigned long top;
    unsigned long bottom;
    double * input2linear;
    bool linearRGB;
    bool privateBuffer;
    unsigned long rows;
    unsigned long span;

    unsigned long * y;
    unsigned long threads;
    unsigned long threadId;
    boost::mutex mutex;

    CacheableFilter<T> * filter;
    unsigned long cropWidth;
    unsigned long cropLeft;

    boost::mutex mutexBottom;
    unsigned long bufferingData;
    std::priority_queue<unsigned long,
                        std::vector<unsigned long>,
                        std::greater<unsigned long> > bufferedData;

    size_t missedElements;

    void readLine(unsigned long n)
    {
      size_t r = fread(this->maxval > 255 ?
                       (void *) this->shortRow :
                       (void *) this->charRow,
                       this->maxval > 255 ?
                       sizeof(unsigned short) :
                       sizeof(unsigned char),
                       this->width * this->d,
                       this->fh);

      if (r != this->width * this->d && n < this->height)
      {
        if (this->missedElements == 0)
        {
          tsErr.printf("ERROR: %ld elements read instead of %ld.\n"
                       "Further read error messages are hidden.\n",
                        r, this->width * this->d);
        }
        this->missedElements += this->width * this->d - r;
      }

      T srcRow[this->width * this->d];
      for (unsigned long i = 0; i < this->width * this->d; i++)
      {
        srcRow[i] = this->input2linear[this->maxval > 255 ? 
                                       this->shortRow[i] :
                                       this->charRow[i]];
      }

      T * dstRow = this->windowRows[n % this->rows];
      for (unsigned long i = this->cropWidth * this->d; i > 0; i--)
      {
        *dstRow++ = 0;
      }
      this->filter->processRow(srcRow, this->windowRows[n % this->rows],
                               this->d,
                               this->cropLeft, this->cropWidth);
    }

    template <class S> void readLine(unsigned long dummy, unsigned long thrId)
    {
      // this->mutex already locked
      S buffer[this->width * this->d];
      size_t r = fread(buffer, sizeof(S), this->width * this->d, this->fh);

      unsigned long n = this->bufferingData++;

      if (r != this->width * this->d && n < this->height)
      {
        /*if (this->missedElements == 0)
        {
          tsErr.printf("ERROR: %ld elements read instead of %ld.\n"
                       "Further read error messages are hidden.\n",
                       r, this->width * this->d);
        }*/
        this->missedElements += this->width * this->d - r;
      }

      this->mutex.unlock();

      T srcRow[this->width * this->d];
      for (unsigned long i = 0; i < this->width * this->d; i++)
      {
        srcRow[i] = this->input2linear[buffer[i]];
      }

      T * dstRow = this->windowRows[n % this->rows];
      for (unsigned long i = this->cropWidth * this->d; i > 0; i--)
      {
        *dstRow++ = 0;
      }
      this->filter->processRow(srcRow, this->windowRows[n % this->rows],
                               this->d,
                               this->cropLeft, this->cropWidth);

      this->mutexBottom.lock();
      if (n == this->bottom)
      {
        this->bottom++;
      }
      else
      {
        this->bufferedData.push(n);
      }

      while (!this->bufferedData.empty()
             && this->bufferedData.top() == this->bottom)
      {
        this->bottom++;
        this->bufferedData.pop();
      }

      this->mutexBottom.unlock();
    }

    void updateTop()
    {
      unsigned long minTop = this->y[0];
      for (unsigned long i = 1; i < this->threads; i++)
      {
        if (this->y[i] < minTop)
        {
          minTop = this->y[i];
        }
      }

      if (this->top < minTop)
      {
        this->top = minTop;
      }
    }

  public:
    //TODO
    static size_t bufferSize(unsigned long imageWidth,
                             unsigned long imageHeight,
                             //double scaleY,
                             double radius,
                             FILE * ifh,
                             CacheableFilter<T> * filter,
                             unsigned long cropLeft,
                             unsigned long cropWidth,
                             unsigned int imageD = 3,
                             unsigned int maxv = 255,
                             bool linear = true,
                             void * buffer = NULL,
                             unsigned long preloadLines = 0)
    {
      return std::min((unsigned long) ceil(1 + 2 * radius + preloadLines), imageHeight)
             * StreamedImagePrescaledInputWindow<T>::lineSize(cropWidth,
                                                              imageD);
    }

    static size_t lineSize(unsigned long cropWidth, unsigned long imageD)
    {
      return sizeof(T *) + sizeof(T) * cropWidth * imageD;
    }

    StreamedImagePrescaledInputWindow(unsigned long imageWidth,
                                      unsigned long imageHeight,
                                      //double scaleY,
                                      double radius,
                                      FILE * ifh,
                                      CacheableFilter<T> * filter,
                                      unsigned long cropLeft,
                                      unsigned long cropWidth,
                                      unsigned int imageD = 3,
                                      unsigned int maxv = 255,
                                      bool linear = true,
                                      void * buffer = NULL,
                                      unsigned long preloadLines = 0)
    {
      this->fh = ifh;
      this->maxval = maxv;
      this->d = imageD;
      this->width = imageWidth;
      this->height = imageHeight;
      this->linearRGB = linear;
      this->cropLeft = cropLeft;
      this->cropWidth = cropWidth;
      this->filter = filter;

      this->missedElements = 0;

      // cache input mapping values
      this->input2linear = new double[maxv + 1];
      double colourspaceScale = 1. / maxv;
      if (linear)
      {
        for (long i = 0; i <= maxv; i++)
        {
          this->input2linear[i] = i * colourspaceScale;
        }
      }
      else
      {
        float linearScaleFactor = colourspaceScale / 12.92;
        long i = 0;
        while (i <= 0.04045 * maxv)
        {
          this->input2linear[i] = i * linearScaleFactor;
          i++;
        }
        while (i <= maxv)
        {
          this->input2linear[i] = pow((0.055 + i * colourspaceScale)/ 1.055, 2.4);
          i++;
        }
      }

      // prepare input buffer
      this->privateBuffer = buffer == NULL;
      if (maxv > 255)
      {
        this->shortRow = this->privateBuffer ?
                         new unsigned short [imageWidth * imageD] :
                         (unsigned short *) buffer;
        this->charRow = NULL;
      }
      else
      {
        this->shortRow = NULL;
        this->charRow = this->privateBuffer ?
                        new unsigned char [imageWidth * imageD] :
                        (unsigned char *) buffer;
      }

      // prepare window buffer
      this->span = std::min((unsigned long) ceil(1 + 2 * radius), imageHeight);
      this->rows = std::min(this->span + preloadLines, imageHeight);
      this->windowRows = new T * [this->rows];
      this->top = 0;
      this->bottom = 0;
      this->bufferingData = 0;

      this->threads = 0;
      this->threadId = 0;
      this->y = NULL;

      for (long i = 0; i < this->rows; i++)
      {
        this->windowRows[i] = new T [cropWidth * imageD];
        // this->readLine(i);
      }
    }

    virtual ~StreamedImagePrescaledInputWindow()
    {
      if (this->missedElements != 0)
      {
        tsErr.printf("ERROR: %ld elements missed.\n", this->missedElements);
      }

      if (this->privateBuffer)
      {
        if (this->charRow != NULL)
        {
          delete [] this->charRow;
        }
        if (this->shortRow != NULL)
        {
          delete [] this->shortRow;
        }
      }
  
      for (long i = 0; i < this->rows; i++)
      {
        if (this->windowRows[i] != NULL)
        {
          delete [] this->windowRows[i];
        }
      }
      delete [] this->windowRows;
    }

    const T * row(unsigned long n)
    {
      if (n < this->top || n >= this->height)
      {
        return NULL;
      }

      while (n >= this->bottom)
      {
        if (this->bottom == this->top + this->rows)
        {
          this->top++;
          this->preloadLine();
        }
      }
      return this->windowRows[n % this->rows];
    }

    const T * row(unsigned long n, unsigned long thrId)
    {
      if (n < this->top || n >= this->height)
      {
        tsErr.printf("%lu <= %lu < %lu\n", this->top, n, this->height);
        // SHALL NEVER HAPPEN
        return NULL;
      }

      while (n >= this->bottom)
      {
        this->mutex.lock();
        if (n < this->bottom)
        {
          this->mutex.unlock();
          break;
        }

        this->updateTop();

        if (this->bufferingData < this->top + this->rows)
        {
          if (this->maxval > 255)
          {
            this->readLine<unsigned short>(0, thrId);
          }
          else
          {
            this->readLine<unsigned char>(0, thrId);
          }
        }
        else
        {
          this->mutex.unlock();
        }
      }
      return this->windowRows[n % this->rows];
    }

    const T * tryRow(unsigned long n, unsigned long thrId)
    {
      if (n < this->top || n >= this->height)
      {
        tsErr.printf("%lu <= %lu < %lu\n", this->top, n, this->height);
        // SHALL NEVER HAPPEN
        return NULL;
      }

      while (n >= this->bottom)
      {
        if (!this->mutex.try_lock())
        {
          return NULL;
        }

        if (n < this->bottom)
        {
          this->mutex.unlock();
          break;
        }

        this->updateTop();

        if (this->bufferingData < this->top + this->rows)
        {
          if (this->maxval > 255)
          {
            this->readLine<unsigned short>(0, thrId);
          }
          else
          {
            this->readLine<unsigned char>(0, thrId);
          }
        }
        else
        {
          this->mutex.unlock();
        }
      }
      return this->windowRows[n % this->rows];
    }

    void startThreading(unsigned long n)
    {
      this->y = new unsigned long [n];
      while (this->threads < n)
      {
        this->y[this->threads++] = 0;
      }
    }

    unsigned long getThreadId()
    {
      this->mutex.lock();
      unsigned long res = this->threadId++;
      this->mutex.unlock();
      return res;
    }

    void preloadLine()
    {
      if (this->top + this->rows > this->bottom)
      {
        this->readLine(this->bottom++);
      }
    }

    void setThreadTop(unsigned long threadTop, unsigned long thrId)
    {
      if (threadTop > this->y[thrId])
      {
        this->y[thrId] = threadTop;
      }
    }

    void preloadLine(unsigned long thrId)
    {
      if (this->mutex.try_lock())
      {
        // to avoid unnecessary waiting
        this->updateTop();
        if (this->top + this->rows > this->bufferingData)
        {
          // preload possible
          if (this->maxval > 255)
          {
            this->readLine<unsigned short>(0, thrId);
          }
          else
          {
            this->readLine<unsigned char>(0, thrId);
          }
        }
        else
        {
          this->mutex.unlock();
        }
      }
    }
};

#endif

