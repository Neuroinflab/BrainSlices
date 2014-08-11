
function rearrangeInterface()
{
  dims = BrainSlices.scope.get("grid_dims");
  var nx = dims.x;
  var ny = dims.y;
  var display = BrainSlices.scope.get("display");
  var width = display == 'matrix' ?
                         null :
                         parseInt(Math.max(100, 66 * nx / ny)) + '%';

  stacks.rearrange(nx, ny, width);
  layerManager.arrangeInterface();
}

function detailsGenerator(info, $div)
{
  var properties = info.properties;
  if (!$div)
  {
    $div = $('<div></div>');
  }

  // XXX: a hack :-/ //i have absolutly no idea why considered a hack?
  $div.append(BrainSlices.gui.getThumbnail(info.iid, info.imageWidth, info.imageHeight, 64, 64));
  if (properties)
  {
    properties = $.extend({}, properties);

    if ('name' in properties && properties.name.type != 't')
    {
      $div.append($('<h1></h1>').text(properties.name.value));
      delete properties.name;
    }

    if ('description' in properties && properties.description.type != 't')
    {
      $div.append($('<p class="image-description"></p>').text(properties.description.value));
      delete properties.description;
    }

    var names = [];
    for (var name in properties)
    {
      names.push(name);
    }

    if (names.length > 0)
    {
      names.sort();

      var $ul = $('<ul></ul>');
      $div.append($ul);

      for (var j = 0; j < names.length; j++)
      {
        var name = names[j];
        var $li = $('<li>' + name + '</li>');
        $ul.append($li);
        //$ul.append('<dt>' + name + '</dt>');
        var property = properties[name];
        switch (property.type)
        {
          case 's':
          case 'x':
          case 'e':
          case 'f':
          case 'i':
            //$ul.append('<dd>' + property.value + '</dd>');
            $li.append(': ' + property.value);
            break;

          case 't':
            //$ul.append('<dd>Tag</dd>');
            break;
        }
      }
    }
  }

  $div.folder();
  $div.children('img')
    .attr('draggable', 'true'); 
  ////$div.appendTo($parent);
  //if ($div.outerHeight() <= 85) // static height assumed
  //{
  //  return $div;
  //}

  //$div.addClass('folded');
  //var $fold = $('<div class="folding-button" style="display: none;"></div>')
  //  .appendTo($div)
  //  .click(function()
  //    {
  //      $fold.hide();
  //      $unfold.show();
  //      $div.removeClass('unfolded')
  //          .addClass('folded');
  //    });
  //var $unfold = $('<div class="unfolding-button"></div>')
  //  .appendTo($div)
  //  .click(function()
  //    {
  //      $unfold.hide();
  //      $fold.show();
  //      $div.removeClass('folded')
  //          .addClass('unfolded');
  //    });

  return $div;
}

var loginConsole = null;
var images = null;
var stacks = null;
var layerManager = null;
var searchEngine = null;

var state = {iids: [],
             shape: [1, 1],
             loaded: [[]],
             focus: [[0., 0.]],
             display: 'matrix',
             sync: true,
             zoom: 1.,
             'interface': 'home'};

