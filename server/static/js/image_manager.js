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

function CImageManager()
{
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
    image.iface = iface;
    if (iface != null)
    {
      var thisInstance = this;

      image.updateHandler = function()
      {
        var imageLeft = parseFloat(iface.children('input.imageLeft').val());
        var imageTop = parseFloat(iface.children('input.imageTop').val());
        var pixelSize = parseFloat(iface.children('input.pixelSize').val());
        thisInstance.updateImage(id, imageLeft, imageTop, pixelSize, false);
      }

      iface.children('input').bind('change', image.updateHandler);
    }
    else
    {
      image.updateHandler = null;
    }

    this.updateImageInterface(id);
    return true;
  }
  return false;
}

CImageManager.prototype.updateImage = function(id, imageLeft, imageTop,
                                               pixelSize, updateIFace)
{
  var image = this.images[id];
  image.changed = true;
  if (imageLeft != null) image.info.imageLeft = imageLeft;
  if (imageTop != null) image.info.imageTop = imageTop;
  if (pixelSize != null) image.info.pixelSize = pixelSize;
  var references = image.references;
  for (var cacheId in references) //XXX dangerous
  {
    references[cacheId].updateImage(imageLeft, imageTop, pixelSize).update();
  }
  if (updateIFace == null || updateIFace)
  {
    this.updateImageInterface(id);
  }
}

