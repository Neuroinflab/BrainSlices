function detailsGenerator(info, $div)
{
  var properties = info.properties;
  if (!$div)
  {
    $div = $('<div></div>');
  }

  $div
    .addClass('image-details')
    .append(BrainSlices.gui.getThumbnail(info.iid,
                                         info.imageWidth,
                                         info.imageHeight,
                                         64, 64)
      .attr('draggable', 'true'));

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

  return $div;
}


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
              .folder('refresh');
      }
      else
      {
        $('#searchPanelDiv').removeClass('filters-visible');
        $('#btn_filters').removeClass('selected');
        $('#searchResults')
          .children('.search-row')
            .children('.image-details')
              .folder('refresh');
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
var perPage = 50;

function initBrowseFinish()
{
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

  var searchResults = [{properties:{}}];
  var $searchPage = $('#searchResults');
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
          var end = slice[1];
          $searchPage.empty();
          for (var i = slice[0]; i < end; i++)
          {
            var info = searchResults[i];
            var $row = $('<div>')
              .addClass('search-row')
              .appendTo($searchPage);

            var $div = $('<div></div>')
              .append($('<a>')
                .addClass('fa fa-arrow-circle-o-down layer-download-button')
                .attr(
                {
                  href: '/images/' + info.iid + '/image.png',
                  download: ''
                }))
              .append($('<div>')
                .addClass('description-buttons-placeholder'))
              .appendTo($row);
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
            var result = (this.number ? this.number : 'No') + ' specimen';
            if (this.number != 1)
            {
              result += 's';
            }
            result += ' found.'

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
    searchResults = result;
    searchPaginator.setNumber(result.length);
    searchPaginator.setPage();
  }

  $('#searchPropertySearch').click(function()
  {
    waitWindow.message('Querying the server. Please wait. <span class="fa fa-refresh fa-spin"></span>');

    if (!searchEngine.search(searchCallback,
                             $('#privilegeFilter').val()))
    {
      waitWindow.close();
      alertWindow.error('Chosen filters can not match any images.');
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
                              alertWindow.error('Property ' + name + ' already selected.');
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
                        alertWindow.error(data.message);
                      }
                    });
}


