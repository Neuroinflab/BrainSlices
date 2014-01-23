/* File: properties_manager.js; TO BE DOCUMENTED */
/*****************************************************************************\
*                                                                             *
*    This file is part of BrainSlices Software                                *
*                                                                             *
*    Copyright (C) 2014 J. M. Kowalski                                        *
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

var CPropertiesManager = null;

(function(BS, $, undefined)
{
  function CProperty(type, value, onupdate, ondestroy, $row, original, edit, view)
  {
    this.type = type;
    if (type != 't')
    {
      this._value = value;
    }

    this.onupdate = onupdate;
    this.ondestroy = ondestroy;
    this.$row = $row;
    this.new = !original;
    this.removed = false;

    if (!original && $row != null)
    {
      $row.addClass('propertyNew');
    }

    this._edit = edit == undefined ? 'a' : edit;
    this._view = view == undefined ? 'a' : view;
    this.reset();
  }

  CProperty.prototype = {
    reset: function()
    {
      this.changed = false;
      if (this.$row != null && this.$row.hasClass('propertyChanged'))
      {
        this.$row.removeClass('propertyChanged');
      }

      if (this.type != 't')
      {
        this.value = this._value;
      }
      this.edit = this._edit;
      this.view = this._view;

      if (this.onupdate != null)
      {
        this.onupdate();
      }

      if (this.removed)
      {
        if (this.$row != null)
        {
          this.$row.show();
        }
        this.removed = false;
      }
      return this;
    },

    remove: function()
    {
      if (!this.removed && this.$row != null)
      {
        this.$row.hide();
      }
      this.removed = true;
      return this;
    },

    destroy: function()
    {
      if (this.ondestroy != null)
      {
        this.ondestroy();
        this.ondestroy = null;
      }
      this.onupdate = null;
    },

    change: function(value, donotupdate)
    {
      if (this.type == 't') return;

      this.value = value;
      this.changed = true;

      if (!this.new && this.$row != null)
      {
        this.$row.addClass('propertyChanged');
      }

      if (!donotupdate && this.onupdate != null)
      {
        this.onupdate();
      }
    },

    accept: function()
    {
      this.changed = false;
      this.new = false;

      if (this.$row != null)
      {
        if (this.$row.hasClass('propertyChanged'))
        {
          this.$row.removeClass('propertyChanged');
        }

        if (this.$row.hasClass('propertyNew'))
        {
          this.$row.removeClass('propertyNew');
        }
      }

      if (this.type != 't')
      {
        this._value = this.value;
      }
      this._edit = this.edit;
      this._view = this.view;
    }
  }


  function CImageProperties($row, ondestroy, rowFactory)
  {
    this.properties = {};
    this.removed = {};
    this.$row = $row;
    this.changed = false;
    this.ondestroy = ondestroy;
		this.rowFactory = rowFactory;
  }


  CImageProperties.prototype = {
    has: function(name)
    {
      return name in this.properties; // && !this.properties[name].removed;
    },
  
    add: function(name, type, value, onupdate, onremove, $row, original,
                  edit, view)
    {
      if (this.has(name)) return false;

			if ($row == null && this.rowFactory != null)
			{
				var tmp = this.rowFactory(name, type, value, onupdate, onremove,
				                          original, edit, view);
				$row = tmp.$row;
				onupdate = tmp.onupdate;
				onremove = tmp.onremove;
			}

      if (!original)
      {
        this.changed = true;
        if (this.$row != null)
        {
          this.$row.addClass('propertyChanged');
        }
      }

      this.properties[name] = new CProperty(type, value, onupdate, onremove,
                                            $row, original, edit, view);
      return true;
    },

    change: function(name, value, donotupdate)
    {
      if (this.has(name))
      {
        this.properties[name].change(value, donotupdate);
        this.changed = true;
        if (this.$row != null)
        {
          this.$row.addClass('propertyChanged');
        }
      }
    },

    remove: function(name)
    {
      if (!this.has(name)) return;

      var property = this.properties[name];
      delete this.properties[name];
      if (property.new)
      {
        property.destroy();
      }
      else
      {
        this.removed[name] = property.remove();
        this.changed = true;
        this.$row.addClass('propertyChanged');
      }
    },

    reset: function()
    {
      for (var name in this.properties)
      {
        var property = this.properties[name];
        if (property.new)
        {
          property.destroy();
          delete this.properties[name];
        }
        else
        {
          property.reset();
        }
      }

      for (var name in this.removed)
      {
        var property = this.removed[name];
        delete this.removed[name];
        this.properties[name] = property.reset();
      }

      this.changed = false;
      if (this.$row != null && this.$row.hasClass('propertyChanged'))
      {
        this.$row.removeClass('propertyChanged');
      }
    },

    updateChanged: function()
    {
      for (var name in this.removed)
      {
        return; //some property has been removed
      }

      for (var name in this.properties)
      {
        var property = this.properties[name];
        if (property.changed || property.new)
        {
          return; //some property has been changed or added
        }
      }

      this.changed = false;
      if (this.$row != null && this.$row.hasClass('propertyChanged'))
      {
        this.$row.removeClass('propertyChanged');
      }
    },

    destroy: function()
    {
      for (var name in this.removed)
      {
        this.removed[name].destroy();
      }

      for (var name in this.properties)
      {
        this.properties[name].destroy();
      }

			this.rowFactory = null;

      if (this.ondestroy)
      {
        this.ondestroy();
        this.ondestroy = null;
      }
    },

    getChanges: function()
    {
      var unset = [];
      for (var name in this.removed)
      {
        if (!(name in this.properties))
        {
          unset.push(name);
        }
      }

      var set = [];
      for (var name in this.properties)
      {
        var property = this.properties[name];
        if (property.changed || property.new)
        {
          var type = property.type;
          var tmp = {type: type,
                     name: name,
                     edit: property.edit,
                     view: property.view};
          if (type != 't')
          {
            tmp.value = property.value;
          }
          set.push(tmp);
        }
      }
      return {set: set, unset: unset};
    }
  }
  
  CPropertiesManager = function(ajaxProvider)
  {
    this.images = {};
    this.ajaxProvider = ajaxProvider;
  }

  CPropertiesManager.prototype = {
    hasImage: function(iid)
    {
      return iid in this.images;
    },

    has: function(iid, name)
    {
      return iid in this.images && this.images[iid].has(name);
    },

    addImage: function(iid, $row, ondestroy, rowFactory)
    {
      if (this.hasImage(iid)) return false;

      this.images[iid] = new CImageProperties($row, ondestroy, rowFactory);
      return true;
    },

    removeImage: function(iid)
    {
      if (!this.hasImage(iid)) return;

      this.images[iid].destroy();
      delete this.images[iid];
    },

    apply: function(f, args, iid)
    {
      if (iid == null)
      {
        var res = true;
        for (iid in this.images)
        {
          if (!f.apply(this.images[iid], args))
          {
            res = false;
          }
        }
        return res;
      }

      return f.apply(this.images[iid], args);
    },

    change: function(iid, name, value, donotupdate)
    {
      this.apply(function()
                 {
                   if (this.has(name))
                   {
                     this.change(name, value, donotupdate);
                   }
                 }, null, iid);
    },

    add: function(iid, name, type, value, onupdate, onremove, $row, original,
                  edit, view)
    {
      if (!this.hasImage(iid)) return false;
      return this.images[iid].add(name, type, value, onupdate, onremove, $row,
                                  original, edit, view);
    },

    getChanges: function()
    {
      var res = {};
      for (var iid in this.images)
      {
        var changes = this.images[iid].getChanges();
        if (changes.set.length > 0 || changes.unset.length > 0)
        {
          res[iid] = changes;
        }
      }
      return res;
    }
  }
})(BrainSlices, jQuery)
