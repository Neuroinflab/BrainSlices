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
#include <stdio.h>
#include <math.h>

#include "CacheableFilter.h"

#ifndef TRIANGLEFILTER_H
#define TRIANGLEFILTER_H

template <class T> class TriangleFilter : public CacheableFilter<T>
{
  public:
    TriangleFilter(double radius, long srcSize, long dstSize,
                   bool cacheValues = true,
                   int interpolationNodes = 0,
                   bool normalize = false) : CacheableFilter<T>(radius,
                                                                srcSize,
                                                                dstSize,
                                                                false,
                                                                interpolationNodes,
                                                                normalize)
    {
      if (cacheValues)
      {
        this->initizeCache(normalize);
      }
    }

    // computations are expensive, so method virtualization matters not
    virtual T filter(T x, double radius)
    {
      return this->triangle(x, radius);
    }

    static T triangle(T x, double r)
    {
      x = fabs(x);
      //fprintf(stderr, "%f\t%d\t%f\n", x, n, DBL_EPSILON);
      return x < r ?
             (x - r) / r :
             0.;
    }

    virtual T compute(long src, long dst)
    {
      // this->scale < 1 -> working in DST coordinates
      // this->scale > 1 -> working in SRC coordinates
      double scale = this->scale > 1 ? 1 : this->scale;
      double dstLoc = (dst + this->delta) / (this->scale > 1 ? this->scale : 1);

      if (this->nodes > 0)
      {
        return this->interpolate(src * scale - dstLoc, scale);
      }

      double pixelStart = (src - 0.5) * scale;
      double pixelEnd = (src + 0.5) * scale;
      if (pixelEnd < (dstLoc - this->radius) || pixelStart > (dstLoc + this->radius))
      {
        return 0;
      }

      return (( pixelEnd < dstLoc ?
                0.5 * (pixelEnd - (dstLoc - this->radius))
                * (pixelEnd - (dstLoc - this->radius)) :
                ( pixelEnd < (dstLoc + this->radius) ?
                  this->radius * this->radius - 0.5 * (dstLoc + this->radius - pixelEnd)
                        * (dstLoc + this->radius - pixelEnd) :
                  this->radius * this->radius))
              -
              ( pixelStart < dstLoc ?
                ( pixelStart < (dstLoc - this->radius) ?
                  0.0 :
                  0.5 * (pixelStart - (dstLoc - this->radius))
                  * (pixelStart - (dstLoc - this->radius))) :
                this->radius * this->radius - 0.5 * (dstLoc + this->radius - pixelStart)
                      * (dstLoc + this->radius - pixelStart)))
             / (this->radius * this->radius);

    }
};

#endif

