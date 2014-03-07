/* File: interface.js */
/*****************************************************************************\
*                                                                             *
*    This file is part of BrainSlices Software                                *
*                                                                             *
*    Copyright (C) 2012-2014 J. M. Kowalski                                   *
*                                                                             *
*    BrainSlices software is free software: you can redistribute it and/or    *
*    modify it under the terms of the GNU General Public License as           *
*    published by the Free Software Foundation, either version 3 of the       *
*    License, or (at your option) any later version.                          *
*                                                                             *
*    BrainSlices software is distributed in the hope that it will be useful,  *
*    but WITHOUT ANY WARRANTY; without even the implied warranty of           *
*    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the            *
*    GNU General Public License for more details.                             *
*                                                                             *
*    You should have received a copy of the GNU General Public License        *
*    along with BrainSlices software.                                         *
*    If not, see http://www.gnu.org/licenses/.                                *
*                                                                             *
\*****************************************************************************/

(function(BS, $, undefined)
{
  /**
   * Function: onKeyDown
   *
   * Create a handler of a particular key down event.
   *
   * Parameters:
   *   key - A code of the key which the handler is created for.
   *   f - A function to be called when the key is pressed.
   *
   * Returns:
   *   The created handler. function
  \***************************************************************************/
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

  if (BS.gui.CDraggableDiv == null)
  {
    /**
     * Class: CDraggableDiv
     *
     * A class managing of HTML-based window dragging and content hiding.
     *
     * Attributes:
     *   $div - A jQuery object representing the HTML-based window.
     *   mouseMove - A flag indicating if the window is already dragged. Boolean
     *   x0 - A horizontal location of mouse cursor when the window dragging
     *        started or its position was last time updated.
     *   y0 - A vertical location of mouse cursor when the window dragging
     *        started or its position was last time updated.
     *   mouseDownHandler - See <mouseDownHandler> for details. function
     *   mouseMoveHandler - See <mouseMoveHandler> for details. function
     *   mouseUpHandler - See <mouseUpHandler> for details. function
     *   showContent - See <showContent> for details. function
     *   hideContent - See <hideContent> for details. function
     ***************************************************************************
     * Constructor: CDraggableDiv
     *
     * Parameters:
     *   $div - A jQuery object representing the HTML-based window.
    \***************************************************************************/
    BS.gui.CDraggableDiv = function($div)
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

    BS.gui.CDraggableDiv.prototype =
    {
      /**
       * Destructor: destroy
       *
       * Prepare the object for being disposed.
      \*********************************************************************/
      destroy:
      function()
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
    }
  }
  else
  {
    console.warn('BrainSlices.gui.CDraggableDiv already defined.')
  }


  if (BS.gui.CCloseableDiv == null)
  {
    /**
     * Class: CCloseableDiv
     *
     * A class managing of HTML-based window opening and closing.
     *
     * Attributes:
     *   $div - A jQuery object representing the HTML-based window.
     *   onClose - A trigger to be executed when the window is closed.
     *   onOpen - A trigger to be executed when the window is opened.
     *   close - See <close> for details. function
     *   closeByKey - see <closeByKey> for details. function
     ***************************************************************************
     * Constructor: CCloseableDiv
     *
     * Parameters:
     *   $div - A jQuery object representing the HTML-based window.
     *   onClose - A trigger to be executed when the window is closed.
     *   onOpen - A trigger to be executed when the window is opened.
    \***************************************************************************/
    BS.gui.CCloseableDiv = function($div, onOpen, onClose)
    {
      this.$div = $div;
      this.onClose = onClose;
      this.onOpen = onOpen;
      this.opened = false;

      var thisInstance = this;

      /**
       * Function: close
       *
       * Close the window.
       *********************/
      this.close = function()
      {
        if (thisInstance.opened)
        {
          // the 'ESC' button handler is no longer necessary
          $('body').unbind('keydown', thisInstance.closeByKey);
          thisInstance.$div.hide();

          if (thisInstance.onClose != null)
          {
            thisInstance.onClose();
          }
          thisInstance.opened = false;
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

    BS.gui.CCloseableDiv.prototype =
    {
      /**
       * Method: open
       *
       * Open the window.
      \***************************************************************************/
      open:
      function()
      {
        if (!this.opened)
        {
          if (this.onOpen != null)
          {
            this.onOpen();
          }

          this.$div.show();
          $('body').bind('keydown', this.closeByKey);
          this.opened = true;
        }
      },

      /**
       * Destructor: destroy
       *
       * Prepare the object for being disposed.
      \***************************************************************************/
      destroy:
      function()
      {
        this.$div.find('.clickable_close').unbind('click', this.close);
        this.close = null;

        $('body').unbind('keydown', this.closeByKey);
        this.closeByKey = null;
        this.onOpen = null;
        this.onClose = null;
      }
    }
  }
  else
  {
    console.warn('BrainSlices.gui.CCloseableDiv already defined.')
  }


  if (BS.gui.CTableManager == null)
  {
    /**
     * Class: CTableManager
     *
     * A class managing of HTML-based sequence (table, list etc.) of items which
     * order can be changed by dragging.
     *
     * Attributes:
     *   $table - A jQuery object representing the HTML-based sequence.
     *   onUpdate - A trigger to be executed when the content order has changed.
     *   rows - An Array containing objects representanting the items.
     *   length - Number of items in the sequence.
     *   id2row - A mapping of item ifentifier to the object representanting the
     *   item.
     ***************************************************************************
     * Constructor: CTableManager
     *
     * Parameters:
     *   $table - A jQuery object representing the HTML-based sequence.
     *   onUpdate - A trigger to be executed when the content order has changed.
    \***************************************************************************/
    BS.gui.CTableManager = function($table, onUpdate)
    {
      this.rows = [];
      this.length = 0;
      this.id2row = {};
      this.$table = $table;
      this.onUpdate = onUpdate;
      $table.empty();
    }

    BS.gui.CTableManager.prototype =
    {
      has:
      function(id)
      {
      /**
       * Method: has
       *
       * Query if an item is already managed by the object.
       *
       * Parameters:
       *   id - An id of the item.
       ***************************/
        return id in this.id2row;
      },

      get:
      function(id)
      {
      /**
       * Method: get
       *
       * Returns:
       *   Data associated with an item managed by the object.
       *
       * Parameters:
       *   id - An id of the item.
       ***************************/
        return this.id2row[id].data;
      },

      flush:
      function()
      {
      /**
       * Method: flush
       *
       * Remove all managed items
       ***************************/
        for (var i = this.length - 1; i >= 0; i--)
        {
          this.remove(this.rows[i].id, this.length == 1);
        }
      },

      destroy:
      function()
      {
      /**
       * Destructor destroy
       *********************/
        this.flush();
        for (var name in this)
        {
          delete this[name];
        }
      },

      remove:
      function(id, update)
      {
      /**
       * Method: remove
       *
       * Remove an item from the manager.
       *
       * Parameters:
       *   id - An ID of the item to be removed.
       *   update - Indicates whether to perform order update (defaults
       *            to true).
       *
       * Returns:
       *   detached jQuery object representing the item.
       **************************************************/
        if (!id in this.id2row)
        {
          return null;
        }

        var row = this.id2row[id];
        delete this.id2row[id];
        var rows = this.rows;

        var index = row.index;
        if (rows[index].id != id)
        {
          console.warn('remove: mismatch for index = ' + index);
          index = 0;
          while (rows[index].id != id && index < rows.length)
          {
            index++;
          }

          if (index >= rows.length)
          {
            console.error('Row of id: ' + id + ' not found.');
            return null;
          }
        }
        rows.splice(index, 1);
        this.length--;

        if (row.onRemove != null)
        {
          row.onRemove();
        }

        if (update == null || update)
        {
          this.update(index)
        }

        return row.$row.detach();
      },

      update:
      function(from, to)
      {
      /**
       * Method: update
       *
       * Update order information for items in given range.
       *
       * Parameters:
       *   from - The lowest index in the range (defaults to 0).
       *   to - The lowest index ABOVE the range (defaults to the number of
       *        items).
       *********************************************************************/
        var rows = this.rows;
        from = from != null ? Math.max(from, 0) : 0;
        to = to != null ? Math.min(to, rows.length) : rows.length;
        for (var i = from; i < to; i++)
        {
          var row = rows[i];
          row.index = i;
          if (row.onUpdate != null)
          {
            row.onUpdate(i);
          }
        }

        if (this.onUpdate != null)
        {
          this.onUpdate();
        }
      },

      getOrder:
      function()
      {
      /**
       * Method: getOrder
       *
       * Returns:
       *   An array of identifiers (in current order).
       ************************************************/
        var ordered = [];
        for (var i = 0; i < this.length; i++)
        {
          ordered.push(this.rows[i].id);
        }
        return ordered;
      },

      add:
      /**
       * Method: add
       *
       * Appand an item to be managed.
       *
       * Parameters:
       *   $row - An jQuery object representing the item in a table.
       *   id - An unique identifier of the item for the manager.
       *   index - An index where the item has to be inserted (defaults
       *           to the number of items).
       *   onRemove - A callback to be called when the item is being removed.
       *   onUpdate - A callback to be called (with current value of index of
       *              the item) when the index of the item changes.
       *   dragMIME - An Array of pairs (Arrays) defining MIMEtype and its
       *              content being used when the item is being dragged.
       *              Further array modification affects dragging MIMEtype.
       *   update - A flag indicating whether to update changed values of
       *            indices (if true) or to postpone it for performance gain
       *            (if false). Defaults to true.
       *   data - Any additional data to be associated with the item.
       **********************************************************************/
      function($row, id, index, onRemove, onUpdate, dragMIME, update, data)
      {
        if (update == null) update = true;

        if (id in this.id2row)
        {
          return false;
        }

        if (index == null || index > this.rows.length)
        {
          index = this.rows.length;
        }
        else if (index < 0)
        {
          if (index < -this.rows.length)
          {
            index = 0;
          }
          else
          {
            index = index + this.rows.length;
          }
        }

        var row = {
                    $row: $row,
                    id: id,
                    onRemove: onRemove,
                    onUpdate: onUpdate,
                    index: index
                  };

        if (data)
        {
          row.data = data;
        }

        this.id2row[id] = row;

        var $drag = $row.find('[draggable="true"]');
        var thisInstance = this;

        $drag.bind('dragstart', function(ev)
        {
          ev.originalEvent.dataTransfer.setData('INDEX', row.index);
          if (dragMIME)
          {
            for (var i = 0; i < dragMIME.length; i++)
            {
              var item = dragMIME[i];
              ev.originalEvent.dataTransfer.setData(item[0], item[1]);
            }
          }
        });

        $drag.bind('dragover', function(ev)
        {
          ev.originalEvent.preventDefault();
        });

        $drag.bind('drop', function(ev)
        {
          ev.originalEvent.preventDefault();
          var srcIndex = ev.originalEvent.dataTransfer.getData("INDEX");
          var index = row.index;
          if (srcIndex == index) return;

          var src = thisInstance.rows.splice(srcIndex, 1)[0];
          thisInstance.rows.splice(index, 0, src);
          src.$row.detach();
          if (srcIndex < index)
          {
            row.$row.after(src.$row);
          }
          else
          {
            row.$row.before(src.$row);
          }

          thisInstance.update(Math.min(srcIndex, index),
                              Math.max(srcIndex, index) + 1);
        });

        this.rows.splice(index, 0, row);
        if (this.length == index)
        {
          this.$table.append($row);
        }
        else if (index == 0)
        {
          this.$table.prepend($row);
        }
        else
        {
          this.$table.children().eq(index).before($row);
        }

        this.length++;
        if (update)
        {
          this.update(index);
        }
        return true;
      },

      sort:
      function(compareFunction)
      {
      /**
       * Method: sort
       *
       * Sort managed items according to their associated data value if given
       * - otherwise according to their identifier.
       *
       * Parameters:
       *   compareFunction - A binary function of a, b returning a negative
       *                     value if a < b, apositive if a > b and 0
       *                     otherwise.
       **********************************************************************/
        this.rows.sort(function(a, b)
        {
          return compareFunction('data' in a ? a.data : a.id,
                                 'data' in b ? b.data : b.id);
        })
        this.update();
      }
    }
  }
  else
  {
    console.warn('BrainSlices.gui.CTableManager already defined.');
  }
})(BrainSlices, jQuery);
