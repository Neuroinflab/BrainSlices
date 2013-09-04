/* File: draggable_div.js */

/*****************************************************************************\
 * Function: onKeyDown                                                       *
 *                                                                           *
 * Create a handler of a particular key down event.                          *
 *                                                                           *
 * Parameters:                                                               *
 *   key - A code of the key which the handler is created for.               *
 *   f - A function to be called when the key is pressed.                    *
 *                                                                           *
 * Returns:                                                                  *
 *   The created handler. function                                           *
\*****************************************************************************/
function onKeyDown(key, f)
{
  return function(e)
  {
    var keynum;

    if(window.event) //IE
    {
      keynum = e.keyCode;
    }
    else if(e.which) // Netscape/Firefox/Opera
    {
      keynum = e.which;
    }

    if (keynum == key)
    {
      f();
    }
  };
}

/*****************************************************************************\
 * Class: CDraggableDiv                                                      *
 *                                                                           *
 * A class managing of HTML-based window dragging and content hiding.        *
 *                                                                           *
 * Attributes:                                                               *
 *   $div - A jQuery object representing the HTML-based window.              *
 *   mouseMove - A flag indicating if the window is already dragged. Boolean *
 *   x0 - A horizontal location of mouse cursor when the window dragging     *
 *        started or its position was last time updated.                     *
 *   y0 - A vertical location of mouse cursor when the window dragging       *
 *        started or its position was last time updated.                     *
 *   mouseDownHandler - See <mouseDownHandler> for details. function         *
 *   mouseMoveHandler - See <mouseMoveHandler> for details. function         *
 *   mouseUpHandler - See <mouseUpHandler> for details. function             *
 *   showContent - See <showContent> for details. function                   *
 *   hideContent - See <hideContent> for details. function                   *
 *****************************************************************************
 * Constructor: CDraggableDiv                                                *
 *                                                                           *
 * Parameters:                                                               *
 *   $div - A jQuery object representing the HTML-based window.              *
\*****************************************************************************/
function CDraggableDiv($div)
{
	this.$div = $div;

	this.mouseMove = false;
	this.x0 = null;
	this.y0 = null;

	var thisInstance = this;

	/**
	 * Function: mouseDownHandler
	 *
	 * Start tracking of mouse movement.
	 *************************************/
	this.mouseDownHandler = function (event)
	                        {
	                        	if (!event)
	                        	{
	                        		event = window.event;
	                        	}
	                        	thisInstance.x0 = event.clientX;
	                        	thisInstance.y0 = event.clientY;
	                        	thisInstance.mouseMove = true;
	                          thisInstance.$div.parent().bind('mousemove',
														                                      thisInstance.mouseMoveHandler);
	                        };
	$div.find('.dragBar').bind('mousedown', this.mouseDownHandler);

	/**
	 * Function: mouseMoveHandler
	 *
	 * Update the window position according to the mouse movement.
	 ***************************************************************/
	this.mouseMoveHandler = function (event)
		                      {
		                      	if (!event)
		                      	{
		                      		event = window.event;
		                      	}
	
	                          var mX = event.clientX;
		                        var mY = event.clientY;
	                          var offset = thisInstance.$div.offset();
		                      	thisInstance.$div.css({'top': offset.top + mY - thisInstance.y0,
		                                                  'left': offset.left + mX - thisInstance.x0,
														                          'right': 'auto',
														                          'bottom': 'auto'});
		                        thisInstance.y0 = mY;
		                        thisInstance.x0 = mX;
		                      };

  /**
	 * Function: mouseUpHandler
	 *
	 * Stop tracking of mouse movement.
	 ************************************/
	this.mouseUpHandler = function (event)
	                      {
													if (thisInstance.mouseMove)
													{
														thisInstance.$div.parent().unbind('mousemove',
		                        	                                      thisInstance.mouseMoveHandler);
													}
	                        thisInstance.mouseMove = false;
	                      };
	$div.parent().bind('mouseup', this.mouseUpHandler);

  /**
	 * Function: showContent
	 *
	 * Show the hidden content of the window.
	 ******************************************/
	this.showContent = function ()
	{
		thisInstance.$div.find('.draggableDivContent').show();
		thisInstance.$div.find('.showDraggableDiv').hide();
		thisInstance.$div.find('.hideDraggableDiv').show();
	};

	$div.find('.showDraggableDiv').bind('click', this.showContent);

	/**
	 * Function: hideContent
	 *
	 * Hide the window content.
	 ****************************/
	this.hideContent = function ()
	{
		thisInstance.$div.find('.draggableDivContent').hide();
		thisInstance.$div.find('.showDraggableDiv').show();
		thisInstance.$div.find('.hideDraggableDiv').hide();
	};

	$div.find('.hideDraggableDiv').bind('click', this.hideContent);
}

