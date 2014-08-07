$.widget("brainslices.cart",
{
  options:
  {
    image: null,
  },
  
  _create:
  function()
  {
    $("#control-panel-fold-button").button();
    $("#search-panel-fold-button").button();
    $("#fold-all-button").button();

    this._hideButtons();
    this._setButtonsForFoldState("FULLY_FOLDED");

    $("#control-panel", this.element).hide();
    $("#search-panel", this.element).hide();
  },

  _unfoldAll:
  function()
  {
    this._unfoldPanel("control-panel",
      $.proxy(function()
      {
        this._unfoldPanel("search-panel",
          $.proxy(function()
          {
            this._setButtonsForFoldState("FULLY_UNFOLDED");
          }, this));
      }, this));
  },

  _foldAll:
  function()
  {
    this._foldPanel("search-panel",
      $.proxy(function()
      {
        this._foldPanel("control-panel",
          $.proxy(function()
          {
            this._setButtonsForFoldState("FULLY_FOLDED");
          }, this));
      }, this));
  },

  _setButtonsForFoldState:
  function(state)
  {
    var self = this;

    if (state === "FULLY_UNFOLDED")
    {
      $("#search-panel-fold-button-icon")
        .removeClass("fa-angle-left")
        .addClass("fa-angle-right");

      $("#fold-all-button-icon")
        .removeClass("fa-angle-double-left")
        .addClass("fa-angle-double-right");

      $('#search-panel-fold-button')
        .unbind('click')
        .click($.proxy(function()
        {
          self._foldPanel("search-panel", $.proxy(function()
          {
            self._setButtonsForFoldState("PARTIALLY_UNFOLDED");
          }, self));
        }));

      $('#fold-all-button')
        .unbind('click')
        .click($.proxy(self._foldAll, self));

      $("#search-panel-fold-button").show();
      $("#fold-all-button").show();
    }
    else if (state === "PARTIALLY_UNFOLDED")
    {
      $("#control-panel-fold-button-icon")
        .removeClass("fa-angle-left")
        .addClass("fa-angle-right");

      $("#search-panel-fold-button-icon")
        .removeClass("fa-angle-right")
        .addClass("fa-angle-left");

      $('#control-panel-fold-button')
        .unbind('click')
        .click($.proxy(function()
        {
          self._foldPanel("control-panel", $.proxy(function()
          {
            self._setButtonsForFoldState("FULLY_FOLDED");
          }, self));
        }));

      $('#search-panel-fold-button')
        .unbind('click')
        .click($.proxy(function()
        {
          self._unfoldPanel("search-panel", $.proxy(function()
          {
            self._setButtonsForFoldState("FULLY_UNFOLDED");
          }, self));
        }));

      $("#control-panel-fold-button").show();
      $("#search-panel-fold-button").show();
    }
    else if (state === "FULLY_FOLDED")
    {
      $("#control-panel-fold-button-icon")
        .removeClass("fa-angle-right")
        .addClass("fa-angle-left");

      $("#fold-all-button-icon")
        .removeClass("fa-angle-double-right")
        .addClass("fa-angle-double-left");

      $('#control-panel-fold-button')
        .unbind('click')
        .click($.proxy(function()
        {
          self._unfoldPanel("control-panel", $.proxy(function()
          {
            self._setButtonsForFoldState("PARTIALLY_UNFOLDED");
          }, self));
        }));

      $('#fold-all-button')
        .unbind('click')
        .click($.proxy(self._unfoldAll, self));

      $("#control-panel-fold-button").show();
      $("#fold-all-button").show();
    }
  },

  _foldPanel:
  function(panelId, callback)
  {
    this._hideButtons();

    $("#" + panelId, this.element).hide('slide', { direction: "right" }, 650, callback);
  },

  _unfoldPanel: function(panelId, callback)
  {
    this._hideButtons();

    $("#" + panelId, this.element).show('slide', { direction: "right" }, 650,
                                         function()
                                         {
                                           // XXX a hook
                                           $("#" + panelId + ' ' + '.search-content-wrapper>div').folder('refresh');
                                           callback();
                                         });
  },
  
  _hideButtons: function()
  {
    $("#control-panel-fold-button").hide();
    $("#search-panel-fold-button").hide();
    $("#fold-all-button").hide();
  }
});
