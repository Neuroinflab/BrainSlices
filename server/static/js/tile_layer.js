/* File: tile_layer.js; TO BE DOCUMENTED */
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

function CTileLayer(parentDiv, imageWidth, imageHeight, imagePixelSize, path, imageLeft, imageTop, layerPixelSize, focusPointX, focusPointY, quality, crosshairX, crosshairY, tileWidth, tileHeight, autoresize, zIndex, opacity, references, cacheId)
{
  // CONSTRUCTOR

  // necessary ONLY to autoremove destroyed layer instance from references
  this.references = references;
  this.cacheId = cacheId; // id of instance of particular image
  if (references != null)
  {
    references[cacheId] = this;
  }

  // DOM object - layer images display
  this.layer = $('<div class="tileLayer" style="display: none;" draggable="false"></div>');
  parentDiv.append(this.layer);

  // source image size and resolution (pixel size)
  this.imageWidth = imageWidth;
  this.imageHeight = imageHeight;
  this.imagePixelSize = imagePixelSize;

  // URL of the tiled image
  this.path = path;

  // source image offset (defaults to 0)
  this.imageLeft = imageLeft == null?0:imageLeft;
  this.imageTop = imageTop == null?0:imageTop;

  // the focus point defaults to the center of the image
  this.setFocusPoint(focusPointX == null?
                       this.imageLeft + 0.5 * imagePixelSize * imageWidth:
                       focusPointX,
                     focusPointY == null?
                       this.imageTop + 0.5 * imagePixelSize * imageHeight:
                       focusPointY);

  this.setQuality(quality);

  // tile image size
  this.tileWidth = tileWidth == null?256:tileWidth;
  this.tileHeight = tileHeight == null?256:tileHeight;

  // maximal zoom level available for the image tile stack
  this.maxZoomLevel = Math.ceil(Math.log(Math.max(imageWidth / this.tileWidth,
                                                  imageHeight / this.tileHeight)) / Math.LN2);

  this.setPixelSize(layerPixelSize == null?
                      Math.pow(2, this.maxZoomLevel) * this.imagePixelSize:
                      layerPixelSize);

  this.finishConstruction(crosshairX, crosshairY, autoresize, zIndex, opacity);
}

CTileLayer.prototype = new CLayerPrototype();

CTileLayer.prototype.destroy = function()
{
  if (this.references != null)
  {
    delete this.references[this.cacheId];
  }

  //REDUNDANT WITH CLayerPrototype.prototype.destroy
  this.layer.html('');

  // if autoresize enabled
  if (this.resizeHandler != null)
  {
    //this.layer.unbind('resize', this.resizeHandler);
    $(window).unbind('resize', this.resizeHandler);
    this.resizeHandler = null;
  }
  this.layer.remove();
  return null;
}

CTileLayer.prototype.updateImage = function(imageLeft, imageTop, imagePixelSize)
{
  if (imageLeft != null) this.imageLeft = imageLeft;
  if (imageTop != null) this.imageTop = imageTop;
  if (imagePixelSize != null)
  {
    this.imagePixelSize = imagePixelSize;
    this.setPixelSize();
  }
  return this;
}


// quality settings setter
CTileLayer.prototype.setQuality = function(quality)
{
  switch (quality)
  {
    case undefined: // undefined =/= null in switch/case
    case null:
    case 'med':
      this.quality = 0.;
      break;

    case 'high':
      this.quality = 0.5;
      break;

    case 'low':
      this.quality = -0.5;
      break;

    default:
      this.quality = parseFloat(quality);
  }
}

// setter of layer pixel size
CTileLayer.prototype.setPixelSize = function(newPixelSize)
{
  if (newPixelSize == null)
  {
    newPixelSize = this.layerPixelSize;
  }

  this.layerPixelSize = parseFloat(newPixelSize);

  // how many times the image has to be doubled to achieve requested pixel size
  var scale = Math.log(this.imagePixelSize / newPixelSize) / Math.LN2;

  // approximate the scale with integer according to the selected quality
  var scaleRounded;
  if (this.quality <= -0.5)
  {
    scaleRounded = Math.floor(scale);
  }
  else if (this.quality >= 0.5)
  {
    scaleRounded = Math.ceil(scale);
  }
  else
  {
    scaleRounded = Math.round(scale + this.quality);
  }

  var intScale = Math.max(Math.min(scaleRounded, 0), -this.maxZoomLevel);

  // allowed zoomlevel...
  this.intZoom = intScale + this.maxZoomLevel;
  this.zoomPath = this.path + '/' + this.intZoom + '/';

  // ...and the correction that has to be made to the tiles
  var scaleCorr = Math.pow(2, scale - intScale);
  this.intScaleFactor = Math.pow(2, intScale);

  this.layerTileWidth = scaleCorr * this.tileWidth;
  this.layerTileHeight = scaleCorr * this.tileHeight;

  // size of the image at given zoomlevel (without scale correction)
  this.layerImageWidth = Math.round(this.imageWidth * this.intScaleFactor);
  this.layerImageHeight = Math.round(this.imageHeight * this.intScaleFactor);

  this.layerLastTileWidth = scaleCorr * (this.layerImageWidth % this.tileWidth);
  this.layerLastTileHeight = scaleCorr * (this.layerImageHeight % this.tileHeight);
}

