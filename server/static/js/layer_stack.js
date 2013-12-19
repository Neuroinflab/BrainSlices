/* File: layer_stack.js; TO BE DOCUMENTED */
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

function hDistanceCommon(distanceUnsafe, toLog, meaning)
{
  var distance = parseFloat(distanceUnsafe);

  if (distance == 0.)
  {
    return '0';
  }

  meaning = meaning == null? 2 : parseInt(meaning);

  if (toLog == null) toLog = Math.abs(distance);

  var log10floor = Math.floor(Math.log(toLog) * Math.LOG10E);
  var u = parseInt(Math.floor(log10floor / 3));
  var n = parseInt(meaning - (log10floor - 3 * u));
  if (n < 0) n = 0;

  var val = (distance / Math.pow(1000, u)).toFixed(n);

  switch (u)
  {
    case 2:
      unit = ' m';
      break;

    case 1:
      unit = ' mm';
      break;

    case 0:
      unit = ' &#956;m';
      break;

    case -1:
      unit = ' nm';
      break;

    case -2:
      unit = ' pm';
      break;

    default:
      val = (distance / Math.pow(10, log10floor)).toFixed(meaning);
      unit = 'e' + (log10floor - 6) + ' m';
  }

  return val + unit;
}

function hDistance(distanceUnsafe, meaning)
{
  return hDistanceCommon(distanceUnsafe, null, meaning);
}

var hDistanceOOM = hDistanceCommon;

function CLayerStack(parentDiv, zoom, focusPointX, focusPointY, crosshairX, crosshairY, mouseXElement, mouseYElement, syncStacks, autoresize, gfx)
{
  this.display = parentDiv;
  this.setFocusPoint(focusPointX, focusPointY);
  this.mouseX = this.focusPointX;
  this.mouseY = this.focusPointY;

  this.opacity = 1.0;

  this.layers = {};
  this.nlayers = 0;
  this.gfx = gfx != null ? gfx : 'static/gfx';
  this.scaleDiv = $('<div class="scale">'+
                    ' <span></span><br>' +
                    ' <img src="' + this.gfx + '/scale.png" alt="scale" style="width: 20mm;" draggable="false">' +
                    '</div>');
  this.topLayer = $('<div class="topLayer" style="z-index: 0;" draggable="false">' +
                    ' <img class="crosshair" src="' + this.gfx + '/crosshair.png" alt="+" style="display: none;">' +
                    '</div>');
  this.topLayer.append(this.scaleDiv);
  this.maxScaleWidth = 100000.; //10 cm
  this.display.append(this.topLayer);
  this.getDisplayPixelSize();
  this.setZoom(zoom);
  this.resize(crosshairX, crosshairY);

  this.mouseMove = false;
  this.trackMouse = false;
  this.x0 = null;
  this.y0 = null;

  this.mouseXElement = mouseXElement;
  this.mouseYElement = mouseYElement;

  this.syncStacks = null;
  this.id = null;
  this.synchronize(syncStacks);

  var thisInstance = this;

  // mouse move handlers
  this.mouseOverHandler = null;
  this.mouseOutHandler = null;

  if (mouseXElement != null || mouseYElement != null)
  {
    this.mouseOverHandler = function (event)
                            {
                              thisInstance.trackMouse = true;
                            };
    this.display.bind('mouseover', this.mouseOverHandler);
  
    this.mouseOutHandler = function (event)
                           {
                             thisInstance.trackMouse = false;
                           };
    this.display.bind('mouseout', this.mouseOutHandler);
  }

  this.mouseDownHandler = function (event)
                          {
                            if (!event)
                            {
                              event = window.event;
                            }
                            var offset = thisInstance.display.offset();
                            thisInstance.x0 = event.clientX - offset.left;
                            thisInstance.y0 = event.clientY - offset.top;
                            thisInstance.mouseMove = true;
                          };
  this.display.bind('mousedown', this.mouseDownHandler);

  this.mouseMoveHandler = function (event)
                        {
                          if (!event)
                          {
                            event = window.event;
                          }

                          var offset = thisInstance.display.offset();
                          var xM = event.clientX - offset.left;
                          var yM = event.clientY - offset.top;

                          thisInstance.mouseX = thisInstance.pixelSize * (xM - thisInstance.crosshairX) + thisInstance.focusPointX;
                          thisInstance.mouseY = thisInstance.pixelSize * (yM - thisInstance.crosshairY) + thisInstance.focusPointY;

                          if (thisInstance.syncStacks != null)
                          {
                            thisInstance.syncStacks.putCursor(thisInstance.mouseX,
                                                              thisInstance.mouseY,
                                                              thisInstance.id);
                          }

                          if (thisInstance.trackMouse)
                          {
                            if (thisInstance.mouseXElement != null)
                            {
                              thisInstance.mouseXElement.html(hDistanceOOM(thisInstance.mouseX, thisInstance.pixelSize));
                            }

                            if (thisInstance.mouseYElement != null)
                            {
                              thisInstance.mouseYElement.html(hDistanceOOM(thisInstance.mouseY, thisInstance.pixelSize));
                            }
                          }

                          if (!thisInstance.mouseMove) return;

                          thisInstance.move(xM - thisInstance.x0,
                                            yM - thisInstance.y0);
                          thisInstance.x0 = xM;
                          thisInstance.y0 = yM;
                        };

  this.display.bind('mousemove', this.mouseMoveHandler);

  this.mouseUpHandler = function (event)
                        {
                          thisInstance.mouseMove = false;
                        };

  $('body').bind('mouseup', this.mouseUpHandler);

  // autoresize enabled by default: null != false
  if (autoresize != false)
  {
    // resize event handler
    this.resizeHandler = function()
    {
      // thisInstance, crosshairX, crosshairY are fixed now ^^;
      thisInstance.resize(crosshairX, crosshairY);
    }

    $(window).bind('resize', this.resizeHandler);
  }
  else
  {
    this.resizeHandler = null;
  }

  // mouse wheel scroll handler
  this.mouseWheelHandler = function(ev)
  {
    var factor = ev.originalEvent.detail < 0 || ev.originalEvent.wheelDelta > 0 ? 2. : 0.5;
    var offset = thisInstance.display.offset();
    //var xM = event.clientX - offset.left;
    //var yM = event.clientY - offset.top;
    //var x = thisInstance.pixelSize * (xM - thisInstance.crosshairX) + thisInstance.focusPointX;
    //var y = thisInstance.pixelSize * (yM - thisInstance.crosshairY) + thisInstance.focusPointY;
    var x = thisInstance.mouseX;
    var y = thisInstance.mouseY;
    //console.debug(x + ',\t' + y)

    if (thisInstance.syncStacks != null)
    {
      thisInstance.syncStacks.mulZoom(factor, thisInstance.id, x, y);
    }
    else
    {
      thisInstance.setPixelSize(thisInstance.pixelSize / factor, x, y);
      thisInstance.update();
    }
  };

  this.display.on('mousewheel DOMMouseScroll', this.mouseWheelHandler);
}

