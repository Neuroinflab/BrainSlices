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
      this.$row.remove();
      for (var name in this)
      {
        delete this[name];
      }
    }
  }


  $.widget('brainslices.propertyfilter',
  {
    options: 
    {
      type: 't',
      defaults: {}
    },

    defaults:
    {
      t: null,
      f: {gteq: 0},
      x: '',
      e: {}
    },

    _create:
    function()
    {
      this.$wrapper = $('<span>')
                        .addClass('brainslices-propertyfilter')
                        .appendTo(this.element);

    },

    _init:
    function()
    {
      this.options = this._fixOptions(this.options);

      console.debug('init');
      this.$wrapper.hide().empty();
      switch (this.options.type)
      {
        case 't':
          break;

        case 'f':
          this._createFloat();
          this.$wrapper.show();
          break;

        case 'x':
          this._createText();
          this.$wrapper.show();
          break;

        case 'e':
          this._createEnumerative();
          this.$wrapper.show();
          break;

        default:
          break;
      }
    },

    _createEnumerative:
    function()
    {
      var options = this.options;
      var conditions = options.conditions;
      var $wrapper = this.$wrapper;

      function change()
      {
        $input.each(function(i, element)
        {
          conditions[element.value] = element.checked;
        });
        if (options.change)
        {
          options.change(conditions);
        }
      }

      var $cb = $('<input>')
                  .attr('type', 'checkbox')
                  .change(function()
                  {
                    $input.prop('checked', this.checked);
                    change();
                  });

      $wrapper
        .append($('<label>')
                  .text('check all')
                  .prepend($cb))
        .append('<br>');

      var $input = $([]);
      var order = [];
      for (var key in conditions)
      {
        order.push(key);
      }
      order.sort();
      $.each(order, function(i, key)
      {
        var $cb = $('<input>')
                    .attr(
                    {
                      type: 'checkbox',
                      value: key,
                      checked: conditions[key]
                    })
                    .change(change);
        $.merge($input, $cb);
        $wrapper
          .append($('<label>')
                  .text(key)
                  .prepend($cb))
          .append(' ');
      });
    },

    _createText:
    function()
    {
      var options = this.options;
      function change()
      {
        options.conditions = $input.val();
        if (options.change)
        {
          options.change(options.conditions);
        }
      }
      var $input = $('<input>')
                      .attr({type: 'text',
                             value: this.options.conditions})
                      .appendTo(this.$wrapper)
                      .change(change);

    },

    _makeFloatSelect:
    function(conditions, options)
    {
      var $select = $('<select>');
      var val = null;

      $.each(options, function(i, v)
      {
        var $option = $('<option>')
                        .text(v)
                        .appendTo($select);
        if (v in conditions)
        {
          $option.prop('selected', true);
          val = conditions[v];
        }
      });

      var $option = $('<option>')
                      .text('---')
                      .appendTo($select);
      var $input = $('<input>')
                     .attr({type: 'number',
                            value: val != null ? val : 0});
      if (val == null)
      {
        $option.prop('selected', true);
        $input.prop('disabled', true);
      }
      return {$select: $select, $input: $input};
    },

    _createFloat:
    function()
    {
      var options = this.options;
      var conditions = options.conditions;

      var op1 = this._makeFloatSelect(conditions, ['eq', 'gt', 'gteq']);
      var op2 = this._makeFloatSelect(conditions, ['lt', 'lteq']);

      function change()
      {
        var conditions = {};
        var op1 = $select1.val();

        if (op1 != 'eq')
        {
          $select2.prop('disabled', false);
          var op2 = $select2.val();
          if (op2 != '---')
          {
            $input2.prop('disabled', false);
            conditions[op2] = parseFloat($input2.val());
          }
          else
          {
            $input2.prop('disabled', true);
          }
        }
        else
        {
          $select2.prop('disabled', true);
        }

        if (op1 != '---')
        {
          $input1.prop('disabled', false);
          conditions[op1] = parseFloat($input1.val());
        }
        else
        {
          $input1.prop('disabled', true);
        }

        options.conditions = conditions;
        if (options.change)
        {
          options.change(conditions);
        }
      }

      var $select1 = op1.$select.change(change);
      var $input1 = op1.$input.change(change);
      var $select2 = op2.$select.change(change);
      var $input2 = op2.$input.change(change);

      this.$wrapper
        .append($select1)
        .append($input1)
        .append($select2)
        .append($input2);
    },

    _fixOptions:
    function(options)
    {
      // working with a deep copy
      options = $.extend(true, {}, options);

      var defaults;
      if ('defaults' in options)
      {
        defaults = options.defaults;
        for (var k in this.defaults)
        {
          if (!(k in defaults))
          {
            if (k == 'e' || k == 'f')
            {
              defaults[k] = $.extend({}, this.defaults[k]);
            }
            else
            {
              defaults[k] = this.defaults[k];
            }
          }
        }
      }
      else if ('defaults' in this.options)
      {
        options.defaults = defaults = this.options.defaults;
      }
      else
      { 
        options.defaults = defaults = $.extend(true, {}, this.defaults);
      }

      if ('type' in options)
      {
        var t = options.type;

        if (!('conditions' in options))
        {
          if (t == 'f' || t == 'e')
          {
            //object
            options.conditions = $.extend({}, defaults[t]);
          }
          else
          {
            // a kind of a primitive
            options.conditions = defaults[t];
          }
        }

        console.debug(options)

        // type/condition validation
        var conditions = options.conditions;
        switch (t)
        {
          case 't':
            console.assert(conditions == null,
                           'Bad conditions given for Tag type filter');
            break;

          case 'f':
            console.assert(typeof(conditions) == 'object',
                           'Not an object given for Number type filter');
            var lt = false, gt = false, eq = false;
            for (var cond in conditions)
            {
              console.assert(typeof(conditions[cond]) == 'number',
                             'Not a number given for Number type  filter');
              switch (cond)
              {
                case 'lt':
                case 'lteq':
                  console.assert(!eq && !lt,
                                 'Conflicting conditions given for Number type filter');
                  lt = true;
                  break;

                case 'gt':
                case 'gteq':
                  console.assert(!eq && !gt,
                                 'Conflicting conditions given for Number type filter');
                  gt = true;
                  break;

                case 'eq':
                  console.assert(!lt && !gt,
                                 'Conflicting conditions given for Number type filter');
                  eq = true;
                  break;

                default:
                  console.assert(false, 'Unknown condition (' + cond + ') given for Number type filter');
              }

              console.assert(lt || gt || eq,
                             'No condition given for Number type filter');

            }
            break;

          case 'e':
            console.assert(typeof(conditions) == 'object',
                           'Not an object given for Enumerative type filter');
            break;

          case 'x':
            console.assert(typeof(conditions) == 'string',
                           'Not a string given for Text type filter');
            break;

          default:
            console.assert(false, 'Unknown type given');
        }
      }

      return options;
    },

    _setOptions:
    function(options)
    {
      if (options) options = this._fixOptions(options);
      this._super(options);
    },

    _setOption:
    function(key, value)
    {
      console.debug(key, value);
      switch (key)
      {
        case 'type':
        case 'conditions':
        case 'defaults':
          this.options[key] = value;
          break;

        case 'conditions':
        case 'type':
          this.options[key] = value;
          // some update?
          break;

        case 'change':
          this.options[key] = value;
          if (value)
          {
            value(this.options.conditions);
          }
          break;

        default:
          break;
      }

      this._super(key, value);
    },

    _destroy:
    function()
    {
      this.$wrapper.remove();
    }
  });


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

    _destroy:
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
      this.filter = //new CFilterPanel('<div>')
        $('<div>')
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
        var data = {}; //[];
        if (this.propertyName in this.options.enumerated)
        {
          //data = this.options.enumerated[this.propertyName];
          $.each(this.options.enumerated[this.propertyName], function(i, v)
          {
            data[v] = true;
          });
        }
        this.filter.propertyfilter({type: 'e', conditions: data});
        //this.filter.make(t, data);
      }
      else
      {
        //this.filter.make(t);
        this.filter.propertyfilter({type: t});
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
      this.filter = //new CFilterPanel('<div>')
        //.make(type, data)
        $('<div>')
        .appendTo(this.$wrapper);
      // UPS - would be before Add button :-D
    },

    _destroy:
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
