
$.widget( "brainslices.search", {
    options: {
        image:null,
    },
    
    _create: function(){
       this._fold();
    },
    
    _unfold:function(){
       $("#search1 #search_panel").show();
       $(this.element).addClass("search-unfolded"); 
       $(this.element).removeClass("search-folded"); 
        $("#search_controls").html(this._unfoldedHtml()); 
    },
    
    _fold:function(){
       $("#search1 #search_panel").hide();
       $(this.element).removeClass("search-unfolded"); 
       $(this.element).addClass("search-folded"); 
       $("#search_controls").html(this._foldedHtml()); 
    },
    
    _foldedHtml: function(){
        var self = this;
        $("#search1 #midbutton").remove();
        $("#search1 #search_controls").html("<button id=midbutton> unfold</div>");
        $("#search1 #midbutton").button({
        icons: {
            primary: "ui-icon-carat-1-w"
        },
            text: false,
            
        })
        .click(function(){
                    self._unfold();
        });
        
        },
        
    _unfoldedHtml: function(){
        var self = this;
        $("#search1 #search_controls").html("<button id=midbutton> fold</div>");
             //   .append( "<div class='search-items'> <img class=img-fill src='img/search.png' /> </div>");
        $("#search1 #midbutton").button({
        icons: {
            primary: "ui-icon-carat-1-e"
        },
            text: false,
            
        })
        .click(function(){
                    self._fold();
        });
        
        },
    });
