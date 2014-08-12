function parseState(search)
{
  var params = search.split('&');
  var state = {};
  for (var i = 0; i < params.length; i++)
  {
    var pair = params[i].split('=');
    if (pair.length != 2)
    {
      console.warn('Invalid argument: ' + params[i]);
      continue;
    }

    var argName = decodeURIComponent(pair[0]);
    var argVal = decodeURIComponent(pair[1]);

    if (argName in state)
    {
      console.warn('Multiple definition of argument: ' + argName);
      continue;
    }

    switch (argName)
    {
      case 'user':
        switch (argVal)
        {
          case 'confirmed':
            state.interface = 'user';

          case 'confirmationfailed':
          case 'regenerate':
            break;

          default:
            console.warn('Invalid user value: ' + argVal);
            continue;
        }
      case 'login':
      case 'confirm':
        state[argName] = argVal;
        break;

      case 'interface':
        switch (argVal)
        {
          case 'upload':
          case 'user':
            if (!loginConsole.isLogged())
            {
              alert('Selected interface panel (' + argVal + ') requires user to be logged.');
              continue;
            }

          case 'home':
          case 'browse':
          case 'visualise':
            state.interface = argVal;
            break;

          default:
            console.warn('Invalid interface');
        }
        break;

      case 'display':
        if (argVal != 'matrix' && argVal != 'serial')
        {
          console.warn('Invalid display: ' + argVal);
          continue;
        }
        state.display = argVal;
        break;

      case 'focus':
        var focus = argVal.split(',');
        if (focus.length == 0)
        {
          console.warn('Invalid focus');
          continue;
        }
        for (var j = 0; j < focus.length; j++)
        {
          var pair = focus[j].split(':');
          if (pair.length != 2 || isNaN(pair[0]) || isNaN(pair[1]))
          {
            console.warn('Invalid focus: ' + focus[j]);
            focus = null;
            break;
          }
          pair = [parseFloat(pair[0]), parseFloat(pair[1])];
          if (isNaN(pair[0]) || isNaN(pair[1]))
          {
            console.warn('Invalid focus (NaN): ' + focus[j]);
            focus = null;
            break;
          }
          focus[j] = pair;
        }
        if (focus == null) continue;
        state.focus = focus;
        break;

      case 'iids':
        var iids = [];
        var tmp = argVal.split(',');
        for (var j = 0; j < tmp.length; j++)
        {
          var pair = tmp[j].split(':');
          if (pair.length != 2)
          {
            console.warn('Invalid iid in iids: ' + tmp[i]);
            continue;
          }

          var iid = parseInt(pair[0]);
          if (isNaN(pair[0]) || isNaN(iid) || iid < 1) // applied to the case iid[0] is '' etc.
          {
            console.warn('Invalid iid (NaN) in iids: ' + tmp[i]);
            continue;
          }

          iids.push([iid, pair[1]]);
        }
        state.iids = iids;
        break;

      case 'loaded':
        var loaded = argVal.split(',');
        for (var j = 0; j < loaded.length; j++)
        {
          var tmp = loaded[j].split(':');
          for (var k = 0; k < tmp.length; k++)
          {
            if (isNaN(tmp[k]))
            {
              console.warn('Invalid loaded: ' + tmp[k]);
              tmp = null;
              break;
            }
            tmp[k] = parseInt(tmp[k]);
            if (isNaN(tmp[k]) || tmp[k] < 0)
            {
              console.warn('Invalid loaded (int): ' + tmp[k]);
              tmp = null;
              break;
            }
          }
          if (tmp == null)
          {
            loaded = null;
            break;
          }
          loaded[j] = tmp;
        }
        if (loaded == null) continue;
        state.loaded = loaded;
        break;

      case 'shape':
        var shape = argVal.split(',');
        if (shape.length != 2 || isNaN(shape[0]) || isNaN(shape[1]))
        {
          console.warn('Invalid shape: ' + argVal);
          continue;
        }
        shape[0] = parseInt(shape[0]);
        shape[1] = parseInt(shape[1]);
        if (isNaN(shape[0]) || isNaN(shape[1]) || shape[0] < 1 || shape[1] < 1)
        {
          console.warn('Invalid shape (int): ' + argVal);
          continue;
        }
        state.shape = shape;
        break;

      case 'show':
        var pair = argVal.split(':');
        if (pair.length != 2 || isNaN(pair[0]))
        {
          console.warn('Invalid show: ' + argVal);
          continue;
        }
        var iid = parseInt(pair[0]);
        if (isNaN(iid) || iid < 1)
        {
          console.warn('Invalid iid: ' + iid);
          continue;
        }
        state.iids = [[iid, pair[1]]];
        state.loaded = [[0]];
        state.shape = [1, 1];
        state.interface = 'visualise';
        break;

      case 'sync':
        if (argVal != 'y' && argVal != 'n')
        {
          console.warn('Invalid sync: ' + argVal);
          continue;
        }
        state.sync = argVal == 'y';
        break;
        
      case 'zoom':
        var zoom = parseFloat(argVal);
        if (isNaN(argVal) || isNaN(zoom))
        {
          console.warn('Invalid zoom: ' + argVal);
          continue;
        }
        state.zoom = zoom;
        break;

      default:
        console.warn('Unknown argument: ' + argName);
    }
  }

  var n = 'shape' in state ? state.shape[0] * state.shape[1] : 1;
  if ('focus' in state)
  {
    if (state.focus.length > n)
    {
      console.warn('Invalid focus (len)');
      delete state.focus;
    }
  }

  if ('loaded' in state)
  {
    if (state.loaded.length > n || !('iids' in state))
    {
      console.warn('Invalid loaded (len)');
      delete state.loaded;
    }
    else
    {
      var niids = state.iids.length;
      for (var i = 0; i < state.loaded.length; i++)
      {
        var loaded = state.loaded[i];
        for (var j = 0; j < loaded.length; j++)
        {
          if (loaded[j] >= niids)
          {
            console.warn('Invalid loaded (val)');
            delete state.loaded;
            loaded = null;
            break;
          }
        }
        if (loaded == null) break;
      }
    }
  }

  return state;
}

