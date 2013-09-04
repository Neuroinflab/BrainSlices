/* File: upload.js */

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
 * Fill DOM list element with items representing files for upload. Items has *
 * to be ordered by name, then by file size.                                 *
 *                                                                           *
 * Parameters:                                                               *
 *   srcFiles - An array of File objectsi.                                   *
 *   $list - jQuery object representing UL or OL element.                    *
 *   progressBar - boolean indicating whether provide a progress bar for the *
 *                 item.                                                     *
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
}

/*****************************************************************************\
 * Function: getProgressHandlingFunction                                     *
 *                                                                           *
 * Prepere a handler for XHR 'progress' event for progress bar update.       *
 *                                                                           *
 * Parameters:                                                               *
 *   $progress - jQuery object representing PROGRESS element.                *
 *   offset - Number of bytes uploaded in previous requests.                 *
 *   fraction - A fraction (of total number) of bytes to be uploaded in      *
 *              the request.                                                 *
 *   total - A total number of bytes of the upload.                          *
 *                                                                           *
 * Return:                                                                   *
 *   The handler function.                                                   *
\*****************************************************************************/
function getProgressHandlingFunction($progress, offset, fraction, total)
{
  return function(e)
  {
    if (e.lengthComputable)
    {
      $progress.attr(
      {
        value: e.loaded * fraction / e.total + offset,
        max: total
      });
    }
  }
}

/*****************************************************************************\
 * Group: uploading all files with one request                               *
\*****************************************************************************/

/*****************************************************************************\
 * Function: getCompleteHandler                                              *
 *                                                                           *
 * Prepare a handler for multiple file upload feedback.                      *
 *                                                                           *
 * Parameters:                                                               *
 *   uploadedFilesCollection - <CUploadedImages> object providing            *
 *                             information about uploaded files to the user. *
 *   $progress - jQuery object representing PROGRESS element.                *
 *                                                                           *
 * Return:                                                                   *
 *   A jQuery.ajax success handler function                                  *
 *   > function(response)                                                    *
 *   where 'response' is a <standart JSON object>. The 'data' attribute      *
 *   of the 'response' is (on success) an Array of objects describing        *
 *   uploaded files (see <CUploadedImages.append> for details).              *
\*****************************************************************************/
function getCompleteHandler(uploadedFilesCollection, $progress)
{
	return function (data)
	{
		if (!data.status)
		{
			alert(data.message);
			return;
		}
	
		data.data.sort(function(a, b)
		               {
										 if (a.name < b.name) return -1;
										 if (a.name > b.name) return 1;
										 return a.size - b.size;
									 });
		for (var i = 0; i < data.data.length; i++)
		{
	    var fd = data.data[i];
	
			uploadedFilesCollection.append(fd);
		}
	
	  $progress.attr(
	  {
	    value: 1,
	    max: 1
	  });
	}
}

