function makeAdjustmentPanel($div, id, image, thisInstance, finish, triggers,
                             adjust)
{
  var getTrigger = BrainSlices.aux.getTrigger;

  var updateLeft = getTrigger('left', triggers, function(left)
  {
    image.updateImage(left, null, null, false);
  });
  var $imageLeft = $('<input>')
    .attr(
    {
      type: 'number',
      title: 'left offset'
    })
    .addClass('adjustPanelLeft')
    .change(function()
    {
      var left = parseFloat($imageLeft.val());
      updateLeft(isNaN(left) ? null : left);
    });

  var updateTop = getTrigger('top', triggers, function(top)
  {
    image.updateImage(null, top, null, false);
  });
  var $imageTop = $('<input>')
    .attr(
    {
      type: 'number',
      title: 'top offset'
    })
    .addClass('adjustPanelTop')
    .change(function()
    {
      var top = parseFloat($imageTop.val());
      updateTop(isNaN(top) ? null : top);
    });

  var updatePixel = getTrigger('pixel', triggers, function(pixel)
  {
    image.updateImage(null, null, pixel, false);
  });
  var $dpi = $('<input>')
    .attr('type', 'number')
    .css('display', 'none')
    .addClass('adjustPanelRes')
    .change(function()
    {
      var ps =  25400. / parseFloat($dpi.val());
      $pixelSize.val(ps);
      updatePixel(isNaN(ps) ? null : ps);
    });

  var $pixelSize = $('<input>')
    .attr('type', 'number')
    .addClass('adjustPanelRes')
    .change(function()
    {
      var ps = parseFloat($pixelSize.val());
      $dpi.val(25400. / ps);
      updatePixel(isNaN(ps) ? null : ps);
    });

  var $res = $('<select>')
    .addClass('adjustPanelRes')
    .append($('<option>')
      .text('resolution [DPI]')
      .attr('value', 'dpi'))
    .append($('<option>')
      .text('pixel size [μm]')
      .attr(
      {
        value: 'ps',
        selected: 'selected'
      }))
    .change(function()
    {
      switch ($res.val())
      {
        case 'ps':
          $dpi.hide(0);
          $pixelSize.show(0);
          break;

        case 'dpi':
          $pixelSize.hide(0);
          $dpi.show(0);
          break
      }
    });

  var buttons = getTrigger('buttons', triggers, {});
  var $iface = $('<span>')
    .css('display', adjust ? '' : 'none')
    .append('<br>')
    .append($('<label>')
      .addClass('adjustPanelOffset')
    .append($('<div>')
      .addClass('selectWrapper adjustPanelRes')
      .text('x')
      .prepend($imageLeft)
      .append($imageTop)))
    .append('<br>')
    .addClass('adjustPanelRes')
    .append($('<div>')
      .addClass('selectWrapper adjustPanelRes')
      .append($res)
      .append($dpi)
      .append($pixelSize))
    .append(' ')
    .append($.map(buttons, function(value, key)
    {
      return $('<button>')
        .text(key)
        .click(value);
    }));

  var updateAdjust = getTrigger('adjust', triggers, function(adjust)
  {
    if (adjust)
    {
      $iface.show(0);
      thisInstance.images.startAdjustment(id);
    }
    else
    {
      $iface.hide(0);
      thisInstance.images.stopAdjustment(id);
    }
    layerManager.doLazyRefresh();
    animateImageCartHeader();
  });
  var $adjust = $('<input>')
    .attr('type', 'checkbox')
    .change(function()
    {
      updateAdjust(this.checked);
    });

  var $adjustment = $('<div>')
    .addClass('adjustPanel')
    .append($('<label>')
      .addClass('adjustPanelAdjust')
        .append($adjust))
    .append($iface)
    .appendTo($div);

  if (finish)
  {
    var onUpdate = function(info)
    {
      $imageLeft.val(info.imageLeft);
      $imageTop.val(info.imageTop);
      $dpi.val(25400. / info.pixelSize);
      $pixelSize.val(info.pixelSize);
      /*$status.val(info.status);*/
    };

    finish(
    onUpdate,
    function(adjusted)
    {
      $iface.css('display', adjusted ? '': 'none');
      $adjust.prop('checked', adjusted);
      //try
      //{
         $div.folder('requestUpdate');
      //}
      //catch (err)
      //{
      //  // throws error on first call
      //  //console.debug(err);
      //}
    });

    onUpdate(image.info);
  }

  return $adjustment;
}

var makeAddPropertyPanel;
var updatePropertySuggestions;
var getPropertySuggestions;
var getEnumerated;
var getEnumeratedSuggestionsFunction;

