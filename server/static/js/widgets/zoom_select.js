$.widget('brain_slices.zoom_select',
{
  options:
  {
    callback:
    function(zoom)
    {
      console.log("callback function not specified, got " + zoom);
    },

    value: 1
  },

  _create:
  function()
  {
    var thisInstance = this;

    this.$button = $('<button>')
      .attr('title', 'zoom')
      .tooltip(BrainSlices.gui.tooltip)
      .addClass('icon')
      .append($('<span>')
        .addClass('fa fa-search-plus'))
      .click(function()
      {
        $(document).bind('click', hideHandler);
        var offset = $(this).offset();
        $view
          .css(
          {
            left: offset.left + "px",
            top: 46 + offset.top + "px"
          })
          .show();
      });
    var $button = this.$button;

    function hide()
    {
      $view.hide();
      $(document).unbind("click", hideHandler);
    }

    function hideHandler(event)
    {
      var $target = $(event.target);
      $target = $.merge($target, $target.parents());

      if ($target.is($doNotClose))
      {
        return;
      }

      hide();
    }

    var $zoomLog = $('<span>')
      .addClass('zoom_select')
      .slider(
      {
        min: 0,
        max: 14,
        value: Math.log(this.options.value) / Math.LN2,
        step: 0.125,
        orientation: "vertical",
        range: "min",
        animate: true,
        slide: function()
        {
          var zoom = Math.pow(2, $zoomLog.slider("value"))
          thisInstance.options.value = zoom;
          $zoom.val(zoom);
          thisInstance.options.callback(zoom);
        }
      });

    this.$zoomLog = $zoomLog;

    var $zoom = $('<input>')
      .attr(
      {
        type: 'number',
        value: this.options.value,
        min: '1',
        max: '16384'
      })
      .addClass('zoom_select')
      .change(function()
      {
        var zoom = $zoom.val();
        thisInstance.options.value = zoom;
        $zoomLog.slider('value', Math.log(zoom) / Math.LN2);
        thisInstance.options.callback(zoom);
      });

    this.$zoom = $zoom;

    var $doNotClose = $.merge($.merge($.merge([], $zoom), $zoomLog), $button);

    var $view = $('<div>')
      .addClass('zoom_select_panel')
      //.hide(0)
      .css('display', 'none')
      .append($zoomLog)
      .append($zoom)

    $(this.element)
      .append($button)
      .append($view);
  },

  value:
  function(zoom)
  {
    if (zoom == null) return this.options.value;

    zoom = parseFloat(zoom);
    if (zoom != this.options.value)
    {
      this.options.value = zoom;
      this.$zoom.val(zoom);
      this.$zoomLog.slider('value', Math.log(zoom) / Math.LN2);
    }
  },

  _setOption:
  function(key, value)
  {
    if (key == 'value')
    {
      this.value(value);
    }
    this._super(key, value);
  }
});
