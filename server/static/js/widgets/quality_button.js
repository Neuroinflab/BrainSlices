	 $.widget( "brain_slices.quality_button", {
		options:{ callback: function(q) {
				console.log("callback function not specified, got " + q);
				}},
		_create: function () {
			thisInstance = this;
			callbackor = this.options.callback;
			this.button_h = $("<button> High </button>") 
			this.button_m = $("<button> Medium </button>") 
			this.button_l = $("<button> Low </button>")

			view = $("<div id='panel' class='quality_panel'> </div>")
				.append(this.button_h)
				.append("<br>")
				.append(this.button_m)
				.append("<br>")
				.append(this.button_l)
			view.hide()
			
			this.button_show = $('<button id="btn_quality" class="icon">Q</button>');
			button_show = this.button_show;
			
			$(this.element).html(this.button_show).append(view)
 			this.button_show.click(function(){
				view.show();
				view.css("left", 21+ button_show.offset().left + "px");
				view.css("top", 46+ button_show.offset().top + "px");
				window.setTimeout(function(){
				view.hide();
				}, 2000);
			})
			this.button_h.click(  function() {
				 thisInstance.options.callback("high")} );
			this.button_m.click( (function() {
				 thisInstance.options.callback("med")} ));
			this.button_l.click( (function() { 
				 thisInstance.options.callback("low")} ));
		},
		highlight: function(val){
			this.button_h.removeClass("selected");	
			this.button_m.removeClass("selected");	
			this.button_l.removeClass("selected");
			if( val == "high"){
				this.button_h.addClass("selected");
			} else if ( val == "med" ){
				this.button_m.addClass("selected");
			} else if ( val == "low" )	
				this.button_l.addClass("selected");
		}
	});
