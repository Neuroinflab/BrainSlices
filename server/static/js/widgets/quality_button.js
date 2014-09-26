$.widget( "brain_slices.quality_button",
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

    var $view = $("<div id='panel' class='quality_panel'> </div>")
      .hide()
      .append(this.buttons.high)
      .append("<br>")
      .append(this.buttons.med)
      .append("<br>")
      .append(this.buttons.low)
    
    this.button_show = $('<button id="btn_quality" class="icon">Q</button>');
    var button_show = this.button_show;
    var hideHandler = function(event)
    {
      var $target = $(event.target);
      if ($target.attr('id') == "btn_quality" ||
          1 == $target.parents().filter('#btn_quality').length)
      {
        return;
      }

      $view.hide();
      $(document).unbind("click", hideHandler);
    }
    
    $(this.element).html(this.button_show).append($view)
    this.button_show.click(function()
    {
      $(document).bind('click', hideHandler);
      $view
        .css(
        {
          left: 21 + button_show.offset().left + "px",
          top: 46 + button_show.offset().top + "px"
        })
        .show();
    });

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
