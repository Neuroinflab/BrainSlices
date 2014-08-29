var uploadedFiles = null;
var fileUploader = null;

function initUpload()
{
  var STATUS_MAP = BrainSlices.gui.STATUS_MAP;
  var scope = BrainSlices.scope;
  
  /*
  var deleteButtons = {};
  
  function deleteImages()
  {
    var toDelete = [];
    var deleteMapping = {};
    for (var id in deleteButtons)
    {
      var $del = deleteButtons[id];
      if (!$del) continue;
      if ($del.filter(':checked').length == 0) continue;
      var image = images.getCachedImage(id);
      if (image == null) continue;
      var iid = image.info.iid;
      toDelete.push(iid);
      deleteMapping[iid] = id;
    }
  
    if (toDelete.length > 0 &&
        confirm("Do you really want to delete " +
                (toDelete.length == 1 ?
                 "the image" :
                 toDelete.length + " images") + " permanently?"))
    {
      loginConsole.ajax('/upload/deleteImages',
                        function(response)
                        {
                          if (!response.status)
                          {
                            alert(response.message);
                            return;
                          }
                          var data = response.data;
                          if (data.length != toDelete.length)
                          {
                            alert("Some of images not found in the database.");
                          }
  
                          var preserved = false;
                          for (var i = 0; i < data.length; i++)
                          {
                            var item = data[i];
                            if (item[1])
                            {
                              layerManager.removeLayer(deleteMapping[item[0]],
                                                       false);
                            }
                            else
                            {
                              preserved = true;
                            }
                          }
                          if (preserved)
                          {
                            alert("Not enough privileges to delete some of images.");
                          }
                          layerManager.updateOrder();
                        },
                        {iids: toDelete.join(',')});
    }
  }
  
  */
  
  // layerManager operations disabled
  function batchDetails()
  {
    // Fetch info about images in selected batch
    // and append them to the uploaded files table
    var bid = $('#batchId').val();
    var query = (bid == 'None') ? '' : 'bid=' + bid;
  
    loginConsole.ajax('/upload/batchDetails',
                      function(data)
                      {
                        if (!data.status)
                        {
                          alert(data.message);
                          return false;
                        }
  
                        // layerManager.flush();
                        fileUploader.reset();
                        data.data.sort(function(a, b)
                                       {
                                         if (a.filename < b.filename)
                                         {
                                           return -1;
                                         }
                                         if (a.filename > b.filename)
                                         {
                                           return 1;
                                         }
                                         return a.iid - b.iid;
                                       });
  
                    		for (var i = 0; i < data.data.length; i++)
                    		{
                          var image = data.data[i];
                          var id = image.iid;
                          if (image.status >= 6)
                          {
                            // status: completed
  
                            // layerManager.autoAddTileLayer(image);
                          }
                          fileUploader
                            .append(image.filename,
                                    //+ (image.status == 7 ?
                                    //   '' :
                                    //   ' (' + STATUS_MAP[image.status] + ')'),
                                    image.declaredFilesize,
                                    image.sourceFilesize,
                                    image.iid,
                                    image.sourceCRC32,
                                    image.status);
                    		}
  
                        // layerManager.updateOrder();
                      },
                      query,
                      null,
                      'GET');
  //    //type: 'POST', //causes 412 error on refresh -_-
  
    return false;
  }


  $('#batchDetails').click(batchDetails);
  $('#batchId').change(batchDetails);


  $('#editCart')
    .click(scope.getToggle('edit'));

  scope
    .registerChange(function(value)
    {
      if (value)
      {
        $('#editCart')
          .addClass('selected');
      }
      else
      {
        $('#editCart')
          .removeClass('selected');

        layerManager.stopAdjustment();
      }

      layerManager.doLazyRefresh();
    }, 'edit')
    .registerChange(function(value)
    {
      // fetch list of available batches
      // and update #batchId select
      var $batchSelect = $('#batchId')
        .html('<option value="None" selected="selected">None</option>');

      if (value == null)
      {
        scope.set('edit', false);
        $('#editCart').hide();
        return;
      }

      $('#editCart').show();

      loginConsole.ajax(
        '/upload/batchList',
        function(response)
        {
          if (!response.status)
          {
            alertWindow.error(response.message);
            return;
          }
    
          var list = response.data;
          for (var i = 0; i < list.length; i++)
          {
            $batchSelect.append('<option value="' + list[i][0] + '">' +
                                BrainSlices.gui.escapeHTML(list[i][1]) + '</option>');
          }
        },
        null, null, null,
        {cache: false});
    }, 'login');

  

  $('#newBatch')
    .click(function()
    {
      // create (and select) a new batch
      fileUploader.reset();

      var comment = $('#newBatchComment').val();
      var $batchSelect = $('#batchId');
    
      loginConsole.ajax(
        '/upload/newBatch',
        function(response)
        {
          if (!response.status)
          {
            alert(response.message);
            return;
          }
          $batchSelect.append('<option value="' + response.data.bid + '">' +
                         BrainSlices.gui.escapeHTML(response.data.comment) + '</option>');
          $batchSelect.val(response.data.bid);
        },
        {comment: comment},
        null,
        null,
        {cache: false});
    });
 
  $('#uploadFiles')
    .click(function()
    {
    
      fileUploader.submit($('#filesForUpload')[0].files,
                          $('#filterImageType').prop('checked'));
    });
  
  function updateFiles()
  {
    // a dummy call just to see if an error message is being displayed // XXX ???
    fileUploader.filterImageFiles($('#filesForUpload')[0].files,
                                  $('#filterImageType').prop('checked'));
  }

  $('#filesForUpload').change(updateFiles);
  $('#filterImageType').change(updateFiles);


  /*
  // XXX: Some quick hacks
  
  function saveUpdated()
  {
    //TODO: move to layerManager or so...
    layerManager.images.saveUpdatedTiled();
  }
  
  function updatePixelSize()
  {
    var ps = parseFloat($('#nps').val());
    layerManager.images.updateImage(null, null, null, ps);
  }
  
  function updateLeft()
  {
    var nleft = parseFloat($('#nleft').val());
    layerManager.images.updateImage(null, nleft);
  }
  
  function updateTop()
  {
    var ntop = parseFloat($('#ntop').val());
    layerManager.images.updateImage(null, null, ntop);
  }
  
  function updateStatus()
  {
    var nstatus = parseInt($('#nstatus').val());
    layerManager.images.updateImageStatus(null, nstatus);
  }
  
  function centerImage(id)
  {
    layerManager.images.apply(id, function(image, updateIfeace)
    {
      var info = image.info;
      var factor = -0.5 * info.pixelSize;
      var imageLeft = factor * info.imageWidth;
      var imageTop = factor * info.imageHeight;
      image.updateInfo(imageLeft, imageTop, null, null, updateIfeace);
    });
  }
  
  function resetImage(id)
  {
    layerManager.images.apply(id, function(image, updateIface)
    {
      image.reset(updateIface);
    });
  }
  
  */
}

