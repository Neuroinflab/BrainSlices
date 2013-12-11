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

CImageManager.prototype.bindImageInterface = function(id, iface)
{
  if (id in this.images)
  {
    var image = this.images[id];

    if (iface != null)
    {
      image.iface = iface;
      var thisInstance = this;

      image.updateHandler = function()
      {
        var imageLeft = parseFloat(iface.find('input.imageLeft').val());
        var imageTop = parseFloat(iface.find('input.imageTop').val());
        var pixelSize = parseFloat(iface.find('input.pixelSize').val());
        image.updateInfo(imageLeft, imageTop, pixelSize, null, false);
        //thisInstance.updateImage(id, imageLeft, imageTop, pixelSize, false);
      }

      image.statusChangeHandler = function()
      {
        var status = parseInt(iface.find('select[name="status"]').val());
        image.updateInfo(null, null, null, status, false);
        //thisInstance.updateImageStatus(id, status);
      }

      iface.find('input').bind('change', image.updateHandler);
      iface.find('select[name="status"]').bind('change', image.statusChangeHandler);
    }
    else
    {
      if (image.iface != null)
      {
        if (image.updateHandler != null)
        {
          image.iface.find('input').unbind('change', image.updateHandler);
        }

        if (image.statusChangeHandler != null)
        {
          image.iface.find('select[name="status"]').unbind('change', image.statusChangeHandler);
        }
      }

      image.updateHandler = null;
      image.statusChangeHandler = null;
      image.iface = null;
    }

    image.updateInterface();
    return true;
  }
  return false;
}

CImageManager.prototype.bindImageRow = function(id, $row)
{
  if (id in this.images)
  {
    var image = this.images[id];
    if ($row != null)
    {
      if (image.changed)
      {
        $row.addClass('changed');
      }
      else if ($row.hasClass('changed'))
      {
        $row.removeClass('changed');
      }
    }
    this.images[id].$row = $row;
    return true;
  }
  return false;
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

CImageManager.prototype.updateCachedTiledImage = function(id, path, onSuccess, iface)
{
  this.removeCachedImage(id);
  this.cacheTiledImage(id, path, onSuccess, iface);
}

CImageManager.prototype.cacheTiledImageOffline = function(id, path, data, onSuccess, iface, zIndex)
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
    cachedImage.iface = iface;
    cachedImage.$row = null; //???
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
      if (cachedImage.iface != null)
      {
        var iface = cachedImage.iface;
        var info = cachedImage.info;
        iface.find('input.imageLeft').val(info.imageLeft);
        iface.find('span.imageLeft').html(info.imageLeft);
        iface.find('input.imageTop').val(info.imageTop);
        iface.find('span.imageTop').html(info.imageTop);
        iface.find('input.pixelSize').val(info.pixelSize);
        iface.find('span.pixelSize').html(info.pixelSize);
        iface.find('select[name="status"]').val(info.status);
        iface.find('span.status').html(STATUS_MAP[info.status]);
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
      // redundant with bindImageInterface
      if (cachedImage.updateHandler != null)
      {
        cachedImage.iface.find('input').unbind('change', cachedImage.updateHandler);
      }

      if (cachedImage.statusChangeHandler != null)
      {
        cachedImage.iface.find('select[name="status"]').unbind('change', cachedImage.statusChangeHandler);
      }

      var references = cachedImage.references;
      for (var cacheId in references)
      {
        // necessary to avoid circular references
        references[cacheId].references = null;
      }

      cachedImage.updateInterface = null;
      cachedImage.update = null;
      cachedImage.destroy = null;
    }

    this.images[id] = cachedImage;
    this.bindImageInterface(id, iface);
    cachedImage.reset();
  }

  if (onSuccess != null)
  {
    onSuccess(this.images[id]);
  }
}

