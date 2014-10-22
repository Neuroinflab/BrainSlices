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

/**
 * Const: REFRESH_INTERVAL
 *
 * The interval between refresh requests [ms].
 **********************************************/
REFRESH_INTERVAL = 20000;

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

with ({getThumbnail: BrainSlices.gui.getThumbnail,
       STATUS_MAP: BrainSlices.gui.STATUS_MAP,
       CCloseableDiv: BrainSlices.gui.CCloseableDiv})
{
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
    var pixelSize = null;
    var imageTop = null;
    var imageLeft = null;

    function exitUpload(status, msg)
    {
      if (afterUpload)
      {
        afterUpload(status, msg);
      }
      else
      {
        if (msg)
        {
          alert(msg);
        }
      }
    }

    this.submit = function(fileList, filter, finalFunction,
                           ps, top, left)
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
     *   ps - 
     *   top -
     *   left -
     ***********************************************************************/
      afterUpload = finalFunction;
      pixelSize = ps;
      imageTop = top;
      imageLeft = left;

      var id, i, file;

      if (fileList)
      {
        files = this.filterImageFiles(fileList, filter);
        files.sort(imageCMP);

        for (i = 0; i < files.length; i++)
        {
          file = files[i];
          id = uploadedFiles.append(file);
          files[i] = {file: file,
                      id: id};
        }
      }
      else
      {
        files = [];
      }

      files = uploadedFiles.getFiles().concat(files);

      if (files.length == 0)
      {
        exitUpload(false, 'No files to upload.');
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
    this.filterImageFiles = function(files, filterImages, onerror)
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

        (onerror ?  onerror : alert)(msg);
      }
      else if (onerror)
      {
        onerror(false);
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
            exitUpload(false, response.message);
          }
        },
        {files_details: details.join(':')},
        function (data)
        {
          exitUpload(false, "Checking File Uploaded Amount: Something went wrong\nRetry upload");
          console.error('Checking File Uploaded Amount: Error!');
          throw 'Error while checking already uploaded amount. Upload cannot continue.'; // Discontinue the process of upload
        },
        null,
        ajaxOptions);
    }

    var toRefresh = {};
    var $dialogContent = $dialog.find('.content');
    var refreshTimer = null;
    var refreshInProgress = 0;
    var continueUpload = true;

    var dialog = new CCloseableDiv($dialog,
                                   function()
                                   {
                                     continueUpload = false;
                                     $dialogContent.css('max-height',
                                     Math.round($dialog.height() * 0.8) + 'px');
                                     //do some fancy content scaling
                                   },
                                   function()
                                   {
                                     if (!continueUpload)
                                     {
                                       exitUpload(false);
                                     }

                                     $dialogContent.empty();
                                     toRefresh = {};
                                     if (refreshTimer != null)
                                     {
                                       clearTimeout(refreshTimer);
                                       refreshTimer = null;
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
      toRefresh = {}; //XXX: almost global

      for (var i = 0; i < files.length; i++)
      {
        var file_data = data[i];
        var broken = file_data[0];
        var duplicates = file_data[1];

        if (broken.length > 0 || duplicates.length > 0)
        {
          show_dialog = true;
          var $div = $('<div />')
            .append(
              $("<h3 />")
                .text(files[i].name + ":"));

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
            var $li, duplicate, duplicate_iid, $status, $refresh;
            for (var j = 0; j < duplicates.length; j++)
            {
              duplicate = duplicates[j];
              duplicate_iid = duplicate[0];
              duplicate_iids.push(duplicate_iid);

              $status = $("<span />")
                .text('UNKNOWN');
              $li = $("<li />")
                .text("#" + duplicate_iid + " " + duplicate[1] + ". Status: ")
                .append($status);

              (function(iid)
              {
                $refresh = $("<a />")
                  .attr('title', 'Refresh status')
                  .addClass('refreshStatus lmargin10 link')
                  .text("Refresh")
                  .appendTo($li)
                  .click(function()
                  {
                    refreshStatusForIidsOnce([iid]);
                  });
              })(duplicate_iid);

              $ul.append($li);
              toRefresh[duplicate_iid] = {$status: $status,
                                           $row: $li,
                                           $refresh: $refresh};
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

        uploadedFiles.message("Pick what to do...");
        refreshStatusForIids(duplicate_iids);
      }
      else
      {
        addUploadFileProperties();
      }
    }


    /*
     * Refreshes the status of passed IIDs
     */
    function refreshStatusForIids(iids)
    {
      if (iids.length > 0)
      {
        refreshInProgress++;

        ajaxProvider.ajax(
          '/upload/getImagesStatuses',
          function(response)
          {
            refreshInProgress--;

            if (response.status)
            {
              var iid_status = response.data;
              var iid, row, iface, $iface, status;
              for (var i = 0; i < iid_status.length; i++)
              {
                // XXX: iid_status might be not ordered!!!
                row = iid_status[i];
                iid = row.iid;
                if (!(iid in toRefresh))
                {
                  continue;
                }
                iface = toRefresh[iid];
                $iface = iface.$row

                status = row.status;

                iface.$status.text(STATUS_MAP[status]);

                if (status >= 6)
                {
                  if ($iface.find("img").length == 0)
                  {
                    $iface.append(getThumbnail(iid,
                                               row.imageWidth,
                                               row.imageHeight));
                  }
                }

                if (status == 7)
                {
                  iface.$refresh.remove();
                  delete toRefresh[iid];
                }
              }

              var notAccepted = [];
              for (iid in toRefresh)
              {
                notAccepted.push(iid);
              }

              if (refreshInProgress == 0)
              {
                refreshTimer = setTimeout(function()
                  {
                    refreshTimer = null;
                    refreshStatusForIids(notAccepted)
                  },
                  REFRESH_INTERVAL);
              }
            }
          },
          { 'iids': iids.join(',') }, null, null, {async: false});
      }
    }

  
    /**
     * Preprocess list of files for upload according to the user choice and
     * request upload.
     */
    function addUploadFileProperties()
    {
      continueUpload = true;
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
        exitUpload(false);
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
          if (response == null || !response.status)
          {
            inProgress--;
            var msg = response == null ? 'Upload failed.' : response.message;

            if (inProgress != 0)
            {
              alert(msg);
            }
            else
            {
              exitUpload(false, msg)
            }
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
                                inProgress--;
                                if (data.status == 0 && data.state() == 'rejected')
                                {
                                  if (inProgress != 0)
                                  {
                                    alert("File Upload: Something went wrong. Possibly no network connection.")
                                  }
                                  else
                                  {
                                    exitUpload(false, "File Upload: Something went wrong. Possibly no network connection.");
                                  }
                                }
                                else
                                {
                                  console.error('File Upload: Error!');
                                  if (inProgress != 0)
                                  {
                                    alert('File Upload: Something went wrong.\nRetry');
                                  }
                                  else
                                  {
                                    exitUpload(false, 'File Upload: Something went wrong.\nRetry');
                                    throw 'File Upload: Something went wrong.\nRetry';
                                  }
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
                uploadedFiles.message("Upload completed!");
                exitUpload(true, 'All images uploaded');
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

            if (pixelSize != null && !isNaN(pixelSize) && pixelSize > 0)
            {
              form_data.append('ps', pixelSize);
            }

            if (imageTop != null && !isNaN(imageTop))
            {
              form_data.append('top', imageTop);
            }

            if (imageLeft != null && !isNaN(imageLeft))
            {
              form_data.append('left', imageLeft);
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
