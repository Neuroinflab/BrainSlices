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

#include "TileCommandlineParserJPG.h"

#ifndef TILECOMMANDLINEPARSER_H
#define TILECOMMANDLINEPARSER_H

class TileCommandlineParser : public TileCommandlineParserJPG
{
  protected:
    virtual void parseArg(std::string & option, std::string & upperoption)
    {
      if (upperoption == "MAGICK" || option == "-magick")
      {
        this->magick = this->nextArg();
      }
      else
      {
        TileCommandlineParserJPG::parseArg(option, upperoption);
      }
    }

  public:
    std::string magick;

    virtual void help(bool posix = true,
                      FILE * fh = NULL,
                      bool final = true)
    {
      if (fh == NULL)
      {
        fh = stderr;
      }

      ScaleCommandlineParser::help(posix, fh, false);

      if (posix)
      {
        fprintf(fh,
                "[-magick <magick>]%c", final ? '\n' : ' ');
      }
      else
      {
        fprintf(fh, "MAGICK/K%c", final ? '\n' : ',');
      }
    }

    TileCommandlineParser(int argc, char * argv[], bool final = true) :
       TileCommandlineParserJPG(argc, argv, false)
    {
      this->magick = "";

      if (final)
      {
        this->parse();
      }
    }
};

#endif
