var move = false;

function startMove(event)
{
  move = true;
}


function processMove(event)
{
  if (move)
  {
    inspect();
  }
}

function inspect()
{//TODO
  $('#x').val(stacks.stacks[0].focusPointX);
  $('#y').val(stacks.stacks[0].focusPointY);
}

function stopMove(event)
{
  move = false;
}


function test()
{
  var x = $('#x').val();
  var y = $('#y').val();

  stacks.setFocusPoint(x, y);
  stacks.update();
  return false;
}

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

function compressStacks()
{
  var images = layerManager.loadedImagesOrdered();
  BrainSlices.scope.set('grid_dims', {x: 1, y: 1});
  //stacks.rearrange(1, 1);
  for (var i = 0; i < images.length; i++)
  {
    if (!stacks.has(0, images[i]))
    {
      layerManager.load(0, images[i], true);
    }
  }
  layerManager.arrangeInterface();
}

function decompressStacks()
{
  var images = layerManager.loadedImagesOrdered();
  var grid_dims = BrainSlices.scope.get('grid_dims');
  var nxCor = grid_dims.x * grid_dims.y < images.length ?
              parseInt(Math.ceil(images.length / grid_dims.y)) :
              grid_dims.x;
  var display = $('#display').val();
  var width = display == 'matrix' ?
              null :
              parseInt(Math.max(100, 66 * nxCor / grid_dims.y)) + '%';
  layerManager.unloadAll();
  BrainSlices.scope.set('grid_dims', {x: nxCor, y: grid_dims.y});
  stacks.rearrange(nxCor, grid_dims.y, width);
  for (var i = 0; i < images.length; i++)
  {
    layerManager.load(i, images[images.length - 1 - i], true);
  }

  layerManager.arrangeInterface();
}

function addLayer()
{
  var id = $('#id').val();
  var z = $('#z').val();
  layerManager.autoAddTileLayer(id, z, $('#id option:selected').html());
  return false;
}

//TODO
function addOutlineLayer()
{
  var id = 'Outline320'; //$('#id').val();
  var z = $('#z').val();

  stacks.stacks[0].loadOutlineLayer(id, '/outlines/wholeOutline/320.svg', z);

  inspect(); 
  return false;
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

var testSubsets = null;
var id2name = {};

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
             zoom: 1.};

function parseState(search)
{
  var params = search.split('&');
  var state = {};
  for (var i = 0; i < params.length; i++)
  {
    var pair = params[i].split('=');
    if (pair.length != 2)
    {
      console.warn('Invalid argument: ' + params[i]);
      continue;
    }

    var argName = decodeURIComponent(pair[0]);
    var argVal = decodeURIComponent(pair[1]);

    if (argName in state)
    {
      console.warn('Multiple definition of argument: ' + argName);
      continue;
    }

    switch (argName)
    {
      case 'display':
        if (argVal != 'matrix' && argVal != 'serial')
        {
          console.warn('Invalid display: ' + argVal);
          continue;
        }
        state.display = argVal;
        break;

      case 'focus':
        var focus = argVal.split(',');
        if (focus.length == 0)
        {
          console.warn('Invalid focus');
          continue;
        }
        for (var j = 0; j < focus.length; j++)
        {
          var pair = focus[j].split(':');
          if (pair.length != 2 || isNaN(pair[0]) || isNaN(pair[1]))
          {
            console.warn('Invalid focus: ' + focus[j]);
            focus = null;
            break;
          }
          pair = [parseFloat(pair[0]), parseFloat(pair[1])];
          if (isNaN(pair[0]) || isNaN(pair[1]))
          {
            console.warn('Invalid focus (NaN): ' + focus[j]);
            focus = null;
            break;
          }
          focus[j] = pair;
        }
        if (focus == null) continue;
        state.focus = focus;
        break;

      case 'iids':
        var iids = [];
        var tmp = argVal.split(',');
        for (var j = 0; j < tmp.length; j++)
        {
          var pair = tmp[j].split(':');
          if (pair.length != 2)
          {
            console.warn('Invalid iid in iids: ' + tmp[i]);
            continue;
          }

          var iid = parseInt(pair[0]);
          if (isNaN(pair[0]) || isNaN(iid) || iid < 1) // applied to the case iid[0] is '' etc.
          {
            console.warn('Invalid iid (NaN) in iids: ' + tmp[i]);
            continue;
          }

          iids.push([iid, pair[1]]);
        }
        state.iids = iids;
        break;

      case 'loaded':
        var loaded = argVal.split(',');
        for (var j = 0; j < loaded.length; j++)
        {
          var tmp = loaded[j].split(':');
          for (var k = 0; k < tmp.length; k++)
          {
            if (isNaN(tmp[k]))
            {
              console.warn('Invalid loaded: ' + tmp[k]);
              tmp = null;
              break;
            }
            tmp[k] = parseInt(tmp[k]);
            if (isNaN(tmp[k]) || tmp[k] < 0)
            {
              console.warn('Invalid loaded (int): ' + tmp[k]);
              tmp = null;
              break;
            }
          }
          if (tmp == null)
          {
            loaded = null;
            break;
          }
          loaded[j] = tmp;
        }
        if (loaded == null) continue;
        state.loaded = loaded;
        break;

      case 'shape':
        var shape = argVal.split(',');
        if (shape.length != 2 || isNaN(shape[0]) || isNaN(shape[1]))
        {
          console.warn('Invalid shape: ' + argVal);
          continue;
        }
        shape[0] = parseInt(shape[0]);
        shape[1] = parseInt(shape[1]);
        if (isNaN(shape[0]) || isNaN(shape[1]) || shape[0] < 1 || shape[1] < 1)
        {
          console.warn('Invalid shape (int): ' + argVal);
          continue;
        }
        state.shape = shape;
        break;

      case 'show':
        var pair = argVal.split(':');
        if (pair.length != 2 || isNaN(pair[0]))
        {
          console.warn('Invalid show: ' + argVal);
          continue;
        }
        var iid = parseInt(pair[0]);
        if (isNaN(iid) || iid < 1)
        {
          console.warn('Invalid iid: ' + iid);
          continue;
        }
        state.iids = [[iid, pair[1]]];
        state.loaded = [[0]];
        state.shape = [1, 1];
        break;

      case 'sync':
        if (argVal != 'y' && argVal != 'n')
        {
          console.warn('Invalid sync: ' + argVal);
          continue;
        }
        state.sync = argVal == 'y';
        break;
        
      case 'zoom':
        var zoom = parseFloat(argVal);
        if (isNaN(argVal) || isNaN(zoom))
        {
          console.warn('Invalid zoom: ' + argVal);
          continue;
        }
        state.zoom = zoom;
        break;

      default:
        console.warn('Unknown argument: ' + argName);
    }
  }

  var n = 'shape' in state ? state.shape[0] * state.shape[1] : 1;
  if ('focus' in state)
  {
    if (state.focus.length > n)
    {
      console.warn('Invalid focus (len)');
      delete state.focus;
    }
  }

  if ('loaded' in state)
  {
    if (state.loaded.length > n || !('iids' in state))
    {
      console.warn('Invalid loaded (len)');
      delete state.loaded;
    }
    else
    {
      var niids = state.iids.length;
      for (var i = 0; i < state.loaded.length; i++)
      {
        var loaded = state.loaded[i];
        for (var j = 0; j < loaded.length; j++)
        {
          if (loaded[j] >= niids)
          {
            console.warn('Invalid loaded (val)');
            delete state.loaded;
            loaded = null;
            break;
          }
        }
        if (loaded == null) break;
      }
    }
  }
  return state;
}

