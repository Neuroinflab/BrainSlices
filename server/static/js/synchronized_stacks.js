/* File: synchronized_stacks.js; TO BE DOCUMENTED*/
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

function CSynchronizedStacksDisplay($display, nx, ny, synchronize, zoom,
                                    focusPointX, focusPointY, crosshairX,
                                    crosshairY, $controlPanel, doNotRemove,
                                    doNotAdjust, doNotDownload,
                                    gfx)
{
  var thisInstance = this;

  this.zoomUpdateEnabled = true;
  this.layers = []; // list of available layers

  this.stacks = [];

  this.images = new CImageManager();

  this.adjustmentEnabled = doNotAdjust != true;
  this.removalEnabled = doNotAdjust != true;
  this.downloadEnabled = doNotDownload != true;
  this.loadButtons = {} // AssocArray of Arrays

  this.gfx = gfx != null ? gfx : 'static/gfx';

  if ($controlPanel == null)
  {
    this.control = null;
    this.$mouseXElement = null;
    this.$mouseYElement = null;

    this.$zoom = null;
    this.$zoomLog = null;
    this.$quality = null;
    this.$transparency = null;

    this.$layerList = null;

    this.$stacksSynchronization = null;

    this.transparency = 0.;
  }
  else
  {
    this.control = new CDraggableDiv($controlPanel);
    this.$mouseXElement = $controlPanel.find('.mouseX');
    this.$mouseYElement = $controlPanel.find('.mouseY');

    this.$zoom = $controlPanel.find('[name="zoom"]');
    this.$zoomLog = $controlPanel.find('[name="zoomLog"]');
    this.$quality = $controlPanel.find('[name="quality"]');
    this.$transparency = $controlPanel.find('[name="transparency"]');

    this.$layerList = $controlPanel.find('.layerList');

    this.$stacksSynchronization = $controlPanel.find('[name="synchronization"]');

    this.updateZoom = function()
    {
      if (thisInstance.zoomUpdateEnabled)
      {
        thisInstance.zoomUpdateEnabled = false;
        var zoom = thisInstance.$zoom.val();
        var zoomLog = Math.log(zoom) / Math.log(2);
        thisInstance.setZoom(zoom);
        thisInstance.update();
        if (thisInstance.$zoomLog.val() != zoomLog)
        {
          thisInstance.$zoomLog.val(zoomLog);
        }
        thisInstance.zoomUpdateEnabled = true;
      }
    };

    this.$zoom.bind('change', this.updateZoom);

    this.updateZoomLog = function()
    {
      if (thisInstance.zoomUpdateEnabled)
      {
        thisInstance.zoomUpdateEnabled = false;
        var zoom = Math.pow(2, thisInstance.$zoomLog.val());
        thisInstance.setZoom(zoom);
        thisInstance.update();
        if (thisInstance.$zoom.val() != zoom)
        {
          thisInstance.$zoom.val(zoom);
        }
        thisInstance.zoomUpdateEnabled = true;
      }
    }

    this.$zoomLog.bind('change', this.updateZoomLog);

    this.updateQuality = function()
    {
      var quality = thisInstance.$quality.val();
      thisInstance.setQuality(quality, true);
      thisInstance.update();
    }

    this.$quality.bind('change', this.updateQuality);

    this.updateTransparency = function()
    {
      var transparency = thisInstance.$transparency.val();
      thisInstance.setTransparency(transparency, true);
      thisInstance.update();
    }

    this.$transparency.bind('change', this.updateTransparency);

    this.updateSynchronization = function()
    {
      if (thisInstance.$stacksSynchronization.filter(':checked').length != 0)
      {
        thisInstance.syncStart();
      }
      else
      {
        thisInstance.syncStop();
      }
    }

    this.$stacksSynchronization.bind('change', this.updateSynchronization);

    this.setTransparency(this.$transparency.val(), true);
  }

  //stacks
  this.synchronize = synchronize == null ? true : synchronize;
  if (this.$stacksSynchronization != null)
  {
    if (this.synchronize)
    {
      this.$stacksSynchronization.attr('checked', 'checked');
    }
    else
    {
      this.$stacksSynchronization.filter(':checked').removeAttr('checked');
    }
  }

  this.$displayContainer = $('<div style="position: absolute; left: 0px; top: 0px; right: 0px; bottom: 0px; width: auto; height: auto;"></div>');
  $display.append(this.$displayContainer);
  this.$display = $display;
  this.nx = 0;
  this.ny = 0;

  this.zoom = zoom;
  this.focusPointX = focusPointX;
  this.focusPointY = focusPointY;
  this.crosshairX = crosshairX;
  this.crosshairY = crosshairY;



  this.resizeHandler = function()
  {
    // thisInstance, crosshairX, crosshairY are fixed now ^^;
    thisInstance.resize(crosshairX, crosshairY);
  }

  $(window).bind('resize', this.resizeHandler);

  this.rearrange(nx, ny);
}

