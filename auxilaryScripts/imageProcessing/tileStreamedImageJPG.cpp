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
#include <cstdlib>
#include <cmath>
#include <cctype>
#include <cstring>

#include <algorithm>
#include <utility>
#include <functional>
#include <set>

#include "LanczosFilter.h"
#include "BoxFilter.h"
#include "SumFilter.h"
#include "TriangleFilter.h"
#include "StreamedImagePrescaledInputWindow.h"
#include "TiledImageOutputWindowJPG.h"
#include "TileCommandlineParserJPG.h"
#include "ThreadSafeIO.h"

#include <boost/thread.hpp>
//libboost-thread-dev
#include <boost/asio.hpp>
#include <boost/date_time/posix_time/posix_time.hpp>
////libboost-system-dev

typedef float Precision;

template <class T> void freeArraySafe(T * &ptr)
{
  if (ptr != NULL)
  {
    delete [] ptr;
    ptr = NULL;
  }
  else
  {
    tsErr.puts("ERROR: NULL ptr free attempt!");
  }
}

template <class T> void freeSafe(T * &ptr)
{
  if (ptr != NULL)
  {
    delete ptr;
    ptr = NULL;
  }
  else
  {
    tsErr.puts("ERROR: NULL ptr free attempt!");
  }
}


CacheableFilter<Precision> * filterX = NULL, * filterY = NULL;
StreamedImagePrescaledInputWindow<Precision> * inputBuffer = NULL;
TiledImageOutputWindowJPG<Precision> * outputBuffer = NULL;
TileCommandlineParserJPG * options = NULL;

int d;
double scaleY;
double deltaY;
double radiusY;
bool bufferInputWindow;
bool normalized;

typedef std::pair<long, long> Coords;
typedef std::pair<Coords, Coords> Frame;

