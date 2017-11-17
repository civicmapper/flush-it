module.exports = {
   dissolve: require('geojson-dissolve'),
   buffer : require('@turf/buffer'),
   nearestPoint : require("@turf/nearest-point"),
   explode : require("@turf/explode"),
   tag : require("@turf/tag"),
   turfHelpers : require("@turf/helpers"),
   script: require('./project/static/js/script.js'),
};