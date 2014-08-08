
$.widget("brainslices.navbar",
{
  options:
  {
    scope: null
  },

  _create:
  function()
  {
    var scope = this.options.scope;
    $("#grid_select").grid_select(
    {
      callback:
      function(x,y)
      {
        BrainSlices.scope.set("grid_dims", {x: x + 1, y: y + 1});
  	  }
    });

    $("#btn_synch").button().click(function()
    {
		  var val = BrainSlices.scope.get("synch");
		  if (val)
      {
  		  $("#btn_synch").removeClass("selected");
	  	  $("#btn_synch_icon").removeClass("fa-lock");
		    $("#btn_synch_icon").addClass("fa-unlock");
		    BrainSlices.scope.set("synch", false);
		  }
      else
      {
  		  $("#btn_synch").addClass("selected");
	  	  $("#btn_synch_icon").addClass("fa-lock");
		    $("#btn_synch_icon").removeClass("fa-unlock");
		    BrainSlices.scope.set("synch", true);
		  }
	  });
	

    $("#btn_zoom").button().click(function()
    {
      $("#zoom").css("left", 21 + $("#btn_zoom").offset().left + "px");
      $("#zoom").css("top", 46 + $("#btn_zoom").offset().top + "px");
      $("#zoom").show();

      function hideHandler(event)
      {
        var isZoomButton = $(event.target).attr('id') === "btn_zoom";
        var hasZoomButtonAsParent = (1 === $(event.target).parents().filter('#btn_zoom').length);
        if (isZoomButton || hasZoomButtonAsParent)
        {
          return;
        }

        $("#zoom").hide();

        $(document).unbind("click", hideHandler);
      };

      $(document).click(hideHandler);
    });

    $("#btn_trans").button().click(function()
    {
      $("#trans").css("left", 21 + $("#btn_trans").offset().left + "px");
      $("#trans").css("top", 46 + $("#btn_trans").offset().top + "px");
      $("#trans").show();

      function hideHandler(event)
      {
        var isZoomButton = $(event.target).attr('id') === "btn_trans";
        var hasZoomButtonAsParent = (1 === $(event.target).parents().filter('#btn_trans').length);
        if (isZoomButton || hasZoomButtonAsParent)
        {
          return;
        }

        $("#trans").hide();

        $(document).unbind("click", hideHandler);
      };

      $(document).click(hideHandler);
    });

    $("#quality_button").quality_button(
    {
		  callback:
      function(q)
      {
			  console.log("quality set to " + q);
			  scope.set("quality", q);
	    }
    });
	  scope.register(
    {
      change:
      function(variable, val)
      {
        if (variable == "quality")
        {
    			$("#quality_button").quality_button("highlight", val);
        }
      }
    });

  	$("#target_select").target_select(
    {
		  callback:
      function(x,y)
      {
  			stacks.setFocusPoint(x,y);
	  		stacks.update();
	    }
    });
    $("#btn_display").button().click(function()
    {
		  var val = BrainSlices.scope.get("display");
  		if (val==="matrix")
      {
    		$("#btn_display_icon").removeClass("fa-film");
		    $("#btn_display_icon").addClass("fa-th-large");
    		BrainSlices.scope.set("display", "grid");
		  }
      else if (val==="grid")
      {
    		$("#btn_display_icon").addClass("fa-film");
		    $("#btn_display_icon").removeClass("fa-th-large");
    		BrainSlices.scope.set("display", "matrix");
		  }
	  });

    $("#btn_compress").button().click(compressStacks); //XXX
    $("#btn_expand").button().click(decompressStacks);
    $("#btn_help").button();

    $("#btn_login").button();

    $("#btn_logout").button();

    $("#zoom").slider(
    {
      min:0,
      max:14,
      value: 3,
      step: 0.125,
      orientation: "vertical",
      range: "min",
      animate: true,
      slide: $.proxy(function()
      {
        scope.set( "zoom", Math.pow(2,$("#zoom").slider("value")));
      })
    });

    $("#zoom").css("height", "100px");
    $("#zoom").css("z-index", "9999");
    
    $("#zoom").hide();
    scope.register(
    {
      change:
      function(variable, val)
      {
        if (variable == "zoom")
        {
          $("#zoom").slider("value", Math.log(val) / Math.log(2));
        }
      }
    });

    $("#trans").slider(
    {
      min:0,
      max:1,
      value: 0.5,
      step: 0.1,
      orientation: "vertical",
      range: "min",
      animate: true,
      slide: $.proxy(function()
      {
        scope.set( "trans", $("#trans").slider("value"));
      })
    });

    $("#trans").css("height", "100px");
    $("#trans").css("z-index", "9999");
    
    $("#trans").hide();

    scope.register(
    {
      change:
      function(variable, val)
      {
        if (variable == "trans")
        {
          $("#trans").slider("value", val);
        }
      }
    });
  }
});
