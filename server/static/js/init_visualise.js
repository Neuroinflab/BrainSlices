function initVisualise()
{
  function rearrangeInterface(gridChanged)
  {
    dims = scope.get("grid_dims");
    var nx = dims.x;
    var ny = dims.y;
    var display = scope.get("display");
    var width = display == 'matrix' ?
                           null :
                           parseInt(Math.max(100, 66 * nx / ny)) + '%';
  
    stacks.rearrange(nx, ny, width);
    if (gridChanged)
    {
      layerManager.arrangeInterface();
      $('#layerList')
        .children('.layer-row')
          .children('.image-details')
            .folder('requestUpdate');
      layerManager.doLazyRefresh();
    }
  }

  var scope = BrainSlices.scope;

  $("#grid_select")
    .grid_select(
    {
      callback:
      function(x,y)
      {
        scope.set("grid_dims", {x: x + 1, y: y + 1});
      }
    });

  $("#btn_synch")
    //.button()
    .tooltip(BrainSlices.gui.tooltip)
    .click(function()
    {
	    var val = scope.get("synch");
	    if (val)
      {
    	  $("#btn_synch").removeClass("selected");
	  	  $("#btn_synch_icon").removeClass("fa-lock");
	      $("#btn_synch_icon").addClass("fa-unlock");
	      scope.set("synch", false);
	    }
      else
      {
    	  $("#btn_synch").addClass("selected");
	  	  $("#btn_synch_icon").addClass("fa-lock");
	      $("#btn_synch_icon").removeClass("fa-unlock");
	      scope.set("synch", true);
	    }
	  });
	

  $("#btn_zoom")
    //.button()
    .zoom_select(
    {
      callback: function(zoom)
      {
        scope.set("zoom", zoom);
      },

      value: 1
    });

  $("#btn_trans")
    //.button()
    .tooltip(BrainSlices.gui.tooltip)
    .click(function()
    {
      $("#trans").css(
      {
        left: 11 + $("#btn_trans").offset().left + "px",
        top:  46 + $("#btn_trans").offset().top + "px"
      })
      .show(0);

      function hideHandler(event)
      {
        var isZoomButton = $(event.target).attr('id') === "btn_trans";
        var hasZoomButtonAsParent = (1 === $(event.target).parents().filter('#btn_trans').length);
        if (isZoomButton || hasZoomButtonAsParent)
        {
          return;
        }

        $("#trans").hide(0);

        $(document).unbind("click", hideHandler);
      };

      $(document).click(hideHandler);
    });

  $("#trans")
    .css(
    {
      height: "100px",
      'z-index': "9999"
    })
    .hide(0)
    .slider(
    {
      min: 0.,
      max: 1.,
      value: 0.5,
      step: 0.0009765625, // 1/1024
      orientation: "vertical",
      range: "min",
      animate: true,
      slide: $.proxy(function()
      {
        var trans = $("#trans").slider("value");
        console.log(trans);
        scope.set( "trans", trans);
      })
    });

  $("#quality_button")
    .quality_button(
    {
	    callback:
      function(q)
      {
	  	  console.log("quality set to " + q);
	  	  scope.set("quality", q);
	    }
    });

  $("#target_select")
    .target_select(
    {
	    callback:
      function(x,y)
      {
    		stacks.setFocusPoint(x,y);
	  		stacks.update();
	    }
    });

  $("#btn_display")
    //.button()
    .tooltip(BrainSlices.gui.tooltip)
    .click(function()
    {
	    var val = scope.get("display");
    	if (val == "matrix")
      {
    		$("#btn_display_icon").removeClass("fa-film");
	      $("#btn_display_icon").addClass("fa-th-large");
    		scope.set("display", "grid");
	    }
      else if (val == "grid")
      {
    		$("#btn_display_icon").addClass("fa-film");
	      $("#btn_display_icon").removeClass("fa-th-large");
    		scope.set("display", "matrix");
	    }
	  });

  $("#btn_compress")
    //.button()
    .tooltip(BrainSlices.gui.tooltip)
    .click(function()
    {
      var images = layerManager.loadedImagesOrdered();
      scope.set('grid_dims', {x: 1, y: 1});
      for (var i = 0; i < images.length; i++)
      {
        if (!stacks.has(0, images[i]))
        {
          layerManager.load(0, images[i], true);
        }
      }
      layerManager.arrangeInterface();
    });

  $("#btn_expand")
    //.button()
    .tooltip(BrainSlices.gui.tooltip)
    .click(function()
    {
      var images = layerManager.loadedImagesOrdered();
      var grid_dims = scope.get('grid_dims');
      var nxCor = grid_dims.x * grid_dims.y < images.length ?
                  parseInt(Math.ceil(images.length / grid_dims.y)) :
                  grid_dims.x;
      layerManager.unloadAll();
      BrainSlices.scope.set('grid_dims', {x: nxCor, y: grid_dims.y});
      for (var i = 0; i < images.length; i++)
      {
        layerManager.load(i, images[images.length - 1 - i], true);
      }

      layerManager.arrangeInterface();
    });

  $('#btn_basket_visualise')
    .tooltip(BrainSlices.gui.tooltip)
    .click(function()
    {
      scope.set('cart', !scope.get('cart'));
    });


  $("#btn_help")
    //.button()
    .tooltip(BrainSlices.gui.tooltip);
  //$("#btn_login").button();
  $("#btn_logout")
    //.button()
    .tooltip(BrainSlices.gui.tooltip);

	scope
    .registerChange(function(val)
    {
      $("#quality_button").quality_button("highlight", val);
    }, 'quality')
    .registerChange(function(val)
    {
      $("#btn_zoom").zoom_select("value", val);
      state.zoom = val; // XXX obsoleted
    }, 'zoom')
    .registerChange(function(val)
    {
      $("#trans").slider("value", val);
    }, 'trans')
    .registerChange(function(val)
    {
      state.display = val; // XXX obsoleted
      rearrangeInterface();
    }, 'display')
    .registerChange(function(val)
    {
      state.shape = [val.x, val.y]; // XXX obsoleted
      rearrangeInterface(true);

      $('.visible-column')
        .width(Math.max(val.x * 20, 65)); // XXX hard coded
    }, 'grid_dims')
    .registerChange(function(val)
    {
      if (scope.get('interfaceMode') == 'visualise')
      {
        stacks.resize();
      }
    }, 'cart');
}


function initVisualiseFinish(state)
{
  var scope = BrainSlices.scope;

  scope.set("grid_dims", {x: state.shape[0],
                          y: state.shape[1]});

  scope.set("display", state.display);

  stacks.setFocusPoint(state.focus[0][0], state.focus[0][1]);
  var nx = state.shape[0];
  var ny = state.shape[1];
  $('#x').val(state.focus[0][0]);
  $('#y').val(state.focus[0][1]);

  stacks.updateZoomPanel(); // XXX
  if (state.display == 'serial') // != 'matrix'
  {
    stacks.rearrange(nx, ny, parseInt(Math.max(100, 66 * nx / ny)) + '%');
  }

  for (var i = 0; i < state.focus.length; i++)
  {
    stacks.setFocusPoint(state.focus[i][0], state.focus[i][1], i);
  }

  if (state.sync)
  {
    stacks.syncStart();
  }
}


