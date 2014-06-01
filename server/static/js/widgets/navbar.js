
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
                            .append('<div id="target_select"> </div>')
                            .append('<div id="quality_button"> </div>')
                        )
                .append($('<div id="right">')
                            .append('<button id="btn_help" class="icon"><span class="fa fa-question"></span></button>')
                            .append('<button id="btn_login" class="icon"><span class="fa fa-power-off"></span></button>')
                            .append('<button id="btn_logout" class="icon"><span class="fa fa-power-off"></span></button>')
                        )
                .append($('<span id="zoom" />'));

        $("#grid_select").grid_select({
            callback: function(x,y) {
                BrainSlices.scope.set("grid_dims", {x: x + 1, y: y + 1});
    		}
        });

        $("#btn_select").button();

        $("#btn_zoom").button().click(function() {
            $("#zoom").css("left", 21 + $("#btn_zoom").offset().left + "px");
            $("#zoom").css("top", 46 + $("#btn_zoom").offset().top + "px");
            $("#zoom").show();

            var hideHandler = function(event) {
                var isZoomButton = $(event.target).attr('id') === "btn_zoom";
                var hasZoomButtonAsParent = (1 === $(event.target).parents().filter(function(parent) {
                                                return $(this).attr('id') === 'btn_zoom';
                                            }).length);
                if (isZoomButton || hasZoomButtonAsParent) {
                    return;
                }

                $("#zoom").hide();

                $(document).unbind("click", hideHandler);
            };

            $(document).click(hideHandler);
        });


        $("#quality_button").quality_button({
		callback:function(q){
			scope.set("quality", q);
	}});
	$("#target_select").target_select({
		callback:function(x,y){
			stacks.setFocusPoint(x,y);
			stacks.update();
	}});


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
            animate: true,
            slide: $.proxy(function() {
                scope.set( "zoom", Math.pow(2,$("#zoom").slider("value")));
            })
        });

        $("#zoom").css("height", "100px");
        $("#zoom").css("z-index", "9999");
        
        $("#zoom").hide();

        // $("#zoom").on('slidechange', 

        scope.register({
            change:function(variable, val){
                if(variable == "zoom") {
                    $("#zoom").slider("value", Math.log(val) / Math.log(2));
                }
            }
        });
    }
});
