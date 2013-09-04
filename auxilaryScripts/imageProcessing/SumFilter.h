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

#ifndef SUMFILTER_H
#define SUMFILTER_H

template <class T> class SumFilter : public CacheableFilter<T>
{
  public:
    SumFilter(double radius, long srcSize, long dstSize,
              bool cacheValues = true,
              int interpolationNodes = 0) : CacheableFilter<T>(radius,
                                                               srcSize,
                                                               dstSize,
                                                               false,
                                                               interpolationNodes,
                                                               true)
    {
      if (cacheValues)
      {
        this->initizeCache(false);
      }
    }

    // computations are expensive, so method virtualization matters not
    virtual T filter(T x, double radius)
    {
      return this->sum(x, radius);
    }

    // exact value of integral available - no quadratures necessary
    virtual T compute(long src, long dst)
    {
      if (this->nodes > 0)
      {
        double h = this->scale > 1 ? 1 : this->scale;
        // scale > 1 : upsampling
        double w = this->scale > 1 ? 1. / this->scale : 1.;
        double x = src * h - (dst + this->delta) * w;
        return this->interpolate(x, w);
      }

      // working in SRC units
      double pixelStart = dst / this->scale;
      double pixelEnd = (dst + 1) / this->scale;
      //fprintf(stderr, "%ld, %ld\n", src, dst);
      if (pixelEnd < src || src + 1 < pixelStart) return 0;

      double val = ((pixelStart <= src ? 1. : src + 1 - pixelStart)
                    - (pixelEnd >= src + 1 ?
                       0. :
                       src + 1 - pixelEnd));
      //fprintf(stderr, "val = %f\n", val);

      return val;
    }

    static T sum(T x, double radius)
    {
      x = fabs(x);
      return x < radius ?
             1.0 :
             0.0;
    }
};

#endif

