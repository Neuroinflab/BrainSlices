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

#include "CommandlineParser.h"

#ifndef SCALECOMMANDLINEPARSER_H
#define SCALECOMMANDLINEPARSER_H

enum FilterType {LANCZOS, BOX, TRIANGLE, SUM};

class ScaleCommandlineParser : public CommandlineParser
{
  protected:
    void srcWidthParse()
    {
      this->srcWidth = this->plParse("ERROR: Source width must be a positive "
                                     "integer.\n");
    }

    void srcHeightParse()
    {
      this->srcHeight = this->plParse("ERROR: Source height must be a positive "
                                      "integer.\n");
    }

    void srcSizeParse()
    {
      this->srcWidthParse();
      this->srcHeightParse();
    }

    void channelsParse()
    {
      this->channels = this->nextArg();
      for (std::string::iterator it = this->channels.begin();
           it != this->channels.end(); it++)
      {
        *it = toupper(*it);
        if (*it != 'R' && *it != 'G' && *it != 'B' && *it != 'A' && *it != 'C'
            && *it != 'Y' && *it != 'M' && *it != 'K' && *it != 'I')
        {
          fputs("ERROR: Channels must be a string composed of 'R', 'G', 'B', "
                "'A', 'C', 'Y', 'M', 'K', 'I'.\n", stderr);
          this->parseError = true;
          break;
        }
      }
    }

    void scaledWidthParse()
    {
      this->scaledWidth = this->plParse("ERROR: Scaled width must be a positive "
                                        "integer.\n");
    }

    void scaledHeightParse()
    {
      this->scaledHeight = this->plParse("ERROR: Scaled height must be a positive "
                                         "integer.\n");
    }

    void scaledSizeParse()
    {
      this->scaledWidthParse();
      this->scaledHeightParse();
    }

    void radiusParse()
    {
      this->radius = this->udParse("ERROR: Radius must be a positive number.\n");
    }

    void nodesParse()
    {
      this->interpolationNodes = this->ulParse("ERROR: Number of quadrature nodes"
                                               " must be a natural number.\n");
    }

    void limitParse()
    {
      this->memoryLimit = this->ulParse("ERROR: Memory limit must be a natural"
                                        " number.\n");
    }

    void cropLeftParse()
    {
      this->cropLeft = this->ulParse("ERROR: left crop offset must be a natural"
                                     " number.\n");
    }

    void cropTopParse()
    {
      this->cropTop = this->ulParse("ERROR: top crop offset must be a natural"
                                    " number.\n");
    }

    void cropWidthParse()
    {
      this->cropWidth = this->plParse("ERROR: crop area width must be a "
                                      "positive integer.\n");
    }

    void cropHeightParse()
    {
      this->cropHeight = this->plParse("ERROR: crop area height must be a "
                                       "positive intefer.\n");
    }

    void cropSizeParse()
    {
      this->cropLeftParse();
      this->cropTopParse();
      this->cropWidthParse();
      this->cropHeightParse();
    }

    virtual void parseArg(std::string & option, std::string & upperoption)
    {
      if (option == "-size")
      {
        this->srcSizeParse();
      }
      else if (upperoption == "WIDTH")
      {
        this->srcWidthParse();
      }
      else if (upperoption == "HEIGHT")
      {
        this->srcHeightParse();
      }
      else if (option == "-channels" || upperoption == "CHANNELS")
      {
        this->channelsParse();
      }
      else if (option == "-char" || upperoption == "CHAR")
      {
        this->maxval = 255;
      }
      else if (option == "-short" || upperoption == "SHORT")
      {
        this->maxval = 65535;
      }
      else if (option == "-linear" || upperoption == "LINEAR")
      {
        this->linear = true;
      }
      else if (option == "-subjective" || upperoption == "SUBJECTIVE")
      {
        this->linear = false;
      }
      else if (option == "-scale")
      {
        this->scaledSizeParse();
      }
      else if (upperoption == "SCALEDWIDTH")
      {
        this->scaledWidthParse();
      }
      else if (upperoption == "SCALEDHEIGHT")
      {
        this->scaledHeightParse();
      }
      else if (option == "-triangle" || upperoption == "TRIANGLE")
      {
        this->filter = TRIANGLE;
      }
      else if (option == "-lanczos" || upperoption == "LANCZOS")
      {
        this->filter = LANCZOS;
      }
      else if (option == "-box" || upperoption == "BOX")
      {
        this->filter = BOX;
      }
      else if (option == "-sum" || upperoption == "SUM")
      {
        this->filter = SUM;
      }
      else if (option == "-radius" || upperoption == "RADIUS")
      {
        this->radiusParse();
      }
      else if (option == "-nodes" || upperoption == "NODES")
      {
        this->nodesParse();
      }
      else if (option == "-limit" || upperoption == "LIMIT")
      {
        this->limitParse();
      }
      else if (option == "-threads" || upperoption == "THREADS")
      {
        this->threads = this->plParse("ERROR: Thread number must be a positive"
                                      " integer.\n");
      }
      else if (option == "-crop")
      {
        this->cropSizeParse();
      }
      else if (upperoption == "CROPLEFT")
      {
        this->cropLeftParse();
      }
      else if (upperoption == "CROPTOP")
      {
        this->cropTopParse();
      }
      else if (upperoption == "CROPWIDTH")
      {
        this->cropWidthParse();
      }
      else if (upperoption == "CROPHEIGHT")
      {
        this->cropHeightParse();
      }
      else if (option == "-src" || upperoption == "SRC")
      {
        this->src = this->nextArg();
      }
      else
      {
        CommandlineParser::parseArg(option, upperoption);
      }
    }