(function()
{
  var suggestedProperties = {};
  var enumeratedProperties = {};
  
  var TYPES = [['t', 'Tag'],
               ['i', 'Integer'],
               ['f', 'Float'],
               ['s', 'String'],
               ['x', 'Text'],
               ['e', 'Enumerative']];

  getPropertySuggestions =
  function(request, response)
  {
    var f;
    if (request.term)
    {
      var filter = new RegExp($.ui.autocomplete.escapeRegex(request.term),
                              'i');
      f = function(val, key)
      {
        if (!filter.test(key)) return null;

        return {value: key,
                label: key,
                data: val};
      }
    }
    else
    {
      f = function(val, key)
      {
        return {value: key,
                label: key,
                data: val};
      }
    }
    response($.map(suggestedProperties, f));
  };

  getEnumerated = function(name)
  {
    return name in enumeratedProperties ?
           enumeratedProperties[name] :
           [];
  };

  getEnumeratedSuggestionsFunction =
  function(getEnumerated)
  {
    return function(request, response)
    {
      var suggestions = getEnumerated();
      if (request.term)
      {
        var filter = new RegExp($.ui.autocomplete.escapeRegex(request.term),
                                  'i');
        suggestions = suggestions.filter(filter.test, filter);
      }

      response(suggestions);
    }
  };

  
  function makeTypeOption(type, i)
  {
    var t = type[0];
    var $option = $('<option>')
      .attr('value', t)
      .text(type[1])
    if (i == 0)
    {
      $option.attr('selected', 'selected');
    }
    this[t] = $option;
    return $option;
  }
  
  makeAddPropertyPanel = function(onsubmit, onclick)
  {
    var $addPanel = $('<div>');
    var name;
    var typeOptions = {};
    //var inSelect = false;
  
    function nameChanged()
    {
      //if (inSelect) return;
      name = $name.val().trim().toLowerCase();

      $type.children('option').removeClass('suggested-type');
      if (name in suggestedProperties)
      {
        var suggested = suggestedProperties[name];
        var $options = $.merge($([]), typeOptions.t);

        for (var i = 0; i < suggested.length; i++)
        {
          $.merge($options,
                  typeOptions[suggested[i]]);

          switch(suggested[i])
          {
            case 'x':
              $.merge($options, typeOptions.s);
              break
  
            case 'f':
              $.merge($options, typeOptions.i);
              break
  
            default:
              break;
          }
        }
        $options.addClass('suggested-type');
      }
    }
    var $propertybox = $('<div>')
      .addClass('brainslices-new-property-filter fake-filter')
      .appendTo($addPanel);

    var $name = $('<input>')
      .attr(
      {
        title: '',
        type: 'text',
        value: '',
        placeholder: 'property name'
      })
      .tooltip(BrainSlices.gui.tooltip)
      .addClass('brainslices-new-property-filter-propertybox')
      .autocomplete(
      {
        source: getPropertySuggestions,
        minLength: 0
      })
      .keypress(function(e)
      {
        if (e.keyCode == 13)
        {
          $name.blur();
        }
      })
      .on('autocompletechange', nameChanged)
      .on('autocompleteselect', function(event, ui)
      {
        $name.val(ui.item.value).blur();
        nameChanged();
      })
      .appendTo($('<div>')
        .addClass('brainslices-new-property-filter-propertybox fake-filter')
        .appendTo($propertybox))

    var wasOpen;

    $('<div>')
      .addClass('propertyboxsearch-toggle fake-filter')
      .attr('title', 'Show hints')
      .tooltip(BrainSlices.gui.tooltip)
      .mousedown(function()
      {
        wasOpen = $name.autocomplete('widget').is( ":visible" );
      })
      .click(function()
      {
        $name.focus();

        if (wasOpen) return;

        $name.autocomplete('search', '');
      })
      .appendTo($propertybox);

/*      .combobox(
      {
        source: getPropertySuggestions
      })
      .on('comboboxchange', nameChanged)
      .on('comboboxselect', function(event, ui)
      {
        //inSelect = true;
        $name.val(ui.item.value).blur();
        //inSelect = false;
        nameChanged();
      });*/
 
    var $type = $('<select>')
      .addClass('brainslices-new-property-filter-type fake-filter')
      .append(TYPES.map(makeTypeOption, typeOptions))
      .change(function()
      {
        var type = $type.val();
        for (var t in inputBases)
        {
          inputBases[t][t == type ? 'show' : 'hide'](0);
        }
      })
      .appendTo($propertybox);
/*      .addClass('selectWrapper')
      .appendTo($('<div>')
        .addClass('selectWrapper')
        .appendTo($addPanel));*/

    var inputs =
    {
      i: $('<input>')
        .attr(
        {
          type: 'number',
          step: '1',
          value: '0'
        })
        .css('display', 'none'),
      f: $('<input>')
        .attr(
        {
          type: 'number',
          value: '0'
        })
        .css('display', 'none'),
      s: $('<input>')
        .attr(
        {
          type: 'text',
          placeholder: 'short text'
        })
        .css('display', 'none'),
      e: $('<input>')
        .attr(
        {
          type: 'text',
          placeholder: 'keyword'
        })
        .addClass('image-details-edit-enum')
        .tooltip(BrainSlices.gui.tooltip)
        .autocomplete(
        {
          source: getEnumeratedSuggestionsFunction(function()
          {
            return getEnumerated(name);
          }),
          minLength: 0
        })
        //.keypress(function(e) // might be not important - no onchange event XXX
        //{
        //  if (e.keyCode == 13)
        //  {
        //    inputs.e.blur();
        //  }
        //})
        .on('autocompleteselect', function(event, ui)
        {
          inputs.e.val(ui.item.value);//.blur(); // might be not as important - no onchange event??? XXX
        }),
      x: $('<textarea>')
        .attr('placeholder', 'long text')
        .css('display', 'none')
    };

    for (var t in inputs)
    {
      inputs[t].addClass('image-details-edit');
    }

    var inputBases = Object.create(inputs);
    var wasOpenEnumerated;
    inputBases.e = $('<div>')
      .addClass('image-details-edit-enum selectWrapper')
      .css('display', 'none')
      .append(inputs.e)
      .append($('<div>')
        .addClass('image-details-edit-enum-toggle')
        .attr('title', 'Show hints')
        .tooltip(BrainSlices.gui.tooltip)
        .mousedown(function()
        {
          wasOpenEnumerated = inputs.e.autocomplete('widget').is( ":visible" );
        })
        .click(function()
        {
          inputs.e.focus();

          if (wasOpenEnumerated) return;

          inputs.e.autocomplete('search', '');
        }));
      //  .combobox(
      //  {
      //    source:
      //    getEnumeratedSuggestionsFunction(function()
      //    {
      //      return getEnumerated(name);
      //    })
      //  }));

    for (var t in inputBases)
    {
      inputBases[t]
        .appendTo($addPanel);
    }

    for (var submitText in onsubmit)
    {
      (function(submitText, onsubmit)
      {
        $('<button>')
          .text(submitText)
          .appendTo($addPanel)
          .click(function()
          {
            var name = $name.val().trim();
            if (name == '')
            {
              alertWindow.error('Property name must be given.');
              return;
            }
  
            var type = $type.val();
            var property = {type: type}; // no property privileges set

            if (type in inputs)
            {
              if ((property.value = inputs[type].val().trim()) == '')
              {
                alertWindow.error('Property value must be given.');
                return;
              }
            }

            onsubmit(name, property);
            updatePropertySuggestions(name, property);
          });
      })(submitText, onsubmit[submitText]);
    }

    if (onclick)
    {
      for (var clickText in onclick)
      {
        (function(clickText, onclick)
        {
          $('<button>')
            .text(clickText)
            .appendTo($addPanel)
            .click(onclick);
        })(clickText, onclick[clickText]);
      }
    }
    return $addPanel;
  }

  updatePropertySuggestions = function(name, property)
  {
    if (name == null)
    {
      return loginConsole
        .ajax('/meta/getPropertyList',
          function(data)
          {
            if (data.status)
            {
              suggestedProperties = data.data[0];
              enumeratedProperties = data.data[1];
              if (property)
              {
                property();
              }
            }
            else
            {
              alertWindow.error(data.message);
            }
          });
    }

    if (!(name in suggestedProperties))
    {
      suggestedProperties[name] = property.type == 't' ?
                                  '' :
                                  property.type;
      if (property.type == 'e')
      {
        enumeratedProperties[name] = [property.value];
      }
      return; // nothing to do
    }

    switch (property.type)
    {
      case 't':
        return;

      case 'e':
        if (!(name in enumeratedProperties))
        {
          enumeratedProperties[name] = [property.value];
          return;
        }
        var values = enumeratedProperties[name];
        if (values.indexOf(property.value) < 0)
        {
          values.push(property.value);
        }
      default:
        if (suggestedProperties[name].indexOf(property.type) < 0)
        {
          suggestedProperties[name] += property.type;
        }
    }
  }
})();

