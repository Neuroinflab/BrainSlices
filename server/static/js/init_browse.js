function makePropertyList(properties, $ul)
{
  if (!$ul)
  {
    $ul = $('<ul>');
  }
  else
  {
    $ul.empty();
  }
  $ul.addClass('image-details');

  var names = [];
  var name;
  for (name in properties)
  {
    if (name == 'name' || name == 'description') continue;
    names.push(name);
  }

  if (names.length > 0)
  {
    names.sort();

    var $li, property, $propertyName;
    for (var j = 0; j < names.length; j++)
    {
      name = names[j];
      $propertyName = $('<span>')
        .addClass('image-details-property-name')
        .text(name);
      $li = $('<li>')
        .addClass('image-details')
        .append($propertyName)
        .appendTo($ul);

      property = properties[name];
      switch (property.type)
      {
        case 's':
        case 'x':
        case 'e':
        case 'f':
        case 'i':
          $propertyName.append(':');
          $li.append(document.createTextNode(' ' + property.value));
          break;

        case 't':
          break;
      }
    }
  }

  return $ul;
}

function basicMetadataText(info)
{
  var hDistance = BrainSlices.gui.hDistance;
  var width = info.imageWidth * info.pixelSize;
  var height = info.imageHeight * info.pixelSize;
  return 'image size: ' + hDistance(width) +
         '\u00a0x\u00a0' + hDistance(height) +
         ' (' + info.imageWidth + '\u00a0x\u00a0' +  info.imageHeight +
         '\u00a0px), image center (x,\u00a0y\u00a0coordinates): ' +
         hDistance(info.imageLeft + 0.5 * width) + ',\u00a0'
         + hDistance(info.imageTop + 0.5 * height);
}


(function()
{
  var TILED = BrainSlices.api.IMG_STATUS.TILED;

  makeBasicDetails = function(info, $div)
  {
    var $download =
      info.status > TILED ?
      $('<a>')
        .addClass('fa fa-arrow-circle-o-down layer-download-button')
        .attr(
        {
          href: '/images/' + info.iid + '/image.png',
          download: '',
          title: 'download the image'
        })
        .tooltip(BrainSlices.gui.tooltip)
        .appendTo($div) :
      $();
  
    $div
      .addClass('image-details')
      .append($('<div>')
        .addClass('description-buttons-placeholder'));

    if (info.status >= TILED)
    {
      $div
        .append(BrainSlices.gui.getThumbnail(info.iid,
                                             info.imageWidth,
                                             info.imageHeight,
                                             64, 64)
          .addClass('image-details thumbnail')
          .attr('draggable', 'true'));
    }
    else
    {
      var iconName = info.status >= 0 ? 'processing' : 'error';
      $div
        .append($('<img>')
          .attr({src: '/static/gfx/' + iconName + '64.gif',
                 alt: iconName})
          .addClass("polaroid-image")
          .css({width: '64px',
                height: info.status >= 0 ? '64px' : '55px',
                'box-sizing': 'content-box',
                'padding': info.status >= 0 ? '0' : '5px 0 4px 0',
                background: '#ECECEC'})
          .addClass('image-details thumbnail'));
    }
    return $download;
  }

  detailsGenerator = function(info, $div)
  {
    var properties = info.properties;
  
    if (!$div)
    {
      $div = $('<div>');
    }
  
    makeBasicDetails(info, $div);
  
    if (properties)
    {
      if ('name' in properties && properties.name.type != 't')
      {
        $div
          .append($('<h1>')
            .addClass('image-details')
            .text(properties.name.value));
      }
  
      if ('description' in properties && properties.description.type != 't')
      {
        $div
          .append($('<p>')
            .addClass('image-description image-details')
            .text(properties.description.value));
      }
  
      $div.append(makePropertyList(properties));
    }
  
    return $div;
  }
})()


