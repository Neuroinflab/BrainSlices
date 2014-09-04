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

console.debug(img)
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
                            console.debug(privilege);
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

                            rowElements =
                            {
                              $div: $drag,
                              $name: $nameView,
                              $description: $descriptionView,
                              $properties: $propertiesView
                            };

                            makeBasicDetails(img.info, $drag)
                              .append($nameView
                                .addClass('image-details'))
                              .append($descriptionView
                                .addClass('image-description image-details'))
                              .append($propertiesView
                                .addClass('image-dateils'));

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
                              rowElements.$properties.hide(0);
                              switch (scope.get('editMode'))
                              {
                                case 'adjust':
                                  rowElements.$privileges.hide(0);
                                  if (image.info.editPrivilege > 0)
                                  {
                                    $adjustment.show(0);
                                  }
                                  break;
                                case 'privileges':
                                  $adjustment.hide();
                                  if (image.info.editPrivilege > 0)
                                  {
                                    rowElements.$privileges.show(0);
                                  }
                                  break;
                                case 'properties':
                                  $adjustment.hide();
                                  rowElements.$privileges.hide(0);
                                  if (image.info.annotatePrivilege > 0)
                                  {
                                  }
                                  break
                              }
                            }
                            else
                            {
                              $adjustment.hide(0);
                              rowElements.$privileges.hide(0);
                              rowElements.$properties.show(0);
                              rowElements.$name.show(0);
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