void run()
{
  static boost::mutex mutex;
  static long yGlobal = 0;
  static long xGlobal = 0;
  static long srcYGlobal = 0;
  static std::set<Coords/*, CoordsCmp*/> processing;
  static bool initized = false;
  static long pixelTop;
  static long pixelBottomGlobal;
  static boost::asio::io_service io_service;
  static long globalStep;
  static long lastStep;

  if (!initized)
  {
    mutex.lock();
   
    if (!initized)
    {
      globalStep = options->cropWidth;
                   //options->cropWidth > options->threads ?
                   //options->cropWidth / options->threads :
                   //1;
      lastStep = options->cropWidth % globalStep;
      if (bufferInputWindow)
      {
        pixelTop = ceil((options->cropTop + deltaY - (double) radiusY) / scaleY - 0.5);
        pixelBottomGlobal = floor((options->cropTop + deltaY + (double) radiusY) / scaleY + 0.5);
      }
      else
      {
        pixelTop = ceil(std::max(0., -options->cropTop - radiusY - deltaY - 0.5));
        pixelBottomGlobal = floor(std::min(-options->cropTop
                                           + radiusY - deltaY + 0.5,
                                           (double) options->cropHeight - 1));
        yGlobal = pixelTop;
      }
      initized = true;
    }
    mutex.unlock();
   
  }

  unsigned long outThrId = outputBuffer->getThreadId();
  unsigned long inThrId = inputBuffer->getThreadId();
  std::list<Frame> queue;

  mutex.lock();
  if (bufferInputWindow)
  {
    long x, y, step, srcY, pixelBottom;

    while (yGlobal < options->cropHeight)
    {
      x = xGlobal;
      y = yGlobal;
      srcY = pixelTop;
      pixelBottom = pixelBottomGlobal;

      xGlobal += globalStep;
      step = xGlobal > options->cropWidth ? lastStep : globalStep;
      //xGlobal++;
      if (xGlobal >= options->cropWidth)
      {
        xGlobal = 0;
        yGlobal++;

        pixelTop = ceil((options->cropTop + yGlobal + deltaY - (double) radiusY) / scaleY - 0.5);
        pixelBottomGlobal = (options->cropTop + yGlobal + deltaY + (double) radiusY) / scaleY + 0.5;
      }

      mutex.unlock();

      outputBuffer->setThreadTop(y, outThrId);
      Precision * dstRow = outputBuffer->tryRow(y, outThrId);

      if (dstRow == NULL)
      {
        inputBuffer->preloadLine(inThrId);
        dstRow = outputBuffer->row(y, outThrId);
      }

      Precision * weightRow = outputBuffer->weights(y, outThrId);

      while (srcY <= pixelBottom)
      {
        // possibly expensive -> is it necessary so often?
        unsigned long srcYTop = std::max(std::min(srcY, pixelTop), 0L);
        inputBuffer->setThreadTop(srcYTop, inThrId);

        Precision yRowWeight = filterY->value(srcY, options->cropTop + y);
  
        if (yRowWeight != 0)
        {
          unsigned long rowOffset = srcY < 0 ?
                                    0 :
                                    ( srcY >= options->srcHeight ?
                                      options->srcHeight - 1 :
                                      srcY);

          const Precision * srcRow = &inputBuffer->row(rowOffset,
                                                       inThrId)[x * d];
          Precision * dstPtr = &dstRow[x * d];
          Precision * weightPtr = weightRow != NULL ? &weightRow[x] : NULL;
          for (unsigned long dx = 0; dx < step; dx++)
          {
            for (unsigned long i = 0; i < d; i++)
            {
              *dstPtr++ += yRowWeight * *srcRow++;
            }

            if (weightRow != NULL)
            {
              *weightPtr++ += yRowWeight;
            }
          }
        }
        //inputBuffer->preloadLine(inThrId);
        srcY++;
      }
      inputBuffer->preloadLine(inThrId);

      mutex.lock();
    }
  }
  else
  {
    while (!queue.empty() || srcYGlobal < options->srcHeight)
    {
      std::list<Frame>::iterator it = queue.begin();
      while (it != queue.end() && processing.count(it->second) > 0)
      {
        it++;
      }

      Frame processingFrame;

      if (it != queue.end())
      {
        processingFrame = *it;
        queue.erase(it);
      }
      else
      {
        while (true)
        {
          if (srcYGlobal >= options->srcHeight)
          {
            do
            {
              mutex.unlock();
              boost::asio::deadline_timer t(io_service,
                                            boost::posix_time::millisec(100));
              t.wait();
              //WAIT
              mutex.lock();
              it = queue.begin();
              while (it != queue.end() && processing.count(it->second) > 0)
              {
                it++;
              }
              
            } while (it == queue.end());
            processingFrame = *it;
            queue.erase(it);
          }
          else
          {
            processingFrame.first.first = srcYGlobal;

            processingFrame.second.first = xGlobal;
            processingFrame.second.second = yGlobal;

            xGlobal += globalStep;
            processingFrame.first.second = xGlobal > options->cropWidth ?
                                           lastStep :
                                           globalStep;
            if (xGlobal >= options->cropWidth)
            {
              xGlobal = 0;
              yGlobal++;
    
              if (yGlobal > pixelBottomGlobal)
              {
                srcYGlobal++;
    
                pixelTop = ceil(std::max(0., srcYGlobal * scaleY - options->cropTop
                                             - radiusY - deltaY - 0.5));
                yGlobal = pixelTop;
                pixelBottomGlobal = std::min(srcYGlobal * scaleY - options->cropTop
                                             + radiusY - deltaY + 0.5,
                                             (double) options->cropHeight - 1);
              }
            }

            if (processing.count(processingFrame.second) == 0)
            {
              break;
            }

            queue.push_back(processingFrame);
          }
        }
      }
      processing.insert(processingFrame.second);
      mutex.unlock();

      long srcY = processingFrame.first.first;
      long x = processingFrame.second.first;
      long y = processingFrame.second.second;

      long yTop = y;
      long srcYTop = srcY;
      for (it = queue.begin(); it != queue.end(); it++)
      {
        if (yTop > it->second.second)
        {
          yTop = it->second.second;
        }

        if (srcYTop > it->first.first)
        {
          srcYTop = it->first.first;
        }
      }
      yTop = std::min(yTop, pixelTop);

      inputBuffer->setThreadTop(srcYTop, inThrId);
      outputBuffer->setThreadTop(yTop, outThrId);

      Precision yRowWeight = filterY->value(srcY, options->cropTop + y);

      if (yRowWeight != 0)
      {
        const Precision * srcRow = inputBuffer->tryRow(srcY, inThrId);
        Precision * dstRow = outputBuffer->tryRow(y, outThrId);

        if (dstRow == NULL)
        {
          inputBuffer->preloadLine(inThrId);
          dstRow = outputBuffer->row(y, outThrId);
        }

        Precision * weightRow = outputBuffer->weights(y, outThrId);
        if (srcRow == NULL)
        {
          srcRow = inputBuffer->row(srcY, inThrId);
        }

        for (unsigned long i = 0; i < processingFrame.first.second; i++)
        {
          for (unsigned long j = 0; j < d; j++)
          {
            dstRow[d * (x + i) + j] += yRowWeight * srcRow[d * (x + i) + j];
          }

          if (weightRow != NULL)
          {
            weightRow[x + i] += yRowWeight;
          }
        }

        //filterX->processRowPartially(yRowWeight, srcRow, &dstRow[d * x], d,
        //                             x + options->cropLeft,
        //                             processingFrame.first.second,
        //                             normalized ? NULL : &weightRow[x]);
      }
      //inputBuffer->preloadLine(inThrId);

      mutex.lock();
      processing.erase(processingFrame.second);
    }
  }
  mutex.unlock();
  outputBuffer->finishTileLine(outThrId);
}


