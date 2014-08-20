/* File: common.js; TO BE DOCUMENTED */
/*****************************************************************************\
*                                                                             *
*    This file is part of BrainSlices Software                                *
*                                                                             *
*    Copyright (C) 2012-2014 J. M. Kowalski, J. Potworowski                   *
*                                                                             *
*    BrainSlices software is free software: you can redistribute it and/or    *
*    modify it under the terms of the GNU General Public License as           *
*    published by the Free Software Foundation, either version 3 of the       *
*    License, or (at your option) any later version.                          *
*                                                                             *
*    BrainSlices software is distributed in the hope that it will be useful,  *
*    but WITHOUT ANY WARRANTY; without even the implied warranty of           *
*    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the            *
*    GNU General Public License for more details.                             *
*                                                                             *
*    You should have received a copy of the GNU General Public License        *
*    along with BrainSlices software.                                         *
*    If not, see http://www.gnu.org/licenses/.                                *
*                                                                             *
\*****************************************************************************/

/**
 * Console fix in case browser does not support some methods
\************************************************************/
(function($, undefined)
{
  //a console fix
  function consoleLog()
  {
    console.log.apply(console, arguments);
  }

  var consolePredefined = 
  {
    log: function()
    {
      $('#debugConsole')
        .append($('<li>')
                  .text(arguments.join('\n')));
    },
    warn: consoleLog,
    error: consoleLog,
    assert: function()
    {
      if (arguments.length > 0 && !arguments[0])
      {
        console.error.apply(console, srguments.slice(1));
      }
    },
    debug: consoleLog,
    info: consoleLog
  }

  if (typeof(console) == 'undefined')
  {
    console = {};
  }

  for (var method in consolePredefined)
  {
    if ((!method in console))
    {
      console[method] = consolePredefined[method];
    }
  }

  if (!('assert' in console))
  {
    console.assert = function(condition, msg)
    {
      if (!condition)
      {
        console.error(msg);
      }
    }
  }
})(jQuery);

/*****************************************************************************\
 * Namespace: BrainSlices                                                    *
 *                                                                           *
 * An object emulating namespace for BrainSlices framework                   *
\*****************************************************************************/

