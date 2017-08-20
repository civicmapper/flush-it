/**
 * Steps:
 * 
 * 1. Search Address via Typeahead / Bloodhound. Once found, user presses button
 * to trace. Result from search initiates.
 * 2. Search for the nearest structure. When nearest structure is found...
 * 3. Run a Trace from the structure. When the trace completes...
 * 4. Post-process the trace results into a single line, and then split the line evenly.
 * 5  Animate the addition of the line to the map.
 */

/** -------------------------------------------------------------------------
 * DEPENDENCIES
 */

var dissolve = require('geojson-dissolve');

/** -------------------------------------------------------------------------
 * GIS, geoprocessing, and services config
 */
var atlas = {};
atlas.rsi_featurelayer = {
    url : 'http://geo.civicmapper.com/arcgis/rest/services/rsi_featurelayer/MapServer',
    token : {"token":"OjzT3H7TCdHjiGgsdijn8N07tv2eyTa8hsvJ6dkiPryevQ0dlCi0oQFvHNBNV8G_","expires":1503271905287},
    layers: 'all:0,2,3,4'
};
atlas.rsi_networktrace = {
    url : 'https://arcgis4.roktech.net/arcgis/rest/services/rsi/NetworkTrace/GPServer/NetworkTrace/',
    token : {"token":"y2ldVKK-LXvwGBPpX_pKx9CQlMrGg3_mbJFFOY76HQF-XwzH6Dg78xB31rysl_ut","expires":1505783943513}
};
atlas.proxy = {
    url : 'https://mds.3riverswetweather.org/atlas/proxy/proxy.ashx'
};

//var searchDistances = [10,20,40,80,160,320,640];

/** ---------------------------------------------------------------------------
 * MAP LAYERS
 */

// base map layers
var cartoDark = L.tileLayer("https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png", {
    maxZoom: 20,
    zIndex: 1,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://cartodb.com/attributions">CartoDB</a>'
});
//var mapboxImagery = L.tileLayer("https://api.mapbox.com/styles/v1/civicmapper/citn32v7h002v2iprmp4xzjkr/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY2l2aWNtYXBwZXIiLCJhIjoiY2l6cmdnaXc4MDExNTJ2b2F3NThkZm5wNiJ9.N8lpb_oxpIX22eTk1-hI2w", {
//    maxZoom: 20,
//    zIndex: 1,
//    attribution: "&copy; Mapbox &copy; OpenStreetMap &copy; DigitalGlobe"
//});

// layer styles
var highlightStyle = {
    stroke: true,
    color: "#00FFFF",
    fillColor: "#00FFFF",
    fillOpacity: 0.7,
    radius: 12,
    weight: 10
};
var traceSourceStyle = {
    fillColor: "#FFF",
    fillOpacity: 0.8,
    radius: 10,
    stroke: true,
    color: "#00FFFF",
    weight: 10,
    opacity: 0.5
};
var traceResultStyle = {
    fillColor: "#FFF",
    fillOpacity: 0.7,
    radius: 8,
    stroke: true,
    color: "#00FFFF",
    weight: 14,
    opacity: 0.4
};

// make layers
var highlight = L.geoJson(null,highlightStyle);
var trwwTraceSource = L.circleMarker(null, traceSourceStyle);
var trwwTraceResult = L.geoJson(null,traceResultStyle);
var trwwTracePoints = L.geoJson(null,{
    style: traceResultStyle,
    pointToLayer: function(feature, latlng) {
        return L.circleMarker(
            latlng,
            {
                fillColor: "#FFF",
                fillOpacity: 0.8,
                radius: 4,
                stroke: true,
                color: "#00FFFF",
                weight: 4,
                opacity: 0.5
            }
        );
    }
}).bindPopup(function (layer) {
    return layer.feature.properties;
});
var trwwStructures = L.esri.dynamicMapLayer({
    url: atlas.rsi_featurelayer.url,
    layers: atlas.rsi_featurelayer.layers,
    token : atlas.rsi_featurelayer.token.token
    //proxy: atlas.proxy.url
});

/** -------------------------------------------------------------------------
 * LEAFLET MAP SETUP
 */

// make the map
var map = L.map("map", {
    zoom: 13,
    center: [40.443, -79.992],
    layers: [
        cartoDark
    ]
});

// add layers to map
highlight.addTo(map);
trwwTraceResult.addTo(map);
trwwTracePoints.addTo(map);

// set up the D3 SVG pane for the animation

var svg = d3.select(map.getPanes().overlayPane).append("svg");
var g = svg.append("g").attr("class", "leaflet-zoom-hide");

/** -------------------------------------------------------------------------
 * MISC. MAP AND DOM EVENT LISTENERS
 */

// Clear feature highlight when map is clicked
//map.on("click", function(e) {
//    highlight.clearLayers(); 
//});

/**
 * from a point (as L.latlng) find the nearest sewer structure
 * this is made to work with a the Sewer Atlas map service.
 */
