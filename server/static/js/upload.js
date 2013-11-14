/* File: upload.js */
/*****************************************************************************\
*                                                                             *
*    This file is part of BrainSlices Software                                *
*                                                                             *
*    Copyright (C) 2012-2013 J. M. Kowalski, N. Pasumarthy                    *
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

/*****************************************************************************\
 * Class: CUploadedImages                                                    *
 *                                                                           *
 * A stub of a class that stores information about uploaded images.          *
 *                                                                           *
 * Attributes:                                                               *
 *   $table - jQuery object representing TABLE (or TBODY, THEAD, TFOOT etc.) *
 *            element providing information about uploaded files to the user *
 *   images - Array of objects describing the uploaded files.                *
 *                                                                           *
 *****************************************************************************
 * Constructor: CUploadedImages                                              *
 *                                                                           *
 * Initialize the object.                                                    *
 *                                                                           *
 * Parameters:                                                               *
 *   $table - Object assigned to attribute $table of constructed object.     *
 *   images - Value of attribute images (defaults to []).                    *
\*****************************************************************************/
function CUploadedImages($table, images)
{
  this.$table = $table;
  this.reset(images);
}

/*****************************************************************************\
 * Method: reset                                                             *
 *                                                                           *
 * Replace information about uploaded files with information provided        *
 * (preserving the order).                                                   *
 *                                                                           *
 * Parameters:                                                               *
 *   images - A list of objects describing uploaded files (see <append> for  *
 *            details).                                                      *
\*****************************************************************************/
CUploadedImages.prototype.reset = function(images)
{
  this.images = [];
  this.$table.html('');

  if (images != null)
  {
    for (var i = 0; i < images.length; i++)
    {
      this.append(images[i]);
    }
  }
}

/*****************************************************************************\
 * Method: append                                                            *
 *                                                                           *
 * Append information about uploaded file.                                   *
 *                                                                           *
 * Parameters:                                                               *
 *   image - An object describing the uploaded file. The object should have  *
 *           at least the following attributes:                              *
 *           - name - name of the file,                                      *
 *           - size - number of uploaded bytes,                              *
 *           - iid - unique identifier of the file in the repositoty,        *
 *           - crc32 - CRC32 checksum of the uploaded data.                  *
\*****************************************************************************/
CUploadedImages.prototype.append = function(image)
{
  this.images.push(image);
  this.$table.append('<tr><td>' + image.name + '</td><td>' + image.size +
                     '</td><td>' + image.iid + '</td><td>' + image.crc32 +
                     '</td></tr>');
}

/*****************************************************************************\
 * Method: sort                                                              *
 *                                                                           *
 * Sort the displayed uploaded files by name, then by sise (see <imageCMP>)  *
\*****************************************************************************/
CUploadedImages.prototype.sort = function()
{
  this.images.sort(imageCMP);
  this.reset(this.images);
}

/*****************************************************************************\
 * Section: Image upload functions                                           *
 *                                                                           *
 * Quick and dirty functions for image upload                                *
\*****************************************************************************/

/*****************************************************************************\
 * Topic: standart JSON object                                               *
 *                                                                           *
 * The response returned by the server after AJAX query is a standarised     *
 * JSON object.                                                              *
 *                                                                           *
 * Attributes:                                                               *
 *   status - A boolean indicating if the requested operation has succeeded. *
 *   logged - A boolean indicating if the user is logged to the repository.  *
 *   message - A string containing an user-friendly message (important in    *
 *             case of a failure).                                           *
 *   data - Additional data provided by the server.                          *
\*****************************************************************************/

