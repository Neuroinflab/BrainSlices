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

#include <string>

#include <jpeglib.h>
//libjpeg dev package required (or so)

#include "ThreadSafeIO.h"

METHODDEF(void) throwException(j_common_ptr cinfo)
{
  throw cinfo;
}

METHODDEF(void) output_messageTS(j_common_ptr cinfo)
{
  char buffer[JMSG_LENGTH_MAX];

  /* Create the message */
  (*cinfo->err->format_message) (cinfo, buffer);

  tsErr.printf("ERROR: %s\n", buffer);
}

void writeTile(std::string filename,
               JSAMPROW * data,
               unsigned long width,
               unsigned long height,
               unsigned long d,
               std::string channels,
               char quality)
{
  FILE * outfile = fopen(filename.c_str(), "wb");
  if (outfile == NULL)
  {
    tsErr.printf("ERROR: Unable to open %s for write.\n",
                 filename.c_str());
    return;
  }

  struct jpeg_compress_struct cinfo;
  struct jpeg_error_mgr jerr;

  cinfo.err = jpeg_std_error(&jerr);
  //jerr.error_exit = throwException;
  //jerr.output_message = output_messageTS;

  try
  {
    jpeg_create_compress(&cinfo);
    jpeg_stdio_dest(&cinfo, outfile);

    cinfo.image_width = width;
    cinfo.image_height = height;
    cinfo.input_components = d;
    if (channels == "RGB")
    {
      cinfo.in_color_space = JCS_RGB;
    }
    else //if (this->channels == "I") //TODO
    {
      cinfo.in_color_space = JCS_GRAYSCALE;
    }

    jpeg_set_defaults(&cinfo);
    cinfo.optimize_coding = TRUE;

    if (quality >= 0)
    {
      jpeg_set_quality(&cinfo, quality, TRUE);
    }

    jpeg_start_compress(&cinfo, TRUE);

    while (cinfo.next_scanline < cinfo.image_height)
    {
      jpeg_write_scanlines(& cinfo,
                           data + cinfo.next_scanline,
                           cinfo.image_height - cinfo.next_scanline);
    }

    jpeg_finish_compress(&cinfo);
  }
  catch (j_common_ptr cinfo_ptr)
  {
    (*cinfo_ptr->err->output_message) (cinfo_ptr);
  }

  fclose(outfile);
  jpeg_destroy_compress(&cinfo);
}
