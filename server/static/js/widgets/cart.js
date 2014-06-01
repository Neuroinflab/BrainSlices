
$.widget("brainslices.cart", {
    options: {
        image:null,
    },
    
    _create: function(){
        $("#control-panel-fold-button").button();
        $("#search-panel-fold-button").button();
        $("#fold-all-button").button();

        this._setButtonsForFoldState("FULLY_FOLDED");

        $("#control-panel", this.element).hide();
        $("#search-panel", this.element).hide();
    },

    _unfoldAll: function() {
        var element = this.element;

        $("#control-panel", element).show('slide', { direction: "right" }, 650,
            function() {
                $("#search-panel", element).show('slide', { direction: "right" }, 650);
            });

        this._setButtonsForFoldState("FULLY_UNFOLDED");
    },

    _foldAll: function() {
        var element = this.element;

        $("#search-panel", element).hide('slide', { direction: "right" }, 650,
            function() {
                $("#control-panel", element).hide('slide', { direction: "right" }, 650);
            });

        this._setButtonsForFoldState("FULLY_FOLDED");
    },
    
    _unfoldControlPanel:function() {
        $("#control-panel", this.element).show('slide', { direction: "right" }, 650);

        this._setButtonsForFoldState("PARTIALLY_UNFOLDED");
    },
    
    _foldControlPanel:function(){
        $("#control-panel", this.element).hide('slide', { direction: "right" }, 650);

        this._setButtonsForFoldState("FULLY_FOLDED");
    },

    _unfoldSearchPanel: function() {
        $("#search-panel", this.element).show('slide', { direction: "right" }, 650);


        this._setButtonsForFoldState("FULLY_UNFOLDED");
    },
    
    _foldSearchPanel: function(){
        $("#search-panel", this.element).hide('slide', { direction: "right" }, 650);

        this._setButtonsForFoldState("PARTIALLY_UNFOLDED");
    },

    _setButtonsForFoldState: function(state) {
        if (state === "FULLY_UNFOLDED") {
            $("#search-panel-fold-button-icon")
                .removeClass("fa-angle-left")
                .addClass("fa-angle-right");

            $("#fold-all-button-icon")
                .removeClass("fa-angle-double-left")
                .addClass("fa-angle-double-right");

            $('#search-panel-fold-button')
                .unbind('click', $.proxy(this._unfoldSearchPanel, this))
                .click($.proxy(this._foldSearchPanel, this));

            $('#fold-all-button')
                .unbind('click', $.proxy(this._unfoldAll, this))
                .click($.proxy(this._foldAll, this));

            $("#control-panel-fold-button").hide();
            $("#search-panel-fold-button").show();
            $("#fold-all-button").show();
        }
        else if (state === "PARTIALLY_UNFOLDED") {
            $("#control-panel-fold-button-icon")
                .removeClass("fa-angle-left")
                .addClass("fa-angle-right");

            $("#search-panel-fold-button-icon")
                .removeClass("fa-angle-right")
                .addClass("fa-angle-left");

            $('#control-panel-fold-button')
                .unbind('click', $.proxy(this._unfoldControlPanel, this))
                .click($.proxy(this._foldControlPanel, this));

            $('#search-panel-fold-button')
                .unbind('click', $.proxy(this._foldSearchPanel, this))
                .click($.proxy(this._unfoldSearchPanel, this));

            $("#control-panel-fold-button").show();
            $("#search-panel-fold-button").show();
            $("#fold-all-button").hide();
        }
        else if (state === "FULLY_FOLDED") {
            $("#control-panel-fold-button-icon")
                .removeClass("fa-angle-right")
                .addClass("fa-angle-left");

            $("#fold-all-button-icon")
                .removeClass("fa-angle-double-right")
                .addClass("fa-angle-double-left");

            $('#control-panel-fold-button')
                .unbind('click', $.proxy(this._foldControlPanel, this))
                .click($.proxy(this._unfoldControlPanel, this));

            $('#fold-all-button')
                .unbind('click', $.proxy(this._foldAll, this))
                .click($.proxy(this._unfoldAll, this));

            $("#control-panel-fold-button").show();
            $("#search-panel-fold-button").hide();
            $("#fold-all-button").show();
        }
    }
});