var BrainSlices = {
  aux:
  {
    getTrigger:
    function(name, triggers)
    {
      if (!triggers) return null;
      return name in triggers ? triggers[name] : null;
    }
  },
  api: {},
  gui:
  {
    /**
     * Constant: STATUS_MAP
     *
     * Mapping of integers to description strings of statuses taken from
     * tileBase.py.
     *
     * Mapping:
     *   0 - UPLOADING
     *   1 - RECEIVING
     *   2 - RECEIVED
     *   3 - PROCESSING
     *   4 - IDENTIFIED
     *   5 - TILED
     *   6 - COMPLETED
     *   7 - ACCEPTED
     *   -1 - REMOVED
     *   -2 - ERROR
    \********************************************************************/
    STATUS_MAP: {'0': 'UPLOADING',
                 '1': 'RECEIVING',
                 '2': 'RECEIVED',
                 '3': 'PROCESSING',
                 '4': 'IDENTIFIED',
                 '5': 'TILED',
                 '6': 'COMPLETED',
                 '7': 'ACCEPTED',
                 '-1': 'REMOVED',
                 '-2': 'ERROR'},

    /**
     * Function: getThumbnail
     *
     * Create DOM IMG element containing a thumbnail of the image.
     *
     * Parameters:
     *   iid - an image identifier in BrainSlices repository
     *   imageWidth - image width
     *   imageHeight - image height
     *   width - desired thumbnail width (in pixels; defaults to 128)
     *   height - desired thumbnail height (in pixels; defaults to 128)
    \************************************************************************/
    getThumbnail: function(iid, imageWidth, imageHeight, width, height)
    {
      var paddingTop = '0 ';
      var paddingBottom = '0 ';
      var paddingLeft = '0 ';
      var paddingRight = '0 ';
      var delta, imgWidth, imgHeight;

      if (width == null) width = 128;
      if (height == null) height = 128;
      if (imageWidth / width > imageHeight / height)
      {
        imgWidth = width;
        imgHeight = Math.round(width * imageHeight / imageWidth);
        delta = 0.5 * (height - imgHeight);
        paddingTop = Math.floor(delta) + 'px ';
        paddingBottom = Math.ceil(delta) + 'px ';
      }
      else
      {
        imgHeight= height;
        imgWidth = Math.round(height * imageWidth / imageHeight);
        delta = 0.5 * (width - imgWidth);
        paddingLeft = Math.floor(delta) + 'px ';
        paddingRight = Math.ceil(delta) + 'px ';
      }
      return $("<img />")
               .attr({src: '/images/'+iid+'/tiles/0/0/0.jpg',
                      alt: 'thumbnail of image #' + iid})
               .addClass("polaroid-image")
               .css({width: imgWidth + 'px',
                     height: imgHeight + 'px',
                     'box-sizing': 'content-box',
                     'padding': paddingTop + paddingRight + paddingBottom + paddingLeft});
    },

    /**
     * Function: hDistance
     *
     * Parameters:
     *  distance - a distance to be converted (given in um)
     *  significant - affects a precision of the returned string; defaults to
     *                3
     *  toLog - affects a precision of the returned string; defaults to
     *          abs(<distance>)
     *
     * Returns:
     *  Human readible string representing given distance.
     *  A precision of the string is computed based on the <significant> and
     *  <toLog> parameters:
     *  1. a suitable SI unit is being chosen for <toLog>,
     *  2. a minimal precision is taken that for the unit both:
     *     - preserves integer part of <toLog>,
     *     - preserves <significant> significant digits of <toLog>.
     ************************************************************************/
    hDistance: function(distance, significant, toLog)
    {
      //distance = parseFloat(distance); //unnecessary due to lack of addition
    
      if (distance == 0.)
      {
        return '0';
      }
    
      significant = significant == null ? 2 : parseInt(significant) - 1;
    
      if (toLog == null) toLog = Math.abs(distance);
    
      var log10floor = Math.floor(Math.log(toLog) * Math.LOG10E); // order of toLog
      var u = parseInt(Math.floor(log10floor / 3)); // order of unit
      var n = parseInt(significant - (log10floor - 3 * u));
      if (n < 0) n = 0;
    
      var val = (distance / Math.pow(1000, u)).toFixed(n);
    
      switch (u)
      {
        case 3:
          unit = '\u00a0km';
          break;
    
        case 2:
          unit = '\u00a0m';
          break;
    
        case 1:
          unit = '\u00a0mm';
          break;
    
        case 0:
          unit = '\u00a0\u03BCm';
          break;
    
        case -1:
          unit = '\u00a0nm';
          break;
    
        case -2:
          unit = '\u00a0pm';
          break;
    
        default:
          val = (distance / Math.pow(10, log10floor)).toFixed(significant);
          unit = 'e' + (log10floor - 6) + '\u00a0m';
      }
    
      return val + unit;
    },

    hSize: 
    function(size, space)
    {
    /**
     * Function: hSize
     *
     * Parameters:
     *   size - A number of bytes.
     *   space - string to be used as separator between number and units.
     *
     * Returns:
     *   Human-readible string representing given amount of data.
     *************************************************************/
      if (!space) space = '\xa0'; //'&nbsp;'

      if (size < 1024)
      {
        return size + space + 'B';
      }

      if (size < 1024 * 1024)
      {
        return (size / 1024.).toFixed(1) + space + 'KiB';
      }
      if (size < 1024 * 1024 * 1024)
      {
        return (size / (1024. * 1024)).toFixed(1) + space + 'MiB';
      }
      if (size < 1024. * 1024 * 1024 * 1024)
      {
        return (size / (1024. * 1024 * 1024)).toFixed(1) + space + 'GiB';
      }
      return (size / (1024. * 1024 * 1024 * 1024)).toFixed(1) + space + 'TiB';
    },

    escapeHTML: function(s)
    {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
    }
  },

  ajax:
  {
    errorHandler: function(xhr, textStatus, errorThrown)
    {
      var errormsg = "Server returned error:\n";
      errormsg += "Ready state :" + xhr.readyState + "\n";
      errormsg += "Status " + xhr.status + ", " + errorThrown + "\n";
      //errormsg += "Response text" + xhr.responseText
      console.error('Server returned error:');
      console.error('Ready state:' + xhr.readyState);
      console.error('Status ' + xhr.status + ', ' + errorThrown);
      console.error('Response text: ' + xhr.responseText);
      alert(errormsg);
    },

    customErrorHandler: function(onFailure)
    {
      return function(xhr, textStatus, errorThrown)
      {
        var errormsg = "Server returned error:\n";
        errormsg += "Ready state :" + xhr.readyState + "\n";
        errormsg += "Status " + xhr.status + ", " + errorThrown + "\n";
        //errormsg += "Response text" + xhr.responseText
        console.error('Server returned error:');
        console.error('Ready state:' + xhr.readyState);
        console.error('Status ' + xhr.status + ', ' + errorThrown);
        console.error('Response text: ' + xhr.responseText);
        onFailure(errormsg);
      }
    }
  },

  forms:
  {
    validEmail: function(email, question)
    {
      if (email.match(/^.+@.+$/) == null)
      {
        return false;
      }

      if (question != null && email.match(/^((\w|-)+(\.(\w|-)+)*@(\w|-)+(\.(\w|-)+)+)$/) == null)
      {
        return confirm(question);
      }
      return true;
    },

    validLogin: function(login)
    {
      return login.match(/^[a-z0-9-+_.*]+$/i) != null;
    }
  }
}
