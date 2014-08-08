/*
 * Implementacja scope - obiektu który trzyma globalne zmienne o stanie, i o ich zmianie powiadamia wszystkich słuchających.
 */
(function(BS)
{
  var listeners = new Array();
  var variables = new Array();
  var locks = new Array();
  
  BS.scope =
  {
    register:
    function(listener)
    {
      listeners.push(listener);
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
    function(f)
    {
      this.register({change: f});
    },

    set:
    function(variable,val)
    {
      if( locks[variable] != true)
      {
        locks[variable] = true;
        variables[variable]=val;
     
        listeners.map( function(item)
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
