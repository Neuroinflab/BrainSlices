/*
 * Implementacja scope - obiektu który trzyma globalne zmienne o stanie, i o ich zmianie powiadamia wszystkich słuchających.
 */
(function(BS)
{
  var listeners = [{change:
                    function(variable, val)
                    {
                      if (variable in newListeners)
                      {
                        newListeners[variable].map(function(item)
                        {
                          item.change(val);
                        });
                      }
                    }}];
  var variables = {};
  var locks = new Array();
  var newListeners = {};
  var unregistrable = {};
  
  BS.scope =
  {
    register:
    function(listener, variable)
    {
      var tmp = listeners;
      if (variable)
      {
        if (variable in newListeners)
        {
          tmp = newListeners[variable];
        }
        else
        {
          tmp = newListeners[variable] = [];
        }
      }

      if (listener.id)
      {
        if (listener.id in unregistrable)
        {
          console.warn('listener of id:' + listener.id + ' already registered.');
          return this;
        }
        unregistrable[listener.id] = tmp;
      }

      tmp.push(listener);
      return this;
    },

    registerChange:
    /**
     * Function: registerChange
     *
     * Create and register a brand new listener.
     *
     * Parameters:
     *   f - a change method of the listener.
     ********************************************/
    function(f, variable, id)
    {
      return this.register({change: f, id: id}, variable);
    },

    unregister:
    function(id, variable)
    {
      if (id in unregistrable)
      {
        var tmp = unregistrable[id];
        for (var i = 0; i < tmp.length && tmp[i].id != id; i++)
        {
        }
        console.assert(i < tmp.length, 'Ooops, id:' + id + ' not found where expected.');
        tmp.splice(i, 1);
        delete unregistrable[id];
      }
      else
      {
        console.warn(id + ' not registered.')
      }
    },

    set:
    function(variable,val)
    {
      if (!locks[variable])
      {
        locks[variable] = true;
        variables[variable] = val;

        listeners.map(function(item)
        {
          item.change(variable, val);
        });

        locks[variable] = false;
      }
    },

    get:
    function(variable)
    {
      return variables[variable];
    },

    getCallback:
    function(variable, value)
    {
      var thisInstance = this;
      return function()
      {
        thisInstance.set(variable, value);
      }
    },

    /**
     * Function: _getPrivate
     *
     * A debug method.
     *
     * Returns:
     *   An object for monitoring private variables.
     ***********************************************/
    _getPrivate:
    function()
    {
      return {
        listeners: listeners,
        variables: variables,
        locks: locks
      }
    }
  };
    
} (BrainSlices));
