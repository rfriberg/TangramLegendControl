/**************************
 * Tangram Legend Control
 * Adds a legend and layer toggle to Tangram maps
 * 
 * Two options for defining which layers to show:  
 *   - Pass layers in as an object:
 *      layers: {
 *        "Layer name": 'layer_name'
 *      }
 *   - Or add "legend: true" to layers in scene file
 *
 * ToDo:
 *   - Check for color under layer definition (rather than global)
 *   - Accept multiple color formats
 *   - Support line and polygon types, as well
 *   
 * *************************/


var TangramLegendControl = L.Control.extend({
  options: {
    position: 'bottomleft',
    layers: null,
    legendTitle: null
  },

  initialize: function (options) {
    L.Util.setOptions(this, options);
  },

  onAdd: function (map) {
    this._initLayout();
    this._scene = map.getTangramLayer().scene;

    // If necessary, wait for scene to finish initializing
    if (!this._scene.initialized) {
      var self = this;
      this._scene.initializing.then(function () {
        self._update();
      });
    }
    else {
      // Populate legend with layers
      this._update();
    }

    return this._container;
  },

  _initLayout: function () {
    var className = 'tangram-legend-control',
        container = this._container = L.DomUtil.create('div', className);

    L.DomEvent.disableClickPropagation(container);
    if (!L.Browser.touch) {
      L.DomEvent.disableScrollPropagation(container);
    }

    // Add legend title
    if (this.options.title) {
      var legendTitle = L.DomUtil.create('h3', 'legend-title');
      legendTitle.textContent = this.options.title;
      container.appendChild(legendTitle);
    }

    // Add form/list of layers + symbols
    var form = this._form = L.DomUtil.create('form', className + '-list');

    this._legendLayersList = L.DomUtil.create('div', className + '-layers', form);
    container.appendChild(form);

    // Add toggleAll links
    var toggleAllDiv = this._buildToggleAllLinks();
    container.appendChild(toggleAllDiv);

    // Add footer? 
  },

  _update: function () {
    if (!this._container) { return this; }

    this._layers = this._buildLayerList(this.options.layers);

    // Add legend items
    for (var item in this._layers){
      var legendItem = this._buildLegendItem(this._layers[item]);
      this._legendLayersList.appendChild(legendItem);
    }

    return this;
  },

  _buildLayerList: function (layers) {
    var layerList = [];

    // If layer list passed in, use that
    if (layers) {
      for (i in layers) {
        layerList.push({
          layer: layers[i],
          name: i
        });
      }      
    }
    // Else check for layers with legend tag in scene file
    else {
      layerList = this._getEligibleLayers();
    }

    return layerList;
  },

  /***
   * obj: { 
   *   name: 'Name of layer used for legend',
   *   layer: 'layer_name'
   *  } 
   ***/
  _buildLegendItem: function (obj) {
    var legendItem = L.DomUtil.create('div', 'tangram-legend-item');
    legendItem.id = 'legend-item-' + obj.layer;
    
    var label = document.createElement('label'),
        input = document.createElement('input');

    var checkboxId = 'legend-checkbox-' + obj.layer,
        checked = true; //this._map.hasLayer(obj.layer), // check if visible/enabled

    // Label
    label.htmlFor = checkboxId;

    // Checkbox
    input.type = 'checkbox';
    input.id = checkboxId;
    input.value = obj.layer;
    input.defaultChecked = checked;
    L.DomEvent.on(input, 'click', this._onCheckboxClick, this);

    // Layer name
    var layerName = document.createElement('span');
    layerName.innerHTML = obj.name;

    label.appendChild(input);
    label.appendChild(layerName);

    // Legend symbol
    // TODO: decouple this from scene.config.global
    var colorValue = this.convertRGB(this._scene.config.global[obj.layer].color.slice());
    var symbol = L.DomUtil.create('div', 'circle');
    symbol.style.backgroundColor = 'rgba(' + colorValue + ')';

    // Put it all together
    legendItem.appendChild(symbol);
    legendItem.appendChild(label);

    return legendItem;
  },

  _buildToggleAllLinks: function () {
    var toggleAllDiv = L.DomUtil.create('div', 'toggle-all');

    // Show All link
    var showAllLink = L.DomUtil.create('a', 'show-all');
    showAllLink.textContent = 'Show all';
    showAllLink.href = '#';
    L.DomEvent.on(showAllLink, 'click', this._showAllLayers, this);
    toggleAllDiv.appendChild(showAllLink);

    // Separator "|"
    var separator = L.DomUtil.create('span', 'separator');
    separator.textContent = ' | ';
    toggleAllDiv.appendChild(separator);

    // Hide All link
    var hideAllLink = L.DomUtil.create('a', 'hide-all');
    hideAllLink.textContent = 'Hide all';
    hideAllLink.href = '#';
    L.DomEvent.on(hideAllLink, 'click', this._hideAllLayers, this);
    toggleAllDiv.appendChild(hideAllLink);

    return toggleAllDiv;
  },

  _onCheckboxClick: function (e) {
    var checkbox = e.currentTarget,
        layer = checkbox.value,
        visible = checkbox.checked;

    this._toggleLayer(layer, visible);
    this._scene.updateConfig();
  },

  _showAllLayers: function (e) {
    L.DomEvent.preventDefault(e);
    for (var item in this._layers){
      var layer = this._layers[item].layer;
      this._toggleLayer(layer, true);
    }
    this._scene.updateConfig();
  },

  _hideAllLayers: function (e) {
    L.DomEvent.preventDefault(e);
    for (var item in this._layers){
      var layer = this._layers[item].layer;
      this._toggleLayer(layer, false);
    }
    this._scene.updateConfig();
  },

  _toggleLayer: function (layer, visible) {
    // toggle checkbox
    document.getElementById('legend-checkbox-' + layer).checked = visible;

    // toggle "inactive" className on legend item parent
    document.getElementById('legend-item-' + layer).classList.toggle('inactive', !visible);

    // toggle layer visibility
    scene.config.layers._venues[layer].visible = visible;
  },

  _getEligibleLayers: function () {
    var layersObj = this._scene.config.layers,
        layersList = Object.keys(layersObj),
        eligibleLayers = [];

    for (var layer in layersObj) {
      var lyrObj = layersObj[layer];

      if (lyrObj.legend) {
        eligibleLayers.push({
          layer: layer,
          name: lyrObj.legend_name || layer
        });
      }
      // Iterate through layers to find possible sublayer (only looks 1 level deep)
      for (var sublayer in lyrObj) {
        var subObj = lyrObj[sublayer];

        if (subObj.legend) {
          eligibleLayers.push({
            layer: sublayer,
            name: subObj.legend_name || sublayer
          });
        }
      }
    }

    return eligibleLayers;
  },

  // Used for testing only
  _getListOfAvailableLayers: function () {
    var layersObj = this._scene.config.layers;

    return Object.keys(layersObj);
  },

  convertRGB: function (color) {
    color[0] = Math.floor(color[0]*255);
    color[1] = Math.floor(color[1]*255);
    color[2] = Math.floor(color[2]*255);
    color[3] = 0.75;
    return color;
  }

});


// @factory L.control.layers(layers?: Object, options?: Control.Layers options)
L.control.tangramLegendControl = function (layers, options) {
  return new TangramLegendControl(layers, options);
};