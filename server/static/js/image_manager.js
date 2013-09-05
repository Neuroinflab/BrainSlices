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
        if (!thisInstance.has(id))
        {
          var cachedImage = {};
          cachedImage.changed = false;
          cachedImage.info = data.data;

          //fix invalid metadata
          if (data.data.imageLeft == undefined)
          {
            data.data.imageLeft = 0;
            cachedImage.changed = true;
          }
          if (data.data.imageTop == undefined)
          {
            data.data.imageTop = 0;
            cachedImage.changed = true;
          }
          if (data.data.pixelSize == undefined)
          {
            data.data.pixelSize = 100000 / data.data.imageWidth;
            cachedImage.changed = true;
          }
          cachedImage.references = {};
          cachedImage.path = path;
          cachedImage.type = 'tiledImage';
          cachedImage.cacheId = 0;
          cachedImage.iface = iface;
          cachedImage.id = id;
          cachedImage.z = zIndex != null ? zIndex : 0;
          thisInstance.images[id] = cachedImage;
          thisInstance.bindImageInterface(id, iface);
        }

        if (onSuccess != null)
        {
          onSuccess(thisInstance.images[id]);
        }
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


