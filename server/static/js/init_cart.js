var makeAddPropertyPanel;
var updatePropertySuggestions;

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
    var suggestedEnumerated = [];
    var typeOptions = {};
    //var inSelect = false;
  
    function nameChanged()
    {
      //if (inSelect) return;
      var name = $name.val().trim().toLowerCase();
      console.debug(name);
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
  
            case 'e':
              suggestedEnumerated = name in enumeratedProperties ?
                                    enumeratedProperties[name] : [];
              break;
  
            default:
              break;
          }
        }
        $options.addClass('suggested-type');
      }
    }
  
    function source(request, response)
    {
      var suggestions = [];
      var filter = new RegExp(
        $.ui.autocomplete.escapeRegex(request.term), 'i');
  
      $.each(suggestedEnumerated, function(i, v)
      {
        if (!request.term || filter.test(v))
        {
          suggestions.push(v);
        }
      });
  
      response(suggestions);
    }
  
    var $name = $('<input>')
      .attr('type', 'text')
      .appendTo($addPanel)
      .combobox(
      {
        source:
        function(request, response)
        {
          var suggestions = [];
          var filter = new RegExp(
            $.ui.autocomplete.escapeRegex(request.term), 'i');
          for (var name in suggestedProperties)
          {
            if (!request.term || filter.test(name))
            {
              suggestions.push(name);
            }
          }

          response(suggestions);
        }
      })
      .on('comboboxchange', nameChanged)
      .on('comboboxselect', function(event, ui)
      {
        //inSelect = true;
        $name.val(ui.item.value).blur();
        //inSelect = false;
        nameChanged();
      });
 
    var $type = $('<select>')
      .append(TYPES.map(makeTypeOption, typeOptions))
      .change(function()
      {
        var type = $type.val();
        for (var t in inputBases)
        {
          inputBases[t][t == type ? 'show' : 'hide'](0);
        }
      })
      .appendTo($addPanel);

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
        .attr('type', 'text')
        .css('display', 'none'),
      e: $('<input>')
        .attr('type', 'text'),
      x: $('<textarea>')
        .css('display', 'none')
    };

    var inputBases = Object.create(inputs);
    inputBases.e = $('<span>')
      .css('display', 'none')
      .append(inputs.e
        .combobox(
        {
          source: source
        }));

    for (var t in inputBases)
    {
      inputBases[t].appendTo($addPanel);
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

            console.debug(type, inputs);

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
    var data = {};

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
      .text(name)
      .appendTo(this.data.$inList);
    data.$inRow = $inRow;

    if (type != 't')
    {
      var $input;
      switch (type)
      {
        case 'x':
          $input = $('<textarea>');
          break;

        case 's':
        case 'e':
          $input = $('<input>')
            .attr('type', 'text');
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
              })
        .appendTo($inRow.append(': '));

      if (type == 'e')
      {
        $input
        .combobox(
        {
          source:
          function(request, response)
          {
            var suggestions = [];
            if (name in enumeratedProperties)
            {
              var filter = new RegExp(
                $.ui.autocomplete.escapeRegex(request.term), 'i');

              $.each(enumeratedProperties[name], function(i, v)
              {
                if (!request.term || filter.test(v))
                {
                  suggestions.push(v);
                }
              });
            }
            response(suggestions);
          }
        });
      }
      data.$input = $input;
    }

    $('<button>')
      .text('X')
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
    if (this.data.$inRow) this.data.$inRow.remove();

    if (this.data.$outRow) this.data.$outRow.remove();
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
      if (this.data.$row) this.data.$row.show(0);
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