//TODO: refactoring - it is not the best idea to synchronize/desynchronize
//      at stack level according to the fact, that our application will
//      operate rather at synchronizedStack level (CSynchronizedStacksDisplay
//      is no longer auxilary class but a master class)
CLayerStack.prototype.desynchronize = function(doNotRemove)
{
  if (this.syncStacks != null && doNotRemove != true)
  {
    this.syncStacks.removeStack(this.id);
  }
  this.syncStacks = null;
  this.id = null;
}

CLayerStack.prototype.syncId = function(id)
{
  if (id != null)
  {
    this.id = id;
  }

  return this.id;
}

CLayerStack.prototype.synchronize = function(syncStacks)
{
  this.desynchronize();
  if (syncStacks != null)
  {
    this.syncStacks = syncStacks;
    this.syncId(this.syncStacks.add(this));
  }
}


CLayerStack.prototype.showCursor = function()
{
  this.topLayer.children('img.crosshair').show();
}

CLayerStack.prototype.hideCursor = function()
{
  this.topLayer.children('img.crosshair').hide();
}

CLayerStack.prototype.putCursor = function(x, y)
{
  if (x != null)
  {
    this.mouseX = x;
  }

  if (y != null)
  {
    this.mouseY = y;
  }

  var cursorX = Math.round(this.crosshairX + (this.mouseX - this.focusPointX) / this.pixelSize);
  var cursorY = Math.round(this.crosshairY + (this.mouseY - this.focusPointY) / this.pixelSize);
  //this.topLayer.children('img.crosshair').show();
  this.topLayer.children('img.crosshair').css({'left': (cursorX - 50) + 'px',
                                               'top': (cursorY - 50) + 'px'});
}


CLayerStack.prototype.getDisplayPixelSize = function()
{
  var scaleImage = this.display.find('.topLayer>div.scale>img');
  scaleImage.css('width', '20mm');
  this.displayPixelSize = 20000. / scaleImage.width(); //in um / pixel
  return this.displayPixelSize;
}