CImageManager.prototype.cacheTiledImage = function(id, path, onSuccess, iface, zIndex)
{
  var thisInstance = this;
  this.ajaxProvider.ajax(path + '/info.json',
                         function(data)
                         {
                           if (data.status)
                           {
                             thisInstance.cacheTiledImageOffline(id, path, data.data, onSuccess, iface, zIndex);
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

CImageManager.prototype.asyncGetCachedImage = function(id, path, onSuccess, imageInterface)
{
  // return if executed immediately
  if (id in this.images && onSuccess != null)
  {
    onSuccess(this.images[id]);
    return true;
  }
  this.cacheTiledImage(id, path, onSuccess, imageInterface);
  return false;
}

CImageManager.prototype.getCachedImage = function(id)
{
  if (id in this.images)
  {
    return this.images[id];
  }
  return null;
}

//XXX: obsolete???
function loadCachedTileLayer(cache, id)
{
  return function (path, parentDiv, onSuccess, pixelSize,
                   focusPointX, focusPointY, zIndex, opacity, quality)
  {
    cache.asyncGetCachedImage(id, path, function(cachedImage)
    {
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
                                     zIndex,
                                     opacity,
                                     cachedImage.references,
                                     cachedImage.cacheId++);
      onSuccess(tileLayer);
    });
  };
}

CLayerStack.prototype.loadCachedTileLayer = function(cache, id, path, zIndex, quality)
{
  this.loadLayer(id, loadCachedTileLayer(cache, id), path, zIndex, quality);
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
  this.loadButtons = {} // AssocArray of Arrays

  this.layers = [];
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

CLayerManager.prototype.bindImageInterface = function(id, iface)
{
  return this.images.bindImageInterface(id, iface);
}

CLayerManager.prototype.addTileLayer = function(imageId, path, zIndex, label,
                                              info, update)
{
  if (update == null)
  {
    update = true;
  }

  var id = 'i' + imageId;

  for (var i = 0; i < this.layers.length; i++)
  {
    if (this.layers[i].id == id) return; //imposible to add image twice
    //TODO: maybe it is better to just check if it is already cached???
  }

  if (zIndex == null || zIndex < 0 || zIndex > this.layers.length)
  {
    zIndex = this.layers.length;
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
  layer.z = null; //to be for sure updated

  var $iface = null;

  // making the layer-related row
  var $row =  $('<tr></tr>');
  var $drag = $('<td draggable="true">' + label + '</td>');
  $drag.bind('dragstart', function(ev)
  {
    ev.originalEvent.dataTransfer.setData('Text', layer.z);
  });

  $drag.bind('dragover', function(ev)
  {
    ev.originalEvent.preventDefault();
  });

  $drag.bind('drop', function(ev)
  {
    ev.originalEvent.preventDefault();
    var srcZ = ev.originalEvent.dataTransfer.getData("Text");
    var z = layer.z;
    if (srcZ == z) return;

    var src = thisInstance.layers.splice(srcZ, 1)[0];
    thisInstance.layers.splice(z, 0, src);

    var stop = Math.max(srcZ, z);
    for (var i = Math.min(srcZ, z); i <= stop; i++)
    {
      var lr = thisInstance.layers[i];
      lr.z = i;
      thisInstance.images.setZ(lr.id, i);
    }

    // update the opacity of bottom and not-bottom layers
    // TODO: a method in CSynchronizedStacksDisplay
    for (var i = 0; i < thisInstance.stacks.stacks.length; i++)
    {
      thisInstance.stacks.stacks[i].setOpacity();
    }

    thisInstance.stacks.updateTopZ(stop);

    thisInstance.arrangeInterface();
  });

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
  if (this.adjustmentEnabled)
  {
    var $adjust = $('<input type="checkbox">');
    $iface = $('<span style="display: none;">' +
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

    layer.$iface = $iface;
    layer.$adjust = $adjust;
    $row.append($adjust, $iface);
  }

  //removal
  if (this.removalEnabled)
  {
    layer.$rem = $('<button>Remove</button>');
    layer.$rem.bind('click', function()
    {
      var z = layer.z;
      var layers = thisInstance.layers;
      var id = layer.id;
      if (layers[z].id != id)
      {
        console.warn('remove button handler: z mismatch for z:' + z +
                     ', id:' + id);
        z = 0;
        while (layers[z].id != id && z < layers.length)
        {
          z++;
        }
        if (z >= layers.length)
        {
          console.error('Layer of id: ' + id + ' not found in layers.');
          return
        }
      }
      thisInstance.removeLayerByZ(z);
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

  this.layers.splice(zIndex, 0, layer);


  var finishCaching = update ?
                      function(image)
                      {
                        layer.image = image;
                        thisInstance.updateOrder();
                      } :
                      function(image)
                      {
                        // layer[i].z might be invalid;
                        layer.image = image;
                      };

  if (info == null)
  {
    this.images.cacheTiledImage(id, path, finishCaching, $iface);
  }
  else
  {
    this.images.cacheTiledImageOffline(id, path, info, finishCaching, $iface);
  }
  // onSuccess shall update interface and z-indices
  return id;
}

CLayerManager.prototype.updateOrder = function()
{
  var layers = this.layers;
  for (var z = 0; z < layers.length; z++)
  {
    var layer = layers[z];
    if (z != layer.z)
    {
      var imageID = layer.id;
      this.layers[z].z = z;
      if (this.images.has(imageID))
      {
        this.images.setZ(imageID, z);
      }
    }
  }

  this.stacks.updateTopZ(this.layers.length - 1);
  this.arrangeInterface();
}

CLayerManager.prototype.arrangeInterface = function()
{
  // detaching is crucial for preservation of event handlers
  this.$layerList.find('.recyclableElement').detach();
  this.$layerList.children('tr').detach();
  var $layerList = $('<tbody></tbody>');
  var nmax = this.stacks.nx * this.stacks.ny;

  for (var z = this.layers.length - 1; z >= 0; z--)
  {
    var layer = this.layers[z];
    var id = layer.id;

    var loadButtons = id in this.loadButtons ? this.loadButtons[id] : [];

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

    this.loadButtons[id] = loadButtons;

    //TODO: move to addTile...
    this.images.bindImageRow(id, layer.$row);
    $layerList.append(layer.$row);
  }
  this.$layerList.replaceWith($layerList);
  this.$layerList = $layerList;
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
  var toDismiss = this.loadButtons[id];
  //XXX: redundant with arrangeInterface();
  for (var i = 0; i < toDismiss.lenght; i++)
  {
    var item = toDismiss[i];
    item.$cb.unbind('change', item.changeHandler);
  }
  delete this.loadButtons[id];

  this.stacks.removeLayer(id);
}

CLayerManager.prototype.removeLayerByZ = function(z, updateIface)
{
  //XXX warning: z might be greater than this.layers.length !!!
  var id = this.layers[z].id;
  if (this.layers[z].z != z)
  {
    console.warn('removeLayerByZ z mismatch for z:' + z);
  }
  this.layers.splice(z, 1);
  this.removeLayer(id);
  if (updateIface == null || updateIface)
  {
    this.updateOrder();
  }
}

CLayerManager.prototype.flush = function()
{
  for (var i = 0; i < this.layers.length; i++)
  {
    this.removeLayer(this.layers[i].id);
  }
  this.layers = [];
  this.arrangeInterface();
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
  for (var i = 0; i < this.layers.length; i++)
  {
    var id = this.layers[i].id;
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
  for (var i = this.layers.length - 1; i >= 0; i--)
  {
    var layer = this.layers[i];
    if (layer.$del == null) continue;
    if (layer.$del.filter(':checked').length == 0) continue;
    if (layer.image == null) continue;
    var iid = layer.image.info.iid;
    toDelete.push(iid);
    deleteMapping[iid] = i;
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
                                 thisInstance.removeLayerByZ(deleteMapping[item[0]],
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
  this.stacks = null;
  this.images = null;
  this.$layerList = null;

  for (var id in this.loadButtons)
  {
    //XXX: redundant with removeLayerByZ()
    var toDismiss = this.loadButtons[id];
    for (var i = 0; i < toDismiss.length; i++)
    {
      var item = toDismiss[i];
      item.$cb.unbind('change', item.changeHandler);
    }
  }
  this.loadButtons = null;
  this.layers = null;
  //TODO: check what happens to everything else bound to this.$layerList descendants

}