function initCart()
{
  var scope = BrainSlices.scope;
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
                $('#layerList')
                  .children('.layer-row')
                    .children('.image-details')
                      .folder('requestUpdate');
                layerManager.doLazyRefresh();
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
    }, 'cart');


  $('#btn_cart').click(scope.getToggle('cart'));

  var $layerList = $('#layerList');

  $layerList.scroll(function()
  {
    console.log('scroll');
    layerManager.doLazyRefresh();
  });

  $(window).resize(function()
  {
    if (scope.get('cart'))
    {
      layerManager.doLazyRefresh();
    }
  });

  layerManager = new CLayerManager($layerList,
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
      }

      var image = null;
      var path = '/images/' + id;

      if (this.has(id)) return;


      // making the layer-related row
      var $row =  $('<div>')
        .addClass('layer-row');
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
      var $adjustment = $('<div>');
      var $iface = $('<span>');
      var $adjust = $('<input>')
        .attr('type', 'checkbox');
      var $imageLeft = $('<input>');
      var $imageTop = $('<input>');
      var $pixelSize = $('<input>');
      var $status = $('<select>')
        .append($('<option>')
                 .text('Processed')
                 .attr('value', '6'))
        .append($('<option>')
                 .text('Accepted')
                 .attr('value', '7'));

      function onUpdate()
      {
        var info = this.info;
        $imageLeft.val(info.imageLeft);
        $imageTop.val(info.imageTop);
        $pixelSize.val(25400. / info.pixelSize);
        $status.val(info.status);
      }

      function onAdjust(adjusted)
      {
        $iface.css('display', adjusted ? '': 'none');
        $adjust.prop('checked', adjusted);
        try
        {
          $drag.folder('requestUpdate');
        }
        catch (err)
        {
          // throws error on first call
          //console.debug(err);
        }
      }


      this.addTileLayer(id, $row, //$.merge($row, $searchRow),
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
                          var $publicOutline = $('<input>')
                            .attr('type', 'checkbox');
                          var $publicAnnotate = $('<input>')
                            .attr('type', 'checkbox');

                          privilegeManager.add(privilegeItem, $drag, function(privilege)
                          {
                            $publicView.prop('checked', privilege.view);
                            $publicEdit.prop('checked', privilege.edit);
                            $publicOutline.prop('checked', privilege.outline);
                            $publicAnnotate.prop('checked', privilege.annotate);
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


                          var rowElements;

                          function toPostpone()
                          {
                            $adjustment
                              .addClass('adjustPanel')
                              .append($('<label>')
                                .addClass('adjustPanelAdjust')
                                .append($adjust
                                  .change(function()
                                  {
                                    if (this.checked)
                                    {
                                      $iface.show(0);
                                      thisInstance.images.startAdjustment(id);
                                    }
                                    else
                                    {
                                      $iface.hide(0);
                                      thisInstance.images.stopAdjustment(id);
                                    }

                                    thisInstance.doLazyRefresh();
                                  })))
                              .append($iface
                                .append($('<button>')
                                  .text('Reset')
                                  .click(function()
                                  {
                                    image.reset(true);
                                  }))
                                .append('<br>')
                                .append($('<label>')
                                  .addClass('adjustPanelLeft')
                                  .append($imageLeft
                                //    .addClass('imageLeft')
                                    .attr('type', 'number')
                                    .addClass('adjustPanel')
                                    .change(function()
                                    {
                                      image.updateInfo(parseFloat($imageLeft.val()), null, null, null, false);
                                    })))
                                .append($('<label>')
                                  .addClass('adjustPanelTop')
                                  .append($imageTop
                                  //  .addClass('imageTop')
                                    .attr('type', 'number')
                                    .addClass('adjustPanel')
                                    .change(function()
                                    {
                                      image.updateInfo(null, parseFloat($imageTop.val()), null, null, false);
                                    })))
                                .append('<br>')
                                .append($('<label>')
                                  .addClass('adjustPanelRes')
                                  .append($pixelSize
                                  //  .addClass('pixelSize')
                                    .attr('type', 'number')
                                    .addClass('adjustPanel')
                                    .change(function()
                                    {
                                      image.updateInfo(null, null, 25400. / parseFloat($pixelSize.val()), null, false);
                                    })))
                                .append('&nbsp;')
                                .append($('<label>')
                                  .addClass('adjustPanelStatus')
                                  .append($('<div>')
                                    .addClass('selectWrapper')
                                    .append($status
                                    //  .attr('name', 'status')
                                      .addClass('adjustPanelStatus selectWrapper')
                                      .change(function()
                                      {
                                        image.updateInfo(null, null, null, parseInt($status.val()), false);
                                      }))))
                                .append('<br>'));

                            makeBasicDetails(img.info, $drag)
                              .append($nameView
                                .addClass('image-details'))
                              .append($descriptionView
                                .addClass('image-description image-details'))
                              .append($propertiesView
                                .addClass('image-details'));

                            rowElements =
                            {
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
                                    console.log('add');
                                    if (propertiesManager.has(id, name))
                                    {
                                      alertWindow.error('Property already defined.');
                                      return;
                                    }
                                    propertiesManager.autoAdd(id, name, property);
                                  }
                                },
                                {
                                  Reset:
                                  function()
                                  {
                                    propertiesManager.reset(id);
                                  }
                                }))
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
                              .append($('<label>')
                                .append($publicOutline
                                  .change(function()
                                  {
                                    privilegeManager.changePublic(id, null, null, null, this.checked);
                                  }))
                                .append('outline'))
                              .appendTo($drag);

                            $drag
                              .append($adjustment)
                              .folder({fit: true});

                            //removal
                            $drag
                              .append($('<span>')
                                .addClass('layer-delete-button fa fa-times')
                                .click(onremove));


                          }

                          thisInstance.tableManager.addLazyRefresh(id, toPostpone);
                          thisInstance.tableManager.addLazyRefresh(id, function()
                          {
                            if (scope.get('edit'))
                            {
                              rowElements.$properties.css('display', 'none');
                              switch (scope.get('editMode'))
                              {
                                case 'adjust':
                                  rowElements.$privileges.css('display', 'none');
                                  rowElements.$annotate.css('display', 'none');
                                  if (image.info.editPrivilege > 0)
                                  {
                                    $adjustment.css('display', '');
                                  }
                                  break;
                                case 'privileges':
                                  $adjustment.css('display', 'none');
                                  rowElements.$annotate.css('display', 'none');
                                  if (image.info.editPrivilege > 0)
                                  {
                                    rowElements.$privileges.css('display', '');
                                  }
                                  break;
                                case 'properties':
                                  $adjustment.css('display', 'none');
                                  rowElements.$privileges.css('display', 'none');
                                  rowElements.$name.css('display', 'none');
                                  if (image.info.annotatePrivilege > 0)
                                  {
                                    rowElements.$annotate.css('display', '');
                                  }
                                  break
                              }
                            }
                            else
                            {
                              $adjustment.css('display', 'none');
                              rowElements.$privileges.css('display', 'none');
                              rowElements.$annotate.css('display', 'none');

                              rowElements.$properties.css('display', '');
                              rowElements.$name.css('display', '');
                            }

                            var visWidth = Math.max(scope.get('grid_dims').x * 20, 65);
                            $visibility.width(visWidth);
                            $drag
                              .width($row.width() - visWidth)
                              .folder('refresh');
                          }, true);

                          if (!postponeUpdate)
                          {
                            thisInstance.tableManager.doLazyRefresh();
                          }
                        },
                        onfailure, isvalid, onUpdate, onAdjust,
                        $drag);
      

      return id;
    }
  });
}

function initCartFinish(state)
{
  BrainSlices.scope.set('cart', state.cart);

  $('#emptyCart')
    .click(function()
    {
      layerManager.flush();
    });
}