/*****************************************************************************\
 * Function: uploadFormFiles                                                 *
 *                                                                           *
 * Upload files selected in a form to the repository *in a single request*.  *
 *                                                                           *
 * Parameters:                                                               *
 *   form - DOM FORM element.                                                *
 *   $progress - jQuery object representing PROGRESS element for the upload  *
 *               progress monitoring.                                        *
 *   uploadedFilesCollection - <CUploadedImages> object providing user with  *
 *                             information about uploaded files.             *
\*****************************************************************************/
function uploadFormFiles(form, $progress, uploadedFilesCollection)
{
	$progress.attr({
		               max: 1,
	                 value: 0
	               });

  var formData = new FormData(form);
  $.ajax(
  {
    url: 'upload',
    type: 'POST',
  	dataType: 'json',
    xhr: function() // custom xhr
    {
      myXhr = $.ajaxSettings.xhr();
      if (myXhr.upload) // check if upload property exists 
      {
				// the upload progress is monitored
        myXhr.upload.addEventListener('progress',
  			                              getProgressHandlingFunction($progress,
																			                            0., 1., 1.),
  																		false);
      }
      return myXhr;
    },
    //Ajax events
    success: getCompleteHandler(uploadedFilesCollection, $progress),
    error: ajaxErrorHandler,
    // Form data
    data: formData,
    //Options to tell JQuery not to process data or worry about content-type
    cache: false,
    contentType: false,
    processData: false
  });
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

    $progress.attr(
    {
      value: response.data.size,
      max: blob.size
    });

    if (response.data.size < blob.size)
    {
			// send a next chunk if there is more data to send
      var offset = response.data.size;
      var chunk = blob.slice(offset, offset + cSize);

			// the chunk will be sent when it is read - quite indirect approach
      var reader = new FileReader();
      reader.onload = function(event)
      {
        var result = event.target.result;

        $.ajax(
        {
          url: 'continueImageUpload',
          dataType: 'json',
          type: 'POST',
          data: {
                  data: result,
                  iid: response.data.iid,
                  offset: response.data.size
                },
					// the root of all Evil might be here - in URL-encoding
          contentType: 'application/x-www-form-urlencoded', //BOOO, formData does not work
          cache: false,
          xhr: function() // custom xhr
          {
            myXhr = $.ajaxSettings.xhr();
            if (myXhr.upload) // check if upload property exists 
            {
							// for monitoring of the progress of the upload
              myXhr.upload.addEventListener('progress',
                getProgressHandlingFunction($progress,
                  offset,
                  Math.min(cSize, blob.size - offset) / blob.size,
                  blob.size),
							                              false);
            }
            return myXhr;
          },
          //Ajax events
          success: sendNextChunk, // recurrention
          error: ajaxErrorHandler,
        });
      }
      reader.readAsBinaryString(chunk);
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
          xhr: function() // custom xhr
          {
            myXhr = $.ajaxSettings.xhr();
            if (myXhr.upload) // check if upload property exists 
            {
              myXhr.upload.addEventListener('progress',
                getProgressHandlingFunction($progress,
                  0,
                  Math.min(cSize / total, 1),
                  total), false); // for handling the progress of the upload
            }
            return myXhr;
          },
    
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
\*****************************************************************************/
function CFileUploader($form)
{
	this.$form = $form;
	this.uploaded = new CUploadedImages($form.find('table.uploaded>tbody'));
	this.$uploads = $form.find('.uploads');

	var thisInstance = this;

  $.ajax(
  {
    url: 'batchList',
    type: 'POST',
  	dataType: 'json',
    success: function(response)
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

			thisInstance.$form.find('.batch :button').click(function()
			{
				var comment = thisInstance.$form.find('.batch :text').val();
  			$.ajax(
  			{
  			  url: 'newBatch',
  			  type: 'POST',
  				dataType: 'json',
					data: {comment: comment},
  			  success: function(response)
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
  			  error: ajaxErrorHandler,
  			  cache: false,
  			});
				
			});
		},
    error: ajaxErrorHandler,
    cache: false,
  });



	$form.find(':file').change(function()
	{
		makeUploadList(this.files,
		               thisInstance.$form.find('.uploadOld .uploads'),
		               false);
		makeUploadList(this.files,
		               thisInstance.$form.find('.uploadNew .uploads'),
		               true);
		thisInstance.$form.find('.uploadOld progress').removeAttr('value');
	});

	$form.find('.uploadOld :button').click(function()
	{
		uploadFormFiles(thisInstance.$form[0],
		                thisInstance.$form.find('.uploadOld progress'),
		                thisInstance.uploaded);
	});

	$form.find('.uploadNew :button').click(function()
	{
		// old_chunk_upload();
		 new_chunk_upload();
	});
	
	function old_chunk_upload() {
		var bid = $('.batch select').val();
		if (bid == 'None')
		{
			bid = null;
		}
		uploadChunkedFiles(thisInstance.$form.find(':file')[0].files,
		                   thisInstance.$form.find('.uploadNew .uploads>li>progress'),
		                   null, null, bid,
		                   thisInstance.uploaded);
	}

	$form.find('select.uploadMethod').change(function()
	{
		switch (thisInstance.$form.find('select.uploadMethod').val())
		{
			case 'chunked':
				thisInstance.$form.find('.uploadOld').hide();
				thisInstance.$form.find('.uploadNew').show();
				break;

			case 'compact':
				thisInstance.$form.find('.uploadNew').hide();
				thisInstance.$form.find('.uploadOld').show();
				break;
		}
	});
	
	/* 
	 * -------------------------------------------------------------------------
	 * Edited By: Nitin Pasumarthy
	 * Date: July 11, 2013 
	 */
	
	var cFilesUploaded = 0; // has the count of files that are completely uploaded
	
	function new_chunk_upload() {
		files = filter_non_image_files(thisInstance.$form.find(':file')[0].files);
		attach_progress_bars();
		calc_files_keys_and_trigger_upload();
	}
	
	/*
	 * From the files selected by the user, filter out non image files
	 */
	function filter_non_image_files(files) {
		var imageType = /image.*/;
		var image_files = [];
		$(files).each(function(i, file) {
			if(file.type.match(imageType))
				image_files.push(file);
		});
		if(files.length != image_files.length)
			alert("Only image files are allowed. Uploading only them if any.")
		return image_files;
	}
	
	/*
	 * For each file attach progress bars to file object
	 */
	function attach_progress_bars() {
		var progress_bars = thisInstance.$form.find('.uploadNew .uploads>li>progress');
		$(files).each(function(i, file) {
			file.progress_bar = progress_bars[i]; // Assuming the progress bars are added in the same serial order to the form's DOM
		});
	}

	/*
	 * Triggers the upload of next file in the array, 'files'
	 */
	function upload_next_file() {
		total_files = files.length;
		if(iCurrentFileForUpload < total_files)
			upload_file(files[iCurrentFileForUpload++]); // Async method
		if(cFilesUploaded == total_files)
			do_upload_complete();
	}
	
	/*
	 * Adds 'key' property to file objects
	 * MD5 hash of file contents. Optimized approach, as file is loaded into memory in chunks
	 */ 
	function calc_files_keys_and_trigger_upload() {
//		files[0].key = '0e37e5dda470714d2d1945f23c5f5304'; // Save the hash as a property of the file
//    	start_file_upload(files); // Triggers file upload
//    	return;
    	
    	var currentFile = 0;
    	var chunkSize = 1024 * 1024 * 20; // 20 MB chunks for generating MD5 hash key
    	$(files).each(function(i, file) {
    		var chunks = Math.ceil(file.size / chunkSize);
    		var currentChunk = 0;
    		var spark = new SparkMD5.ArrayBuffer();
    		function frOnload(e)
                {
                spark.append(e.target.result); 
                currentChunk++;

                if (currentChunk < chunks)
                {
                	loadNextSlice();
                }
                else
                {
                	currentFile++;
                	var hash = spark.end(); // Completed computing MD5 HASH 
                	file.key = hash; // Save the hash as a property of the file
                	if(currentFile == files.length)
                		find_or_insert_image_details(); // Triggers file upload 
                }
            };
            function frOnerror(data)
            {
            	currentFile++;
                console.warn("File Key Computation: Something went wrong.");
                alert("Reading File: Something went wrong.\nRefresh page and retry.");
                throw 'MD5 computation error. Upload cannot continue' // Discontinue the upload process
            };
            function loadNextSlice() {
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
	 * Checks the number of bytes uploaded of the passed files 
   	 * Sets the uploaded amount for the file object
   	 * If this is a new image, a new row is created in images table and zero is set
	 */
	function find_or_insert_image_details() {
		var files_details = get_files_details(files);
		ajaxOptions = {async: false};
		loginConsole.ajax(
			'checkUploadOrCreateSlot', 
			function(response) {
				form_dialog(response.data);
			},
			{files_details: JSON.stringify(files_details)},
			function(data) {
				alert("Checking File Uploaded Amount: Something went wrong\nRetry upload");
				console.error('Checking File Uploaded Amount: Error!');
				throw 'Error while checking already uploaded amount. Upload cannot continue.'; // Discontinue the process of upload
			},
			'POST', 
			ajaxOptions);
	}
	
	/*
	 * Creates the JQuery UI Dialog for taking user's action for doubtful images
	 */
	function form_dialog(data) {
		var file_data;
		var show_dialog = false;
		var dialog_content = $("<form />"); // Very imp for "cancel" functionality of dialog to work
		
		for(var i = 0; i < files.length; i++) {
			file_data = data[btoa(files[i].name)]; // TODO Requires latest browsers for base64 encoding
			var c_broken = file_data.broken.length; var c_duplicates = file_data.duplicates.length;
			
			if(c_broken > 0 || c_duplicates > 0) {
				show_dialog = true;
				$(dialog_content).append($("<h3 />").text(files[i].name + " (iid #"+file_data.iid+"):").css("text-decoration", "underline"));
			}
			
			if(c_broken > 0) {
				$(dialog_content).append($("<h4 />").text("Broken upload(s):").css("text-decoration", "underline"));
				var radio_buttons_div = $("<div />").css("margin-botton", "10px");
				for(var j = 0; j < c_broken; j++) {
					var percent_uploaded = Math.round(file_data.broken[j][1] / files[i].size * 100);
					var duplicate_image_iid = file_data.broken[j][0];
					$(radio_buttons_div).append($("<input>").attr({type: "radio", name: file_data.iid, 
						"data-action": 'r', "data-actioniid": duplicate_image_iid, value: file_data.broken[j][1]}));
					$(radio_buttons_div).append($("<label />").text(duplicate_image_iid + " ("+percent_uploaded+"%)"));
				}
				$(dialog_content).append(radio_buttons_div);
			}
			
			if(c_duplicates > 0) {
				$(dialog_content).append($("<h4 />").text("Duplicate upload(s):").css("text-decoration", "underline"));
				$(dialog_content).append($("<p />").append(file_data.duplicates.join(", ")));
			}
			
			if(c_broken > 0 || c_duplicates > 0) {
				var upload_again = $("<div />");
				$(upload_again).append($("<input>").attr({type: "radio", name: file_data.iid, 
					"data-action": 'n', "data-actioniid": 0, value: 0}));
				$(upload_again).append($("<span />").text(" upload again"));
				$(dialog_content).append(upload_again);
				
				var take_no_action = $("<div />");
				$(take_no_action).append($("<input>").attr({type: "radio", name: file_data.iid, 
					'data-action': 's', "data-actioniid": 0, value: files[i].size, checked: true}));
				$(take_no_action).append($("<span />").text(" take no action"));
				$(dialog_content).append(take_no_action);
			}
			
			// $(dialog_content).append($("<hr />").css("margin", "10px"));
		}
		
		if(show_dialog) {
			$("#dialog").html("").append(dialog_content).dialog({
				modal: true,
				buttons: [
				          	{ text: "Ok", click: function() {
				          			addUploadFileProperties(data);
				          			$(this).dialog("close");
				          		}
				          	},
				          	{ text: "Cancel", click: function() { 
				          			$(this).children("form")[0].reset();
				          			addUploadFileProperties(data);
				          			$(this).dialog("close");
				          		}
				          	}
				          ],
				closeText: "Cancel",
				width: "auto",
				maxWidth: 840,
				maxHeight: 540
			});
		}
		else
			addUploadFileProperties(data);
	}
	
	function addUploadFileProperties(data) {
		var cFiles = files.length;
		var selected_radios = $("#dialog form").find("input:checked");
		for(var i = 0; i < cFiles; i++) {
			var file_iid = data[btoa(files[i].name)].iid; // TODO Requires latest browsers for base64 encoding
			var radio_ref = $(selected_radios).filter("[name='"+file_iid+"']")[0];
			files[i]['iid'] = file_iid;
			if(radio_ref) {
				files[i]['action'] = $(radio_ref).attr("data-action");
				files[i]['actionOnIid'] = parseInt($(radio_ref).attr("data-actioniid"));
				files[i]['uploaded_amount'] = parseInt($(radio_ref).val());
			}
			else {
				// New image which is neither a duplicate nor broken
				files[i]['action'] = 'n';
				files[i]['actionOnIid'] = 0;
				files[i]['uploaded_amount'] = 0;
			}
		}
		start_file_upload();
	}
	
	function start_file_upload() {
		if(files.length == 0) do_upload_complete();
//		while(iCurrentFileForUpload < MAX_SIMULTANEOUS_UPLOADS && iCurrentFileForUpload < files.length) // TODO Creating complications when trying to find out when all uploads have completed
			upload_next_file(); 
	}

	function get_files_details(files) {
		files_details = [];
		$(files).each(function(i, file) { files_details.push(get_image_attributes(file)); });
		return files_details;
	}
	
	/*
	 * Returns the attributes of the image file to be saved in the DB
	 * This includes, "batch" name
	 */
	function get_image_attributes(file) {
		var bid = $('.batch select').val();
		data = {filekey: file.key, filename: file.name, size: file.size};
		if (bid != 'None') data['bid'] = bid; 
		return data;
	}
	
	/*
	 * Returns the form data containing the chunk of file to be uploaded
	 */
	function get_form_data(file) {
		var form_data = new FormData();
		form_data.append('theFile', file.slice(file.uploaded_amount));
		return form_data;
	}
	
	/*
	 * Uploads the file with progress bar
	 */
	function upload_file(file) {
		form_data = get_form_data(file);
		headers = get_headers(file);
		ajaxOptions = {headers: headers, cache : false, contentType : false, processData : false,
				  xhr: function()
		          {
		            myXhr = $.ajaxSettings.xhr();
		            if (myXhr.upload) // check if upload property exists 
		            {
		              myXhr.upload.addEventListener('progress', 
	            		  function(e) {
			            	  if (e.lengthComputable) {
			            		  uploaded_amount = (file.uploaded_amount / file.size) + (e.loaded / e.total);
			            		  set_progress(file, uploaded_amount);
			            		  if(uploaded_amount >= 1) do_file_upload_complete();
			            	  }
	              		  }, 
	            		  false);
		            }
		            return myXhr;
		          }};
		loginConsole.ajax(
			'upload', 
			function(response) {
				// TODO: Find a way if XHR is not supported by browser, upload the next file with only
				// MAX_SIMULTANEOUS_UPLOADS runnings at a time
			},
			form_data,
			function(data) {
				if(data.status == 0 && data.state() == 'rejected')
					alert("You are offline. Please connect to internet and try again")
				else
				{
					alert('File Upload: Something went wrong.\nRetry');
					console.error('File Upload: Error!');
				}
			},
			'POST', 
			ajaxOptions);
	}

	/*
	 * To be called when a file is "completely" uploaded
	 */
	function do_file_upload_complete(){
		cFilesUploaded++;
		alert('Upload Success!');
		upload_next_file();
	}
	
	/*
	 * Returns the headers to passed in the upload AJAX request
	 * These the same file attributes passed during check_upload_amount
	 */
	function get_headers(file) {
//		file_properties=['name', 'size', 'type', 'lastModifiedDate', 'key'];
		file_properties=['name','action', 'iid', 'actionOnIid'];
		headers = {}
		for(property in file)
			if(file_properties.indexOf(property) >= 0)
				headers[property.toUpperCase()] = file[property];
		headers['Cache-Control'] = "no-cache";
		return headers;
	}
	
	/*
	 * Sets the Progress bar for the corresponding file if found as a property of the file object passed
	 */
	function set_progress(file, progress_amount) {
		if(file.progress_bar)
			file.progress_bar.value = progress_amount;
		else
			console.log("Couldn't find progress bar for the file: " + file.name);
	}
	
	/*
	 * Final function called after all uploads are completesd
	 */
	function do_upload_complete() {
		alert('All images uploaded');
		$("form#upload")[0].reset();
		iCurrentFileForUpload = 0;  // reset the index of current file being uploaded to zero
	}
}
