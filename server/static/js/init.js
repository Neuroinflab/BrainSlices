

var loginConsole = null;
var images = null;
var stacks = null;
var layerManager = null;
var searchEngine = null;
var alertWindow = null; 
var waitWindow = null;

var state = {iids: [],
             shape: [1, 1],
             loaded: [[]],
             focus: [[0., 0.]],
             display: 'matrix',
             sync: true,
             zoom: 1.,
             'interface': 'home',
             cart: false,
             filters: true};

$(function()
{
  var scope = BrainSlices.scope;
  scope
    .registerChange(function(value)
    {
      $('#panels>div').hide(0);

      $('#navbarMiddle>div').hide(0);
      $('#navbar .panelButton').removeClass('selected');

      switch (value)
      {
        case 'home':
          $('#homePanel').show(0);
          break;

        case 'browse':
          $('#browsePanel').show(0);
          $('#navbarBrowse').show(0);
          //$('#searchResults>div').folder('refresh');
          //$('.basket-visible #searchImageBasketList>div').folder('refresh');
          //$('#browsePanel .search-content-wrapper>div').folder('refresh');
          break;

        case 'visualise':
          $('#visualisePanel').show(0);
          $('#navbarVisualise').show(0);
          stacks.resize();
          break;

        case 'upload':
          $('#uploadPanel').show(0);
          break;

        case 'user':
          $('#userPanel').show(0);
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
  initUpload();
  initUser();

  alertWindow = new BrainSlices.gui.CMessage($('#alertWindow'));
  waitWindow = new BrainSlices.gui.CMessage($('#waitWindow'));

  // a nice trick
  scope
    .registerChange(function(login)
    {
      if (login == null)
      {
        $('#userPanelButton').hide(0);
        $('#uploadPanelButton').hide(0);
        if (scope.get('interfaceMode') in {upload: null,
                                           user: null})
        {
          scope.set('interfaceMode', 'home');
        }
      }
      else
      {
        $('#userPanelButton').show(0);
        $('#uploadPanelButton').show(0);
        $('.userLogin').text(login);
      }
    }, 'login');

  loginConsole = new BrainSlices.ajax.CUserPanel($('#loginWindow'),
                                                 $('#btn_login'),
                                                 $('#btn_logout'),
                                                 function()
                                                 {
                                                   scope.set('login', loginConsole.isLoggedAs());
                                                 },
                                                 scope.getCallback('login', null),
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

    initCartFinish(state);
    initVisualiseFinish(state);
    initUserFinish(state);
    initUploadFinish();

    var loadImageI = 0;
    var loadedImages = [];
    var imageLoadErrors = [];

    function loadNextImage()
    {
      if (loadImageI < state.iids.length)
      {
        var imageI = loadImageI++;
        var pair = state.iids[imageI];
        var id = pair[0];
        var md5 = pair[1].toLowerCase();

        id = layerManager
          .autoAddTileLayer(id, null, true, state.iids.length - imageI - 1,
                            loadNextImage,
                            function(msg)
                            {
                              imageLoadErrors.push(msg);
                              loadedImages[imageI] = null;
                              loadNextImage();
                            },
                            function(info)
                            {
                              if (info.md5.toLowerCase() != md5)
                              {
                                imageLoadErrors.push('Image of iid ' + info.iid + ' has been changed.')
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
        if (imageLoadErrors.length > 0)
        {
          alertWindow.error(imageLoadErrors.join('<br>'));
        }

        layerManager.updateOrder();
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
    scope.set('filters', state.filters);
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
  stacks = new BrainSlices.api.CSynchronizedStacksDisplay($('#visualisePanel'), 1, 1,
                                          null, null, null, null, null, null, null,
                                          '/static/gfx', images);
  initCart();
  initBrowseFinish();
});

