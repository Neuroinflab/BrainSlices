
$.widget( "brainslices.display", {
    options: {
    },
    
    _create: function(){
      $(this.element).html("<img class=img-fill src=img/displayy.png > <div></div>")
       this.fold();
    },
    
    fold:function(){
        $(this.element).addClass("display-folded");
        $(this.element).removeClass("display-unfolded");
    },
   
    unfold:function(){
        $(this.element).removeClass("display-folded");
        $(this.element).addClass("display-unfolded");
       
   }
});
