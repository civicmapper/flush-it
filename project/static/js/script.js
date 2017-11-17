/** -------------------------------------------------------------------------
 * DEPENDENCIES
 */
var dissolve = require('geojson-dissolve');
var buffer = require('@turf/buffer');
var nearestPoint = require("@turf/nearest-point");
var explode = require("@turf/explode");
var tag = require("@turf/tag");
var turfHelpers = require("@turf/helpers");

/** -------------------------------------------------------------------------
 * GIS, geoprocessing, and services config
 */

$('#msg-tracing').hide();
$('#msg-error').hide();

function authCallback(thing) {
	console.log("authentication required", thing);
	thing.layer.authenticate(thing.token.token);
}

/**
 * 3RWW Sewer Atlas data reference object: stores urls and temporary tokens for
 * running the 3RWW Sewer Atlas services
 */
var atlas = {
	rsi_featurelayer: {
		url: 'https://arcgis4.roktech.net/arcgis/rest/services/rsi/rsi_featurelayer/MapServer',
		token: {"token":"","expires":0},
		layers: [0,2,3,4,5],
    //layerDefs: {0:"LBS_TAG='LBs_1319249'"},
		layer:null,
		/**
		 * function to init the trww Structure layer, which requires a token first
		 */
		init : function() {
			console.log("Initializing data service...");
			var trwwStructures = L.esri.dynamicMapLayer({
				url: this.url,
				layers: this.layers,
				token: this.token.token,
				minZoom: 16,
				zIndex: 6,
				opacity: 0.6,
				f: 'image'
			});
			this.layer = trwwStructures;
			return trwwStructures;
		}
	},
	rsi_tilelayer: {
		url: 'https://geodata.civicmapper.com/arcgis/rest/services/flushit/rsi_tilelayer_composite/MapServer',
		token: {"token":"","expires":0},
		layer:null,
		/**
		 * function to init the trww Pipes layer, which requires a token first
		 */
		init : function() {
			console.log("Initializing tile service...");
			var trwwPipes = L.esri.tiledMapLayer({
				url: this.url,
				token: this.token.token,
				minZoom: 10,
				maxZoom:19,
				zIndex: 5,
				opacity: 0.9,
			});
			this.layer = trwwPipes;
			return trwwPipes;
		}
	},
	rsi_networktrace: {
		url: 'https://arcgis4.roktech.net/arcgis/rest/services/rsi/NetworkTrace/GPServer/NetworkTrace/',
		token: {"token":"","expires":0},
		service:null,
		/**
		 * init the geoprocessing service, which requires a token
		 */
		init : function() {
			console.log("Initializing gp service...");
			var traceService = L.esri.GP.service({
				url: this.url,
				token: this.token.token,
				useCors: true,
			}).on("requesterror", function(error) {
				// if there is an error authenticating, we'll find it here:
				console.log(error);
				traceError(error);
			}).on("requestsuccess", function(success) {
				console.log("trace service status:",success.response.jobStatus,"(",success.response.jobId,")");
				atlas.rsi_networktrace.service = traceService;
			});
			atlas.rsi_networktrace.service = traceService;
		}
	},
	/**
	 * calls the proxy endpoint to get tokens required to access rsi services
	 */
	initServices: function(callback) {
		console.log("Acquiring Token...");
		$.ajax({
			type: 'GET',
			contentType: 'application/json;charset=UTF-8',
			url: '/generateToken/',
			success: function(response) {

				console.log("Token Acquired", response);
				atlas.rsi_featurelayer.token = response.rsi_token;
				atlas.rsi_networktrace.token = response.rsi_token;
				atlas.rsi_tilelayer.token = response.cmags_token;

				console.log("Initializing services....");
				atlas.rsi_featurelayer.init();
				atlas.rsi_networktrace.init();
				atlas.rsi_tilelayer.init();

				console.log("3RWW Atlas services are ready to go!", atlas);

				//return response;
				callback();

			},
			error: function(error) {
				var msg = "There was an error acquiring the Sewer Atlas token and initializing Sewer Atlas data and analysis services";
				console.log(msg, error);
				messageControl.onError(msg);
			}
		});
	}
};

