/* File: image_manager.js; TO BE DOCUMENTED */
/*****************************************************************************\
*                                                                             *
*    This file is part of BrainSlices Software                                *
*                                                                             *
*    Copyright (C) 2012-2013 J. M. Kowalski                                   *
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

function CImageManager(ajaxProvider)
{
  this.ajaxProvider = ajaxProvider;
  this.images = {};
  this.adjust = null;
}


CImageManager.prototype.destroy = function()
{
  var images = {};
  for (var id in this.images)
  {
    images[id] = null;
  }

  for (var id in images)
  {
    this.removeCachedImage(id);
  }
}

CImageManager.prototype.updateImage = function(id, imageLeft, imageTop,
                                               pixelSize, updateIFace)
{
  if (id == null)
  {
    for (id in this.images)
    {
      this.updateImage(id, imageLeft, imageTop, pixelSize);
    }
  }
  else
  {
    this.images[id].updateInfo(imageLeft, imageTop, pixelSize, null, updateIFace);
  }
}

CImageManager.prototype.propagateImageUpdate = function(image)
{
  alert('Deprecated method CImageManager.propagateImageUpdate called');
  image.update();
}

CImageManager.prototype.updateImageStatus = function(id, status, updateIFace)
{
  if (id == null)
  {
    for (id in this.images)
    {
      this.updateImageStatus(id, status, updateIFace);
    }
  }
  else
  {
    this.images[id].updateInfo(null, null, null, status, updateIFace);
  }
}

CImageManager.prototype.apply = function(id, f, updateIFace)
{
  if (id == null)
  {
    for (id in this.images)
    {
      this.apply(id, f, updateIFace);
    }
  }
  else
  {
    if (id in this.images)
    {
      f(this.images[id], updateIFace);
    }
  }
}

CImageManager.prototype.saveUpdatedTiled = function()
{
  var changed = [];
  var changedMapping = {};
  for (var id in this.images)
  {
    if (id[0] == 'i')
    {
      var image = this.images[id];
      if (image.changed)
      {
        var info = image.info;
        changed.push(info.iid + ',' + info.imageLeft + ',' + info.imageTop
                     + ',' + info.pixelSize + ',' + info.status);
        changedMapping[info.iid] = image;
      }
    }
  }

  if (changed.length > 0)
  {
    this.ajaxProvider.ajax('/upload/updateMetadata',
                           function(response)
                           {
                             if (!response.status)
                             {
                               alert(response.message);
                               return;
                             }
                             var changed = response.data;

                             for (var i = 0; i < changed.length; i++)
                             {
                               var item = changed[i];
                               var image = changedMapping[item[0]];
                               if (item[1])
                               {
                                 var data = image.info;
                                 data._imageLeft = data.imageLeft;
                                 data._imageTop = data.imageTop;
                                 data._pixelSize = data.pixelSize;
                                 data._status = data.status;
                                 image.reset(false);
                               }
                               else
                               {
                                 console.warn('No privileges to change image #' + item[0]);
                               }
                             }
                           },
                           {updated: changed.join(':')});
  }
}

// propagate zIndex value update across all managed images
CImageManager.prototype.setZ = function(id, zIndex)
{
  var image = this.images[id];
  image.z = zIndex;
  var references = image.references;

  for (var cacheId in references) //XXX dangerous
  {
    references[cacheId].setZ(zIndex);
  }
}

CImageManager.prototype.updateImageInterface = function(id)
{
  alert('Deprecated method CImageManager.updateImageInterface used')
  //shall be moved to separated class???
  if (id in this.images)
  {
    this.images[id].updateInterface();
    return true;
  }
  return false;
}

CImageManager.prototype.updateCachedTiledImage = function(id, path, onSuccess, onUpdate, $row)
{
  this.removeCachedImage(id);
  this.cacheTiledImage(id, path, onSuccess, onUpdate, $row);
}

CImageManager.prototype.cacheTiledImageOffline = function(id, path, data, onSuccess, onUpdate, $row, zIndex)
{
  if (!this.has(id))
  {
    var cachedImage = {};
    cachedImage.info = data;

    data._imageLeft = data.imageLeft;
    data._imageTop = data.imageTop;
    data._pixelSize = data.pixelSize;
    data._status = data.status;

    cachedImage.references = {};
    cachedImage.path = path;
    cachedImage.type = 'tiledImage';
    cachedImage.cacheId = 0;
    cachedImage.onUpdate = onUpdate;
    cachedImage.$row = $row;
    cachedImage.id = id;
    cachedImage.z = zIndex != null ? zIndex : 0;

    cachedImage.reset = function(updateIFace)
    {
      cachedImage.changed = false;

      //fix invalid metadata
      data.imageLeft = data._imageLeft;
      if (data.imageLeft == undefined)
      {
        data.imageLeft = 0;
        cachedImage.changed = true;
      }
      data.imageTop = data._imageTop;
      if (data.imageTop == undefined)
      {
        data.imageTop = 0;
        cachedImage.changed = true;
      }
      data.pixelSize = data._pixelSize;
      if (data.pixelSize == undefined)
      {
        data.pixelSize = 100000 / data.imageWidth;
        cachedImage.changed = true;
      }
      data.status = data._status;

      if (cachedImage.$row != null)
      {
        if (cachedImage.changed)
        {
          cachedImage.$row.addClass('changed');
        }
        else if (cachedImage.$row.hasClass('changed'))
        {
          cachedImage.$row.removeClass('changed');
        }
      }

      cachedImage.update(updateIFace);
    }

    cachedImage.updateInterface = function()
    {
      if (cachedImage.onUpdate != null)
      {
        cachedImage.onUpdate();
      }
    }

    cachedImage.update = function(updateIFace)
    {
      var references = cachedImage.references;
      var info = cachedImage.info;
      var imageLeft = info.imageLeft;
      var imageTop = info.imageTop;
      var pixelSize = info.pixelSize;
    
      for (var cacheId in references) //XXX dangerous
      {
        references[cacheId].updateImage(imageLeft, imageTop, pixelSize).update();
      }

      if (updateIFace == null || updateIFace)
      {
        cachedImage.updateInterface();
      }
    }

    cachedImage.updateInfo = function(imageLeft, imageTop, pixelSize, status, updateIFace)
    {
      cachedImage.changed = true;
      if (cachedImage.$row != null)
      {
        cachedImage.$row.addClass('changed');
      }

      if (imageLeft != null) cachedImage.info.imageLeft = imageLeft;
      if (imageTop != null) cachedImage.info.imageTop = imageTop;
      if (pixelSize != null) cachedImage.info.pixelSize = pixelSize;
      if (status != null) cachedImage.info.status = status;
      cachedImage.update(updateIFace);
    }

    cachedImage.destroy = function()
    {
      var references = cachedImage.references;
      for (var cacheId in references)
      {
        // necessary to avoid circular references
        references[cacheId].references = null;
      }

      cachedImage.onUpdate = null;
      cachedImage.updateInterface = null;
      cachedImage.update = null;
      cachedImage.destroy = null;
    }

    cachedImage.onUpdate = onUpdate;

    this.images[id] = cachedImage;
    cachedImage.reset();
  }

  if (onSuccess != null)
  {
    onSuccess(this.images[id]);
  }
}

CImageManager.prototype.cacheTiledImage = function(id, path, onSuccess, onUpdate, $row, zIndex)
{
  var thisInstance = this;
  this.ajaxProvider.ajax(path + '/info.json',
                         function(data)
                         {
                           if (data.status)
                           {
                             thisInstance.cacheTiledImageOffline(id, path, data.data, onSuccess, onUpdate, $row, zIndex);
                           }
                           else
                           {
                             alert(data.message);
                           }
                         },
                         null,
                         null,
                         'GET');

 //   //type: 'POST', //causes 412 error on refresh -_-
}

CImageManager.prototype.startAdjustment = function(id)
{
  if (!(id in this.images))
  {
    return false;
  }

  if (this.adjust == null)
  {
    this.adjust = {};
  }

  this.adjust[id] = this.images[id];
  return true;
}

CImageManager.prototype.has = function(id)
{
  // might be necessary to provide some kind of id allocation
  // - image might not be cached yet, but it might be already
  // being fetched...
  return id in this.images;
}

CImageManager.prototype.stopAdjustment = function(id)
{
  if (this.adjust != null && id in this.adjust)
  {
    delete this.adjust[id];
  }

  if (id == null)
  {
    this.adjust = null;
  }
  else
  {
    for (var i in this.adjust)
    {
      //return if adjust not empty
      return;
    }
    this.adjust = null;
  }
}

CImageManager.prototype.adjustOffset = function(dx, dy, id)
{
  if (this.adjust == null)
  {
    return;
  }


  if (id == null)
  {
    for (id in this.adjust)
    {
      this.adjustOffset(dx, dy, id);
    }
  }
  else if (id in this.adjust)
  {
    var image = this.adjust[id];

    image.changed = true;
    if (image.$row != null)
    {
      image.$row.addClass('changed');
    }
    image.info.imageLeft += dx;
    image.info.imageTop += dy;

    image.update();
  }
  //TODO: update some offset information?
}

CImageManager.prototype.removeCachedImage = function(id)
{
  if (id in this.images)
  {
    this.stopAdjustment(id);
    var image = this.images[id];
    image.destroy();
    delete this.images[id];
  }
}

CImageManager.prototype.getCachedImage = function(id)
{
  if (id in this.images)
  {
    return this.images[id];
  }
  return null;
}

function loadFromCache(cache, id)
{
  var cachedImage = cache.getCachedImage(id);
  if (cachedImage == null) return null;

  return function (path, parentDiv, onSuccess, pixelSize,
                   focusPointX, focusPointY, zIndex, opacity, quality)
  {
    //path and zIndex arguments are being ignored
    var data = cachedImage.info;
    var tileLayer = new CTileLayer(parentDiv,
                                   data.imageWidth,
                                   data.imageHeight,
                                   data.pixelSize,
                                   cachedImage.path + '/tiles',
                                   data.imageLeft,
                                   data.imageTop,
                                   pixelSize,
                                   focusPointX,
                                   focusPointY,
                                   quality,
                                   null, null,
                                   data.tileWidth,
                                   data.tileHeight,
                                   false,
                                   cachedImage.z,
                                   opacity,
                                   cachedImage.references,
                                   cachedImage.cacheId++);
      onSuccess(tileLayer);
  };
}

CLayerStack.prototype.loadFromCache = function(cache, id, quality)
{
  this.loadLayer(id, loadFromCache(cache, id), null, null, quality);
}


function CLayerManager($layerList, stacks, ajaxProvider, doNotRemove, doNotAdjust, doNotDownload, doNotDelete)
{
  this.stacks = stacks;
  this.images = stacks.images; // just a shortcut
  this.$layerList = $layerList;
  this.ajaxProvider = ajaxProvider;

  this.adjustmentEnabled = doNotAdjust != true;
  this.removalEnabled = doNotAdjust != true;
  this.downloadEnabled = doNotDownload != true;
  this.deletionEnabled = doNotDelete != true;

  this.layers = {};
  this.length = 0;

  var thisInstance = this;
  this.tableManager = new CTableManager($layerList,
                                        function()
                                        {
                                          for (var i = 0; i < thisInstance.stacks.stacks.length; i++)
                                          {
                                            thisInstance.stacks.stacks[i].setOpacity();
                                          }

                                          thisInstance.stacks.updateTopZ(thisInstance.tableManager.length);
                                        });
}

CLayerManager.prototype.stopAdjustment = function(id)
{
  return this.images.stopAdjustment(id);
}

CLayerManager.prototype.startAdjustment = function(id)
{
  return this.images.startAdjustment(id);
}

CLayerManager.prototype.isAdjusted = function(id)
{
  return this.images.adjust != null && id in this.images.adjust;
}

CLayerManager.prototype.addTileLayer = function(imageId, path, zIndex, label,
                                                info, update)
{
  if (update == null) update = true;

  var id = 'i' + imageId;

  if (id in this.layers)
  {
    return;
  }

  if (zIndex == null || zIndex < 0 || zIndex > this.length)
  {
    zIndex = this.length;
  }

  if (label == null)
  {
    label = id;
  }

  var thisInstance = this;

  var layer = {};
  layer.id = id;
  layer.label = label;
  layer.path = path;
  layer.loadButtons = [];
  layer.z = null; //to be for sure updated

  // making the layer-related row
  var $row =  $('<tr></tr>');
  var $drag = $('<td draggable="true">' + label + '</td>');
  //XXX: might be quite useful combined with single image view
  var url = document.createElement('a');
  url.href = path;
  url = url.href;
  var dragMIME = [['text/plain', url], ['text/uri-list', url]];

  $row.append($drag);

  // download link
  if (this.downloadEnabled)
  {
    if (id[0] == 'i')
    {
      $row.append('<td><a href="' + path + '/image.png">Download</a></td>');
    }
    else
    {
      $row.append('<td><br></td>');
    }
  }

  // visibility interface
  var $visibility = $('<td></td>');
  layer.$visibility = $visibility;
  $row.append($visibility);

  //adjustment
  var onUpdate = null;
  if (this.adjustmentEnabled)
  {
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
      if (layer.image != null)
      {
        var imageLeft = parseFloat($iface.find('input.imageLeft').val());
        var imageTop = parseFloat($iface.find('input.imageTop').val());
        var pixelSize = parseFloat($iface.find('input.pixelSize').val());
        layer.image.updateInfo(imageLeft, imageTop, pixelSize, null, false);
      }
    });

    $iface.find('select[name="status"]').bind('change', function()
    {
      var status = parseInt($iface.find('select[name="status"]').val());
      layer.image.updateInfo(null, null, null, status, false);
    });

    onUpdate = function()
    {
      if (layer.image != null)
      {
        var info = layer.image.info;
        $iface.find('input.imageLeft').val(info.imageLeft);
        //$iface.find('span.imageLeft').html(info.imageLeft);
        $iface.find('input.imageTop').val(info.imageTop);
        //$iface.find('span.imageTop').html(info.imageTop);
        $iface.find('input.pixelSize').val(info.pixelSize);
        //$iface.find('span.pixelSize').html(info.pixelSize);
        $iface.find('select[name="status"]').val(info.status);
        //$iface.find('span.status').html(STATUS_MAP[info.status]);
      }
    }

    //XXX: is that necessary?
    layer.$iface = $iface;
    layer.$adjust = $adjust;
    $row.append($adjust, $iface);
  }

  //removal
  var onRemove = null;
  if (this.removalEnabled)
  {
    layer.$rem = $('<button>Remove</button>');

    onRemove = function()
    {
      var id = layer.id;
      thisInstance.removeLayer(id);
    };

    layer.$rem.bind('click', function()
    {
      //var z = layer.z;
      //var layers = thisInstance.layers;
      var id = layer.id;
      thisInstance.tableManager.remove(id);
    });
    //XXX: see if there is no problem with chaining method call
    $row.append($('<td></td>').append(layer.$rem));
  }

  //deletion
  if (this.deletionEnabled)
  {
    layer.$del = $('<input type="checkbox">');
    $row.append($('<td></td>').append(layer.$del));
  }

  layer.$row = $row;

  this.layers[id] = layer;
  this.length++;

  this.tableManager.add($row, id, this.length - zIndex,
                        onRemove,
                        function(index)
                        {
                          var z = thisInstance.tableManager.length - 1 - index;
                          layer.z = z;
                          if (thisInstance.images.has(id))
                          {
                            // check necessary in case of update before
                            // the image info is cached
                            thisInstance.images.setZ(id, z);
                          }
                        },
                        dragMIME, false);


  var finishCaching = update ?
                      function(image)
                      {
                        layer.image = image;
                        // trigger onUpdate (unable to do while loading
                        // since image was not assigned
                        if (image.onUpdate) image.onUpdate();
                        thisInstance.updateOrder();
                      } :
                      function(image)
                      {
                        // layer[i].z might be invalid;
                        layer.image = image;
                        // trigger onUpdate (unable to do while loading
                        // since image was not assigned
                        if (image.onUpdate) image.onUpdate();
                      };

  if (info == null)
  {
    this.images.cacheTiledImage(id, path, finishCaching, onUpdate, $row);
  }
  else
  {
    this.images.cacheTiledImageOffline(id, path, info, finishCaching, onUpdate,
                                       $row);
  }
  // onSuccess shall update interface and z-indices
  return id;
}

CLayerManager.prototype.updateOrder = function()
{
  this.tableManager.update();
  this.arrangeInterface();
}

CLayerManager.prototype.arrangeInterface = function()
{
  this.$layerList.find('.recyclableElement').detach();
  var nmax = this.stacks.nx * this.stacks.ny;

  for (var id in this.layers)
  {
    var layer = this.layers[id];
    var loadButtons = layer.loadButtons;

    layer.$visibility.empty();
    for (var n = 0; n < nmax; n++)
    {
      if (n == loadButtons.length)
      {
        loadButtons.push(this.layerCB(id, n));
      }
      var $cb = loadButtons[n].$cb;

      if (this.stacks.has(n, id))
      {
        $cb.attr('checked', 'checked');
      }
      else
      {
        $cb.filter(':checked').removeAttr('checked');
      }
      layer.$visibility.append($cb);
    }

    var toDismiss = loadButtons.splice(nmax);
    for (var i = 0; i < toDismiss.length; i++)
    {
      var item = toDismiss[i];
      item.$cb.unbind('change', item.changeHandler);
    }

    layer.loadButtons = loadButtons;
  }
}


CLayerManager.prototype.layerCB = function(id, stackId)
{
  //TODO: use stack instead of stackId???
  
  var thisInstance = this;
  var stack = this.stacks.stacks[stackId];
  var $cb = $('<input type="checkbox" class="recyclableElement">');
  var changeHandler = function()
  {
    if ($cb.filter(':checked').length != 0)
    {
      thisInstance.loadLayerByStack(stack, id, true);
    }
    else
    {
      thisInstance.unload(stack.syncId(), id, true);
    }
  };

  $cb.bind('change', changeHandler);

  var res = {};
  res.$cb = $cb;
  res.changeHandler = changeHandler
  return res;
}

CLayerManager.prototype.removeLayer = function(id)
{
  var toDismiss = this.layers[id].loadButtons;
  //XXX: redundant with arrangeInterface();
  for (var i = 0; i < toDismiss.lenght; i++)
  {
    var item = toDismiss[i];
    item.$cb.unbind('change', item.changeHandler);
  }
  delete this.layers[id];
  this.length--;

  this.stacks.removeLayer(id);
}

CLayerManager.prototype.flush = function()
{
  this.tableManager.flush();
}

//an alias
CLayerManager.prototype.load = function(stackId, imageId, doNotUpdateIface)
{
  this.loadLayerByStack(this.stacks.stacks[stackId], imageId, doNotUpdateIface);
}

CLayerManager.prototype.loadLayerByStack = function(stack, imageId,
                                                  doNotUpdateIface)
{
  this.stacks.loadLayerByStack(stack, imageId);
  if (doNotUpdateIface != true)
  {
    this.loadButtons[imageId][stack.syncId()].$cb.attr('checked', 'checked');
  }
}

CLayerManager.prototype.unload = function(stackId, imageId, doNotUpdateIface)
{
  this.stacks.unload(stackId, imageId);
  if (doNotUpdateIface != true)
  {
    this.loadButtons[imageId][stackId].$cb.filter(':checked').removeAttr('checked');
  }
}

CLayerManager.prototype.loadedImagesOrdered = function()
{
  var images = this.stacks.loadedImages();
  var ordered = [];
  var order = this.tableManager.getOrder();
  for (var i = 0; i < order.length; i++)
  {
    var id = order[i];
    if (id in images)
    {
      ordered.push(id);
    }
  }
  return ordered;
}

CLayerManager.prototype.removeStack = function(id, doNotDestroy)
{
  //remove layer load/unload buttons
  for (var imageId in this.loadButtons)
  {
    var item = this.loadButtons[imageId].splice(id, 1);
    if (item.length == 1)
    {
      item[0].$cb.unbind('change', item[0].changeHandler);
      item[0].$cb.remove(); //XXX
    }
  }
  return this.stacks.removeStack(id, doNotDestroy);
}

//an alias
CLayerManager.prototype.unloadAll = function(id)
{
  return this.stacks.unloadAll(id);
}

CLayerManager.prototype.deleteImages = function()
{
  var toDelete = [];
  var deleteMapping = {};
  for (var id in this.layers)
  {
    var layer = this.layers[id];
    if (layer.$del == null) continue;
    if (layer.$del.filter(':checked').length == 0) continue;
    if (layer.image == null) continue;
    var iid = layer.image.info.iid;
    toDelete.push(iid);
    deleteMapping[iid] = id;
  }

  if (toDelete.length > 0 &&
      confirm("Do you really want to delete " +
              (toDelete.length == 1 ?
               "the image" :
               toDelete.length + " images") + " permanently?"))
  {
    var thisInstance = this;
    this.ajaxProvider.ajax('/upload/deleteImages',
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
                                 thisInstance.tableManager.remove(deleteMapping[item[0]],
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
                             thisInstance.updateOrder();
                           },
                           {iids: toDelete.join(',')});
  }
}

CLayerManager.prototype.destroy = function()
{
  this.flush();
  this.tableManager.destroy();
  this.tableManager = null;
  this.stacks = null;
  this.images = null;
  this.$layerList = null;
  this.ajaxProvider = null;
  this.layers = null;
  //TODO: check what happens to everything else bound to this.$layerList descendants

}
