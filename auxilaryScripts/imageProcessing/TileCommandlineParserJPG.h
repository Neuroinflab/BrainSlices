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

#include "ScaleCommandlineParser.h"

#ifndef TILECOMMANDLINEPARSERJPG_H
#define TILECOMMANDLINEPARSERJPG_H

class TileCommandlineParserJPG : public ScaleCommandlineParser
{
  protected:
    void tileWidthParse()
    {
      this->tileWidth = this->plParse("ERROR: Tile width must be a positive "
                                      "integer.\n");
    }

    void tileHeightParse()
    {
      this->tileHeight = this->plParse("ERROR: Tile height must be a positive "
                                       "integer.\n");
    }

    void filenamePatternParse()
    {
      this->filenamePattern = this->nextArg();
    }

    void tileSizeParse()
    {
      this->tileWidthParse();
      this->tileHeightParse();
    }

    virtual void parseArg(std::string & option, std::string & upperoption)
    {
      if (option == "-tile")
      {
        this->tileSizeParse();
      }
      else if (upperoption == "TILEWIDTH")
      {
        this->tileWidthParse();
      }
      else if (upperoption == "TILEHEIGHT")
      {
        this->tileHeightParse();
      }
      else if (upperoption == "PATTERN" || option == "-pattern")
      {
        this->filenamePatternParse();
      }
      else if (upperoption == "QUALITY" || option == "-quality")
      {
        const char * onerror = "ERROR: Quality must be an integer from 0"
                               " to 100.\n";
        this->quality = this->ulParse(onerror);
        if (this->quality > 100)
        {
          this->parseError = true;
          fputs(onerror, stderr);
        }
      }
      else
      {
        ScaleCommandlineParser::parseArg(option, upperoption);
      }
    }

    virtual void finish()
    {
      ScaleCommandlineParser::finish();

      if (this->tileWidth == 0)
      {
        this->tileWidth = this->cropWidth;
      }

      if (this->tileHeight == 0)
      {
        this->tileHeight = this->cropHeight;
      }

      if (this->filenamePattern == "")
      {
        fputs("ERROR: Tile filename pattern must be given.\n", stderr);
        exit(1);
      }
    }

  public:
    unsigned long tileWidth;
    unsigned long tileHeight;
    std::string filenamePattern;
    unsigned long quality;

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
                "\\\n"
                "[-tile <width> <height>] -pattern <filename pattern> \\\n"
                "[-quality <quality>]%c", final ? '\n' : ' ');
      }
      else
      {
        fprintf(fh, "TILEWIDTH/K/N,TILEHEIGHT/K/N,PATTERN/A/K,"
                    "QUALITY/K/N%c", final ? '\n' : ',');
      }
    }

    TileCommandlineParserJPG(int argc, char * argv[], bool final = true) :
       ScaleCommandlineParser(argc, argv, false)
    {
      this->tileWidth = 0;
      this->tileHeight = 0;
      this->filenamePattern = "";
      this->quality = -1;

      if (final)
      {
        this->parse();
      }
    }
};

#endif
