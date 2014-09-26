$.widget('brain_slices.quality_button',
{
  options:
  {
    callback:
    function(q)
    {
      console.log("callback function not specified, got " + q);
    }
  },

  _create:
  function()
  {
    var thisInstance = this;
    this.buttons =
    {
      high: $("<button> High </button>"),
      med: $("<button> Medium </button>"),
      low: $("<button> Low </button>")
    }

    var $view = $('<div>')
      .addClass('quality_panel')
      .css('display', 'none')
      .append(this.buttons.high)
      .append("<br>")
      .append(this.buttons.med)
      .append("<br>")
      .append(this.buttons.low)
    
    this.$button = $('<button>')
      .attr('title', 'quality')
      .tooltip(BrainSlices.gui.tooltip)
      .addClass('icon')
      .text('Q')
      .click(function()
      {
        $(document).bind('click', hideHandler);
        var offset = $button.offset()
        $view
          .css(
          {
            left: offset.left + "px",
            top: 46 + offset.top + "px"
          })
          .show();
      });

    var $button = this.$button;
    function hideHandler(event)
    {
      var $target = $(event.target);
      $target = $.merge($target, $target.parents());
      if ($target.is($button))
      {
        return;
      }

      $view.hide();
      $(document).unbind("click", hideHandler);
    }
    
    $(this.element)
      .append($button)
      .append($view);

    for (var q in this.buttons)
    {
      (function(q)
      {
        this.buttons[q].click(function()
        {
          thisInstance.options.callback(q);
        });
      }).call(this, q);
    }
  },

  highlight:
  function(val)
  {
    for (var q in this.buttons)
    {
      this.buttons[q].removeClass("selected");
    }

    if (val in this.buttons)
    {
      this.buttons[val].addClass("selected");
    }
    else
    {
      console.warn('Unknown argument of brain_slices.quality_button.highlight: ' + val);
    }
  }
});
