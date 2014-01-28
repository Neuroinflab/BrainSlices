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
  function propertyCast(t, v)
  {
    switch (t)
    {
      case 't':
        console.warn('an attempt to cast value of a "Tag" type property');
        return null;

      case 'i':
        return parseInt(v);

      case 'f':
        return parseFloat(v);

      default:
        console.warn('an attempt to cast value of an unknown type property');

      case 'x':
      case 's':
        return v;
    }
  }

  function getTrigger(name, triggers)
  {
    if (triggers == null) return null;
    return name in triggers ? triggers[name] : null;
  }

  function CProperty(type, value, triggers, original, edit, view)
  {
    this.type = type;
    if (type != 't')
    {
      this._value = propertyCast(type, value);
    }

    this.onremove = getTrigger('remove', triggers);
    this.onupdate = getTrigger('update', triggers);
    this.ondestroy = getTrigger('destroy', triggers);
    this.onchange = getTrigger('change', triggers);
    this.onnew = getTrigger('new', triggers);
    this.data = getTrigger('data', triggers);
    this.new = !original;
    this.removed = false;

    if (this.onnew)
    {
      this.onnew();
    }

    this._edit = edit == undefined ? 'a' : edit;
    this._view = view == undefined ? 'a' : view;
    this.reset();
  }

  CProperty.prototype = {
    reset: function()
    {
      this.changed = false;
      if (this.onchange)
      {
        this.onchange();
      }

      if (this.type != 't')
      {
        this.value = this._value;
      }
      this.edit = this._edit;
      this.view = this._view;

      if (this.onupdate)
      {
        this.onupdate();
      }

      if (this.removed)
      {
        this.removed = false;
        if (this.onremove)
        {
          this.onremove();
        }
      }
      return this;
    },

    remove: function()
    {
      if (!this.removed && this.onremove)
      {
        this.removed = true;
        this.onremove();
      }
      return this;
    },

    destroy: function()
    {
      if (this.ondestroy != null)
      {
        this.ondestroy();
      }
      this.onremove = null;
      this.onupdate = null;
      this.ondestroy = null;
      this.onchange = null;
      this.onnew = null;
      this.data = null;
    },

    change: function(value, donotupdate)
    {
      if (this.type == 't')
      {
        console.warn('an attempt to change "Tag" type property value');
        return;
      }

      this.value = propertyCast(this.type, value);
      this.changed = true;

      if (!this.new && this.onchange)
      {
        this.onchange();
      }

      if (!donotupdate && this.onupdate)
      {
        this.onupdate();
      }
    },

    accept: function()
    {
      this.changed = false;
      this.new = false;

      if (this.onchange)
      {
        this.onchange();
      }

      if (this.onnew)
      {
        this.onnew();
      }

      if (this.type != 't')
      {
        this._value = this.value;
      }
      this._edit = this.edit;
      this._view = this.view;
    }
  }


  function CImageProperties($row, ondestroy, autoAdd, autoAddData)
  {
    this.properties = {};
    this.removed = {};
    this.$row = $row;
    this.changed = false;
    this.ondestroy = ondestroy;
    this.autoAdd = autoAdd;
    this.autoAddData = autoAddData;
  }


  CImageProperties.prototype = {
    has: function(name)
    {
      return name in this.properties; // && !this.properties[name].removed;
    },
  
    add: function(name, type, value, triggers, original, edit, view)
    {
      if (this.has(name)) return false;

      if (!original)
      {
        this.changed = true;
        if (this.$row != null)
        {
          this.$row.addClass('propertyChanged');
        }
      }

      this.properties[name] = new CProperty(type, value, triggers, original,
                                            edit, view);
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

      this.notChanged();
    },

    notChanged: function()
    {
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

      this.notChanged();
    },

    accept: function(name, removed)
    {
      if (name != null)
      {
        if (removed)
        {
          if (name in this.removed)
          {
            this.removed[name].destroy();
            delete this.removed[name];
          }
          else
          {
            console.warn(name + ' not found in removed properties');
          }
        }
        else
        {
          if (name in this.properties)
          {
            this.properties[name].accept();
          }
          else
          {
            console.warn(name + ' not found in properties');
          }
        }
      }
      else
      {
        for (name in this.removed)
        {
          this.removed[name].destroy();
        }
        this.removed = {};

        for (name in this.properties)
        {
          this.properties[name].accept();
        }

        this.notChanged();
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

      this.autoAdd = null;
      this.autoAddData = null;

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
          var tmp = [name, type, property.view, property.edit];
          if (type != 't')
          {
            tmp.push(property.value);
          }
          set.push(tmp);
        }
      }
      return [unset, set];
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

    addImage: function(iid, $row, ondestroy, autoAdd, autoAddData)
    {
      if (this.hasImage(iid)) return false;

      this.images[iid] = new CImageProperties($row, ondestroy, autoAdd,
                                              autoAddData);
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

    add: function(iid, name, type, value, triggers, original, edit, view)
    {
      if (!this.hasImage(iid)) return false;
      return this.images[iid].add(name, type, value, triggers, original,
                                  edit, view);
    },

    autoAdd: function(iid, name, type, value, original, edit, view, extraData)
    {
      if (!this.hasImage(iid)) return false;
      return this.images[iid].autoAdd(name, type, value, original, edit, view,
                                      extraData);
    },

    remove: function(iid, name)
    {
      if (!this.hasImage(iid)) return;
      this.images[iid].remove(name);
    },

    reset: function(iid)
    {
      this.apply(function()
                 {
                   this.reset();
                 },
                 null,
                 iid);
    },

    getChanges: function()
    {
      var res = [];
      for (var iid in this.images)
      {
        var changes = this.images[iid].getChanges();
        if (changes[0].length + changes[1].length > 0)
        {
          changes.unshift(parseInt(iid));
          res.push(changes);
        }
      }
      return res;
    },

    save: function()
    {
      var changes = this.getChanges();
      if (changes.length == 0) return;

      var images = this.images;
      this.ajaxProvider.ajax('/meta/changeImagesProperties',
        function(response)
        {
          var data = response.data;
          for (var iid in data)
          {
            if (iid in images)
            {
              var image = images[iid];
              var result = data[iid];
              if (result == true)
              {
                image.accept();
              }
              else
              {
                for (var j = 0; j < 2; j++)
                {
                  // j == 0 for removal
                  var success = result[j];
                  for (var i = 0; i < success.length; i++)
                  {
                    image.accept(success[i], j == 0);
                  }
                }
              }
            }
            else
            {
              console.warn(iid + ' not found in images');
            }
          }
        },
        {changes: JSON.stringify(changes)});
    }
  }
})(BrainSlices, jQuery)