/**
 * generate the token, add it to the layers, and get the rest of the
 * application up and running
 */
atlas.initServices(appInit);

/**
 * trace results summary object
 */
var traceSummary = {
	length: 0,
	inchmiles: 0,
	places: [],
    datum: {},
	reset: function() {
		// reset values
		this.length = 0;
		this.inchmiles = 0;
		this.munihoods = [];
        this.datum = {};
		$('.traceResults').empty();
	}
};

/**
 * Message Control - central controller for managing application state
 */
var messageControl = {
	element: function() {
		return $('#messageControl');
	},
	messages: {
		facts: [
			"Approximately 130,000 gallons of clean, treated water is discharged every minute from the plant at average daily flow.",
			"ALCOSAN treats 250 Million Gallons of wastewater from 83 communities, including the city of Pittsburgh, each day.",
			"It takes 9-12 hours for flow to travel through treatment processes at the ALCOSAN plant.",
			"ALOCSAN recycles approximately 3 billion gallons of our own effluent water annually.",
			"ALCOSAN's monthly electric bill averages $450,000.",
			"The ALCOSAN plant sits on 59 acres."
		],
	},
	randomMsg:	function(msgList) {
		var list = this.messages[msgList];
		return list[Math.floor(Math.random() * list.length)];
	},
	init: function(leafletMap) {
		L.control.custom({
			id: 'msg-results',
			classes: 'after-trace',
			position: 'topleft',
			content: '<h4>Distance to Plant:<br><span id="traceLength" class="traceResults"></span> feet (<span id="traceLengthMi" class="traceResults"></span> miles)</h4>' + '<h4>Inch-Miles (a proxy for capacity):<br><span id="inchMiles" class="traceResults"></span></h4>' + '<h4>Municipalities/Neighborhoods Passed:</h4><ul id="munihoods" class="traceResults"></ul>',
			style: {
				width: '300px',
			}
		}).addTo(leafletMap);

		L.control.custom({
			id: '#' + this.resetButton.id,
			classes: 'after-trace',
			position: 'bottomright',
			content: this.resetButton.text,
			style: {
				width: '250px',
			}
		}).addTo(leafletMap);

		// then set it its initial visibility and content state
		this.reset();
	},
	onTraceStart: function() {
		$('#addressSearch').fadeOut();
		$('#msg-facts').html(messageControl.randomMsg("facts"));
		$('#msg-tracing').fadeIn();
	},
	onTraceComplete: function() {
		// populate values
		$('#traceLength').html(traceSummary.length.toFixed(2));
    $('#traceLengthMi').html((traceSummary.length * 0.0001893939).toFixed(2));
		$('#inchMiles').html(traceSummary.inchmiles.toFixed(2));
		$.each(traceSummary.places, function(i, v) {
			$('#munihoods').append('<li>' + v + '</li>');
		});
		///turn on/off msgs
		$('#msg-tracing').fadeOut();
		$('#msg-results').fadeIn();
		$('#resetButton').fadeIn();
		//$('.after-trace').fadeIn();
	},
	resetButton: {
		id: 'resetButton',
		text: '<button id="resetButton" type="button" class="btn btn-default btn-lg btn-block">Start Over <i class="fa fa-rotate-left"></i></button>',
		setMsg: $('#' + this.id).html(this.text)
	},	
	onAboutModalOpen: function() {
		if (traceSummary.length === 0) {
			$('#addressSearch').fadeOut();
		}
		$("#aboutModal").modal("show");
	},
	onAboutModalClose: function() {
		if (traceSummary.length === 0) {
			$('#addressSearch').fadeIn();
		}
	},
	onError: function(msg) {
		$('#msg-error').html(msg);
		$('#msg-tracing').fadeOut();
		$('#msg-error').fadeIn();
		$('#resetButton').fadeIn();
	},
	reset: function() {
		$('#addressSearch').fadeIn();
		$('#msg-tracing').fadeOut();
		$('#msg-results').fadeOut();
		$('#msg-error').fadeOut();
    $('#resetButton').fadeOut();
		//$('.after-trace').fadeOut();
	},
};

