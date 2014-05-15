$.widget("brainslices.grid_select", {
    options: {
        numRows: 2,
        numCols: 2,
        rows: new Array,
        callback: function(x, y) {
            console.log("no callback specified for grid_select "+x+ ", "+y)
        },
    },
    restart: function(x, y) {
        this.options.numRows = x;
        this.options.numCols = y;
        rows = new Array;
        grid_view_this = this;
        $(this.element).html("");
        float = $("<div class='grid_view_float'></div>")
        table = $("<table id='selectable' class='grid_view_table'>");
        float.append(table);

        for (i = 0; i < this.options.numRows; i++) {
            tr = $('<tr></tr>');
            for (j = 0; j < this.options.numCols; j++) {
                tr.append('<td  class="grid_row_' + i + ' grid_col_' + j + '"></td>');
            }
            tr["grid_view_id"] = i;
            this.options.rows.push(tr);
            table.append(tr);
        }

        table.selectable(
                {
                    filter: "td",
                    selecting: function(evt) {
                        console.log(evt);
                    }
                });

        button = $("<button id='btn_siatka'>Grid</button>");
        leave = function(evt) {
            grid_view_this.restart(2, 2);
            float.hide();
        };
        button.button({
            icons: {
                primary: "ui-icon-grip-dotted-vertical"
            },
            text: false
        })
                .mousedown(function(evt) {
                    float.offset({top: evt.clientY-10, left: evt.clientX-10});
                    float.show();
                })
                .mouseup(leave);
        float.mouseleave(leave)
                .mouseup(function(evt) {
                    //very hacky hack, TODO FIXME YOLO
                    var x;
                    var y;
                    for (i = 0; i < grid_view_this.getNumRows(); i++)
                        if ($(evt.target).hasClass("grid_row_" + i ))
                            y = i;
                    for (i = 0; i < grid_view_this.getNumCols(); i++)
                        if ($(evt.target).hasClass("grid_col_" + i))
                            x = i;
                    grid_view_this.options.callback(x,y);
                    leave(evt);
                })
                .on("mouseover", function(evt) {
                    if ($(evt.target).hasClass("grid_row_" + (grid_view_this.getNumRows() - 1)))
                        grid_view_this.addRow();
                    if ($(evt.target).hasClass("grid_col_" + (grid_view_this.getNumCols() - 1)))
                        grid_view_this.addCol();

                })

        $(this.element).append(button).append(float);
        float.hide();

    },
    _create: function() {
        this.restart(this.options.numRows, this.options.numCols);
    },
    addRow: function() {

        tr = $('<tr></tr>');
        tr["grid_view_id"] = this.options.numRows;
        for (j = 0; j < this.options.numCols; j++) {
            tr.append('<td class="grid_row_' + this.options.numRows + ' grid_col_' + j + '"></td>');
        }
        this.options.rows.push(tr);
        $(".grid_view_table").append(tr);
        this.options.numRows++;
    },
    addCol: function() {
        cols = this.options.numCols;
        this.options.rows.map(function(tr) {
            tr.append('<td class="grid_row_' + tr["grid_view_id"] + ' grid_col_' + cols + '"></td>');
        });
        this.options.numCols++;

    },
    getNumCols: function() {
        return this.options.numCols;
    },
    getNumRows: function() {
        return this.options.numRows;
    }


});

