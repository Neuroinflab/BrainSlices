var uploadedFiles = null;
var fileUploader = null;
var privilegeManager = null;
var propertiesManager = null;

function flushBatchFilter()
{
  $('#batchFilter')
    .empty()
    .append($('<option>')
      .attr('value', 'none')
      .text('--- any collection ---'))
    .val('none');
}

function initUpload()
{
  $('#batchFilter')
    .tooltip(BrainSlices.gui.tooltip)

  var STATUS_MAP = BrainSlices.gui.STATUS_MAP;
  var scope = BrainSlices.scope;

  
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
                          alertWindow.error(data.message);
                          return false;
                        }
  
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
                      },
                      query,
                      null,
                      'GET');
  //    //type: 'POST', //causes 412 error on refresh -_-
  
    return false;
  }


  $('#batchDetails').click(batchDetails);
  $('#batchId').change(batchDetails);


  $('#editMode')
    .change(function()
    {
      scope.set('editMode', $('#editMode').val());
    });


// adjustement
  var valign =
  {
    top:
    function()
    {
      return 0;
    },

    '':
    function(info)
    {
      return -0.5 * info.pixelSize * info.imageHeight;
    },

    bottom:
    function(info)
    {
      return -info.pixelSize * info.imageHeight;
    }
  };

  var halign =
  {
    left:
    function()
    {
      return 0;
    },

    '':
    function(info)
    {
      return -0.5 * info.pixelSize * info.imageWidth;
    },

    right:
    function(info)
    {
      return -info.pixelSize * info.imageWidth;
    }
  };

  for (var y in valign)
  {
    for (var x in halign)
    {
      (function(valign, halign)
      {
        $('#centerPanel')
          .append($('<a>')
            .attr('title', x && y ?
                           'align ' + y + ' ' + x + ' corners' :
                           x || y ? 'align ' + x + y + ' edges' :
                           'center')
            .addClass(x + ' centerPanelButton ' + y)
            .button()
            .tooltip(BrainSlices.gui.tooltip)
            .click(function()
            {
              console.log(x, y)
              images.applyAdjusted(function(image, updateIface)
              {
                console.log(image.info.iid, updateIface);
                console.debug(halign, valign)
                console.log(halign(image.info), valign(image.info))
                image.updateImage(halign(image.info), valign(image.info),
                                  null, updateIface);
              }, true);
            }));
      })(valign[y], halign[x]);
    }
  }

  var adjustAll = {};
    
  makeAdjustmentPanel($('#adjustPanel'), null, null, null, null,
  {
    adjust:
    function(adjust)
    {
      if (adjust)
      {
        images.applyPrivilege('edit', function(image, updateIface)
        {
          images.startAdjustment(image.id);
        });
      }
      else
      {
        images.stopAdjustment();
      }

      layerManager.doLazyRefresh();
      animateImageCartHeader();
    },

    offset:
    function(offset)
    {
      adjustAll.left = offset.left;
      adjustAll.top = offset.top;
    },

    pixel:
    function(pixel)
    {
      adjustAll.pixel = pixel;
    },

    buttons:
    {
      Set:
      function()
      {
        images.applyAdjusted(function(image, updateIface)
        {
          image.updateImage(adjustAll.left, adjustAll.top,
                            adjustAll.pixel, updateIface);
        });
      }
    }
  }, true);

//management
  $('#managementPanelStatus').change(function()
  {
    var status = parseInt($('#managementPanelStatus').val()); 
    images.applyPrivilege('edit', function(image, updateIface)
    {
      image.updateStatus(status, updateIface);
    });
  });

  $('#tiledImageDeleteAll')
    .button()
    .change(function()
    {
      var del = this.checked;
      images.applyPrivilege('edit', function(image, updateIface)
      {
        image.delete(del);
      });
    });

  $('#tiledImageDeleteAllLabel').tooltip(BrainSlices.gui.tooltip);

