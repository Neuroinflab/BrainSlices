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
  /***************************************************************************\
   * Class: CFilterPanel                                                     *
   *                                                                         *
   * A class that seems not to be used any more - so documentation is being  *
   * postponed.                                                              *
   ***************************************************************************
   * Constructor: CFilterPanel                                               *
   *                                                                         *
   * Parameters:                                                             *
   *   row - A string representing the panel element type.                   *
  \***************************************************************************/
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

    make: //XXX method might be obsolete
    function(t, data)
    {
      this.$row.hide(0).empty();
      var $input;
      var thisInstance = this;
      switch (t)
      {
        case 'f':
          var $op = $('<select>'
                      +'<option selected="selected" value="eq">equal</option>'
                      +'<option value="gt">greater than</option>'
                      +'<option value="gteq">not less than</option>'
                      +'<option>---</option>'
                      +'</select>')
            .appendTo(this.$row);
          $input = $('<input type="number" value="0">')
            .appendTo(this.$row);

          var $op2 = $('<select disabled="disabled">'
                       +'<option value="lt">less than</option>'
                       +'<option value="lteq">no greater than</option>'
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

          this.$row.show(0);
          break;

        case 'x':
          this.change = function()
          {
            thisInstance.set('plain', $input.val());
          };
          $input = $('<input>')
            .attr(
            {
              type: 'text',
              value: '',
              placeholder: 'phrase'
            })
            .appendTo(this.$row)
            .change(this.change);
          this.$row.show(0);
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
          this.$row.show(0);
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


  /**
   * Class: propertyfilter
   *
   * jQuery UI dirty widget representing some property constraint(s)
   * (no property name given).
   *
   * Options:
   *   type - one of letters: 't' for tag type property, 'f' for numeric
   *          property, 'x' for text property, 'e' for enumerative property.
   *   defaults - object containing default constraint(s) for different types.
   *   conditions - current constraint(s).
   *   change - a callback to be called on constraint(s) change with new
   *            constraint(s) given as its parameters.
   *
   * Possible conditions:
   *   - 't' - null (no constraint).
   *   - 'x' - A string (plain text for natural language search).
   *   - 'f' - An object containing nonempty and nonconflicting set of
   *           constraints: 'eq', 'gt', 'gteq', 'lt', 'lteq' (constraint
   *           operator given by attribute name, constraint value - by
   *           attribute value.
   *   - 'e' - An object with enumerated values given as attribute names
   *           and their acceptance given by attribute value.
   *     
   * TODO:
   *   - assert for conflict of values check for 'f' type (eg. {lt:5, gt 7})
   *   - assert for empty set of enumerative options accepted
   *   - type change available also through widget option method
   *************************************************************************/
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

    floatLabels:
    {
      gt: 'greater than',
      lt: 'less than',
      gteq: 'not less than',
      lteq: 'not greater than',
      eq: 'equal'
    },

    _create:
    function()
    {
      this.$wrapper = $('<div>')
                        .addClass('brainslices-propertyfilter')
                        .appendTo(this.element);
    },

    _init:
    function()
    {
      this.options = this._fixOptions(this.options);

      this.$wrapper.hide(0).empty();
      switch (this.options.type)
      {
        case 't':
          this.$wrapper
            .removeClass('brainslices-text-property-filter brainslices-number-property-filter brainslices-enum-property-filter')
            .text('Matches all images with the property set.')
            .show(0);
          break;

        case 'f':
          this._createFloat();
          this.$wrapper.show(0);
          break;

        case 'x':
          this._createText();
          this.$wrapper.show(0);
          break;

        case 'e':
          this._createEnumerative();
          this.$wrapper.show(0);
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
                  .addClass('brainslices-enum-property-filter')
                  .text(key)
                  .prepend($cb))
          .append(' ');
      });
      $wrapper
          .removeClass('brainslices-text-property-filter brainslices-number-property-filter')
          .addClass('brainslices-enum-property-filter');
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
                      .addClass('brainslices-text-property-filter')
                      .attr(
                      {
                        type: 'text',
                        value: this.options.conditions,
                        placeholder: 'phrase'
                      })
                      .appendTo(this.$wrapper)
                      .change(change);
      this.$wrapper
        .removeClass('brainslices-number-property-filter brainslices-enum-property-filter')
        .addClass('brainslices-text-property-filter')
        .append($('<span>')
          .addClass('fa fa-search brainslices-text-property-filter')
          .css(
          {
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0
          }));

    },

    _makeFloatSelect:
    function(conditions, options)
    {
      var $select = $('<select>')
        .addClass('brainslices-number-property-filter-select');
      var val = null;
      var labels = this.floatLabels;

      $.each(options, function(i, v)
      {
        var $option = $('<option>')
                        .prop('value', v)
                        .text(v in labels ?
                              labels[v] : v)
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
                     .addClass('brainslices-number-property-filter-input')
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
        .append($('<div>')
          .addClass('brainslices-number-property-filter-select')
          .append($select1)
          .append($select2))
        .append($('<div>')
          .addClass('brainslices-number-property-filter-input')
          .append($input1)
          .append($input2))
        .removeClass('brainslices-text-property-filter brainslices-enum-property-filter')
        .addClass('brainslices-number-property-filter');
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

        // type/condition validation
        var conditions = options.conditions;
        var cond;
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
            var lteq = false, gteq = false, ltVal, gtVal;
            for (cond in conditions)
            {
              console.assert(typeof(conditions[cond]) == 'number',
                             'Not a number given for Number type  filter');
              switch (cond)
              {

                case 'lteq':
                  lteq = true;
                case 'lt':
                  console.assert(!eq && !lt,
                                 'Conflicting conditions given for Number type filter');
                  ltVal = conditions[cond];
                  lt = true;
                  break;

                case 'gteq':
                  gteq = true;
                case 'gt':

                  console.assert(!eq && !gt,
                                 'Conflicting conditions given for Number type filter');
                  gtVal = conditions[cond]; 
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
              if (lt && gt)
              {
                if (lteq && gteq && ltVal > gtVal ||
                    !(lteq && gteq) && ltVal >= gtVal)
                {
                  console.warn('Conflicting range:' +
                               (gteq ? '[' : '(') +
                               gtVal + '; ' + ltVal +
                               (lteq ? ']' : ')'));
                }
              }

            }
            break;

          case 'e':
            console.assert(typeof(conditions) == 'object',
                           'Not an object given for Enumerative type filter');
            var any = false;
            for (cond in conditions)
            {
              if (conditions[cond])
              {
                any = true;
                break;
              }
            }
            if (!any)
            {
              console.warn('No enumerated option selected');
            }
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


  /**
   * Class: brainslices.propertyboxsearch
   *
   * jQuery UI autocomplete widget extension allowing for explicite separating
   * '--- any property ---' jocker from common field names in combobox.
   *
   * (Common field names items contains not null data attribute and follow
   * the jocker.)
   **************************************************************************/
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


  /**
   * Class: brainslices.combobox
   *
   * jQuery UI dirty widget implementing combobox.
   *
   * Events:
   *   - change - triggered when value of combobox (possibly) has changed
   *
   * Options:
   *   autocomplete - name of autocomplete plugin used by the widget 
   *                  ('autocomplete' or 'propertyboxsearch')
   *   source - forwarded to the autocomplete plugin
   *
   * TODO:
   *   - widgetize it (especially options change)
   *************************************************************************/
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
        .bind('keypress', this._enter);

      var handlers = {};
      handlers[this.options.autocomplete + 'select'] = function(event, ui) 
      {
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
        .unbind('keypress', this._enter);
      this.wrapper.remove();
      $.each(this.classes,
        $.proxy(function(k, v)
        {
          this.element.removeClass(k);
        }, this));
    },

    _enter:
    function(event)
    {
      if (event.keyCode == 13)
      {
        $(this).blur();
      }
    }
  });


  /**
   * Class: brainslices.newpropertyfilter
   *
   * Options:
   *   typeLabels - An object mapping from one-letter type descriptors
   *                to labels.
   *   anyLabel - A label for a jocker for any property.
   *   enumerated - A function mapping name of property to list of possible
   *                values.
   *   source - A callback for jQueryUI autocomplete plugin executing its
   *            response with list of objects of attributes: value - matching
   *            property name, label - whatever has to be displayed, data -
   *            a string with property types ('t' excluded).
   *   submit - A callback triggered when submit button is being pressed.
   *            The callback takes the following parameters: propertyName,
   *            propertyType (one-letter descriptor) and a detached
   *            <brainslices.propertyfilter> widget.
   *
   * TODO:
   * - Widgetize (especially support option changes and think about storing
   *   widget state /property name, type etc./ in options).
   * - Fix UPS issue in _onSubmit method.
   **************************************************************************/
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

      anyLabel: '--- any property ---'
    },

    _create:
    function()
    {
      this.$wrapper = $('<span>').appendTo(this.element);
      var $div = $('<div>')
        .appendTo(this.$wrapper);


      var $what = $('<div>')
        .addClass('brainslices-new-property-filter')
        .appendTo($div);

      $div = $('<div>')
        .appendTo(this.$wrapper);

      this.$filter = $('<div>')
        .appendTo($div);

      this.$add = $('<span>')
        .addClass('add-filter-button fa fa-plus')
        .click($.proxy(this, '_onSubmit'))
        .appendTo(this.element);

      this._createNewPropertyFilter($what);
    },

    _createNewPropertyFilter:
    function($span)
    {
      this._createPropertybox($span);
      this._createTypeSelect($span);
    },

    _createPropertybox:
    function($span)
    {
      this.propertyName = ''; //null
      var $wrapper = $('<div>')
        .addClass('brainslices-new-property-filter-propertybox')
        .appendTo($span);
      var $input = $('<input>')
        .attr(
        {
          title: '',
          type: 'text',
          value: '', //this.options.anyLabel
          placeholder: 'property name'
        })
        .tooltip()
        .addClass('brainslices-new-property-filter-propertybox')
//        .addClass('ui-widget-content ui-state-default ui-corner-left brainslices-new-property-filter-propertybox')
        .propertyboxsearch(
        {
          source: $.proxy(this._source, this),
          minLength: 0
        })
        .keypress(/*$.proxy(*/function(e)
        {
          if (e.keyCode == 13)
          {
            /*this.*/$input.blur();
            //this._propertyChange();
          }
        }/*, this)*/)
        .appendTo($wrapper);

      this.$input = $input;
      this._on(this.$input,
      {
        propertyboxsearchselect: '_propertySelect',
        propertyboxsearchchange: '_propertyChange'
      });

      var wasOpen = false;
      var $a = $('<div>')
        .appendTo($span)
        .addClass('propertyboxsearch-toggle')
        .attr('title', 'Show all possible fields')
        .tooltip()
        .mousedown(function()
        {
          wasOpen = $input.propertyboxsearch('widget').is( ":visible" );
        })
        .click(function()
        {
          $input.focus();

          if (wasOpen) {
            return;
          }

          $input.propertyboxsearch('search', '');
        });
    },

    _createTypeSelect: function($span)
    {
      this.$types = $('<select>')
        .addClass('brainslices-new-property-filter-type')
        .appendTo($span);

      this.filter = //new CFilterPanel('<div>')
        $('<div>')
        .addClass('brainslices-property-filter')
        .appendTo(this.$filter);

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
        var data = {};
        $.each(this.options.enumerated(this.propertyName), function(i, v)
        {
            data[v] = true;
        });
        this.filter.propertyfilter({type: 'e', conditions: data});
      }
      else
      {
        this.filter.propertyfilter({type: t});
      }
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
      var anyLabel = this.options.anyLabel;
      this.options.source(request, function(match)
      {
        response([{value: anyLabel,
                   label: anyLabel,
                   data: null}].concat(match));
      })
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

      var filter = this.filter.detach();
      var options = $.extend(true, {}, filter.propertyfilter('option'));
      this.options.submit(this.propertyName, type, filter);
      this.filter = //new CFilterPanel('<div>')
        //.make(type, data)
        $('<div>')
        .addClass('brainslices-property-filter')
        .propertyfilter(options)
        .appendTo(this.$filter);
    },

    _destroy:
    function()
    {
      this.$wrapper.remove();
      this.$add.remove();
      if (this.filter)
      {
        this.filter.destroy();
        delete this.filter;
      }
    }
  });


  /**
   * Class: brainslices.folder
   *
   * A widget for folding/unfolding DIVs.
   *
   * Options:
   *   treshold - a minimum element height when folding occurs.
   **************************************************************************/
  $.widget('brainslices.folder',
  {
    options:
    {
      treshold: 85,
      folded: true,
      fit: false,
      onclick: null,
      $parent: null
    },

    _updateFolded:
    function(value)
    {
      var $parent = this.options.$parent ?
                    this.options.$parent :
                    this.element.parent();
      if (value)
      {
        this.$toggle.addClass('folded');
        this.element.addClass('folded');


        if (this.options.fit)
        {
          this.element.height($parent.innerHeight() + this.element.height() - this.element.outerHeight());
        }
      }
      else
      {
        this.$toggle.removeClass('folded');
        this.element.removeClass('folded');

        if (this.options.fit)
        {
          this.element.height('');
        }
      }
    },

    _toggle:
    function()
    {
      this._updateFolded(this.options.folded = !this.options.folded);
      if (this.options.onclick)
      {
        this.options.onclick();
      }
    },

    _create:
    function()
    {
      this.element.addClass('has-folder-widget');

      this.invalid = true;

      this.$wrapper = this.element
        .wrapInner('<div class="folder-wrapper">')
        .children();

      this.$toggle = $('<div>')
        .addClass('folder-button')
        .appendTo(this.$wrapper);

      this._on(this.$toggle, {click: '_toggle'});

      this._on($(window), {resize: 'requestUpdate'});

      if (this.options.folded)
      {
        this.element.addClass('folded');
        this.$toggle.addClass('folded');
      }

      this.refresh();
    },

    refresh:
    function()
    {
      if (this.invalid)
      {
        this.forceRefresh();
      }
    },

    forceRefresh:
    function()
    {
      //console.log('forceRefresh');
      var $parent = this.options.$parent ?
                    this.options.$parent :
                    this.element.parent();

      var contentHeight = this.$wrapper.outerHeight(true);

      if (this.options.fit)
      {
        if (this.options.folded)
        {
          var delta = this.element.height() - this.element.outerHeight();
        }

        this.element.hide(0);
        var parentHeight = $parent.innerHeight();
        if (contentHeight > parentHeight)
        {
          this.$toggle.show(0);
        }
        else
        {
          this.$toggle.hide(0);
        }

        this.element
          .height(this.options.folded ?
                  parentHeight + delta :
                  '')
          .show(0);
      }
      else
      {
        if (contentHeight > this.options.treshold)
        {
          this.$toggle.show(0);
        }
        else
        {
          this.$toggle.hide(0);
        }
      }

      this.invalid = false;
    },

    requestUpdate:
    function()
    {
      this.invalid = true;
    },

    fold:
    function()
    {
      if (!this.options.folded)
      {
        this._updateFolded(this.options.folded = true);
      }
    },

    unfold:
    function()
    {
      if (this.options.folded)
      {
        this._updateFolded(this.options.folded = false);
      }
    },

    _setOptions:
    function()
    {
      this._superApply( arguments );
      this.refresh();
    },

    _setOption:
    function(key, value)
    {
      if (key == 'folded')
      {
        this._updateFolded(value);
      }

      this._super(key, value);
    },

    _destroy:
    function()
    {
      this.$toggle.remove();
      this.$wrapper.children().unwrap();
      this.element.removeClass('folded has-folder-widget');
    }
  });

  /**
   * Class: brainslices.offsetinput
   *
   * A widget for folding/unfolding DIVs.
   *
   * Options:
   *   treshold - a minimum element height when folding occurs.
   **************************************************************************/
  $.widget('brainslices.offsetinput',
  {
    options:
    {
      top: null,
      left: null,
      onchange: null,
      unit: 1000
    },

    _updateTop:
    function(top)
    {
      this.$top.val(top != null ? top / this.options.unit : '');
    },

    _updateLeft:
    function(left)
    {
      this.$left.val(left != null ? left / this.options.unit : '');
    },

    _updateUnit:
    function(unit)
    {
      this.$unit.val(unit);
      this._updateLeft(this.options.left);
      this._updateTop(this.options.top);
    },

    _create:
    function()
    {
      this.element.addClass('has-offsetinput-widget');

      this.$left = $('<input>')
        .attr(
        {
          type: 'number',
          title: 'left offset'
        })
        .tooltip(BrainSlices.gui.tooltip)
        .addClass('offsetinput-widget-left');

      if (this.options.left != null)
      {
        this.$left.val(this.options.left / this.options.unit);
      }

      this.$top = $('<input>')
        .attr(
        {
          type: 'number',
          title: 'top offset'
        })
        .tooltip(BrainSlices.gui.tooltip)
        .addClass('offsetinput-widget-top');

      if (this.options.top != null)
      {
        this.$top.val(this.options.top / this.options.unit);
      }

      this.$unit = $('<select>')
        .addClass('offsetinput-widget-unit')
        .append($('<option>')
          .attr('value', '1000000000')
          .text('km'))
        .append($('<option>')
          .attr('value', '1000000')
          .text('m'))
        .append($('<option>')
          .attr('value', '914400')
          .text('yd'))
        .append($('<option>')
          .attr('value', '304800')
          .text('ft'))
        .append($('<option>')
          .attr('value', '100000')
          .text('dm'))
        .append($('<option>')
          .attr('value', '25400')
          .text('in'))
        .append($('<option>')
          .attr('value', '10000')
          .text('cm'))
        .append($('<option>')
          .attr('value', '1000')
          .text('mm'))
        .append($('<option>')
          .attr('value', '25.4')
          .text('th'))
        .append($('<option>')
          .attr('value', '1')
          .text('\u03BCm'))
        .append($('<option>')
          .attr('value', '0.001')
          .text('nm'))
        /*.append($('<option>')
          .attr('value', '0.000001')
          .text('pm'))*/
        .val(this.options.unit);

      this._on(this.$left,
        {
          change:
          function()
          {
            var options = this.options;
            var left = parseFloat(this.$left.val());
            left = isNaN(left) ? null : left * this.options.unit;
            options.left = left;
            this._updateLeft(left);
            if (options.onchange)
            {
              options.onchange({top: options.top, left: left});
            }
          }
        });

      this._on(this.$top,
        {
          change:
          function()
          {
            var options = this.options;
            var top = parseFloat(this.$top.val());
            top = isNaN(top) ? null : top * this.options.unit;
            options.top = top;
            this._updateTop(top);
            if (options.onchange)
            {
              options.onchange({top: top, left: options.left});
            }
          }
        });

      this._on(this.$unit,
        {
          change:
          function()
          {
            var unit = parseFloat(this.$unit.val());
            this.options.unit = unit;
            this._updateUnit(unit);
          }
        });


      this.$wrapper = $('<div>')
        .addClass('offsetinput-widget-wrapper')
        .text('x')
        .prepend(this.$left)
        .append(this.$top)
        .append(this.$unit)
        .appendTo(this.element)
    },

    value:
    function()
    {
      return {top: this.options.top, left: this.options.left}
    },

    _setOption:
    function(key, value)
    {
      if (key == 'left')
      {
        this._updateLeft(value);
      }
      else if (key == 'top')
      {
        this._updateTop(value);
      }
      else if (key == 'unit')
      {
        this._updateUnit(value);
      }

      this._super(key, value);
    },

    _destroy:
    function()
    {
      this.$wrapper.remove();
      this.element.removeClass('has-offsetinput-widget');
    }
  });

})(jQuery);