function findNearestStructure(latlng) {
    var searchDistance = 1320;
    console.log("seaching within", searchDistance, "feet");
    var targetPoint = turf.point([latlng.lng, latlng.lat]);
    var buffer = turf.buffer(targetPoint, searchDistance, 'feet');
    //ajax request function
    trwwStructures.query().layer(4).fields([]).intersects(buffer)
        //.nearby(latlng, searchDistance) // only works with feature layers
        .run(function(error, featureCollection, response) {
            if (error) {
                console.log(error);
            } else {
                if (featureCollection.features.length > 0) {
                    found = true;
                    console.log(response); 
                    //returns[searchDistance] = featureCollection;
                    var nearest = turf.nearest(targetPoint, featureCollection);
                    console.log(nearest);
                    trwwTraceSource.setLatLng(
                        L.latLng([nearest.geometry.coordinates[1], nearest.geometry.coordinates[0]])
                    );
                    trwwTraceSource.addTo(map);
                    traceExecute(nearest);
                } else {
                    console.log("...nothing found within this distance.");
                }                        
            }
        });
}


/** -------------------------------------------------------------------------
 * NETWORK TRACE functions
 */

/**
 * clear the network trace layers from the map
 */
function clearNetworkTrace() {
    trwwTraceResult.clearLayers();
    trwwTraceSource.remove();
}

/**
 * reset the trace control/message window.
 * optional param dictates if trace result is also removed.
 */
function resetAnalysis(clearLayers) {
    //$('#analyze-button-item').html(analyzeButton);
    //$('#analyze').prop("disabled", true);
    $('#analysis-status').empty();
    $('#analyze-control').hide();
    if (clearLayers) {
        clearNetworkTrace();
    }
}

function traceRunning() {
    msg = "Trace initialized...";
    console.log(msg);
    //$('#msg-status').html(makeAlert(null, 'info'));  
}

function traceError() {
    msg = "Trace: " + error.message + "(code: " + error.code + ")";
    console.log(msg);
    //$('#msg-status').html(makeAlert(msg, 'danger'));
    //$("#networkTrace").prop("disabled", false);
    //$("#clear-status").show();    
}

function traceSuccess() {
    msg = "Trace Complete";
    $('#msg-status').html(makeAlert(msg, 'success'));
    $("#networkTrace").prop("disabled", false);
    // enable clear button 
    $("#clear-status").show();    
}

function traceAnimate(tracePoints) {
    var transform = d3.geo.transform({
        point: projectPoint
    });
    
    var d3path = d3.geo.path().projection(transform);
    
    function projectPoint(x, y) {
        var point = map.latLngToLayerPoint(new L.LatLng(y, x));
        this.stream.point(point.x, point.y);
    }
    
    var toLine = d3.svg.line()
        .interpolate("linear")
        .x(function(d) {
            return applyLatLngToLayer(d).x;
        })
        .y(function(d) {
            return applyLatLngToLayer(d).y;
        });
    
    function applyLatLngToLayer(d) {
        var y = d.geometry.coordinates[1];
        var x = d.geometry.coordinates[0];
        return map.latLngToLayerPoint(new L.LatLng(y, x));
    }

    d3.json(tracePoints, function(collection) {
        // Do stuff here
    });
}

function traceExecute(inputFeature) {
    // create a Terraformer Primitive to be passed to the GP tool
    var source = new Terraformer.Point({
        type: "Point",
        coordinates: [
            inputFeature.geometry.coordinates[0],
            inputFeature.geometry.coordinates[1]
        ]
    });
    //console.log(source);

    /**
     * set up the geoprocessing service and task
     */
    var traceService = L.esri.GP.service({
        url: atlas.rsi_networktrace.url,
        token: atlas.rsi_networktrace.token.token,
        useCors: true,
    });
    var traceTask = traceService.createTask();

    /**
     * run the georpocessing task
     */
    traceTask.on('initialized', function() {
        // set input Flags parameter, and then add fields references.
        traceTask.setParam("Flag", source);
        traceTask.params.Flag.features[0].attributes = {
            "OBJECTID": 1
        };
        traceTask.params.Flag.fields = [{
                "name": "OBJECTID",
                "type": "esriFieldTypeOID",
                "alias": "OBJECTID"
            }
        ];
        //console.log(traceTask);
        var trace_result;
        traceTask.setOutputParam("Downstream_Pipes");
        traceTask.gpAsyncResultParam("Downstream_Pipes", trace_result);

        traceRunning();

        //console.log("Trace initialized. Submitting Request...");
        traceTask.run(function(error, result, response) {
            console.log("Completed", response);
            if (error) {
                traceError();
            } else {
                // log some things
                // convert ESRI Web Mercator to Leaflet Web Mercator
                console.log("reprojecting...");
                var fc1 = Terraformer.toGeographic(result.Downstream_Pipes);
    
                // dissolve the lines
                console.log("dissolving geometry...", fc1);
                var gc1 = dissolve(fc1);

                /**
                 * Draw the Line
                 */
                console.log("Adding data to layer...", gc1);
                // add to the data to the waiting Leaflet object
                trwwTraceResult.addData(gc1);
                // add that to the map
                console.log("Adding layer to map...");
                trwwTraceResult.addTo(map);
                console.log(trwwTraceResult);
                map.fitBounds(trwwTraceResult.getBounds());
                traceSuccess();
                
                /**
                 * Make points for the animation
                 */
                
                // exploded the dissolved line to points
                var exploded = turf.explode(gc1);
                // add a "time" property, which is just the index (draw order)
                turf.propEach(exploded, function (currentProperties, featureIndex) {
                  currentProperties.time = featureIndex;
                  //console.log(featureIndex, currentProperties);
                });
                console.log("exploded:", trwwTracePoints);
                trwwTracePoints.addData(exploded);

            }
        });
    });
}

