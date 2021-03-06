var map, featureList, stationsGeoJson, stationSearch = [];

$("#feature-info-wrapper").hide();

/*************/
/* functions */
/*************/

function onMapClick(evt) {
    var latlon = evt.latlng;
    var lat = latlon.lat;
    var lon = latlon.lng;

    var radius = 25;

    var circle = L.circle([lat, lon], radius * 1000, {
      stroke: true,
      color: "#000",
      opacity: 0.75,
      weight: 2,
      fillColor: "#555555",
      fillOpacity: 0.5
    });
    bufferedLayer.clearLayers().addLayer(circle);
    highlight.clearLayers();
    map.fitBounds(circle.getBounds());
    // within a square :
    //var ptsWithin = [];
    // stations.eachLayer(function(layer) {
    //   if (circle.getBounds().contains(layer.getLatLng())) {
    //     ptsWithin.push(layer);
    //     highlight.addLayer(L.circleMarker([layer.feature.geometry.coordinates[1], layer.feature.geometry.coordinates[0]], highlightStyle));
    //   }
    // });

    //var fc = turf.featurecollection(stations);
    //var buffered = turf.featurecollection(circle.toGeoJSON());
    var pt = turf.point([lon, lat]);
    var unit = 'kilometers';
    var buffered = turf.buffer(pt, radius, unit);
    var ptsWithin = turf.within(stationsGeoJson, buffered);

    var nbr = 0;
    if( ptsWithin.features ) {
      nbr = ptsWithin.features.length;
    }
    var content = 'Within a ' + radius + ' km radius from ' +
      '(' + lat.toFixed(5) + ',' + lon.toFixed(5) + ')<br />' +
      'There is ' + nbr + ' stations<br/><br/>' +
      '<button id="clear-btn" type="button" class="btn btn-default">Clear</button>';
      for (var i = 0;  i < nbr; i++) {
        highlight.addLayer(L.circleMarker([ptsWithin.features[i].geometry.coordinates[1], ptsWithin.features[i].geometry.coordinates[0]], highlightStyle));
      }

    $("#feature-info").html(content);
    $("#feature-info-wrapper").show();

    $("#clear-btn").click(function() {
      $("#feature-info-wrapper").hide();
      highlight.clearLayers();
      bufferedLayer.clearLayers();
    });
  } //end function onMapClick

function sizeLayerControl() {
  $(".leaflet-control-layers").css("max-height", $("#map").height() - 50);
}

function clearHighlight() {
  highlight.clearLayers();
  bufferedLayer.clearLayers();
  $("#feature-info-wrapper").hide();

}

function sidebarClick(id) {
  var layer = markers.getLayer(id);
  map.setView([layer.getLatLng().lat, layer.getLatLng().lng], 17);
  layer.fire("click");
  /* Hide sidebar and go to the map on small screens */
  if (document.body.clientWidth <= 767) {
    $("#sidebar").hide();
    map.invalidateSize();
  }
}

function syncSidebar() {
  /* Empty sidebar features */
  $("#feature-list tbody").empty();
  /* Loop through stationss layer and add only features which are in the map bounds */
  stations.eachLayer(function(layer) {
    if (map.getBounds().contains(layer.getLatLng())) {
      $("#feature-list tbody").append(getFeatureListContent(layer));
    }
  });
  /* Update list.js featureList */
  featureList = new List("features", {
    valueNames: ["feature-name"],
    plugins: [ListFuzzySearch()]
  });
  featureList.sort("feature-name", {
    order: "asc"
  });
}

function getFeatureListContent(layer) {
  var name = layer.feature.properties.nom_porteur;
  if (layer.feature.properties.nom_station !== '') {
    name = name + ' ' + layer.feature.properties.nom_station;
  }
  return '<tr class="feature-row" id="' + L.stamp(layer) + '" lat="' + layer.getLatLng().lat + '" lng="' + layer.getLatLng().lng +
    '"><td style="vertical-align: middle;"><i class="fa fa-chevron-left pull-left"></i></td><td style="vertical-align: middle;"><img width="24" height="24" src="img/electric_power.png"></td><td class="feature-name">' + name + '</td></tr>';
}

/***************/
/* wire events */
/***************/
$(window).resize(function() {
  sizeLayerControl();
});