// privileges
  $('#publicViewPrivilege').click(function()
  {
    var checked = this.checked;
    images.applyPrivilege('edit', function(image, updateIface)
    {
      privilegeManager.changePublic(image.info.iid, checked, null, null, null,
                                    updateIface == false);
    });
  });

  $('#publicEditPrivilege').click(function()
  {
    var checked = this.checked;
    images.applyPrivilege('edit', function(image, updateIface)
    {
      privilegeManager.changePublic(image.info.iid, null, checked, null, null,
                                    updateIface == false);
    });
  });

  $('#publicAnnotatePrivilege').click(function()
  {
    var checked = this.checked;
    images.applyPrivilege('edit', function(image, updateIface)
    {
      privilegeManager.changePublic(image.info.iid, null, null, checked, null,
                                    updateIface == false);
    });
  });

  //$('#publicOutlinePrivilege').click(function()
  //{
  //  var checked = this.checked;
  //  images.applyPrivilege('edit', function(image, updateIface)
  //  {
  //    privilegeManager.changePublic(image.info.iid, null, null, null, checked,
  //                                  updateIface == false);
  //  });
  //});

  $('#editPanelReset')
    .click(function()
    {
      switch (scope.get('editMode'))
      {
        case 'privileges':
          privilegeManager.reset();
          break;

        case 'properties':
          propertiesManager.reset();
          break;

        case 'adjust': // if no privilege MUST BE RESET!
          images.apply(null, function(image, updateIface)
          {
            image.resetImage(updateIface);
          });
          break;

        case 'manage': // if no privilege MUST BE RESET!
          images.apply(null, function(image, updateIface)
          {
            image.resetStatus(updateIface);
            image.delete(false);
          });
          break;

        default:
          console.error(scope.get('editMode'));
      }
    });

  $('#editPanelSave')
    .click(function()
    {
      switch (scope.get('editMode'))
      {
        case 'privileges':
          privilegeManager.savePublic();
          break;

        case 'properties':
          propertiesManager.save();
          break;

        case 'adjust':
          images.saveUpdatedTiledImages(true);
          break;

        case 'manage':
          images.saveUpdatedTiledStatuses(true);
          break;

        default:
          console.error(scope.get('editMode'));
      }
    });

  $('#deleteImagesButton')
    .tooltip(BrainSlices.gui.tooltip)
    .click(function()
    {
      if (confirm("Do you really want to remove selected images permanently?"))
      {
        images.deleteTiled(null, function()
        {
          animateImageCartHeader();
        });
      }
    });



  scope
    .registerChange(function(value)
    {
      switch (value)
      {
        case 'details':
          layerManager.stopAdjustment(); //XXX
          $('#editPanel').hide(0); //XXX -> hide other things
          $('#privilegesPanel').hide(0);
          $('#propertyPanel').hide(0);
          $('#adjustPanel').hide(0);
          $('#managePanel').hide(0);
          $('#deleteImagesButton').hide(0);
          break;

        case 'manage':
          $('#editPanel').show(0); //XXX
          $('#privilegesPanel').hide(0);
          $('#propertyPanel').hide(0);
          $('#adjustPanel').hide(0);
          $('#managePanel').show(0);
          $('#deleteImagesButton').show(0);
          break;

        case 'adjust':
          $('#editPanel').show(0); //XXX
          $('#privilegesPanel').hide(0);
          $('#propertyPanel').hide(0);
          $('#managePanel').hide(0);
          $('#deleteImagesButton').hide(0);
          $('#adjustPanel').show(0);
          break;

        case 'privileges':
          $('#editPanel').show(0); //XXX
          $('#adjustPanel').hide(0);
          $('#propertyPanel').hide(0);
          $('#managePanel').hide(0);
          $('#deleteImagesButton').hide(0);
          $('#privilegesPanel').show(0);
          break;

        case 'properties':
          $('#editPanel').show(0); //XXX
          $('#privilegesPanel').hide(0);
          $('#adjustPanel').hide(0);
          $('#managePanel').hide(0);
          $('#deleteImagesButton').hide(0);
          $('#propertyPanel').show(0);
          break;
      }

      layerManager.doLazyRefresh();
    }, 'editMode')
    .registerChange(function(value)
    {
      var $batchSelect = $('#existingBatch')
        .empty();

      flushBatchFilter();

      if (value == null)
      {
        scope.set('editMode', 'details');
        $('#editMode').hide(0); // XXX???
        $('#editModeImageAnnotations').show(0);
        $('#batchFilterDiv').hide(0);
        return;
      }

      $('#editModeImageAnnotations').hide(0);
      $('#editMode').show(0); // XXX???
      $('#batchFilterDiv').show(0);

      loginConsole.ajax(
        '/upload/batchList',
        function(response)
        {
          if (!response.status)
          {
            alertWindow.error(response.message);
            return;
          }
    
          if (response.data.length == 0)
          {
            $('#newBatch')
              .val('yes')
              .change()
              .find('option[value="no"]')
              .prop('disabled', true);
          }
          else
          {
            $('#newBatch')
              .find('option[value="no"]')
              .prop('disabled', false);
          }

          function makeOption(item)
          {
            return $('<option>')
              .attr('value', item[0] + '')
              .text(item[1]);
          }

          $batchSelect
            .append(response.data.map(makeOption));

          $('#batchFilter')
            .append(response.data.map(makeOption));
        },
        null, null, null,
        {cache: false});
    }, 'login');

  $('#newBatch')
    .change(function()
    {
      if ($('#newBatch').val() == 'yes')
      {
        $('#existingBatch').hide(0);
        $('#newBatchName').show(0);
      }
      else
      {
        $('#newBatchName').hide(0);
        $('#existingBatch').show(0);
      }
    })
    .change();
  
 
  $('#uploadFiles')
    .click(function()
    {
      var offset = $('#offsetUpload').offsetinput('value');
      fileUploader.submit($('#filesForUpload')[0].files,
                          $('#filterImageType').prop('checked'),
                          null, //final function
                          $('#resolutionUpload').resolution('value'),
                          offset.top, offset.left);
    });
  
  function updateFiles()
  {
    // a dummy call just to see if an error message is being displayed // XXX ???
    fileUploader.filterImageFiles($('#filesForUpload')[0].files,
                                  $('#filterImageType').prop('checked'));
  }

  $('#filesForUpload').change(updateFiles);
  $('#filterImageType').change(updateFiles);
  $('#offsetUpload').offsetinput();
  $('#resolutionUpload').resolution();
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
      var $batchSelect = $('#existingBatch');
  
      if ($('#newBatch').val() != 'yes')
      {
        callback(parseInt($batchSelect.val()));
        return;
      }

      var batchDesc = $('#newBatchName').val().trim();
  
      loginConsole.ajax(
        '/upload/newBatch',
        function(response)
        {
          if (!response.status)
          {
            alertWindow.error(response.message);
            return;
          }

          function makeOption(data)
          {
            return $('<option>')
              .attr('value', data.bid + '')
              .text(data.comment);
          }

          $batchSelect
            .append(makeOption(response.data))
            .val(response.data.bid);

          $('#batchFilter')
            .append(makeOption(response.data));

          $('#newBatch')
            .val('no')
            .change();

          callback(response.data.bid);
        },
        batchDesc == '' ? null : {comment: batchDesc}, null, null,
        {cache: false});
    });
  

  // properties

  updatePropertySuggestions(null,
    function()
    {
      $('#propertyPanel')
        .append(makeAddPropertyPanel(
        [
          {
            Add:
            function(name, property)
            {
              images.applyPrivilege('annotate', function(image, updateIface)
              {
                var info = image.info;
                if (!propertiesManager.has(info.iid, name))
                {
                  propertiesManager.autoAdd(info.iid, name, property);
                }
              });

              triggerImageCartHeaderAnimation();
              return true;
            },
            Set:
            function(name, property)
            {
              images.applyPrivilege('annotate', function(image, updateIface)
              {
                var info = image.info;
                propertiesManager.remove(info.iid, name);
                propertiesManager.autoAdd(info.iid, name, property);
              });

              triggerImageCartHeaderAnimation();
              return true;
            }
          },
          {
            Remove:
            function(name, property)
            {
              images.applyPrivilege('annotate', function(image, updateIface)
              {
                propertiesManager.remove(image.info.iid, name);
              });
              return false;
            }
          }],
          triggerImageCartHeaderAnimation));
    });

  BrainSlices.scope.set('editMode', 'details');
}