CSynchronizedStacksDisplay.prototype.stopAdjustment = function(id)
{
  return this.images.stopAdjustment(id);
}

CSynchronizedStacksDisplay.prototype.startAdjustment = function(id)
{
  return this.images.startAdjustment(id);
}

CSynchronizedStacksDisplay.prototype.isAdjusted = function(id)
{
  return this.images.adjust != null && id in this.images.adjust;
}

CSynchronizedStacksDisplay.prototype.bindImageInterface = function(id, iface)
{
  return this.images.bindImageInterface(id, iface);
}

CSynchronizedStacksDisplay.prototype.syncStart = function()
{
  this.synchronize = true;
}

CSynchronizedStacksDisplay.prototype.syncStop = function()
{
  this.synchronize = false;
}

CSynchronizedStacksDisplay.prototype.addTileLayer = function(imageId,
                                                             path,
                                                             zIndex,
                                                             label)
{
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

  this.images.cacheTiledImage(id, path, function()
  { // car z = zIndex ??
    //TODO: move to separated method?
    for (var z = 0; z < thisInstance.layers.length; z++)
    {
      var imageID = thisInstance.layers[z].id;
      if (thisInstance.images.has(imageID))
      {
        thisInstance.images.setZ(imageID, z);
      }
    }

    thisInstance.updateTopZ(thisInstance.layers.length - 1);

    thisInstance.arrangeInterface();
  }, $iface);
  // onSuccess shall update interface and z-indices
  return id;
}

CSynchronizedStacksDisplay.prototype.updateTopZ = function(z)
{
  for (var i = 0; i < this.stacks.length; i++)
  {
    this.stacks[i].updateTopZ(z);
  }
}

CSynchronizedStacksDisplay.prototype.rearrange = function(nx, ny, width)
{
  // TODO: layer load button removal or leave it to arrangeInterface?
  //       merge with arrangeInterface?
  var idMax = this.stacks.length; //this.nx * this.ny;
  this.nx = parseInt(nx);
  this.ny = parseInt(ny);

  if (width == null)
  {
    this.$display.css({'overflow-x': 'hidden'});
    this.$displayContainer.css({'position': 'absolute',
                                'width': 'auto',
                                'right': '0px'});
  }
  else
  {
    this.$display.css({'overflow-x': 'auto'});
    this.$displayContainer.css({'position': 'absolute',
                                'width': width,
                                'right': 'auto'});
  }

  var id = 0;
  for (var x = 0; x < nx; x++)
  {
    var l = Math.round(100. * x / nx);
    var r = 100. - Math.round(100. * (x + 1.) / nx);

    for (var y = 0; y < ny; y++)
    {
      var t = Math.round(100. * y / ny);
      var b = 100. - Math.round(100. * (y + 1.) / ny);

      if (id < this.stacks.length)
      {
        // stack already exist
        var stack = this.stacks[id];
        stack.display.css({'top': t + '%',
                           'bottom': b + '%',
                           'left': l + '%',
                           'right': r + '%'});
        stack.hideCursor();
      }
      else
      {
        // a new stack is necessary
        var $div = $('<div style="position: absolute; top: ' + t + '%; left: ' +
                     l + '%; bottom: ' + b + '%; right: ' + r +
                     '%; width: auto; height: auto; overflow: hidden;"></div>');
        this.$displayContainer.append($div);
        stack = new CLayerStack($div, this.zoom, this.focusPointX,
                                this.focusPointY, this.crosshairX,
                                this.crosshairY, this.$mouseXElement,
                                this.$mouseYElement, this, false, this.gfx);
        stack.setTransparency(this.transparency);
      }
      id++;
    }
  }

  var toRemove = this.stacks.splice(id);
  for (var i = 0; i < toRemove.length; i++)
  {
    var display = toRemove[i].display;
    toRemove[i].destroy();
    display.remove();
  }

  this.resize(this.crosshairX, this.crosshairY);
}

CSynchronizedStacksDisplay.prototype.arrangeInterface = function()
{
  // detaching is crucial for preservation of event handlers
  this.$layerList.find('.recyclableElement').detach();
  this.$layerList.html('');
  var nmax = this.nx * this.ny;

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
      if (this.has(n, id))
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

CSynchronizedStacksDisplay.prototype.layerDelB = function(z)
{
  var thisInstance = this;
  var $delB = $('<button>Delete</button>');
  $delB.bind('click', function()
  {
    thisInstance.removeLayerByZ(z);
  });

  return $delB;
}

CSynchronizedStacksDisplay.prototype.layerDrag = function(z)
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
    for (var i = 0; i < thisInstance.stacks.length; i++)
    {
      thisInstance.stacks[i].setOpacity();
    }

    thisInstance.updateTopZ(stop);

    thisInstance.arrangeInterface();
  });

  return $drag;
}

