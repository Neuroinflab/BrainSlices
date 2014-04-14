/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


$(function() {

    $("#navbar1").navbar();
    display = $("#display1").display();
    $("#cart1").cart({
        display:$("#display1"),
    });
     var nx = $('#nx').val();
  var ny = $('#ny').val();

  ajaxProvider = new BrainSlices.ajax.CAjaxProvider();
  images = new BrainSlices.api.CImageManager(ajaxProvider);
  stacks = new BrainSlices.api.CSynchronizedStacksDisplay($('#sliceDisplay'), nx, ny,
                                          $('#control_panel [name="synchronization"]:checked').length != 0,
                                          $('#control_panel [name="zoom"]').val(),
                                          $('#x').val(), $('#y').val(),
                                          null, null,
                                          $('#control_panel'),
                                          'static/gfx', images);
  layerManager = new CLayerManager($('#control_panel .layerList'), stacks,
                                   ajaxProvider,
    {
      addTileLayer:
      function(id)
      {
        console.assert(!this.has(id));
        var path = 'images/' + id;

        // making the layer-related row
        var $row =  $('<tr></tr>');
        var $drag = $('<td draggable="true">Slice no ' + id + '</td>');

        $row.append($drag);

        // download link
        $row.append('<td><a href="' + path + '/image.png">Download</a></td>');

        // visibility interface
        var $visibility = $('<td></td>');
        $row.append($visibility);

        this.addTileLayer(id, $row, $visibility, 0, null, null,  path);
      }
    });

  $('#sliceDisplay').bind('mousemove', processMove);
  $('#sliceDisplay').bind('mousedown', startMove);
  $('body').bind('mouseup', stopMove);
  //$('#sliceDisplay').bind('mouseout', stopMove);

  for (var z = 0; z < imagesList.length; z++)
  {
    layerManager.autoAddTileLayer(imagesList[z]);
  }

  arrangeInterface();
});

var move = false;

function startMove(event)
{
  move = true;
}


function processMove(event)
{
  if (move)
  {
    inspect();
  }
}

function inspect()
{
  $('#x').val(stacks.stacks[0].focusPointX);
  $('#y').val(stacks.stacks[0].focusPointY);
}

function stopMove(event)
{
  move = false;
}


function test()
{
  var x = $('#x').val();
  var y = $('#y').val();

  stacks.setFocusPoint(x, y);
  stacks.update();
  return false;
}

var ajaxProvider = null;
var images = null;
var stacks = null;
var layerManager = null;

var imagesList = ['050',
                  '051',
                  '052',
                  '053',
                  '054',
                  '055'];

function arrangeInterface()
{
	layerManager.arrangeInterface();
}

function rearrangeInterface()
{
  var nx = $('#nx').val();
  var ny = $('#ny').val();
  var display = $('#display').val();
  var width = display == 'matrix' ? null : parseInt(Math.max(100, 66 * nx / ny)) + '%';

  stacks.rearrange(nx, ny, width);
  layerManager.arrangeInterface();
}

function compressStacks()
{
  var images = layerManager.loadedImagesOrdered();
  stacks.rearrange(1, 1);
  for (var i = 0; i < images.length; i++)
  {
    if (!stacks.has(0, images[i]))
    {
      layerManager.load(0, images[i], true);
    }
  }
  layerManager.arrangeInterface();
  $('#nx').val(stacks.nx);
  $('#ny').val(stacks.ny);
}

function decompressStacks()
{
  var images = layerManager.loadedImagesOrdered();
  var nx = $('#nx').val();
  var ny = $('#ny').val();
  var nxCor = nx * ny < images.length ?
              parseInt(Math.ceil(images.length / ny)) :
              nx;
  var display = $('#display').val();
  var width = display == 'matrix' ?
              null :
              parseInt(Math.max(100, 66 * nxCor / ny)) + '%';
  stacks.unloadAll();
  stacks.rearrange(nxCor, ny, width);
  for (var i = 0; i < images.length; i++)
  {
    layerManager.load(i, images[images.length - 1 - i], true);
  }

  layerManager.arrangeInterface();
  $('#nx').val(stacks.nx);
  $('#ny').val(stacks.ny);
}