int main(int argc, char *argv[])
{
  options = new TileCommandlineParserJPG(argc, argv);

  FILE * ifh = stdin;

  if (options->src != "-")
  {
    ifh = fopen(options->src.c_str(), "rb");
    if (ifh == NULL)
    {
      tsErr.printf("ERROR: Unable open '%s' for input.\n", options->src.c_str());
      return 2;
    }
  }

  d = options->channels.length();
  double scaleX = options->scaledWidth / (double) options->srcWidth;
  scaleY = options->scaledHeight / (double) options->srcHeight;
  double deltaX = 0.5 - scaleX * 0.5;
  deltaY = 0.5 - scaleY * 0.5;

  // radius given in DST coordinates
  double radiusX = options->radius;
  radiusY = options->radius;

  if (options->filter != BOX && options->filter != SUM)
  {
    // interpret radius as given in SRC coordinates if scale > 0
    if (scaleY > 1)
    {
      radiusY *= scaleY;
    }

    if (scaleX > 1)
    {
      radiusX *= scaleX;
    }
  }
  else
  {
    radiusY = 0.5 + 0.5 * scaleY; // for buffer estimation purposes
    radiusX = 0.5 + 0.5 * scaleX;
  }



  unsigned char * charRow = NULL;
  unsigned short * shortRow = NULL;
  // not used in threading
  if (options->maxval > 255)
  {
    shortRow = new unsigned short [options->srcWidth * d];
  }
  else
  {
    charRow = new unsigned char [options->srcWidth * d];
  }

  size_t bufferingInput = StreamedImagePrescaledInputWindow<Precision>::bufferSize(options->srcWidth,
                                                                                   options->srcHeight,
                                                                                   radiusY / scaleY,
                                                                                   NULL,
                                                                                   NULL,
                                                                                   options->cropLeft,
                                                                                   options->cropWidth,
                                                                                   d,
                                                                                   options->maxval,
                                                                                   options->linear,
                                                                                   options->maxval > 255 ?
                                                                                   (void *) shortRow :
                                                                                   (void *) charRow,
                                                                                   0)
                          + TiledImageOutputWindowJPG<Precision>::bufferSize(options->cropWidth,
                                                                          options->cropHeight,
                                                                          options->tileWidth,
                                                                          options->tileHeight,
                                                                          0,
                                                                          options->filenamePattern,
                                                                          options->channels,
                                                                          options->maxval,
                                                                          options->linear,
                                                                          options->quality,
                                                                          0,
                                                                          true);
  size_t bufferingOutput = TiledImageOutputWindowJPG<Precision>::bufferSize(options->cropWidth,
                                                                         options->cropHeight,
                                                                         options->tileWidth,
                                                                         options->tileHeight,
                                                                         radiusY,
                                                                         options->filenamePattern,
                                                                         options->channels,
                                                                         options->maxval,
                                                                         options->linear,
                                                                         options->quality,
                                                                         0,
                                                                         true)
                           + StreamedImagePrescaledInputWindow<Precision>::bufferSize(options->srcWidth,
                                                                                      options->srcHeight,
                                                                                      0,
                                                                                      NULL,
                                                                                      NULL,
                                                                                      options->cropLeft,
                                                                                      options->cropWidth,
                                                                                      d,
                                                                                      options->maxval,
                                                                                      options->linear,
                                                                                      options->maxval > 255 ?
                                                                                      (void *) shortRow :
                                                                                      (void *) charRow,
                                                                                      0);

  size_t necessaryMemory = std::min(bufferingInput, bufferingOutput);

  unsigned long memoryLimit = options->memoryLimit <= necessaryMemory ?
                              0 :
                              options->memoryLimit - necessaryMemory;

  size_t cacheSizeFilterX = CacheableFilter<Precision>::cacheSize(options->radius,
                                                                  options->srcWidth,
                                                                  options->scaledWidth);
  size_t cacheSizeFilterY = CacheableFilter<Precision>::cacheSize(options->radius,
                                                                  options->srcHeight,
                                                                  options->scaledHeight);

  // X-filter is used much more frequently
  bool cacheFilterX = cacheSizeFilterX <= memoryLimit;
  bool cacheFilterY = cacheSizeFilterX + cacheSizeFilterY <= memoryLimit;
  normalized = cacheFilterX && cacheFilterY || options->filter == SUM;

  if (normalized)
  {
    tsErr.printf("Memory limit left (normalized): %lu, cache filter X: %lu,"
                 " cache filter Y: %lu\n",
                 memoryLimit, (unsigned long) cacheSizeFilterX, 
                 cacheSizeFilterY);
  }
  else
  {
    bufferingInput = StreamedImagePrescaledInputWindow<Precision>::bufferSize(options->srcWidth,
                                                                              options->srcHeight,
                                                                              radiusY / scaleY,
                                                                              NULL,
                                                                              NULL,
                                                                              options->cropLeft,
                                                                              options->cropWidth,
                                                                              d,
                                                                              options->maxval,
                                                                              options->linear,
                                                                              options->maxval > 255 ?
                                                                              (void *) shortRow :
                                                                              (void *) charRow,
                                                                              0)
                     + TiledImageOutputWindowJPG<Precision>::bufferSize(options->cropWidth,
                                                                     options->cropHeight,
                                                                     options->tileWidth,
                                                                     options->tileHeight,
                                                                     0,
                                                                     options->filenamePattern,
                                                                     options->channels,
                                                                     options->maxval,
                                                                     options->linear,
                                                                     options->quality,
                                                                     0,
                                                                     false);
    bufferingOutput = TiledImageOutputWindowJPG<Precision>::bufferSize(options->cropWidth,
                                                                    options->cropHeight,
                                                                    options->tileWidth,
                                                                    options->tileHeight,
                                                                    radiusY,
                                                                    options->filenamePattern,
                                                                    options->channels,
                                                                    options->maxval,
                                                                    options->linear,
                                                                    options->quality,
                                                                    0,
                                                                    false)
                      + StreamedImagePrescaledInputWindow<Precision>::bufferSize(options->srcWidth,
                                                                                 options->srcHeight,
                                                                                 0,
                                                                                 NULL,
                                                                                 NULL,
                                                                                 options->cropLeft,
                                                                                 options->cropWidth,
                                                                                 d,
                                                                                 options->maxval,
                                                                                 options->linear,
                                                                                 options->maxval > 255 ?
                                                                                 (void *) shortRow :
                                                                                 (void *) charRow,
                                                                                 0);

    necessaryMemory = std::min(bufferingInput, bufferingOutput);
  
    memoryLimit = options->memoryLimit <= necessaryMemory ?
                  0 :
                  options->memoryLimit - necessaryMemory;
    tsErr.printf("Memory limit left: %lu, cache filter X: %lu, cache filter Y: %lu\n",
                 memoryLimit, (unsigned long) cacheSizeFilterX,
                 cacheSizeFilterY);
    cacheFilterX = cacheSizeFilterX <= memoryLimit;
    cacheFilterY = cacheSizeFilterX + cacheSizeFilterY <= memoryLimit;
  }

  if (cacheFilterX)
  {
    memoryLimit -= cacheSizeFilterX;
    tsErr.puts("Caching filter X.");
  }

  if (cacheFilterY)
  {
    memoryLimit -= cacheSizeFilterY;
    tsErr.puts("Caching filter Y.");
  }

  // buffer input window if possible
  bufferInputWindow = bufferingInput <= memoryLimit + necessaryMemory;
  memoryLimit += necessaryMemory;
  memoryLimit -= bufferInputWindow ? bufferingInput : bufferingOutput;

  switch (options->filter)
  {
    case LANCZOS:
      filterX = new LanczosFilter<Precision>(options->radius,
                                             options->srcWidth,
                                             options->scaledWidth,
                                             cacheFilterX,
                                             options->interpolationNodes,
                                             normalized);
      filterY = new LanczosFilter<Precision>(options->radius,
                                             options->srcHeight,
                                             options->scaledHeight,
                                             cacheFilterY,
                                             options->interpolationNodes,
                                             normalized);
      break;

    case TRIANGLE:
      filterX = new TriangleFilter<Precision>(options->radius,
                                              options->srcWidth,
                                              options->scaledWidth,
                                              cacheFilterX,
                                              options->interpolationNodes,
                                              normalized);
      filterY = new TriangleFilter<Precision>(options->radius,
                                              options->srcHeight,
                                              options->scaledHeight,
                                              cacheFilterY,
                                              options->interpolationNodes,
                                              normalized);
      break;

    case BOX:
      filterX = new BoxFilter<Precision>(options->radius,
                                         options->srcWidth,
                                         options->scaledWidth,
                                         cacheFilterX,
                                         options->interpolationNodes,
                                         normalized);
      filterY = new BoxFilter<Precision>(options->radius,
                                         options->srcHeight,
                                         options->scaledHeight,
                                         cacheFilterY,
                                         options->interpolationNodes,
                                         normalized);
      break;

    case SUM:
      filterX = new SumFilter<Precision>(options->radius,
                                         options->srcWidth,
                                         options->scaledWidth,
                                         cacheFilterX,
                                         options->interpolationNodes);
      filterY = new SumFilter<Precision>(options->radius,
                                         options->srcHeight,
                                         options->scaledHeight,
                                         cacheFilterY,
                                         options->interpolationNodes);
      break;
  }


  unsigned long bufferedLines = 0;
  size_t inputBufferLineCost = StreamedImagePrescaledInputWindow<Precision>::lineSize(options->cropWidth, d);
  size_t outputBufferLineCost = TiledImageOutputWindowJPG<Precision>::lineSize(options->cropWidth, d, normalized);
  if (bufferInputWindow)
  {
    unsigned long lineCost = outputBufferLineCost + inputBufferLineCost * ceil(1 / scaleY);
    bufferedLines = memoryLimit / lineCost;
    while (outputBufferLineCost * (bufferedLines + 1)
           + inputBufferLineCost * ceil((bufferedLines + 1) / scaleY) <= memoryLimit)
    {
      bufferedLines++;
    }

    tsErr.printf("Buffering input: %lu additional lines.\n", bufferedLines);
    inputBuffer = new StreamedImagePrescaledInputWindow<Precision>(options->srcWidth,
                                                                   options->srcHeight,
                                                                   radiusY / scaleY,
                                                                   ifh, filterX,
                                                                   options->cropLeft,
                                                                   options->cropWidth,
                                                                   d,
                                                                   options->maxval,
                                                                   options->linear,
                                                                   options->maxval > 255 ?
                                                                   (void *) shortRow :
                                                                   (void *) charRow,
                                                                   ceil(bufferedLines / scaleY));

    outputBuffer = new TiledImageOutputWindowJPG<Precision>(options->cropWidth,
                                                         options->cropHeight,
                                                         options->tileWidth,
                                                         options->tileHeight,
                                                         0,
                                                         options->filenamePattern,
                                                         options->channels,
                                                         options->maxval,
                                                         options->linear,
                                                         options->quality,
                                                         bufferedLines,
                                                         normalized);
  }
  else
  {
    unsigned long lineCost = outputBufferLineCost * ceil(scaleY) + inputBufferLineCost;
    bufferedLines = memoryLimit / lineCost;
    while (outputBufferLineCost * ceil((bufferedLines + 1) * scaleY)
           + inputBufferLineCost * (bufferedLines + 1) <= memoryLimit)
    {
      bufferedLines++;
    }

    tsErr.printf("Buffering output: %lu additional lines.\n", bufferedLines);
    inputBuffer = new StreamedImagePrescaledInputWindow<Precision>(options->srcWidth,
                                                                   options->srcHeight, 0,
                                                                   ifh,
                                                                   filterX,
                                                                   options->cropLeft,
                                                                   options->cropWidth,
                                                                   d,
                                                                   options->maxval,
                                                                   options->linear,
                                                                   options->maxval > 255 ?
                                                                   (void *) shortRow :
                                                                   (void *) charRow,
                                                                   bufferedLines);

    outputBuffer = new TiledImageOutputWindowJPG<Precision>(options->cropWidth,
                                                         options->cropHeight,
                                                         options->tileWidth,
                                                         options->tileHeight,
                                                         radiusY,
                                                         options->filenamePattern,
                                                         options->channels,
                                                         options->maxval,
                                                         options->linear,
                                                         options->quality,
                                                         ceil(bufferedLines * scaleY),
                                                         normalized);
  }

  outputBuffer->startThreading(options->threads);
  inputBuffer->startThreading(options->threads);

  if (options->threads > 1)
  {
    boost::thread * * threads = new  boost::thread * [options->threads - 1];
    for (unsigned long i = 0; i < options->threads - 1; i++)
    {
      threads[i] = new boost::thread(run);
    }
    run();

    for (unsigned long i = 0; i < options->threads - 1; i++)
    {
      threads[i]->join();
      delete threads[i];
    }
    delete [] threads;
  }
  else
  {
    run();
  }

  freeSafe(inputBuffer);
  freeSafe(outputBuffer);

  if (options->src != "-")
  {
    fclose(ifh);
  }

  freeSafe(options);
  freeSafe(filterX);
  freeSafe(filterY);

  if (charRow != NULL) freeArraySafe(charRow);
  if (shortRow != NULL) freeArraySafe(shortRow);

  return 0;
}
