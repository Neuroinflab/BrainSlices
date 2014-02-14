/* File: widgets.js; TO BE DOCUMENTED */
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

var CFilterPanel = null;
(function($, undefined)
{
  CFilterPanel = function(row, set, reset)
  {
    this.triggers(set, reset);
    this.reset();
    this.$row = $(row ? row : '<span>');
  }

  CFilterPanel.prototype = 
  {
    set:
    function(name, value)
    {
      if (this.onset)
      {
        this.onset(name, value);
      }
      return this;
    },

    reset:
    function()
    {
      if (this.onreset)
      {
        this.onreset();
      }
      return this;
    },

    triggers:
    function(set, reset)
    {
      this.onset = set;
      this.onreset = reset;
      return this;
    },

    make:
    function(t, data)
    {
      this.$row.hide().empty();
      var $input;
      var thisInstance = this;
      switch (t)
      {
        case 'f':
          var $op = $('<select>'
                      +'<option selected="selected">eq</option>'
                      +'<option>gt</option>'
                      +'<option>gteq</option>'
                      +'<option>---</option>'
                      +'</select>')
            .appendTo(this.$row);
          $input = $('<input type="number" value="0">')
            .appendTo(this.$row);

          var $op2 = $('<select disabled="disabled">'
                       +'<option>lt</option>'
                       +'<option>lteq</option>'
                       +'<option selected="selected">---</option>'
                       +'</select>')
            .appendTo(this.$row);
          var $input2 = $('<input type="number" disabled="disabled" value="0">')
            .appendTo(this.$row);

          this.change = function()
          {
            thisInstance.reset();
            var op = $op.val();
            var op2 = $op2.val();

            if (op != 'eq' && op2 != '---')
            {
              thisInstance.set(op2, parseFloat($input2.val()));
            }

            if (op != '---')
            {
              thisInstance.set(op, parseFloat($input.val()));
            }
          };

          $op.change(this.change)
            .change(function()
            {
              if ($op.val() == 'eq')
              {
                $op2.attr('disabled', 'disabled');
                $input2.attr('disabled', 'disabled');
              }
              else
              {
                $op2.removeAttr('disabled');
                if ($op2.val() != '---')
                {
                  $input2.removeAttr('disabled');
                }
              }

              if ($op.val() == '---')
              {
                $input.attr('disabled', 'disabled');
              }
              else
              {
                $input.removeAttr('disabled');
              }
            });
          $op2.change(this.change)
            .change(function()
            {
              if ($op2.val() == '---')
              {
                $input2.attr('disabled', 'disabled');
              }
              else
              {
                $input2.removeAttr('disabled');
              }
            });
          $input.change(this.change);
          $input2.change(this.change);

          this.$row.show();
          break;

        case 'x':
          this.change = function()
          {
            thisInstance.set('plain', $input.val());
          };
          $input = $('<input type="text">')
            .val('')
            .appendTo(this.$row)
            .change(this.change);
          this.$row.show();
          break;

        case 'e':
          var change = function()
          {
            thisInstance.set('is',
                             $input
                               .filter(':checked')
                               .map(function(i, item)
                                 {
                                   return item.value;
                                   return $(item).val();
                                 })
                               .toArray());
          };
          this.change = change;
          
          var $cb = $('<input>')
                      .attr(
                        {
                          type: 'checkbox',
                          checked: 'checked'
                        })
                      .change(function()
                      {
                        stupidCheckbox = this
                        stupidInput = $input
                        $input.prop('checked', this.checked);
                        change();
                      });
          this.$row
            .append($('<label>')
                      .text('check all')
                      .prepend($cb))
            .append('<br>');
          $input = $([]);
          for (var i = 0; i < data.length; i++)
          {
            $cb = $('<input>')
                    .attr(
                      {
                        type: 'checkbox',
                        value: data[i],
                        checked: 'checked'
                      })
                    .change(this.change);

            $.merge($input, $cb);
            this.$row
              .append($('<label>')
                        .text(data[i])
                        .prepend($cb))
              .append(' ');
          }
          //$input.button();
          this.$row.show();
          break;

        default:
          this.change = function(){};
          break;
      }
      return this;
    },

    detach:
    function()
    {
      this.$row.detach();
      return this;
    },

    appendTo:
    function($dst)
    {
      this.$row.appendTo($dst);
      return this;
    },

    prependTo:
    function($dst)
    {
      this.$row.prependTo($dst);
      return this;
    },

    destroy:
    function()
    {
      delete this.onchange;
      delete this.onreset;
      this.$row.remove();
      delete this.$row;
      delete this.change;
    }
  }


  $.widget('brainslices.propertyboxsearch', $.ui.autocomplete,
  {
    _renderMenu: function($ul, items)
    {
      var thisInstance = this;
      var lastData = null;
      $.each(items, function(index, item)
      {
        if (item.data != null && lastData == null)
        {
          $ul.append('<li class="ui-autocomplete-category">Field names</li>');
        }
        lastData = item.data;
        thisInstance._renderItemData($ul, item);
      });
    }
  });


  $.widget('brainslices.combobox',
  {
    options:
    {
      autocomplete: 'autocomplete',
    },

    _create:
    function()
    {
      this.$wrapper = $('<span>')
        .addClass('brainslices-combobox')
        .insertAfter(this.element)
        .append(this.element.detach());

      var autocomplete = this.options.autocomplete;
      this.classes = {}
      $.each(['ui-widget-content', 'ui-state-default', 'ui-corner-left'],
        $.proxy(function(i, v)
        {
          if (!this.element.hasClass(v))
          {
            this.element.addClass(v);
            this.classes[v] = true;
          }
        }, this));

      this.element
        [this.options.autocomplete](
        {
          source: this.options.source,
          minLength: 0
        })
        .bind('keypress', this.enter);

      var handlers = {};
      handlers[this.options.autocomplete + 'select'] = function(event, ui) 
      {
        //console.debug('select - element.val()', this.element.val(), ui)
        this.element
          .val(ui.item.value)
          .blur();
      }
      this._on(handlers);
 
      handlers = {};
      $.each(['change'], $.proxy(function(i, v) // 'select'
        {
          handlers[this.options.autocomplete + v] = function(event, ui)
          {
            //console.debug(v);
            this._trigger(v, event, ui);
          }
        }, this));

      this._on(handlers);

      var wasOpen = false;
      var $input = this.element;
      var $a = $('<a>')
        .button(
        {
          icons: {primary: "ui-icon-triangle-1-s"},
          text: false
        })
        .removeClass('ui-corner-all')
        .addClass('combobox-toggle ui-corner-right')
        .attr('title', 'Show all possible fields')
        .tooltip()
        .mousedown(function()
        {
          wasOpen = $input[autocomplete]('widget').is( ":visible" );
        })
        .click(function()
        {
          $input.focus();
          if (wasOpen) return;
          $input[autocomplete]('search', '');
        })
        .appendTo(this.$wrapper);
    },

    destroy:
    function()
    {
      this.element
        .detach()
        .insertBefore(this.wrapper)
        .unbind('keypress', this.enter);
      this.wrapper.remove();
      $.each(this.classes,
        $.proxy(function(k, v)
        {
          this.element.removeClass(k);
        }, this));
    },

    enter:
    function(event)
    {
      if (event.keyCode == 13)
      {
        $(this).blur();
      }
    }
  });


  $.widget('brainslices.newpropertyfilter',
  {
    options:
    {
      typeLabels:
      {
        t: 'Tag',
        f: 'Number',
        x: 'Text',
        e: 'Enumerative'
      },

      anyLabel: '--- any field ---'
    },

    _create:
    function()
    {
      this.$wrapper = $('<span>')
        .addClass('brainslices-newpropertyfilter')
        .appendTo(this.element);
      this._createPropertybox();
      this._createTypeSelect('tfx');
      this._createSubmitButton();
    },

    _createPropertybox:
    function()
    {
      var $span = $('<span>')
        .addClass("select-property ui-widget")
        .appendTo(this.$wrapper);

      this.propertyName = ''; //null
      var $input = $('<input>')
        .attr(
        {
          title: '',
          type: 'text',
          value: '' //this.options.anyLabel
        })
        .tooltip()
        .addClass('ui-widget-content ui-state-default ui-corner-left')
        .propertyboxsearch(
        {
          source: $.proxy(this, '_source'),
          minLength: 0
        })
        .keypress($.proxy(function(e)
        {
          if (e.keyCode == 13)
          {
            this.$input.blur();
            //this._propertyChange();
          }
        }, this))
        .appendTo($span);

      this.$input = $input;
      this._on(this.$input,
      {
        propertyboxsearchselect: '_propertySelect',
        propertyboxsearchchange: '_propertyChange'
      });

      var wasOpen = false;
      var $a = $('<a>')
        .appendTo($span)
        .button(
        {
          icons: {primary: "ui-icon-triangle-1-s"},
          text: false
        })
        .removeClass('ui-corner-all')
        .addClass('propertyboxsearch-toggle ui-corner-right')
        .attr('title', 'Show all possible fields')
        .tooltip()
        .mousedown(function()
        {
          wasOpen = $input.propertyboxsearch('widget').is( ":visible" );
        })
        .click(function()
        {
          $input.focus();
          if (wasOpen) return;

          $input.propertyboxsearch('search', '');
        });

    },

    _createTypeSelect: function()
    {
      this.$types = $('<select>')
        .appendTo(this.$wrapper);

      var thisInstance = this;
      this.filter = new CFilterPanel('<div>')
        .appendTo(this.$wrapper);

      this._updateTypeSelect('fxt');
    },

    _updateTypeSelect: function(types, selected)
    {
      this.$types.empty();
      if (!types) return;
      if (!selected)
      {
        selected = types[0];
      }
      var typeLabels = this.options.typeLabels;
      for (var i = 0; i < types.length; i++)
      {
        var t = types[i];
        var label = t in typeLabels ? typeLabels[t] : t;
        this.$types.append('<option value="' + t +
                           (selected == t ? '" selected="selected">' : '">')
                           + label + '</option>');
      }

      this.$types.change($.proxy(this, '_changeTypeSelect'));

      this._changeTypeSelect();
    },

    _changeTypeSelect: function()
    {
      var t = this.$types.val();
      if (t == 'e')
      {
        var data = [];
        if (this.propertyName in this.options.enumerated)
        {
          data = this.options.enumerated[this.propertyName];
        }
        this.filter.make(t, data);
      }
      else
      {
        this.filter.make(t);
      }
    },

    _createSubmitButton: function()
    {
      var $a = $('<a>')
        .button({label: 'Add'})
        .click($.proxy(this, '_onSubmit'))
        .appendTo(this.$wrapper);
    },

    inSelect: false,

    _propertySelect: function(event, ui)
    {
      this.inSelect = true;
      this.$input.blur();
      this.inSelect = false;
      this._propertyChange(event, ui);
    },

    _propertyChange: function(event, ui)
    {
      if (this.inSelect) return;
      if (ui && ui.item)
      {
        var data = ui.item.data;
        this._updateTypeSelect(data != null ? data + 't' : 'fxt');
        this.propertyName = data != null ? ui.item.value : null;
        console.debug('direct match');
        return;
      }

      var value = this.$input.val().trim().toLowerCase();
      this.propertyName = value;
      var valid = false;
      var thisInstance = this;
      $.each(this.options.source, function(name, type)
      {
        if (name === value)
        {
          valid = true;
          thisInstance._updateTypeSelect(type + 't');
          console.debug('indirect match');
          return false;
        }
      });

      if (valid) return;

      this.$input
        .attr('title', value + ' does not match any database field')
        .tooltip('open');

      this._updateTypeSelect('fxt');
      this._delay(function()
      {
        this.$input
          .tooltip('close')
          .attr('title', '');
      }, 2500);

    },

    _source:
    function(request, response)
    {
      var properties = [{value: this.options.anyLabel,
                         label: this.options.anyLabel,
                         data: null}];
      var filter = new RegExp(
        $.ui.autocomplete.escapeRegex(request.term),
        'i');

      var source = this.options.source;
      for (var name in source)
      {
        if (!request.term || filter.test(name))
        {
          properties.push({value: name,
                           label: name,
                           data: source[name]});
        }
      }
      response(properties);
    },

    _onSubmit: function()
    {
      if (this.propertyName == '')
      {
        this.$input
          .attr('title', 'An empty property name provided.')
          .tooltip('open');
        this._delay(function()
        {
          this.$input
            .tooltip('close')
            .attr('title', '');
        }, 2500);
        return;
      }

      var type = this.$types.val();
      var data = null;
      if (type == 'e')
      {
        if (this.propertyName in this.options.enumerated)
        {
          data = this.options.enumerated[this.propertyName];
        }
        else
        {
          data = [];
        }
      }

      this.options.submit(this.propertyName, type, this.filter.detach());
      this.filter = new CFilterPanel('<div>')
        .make(type, data)
        .appendTo(this.$wrapper);
      // UPS - would be before Add button :-D
    },

    destroy:
    function()
    {
      this.$wrapper.remove();
      if (this.filter)
      {
        this.filter.destroy();
        delete this.filter;
      }
    }
  });


})(jQuery);