$(function()
{
  var scope = BrainSlices.scope;
  scope.registerChange(function(variable, value)
  {
    if (variable == 'interfaceMode')
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
    }
  });


  $('#homePanelButton').click(scope.getCallback('interfaceMode', 'home'));
  $('#browsePanelButton').click(scope.getCallback('interfaceMode', 'browse'));
  $('#visualisePanelButton').click(scope.getCallback('interfaceMode', 'visualise'));
  $('#uploadPanelButton').click(scope.getCallback('interfaceMode', 'upload'));
  $('#userPanelButton').click(scope.getCallback('interfaceMode', 'user'));

  $("#grid_select").grid_select(
  {
    callback:
    function(x,y)
    {
      BrainSlices.scope.set("grid_dims", {x: x + 1, y: y + 1});
    }
  });

  $("#btn_synch").button().click(function()
  {
	  var val = BrainSlices.scope.get("synch");
	  if (val)
    {
  	  $("#btn_synch").removeClass("selected");
		  $("#btn_synch_icon").removeClass("fa-lock");
	    $("#btn_synch_icon").addClass("fa-unlock");
	    BrainSlices.scope.set("synch", false);
	  }
    else
    {
  	  $("#btn_synch").addClass("selected");
		  $("#btn_synch_icon").addClass("fa-lock");
	    $("#btn_synch_icon").removeClass("fa-unlock");
	    BrainSlices.scope.set("synch", true);
	  }
	});
	

  $("#btn_zoom").button().click(function()
  {
    $("#zoom").css("left", 21 + $("#btn_zoom").offset().left + "px");
    $("#zoom").css("top", 46 + $("#btn_zoom").offset().top + "px");
    $("#zoom").show();

    function hideHandler(event)
    {
      var isZoomButton = $(event.target).attr('id') === "btn_zoom";
      var hasZoomButtonAsParent = (1 === $(event.target).parents().filter('#btn_zoom').length);
      if (isZoomButton || hasZoomButtonAsParent)
      {
        return;
      }

      $("#zoom").hide();

      $(document).unbind("click", hideHandler);
    };

    $(document).click(hideHandler);
  });

  $("#btn_trans").button().click(function()
  {
    $("#trans").css("left", 21 + $("#btn_trans").offset().left + "px");
    $("#trans").css("top", 46 + $("#btn_trans").offset().top + "px");
    $("#trans").show();

    function hideHandler(event)
    {
      var isZoomButton = $(event.target).attr('id') === "btn_trans";
      var hasZoomButtonAsParent = (1 === $(event.target).parents().filter('#btn_trans').length);
      if (isZoomButton || hasZoomButtonAsParent)
      {
        return;
      }

      $("#trans").hide();

      $(document).unbind("click", hideHandler);
    };

    $(document).click(hideHandler);
  });

  $("#quality_button").quality_button(
  {
	  callback:
    function(q)
    {
		  console.log("quality set to " + q);
		  scope.set("quality", q);
	  }
  });
	scope.register(
  {
    change:
    function(variable, val)
    {
      if (variable == "quality")
      {
  			$("#quality_button").quality_button("highlight", val);
      }
    }
  });

  $("#target_select").target_select(
  {
	  callback:
    function(x,y)
    {
  		stacks.setFocusPoint(x,y);
			stacks.update();
	  }
  });
  $("#btn_display").button().click(function()
  {
	  var val = BrainSlices.scope.get("display");
  	if (val==="matrix")
    {
  		$("#btn_display_icon").removeClass("fa-film");
	    $("#btn_display_icon").addClass("fa-th-large");
  		BrainSlices.scope.set("display", "grid");
	  }
    else if (val==="grid")
    {
  		$("#btn_display_icon").addClass("fa-film");
	    $("#btn_display_icon").removeClass("fa-th-large");
  		BrainSlices.scope.set("display", "matrix");
	  }
	});

  $("#btn_compress")
    .button()
    .click(function()
    {
      var images = layerManager.loadedImagesOrdered();
      scope.set('grid_dims', {x: 1, y: 1});
      for (var i = 0; i < images.length; i++)
      {
        if (!stacks.has(0, images[i]))
        {
          layerManager.load(0, images[i], true);
        }
      }
      layerManager.arrangeInterface();
    });

  $("#btn_expand")
    .button()
    .click(function()
    {
      var images = layerManager.loadedImagesOrdered();
      var grid_dims = scope.get('grid_dims');
      var nxCor = grid_dims.x * grid_dims.y < images.length ?
                  parseInt(Math.ceil(images.length / grid_dims.y)) :
                  grid_dims.x;
      layerManager.unloadAll();
      BrainSlices.scope.set('grid_dims', {x: nxCor, y: grid_dims.y});
      for (var i = 0; i < images.length; i++)
      {
        layerManager.load(i, images[images.length - 1 - i], true);
      }

      layerManager.arrangeInterface();
    });

  $("#btn_help").button();

  $("#btn_login").button();

  $("#btn_logout").button();

  $("#zoom").slider(
  {
    min:0,
    max:14,
    value: 3,
    step: 0.125,
    orientation: "vertical",
    range: "min",
    animate: true,
    slide: $.proxy(function()
    {
      scope.set( "zoom", Math.pow(2,$("#zoom").slider("value")));
    })
  });

  $("#zoom").css("height", "100px");
  $("#zoom").css("z-index", "9999");
  
  $("#zoom").hide();
  scope.register(
  {
    change:
    function(variable, val)
    {
      if (variable == "zoom")
      {
        $("#zoom").slider("value", Math.log(val) / Math.log(2));
      }
    }
  });

  $("#trans").slider(
  {
    min:0,
    max:1,
    value: 0.5,
    step: 0.1,
    orientation: "vertical",
    range: "min",
    animate: true,
    slide: $.proxy(function()
    {
      scope.set( "trans", $("#trans").slider("value"));
    })
  });

  $("#trans")
    .css(
    {
      height: "100px",
      'z-index': "9999"
    })
    .hide();

  scope.register(
  {
    change:
    function(variable, val)
    {
      if (variable == "trans")
      {
        $("#trans").slider("value", val);
      }
    }
  });


  $('#btn_filters').click(function()
  {
    if ($(this).hasClass('selected'))
    {
      $('#searchPanelDiv').removeClass('filters-visible');
      $(this).removeClass('selected');
    }
    else
    {
      $('#searchPanelDiv').addClass('filters-visible');
      $(this).addClass('selected');
    }
  });

  $('#btn_basket_search').click(function()
  {
    if ($(this).hasClass('selected'))
    {
      $('#searchPanelDiv').removeClass('basket-visible');
      $(this).removeClass('selected');
    }
    else
    {
      $('#searchPanelDiv').addClass('basket-visible');
      $('#searchImageBasketList>div').folder('refresh');
      $(this).addClass('selected');
    }
  });



  $("#cart").cart();



  scope
    .registerChange(function(val)
    {
      state.display = val; // XXX obsoleted
      rearrangeInterface();
    }, 'display')
    .registerChange(function(val)
    {
      state.zoom = val; // XXX obsoleted
    }, 'zoom')
    .registerChange(function(val)
    {
      state.shape = [val.x, val.y]; // XXX obsoleted
      rearrangeInterface();
    }, 'grid_dims');

  scope.set('interfaceMode', 'home');

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



    BrainSlices.scope.set("grid_dims", {x: state.shape[0],
                                        y: state.shape[1]});

    BrainSlices.scope.set("display", state.display);

    stacks.setFocusPoint(state.focus[0][0], state.focus[0][1]);
    var nx = state.shape[0];
    var ny = state.shape[1];
    $('#x').val(state.focus[0][0]);
    $('#y').val(state.focus[0][1]);

    stacks.updateZoomPanel();
    if (state.display == 'serial') // != 'matrix'
    {
      stacks.rearrange(nx, ny, parseInt(Math.max(100, 66 * nx / ny)) + '%');
    }

    for (var i = 0; i < state.focus.length; i++)
    {
      stacks.setFocusPoint(state.focus[i][0], state.focus[i][1], i);
    }

    if (state.sync)
    {
      stacks.syncStart();
    }

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



    // try to use tableManager? sort method would be necessary ;-)
    searchEngine = new CPropertiesSearch(loginConsole,
    {
      data:
      $('#loadedFilters'),

      add:
      function(name, type, filter)
      {
        var change, remove, n;
        // list of variables for my convenience
        if (name === null)
        {
          remove = function()
          {
            // global
            searchEngine.removeAny(n);
          }

          // a lot of unnecessary conversions
          switch (type)
          {
            case 't':
              change = null;

              break;

            case 'f':
              change = function(conditions)
              {
                searchEngine.resetAny(n);
                for (var op in conditions)
                {
                  var value = conditions[op];
                  searchEngine.setAny(n, op, value);
                }
              };

              break;

            case 'x':
              change = function(conditions)
              {
                searchEngine.setAny(n, 'plain', conditions);
              };

              break;

            case 'e':
              change = function(conditions)
              {
                var tmp = [];

                for (var val in conditions)
                {
                  if (conditions[val])
                  {
                    tmp.push(val);
                  }
                }

                searchEngine.setAny(n, 'is', tmp);
              }
          }
        }
        else
        {
          remove = function()
          {
            // global
            searchEngine.remove(name);
          }

          switch (type)
          {
            case 't':
              change = null;
              break;

            case 'f':
              change = function(conditions)
              {
                searchEngine.reset(name);

                for (var op in conditions)
                {
                  var value = conditions[op];
                  searchEngine.set(name, op, value);
                }
              };

              break;

            case 'x':
              change = function(conditions)
              {
                searchEngine.set(name, 'plain', conditions);
              };

              break;

            case 'e':
              change = function(conditions)
              {
                var tmp = [];

                for (var val in conditions)
                {
                  if (conditions[val])
                  {
                    tmp.push(val);
                  }
                }

                searchEngine.set(name, 'is', tmp);
              }
          }
        }

        var $remButton = $('<a href="javascript:void(0)" class="filter-delete-button fa fa-times"></a>')
          .click(remove);

        var label = name;
        if (label == null)
        {
          switch (type)
          {
            case 't':
              label = '--- any property set ---';
              break;

            case 'x':
              label = '--- any text property ---';
              break;

            case 'f':
              label = '--- any numeric property ---';
              break;

            default:
              label = '--- any field of type ' + type + ' ---';
          }
        }

        var $row;
        if (type == 't')
        {
          $row = $('<div></div>')
            .text(label)
            .prepend($('<span></span>')
                         .addClass('fa fa-tag'))
            .addClass("filter-property-name")
            .append($remButton);
        }
        else
        {
          $row = $('<details></details>');

          var $header = $('<summary></summary>')
            .text(label)
            .prepend($('<span></span>')
                         .addClass('fa fa-angle-double-down'))
            .prepend($('<span></span>')
                         .addClass('fa fa-angle-double-up'))
            .addClass("filter-property-name")
            .append($remButton)
            .appendTo($row);
          filter.appendTo($row);
        }

        $row
          .addClass('filter-property-info')

        this.data.append($row);
        var triggers = {
          data:
          {$row: $row},
          destroy:
          function()
          {
            this.data.$row.remove();
          },
          valid:
          function(valid)
          {
            if (valid)
            {
              this.data.$row.removeClass('filter-invalid');
            }
            else
            {
              this.data.$row.addClass('filter-invalid');
            }
          }};

        if (name != null)
        {
          this.add(name, type, triggers);
        }
        else
        {
          n = this.addAny(type, triggers);
        }

        filter.propertyfilter('option', 'change', change);
        //filter.change();
       

      }
    });


    $('#searchPropertySearch').click(function()
    {
      var search = searchEngine.search(function(result)
      {
        var $parent = $('#searchResults').empty();
        for (var i = 0; i < result.length; i++)
        {
          var info = result[i];
          var $div = $('<div></div>')
            .appendTo($parent);
          detailsGenerator(info, $div);

          var $button = $('<span class="add-image-to-cart-button fa fa-plus"></span>');
          $div.prepend($button);
          (function(info)
          {
            $button.click(function()
            {
              //global
              layerManager.autoAddTileLayer(info.iid, info, null, '#' + info.iid);
            });
          })(info);
        }
      });

      if (!search)
      {
        alert('Chosen filters can not match any images.');
      }
    });

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
});



