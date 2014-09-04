var uploadedFiles = null;
var fileUploader = null;
var privilegeManager = null;
var propertiesManager = null;

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

  $('#editMode')
    .change(function()
    {
      scope.set('editMode', $('#editMode').val());
    });


// adjustement

  $('#adjustPanelAdjust')
    .change(function()
    {
      if (this.checked)
      {
        images.apply(null, function(image, updateIface)
        {
          if (image.info.editPrivilege > 0)
          {
            images.startAdjustment(image.id);
          }
        });
      }
      else
      {
        images.stopAdjustment();
      }

      layerManager.doLazyRefresh();
    });

  $('#centerAdjustment')
    .click(function()
    {
      images.applyAdjusted(function(image, updateIface)
      {
        var info = image.info;
        var factor = -0.5 * info.pixelSize;
        var imageLeft = factor * info.imageWidth;
        var imageTop = factor * info.imageHeight;
        image.updateInfo(imageLeft, imageTop, null, null, updateIface);
      });
    });

  $('#adjustPanelLeft')
    .change(function()
    {
      var val = $(this).val();
      images.applyAdjusted(function(image, updateIface)
      {
        image.updateInfo(parseFloat(val), null, null, null, updateIface);
      });
    });

  $('#adjustPanelTop')
    .change(function()
    {
      var val = $(this).val();
      images.applyAdjusted(function(image, updateIface)
      {
        image.updateInfo(null, parseFloat(val), null, null, updateIface);
      });
    });

  $('#adjustPanelRes')
    .change(function()
    {
      var val = $(this).val();
      images.applyAdjusted(function(image, updateIface)
      {
        image.updateInfo(null, null, 25400. / parseFloat(val), null, updateIface);
      });
    });

  $('#adjustPanelStatus')
    .change(function()
    {
      var val = $(this).val();
      images.applyAdjusted(function(image, updateIface)
      {
        image.updateInfo(null, null, null, parseInt(val), updateIface);
      });
    });

  $('#saveAdjustment')
    .click(function()
    {
      images.saveUpdatedTiled(true);
    });


  $('#resetAdjustment')
    .click(function()
    {
      images.apply(null, function(image, updateIface)
      {
        image.reset(updateIface);
      });
    });


// privileges
  $('#publicViewPrivilege').click(function()
  {
    var checked = this.checked;
    images.apply(null, function(image, updateIface)
    {
      if (image.info.editPrivilege > 0)
      {
        privilegeManager.changePublic(image.info.iid,
          checked, null, null, null, updateIface == false);
      }
    });
  });

  $('#publicEditPrivilege').click(function()
  {
    var checked = this.checked;
    images.apply(null, function(image, updateIface)
    {
      if (image.info.editPrivilege > 0)
      {
        privilegeManager.changePublic(image.info.iid,
          null, checked, null, null, updateIface == false);
      }
    });
  });

  $('#publicAnnotatePrivilege').click(function()
  {
    var checked = this.checked;
    images.apply(null, function(image, updateIface)
    {
      if (image.info.editPrivilege > 0)
      {
        privilegeManager.changePublic(image.info.iid,
          null, null, checked, null, updateIface == false);
      }
    });
  });

  $('#publicOutlinePrivilege').click(function()
  {
    var checked = this.checked;
    images.apply(null, function(image, updateIface)
    {
      if (image.info.editPrivilege > 0)
      {
        privilegeManager.changePublic(image.info.iid,
          null, null, null, checked, updateIface == false);
      }
    });
  });

  $('#resetPrivileges').click(function()
  {
    privilegeManager.reset();
  });

  $('#savePrivileges').click(function()
  {
    privilegeManager.savePublic();
  });



  scope
    .registerChange(function(value)
    {
      if (value)
      {
        $('#editCart')
          .addClass('selected');

        $('#layersConsoleTable').addClass('editPanel');
        $('#editPanel').show(0);
        $('#editMode').show(0);
      }
      else
      {
        $('#editCart')
          .removeClass('selected');

        layerManager.stopAdjustment();
        $('#editPanel').hide(0);
        $('#editMode').hide(0);
        $('#layersConsoleTable').removeClass('editPanel');
      }

      layerManager.doLazyRefresh();
    }, 'edit')
    .registerChange(function(value)
    {
      switch (value)
      {
        case 'adjust':
          $('#privilegesPanel').hide(0);
          $('#propertyPanel').hide(0);
          $('#adjustPanel').show(0);
          break;

        case 'privileges':
          $('#adjustPanel').hide(0);
          $('#propertyPanel').hide(0);
          $('#privilegesPanel').show(0);
          break;

        case 'properties':
          $('#privilegesPanel').hide(0);
          $('#adjustPanel').hide(0);
          $('#propertyPanel').show(0);
          break;
      }

      layerManager.doLazyRefresh();
    }, 'editMode')
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
}

function initUploadFinish()
{
  privilegeManager = new CImagePrivilegesManager(loginConsole);
  propertiesManager = new CPropertiesManager(loginConsole);

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
        /// XXX: A LARGE CUT
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
    */


  // properties

  updatePropertySuggestions(null,
    function()
    {
      $('#propertyPanel')
        .append(makeAddPropertyPanel(
        {
          Add:
          function(name, property)
          {
            images.apply(null, function(image, updateIface)
            {
              var info = image.info;
              if (info.annotatePrivilege > 0 &&
                  !propertiesManager.has(info.iid, name))
              {
                propertiesManager.autoAdd(info.iid, name, property);
              }
            });
          },
          Set:
          function(name, property)
          {
            images.apply(null, function(image, updateIface)
            {
              var info = image.info;
              if (info.annotatePrivilege > 0)
              {
                if (propertiesManager.has(info.iid, name))
                {
                  propertiesManager.remove(info.iid, name);
                }
                propertiesManager.autoAdd(info.iid, name, property);
              }
            });
          }
        },
        {
          Reset:
          function()
          {
            propertiesManager.reset();
          },
          Save:
          function()
          {
            propertiesManager.save();
          }
        }));
    });

  BrainSlices.scope.set('edit', false);
  BrainSlices.scope.set('editMode', 'adjust');
}