var PImagePropertyTriggers =
{
  add: //autoAdd
  function (name, property, original)
  {
    var type = property.type;
    var data = {}; // fixed: name in this.data.fixedOut

    var thisInstance = this;

    if (name in this.data.fixedOut)
    {
      data.$out = this.data.fixedOut[name].show(0);
    }
    else
    {
      var $outRow = $('<li>')
        .text(name)
        .addClass('image-details')
        .appendTo(this.data.$outList);

      data.$outRow = $outRow;

      if (type != 't')
      {
        data.$out = $('<span>')
          .text(property.value)
          .appendTo($outRow.append(': '));
      }
    }

    var $inRow = $('<li>')
      .addClass('image-details-edit')
      .text(name)
      .appendTo(this.data.$inList);
    data.$inRow = $inRow;

    if (type != 't')
    {
      var $input;
      switch (type)
      {
        case 'x':
          $input = $('<textarea>')
            .attr('placeholder', 'long text');
          break;

        case 's':
        case 'e':
          $input = $('<input>')
            .attr(
            {
              type: 'text',
              placeholder: type == 's' ?
                           'short text' :
                           'keyword'
            });
          break;

        case 'i':
          $input = $('<input>')
            .attr(
            {
              type: 'number',
              step: '1'
            });
          break;

        case 'f':
          $input = $('<input>')
            .attr('type', 'number');
      }

      $input
        .val(property.value) // might be a problem with textarea...

        .bind(type != 'e' ? 'change' : 'comboboxchange',
              function()
              {
                var val = $input.val();
                thisInstance.change(name, val, true);
              });

      if (type == 'e')
      {
        //$input
        //.combobox(
        //{
        //  source: getEnumeratedSuggestionsFunction(function()
        //  {
        //    return getEnumerated(name);
        //  })
        //});
        var wasOpen;

        $input
          .addClass('image-details-edit-enum')
          .tooltip(BrainSlices.gui.tooltip)
          .autocomplete(
          {
            source: getEnumeratedSuggestionsFunction(function()
            {
              return getEnumerated(name);
            }),
            minLength: 0
          })
          .keypress(function(e)
          {
            if (e.keyCode == 13)
            {
              $input.blur();
            }
          })
          .on('autocompleteselect', function(event, ui)
          {
            $input.val(ui.item.value).blur();
          })
          .appendTo($('<div>')
            .addClass('image-details-edit-enum selectWrapper')
            .append($('<div>')
              .addClass('image-details-edit-enum-toggle')
              .attr('title', 'Show hints')
              .tooltip(BrainSlices.gui.tooltip)
              .mousedown(function()
              {
                wasOpen = $input.autocomplete('widget').is( ":visible" );
              })
              .click(function()
              {
                 $input.focus();

                 if (wasOpen) return;

                 $input.autocomplete('search', '');
              })
            )
            .appendTo($inRow
              .append(': ')));
      }
      else
      {
        $input
          .addClass('image-details-edit')
          .appendTo($inRow.append(': '));
      }
      data.$input = $input;
    }

    //$('<button>')
    //  .text('X')
    $('<span>')
      .attr('title', 'remove property')
      .tooltip(BrainSlices.gui.tooltip)
      .addClass('remove-property-button fa fa-times')
      .appendTo($inRow)
      .click(function()
      {
        thisInstance.remove(name);
      });

    var propertyTriggers = Object.create(PPropertyTriggers);
    propertyTriggers.data = data;
    return this.add(name, property, propertyTriggers, original);
  },

  change: //onChange or so...
  function()
  {
    if (this.changed)
    {
      this.data.$row.addClass('propertyChanged');
    }
    else if (this.data.$row.hasClass('propertyChanged'))
    {
      this.data.$row.removeClass('propertyChanged');
    }
  }
};


