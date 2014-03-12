/* File: layer_manager.js */
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

with ({gui: BrainSlices.gui,
       getTrigger: BrainSlices.aux.getTrigger})
{
  /***************************************************************************\
   * Class: CLayerManager                                                    *
   *                                                                         *
   * A class of objects managing image load and unload in layer stacks and   *
   * providing an user interface.                                            *
   *                                                                         *
   * Attibutes:                                                              *
   *   stacks - A <CSynchronizedStacksDisplay> object being a collection of  *
   *            layer stacks.                                                *
   *   images - A shortcut to stacks.images.                                 *
   *   $layerList - A jQuery object representing HTML table (or tbody, etc.) *
   *                element containing list of layers.                       *
   *   ajaxProvider - An object providing <CAjaxProvider> interface to       *
   *                  interact with server.                                  *
   *   tableManager - A <CTableManager> object displaying the layers to the  *
   *                  user.                                                  *
   *   layers - Layer id (internal) to layer data mapping.                   *
   *   length - A number of already loaded layers.                           *
   *   autoAddTileLayer - A function defined by user for smart addition of   *
   *                      tile layers.                                       *
   *                                                                         *
   ***************************************************************************
   * Constructor: CLayerManager                                              *
   *                                                                         *
   * Parameters:                                                             *
   *   $layerList - A value of $layerList attribute.                         *
   *   stacks - A value of stacks attribute.                                 *
   *   ajaxProvider - A value of ajaxProvider attribute.                     *
   *   triggers - An object containing triggers, callbacks, custom methods   *
   *              etc. At the moment a custom method autoAddTileLayer can be *
   *              defined as triggers.addTileLayer.                          *
  \***************************************************************************/
  var CLayerManager = function($layerList, stacks, ajaxProvider, triggers)
  {
    this.stacks = stacks;
    this.images = stacks.images; // just a shortcut
    this.$layerList = $layerList;
    this.ajaxProvider = ajaxProvider;

    this.autoAddTileLayer = getTrigger('addTileLayer', triggers);

    this.layers = {};
    this.length = 0;

    var thisInstance = this;
    this.tableManager = new gui.CTableManager($layerList,
                                              function()
                                              {
                                                for (var i = 0; i < thisInstance.stacks.stacks.length; i++)
                                                {
                                                  thisInstance.stacks.stacks[i].setOpacity();
                                                }

                                                thisInstance.stacks.updateTopZ(thisInstance.tableManager.length);
                                              });
  }

  CLayerManager.prototype =
  {
    /**
     * Method: stopAdjustment
     *
     * An alias for <CImageManager.stopAdjustment>
     *********************************************************/
    stopAdjustment:
    function(id)
    {
      return this.images.stopAdjustment(id);
    },

    /**
     * Method: startAdjustment
     *
     * An alias for <CImageManager.startAdjustment>
     *********************************************************/
    startAdjustment:
    function(id)
    {
      return this.images.startAdjustment(id);
    },

    /**
     * Method: isAdjusted
     *
     * Parameters:
     *   id - An identifier of an image in the manager.
     *
     * Returns:
     *   A boolean indicating whether the image is being adjusted.
     *************************************************************/
    isAdjusted:
    function(id)
    {
      return this.images.adjust != null && id in this.images.adjust;
    },

    /**
     * Method: add
     *
     * Append a new layer to the manager.
     *
     * Parameters:
     *   id - An identifier to be assigned to the layer. The identifier
     *        has to be unique within the manager.
     *   $row - An jQuery HTML element representing the layer
     *          (for <CTableManager> object).
     *   $visibility - An jQuery HTML element for visibility panel.
     *   zIndex - A position of the layer in "z-stack". An integer within
     *            range from 0 to current number of managed stacks.
     *   dragMIME - An Array of pairs (2-element Arrays) of MIMEtype and
     *              its content. Forwarded to <CTableManager.add>.
     *   onremove - A callbeck to be called when layer is being removed from
     *              the manager.
     ************************************************************************/
    add:
    function(id, $row, $visibility, zIndex, dragMIME, onremove)
    {
      console.assert(!this.has(id));
      var thisInstance = this;

      if (zIndex == null || zIndex < 0 || zIndex > this.length)
      {
        zIndex = this.length;
      }

      this.layers[id] = {loadButtons: [],
                         $visibility: $visibility};;
      this.length++;

      this.tableManager.add($row, id, this.tableManager.length - zIndex,
                            function()
                            {
                              var toDismiss = thisInstance.layers[id].loadButtons;
                              //XXX: redundant with arrangeInterface();
                              for (var i = 0; i < toDismiss.lenght; i++)
                              {
                                var item = toDismiss[i];
                                item.$cb.unbind('change', item.changeHandler);
                              }
                              delete thisInstance.layers[id];
                              thisInstance.length--;

                              thisInstance.stacks.removeLayer(id);
                              if (onremove) onremove();
                            },
                            function(index)
                            {
                              var z = thisInstance.tableManager.length - 1 - index;
                              if (thisInstance.images.has(id))
                              {
                                // check necessary in case of update before
                                // the image info is cached
                                thisInstance.images.setZ(id, z);
                              }
                            },
                            dragMIME, false);
    },

    /**
     * Method: addTileLayer
     *
     * Append a new tile layer to the manager. Basic metadata of the tiled
     * image are fetched from the tile stack of the image if not available.
     *
     * Parameters:
     *   id - An identifier to be assigned to the layer. The identifier
     *        has to be unique within the manager.
     *   $row - An jQuery HTML element representing the layer
     *          (for <CTableManager> object).
     *   $visibility - An jQuery HTML element for visibility panel.
     *   zIndex - A position of the layer in "z-stack". An integer within
     *            range from 0 to current number of managed stacks.
     *   dragMIME - An Array of pairs (2-element Arrays) of MIMEtype and
     *              its content. Forwarded to <CTableManager.add>.
     *   onremove - A callbeck to be called when layer is being removed from
     *              the manager.
     *   path - A path to the tile stack of the image.
     *   info - Basic metadata of the image (if available).
     *   update - A boolean flag indicating whether layer order should be
     *            updated instantly.
     *   onsuccess - A callback to be called with basic metadata of the image
     *               (when available) as its parameter.
     *   onfailure - A callback called with error message as its farameter
     *               if fetching of the image metadata from server fails.
     *   isvalid - A function validating basic metadata of the image
     *             (eg. checking its MD5 checksum) passed as its parameter.
     *             Function returns true if the metadata is valid otherwise
     *             false. Function might cause some "side effects" (eg. to
     *             inform the user about its outcome in a particular way).
     *             If the function returns false, the layer is removed from
     *             the manager.
     *   onUpdate - A method for internal image object of <CImageManager>
     *              to be called when some basic image metadata (imageLeft,
     *              imageTop, pixelSize, status) has changed.
     *************************************************************************/
    addTileLayer:
    function(id, $row, $visibility, zIndex, dragMIME, onremove,
             path, info, update, onsuccess, onfailure, isvalid, onUpdate)
    {
      var thisInstance = this;

      function finishCaching(image)
      {
        if (update)
        {
          thisInstance.updateOrder();
        }
        if (onsuccess) onsuccess(image);
        if (image.onUpdate) image.onUpdate();
      }

      this.add(id, $row, $visibility, zIndex, dragMIME, onremove);

      if (info == null)
      {
        this.images.cacheTiledImage(id, path, finishCaching, onUpdate, $row,
                                    null,
                                    onfailure,
                                    isvalid == null ?
                                    null :
                                    function(info)
                                    {
                                      if (!isvalid(info))
                                      {
                                        thisInstance.removeLayer(id);
                                        return false;
                                      }
                                      return true;
                                    });
      }
      else
      {
        if (isvalid && !isvalid(info))
        {
          thisInstance.removeLayer(id);
        }
        else
        {
          this.images.cacheTiledImageOffline(id, path, info, finishCaching,
                                             onUpdate, $row);
        }
      }
    },

    /**
     * Method: has
     *
     * Parameters:
     *   id - An identifier of a layer.
     *
     * Returns:
     *   A boolean indicating whether the layer is already managed by the
     *   manager.
     *********************************************************************/
    has:
    function(id)
    {
      return id in this.layers;
    },

    /**
     * Method: getState
     *
     * Returns:
     *   A state object representing present state of the layers.
     *
     * Attributes of the state object:
     *   iids - An ordered Array of pairs (2-element Arrays) of database 
     *          identifiers and MD5 checksums of images loaded to the manager.
     *   loaded - An Array of Arrays of indices of images (in the iids Array)
     *            loaded to consecutive layer stacks.
     *   shape - A pair (2-element Array) defining both x and y dimansion
     *           of grid of layer stacks.
     *   zoom - A current zoom.
     *   display - A string indicating whether the grid of layer stacks is
     *             being displayed in 'matrix' or 'serial' mode.
     *   sync - A boolean indicating whether layer stacks are synchronized.
     *   focus - An Array of pairs (2-element Arrays) defining focal point
     *           of consecutive layer stacks.
     ************************************************************************/
    getState:
    function()
    {
      var state = this.stacks.getState();
      var iids = this.tableManager.getOrder();
      var id2ord = {};
      for (var i = 0; i < iids.length; i++)
      {
        var id = iids[i];
        id2ord[id] = i;
        var info = this.images.getCachedImage(id).info;
        iids[i] = [info.iid, info.md5];
      }
      state.iids = iids;
      for (var i = 0; i < state.loaded.length; i++)
      {
        state.loaded[i] = $.map(state.loaded[i],
                                function (id)
                                {
                                  return id2ord[id];
                                });
      }
      return state;
    },

    /**
     * Method: updateOrder
     *
     * Update order of layers in user interface (and inform layers about
     * their present index in the 'z-stack').
     ***********************************************************************/
    updateOrder:
    function()
    {
      this.tableManager.update();
      this.arrangeInterface(); // XXX: is this call necessary???
    },

    /**
     * Method: arrangeInterface
     *
     * Update visibility panels of the managed layers.
     **************************************************/
    arrangeInterface:
    function()
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
          $cb.prop('checked', this.stacks.has(n, id));
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
    },

    /**
     * Method: layerCB
     *
     * Create a checkbox for the visibility panel of a layer.
     *
     * Parameters:
     *   id - An identifier of the layer.
     *   stackId - An identifier of the stack (its number);
     *
     * Returns:
     *   An object of two attributes: '$cb' being the created jQuery checkbox
     *   element and 'changeHandler' being the handler of its 'change' event.
     *
     * Note:
     *   An auxilary method that might change and even disappear.
     ************************************************************************/
    layerCB:
    function(id, stackId)
    {
      //TODO: use stack instead of stackId???

      var thisInstance = this;
      var stack = this.stacks.stacks[stackId];
      var $cb = $('<input type="checkbox" class="recyclableElement">');
      var changeHandler = function()
      {
        if (this.checked)
        {
          thisInstance.loadLayerByStack(stack, id, true);
        }
        else
        {
          thisInstance.unload(stack.syncId(), id, true);
        }
      };

      $cb.bind('change', changeHandler);

      return {$cb: $cb,
              changeHandler: changeHandler};
    },

    /**
     * Method: removeLayer
     *
     * Remove a layer from the manager.
     *
     * Parameters:
     *   id - An identifier of the layer.
     *   update - A flag indicating whether to update the interface (and
     *            layers immediately (on true) or postpone the update (on
     *            false). Defaults as in <CTableManager.remove>.
     *********************************************************************/
    removeLayer:
    function(id, update)
    {
      this.tableManager.remove(id, update);
    },

    /**
     * Method: flush
     *
     * Remove all layers from the manager.
     **************************************/
    flush:
    function()
    {
      this.tableManager.flush();
    },

    /**
     * Method: load
     *
     * Load a layer into a stack.
     *
     * Parameters:
     *   stackId - An identifier of the stack.
     *   layerId - An identifier of the layer.
     *   doNotUpdateIface - A boolean flag indicating whether omit the update
     *                      of the visibility panel.
     *
     * Note:
     *   An alias for (ugly)
     *   > this.<loadLayerByStack>(this.stacks.stacks[stackId],
     *   >                         layerId, doNotUpdateIface);
     *********************************************************************/
    load:
    function(stackId, layerId, doNotUpdateIface)
    {
      this.loadLayerByStack(this.stacks.stacks[stackId],
                            layerId,
                            doNotUpdateIface);
    },

    /**
     * Method: loadLayerByStack
     *
     * Load a layer into a stack.
     *
     * Parameters:
     *   stack - A stack (a <CLayerStack> object).
     *   layerId - An identifier of the layer.
     *   doNotUpdateIface - A boolean flag indicating whether omit the update
     *                      of the visibility panel. Defaults to false.
     *
     * Notes:
     *   Shall be changed in the future, use an alias <load> instead.
     ***********************************************************************/
    loadLayerByStack:
    function(stack, imageId, doNotUpdateIface)
    {
      this.stacks.loadLayerByStack(stack, imageId);
      if (doNotUpdateIface != true)
      {
        this.layers[imageId].loadButtons[stack.syncId()].$cb.prop('checked',
                                                                  true);
      }
    },

    /**
     * Method: unload
     *
     * Unload a layer from a stack.
     *
     * Parameters:
     *   stackId - An identifier of the stack.
     *   layerId - An identifier of the layer.
     *   doNotUpdateIface - A boolean flag indicating whether omit the update
     *                      of the visibility panel. Defaults to false.
     *********************************************************************/
    unload:
    function(stackId, imageId, doNotUpdateIface)
    {
      this.stacks.unload(stackId, imageId);
      if (doNotUpdateIface != true)
      {
        this.layers[imageId].loadButtons[stackId].$cb.prop('checked', false);
      }
    },

    /**
     * Method: loadedImagesOrdered
     *
     * Returns:
     *   An ordered (as in the 'z-stack') Array of identifiers of layers
     *   loaded into *any* stack.
     ********************************************************************/
    loadedImagesOrdered:
    function()
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
    },

    /**
     * Method: unloadAll
     *
     * Unload every layer in a stack(s).
     *
     * Parameters:
     *   id - An identifier of the stack. If not given (or null) layers are
     *        unloaded from every stack.
     *   doNotUpdateIface - A boolean flag indicating whether omit the update
     *                      of the visibility panel. Defaults to false.
     ************************************************************************/
    unloadAll:
    function(id, doNotUpdateIface)
    {
      this.stacks.unloadAll(id);
      if (doNotUpdateIface != true)
      {
        if (id != null)
        {
          for (var imageId in this.layers)
          {
            this.layers[imageId].loadButtons[id].$cb.prop('checked', false);
          }
        }
        else
        {
          for (var imageId in this.layers)
          {
            var loadButtons = this.layers[imageId].loadButtons;
            for (id = 0; id < loadButtons.length; id++)
            {
              loadButtons[id].$cb.prop('checked', false);
            }
          }
        }
      }
    },

    /**
     * Destructor: destroy
     *
     * Prepere the manager for disposal.
     ************************************/
    destroy:
    function()
    {
      this.flush();
      this.tableManager.destroy();
      //TODO: check what happens to everything else bound to this.$layerList descendants
      for (var name in this)
      {
        delete this[name];
      }
    }
  };
}
