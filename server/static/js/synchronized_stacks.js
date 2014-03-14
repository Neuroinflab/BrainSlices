/* File: synchronized_stacks.js; TO BE DOCUMENTED*/
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

(function(BS, $, undefined)
{
  var gui = BS.gui;
  var api = BS.api;
 
  if (api.CSynchronizedStacksDisplay)
  {
    console.warn('BrainSlices.api.CSynchronizedStacksDisplay already defined');
  }
  else
  {
    /************************************************************************\
     * Class: CSynchronizedStacksDisplay                                    *
     *                                                                      *
     * A class of objects handling synchronized stacks of layers.           *
     *                                                                      *
     * Note:                                                                *
     *   The class is interface-oriented; it might be wished to outsource   *
     *   interface events handling to external code.                        *
     *                                                                      *
     * Attributes:                                                          *
     *   stacks - An Array of stacks (<CLayerStack> objects).               *
     *   images - A <CImageManager> object in which basic metadata of tile  *
     *            layers are stored.                                        *
     *   gfx - A path to directory containing graphics.                     *
     *   transparency - A value of layer transparency.                      *
     *   synchronize - A flag indicating whether stacks has to be moved     *
     *                 simultaneously.                                      *
     *   $display - A jQuery object representing parental element for       *
     *              synchronized stacks (prefferably not a static element). *
     *   $displayContainer - A jQuery object representing DIV element       *
     *                       containing the grid of stack displays.         *
     *   nx - Number of columns in the grid of stack displays.              *
     *   ny - Number of rows in the grid of stack displays.                 *
     *   zoom - Current zoom value.                                         *
     *   focusPointX - Following the x coordinate of "common focus point"   *
     *                 (when stacks has not been desynchronized; otherwise  *
     *                 only f.p. of first (0-th, located at 0,0 node of the *
     *                 grid) stack).                                        *
     *   focusPointY - Following the y coordinate of "common focus point"   *
     *                 (when stacks has not been desynchronized; otherwise  *
     *                 only f.p. of first (0-th, located at 0,0 node of the *
     *                 grid) stack).                                        *
     *   crosshairX - The x coordinate of the crosshair location of every   *
     *                stack.                                                *
     *   crosshairY - The x coordinate of the crosshair location of every   *
     *                stack.                                                *
     *   resizeHandler - A handler of resize event of the window object.    *
     *                                                                      *
     * Interface-oriented attributes:                                       *
     *   control - A <CDraggableDiv> object controlling the control panel.  *
     *   $zoom - A jQuery object representing an input element (numeric)    *
     *           for zoom value.                                            *
     *   $zoomLog - A jQuery object representing an input element (numeric, *
     *              preferably slider) for log2(zoom) value.                *
     *   $quality - A jQuery object representing a select element for       *
     *              quality settings.                                       *
     *   $transparency - A jQuery object representing an input element      *
     *                   (numeric, preferably slider) for layer             *
     *                   transparency value.                                *
     *   $stacksSynchronization - A jQuery object representing an input     *
     *                            element (checkbox) for stacks             *
     *                            synchronization switching.                *
     *   zoomUpdateEnabled - An internal flag for zoom change handlers      *
     *                       coordination.                                  *
     *   updateZoom - A handler of change event of $zoom element.           *
     *   updateZoomLog - A handler of change event of $zoomLog element.     *
     *   updateQuality - A handler of change event of $quality element.     *
     *   updateTransparency - A handler of change event of $transparency    *
     *                        element.                                      *
     *   updateSynchronization - A handler of change event of               *
     *                           $stacksSynchronization element.            *
     ************************************************************************
     * Constructor: CSynchronizedStacksDisplay                              *
     *                                                                      *
     * Parameters:                                                          *
     *   $display - A value of the $display attribute.                      *
     *   nx - A value of the nx attribute.                                  *
     *   ny - A value of the ny attribute.                                  *
     *   synchronize - A value of the synchronize attribute. Defaults to    *
     *                 true.                                                *
     *   zoom - A value of the zoom attribute. Defaults to 1.               *
     *   focusPointX - A value of the focusPointX attribute. Defaults to 0. *
     *   focusPointY - A value of the focusPointY attribute. Defaults to 0. *
     *   crosshairX - A value of the crosshairX attribute.                  *
     *   crosshairY - A value of the crosshairY attribute.                  *
     *   $controlPanel - A jQuery object representing HTML element for the  *
     *                   control panel.                                     *
     *   gfx - A value of the gfx attribute. Defaults to '/static/gfx'.     *
     *   images - A value of the images attribute.                          *
    \************************************************************************/
    api.CSynchronizedStacksDisplay = function($display, nx, ny, synchronize,
                                              zoom, focusPointX, focusPointY,
                                              crosshairX, crosshairY,
                                              $controlPanel, gfx, images)
    {
      var thisInstance = this;
    
      this.zoomUpdateEnabled = true;
    
      this.stacks = [];
    
      this.images = images;
    
      this.gfx = gfx != null ? gfx : '/static/gfx';
    
      if ($controlPanel == null)
      {
        this.control = null;
    
        this.$zoom = null;
        this.$zoomLog = null;
        this.$quality = null;
        this.$transparency = null;
    
        this.$stacksSynchronization = null;
    
        this.transparency = 0.;
      }
      else
      {
        this.control = new gui.CDraggableDiv($controlPanel);
    
        this.$zoom = $controlPanel.find('[name="zoom"]');
        this.$zoomLog = $controlPanel.find('[name="zoomLog"]');
        this.$quality = $controlPanel.find('[name="quality"]');
        this.$transparency = $controlPanel.find('[name="transparency"]');
    
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
          if (this.checked)
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
        this.$stacksSynchronization.prop('checked', this.synchronize);
      }
    
      this.$display = $display;
      this.$displayContainer = $('<div></div>')
        .css({
          position: 'absolute',
          left: '0px',
          top: '0px',
          right: '0px',
          bottom: '0px',
          width: 'auto',
          height: 'auto'})
        .appendTo($display);

      this.nx = 0;
      this.ny = 0;
    
      this.zoom = zoom != null ? zoom : 1.;
      this.focusPointX = focusPointX != null ? focusPointX : 0.;
      this.focusPointY = focusPointY != null ? focusPointY : 0.;
      this.crosshairX = crosshairX;
      this.crosshairY = crosshairY;
    
      this.resizeHandler = function()
      {
        thisInstance.resize(crosshairX, crosshairY);
      }
    
      $(window).bind('resize', this.resizeHandler);
    
      // XXX: might be a part of interface
      this.rearrange(nx, ny);
    }
    
    api.CSynchronizedStacksDisplay.prototype =
    {
      /**
       * Method: getState
       *
       * Returns:
       *   A state object representing present state of the stacks.
       *
       * Attributes of the state object:
       *   shape - A pair (2-element Array) defining both x and y dimansion
       *           of grid of layer stacks.
       *   zoom - A current zoom.
       *   display - A string indicating whether the grid of layer stacks is
       *             being displayed in 'matrix' or 'serial' mode.
       *   sync - A boolean indicating whether layer stacks are synchronized.
       *   focus - An Array of pairs (2-element Arrays) defining focal point
       *           of consecutive layer stacks.
       *   loaded - An Array of Arrays of identifiers of layers loaded to
       *            consecutive layer stacks.
       **********************************************************************/
      getState:
      function()
      {
        var state = {shape: [this.nx, this.ny],
                     zoom: this.zoom,
                     display: this.width == null ? 'matrix' : 'serial',
                     sync: this.synchronize};
        var focus = [];
        var loaded = [];
        for (var i = 0; i < this.stacks.length; i++)
        {
          var stack = this.stacks[i];
          var ids = [];
          for (var id in stack.layers)
          {
            ids.push(id);
          }
          focus.push([stack.focusPointX, stack.focusPointY]);
          loaded.push(ids);
        }
        state.focus = focus;
        state.loaded = loaded;
        return state;
      },

      /**
       * Method: syncStart
       *
       * Start moving stacks simultaneously.
       **************************************/
      syncStart:
      function()
      {
        this.synchronize = true;
      },
      
      /**
       * Method: syncStop
       *
       * Stop moving stacks simultaneously.
       *************************************/
      syncStop:
      function()
      {
        this.synchronize = false;
      },

      /**
       * Method: updateTopZ
       *
       * Call <CLayerStack.updateTopZ> (z) for every stack in this.stacks.
       *
       * Attributes:
       *   z - See <CLayerStack.updateTopZ> for details.
       ******************************************************************/
      updateTopZ:
      function(z)
      {
        for (var i = 0; i < this.stacks.length; i++)
        {
          this.stacks[i].updateTopZ(z);
        }
      },
      
      rearrange:
      function(nx, ny, width)
      {
        // TODO: layer load button removal or leave it to arrangeInterface?
        //       merge with arrangeInterface?
        var idMax = this.stacks.length; //this.nx * this.ny;
        this.nx = parseInt(nx);
        this.ny = parseInt(ny);
     
        this.width = width;
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
              stack = new api.CLayerStack($div, this.zoom, this.focusPointX,
                                          this.focusPointY, this.crosshairX,
                                          this.crosshairY, this, false,
                                          this.gfx);
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
      },
      
      removeLayer:
      function(id)
      {
        for (var i = 0; i < this.stacks.length; i++)
        {
          if (this.has(i, id))
          {
            this.unload(i, id, true);
          }
        }
      
        this.images.removeCachedImage(id);
      },
      
      load:
      function(stackId, imageId, doNotUpdateIface)
      {
        this.loadLayerByStack(this.stacks[stackId], imageId, doNotUpdateIface);
      },
      
      loadLayerByStack:
      function(stack, imageId, doNotUpdateIface)
      {
        var quality = this.$quality.val();
        stack.loadFromCache(this.images, imageId, quality);
      },
      
      unload: function(stackId, imageId, doNotUpdateIface)
      {
        this.stacks[stackId].remove(imageId);
      },
      
      unloadAll: function(id)
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
      },
      
      loadedImages:
      function()
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
      },
      
      has:
      function(stackId, imageId)
      {
        return imageId in this.stacks[stackId].layers;
      },
      
      add:
      function(stack)
      {
        this.stacks.push(stack);
        return this.stacks.length - 1;
      },
      
      removeStack:
      function(id, doNotDestroy)
      {
        //TODO: stack display removal      
        var res = this.stacks.splice(id, 1);
      
        // propagate new id
        for (var i = id; i < this.stacks.length; i++)
        {
          this.stacks[i].syncId(i);
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
      },
      
      putCursor:
      function(x, y, id)
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
      },
      
      moveAbsolute:
      function(dx, dy, id)
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
              this.images.adjustOffset(dx, dy, imageId);
              //break;
            }
          }
        }
      
        //if (adjust)
        //{
        //  //this.images.adjustOffset(dx, dy);
        //}
        //else
        if (!adjust)
        {
          if (this.synchronize || id == null)
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
      },
      
      setFocusPoint:
      function(x, y, id)
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
      },
      
      setZoom:
      function(zoom)
      {
        for (var i = 0; i < this.stacks.length; i++)
        {
          this.stacks[i].setZoom(zoom);
        }
      
        this.zoom = zoom;
        this.updateZoomPanel();
      },
      
      updateZoomPanel:
      function()
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
      },
      
      // stack, but iface utilizes it (updateZoomPanel)
      // -> propagation necessary
      mulZoom:
      function(factor, id, x, y)
      {
        // XXX: think about an adjustment - see moveAbsolute for details
      
        if (this.synchronize || id == null)
        {
          for (var i = 0; i < this.stacks.length; i++)
          {
            var stack = this.stacks[i];
            stack.setPixelSize(stack.pixelSize / factor, x, y);
            stack.update();
          }
      
          this.zoom *= factor;
          this.updateZoomPanel();
        }
        else
        {
          var stack = this.stacks[id];
          stack.setPixelSize(stack.pixelSize / factor, x, y);
          stack.update();
          if (id == 0)
          {
            // follow the main stack
            this.zoom *= factor;
            this.updateZoomPanel();
          }
        }
      
        if ((this.synchronize || id == null || id == 0) && x != null && y != null)
        {
          var dx = this.focusPointX - x;
          var dy = this.focusPointY - y;
          this.focusPointX = x + dx / factor;
          this.focusPointY = y + dy / factor;
        }
      },
      
      setQuality:
      function(quality, doNotUpdate)
      {
        for (var i = 0; i < this.stacks.length; i++)
        {
          this.stacks[i].setQuality(quality);
        }
      
        if (this.$quality != null && !doNotUpdate)
        {
          this.$quality.val(quality);
        }
      },
      
      setTransparency:
      function(transparency, doNotUpdate)
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
      },
      
      update:
      function()
      {
        for (var i = 0; i < this.stacks.length; i++)
        {
          this.stacks[i].update();
        }
      },
      
      resize:
      function(crosshairX, crosshairY)
      {
        for (var i = 0; i < this.stacks.length; i++)
        {
          this.stacks[i].resize(crosshairX, crosshairY);
        }
      },

      /**
       * Destructor: destroy
       *
       * Prepare the object for disposal.
       ***********************************/
      destroy:
      function()
      {
        for (var i = 0; i < this.stacks.length; i++)
        {
          this.stacks[i].destroy();
        }
      
        // if autoresize enabled
        if (this.resizeHandler != null)
        {
          //this.layer.unbind('resize', this.resizeHandler);
          $(window).unbind('resize', this.resizeHandler);
        }
      
        if (this.control != null)
        {
          this.control.destroy();
          this.$zoom.unbind('change', this.updateZoom);
          this.$zoomLog.unbind('change', this.updateZoomLog);
          this.$quality.unbind('change', this.updateQuality);
          this.$transparency.unbind('change', this.updateTransparency);
          this.$stacksSynchronization.unbind('change', this.updateSynchronization);
        }
      
        this.$displayContainer.remove();

        for (var name in this)
        {
          delete this[name];
        }
      }
    }
  }

})(BrainSlices, jQuery);