function initUploadFinish()
{
  uploadedFiles = new CUploadedImages($('#uploadDiv table.uploaded>tbody'),
                                      null,
                                      $('#upload_status_message'),
                                      loginConsole);
  fileUploader = new CFileUploader(
    loginConsole, uploadedFiles, $('#brokenDuplicatePanel'),
    function(callback)
    {
      var $batchSelect = $('#batchId');
  
      var bid = $batchSelect.val();
      if (bid != 'None')
      {
        callback(parseInt(bid));
        return;
      }
  
      loginConsole.ajax(
        '/upload/newBatch',
        function(response)
        {
          if (!response.status)
          {
            alert(response.message);
            return;
          }
  
          $batchSelect.append('<option value="'
                              + response.data.bid + '">'
                              + BrainSlices.gui.escapeHTML(response.data.comment)
                              + '</option>');
          $batchSelect.val(response.data.bid);
          callback(response.data.bid);
        },
        null, null, null,
        {cache: false});
    });
  
  
    // TODO: check if the function is somehow useful
  
    /*
    layerManager = new CLayerManager($('#controlPanel .layerList'), stacks,
                                     loginConsole,
    {
      addTileLayer:
      function(info)
      {
        var id = info.iid;
  
        if (this.has(id)) return;
  
        var image = null;
        var path = '/images/' + id;
  
        var thisInstance = this
  
        // making the layer-related row
        var $row =  $('<tr></tr>');
        var $drag = $('<td draggable="true">' + info.filename + '</td>');
  
        var dragMIME = [];
  
        $row.append($drag);
  
        // visibility interface
        var $visibility = $('<td></td>');
        $row.append($visibility);
  
        //adjustment
        var $adjust = $('<input type="checkbox">');
        var $iface = $('<span style="display: none;">' +
                        '<input type="number" class="imageLeft">' +
                        '<input type="number" class="imageTop">' +
                        '<input type="number" class="pixelSize">' +
                        '<select name="status">' +
                         '<option value="6">Completed</option>' +
                         '<option value="7">Accepted</option>' +
                        '</select>' +
                       '</span>');
  
        $adjust.bind('change', function()
        {
          if ($adjust.filter(':checked').length  != 0)
          {
            $iface.show();
            thisInstance.images.startAdjustment(id);
          }
          else
          {
            $iface.hide();
            thisInstance.images.stopAdjustment(id);
          }
        });
  
        $iface.find('input').bind('change', function()
        {
          if (image)
          {
            var imageLeft = parseFloat($iface.find('input.imageLeft').val());
            var imageTop = parseFloat($iface.find('input.imageTop').val());
            var pixelSize = parseFloat($iface.find('input.pixelSize').val());
            image.updateInfo(imageLeft, imageTop, pixelSize, null, false);
          }
        });
  
        $iface.find('select[name="status"]').bind('change', function()
        {
          if (image)
          {
            var status = parseInt($iface.find('select[name="status"]').val());
            image.updateInfo(null, null, null, status, false);
          }
        });
  
        function onUpdate()
        {
          var info = this.info;
          $iface.find('input.imageLeft').val(info.imageLeft);
          $iface.find('input.imageTop').val(info.imageTop);
          $iface.find('input.pixelSize').val(info.pixelSize);
          $iface.find('select[name="status"]').val(info.status);
        }
  
        $row.append($adjust, $iface);
  
        //removal
  
        var $rem = $('<button>Remove</button>');
  
        $rem.bind('click', function()
        {
          thisInstance.tableManager.remove(id);
        });
        $row.append($('<td></td>').append($rem));
  
        //deletion
        var $del = $('<input type="checkbox">');
        deleteButtons[id] = $del;
        $row.append($('<td></td>').append($del));
  
        this.addTileLayer(id, $row, $visibility, null, null,
                          function()
                          {
                            delete deleteButtons[id];
                          },
                          path, info, false,
                          function(img)
                          {
                            image = img;
                          },
  			null, null,onUpdate);
  
      }
    });
    */

  BrainSlices.scope.set('edit', false);
}
