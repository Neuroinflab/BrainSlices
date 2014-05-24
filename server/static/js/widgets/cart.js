
$.widget( "brainslices.cart", {
    options: {
        image:null,
    },
    
    _create: function(){
       this._fold();
    },
    
    _unfold:function(){
    //    display.display("unfold");
        $("#control_panel").show();
       $(this.element).addClass("cart-unfolded"); 
       $(this.element).removeClass("cart-folded"); 
        $("#cart_controls").html(this._unfoldedHtml()); 
    },
    
    _fold:function(){
     //   display.display("fold");
        $("#control_panel").hide();
       $(this.element).removeClass("cart-unfolded"); 
       $(this.element).addClass("cart-folded"); 
       $("#cart_controls").html(this._foldedHtml()); 
    },
    
    _foldedHtml: function(){
        var self = this;
        $("#midbutton").remove();
        $("#cart_controls").html("<button id=midbutton> unfold</div>");
        $("#midbutton").button({
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
        $("#cart_controls").html("<button id=midbutton> fold</div>");
             //   .append( "<div class='cart-items'> <img class=img-fill src='img/cart.png' /> </div>");
        $("#midbutton").button({
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
