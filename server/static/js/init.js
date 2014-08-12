

var loginConsole = null;
var images = null;
var stacks = null;
var layerManager = null;
var searchEngine = null;
var alertWindow = null; 

var state = {iids: [],
             shape: [1, 1],
             loaded: [[]],
             focus: [[0., 0.]],
             display: 'matrix',
             sync: true,
             zoom: 1.,
             'interface': 'home',
             cart: false};

$(function()
{
  var scope = BrainSlices.scope;
  scope
    .registerChange(function(value)
    {
      if (value)
      {
        $('#btn_cart').addClass('selected');
      }
      else
      {
        $('#btn_cart').removeClass('selected');
      }

      state.cart = value; // XXX obsolete
    }, 'cart')
    .registerChange(function(value)
    {
      $('#main>div').hide();
      $('#navbarMiddle>div').hide();
      $('#navbar .panelButton').removeClass('selected');
      switch (value)
      {
        case 'home':
          $('#homePanel').show();
          break;

        case 'browse':
          $('#browsePanel').show();
          $('#navbarBrowse').show();
          $('#searchResults>div').folder('refresh');
          $('.basket-visible #searchImageBasketList>div').folder('refresh');
          //$('#browsePanel .search-content-wrapper>div').folder('refresh');
          break;

        case 'visualise':
          $('#visualisePanel').show();
          $('#navbarVisualise').show();
          stacks.resize();
          break;

        case 'upload':
          $('#uploadPanel').show();
          break;

        case 'user':
          $('#userPanel').show();
          break;

        default:
          console.error('Unknown interface mode: ' + value);
          return;
      }
      state.interface = value; // XXX: obsoleted

      $('#' + value + 'PanelButton').addClass('selected');
    }, 'interfaceMode')
    .set('interfaceMode', 'home');


  $('#homePanelButton').click(scope.getCallback('interfaceMode', 'home'));
  $('#browsePanelButton').click(scope.getCallback('interfaceMode', 'browse'));
  $('#visualisePanelButton').click(scope.getCallback('interfaceMode', 'visualise'));
  $('#uploadPanelButton').click(scope.getCallback('interfaceMode', 'upload'));
  $('#userPanelButton').click(scope.getCallback('interfaceMode', 'user'));

  initVisualise();
  initBrowse();
  initUser();

  $('#btn_cart').click(function()
  {
    scope.set('cart', !scope.get('cart'));
  });

  alertWindow = new BrainSlices.gui.CMessage($('#alertWindow'));
  loginConsole = new BrainSlices.ajax.CUserPanel($('#loginWindow'),
                                                 $('#btn_login'),
                                                 $('#btn_logout'),
                                                 function(login)
                                                 {
                                                   $('#userPanelButton').show();
                                                   $('#uploadPanelButton').show();
                                                   $('.userLogin').text(loginConsole.isLoggedAs());
                                                 },
                                                 function()
                                                 {
                                                   $('#userPanelButton').hide();
                                                   $('#uploadPanelButton').hide();
                                                   if (scope.get('interfaceMode') in {upload: null,
                                                                                      user: null})
                                                   {
                                                     scope.set('interfaceMode', 'home');
                                                   }
                                                 },
                                                 function()
  {
    /* login state is known here :-D  */
    /**********************************************/

    if (window.location.search != '')
    {
      var tmp = parseState(window.location.search.substring(1));
      for (var name in tmp)
      {
        state[name] = tmp[name];
      }
    }

    initVisualiseFinish(state);
    initUserFinish(state);

    var loadImageI = 0;
    var loadedImages = [];
    function loadNextImage()
    {
      if (loadImageI < state.iids.length)
      {
        var imageI = loadImageI++;
        var pair = state.iids[imageI];
        var id = pair[0];
        var md5 = pair[1].toLowerCase();

        id = layerManager.autoAddTileLayer(id, null, state.iids.length - imageI - 1,
                                           '#'+id, loadNextImage,
                                       function(msg)
                                       {
                                         alert(msg);
                                         loadedImages[imageI] = null;
                                         loadNextImage();
                                       },
                                       function(info)
                                       {
                                         if (info.md5.toLowerCase() != md5)
                                         {
                                           alert('Image of iid ' + info.iid + ' has been changed.')
                                           loadedImages[imageI] = null;
                                           loadNextImage();
                                           return false;
                                         }
                                         return true;
                                       });
        loadedImages.push(id);
      }
      else
      {
        for (var i = 0; i < state.loaded.length; i++)
        {
          var loaded = state.loaded[i];
          for (var j = 0; j < loaded.length; j++)
          {
            var id = loadedImages[loaded[j]];
            if (id != null)
            {
              layerManager.load(i, id);
            }
          }
        }
      }
    }

    loadNextImage();


    loginConsole.ajax('/meta/getPropertyList',
                      function(data)
                      {
                        if (data.status)
                        {
                          var enumerated = data.data[1];

                          $('#newFilter').newpropertyfilter(
                          {
                            source: data.data[0],
                            enumerated: enumerated,
                            submit: function(name, type, filter)
                            {
                              if (name != null && searchEngine.has(name))
                              {
                                alert('Property ' + name + ' already selected.');
                              }
                              else
                              {
                                searchEngine.autoAdd(name, type, filter);
                              }
                            }
                          });

                        }
                        else
                        {
                          alert(data.message);
                        }
                      });


    scope.set('interfaceMode', state.interface);
    scope.set('cart', state.cart);
  },
  null,
  function (response)
  {
    if (response.status)
    {
      alertWindow.success(response.message);
      loginConsole.hidePanel()
      loginConsole.showLoginForm();
      scope.set('interfaceMode', 'user');
    }
    else
    {
      loginConsole.showConfirmationForm(null, null, null, response.message);
      loginConsole.showPanel();
    }
  });


  images = new BrainSlices.api.CImageManager(loginConsole);
  stacks = new BrainSlices.api.CSynchronizedStacksDisplay($('#sliceDisplay'), 1, 1,
                                          null, null, null, null, null, null, null,
                                          '/static/gfx', images);
  layerManager = new CLayerManager($.merge($('#layersConsoleTable tbody'),
                                           $('#searchImageBasketList')),
                                   stacks,
                                   loginConsole,
  {
    addTileLayer:
    function(id, info, zIndex, label, onsuccess, onfailure, isvalid)
    {
      var thisInstance = this;

      var onremove = function()
      {
        thisInstance.tableManager.remove(id);
      }
      var $rem = $('<span class="layer-delete-button fa fa-times"></span>')
        .bind('click', onremove);
        
      var $searchRow = $('<div draggable="true"></div>')
        .append($rem);

      var image = null;
      var path = '/images/' + id;

      if (this.has(id)) return;


      // making the layer-related row
      var $row =  $('<tr></tr>');
      $drag = $('<td draggable="true">' + label + '</td>');//XXX .append(label) ?
      var dragMIME = [];

      $row.append($drag);

      // download link
      $row.append('<td><a href="' + path + '/image.png"><span class="layer-download-button fa fa-arrow-circle-o-down"</span></a></td>');

      // visibility interface
      var $visibility = $('<td></td>');
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
          $iface.show();
          thisInstance.images.startAdjustment(id);
        }
        else
        {
          $iface.hide();
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

      $row.append($('<td></td>').append($adjust).append($iface));

      //removal
      $rem = $('<span class="layer-delete-button fa fa-times"></span>');
      $rem.bind('click', onremove);
      $row.append($('<td></td>').append($rem));

      this.addTileLayer(id, $.merge($row, $searchRow),
                        $visibility, zIndex, dragMIME,
                        null,
                        path, info, true,
                        function(img)
                        {
                          console.log('on success handler');
                          console.debug(img);

                          image = img;

                          var url = document.createElement('a');
                          url.href = '/?show=' + img.info.iid + ':'
                                     + img.info.md5;
                          dragMIME.push(['text/plain', url]);
                          dragMIME.push(['text/uri-list', url]);

                          if (onsuccess) onsuccess();
                          
                          detailsGenerator(img.info, $searchRow);
                        },
                        onfailure, isvalid, onUpdate);
      

      return id;
    }
  });

  initBrowseFinish();
});



