	 $.widget( "brain_slices.target_select", {
		options:{ callback: function(x,y) {
				console.log("callback function not specified, got " + x + ", "+ y);
				}},
		_create: function () {
			callback = this.options.callback;
			button  = $('<button id="btn_target" class="icon"><span class="fa fa-crosshairs"></span></button>')
			form = $('<div id="dialog-target" title="Pick coordinates"> </div>')
			form.append( $("<form></form>")
				.append("<label for='x'> X </label>")
				.append("<input type='text' name='x' id='x'></input class='text ui-widget-content ui-corner-all' >  <br>")
				.append("<label for='y'> Y </label>")
				.append("<input type='text' name='y' id='y'></input class='text ui-widget-content ui-corner-all' > ")
			);
			$(this.element).html(button).append(form)
			button.button()
			.click(function(){
				form.dialog("open");
			});
			form.dialog({
				autoOpen:false,
				buttons:{
					OK:function(){
					callback( form.find("#x").val(), form.find("#y").val() );
					$(this).dialog("close");
					},
					"Cancel":function(){
					$(this).dialog("close");
					}
				
				},
				dialogClass:"modalwin"
			})
			form.addClass("modalwin");
			form.dialog("close");

		}
	});