/*****************************************************************************\
 * Function: makeUploadList                                                  *
 *                                                                           *
 * Fill DOM list element with items representing files for upload. Items are *
 * ordered by name, then by file size.                                       *
 *                                                                           *
 * Parameters:                                                               *
 *   srcFiles - An array of File objectsi.                                   *
 *   $list - jQuery object representing UL or OL element.                    *
 *   progressBar - boolean indicating whether provide a progress bar for the *
 *                 item.                                                     *
 *                                                                           *
 * Returns:                                                                  *
 *   An ordered array of files.                                              *
\*****************************************************************************/
function makeUploadList(srcFiles, $list, progressBar)
{
  $list.html('');

  var files = [];
  for (var i = 0; i < srcFiles.length; i++)
  {
    files.push(srcFiles[i]);
  }

  files.sort(imageCMP);

  for (var i = 0; i < files.length; i++)
  {
    var file = files[i];
    $list.append('<li>' + file.name + ' (' + file.type + ', ' + file.size +
                 ')' + (progressBar ? ' <progress max="1"></progress>':'') +
                 '</li>');
  }

  return files;
}

/*****************************************************************************\
 * Function: getUploadMonitor                                                *
 *                                                                           *
 * Prepere a custom XHR for progress bar update. i                           *
 *                                                                           *
 * Parameters:                                                               *
 *   $progress - jQuery object representing PROGRESS element.                *
 *   offset - Number of bytes uploaded in previous requests.                 *
 *   fraction - A fraction (of total number) of bytes to be uploaded in      *
 *              the request.                                                 *
 *   total - A total number of bytes of the upload.                          *
 *                                                                           *
 * Return:                                                                   *
 *   The XHR object.                                                         *
\*****************************************************************************/
function getUploadMonitor($progress, offset, fraction, total)
{
  return function()
  {
    var myXhr = $.ajaxSettings.xhr();
    if (myXhr.upload) // check if upload property exists 
    {
      myXhr.upload.addEventListener(
        'loadstart',
        function()
        {
          $progress.attr(
          {
            value: offset,
            max: total
          });
        }, false);
      myXhr.upload.addEventListener(
        'progress',
        function(e)
        {
          if (e.lengthComputable)
          {
            $progress.attr(
            {
              value: e.loaded * fraction / e.total + offset,
              max: total
            });
          }
        },
        false);
      myXhr.upload.addEventListener(
        'load',
        function()
        {
          $progress.attr(
          {
            value: fraction + offset,
            max: total
          });
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


/*****************************************************************************\
 * Group: chunked files upload                                               *
\*****************************************************************************/

/************************************\
 * Constant: CHUNK_SIZE             *
 * The default size of a file chunk *
 * (equals 1 MiB; actualy a global  *
 * variable).                       *
\************************************/
var CHUNK_SIZE = 1024 * 1024;

var MAX_SIMULTANEOUS_UPLOADS = 3; // These many images will be uploaded simultaneously 
var iCurrentFileForUpload = 0, files = null;
var STATUS_MAP = {'0': 'UPLOADING',
                  '1': 'RECEIVING',
                  '2': 'RECEIVED',
                  '3': 'PROCESSING',
                  '4': 'IDENTIFIED',
                  '5': 'TILED',
                  '6': 'COMPLETED',
                  '7': 'ACCEPTED',
                  '-1': 'REMOVED',
                  '-2': 'ERROR'}; // Hash map for the status of an image,
                                  // taken directly from tileBase.py

/*****************************************************************************\
 * Function: getSendNextChunkFunction                                        *
 *                                                                           *
 * Prepare a handler for file chunk upload feedback that would upload the    *
 * next chunk if necessary.                                                  *
 *                                                                           *
 * Parameters:                                                               *
 *   blob - A Blob (or File) object to be uploaded.                          *
 *   $progress - A jQuery object representing the PROGRESS element for       *
 *               upload progress visualisation.                              *
 *   finalFunction - A function to be called when whole data has been        *
 *                   successfully uploaded. The function takes the server    *
 *                   response as its argument (see <standart JSON object>    *
 *                   for details).                                           *
 *   cSize - An integer indicating the maximal size of data chunk to be send *
 *           (defaults to <CHUNK_SIZE>).                                     *
 *                                                                           *
 * Returns:                                                                  *
 *   The handler (see <sendNextChunk> for details).                          *
\*****************************************************************************/
function getSendNextChunkFunction(blob, $progress, finalFunction, cSize)
{
  if (cSize == null)
  {
    cSize = CHUNK_SIZE;
  }

  if (finalFunction == null)
  {
    finalFunction = function(response)
    {
      alert('Upload of ' + response.data.size + 'B finished\n' +
            'iid = ' + response.data.iid + '\n' +
            'crc32 = ' + response.data.crc32);
    }
  }

  /**
   * Function: sendNextChunk
   *
   * An internal function of <getSendNextChunkFunction>.
   *
   * Send remaining data chunk by chunk in recurrent (but asynchronous) manner
   * if there is anything to send, otherwise finish the upload process.
   *
   * Parameters:
   *   response - A <standart JSON object>. Its 'data' attribute contains
   *              following attributes: 'size' (number of uploaded bytes),
   *              'iid' (an unique repository identifier of file being
   *              uploaded), 'crc32' (a HEX string of CRC32 checksum of the
   *              uploaded data).
   *
   * Possible improvements:
   *   - Check if it is the last chunk to be uploaded and set 'success' AJAX
   *     handler appropriately instead of checking if the last chunk has been
   *     already sent?
   *   - Provide more explicite data read (if possible)?
   *   - Send data as multipart/form-data?
   ***************************************************************************/
  function sendNextChunk(response)
  {
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
      form_data.append('data', chunk);
      form_data.append('iid', response.data.iid);
      form_data.append('offset', response.data.size);

      $.ajax(
      {
        url: 'continueImageUpload',
        dataType: 'json',
        type: 'POST',
        data: form_data,
        processData: false,
        contentType: false,
        cache: false,
        xhr: getUploadMonitor($progress, offset, Math.min(cSize, blob.size - offset), blob.size),
        //Ajax events
        success: sendNextChunk, // recurrention
        error: ajaxErrorHandler,
      });
    }
    else
    {
      // if there is no more data to sent finish the file upload
      finalFunction(response);
    }
  }

  return sendNextChunk;
}

/*****************************************************************************\
 * Function: uploadChunkedFiles                                              *
 *                                                                           *
 * Upload files as series of data chunks.                                    *
 *                                                                           *
 * Parameters:                                                               *
 *   fileList - A FileList object (or Array of File objects).                *
 *   $progresses - A jQuery array of PROGRESS elements corresponding to the  *
 *                 fileList items sorted by name, then by size.              *
 *   cSize - An integer indicating the maximal size of data chunk to be send *
 *           (defaults to <CHUNK_SIZE>).                                     *
 *   finalFunction - A no argument function to be called when all filas has  *
 *                   been successfully uploaded.                             *
 *   bid - A unique repository batch identifier. In not null, the uploaded   *
 *         files would be assigned to that batch.                            *
 *   uploadedFilesCollection - <CUploadedImages> object providing user with  *
 *                             information about uploaded files.             *
 *                                                                           *
 * Possible improvements:                                                    *
 *   - The way the upload of the first file starts?                          *
\*****************************************************************************/
function uploadChunkedFiles(fileList, $progresses, cSize, finalFunction, bid,
                            uploadedFilesCollection)
{
  if (cSize == null)
  {
    cSize = CHUNK_SIZE;
  }

  // work on a sorted copy of fileList
  var files = [];
  for (var i = 0; i < fileList.length; i++)
  {
    files.push(fileList[i]);
  }

  files.sort(imageCMP);

  /**
   * Function: uploadFileNo
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
  function uploadFileNo(fileNo)
  {
    return function(response)
    {
      if (response == null || !response.status)
      {
        //TODO: customize
        alert(response.message);
        return;
      }

      if (uploadedFilesCollection != null && fileNo > 0)
      {
        uploadedFilesCollection.append({name: files[fileNo - 1].name,
                                        size: response.data.size,
                                        iid: response.data.iid,
                                        crc32: response.data.crc32});
      }

      // all files has been sent if there is no file number fileNo in files
      if (fileNo >= files.length)
      {
        if (finalFunction != null)
        {
          finalFunction();
        }
        return;
      }

      var file = files[fileNo];
      var $progress = $progresses.eq(fileNo); //TODO: bugtest it

      // the first chunk of data will be sent
      var reader = new FileReader();
      var total = file.size;
      var chunk = file.slice(0, cSize);
    
      reader.onload = function(event)
      {
        var result = event.target.result;
        var data = {
                     data: result,
                     filename: file.name,
                     size: total
                    };
        if (bid != null)
        {
          data['bid'] = bid;
        }
    
        $.ajax(
        {
          url: 'uploadNewImage',
          dataType: 'json',
          type: 'POST',
          xhr: getUploadMonitor($progress, 0, Math.min(cSize, total), total),
          //Ajax events
          //beforeSend: beforeSendHandler,
          success: getSendNextChunkFunction(file,
                                            $progress,
                                            uploadFileNo(fileNo + 1),
                                            cSize),
          error: ajaxErrorHandler,
          data: data,
          contentType: 'application/x-www-form-urlencoded', //BOOO, formData does not work
          cache: false
        });
      }
      reader.readAsBinaryString(chunk);
    }
  }

  // TODO: there must be a better way than artificial triggering handler -_-
  uploadFileNo(0)({status: true});
}

/*****************************************************************************\
 * Class: CFileUploader                                                      *
 *                                                                           *
 * A quick and dirty stub of a class of object handling file upload panel.   *
 *                                                                           *
 * Attributes:                                                               *
 *   $form - A jQuery object representing the file upload form/panel.        *
 *   uploaded - A <CUploadedImages> object to provide user with information  *
 *              about uploaded files.                                        *
 *   $uploads - A jQuery object representing list (OL or UL) element for     *
 *              listing files selected to upload.                            *
 *                                                                           *
 * Possible improvements:                                                    *
 *   - Removal of single request upload.                                     *
 *   - Split of constructor code into several methods to allow more flexible *
 *     batches management.                                                   *
 *   - Important panel elements identified by jQuery in more unequivocal     *
 *     way than ':file' or 'button' - possible with a special class?         *
 *****************************************************************************
 * Constructor: CFileUploader                                                *
 *                                                                           *
 * Initialize the object.                                                    *
 *                                                                           *
 * Parameters:                                                               *
 *   $form - A jQuery object representing the file upload form/panel.        *
 *   ajaxProvider - An object providing ajax method (possibly of class       *
 *                  <CLoginManager>).                                        *
\*****************************************************************************/
function CFileUploader($form, ajaxProvider)
{
  this.$form = $form;
  this.uploaded = new CUploadedImages($form.find('table.uploaded>tbody'));
  this.$uploads = $form.find('.uploads');
  var files = [];

  var thisInstance = this;

  ajaxProvider.ajax(
    'batchList',
    function(response)
    {
      if (!response.status)
      {
        alert(response.message);
        return;
      }
      var list = response.data;
      var $select = $('.batch select');
      for (var i = 0; i < list.length; i++)
      {
        $select.append('<option value="' + list[i][0] + '">' +
                       escapeHTML(list[i][1]) + '</option>');
      }

      $form.find('.batch :button').click(function()
      {
        var comment = $form.find('.batch :text').val();
        ajaxProvider.ajax(
          'newBatch',
          function(response)
          {
            if (!response.status)
            {
              alert(response.message);
              return;
            }
            var $select = $('.batch select');
            $select.append('<option value="' + response.data + '">' +
                           escapeHTML(comment) + '</option>');
            $select.val(response.data);
          },
          {comment: comment},
          ajaxErrorHandler,
          'POST',
          {cache: false});
      });
    },
    null,
    ajaxErrorHandler,
    'POST',
    {cache: false});


  function updateFiles()
  {
    files = $form.find(':file')[0].files;
    if ($form.find('input[name="filter"]:checked').length > 0)
    {
      files = filterImageFiles(files);
    }
    files = makeUploadList(files,
                           $form.find('.uploadNew .uploads'),
                           true);
  }

  $form.find(':file').change(updateFiles);
  $form.find('input[name="filter"]').change(updateFiles);

  $form.find('.uploadNew :button').click(function()
  {
    // old_chunk_upload();
     new_chunk_upload();
  });
  
  function old_chunk_upload()
  {
    var bid = $('.batch select').val();
    if (bid == 'None')
    {
      bid = null;
    }
    uploadChunkedFiles($form.find(':file')[0].files,
                       $form.find('.uploadNew .uploads>li>progress'),
                       null, null, bid,
                       thisInstance.uploaded);
  }


  //XXX: lol, everything in scope of a function :-D
  /* 
   * -------------------------------------------------------------------------
   * Edited By: Nitin Pasumarthy
   * Date: July 11, 2013 
   */
  
  var cFilesUploaded = 0; // has the count of files that are completely uploaded
  var isUploadComplete = false;
  
  /*
   * Uploads the images in chunks. Facilitates a way to resume upload in case of any network failure
   */
  function new_chunk_upload()
  {
    //XXX: global value!
    //files = filterImageFiles($form.find(':file')[0].files);
    attach_progress_bars();
    $("#upload_status_message").hide().text("Preparing upload...").show();
    isUploadComplete = false;
    calc_files_keys_and_trigger_upload($form.find('.uploadNew .uploads>li>progress'));
  }
  
  /**
   * Function: filterImageFiles
   *
   * An internal function of <CFileUploader> constructor.
   *
   * Filter out files of non image type.
   *
   * Parameters:
   *   files - an array of files
   *
   * Returns:
   *   filtered array of files
   *
   * Todo:
   *   more sophisticated file type filtering
   ********************************************************/
  function filterImageFiles(files)
  {
    var imageType = /image.*/;
    var image_files = [];
    for (var i = 0; i < files.length; i++)
    {
      var file = files[i];
      if (file.type.match(imageType))
      {
        image_files.push(file);
      }
    }

    if (files.length != image_files.length)
    {
      alert("Only image files are allowed. Uploading only them if any.");
    }
    return image_files;
  }
  
  /*
   * For each file attach progress bars to file object
   */
  function attach_progress_bars()
  {
    var progress_bars = $form.find('.uploadNew .uploads>li>progress');
    $(files).each(function(i, file)
                  {
                    file.progress_bar = progress_bars[i];
                    // Assuming the progress bars are added in the same
                    // serial order to the form's DOM
                  });
  }

  /*
   * Triggers the upload of next file in the array, 'files'
   */
  function upload_next_file()
  {
    total_files = files.length;
    if (!isUploadComplete && iCurrentFileForUpload < total_files)
    {
      upload_file(files[iCurrentFileForUpload++]); // Async method
    }

    if (cFilesUploaded == total_files)
    {
      do_upload_complete();
    }
  }
  
  /*
   * Adds 'key' property to file objects
   * MD5 hash of file contents. Optimized approach, as file is loaded into memory in chunks
   */ 
  function calc_files_keys_and_trigger_upload($progresses)
  {
    var currentFile = 0;
    var chunkSize = 1024 * 1024; // 1 MB chunks for generating MD5 hash key
    $(files).each(function(i, file)
    {
      var chunks = Math.ceil(file.size / chunkSize);
      var currentChunk = 0;
      var spark = new SparkMD5.ArrayBuffer();
      var $progress = $progresses.eq(i);

      $progress.attr({value: currentChunk, max: chunks});
      function frOnload(e)
      {
        spark.append(e.target.result); 
        currentChunk++;
        $progress.attr({value: currentChunk, max: chunks});

        if (currentChunk < chunks)
        {
          loadNextSlice();
        }
        else
        {
          currentFile++;
          var hash = spark.end(); // Completed computing MD5 HASH 
          file.key = hash; // Save the hash as a property of the file
          if (currentFile == files.length)
          {
            find_or_insert_image_details(); // Triggers file upload 
          }
        }
      };
      function frOnerror(data)
      {
        currentFile++;
        console.warn("File Key Computation: Something went wrong.");
        alert("Reading File: Something went wrong.\nRefresh page and retry.");
        throw 'MD5 computation error. Upload cannot continue' // Discontinue the upload process
      };
      function loadNextSlice()
      {
        var fileReader = new FileReader();
        fileReader.onload = frOnload;
        fileReader.onerror = frOnerror;

        var start = currentChunk * chunkSize,
            end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;

        fileReader.readAsArrayBuffer(file.slice(start, end));
      };
      loadNextSlice();
    });
  }
  
  /*
   * Returns an array of files details which are to be saved as meta data of the file
   */
  function get_files_details(files)
  {
    files_details = [];
    for (var i = 0; i < files.length; i++)
    {
      var file = files[i];
      files_details.push(file.key + ',' + file.size);
    }
    return files_details;
  }
  
  /* 
   * Query server for duplicates 
   */
  function find_or_insert_image_details()
  {
    var files_details = []
    for (var i = 0; i < files.length; i++)
    {
      var file = files[i];
      files_details.push(file.key + ',' + file.size);
    }
    ajaxOptions = {async: false};
    ajaxProvider.ajax(
      'getBrokenDuplicates', 
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
      {files_details: files_details.join(';')},
      function (data)
      {
        alert("Checking File Uploaded Amount: Something went wrong\nRetry upload");
        console.error('Checking File Uploaded Amount: Error!');
        throw 'Error while checking already uploaded amount. Upload cannot continue.'; // Discontinue the process of upload
      },
      'POST', 
      ajaxOptions);
  }
 
  var to_refresh = [];

  /*
   * Creates the JQuery UI Dialog for taking user's action for broken and duplicate images
   */
  function form_dialog(data)
  {
    var show_dialog = false;
    var $dialog_content = $("<form />"); // Very imp for "cancel" functionality of dialog to work
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
        $dialog_content.append($("<h3 />").text(files[i].name + ":").css("text-decoration", "underline"));
      }
      
      if (broken.length > 0)
      {
        $dialog_content.append($("<h4 />").text("Broken upload(s):").css("text-decoration", "underline"));
        var $radio_buttons_div = $("<div />").css("margin-botton", "10px");
        for (var j = 0; j < broken.length; j++)
        {
          var slot = broken[j];
          var slot_iid = slot[0];
          var slot_size = slot[1];
          var percent_uploaded = Math.round(slot_size / files[i].size * 100);
          $radio_buttons_div.append($("<input>").attr({type: "radio",
                                                       name: 'upload_radio_' + i,
                                                       value: slot_iid + ',' + slot_size}));
          $radio_buttons_div.append($("<label />").text(slot[2] + " #" + slot_iid + " (" + percent_uploaded + "%)"));
        }
        $dialog_content.append($radio_buttons_div);
      }
      
      if (duplicates.length > 0)
      {
        $dialog_content.append($("<h4 />").text("Duplicate upload(s):").css("text-decoration", "underline"));
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

        $dialog_content.append($("<div />").append($ul));
      }
      
      if (broken.length > 0 || duplicates.length > 0)
      {
        var $upload_again = $("<div />");
        $upload_again.append($("<input>").attr({type: "radio",
                                                name: 'upload_radio_' + i, 
                                                value: 'new'}));
        $upload_again.append($("<span />").text(" upload again"));
        $dialog_content.append($upload_again);
        
        var $take_no_action = $("<div />");
        $take_no_action.append($("<input>").attr({type: "radio",
                                                  name: 'upload_radio_' + i,
                                                  value: 'cancel',
                                                  checked: true}));
        $take_no_action.append($("<span />").text(" take no action"));
        $dialog_content.append($take_no_action);
      }
      
      // $dialog_content.append($("<hr />").css("margin", "10px"));
    }
    
    if (show_dialog)
    {
      // Trigger Auto Refresh of status for every 20s
      // TODO: make it better
      // (might be refreshing completed/accepted images)
      if (duplicate_iids.length > 0)
      {
        var set_interval_id = setInterval(function() {
          refreshStatusForIids(to_refresh) }, 20*1000);
      }

      $("#upload_status_message").hide().text("Pick what to do...").show();
      $("#dialog").html("").append($dialog_content).dialog({
        modal: true,
        buttons: [
                    { text: "OK", click: function() {
                        $(this).dialog("close");
                      }
                    },
                    { text: "Cancel", click: function() { 
                        $(this).children("form")[0].reset();
                        $(this).dialog("close");
                      }
                    }
                  ],
        closeText: "Cancel",
        minWidth: 600,
        maxWidth: 840,
        maxHeight: 540,
        close: function( event, ui )
        {
          clearInterval(set_interval_id); // Clear the setInterval call
          if (event.currentTarget && event.currentTarget.innerText == "Cancel") // When cross button is clicked TODO: A better way to detect when cross button on dialog is pressed
          {
            $(this).children("form")[0].reset();
          }
          addUploadFileProperties(data);
        }
      });
    }
    else
    {
      addUploadFileProperties(data);
    }
    
    refreshStatusForIids(duplicate_iids);
  }

  /*
   * Refresh the status of an image when clicked by making an AJAX call
   */
  $(".refreshStatus").live("click", function()
  {
    var iid = $(this).attr('data-iid');
    refreshStatusForIids([iid]);
  });
  
  /*
   * Refreshes the status of passed IIDs
   */
  function refreshStatusForIids(iids)
  {
    ajaxProvider.ajax(
        'getImagesStatuses', 
        function(response)
        {
          if (response.status)
          {
            var iid_status = response.data;
            var span;
            var not_accepted = [];
            for (iid in iid_status)
            {
              span = $("#dialog").find("span[data-iid='"+iid+"']");
              $(span).text(STATUS_MAP[iid_status[iid]]);
              $(span).parent("li").find("img").remove(); // Remove existing images if any
              if (iid_status[iid] >= 6)
              {
                $(span).parent("li").append(getThumbnail(iid));
              }

              if (iid_status[iid] < 7)
              {
                not_accepted.push(iid);
              }
            }
            to_refresh = not_accepted; //XXX: almost global
          }
        },
        { 'iids': JSON.stringify(iids) }, null, 'POST', {async: false});
  }
  
  /*
   * Returns image thumbnail object for the given iid
   */
  function getThumbnail(iid) {
    return $("<img />").attr({src: '../images/'+iid+'/tiles/0/0/0.jpg'}).addClass("polaroid-image");
  }
  
  /*
   * Adds additional properties to file objects:
   * 1) Action: Which action to take based on user's choice from dialog. Valid Values: s (=> stop / cancel), n (=> new), r (=> resume)
   * 2) ActionOnIid: The above action on which image iid. This is valid only for resume upload action indicating broken image iid
   * 3) iid: iid of the new slot created for that particular file
   * 4) uploaded_amount: based on the action chosen by user, uploaded amount is filled either for resume or cancel or new
   */
  function addUploadFileProperties()
  {  
    var cFiles = files.length;
    var selected_radios = $("#dialog form").find("input:checked");
    for (var i = 0; i < cFiles; i++)
    {
      var radio_ref = $(selected_radios).filter("[name='upload_radio_"+i+"']")[0];
      //files[i]['iid'] = file_iid;
      if (radio_ref)
      {
        var val = $(radio_ref).val();
        switch (val)
        {
          case 'new':
            files[i].action = 'n';
            break;

          case 'cancel':
            files[i].action = 's';
            break;

          default:
            var row = val.split(',');
            files[i].action = 'r';
            files[i].iid = parseInt(row[0]);
            files[i].uploaded_amount = parseInt(row[1]);
        }
      }
      else
      {
        // New image which is neither a duplicate nor broken
        files[i].action = 'n';
      }
    }
    start_file_upload();
  }
  
  /*
   * Triggers the upload process. Opens MAX_SIMULTANEOUS_UPLOADS threads for parallel uploads
   */
  function start_file_upload()
  {
    if (files.length == 0) do_upload_complete();
    while (iCurrentFileForUpload < MAX_SIMULTANEOUS_UPLOADS && iCurrentFileForUpload < files.length)
    {
      upload_next_file();
    }
  }

  /*
   * Uploads the file with progress bar. When upload is complete, triggers the next file 
   * upload maintaining the MAX_SIMULTANEOUS_UPLOADS constraint
   */
  function upload_file(file)
  {
    $("#upload_status_message").hide().text("Completing... " + (cFilesUploaded+1) + " of " + files.length).show();
    switch (file.action)
    {
      case 'n':
        var form_data = new FormData();
        form_data.append('data', file.slice(0, CHUNK_SIZE));
        form_data.append('filename', file.name);
        form_data.append('key', file.key);
        form_data.append('size', file.size);
        stupid_form_data = form_data;
        //TODO: more sophisticated approach
        var bid = $('.batch select').val();
        if (bid != 'None')
        {
          form_data.append('bid', bid);
        }
        var $progress = $(file.progress_bar);
        var total = file.size;
        ajaxOptions = {
          cache: false,
          contentType: false,
          processData: false,
          xhr: getUploadMonitor($progress, 0, Math.min(CHUNK_SIZE, total), total)};
        ajaxProvider.ajax(
          'uploadNewImage', 
          getSendNextChunkFunction(file,
                                   $(file.progress_bar),
                                   do_file_upload_complete, //SEND NEXT FILE
                                   CHUNK_SIZE),
          form_data,
          function(data)
          {
            if (data.status == 0 && data.state() == 'rejected')
            {
              // XXX ???
              alert("You are offline. Please connect to internet and try again")
            }
            else
            {
              alert('File Upload: Something went wrong.\nRetry');
              console.error('File Upload: Error!');
              throw 'File Upload: Something went wrong.\nRetry';
            }
          },
          'POST', 
          ajaxOptions);
        break;

      case 'r':
        getSendNextChunkFunction(file, $(file.progress_bar),
                                 do_file_upload_complete, CHUNK_SIZE)(
        {
          status: true,
          data: {size: file.uploaded_amount,
                 iid: file.iid}
        });
        break;

      default:
        do_file_upload_complete();
    }
  }

  /*
   * To be called when a file is "completely" uploaded
   */
  function do_file_upload_complete()
  {
    cFilesUploaded++;
    $("#upload_status_message").hide().text("Completed " + cFilesUploaded + " of " + files.length).show();
    //alert('Upload Success!');
    upload_next_file();
  }
  
  /*
   * Final function called after all uploads are completesd
   */
  function do_upload_complete()
  {
    $("#upload_status_message").hide().text("Upload complete!").show();
    alert('All images uploaded');
    $("form#upload")[0].reset();
    iCurrentFileForUpload = 0;  // reset the index of current file being uploaded to zero
    cFilesUploaded = 0; // reset the total number of files uploaded
    isUploadComplete = true; // flag that helps prevent some threads being calling upload function again
  }
}
