$.widget("brainslices.grid_select",
{
  options:
  {
    numRows: 2,
    numCols: 2,
    callback: function(x, y) {
      console.log("no callback specified for grid_select " + x + ", " + y);
    }
  },

  restart:
  function(x, y)
  {
    var selectedX = x - 2; // numeration starts from 0 and size shall be one bigger than grid size
    var selectedY = y - 2;
    if (BrainSlices.scope.get("grid_dims") !== undefined)
    {
      x = BrainSlices.scope.get("grid_dims").x + 1;
      y = BrainSlices.scope.get("grid_dims").y + 1;
      selectedX = x - 2;
      selectedY = y - 2;
    }

    this.options.numRows = y;
    this.options.numCols = x;
    this.options.initialRows = y;
    this.options.initialCols = x;
    
    this.currentPos =
    {
      x: selectedX,
      y: selectedY
    };

    this.rows = [];

    var thisInstance = this;

    $(this.element).html("");
    var $floatView = $('<div class="grid_view_float"></div>')

    var $table = $('<div class="grid_view_table">');
    this.$table = $table;
    $floatView.append($table);

    var $td;
    for (var i = 0; i < this.options.numRows; i++)
    {
      var $tr = $('<div data-y="' + i + '" class="grid_view_row"></div>');

      for (var j = 0; j < this.options.numCols; j++)
      {
        if ((j < x - 1) && (i < y - 1))
        {
          $td = $('<div class="current-table grid_view_cell" data-x="' + j + '" data-y="' + i + '"></div>');
        }
        else
        {
          $td = $('<div class="grid_view_cell" data-x="' + j + '" data-y="' + i + '"></div>');
        }
        $td
          .mouseover(this.getMouseOver(j, i))
          .appendTo($tr);
      }

      this.rows.push($tr);
      $table.append($tr);
    }
/*
    $table.selectable(
      {
        filter: ".grid_view_cell",
        selecting: function(evt)
        {
          console.log(evt);
        }
      });*/

    var button = $('<button id="btn_grid" class="icon"><div class="grid">&#x25a0;&#x25a0;&#x25a0;<br>&#x25a0;&#x25a0;&#x25a0;<br>&#x25a0;&#x25a0;&#x25a0;<div></button>');

    var leave = function(evt)
    {
      thisInstance.restart(2, 2);
      $floatView.hide(0);
    };

    button.button()
        .mousedown(function(evt)
        {
          $floatView.offset({top: evt.clientY - 10,
                            left: evt.clientX - 10});
          $floatView.show(0);
        })
        .mouseup(leave);

    $floatView
      .mouseleave(leave)
      .mouseup(function(evt)
      {
        // on mouse up it is assumed some selection has occured -> if not, you might be in a trouble
        thisInstance.options.callback(thisInstance.currentPos.x,
                                        thisInstance.currentPos.y);

        leave(evt);
      });

    $(this.element).append(button);
    $(this.element).append($floatView);

    $floatView.hide(0);
  },

  _create:
  function()
  {
    this.restart(this.options.numRows, this.options.numCols);
  },

  getMouseOver:
  function(x, y)
  {
    var thisInstance = this;
    var rows = this.rows;

    return function(evt)
    {
      console.debug(rows);
      if (y == thisInstance.getNumRows() - 1)
      {
        thisInstance.addRow();
      }

      if ((y >= thisInstance.getInitialRows() - 2)
        && (y < thisInstance.getNumRows() - 2))
      {
        thisInstance.deleteRowsFrom(y + 2);
      }

      if (x == thisInstance.getNumCols() - 1)
      {
        thisInstance.addCol();
      }

      if ((x >= thisInstance.getInitialCols() - 2)
        && (x < thisInstance.getNumCols() - 2))
      {
        thisInstance.deleteColsFrom(x + 2);
      }

      thisInstance.currentPos.x = x;
      thisInstance.currentPos.y = y;

      console.log('at', x, y);

      for (var xx = 0; xx < thisInstance.getNumCols(); xx++)
      {
        for (var yy = 0; yy < thisInstance.getNumRows(); yy++)
        {
          /*console.log(xx, x, yy, y)*/
          if ((xx <= x) && (yy <= y))
          {
            console.log(xx, yy);
            rows[yy].children('.grid_view_cell').eq(xx).addClass("selected");
          }
          else
          {
            rows[yy].children('.grid_view_cell').eq(xx).removeClass("selected");
          }
        }
      }
    }
  },

  addRow:
  function()
  {
    var $tr = $('<div class="grid_view_row" data-y="' + this.options.numRows + '"></div>');
    for (j = 0; j < this.options.numCols; j++)
    {
      var $td = $('<div class="grid_view_cell" data-x="' + j + '" data-y="' + this.options.numRows + '"></div>')
        .mouseover(this.getMouseOver(j, this.options.numRows))
        .appendTo($tr);
    }
    this.rows.push($tr);

    this.$table.append($tr);

    this.options.numRows++;
  },

  deleteRowsFrom:
  function(row)
  {
    //for (var i = row; i < this.options.numRows; i++)
    //{
    //  this.$table.find('.grid_view_row[data-y="' + i + '"]').remove();
    //}

    this.rows.splice(row).map(function($tr)
    {
      $tr.remove();
    });

    console.log('rows:', this.rows.length);


    this.options.numRows = row;
  },

  addCol:
  function()
  {
    var thisInstance = this;
    var cols = this.options.numCols;

    this.rows.map(function($tr, y)
    {
      var $td = $('<div class="grid_view_cell" data-x="' + cols + '" data-y="' + y + '"></div>')
        .mouseover(thisInstance.getMouseOver(cols, y))
        .appendTo($tr);
    });

    this.options.numCols++;
  },

  deleteColsFrom:
  function(col)
  {
    for (var i = col; i < this.options.numCols; i++)
    {
      this.$table.find('.grid_view_cell[data-x="' + i + '"]').remove();
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
