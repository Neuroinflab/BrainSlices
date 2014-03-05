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

with ({gui: BrainSlices.gui})
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
   *                                                                         *
   * TODO:                                                                   *
   *   - reduce godlike method addTileLayer with autoAdd approach            *
   ***************************************************************************
   * Constructor: CLayerManager                                              *
   *                                                                         *
   * Parameters:                                                             *
   *   $layerList - A value of $layerList attribute.                         *
   *   stacks - A value of stacks attribute.                                 *
   *   ajaxProvider,
   *   doNotRemove,
   *   doNotAdjust,
   *   doNotDownload,
   *   doNotDelete
  \***************************************************************************/
  var CLayerManager = function($layerList, stacks, ajaxProvider, doNotRemove,
                               doNotAdjust, doNotDownload, doNotDelete)
  {
    this.stacks = stacks;
    this.images = stacks.images; // just a shortcut
    this.$layerList = $layerList;
    this.ajaxProvider = ajaxProvider;

    this.adjustmentEnabled = doNotAdjust != true;
    this.removalEnabled = doNotAdjust != true;
    this.downloadEnabled = doNotDownload != true;
    this.deletionEnabled = doNotDelete != true;

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

    addTileLayer:
    function(imageId, path, zIndex, label, info, update, onsuccess, onfailure,
             isvalid)
    {
      if (update == null) update = true;

      var id = 'i' + imageId;

      if (id in this.layers)
      {
        return;
      }

      if (zIndex == null || zIndex < 0 || zIndex > this.length)
      {
        zIndex = this.length;
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
      layer.loadButtons = [];
      layer.z = null; //to be for sure updated

      // making the layer-related row
      var $row =  $('<tr></tr>');
      var $drag = $('<td draggable="true">' + label + '</td>');//XXX .append(label) ?
      //XXX: might be quite useful combined with single image view
      var url = document.createElement('a');
      url.href = path;
      url = url.href;
      var dragMIME = [['text/plain', url], ['text/uri-list', url]];

      $row.append($drag);

      // download link
      if (this.downloadEnabled)
      {
        if (id[0] == 'i')
        {
          $row.append('<td><a href="' + path + '/image.png">Download</a></td>');
        }
        else
        {
          $row.append('<td><br></td>');
        }
      }

      // visibility interface
      var $visibility = $('<td></td>');
      layer.$visibility = $visibility;
      $row.append($visibility);

      //adjustment
      var onUpdate = null;
      if (this.adjustmentEnabled)
      {
        var $adjust = $('<input type="checkbox">');
        var $iface = $('<span style="display: none;">' +
                        '<input type="number" class="imageLeft">' +
                        '<input type="number" class="imageTop">' +
                        '<input type="number" class="pixelSize">' +
                        '<select name="status">' +
                         '<option value="6">Completed</option>' +
                         '<option value="7">Accepted</option>' +
                        '</select>' +
                       '</span>');

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

        $iface.find('input').bind('change', function()
        {
          if (layer.image != null)
          {
            var imageLeft = parseFloat($iface.find('input.imageLeft').val());
            var imageTop = parseFloat($iface.find('input.imageTop').val());
            var pixelSize = parseFloat($iface.find('input.pixelSize').val());
            layer.image.updateInfo(imageLeft, imageTop, pixelSize, null, false);
          }
        });

        $iface.find('select[name="status"]').bind('change', function()
        {
          var status = parseInt($iface.find('select[name="status"]').val());
          layer.image.updateInfo(null, null, null, status, false);
        });

        onUpdate = function()
        {
          if (layer.image != null)
          {
            var info = layer.image.info;
            $iface.find('input.imageLeft').val(info.imageLeft);
            //$iface.find('span.imageLeft').html(info.imageLeft);
            $iface.find('input.imageTop').val(info.imageTop);
            //$iface.find('span.imageTop').html(info.imageTop);
            $iface.find('input.pixelSize').val(info.pixelSize);
            //$iface.find('span.pixelSize').html(info.pixelSize);
            $iface.find('select[name="status"]').val(info.status);
            //$iface.find('span.status').html(STATUS_MAP[info.status]);
          }
        }

        //XXX: is that necessary?
        layer.$iface = $iface;
        layer.$adjust = $adjust;
        $row.append($adjust, $iface);
      }

      //removal

      if (this.removalEnabled)
      {
        layer.$rem = $('<button>Remove</button>');

        layer.$rem.bind('click', function()
        {
          //var z = layer.z;
          //var layers = thisInstance.layers;
          var id = layer.id;
          thisInstance.tableManager.remove(id);
        });
        //XXX: see if there is no problem with chaining method call
        $row.append($('<td></td>').append(layer.$rem));
      }

      //deletion
      if (this.deletionEnabled)
      {
        layer.$del = $('<input type="checkbox">');
        $row.append($('<td></td>').append(layer.$del));
      }

      layer.$row = $row;

      this.layers[id] = layer;
      this.length++;

      this.tableManager.add($row, id, this.tableManager.length - zIndex,
                            function()
                            {
                              var id = layer.id;
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
                            },
                            function(index)
                            {
                              var z = thisInstance.tableManager.length - 1 - index;
                              layer.z = z;
                              if (thisInstance.images.has(id))
                              {
                                // check necessary in case of update before
                                // the image info is cached
                                thisInstance.images.setZ(id, z);
                              }
                            },
                            dragMIME, false);


      var finishCaching = update ?
                          function(image)
                          {
                            layer.image = image;
                            // trigger onUpdate (unable to do while loading
                            // since image was not assigned
                            if (image.onUpdate) image.onUpdate();
                            thisInstance.updateOrder();
                            if (onsuccess) onsuccess();
                          } :
                          function(image)
                          {
                            layer.image = image;
                            // trigger onUpdate (unable to do while loading
                            // since image was not assigned
                            if (image.onUpdate) image.onUpdate();
                            if (onsuccess) onsuccess();
                          };

      if (info == null)
      {
        this.images.cacheTiledImage(id, path, finishCaching, onUpdate, $row, null,
                                    onfailure, isvalid == null ? null :
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
        if (isvalid != null && !isvalid(info))
        {
          thisInstance.removeLayer(id);
        }
        else
        {
          this.images.cacheTiledImageOffline(id, path, info, finishCaching, onUpdate,
                                             $row);
        }
      }
      // onSuccess shall update interface and z-indices
      return id;
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
    function(id)
    {
      this.tableManager.remove(id);
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

    deleteImages:
    function()
    {
      var toDelete = [];
      var deleteMapping = {};
      for (var id in this.layers)
      {
        var layer = this.layers[id];
        if (layer.$del == null) continue;
        if (layer.$del.filter(':checked').length == 0) continue;
        if (layer.image == null) continue;
        var iid = layer.image.info.iid;
        toDelete.push(iid);
        deleteMapping[iid] = id;
      }

      if (toDelete.length > 0 &&
          confirm("Do you really want to delete " +
                  (toDelete.length == 1 ?
                   "the image" :
                   toDelete.length + " images") + " permanently?"))
      {
        var thisInstance = this;
        this.ajaxProvider.ajax('/upload/deleteImages',
                               function(response)
                               {
                                 if (!response.status)
                                 {
                                   alert(response.message);
                                   return;
                                 }
                                 var data = response.data;
                                 if (data.length != toDelete.length)
                                 {
                                   alert("Some of images not found in the database.");
                                 }

                                 var preserved = false;
                                 for (var i = 0; i < data.length; i++)
                                 {
                                   var item = data[i];
                                   if (item[1])
                                   {
                                     thisInstance.tableManager.remove(deleteMapping[item[0]],
                                                                 false);
                                   }
                                   else
                                   {
                                     preserved = true;
                                   }
                                 }
                                 if (preserved)
                                 {
                                   alert("Not enough privileges to delete some of images.");
                                 }
                                 thisInstance.updateOrder();
                               },
                               {iids: toDelete.join(',')});
      }
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
