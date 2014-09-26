$.widget('brain_slices.target_select',
{
  options:
  {
    callback:
    function(x,y)
    {
      console.log("callback function not specified, got " + x + ", "+ y);
    }
  },

  _create:
  function()
  {
    var thisInstance = this;

    this.$button = $('<button>')
      .attr('title', 'focus')
      .tooltip(BrainSlices.gui.tooltip)
      .addClass('icon')
      .append($('<span>')
        .addClass('fa fa-crosshairs'))
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
      console.log($view);
      stupid_view = $view
    }

    function callback()
    {
      var x = parseFloat($x.val());
      var y = parseFloat($y.val());
      if (isNaN(x) || isNaN(y)) return;
      thisInstance.options.callback(x, y);
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

    var $x = $('<input>')
      .attr(
      {
        type: 'number',
        title: 'X coordinate',
        value: '0'
      })
      .tooltip(BrainSlices.gui.tooltip)
      .addClass('target_select_x')
      .change(callback);

    var $y = $('<input>')
      .attr(
      {
        type: 'number',
        title: 'Y coordinate',
        value: '0'
      })
      .tooltip(BrainSlices.gui.tooltip)
      .addClass('target_select_y')
      .change(callback);

    var $input = $('<label>')
      .addClass('selectWrapper target_select')
      .text('x')
      .prepend($x)
      .append($y);

    var $doNotClose = $.merge($.merge([], $input), $button);

    var $view = $('<div>')
      .addClass('target_select_panel')
      //.hide(0)
      .css('display', 'none')
      .append($input)
      .append($('<button>')
        .addClass('icon')
        .append($('<span>')
          .addClass('fa fa-crosshairs'))
        .click(callback))
        //function()
        //{
        //  callback()
        //  hide();
        //}))
      .append($('<button>')
        .addClass('icon')
        .append($('<span>')
          .addClass('fa fa-times')));
//        .click(hide))
//      .appendTo($button);

    $(this.element)
      .append($button)
      .append($view);
  }
});
