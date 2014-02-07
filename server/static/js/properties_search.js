/* File: properties_search.js; TO BE DOCUMENTED */
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

var CPropertiesSearch = null;

(function(BS, $, undefined)
{
  function getTrigger(name, triggers)
  {
    if (triggers == null) return null;
    return name in triggers ? triggers[name] : null;
  }

  var reduceType = {s: 's', x: 'x', t: 't', i: 'f', f: 'f'};
  var allowedOperators = {'t': {},
                          's': {is: true,
                                like: true,
                                similar: true,
                                posix: true},
                          'f': {eq: true,
                                gt: true,
                                lt: true,
                                gteq: true,
                                lteq: true},
                          'x': {match: true,
                                plain: true}}

  function CPropertyCondition(type, triggers)
  {
    this.type = type;
    this.allowed = allowedOperators[type];

    this.ondestroy = getTrigger('destroy', triggers);
    this.data = getTrigger('data', triggers);
    this.reset();
  }

  CPropertyCondition.prototype = {
    destroy:
    function()
    {
      if (this.ondestroy) this.ondestroy();
      for (var name in this)
      {
        delete this[name]; // A NUKE :-)
      }
      //delete this.ondestroy;
      //delete this.data;
    },

    set:
    function(name, value)
    {
      if (name in this.allowed)
      {
        this.conditions[name] = value;
      }
    },

    reset:
    function()
    {
      this.conditions = {};
    },

    get:
    function()
    {
      var res = [this.type];
      if (this.type != 't')
      {
        /*var tmp = [];
        for (var name in this.conditions)
        {
          tmp.push([name, this.conditions[name]]);
        }*/

        var tmp = {};
        for (var name in this.conditions)
        {
          if (name == 'is')
          {
            tmp.eq = this.conditions.is;
          }
          else
          {
            tmp[name] = this.conditions[name];
          }
        }
        res.push(tmp);
      }
      return res;
    }
  }


  if (CPropertiesSearch != null)
  {
    console.warn('CPropertiesSearch already defined');
  }
  else
  {
    CPropertiesSearch = function(ajaxProvider, triggers)
    {
      this.ajaxProvider = ajaxProvider;
      this.properties = {};
      this.any = {};
      this.nAny = 0;
      this.ondestroy = getTrigger('destroy', triggers);
      this.data = getTrigger('data', triggers);
      this.autoAdd = getTrigger('add', triggers);
    }

    CPropertiesSearch.prototype =
    {
      addAny:
      function(type, triggers)
      {
        var n = this.nAny++;
        this.any[n] = new CPropertyCondition(type, triggers);
        return n;
      },

      removeAny:
      function(n)
      {
        if (n in this.any)
        {
          this.any[n].destroy();
          delete this.any[n];
        }
      },

      add:
      function(name, type, triggers)
      {
        if (name in this.properties)
        {
          this.properties[name].destroy();
        }

        this.properties[name] = new CPropertyCondition(type, triggers);
      },

      destroy:
      function()
      {
        this.reset();
        delete this.ondestroy;
        delete this.data;
        delete this.autoAdd;
      },

      get: // shall be replaced with search
      // search can cache the search results to reduce database traffic
      // -> remember not to change conditions on which the search was
      //    performed, otherwise cache has to be flushed
      function()
      {
        var res = [];
        var any = [];
        for (var name in this.properties)
        {
          var tmp = this.properties[name].get();
          tmp.unshift(name);
          res.push(tmp);
        }
        for (var n in this.any)
        {
          any.push(this.any[n].get());
        }
        return [res, any];
      },

      has:
      function(name)
      {
        return name in this.properties;
      },

      remove:
      function(name)
      {
        if (name in this.properties)
        {
          this.properties[name].destroy();
          delete this.properties[name];
        }
      },

      resetAny:
      function(n)
      {
        if (n in this.any)
        {
          this.any[n].reset();
        }
        else
        {
          console.warn(n + ' not found in this.any.');
        }
      },

      reset:
      function(name, n)
      {
        if (name != null)
        {
          this.properties[name].reset();
          return;
        }

        for (name in this.properties)
        {
          this.properties[name].destroy();
        }
        this.properties = {};
        this.nAny = 0;

        for (var n in this.any)
        {
          this.any[n].destroy();
        }
        this.any = {};
      },

      search:
      function(onsuccess)
      {
        this.ajaxProvider.ajax('/meta/searchImages',
                               function(result)
                               {
                                 // caching etc.
                                 if (onsuccess) onsuccess(result.data);
                               },
                               {query: JSON.stringify(this.get())});
      },

      set:
      function(property, name, value)
      {
        if (property in this.properties)
        {
          this.properties[property].set(name, value);
        }
      },

      setAny:
      function(n, name, value)
      {
        if (n in this.any)
        {
          this.any[n].set(name, value);
        }
      }
    }
  }
})(BrainSlices, jQuery)
