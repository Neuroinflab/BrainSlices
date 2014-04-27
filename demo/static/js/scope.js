/*
 * Implementacja scope - obiektu który trzyma globalne zmienne o stanie, i o ich zmianie powiadamia wszystkich słuchających.
 */
(function(BS){
    var listeners = new Array();
    var variables = new Array();
    var locks = new Array();
    
    BS.scope = {
        register:function(listener){
            listeners.push(listener);
        },
        set:function(variable,val){
            if( locks[variable] != true){
                locks[variable] = true;
            variables[variable]=val;
         
            listeners.map( function(item){
                item.change(variable, val);
            });
            locks[variable] = false;
            }
        },
        get:function(variable){
            return variables[variable];
        }
    };
    
} (BrainSlices));