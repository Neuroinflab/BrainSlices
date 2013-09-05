/*****************************************************************************\
*                                                                             *
*    This file is part of Graphic Streaming Toolkit                           *
*    (a detached part of BrainSlices Software).                               *
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
#include <cstring>
#include <climits>

#include <algorithm>
#include <vector>
#include <queue>
#include <string>
#include <functional>

#include <Magick++.h>
//libmagick++-dev required

#include <boost/thread.hpp>
//libboost-thread-dev
#include <boost/asio.hpp>
#include <boost/date_time/posix_time/posix_time.hpp>
//libboost-system-dev

#include "ThreadSafeIO.h"

#define round(x) ((long) floor(x + 0.5))

#ifndef TILEDIMAGEOUTPUTWINDOW_H
#define TILEDIMAGEOUTPUTWINDOW_H

template <class T> class TiledImageOutputWindow
{
  private:
    std::string filenamePattern;
    std::string channels;
    unsigned long tileWidth;
    unsigned long tileHeight;
    unsigned long xFullTiles;
    unsigned long yFullTiles;
    unsigned long lastTileWidth;
    unsigned long lastTileHeight;
    unsigned char * * charData;
    unsigned short * * shortData;
    T * * windowRows;
    T * * weightRows;
    unsigned int d;
    unsigned int maxval;
    unsigned long width;
    unsigned long height;
    unsigned long top;
    unsigned long bottom;
    bool linearRGB;
    unsigned long rows;
    unsigned long latency;
    char quality;
    std::string magick;

    unsigned long threads;
    unsigned long threadId;
    boost::mutex mutex;
    boost::mutex bottomMutex;
    unsigned long * y;
    unsigned long tilesToSave;
    unsigned long tilesSaved;
    unsigned long minTop;
    unsigned long bufferingData;
    std::priority_queue<unsigned long,
                        std::vector<unsigned long>,
                        std::greater<unsigned long> > bufferedData;
    unsigned long zeroingBottom;
    std::priority_queue<unsigned long,
                        std::vector<unsigned long>,
                        std::greater<unsigned long> > zeroedBottom;
    boost::asio::io_service io_service;
    bool normalized;

    static std::string replaceMarker(std::string pattern,
                                     std::string marker,
                                     std::string str,
                                     bool force = false)
    {
      size_t location = pattern.find(marker);
      size_t ptr = pattern.find("%%");
      while (location != std::string::npos)
      {
        if (!force)
        {
          while (ptr != std::string::npos && ptr + 1 < location)
          {
            ptr = pattern.find("%%", ptr + 2);
          }
        }

        if (location == 0 || ptr == std::string::npos || ptr + 1 > location || force)
        {
          pattern.replace(location, marker.length(), str);
          location += str.length();
          ptr = pattern.find("%%", location);
        }
        else
        {
          location++;
        }
        location = pattern.find(marker, location);

      }
      return pattern;
    }

    static std::string replaceNatural(std::string pattern,
                                      std::string marker,
                                      unsigned long n)
    {
      char numberString[2 + (long) log10(ULONG_MAX)];
      sprintf(numberString, "%lu", n);
      return TiledImageOutputWindow<T>::replaceMarker(pattern,
                                                      "%" + marker,
                                                      numberString);
    }

    unsigned int linear2output(T value)
    {
      if (value < 0 || value > 1)
      {
        //tsErr.printf("%f output value not in 0-1 range; fixing\n", value);
        value = value > 1 ? 1. : 0.;
      }
    
      if (!this->linearRGB)
      {
        value = value <= 0.0031308 ?
                value * 12.92 :
                1.055 * pow(value, 1/2.4) - 0.055;
        if (value < 0 || value > 1)
        {
          //tsErr.printf("%f corrected output value not in 0-1 range, fixing\n", value);
          value = value > 1 ? 1. : 0.;
        }
      }
    
      return round(value * this->maxval);
    }

    void writeLine(unsigned long n)
    {
      T * srcRow = this->windowRows[n % this->rows];
      T * wRow = this->normalized ? NULL : this->weightRows[n % this->rows];
      unsigned long scanLine = n % this->tileHeight;
      unsigned long dstOffset = scanLine * this->tileWidth * this->d;

      if (this->maxval > 255)
      {
        unsigned short * dstRow;
        for (unsigned long i = 0; i < this->xFullTiles; i++)
        {
          dstRow = & this->shortData[i][dstOffset];
          if (this->normalized)
          {
            for (unsigned long j = this->d * this->tileWidth; j > 0; j--)
            {
              *dstRow++ = this->linear2output(*srcRow++);
            }
          }
          else
          {
            for (unsigned long j = 0; j < this->tileWidth; j++)
            {
              T scaleFactor = *wRow != 0 ? 1. / *wRow : 1.;
              wRow++;
              for (unsigned long k = 0; k < this->d; k++)
              {
                *dstRow++ = this->linear2output(*srcRow++ * scaleFactor);
              }
            }
          }
        }
  
        dstOffset = scanLine * this->lastTileWidth * this->d;
        dstRow = & this->shortData[this->xFullTiles][dstOffset];
        if (this->normalized)
        {
          for (unsigned long j = this->d * this->lastTileWidth; j > 0; j--)
          {
            *dstRow++ = this->linear2output(*srcRow++);
          }
        }
        else
        {
          for (unsigned long j = 0; j < this->lastTileWidth; j++)
          {
            T scaleFactor = *wRow != 0 ? 1. / *wRow : 1.;
            wRow++;
            for (unsigned long k = 0; k < this->d; k++)
            {
              *dstRow++ = this->linear2output(*srcRow++ * scaleFactor);
            }
          }
        }
      }
      else
      {
        unsigned char * dstRow;
        for (unsigned long i = 0; i < this->xFullTiles; i++)
        {
          dstRow = & this->charData[i][dstOffset];
          if (this->normalized)
          {
            for (unsigned long j = this->d * this->tileWidth; j > 0; j--)
            {
              *dstRow++ = this->linear2output(*srcRow++);
            }
          }
          else
          {
            for (unsigned long j = 0; j < this->tileWidth; j++)
            {
              T scaleFactor = *wRow != 0 ? 1. / *wRow : 1.;
              wRow++;
              for (unsigned long k = 0; k < this->d; k++)
              {
                *dstRow++ = this->linear2output(*srcRow++ * scaleFactor);
              }
            }
          }
        }
  
        dstOffset = scanLine * this->lastTileWidth * this->d;
        dstRow = & this->charData[this->xFullTiles][dstOffset];
        if (this->normalized)
        {
          for (unsigned long j = this->d * this->lastTileWidth; j > 0; j--)
          {
            *dstRow++ = this->linear2output(*srcRow++);
          }
        }
        else
        {
          for (unsigned long j = 0; j < this->lastTileWidth; j++)
          {
            T scaleFactor = *wRow != 0 ? 1. / *wRow : 1.;
            wRow++;
            for (unsigned long k = 0; k < this->d; k++)
            {
              *dstRow++ = this->linear2output(*srcRow++ * scaleFactor);
            }
          }
        }
      }

      if (scanLine + 1 == this->tileHeight || n + 1 == this->height)
      {
        unsigned long yTileRow = n / this->tileHeight;
        unsigned long tileNumber = yTileRow * (this->xFullTiles + 1);
        std::string preFilename = this->replaceNatural(this->filenamePattern,
                                                       "Y", yTileRow);
        std::string filename;
        for (unsigned long i = 0; i < this->xFullTiles; i++)
        {
          filename = this->replaceMarker(
                       this->replaceNatural(
                         this->replaceNatural(
                           preFilename, 
                           "X",
                           i),
                         "N",
                         tileNumber++),
                       "%%",
                       "%",
                       true);
          Magick::Image image(this->tileWidth,
                              n + 1 == this->height ?
                              this->lastTileHeight :
                              this->tileHeight,
                              this->channels,
                              this->maxval > 255 ?
                              Magick::ShortPixel :
                              Magick::CharPixel,
                              this->maxval > 255 ?
                              (void *) this->shortData[i] :
                              (void *) this->charData[i]);
          if (this->quality >= 0)
          {
            image.quality(this->quality);
          }

          if (!this->magick.empty())
          {
            //image.magick(this->magick);
            Magick::Blob encoded;
            image.write(&encoded, this->magick, this->maxval > 255 ? 16 : 8);
            const void * ptr = encoded.data();
            size_t todo = encoded.length();
            FILE * fh = fopen(filename.c_str(), "wb");
            if (fh != NULL)
            {
              if (todo != fwrite(ptr, 1, todo, fh))
              {
                tsErr.printf("ERROR: Write to %s failed.\n",
                             filename.c_str());
              }
              fclose(fh);
            }
          }
          else
          {
            image.write(filename);
          }
        }
        filename = this->replaceMarker(
                     this->replaceNatural(
                       this->replaceNatural(preFilename,
                                            "X",
                                            this->xFullTiles),
                       "N",
                       tileNumber),
                     "%%",
                     "%",
                     true);
        Magick::Image image(this->lastTileWidth,
                            n + 1 == this->height ?
                            this->lastTileHeight :
                            this->tileHeight,
                            this->channels,
                            this->maxval > 255 ?
                            Magick::ShortPixel :
                            Magick::CharPixel,
                            this->maxval > 255 ?
                            (void *) this->shortData[this->xFullTiles] :
                            (void *) this->charData[this->xFullTiles]);
        if (this->quality >= 0)
        {
          image.quality(this->quality);
        }

        if (!this->magick.empty())
        {
          //image.magick(this->magick);
          Magick::Blob encoded;
          image.write(&encoded, this->magick, this->maxval > 255 ? 16 : 8);
          const void * ptr = encoded.data();
          size_t todo = encoded.length();
          FILE * fh = fopen(filename.c_str(), "wb");
          if (fh != NULL)
          {
            if (todo != fwrite(ptr, 1, todo, fh))
            {
              tsErr.printf("ERROR: Write to %s failed.\n",
                           filename.c_str());
            }
            fclose(fh);
          }
        }
        else
        {
          image.write(filename);
        }
      }
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

      if (this->tilesToSave == 0)
      {
        // NIE TRZEBA ZAPISYWAC OBRAZKOW
        if (this->tilesSaved < this->xFullTiles + 1)
        {
          this->mutex.unlock();
          // ALE OBRAZKI  JUŻ SIĘ ROBIA i w niczym nie możemy pomóc
          boost::asio::deadline_timer t(this->io_service,
                                        boost::posix_time::millisec(10));
          t.wait();
          return;
        }

        this->minTop = this->y[0];
        for (unsigned long i = 1; i < this->threads; i++)
        {
          if (this->y[i] < this->minTop)
          {
            this->minTop = this->y[i];
          }
        }

        // MOŻNA SPRÓBOWAĆ LINIĘ ZBUFOROWAĆ
        if (this->bufferingData < this->minTop
            && (this->bufferingData == this->top
                || this->bufferingData % this->tileHeight != 0
                   && this->bufferingData < this->height))
        {
          // BUFORUJEMY LINIĘ
          unsigned long n = this->bufferingData++;
          this->mutex.unlock();

          T * srcRow = this->windowRows[n % this->rows];
          T * wRow = this->normalized ?
                     NULL :
                     this->weightRows[n % this->rows];
          unsigned long scanLine = n % this->tileHeight;
          unsigned long dstOffset = scanLine * this->tileWidth * this->d;

          if (this->maxval > 255)
          {
            unsigned short * dstRow;
            for (unsigned long i = 0; i < this->xFullTiles; i++)
            {
              dstRow = & this->shortData[i][dstOffset];
              if (this->normalized)
              {
                for (unsigned long j = this->d * this->tileWidth; j > 0; j--)
                {
                  *dstRow++ = this->linear2output(*srcRow++);
                }
              }
              else
              {
                for (unsigned long j = 0; j < this->tileWidth; j++)
                {
                  T scaleFactor = *wRow != 0 ? 1. / *wRow : 1.;
                  wRow++;
                  for (unsigned long k = 0; k < this->d; k++)
                  {
                    *dstRow++ = this->linear2output(*srcRow++ * scaleFactor);
                  }
                }
              }
            }
  
            dstOffset = scanLine * this->lastTileWidth * this->d;
            dstRow = & this->shortData[this->xFullTiles][dstOffset];
            if (this->normalized)
            {
              for (unsigned long j = this->d * this->lastTileWidth; j > 0; j--)
              {
                *dstRow++ = this->linear2output(*srcRow++);
              }
            }
            else
            {
              for (unsigned long j = 0; j < this->lastTileWidth; j++)
              {
                T scaleFactor = *wRow != 0 ? 1. / *wRow : 1.;
                wRow++;
                for (unsigned long k = 0; k < this->d; k++)
                {
                  *dstRow++ = this->linear2output(*srcRow++ * scaleFactor);
                }
              }
            }
          }
          else
          {
            unsigned char * dstRow;
            for (unsigned long i = 0; i < this->xFullTiles; i++)
            {
              dstRow = & this->charData[i][dstOffset];
              if (this->normalized)
              {
                for (unsigned long j = this->d * this->tileWidth; j > 0; j--)
                {
                  *dstRow++ = this->linear2output(*srcRow++);
                }
              }
              else
              {
                for (unsigned long j = 0; j < this->tileWidth; j++)
                {
                  T scaleFactor = *wRow != 0 ? 1. / *wRow : 1.;
                  wRow++;
                  for (unsigned long k = 0; k < this->d; k++)
                  {
                    *dstRow++ = this->linear2output(*srcRow++ * scaleFactor);
                  }
                }
              }
            }
  
            dstOffset = scanLine * this->lastTileWidth * this->d;
            dstRow = & this->charData[this->xFullTiles][dstOffset];
            if (this->normalized)
            {
              for (unsigned long j = this->d * this->lastTileWidth; j > 0; j--)
              {
                *dstRow++ = this->linear2output(*srcRow++);
              }
            }
            else
            {
              for (unsigned long j = 0; j < this->lastTileWidth; j++)
              {
                T scaleFactor = *wRow != 0 ? 1. / *wRow : 1.;
                wRow++;
                for (unsigned long k = 0; k < this->d; k++)
                {
                  *dstRow++ = this->linear2output(*srcRow++ * scaleFactor);
                }
              }
            }
          }

          this->mutex.lock();
          if (n == this->top)
          {
            this->top++;
          }
          else
          {
            this->bufferedData.push(n);
          }

          while (!this->bufferedData.empty()
                 && this->bufferedData.top() == this->top)
          {
            this->top++;
            this->bufferedData.pop();
          }

          if (this->bufferedData.empty()
              && (this->top % this->tileHeight == 0
                  || this->top == this->height))
          {
            this->tilesToSave = this->xFullTiles + 1;
            this->tilesSaved = 0;
          }
          this->mutex.unlock();
          return;
        }

        this->mutex.unlock();
        boost::asio::deadline_timer t(this->io_service,
                                      boost::posix_time::millisec(10));
        t.wait();
        return;
      } // this->tilesToSave != 0
      this->saveTile(thrId);
    }

    void saveTile(unsigned long thrId)
    {
      unsigned long n = this->bufferingData - 1;
      unsigned long yTileRow = n / this->tileHeight;
  
      this->tilesToSave--;
      unsigned long i = this->tilesToSave;
      this->mutex.unlock();

      unsigned long tileNumber = yTileRow * (this->xFullTiles + 1) + i;
      std::string filename = this->replaceMarker(
                              this->replaceNatural(
                               this->replaceNatural(
                                this->replaceNatural(this->filenamePattern,
                                                     "Y",
                                                     yTileRow),
                                "X",
                                i),
                               "N",
                               tileNumber),
                              "%%",
                              "%",
                              true);
      Magick::Image image(i == this->xFullTiles?
                          this->lastTileWidth :
                          this->tileWidth,
                          n + 1 == this->height ?
                          this->lastTileHeight :
                          this->tileHeight,
                          this->channels,
                          this->maxval > 255 ?
                          Magick::ShortPixel :
                          Magick::CharPixel,
                          this->maxval > 255 ?
                          (void *) this->shortData[i] :
                          (void *) this->charData[i]);
      this->mutex.lock();
      this->tilesSaved++;
      this->mutex.unlock();

      if (this->quality >= 0)
      {
        image.quality(this->quality);
      }

      if (!this->magick.empty())
      {
        //image.magick(this->magick);
        Magick::Blob encoded;
        image.write(&encoded, this->magick, this->maxval > 255 ? 16 : 8);
        const void * ptr = encoded.data();
        this->mutex.lock();

        size_t todo = encoded.length();
        FILE * fh = fopen(filename.c_str(), "wb");
        if (fh != NULL)
        {
          if (todo != fwrite(ptr, 1, todo, fh))
          {
            tsErr.printf("ERROR: Write to %s failed.\n",
                         filename.c_str());
          }
          fclose(fh);
        }
      }
      else
      {
        image.write(filename);
      }
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
                             unsigned long tileWidth,
                             unsigned long tileHeight,
                             double radius,
                             std::string filenamePattern,
                             std::string channels = "RGB",
                             unsigned int maxv = 255,
                             bool linear = true,
                             std::string magick = "",
                             char quality = -1,
                             unsigned long waitLines = 0,
                             bool normalized = false)
    {
      unsigned long tH = std::min(tileHeight, imageHeight);
      unsigned long tW = std::min(tileWidth, imageWidth);
      unsigned long d = channels.length();
      unsigned long xTiles = (imageWidth + tW - 1) / tW;
      size_t ptr = maxv > 255 ?
                   sizeof(unsigned short *) :
                   sizeof(unsigned char *);
      size_t word = maxv > 255 ?
                    sizeof(unsigned short) :
                    sizeof(unsigned char);
      return xTiles * ptr + 
             tH * d * imageWidth * word +
             std::min(1 + (unsigned long) ceil(2 * radius) + waitLines, imageHeight) *
             TiledImageOutputWindow<T>::lineSize(imageWidth, d, normalized);
    }

    static size_t lineSize(unsigned long imageWidth,
                           unsigned long imageD,
                           bool normalized = false)
    {
      return (normalized ? 1 : 2) * sizeof(T *)
             + sizeof(T) * imageWidth * (imageD + (normalized ? 0 : 1));
    }

    TiledImageOutputWindow(unsigned long imageWidth,
                           unsigned long imageHeight,
                           unsigned long tileWidth,
                           unsigned long tileHeight,
                           double radius,
                           std::string filenamePattern,
                           std::string channels = "RGB",
                           unsigned int maxv = 255,
                           bool linear = true,
                           std::string magick = "",
                           char quality = -1,
                           unsigned long waitLines = 0,
                           bool normalized = false)
    {
      this->normalized = normalized;
      this->channels = channels;
      this->latency = waitLines;
      this->maxval = maxv;
      this->d = channels.length();
      this->width = imageWidth;
      this->height = imageHeight;
      this->linearRGB = linear;

      this->quality = quality;
      this->tileWidth = std::min(tileWidth, imageWidth);
      this->tileHeight = std::min(tileHeight, imageHeight);
      this->xFullTiles = (imageWidth - 1) / this->tileWidth;
      this->yFullTiles = (imageHeight - 1) / this->tileHeight;
      this->lastTileWidth = imageWidth - this->tileWidth * this->xFullTiles;
      this->lastTileHeight = imageHeight - this->tileHeight * this->yFullTiles;
      this->filenamePattern = filenamePattern;
      this->quality = quality;
      this->magick = magick;

      this->threads = 0;
      this->threadId = 0;
      this->y = NULL;

      // prepare output buffers
      if (maxv > 255)
      {
        this->shortData = new unsigned short * [this->xFullTiles + 1];
        for (unsigned long i = 0; i < this->xFullTiles; i++)
        {
          this->shortData[i] = new unsigned short [this->tileWidth *
                                                   this->tileHeight * this->d];
        }
        this->shortData[this->xFullTiles] = new unsigned short [this->lastTileWidth *
                                                                this->tileHeight *
                                                                this->d];
        this->charData = NULL;
      }
      else
      {
        this->shortData = NULL;
        this->charData = new unsigned char * [this->xFullTiles + 1];
        for (unsigned long i = 0; i < this->xFullTiles; i++)
        {
          this->charData[i] = new unsigned char [this->tileWidth *
                                                 this->tileHeight * this->d];
        }
        this->charData[this->xFullTiles] = new unsigned char [this->lastTileWidth *
                                                              this->tileHeight *
                                                              this->d];
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

    virtual void finishTileLine(unsigned long thrId)
    {
      this->mutex.lock();
      while (this->tilesToSave != 0)
      {
        this->saveTile(thrId);
        this->mutex.lock();
      }
      this->mutex.unlock();
    }

    virtual ~TiledImageOutputWindow()
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

      if (this->charData != NULL)
      {
        for (unsigned long i = 0; i <= this->xFullTiles; i++)
        {
          delete [] this->charData[i];
        }
        delete [] this->charData;
      }

      if (this->shortData != NULL)
      {
        for (unsigned long i = 0; i <= this->xFullTiles; i++)
        {
          delete [] this->shortData[i];
        }
        delete [] this->shortData;
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
      this->bufferingData = this->top;
      this->zeroingBottom = this->bottom;
      this->tilesToSave = 0;
      this->tilesSaved = this->xFullTiles + 1;
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