/** 
 * click event for triggering resetAnalysis funtion
 */
$(document).on("click", "#clearCalcs", function() {
    //console.log("Clearing Trace Results");
    resetAnalysis(true);
});

/**
 * NETWORK TRACE button click - run the trace 
 */

$(document).on("click", "#networkTrace", function() {

    // on click, disable the button to limit multiple requests
    $("#networkTrace").prop("disabled", true);

    // clear previous traces
    clearNetworkTrace();

    // set up the info window
    $("#clear-status").hide();
    $('#analyze-control').show();

    var msg = "Initializing Trace...";
    //console.log(msg);
    $('#msg-status').html(makeAlert(msg, 'info'));

    // get the selected layer from the highlighted layer
    var selected = highlight.getLayers()[0];
    highlight.clearLayers();
    //console.log(selected);

    // add selection to the map as a CircleMarker
    trwwTraceSource.setLatLng(
        L.latLng([selected.feature.geometry.coordinates[1], selected.feature.geometry.coordinates[0]]));
    trwwTraceSource.addTo(map);
    
    // run the GP
    traceExecute(selected.feature);
});

/****************************************************************************
 * Typeahead search functionality
 */

/* Highlight search box text on click */
$("#searchbox").click(function() {
    $(this).select();
});

/* Prevent hitting enter from refreshing the page */
$("#searchbox").keypress(function(e) {
    if (e.which == 13) {
        e.preventDefault();
    }
});

var addressSearch = new Bloodhound({
    name: "Mapzen",
    datumTokenizer: function(d) {
        return Bloodhound.tokenizers.whitespace(d.name);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    remote: {
        url: "https://search.mapzen.com/v1/search?text=%QUERY&size=5&boundary.country=USA&api_key=mapzen-ZGFLinZ",
        filter: function(data) {
            return $.map(data.features, function(feature) {
                return {
                    name: feature.properties.label,
                    lat: feature.geometry.coordinates[1],
                    lng: feature.geometry.coordinates[0],
                    source: "Mapzen"
                };
            });
        },
        ajax: {
            beforeSend: function(jqXhr, settings) {
                // before sending, append bounding box of app AOI to view.
                settings.url += "&boundary.rect.min_lat=40.1243&boundary.rect.min_lon=-80.5106&boundary.rect.max_lat=40.7556&boundary.rect.max_lon=-79.4064";
                $("#searchicon").removeClass("fa-search").addClass("fa-refresh fa-spin");
            },
            complete: function(jqXHR, status) {
                console.log(jqXHR, status);
                $('#searchicon').removeClass("fa-refresh fa-spin").addClass("fa-search");
            }
        }
    },
    limit: 10
});

addressSearch.initialize();

$("#searchbox").typeahead({
    minLength: 3,
    highlight: true,
    hint: false
}, {
    name: "Mapzen",
    displayKey: "name",
    source: addressSearch.ttAdapter(),
    templates: {
        header: "<p class='typeahead-header small'>Found:</p>",
        suggestion: Handlebars.compile(["{{name}}"].join(""))
    }
}).on("typeahead:selected", function(obj, datum) {
    console.log("Search found this: ", datum);
    map.setView([datum.lat, datum.lng], 15);
    highlight.clearLayers();
    highlight.addLayer(
        L.circleMarker([datum.lat, datum.lng]))
        .bindPopup("<h4>" + datum.name + "</h4><p>" + datum.lng + ", " + datum.lat + "</p>")
        .openPopup();
    var latlng = L.latLng({lat: datum.lat, lng: datum.lng});
    clearNetworkTrace();
    findNearestStructure(latlng);
});

$(".twitter-typeahead").css("position", "static");
$(".twitter-typeahead").css("display", "block");


/*****************************************************************************
 * ALERT
 */

function makeAlert(msg, alertType) {
    var defaultMsg = null;
    if (alertType == 'info') {
        defaultMsg = 'Processing...';
    } else if (alertType == 'success') {
        defaultMsg = 'Complete!';
    } else if (alertType == 'danger') {
        defaultMsg = "There was an error with the analysis.";
    } else {
        defaultMsg = "Something went wrong. Check the browser console for details.";
        alertType = 'warning';
    }
    var div1 = '<div class="alert alert-' + alertType + '" role="alert">';
    var div2 = '</div>';
    if (msg) {
        return div1 + msg + div2;
    } else {
        return div1 + defaultMsg + div2;
    }
}

/****************************************************************************
 * Document set-up
 */

$(document).one("ajaxStop", function() {
    console.log("ajaxStop");
    $("#loading").hide();
});