/** ---------------------------------------------------------------------------
 * MAP LAYERS
 */

// operational layer styles

/**
 * leaflet path options object for the trace source (point)
 */
var traceSourceStyle = {
	fillColor: "#FFF",
	fillOpacity: 0.8,
	radius: 5,
	stroke: true,
	color: "#00FFFF",
	weight: 5,
	opacity: 0.5
};
/**
 * leaflet path options object for the geocoded address (point)
 */
var addressStyle = {
	fillColor: "#FFF",
	fillOpacity: 0.8,
	radius: 10,
	stroke: true,
	color: "#00FFFF",
	weight: 10,
	opacity: 0.5
};
/**
 * leaflet path options object for the trace (line)
 */
var traceResultStyle = {
	fillColor: "#FFF",
	fillOpacity: 0.7,
	radius: 8,
	stroke: true,
	color: "#00FFFF",
	weight: 12,
	opacity: 0.75
};

// basemap layers

/**
 * base map (custom mapbox tileset with no labels!)
 */
var basemap = L.tileLayer(//"https://api.mapbox.com/styles/v1/cbgthor624/cipq73zea0010brnl8jlui4dz/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY2JndGhvcjYyNCIsImEiOiJzZ2NaNmo4In0.hbXzZPAvaCO5GLu45bptTw", {
"https://api.mapbox.com/styles/v1/cbgthor624/cj7m885wh91zm2rn3j6g8et8q/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY2JndGhvcjYyNCIsImEiOiJjajdtOGk0ZDIydThuMnducDNwZmU5NGJkIn0.ZISQHLPj0Yt1AudOgApIww", {
	maxZoom: 20,
	zIndex: 1,
	attribution: 'Basemap &copy; <a href="https://www.mapbox.com/about/maps/" target="_blank">Mapbox</a><span> and &copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a></span>'
});
/**
 * reference layer (custom mapbox tileset with labels only - we put this over
 * top of all other layers)
 */
var labels = L.tileLayer(
"https://api.mapbox.com/styles/v1/cbgthor624/cj7m84goh91lq2sofjiqfbby7/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY2JndGhvcjYyNCIsImEiOiJjajdtOGk0ZDIydThuMnducDNwZmU5NGJkIn0.ZISQHLPj0Yt1AudOgApIww", {
	pane: 'labels',
	maxZoom: 20,
	zIndex: 1,
	opacity: 0.75,
	//attribution: 'Basemap Labels &copy; <a href="https://www.mapbox.com/about/maps/" target="_blank">Mapbox</a><span> and &copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a></span>'
	attribution: ''
});

// reference layers

/**
 * ALCOSAN service area (from 3RWW's ArcGIS Online organization)
 */
var serviceArea = L.esri.featureLayer({
	url: 'https://services6.arcgis.com/dMKWX9NPCcfmaZl3/arcgis/rest/services/alcosan_basemap/FeatureServer/0',
	ignoreRenderer: true,
	style: {
        color: '#50A8B1',
        weight: 10,
        opacity: 0.2,
        fillOpacity: 0.1
	}
});

/**
 * ALCOSAN Municipalities + City of Pittsburgh Neighborhoods (from 3RWW's
 * ArcGIS Online organization)
 */
var muniLayer = L.esri.featureLayer({
	url: 'https://services6.arcgis.com/dMKWX9NPCcfmaZl3/arcgis/rest/services/alcosan_munis_v2/FeatureServer/1',
	ignoreRenderer: true,
	style: {
        fillColor: "#D46323",
		color: '#D46323',
		weight: 4,
		opacity: 0.1,
		fillOpacity: 0
	},
	onEachFeature: function(feature, layer) {
		if (feature.properties && feature.properties.LABEL) {
			var p = L.popup().setContent("<h4>" + feature.properties.LABEL + "</h4>");
			layer.bindPopup(p);
		}
	},
});