function initBrowse()
{
  var scope = BrainSlices.scope;

  scope
    .registerChange(function(value)
    {
      if (value)
      {
        $('#searchPanelDiv').addClass('filters-visible');
        $('#btn_filters').addClass('selected');
        $('#searchResults')
          .children('.search-row')
            .children('.image-details')
              .folder('forceRefresh');
      }
      else
      {
        $('#searchPanelDiv').removeClass('filters-visible');
        $('#btn_filters').removeClass('selected');
        $('#searchResults')
          .children('.search-row')
            .children('.image-details')
              .folder('forceRefresh');
      }
    }, 'filters');

  $('#btn_filters')
    .click(scope.getToggle('filters'));

  $('#searchFiltersFold')
    .click(scope.getCallback('filters', false));
  $('#searchFiltersUnfold')
    .click(scope.getCallback('filters', true));

  scope
    .registerChange(function(value)
    {
      if (value)
      {
        $('#searchPanelDiv').addClass('basket-visible');
      }
      else
      {
        $('#searchPanelDiv').removeClass('basket-visible');
      }
      //XXX necessary for vertical folding bars
    }, 'cart');

  $('#searchBasketFold').click(scope.getCallback('cart', false));
  $('#searchBasketUnfold').click(scope.getCallback('cart', true));
}

var searchEngine = null;
var searchResultsMapping = {};
var perPage = 50;

var loadButtons = {};

