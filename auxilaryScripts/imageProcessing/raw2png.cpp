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
#include <ctime>
//#include <csetjmp> pnglib shouts at me

#include <algorithm>
#include <utility>
#include <set>

#include <png.h>
//requires pnglib installed

#include "PngCommandlineParser.h"


template <class T> void freeArraySafe(T * &ptr)
{
  if (ptr != NULL)
  {
    delete [] ptr;
    ptr = NULL;
  }
  else
  {
    fprintf(stderr, "ERROR: NULL ptr free attempt!\n");
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
    fprintf(stderr, "ERROR: NULL ptr free attempt!\n");
  }
}

PngCommandlineParser * options;
FILE * ifh;
FILE * ofh;

void closeAll()
{
  if (options->src != "-" && ifh != NULL)
  {
    fclose(ifh);
  }

  if (options->dst != "-" && ofh != NULL)
  {
    fclose(ofh);
  }
}

int main(int argc, char *argv[])
{
  options = new PngCommandlineParser(argc, argv);

  ifh = stdin;
  if (options->src != "-")
  {
    ifh = fopen(options->src.c_str(), "rb");
    if (ifh == NULL)
    {
      fprintf(stderr, "Unable to open file '%s' for input.\n",
              options->src.c_str());
      return 1;
    }
  }

  ofh = stdout;
  if (options->dst != "-")
  {
    ofh = fopen(options->dst.c_str(), "wb");
    if (ofh == NULL)
    {
      fprintf(stderr, "Unable to open file '%s' for output.\n",
              options->dst.c_str());

      closeAll();
      return 1;
    }
  }

  png_structp png_ptr = png_create_write_struct(PNG_LIBPNG_VER_STRING,
                                                (png_voidp) NULL, NULL, NULL);
  if (png_ptr == NULL)
  {
    closeAll();
    fputs("pnglib function png_create_write_struct() failed.\n", stderr);
    return 2;
  }

  png_infop info_ptr = png_create_info_struct(png_ptr);

  if (info_ptr == NULL)
  {
    closeAll();
    png_destroy_write_struct(&png_ptr, (png_infopp) NULL);
    fputs("pnglib function png_create_info_struct() failed.\n", stderr);
    return 2;
  }

  if (setjmp(png_jmpbuf(png_ptr)))
  {
    closeAll();
    png_destroy_write_struct(&png_ptr, &info_ptr);
    fputs("Some pnglib error occured\n", stderr);
    return 2;
  }

  png_init_io(png_ptr, ofh);
  png_set_filter(png_ptr, 0, PNG_FILTER_NONE | PNG_FILTER_VALUE_NONE |
                             PNG_FILTER_SUB | PNG_FILTER_VALUE_SUB |
                             PNG_FILTER_UP | PNG_FILTER_VALUE_UP |
                             PNG_FILTER_AVG | PNG_FILTER_VALUE_AVG |
                             PNG_FILTER_PAETH | PNG_FILTER_VALUE_PAETH |
                             PNG_ALL_FILTERS);
  png_set_compression_strategy(png_ptr, options->compressionStrategy);
  png_set_compression_level(png_ptr, options->compressionLevel);
  png_set_IHDR(png_ptr, info_ptr, options->width, options->height, 8,
               PNG_COLOR_TYPE_RGB, PNG_INTERLACE_NONE,
               PNG_COMPRESSION_TYPE_DEFAULT, PNG_FILTER_TYPE_DEFAULT);

  png_write_info(png_ptr, info_ptr);

  size_t rowWidth = 3 * options->width;

  if (options->memoryLimit < rowWidth)
  {
    png_set_flush(png_ptr, 1);
  }
  else
  {
    png_set_flush(png_ptr, options->memoryLimit / rowWidth);
  }

  png_bytep row = new png_byte[rowWidth];

  size_t missedBytes = 0;
  for (long i = 0; i < options->height; ++i)
  {
    size_t r = fread(row, sizeof(png_byte), rowWidth, ifh);
    if (r != rowWidth)
    {
      if (missedBytes == 0)
      {
        fprintf(stderr, "ERROR: %ld bytes read instead of %ld in row %ld.\n"
                        "Further read error messages are hidden.\n",
                (long) r, (long) rowWidth, i);
      }
      missedBytes += rowWidth - r;
    }
    png_write_row(png_ptr, row);
  }

  if (missedBytes != 0)
  {
    fprintf(stderr, "ERROR: %ld bytes missed.\n", missedBytes);
  }

  freeArraySafe(row);

  png_time modification_time;
  png_convert_from_time_t(&modification_time, time(NULL));
  png_set_tIME(png_ptr, info_ptr, &modification_time);

  png_write_end(png_ptr, info_ptr);
  png_destroy_write_struct(&png_ptr, &info_ptr);

  closeAll();
  return 0;
}
