/* File: outline_layer.js; TO BE DOCUMENTED */
/*****************************************************************************\
*                                                                             *
*    This file is part of BrainSlices Software                                *
*                                                                             *
*    Copyright (C) 2012-2014 J. M. Kowalski                                   *
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

var api = BrainSlices.api;

function COutlineLayer(parentDiv, svg, layerPixelSize, focusPointX, focusPointY, crosshairX, crosshairY, autoresize, zIndex, opacity)
{
  // CONSTRUCTOR

  // DOM object - layer images display
  this.layer = $('<div class="outlineLayer" style="display: none;" draggable="false"></div>');
  parentDiv.append(this.layer);


  this.setFocusPoint(focusPointX == null?0.:focusPointX,
                     focusPointY == null?0.:focusPointY);

  this.setPixelSize(layerPixelSize == null?1.:layerPixelSize);

  this.svg = svg.getElementsByTagName('svg')[0];

  this.layer.append(this.svg);
  this.finishConstruction(crosshairX, crosshairY, autoresize, zIndex, opacity);
}

COutlineLayer.prototype = Object.create(api.CLayerPrototype);

// dummy quality settings setter
COutlineLayer.prototype.setQuality = function(quality)
{
}

// setter of layer pixel size
COutlineLayer.prototype.setPixelSize= function(newPixelSize)
{
  this.layerPixelSize = parseFloat(newPixelSize);
}

// refresh layer
COutlineLayer.prototype.update = function()
{
  //this.layer.hide();
  //this.layer.show();



  //var svg = this.svg[0].contentDocument.getElementsByTagName('svg')[0]
  if (this.svg != undefined)
  {
    var viewBoxLeft = this.focusPointX - this.layerPixelSize * this.crosshairX;
    var viewBoxTop = this.focusPointY - this.layerPixelSize * this.crosshairY;
    var viewBoxWidth = this.layerWidth * this.layerPixelSize;
    var viewBoxHeight = this.layerHeight * this.layerPixelSize;
    this.svg.setAttribute('viewBox', [viewBoxLeft, viewBoxTop, viewBoxWidth, viewBoxHeight].join(' '));
  }
  else
  {
    alert('UPS... SVG not loaded...');
  }
};

// resize the layer
COutlineLayer.prototype.resize = function(crosshairX, crosshairY)
{
  this.layerWidth = this.layer.width();
  this.layerHeight = this.layer.height();

  this.crosshairX = crosshairX == null?Math.round(0.5 * this.layerWidth):crosshairX;
  this.crosshairY = crosshairY == null?Math.round(0.5 * this.layerHeight):crosshairY;

  //this.svg.width(this.layerWidth);
  //this.svg.height(this.layerHeight);

  //this.svg.attr('width', this.layerWidth);
  //this.svg.attr('height', this.layerHeight);

  this.svg.setAttribute('width', this.layerWidth);
  this.svg.setAttribute('height', this.layerHeight);

  this.update();
};


function loadOutlineLayer(path, parentDiv, onSuccess, pixelSize,
                          focusPointX, focusPointY, zIndex, opacity)
{
  $.ajax({
    //type: 'POST', //causes 412 error on refresh -_-
    type: 'GET',
    url: path,
    data: '',
    dataType: 'xml',
    success: function(data)
    {
      onSuccess(new COutlineLayer(parentDiv,
                                  data,
                                  pixelSize,
                                  focusPointX,
                                  focusPointY,
                                  null, null,
                                  false,
                                  zIndex,
                                  opacity));
    },
    error: BrainSlices.ajax.errorHandler
  });
}


if (api.CLayerStack == null)
{
  console.warn('unable to extend BrainSlices.api.CLayerStack (does not exist)');
}
else
{
  if ('loadOutlineLayer' in api.CLayerStack.prototype)
  {
    console.warn('BrainSlices.api.CLayerStack.prototype.loadOutlineLayer already defined');
  }
  else
  {
    api.CLayerStack.prototype.loadOutlineLayer = function(id, path, zIndex)
    {
      this.loadLayer(id, loadOutlineLayer, path, zIndex);
    }
  }
}

