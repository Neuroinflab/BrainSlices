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
      var $drag = $('<div draggable="true"></div>')
        .addClass('label-column')
        .appendTo($row);

      var dragMIME = [];

      // visibility interface
      var $visibility = $('<div>')
        .addClass('visible-column')
        .appendTo($row);


      //adjustment
      var $adjustment = $('<div>')
        .addClass('adjust-column')
        .appendTo($row);
      var $imageLeft = $('<input>');
      var $imageTop = $('<input>');
      var $pixelSize = $('<input>');
      var $status = $('<select>');

      function onUpdate()
      {
        var info = this.info;
        $imageLeft.val(info.imageLeft);
        $imageTop.val(info.imageTop);
        $pixelSize.val(info.pixelSize);
        $status.val(info.status);
      }

      //removal
      $rem = $('<span class="layer-delete-button fa fa-times"></span>')
        .bind('click', onremove)
        .appendTo($row);

      this.addTileLayer(id, $row, //$.merge($row, $searchRow),
                        $visibility, zIndex, dragMIME,
                        null,
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

                          function toPostpone()
                          {
                            detailsGenerator(img.info, $drag)
                              .folder({fit: true});

      var adjusted = thisInstance.isAdjusted(id);

      $('<input>')
        .attr('type', 'checkbox')
        .prop('checked', adjusted)
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

          $drag.folder('requestUpdate');
          thisInstance.doLazyRefresh();
        })
        .appendTo($adjustment);

      var $iface = $('<span>')
        .css('display', adjusted ? '': 'none')
        .append($imageLeft
        //  .addClass('imageLeft')
          .attr('type', 'number')
          .change(function()
          {
            image.updateInfo(parseFloat($imageLeft.val()), null, null, null, false);
          }))
        .append($imageTop
        //  .addClass('imageTop')
          .attr('type', 'number')
          .change(function()
          {
            image.updateInfo(null, parseFloat($imageTop.val()), null, null, false);
          }))
        .append($pixelSize
        //  .addClass('pixelSize')
          .attr('type', 'number')
          .change(function()
          {
            image.updateInfo(null, null, parseFloat($pixelSize.val()), null, false);
          }))
        .append($status
        //  .attr('name', 'status')
          .append($('<option>')
                   .text('Processed')
                   .attr('value', '6'))
          .append($('<option>')
                   .text('Accepted')
                   .attr('value', '7'))
          .change(function()
          {
            image.updateInfo(null, null, null, parseInt($status.val()), false);
          }))
        .appendTo($adjustment);

                            $row
                              .append($('<a>')
                                .addClass('fa fa-arrow-circle-o-down layer-download-button')
                                .attr(
                                {
                                  href: path + '/image.png',
                                  download: ''
                                }));
                          }

                          if (postponeUpdate)
                          {
                            thisInstance.tableManager.addLazyRefresh(id, toPostpone);
                          }
                          else
                          {
                            toPostpone();
                          }

                          thisInstance.tableManager.addLazyRefresh(id, function()
                          {
                            $drag.folder('refresh');
                          }, true);
                        },
                        onfailure, isvalid, onUpdate);
      

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