CSynchronizedStacksDisplay.prototype.layerCB = function(id, stackId)
{
  //TODO: use stack instead of stackId???
  
  var thisInstance = this;
  var stack = this.stacks[stackId];
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

CSynchronizedStacksDisplay.prototype.removeLayer = function(id)
{
  for (var i = 0; i < this.stacks.length; i++)
  {
    if (this.has(i, id))
    {
      this.unload(i, id, true);
    }
  }

  var toDismiss = this.loadButtons[id];
  //XXX: redundant with arrangeInterface();
  for (var i = 0; i < toDismiss.lenght; i++)
  {
    var item = toDismiss[i];
    item.$cb.unbind('change', item.changeHandler);
  }
  delete this.loadButtons[id];

  this.images.removeCachedImage(id);
}

CSynchronizedStacksDisplay.prototype.removeLayerByZ = function(z)
{
  //XXX warning: z might be greater than this.layers.length !!!
  var id = this.layers[z].id;
  this.layers.splice(z, 1);
  this.removeLayer(id);
  this.arrangeInterface();
}

CSynchronizedStacksDisplay.prototype.flush = function()
{
  for (var i = 0; i < this.layers.length; i++)
  {
    this.removeLayer(this.layers[i].id);
  }
  this.layers = [];
  this.arrangeInterface();
}

CSynchronizedStacksDisplay.prototype.load = function(stackId, imageId,
                                                     doNotUpdateIface)
{
  this.loadLayerByStack(this.stacks[stackId], imageId, doNotUpdateIface);
}

CSynchronizedStacksDisplay.prototype.loadLayerByStack = function(stack, imageId,
                                                          doNotUpdateIface)
{
  var quality = this.$quality.val();
  stack.loadFromCache(this.images, imageId, quality);
  if (doNotUpdateIface != true)
  {
    this.loadButtons[imageId][stack.syncId()].$cb.attr('checked', 'checked');
  }
}

CSynchronizedStacksDisplay.prototype.unload = function(stackId, imageId,
                                                       doNotUpdateIface)
{
  this.stacks[stackId].remove(imageId);
  if (doNotUpdateIface != true)
  {
    this.loadButtons[imageId][stackId].$cb.filter(':checked').removeAttr('checked');
  }
}

CSynchronizedStacksDisplay.prototype.unloadAll = function(id)
{
  if (id != null)
  {
    this.stacks[id].removeAll();
    return;
  }

  for (var i = 0; i < this.stacks.length; i++)
  {
    //this.stacks[i].removeAll();
    this.unloadAll(i);
  }
}

CSynchronizedStacksDisplay.prototype.loadedImages = function()
{
  var images = {};
  for (var i = 0; i < this.stacks.length; i++)
  {
    for (var image in this.stacks[i].layers)
    {
      images[image] = null;
    }
  }
  return images;
}

CSynchronizedStacksDisplay.prototype.loadedImagesOrdered = function()
{
  var images = this.loadedImages();
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

CSynchronizedStacksDisplay.prototype.has = function(stackId, imageId)
{
  return imageId in this.stacks[stackId].layers;
}

CSynchronizedStacksDisplay.prototype.add = function(stack)
{
  this.stacks.push(stack);
  return this.stacks.length - 1;
}

CSynchronizedStacksDisplay.prototype.removeStack = function(id, doNotDestroy)
{
  //TODO: stack display removal      
  var res = this.stacks.splice(id, 1);

  // propagate new id
  for (var i = id; i < this.stacks.length; i++)
  {
    this.stacks[i].syncId(i);
  }

  //remove layer load/unload buttons
  for (var imageId in this.loadButtons)
  {
    item = this.loadButtons[imageId].splice(id, 1);
    if (item.length == 1)
    {
      item[0].$cb.unbind('change', item[0].changeHandler);
      item[0].$cb.remove(); //XXX
    }
  }

  if (res.length == 1)
  {
    res[0].desynchronize(true);
    if (doNotDestroy == true)
    {
      return res[0];
    }
    else
    {
      res[0].destroy();
    }
  }
}

CSynchronizedStacksDisplay.prototype.putCursor = function(x, y, id)
{
  for (var i = 0; i < this.stacks.length; i++)
  {
    if (i == id)
    {
      this.stacks[i].hideCursor();
    }
    else
    {
      this.stacks[i].putCursor(x, y);
      this.stacks[i].showCursor();
    }
  }
}

CSynchronizedStacksDisplay.prototype.moveAbsolute = function(dx, dy, id)
{
  // check if any of adjusted images is in the moved area
  var adjust = false;
  if (this.images.adjust != null && id != null)
  {
    var layers = this.stacks[id].layers;
    for (var imageId in this.images.adjust)
    {
      if (imageId in layers)
      {
        adjust = true;
        break;
      }
    }
  }

  if (adjust)
  {
    this.images.adjustOffset(dx, dy);
  }
  else if (this.synchronize || id == null)
  {
    for (var i = 0; i < this.stacks.length; i++)
    {
      this.stacks[i].moveAbsolute(dx, dy);
    }
    this.focusPointX -= dx;
    this.focusPointY -= dy;
  }
  else
  {
    this.stacks[id].moveAbsolute(dx, dy);
    if (id == 0)
    {
      // follow the main stack
      this.focusPointX -= dx;
      this.focusPointY -= dy;
    }
  }
}

CSynchronizedStacksDisplay.prototype.setFocusPoint = function(x, y, id)
{
  if (this.synchronize || id == null)
  {
    for (var i = 0; i < this.stacks.length; i++)
    {
      this.stacks[i].setFocusPoint(x, y);
    }
    this.focusPointX = x;
    this.focusPointY = y;
  }
  else
  {
    this.stacks[id].setFocusPoint(x, y);
  }
}

CSynchronizedStacksDisplay.prototype.setZoom = function(zoom)
{
  for (var i = 0; i < this.stacks.length; i++)
  {
    this.stacks[i].setZoom(zoom);
  }

  this.zoom = zoom;
  this.updateZoomPanel();
}

CSynchronizedStacksDisplay.prototype.updateZoomPanel = function()
{
  if (this.zoomUpdateEnabled)
  {
    if (this.$zoom != null)
    {
      this.$zoom.val(this.zoom);
    }

    if (this.$zoomLog != null)
    {
      var zoomLog = Math.log(this.zoom) / Math.log(2);
      this.$zoomLog.val(zoomLog);
    }
  }
}

// stack, but iface utilizes it (updateZoomPanel)
// -> propagation necessary
CSynchronizedStacksDisplay.prototype.mulZoom = function(factor, id)
{
  // XXX: think about an adjustment - see moveAbsolute for details

  if (this.synchronize || id == null)
  {
    for (var i = 0; i < this.stacks.length; i++)
    {
      var stack = this.stacks[i];
      stack.setPixelSize(stack.pixelSize / factor);
      stack.update();
    }

    this.zoom *= factor;
    this.updateZoomPanel();
  }
  else
  {
    var stack = this.stacks[id];
    stack.setPixelSize(stack.pixelSize / factor);
    stack.update();
    if (id == 0)
    {
      // follow the main stack
      this.zoom *= factor;
      this.updateZoomPanel();
    }
  }
}

CSynchronizedStacksDisplay.prototype.setQuality = function(quality, doNotUpdate)
{
  for (var i = 0; i < this.stacks.length; i++)
  {
    this.stacks[i].setQuality(quality);
  }

  if (this.$quality != null && !doNotUpdate)
  {
    this.$quality.val(quality);
  }
}

CSynchronizedStacksDisplay.prototype.setTransparency = function(transparency, doNotUpdate)
{
  this.transparency = transparency;

  for (var i = 0; i < this.stacks.length; i++)
  {
    this.stacks[i].setTransparency(transparency);
  }

  if (this.$transparency != null && !doNotUpdate)
  {
    this.$transparency.val(transparency);
  }
}

CSynchronizedStacksDisplay.prototype.update = function()
{
  for (var i = 0; i < this.stacks.length; i++)
  {
    this.stacks[i].update();
  }
}

CSynchronizedStacksDisplay.prototype.resize = function(crosshairX, crosshairY)
{
  for (var i = 0; i < this.stacks.length; i++)
  {
    this.stacks[i].resize(crosshairX, crosshairY);
  }
}

CSynchronizedStacksDisplay.prototype.destroy = function()
{
  for (var i = 0; i < this.stacks.length; i++)
  {
    this.stacks[i].destroy();
  }

  this.images.destroy();

  // if autoresize enabled
  if (this.resizeHandler != null)
  {
    //this.layer.unbind('resize', this.resizeHandler);
    $(window).unbind('resize', this.resizeHandler);
    this.resizeHandler = null;
  }

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

  if (this.control != null)
  {
    this.control.destroy();
    this.$zoom.unbind('change', this.updateZoom);
    this.updateZoom = null;
    this.$zoomLog.unbind('change', this.updateZoomLog);
    this.updateZoomLog = null;
    this.$quality.unbind('change', this.updateQuality);
    this.updateQuality = null;
    this.$transparency.unbind('change', this.updateTransparency);
    this.updateTransparency = null;
    this.$stacksSynchronization.unbind('change', this.updateSynchronization);
    this.updateSynchronization = null;
  }

  this.$displayContainer.remove();
}

