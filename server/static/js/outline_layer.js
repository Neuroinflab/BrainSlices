/* File: outline_layer.js; TO BE DOCUMENTED */

function COutlineLayer(parentDiv, svg, layerPixelSize, focusPointX, focusPointY, crosshairX, crosshairY, autoresize, zIndex, opacity)
{
	// CONSTRUCTOR

	// DOM object - layer images display
	this.layer = $('<div class="outlineLayer" style="display: none;" draggable="false"></div>');
  parentDiv.append(this.layer);


	this.setFocusPoint(focusPointX == null?0.:focusPointX,
										 focusPointY == null?0.:focusPointY);

	this.setPixelSize(layerPixelSize == null?1.:layerPixelSize);

	this.svg = svg.getElementsByTagName('svg')[0];

	this.layer.append(this.svg);
	this.finishConstruction(crosshairX, crosshairY, autoresize, zIndex, opacity);
}

COutlineLayer.prototype = new CLayerPrototype();

// dummy quality settings setter
COutlineLayer.prototype.setQuality = function(quality)
{
}

// setter of layer pixel size
COutlineLayer.prototype.setPixelSize= function(newPixelSize)
{
	this.layerPixelSize = parseFloat(newPixelSize);
}

// refresh layer
COutlineLayer.prototype.update = function()
{
	//this.layer.hide();
	//this.layer.show();



	//var svg = this.svg[0].contentDocument.getElementsByTagName('svg')[0]
	if (this.svg != undefined)
	{
		var viewBoxLeft = this.focusPointX - this.layerPixelSize * this.crosshairX;
		var viewBoxTop = this.focusPointY - this.layerPixelSize * this.crosshairY;
		var viewBoxWidth = this.layerWidth * this.layerPixelSize;
		var viewBoxHeight = this.layerHeight * this.layerPixelSize;
		this.svg.setAttribute('viewBox', [viewBoxLeft, viewBoxTop, viewBoxWidth, viewBoxHeight].join(' '));
	}
	else
	{
		alert('UPS... SVG not loaded...');
	}
};

// resize the layer
COutlineLayer.prototype.resize = function(crosshairX, crosshairY)
{
	this.layerWidth = this.layer.width();
	this.layerHeight = this.layer.height();

	this.crosshairX = crosshairX == null?Math.round(0.5 * this.layerWidth):crosshairX;
	this.crosshairY = crosshairY == null?Math.round(0.5 * this.layerHeight):crosshairY;

	//this.svg.width(this.layerWidth);
	//this.svg.height(this.layerHeight);

	//this.svg.attr('width', this.layerWidth);
	//this.svg.attr('height', this.layerHeight);

	this.svg.setAttribute('width', this.layerWidth);
	this.svg.setAttribute('height', this.layerHeight);

	this.update();
};


function loadOutlineLayer(path, parentDiv, onSuccess, pixelSize,
                          focusPointX, focusPointY, zIndex, opacity)
{
	$.ajax({
		//type: 'POST', //causes 412 error on refresh -_-
		type: 'GET',
		url: path,
		data: '',
		dataType: 'xml',
		success: function(data)
		{
			onSuccess(new COutlineLayer(parentDiv,
			                            data,
			                            pixelSize,
			                            focusPointX,
			                            focusPointY,
			                            null, null,
			                            false,
                                  zIndex,
			                            opacity));
		},
		error: ajaxErrorHandler
	});
}

CLayerStack.prototype.loadOutlineLayer = function(id, path, zIndex)
{
  this.loadLayer(id, loadOutlineLayer, path, zIndex);
}

