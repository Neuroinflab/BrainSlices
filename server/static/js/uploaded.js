/* File: uploaded.js */
/*****************************************************************************\
*                                                                             *
*    This file is part of BrainSlices Software                                *
*                                                                             *
*    Copyright (C) 2012-2014 J. M. Kowalski, N. Pasumarthy                    *
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

with ({STATUS_MAP: BrainSlices.gui.STATUS_MAP,
       CTableManager: BrainSlices.gui.CTableManager,
       hSize: BrainSlices.gui.hSize})
{
  /**
   * Class: CUploadedImages
   *
   * A stub of a class that stores information about uploaded images.
   *
   * TODO: Reimplement this
   *
   * Attributes:
   *   table - CTableManager object managing information displayed to the user
   *   nextId - An unique ID of next appended image.
   *   lowId  - The lowest valid ID (for debug purposes).
   *   $msg - jQuery object representing message field.
   *   incomlete - A mapping of IIDs of incompleted images to IDs.
   *   ajaxManager - an object providing AJAX connection to the server.
   *
   *******************************
   * Constructor: CUploadedImages
   *
   * Initialize the object.
   *
   * Parameters:
   *   $table - jQuery object representing TABLE (or TBODY, THEAD, TFOOT etc.)
   *            element providing information about uploaded files to the user
   *   images - images objects to be appended (if any).
   *   $msg - jQuery object representing message field.
   *   ajaxProvider - an object providing AJAX connection to the server.
  \**************************************************************************/
  function CUploadedImages($table, images, $msg, ajaxProvider)
  {
    this.table = new BrainSlices.gui.CTableManager($table);
    this.nextId = 0;
    this.$msg = $msg;
    this.incomplete = null;

    var thisInstance = this;
    this.timeoutId = null;
    this.refreshInProgress = false;

    /**
     * Method: refresh
     *
     * Update statuses of current images if necessary.
     *************************************************/
    function refresh()
    {
      if (thisInstance.refreshInProgress) return;

      thisInstance.timeoutId = null;

      console.log('refresh');

      var iids = [];
      for (var iid in thisInstance.incomplete)
      {
        iids.push(iid);
      }

      if (iids.length == 0) return;

      thisInstance.refreshInProgress = true;

      ajaxProvider.ajax(
        '/upload/getImagesStatuses',
        function(response)
        {
          thisInstance.refreshInProgress = false;
          if (response.status)
          {
            console.log(response.data);
            var table = thisInstance.table;
            var incomplete = thisInstance.incomplete;
            var iid_status = response.data;
            for (var i = 0; i < iid_status.length; i++)
            {
              var row = iid_status[i];
              var iid = row.iid;
              if (iid in incomplete)
              {
                var id = incomplete[iid];
                var status = row.status;

                var image = table.get(id);
                if (status != image.status)
                {
                  image.status = status;
                  image.$status.text(STATUS_MAP[status]);
                }

                if (status >= 6 || status < 0)
                {
                  delete incomplete[iid];
                }
              }
            }

            for (var iid in incomplete)
            {
              // XXX: race condition possible
              thisInstance.timeoutId = setTimeout(refresh, 20 * 1000);
              break;
            }
          }
          else
          {
            console.error(response.message);
          }
        },
        { 'iids': iids.join(',') }, null, null, {async: false});
    }

    this.refresh = refresh;

    this.reset(images);
  }

  CUploadedImages.prototype =
  {
    /**
     * Method: reset
     *
     * Replace information about uploaded files with information provided
     * (preserving the order).
     *
     * Parameters:
     *   images - A list of objects describing uploaded files (see <append>
     *            for details). Defaults to [] if not given or null.
     *
     * Returns:
     *   An Array of Ids assigned to images.
    \***********************************************************************/
    reset:
    function(images)
    {
      this.incomplete = {};
      this.table.flush();
      this.lowId = this.nextId;

      if (this.timeoutId != null)
      {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

      var ids = [];

      if (images != null)
      {
        for (var i = 0; i < images.length; i++)
        {
          ids.push(this.append(images[i]));
        }
      }

      return ids;
    },

    message:
    function(msg)
    {
      if (this.$msg)
      {
        this.$msg
          .hide()
          .text(msg)
          .show();
      }
      else
      {
        alert(msg);
      }
    },

    getIds:
    function()
    {
    /**
     * Method: getIds
     *
     * Returns:
     *    An Array of Ids assigned to images (in currently displayed order).
     **********************************************************************/
      return this.table.getOrder();
    },

    append:
    function(image)
    {
    /**
     * Method: append
     *
     * Append information about uploaded file.
     *
     * Parameters:
     *   image - An object describing the uploaded file. The object should
     *           have the following attributes:
     *           - name - name of the file,
     *           - size - size of the file,
     *           - uploaded - number of already uploaded bytes
     *                        (if not given assumed the MD5 computation
     *                         has not started yet),
     *           - crc32 - CRC32 checksum of the uploaded file
     *                     (if not given assumed the upload has not started
     *                      yet - only MD5 computation),
     *           - iid - an IID assigned to the file by the server
     *                   (if not given assumed data has not reached the server
     *                   yet),
     *           - status - a status of the image in the server.
     *
     * Returns:
     *   An ID assigned to the image.
    \************************************************************************/
      var id = this.nextId++;

      var data = {size: image.size};
      var $progress = $('<progress></progress>')
                        .attr('max', image.size);
      var $size = $('<span></span>');

      var $status = $('<td></td>')
        .append($progress)
        .append($size);

      var $iid = $('<td></td>');
      var $crc32 = $('<td></td>');
      var $row = $('<tr></tr>')
//                    .prop('draggable', true)
                    .append($('<td></td>')
                      .prop('draggable', true)
                      .text(image.name))
                    .append($status)
                    .append($iid)
                    .append($crc32);


      var data = {$row: $row,
                  $progress: $progress,
                  $size: $size,
                  $iid: $iid,
                  $crc32: $crc32,
                  $status: $status,
                  size: image.size,
                  name: image.name,
                  status: image.status};

      this.table.add($row, id, null, null, null, null, null, data);

      if (!('uploaded' in image))
      {
        $size.text(hSize(image.size) + ' ready for upload.');
        $crc32.html('<br>');
        $iid.html('<br>');
      }
      else
      {
        this.update(id, image.uploaded, image.crc32, image.iid, image.status);
      }

      if (image.status != null && image.status < 6 && image.status >= 0)
      {
        this.incomplete[image.iid] = id;
        this.refresh();
      }

      return id;
    },

    /**
     * Method: sort
     *
     * Sort the displayed uploaded files by name, then by size
     * (see <imageCMP>)
    \************************************************************************/
    sort:
    function()
    {
      this.table.sort(imageCMP);
    },

    /**
     * Method: remove
     *
     * An alias for <CTableManager.remove>(id).
     *
     * Parametres:
     *   id - to be passed to <CTableManager.remove>
     ***************************************/
    remove:
    function(id)
    {
      this.table.remove(id);
    },

    /**
     * Method: update
     *
     * Updates upload state of a file.
     *
     * Parameters:
     *   id - An identifier of the file.
     *   uploaded - An amount of processed or uploaded bytes.
     *   crc32 - CRC32 checksum of the uploaded data.
     *   iid - An identifier assigned to the file by server.
     *********************************************************/
    update:
    function(id, uploaded, crc32, iid)
    {
      console.assert(id >= this.lowId, 'Obsoleted ID: ' + id);

      var image = this.table.get(id);
      image.uploaded = uploaded;
      var size = hSize(image.size);
      var hUploaded = hSize(uploaded);

      image.$progress.prop('value', uploaded);

      if (crc32 == null)
      {
        image.$size.text('Calculating MD5 (' + hUploaded + ' of ' + size + ').');
      }
      else
      {
        image.crc32 = crc32;
        image.$crc32.text(("00000000" + (crc32 > 0 ? 
                                         crc32 :
                                         0x100000000 - crc32).toString(16))
                          .substr(-8));

        if (iid != null)
        {
          image.$iid.text(iid);
        }

        if (uploaded != image.size)
        {
          image.$size.text(hUploaded + ' of ' + size + ' uploaded.');
        }
        else
        {
          image.$size.text('Upload completed (' + size + ').');
          image.status = 0;
          if (this.incomplete == null)
          {
            this.incomplete = {};
            this.incomplete[image.iid] = id;
            this.refresh();
          }
          else
          {
            this.incomplete[image.iid] = id;
          }
        }
      }
    },

    getUploadMonitor:
    function(id, offset, fraction, crc32, iid)
    {
    /**
     * Function: getUploadMonitor
     *
     * Prepere a custom XHR for progress bar update.
     *
     * Parameters:
     *   id - An identifier in uploaded object.
     *   offset - Number of bytes uploaded in previous requests.
     *   fraction - A number of bytes to be uploaded in the request.
     *
     * Return:
     *   The XHR object.
    \*****************************************************************/
      var uploadedFiles = this;
      return function()
      {
        var myXhr = $.ajaxSettings.xhr();
        if (myXhr.upload) // check if upload property exists
        {
          myXhr.upload.addEventListener(
            'loadstart',
            function()
            {
              uploadedFiles.update(id, offset, crc32, iid);
            }, false);
          myXhr.upload.addEventListener(
            'progress',
            function(e)
            {
              if (e.lengthComputable)
              {
                uploadedFiles.update(id, offset + Math.round(e.loaded * fraction / e.total),
                                crc32, iid);
              }
            },
            false);
          myXhr.upload.addEventListener(
            'load',
            function()
            {
              uploadedFiles.update(id, offset + fraction, crc32, iid);
            },
            false);
          myXhr.upload.addEventListener(
            'error',
            function()
            {
              alert('File Upload: Something went wrong.\nRetry');
              console.error('File Upload: Error!');
              throw 'File Upload: Something went wrong.\nRetry';
            },
            false);
          myXhr.upload.addEventListener(
            'abort',
            function()
            {
              alert('File Upload: Aborted due to some reason.\nRetry');
              console.error('File Upload: Aborted!');
              throw 'File Upload: Aborted due to some reason.\nRetry';
            },
            false);
        }
        return myXhr;
      }
    }
  };
};