CImageManager.prototype.updateAll = function(imageLeft, imageTop, pixelSize)
{
  for (var id in this.images)
  {
    this.updateImage(id, imageLeft, imageTop, pixelSize);
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
  //shall be moved to separated class???
  if (id in this.images)
  {
    var image = this.images[id];
    var iface = image.iface;
    if (iface != null)
    {
      var info = image.info;
      iface.find('input.imageLeft').val(info.imageLeft);
      iface.find('span.imageLeft').html(info.imageLeft);
      iface.find('input.imageTop').val(info.imageTop);
      iface.find('span.imageTop').html(info.imageTop);
      iface.find('input.pixelSize').val(info.pixelSize);
      iface.find('span.pixelSize').html(info.pixelSize);
    }
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
    cachedImage.changed = false;
    cachedImage.info = data;

    //fix invalid metadata
    if (data.imageLeft == undefined)
    {
      data.imageLeft = 0;
      cachedImage.changed = true;
    }
    if (data.imageTop == undefined)
    {
      data.imageTop = 0;
      cachedImage.changed = true;
    }
    if (data.pixelSize == undefined)
    {
      data.pixelSize = 100000 / data.imageWidth;
      cachedImage.changed = true;
    }
    cachedImage.references = {};
    cachedImage.path = path;
    cachedImage.type = 'tiledImage';
    cachedImage.cacheId = 0;
    cachedImage.iface = iface;
    cachedImage.id = id;
    cachedImage.z = zIndex != null ? zIndex : 0;
    this.images[id] = cachedImage;
    this.bindImageInterface(id, iface);
  }

  if (onSuccess != null)
  {
    onSuccess(this.images[id]);
  }
}

CImageManager.prototype.cacheTiledImage = function(id, path, onSuccess, iface, zIndex)
{
  var thisInstance = this;
  $.ajax({
    //type: 'POST', //causes 412 error on refresh -_-
    type: 'GET',
    url: path + '/info.json',
    data: '',
    dataType: 'json',
    success: function(data)
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
    error: ajaxErrorHandler
  });
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

CImageManager.prototype.adjustOffset = function(dx, dy)
{
  if (this.adjust == null)
  {
    return;
  }

  for (var id in this.adjust)
  {
    var image = this.adjust[id];

    image.changed = true;
    var imageLeft = image.info.imageLeft += dx;
    var imageTop = image.info.imageTop += dy;

    var references = image.references;
    for (var cacheId in references)
    {
      references[cacheId].updateImage(imageLeft, imageTop, null).update();
    }
    this.updateImageInterface(id);
  }
  //TODO: update some offset information?
}

CImageManager.prototype.removeCachedImage = function(id)
{
  if (id in this.images)
  {
    this.stopAdjustment(id);
    var image = this.images[id];
    image.iface.children('input').unbind('change', image.updateHandler);

    var references = image.references;
    for (var cacheId in references)
    {
      // necessary to avoid circular references
      references[cacheId].references = null;
    }
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



function CLayerManager($controlPanel, stacks, doNotRemove, doNotAdjust, doNotDownload)
{
  this.stacks = stacks;
  this.images = stacks.images; // just a shortcut
  this.$controlPanel = $controlPanel;
  this.$layerList = $controlPanel.find('.layerList');

  this.adjustmentEnabled = doNotAdjust != true;
  this.removalEnabled = doNotAdjust != true;
  this.downloadEnabled = doNotDownload != true;
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

  // XXX: iface starts
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

  var $iface = null;
  if (this.adjustmentEnabled)
  {
    var $adjust = $('<input type="checkbox" class="recyclableElement">');
    $iface = $('<span style="display: none;" class="recyclableElement"><input type="number" class="imageLeft"><input type="number" class="imageTop"><input type="number" class="pixelSize"></span>');

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
  }

  this.layers.splice(zIndex, 0, layer);


  var finishCaching = update ?
                      function()
                      {
                        thisInstance.updateOrder();
                      } :
                      null;

  if (info == null)
  {
    this.images.cacheTiledImage(id, path, update ? finishCaching : null, $iface);
  }
  else
  {
    this.images.cacheTiledImageOffline(id, path, info, update ? finishCaching : null, $iface);
  }
  // onSuccess shall update interface and z-indices
  return id;
}

CLayerManager.prototype.updateOrder = function()
{
  for (var z = 0; z < this.layers.length; z++)
  {
    var imageID = this.layers[z].id;
    if (this.images.has(imageID))
    {
      this.images.setZ(imageID, z);
    }
  }

  this.stacks.updateTopZ(this.layers.length - 1);
  this.arrangeInterface();
}

CLayerManager.prototype.arrangeInterface = function()
{
  // detaching is crucial for preservation of event handlers
  this.$layerList.find('.recyclableElement').detach();
  this.$layerList.html('');
  var nmax = this.stacks.nx * this.stacks.ny;

  for (var z = this.layers.length - 1; z >= 0; z--)
  {
    //alert(z + ' ' + this.layers);
    var layer = this.layers[z];
    var id = layer.id;

    var $listItem = $('<tr></tr>');
    $listItem.append(this.layerDrag(z));

    if (this.downloadEnabled)
    {
      if (id[0] == 'i')
      {
        $listItem.append('<td><a href="' + layer.path + '/image.png">Download</a></td>');
      }
      else
      {
        $listItem.append('<td><br></td>');
      }
    }

    var loadButtons = id in this.loadButtons ? this.loadButtons[id] : [];

    var $cell = $('<td></td>');
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
      $cell.append($cb);
    }

    var toDismiss = loadButtons.splice(nmax);
    for (var i = 0; i < toDismiss.length; i++)
    {
      var item = toDismiss[i];
      item.$cb.unbind('change', item.changeHandler);
    }

    this.loadButtons[id] = loadButtons;
    $listItem.append($cell);

    if (this.adjustmentEnabled)
    {
      $cell = $('<td></td>');
      $cell.append(layer.$adjust, layer.$iface);
      $listItem.append($cell);
    }

    if (this.removalEnabled)
    {
      $cell = $('<td></td>');
      $cell.append(this.layerDelB(z));
      $listItem.append($cell);
    }

    this.$layerList.append($listItem);
  }
}

CLayerManager.prototype.layerDelB = function(z)
{
  var thisInstance = this;
  var $delB = $('<button>Delete</button>');
  $delB.bind('click', function()
  {
    thisInstance.removeLayerByZ(z);
  });

  return $delB;
}

CLayerManager.prototype.layerDrag = function(z)
{
  var thisInstance = this;
  var $drag = $('<td draggable="true">' + this.layers[z].label + '</td>');
  $drag.bind('dragstart', function(ev)
  {
    ev.originalEvent.dataTransfer.setData('Text', z);
  });

  $drag.bind('dragover', function(ev)
  {
    ev.originalEvent.preventDefault();
  });

  $drag.bind('drop', function(ev)
  {
    ev.originalEvent.preventDefault();
    var srcZ = ev.originalEvent.dataTransfer.getData("Text");
    if (srcZ == z) return;

    var src = thisInstance.layers.splice(srcZ, 1)[0];
    thisInstance.layers.splice(z, 0, src);

    var stop = Math.max(srcZ, z);
    for (var i = Math.min(srcZ, z); i <= stop; i++)
    {
      thisInstance.images.setZ(thisInstance.layers[i].id, i);
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

  return $drag;
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

CLayerManager.prototype.removeLayerByZ = function(z)
{
  //XXX warning: z might be greater than this.layers.length !!!
  var id = this.layers[z].id;
  this.layers.splice(z, 1);
  this.removeLayer(id);
  this.arrangeInterface();
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

//TODO: make consistent with constructor!!!
CLayerManager.prototype.destroy = function()
{
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
  //TODO: check what happens to everything else bound to this.$layerList descendants

}