// get a geojson of the loaded feature layer for trace summary (used by Turf)
var muniFC;
muniLayer.query().where("MUNI_NAME IS NOT NULL").run(function(error, featureCollection) {
	muniFC = featureCollection;
});


// operational layers

/**
 * geocoded address point
 */
var addressPoint = L.geoJSON(null, {
    pointToLayer: function(geoJsonPoint, latlng) {
        return L.circleMarker(latlng, addressStyle);
    },
    onEachFeature: function(feature, layer) {
        //layer.bindPopup("<h4>" + feature.properties.name + "</h4><p>" + feature.geometry.coordinates[0] + ", " + feature.geometry.coordinates[1] + '</p><p><button id="networkTrace" type="button" class="btn btn-default btn-lg btn-block">Flush! <i class="fa fa-caret-square-o-down"></i></button>').openPopup();
        layer.bindPopup("<h4>" + feature.properties.name + "</h4><p>" + feature.geometry.coordinates[0] + ", " + feature.geometry.coordinates[1] + '</p>').openPopup();
    }
});
/**
 * point on structure at start of trace
 */
var trwwTraceSource = L.geoJSON(null, {
    pointToLayer: function(geoJsonPoint, latlng) {
        return L.circleMarker(latlng, traceSourceStyle);
    }
});
/**
 * Trace destination (ALCOSAN Plant location)
 */
var trwwTraceDestin = L.marker([40.474609776126599,-80.044474186387205], {
    icon: L.icon({
        iconUrl: 'static/resources/marker-alcosan-50px.png',
        iconSize: [50, 50],
    }),
}).bindPopup("<h4>ALCOSAN Plant</h4>");
/**
 * downstream trace result layer. data added later.
 */
var trwwTraceResult = L.geoJSON(null, traceResultStyle);
/**
 * downstream trace result (nodes/points - used for debugging traces)
 */
