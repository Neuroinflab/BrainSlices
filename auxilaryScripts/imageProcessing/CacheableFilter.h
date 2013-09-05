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
#include <stdio.h>

#ifndef CACHABLEFILTER_H
#define CACHABLEFILTER_H

#include <boost/thread.hpp>
//libboost-thread-dev
#include <boost/asio.hpp>
#include <boost/date_time/posix_time/posix_time.hpp>

template <class T> class CacheableFilter
{
  private:
    T * * cache;
    long srcWindow;
    long dstWindow;
    long srcSize;
    long dstSize;
    bool normalized;

    static unsigned long gcd(unsigned long a, unsigned long b)
    {
      if (a > b)
      {
        unsigned long tmp = a;
        a = b;
        b = tmp;
      }
      if (a == 0) return b;
      return gcd(b % a, a);
    }

  protected:
    double scale;
    double radius;
    double delta;
    unsigned int nodes;

    void initizeCache(bool normalize = false)
    {
      double scale = this->scale > 1 ? 1 : this->scale;
      long sizeGCD = this->gcd(this->srcSize, this->dstSize);
      this->srcWindow = this->srcSize / sizeGCD;
      this->dstWindow = this->dstSize / sizeGCD;

      long srcOffsetMax = this->srcWindow + (long) ceil(this->radius / scale + 0.5);

      this->cache = new T * [this->dstWindow];
      for (long i = 0; i < this->dstWindow; i++)
      {
        this->cache[i] = new T [srcOffsetMax];

        for (long j = 0; j < srcOffsetMax; j++)
        {
          this->cache[i][j] = this->compute(j, i);
        }
      }

      if (normalize)
      {
        double radius = this->radius * (this->scale > 1 ? this->scale : 1);
        for (long i = 0; i < this->dstWindow; i++)
        {
          T cumulatedWeights = 0;
          double pixelLeft = (i + this->delta - radius) / this->scale - 0.5;
          double pixelRight = (i + this->delta + radius) / this->scale + 0.5;
          for (long j = ceil(pixelLeft); j <= pixelRight; j++)
          {
            cumulatedWeights += this->cached(j, i);
          }

          T factor = 1. / cumulatedWeights;
          for (long j = 0; j < srcOffsetMax; j++)
          {
            this->cache[i][j] *= factor;
          }
        }
      }
    }

    T interpolate(double x, double h)
    {
      // about 10 times slower than cache for 1 node interpolation
      switch (this->nodes)
      {
        case 1:
          // rectangle rule
          return h * this->filter(x, this->radius);

        case 2:
          // trapezoid (open) method
          {
            double left = this->filter(x - 0.5 / 3 * h, this->radius);
            double right = this->filter(x + 0.5 / 3 * h, this->radius);
            return h * 0.5 * (left + right);
          }

        case 3:
          // Milne's rule
          {
            double left = this->filter(x - 0.25 * h, this->radius);
            double mid = this->filter(x, this->radius);
            double right = this->filter(x + 0.25 * h, this->radius);
            return h * 1. / 3 * (2 * left + mid + 2 * right);
          }
          // // Simpson's rule
          // double left = this->filter(x - 0.5 * h, this->radius);
          // double mid = this->filter(x, this->radius);
          // double right = this->filter(x + 0.5 * h, this->radius);
          // return h * 1. / 6 * (left + 4 * mid + right);

        case 4:
          // Simpson's 3/8 rule
          {
            double left = this->filter(x - 0.5 * h, this->radius);
            double midLeft = this->filter(x - 0.5 / 3 * h, this->radius);
            double midRight = this->filter(x + 0.5 / 3 * h, this->radius);
            double right = this->filter(x + 0.5 * h, this->radius);
            return h * 0.125 *  (left + 3 * midLeft + 3 * midRight + right);
          }
        case 5:
        default:
          // Boole's rule
          {
            double left = this->filter(x - 0.5 * h, this->radius);
            double midLeft = this->filter(x - 0.25 * h, this->radius);
            double mid = this->filter(x, this->radius);
            double midRight = this->filter(x + 0.25 * h, this->radius);
            double right = this->filter(x + 0.5 * h, this->radius);
            return h * 1. / 90 * (7 * left + 32 * midLeft + 12 * mid + 32 * midRight + 7 * right);
          }
      }
    }

  public:
    CacheableFilter(double radius, long srcSize, long dstSize,
                    bool cacheValues = true,
                    unsigned int interpolationNodes = 0,
                    bool normalize = false)
    {
      this->normalized = normalize;
      this->radius = radius;
      this->nodes = interpolationNodes;
      this->srcSize = srcSize;
      this->dstSize = dstSize;
      this->scale = dstSize / (double) srcSize;
      this->delta = 0.5 - this->scale * 0.5;
      if (cacheValues)
      {
        this->initizeCache(normalize);
      }
      else
      {
        this->cache = NULL;
      }
    }

    virtual ~CacheableFilter()
    {
      if (this->cache != NULL)
      {
        for (long i = 0; i < this->dstWindow; i++) // for rectangle pixels <=
        {
          delete [] this->cache[i];
        }
        delete [] this->cache;
      }
    }

    bool isNormalized()
    {
      return this->normalized && this->cache != NULL;
    }

    // caching must be quick and its mechanism does not depends on the filter
    // function
    T cached(long src, long dst)
    {
      long dstWindowOffset = dst % this->dstWindow;
      long srcBase = dst / this->dstWindow * this->srcWindow;
      if (src >= srcBase)
      {
        return this->cache[dstWindowOffset][src - srcBase];
      }
      return this->cache[this->dstWindow - 1 - dstWindowOffset][this->srcWindow - 1 + srcBase - src];
    }

    T value(long src, long dst)
    {
      // slows about 2 times compared to cached :(
      return this->cache != NULL ?
             this->cached(src, dst) :
             this->compute(src, dst);
    }

    // computations are expensive, so method virtualization matters not
    virtual T filter(T x, double radius) = 0;

    virtual T compute(long src, long dst)
    {
      // this->scale < 1 -> working in DST coordinates
      // this->scale > 1 -> working in SRC coordinates
      double h = this->scale > 1 ? 1 : this->scale;
      double x = src * h - (dst + this->delta) / (this->scale > 1 ?
                                                      this->scale :
                                                      1);
      return this->interpolate(x, h);
    }

    static size_t cacheSize(long radius, long srcSize, long dstSize)
    {
      double scale = srcSize < dstSize ? srcSize / (double) dstSize : 1;
      long sizeGCD = gcd(srcSize, dstSize);
      long srcOffsetMax = srcSize / sizeGCD + (long) ceil(radius * scale + 0.5);
      long dstWindow = dstSize / sizeGCD;
      return (sizeof(T *) + (sizeof(T) * srcOffsetMax)) * dstWindow;
    }

    template <class S> void processRow(const S * srcRow, S * dstRow, long int d, long int cropLeft, long int cropWidth)
    {
      S rowComponent[d];
      S cumulatedWeights;

      // this->scale < 1 -> radius already in DST coordinates
      // this->scale > 1 -> converting radius from SRC to DST coordinates
      double radius = this->radius * (this->scale > 1 ? this->scale : 1);

      if (this->cache != NULL)
      {
        for (long x = 0; x < cropWidth; x++)
        {
          for (long i = 0; i < d; ++i)
          {
            rowComponent[i] = 0.;
          }
          cumulatedWeights = 0.;

          double pixelLeft = (cropLeft + x + this->delta - radius) / this->scale - 0.5;
          double pixelRight = (cropLeft + x + this->delta + radius) / this->scale + 0.5;
        
          for (long srcX = (long) ceil(pixelLeft); srcX <= pixelRight; srcX++)
          {
            T weight = this->cached(srcX, cropLeft + x);

            // fprintf(stderr, "row %ld\t%ld\t%f\t%f\n", x, srcX, yRowWeight, xColWeight);
        
            for (long i = 0; i < d; i++)
            {
              S value = srcRow[(srcX < 0 ?
                                0 :
                                (srcX >= this->srcSize ?
                                 this->srcSize - 1 :
                                 srcX)) * d + i];
              rowComponent[i] += value * weight;
            }
            cumulatedWeights += weight;
          }

          if (this->normalized)
          {
            for (long i = 0; i < d; i++)
            {
              *dstRow++ += rowComponent[i];
            }
          }
          else
          {
            for (long i = 0; i < d; i++)
            {
              S scaleFactor = 1. / cumulatedWeights;
              *dstRow++ += rowComponent[i] * scaleFactor;
            }
          }
        }
      }
      else
      {
        for (long x = 0; x < cropWidth; x++)
        {
          for (long i = 0; i < d; ++i)
          {
            rowComponent[i] = 0.;
          }
          cumulatedWeights = 0.;
        
          double pixelLeft = (cropLeft + x + this->delta - radius) / this->scale - 0.5;
          double pixelRight = (cropLeft + x + this->delta + radius) / this->scale + 0.5;
        
          for (long srcX = (long) ceil(pixelLeft); srcX <= pixelRight; srcX++)
          {
            T weight = this->compute(srcX, cropLeft + x);
        
            // fprintf(stderr, "row %ld\t%ld\t%f\t%f\n", x, srcX, yRowWeight, xColWeight);
            for (long i = 0; i < d; i++)
            {
              S value = srcRow[(srcX < 0 ?
                                0 :
                                (srcX >= this->srcSize ?
                                 this->srcSize - 1 :
                                 srcX)) * d + i];
              rowComponent[i] += value * weight;
            }
            cumulatedWeights += weight;
          }

          S scaleFactor = 1. / cumulatedWeights;
          for (long i = 0; i < d; i++)
          {
            *dstRow++ += rowComponent[i] * scaleFactor;
          }
        }
      }
    }
    template <class S> void processRow(T yRowWeight, const S * srcRow, S * dstRow, long int d, long int cropLeft, long int cropWidth, S * weightRow = NULL)
    {
      S rowComponent[d];
      S cumulatedWeights;

      // this->scale < 1 -> radius already in DST coordinates
      // this->scale > 1 -> converting radius from SRC to DST coordinates
      double radius = this->radius * (this->scale > 1 ? this->scale : 1);

      if (this->cache != NULL)
      {
        for (long x = 0; x < cropWidth; x++)
        {
          for (long i = 0; i < d; ++i)
          {
            rowComponent[i] = 0.;
          }
          cumulatedWeights = 0.;

          double pixelLeft = (cropLeft + x + this->delta - radius) / this->scale - 0.5;
          double pixelRight = (cropLeft + x + this->delta + radius) / this->scale + 0.5;
        
          for (long srcX = (long) ceil(pixelLeft); srcX <= pixelRight; srcX++)
          {
            T xColWeight = this->cached(srcX, cropLeft + x);
            S weight = yRowWeight * xColWeight;

            // fprintf(stderr, "row %ld\t%ld\t%f\t%f\n", x, srcX, yRowWeight, xColWeight);
        
            for (long i = 0; i < d; i++)
            {
              S value = srcRow[(srcX < 0 ?
                                0 :
                                (srcX >= this->srcSize ?
                                 this->srcSize - 1 :
                                 srcX)) * d + i];
              rowComponent[i] += value * weight;
            }
            cumulatedWeights += weight;
          }
          for (long i = 0; i < d; i++)
          {
            dstRow[x * d + i] += rowComponent[i];
          }
          if (weightRow != NULL)
          {
            *weightRow++ += cumulatedWeights;
          }
        }
      }
      else
      {
        for (long x = 0; x < cropWidth; x++)
        {
          for (long i = 0; i < d; ++i)
          {
            rowComponent[i] = 0.;
          }
          cumulatedWeights = 0.;
        
          double pixelLeft = (cropLeft + x + this->delta - radius) / this->scale - 0.5;
          double pixelRight = (cropLeft + x + this->delta + radius) / this->scale + 0.5;
        
          for (long srcX = (long) ceil(pixelLeft); srcX <= pixelRight; srcX++)
          {
            T xColWeight = this->compute(srcX, cropLeft + x);
            S weight = yRowWeight * xColWeight;
        
            // fprintf(stderr, "row %ld\t%ld\t%f\t%f\n", x, srcX, yRowWeight, xColWeight);
            for (long i = 0; i < d; i++)
            {
              S value = srcRow[(srcX < 0 ?
                                0 :
                                (srcX >= this->srcSize ?
                                 this->srcSize - 1 :
                                 srcX)) * d + i];
              rowComponent[i] += value * weight;
            }
            cumulatedWeights += weight;
          }
          for (long i = 0; i < d; i++)
          {
            dstRow[x * d + i] += rowComponent[i];
          }
          if (weightRow != NULL)
          {
            *weightRow++ += cumulatedWeights;
          }
        }
      }
    }

/*    template <class S> void processRow(T yRowWeight, const S * srcRow, S * dstRow, long int d, long int cropLeft, long int cropWidth, long int start, long int step, S * weightRow = NULL)
    {
      S rowComponent[d];
      S cumulatedWeights;

      // this->scale < 1 -> radius already in DST coordinates
      // this->scale > 1 -> converting radius from SRC to DST coordinates
      double radius = this->radius * (this->scale > 1 ? this->scale : 1);

      if (this->cache != NULL)
      {
        for (long x = start; x < cropWidth; x += step)
        {
          for (long i = 0; i < d; ++i)
          {
            rowComponent[i] = 0.;
          }
          cumulatedWeights = 0.;

          double pixelLeft = (cropLeft + x + this->delta - radius) / this->scale - 0.5;
          double pixelRight = (cropLeft + x + this->delta + radius) / this->scale + 0.5;
        
          for (long srcX = (long) ceil(pixelLeft); srcX <= pixelRight; srcX++)
          {
            T xColWeight = this->cached(srcX, cropLeft + x);
            S weight = yRowWeight * xColWeight;

            // fprintf(stderr, "row %ld\t%ld\t%f\t%f\n", x, srcX, yRowWeight, xColWeight);
        
            for (long i = 0; i < d; i++)
            {
              S value = srcRow[(srcX < 0 ?
                                0 :
                                (srcX >= this->srcSize ?
                                 this->srcSize - 1 :
                                 srcX)) * d + i];
              rowComponent[i] += value * weight;
            }
            cumulatedWeights += weight;
          }
          for (long i = 0; i < d; i++)
          {
            dstRow[x * d + i] += rowComponent[i];
          }
          if (weightRow != NULL)
          {
            weightRow[x] += cumulatedWeights;
          }
        }
      }
      else
      {
        for (long x = start; x < cropWidth; x += step)
        {
          for (long i = 0; i < d; ++i)
          {
            rowComponent[i] = 0.;
          }
          cumulatedWeights = 0.;
        
          double pixelLeft = (cropLeft + x + this->delta - radius) / this->scale - 0.5;
          double pixelRight = (cropLeft + x + this->delta + radius) / this->scale + 0.5;
        
          for (long srcX = (long) ceil(pixelLeft); srcX <= pixelRight; srcX++)
          {
            T xColWeight = this->compute(srcX, cropLeft + x);
            S weight = yRowWeight * xColWeight;
        
            // fprintf(stderr, "row %ld\t%ld\t%f\t%f\n", x, srcX, yRowWeight, xColWeight);
            for (long i = 0; i < d; i++)
            {
              S value = srcRow[(srcX < 0 ?
                                0 :
                                (srcX >= this->srcSize ?
                                 this->srcSize - 1 :
                                 srcX)) * d + i];
              rowComponent[i] += value * weight;
            }
            cumulatedWeights += weight;
          }
          for (long i = 0; i < d; i++)
          {
            dstRow[x * d + i] += rowComponent[i];
          }
          if (weightRow != NULL)
          {
            weightRow[x] += cumulatedWeights;
          }
        }
      }
    }*/

    template <class S> void processRow(T yRowWeight, const S * srcRow, S * dst, long int d, long int x, S * weight = NULL)
    {
      S rowComponent[d];
      S cumulatedWeights = 0;

      // this->scale < 1 -> radius already in DST coordinates
      // this->scale > 1 -> converting radius from SRC to DST coordinates
      double radius = this->radius * (this->scale > 1 ? this->scale : 1);

      for (long i = 0; i < d; ++i)
      {
        rowComponent[i] = 0.;
      }

      if (this->cache != NULL)
      {
        double pixelLeft = (x + this->delta - radius) / this->scale - 0.5;
        double pixelRight = (x + this->delta + radius) / this->scale + 0.5;
        
        for (long srcX = (long) ceil(pixelLeft); srcX <= pixelRight; srcX++)
        {
          T xColWeight = this->cached(srcX, x);
          S weight = yRowWeight * xColWeight;

          // fprintf(stderr, "row %ld\t%ld\t%f\t%f\n", x, srcX, yRowWeight, xColWeight);
        
          for (long i = 0; i < d; i++)
          {
            S value = srcRow[(srcX < 0 ?
                              0 :
                              (srcX >= this->srcSize ?
                               this->srcSize - 1 :
                               srcX)) * d + i];
            rowComponent[i] += value * weight;
          }
          cumulatedWeights += weight;
        }
      }
      else
      {
        double pixelLeft = (x + this->delta - radius) / this->scale - 0.5;
        double pixelRight = (x + this->delta + radius) / this->scale + 0.5;
       
        for (long srcX = (long) ceil(pixelLeft); srcX <= pixelRight; srcX++)
        {
          T xColWeight = this->compute(srcX, x);
          S weight = yRowWeight * xColWeight;
       
          // fprintf(stderr, "row %ld\t%ld\t%f\t%f\n", x, srcX, yRowWeight, xColWeight);
          for (long i = 0; i < d; i++)
          {
            S value = srcRow[(srcX < 0 ?
                              0 :
                              (srcX >= this->srcSize ?
                               this->srcSize - 1 :
                               srcX)) * d + i];
            rowComponent[i] += value * weight;
          }
          cumulatedWeights += weight;
        }
      }

      for (long i = 0; i < d; i++)
      {
        *dst++ += rowComponent[i];
      }

      if (weight != NULL)
      {
        *weight += cumulatedWeights;
      }
    }

    template <class S> void processRowPartially(T yRowWeight, const S * srcRow, S * dst, long int d, long int x, long int width, S * weight = NULL)
    {
      S rowComponent[d];
      S cumulatedWeights;

      // this->scale < 1 -> radius already in DST coordinates
      // this->scale > 1 -> converting radius from SRC to DST coordinates
      double radius = this->radius * (this->scale > 1 ? this->scale : 1);



      if (this->cache != NULL)
      {
        while (width-- > 0)
        {
          for (long i = 0; i < d; ++i)
          {
            rowComponent[i] = 0.;
          }
          cumulatedWeights = 0;

          double pixelLeft = (x + this->delta - radius) / this->scale - 0.5;
          double pixelRight = (x + this->delta + radius) / this->scale + 0.5;
          
          for (long srcX = (long) ceil(pixelLeft); srcX <= pixelRight; srcX++)
          {
            T xColWeight = this->cached(srcX, x);
            S weight = yRowWeight * xColWeight;

            // fprintf(stderr, "row %ld\t%ld\t%f\t%f\n", x, srcX, yRowWeight, xColWeight);
          
            for (long i = 0; i < d; i++)
            {
              S value = srcRow[(srcX < 0 ?
                                0 :
                                (srcX >= this->srcSize ?
                                 this->srcSize - 1 :
                                 srcX)) * d + i];
              rowComponent[i] += value * weight;
            }
            cumulatedWeights += weight;
          }

          for (long i = 0; i < d; i++)
          {
            *dst++ += rowComponent[i];
          }

          if (weight != NULL)
          {
            *weight++ += cumulatedWeights;
          }
          x++;
        }
      }
      else
      {
        while (width-- > 0)
        {
          for (long i = 0; i < d; ++i)
          {
            rowComponent[i] = 0.;
          }
          cumulatedWeights = 0;

          double pixelLeft = (x + this->delta - radius) / this->scale - 0.5;
          double pixelRight = (x + this->delta + radius) / this->scale + 0.5;
         
          for (long srcX = (long) ceil(pixelLeft); srcX <= pixelRight; srcX++)
          {
            T xColWeight = this->compute(srcX, x);
            S weight = yRowWeight * xColWeight;
         
            // fprintf(stderr, "row %ld\t%ld\t%f\t%f\n", x, srcX, yRowWeight, xColWeight);
            for (long i = 0; i < d; i++)
            {
              S value = srcRow[(srcX < 0 ?
                                0 :
                                (srcX >= this->srcSize ?
                                 this->srcSize - 1 :
                                 srcX)) * d + i];
              rowComponent[i] += value * weight;
            }
            cumulatedWeights += weight;
          }
          
          for (long i = 0; i < d; i++)
          {
            *dst++ += rowComponent[i];
          }

          if (weight != NULL)
          {
            *weight++ += cumulatedWeights;
          }
          x++;
        }
      }
    }
};

#endif