    virtual void finish()
    {
      CommandlineParser::finish();

      if (this->srcWidth == 0 || this->srcHeight == 0)
      {
        fputs("ERROR: Source size must be given.\n", stderr);
        exit(1);
      }

      if (this->scaledWidth == 0)
      {
        this->scaledWidth = this->srcWidth;
      }

      if (this->scaledHeight == 0)
      {
        this->scaledHeight = this->srcHeight;
      }

      if (this->cropWidth + this->cropLeft > this->scaledWidth
          || this->cropHeight + this->cropTop > this->scaledHeight)
      {
        fputs("ERROR: Crop area must be within scaled image.\n", stderr);
        exit(1);
      }

      if (this->cropWidth == 0)
      {
        this->cropWidth = this->scaledWidth - this->cropTop;
      }

      if (this->cropHeight == 0)
      {
        this->cropHeight = this->scaledHeight - this->cropTop;
      }

      if (this->radius < 0)
      {
        switch (this->filter)
        {
          case LANCZOS:
            this->radius = 3.0;
            break;

          case BOX:
            this->radius = 0.5;
            break;

          default:
            this->radius = 1.0;
            break;
        }
      }
    }

  public:
    unsigned long srcWidth;
    unsigned long srcHeight;
    int maxval;
    std::string channels;
    unsigned long scaledWidth;
    unsigned long scaledHeight;
    unsigned long cropWidth;
    unsigned long cropHeight;
    unsigned long cropTop;
    unsigned long cropLeft;
    bool linear;
    double radius;
    unsigned long memoryLimit;
    unsigned long interpolationNodes;
    FilterType filter;
    unsigned long threads;
    std::string src;

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
        fprintf(fh, "-size <width> <height> [-channels <channels>] \\\n"
                    "[-char|-short] [-linear|-subjective] [-scale <width> "
                    "<height>] \\\n"
                    "[-triangle|-lanczos|-box|-sum] [-radius <radius>] \\\n"
                    "[-nodes <filter interpolation nodes>] [-limit <memory "
                    "limit>] \\\n"
                    "[-threads <n>] [-crop <left> <top> <width> <height>] "
                    "\\\n"
                    "[-src <source filename>]%c",
                    final ? '\n' : ' ');
      }
      else
      {
        fprintf(fh, "WIDTH/A/K/N,HEIGHT/A/K/N,CHANNELS/K,CHAR/S,SHORT/S,"
                    "LINEAR/S,SUBJECTIVE/S,SCALEDWIDTH/K/N,SCALEDHEIGHT/K/N,"
                    "TRIANGLE/S,LANCZOS/S,BOX/S,SUM/S,RADIUS/K/N,NODES/K/N,"
                    "LIMIT/K/N,THREADS/K/N,CROPLEFT/K/N,CROPTOP/K/N,CROPWIDTH/K/N,"
                    "CROPHEIGHT/K/N,SRC/K%c", final ? '\n' : ',');
      }
    }

    ScaleCommandlineParser(int argc, char * argv[], bool final = true) :
       CommandlineParser(argc, argv, false)
    {
      this->srcWidth = 0;
      this->srcHeight = 0;
      this->maxval = 255;
      this->channels = "RGB";
      this->linear = false;
      this->scaledWidth = 0;
      this->scaledHeight = 0;
      this->cropWidth = 0;
      this->cropHeight = 0;
      this->cropTop = 0;
      this->cropLeft = 0;
      this->radius = -1;
      this->memoryLimit = 0;
      this->interpolationNodes = 0;
      this->filter = LANCZOS;
      this->threads = 1;
      this->src = "-";

      if (final)
      {
        this->parse();
      }
    }
};

#endif
