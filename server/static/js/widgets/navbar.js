
$.widget("brainslices.navbar", {
    options: {
        scope:null
    },
    _create: function() {
        scope = this.options.scope;
        $(this.element).html("")
                .append($("<div id=left>")
                        .append("<div id=btn_siatka >Siatka </div>")
                        .append("<button id=btn_select >Select </button>")
                        .append("<div id=bar1> </button>")
                        .append("<button id=btn_zoom > Zoom </button>")
                        .append("<button id=btn_target > Target </button>")
                        .append("<button id=btn_quality > Quality </button>")
                        )
                .append($("<div id=mid>"))
                .append($("<div id=right>")
                        .append("<button id=btn_help>  Help </button>")
                        .append("<button id=btn_login>  Login </button>")
                        )
                .append($("<span id=zoom />"));



        $("#btn_siatka").grid_select({
            callback: function(x,y){
		BrainSlices.scope.set("grid_dims", {x:x+1, y:y+1});
		}
	});

        $("#btn_select").button({
            icons: {
                primary: "ui-icon-check"
            },
            text: false
        });

        $("#btn_zoom").button({
            icons: {
                primary: "ui-icon-zoomin"
            },
            text: false
        }).click(function() {
            $("#zoom")
                    .css("left", 21 + $("#btn_zoom").offset().left + "px")
                    .css("top", 46 + $("#btn_zoom").offset().top + "px");
            $("#zoom").show();
           // $("#zoom").onmouseout(function() {
                window.setTimeout(function() {
                    $("#zoom").hide();
                }, 2000);
           // });
        });

        $("#btn_target").button({
            icons: {
                primary: "ui-icon-arrow-4-diag"
            },
            text: false
        });

        $("#btn_quality").button({
            icons: {
                primary: "ui-icon-star"
            },
            text: false
        });

        $("#btn_help").button({
            icons: {
                primary: "ui-icon-help"
            },
            text: false
        });

        $("#btn_login").button({
            icons: {
                primary: "ui-icon-power"
            },
            text: false
        });

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
                $("#zoom").on('slidechange', $.proxy(function()
        {
             scope.set( "zoom", Math.pow(2,$("#zoom").slider("value")));

        }));
        scope.register({
            change:function(variable, val){
                if(variable == "zoom")
                    $("#zoom").slider("value", Math.log(val) / Math.log(2));
            }
        })
    }

});