$(document).on("click", ".feature-row", function(e) {
  $(document).off("mouseout", ".feature-row", clearHighlight);
  sidebarClick(parseInt($(this).attr("id"), 10));
});

$(document).on("mouseover", ".feature-row", function(e) {
  highlight.clearLayers().addLayer(L.circleMarker([$(this).attr("lat"), $(this).attr("lng")], highlightStyle));
});

$(document).on("mouseout", ".feature-row", clearHighlight);

$("#about-btn").click(function() {
  $("#aboutModal").modal("show");
  $(".navbar-collapse.in").collapse("hide");
  return false;
});

$("#list-btn").click(function() {
  $('#sidebar').toggle();
  map.invalidateSize();
  return false;
});

$("#nav-btn").click(function() {
  $(".navbar-collapse").collapse("toggle");
  return false;
});

$("#sidebar-toggle-btn").click(function() {
  $("#sidebar").toggle();
  map.invalidateSize();
  return false;
});

$("#sidebar-hide-btn").click(function() {
  $('#sidebar').hide();
  map.invalidateSize();
});

/* Highlight search box text on click */
$("#searchbox").click(function() {
  $(this).select();
});

/* Prevent hitting enter from refreshing the page */
$("#searchbox").keypress(function(e) {
  if (e.which === 13) {
    e.preventDefault();
  }
});

$("#featureModal").on("hidden.bs.modal", function(e) {
  $(document).on("mouseout", ".feature-row", clearHighlight);
});

/*******************/
/* let's do maps ! */
/*******************/

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
      var content = "<table class=\"marker-properties\"><tbody>"; // defini ici opur etre utilise dans layer.on(click)
      var out = [];
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
      $("#feature-list tbody").append(getFeatureListContent(layer));
      stationSearch.push({
        name: layer.feature.properties.nom_porteur  + ' ' + layer.feature.properties.nom_station,
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

var lat = 46.6;
var lng = 2.3;
var zoom = 6;

map = L.map('leaflet-map', {
  center: [lat, lng],
  zoom: zoom,
  defaultExtentControl: true,
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

/* Filter sidebar feature list to only show features in current map bounds */
map.on("moveend", function(e) {
  syncSidebar();
});


map.on('click', onMapClick);

$(document).one("ajaxStop", function() {
  $("#loading").hide();
  sizeLayerControl();
  //map.fitBounds(stations.getBounds());

  featureList = new List("features", {
    valueNames: ["feature-name"],
    plugins: [ListFuzzySearch()]
  });
  featureList.sort("feature-name", {
    order: "asc"
  });

  var stationsBH = new Bloodhound({
    name: "Stations",
    datumTokenizer: function(d) {
      return Bloodhound.tokenizers.whitespace(d.name);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    local: stationSearch,
    limit: 10
  });

  stationsBH.initialize();

  /* instantiate the typeahead UI */
  $("#searchbox").typeahead({
    minLength: 3,
    highlight: true,
    hint: false
  }, {
    name: "Stations",
    displayKey: "name",
    source: stationsBH.ttAdapter(),
    templates: {
      header: "<h4 class='typeahead-header'><img width='24' height='24' src='img/electric_power.png'>&nbsp;Stations</h4>",
      suggestion: Handlebars.compile(["{{name}}<br>&nbsp;<small>{{address}}</small>"].join(""))
    }
  }).on("typeahead:selected", function(obj, datum) {
    if (datum.source === "Stations") {
      map.setView([datum.lat, datum.lng], 17);
      if (map._layers[datum.id]) {
        map._layers[datum.id].fire("click");
      }
    }
    if ($(".navbar-collapse").height() > 50) {
      $(".navbar-collapse").collapse("hide");
    }
  }).on("typeahead:opened", function() {
    $(".navbar-collapse.in").css("max-height", $(document).height() - $(".navbar-header").height());
    $(".navbar-collapse.in").css("height", $(document).height() - $(".navbar-header").height());
  }).on("typeahead:closed", function() {
    $(".navbar-collapse.in").css("max-height", "");
    $(".navbar-collapse.in").css("height", "");
  });
  $(".twitter-typeahead").css("position", "static");
  $(".twitter-typeahead").css("display", "block");

});
