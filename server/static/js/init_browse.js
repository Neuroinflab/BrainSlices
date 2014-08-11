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


function initBrowse()
{
  var scope = BrainSlices.scope;

  function filtersUnfold()
  {
    $('#searchPanelDiv').addClass('filters-visible');
    $('#btn_filters').addClass('selected');
    $('#searchResults>div').folder('refresh');
    $('.basket-visible #searchImageBasketList>div').folder('refresh');
  }

  function filtersFold()
  {
    $('#searchPanelDiv').removeClass('filters-visible');
    $('#btn_filters').removeClass('selected');
    $('#searchResults>div').folder('refresh');
    $('.basket-visible #searchImageBasketList>div').folder('refresh');
  }

  $('#btn_filters').click(function()
  {
    if ($(this).hasClass('selected'))
    {
      filtersFold();
    }
    else
    {
      filtersUnfold();
    }
  });

  $('#searchFiltersFold').click(filtersFold);
  $('#searchFiltersUnfold').click(filtersUnfold);

  function basketUnfold()
  {
    $('#searchPanelDiv').addClass('basket-visible');
    $('#btn_basket_search').addClass('selected');
    $('#searchImageBasketList>div').folder('refresh');
    $('#searchResults>div').folder('refresh');
    $('#searchImageBasketList>div').folder('refresh');
  }

  function basketFold()
  {
    $('#searchPanelDiv').removeClass('basket-visible');
    $('#btn_basket_search').removeClass('selected');
    $('#searchResults>div').folder('refresh');
  }

  $('#btn_basket_search').click(function()
  {
    if ($(this).hasClass('selected'))
    {
      basketFold();
    }
    else
    {
      basketUnfold();
    }
  });

  $('#searchBasketFold').click(basketFold);
  $('#searchBasketUnfold').click(basketUnfold);
}

var searchEngine = null;

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
}


