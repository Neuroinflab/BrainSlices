	 $.widget( "brain_slices.quality_button", {
		options:{ callback: function(q) {
				console.log("callback function not specified, got " + q);
				}},
		_create: function () {
			callback = this.options.callback;
			button_h = $("<button> High </button>") 
			button_h.button({text:"high"})
			button_m = $("<button> Medium </button>") 
			button_m.button({text:"medium"})
			button_l = $("<button> Low </button>")
			button_l.button({text:"low"})

			view = $("<div id='panel' class='quality_panel'> </div>")
				.append(button_h)
				.append(button_m)
				.append(button_l)
			view.hide()
			
			button_show = $('<button id="btn_quality" class="icon">Q</button>');

 			button_show.click(function(){
				view.show();
				view.css("left", 21+ button_show.offset().left + "px");
				view.css("top", 46+ button_show.offset().top + "px");
				window.setTimeout(function(){
				view.hide();
				}, 2000);
			})
			button_h.click( $.proxy( function() { callback("high")} ));
			button_m.click( $.proxy(function() { callback("mid")} ));
			button_l.click( $.proxy(function() { callback("low")} ));
			$(this.element).html(button_show).append(view)
		}
	});