/*****************************************************************************\
 * Destructor: destroy                                                       *
 *                                                                           *
 * Prepare the object for being disposed.                                    *
\*****************************************************************************/
CDraggableDiv.prototype.destroy = function()
{
	if (this.$div != null)
	{
		this.$div.find('.dragBar').unbind('mousedown', this.mouseDownHandler);
		this.mouseDownHandler = null;

		this.$div.parent().unbind('mouseup', this.mouseUpHandler);
		this.mouseUpHandler = null;

		if (this.mouseMove)
		{
			this.$div.parent().unbind('mousemove', this.mouseMoveHandler);
		}
		this.mouseMoveHandler = null;

		this.$div.find('.showDraggableDiv').unbind('click', this.showContent);
		this.showContent = null;

		this.$div.find('.hideDraggableDiv').unbind('click', this.hideContent);
		this.hideContent = null;
	}
}


/*****************************************************************************\
 * Class: CCloseableDiv                                                      *
 *                                                                           *
 * A class managing of HTML-based window opening and closing.                *
 *                                                                           *
 * Attributes:                                                               *
 *   $div - A jQuery object representing the HTML-based window.              *
 *   onClose - A trigger to be executed when the window is closed.           *
 *   onOpen - A trigger to be executed when the window is opened.            *
 *   close - See <close> for details. function                               *
 *   closeByKey - see <closeByKey> for details. function                     *
 *****************************************************************************
 * Constructor: CCloseableDiv                                                *
 *                                                                           *
 * Parameters:                                                               *
 *   $div - A jQuery object representing the HTML-based window.              *
 *   onClose - A trigger to be executed when the window is closed.           *
 *   onOpen - A trigger to be executed when the window is opened.            *
\*****************************************************************************/
function CCloseableDiv($div, onOpen, onClose)
{
	this.$div = $div;
	this.onClose = onClose;
	this.onOpen = onOpen;

	var thisInstance = this;

	/**
	 * Function: close
	 *
	 * Close the window.
	 *********************/
	this.close = function()
	{
		// the 'ESC' button handler is no longer necessary
		$('body').unbind('keydown', thisInstance.closeByKey);
		thisInstance.$div.hide();

		if (thisInstance.onClose != null)
		{
			thisInstance.onClose();
		}
	};

	/**
	 * Function: closeByKey
	 *
	 * Close the window on 'ESC' key down event.
	 *********************************************/
	this.closeByKey = onKeyDown(27, this.close);

	$div.find('.clickable_close').bind('click', this.close);
}

/*****************************************************************************\
 * Method: open                                                              *
 *                                                                           *
 * Open the window.                                                          *
\*****************************************************************************/
CCloseableDiv.prototype.open = function()
{
	if (this.onOpen != null)
	{
		this.onOpen();
	}

	this.$div.show();
	$('body').bind('keydown', this.closeByKey);
}

/*****************************************************************************\
 * Destructor: destroy                                                       *
 *                                                                           *
 * Prepare the object for being disposed.                                    *
\*****************************************************************************/
CCloseableDiv.prototype.destroy = function()
{
	this.$div.find('.clickable_close').unbind('click', this.close);
	this.close = null;

	$('body').unbind('keydown', this.closeByKey);
	this.closeByKey = null;
}

