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
#include <cmath>

#include <algorithm>
#include <vector>
#include <queue>
#include <string>
#include <functional>

#include <boost/thread.hpp>
//libboost-thread-dev
#include <boost/asio.hpp>
#include <boost/date_time/posix_time/posix_time.hpp>
//libboost-system-dev
#define round(x) ((long) floor(x + 0.5))

#ifndef STREAMEDIMAGEOUTPUTWINDOW_H
#define STREAMEDIMAGEOUTPUTWINDOW_H

template <class T> class StreamedImageOutputWindow
{
  private:
    FILE * fh;
    std::string channels;
    unsigned char * charRow;
    unsigned short * shortRow;
    T * * windowRows;
    T * * weightRows;
    unsigned int d;
    unsigned int maxval;
    unsigned long width;
    unsigned long height;
    unsigned long top;
    unsigned long bottom;
    bool linearRGB;
    bool privateBuffer;
    unsigned long rows;
    unsigned long latency;

    unsigned long threads;
    unsigned long threadId;
    boost::mutex mutex;
    boost::mutex bottomMutex;
    unsigned long * y;
    unsigned long minTop;
    unsigned long zeroingBottom;
    std::priority_queue<unsigned long,
                        std::vector<unsigned long>,
                        std::greater<unsigned long> > zeroedBottom;
    boost::asio::io_service io_service;
    bool normalized;

    unsigned int linear2output(T value)
    {
      if (value < 0 || value > 1)
      {
        //fprintf(stderr, "%f output value not in 0-1 range; fixing\n", value);
        value = value > 1 ? 1. : 0.;
      }
    
      if (!this->linearRGB)
      {
        value = value <= 0.0031308 ?
                value * 12.92 :
                1.055 * pow(value, 1/2.4) - 0.055;
        if (value < 0 || value > 1)
        {
          //fprintf(stderr, "%f corrected output value not in 0-1 range, fixing\n", value);
          value = value > 1 ? 1. : 0.;
        }
      }
    
      return round(value * this->maxval);
    }

    void writeLine(unsigned long n)
    {
      T * srcRow = this->windowRows[n % this->rows];
      T * wRow = this->normalized ? NULL : this->weightRows[n % this->rows];

      if (this->maxval > 255)
      {
        unsigned short * dstRow = this->shortRow;
        if (this->normalized)
        {
          for (unsigned long i = this->d * this->width; i > 0; i--)
          {
            *dstRow++ = this->linear2output(*srcRow++);
          }
        }
        else
        {
          for (unsigned long i = 0; i < this->width; i++)
          {
            T scaleFactor = *wRow != 0 ? 1. / *wRow : 1.;
            wRow++;
            for (unsigned long j = 0; j < this->d; j++)
            {
              *dstRow++ = this->linear2output(*srcRow++ * scaleFactor);
            }
          }
        }
      }
      else
      {
        unsigned char * dstRow = this->charRow;
        if (this->normalized)
        {
          for (unsigned long i = this->d * this->width; i > 0; i--)
          {
            *dstRow++ = this->linear2output(*srcRow++);
          }
        }
        else
        {
          for (unsigned long i = 0; i < this->width; i++)
          {
            T scaleFactor = *wRow != 0 ? 1. / *wRow : 1.;
            wRow++;
            for (unsigned long j = 0; j < this->d; j++)
            {
              *dstRow++ = this->linear2output(*srcRow++ * scaleFactor);
            }
          }
        }
      }

      fwrite(this->maxval > 255 ?
             (void *) this->shortRow :
             (void *) this->charRow,
             this->maxval > 255 ?
             sizeof(unsigned short) :
             sizeof(unsigned char),
             this->width * this->d,
             this->fh);
    }

    void fastForward(unsigned long n)
    {
      if (n > this->bottom)
      {
        unsigned long freeTo = std::min(this->height - 1, n + this->latency);
        while (freeTo >= this->bottom)
        {
          if (this->bottom == this->top + this->rows)
          {
            this->writeLine(this->top);
            //fprintf(stderr, "line %lu written\n", this->top);
            this->top++;
          }

          T * dstRow = this->windowRows[this->bottom % this->rows];
          for (long i = 0; i < this->width * this->d; i++)
          {
            *dstRow++ = 0.;
          }

          if (!this->normalized)
          {
            dstRow = this->weightRows[this->bottom % this->rows];
            for (long i = 0; i < this->width; i++)
            {
              *dstRow++ = 0.;
            }
          }

          this->bottom++;
        }
      }
    }

    void writeLine(unsigned long dummy, unsigned long thrId)
    {
      this->minTop = this->y[0];
      for (unsigned long i = 1; i < this->threads; i++)
      {
        if (this->y[i] < this->minTop)
        {
          this->minTop = this->y[i];
        }
      }

      if (this->top < this->minTop)
      {
        this->writeLine(this->top++);
        this->mutex.unlock();
        return;
      }

      this->mutex.unlock();
      boost::asio::deadline_timer t(this->io_service,
                                    boost::posix_time::millisec(10));
      t.wait();
    }


    void fastForward(unsigned long n, unsigned long thrId)
    {
      while (n > this->bottom)
      {
        this->writeLine(0, thrId);

        this->bottomMutex.lock();
        if (this->zeroingBottom < std::min(this->height, this->top + this->rows))
        {
          unsigned long zeroing = this->zeroingBottom++;
          this->bottomMutex.unlock();

          T * dstRow = this->windowRows[zeroing % this->rows];
          for (long i = 0; i < this->width * this->d; i++)
          {
            *dstRow++ = 0.;
          }

          if (!this->normalized)
          {
            dstRow = this->weightRows[zeroing % this->rows];
            for (long i = 0; i < this->width; i++)
            {
              *dstRow++ = 0.;
            }
          }

          this->bottomMutex.lock();
          if (zeroing == this->bottom)
          {
            this->bottom++;
          }
          else
          {
            this->zeroedBottom.push(zeroing);
          }

          while (!this->zeroedBottom.empty()
                 && this->zeroedBottom.top() == this->bottom)
          {
            this->bottom++;
            this->zeroedBottom.pop();
          }

          this->bottomMutex.unlock();
          return;
        }

        this->bottomMutex.unlock();
        boost::asio::deadline_timer t(this->io_service,
                                      boost::posix_time::millisec(10));
        t.wait();

        this->mutex.lock();
      }
      this->mutex.unlock();
    }

  public:
    static size_t bufferSize(unsigned long imageWidth,
                             unsigned long imageHeight,
                             double radius,
                             std::string channels = "RGB",
                             unsigned int maxv = 255,
                             bool linear = true,
                             unsigned long waitLines = 0,
                             bool normalized = false)
    {
      unsigned long d = channels.length();
      return std::min(1 + (unsigned long) ceil(2 * radius) + waitLines, imageHeight)
             * StreamedImageOutputWindow<T>::lineSize(imageWidth, d, normalized);
    }

    static size_t lineSize(unsigned long imageWidth,
                           unsigned long imageD,
                           bool normalized = false)
    {
      return (normalized ? 1 : 2) * sizeof(T *)
             + sizeof(T) * imageWidth * (imageD + (normalized ? 0 : 1));
    }

    StreamedImageOutputWindow(unsigned long imageWidth,
                              unsigned long imageHeight,
                              double radius,
                              FILE * ofh,
                              std::string channels = "RGB",
                              unsigned int maxv = 255,
                              bool linear = true,
                              void * buffer = NULL,
                              unsigned long waitLines = 0,
                              bool normalized = false)
    {
      this->normalized = normalized;
      this->channels = channels;
      this->latency = waitLines;
      this->fh = ofh;
      this->maxval = maxv;
      this->d = channels.length();
      this->width = imageWidth;
      this->height = imageHeight;
      this->linearRGB = linear;

      // prepare output buffer if necessary
      this->privateBuffer = buffer == NULL;
      this->threads = 0;
      this->threadId = 0;
      this->y = NULL;

      // prepare output buffer
      if (maxv > 255)
      {
        this->shortRow = this->privateBuffer ?
                         new unsigned short [imageWidth * this->d] :
                         (unsigned short *) buffer;
        this->charRow = NULL;
      }
      else
      {
        this->shortRow = NULL;
        this->charRow = this->privateBuffer ?
                        new unsigned char [imageWidth * this->d] :
                        (unsigned char *) buffer;
      }

      // prepare window buffer
      this->rows = std::min(1 + (unsigned long) ceil(2 * radius) + waitLines, imageHeight);
      this->windowRows = new T * [this->rows];
      this->weightRows = normalized ? NULL : new T * [this->rows];
      this->top = 0;
      this->bottom = 0;

      for (long i = 0; i < this->rows; i++)
      {
        this->windowRows[i] = new T [imageWidth * this->d];
        if (!normalized)
        {
          this->weightRows[i] = new T [imageWidth];
        }
      }
    }

    virtual ~StreamedImageOutputWindow()
    {
      if (this->y != NULL)
      {
        delete this->y;
      }

      this->fastForward(this->height);

      while (this->top < this->bottom)
      {
        this->writeLine(this->top++);
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

        if (!this->normalized)
        {
          if (this->weightRows[i] != NULL)
          {
            delete [] this->weightRows[i];
          }
        }
      }
      delete [] this->windowRows;

      if (!this->normalized)
      {
        delete [] this->weightRows;
      }
    }

    void startThreading(unsigned long n)
    {
      this->y = new unsigned long [n];
      while (this->threads < n)
      {
        this->y[this->threads++] = 0;
      }
      this->minTop = this->top;
      this->zeroingBottom = this->bottom;
    }

    unsigned long getThreadId()
    {
      this->mutex.lock();
      unsigned long res = this->threadId++;
      this->mutex.unlock();
      return res;
    }

    void setThreadTop(unsigned long threadTop, unsigned long thrId)
    {
      if (threadTop > this->y[thrId])
      {
        this->y[thrId] = threadTop;
      }
    }

    T * weights(unsigned long n, unsigned long thrId)
    {
      if (this->normalized || n < this->top || n >= this->height)
      {
        return NULL;
      }

      while (n >= this->bottom)
      {
        this->mutex.lock();
        this->fastForward(n + 1, thrId);
      }

      return this->weightRows[n % this->rows];
    }

    T * row(unsigned long n, unsigned long thrId)
    {
      if (n < this->top || n >= this->height)
      {
        return NULL;
      }

      while (n >= this->bottom)
      {
        this->mutex.lock();
        this->fastForward(n + 1, thrId);
      }

      return this->windowRows[n % this->rows];
    }

    T * tryRow(unsigned long n, unsigned long thrId)
    {
      if (n < this->top || n >= this->height)
      {
        return NULL;
      }

      while (n >= this->bottom)
      {
        if (!this->mutex.try_lock())
        {
          return NULL;
        }
        this->fastForward(n + 1, thrId);
      }

      return this->windowRows[n % this->rows];
    }

    T * weights(unsigned long n)
    {
      if (this->normalized || n < this->top || n >= this->height)
      {
        return NULL;
      }

      this->fastForward(n + 1);

      return this->weightRows[n % this->rows];
    }

    T * row(unsigned long n)
    {
      if (n < this->top || n >= this->height)
      {
        return NULL;
      }

      this->fastForward(n + 1);

      return this->windowRows[n % this->rows];
    }
};

#endif
