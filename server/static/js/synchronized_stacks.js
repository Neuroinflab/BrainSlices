/* File: synchronized_stacks.js */
/*****************************************************************************\
 *                                                                           *
 *  This file is part of BrainSlices Software                                *
 *                                                                           *
 *  Copyright (C) 2012-2014 J. M. Kowalski                                   *
 *                                                                           *
 *  BrainSlices software is free software: you can redistribute it and/or    *
 *  modify it under the terms of the GNU General Public License as           *
 *  published by the Free Software Foundation, either version 3 of the       *
 *  License, or (at your option) any later version.                          *
 *                                                                           *
 *  BrainSlices software is distributed in the hope that it will be useful,  *
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of           *
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the            *
 *  GNU General Public License for more details.                             *
 *                                                                           *
 *  You should have received a copy of the GNU General Public License        *
 *  along with BrainSlices software.                                         *
 *  If not, see http://www.gnu.org/licenses/.                                *
 *                                                                           * 
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
    /**
     * Class: CSynchronizedStacksDisplay
     *
     * A class of objects handling synchronized stacks of layers.
     *
     * Note:
     *   The class is interface-oriented; it might be wished to outsource
     *   interface events handling to external code.
     *
     * Attributes:
     *   stacks - An Array of stacks (<CLayerStack> objects).
     *   images - A <CImageManager> object in which basic metadata of tile
     *            layers are stored.
     *   gfx - A path to directory containing graphics.
     *   transparency - A value of layer transparency.
     *   synchronize - A flag indicating whether stacks has to be moved
     *                 simultaneously.
     *   $display - A jQuery object representing parental element for
     *              synchronized stacks (prefferably not a static element).
     *   $displayContainer - A jQuery object representing DIV element in
     *                       which the grid of stack displays is being
     *                       rendered.
     *   nx - Number of columns in the grid of stack displays.
     *   ny - Number of rows in the grid of stack displays.
     *   
     *   DELETED zoom - Current zoom value -- moved to scope
     *   
     *   
     *   focusPointX - Following the x coordinate of "common focus point"
     *                 (when stacks has not been desynchronized; otherwise
     *                 only f.p. of first (0-th, located at 0,0 node of the
     *                 grid) stack).
     *   focusPointY - Following the y coordinate of "common focus point"
     *                 (when stacks has not been desynchronized; otherwise
     *                 only f.p. of first (0-th, located at 0,0 node of the
     *                 grid) stack).
     *   crosshairX - The x coordinate of the crosshair location of every
     *                stack.
     *   crosshairY - The x coordinate of the crosshair location of every
     *                stack.
     *   resizeHandler - A handler of resize event of the window object.
     *
     * Interface-oriented attributes:
     *   zoomUpdateEnabled - An internal flag for zoom change handlers
     *                       coordination.
     ************************************************************************
     * Constructor: CSynchronizedStacksDisplay
     *
     * Parameters:
     *   $display - A value of the $display attribute.
     *   nx - A value of the nx attribute.
     *   ny - A value of the ny attribute.
     *   synchronize - A value of the synchronize attribute. Defaults to true.
     *   zoom - A value of the zoom attribute. Defaults to 1.
     *   focusPointX - A value of the focusPointX attribute. Defaults to 0.
     *   focusPointY - A value of the focusPointY attribute. Defaults to 0.
     *   crosshairX - A value of the crosshairX attribute.
     *   crosshairY - A value of the crosshairY attribute.
     *   $controlPanel - A dummy parameter.
     *   gfx - A value of the gfx attribute. Defaults to '/static/gfx'.
     *   images - A value of the images attribute.
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
      BS.scope.register(
      {
        change:
        function(variable, val)
        {
          switch (variable)
          {
            case "zoom":
              if (thisInstance.zoomUpdateEnabled)
              {
                thisInstance.zoomUpdateEnabled = false;
                thisInstance.setZoom(val);
                thisInstance.update();
                thisInstance.zoomUpdateEnabled = true;
              }
          }

        }
      });

  BS.scope.register(
  {
    change:
    function(what, val)
    {
      if (what == "quality")
      {
        thisInstance.setQuality(val, true);
        thisInstance.update();
      }
    }
  });

  BS.scope.set("quality", "med");
  BS.scope.register(
  {
    change:
    function(what, val)
    {
      if( what == "trans")
      {
        thisInstance.setTransparency(val, true);
        thisInstance.update();
      }
    }
  });

  BS.scope.set("trans", 0.5);

  BS.scope.register(
  {
    change:
    function(what, val)
    {
      if (what == "synch")
      {
        if (val)
        {
          thisInstance.syncStart();
        }
        else
        {
          thisInstance.syncStop();
        }
      }
    }
  });
  BS.scope.set("synch",true);

      //stacks

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

      BS.scope.set("zoom", zoom != null ? zoom : 1.);
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
       *       of grid of layer stacks.
       *   zoom - A current zoom.
       *   display - A string indicating whether the grid of layer stacks is
       *       being displayed in 'matrix' or 'serial' mode.
       *   sync - A boolean indicating whether layer stacks are synchronized.
       *   focus - An Array of pairs (2-element Arrays) defining focal point
       *       of consecutive layer stacks.
       *   loaded - An Array of Arrays of identifiers of layers loaded to
       *      consecutive layer stacks.
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
       *
       * TODO: scope update
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
       *
       * TODO: scope update
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

      /**
       * Method: rearrange
       *
       * Rearrange the grid of layer stacks. Either create or dispose stacks
       * if necessary.
       *
       * Parameters:
       *   nx - A new number of columns in the grid.
       *   ny - A new number of rows in the grid.
       *   width - A new width of this.$displayContainer element. Defaults
       *       to width of this.$display element.
       **********************************************************************/
      rearrange:
      function(nx, ny, width)
      {
        var idMax = this.stacks.length; //this.nx * this.ny;
        this.nx = parseInt(nx);
        this.ny = parseInt(ny);

        this.width = width;
        if (width == null)
        {
          this.$display.css({'overflow-x': 'hidden'});
          this.$displayContainer.css({//'position': 'absolute',
            'width': 'auto',
            'right': '0px'});
        }
        else
        {
          this.$display.css({'overflow-x': 'auto'});
          this.$displayContainer.css({//'position': 'absolute',
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
                  this.crosshairY, false, this.gfx);

              stack.synchronize(this);
              stack.syncId(this.stacks.length);
              this.stacks.push(stack);

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

      /**
       * Method: removeLayer
       *
       * Remove layer from all synchronized stacks and remove metadata of the 
       * corresponding image from this.images.
       *
       * Note:
       *   The layer is assumed to be a tile layer.
       *
       * Parameters:
       *   id - An identifier of the layer/image.
       **********************************************************************/
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

      /**
       * Method: load
       *
       * Load a layer into a stack.
       *
       * Parameters:
       *   stackId - An identifier (number) of the stack.
       *   imageId - An identifier of the layer.
       *
       * Note:
       *   An (ugly) alias of
       *   > this.loadLayerByStack(this.stacks[stackId], imageId)
       **********************************************************************/
      load:
      function(stackId, imageId)
      {
        this.loadLayerByStack(this.stacks[stackId], imageId);
      },

      /**
       * Method: loadLayerByStack
       *
       * Load a layer into a stack.
       *
       * Parameters:
       *   stack - The stack (<CLayerStack> object).
       *   imageId - An identifier of the layer.
       **********************************************************************/
      loadLayerByStack:
      function(stack, imageId)
      {
        var quality = BS.scope.get('quality');//this.$quality.val();
        stack.loadFromCache(this.images, imageId, quality);
      },

      /**
       * Method: unload
       *
       * Unload a layer from a stack.
       *
       * Parameters:
       *   stackId - An identifier (number) of the stack.
       *   imageId - An identifier of the layer.
       ******************************************/
      unload:
      function(stackId, imageId)
      {
        this.stacks[stackId].remove(imageId);
      },

      /**
       * Method: unloadAll
       *
       * Unload all layers from a stack or from every stack.
       *
       * Parameters:
       *   id - An identifier (number) of the stack. If not given or null
       *    layers are removed from every stack in the object.
       *******************************************************************/
      unloadAll:
      function(id)
      {
        if (id != null)
        {
          this.stacks[id].removeAll();
          return;
        }

        for (var i = 0; i < this.stacks.length; i++)
        {
          this.unloadAll(i);
        }
      },

      /**
       * Method: loadedImages
       *
       * Get identifiers of images (tile layers) loaded into any stack.
       *
       * Returns:
       *   An object with attributes of names of image identifiers.
       ****************************************************************/
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

      /**
       * Method: has
       *
       * Check whether a stack contains an image (tile layer).
       *
       * Parameters:
       *   stackId - An identifier (number) of the stack.
       *   imageId - An identifier of the layer.
       *
       * Returns:
       *   True if the stack contains the image, false otherwise.
       ***********************************************************/
      has:
      function(stackId, imageId)
      {
        return imageId in this.stacks[stackId].layers;
      },

      /**
       * Method: putCursor
       *
       * For every stack in the object of identifier different than given
       * put cursor in given x, y coordinates. Hide cursor for stack of
       * given identifier.
       *
       * Parameters:
       *   x - An x coordinate.
       *   y - A y coordinate.
       *   id - A stack identifier.
       *******************************************************************/
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

      /**
       * Method: moveAbsolute
       *
       * If any of already adjusted images is loaded to a given stack, adjust
       * all adjusted images loaded to the stack by change of coordinates.
       * Otherwise move focus point of all stacks (if stack movement is
       * synchronized or no stack identifier is given; otherwise move focus
       * point of the given stack only).
       *
       * Parameters:
       *   dx - A change value of the x coordinate.
       *   dy - A change value of the y coordinate.
       *   id - An identifier of the stack being moved.
       **********************************************************************/
      moveAbsolute:
      function(dx, dy, id)
      {
        // check if any of adjusted images is in the moved area
        var adjust = false;
        if (this.images.isAdjusted() && id != null)
        {
          var stack = this.stacks[id];
          var adjusted = this.images.getAdjusted();
          for (var i = 0; i < adjusted.length; i++)
          {
            var imageId = adjusted[i];
            if (stack.has(imageId))
            {
              adjust = true;
              this.images.adjustOffset(dx, dy, imageId);
            }
          }
        }

        //if (adjust)
        //{
        //  //this.images.adjustOffset(dx, dy);
        //}
        //else
        if (adjust)
          return;

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
      },

      /**
       * Method: setFocusPoint
       *
       * Set focus point of all stacks (if stack movement is synchronized or
       * no stack identifier is given; otherwise set focus point of the given
       * stack only).
       *
       * Parameters:
       *   x - A value of the x coordinate of the focus point.
       *   y - A value of the y coordinate of the focus point.
       *   id - An identifier of the stack.
       *********************************************************************/
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
          if (id == 0)
          {
            this.focusPointX = x;
            this.focusPointY = y;
          }
        }
      },

      /**
       * Method: setZoom
       *
       * Set zoom value of stacks in the object.
       *
       * Parameters:
       *   zoom - A value of zoom.
       ******************************************/
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

      /**
       * Method: updateZoomPanel
       *
       * Update zoom value displayed in the control panel.
       ****************************************************/
      updateZoomPanel:
      function()
      {
        BS.scope.set("zoom", this.zoom);
      },

      /**
       * Method: mulZoom
       *
       * Multiply zoom value of every stack (if stack movement is
       * synchronized or no stack identifier is given; otherwise only zoom
       * value of the given stack is affected) by a given factor.
       *
       * Change focus point of affected stacks to preserve location of given
       * point (in stack coordinates) in the display.
       *
       * Parameters:
       *   factor - A value of the factor by which value of zoom is being
       *      multiplied.
       *   id - An identifier of the stack.
       *   x - An x coordinate of the point which display location has to be
       *     preserved.
       *   y - A y coordinate of the point which display location has to be
       *     preserved.
       **********************************************************************/
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

      /**
       * Method: setQuality
       *
       * Change quality setting of layers.
       *
       * Parameters:
       *   quality - Quality setting (a real number from -0.5 to 0.5 or a
       *       string: 'low' for -0.5, 'med' for 0. and 'high' for 0.5).
       *   doNotUpdate - If true omit update of the quality settings in the
       *         control panel. Defaults to false.
       **********************************************************************/
      setQuality:
      function(quality, doNotUpdate)
      {
        for (var i = 0; i < this.stacks.length; i++)
        {
          this.stacks[i].setQuality(quality);
        }

        if (!doNotUpdate)
        {
          BS.scope.set('quality', quality);
        }
      },

      /**
       * Method: setTransparency
       *
       * Change transparency of layers.
       *
       * Parameters:
       *   transparency - A value of transparency (from 0 to 1).
       *   doNotUpdate - If true omit update of the transparency settings in
       *         the control panel. Defaults to false.
       **********************************************************************/
      setTransparency:
      function(transparency, doNotUpdate)
      {
        this.transparency = transparency;

        for (var i = 0; i < this.stacks.length; i++)
        {
          this.stacks[i].setTransparency(transparency);
        }

        if (!doNotUpdate)
        {
          BS.scope.set('transparency', transparency);
        }
      },

      /**
       * Method: update
       *
       * Update display of all layers (in every stack) with their set
       * parameters (like zoom, transparency, focus point etc.)
       *****************************************************************/
      update:
      function()
      {
        for (var i = 0; i < this.stacks.length; i++)
        {
          this.stacks[i].update();
        }
      },

      /**
       * Method: resize
       *
       * Resize displays of every stack in the object; set their crosshairs
       * to given location.
       *
       * A crosshair is a location in display where the focus point is
       * located.
       *
       * Parameters:
       *   crosshairX - The x coordinate of the crosshair. Defaults to 50%.
       *   crosshairY - The y coordinate of the crosshair. Defaults to 50%.
       **************************/
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

        this.$displayContainer.remove();

        for (var name in this)
        {
          delete this[name];
        }
      }
    }
  }

})(BrainSlices, jQuery);