var PPropertyTriggers =
{
  update: function()
  {
    if (this.data.$input)
    {
      this.data.$input.val(this.value);
    }

    if (this.data.$out)
    {
      this.data.$out.text(this.value);
    }
  },

  destroy: function()
  {
    console.log('property destroy');
    if (this.data.$inRow) this.data.$inRow.remove();

    if (this.data.$outRow)
    {
      this.data.$outRow.remove();
    }
    else
    {
      console.debug(this.data.$out);
      this.data.$out.empty().hide(0);
    }
  },

  new: function()
  {
    if (this.new)
    {
      this.data.$inRow.addClass('propertyNew');
    }
    else if (this.data.$inRow.hasClass('propertyNew'))
    {
      this.data.$inRow.removeClass('propertyNew');
    }
  },

  change: function()
  {
    if (this.changed)
    {
      this.data.$inRow.addClass('propertyChanged');
    }
    else if (this.data.$inRow.hasClass('propertyChanged'))
    {
      this.data.$inRow.removeClass('propertyChanged');
    }
  },

  remove: function()
  {
    if (this.removed)
    {
      if (this.data.$inRow) this.data.$inRow.hide(0);
      if (this.data.$outRow)
      {
        this.data.$outRow.hide(0);
      }
      else
      {
        this.data.$out.hide(0);
      }
    }
    else
    {
      if (this.data.$inRow) this.data.$inRow.show(0);
      if (this.data.$outRow)
      {
        this.data.$outRow.show(0);
      }
      else
      {
        this.data.$out.show(0);
      }
    }
  }
};

