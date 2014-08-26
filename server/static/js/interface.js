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
       ***************************************************************************/
      destroy:
      function()
      {
        this.$div.find('.clickable_close').unbind('click', this.close);
        $('body').unbind('keydown', this.closeByKey);

        for (var name in this)
        {
          delete this[name];
        }
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
     *            item.
     *   lazyRefresh - An array of callback objects with callbacks to be called when
     *                 a row is visible. Every callback object contains attributes:
     *                 $row - row element,
     *                 callback - a callback function,
     *                 id - an unique identifier of the item in the manager,
     *                 nr - a number of table the callback applies.
     ***************************************************************************
     * Constructor: CTableManager
     *
     * Parameters:
     *   $table - A jQuery object representing the HTML-based sequence.
     *   onUpdate - A trigger to be executed when the content order has changed.
     *   onMove - A trigger to be executed when item is moved; takes source and
     *            destination indices as parameters.
     *   id - An identifier of the array.
    \***************************************************************************/
    BS.gui.CTableManager = function($table, onUpdate, onMove, id)
    {
      this.rows = [];
      this.length = 0;
      this.id2row = {};
      this.$table = $table;
      this.onUpdate = onUpdate;
      this.id = id ? id : 'default';
      this.lazyRefresh = [];
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

        this.lazyRefresh = this.lazyRefresh.filter(function(item)
        {
          return item.id != id;
        });

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
        console.log(from, to);
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

        this.doLazyRefresh();
      },

      move:
      function(srcIndex, dstIndex)
      {
      /**
       * Method: move
       *
       * Move an element to a new position.
       *
       * Parameters:
       *   srcIndex - index of element to be moved.
       *   dstIndex - destination index of the moved element.
       *******************************************************/
        if (srcIndex == dstIndex) return;

        var $row = this.rows[dstIndex].$row;
        var src = this.rows.splice(srcIndex, 1)[0];
        this.rows.splice(dstIndex, 0, src);
        src.$row.detach();
        var $el, $src;
        for (var i = 0; i < $row.length; i++)
        {
          $el = $row.eq(i);
          $src = src.$row.eq(i);
          if (srcIndex < dstIndex)
          {
            $el.after($src);
          }
          else
          {
            $el.before($src);
          }
        }

        this.update(Math.min(srcIndex, dstIndex),
                    Math.max(srcIndex, dstIndex) + 1);
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

      addLazyRefresh:
      function(id, callbacks)
      {
      /**
       * Method: addLazyRefresh
       *
       * Add callback for lazy refresh (update of visible items).
       *
       * Parameters:
       *   id - An unique identifier of the item in the manager.
       *   callbacks - An array of callback functions (with respect
       *               to a tabble to be refreshed) to be called
       *               in case the item is visible;
       *               null means no callback is defined for a table;
       *               it is possible to give one function instead of
       *               an array if only one table is managed.
       *
       * Returns:
       *   true if callback added successfully.
       ***************************************************************/
        var $rows = this.id2row[id].$row;
        if (callbacks.call != undefined)
        {
          callbacks = [callbacks];
        }

        if ($rows.length != callbacks.length)
        {
          console.error('addLazyRefresh - callback length mismatch');
          console.debug($rows, callbacks);
          return false;
        }

        for (var i = 0; i < callbacks.length; i++)
        {
          var callback = callbacks[i];
          if (callback)
          {
            this.lazyRefresh.push(
            {
              $row: $rows.eq(i),
              callback: callback,
              nr: i,
              id: id
            });
          }
        }
        return true;
      },

      doLazyRefresh:
      function()
      {
      /**
       * Method: doLazyRefresh
       *
       * Execute (and remove) callbacks for visible items
       * in order they have been added.
       ***************************************************/
        var height = this.$table.map(function(_, item)
        {
          return $(item).innerHeight();
        });

        //XXX: warning for invisible tables!

        var todo = [];
        var lazyRefresh = this.lazyRefresh;
        for (var i = 0; i < lazyRefresh.length; i++)
        {
          //XXX filter is not suitable because list traversing
          //    order is unknown
          var cb = lazyRefresh[i];
          var $row = cb.$row;
          var top = $row.position().top;
          if (top > height[cb.nr])
          {
            todo.push(cb);
            continue;
          }

          if (top + $row.height() < 0)
          {
            todo.push(cb);
            continue;
          }

          cb.callback.call();
        }

        this.lazyRefresh = todo;
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
        if ($row.length != this.$table.length)
        {
          console.error('JQuery array length mismatch!');
          return
        }

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

        this.rows.splice(index, 0, row);

        var $drag = $();
        var $el, $table;
        for (var i = 0; i < $row.length; i++)
        {
          $el = $row.eq(i);
          $table = this.$table.eq(i);

          if (this.length == index)
          {
            $table.append($el);
          }
          else if (index == 0)
          {
            $table.prepend($el);
          }
          else
          {
            $table.children().eq(index).before($el);
          }

          $.merge($drag, $el.attr('draggable') == 'true' ?
                         $el :
                         $el.find('[draggable="true"]'));
        }


        var thisInstance = this;

        $drag.bind('dragstart', function(ev)
        {
          ev.originalEvent.dataTransfer.setData('INDEX', row.index);
          ev.originalEvent.dataTransfer.setData('ARRAY', thisInstance.id);
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
          var id = ev.originalEvent.dataTransfer.getData("ARRAY");
          var index = row.index;

          if (id != thisInstance.id || srcIndex == undefined) return;

          thisInstance.move(srcIndex, index);

          //var src = thisInstance.rows.splice(srcIndex, 1)[0];
          //thisInstance.rows.splice(index, 0, src);
          //src.$row.detach();
          //if (srcIndex < index)
          //{
          //  row.$row.after(src.$row);
          //}
          //else
          //{
          //  row.$row.before(src.$row);
          //}

          //thisInstance.update(Math.min(srcIndex, index),
          //                    Math.max(srcIndex, index) + 1);
        });

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
        console.error('update rows order not implemented yet!!!'); // TODO
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

  if (BS.gui.CMessage == null)
  {
    /**
     * Class: CMessage
     *
     * A class for outputing simple messages to user.
     *
     * Attributes:
     *   window - A <CCloseableDiv> object.
     *****************************************************************
     *
     * Constructor: CAlert
     *
     * Parameters:
     *  $div - A jQuery object for <CCloseableDiv> object.
     ******************************************************************/
    BS.gui.CMessage = function($div)
    {
      var $content = $div.find('.content');
      this.window = new BS.gui.CCloseableDiv($div);

      /**
       * Method: message
       *
       * Display a simple message.
       *
       * Parameters:
       *   message - A HTML message to be displayed;
       **********************************************/
      this.message = function(message)
      {
        $content
          .removeClass('error success')
          .html(message);

        this.window.open();
      }

      /**
       * Method: error
       *
       * Display an error message.
       *
       * Parameters:
       *   message - A HTML message to be displayed;
       **********************************************/
      this.error = function(message)
      {
        $content
          .removeClass('success')
          .addClass('error')
          .html(message);

        this.window.open();
      }

      /**
       * Method: success
       *
       * Display an error message.
       *
       * Parameters:
       *   message - A HTML message to be displayed;
       **********************************************/
      this.success = function(message)
      {
        $content
          .removeClass('error')
          .addClass('success')
          .html(message);

        this.window.open();
      }
    }

    BS.gui.CMessage.prototype =
    {
      /**
       * Destructor: destroy
       *
       * Prepare the object for being disposed.
       ********************************************/
      destroy:
      function()
      {
        this.window.destroy();

        for (var name in this)
        {
          delete this[name];
        }
      },

      /**
       * Method: close
       *
       * An alias of this.window.close();
       ***********************************/
      close:
      function()
      {
        this.window.close();
      }
    }
  }
  else
  {
    console.warn('BrainSlices.gui.CCloseableDiv already defined.')
  }
})(BrainSlices, jQuery);
