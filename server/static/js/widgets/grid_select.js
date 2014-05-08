
$.widget( "brainslices.grid_select", {
    options: {
    },
    
    _create: function(){
      $(this.element).html(
              $("<ol id='selectable'>")
            .append('<li class="ui-state-default">1</li>')
            .append('<li class="ui-state-default">2</li>')
            .append('<li class="ui-state-default">3</li>')
            .append('<li class="ui-state-default">4</li>')
            .append('<li class="ui-state-default">5</li>')
            .append('<li class="ui-state-default">6</li>')
            .append('<li class="ui-state-default">7</li>')
            .append('<li class="ui-state-default">8</li>')
            .append('<li class="ui-state-default">9</li>')
            .append('<li class="ui-state-default">10</li>')
            .append('<li class="ui-state-default">11</li>')
            .append('<li class="ui-state-default">12</li>')
            )
    
    $( "#selectable" ).selectable();alert("s")
        },
    }
);