var animateImageCartHeaderInProgress = false;
var animateImageCartHeaderRequested = false;

function animateImageCartHeader(hght)
{
  if (hght != null)
  {
    console.error('height argument passed; WHAT TO DO!?!?!?!?');
  }

  console.log('animate');
  if (animateImageCartHeaderInProgress)
  {
    animateImageCartHeaderRequested = true;
    return;
  }
  console.log('animation fired');
  animateImageCartHeaderRequested = false;
  animateImageCartHeaderInProgress = true;

  var scope = BrainSlices.scope;
  var space = $('#imageCart').innerHeight();
  var height = BrainSlices.scope.get('cartHeader') ?
               $('#imageCartHeaderContent').outerHeight(true) :
               35;

  var spaceLeft = space - height - $('#imageCartFooter').outerHeight();

  $('#imageCartHeader')
    .animate(
    {
      height: height + 'px'
    },
    {
      queue: false/*,
      complete:
      function()
      {
      }*/
    });

  $('#imageCartBody')
    .animate(
    {
      height: Math.min(spaceLeft, $('#layerList').outerHeight()) + 'px'
    },
    {
      queue: false,
      complete:
      function()
      {
        animateImageCartHeaderInProgress = false;
        if (animateImageCartHeaderRequested)
        {
          animateImageCartHeader();
          return;
        }

        $('#imageCartBody').css('overflow', '');

        layerManager.doLazyRefresh();

        var oldHeight = $('#layerList').height();
        var oldWidth = $('#imageCartHeaderWrapper').outerWidth();
        // MUAHAHAHA - cached
        var newWidth = $('#layerList').width();
        if (oldWidth != newWidth)
        {
          $('#imageCartHeader')
            .css('padding-right',
                 $('#imageCartHeader').innerWidth() - newWidth + 'px');
          $('#imageCartFooter').css('width', newWidth + 'px');
        }

        if (oldHeight != $('#layerList').height())
        {
          layerManager.doLazyRefresh();
        }


        var visWidth = Math.max(scope.get('grid_dims').x * 21, 65);
        $('#loadAllPanel')
          .width(visWidth);
        $('#imageCartHeaderColumnSeparator').css('right', visWidth + 'px');
        var labelWidth = $('#imageCartHeaderContent').innerWidth() - visWidth - 1;
        $('#imageCartAllPanel')
          .css('width', labelWidth > 0 ? labelWidth + 'px' : '');

        $('#foldAllCart').parent()
          .css('margin-right', visWidth + 1);
      }
    });
}

var triggerImageCartHeaderAnimation;