var trwwTracePoints = L.geoJSON(null, {
	//style: traceResultStyle,
	onEachFeature: function(feature, layer) {
		if (feature.properties && feature.properties.time) {
			var p = L.popup().setContent("<h4>" + feature.properties.time + "</h4>");
			layer.bindPopup(p);
		}
	},
	pointToLayer: function(feature, latlng) {
		return L.circleMarker(
			latlng, {
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
});

/** -------------------------------------------------------------------------
 * LEAFLET MAP SETUP
 */

/**
 * make the Leaflet map
 */
var map = L.map("map", {
	zoom: 8,
	maxZoom: 19,
	center: [40.443, -79.992],
	layers: [
		basemap
	],
	zoomControl: false,
  attributionControl: false
});

/**
 * Application initialization function.
 * Used as a callback, after all layer auths have succeeded.
 */
function appInit() {

	// add layers to map:

	// Reference
	serviceArea.addTo(map);
	muniLayer.addTo(map);

	// Sewer Atlas
	atlas.rsi_tilelayer.layer.addTo(map);
	//atlas.rsi_featurelayer.layer.addTo(map);

	// Trace Search, Source, and Results
	trwwTraceResult.addTo(map);
	//trwwTracePoints.addTo(map);
	trwwTraceSource.addTo(map);
	addressPoint.addTo(map);
	trwwTraceDestin.addTo(map);

	// lastly...create a new map pane, then add the labels tile layer to it.
	map.createPane("labels");
	labels.addTo(map);


	// set map view to the service area layer extents
	serviceArea.query().bounds(function (error, latlngbounds) {
		map.fitBounds(latlngbounds);
	});


	/** -------------------------------------------------------------------------
	 * MAP CONTROLS
	 */

	//L.control.custom({
	//	id: 'titleBlock',
	//	position: 'topleft',
	//	style: { width: '100%'},
	//	content: '<h1 id="title">Flush the Toilet!<br><span id="subtitle">See where your wastewater goes when you flush!</span></h1>'
	//}).addTo(map);

	//L.control.custom({
	//	id: 'credits',
	//	position: 'topright',
	//	content: '<p class="small"style="color:#fff;">A project by:</p><img class="credit-logos" src="static/resources/logo_alcosan.png"/><br><br><img class="credit-logos" src="static/resources/logo_3rww.png"/><br><br><img class="credit-logos" src="static/resources/logo_civicmapper.png"/>',
	//	style: {
	//		width: '220px',
	//	}
	//}).addTo(map);

	//L.control.custom({
	//	id: 'aboutButtonControl',
	//		position: 'topright',
	//	content: '<button id="aboutButton" class="btn btn-default" type="submit"><i class="fa fa-info"></i></button>',
	//		events : {
	//			click : function() {
	//				messageControl.onAboutModalOpen();
	//			}
	//		}
	//}).addTo(map);

	L.control.attribution({prefix: "Not for official use or planning"})
		.addAttribution(" Built by <a href='http://www.civicmapper.com'>CivicMapper</a> w/ <a href='http://www.3riverswetweather.org'>3RWW</a> | Powered by <a href='http://leafletjs.com'>Leaflet</a>, <a href='http://esri.github.io/esri-leaflet/'>Esri-Leaflet</a>, <a href='https://mapzen.com/'>Mapzen</a>")
		.addTo(map);
	L.control.zoom({position: 'bottomleft'}).addTo(map);


	/** -------------------------------------------------------------------------
	 * MISC. MAP AND DOM EVENT LISTENERS
	 */

	/**
	 * make sure layers stay in the correct order when new ones are added later on
	 */
	map.on("layeradd", function(e) {
		trwwTraceSource.bringToFront();
		addressPoint.bringToFront();
	});

	/** -------------------------------------------------------------------------
	 * SEWER DATA QUERY
	 */

	/**
	 * From a point (as L.latlng) find the nearest sewer structure.
	 * This is made to work with a the Sewer Atlas map service.
	 */
	function findNearestStructure(latlng) {
		var searchDistance = 1320;
		console.log("seaching within", searchDistance, "feet");
		var targetPoint = turfHelpers.point([latlng.lng, latlng.lat]);
		var buffered = buffer(targetPoint, searchDistance, {units: 'feet'});
		//ajax request function
		//trwwStructures
		atlas.rsi_featurelayer.layer.query().layer(4).fields([]).intersects(buffered)
			//.nearby(latlng, searchDistance) // only works with feature layers
			.run(function(error, featureCollection, response) {
				if (error) {
					console.log(error);
					messageControl.onError('<i class="fa fa-frown-o"></i> There was an error when searching for the nearest structure (' + error.message + ')');
				} else {
					if (featureCollection.features.length > 0) {
						console.log("trwwStructures.query():", response);
						//returns[searchDistance] = featureCollection;
						var nearest = nearestPoint(targetPoint, featureCollection);
						console.log("nearest:", nearest);
						trwwTraceSource.addData(nearest);
						traceExecute(nearest);
			  return nearest;
					} else {
						console.log("...nothing found within this distance.");
						var content = '<div class="alert alert-danger" role="alert"><h4>It does not appear that ' + traceSummary.datum.name + ' is within the ALCOSAN service area</h4><p>(We could not find any ALCOSAN-connected sewer structures within 1/4 mile of ' + traceSummary.datum.lng + ', ' + traceSummary.datum.lat + ')</p><h4>Try another address.</h4></div>';
						addressPoint.setPopupContent(content);
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
		// remove trace start point
		trwwTraceSource.clearLayers();
		// remove trace line
		trwwTraceResult.clearLayers();
	}

	/**
	 * display message when trace is running
	 */
	function traceRunning() {
		console.log("Trace initialized...");
		messageControl.onTraceStart();
	}

	/**
	 * display error when trace fails
	 */
	function traceError(error) {
		var msg = "Trace: " + error.message + "(code: " + error.code + ")";
		console.log(msg);
		messageControl.onError('<p><i class="fa fa-frown-o"></i> There was an error with the trace:<br>' + msg + '<p>');
	}

	/**
	 * do things when trace is complete
	 */
	function traceSuccess() {
		messageControl.onTraceComplete();
		var msg = "Trace Complete";
		console.log(msg);
	}

	/**
	 * takes the raw trace response and calculates some totals
	 */
	function traceSummarize(featureCollection, summaryGeography) {
		console.log("summarizing trace...");
		// generate totals
		$.each(featureCollection.features, function(k, v) {
			traceSummary.length += v.properties.Shape_Length * 3.28084;
			traceSummary.inchmiles += v.properties.INCHMILES;
		});
		// generate a list of summary geographies
		var exploded = explode(featureCollection);
		var tagged = tag(exploded, summaryGeography, 'LABEL', 'places');
		console.log(tagged);
		var places = geojson_set(tagged.features, 'places');
		traceSummary.places = places;
		console.log(traceSummary);
	}

	/**
	 * given an input feature (geojson point), trace downstream on the 3RWW Sewer
	 * Atlas network dataset.
	 */
	function traceExecute(inputFeature) {

		// display "flushing" message
		traceRunning();

		// create a Terraformer Primitive from input (passed to the GP tool)
		var source = new Terraformer.Point({
			type: "Point",
			coordinates: [
				inputFeature.geometry.coordinates[0],
				inputFeature.geometry.coordinates[1]
			]
		});
		//console.log(source);

		/**
		 * set up the geoprocessing task
		 */
		//var traceTask = traceService.createTask();
		console.log(atlas);
		var traceTask = atlas.rsi_networktrace.service.createTask();


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
			}];
			//console.log(traceTask);
			var trace_result;
			traceTask.setOutputParam("Downstream_Pipes");
			traceTask.gpAsyncResultParam("Downstream_Pipes", trace_result);

			console.log("Trace initialized. Submitting request to tracing service...");
			traceTask.run(function(error, result, response) {
				console.log("Request completed:", response);
				if (error) {
					console.log("There was an error: ", error);
					traceError(error);
				} else {
					/**
					 * Derive a simplified trace from the GP results for display
					 */
					// convert ESRI Web Mercator to Leaflet Web Mercator
					console.log("reprojecting results...");
					var fc1 = Terraformer.toGeographic(result.Downstream_Pipes);
					// dissolve the lines
					console.log("dissolving results...");
					var gc1 = dissolve(fc1);
					console.log("Adding data to layer...", gc1);
					// add to the data to the waiting Leaflet object
					trwwTraceResult.addData(gc1);
					// add that to the map
					console.log("Adding layer to map...");
					trwwTraceResult.addTo(map);
					// adjust the map position and zoom to definitely fit the results
					map.fitBounds(
						trwwTraceResult.getBounds(),
						{
							paddingTopLeft: L.point(300, 75),
							paddingBottomRight: L.point(300, 75)
						}
					);
					//map.setZoom(map.getZoom() - 2);

					/**
					 * Generate Summaries
					 */
					traceSummarize(fc1, muniFC);

					/**
					 * Animate
					 */
					// preprocess data fro animation
					//var tracePoints = traceAnimatePrep(geometryCollection);
					// animate
					//traceAnimate(tracePoints);

					// Display completion messages, results, etc.
					traceSuccess();
					console.log("Trace Results:", gc1);
				}
			});
		});
	}

	/**
	 * NETWORK TRACE button click - run the trace once address has been identified (this could be accessed from the address pop-up)
	 */
	$(document).on("click", "#networkTrace", function() {
			//disable the button
		$(this).prop("disabled",true);
		// clear previous traces
			clearNetworkTrace();
		// search for the nearest structure
		var nearest = findNearestStructure(L.latLng({
				lat: traceSummary.datum.lat,
				lng: traceSummary.datum.lng
			}));
		console.log("nearest", nearest);
		// run the GP using the geojson
		traceExecute(nearest);
	});

	/**
	 * ABOUT BUTTON
	 */
	$('#aboutModal').on('hidden.bs.modal', function (e) {
	  messageControl.onAboutModalClose();
	});

	/**
	 * click event to reset the analysis function
	 */
	$(document).on("click", '#' + messageControl.resetButton.id, function() {
		console.log("Resetting the trace.");
		console.log("--------------------");
		// reset all controls to initial state
		messageControl.reset();
		// set traceSummary object to initial values
		traceSummary.reset();
		// remove the network trace from the map
		clearNetworkTrace();
		// remove the geocoded address point from the map
		resetAddressSearch();
	});

	/**--------------------------------------------------------------------------
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
					console.log("geocoding search", status);
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
			header: "<p class='typeahead-header'>Select address at which to flush the toilet:</p>",
			suggestion: Handlebars.compile(["{{name}}"].join(""))
		}
	}).on("typeahead:selected", function(obj, datum) {
		// once an address is selected from the drop-down:

		// store geocoding results in the global summary object
		traceSummary.datum = datum;

		// store the position of the address at latLng object
		var latlng = L.latLng({
			lat: datum.lat,
			lng: datum.lng
		});

		console.log("Search found this: ", datum, latlng);

		// set the map view to the address location
		map.setView(latlng, 15);
		// clear the previous network trace
		clearNetworkTrace();
		// remove the previous geocoded address point
		//addressPoint.remove();
		// add a point at the address, bind a pop-up, and open the pop-up automatically
		//addressPoint.setLatLng(latlng).bindPopup("<h4>" + datum.name + "</h4><p>" + datum.lng + ", " + datum.lat + "</p>").openPopup();

		addressPoint.clearLayers();
		addressPoint
			.addData({
				"type": "FeatureCollection",
				"features": [{
					"type":"Feature",
					"properties":{
						"name": datum.name
					},
					"geometry": {
						"type": "Point",
						"coordinates": [datum.lng, datum.lat]
					}
				}]
			})
			//.bindPopup("<h4>" + datum.name + "</h4><p>" + datum.lng + ", " + datum.lat + '</p><p><button id="networkTrace" type="button" class="btn btn-default btn-lg btn-block">Flush! <i class="fa fa-caret-square-o-down"></i></button>')
			.bindPopup("<h4>" + datum.name + "</h4><p>" + datum.lng + ", " + datum.lat + '</p>')
			.openPopup();
		// from that point, automatically find the nearest sewer structure
		findNearestStructure(latlng);
	});

	$(".twitter-typeahead").css("position", "static");
	$(".twitter-typeahead").css("display", "block");

	/**
	 * reset the address search box, remove the geocoded address point, and
	 * close the pop-up.
	 */
	function resetAddressSearch() {
		$('#searchbox').val('');
		addressPoint.clearLayers();
		addressPoint.closePopup();
	}

	/**
	 * given the features array from a geojson feature collection, and a property,
	 * get a "set" (unique values) of values stored in that property
	 */
	function geojson_set(array, property) {
		var unique = [];
		$.each(array, function(i, e) {
			var p = e.properties[property];
			if ($.inArray(p, unique) == -1) {
				if (p !== undefined) {
					unique.push(e.properties[property]);
				}
			}
		});
		return unique;
	}

	/**---------------------------------------------------------------------------
	 * DOCUMENT INITIALIZATION
	 */

	messageControl.init(map);

}

$(document).ready(function() {
	// clear the address search box, since on page refresh the text might be retained
	$('#searchbox').val('');

	
	// modal buttons
	$("#aboutButton").click(function() {
		messageControl.onAboutModalOpen();
		$(".navbar-collapse.in").collapse("hide");
		return false;
	});
	
	
	
});

$(window).on("load", function() {
//$(document).ready(function() {
	// hide the loading screen (revealing the map)
	$("#loadingScreen").fadeOut();
	setTimeout(function(){
		$("#messageControl").fadeIn();
	}, 500);
	console.log("Ready to get flushing.");
});