$(function()
{
  if (window.location.search != '')
  {
    var tmp = parseState(window.location.search.substring(1));
    for (var name in tmp)
    {
      state[name] = tmp[name];
    }
  }


  $("#navbar").navbar(
  {
    scope: BrainSlices.scope
  });

  $("#cart").cart();


  BrainSlices.scope.set("display", state.display);

  BrainSlices.scope
    .register(
    {
      change:
      function(variable, val)
      {
        if (variable == "display")
        {
          state.display = val; // XXX obsoleted
          rearrangeInterface();
        }
      }
    })

  BrainSlices.scope
    .register(
    {
      change:
      function(variable, val)
      {
        if (variable == 'zoom')
        {
          state.zoom = val; // XXX obsoleted
        }
      }
    })


  BrainSlices.scope.set("grid_dims", {x: state.shape[0],
                                      y: state.shape[1]});
  BrainSlices.scope
    .register(
    {
      change:
      function(variable,val)
      {
        if (variable == "grid_dims")
        {
          state.shape = [val.x, val.y]; // XXX obsoleted
          rearrangeInterface();
        }
      }
    })


  //$('#logoutLink').hide();



  loginConsole = new BrainSlices.ajax.CUserPanel($('#userPanel'),
                                                 $('#btn_login'),
                                                 $('#btn_logout'));


/**********************************************/

  var nx = state.shape[0];
  var ny = state.shape[1];
  $('#ux').val(state.focus[0][0]);
  $('#y').val(state.focus[0][1]);

  images = new BrainSlices.api.CImageManager(loginConsole);
  stacks = new BrainSlices.api.CSynchronizedStacksDisplay($('#sliceDisplay'), nx, ny,
                                          false, state.zoom,
                                          state.focus[0][0],
                                          state.focus[0][1],
                                          null, null, null,
                                          '/static/gfx', images);
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
  $('#control_panel [name="synchronization"]').prop('checked', true);

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


  function resizeSearchPanel()
  {
    /*
    // XXX panel height hack ;-)
    var topHeight = $('#search-panel .searchPanelDiv').innerHeight();

    var spHeight = Math.min(170 +
                            $('#loadedFilters').outerHeight(),
                            Math.max(170, parseInt(topHeight / 2)));

    $('#filtersWrapper').height(spHeight);
    $('#resultsWrapper').height(topHeight - spHeight);
    */
  }


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
          resizeSearchPanel();
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
          resizeSearchPanel();
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
     
      resizeSearchPanel();

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

                        resizeSearchPanel();
                      }
                      else
                      {
                        alert(data.message);
                      }
                    });


});