function initCart()
{
  var scope = BrainSlices.scope;

  triggerImageCartHeaderAnimation = function(value)
  {
    console.log('triggerImageCartHeaderAnimation');
    if (scope.get('cart'))
    {
      animateImageCartHeader();
    }
  }

  scope
    .registerChange(function(value)
    {
      var $cart = $('#imageCart');
      var $panels = $('#panels');
      function complete()
      {
        switch (scope.get('interfaceMode'))
        {
          case 'visualise':
            stacks.resize();
            break;

          case 'browse':
            $('#searchResults')
              .children('.search-row')
                .children('.image-details')
                  .folder('requestUpdate')
                  .folder('refresh');
            break;

          default:
            break;
        }
      }

      if (value)
      {
        var cartWidth = Math.round(0.5 * $('#main').width());
        $('#btn_cart').addClass('selected');
        $cart.show(0, function()
        {
          $panels
            .animate(
            {
              right: cartWidth + 'px'
            },
            {
              queue: false,
              complete: complete
            });
          $cart
            .animate(
            {
              width: cartWidth + 'px'
            },
            {
              queue: false,
              complete:
              function()
              {
                animateImageCartHeader();
                $('#layerList')
                  .children('.layer-row')
                    .children('.image-details')
                      .folder('requestUpdate');
                //layerManager.doLazyRefresh();
              }
            });
        });
      }
      else
      {
        $('#btn_cart').removeClass('selected');
        $cart
          .animate(
          {
            width: 0
          },
          {
            queue: false,
            complete:
            function()
            {
              $cart.hide(0);
            }
          });
        $panels
          .animate(
          {
            right: 0
          },
          {
            queue: false,
            complete: complete
          });
      }

      state.cart = value; // XXX obsolete
    }, 'cart')
    .registerChange(function(value)
    {
      if (value)
      {
        $('#cartHeaderToggle').find('span.fa')
          .removeClass('fa-angle-double-down')
          .addClass('fa-angle-double-up');

      }
      else
      {
        $('#cartHeaderToggle').find('span.fa')
          .removeClass('fa-angle-double-up')
          .addClass('fa-angle-double-down');
      }

      animateImageCartHeader();

    }, 'cartHeader')
    .registerChange(triggerImageCartHeaderAnimation, 'grid_dims')
    .registerChange(triggerImageCartHeaderAnimation, 'editMode')
    .registerChange(function(value)
    {
      var todo = value ? 'fold' : 'unfold';
      $('#layerList').find('.has-folder-widget')
        .folder(todo);

     triggerImageCartHeaderAnimation();

      $('#foldAllCart').val(todo);
    }, 'allFoldedCart');

  $('#foldAllCart').change(function()
  {
    scope.set('allFoldedCart', $(this).val() == 'fold');
  });

  $('#cartHeaderToggle')
    .tooltip(BrainSlices.gui.tooltip)
    .click(scope.getToggle('cartHeader'));


  $('#btn_cart')
    .tooltip(BrainSlices.gui.tooltip)
    .click(scope.getToggle('cart'));

  $('#imageCartBody').scroll(function()
  {
    layerManager.doLazyRefresh();
  });

  $(window).resize(function()
  {
    if (scope.get('cart'))
    {
      animateImageCartHeader();
    }
  });

  layerManager = new CLayerManager($('#layerList'),
                                   stacks,
                                   loginConsole,
  {
    addTileLayer:
    function(id, info, postponeUpdate, zIndex, onsuccess, onfailure, isvalid)
    {
      if (zIndex == null)
      {
        zIndex = 0;
      }

      var thisInstance = this;

      function onremove()
      {
        thisInstance.tableManager.remove(id);
        animateImageCartHeader();
      }

      var image = null;
      var path = '/images/' + id;

      if (this.has(id)) return;


      // making the layer-related row
      var $rowWrapper = $('<div>')
        .addClass('layer-row-wrapper');
      var $row = $('<div>')
        .addClass('layer-row')
        .appendTo($rowWrapper);
      var $rowWrapper
      var $drag = $('<div>')
        .attr('draggable', 'true')
        .addClass('label-column')
        .appendTo($row);

      var dragMIME = [];

      // visibility interface
      var $visibility = $('<div>')
        .addClass('visible-column')
        .appendTo($row);


      //adjustment

      var onAdjustPostponed = null;
      var onUpdatePostponed = null;
      function onUpdate()
      {
        if (onUpdatePostponed) onUpdatePostponed(this.info);
      }

      function onAdjust(adjusted)
      {
        if (onAdjustPostponed) onAdjustPostponed(adjusted);
      }


      this.addTileLayer(id, $rowWrapper, //$.merge($row, $searchRow),
                        $visibility, zIndex, dragMIME,
                        function()
                        {
                          privilegeManager.remove(id);
                          propertiesManager.removeImage(id);
                        },
                        path, info, !postponeUpdate,
                        function(img)
                        {
                          image = img;

                          var url = document.createElement('a');
                          url.href = '/?show=' + img.info.iid + ':'
                                     + img.info.md5;
                          dragMIME.push(['text/plain', url]);
                          dragMIME.push(['text/uri-list', url]);

                          if (onsuccess) onsuccess();

                          var privileges = img.info.privileges;
                          var privilegeItem = [img.info.iid,
                                               [privileges.publicView,
                                                privileges.publicEdit,
                                                privileges.publicAnnotate,
                                                privileges.publicOutline],
                                               []];
                          
                          var $publicView = $('<input>')
                            .attr('type', 'checkbox');
                          var $publicEdit = $('<input>')
                            .attr('type', 'checkbox');
                          //var $publicOutline = $('<input>')
                          //  .attr('type', 'checkbox');
                          var $publicAnnotate = $('<input>')
                            .attr('type', 'checkbox');

                          privilegeManager.add(privilegeItem, $drag, function(privilege)
                          {
                            $publicView.prop('checked', privilege.view);
                            $publicEdit.prop('checked', privilege.edit);
                            $publicAnnotate.prop('checked', privilege.annotate);
                            //$publicOutline.prop('checked', privilege.outline);
                          });

                          var $propertiesEdit = $('<ul>');
                          var $propertiesView = $('<ul>');
                          var $nameView = $('<h1>');
                          var $descriptionView = $('<p>');

                          var imagePropertyTriggers = Object.create(PImagePropertyTriggers);
                          imagePropertyTriggers.data =
                          {
                            $row: $drag,
                            $inList: $propertiesEdit,
                            $outList: $propertiesView,
                            fixedOut:
                            {
                              name: $nameView,
                              description: $descriptionView
                            }
                          }
                          propertiesManager
                            .addImage(id, imagePropertyTriggers,
                                      img.info.properties);

                          //delete img.info.properties;


                          var $status =
                            $('<select>')
                              .append($('<option>')
                                  .text('Processed')
                                  .attr('value', '6'))
                                .append($('<option>')
                                  .text('Accepted')
                                  .attr('value', '7'))
                              .addClass('managementPanelStatus selectWrapper')
                              .val(image.info.status)
                              .change(function()
                              {
                                image.updateStatus(parseInt($status.val()), false);
                              })
                          var rowElements;

                          function toPostpone()
                          {
                            var $download = makeBasicDetails(img.info, $drag);
                            $drag
                              .append($nameView
                                .addClass('image-details'))
                              .append($descriptionView
                                .addClass('image-description image-details'))
                              .append($propertiesView
                                .addClass('image-details'));

                            rowElements =
                            {
                              $download: $download,
                              $div: $drag,
                              $name: $nameView,
                              $description: $descriptionView,
                              $properties: $propertiesView,
                              $annotate: $('<span>')
                                .append($propertiesEdit)
                                .append(makeAddPropertyPanel(
                                {
                                  Add:
                                  function(name, property)
                                  {
                                    if (propertiesManager.has(id, name))
                                    {
                                      alertWindow.error('Property already defined.');
                                      return;
                                    }
                                    propertiesManager.autoAdd(id, name, property);
                                  }
                                }))
                                .appendTo($drag),
                              $separator: $('<div>')
                                .addClass('column-separator')
                                .appendTo($row),

                              $reset: $('<span>')
                                .addClass('fa fa-reply-all layer-reset-button')
                                .attr('title', 'reset')
                                .css('display', 'none')
                                .tooltip(BrainSlices.gui.tooltip)
                                .click(function()
                                {
                                  switch (scope.get('editMode'))
                                  {
                                    case 'adjust':
                                      image.resetImage();
                                      break;

                                    case 'manage':
                                      image.resetStatus();
                                      //TODO: delete
                                      break;

                                    case 'properties':
                                      propertiesManager.reset(id);
                                      break;

                                    case 'privileges':
                                      privilegeManager.reset(id);
                                      break;

                                    default:
                                      console.error(scope.get('editMode'));
                                  }
                                })
                                .appendTo($drag),

                              $management: $('<div>')
                                .addClass('managementPanel')
                                .append($('<label>')
                                  .addClass('managementPanelStatus')
                                  .append($('<div>')
                                    .addClass('selectWrapper')
                                    .append($status)))
                                .appendTo($drag)

                            };

                            rowElements.$privileges = $('<div>')
                              .addClass('privilegePanel')
                              .append($('<label>')
                                .append($publicView
                                  .change(function()
                                  {
                                    privilegeManager.changePublic(id, this.checked);
                                  }))
                                .append('view'))
                              .append($('<label>')
                                .append($publicEdit
                                  .change(function()
                                  {
                                    privilegeManager.changePublic(id, null, this.checked);
                                  }))
                                .append('edit'))
                              .append($('<label>')
                                .append($publicAnnotate
                                  .change(function()
                                  {
                                    privilegeManager.changePublic(id, null, null, this.checked);
                                  }))
                                .append('annotate'))
                              //.append($('<label>')
                              //  .append($publicOutline
                              //    .change(function()
                              //    {
                              //      privilegeManager.changePublic(id, null, null, null, this.checked);
                              //    }))
                              //  .append('outline'))
                              .appendTo($drag);

                            rowElements.$adjustment =
                              makeAdjustmentPanel(
                                $drag, id, image, thisInstance,
                                function(onUpdate, onAdjust)
                                {
                                  onUpdatePostponed = function(info)
                                  {
                                    $status.val(info.status);
                                    onUpdate(info);
                                  };
                                  onAdjustPostponed = onAdjust;
                                });

                            //removal
                            $drag
                              .folder(
                              {
                                fit: true,
                                folded: scope.get('allFoldedCart'),
                                onclick: triggerImageCartHeaderAnimation//,
//                                $parent: $row
                              })
                              .append($('<span>')
                                .addClass('layer-delete-button fa fa-times')
                                .attr('title', 'remove from cart')
                                .tooltip(BrainSlices.gui.tooltip)
                                .click(onremove));


                          }

                          thisInstance.tableManager.addLazyRefresh(id, toPostpone);
                          thisInstance.tableManager.addLazyRefresh(id, function()
                          {
                            var editMode = scope.get('editMode');
                            if (editMode != rowElements.editMode)
                            {
                               $drag.folder('requestUpdate');
                               rowElements.editMode = editMode;
                            }

                            $drag
                              .removeClass('adjustmentVisible propertiesVisible privilegesVisible managementVisible');
                            switch (editMode)
                            {
                              case 'details':
                                rowElements.$management.css('display', 'none');
                                rowElements.$adjustment.css('display', 'none');
                                rowElements.$privileges.css('display', 'none');
                                rowElements.$annotate.css('display', 'none');
                                rowElements.$reset.css('display', 'none');

                                rowElements.$properties.css('display', '');
                                rowElements.$name.css('display', '');
                                rowElements.$download.css('display', '');
                                $drag.addClass('propertiesVisible');
                                break;

                              case 'manage':
                                rowElements.$properties.css('display', 'none');
                                rowElements.$adjustment.css('display', 'none');
                                rowElements.$privileges.css('display', 'none');
                                rowElements.$annotate.css('display', 'none');
                                rowElements.$reset.css('display', 'none');
                                if (image.info.editPrivilege > 0)
                                {
                                  rowElements.$management.css('display', '');
                                }
                                $drag.addClass('managementVisible');
                                break;

                              case 'adjust':
                                rowElements.$management.css('display', 'none');
                                rowElements.$properties.css('display', 'none');
                                rowElements.$privileges.css('display', 'none');
                                rowElements.$annotate.css('display', 'none');
                                rowElements.$download.css('display', 'none');
                                if (image.info.editPrivilege > 0)
                                {
                                  rowElements.$adjustment.css('display', '');
                                  rowElements.$reset.css('display', '');
                                }
                                else
                                {
                                  rowElements.$reset.css('display', 'none');
                                }
                                $drag.addClass('adjustmentVisible');
                                break;

                              case 'privileges':
                                rowElements.$properties.css('display', 'none');
                                rowElements.$adjustment.css('display', 'none');
                                rowElements.$management.css('display', 'none');
                                rowElements.$annotate.css('display', 'none');
                                rowElements.$download.css('display', 'none');
                                if (image.info.editPrivilege > 0)
                                {
                                  rowElements.$privileges.css('display', '');
                                  rowElements.$reset.css('display', '');
                                }
                                else
                                {
                                  rowElements.$reset.css('display', 'none');
                                }
                                $drag.addClass('privilegesVisible');
                                break;

                              case 'properties':
                                rowElements.$properties.css('display', 'none');
                                rowElements.$management.css('display', 'none');
                                rowElements.$adjustment.css('display', 'none');
                                rowElements.$privileges.css('display', 'none');
                                rowElements.$name.css('display', 'none');
                                rowElements.$download.css('display', 'none');
                                if (image.info.annotatePrivilege > 0)
                                {
                                  rowElements.$annotate.css('display', '');
                                  rowElements.$reset.css('display', '');
                                }
                                else
                                {
                                  rowElements.$reset.css('display', 'none');
                                }
                                $drag.addClass('propertiesVisible');
                                break;
                            }

                            var visWidth = Math.max(scope.get('grid_dims').x * 21, 65);
                            rowElements.$separator
                              .css('right', visWidth + 'px');
                            $visibility.width(visWidth);
                            var labelWidth = $row.width() - visWidth - 1;
                            if (labelWidth != $drag.width())
                            {
                              $drag
                                .width($row.width() - visWidth - 1)
                                .folder('forceRefresh');
                            }
                            else
                            {
                              $drag.folder('refresh');
                            }
                          }, true);

                          if (!postponeUpdate)
                          {
                            thisInstance.doLazyRefresh();
                          }
                        },
                        onfailure, isvalid, onUpdate, onAdjust,
                        $drag);
      

      return id;
    }
  },
  $('#imageCartBody'));
  layerManager.add(null, null, $('#loadAllPanel'));

  $('#imageCart')
    .bind('dragover', function(ev)
    {
      ev.originalEvent.preventDefault();
    })
    .bind('drop', function(ev)
    {
      var dataTransfer = ev.originalEvent.dataTransfer;
      var id = dataTransfer.getData('IID');
      if (dataTransfer.getData('TYPE') != 'searchResults' ||
          ! (id in searchResultsMapping)) return;

      layerManager.autoAddTileLayer(id, searchResultsMapping[id]);
      animateImageCartHeader();
    });
}

function initCartFinish(state)
{
  BrainSlices.scope
    .set('cart', state.cart)
    .set('cartHeader', false)
    .set('allFoldedCart', true);

  $('#emptyCart')
    .tooltip(BrainSlices.gui.tooltip)
    .click(function()
    {
      layerManager.flush();
      animateImageCartHeader();
    });
}
