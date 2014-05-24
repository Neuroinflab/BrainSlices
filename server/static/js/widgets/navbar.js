
$.widget("brainslices.navbar", {
    options: {
        scope:null
    },

    _create: function() {
        scope = this.options.scope;

        $(this.element).html("")
                .append($('<div id=left>')
                            .append('<div id="grid_select"></div>')
                            .append('<button id="btn_select" class="icon"><span class="fa fa-unlock"></span></button>')
                            .append('<button id="btn_zoom" class="icon"><span class="fa fa-search"></span></button>')
                            .append('<button id="btn_target" class="icon"><span class="fa fa-crosshairs"></span></button>')
                            .append('<button id="btn_quality" class="icon">Q</button>')
                        )
                .append($('<div id="right">')
                            .append('<button id="btn_help" class="icon"><span class="fa fa-question"></span></button>')
                            .append('<button id="btn_login" class="icon"><span class="fa fa-power-off"></span></button>')
                            .append('<button id="btn_logout" class="icon"><span class="fa fa-power-off"></span></button>')
                        )
                .append($('<span id="zoom" />'));

        $("#grid_select").grid_select({
            callback: function(x,y) {
                BrainSlices.scope.set("grid_dims", {x:x+1, y:y+1});
    		}
        });

        $("#btn_select").button();

        $("#btn_zoom").button().click(function() {
            $("#zoom").css("left", 21 + $("#btn_zoom").offset().left + "px");
            $("#zoom").css("top", 46 + $("#btn_zoom").offset().top + "px");
            $("#zoom").show();
            
            window.setTimeout(function() {
                $("#zoom").hide();
            }, 2000);
        });

        $("#btn_target").button();

        $("#btn_quality").button();

        $("#btn_help").button();

        $("#btn_login").button();

        $("#btn_logout").button();

        $("#zoom").slider({
            min:0,
            max:14,
            value: 3,
            step: 0.125,
            orientation: "vertical",
            range: "min",
            animate: true
        });
        
        $("#zoom").hide();

        $("#zoom").on('slidechange', $.proxy(function() {
             scope.set( "zoom", Math.pow(2,$("#zoom").slider("value")));
        }));

        scope.register({
            change:function(variable, val){
                if(variable == "zoom") {
                    $("#zoom").slider("value", Math.log(val) / Math.log(2));
                }
            }
        });
    }
});
