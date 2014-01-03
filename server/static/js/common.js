/*****************************************************************************\
*                                                                             *
*    This file is part of BrainSlices Software                                *
*                                                                             *
*    Copyright (C) 2012-2013 J. M. Kowalski, J. Potworowski                   *
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

/*****************************************************************************\
 * Namespace: BrainSlices                                                    *
 *                                                                           *
 * An object emulating namespace for BrainSlices framework                   *
\*****************************************************************************/

var BrainSlices = {
  gui:
  {
    /**
     * Constant: STATUS_MAP
     * Mapping of integers to description
     * strings of statuses taken from
     * tileBase.py.
    \*************************************/
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
      if (width == null) width = 128;
      if (height == null) height = 128;
      if (imageWidth / width > imageHeight / height)
      {
        height = Math.round(width * imageHeight / imageWidth);
      }
      else
      {
        width = Math.round(height * imageWidth / imageHeight);
      }
      return $("<img />").attr({src: '/images/'+iid+'/tiles/0/0/0.jpg',
                                alt: 'thumbnail of image #' + iid}).addClass("polaroid-image").css({width: width + 'px', height: height + 'px'});
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
