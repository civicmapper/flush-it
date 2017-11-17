# Flush-It

# Development

To get the development environment working, two commands in two separate consoles:

* `python run.py` - runs the Python-Flask development web server. See the site at `http://127.0.0.1:5000/`
* `watchify main.js -o project/static/js/bundle.js` - watches for changes and runs Browserify to create the javascript build.

# Deployment

## Javascript bundling

Use `uglify` with `browserify` to compress the client-side application logic.

install `uglify` with `npm install -g uglify-js`

Then run `browserify main.js | uglifyjs > project/static/js/bundle.js`.

## Python-Flask re-configuration

The `*_CLIENT_TYPE` parameters for ArcGIS Server token generation must be changed
from `requestip` to `referrer` in production.