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
        if (scope.get('interfaceMode') == 'visualise')
        {
          stacks.resize();
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
              complete:
              function()
              {
                $('#layerList')
                  .children('.layer-row')
                    .children('.image-details')
                      .folder('refresh');

                switch (scope.get('interfaceMode'))
                {
                  case 'visualise':
                    stacks.resize();
                    break;

                  case 'browse':
                    $('#searchResults')
                      .children('.search-row')
                        .children('.image-details')
                          .folder('refresh');
                    break;

                  default:
                    break;
                }
              }
            });
          $cart
            .animate(
            {
              width: cartWidth + 'px'
            },
            {
              queue: false
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

  layerManager = new CLayerManager($('#layerList'),
                                   //$.merge($('#layerList'),
                                   //        $('#searchImageBasketList')),
                                   stacks,
                                   loginConsole,
  {
    addTileLayer:
    function(id, info, postponeUpdate, zIndex, onsuccess, onfailure, isvalid)
    {
      var thisInstance = this;

      function onremove()
      {
        thisInstance.tableManager.remove(id);
      }
//      var $rem = $('<span class="layer-delete-button fa fa-times"></span>')
//        .bind('click', onremove);
//        
//      var $searchRow = $('<div draggable="true"></div>')
//        .append($('<div>').addClass('description-buttons-placeholder'))
//        .append($rem);

      var image = null;
      var path = '/images/' + id;

      if (this.has(id)) return;


      // making the layer-related row
      var $row =  $('<div>')
        .addClass('layer-row');
      $drag = $('<div draggable="true"></div>')
        .addClass('label-column')
        .appendTo($row);

      var dragMIME = [];

    //  $row.append(
    //    $('<div>')
    //      .addClass('label-column')
    //      .append($drag));


      // visibility interface
      var $visibility = $('<div>')
        .addClass('visible-column');
      $row.append($visibility);


      //adjustment
      var $adjust = $('<input type="checkbox">');
      var $iface = $('<span style="display: none;">' +
                      '<input type="number" class="imageLeft">' +
                      '<input type="number" class="imageTop">' +
                      '<input type="number" class="pixelSize">' +
                      '<select name="status">' +
                       '<option value="6">Completed</option>' +
                       '<option value="7">Accepted</option>' +
                      '</select>' +
                     '</span>');

      $adjust.bind('change', function()
      {
        if ($adjust.filter(':checked').length  != 0)
        {
          $iface.show(0);
          thisInstance.images.startAdjustment(id);
        }
        else
        {
          $iface.hide(0);
          thisInstance.images.stopAdjustment(id);
        }
      });

      $iface.find('input').bind('change', function()
      {
        if (image)
        {
          var imageLeft = parseFloat($iface.find('input.imageLeft').val());
          var imageTop = parseFloat($iface.find('input.imageTop').val());
          var pixelSize = parseFloat($iface.find('input.pixelSize').val());
          image.updateInfo(imageLeft, imageTop, pixelSize, null, false);
        }
      });

      $iface.find('select[name="status"]').bind('change', function()
      {
        if (image)
        {
          var status = parseInt($iface.find('select[name="status"]').val());
          image.updateInfo(null, null, null, status, false);
        }
      });

      function onUpdate()
      {
        var info = this.info;
        $iface.find('input.imageLeft').val(info.imageLeft);
        $iface.find('input.imageTop').val(info.imageTop);
        $iface.find('input.pixelSize').val(info.pixelSize);
        $iface.find('select[name="status"]').val(info.status);
      }

      $row.append(
        $('<div>')
          .append($adjust)
          .append($iface)
          .addClass('adjust-column'));

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
                          
                          detailsGenerator(img.info, $drag)
                            .folder({fit: true});
                          $row
                            .append($('<a>')
                              .addClass('fa fa-arrow-circle-o-down layer-download-button')
                              .attr(
                              {
                                href: path + '/image.png',
                                download: ''
                              }));
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
