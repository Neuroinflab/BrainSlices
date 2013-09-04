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

/* file derived from AmiX by ABUKAJ (J.M.Kowalski) */
#include <cctype>
#include <cstdio>
#include <cstdlib>

#include <string>

#ifndef COMMANDLINEPARSER_H
#define COMMANDLINEPARSER_H

class CommandlineParser
{
  private:
    char * * argv;

  protected:
    bool parseError;
    char * * arg;
    char * * argsEnd;

    const char * nextArg(char * onerror = NULL)
    {
      if (this->arg != this->argsEnd)
      {
        return *this->arg++;
      }
      this->parseError = true;
      fputs(onerror == NULL ? "ERROR: Insufficient number of args.\n" : onerror,
            stderr);
      return *this->arg;
    }

    unsigned long ulParse(const char * onerror)
    {
      unsigned long res;
      if (0 == sscanf(this->nextArg(), "%lu", &res))
      {
        fputs(onerror, stderr);
        this->parseError = true;
      }
      return res;
    }

    unsigned long plParse(const char * onerror)
    {
      unsigned long res = strtol(this->nextArg(), NULL, 0);
      if (res == 0)
      {
        fputs(onerror, stderr);
        this->parseError = true;
      }
      return res;
    }

    long lParse(const char * onerror)
    {
      long res;
      if (0 == sscanf(this->nextArg(), "%ld", &res))
      {
        fputs(onerror, stderr);
        this->parseError = true;
      }
      return res;
    }

    unsigned long ulRangeParse(unsigned long minVal, unsigned long maxVal,
                               const char * onerror)
    {
      unsigned long res;
      if (0 == sscanf(this->nextArg(), "%lu", &res)
          || res < minVal || res > maxVal)
      {
        fputs(onerror, stderr);
        this->parseError = true;
      }
      return res;
    }

    long lRangeParse(long minVal, long maxVal, const char * onerror)
    {
      long res;
      if (0 == sscanf(this->nextArg(), "%ld", &res)
          || res < minVal || res > maxVal)
      {
        fputs(onerror, stderr);
        this->parseError = true;
      }
      return res;
    }

    double dParse(const char * onerror)
    {
      long double res;
      if (0 == sscanf(this->nextArg(), "%Lf", &res))
      {
        fputs(onerror, stderr);
        this->parseError = true;
      }
      return res;
    }

    double udParse(const char * onerror)
    {
      long double res;
      if (0 == sscanf(this->nextArg(), "%Lf", &res) || res < 0)
      {
        fputs(onerror, stderr);
        this->parseError = true;
      }
      return res;
    }

    virtual void parseArg(std::string & option, std::string & upperoption)
    {
      if (option == "?")
      {
        this->help(false);
        exit(0);
      }
      else if (option == "-help" || option == "-h" || option == "--help")
      {
        this->help();
        exit(0);
      }
      else
      {
        this->parseError = true;
        fprintf(stderr, "ERROR: Unknown option: %s.\n", option.c_str());
      }
    }

    virtual void finish()
    {
      if (this->parseError)
      {
        exit(1);
      }
    }

    virtual void parse()
    {
      while (this->arg != this->argsEnd)
      {
        std::string option = this->nextArg();
        std::string upperoption = option;

        for (unsigned int j = 0; j < option.length(); j++)
        {
          upperoption[j] = toupper(option[j]);
        }

        this->parseArg(option, upperoption);
      }

      this->finish();
    }

  public:
    virtual void help(bool posix = true,
                      FILE * fh = NULL,
                      bool final = true)
    {
      if (fh == NULL)
      {
        fh = stderr;
      }

      if (posix)
      {
        fprintf(fh, "USAGE:\n"
                    "%s [-]-help|-h\n"
                    "%s%c",
                    this->argv[0], this->argv[0], final ? '\n' : ' ');
      }
    }

    CommandlineParser(int argc, char * argv[], bool final = true)
    {
      this->parseError = false;
      this->argv = argv;
      this->arg = &argv[1];
      this->argsEnd = &argv[argc];

      if (final)
      {
        this->parse();
      }
    }
};

#endif
