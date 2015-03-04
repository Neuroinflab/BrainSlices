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

    var $table = this.$table.empty();

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
  },

  _create:
  function()
  {
    var mouseMove = false;
    var thisInstance = this;

    var leave = function(evt)
    {
      mouseMove = false;
      $floatView.hide(0);
    };

    var $table = $('<div class="grid_view_table">')
      .mouseover(function(e)
      {
        mouseMove = false;
      })
      .mouseleave(function(e)
      {
        mouseMove = true;
      });

    this.$table = $table;

    var $floatView = $('<div class="grid_view_float"></div>')
      .hide(0)
      .append($table)
      .mousemove(function(e)
      {
        if (mouseMove)
        {
          var offset = $table.offset();
          var dx = e.pageX - offset.left;
          var dy = e.pageY - offset.top;
          while ($table.outerWidth() < dx)
          {
            thisInstance.addCol();
          }
          while ($table.outerHeight() < dy)
          {
            thisInstance.addRow();
          }
        }
      })
      .mouseup(function(evt)
      {
        // on mouse up it is assumed some selection has occured -> if not, you might be in a trouble
        thisInstance.options.callback(thisInstance.currentPos.x,
                                        thisInstance.currentPos.y);

        leave(evt);
      })
      .appendTo(this.element);

    this.$floatView = $floatView;

    var $button = $('<button id="btn_grid"><div class="grid">&#x25a0;&#x25a0;&#x25a0;<br>&#x25a0;&#x25a0;&#x25a0;<br>&#x25a0;&#x25a0;&#x25a0;<div></button>')
      .addClass('icon')
      .attr('title', 'display lattice dimensions')
      .tooltip(BrainSlices.gui.tooltip)
      .button()
      .mousedown(function(evt)
      {
        thisInstance.restart(2, 2);
        $floatView
          .show(0)
          .offset(
          {
            top: evt.pageY - 10, 
            left: evt.pageX - 10
          });
      })
      .mouseup(leave)
      .appendTo(this.element);
    //this.restart(this.options.numRows, this.options.numCols);
  },

  getMouseOver:
  function(x, y)
  {
    var thisInstance = this;
    var rows = this.rows;

    return function(evt)
    {
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

      for (var xx = 0; xx < thisInstance.getNumCols(); xx++)
      {
        for (var yy = 0; yy < thisInstance.getNumRows(); yy++)
        {
          if ((xx <= x) && (yy <= y))
          {
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
    this.rows.splice(row).map(function($tr)
    {
      $tr.remove();
    });

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