CLayerStack.prototype.updateScale = function()
{
  var maxScaleSize = Math.min(0.5 * this.maxScaleWidth / this.displayPixelSize,
                              0.4 * this.topLayer.width()) * this.pixelSize;
  var log10 = Math.log(maxScaleSize) * Math.LOG10E;
  var log10floor = Math.floor(log10);
  var log10rest = log10 - log10floor;
  var k = log10rest < 0.30103 ? 1 : (log10rest < 0.699? 2: 5);
  var scaleSize = k * Math.pow(10, log10floor);

  this.scaleDiv.children('span').html(hDistance(scaleSize, 0));
  var scaleImage = this.scaleDiv.children('img');
  scaleImage.width(parseInt(Math.round(2 * scaleSize / this.pixelSize)) + 'px');
  scaleImage.attr('src', this.gfx + '/scale' + k + '.png');

}

CLayerStack.prototype.resize = function(crosshairX, crosshairY)
{
  //bug tracker
  if (crosshairX != null || crosshairY != null)
  {
    alert('resize: ' + crosshairX + '+' + crosshairY);
  }
  this.getDisplayPixelSize();

  var height = this.display.height();
  var width = this.display.width();

  this.crosshairX = crosshairX == null?Math.round(0.5 * width):crosshairX;
  this.crosshairY = crosshairY == null?Math.round(0.5 * height):crosshairY;

  //bug tracker
  if (this.crosshairX == 0 && crosshairX == null ||
      this.crosshairY == 0 && crosshairY == null)
  {
    alert('resize0: ' + width + '+' + height);
  }
  else
  {
    this.putCursor();
  }

  for (var id in this.layers)
  {
    this.layers[id].resize(this.crosshairX, this.crosshairY);
  }

  this.updateScale();
}

CLayerStack.prototype.setFocusPoint = function(focusPointX, focusPointY)
{
  this.focusPointX = parseFloat(focusPointX);
  this.focusPointY = parseFloat(focusPointY);
}

CLayerStack.prototype.setPixelSize = function(pixelSize, x, y)
{
  if (x != null && y != null)
  {
    var dx = this.focusPointX - x;
    var dy = this.focusPointY - y;
    this.focusPointX = x + dx * pixelSize / this.pixelSize;
    this.focusPointY = y + dy * pixelSize / this.pixelSize;
  }
  this.pixelSize = parseFloat(pixelSize);
  this.putCursor();
}

CLayerStack.prototype.setZoom = function(zoom)
{
  this.setPixelSize(this.displayPixelSize / parseFloat(zoom));
}

CLayerStack.prototype.moveAbsolute = function(dx, dy)
{
  this.focusPointX -= dx;
  this.focusPointY -= dy;

  this.update();
}

CLayerStack.prototype.move = function(dx, dy)
{
  if (this.syncStacks != null)
  {
    this.syncStacks.moveAbsolute(this.pixelSize * dx,
                                 this.pixelSize * dy,
                                 this.id);
  }
  else
  {
    this.moveAbsolute(this.pixelSize * dx, this.pixelSize * dy);
  }
}

CLayerStack.prototype.setQuality = function(quality)
{
  for (var id in this.layers)
  {
    var layer = this.layers[id];
    layer.setQuality(quality);
  }
}

CLayerStack.prototype.setOpacity = function(opacityUnsafe, id)
{
  var opacity = opacityUnsafe != null ? parseFloat(opacityUnsafe): this.opacity;

  if (id == null)
  {
    this.opacity = opacity;
    var bottomId = null;
    var bottom = Infinity;

    for (var id in this.layers)
    {
      var layer = this.layers[id];
      layer.setOpacity(opacity);

      // search for the bottom layer
      if (layer.z < bottom)
      {
        bottom = layer.z;
        bottomId = id;
      }
    }

    // the bottom layer is opaque
    if (bottomId != null)
    {
      this.layers[bottomId].setOpacity(1.);
    }
  }
  else if (id in this.layers)
  {
    this.layers[id].setOpacity(opacity);
  }
}

CLayerStack.prototype.setTransparency = function(transparency, id)
{
  this.setOpacity(1. - parseFloat(transparency), id);
}

CLayerStack.prototype.update = function()
{
  this.updateScale();

  for (var id in this.layers)
  {
    var layer = this.layers[id];
    layer.setFocusPoint(this.focusPointX, this.focusPointY);
    layer.setPixelSize(this.pixelSize);
    layer.update();
  }
}

CLayerStack.prototype.remove = function(id)
{
  if (id in this.layers)
  {
    var toRemove = this.layers[id];
    toRemove.destroy();
    delete this.layers[id];
    this.nlayers--;
    this.setOpacity();
  }
}

