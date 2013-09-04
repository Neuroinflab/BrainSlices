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
#include <cctype>
#include <cstdio>
#include <cstdlib>

#include <string>

#include "ScaleCommandlineParser.h"

#ifndef STREAMCOMMANDLINEPARSER_H
#define STREAMCOMMANDLINEPARSER_H

class StreamCommandlineParser : public ScaleCommandlineParser
{
  protected:
    virtual void parseArg(std::string & option, std::string & upperoption)
    {
      if (option == "-dst" || upperoption == "DST")
      {
        this->dst = this->nextArg();
      }
      else
      {
        ScaleCommandlineParser::parseArg(option, upperoption);
      }
    }

  public:
    std::string dst;

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
        fprintf(fh, "[-dst <destination filename>]%c",
                    final ? '\n' : ' ');
      }
      else
      {
        fprintf(fh, "DST/K%c", final ? '\n' : ',');
      }
    }

    StreamCommandlineParser(int argc, char * argv[], bool final = true) :
       ScaleCommandlineParser(argc, argv, false)
    {
      this->dst = "-";

      if (final)
      {
        this->parse();
      }
    }
};

#endif