// refresh layer
CTileLayer.prototype.update = function()
{
  // position of the top left display corner in tile indices coordinates
  var leftTile = this.intScaleFactor * (this.focusPointX - this.imageLeft) / (this.imagePixelSize * this.tileWidth) - this.crosshairX / this.layerTileWidth;
  var topTile = this.intScaleFactor * (this.focusPointY - this.imageTop) / (this.imagePixelSize * this.tileHeight) - this.crosshairY / this.layerTileHeight;

  // indices of the tile containing top left display corner
  var leftTileIndex = Math.floor(leftTile);
  var topTileIndex = Math.floor(topTile);

  // offset of the tile containing top left display corner
  var deltaX = this.layerTileWidth * (leftTileIndex - leftTile);
  var deltaY = this.layerTileHeight * (topTileIndex - topTile);

  // prepare tiles column: index, left, width
  var cols = [];

  var tileImageWidth = this.layerTileWidth;
  if (leftTileIndex < 0)
  {
    var x = 0;
    var layerImageX = 0;
    deltaX -= leftTileIndex * tileImageWidth;
  }
  else
  {
    var x = leftTileIndex;
    var layerImageX = x * this.tileWidth;
  }

  var dynamicTileLeft = Math.round(deltaX);

  while (deltaX < this.layerWidth) // while in the visible area
  {

    if (layerImageX >= this.layerImageWidth) break;
    if (layerImageX + this.tileWidth > this.layerImageWidth)
    {
      tileImageWidth = this.layerLastTileWidth;
    }

    var nextDx = deltaX + tileImageWidth;
    var nextTileLeft = Math.round(nextDx);
    var dynamicTileWidth = nextTileLeft - dynamicTileLeft;

    cols.push([x, dynamicTileLeft, dynamicTileWidth]);

    layerImageX += this.tileWidth;
    x++;
    deltaX = nextDx;
    dynamicTileLeft = nextTileLeft;
  }

  var images = [];



  var y = topTileIndex;
  var tileImageHeight = this.layerTileHeight;
  var layerImageY = y * this.tileHeight;
  var dy = deltaY;
  var dynamicTileTop = Math.round(dy);
  while (dy < this.layerHeight)
  {
    if (layerImageY >= this.layerImageHeight) break;
    if (layerImageY + this.tileHeight > this.layerImageHeight)
    {
      tileImageHeight = this.layerLastTileHeight;
    }

    var nextDy = dy + tileImageHeight;
    var nextTileTop = Math.round(nextDy);
    var dynamicTileHeight = nextTileTop - dynamicTileTop;

    if (layerImageY >= 0)
    {
      for (var j = 0; j < cols.length; j++)
      {
        var tmp = cols[j];
        x = tmp[0];
        dynamicTileLeft = tmp[1];
        dynamicTileWidth = tmp[2];
        images.push('<img alt="tile of zoom level ' + this.intZoom +
                    ', row ' + y + ', column ' + x + '" ' +
                    'src="' + this.zoomPath + x + '/' + y + '.jpg" ' +
                    'style="position: absolute; width: ' + dynamicTileWidth +
                    'px; height: ' + dynamicTileHeight + 'px; left: ' +
                    dynamicTileLeft + 'px; top: ' + dynamicTileTop +
                    'px;" draggable="false">');
      }
    }
    layerImageY += this.tileHeight;
    y++;
    dy = nextDy;
    dynamicTileTop = nextTileTop;
  }
  this.layer.html(images.join('\n'));
};

// resize the layer
CTileLayer.prototype.resize = function(crosshairX, crosshairY)
{
  this.layerWidth = this.layer.width();
  this.layerHeight = this.layer.height();

  this.crosshairX = crosshairX == null?Math.round(0.5 * this.layerWidth):crosshairX;
  this.crosshairY = crosshairY == null?Math.round(0.5 * this.layerHeight):crosshairY;

  this.update();
};


function loadTileLayer(path, parentDiv, onSuccess, pixelSize, focusPointX,
                       focusPointY, zIndex, opacity, quality)
{
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
        onSuccess(new CTileLayer(parentDiv,
                                 data.data.imageWidth,
                                 data.data.imageHeight,
                                 data.data.pixelSize,
                                 path + '/tiles',
                                 data.data.imageLeft,
                                 data.data.imageTop,
                                 pixelSize,
                                 focusPointX,
                                 focusPointY,
                                 quality,
                                 null, null,
                                 data.data.tileWidth,
                                 data.data.tileHeight,
                                 false,
                                 zIndex,
                                 opacity));
      }
      else
      {
        alert(data.message);
      }
    },
    error: BrainSlices.ajax.errorHandler
  });
}

CLayerStack.prototype.loadTileLayer = function(id, path, zIndex, quality)
{
  this.loadLayer(id, loadTileLayer, path, zIndex, quality);
}

