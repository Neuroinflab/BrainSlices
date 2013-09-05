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
#include <math.h>

#include "CacheableFilter.h"

#ifndef BOXFILTER_H
#define BOXFILTER_H

template <class T> class BoxFilter : public CacheableFilter<T>
{
  public:
    BoxFilter(double radius, long srcSize, long dstSize,
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
      return this->box(x, radius);
    }

    // exact value of integral available - no quadratures necessary
    virtual T compute(long src, long dst)
    {
      if (this->nodes > 0)
      {
        double h = this->scale > 1 ? 1 : this->scale;
        double x = src * h - (dst + this->delta) / (this->scale > 1 ? this->scale : 1);
        return this->interpolate(x, h);
      }

      // // working in SRC units
      // double pixelStart = dst / this->scale;
      // double pixelEnd = (dst + 1) / this->scale;
      // //fprintf(stderr, "%ld, %ld\n", src, dst);
      // if (src + 1 < pixelStart || src >= pixelEnd) return 0;
      // double val = this->scale * ((src < pixelStart ? src + 1. - pixelStart : 1.)
      //                       - (src + 1. > pixelEnd ?
      //                          src + 1. - pixelEnd :
      //                          0.));

      // working in DST units
      double pixelStart = src * this->scale;
      double pixelEnd = (src + 1) * this->scale;
      //fprintf(stderr, "%ld, %ld\n", src, dst);
      if (pixelEnd < dst || dst + 1 < pixelStart) return 0;

      double val = ((pixelStart < dst ? pixelEnd - dst : this->scale)
                    - (pixelEnd > dst + 1 ?
                       pixelEnd - (dst + 1) :
                       0.));
      //fprintf(stderr, "val = %f\n", val);

      return val;
    }

    static T box(T x, double radius)
    {
      x = fabs(x);
      return x < radius ?
             1.0 :
             /*(radius < 1 ?
              (x > 1 - radius ?
               (x - (1 - radius)) / (2 * (radius - 0.5)) :
               1.0) :
              (x > radius - 1 ?
               x - (radius - 1) :
               1.0) / (2 * (radius - 0.5))) :*/
             0.0;
    }
};

#endif

