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
#include <float.h>

#include "CacheableFilter.h"

#ifndef LANCZOSFILTER_H
#define LANCZOSFILTER_H

#ifndef M_PI
#define M_PI 3.141592653589793
#endif

// template <class T> T jinc(T x, int n)
// {
//   if (fabs(x) < DBL_EPSILON)
//   {
//     return .5;
//   }
//   return fabs(x) < n?
//          n * j1(x * M_PI) * j1(x * 1.2196699 / n) / (x * x * M_PI * 1.2196699):
//          0.;
// }

template <class T> class LanczosFilter : public CacheableFilter<T>
{
  public:
    LanczosFilter(double radius, long srcSize, long dstSize,
                  bool cacheValues = true,
                  int interpolationNodes = 5,
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
      return this->lanczos(x, radius);
    }

    static T lanczos(T x, double n)
    {
      //fprintf(stderr, "%f\t%d\t%f\n", x, n, DBL_EPSILON);
      if (fabs(x) < DBL_EPSILON)
      {
        return 1.;
      }
      return fabs(x) < n ?
             n * sin(x * M_PI) * sin(x * M_PI / n) / (x * x * M_PI * M_PI):
             0.;
    }
};

#endif

