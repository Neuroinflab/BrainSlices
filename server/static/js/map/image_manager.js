/* File: image_manager.js; TO BE DOCUMENTED */
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
  var api = BS.api;
  /**
   * Class: internal basic image metadata objects
   *
   * Attributes:
   *   info - An object containing basic image metadata (like image offset:
   *          attributes 'imageLeft' and 'imageTop', image pixel size:
   *          'pixelSize', image status: 'status' etc.; it is also being
   *          extended with '_' prefixed attributes: '_imageLeft',
   *          '_imageTop', '_pixelSize', '_status' being copies of
   *          server-stored metadata just in case a reset is necessary.
   *   changed - A boolean flag indicating whether the basic metadata has
   *             changed.
   *   $row - A jQuery object representing HTML element representing 
   *   onUpdate -
   *   references -
   *   type -
   *   cacheId -
   *   path -
   *   id -
   *   z -
   *
   ************************/
  var imagePrototype =
  {
  	reset: function(updateIFace)
  	{
      this.changed = false;
  		var info = this.info;

      //fix invalid metadata
      info.imageLeft = info._imageLeft;
      if (info.imageLeft == undefined)
      {
        info.imageLeft = 0;
        this.changed = true;
      }
      info.imageTop = info._imageTop;
      if (info.imageTop == undefined)
      {
        info.imageTop = 0;
        this.changed = true;
      }
      info.pixelSize = info._pixelSize;
      if (info.pixelSize == undefined)
      {
        info.pixelSize = 100000 / info.imageWidth;
        this.changed = true;
      }
      info.status = info._status;

      if (this.$row != null)
      {
        if (this.changed)
        {
          this.$row.addClass('changed');
        }
        else if (this.$row.hasClass('changed'))
        {
          this.$row.removeClass('changed');
        }
      }

      this.update(updateIFace);
  	},

    updateInterface: function()
    {
      if (this.onUpdate != null)
      {
        this.onUpdate();
      }
    },

    update: function(updateIFace)
    {
      var references = this.references;
      var info = this.info;
      var imageLeft = info.imageLeft;
      var imageTop = info.imageTop;
      var pixelSize = info.pixelSize;

      for (var cacheId in references) //XXX dangerous
      {
        references[cacheId].updateImage(imageLeft, imageTop, pixelSize).update();
      }

      if (updateIFace == null || updateIFace)
      {
        this.updateInterface();
      }
    },

    updateInfo: function(imageLeft, imageTop, pixelSize, status, updateIFace)
    {
      this.changed = true;
      if (this.$row != null)
      {
        this.$row.addClass('changed');
      }

      if (imageLeft != null) this.info.imageLeft = imageLeft;
      if (imageTop != null) this.info.imageTop = imageTop;
      if (pixelSize != null) this.info.pixelSize = pixelSize;
      if (status != null) this.info.status = status;
      this.update(updateIFace);
    },

    destroy: function()
    {
      var references = this.references;
      for (var cacheId in references)
      {
        // necessary to avoid circular references
        references[cacheId].references = null;
      }
    }
  };

  if (api.CImageManager)
  {
    console.warn('BrainSlices.api.CImageManager already defined');
  }
  else
  {
    /**
     * Class: CImageManager
     *
     * A class of objects for caching basic metadata of tiled layers.
     *
     * Attributes:
     *   ajaxProvider - An object providing basic AJAX interface (like
     *                  <CCAjaxProvider> ).
     *   images - An object mapping from identifiers (names of its attributes)
     *            to <internal basic image metadata objects>.
     *   adjust -
     *
     * Constructor: CImageManager
     *
     * Parameters:
     *   ajaxProvider - A value of the ajaxProvider attribute.
     *****************************************************************/
    api.CImageManager = function(ajaxProvider)
    {
      this.ajaxProvider = ajaxProvider;
      this.images = {};
      this.adjust = null;
    }

    api.CImageManager.prototype =
    {
      /**
       * Destructor: destroy
       *
       * Prepare the object for disposal.
       ***********************************/
      destroy:
      function()
      {
        for (var id in this.images)
        {
          this.removeCachedImage(id);
        }

        for (var name in this)
        {
          delete this[name];
        }
      },

      /**
       * Method: updateImage
       *
       * Update the basic image metadata (offset, pixel size) with given (not
       * null nor undefined) values. 
       *
       * Parameters:
       *   id - An identifier of the image. If not given (null) - metadata of
       *        every image in the object is updated.
       *   imageLeft - The left offset of the image (in micrometers).
       *   imageTop - The top offset of the image (in micrometers).
       *   pixelSize - The size of a pixel of the image (in micrometers).
       *   updateIFace - A flag indicating whether to update the metadata
       *                 interface (defaults to true).
       **********************************************************************/
      updateImage:
      function(id, imageLeft, imageTop, pixelSize, updateIFace)
      {
        if (id == null)
        {
          for (id in this.images)
          {
            // updateIFace is not forwarded here because interface should be
            // updated when performing a global change.
            this.updateImage(id, imageLeft, imageTop, pixelSize);
          }
        }
        else
        {
          this.images[id].updateInfo(imageLeft, imageTop, pixelSize, null, updateIFace);
        }
      },

      /**
       * Method: updateImageStatus
       *
       * Update the status of the image.
       *
       * See <STATUS_MAP> for available statuses. Only COMPLETED and ACCEPTED
       * values should be used.
       *
       * Parameters:
       *   id - An identifier of the image. If not given (null) - status of
       *        every image in the object is updated.
       *   status - A number of the new status value.
       *   updateIFace - A flag indicating whether to update the status
       *                 interface (defaults to true).
       **********************************************************************/
      updateImageStatus:
      function(id, status, updateIFace)
      {
        if (id == null)
        {
          for (id in this.images)
          {
            this.updateImageStatus(id, status, updateIFace);
          }
        }
        else
        {
          this.images[id].updateInfo(null, null, null, status, updateIFace);
        }
      },

      /**
       * Method: apply
       *
       * Parametres:
       *   id - The identifier of the image. If not given, the function would
       *        be applied to every image in the object.
       *   f - The function to be applied. The function takes 
       *   updateIFace - A parameter to be forwarded as the second parameter
       *                 of function f.
       *****************/
      apply:
      function(id, f, updateIFace)
      {
        if (id == null)
        {
          for (id in this.images)
          {
            this.apply(id, f, updateIFace);
          }
        }
        else
        {
          if (id in this.images)
          {
            f(this.images[id], updateIFace);
          }
        }
      },

      saveUpdatedTiled:
      function()
      {
        var changed = [];
        var changedMapping = {};
        for (var id in this.images)
        {
          var image = this.images[id];
          if (image.type == 'tiledImage')
          {
            if (image.changed)
            {
              var info = image.info;
              changed.push(info.iid + ',' + info.imageLeft + ',' + info.imageTop
                           + ',' + info.pixelSize + ',' + info.status);
              changedMapping[info.iid] = image;
            }
          }
        }

        if (changed.length > 0)
        {
          this.ajaxProvider.ajax('/upload/updateMetadata',
                                 function(response)
                                 {
                                   if (!response.status)
                                   {
                                     alert(response.message);
                                     return;
                                   }
                                   var changed = response.data;

                                   for (var i = 0; i < changed.length; i++)
                                   {
                                     var item = changed[i];
                                     var image = changedMapping[item[0]];
                                     if (item[1])
                                     {
                                       var data = image.info;
                                       data._imageLeft = data.imageLeft;
                                       data._imageTop = data.imageTop;
                                       data._pixelSize = data.pixelSize;
                                       data._status = data.status;
                                       image.reset(false);
                                     }
                                     else
                                     {
                                       console.warn('No privileges to change image #' + item[0]);
                                     }
                                   }
                                 },
                                 {updated: changed.join(':')});
        }
      },

      // propagate zIndex value update across all managed images
      setZ:
      function(id, zIndex)
      {
        var image = this.images[id];
        image.z = zIndex;
        var references = image.references;

        for (var cacheId in references) //XXX dangerous
        {
          references[cacheId].setZ(zIndex);
        }
      },

      updateCachedTiledImage:
      function(id, path, onSuccess, onUpdate, $row)
      {
        this.removeCachedImage(id);
        this.cacheTiledImage(id, path, onSuccess, onUpdate, $row);
      },

      cacheTiledImageOffline:
      function(id, path, data, onSuccess, onUpdate, $row, zIndex)
      {
        if (!this.has(id))
        {
          var cachedImage = Object.create(imagePrototype);
          cachedImage.info = data;

          data._imageLeft = data.imageLeft;
          data._imageTop = data.imageTop;
          data._pixelSize = data.pixelSize;
          data._status = data.status;

          cachedImage.references = {};
          cachedImage.path = path;
          cachedImage.type = 'tiledImage';
          cachedImage.cacheId = 0;
          cachedImage.onUpdate = onUpdate;
          cachedImage.$row = $row;
          cachedImage.id = id;
          cachedImage.z = zIndex != null ? zIndex : 0;

          this.images[id] = cachedImage;
          cachedImage.reset();
        }

        if (onSuccess != null)
        {
          onSuccess(this.images[id]);
        }
      },

      cacheTiledImage:
      function(id, path, onSuccess, onUpdate, $row, zIndex, onFailure, isValid)
      {
        var thisInstance = this;
        this.ajaxProvider.ajax(path + '/info.json',
                               function(data)
                               {
                                 if (data.status)
                                 {
                                   if (isValid == null || isValid(data.data))
                                   {
                                     thisInstance.cacheTiledImageOffline(id, path, data.data, onSuccess, onUpdate, $row, zIndex);
                                   }
                                 }
                                 else
                                 {
                                   if (onFailure)
                                   {
                                     onFailure(data.message);
                                   }
                                   else
                                   {
                                     alert(data.message);
                                   }
                                 }
                               },
                               null,
                               onFailure != null ?
                               BS.ajax.customErrorHandler(onFailure) :
                               null,
                               'GET');

       //   //type: 'POST', //causes 412 error on refresh -_-
      },

      startAdjustment:
      function(id)
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
      },

      has:
      function(id)
      {
        // might be necessary to provide some kind of id allocation
        // - image might not be cached yet, but it might be already
        // being fetched...
        return id in this.images;
      },

      isAdjusted:
      function(id)
      {
        if (!this.adjust) return false;
        return id == null || id in this.adjust;
      },

      getAdjusted:
      function()
      {
        var res = [];
        if (this.adjust)
        {
          for (var id in this.adjust)
          {
            res.push(id);
          }
        }
        return res;
      },

      stopAdjustment:
      function(id)
      {
        if (this.adjust && id in this.adjust)
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
      },

      adjustOffset:
      function(dx, dy, id)
      {
        if (this.adjust == null)
        {
          return;
        }

        if (id == null)
        {
          for (id in this.adjust)
          {
            this.adjustOffset(dx, dy, id);
          }
        }
        else if (id in this.adjust)
        {
          var image = this.adjust[id];

          image.changed = true;
          if (image.$row != null)
          {
            image.$row.addClass('changed');
          }
          image.info.imageLeft += dx;
          image.info.imageTop += dy;

          image.update();
        }
        //TODO: update some offset information?
      },

      removeCachedImage:
      function(id)
      {
        if (id in this.images)
        {
          this.stopAdjustment(id);
          var image = this.images[id];
          image.destroy();
          delete this.images[id];
        }
      },

      getCachedImage:
      function(id)
      {
        if (id in this.images)
        {
          return this.images[id];
        }
        return null;
      },

      getImageLoader:
      function(id)
      {
        if (!(id in this.images))
        {
          return null;
        }

        var cachedImage = this.images[id];

        return function (path, parentDiv, onSuccess, pixelSize,
                         focusPointX, focusPointY, zIndex, opacity, quality)
        {
          //path and zIndex arguments are being ignored
          var data = cachedImage.info;
          var tileLayer = new api.CTileLayer(parentDiv,
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
    }
  }



  if (api.CLayerStack == null)
  {
    console.warn('unable to extend BrainSlices.api.CLayerStack (does not exist)');
  }
  else
  {
    if ('loadFromCache' in api.CLayerStack.prototype)
    {
      console.warn('BrainSlices.api.CLayerStack.prototype.loadFromCache already defined');
    }
    else
    {
      /**
       * Section: CLayerStack extension
       *
       * See documentation of <CLayerStack> for details (if available).
       *
       *
       * Method: loadFromCache
       *
       * Load a tile layer to the stack using metadata cached by the
       * <CImageManager> object.
       *
       * Parameters:
       *   cache - The <CImageManager> object.
       *   id - An identifier of tiled image in the <CImageManager> object.
       *   quality - A number from -0.5 to 0.5 (or string 'low' for -0.5,
       *             'med' for 0. or 'high' for 0.5) reflecting the desired
       *             quality settings.
       *********************************************************************/
      BrainSlices.api.CLayerStack.prototype.loadFromCache = function(cache, id, quality)
      {
        var loader = cache.getImageLoader(id);
        if (loader == null)
        {
          console.warn('id: ' + id + ' not found in cache');
          return;
        }
        this.loadLayer(id, loader, null, null, quality);
      }
    }
  }
})(BrainSlices, jQuery);



