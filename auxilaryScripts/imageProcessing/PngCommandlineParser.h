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
#include <cctype>
#include <cstdio>
#include <cstdlib>

#include <string>

#include <png.h>

#include "CommandlineParser.h"

#ifndef PNGCOMMANDLINEPARSER_H
#define PNGCOMMANDLINEPARSER_H

class PngCommandlineParser : public CommandlineParser
{
  protected:
    void widthParse()
    {
      this->width = this->plParse("ERROR: Source width must be a positive "
                                  "integer.\n");
    }

    void heightParse()
    {
      this->height = this->plParse("ERROR: Source height must be a positive "
                                   "integer.\n");
    }

    void sizeParse()
    {
      this->widthParse();
      this->heightParse();
    }

    void limitParse()
    {
      this->memoryLimit = this->ulParse("ERROR: Memory limit must be a natural"
                                        " number.\n");
    }

    void compressionParse()
    {
      this->compressionLevel = this->lRangeParse(0, 9,
                                                 "ERROR: compression must be"
                                                 "within [0, 9] range.");
    }

    virtual void parseArg(std::string & option, std::string & upperoption)
    {
      if (option == "-size")
      {
        this->sizeParse();
      }
      else if (upperoption == "WIDTH")
      {
        this->widthParse();
      }
      else if (upperoption == "HEIGHT")
      {
        this->heightParse();
      }
      else if (option == "-src" || upperoption == "SRC")
      {
        this->src = this->nextArg();
      }
      else if (option == "-dst" || upperoption == "DST")
      {
        this->dst = this->nextArg();
      }
      else if (option == "-limit" || upperoption == "LIMIT")
      {
        this->limitParse();
      }
      else if (option == "-compression" || upperoption == "COMPRESSION")
      {
        this->compressionParse();
      }
      else if (option == "-huffman" || upperoption == "HUFFMAN")
      {
        this->compressionStrategy = Z_HUFFMAN_ONLY;
      }
      else if (option == "-rle" || upperoption == "RLE")
      {
        this->compressionStrategy = Z_RLE;
      }
      else if (option == "-filtered" || upperoption == "FILTERED")
      {
        this->compressionStrategy = Z_FILTERED;
      }
      else
      {
        CommandlineParser::parseArg(option, upperoption);
      }
    }

    virtual void finish()
    {
      CommandlineParser::finish();

      if (this->width == 0 || this->height == 0)
      {
        fputs("ERROR: Source size must be given.\n", stderr);
        exit(1);
      }
    }

  public:
    unsigned long width;
    unsigned long height;
    std::string src;
    std::string dst;
    unsigned long memoryLimit;
    int compressionLevel;
    int compressionStrategy;

    virtual void help(bool posix = true,
                      FILE * fh = NULL,
                      bool final = true)
    {
      if (fh == NULL)
      {
        fh = stderr;
      }
      CommandlineParser::help(posix, fh, false);

      if (posix)
      {
        fprintf(fh, "-size <width> <height> [-src <source filename>] \\\n"
                    "[-dst <destination filename>] [-limit <memory limit>]"
                    " \\\n[-compression <level>] [-huffman|-rle|-filtered]"
                    "%c", final ? '\n' : ' ');
      }
      else
      {
        fprintf(fh, "WIDTH/A/K/N,HEIGHT/A/K/N,SRC/K,DST/K,LIMIT/K/N,"
                    "COMPRESSION/K/N,HUFFMAN/S,RLE/S,FILTERED/S%c",
                    final ? '\n' : ',');
      }
    }

    PngCommandlineParser(int argc, char * argv[], bool final = true) :
       CommandlineParser(argc, argv, false)
    {
      this->width = 0;
      this->height = 0;
      this->src = "-";
      this->dst = "-";
      this->memoryLimit = 0;
      this->compressionLevel = Z_DEFAULT_COMPRESSION;
      this->compressionStrategy = Z_DEFAULT_STRATEGY;

      if (final)
      {
        this->parse();
      }
    }
};

#endif