(function()
{
  var TILED = BrainSlices.api.IMG_STATUS.TILED;

  initBrowseFinish = function()
  {
    function browseSearch()
    {
      $('#searchPropertySearch').click();
  
      $(this).unbind('click', browseSearch);
    }
  
    $('#browsePanelButton')
      .bind('click', browseSearch);
  
  
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
          $row = $('<div>')
            .text(label)
            .prepend($('<span>')
              .addClass('fa fa-tag'))
            .addClass("filter-property-name")
            .append($remButton);
        }
        else
        {
          $row = $('<details>');
  
          var $header = $('<summary>')
            .text(label)
            .prepend($('<span>')
              .addClass('fa fa-angle-double-down'))
            .prepend($('<span>')
              .addClass('fa fa-angle-double-up'))
            .addClass("filter-property-name")
            .append($remButton)
            .appendTo($row);
          filter.appendTo($row);
        }
  
        $row
          .addClass('filter-property-info')
  
        this.data.append($row);
        var triggers =
        {
          data:
          {
            $row: $row
          },
  
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
          }
        };
  
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
  
    var searchResults = [];
    var $searchPage = $('#searchResults');
    var searchResultsLimited = false;
    searchPaginator = $('#searchResultsPaginator')
      .paging(0,
      {
        format: '- (q .) nncnn (. p)',
        perpage: perPage,
        lapping: 0,
        page: 1,
        onSelect:
        function(page)
        {
          waitWindow.success('Parsing specimen properties. Please wait. <span class="fa fa-refresh fa-spin"></span>');
          var slice = this.slice;
  
          setTimeout(function()
          {
            loadButtons = {};
  
            var end = slice[1];
            searchResultsMapping = {};
            $searchPage.empty();
            for (var i = slice[0]; i < end; i++)
            {
              var info = searchResults[i];
              searchResultsMapping[info.iid] = info;
              var $row = $('<div>')
                .addClass('search-row')
                .appendTo($searchPage);
  
              if (info.status >= TILED)
              {
                $row.attr('draggable', 'true');
                (function(info, $row)
                {
                  $row
                    .bind('dragstart', function(ev)
                    {
                      var dataTransfer = ev.originalEvent.dataTransfer;
                      //var img = $row.find('img.thumbnail')[0]//.cloneNode(true); //document.createElement('img');
                      var img = document.createElement('img');
                      img.src = '/images/' + info.iid + '/tiles/0/0/0.jpg';
                      img.alt = 'thumbnail of image #' + info.iid;
                      dataTransfer.setDragImage(img, 0, 0);
                      dataTransfer.setData('TYPE', 'searchResults');
                      dataTransfer.setData('IID', info.iid);
                      var url = document.createElement('a');
                      url.href = '/?show=' + info.iid + ':' + info.md5;
                      dataTransfer.setData('text/plain', url)
                      dataTransfer.setData('text/uri-list', url)
                    })
                    .bind('dblclick', function()
                    {
                      layerManager.autoAddTileLayer(info.iid, info);
                      updateOrderBy();
                      animateImageCartHeader();
                    });
                })(info, $row);
              }
  
              var $div = detailsGenerator(info)
                .appendTo($row);
  
              if (info.status >= TILED)
              {
                var $button = $('<span>')
                  .addClass('add-image-to-cart-button fa fa-plus' + (layerManager.has(info.iid) ? ' add-image-to-cart-button-loaded' : ''))
                  .attr('title', 'add to the image cart')
                  .tooltip(BrainSlices.gui.tooltip)
                  .prependTo($div);
  
                loadButtons[info.iid] = $button;
  
                (function(info)
                {
                  $button.click(function()
                  {
                    //global
                    layerManager.autoAddTileLayer(info.iid, info);
                    updateOrderBy();
                    triggerImageCartHeaderAnimation();
                  });
                })(info);
              }
  
              $div.folder();
            }
            waitWindow.close();
          }, 50);
  
          return false;
        },
        onFormat:
        function(type)
        {
          switch (type)
          {
            case 'left':
            case 'right':
            case 'block':
              if (!this.active || this.pages <= 1)
              {
                return '';
              }
              if (this.value != this.page)
              {
                return ' <a href="javascript:void(0)" class="pager" title="' + 
                       + (this.perpage * (this.value - 1) + 1)
                       + '-'
                       + Math.min(this.perpage * this.value, this.number)
                       + '">' + this.value + '</a> ';
              }
              return ' <b>' + this.value + '</b> ';
  
            case 'next':
              if (this.pages > 1 && this.active)
              {
                return ' <a href="javascript:void(0)" class="next">&raquo;</a> ';
              }
              return '';
  
            case 'prev':
              if (this.pages > 1 && this.active)
              {
                return ' <a href="javascript:void(0)" class="previous">&laquo;</a> ';
              }
              return '';
  
            case 'fill':
              var result = (this.number ?
                            this.number + (searchResultsLimited ? '+' : ''):
                            'No') + ' specimen';
              if (this.number != 1)
              {
                result += 's';
              }
              result += ' found.';
  
              if (this.active && this.pages > 1)
              {
                result += ' Displaying ' + (this.slice[0] + 1) + '-' + this.slice[1] + '.<br>';
              }
              return result;
  
            case 'leap':
              if (this.active && this.pages > 1)
              {
                return ' ... ';
              }
              return '';
          }
        }
      });
  
    function searchCallback(result)
    {
      searchResults = result.images;
      searchPaginator.setNumber(result.images.length);
      searchResultsLimited = result.limited;
      searchPaginator.setPage();
    }
  
    function addToCart()
    {
      for (var i = 0; i < searchResults.length; i++)
      {
        var info = searchResults[i];
        var iid = info.iid;
        if (info.status >= TILED)
        {
          layerManager.autoAddTileLayer(info.iid, info, true);
        }
      }
  
      layerManager.updateOrder(); // XXX: is this call necessary???
      updateOrderBy();
      triggerImageCartHeaderAnimation();
      waitWindow.close();
    }
  
    $('#addResultsToCart')
      .tooltip(BrainSlices.gui.tooltip)
      .click(function()
      {
        waitWindow.message('Adding images to the cart.');
        setTimeout(addToCart, 50);
      });
  
    $('#moveResultsToCart')
      .tooltip(BrainSlices.gui.tooltip)
      .click(function()
      {
        waitWindow.message('Moving images to the cart.');
        setTimeout(function()
        {
          layerManager.flush();
          addToCart();
        }, 50);
      });
  
    $('#searchPropertySearch')
      .tooltip(BrainSlices.gui.tooltip)
      .click(function()
      {
        waitWindow.message('Querying the server. Please wait. <span class="fa fa-refresh fa-spin"></span>');
  
        if (!searchEngine.search(searchCallback,
                                 $('#privilegeFilter').val(),
                                 parseInt($('#batchFilter').val()),
                                 parseInt($('#limitFilter').val())))
        {
          waitWindow.close();
          alertWindow.error('Chosen filters can not match any images.');
        }
      });
  
    $('#newFilter').newpropertyfilter(
    {
      source: getPropertySuggestions,
      enumerated: getEnumerated,
      submit: function(name, type, filter)
      {
        if (name != null && searchEngine.has(name))
        {
          alertWindow.error('Property ' + name + ' already selected.');
        }
        else
        {
          searchEngine.autoAdd(name, type, filter);
        }
      }
    });
  
    dropLoadImageReceiver($('#searchBasketFold'));
    dropLoadImageReceiver($('#searchBasketUnfold'));
  }
})()
