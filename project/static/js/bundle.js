(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = {
   dissolve: require('geojson-dissolve'),
   script: require('./project/static/js/script.js'),
};
},{"./project/static/js/script.js":8,"geojson-dissolve":3}],2:[function(require,module,exports){
/**
 * Callback for coordEach
 *
 * @private
 * @callback coordEachCallback
 * @param {[number, number]} currentCoords The current coordinates being processed.
 * @param {number} currentIndex The index of the current element being processed in the
 * array.Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
 */

/**
 * Iterate over coordinates in any GeoJSON object, similar to Array.forEach()
 *
 * @name coordEach
 * @param {Object} layer any GeoJSON object
 * @param {Function} callback a method that takes (currentCoords, currentIndex)
 * @param {boolean} [excludeWrapCoord=false] whether or not to include
 * the final coordinate of LinearRings that wraps the ring in its iteration.
 * @example
 * var features = {
 *   "type": "FeatureCollection",
 *   "features": [
 *     {
 *       "type": "Feature",
 *       "properties": {},
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [26, 37]
 *       }
 *     },
 *     {
 *       "type": "Feature",
 *       "properties": {},
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [36, 53]
 *       }
 *     }
 *   ]
 * };
 * turf.coordEach(features, function (currentCoords, currentIndex) {
 *   //=currentCoords
 *   //=currentIndex
 * });
 */
function coordEach(layer, callback, excludeWrapCoord) {
    var i, j, k, g, l, geometry, stopG, coords,
        geometryMaybeCollection,
        wrapShrink = 0,
        currentIndex = 0,
        isGeometryCollection,
        isFeatureCollection = layer.type === 'FeatureCollection',
        isFeature = layer.type === 'Feature',
        stop = isFeatureCollection ? layer.features.length : 1;

  // This logic may look a little weird. The reason why it is that way
  // is because it's trying to be fast. GeoJSON supports multiple kinds
  // of objects at its root: FeatureCollection, Features, Geometries.
  // This function has the responsibility of handling all of them, and that
  // means that some of the `for` loops you see below actually just don't apply
  // to certain inputs. For instance, if you give this just a
  // Point geometry, then both loops are short-circuited and all we do
  // is gradually rename the input until it's called 'geometry'.
  //
  // This also aims to allocate as few resources as possible: just a
  // few numbers and booleans, rather than any temporary arrays as would
  // be required with the normalization approach.
    for (i = 0; i < stop; i++) {

        geometryMaybeCollection = (isFeatureCollection ? layer.features[i].geometry :
        (isFeature ? layer.geometry : layer));
        isGeometryCollection = geometryMaybeCollection.type === 'GeometryCollection';
        stopG = isGeometryCollection ? geometryMaybeCollection.geometries.length : 1;

        for (g = 0; g < stopG; g++) {
            geometry = isGeometryCollection ?
            geometryMaybeCollection.geometries[g] : geometryMaybeCollection;
            coords = geometry.coordinates;

            wrapShrink = (excludeWrapCoord &&
                (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon')) ?
                1 : 0;

            if (geometry.type === 'Point') {
                callback(coords, currentIndex);
                currentIndex++;
            } else if (geometry.type === 'LineString' || geometry.type === 'MultiPoint') {
                for (j = 0; j < coords.length; j++) {
                    callback(coords[j], currentIndex);
                    currentIndex++;
                }
            } else if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString') {
                for (j = 0; j < coords.length; j++)
                    for (k = 0; k < coords[j].length - wrapShrink; k++) {
                        callback(coords[j][k], currentIndex);
                        currentIndex++;
                    }
            } else if (geometry.type === 'MultiPolygon') {
                for (j = 0; j < coords.length; j++)
                    for (k = 0; k < coords[j].length; k++)
                        for (l = 0; l < coords[j][k].length - wrapShrink; l++) {
                            callback(coords[j][k][l], currentIndex);
                            currentIndex++;
                        }
            } else if (geometry.type === 'GeometryCollection') {
                for (j = 0; j < geometry.geometries.length; j++)
                    coordEach(geometry.geometries[j], callback, excludeWrapCoord);
            } else {
                throw new Error('Unknown Geometry Type');
            }
        }
    }
}
module.exports.coordEach = coordEach;

/**
 * Callback for coordReduce
 *
 * The first time the callback function is called, the values provided as arguments depend
 * on whether the reduce method has an initialValue argument.
 *
 * If an initialValue is provided to the reduce method:
 *  - The previousValue argument is initialValue.
 *  - The currentValue argument is the value of the first element present in the array.
 *
 * If an initialValue is not provided:
 *  - The previousValue argument is the value of the first element present in the array.
 *  - The currentValue argument is the value of the second element present in the array.
 *
 * @private
 * @callback coordReduceCallback
 * @param {*} previousValue The accumulated value previously returned in the last invocation
 * of the callback, or initialValue, if supplied.
 * @param {[number, number]} currentCoords The current coordinate being processed.
 * @param {number} currentIndex The index of the current element being processed in the
 * array.Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
 */

/**
 * Reduce coordinates in any GeoJSON object, similar to Array.reduce()
 *
 * @name coordReduce
 * @param {Object} layer any GeoJSON object
 * @param {Function} callback a method that takes (previousValue, currentCoords, currentIndex)
 * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
 * @param {boolean} [excludeWrapCoord=false] whether or not to include
 * the final coordinate of LinearRings that wraps the ring in its iteration.
 * @returns {*} The value that results from the reduction.
 * @example
 * var features = {
 *   "type": "FeatureCollection",
 *   "features": [
 *     {
 *       "type": "Feature",
 *       "properties": {},
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [26, 37]
 *       }
 *     },
 *     {
 *       "type": "Feature",
 *       "properties": {},
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [36, 53]
 *       }
 *     }
 *   ]
 * };
 * turf.coordReduce(features, function (previousValue, currentCoords, currentIndex) {
 *   //=previousValue
 *   //=currentCoords
 *   //=currentIndex
 *   return currentCoords;
 * });
 */
function coordReduce(layer, callback, initialValue, excludeWrapCoord) {
    var previousValue = initialValue;
    coordEach(layer, function (currentCoords, currentIndex) {
        if (currentIndex === 0 && initialValue === undefined) {
            previousValue = currentCoords;
        } else {
            previousValue = callback(previousValue, currentCoords, currentIndex);
        }
    }, excludeWrapCoord);
    return previousValue;
}
module.exports.coordReduce = coordReduce;

/**
 * Callback for propEach
 *
 * @private
 * @callback propEachCallback
 * @param {*} currentProperties The current properties being processed.
 * @param {number} currentIndex The index of the current element being processed in the
 * array.Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
 */

/**
 * Iterate over properties in any GeoJSON object, similar to Array.forEach()
 *
 * @name propEach
 * @param {Object} layer any GeoJSON object
 * @param {Function} callback a method that takes (currentProperties, currentIndex)
 * @example
 * var features = {
 *   "type": "FeatureCollection",
 *   "features": [
 *     {
 *       "type": "Feature",
 *       "properties": {"foo": "bar"},
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [26, 37]
 *       }
 *     },
 *     {
 *       "type": "Feature",
 *       "properties": {"hello": "world"},
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [36, 53]
 *       }
 *     }
 *   ]
 * };
 * turf.propEach(features, function (currentProperties, currentIndex) {
 *   //=currentProperties
 *   //=currentIndex
 * });
 */
function propEach(layer, callback) {
    var i;
    switch (layer.type) {
    case 'FeatureCollection':
        for (i = 0; i < layer.features.length; i++) {
            callback(layer.features[i].properties, i);
        }
        break;
    case 'Feature':
        callback(layer.properties, 0);
        break;
    }
}
module.exports.propEach = propEach;


/**
 * Callback for propReduce
 *
 * The first time the callback function is called, the values provided as arguments depend
 * on whether the reduce method has an initialValue argument.
 *
 * If an initialValue is provided to the reduce method:
 *  - The previousValue argument is initialValue.
 *  - The currentValue argument is the value of the first element present in the array.
 *
 * If an initialValue is not provided:
 *  - The previousValue argument is the value of the first element present in the array.
 *  - The currentValue argument is the value of the second element present in the array.
 *
 * @private
 * @callback propReduceCallback
 * @param {*} previousValue The accumulated value previously returned in the last invocation
 * of the callback, or initialValue, if supplied.
 * @param {*} currentProperties The current properties being processed.
 * @param {number} currentIndex The index of the current element being processed in the
 * array.Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
 */

/**
 * Reduce properties in any GeoJSON object into a single value,
 * similar to how Array.reduce works. However, in this case we lazily run
 * the reduction, so an array of all properties is unnecessary.
 *
 * @name propReduce
 * @param {Object} layer any GeoJSON object
 * @param {Function} callback a method that takes (previousValue, currentProperties, currentIndex)
 * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
 * @returns {*} The value that results from the reduction.
 * @example
 * var features = {
 *   "type": "FeatureCollection",
 *   "features": [
 *     {
 *       "type": "Feature",
 *       "properties": {"foo": "bar"},
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [26, 37]
 *       }
 *     },
 *     {
 *       "type": "Feature",
 *       "properties": {"hello": "world"},
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [36, 53]
 *       }
 *     }
 *   ]
 * };
 * turf.propReduce(features, function (previousValue, currentProperties, currentIndex) {
 *   //=previousValue
 *   //=currentProperties
 *   //=currentIndex
 *   return currentProperties
 * });
 */
function propReduce(layer, callback, initialValue) {
    var previousValue = initialValue;
    propEach(layer, function (currentProperties, currentIndex) {
        if (currentIndex === 0 && initialValue === undefined) {
            previousValue = currentProperties;
        } else {
            previousValue = callback(previousValue, currentProperties, currentIndex);
        }
    });
    return previousValue;
}
module.exports.propReduce = propReduce;

/**
 * Callback for featureEach
 *
 * @private
 * @callback featureEachCallback
 * @param {Feature<any>} currentFeature The current feature being processed.
 * @param {number} currentIndex The index of the current element being processed in the
 * array.Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
 */

/**
 * Iterate over features in any GeoJSON object, similar to
 * Array.forEach.
 *
 * @name featureEach
 * @param {Object} layer any GeoJSON object
 * @param {Function} callback a method that takes (currentFeature, currentIndex)
 * @example
 * var features = {
 *   "type": "FeatureCollection",
 *   "features": [
 *     {
 *       "type": "Feature",
 *       "properties": {},
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [26, 37]
 *       }
 *     },
 *     {
 *       "type": "Feature",
 *       "properties": {},
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [36, 53]
 *       }
 *     }
 *   ]
 * };
 * turf.featureEach(features, function (currentFeature, currentIndex) {
 *   //=currentFeature
 *   //=currentIndex
 * });
 */
function featureEach(layer, callback) {
    if (layer.type === 'Feature') {
        callback(layer, 0);
    } else if (layer.type === 'FeatureCollection') {
        for (var i = 0; i < layer.features.length; i++) {
            callback(layer.features[i], i);
        }
    }
}
module.exports.featureEach = featureEach;

/**
 * Callback for featureReduce
 *
 * The first time the callback function is called, the values provided as arguments depend
 * on whether the reduce method has an initialValue argument.
 *
 * If an initialValue is provided to the reduce method:
 *  - The previousValue argument is initialValue.
 *  - The currentValue argument is the value of the first element present in the array.
 *
 * If an initialValue is not provided:
 *  - The previousValue argument is the value of the first element present in the array.
 *  - The currentValue argument is the value of the second element present in the array.
 *
 * @private
 * @callback featureReduceCallback
 * @param {*} previousValue The accumulated value previously returned in the last invocation
 * of the callback, or initialValue, if supplied.
 * @param {Feature<any>} currentFeature The current Feature being processed.
 * @param {number} currentIndex The index of the current element being processed in the
 * array.Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
 */

/**
 * Reduce features in any GeoJSON object, similar to Array.reduce().
 *
 * @name featureReduce
 * @param {Object} layer any GeoJSON object
 * @param {Function} callback a method that takes (previousValue, currentFeature, currentIndex)
 * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
 * @returns {*} The value that results from the reduction.
 * @example
 * var features = {
 *   "type": "FeatureCollection",
 *   "features": [
 *     {
 *       "type": "Feature",
 *       "properties": {"foo": "bar"},
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [26, 37]
 *       }
 *     },
 *     {
 *       "type": "Feature",
 *       "properties": {"hello": "world"},
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [36, 53]
 *       }
 *     }
 *   ]
 * };
 * turf.featureReduce(features, function (previousValue, currentFeature, currentIndex) {
 *   //=previousValue
 *   //=currentFeature
 *   //=currentIndex
 *   return currentFeature
 * });
 */
function featureReduce(layer, callback, initialValue) {
    var previousValue = initialValue;
    featureEach(layer, function (currentFeature, currentIndex) {
        if (currentIndex === 0 && initialValue === undefined) {
            previousValue = currentFeature;
        } else {
            previousValue = callback(previousValue, currentFeature, currentIndex);
        }
    });
    return previousValue;
}
module.exports.featureReduce = featureReduce;

/**
 * Get all coordinates from any GeoJSON object.
 *
 * @name coordAll
 * @param {Object} layer any GeoJSON object
 * @returns {Array<Array<number>>} coordinate position array
 * @example
 * var features = {
 *   "type": "FeatureCollection",
 *   "features": [
 *     {
 *       "type": "Feature",
 *       "properties": {},
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [26, 37]
 *       }
 *     },
 *     {
 *       "type": "Feature",
 *       "properties": {},
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [36, 53]
 *       }
 *     }
 *   ]
 * };
 * var coords = turf.coordAll(features);
 * //=coords
 */
function coordAll(layer) {
    var coords = [];
    coordEach(layer, function (coord) {
        coords.push(coord);
    });
    return coords;
}
module.exports.coordAll = coordAll;

/**
 * Iterate over each geometry in any GeoJSON object, similar to Array.forEach()
 *
 * @name geomEach
 * @param {Object} layer any GeoJSON object
 * @param {Function} callback a method that takes (currentGeometry, currentIndex)
 * @example
 * var features = {
 *   "type": "FeatureCollection",
 *   "features": [
 *     {
 *       "type": "Feature",
 *       "properties": {},
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [26, 37]
 *       }
 *     },
 *     {
 *       "type": "Feature",
 *       "properties": {},
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [36, 53]
 *       }
 *     }
 *   ]
 * };
 * turf.geomEach(features, function (currentGeometry, currentIndex) {
 *   //=currentGeometry
 *   //=currentIndex
 * });
 */
function geomEach(layer, callback) {
    var i, j, g, geometry, stopG,
        geometryMaybeCollection,
        isGeometryCollection,
        currentIndex = 0,
        isFeatureCollection = layer.type === 'FeatureCollection',
        isFeature = layer.type === 'Feature',
        stop = isFeatureCollection ? layer.features.length : 1;

  // This logic may look a little weird. The reason why it is that way
  // is because it's trying to be fast. GeoJSON supports multiple kinds
  // of objects at its root: FeatureCollection, Features, Geometries.
  // This function has the responsibility of handling all of them, and that
  // means that some of the `for` loops you see below actually just don't apply
  // to certain inputs. For instance, if you give this just a
  // Point geometry, then both loops are short-circuited and all we do
  // is gradually rename the input until it's called 'geometry'.
  //
  // This also aims to allocate as few resources as possible: just a
  // few numbers and booleans, rather than any temporary arrays as would
  // be required with the normalization approach.
    for (i = 0; i < stop; i++) {

        geometryMaybeCollection = (isFeatureCollection ? layer.features[i].geometry :
        (isFeature ? layer.geometry : layer));
        isGeometryCollection = geometryMaybeCollection.type === 'GeometryCollection';
        stopG = isGeometryCollection ? geometryMaybeCollection.geometries.length : 1;

        for (g = 0; g < stopG; g++) {
            geometry = isGeometryCollection ?
            geometryMaybeCollection.geometries[g] : geometryMaybeCollection;

            if (geometry.type === 'Point' ||
                geometry.type === 'LineString' ||
                geometry.type === 'MultiPoint' ||
                geometry.type === 'Polygon' ||
                geometry.type === 'MultiLineString' ||
                geometry.type === 'MultiPolygon') {
                callback(geometry, currentIndex);
                currentIndex++;
            } else if (geometry.type === 'GeometryCollection') {
                for (j = 0; j < geometry.geometries.length; j++) {
                    callback(geometry.geometries[j], currentIndex);
                    currentIndex++;
                }
            } else {
                throw new Error('Unknown Geometry Type');
            }
        }
    }
}
module.exports.geomEach = geomEach;

/**
 * Callback for geomReduce
 *
 * The first time the callback function is called, the values provided as arguments depend
 * on whether the reduce method has an initialValue argument.
 *
 * If an initialValue is provided to the reduce method:
 *  - The previousValue argument is initialValue.
 *  - The currentValue argument is the value of the first element present in the array.
 *
 * If an initialValue is not provided:
 *  - The previousValue argument is the value of the first element present in the array.
 *  - The currentValue argument is the value of the second element present in the array.
 *
 * @private
 * @callback geomReduceCallback
 * @param {*} previousValue The accumulated value previously returned in the last invocation
 * of the callback, or initialValue, if supplied.
 * @param {*} currentGeometry The current Feature being processed.
 * @param {number} currentIndex The index of the current element being processed in the
 * array.Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
 */

/**
 * Reduce geometry in any GeoJSON object, similar to Array.reduce().
 *
 * @name geomReduce
 * @param {Object} layer any GeoJSON object
 * @param {Function} callback a method that takes (previousValue, currentGeometry, currentIndex)
 * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
 * @returns {*} The value that results from the reduction.
 * @example
 * var features = {
 *   "type": "FeatureCollection",
 *   "features": [
 *     {
 *       "type": "Feature",
 *       "properties": {"foo": "bar"},
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [26, 37]
 *       }
 *     },
 *     {
 *       "type": "Feature",
 *       "properties": {"hello": "world"},
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [36, 53]
 *       }
 *     }
 *   ]
 * };
 * turf.geomReduce(features, function (previousValue, currentGeometry, currentIndex) {
 *   //=previousValue
 *   //=currentGeometry
 *   //=currentIndex
 *   return currentGeometry
 * });
 */
function geomReduce(layer, callback, initialValue) {
    var previousValue = initialValue;
    geomEach(layer, function (currentGeometry, currentIndex) {
        if (currentIndex === 0 && initialValue === undefined) {
            previousValue = currentGeometry;
        } else {
            previousValue = callback(previousValue, currentGeometry, currentIndex);
        }
    });
    return previousValue;
}
module.exports.geomReduce = geomReduce;

},{}],3:[function(require,module,exports){
var createTopology = require('topojson-server').topology
var mergeTopology = require('topojson-client').merge
var dissolveLineStrings = require('geojson-linestring-dissolve')
var geomEach = require('@turf/meta').geomEach
var flatten = require('geojson-flatten')

module.exports = dissolve

function toArray (args) {
  if (!args.length) return []
  return Array.isArray(args[0]) ? args[0] : Array.prototype.slice.call(args)
}

function dissolvePolygons (geoms) {
  // Topojson modifies in place, so we need to deep clone first
  var objects = {
    geoms: {
      type: 'GeometryCollection',
      geometries: JSON.parse(JSON.stringify(geoms))
    }
  }
  var topo = createTopology(objects)
  return mergeTopology(topo, topo.objects.geoms.geometries)
}

// [GeoJSON] -> String|Null
function getHomogenousType (geoms) {
  var type = null
  for (var i = 0; i < geoms.length; i++) {
    if (!type) {
      type = geoms[i].type
    } else if (type !== geoms[i].type) {
      return null
    }
  }
  return type
}

// Transform function: attempts to dissolve geojson objects where possible
// [GeoJSON] -> GeoJSON geometry
function dissolve () {
  // accept an array of geojson objects, or an argument list
  var objects = toArray(arguments)
  var geoms = objects.reduce(function (acc, o) {
    // flatten any Multi-geom into features of simple types
    var flat = flatten(o)
    if (!Array.isArray(flat)) flat = [flat]
    for (var i = 0; i < flat.length; i++) {
      // get an array of all flatten geometry objects
      geomEach(flat[i], function (geom) {
        acc.push(geom)
      })
    }
    return acc
  }, [])
  // Assert homogenity
  var type = getHomogenousType(geoms)
  if (!type) {
    throw new Error('List does not contain only homoegenous GeoJSON')
  }

  switch (type) {
    case 'LineString':
      return dissolveLineStrings(geoms)
    case 'Polygon':
      return dissolvePolygons(geoms)
    default:
      return geoms
  }
}


},{"@turf/meta":2,"geojson-flatten":4,"geojson-linestring-dissolve":5,"topojson-client":6,"topojson-server":7}],4:[function(require,module,exports){
function flatten(gj) {
    switch ((gj && gj.type) || null) {
        case 'FeatureCollection':
            gj.features = gj.features.reduce(function(mem, feature) {
                return mem.concat(flatten(feature));
            }, []);
            return gj;
        case 'Feature':
            if (!gj.geometry) return gj;
            return flatten(gj.geometry).map(function(geom) {
                return {
                    type: 'Feature',
                    properties: JSON.parse(JSON.stringify(gj.properties)),
                    geometry: geom
                };
            });
        case 'MultiPoint':
            return gj.coordinates.map(function(_) {
                return { type: 'Point', coordinates: _ };
            });
        case 'MultiPolygon':
            return gj.coordinates.map(function(_) {
                return { type: 'Polygon', coordinates: _ };
            });
        case 'MultiLineString':
            return gj.coordinates.map(function(_) {
                return { type: 'LineString', coordinates: _ };
            });
        case 'GeometryCollection':
            return gj.geometries.map(flatten).reduce(function(memo, geoms) {
                return memo.concat(geoms);
            }, []);
        case 'Point':
        case 'Polygon':
        case 'LineString':
            return [gj];
    }
}

module.exports = flatten;

},{}],5:[function(require,module,exports){
module.exports = mergeViableLineStrings

// [Number, Number] -> String
function coordId (coord) {
  return coord[0].toString() + ',' + coord[1].toString()
}

// LineString, LineString -> LineString
function mergeLineStrings (a, b) {
  var s1 = coordId(a.coordinates[0])
  var e1 = coordId(a.coordinates[a.coordinates.length - 1])
  var s2 = coordId(b.coordinates[0])
  var e2 = coordId(b.coordinates[b.coordinates.length - 1])

  // TODO: handle case where more than one of these is true!

  var coords
  if (s1 === e2) {
    coords = b.coordinates.concat(a.coordinates.slice(1))
  } else if (s2 === e1) {
    coords = a.coordinates.concat(b.coordinates.slice(1))
  } else if (s1 === s2) {
    coords = a.coordinates.slice(1).reverse().concat(b.coordinates)
  } else if (e1 === e2) {
    coords = a.coordinates.concat(b.coordinates.reverse().slice(1))
  } else {
    return null
  }

  return {
    type: 'LineString',
    coordinates: coords
  }
}

// Merges all connected (non-forking, non-junctioning) line strings into single
// line strings.
// [LineString] -> LineString|MultiLineString
function mergeViableLineStrings (geoms) {
  // TODO: assert all are linestrings

  var lineStrings = geoms.slice()
  var result = []
  while (lineStrings.length > 0) {
    var ls = lineStrings.shift()

    // Attempt to merge this LineString with the other LineStrings, updating
    // the reference as it is merged with others and grows.
    lineStrings = lineStrings.reduce(function (accum, cur) {
      var merged = mergeLineStrings(ls, cur)
      if (merged) {
        // Accumulate the merged LineString
        ls = merged
      } else {
        // Put the unmerged LineString back into the list
        accum.push(cur)
      }
      return accum
    }, [])

    result.push(ls)
  }

  if (result.length === 1) {
    result = result[0]
  } else {
    result = {
      type: 'MultiLineString',
      coordinates: result.map(function (ls) { return ls.coordinates })
    }
  }
  return result
}


},{}],6:[function(require,module,exports){
// https://github.com/topojson/topojson-client Version 3.0.0. Copyright 2017 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.topojson = global.topojson || {})));
}(this, (function (exports) { 'use strict';

var identity = function(x) {
  return x;
};

var transform = function(transform) {
  if (transform == null) return identity;
  var x0,
      y0,
      kx = transform.scale[0],
      ky = transform.scale[1],
      dx = transform.translate[0],
      dy = transform.translate[1];
  return function(input, i) {
    if (!i) x0 = y0 = 0;
    var j = 2, n = input.length, output = new Array(n);
    output[0] = (x0 += input[0]) * kx + dx;
    output[1] = (y0 += input[1]) * ky + dy;
    while (j < n) output[j] = input[j], ++j;
    return output;
  };
};

var bbox = function(topology) {
  var t = transform(topology.transform), key,
      x0 = Infinity, y0 = x0, x1 = -x0, y1 = -x0;

  function bboxPoint(p) {
    p = t(p);
    if (p[0] < x0) x0 = p[0];
    if (p[0] > x1) x1 = p[0];
    if (p[1] < y0) y0 = p[1];
    if (p[1] > y1) y1 = p[1];
  }

  function bboxGeometry(o) {
    switch (o.type) {
      case "GeometryCollection": o.geometries.forEach(bboxGeometry); break;
      case "Point": bboxPoint(o.coordinates); break;
      case "MultiPoint": o.coordinates.forEach(bboxPoint); break;
    }
  }

  topology.arcs.forEach(function(arc) {
    var i = -1, n = arc.length, p;
    while (++i < n) {
      p = t(arc[i], i);
      if (p[0] < x0) x0 = p[0];
      if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[1] > y1) y1 = p[1];
    }
  });

  for (key in topology.objects) {
    bboxGeometry(topology.objects[key]);
  }

  return [x0, y0, x1, y1];
};

var reverse = function(array, n) {
  var t, j = array.length, i = j - n;
  while (i < --j) t = array[i], array[i++] = array[j], array[j] = t;
};

var feature = function(topology, o) {
  return o.type === "GeometryCollection"
      ? {type: "FeatureCollection", features: o.geometries.map(function(o) { return feature$1(topology, o); })}
      : feature$1(topology, o);
};

function feature$1(topology, o) {
  var id = o.id,
      bbox = o.bbox,
      properties = o.properties == null ? {} : o.properties,
      geometry = object(topology, o);
  return id == null && bbox == null ? {type: "Feature", properties: properties, geometry: geometry}
      : bbox == null ? {type: "Feature", id: id, properties: properties, geometry: geometry}
      : {type: "Feature", id: id, bbox: bbox, properties: properties, geometry: geometry};
}

function object(topology, o) {
  var transformPoint = transform(topology.transform),
      arcs = topology.arcs;

  function arc(i, points) {
    if (points.length) points.pop();
    for (var a = arcs[i < 0 ? ~i : i], k = 0, n = a.length; k < n; ++k) {
      points.push(transformPoint(a[k], k));
    }
    if (i < 0) reverse(points, n);
  }

  function point(p) {
    return transformPoint(p);
  }

  function line(arcs) {
    var points = [];
    for (var i = 0, n = arcs.length; i < n; ++i) arc(arcs[i], points);
    if (points.length < 2) points.push(points[0]); // This should never happen per the specification.
    return points;
  }

  function ring(arcs) {
    var points = line(arcs);
    while (points.length < 4) points.push(points[0]); // This may happen if an arc has only two points.
    return points;
  }

  function polygon(arcs) {
    return arcs.map(ring);
  }

  function geometry(o) {
    var type = o.type, coordinates;
    switch (type) {
      case "GeometryCollection": return {type: type, geometries: o.geometries.map(geometry)};
      case "Point": coordinates = point(o.coordinates); break;
      case "MultiPoint": coordinates = o.coordinates.map(point); break;
      case "LineString": coordinates = line(o.arcs); break;
      case "MultiLineString": coordinates = o.arcs.map(line); break;
      case "Polygon": coordinates = polygon(o.arcs); break;
      case "MultiPolygon": coordinates = o.arcs.map(polygon); break;
      default: return null;
    }
    return {type: type, coordinates: coordinates};
  }

  return geometry(o);
}

var stitch = function(topology, arcs) {
  var stitchedArcs = {},
      fragmentByStart = {},
      fragmentByEnd = {},
      fragments = [],
      emptyIndex = -1;

  // Stitch empty arcs first, since they may be subsumed by other arcs.
  arcs.forEach(function(i, j) {
    var arc = topology.arcs[i < 0 ? ~i : i], t;
    if (arc.length < 3 && !arc[1][0] && !arc[1][1]) {
      t = arcs[++emptyIndex], arcs[emptyIndex] = i, arcs[j] = t;
    }
  });

  arcs.forEach(function(i) {
    var e = ends(i),
        start = e[0],
        end = e[1],
        f, g;

    if (f = fragmentByEnd[start]) {
      delete fragmentByEnd[f.end];
      f.push(i);
      f.end = end;
      if (g = fragmentByStart[end]) {
        delete fragmentByStart[g.start];
        var fg = g === f ? f : f.concat(g);
        fragmentByStart[fg.start = f.start] = fragmentByEnd[fg.end = g.end] = fg;
      } else {
        fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
      }
    } else if (f = fragmentByStart[end]) {
      delete fragmentByStart[f.start];
      f.unshift(i);
      f.start = start;
      if (g = fragmentByEnd[start]) {
        delete fragmentByEnd[g.end];
        var gf = g === f ? f : g.concat(f);
        fragmentByStart[gf.start = g.start] = fragmentByEnd[gf.end = f.end] = gf;
      } else {
        fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
      }
    } else {
      f = [i];
      fragmentByStart[f.start = start] = fragmentByEnd[f.end = end] = f;
    }
  });

  function ends(i) {
    var arc = topology.arcs[i < 0 ? ~i : i], p0 = arc[0], p1;
    if (topology.transform) p1 = [0, 0], arc.forEach(function(dp) { p1[0] += dp[0], p1[1] += dp[1]; });
    else p1 = arc[arc.length - 1];
    return i < 0 ? [p1, p0] : [p0, p1];
  }

  function flush(fragmentByEnd, fragmentByStart) {
    for (var k in fragmentByEnd) {
      var f = fragmentByEnd[k];
      delete fragmentByStart[f.start];
      delete f.start;
      delete f.end;
      f.forEach(function(i) { stitchedArcs[i < 0 ? ~i : i] = 1; });
      fragments.push(f);
    }
  }

  flush(fragmentByEnd, fragmentByStart);
  flush(fragmentByStart, fragmentByEnd);
  arcs.forEach(function(i) { if (!stitchedArcs[i < 0 ? ~i : i]) fragments.push([i]); });

  return fragments;
};

var mesh = function(topology) {
  return object(topology, meshArcs.apply(this, arguments));
};

function meshArcs(topology, object$$1, filter) {
  var arcs, i, n;
  if (arguments.length > 1) arcs = extractArcs(topology, object$$1, filter);
  else for (i = 0, arcs = new Array(n = topology.arcs.length); i < n; ++i) arcs[i] = i;
  return {type: "MultiLineString", arcs: stitch(topology, arcs)};
}

function extractArcs(topology, object$$1, filter) {
  var arcs = [],
      geomsByArc = [],
      geom;

  function extract0(i) {
    var j = i < 0 ? ~i : i;
    (geomsByArc[j] || (geomsByArc[j] = [])).push({i: i, g: geom});
  }

  function extract1(arcs) {
    arcs.forEach(extract0);
  }

  function extract2(arcs) {
    arcs.forEach(extract1);
  }

  function extract3(arcs) {
    arcs.forEach(extract2);
  }

  function geometry(o) {
    switch (geom = o, o.type) {
      case "GeometryCollection": o.geometries.forEach(geometry); break;
      case "LineString": extract1(o.arcs); break;
      case "MultiLineString": case "Polygon": extract2(o.arcs); break;
      case "MultiPolygon": extract3(o.arcs); break;
    }
  }

  geometry(object$$1);

  geomsByArc.forEach(filter == null
      ? function(geoms) { arcs.push(geoms[0].i); }
      : function(geoms) { if (filter(geoms[0].g, geoms[geoms.length - 1].g)) arcs.push(geoms[0].i); });

  return arcs;
}

function planarRingArea(ring) {
  var i = -1, n = ring.length, a, b = ring[n - 1], area = 0;
  while (++i < n) a = b, b = ring[i], area += a[0] * b[1] - a[1] * b[0];
  return Math.abs(area); // Note: doubled area!
}

var merge = function(topology) {
  return object(topology, mergeArcs.apply(this, arguments));
};

function mergeArcs(topology, objects) {
  var polygonsByArc = {},
      polygons = [],
      groups = [];

  objects.forEach(geometry);

  function geometry(o) {
    switch (o.type) {
      case "GeometryCollection": o.geometries.forEach(geometry); break;
      case "Polygon": extract(o.arcs); break;
      case "MultiPolygon": o.arcs.forEach(extract); break;
    }
  }

  function extract(polygon) {
    polygon.forEach(function(ring) {
      ring.forEach(function(arc) {
        (polygonsByArc[arc = arc < 0 ? ~arc : arc] || (polygonsByArc[arc] = [])).push(polygon);
      });
    });
    polygons.push(polygon);
  }

  function area(ring) {
    return planarRingArea(object(topology, {type: "Polygon", arcs: [ring]}).coordinates[0]);
  }

  polygons.forEach(function(polygon) {
    if (!polygon._) {
      var group = [],
          neighbors = [polygon];
      polygon._ = 1;
      groups.push(group);
      while (polygon = neighbors.pop()) {
        group.push(polygon);
        polygon.forEach(function(ring) {
          ring.forEach(function(arc) {
            polygonsByArc[arc < 0 ? ~arc : arc].forEach(function(polygon) {
              if (!polygon._) {
                polygon._ = 1;
                neighbors.push(polygon);
              }
            });
          });
        });
      }
    }
  });

  polygons.forEach(function(polygon) {
    delete polygon._;
  });

  return {
    type: "MultiPolygon",
    arcs: groups.map(function(polygons) {
      var arcs = [], n;

      // Extract the exterior (unique) arcs.
      polygons.forEach(function(polygon) {
        polygon.forEach(function(ring) {
          ring.forEach(function(arc) {
            if (polygonsByArc[arc < 0 ? ~arc : arc].length < 2) {
              arcs.push(arc);
            }
          });
        });
      });

      // Stitch the arcs into one or more rings.
      arcs = stitch(topology, arcs);

      // If more than one ring is returned,
      // at most one of these rings can be the exterior;
      // choose the one with the greatest absolute area.
      if ((n = arcs.length) > 1) {
        for (var i = 1, k = area(arcs[0]), ki, t; i < n; ++i) {
          if ((ki = area(arcs[i])) > k) {
            t = arcs[0], arcs[0] = arcs[i], arcs[i] = t, k = ki;
          }
        }
      }

      return arcs;
    })
  };
}

var bisect = function(a, x) {
  var lo = 0, hi = a.length;
  while (lo < hi) {
    var mid = lo + hi >>> 1;
    if (a[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

var neighbors = function(objects) {
  var indexesByArc = {}, // arc index -> array of object indexes
      neighbors = objects.map(function() { return []; });

  function line(arcs, i) {
    arcs.forEach(function(a) {
      if (a < 0) a = ~a;
      var o = indexesByArc[a];
      if (o) o.push(i);
      else indexesByArc[a] = [i];
    });
  }

  function polygon(arcs, i) {
    arcs.forEach(function(arc) { line(arc, i); });
  }

  function geometry(o, i) {
    if (o.type === "GeometryCollection") o.geometries.forEach(function(o) { geometry(o, i); });
    else if (o.type in geometryType) geometryType[o.type](o.arcs, i);
  }

  var geometryType = {
    LineString: line,
    MultiLineString: polygon,
    Polygon: polygon,
    MultiPolygon: function(arcs, i) { arcs.forEach(function(arc) { polygon(arc, i); }); }
  };

  objects.forEach(geometry);

  for (var i in indexesByArc) {
    for (var indexes = indexesByArc[i], m = indexes.length, j = 0; j < m; ++j) {
      for (var k = j + 1; k < m; ++k) {
        var ij = indexes[j], ik = indexes[k], n;
        if ((n = neighbors[ij])[i = bisect(n, ik)] !== ik) n.splice(i, 0, ik);
        if ((n = neighbors[ik])[i = bisect(n, ij)] !== ij) n.splice(i, 0, ij);
      }
    }
  }

  return neighbors;
};

var untransform = function(transform) {
  if (transform == null) return identity;
  var x0,
      y0,
      kx = transform.scale[0],
      ky = transform.scale[1],
      dx = transform.translate[0],
      dy = transform.translate[1];
  return function(input, i) {
    if (!i) x0 = y0 = 0;
    var j = 2,
        n = input.length,
        output = new Array(n),
        x1 = Math.round((input[0] - dx) / kx),
        y1 = Math.round((input[1] - dy) / ky);
    output[0] = x1 - x0, x0 = x1;
    output[1] = y1 - y0, y0 = y1;
    while (j < n) output[j] = input[j], ++j;
    return output;
  };
};

var quantize = function(topology, transform) {
  if (topology.transform) throw new Error("already quantized");

  if (!transform || !transform.scale) {
    if (!((n = Math.floor(transform)) >= 2)) throw new Error("n must be ≥2");
    box = topology.bbox || bbox(topology);
    var x0 = box[0], y0 = box[1], x1 = box[2], y1 = box[3], n;
    transform = {scale: [x1 - x0 ? (x1 - x0) / (n - 1) : 1, y1 - y0 ? (y1 - y0) / (n - 1) : 1], translate: [x0, y0]};
  } else {
    box = topology.bbox;
  }

  var t = untransform(transform), box, key, inputs = topology.objects, outputs = {};

  function quantizePoint(point) {
    return t(point);
  }

  function quantizeGeometry(input) {
    var output;
    switch (input.type) {
      case "GeometryCollection": output = {type: "GeometryCollection", geometries: input.geometries.map(quantizeGeometry)}; break;
      case "Point": output = {type: "Point", coordinates: quantizePoint(input.coordinates)}; break;
      case "MultiPoint": output = {type: "MultiPoint", coordinates: input.coordinates.map(quantizePoint)}; break;
      default: return input;
    }
    if (input.id != null) output.id = input.id;
    if (input.bbox != null) output.bbox = input.bbox;
    if (input.properties != null) output.properties = input.properties;
    return output;
  }

  function quantizeArc(input) {
    var i = 0, j = 1, n = input.length, p, output = new Array(n); // pessimistic
    output[0] = t(input[0], 0);
    while (++i < n) if ((p = t(input[i], i))[0] || p[1]) output[j++] = p; // non-coincident points
    if (j === 1) output[j++] = [0, 0]; // an arc must have at least two points
    output.length = j;
    return output;
  }

  for (key in inputs) outputs[key] = quantizeGeometry(inputs[key]);

  return {
    type: "Topology",
    bbox: box,
    transform: transform,
    objects: outputs,
    arcs: topology.arcs.map(quantizeArc)
  };
};

exports.bbox = bbox;
exports.feature = feature;
exports.mesh = mesh;
exports.meshArcs = meshArcs;
exports.merge = merge;
exports.mergeArcs = mergeArcs;
exports.neighbors = neighbors;
exports.quantize = quantize;
exports.transform = transform;
exports.untransform = untransform;

Object.defineProperty(exports, '__esModule', { value: true });

})));

},{}],7:[function(require,module,exports){
// https://github.com/topojson/topojson-server Version 3.0.0. Copyright 2017 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.topojson = global.topojson || {})));
}(this, (function (exports) { 'use strict';

// Computes the bounding box of the specified hash of GeoJSON objects.
var bounds = function(objects) {
  var x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;

  function boundGeometry(geometry) {
    if (geometry != null && boundGeometryType.hasOwnProperty(geometry.type)) boundGeometryType[geometry.type](geometry);
  }

  var boundGeometryType = {
    GeometryCollection: function(o) { o.geometries.forEach(boundGeometry); },
    Point: function(o) { boundPoint(o.coordinates); },
    MultiPoint: function(o) { o.coordinates.forEach(boundPoint); },
    LineString: function(o) { boundLine(o.arcs); },
    MultiLineString: function(o) { o.arcs.forEach(boundLine); },
    Polygon: function(o) { o.arcs.forEach(boundLine); },
    MultiPolygon: function(o) { o.arcs.forEach(boundMultiLine); }
  };

  function boundPoint(coordinates) {
    var x = coordinates[0],
        y = coordinates[1];
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }

  function boundLine(coordinates) {
    coordinates.forEach(boundPoint);
  }

  function boundMultiLine(coordinates) {
    coordinates.forEach(boundLine);
  }

  for (var key in objects) {
    boundGeometry(objects[key]);
  }

  return x1 >= x0 && y1 >= y0 ? [x0, y0, x1, y1] : undefined;
};

var hashset = function(size, hash, equal, type, empty) {
  if (arguments.length === 3) {
    type = Array;
    empty = null;
  }

  var store = new type(size = 1 << Math.max(4, Math.ceil(Math.log(size) / Math.LN2))),
      mask = size - 1;

  for (var i = 0; i < size; ++i) {
    store[i] = empty;
  }

  function add(value) {
    var index = hash(value) & mask,
        match = store[index],
        collisions = 0;
    while (match != empty) {
      if (equal(match, value)) return true;
      if (++collisions >= size) throw new Error("full hashset");
      match = store[index = (index + 1) & mask];
    }
    store[index] = value;
    return true;
  }

  function has(value) {
    var index = hash(value) & mask,
        match = store[index],
        collisions = 0;
    while (match != empty) {
      if (equal(match, value)) return true;
      if (++collisions >= size) break;
      match = store[index = (index + 1) & mask];
    }
    return false;
  }

  function values() {
    var values = [];
    for (var i = 0, n = store.length; i < n; ++i) {
      var match = store[i];
      if (match != empty) values.push(match);
    }
    return values;
  }

  return {
    add: add,
    has: has,
    values: values
  };
};

var hashmap = function(size, hash, equal, keyType, keyEmpty, valueType) {
  if (arguments.length === 3) {
    keyType = valueType = Array;
    keyEmpty = null;
  }

  var keystore = new keyType(size = 1 << Math.max(4, Math.ceil(Math.log(size) / Math.LN2))),
      valstore = new valueType(size),
      mask = size - 1;

  for (var i = 0; i < size; ++i) {
    keystore[i] = keyEmpty;
  }

  function set(key, value) {
    var index = hash(key) & mask,
        matchKey = keystore[index],
        collisions = 0;
    while (matchKey != keyEmpty) {
      if (equal(matchKey, key)) return valstore[index] = value;
      if (++collisions >= size) throw new Error("full hashmap");
      matchKey = keystore[index = (index + 1) & mask];
    }
    keystore[index] = key;
    valstore[index] = value;
    return value;
  }

  function maybeSet(key, value) {
    var index = hash(key) & mask,
        matchKey = keystore[index],
        collisions = 0;
    while (matchKey != keyEmpty) {
      if (equal(matchKey, key)) return valstore[index];
      if (++collisions >= size) throw new Error("full hashmap");
      matchKey = keystore[index = (index + 1) & mask];
    }
    keystore[index] = key;
    valstore[index] = value;
    return value;
  }

  function get(key, missingValue) {
    var index = hash(key) & mask,
        matchKey = keystore[index],
        collisions = 0;
    while (matchKey != keyEmpty) {
      if (equal(matchKey, key)) return valstore[index];
      if (++collisions >= size) break;
      matchKey = keystore[index = (index + 1) & mask];
    }
    return missingValue;
  }

  function keys() {
    var keys = [];
    for (var i = 0, n = keystore.length; i < n; ++i) {
      var matchKey = keystore[i];
      if (matchKey != keyEmpty) keys.push(matchKey);
    }
    return keys;
  }

  return {
    set: set,
    maybeSet: maybeSet, // set if unset
    get: get,
    keys: keys
  };
};

var equalPoint = function(pointA, pointB) {
  return pointA[0] === pointB[0] && pointA[1] === pointB[1];
};

// TODO if quantized, use simpler Int32 hashing?

var buffer = new ArrayBuffer(16);
var floats = new Float64Array(buffer);
var uints = new Uint32Array(buffer);

var hashPoint = function(point) {
  floats[0] = point[0];
  floats[1] = point[1];
  var hash = uints[0] ^ uints[1];
  hash = hash << 5 ^ hash >> 7 ^ uints[2] ^ uints[3];
  return hash & 0x7fffffff;
};

// Given an extracted (pre-)topology, identifies all of the junctions. These are
// the points at which arcs (lines or rings) will need to be cut so that each
// arc is represented uniquely.
//
// A junction is a point where at least one arc deviates from another arc going
// through the same point. For example, consider the point B. If there is a arc
// through ABC and another arc through CBA, then B is not a junction because in
// both cases the adjacent point pairs are {A,C}. However, if there is an
// additional arc ABD, then {A,D} != {A,C}, and thus B becomes a junction.
//
// For a closed ring ABCA, the first point A’s adjacent points are the second
// and last point {B,C}. For a line, the first and last point are always
// considered junctions, even if the line is closed; this ensures that a closed
// line is never rotated.
var join = function(topology) {
  var coordinates = topology.coordinates,
      lines = topology.lines,
      rings = topology.rings,
      indexes = index(),
      visitedByIndex = new Int32Array(coordinates.length),
      leftByIndex = new Int32Array(coordinates.length),
      rightByIndex = new Int32Array(coordinates.length),
      junctionByIndex = new Int8Array(coordinates.length),
      junctionCount = 0, // upper bound on number of junctions
      i, n,
      previousIndex,
      currentIndex,
      nextIndex;

  for (i = 0, n = coordinates.length; i < n; ++i) {
    visitedByIndex[i] = leftByIndex[i] = rightByIndex[i] = -1;
  }

  for (i = 0, n = lines.length; i < n; ++i) {
    var line = lines[i],
        lineStart = line[0],
        lineEnd = line[1];
    currentIndex = indexes[lineStart];
    nextIndex = indexes[++lineStart];
    ++junctionCount, junctionByIndex[currentIndex] = 1; // start
    while (++lineStart <= lineEnd) {
      sequence(i, previousIndex = currentIndex, currentIndex = nextIndex, nextIndex = indexes[lineStart]);
    }
    ++junctionCount, junctionByIndex[nextIndex] = 1; // end
  }

  for (i = 0, n = coordinates.length; i < n; ++i) {
    visitedByIndex[i] = -1;
  }

  for (i = 0, n = rings.length; i < n; ++i) {
    var ring = rings[i],
        ringStart = ring[0] + 1,
        ringEnd = ring[1];
    previousIndex = indexes[ringEnd - 1];
    currentIndex = indexes[ringStart - 1];
    nextIndex = indexes[ringStart];
    sequence(i, previousIndex, currentIndex, nextIndex);
    while (++ringStart <= ringEnd) {
      sequence(i, previousIndex = currentIndex, currentIndex = nextIndex, nextIndex = indexes[ringStart]);
    }
  }

  function sequence(i, previousIndex, currentIndex, nextIndex) {
    if (visitedByIndex[currentIndex] === i) return; // ignore self-intersection
    visitedByIndex[currentIndex] = i;
    var leftIndex = leftByIndex[currentIndex];
    if (leftIndex >= 0) {
      var rightIndex = rightByIndex[currentIndex];
      if ((leftIndex !== previousIndex || rightIndex !== nextIndex)
        && (leftIndex !== nextIndex || rightIndex !== previousIndex)) {
        ++junctionCount, junctionByIndex[currentIndex] = 1;
      }
    } else {
      leftByIndex[currentIndex] = previousIndex;
      rightByIndex[currentIndex] = nextIndex;
    }
  }

  function index() {
    var indexByPoint = hashmap(coordinates.length * 1.4, hashIndex, equalIndex, Int32Array, -1, Int32Array),
        indexes = new Int32Array(coordinates.length);

    for (var i = 0, n = coordinates.length; i < n; ++i) {
      indexes[i] = indexByPoint.maybeSet(i, i);
    }

    return indexes;
  }

  function hashIndex(i) {
    return hashPoint(coordinates[i]);
  }

  function equalIndex(i, j) {
    return equalPoint(coordinates[i], coordinates[j]);
  }

  visitedByIndex = leftByIndex = rightByIndex = null;

  var junctionByPoint = hashset(junctionCount * 1.4, hashPoint, equalPoint), j;

  // Convert back to a standard hashset by point for caller convenience.
  for (i = 0, n = coordinates.length; i < n; ++i) {
    if (junctionByIndex[j = indexes[i]]) {
      junctionByPoint.add(coordinates[j]);
    }
  }

  return junctionByPoint;
};

// Given an extracted (pre-)topology, cuts (or rotates) arcs so that all shared
// point sequences are identified. The topology can then be subsequently deduped
// to remove exact duplicate arcs.
var cut = function(topology) {
  var junctions = join(topology),
      coordinates = topology.coordinates,
      lines = topology.lines,
      rings = topology.rings,
      next,
      i, n;

  for (i = 0, n = lines.length; i < n; ++i) {
    var line = lines[i],
        lineMid = line[0],
        lineEnd = line[1];
    while (++lineMid < lineEnd) {
      if (junctions.has(coordinates[lineMid])) {
        next = {0: lineMid, 1: line[1]};
        line[1] = lineMid;
        line = line.next = next;
      }
    }
  }

  for (i = 0, n = rings.length; i < n; ++i) {
    var ring = rings[i],
        ringStart = ring[0],
        ringMid = ringStart,
        ringEnd = ring[1],
        ringFixed = junctions.has(coordinates[ringStart]);
    while (++ringMid < ringEnd) {
      if (junctions.has(coordinates[ringMid])) {
        if (ringFixed) {
          next = {0: ringMid, 1: ring[1]};
          ring[1] = ringMid;
          ring = ring.next = next;
        } else { // For the first junction, we can rotate rather than cut.
          rotateArray(coordinates, ringStart, ringEnd, ringEnd - ringMid);
          coordinates[ringEnd] = coordinates[ringStart];
          ringFixed = true;
          ringMid = ringStart; // restart; we may have skipped junctions
        }
      }
    }
  }

  return topology;
};

function rotateArray(array, start, end, offset) {
  reverse(array, start, end);
  reverse(array, start, start + offset);
  reverse(array, start + offset, end);
}

function reverse(array, start, end) {
  for (var mid = start + ((end-- - start) >> 1), t; start < mid; ++start, --end) {
    t = array[start], array[start] = array[end], array[end] = t;
  }
}

// Given a cut topology, combines duplicate arcs.
var dedup = function(topology) {
  var coordinates = topology.coordinates,
      lines = topology.lines, line,
      rings = topology.rings, ring,
      arcCount = lines.length + rings.length,
      i, n;

  delete topology.lines;
  delete topology.rings;

  // Count the number of (non-unique) arcs to initialize the hashmap safely.
  for (i = 0, n = lines.length; i < n; ++i) {
    line = lines[i]; while (line = line.next) ++arcCount;
  }
  for (i = 0, n = rings.length; i < n; ++i) {
    ring = rings[i]; while (ring = ring.next) ++arcCount;
  }

  var arcsByEnd = hashmap(arcCount * 2 * 1.4, hashPoint, equalPoint),
      arcs = topology.arcs = [];

  for (i = 0, n = lines.length; i < n; ++i) {
    line = lines[i];
    do {
      dedupLine(line);
    } while (line = line.next);
  }

  for (i = 0, n = rings.length; i < n; ++i) {
    ring = rings[i];
    if (ring.next) { // arc is no longer closed
      do {
        dedupLine(ring);
      } while (ring = ring.next);
    } else {
      dedupRing(ring);
    }
  }

  function dedupLine(arc) {
    var startPoint,
        endPoint,
        startArcs, startArc,
        endArcs, endArc,
        i, n;

    // Does this arc match an existing arc in order?
    if (startArcs = arcsByEnd.get(startPoint = coordinates[arc[0]])) {
      for (i = 0, n = startArcs.length; i < n; ++i) {
        startArc = startArcs[i];
        if (equalLine(startArc, arc)) {
          arc[0] = startArc[0];
          arc[1] = startArc[1];
          return;
        }
      }
    }

    // Does this arc match an existing arc in reverse order?
    if (endArcs = arcsByEnd.get(endPoint = coordinates[arc[1]])) {
      for (i = 0, n = endArcs.length; i < n; ++i) {
        endArc = endArcs[i];
        if (reverseEqualLine(endArc, arc)) {
          arc[1] = endArc[0];
          arc[0] = endArc[1];
          return;
        }
      }
    }

    if (startArcs) startArcs.push(arc); else arcsByEnd.set(startPoint, [arc]);
    if (endArcs) endArcs.push(arc); else arcsByEnd.set(endPoint, [arc]);
    arcs.push(arc);
  }

  function dedupRing(arc) {
    var endPoint,
        endArcs,
        endArc,
        i, n;

    // Does this arc match an existing line in order, or reverse order?
    // Rings are closed, so their start point and end point is the same.
    if (endArcs = arcsByEnd.get(endPoint = coordinates[arc[0]])) {
      for (i = 0, n = endArcs.length; i < n; ++i) {
        endArc = endArcs[i];
        if (equalRing(endArc, arc)) {
          arc[0] = endArc[0];
          arc[1] = endArc[1];
          return;
        }
        if (reverseEqualRing(endArc, arc)) {
          arc[0] = endArc[1];
          arc[1] = endArc[0];
          return;
        }
      }
    }

    // Otherwise, does this arc match an existing ring in order, or reverse order?
    if (endArcs = arcsByEnd.get(endPoint = coordinates[arc[0] + findMinimumOffset(arc)])) {
      for (i = 0, n = endArcs.length; i < n; ++i) {
        endArc = endArcs[i];
        if (equalRing(endArc, arc)) {
          arc[0] = endArc[0];
          arc[1] = endArc[1];
          return;
        }
        if (reverseEqualRing(endArc, arc)) {
          arc[0] = endArc[1];
          arc[1] = endArc[0];
          return;
        }
      }
    }

    if (endArcs) endArcs.push(arc); else arcsByEnd.set(endPoint, [arc]);
    arcs.push(arc);
  }

  function equalLine(arcA, arcB) {
    var ia = arcA[0], ib = arcB[0],
        ja = arcA[1], jb = arcB[1];
    if (ia - ja !== ib - jb) return false;
    for (; ia <= ja; ++ia, ++ib) if (!equalPoint(coordinates[ia], coordinates[ib])) return false;
    return true;
  }

  function reverseEqualLine(arcA, arcB) {
    var ia = arcA[0], ib = arcB[0],
        ja = arcA[1], jb = arcB[1];
    if (ia - ja !== ib - jb) return false;
    for (; ia <= ja; ++ia, --jb) if (!equalPoint(coordinates[ia], coordinates[jb])) return false;
    return true;
  }

  function equalRing(arcA, arcB) {
    var ia = arcA[0], ib = arcB[0],
        ja = arcA[1], jb = arcB[1],
        n = ja - ia;
    if (n !== jb - ib) return false;
    var ka = findMinimumOffset(arcA),
        kb = findMinimumOffset(arcB);
    for (var i = 0; i < n; ++i) {
      if (!equalPoint(coordinates[ia + (i + ka) % n], coordinates[ib + (i + kb) % n])) return false;
    }
    return true;
  }

  function reverseEqualRing(arcA, arcB) {
    var ia = arcA[0], ib = arcB[0],
        ja = arcA[1], jb = arcB[1],
        n = ja - ia;
    if (n !== jb - ib) return false;
    var ka = findMinimumOffset(arcA),
        kb = n - findMinimumOffset(arcB);
    for (var i = 0; i < n; ++i) {
      if (!equalPoint(coordinates[ia + (i + ka) % n], coordinates[jb - (i + kb) % n])) return false;
    }
    return true;
  }

  // Rings are rotated to a consistent, but arbitrary, start point.
  // This is necessary to detect when a ring and a rotated copy are dupes.
  function findMinimumOffset(arc) {
    var start = arc[0],
        end = arc[1],
        mid = start,
        minimum = mid,
        minimumPoint = coordinates[mid];
    while (++mid < end) {
      var point = coordinates[mid];
      if (point[0] < minimumPoint[0] || point[0] === minimumPoint[0] && point[1] < minimumPoint[1]) {
        minimum = mid;
        minimumPoint = point;
      }
    }
    return minimum - start;
  }

  return topology;
};

// Given an array of arcs in absolute (but already quantized!) coordinates,
// converts to fixed-point delta encoding.
// This is a destructive operation that modifies the given arcs!
var delta = function(arcs) {
  var i = -1,
      n = arcs.length;

  while (++i < n) {
    var arc = arcs[i],
        j = 0,
        k = 1,
        m = arc.length,
        point = arc[0],
        x0 = point[0],
        y0 = point[1],
        x1,
        y1;

    while (++j < m) {
      point = arc[j], x1 = point[0], y1 = point[1];
      if (x1 !== x0 || y1 !== y0) arc[k++] = [x1 - x0, y1 - y0], x0 = x1, y0 = y1;
    }

    if (k === 1) arc[k++] = [0, 0]; // Each arc must be an array of two or more positions.

    arc.length = k;
  }

  return arcs;
};

// Extracts the lines and rings from the specified hash of geometry objects.
//
// Returns an object with three properties:
//
// * coordinates - shared buffer of [x, y] coordinates
// * lines - lines extracted from the hash, of the form [start, end]
// * rings - rings extracted from the hash, of the form [start, end]
//
// For each ring or line, start and end represent inclusive indexes into the
// coordinates buffer. For rings (and closed lines), coordinates[start] equals
// coordinates[end].
//
// For each line or polygon geometry in the input hash, including nested
// geometries as in geometry collections, the `coordinates` array is replaced
// with an equivalent `arcs` array that, for each line (for line string
// geometries) or ring (for polygon geometries), points to one of the above
// lines or rings.
var extract = function(objects) {
  var index = -1,
      lines = [],
      rings = [],
      coordinates = [];

  function extractGeometry(geometry) {
    if (geometry && extractGeometryType.hasOwnProperty(geometry.type)) extractGeometryType[geometry.type](geometry);
  }

  var extractGeometryType = {
    GeometryCollection: function(o) { o.geometries.forEach(extractGeometry); },
    LineString: function(o) { o.arcs = extractLine(o.arcs); },
    MultiLineString: function(o) { o.arcs = o.arcs.map(extractLine); },
    Polygon: function(o) { o.arcs = o.arcs.map(extractRing); },
    MultiPolygon: function(o) { o.arcs = o.arcs.map(extractMultiRing); }
  };

  function extractLine(line) {
    for (var i = 0, n = line.length; i < n; ++i) coordinates[++index] = line[i];
    var arc = {0: index - n + 1, 1: index};
    lines.push(arc);
    return arc;
  }

  function extractRing(ring) {
    for (var i = 0, n = ring.length; i < n; ++i) coordinates[++index] = ring[i];
    var arc = {0: index - n + 1, 1: index};
    rings.push(arc);
    return arc;
  }

  function extractMultiRing(rings) {
    return rings.map(extractRing);
  }

  for (var key in objects) {
    extractGeometry(objects[key]);
  }

  return {
    type: "Topology",
    coordinates: coordinates,
    lines: lines,
    rings: rings,
    objects: objects
  };
};

// Given a hash of GeoJSON objects, returns a hash of GeoJSON geometry objects.
// Any null input geometry objects are represented as {type: null} in the output.
// Any feature.{id,properties,bbox} are transferred to the output geometry object.
// Each output geometry object is a shallow copy of the input (e.g., properties, coordinates)!
var geometry = function(inputs) {
  var outputs = {}, key;
  for (key in inputs) outputs[key] = geomifyObject(inputs[key]);
  return outputs;
};

function geomifyObject(input) {
  return input == null ? {type: null}
      : (input.type === "FeatureCollection" ? geomifyFeatureCollection
      : input.type === "Feature" ? geomifyFeature
      : geomifyGeometry)(input);
}

function geomifyFeatureCollection(input) {
  var output = {type: "GeometryCollection", geometries: input.features.map(geomifyFeature)};
  if (input.bbox != null) output.bbox = input.bbox;
  return output;
}

function geomifyFeature(input) {
  var output = geomifyGeometry(input.geometry), key; // eslint-disable-line no-unused-vars
  if (input.id != null) output.id = input.id;
  if (input.bbox != null) output.bbox = input.bbox;
  for (key in input.properties) { output.properties = input.properties; break; }
  return output;
}

function geomifyGeometry(input) {
  if (input == null) return {type: null};
  var output = input.type === "GeometryCollection" ? {type: "GeometryCollection", geometries: input.geometries.map(geomifyGeometry)}
      : input.type === "Point" || input.type === "MultiPoint" ? {type: input.type, coordinates: input.coordinates}
      : {type: input.type, arcs: input.coordinates}; // TODO Check for unknown types?
  if (input.bbox != null) output.bbox = input.bbox;
  return output;
}

var prequantize = function(objects, bbox, n) {
  var x0 = bbox[0],
      y0 = bbox[1],
      x1 = bbox[2],
      y1 = bbox[3],
      kx = x1 - x0 ? (n - 1) / (x1 - x0) : 1,
      ky = y1 - y0 ? (n - 1) / (y1 - y0) : 1;

  function quantizePoint(input) {
    return [Math.round((input[0] - x0) * kx), Math.round((input[1] - y0) * ky)];
  }

  function quantizePoints(input, m) {
    var i = -1,
        j = 0,
        n = input.length,
        output = new Array(n), // pessimistic
        pi,
        px,
        py,
        x,
        y;

    while (++i < n) {
      pi = input[i];
      x = Math.round((pi[0] - x0) * kx);
      y = Math.round((pi[1] - y0) * ky);
      if (x !== px || y !== py) output[j++] = [px = x, py = y]; // non-coincident points
    }

    output.length = j;
    while (j < m) j = output.push([output[0][0], output[0][1]]);
    return output;
  }

  function quantizeLine(input) {
    return quantizePoints(input, 2);
  }

  function quantizeRing(input) {
    return quantizePoints(input, 4);
  }

  function quantizePolygon(input) {
    return input.map(quantizeRing);
  }

  function quantizeGeometry(o) {
    if (o != null && quantizeGeometryType.hasOwnProperty(o.type)) quantizeGeometryType[o.type](o);
  }

  var quantizeGeometryType = {
    GeometryCollection: function(o) { o.geometries.forEach(quantizeGeometry); },
    Point: function(o) { o.coordinates = quantizePoint(o.coordinates); },
    MultiPoint: function(o) { o.coordinates = o.coordinates.map(quantizePoint); },
    LineString: function(o) { o.arcs = quantizeLine(o.arcs); },
    MultiLineString: function(o) { o.arcs = o.arcs.map(quantizeLine); },
    Polygon: function(o) { o.arcs = quantizePolygon(o.arcs); },
    MultiPolygon: function(o) { o.arcs = o.arcs.map(quantizePolygon); }
  };

  for (var key in objects) {
    quantizeGeometry(objects[key]);
  }

  return {
    scale: [1 / kx, 1 / ky],
    translate: [x0, y0]
  };
};

// Constructs the TopoJSON Topology for the specified hash of features.
// Each object in the specified hash must be a GeoJSON object,
// meaning FeatureCollection, a Feature or a geometry object.
var topology = function(objects, quantization) {
  var bbox = bounds(objects = geometry(objects)),
      transform = quantization > 0 && bbox && prequantize(objects, bbox, quantization),
      topology = dedup(cut(extract(objects))),
      coordinates = topology.coordinates,
      indexByArc = hashmap(topology.arcs.length * 1.4, hashArc, equalArc);

  objects = topology.objects; // for garbage collection
  topology.bbox = bbox;
  topology.arcs = topology.arcs.map(function(arc, i) {
    indexByArc.set(arc, i);
    return coordinates.slice(arc[0], arc[1] + 1);
  });

  delete topology.coordinates;
  coordinates = null;

  function indexGeometry(geometry$$1) {
    if (geometry$$1 && indexGeometryType.hasOwnProperty(geometry$$1.type)) indexGeometryType[geometry$$1.type](geometry$$1);
  }

  var indexGeometryType = {
    GeometryCollection: function(o) { o.geometries.forEach(indexGeometry); },
    LineString: function(o) { o.arcs = indexArcs(o.arcs); },
    MultiLineString: function(o) { o.arcs = o.arcs.map(indexArcs); },
    Polygon: function(o) { o.arcs = o.arcs.map(indexArcs); },
    MultiPolygon: function(o) { o.arcs = o.arcs.map(indexMultiArcs); }
  };

  function indexArcs(arc) {
    var indexes = [];
    do {
      var index = indexByArc.get(arc);
      indexes.push(arc[0] < arc[1] ? index : ~index);
    } while (arc = arc.next);
    return indexes;
  }

  function indexMultiArcs(arcs) {
    return arcs.map(indexArcs);
  }

  for (var key in objects) {
    indexGeometry(objects[key]);
  }

  if (transform) {
    topology.transform = transform;
    topology.arcs = delta(topology.arcs);
  }

  return topology;
};

function hashArc(arc) {
  var i = arc[0], j = arc[1], t;
  if (j < i) t = i, i = j, j = t;
  return i + 31 * j;
}

function equalArc(arcA, arcB) {
  var ia = arcA[0], ja = arcA[1],
      ib = arcB[0], jb = arcB[1], t;
  if (ja < ia) t = ia, ia = ja, ja = t;
  if (jb < ib) t = ib, ib = jb, jb = t;
  return ia === ib && ja === jb;
}

exports.topology = topology;

Object.defineProperty(exports, '__esModule', { value: true });

})));

},{}],8:[function(require,module,exports){
/** -------------------------------------------------------------------------
 * DEPENDENCIES
 */
var dissolve = require('geojson-dissolve');

/** -------------------------------------------------------------------------
 * GIS, geoprocessing, and services config
 */

$('#msg-tracing').hide();
$('#msg-error').hide();

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
			console.log('trwwStructures', trwwStructures);
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
			console.log('trwwPipes', trwwPipes);
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
			console.log('traceService', traceService);
			atlas.rsi_networktrace.service = traceService;
		}
	},
	proxy: {
		url: 'https://mds.3riverswetweather.org/atlas/proxy/proxy.ashx'
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
				
				console.log("atlas",atlas);
				
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
 * generate the token and add it to the objects
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
 * (only parts of this are used; it will be cleaned up)
 */
var messageControl = {
	element: function() {
		return $('#messageControl');
	},
	messages: {
		loading: {
			id: 'msg-loading',
			text: '<span id="msg-loading"><i class="fa fa-cog fa-spin fa-3x fa-fw"></i><span class="sr-only">Loading...</span></span>',
			setMsg: $('#messageControl').html(this.text),
		},
		instructions: {
			id: 'msg-instructions',
			text: '<h3>Enter an address <i class="fa fa-map-marker"></i><h3>',
			setMsg: $('#messageControl').html(this.text),
		},
		tracing: {
			id: 'msg-tracing',
			text: '<div id="msg-tracing">Flushing...<i class="fa fa-cog fa-spin fa-3x fa-fw"></i><span class="sr-only">Tracing...</span></div>',
			setMsg: $('#' + this.id).html(this.text),
		},
		results: {
			traceLength: {
				id: "traceLength",
				text: '<h3>Distance to Plant:<br><span id="traceLength"></span> feet</h3>'
			},
			inchMiles: {
				id: "inchMiles",
				text: '<h3>Inch-Miles (a proxy for capacity):<br><span id="inchMiles"></span></h3>'
			},
			munihoods: {
				id: "munihoods",
				text: '<h3>Municipalities & Pittsburgh Neighborhoods Passed Through:</h3><ul id="munihoods"></ul>'
			}
		},
		reset: {
			id: 'resetButton',
			text: '<button id="resetButton" type="button" class="btn btn-default btn-lg btn-block">Start Over <i class="fa fa-rotate-left"></i></button>',
			setMsg: $('#' + this.id).html(this.text)
		},
		error: {

		}
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
			id: '#' + this.messages.reset.id,
			classes: 'after-trace',
			position: 'bottomright',
			content: this.messages.reset.text,
			style: {
				width: '250px',
			}
		}).addTo(leafletMap);

		// then set it its initial visibility and content state
		this.reset();
	},
	onTraceStart: function() {
		$('#addressSearch').fadeOut();
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


// layer styles

var traceSourceStyle = {
	fillColor: "#FFF",
	fillOpacity: 0.8,
	radius: 5,
	stroke: true,
	color: "#00FFFF",
	weight: 5,
	opacity: 0.5
};
var addressStyle = {
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
	weight: 12,
	opacity: 0.75
};

// base map layer

var basemap = L.tileLayer(//"https://api.mapbox.com/styles/v1/cbgthor624/cipq73zea0010brnl8jlui4dz/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY2JndGhvcjYyNCIsImEiOiJzZ2NaNmo4In0.hbXzZPAvaCO5GLu45bptTw", {
"https://api.mapbox.com/styles/v1/cbgthor624/cj7m885wh91zm2rn3j6g8et8q/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY2JndGhvcjYyNCIsImEiOiJjajdtOGk0ZDIydThuMnducDNwZmU5NGJkIn0.ZISQHLPj0Yt1AudOgApIww", {
	maxZoom: 20,
	zIndex: 1,
	attribution: 'Basemap &copy; <a href="https://www.mapbox.com/about/maps/" target="_blank">Mapbox</a><span> and &copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a></span>'
});
var labels = L.tileLayer(
"https://api.mapbox.com/styles/v1/cbgthor624/cj7m84goh91lq2sofjiqfbby7/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY2JndGhvcjYyNCIsImEiOiJjajdtOGk0ZDIydThuMnducDNwZmU5NGJkIn0.ZISQHLPj0Yt1AudOgApIww", {
	pane: 'labels',
	maxZoom: 20,
	zIndex: 1,
	opacity: 0.75,
	attribution: 'Basemap Labels &copy; <a href="https://www.mapbox.com/about/maps/" target="_blank">Mapbox</a><span> and &copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a></span>'
});	

// reference layers

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

// geocoded address point
var addressPoint = L.geoJSON(null, {
    pointToLayer: function(geoJsonPoint, latlng) {
        return L.circleMarker(latlng, addressStyle);
    },
    onEachFeature: function(feature, layer) {
        //layer.bindPopup("<h4>" + feature.properties.name + "</h4><p>" + feature.geometry.coordinates[0] + ", " + feature.geometry.coordinates[1] + '</p><p><button id="networkTrace" type="button" class="btn btn-default btn-lg btn-block">Flush! <i class="fa fa-caret-square-o-down"></i></button>').openPopup();
        layer.bindPopup("<h4>" + feature.properties.name + "</h4><p>" + feature.geometry.coordinates[0] + ", " + feature.geometry.coordinates[1] + '</p>').openPopup();
    }
});
// point on structure at start of trace
var trwwTraceSource = L.geoJSON(null, {
    pointToLayer: function(geoJsonPoint, latlng) {
        return L.circleMarker(latlng, traceSourceStyle);
    }
});
var trwwTraceDestin = L.marker([40.474609776126599,-80.044474186387205], {
    icon: L.icon({
        iconUrl: 'static/resources/marker-alcosan-50px.png',
        iconSize: [50, 50],
    }),
}).bindPopup("<h4>ALCOSAN Plant</h4>");
// downstream trace result
var trwwTraceResult = L.geoJSON(null, traceResultStyle);
// downstream trace result (points)
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

// make the map
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

L.control.custom({
    id: 'titleBlock',
	position: 'topleft',
	style: { width: '100%'},
    content: '<h1 id="title">Flush the Toilet!<br><span id="subtitle">See where your wastewater goes when you flush!</span></h1>'
}).addTo(map);

L.control.custom({
	id: 'credits',
	position: 'topright',
	content: '<p class="small"style="color:#fff;">A project by:</p><img class="credit-logos" src="static/resources/logo_alcosan.png"/><br><br><img class="credit-logos" src="static/resources/logo_3rww.png"/><br><br><img class="credit-logos" src="static/resources/logo_civicmapper.png"/>',
	style: {
		width: '220px',
	}
}).addTo(map);

L.control.custom({
    id: 'aboutButtonControl',
		position: 'topright',
    content: '<button id="aboutButton" class="btn btn-default" type="submit"><i class="fa fa-info"></i></button>',
		events : {
			click : function() {
				messageControl.onAboutModalOpen();
			}
		}
}).addTo(map);

L.control.zoom({position: 'bottomleft'}).addTo(map);
L.control.attribution({prefix: "Built by <a href='http://www.civicmapper.com'>CivicMapper</a>"})
    .addAttribution("Powered by <a href='http://leafletjs.com'>Leaflet</a> w/ <a href='http://esri.github.io/esri-leaflet/'>Esri-Leaflet</a>, Geocoding via <a href='https://mapzen.com/'>Mapzen</a>")
    .addTo(map);



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
	var targetPoint = turf.point([latlng.lng, latlng.lat]);
	var buffer = turf.buffer(targetPoint, searchDistance, 'feet');
	//ajax request function
	//trwwStructures
	atlas.rsi_featurelayer.layer.query().layer(4).fields([]).intersects(buffer)
		//.nearby(latlng, searchDistance) // only works with feature layers
		.run(function(error, featureCollection, response) {
			if (error) {
				console.log(error);
				messageControl.onError('<i class="fa fa-frown-o"></i> There was an error when searching for the nearest structure (' + error.message + ')');
			} else {
				if (featureCollection.features.length > 0) {
					console.log("trwwStructures.query():", response);
					//returns[searchDistance] = featureCollection;
					var nearest = turf.nearest(targetPoint, featureCollection);
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
	var exploded = turf.explode(featureCollection);
	var tagged = turf.tag(exploded, summaryGeography, 'LABEL', 'places');
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
$(document).on("click", '#' + messageControl.messages.reset.id, function() {
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


$(document).on("ready", function() {
	// clear the address search box, since on page refresh the text might be retained
	$('#searchbox').val('');
	// hide the loading screen (revealing the map)
	$("#loadingScreen").fadeOut();
	// show the message control
	$('#messageControl').fadeIn();

	console.log("Ready to get flushing.");
});


},{"geojson-dissolve":3}]},{},[1]);