CLayerStack.prototype.updateTopZ = function(newZ)
{
  var zIndex = this.topLayer.css('z-index');

  if (newZ != null)
  {
    if (zIndex > newZ) return;
    zIndex = newZ + 1;
  }
  else
  {
    for (var id in this.layers)
    {
      var z = this.layers[id].z;
      if (z >= zIndex)
      {
        zIndex = z + 1;
      }
    }
  }

  this.topLayer.css('z-index', zIndex);
}

CLayerStack.prototype.loadLayer = function(id, layerLoader, path, zIndex, quality)
{
  if (id in this.layers)
  {
    //alert(id + ' in this.layers'); //XXX
    this.remove(id);
  }

  zIndex = zIndex != null ? parseInt(zIndex) : 0;

  //this.topLayer.css('z-index', Math.max(this.topLayer.css('z-index'),
  //                                      zIndex + 1));

  var thisInstance = this;

  var onSuccess = function (layer)
  {
    thisInstance.layers[id] = layer;
    thisInstance.nlayers++;
    thisInstance.updateTopZ();
    thisInstance.setOpacity();
  };

  layerLoader(path,
              this.display,
              onSuccess,
              this.pixelSize,
              this.focusPointX,
              this.focusPointY,
              zIndex,
              this.opacity,
              quality);
}

CLayerStack.prototype.removeAll = function()
{
  var layers = [];
  for (var id in this.layers)
  {
    layers.push(id);
  }
  for (var i = 0; i < layers.length; i++)
  {
    this.remove(layers[i]);
  }
}

CLayerStack.prototype.destroy = function()
{
  this.desynchronize();

  if (this.mouseOverHandler != null)
  {
    this.display.unbind('mouseover', this.mouseOverHandler);
    this.mouseOverHandler = null;
  //}
  //if (this.mouseOutHandler != null)
  //{
    this.display.unbind('mouseout', this.mouseOutHandler);
    this.mouseOutHandler = null;
  }


  this.display.unbind('mousedown', this.mouseDownHandler);
  this.mouseDownHandler = null;

  this.display.unbind('mousemove', this.mouseMoveHandler);
  this.mouseMoveHandler = null;

  $('body').unbind('mouseup', this.mouseUpHandler);
  this.mouseUpHandler = null;

  // if autoresize enabled
  if (this.resizeHandler != null)
  {
    $(window).unbind('resize', this.resizeHandler);
    this.resizeHandler = null;
  }

  this.display.off('mousewheel DOMMouseScroll', this.mouseWheelHandler);
  this.mouseWheelHandler = null;

  this.removeAll();

  this.topLayer.remove();
  return null;
}


function CLayerPrototype()
{
}

CLayerPrototype.prototype.finishConstruction = function(crosshairX, crosshairY, autoresize, zIndex, opacity)
{
  this.resize(crosshairX, crosshairY);

  // autoresize enabled by default: null != false
  if (autoresize != false)
  {
    // resize event handler
    var thisInstance = this;
    this.resizeHandler = function()
    {
      // thisInstance, crosshairX, crosshairY are fixed now ^^;
      thisInstance.resize(crosshairX, crosshairY);
    }

    //this.layer.bind('resize', this.resizeHandler);
    $(window).bind('resize', this.resizeHandler);
  }
  else
  {
    this.resizeHandler = null;
  }

  if (zIndex != null)
  {
    this.setZ(zIndex);
  }
  
  if (opacity != null)
  {
    this.setOpacity(opacity);
  }

  this.layer.show(1000);//necessary for Chrome to render the SVG - don't ask
}

// focus point setter
CLayerPrototype.prototype.setFocusPoint = function(x, y)
{
  this.focusPointX = parseFloat(x);
  this.focusPointY = parseFloat(y);
};

// move layer (in pixels)
CLayerPrototype.prototype.moveFocusPoint = function(dx, dy)
{
  this.focusPointX += this.layerPixelSize * dx;
  this.focusPointY += this.layerPixelSize * dy;
}

// layer opacity setter
CLayerPrototype.prototype.setOpacity = function(opacity)
{
  this.layer.stop(true, true).css('opacity', opacity);
  // TODO: replace stop(...) with finish() when upgrade jQuery to 1.9
  // XXX animation is necessary to be queued with loaded image appearance animation
  //this.layer.animate({'opacity': opacity}, 100);
}

// layer z-index setter
CLayerPrototype.prototype.setZ = function(zIndex)
{
  if (zIndex != null)
  {
    this.z = parseInt(zIndex);
    this.layer.css('z-index', this.z);
  }
  else
  {
    this.z = parseInt(this.layer.css('z-index'));
  }
}

CLayerPrototype.prototype.destroy = function()
{
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

