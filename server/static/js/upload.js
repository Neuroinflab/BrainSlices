/* File: upload.js */
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

/*****************************************************************************\
 * Function: imageCMP                                                        *
 *                                                                           *
 * Compare two objects with attributes: 'name' (comparable) and 'size'       *
 * (numeric). Objects are compared by name, then by size.                    *
 *                                                                           *
 * Parameters:                                                               *
 *    a - The first object.                                                  *
 *    b - The second object.                                                 *
 *                                                                           *
 * Returns:                                                                  *
 *    Negative number if a < b, positive if a > b, zero if a == b.           *
\*****************************************************************************/
function imageCMP(a, b)
{
  // order images by name, then size
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return a.size - b.size;
}

with ({escapeHTML: BrainSlices.gui.escapeHTML,
       getThumbnail: BrainSlices.gui.getThumbnail,
       STATUS_MAP: BrainSlices.gui.STATUS_MAP,
       CCloseableDiv: BrainSlices.gui.CCloseableDiv,
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

      thisInstance.refreshInProgress = true;

      thisInstance.timeoutId = null;

      console.log('refresh');

      var iids = [];
      for (var iid in thisInstance.incomplete)
      {
        iids.push[iid];
      }

      if (iids.length == 0) return;

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
        this.update(id, image.uploaded, image.crc32, image.iid);
      }

      if (image.status != null && image.status < 6 && image.status >= 0)
      {
        this.incompleted[image.iid] = id;
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

  /**
   * Section: Image upload functions
   *
   * Quick and dirty functions for image upload
  \**************************************************************************/

  /**
   * Topic: standart JSON object
   *
   * The response returned by the server after AJAX query is a standarised
   * JSON object.
   *
   * Attributes:
   *   status - A boolean indicating if the requested operation has succeeded.
   *   logged - A boolean indicating if the user is logged to the repository.
   *   message - A string containing an user-friendly message (important in
   *             case of a failure).
   *   data - Additional data provided by the server.
  \**************************************************************************/

  /**************************************************************************\
   * Group: chunked files upload                                            *
  \**************************************************************************/

  /************************************\
   * Constant: CHUNK_SIZE             *
   * The default size of a file chunk *
   * (equals 1 MiB; actualy a global  *
   * variable).                       *
  \************************************/
  var CHUNK_SIZE = 1024 * 1024;

  /**************************************\
   * Constant: MAX_SIMULTANEOUS_UPLOADS *
   * The maximum number of images being *
   * uploaded simultaneously.           *
  \**************************************/
  var MAX_SIMULTANEOUS_UPLOADS = 3;

  /*************************************\
   * Constant: MAX_FILE_SIZE           *
   * The maximum size of file that can *
   * be uploaded.                      *
  \*************************************/
  var MAX_FILE_SIZE = 1024 * 1024 * 1024;

  /*************************************\
   * Constant: MIN_FILE_SIZE           *
   * The minimum size of file that can *
   * be uploaded.                      *
  \*************************************/
  var MIN_FILE_SIZE = 8;



  /*****************************************************************************\
   * Class: CFileUploader                                                      *
   *                                                                           *
   * A quick and dirty stub of a class of object handling file upload panel.   *
   *                                                                           *
   * Attributes:                                                               *
   *   uploaded - A <CUploadedImages> object to provide user with information  *
   *              about uploaded files.                                        *
   *                                                                           *
   *****************************************************************************
   * Constructor: CFileUploader                                                *
   *                                                                           *
   * Initialize the object.                                                    *
   *                                                                           *
   * Parameters:                                                               *
   *   ajaxProvider - An object providing ajax method (possibly of class       *
   *                  <CLoginManager>).                                        *
   *   uploadedFiles - A <CUploadedImages> object to provide user with         *
   *                   information about uploaded files.                       *
   *   $dialog - A jQuery object representing dialog window                    *
   *   getBatchId - A function executed when necessary to get an identifier    *
   *                of the selected batch. The function has one parameter:
   *                a callback to be executed with identifier (passed as an    *
   *                integer argument).                                         *
  \*****************************************************************************/
  var CFileUploader = function(ajaxProvider, uploadedFiles, $dialog, getBatchId)
  {
    this.uploaded = uploadedFiles;

    var files = [];
    var ids = {}; // files selected for upload but not uploaded yet
    // was a good idea when the object was listening to file list changes 
    var iid2id = {};

    var thisInstance = this;

    this.reset = function()
    {
    /**
     * Method: reset
     *
     * Remove from uploaded table all files.
     ***************************************************************/
      this.uploaded.reset();
      ids = {};
      iid2id = {};
    };

    this.append = function(name, size, uploaded, iid, crc32, status)
    {
    /**
     * Method: append
     *
     * Append a file to the upload table.
     *
     * Parameters:
     *   name - A label of the file.
     *   size - Declared size of the file.
     *   uploaded - Size of already uploaded part of the file.
     *   iid - An identifier of the file in the database.
     *   crc32 - A checksum of the uploaded part of the file.
     *   status - Status of the image (if given).
     *
     * Returns:
     *   An identifier in the uploaded table.
     **********************************************************/
      var id = this.uploaded.append({name: name,
                                     size: size,
                                     uploaded: uploaded,
                                     iid: iid,
                                     crc32: crc32,
                                     status: status});
      if (iid)
      {
        console.assert(!(iid in iid2id));
        iid2id[iid] = id;
      }

      return id;
    };

    this.remove = function(id)
    {
    /**
     * Method: remove
     *
     * An alias to <CUploadedImages.remove>(id).
     *
     * Parameters:
     *   id - A parameter to be passed to <CUploadedImages.remove>.
     ****************************************************************/
      this.uploaded.remove(id);
    };

    var afterUpload = null;

    this.submit = function(fileList, filter, finalFunction)
    {
    /**
     * Method: submit
     *
     * Upload files.
     *
     * Parameters:
     *   fileList - An array of files to be uploaded.
     *   filter - Flag indicating whether to filter out non-image types.
     *   finalFunction - A callback to be called after upload is completed.
     ***********************************************************************/
      afterUpload = finalFunction;
      files = this.filterImageFiles(fileList, filter);
      files.sort(imageCMP);

      var id;

      for (id in ids)
      {
        uploadedFiles.remove(id);
      }
      ids = {};

      for (var i = 0; i < files.length; i++)
      {
        var file = files[i];
        id = uploadedFiles.append(file);
        files[i] = {file: file,
                    id: id};
        ids[id] = true;
      }

      if (files.length == 0)
      {
        alert('No files to upload.');
        return;
      }

      uploadedFiles.message("Preparing upload...")
      calcMD5();
    };

    function calcMD5()
    {
      // Calculation of MD5 checksum
      var chunkSize = 1024 * 1024; // 1 MB chunks for generating MD5 hash key

      var currentFile = 0;
      var currentChunk = 0;
      var nChunks = null;
      var spark = null;
      var file = null;
      var item = null;
      var id = null;

      function digestNextChunk()
      {
        if (currentFile == files.length)
        {
          return checkDuplicates(); //trigger file upload
        }

        if (currentChunk == 0)
        {
          // file processing initization
          item = files[currentFile];
          file = item.file;
          id = item.id;
          nChunks = Math.ceil(file.size / chunkSize);
          spark = new SparkMD5.ArrayBuffer();
          uploadedFiles.update(id, 0);
        }

        if (currentChunk == nChunks)
        {
          item.key = spark.end();
          item.size = file.size;
          item.name = file.name;
          item.type = file.type;
          uploadedFiles.update(id, file.size);
          currentFile++;
          currentChunk = 0;
          return digestNextChunk();
        }

        var fileReader = new FileReader();
        fileReader.onload = function(e)
        {
          spark.append(e.target.result);
          currentChunk++;
          uploadedFiles.update(id, currentChunk * chunkSize);
          return digestNextChunk();
        };
        fileReader.onerror = function(e)
        {
          console.warn("File Key Computation: Something went wrong.");
          alert("Reading File: Something went wrong.\nRefresh page and retry.");
          throw 'MD5 computation error. Upload cannot continue'
        };
        var start = currentChunk * chunkSize,
            end = ((start + chunkSize) >= file.size) ?
                  file.size :
                  start + chunkSize;

        fileReader.readAsArrayBuffer(file.slice(start, end));
      };
      digestNextChunk();
    };



    /**
     * Method: filterImageFiles
     *
     * Filter out files of improper size and (optionally)
     * of non image type.
     *
     * Parameters:
     *   files - An array of files.
     *   filterImages - A switch whether to filter image files.
     *
     * Returns:
     *   filtered array of files
     *
     * Todo:
     *   more sophisticated file type filtering
     ********************************************************/
    this.filterImageFiles = function(files, filterImages)
    {
      var proper = [];
      var tooBig = [], tooSmall = [], nonImage = [];
      var imageType = /image\/.*/;

      // JPEG2000 nokaut
      var jp2 = [], jp2re = /image\/(?:jp[2xm]|mj2)/;

      for (var i = 0; i < files.length; i++)
      {
        var file = files[i];
        if (file.size < MIN_FILE_SIZE)
        {
          tooSmall.push(file.name);
          continue;
        }
        if (file.size > MAX_FILE_SIZE)
        {
          tooBig.push(file.name);
          continue;
        }
        if (filterImages && !file.type.match(imageType))
        {
          nonImage.push(file.name);
          continue;
        }

        // JPEG2000 nokaut
        if (filterImages && file.type.match(jp2re))
        {
          jp2.push(file.name);
          continue;
        }

        proper.push(file);
      }

      if (proper.length < files.length)
      {
        var msg = 'Some of selected files has been filtered out.\n';
        if (tooBig.length > 0)
        {
          msg += 'Files greater than ' + MAX_FILE_SIZE + ' bytes: '
                 + tooBig.join(', ') + '.\n';
        }

        if (tooSmall.length > 0)
        {
          msg += 'Files too small to store any reasonable images: '
                 + tooSmall.join(', ') + '.\n';
        }

        if (nonImage.length > 0)
        {
          msg += 'Files of non-image type: ' + nonImage.join(', ') + '.\n';
        }

        // JPEG2000 nokaut
        if (jp2.length > 0)
        {
          msg += 'Files of unsupported (sorry) JPEG 2000 type: ' + jp2.join(', ') + '.\n';
        }

        alert(msg);
      }
      return proper;
    }

    /*
     * Query server for duplicates
     */
    function checkDuplicates()
    {
      var details = [];
      for (var i = 0; i < files.length; i++)
      {
        var file = files[i]
        details.push(file.key + ',' + file.size)
      }
      ajaxOptions = {async: false};
      ajaxProvider.ajax(
        '/upload/getBrokenDuplicates',
        function(response)
        {
          if (response.status)
          {
            form_dialog(response.data);
          }
          else
          {
            alert(response.message);
          }
        },
        {files_details: details.join(':')},
        function (data)
        {
          alert("Checking File Uploaded Amount: Something went wrong\nRetry upload");
          console.error('Checking File Uploaded Amount: Error!');
          throw 'Error while checking already uploaded amount. Upload cannot continue.'; // Discontinue the process of upload
        },
        null,
        ajaxOptions);
    }

    var to_refresh = [];
    var $dialogContent = $dialog.find('.content');
    var setIntervalId = null;
    var dialog = new CCloseableDiv($dialog,
                                   function()
                                   {
                                     $dialogContent.css('max-height',
                                     Math.round($dialog.height() * 0.8) + 'px');
                                     //do some fancy content scaling
                                   },
                                   function()
                                   {
                                     $dialogContent.empty();
                                     if (setIntervalId != null)
                                     {
                                       clearInterval(setIntervalId);
                                       setIntervalId = null;
                                     }
                                   });

    /*
     * Creates the JQuery UI Dialog for taking user's action for broken and duplicate images
     */
    function form_dialog(data)
    {
      var show_dialog = false;
  //    var $dialog_content = $("<form />"); // Very imp for "cancel" functionality of dialog to work
      var duplicate_iids = [];
      to_refresh = []; //XXX: almost global

      for (var i = 0; i < files.length; i++)
      {
        var file_data = data[i];
        var broken = file_data[0];
        var duplicates = file_data[1];

        if (broken.length > 0 || duplicates.length > 0)
        {
          show_dialog = true;
          var $div = $('<div />');
          $div.append($("<h3 />").text(files[i].name + ":"));

          if (broken.length > 0)
          {
            $div.append(
              $("<h4 />").text("Broken upload"
                               + (broken.length > 1 ? "s:" : ":")));
            var $radio_buttons_div = $("<div />").css("margin-botton", "10px");
            for (var j = 0; j < broken.length; j++)
            {
              var slot = broken[j];
              var slot_iid = slot[0];
              var slot_size = slot[1];
              var percent_uploaded = Math.round(slot_size / files[i].file.size * 100);
              $radio_buttons_div.append($("<input>").attr({type: "radio",
                                                           name: 'upload_radio_' + i,
                                                           value: slot_iid + ',' + slot_size + ',' + slot[3]}));
              $radio_buttons_div.append($("<label />").text(slot[2] + " #" + slot_iid + " (" + percent_uploaded + "%)"));
            }
            $div.append($radio_buttons_div);
          }

          if (duplicates.length > 0)
          {
            $div.append(
              $("<h4 />").text("Duplicate upload"
                               + (duplicates.length > 1 ? "s:" : ":")));
            var $ul = $("<ul />");
            var text; var status = 0; var image = null; var li;
            for (var j = 0; j < duplicates.length; j++)
            {
              var duplicate = duplicates[j];
              var duplicate_iid = duplicate[0];
              var duplicate_status = duplicate[1];
              duplicate_iids.push(duplicate_iid);
              if (duplicate_status < 7)
              {
                to_refresh.push(duplicate_iid);
              }
    //          text = "#" + duplicate[0] + " " + duplicate[2] + " " + duplicate[3] + " " + STATUS_MAP[duplicate[1]];
              var text = "#" + duplicate_iid + " " + duplicate[2] + ". Status: ";
              var $li = $("<li />").text(text);
              $li.append($("<span />").attr({"data-iid": duplicate_iid}).text(STATUS_MAP[duplicate_status]));
              $li.append($("<a />").attr({title: 'Refresh status',
                                          "data-iid": duplicate_iid}).
                  addClass('refreshStatus lmargin10 link').text("Refresh"));
              $ul.append($li);
            }

            $div.append($("<div />").append($ul));
          }

          var $upload_again = $("<div />");
          $upload_again.append($("<input>").attr({type: "radio",
                                                  name: 'upload_radio_' + i,
                                                  value: 'new'}));
          $upload_again.append($("<span />").text(" upload again"));
          $div.append($upload_again);

          var $take_no_action = $("<div />");
          $take_no_action.append($("<input>").attr({type: "radio",
                                                    name: 'upload_radio_' + i,
                                                    value: 'cancel',
                                                    checked: true}));
          $take_no_action.append($("<span />").text(" take no action"));
          $div.append($take_no_action);
          $dialogContent.append($div);
          files[i].$div = $div;
        }
        else
        {
          files[i].$div = null;
        }

        // $dialog_content.append($("<hr />").css("margin", "10px"));
      }

      if (show_dialog)
      {
        dialog.open();
        // Trigger Auto Refresh of status for every 20s
        // TODO: make it better
        // (might be refreshing completed/accepted images)
        //
        // might be a race between two AJAX calls (one late)
        if (duplicate_iids.length > 0)
        {
          if (setIntervalId != null)
          {
            clearInterval(setIntervalId);
          }
          setIntervalId = setInterval(refreshStatusForIids, 20*1000);
        }

        uploadedFiles.message("Pick what to do...");
        refreshStatusForIidsOnce(duplicate_iids, refreshStatusForIidsCallback);
      }
      else
      {
        addUploadFileProperties();
      }
    }

    /*
     * Refresh the status of an image when clicked by making an AJAX call
     */
    // XXX a global trigger!!!
    //
    if ($(".refreshStatus").length>0)
    $(".refreshStatus").live("click", function()
    {
      var iid = $(this).attr('data-iid');
      refreshStatusForIidsiOnce([iid]);
    });

    /*
     * Refreshes the status of passed IIDs
     */
    function refreshStatusForIidsOnce(iids, callback)
    {
      if (iids.length > 0)
      {
        ajaxProvider.ajax(
          '/upload/getImagesStatuses',
          function(response)
          {
            if (response.status)
            {
              var iid_status = response.data;
              var span;
              var not_accepted = [];
              for (var i = 0; i < iid_status.length; i++)
              {
                // XXX: iid_status might be not ordered!!!
                var row = iid_status[i];
                var iid = row.iid;
                var status = row.status;
                span = $dialogContent.find("span[data-iid='"+iid+"']");
                $(span).text(STATUS_MAP[status]);
                $(span).parent("li").find("img").remove(); // Remove existing images if any
                if (status >= 6)
                {
                  $(span).parent("li").append(getThumbnail(iid, row.imageWidth, row.imageHeight));
                }

                if (status < 7)
                {
                  not_accepted.push(iid);
                }
              }

              if (callback)
              {
                callback(not_accepted);
              }
            }
          },
          { 'iids': iids.join(',') }, null, null, {async: false});
      }
    }

  
    function refreshStatusForIidsCallback(not_accepted)
    {
      to_refresh = not_accepted; //XXX: almost global
    }

    function refreshStatusForIids()
    {
      if (to_refresh.length == 0)
      {
        clearInterval(setIntervalId);
        setIntervalId = null;
      }
      else
      {
        refreshStatusForIidsOnce(to_refresh, refreshStatusForIidsCallback);
      }
    }

    /**
     * Preprocess list of files for upload according to the user choice and
     * request upload.
     */
    function addUploadFileProperties()
    {
      dialog.close();

      var cFiles = files.length;
      // XXX
      //var $selected_radios = $("#dialog form").find("input:checked");
      var to_upload = [];
      for (var i = 0; i < cFiles; i++)
      {
        var file = files[i];
        var $radio_ref = file.$div;

        if ($radio_ref)
        {
          var val = $radio_ref.find("input:checked").val();
          if (val == 'cancel')
          {
            uploadedFiles.remove(file.id);
            delete ids[file.id];
            continue;
          }
          if (val != 'new')
          {
            var row = val.split(',');
            file.iid = parseInt(row[0]);
            file.uploaded = parseInt(row[1]);
            file.crc32 = parseInt(row[2]);
            if (file.iid in iid2id)
            {
              var id = iid2id[file.iid];
              uploadedFiles.remove(id);
              delete ids[id];
              iid2id[file.iid] = file.id;
            }
          }
        }
        to_upload.push(file);
      }
      start_file_upload(to_upload);
    }

    $dialog.find('.confirmation_button')
              .unbind('click')
              .bind('click', addUploadFileProperties);


    /*
     * Triggers the upload process. Opens MAX_SIMULTANEOUS_UPLOADS threads for parallel uploads
     */
    function start_file_upload(files)
    {
      if (files.length == 0)
      {
        uploadedFiles.message("Nothing to upload.");
        return;
      }

      uploadedFiles.message("Uploading...");

      // check whether there are new files for upload
  		var uploadNewFiles = false;
  		for (var i = 0; i < files.length; i++)
  		{
  			if (files[i].iid == undefined)
  			{
  				uploadNewFiles = true;
  				break;
  			}
  		}

      if (!uploadNewFiles || !getBatchId)
      {
        uploadChunkedFiles(files, CHUNK_SIZE);
      }
      else
      {
        // if yes - get bid
        getBatchId(function(bid)
        {
          uploadChunkedFiles(files, CHUNK_SIZE, bid);
        });
      }
    }

    /*
     * Final function called after all uploads are completesd
     */
    function do_upload_complete()
    {
      uploadedFiles.message("Upload completed!");
      alert('All images uploaded');
      if (afterUpload) afterUpload(true);
    }

    /**
     * Function: uploadChunkedFiles
     *
     * Upload files as series of data chunks.
     *
     * Parameters:
     *   files - An Array of file description items (containing File objects
     *           itself as well as additional data like size and filename; if a
     *           file upload has to be resumed, also iid and already uploaded
     *           amount of data is provided).
     *
     *   cSize - An integer indicating the maximal size of data chunk to be send
     *           (defaults to <CHUNK_SIZE>).
     *   bid - A unique repository batch identifier. In not null, the uploaded
     *         files would be assigned to that batch.
     *
     * Possible improvements:
     *   - The way the upload of the first file starts?
     **************************************************************************/
    function uploadChunkedFiles(files, cSize, bid)
    {
      if (cSize == null)
      {
        cSize = CHUNK_SIZE;
      }

      var fileNo = 0;
      var inProgress = 0;
      var uploaded = 0;

      /**
       * Function: getSendNextChunkFunction
       *
       * An internal function of <uploadChunkedFiles>.
       *
       * Prepare a handler for file chunk upload feedback that would upload
       * the next chunk if necessary.
       *
       * Parameters:
       *   blob - A Blob (or File) object to be uploaded.
       *   id - An identifier of the file in uploadedFiles.
       *
       * Returns:
       *   The handler (see <sendNextChunk> for details).
      \**********************************************************************/
      function getSendNextChunkFunction(blob, id)
      {
        /**
         * Function: sendNextChunk
         *
         * An internal function of <getSendNextChunkFunction>.
         *
         * Send remaining data chunk by chunk in recurrent (but asynchronous)
         * manner if there is anything to send, otherwise finish the upload
         * process.
         *
         * Parameters:
         *   response - A <standart JSON object>. Its 'data' attribute contains
         *              following attributes: 'size' (number of uploaded bytes),
         *              'iid' (an unique repository identifier of file being
         *              uploaded), 'crc32' (a HEX string of CRC32 checksum of
         *              the uploaded data).
         *
         * Possible improvements:
         *   - Check if it is the last chunk to be uploaded and set 'success'
         *     AJAX handler appropriately instead of checking if the last chunk
         *     has been already sent?
         *   - Provide more explicite data read (if possible)?
         *   - Send data as multipart/form-data?
         **********************************************************************/
        function sendNextChunk(response)
        {
          if (response == null)
          {
            alert('Upload failed.');
            return;
          }
          if (!response.status)
          {
            alert(response.message);
            return;
          }

          if (response.data.size < blob.size)
          {
            // send a next chunk if there is more data to send
            var offset = response.data.size;
            var chunk = blob.slice(offset, offset + cSize);
            var form_data = new FormData();
            var iid = response.data.iid;

            form_data.append('data', chunk);
            form_data.append('iid', iid);
            form_data.append('offset', response.data.size);

            
            console.assert(!(iid in iid2id) || iid2id[iid] == id);
            iid2id[iid] = id;

            ajaxProvider.ajax('/upload/continueImageUpload',
                              sendNextChunk,
                              form_data,
                              function(data)
                              {
                                if (data.status == 0 && data.state() == 'rejected')
                                {
                                  alert("File Upload: Something went wrong. Possibly no network connection.")
                                }
                                else
                                {
                                  alert('File Upload: Something went wrong.\nRetry');
                                  console.error('File Upload: Error!');
                                  throw 'File Upload: Something went wrong.\nRetry';
                                }
                              },
                              null,
                              {processData: false,
                               contentType: false,
                               cache: false,
                               xhr: uploadedFiles.getUploadMonitor(
                                      id, offset,
                                      Math.min(cSize, blob.size - offset),
                                      response.data.crc32,
                                      iid)});
          }
          else
          {
            // if there is no more data to sent finish the file upload
            uploadedFiles.update(id, response.data.size, response.data.crc32,
                                 response.data.iid);
            uploaded++;
            inProgress--;
            if (fileNo < files.length)
            {
              uploadNextFile();
            }
            else
            {
              if (uploaded >= files.length)
              {
                do_upload_complete();
                return;
              }
            }
          }
        }
        return sendNextChunk;
      }


      /**
       * Function: uploadNextFile
       *
       * An internal function of <uploadChunkedFiles>.
       *
       * Make a handler of successful file upload (a function fo be passed as the
       * 'finalFunction' parameter of <getSendNextChunkFunction>).
       *
       * The handler function notifies user about successful upload and starts
       * upload of next file unless all files has been sent.
       *
       * Parameters:
       *   fileNo - An integer. Number of file (in 'files' Array) to be uploaded.
       *
       * Returns:
       *   The handler function.
       *
       * Possible improvements:
       *   - Send multiple files simultaneously?
       *   - Use iteration with 'fileNo' as a counter rather than recurrention
       *     (if fileNo is defined in <uploadChunkedFiles> scope its value is
       *     preserved)?
       *   - Provide more explicite data read (if possible)?
       *   - Send data as multipart/form-data?
       *   - Check if it is the last chunk to be uploaded and set 'success' AJAX
       *     handler appropriately?
       *   - Check if it is the last file to be uploaded and set the
       *     <getSendNextChunkFunction> 'finalFunction' parameter approprietly
       *     instead of checking if the last file has been already sent?
       ***************************************************************************/
      function uploadNextFile(limit)
      {
        if (limit == null)
        {
          limit = MAX_SIMULTANEOUS_UPLOADS;
        }

        while (fileNo < files.length && inProgress < limit)
        {
          var file = files[fileNo];
          fileNo++;
          inProgress++;

          // the first chunk of data will be sent
          var total = file.size;

          delete ids[file.id];

          if (file.iid != null)
          {
            uploadedFiles.update(file.id, file.uploaded, file.crc32, file.iid);
            getSendNextChunkFunction(file.file, file.id)
            ({
              status: true,
              data: {size: file.uploaded,
                     iid: file.iid}
            });
          }
          else
          {
            var form_data = new FormData();
            form_data.append('data', file.file.slice(0, cSize));
            form_data.append('filename', file.name);
            form_data.append('key', file.key);
            form_data.append('size', file.size);
            if (bid != null)
            {
              form_data.append('bid', bid);
            }

            var total = file.size;
            ajaxOptions = {
              cache: false,
              contentType: false,
              processData: false,
              xhr: uploadedFiles.getUploadMonitor(file.id, 0,
                                                  Math.min(cSize, total), 0)};
            ajaxProvider.ajax(
              '/upload/uploadNewImage',
              getSendNextChunkFunction(file.file, file.id),
              form_data,
              function(data)
              {
                if (data.status == 0 && data.state() == 'rejected')
                {
                  alert("File Upload: Something went wrong. Possibly no network connection.")
                }
                else
                {
                  alert('File Upload: Something went wrong.\nRetry');
                  console.error('File Upload: Error!');
                  throw 'File Upload: Something went wrong.\nRetry';
                }
              },
              null,
              ajaxOptions);
          }
        }
      }

      if (files.length == 0 && finalFunction != null)
      {
        finalFunction();
      }

      uploadNextFile();
    }
  }

};
