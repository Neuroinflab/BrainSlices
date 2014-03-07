/* File: layer_manager.js; TO BE DOCUMENTED */
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
   *   autoAddTileLayer -                                                    *
   *                                                                         *
   ***************************************************************************
   * Constructor: CLayerManager                                              *
   *                                                                         *
   * Parameters:                                                             *
   *   $layerList - A value of $layerList attribute.                         *
   *   stacks - A value of stacks attribute.                                 *
   *   ajaxProvider - A value of ajaxProvider attribute.                     *
   *   triggers -                                                            *
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
    stopAdjustment:
    function(id)
    {
      return this.images.stopAdjustment(id);
    },

    startAdjustment:
    function(id)
    {
      return this.images.startAdjustment(id);
    },

    isAdjusted:
    function(id)
    {
      return this.images.adjust != null && id in this.images.adjust;
    },

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

    has:
    function(id)
    {
      return id in this.layers;
    },

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

    updateOrder:
    function()
    {
      this.tableManager.update();
      this.arrangeInterface();
    },

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

        layer.loadButtons = loadButtons;
      }
    },

    layerCB:
    function(id, stackId)
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
    },

    removeLayer:
    function(id, update)
    {
      this.tableManager.remove(id, update);
    },

    flush:
    function()
    {
      this.tableManager.flush();
    },

    //an alias
    load:
    function(stackId, imageId, doNotUpdateIface)
    {
      this.loadLayerByStack(this.stacks.stacks[stackId], imageId, doNotUpdateIface);
    },

    loadLayerByStack:
    function(stack, imageId, doNotUpdateIface)
    {
      this.stacks.loadLayerByStack(stack, imageId);
      if (doNotUpdateIface != true)
      {
        //this.loadButtons[imageId][stack.syncId()].$cb.attr('checked', 'checked');
        this.layers[imageId].loadButtons[stack.syncId()].$cb.attr('checked', 'checked');
      }
    },

    unload:
    function(stackId, imageId, doNotUpdateIface)
    {
      this.stacks.unload(stackId, imageId);
      if (doNotUpdateIface != true)
      {
        this.loadButtons[imageId][stackId].$cb.filter(':checked').removeAttr('checked');
      }
    },

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

    removeStack:
    function(id, doNotDestroy)
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
    },

    //an alias
    unloadAll:
    function(id)
    {
      return this.stacks.unloadAll(id);
    },

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
