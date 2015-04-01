var map, featureList, stationsGeoJson, stationSearch = [];

$("#feature-info-wrapper").hide();

/* Overlay Layers */
var highlight = L.geoJson(null);
var highlightStyle = {
  stroke: false,
  fillColor: "#00FFFF",
  fillOpacity: 0.7,
  radius: 10
};

var bufferedLayer = L.layerGroup(null);

var markers = new L.MarkerClusterGroup({
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  zoomToBoundsOnClick: true,
  disableClusteringAtZoom: 15
});

var stations = L.geoJson(null, {
  pointToLayer: function(feature, latlng) {
    return L.marker(latlng, {
      icon: L.AwesomeMarkers.icon({
        icon: 'plug',
        prefix: 'fa',
        markerColor: 'green'
      }),
      title: feature.properties.nom_station,
      riseOnHover: true
    });
  },
  onEachFeature: function(feature, layer) {
    if (feature.properties) {
      // var content = "<table class='table table-striped table-bordered table-condensed'>" + "<tr><th>Name</th><td>" + feature.properties.nom_station + "</td></tr>" + "<tr><th>Holder</th><td>" + feature.properties.nom_porteur + "</td></tr>" +
      //   "<tr><th>Address</th><td>" + feature.properties.adresse_station + "</td></tr>" + "<table>";
      var content = "<table class=\"marker-properties\"><tbody>";
      var out = [];
      //var regexp = new RegExp('^http');
      var value;
      if (feature.properties) {
        for (var key in feature.properties) {
          out.push("<tr class=\"unchanged\"><th>" + key + "</th><td>" + feature.properties[key]);
        }
        content = content + out.join("</td></tr>") + "</tbody></table>";
        layer.bindPopup(content);
      }
      layer.on({
        click: function(e) {
          // $("#feature-title").html(feature.properties.nom_station);
          // $("#feature-info").html(content);
          // $("#featureModal").modal("show");
          highlight.clearLayers().addLayer(L.circleMarker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], highlightStyle));
        }
      });
      // $("#feature-list tbody").append('<tr class="feature-row" id="' + L.stamp(layer) + '" lat="' + layer.getLatLng().lat + '" lng="' + layer.getLatLng().lng +
      //   '"><td style="vertical-align: middle;"><img width="16" height="18" src="assets/img/theater.png"></td><td class="feature-name">' + layer.feature.properties.nom_station +
      //   '</td><td style="vertical-align: middle;"><i class="fa fa-chevron-right pull-right"></i></td></tr>');
      stationSearch.push({
        name: layer.feature.properties.nom_station,
        address: layer.feature.properties.adresse_station,
        source: "Stations",
        id: L.stamp(layer),
        lat: layer.feature.geometry.coordinates[1],
        lng: layer.feature.geometry.coordinates[0]
      });
    }
  }
});
$.getJSON("data/evse.geojson", function(data) {
  stations.addData(data);
  markers.addLayer(stations);
  stationsGeoJson = data;
});

var topo = L.esri.basemapLayer('Topographic', {
  detectRetina: true
});

map = L.map('leaflet-map', {
  center: [46.6, 2.3],
  zoom: 6,
  layers: [topo, markers, highlight, bufferedLayer]
});

L.control.locate().addTo(map);

// add geocoder
var searchControl = new L.esri.Geocoding.Controls.Geosearch().addTo(map);
searchControl.on('results', function(data) {
  var result = data.results[0];
  map.panTo(result.latlng);
  L.popup()
    .setLatLng(result.latlng)
    .setContent(result.text)
    .openOn(map);
});
/////////////////


map.on('click', onMapClick);

$(document).one("ajaxStop", function() {
  $("#loading").hide();


});

function onMapClick(evt) {
  var latlon = evt.latlng;
  var lat = latlon.lat;
  var lon = latlon.lng;

  var pt = turf.point([lon, lat]);
  var unit = 'kilometers';
  var radius = 25;
  var buffered = turf.buffer(pt, radius, unit);

  var circle = L.circle([lat, lon], radius * 1000, {
    stroke: true,
    color: "#000",
    opacity: 0.75,
    weight: 2,
    fillColor: "#555555",
    fillOpacity: 0.5
  });
  bufferedLayer.clearLayers().addLayer(circle);
  var fc = turf.featurecollection(stations);
  var ptsWithin = turf.within(stationsGeoJson, buffered);

  var content = 'Within a ' + radius + ' km radius from ' +
    '(' + lat.toFixed(5) + ',' + lon.toFixed(5) + ')<br />' +
    'There is ' + ptsWithin.features.length + ' stations<br/><br/>' +
    '<button id="clear-btn" type="button" class="btn btn-default">Clear</button>';

  $("#feature-info").html(content);
  $("#feature-info-wrapper").show();

  highlight.clearLayers();
  for (var i = 0; i < ptsWithin.features.length; i++) {
    highlight.addLayer(L.circleMarker([ptsWithin.features[i].geometry.coordinates[1], ptsWithin.features[i].geometry.coordinates[0]], highlightStyle));
  }

  $("#clear-btn").click(function() {
    $("#feature-info-wrapper").hide();
    highlight.clearLayers();
    bufferedLayer.clearLayers();
  });

}
