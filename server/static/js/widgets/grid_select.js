$.widget("brainslices.grid_select",
{
  options:
  {
    numRows: 2,
    numCols: 2,
    rows: new Array(),
    callback: function(x, y) {
      console.log("no callback specified for grid_select " + x + ", " + y);
    }
  },

  _create:
  function()
  {
    this.currentPos =
    {
      x: 0,
      y: 0
    };
  },

  restart:
  function(x, y)
  {
    if (BrainSlices.scope.get("grid_dims") !== undefined)
    {
      x = BrainSlices.scope.get("grid_dims").x + 1;
      y = BrainSlices.scope.get("grid_dims").y + 1;
    }

    this.options.numRows = y;
    this.options.numCols = x;
    this.options.initialRows = y;
    this.options.initialCols = x;
    
    this.currentPos =
    {
      x: x,
      y: y
    };

    var rows = new Array();
    var grid_view_this = this;

    $(this.element).html("");
    var floatView = $('<div class="grid_view_float"></div>')
    var table = $('<table id="selectable" class="grid_view_table">');
    floatView.append(table);

    for (var i = 0; i < this.options.numRows; i++)
    {
      var tr = $('<tr data-y="' + i + '"></tr>');

      for (var j = 0; j < this.options.numCols; j++)
      {
        if ((j < x - 1) && (i < y - 1))
        {
          tr.append('<td class="current-table" data-x="' + j + '" data-y="' + i + '"></td>');
        }
        else
        {
          tr.append('<td data-x="' + j + '" data-y="' + i + '"></td>');
        }
      }

      this.options.rows.push(tr);
      table.append(tr);
    }

    table.selectable(
      {
        filter: "td",
        selecting: function(evt)
        {
          console.log(evt);
        }
      });

    button = $('<button id="btn_grid" class="icon"><div class="grid">&#x25a0;&#x25a0;&#x25a0;<br>&#x25a0;&#x25a0;&#x25a0;<br>&#x25a0;&#x25a0;&#x25a0;<div></button>');

    leave = function(evt)
    {
      grid_view_this.restart(2, 2);
      floatView.hide();
    };

    button.button()
        .mousedown(function(evt)
        {
          floatView.offset({top: evt.clientY - 10,
                            left: evt.clientX - 10});
          floatView.show();
        })
        .mouseup(function(evt){console.debug('button.mouseleave'); leave(evt);}); //XXX

    floatView
      .mouseleave(function(evt){console.debug('floatView.mouseleave'); leave(evt);}) //XXX
      .mouseup(function(evt)
      {
        console.debug('floatView.mouseup', grid_view_this.currentPos.x, grid_view_this.currentPos.y); //XXX
        grid_view_this.options.callback(grid_view_this.currentPos.x,
                                        grid_view_this.currentPos.y);

        leave(evt);
      })
      .mouseover(function(evt)
      {
        if (evt.target.nodeName != "TD")
        {
          return;
        }

        if ($(evt.target).data("y") === (grid_view_this.getNumRows() - 1))
        {
          grid_view_this.addRow();
        }

        if (($(evt.target).data("y") >= (grid_view_this.getInitialRows() - 2))
          && ($(evt.target).data("y") < (grid_view_this.getNumRows() - 2)))
        {
          grid_view_this.deleteRowsFrom($(evt.target).data("y") + 2);
        }

        if ($(evt.target).data("x") === (grid_view_this.getNumCols() - 1))
        {
          grid_view_this.addCol();
        }

        if (($(evt.target).data("x") >= (grid_view_this.getInitialCols() - 2))
          && ($(evt.target).data("x") < (grid_view_this.getNumCols() - 2)))
        {
          grid_view_this.deleteColsFrom($(evt.target).data("x") + 2);
        }

        grid_view_this.currentPos.x = $(evt.target).data("x");
        grid_view_this.currentPos.y = $(evt.target).data("y");

        for (var x = 0; x < grid_view_this.getNumCols(); x++)
        {
          for (var y = 0; y < grid_view_this.getNumRows(); y++)
          {
            if ((x <= grid_view_this.currentPos.x)
              && (y <= grid_view_this.currentPos.y))
            {
              $('td[data-x="' + x + '"][data-y="' + y + '"]').addClass("selected");
            }
            else
            {
              $('td[data-x="' + x + '"][data-y="' + y + '"]').removeClass("selected");  
            }
          }
        }
      });

    $(this.element).append(button);
    $(this.element).append(floatView);

    floatView.hide();
  },

  _create:
  function()
  {
    this.restart(this.options.numRows, this.options.numCols);
  },

  addRow:
  function()
  {
    tr = $('<tr data-y="' + this.options.numRows + '"></tr>');
    for (j = 0; j < this.options.numCols; j++)
    {
      tr.append('<td data-x="' + j + '" data-y="' + this.options.numRows + '"></td>');
    }
    this.options.rows.push(tr);

    $(".grid_view_table").append(tr);

    this.options.numRows++;
  },

  deleteRowsFrom:
  function(row)
  {
    for (var i = 0; i < this.options.numRows; i++)
    {
      if (i >= row)
      {
        $('tr[data-y="' + i + '"]').each(function(index)
        {
          $(this).remove();
        });
      }
    }

    this.options.numRows = row;
  },

  addCol:
  function()
  {
    cols = this.options.numCols;

    this.options.rows.map(function(tr)
    {
      tr.append('<td data-x="' + cols + '" data-y="' + tr.data("y") + '"></td>');
    });

    this.options.numCols++;
  },

  deleteColsFrom:
  function(col)
  {
    for (var i = 0; i < this.options.numCols; i++)
    {
      if (i >= col)
      {
        $('td[data-x="' + i + '"]').each(function(index)
        {
          $(this).remove();
        });
      }
    }

    this.options.numCols = col;
  },

  getNumCols:
  function()
  {
    return this.options.numCols;
  },

  getInitialCols:
  function()
  {
    return this.options.initialCols;
  },

  getNumRows:
  function()
  {
    return this.options.numRows;
  },

  getInitialRows:
  function()
  {
    return this.options.initialRows;
  }
});
