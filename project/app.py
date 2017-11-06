#----------------------------------------------------------------------------#
# APP CONFIGURATION
#----------------------------------------------------------------------------#

# standard library imports

import os
import logging
from logging import Formatter, FileHandler
import requests
import json

# dependencies
from flask import Flask, render_template, request, make_response, session, jsonify
#import pdb

# config
app = Flask(__name__)
app.config.from_pyfile('config.py')

#----------------------------------------------------------------------------#
# Helper Functions & Wrappers
#----------------------------------------------------------------------------#

def get_ags_token(url,username,password,client,referer,session,token_name):
    """Requests and ArcGIS Server Token 
    session: pass flask session object in
    token_name: string, used to store token in session
    other params are ArcGIS Server params
    """
    #if token_name not in session:
    params = {
        'username': username,
        'password': password, 
        'client': client,
        'referer': referer,
        'expiration': 720,
        'f': 'json',
    }
    response = requests.post(
        url ,
        # app.config['ROK_AUTH_URL'],
        data=params
    )
    token = response.json()
    session[token_name] = token
    print("{0} token acquired: {1}".format(token_name, token))
    return token
    # else:
    #     print("Using existing {0} token: {1}".format(token_name, session[token_name]))
    #     return session[token_name]
    

def get_agol_token():
    """requests and returns an ArcGIS Token for the pre-registered application.
    Client id and secrets are managed through the ArcGIS Developer's console.
    """
    params = {
        'client_id': app.config['ESRI_APP_CLIENT_ID'],
        'client_secret': app.config['ESRI_APP_CLIENT_SECRET'],
        'grant_type': "client_credentials"
    }
    request = requests.get(
        'https://www.arcgis.com/sharing/oauth2/token',
        params=params
    )
    token = request.json()
    print("AGOL token acquired: {0}".format(token))
    return token

#----------------------------------------------------------------------------#
# Controllers / Route Handlers
#----------------------------------------------------------------------------#

# ---------------------------------------------------
# pages (rendered from templates)
## map view
@app.route('/')
def main():
    return render_template('pages/index.html')

@app.route('/generateToken/')
def token():
    # get the token
    t1 = get_ags_token(
        url=app.config['ROK_AUTH_URL'],
        username=app.config['ROK_USER'],
        password=app.config['ROK_PW'],
        client=app.config['ROK_CLIENT_TYPE'],
        referer=app.config['ROK_REFERER_URL'],
        session=session,
        token_name='rsi_token'
    )
    #t2 = get_agol_token()
    t3 = get_ags_token(
        url=app.config['CMAGS_AUTH_URL'],
        username=app.config['CMAGS_USER'],
        password=app.config['CMAGS_PW'],
        client=app.config['CMAGS_CLIENT_TYPE'],
        referer=app.config['CMAGS_REFERER_URL'],
        session=session,
        token_name='cmags_token'
    )
    # build the response
    t = {"rsi_token":t1, "cmags_token":t3}
    r = make_response(jsonify(t), 200)
    # add header to enable CORS
    r.headers['Access-Control-Allow-Origin'] = '*'
    return make_response(r)

# ------------------------------------------------
# Error Handling

## Error handler 500
@app.errorhandler(500)
def internal_error(error):
    return render_template('errors/500.html'), 500

## Error handler 404
@app.errorhandler(404)
def not_found_error(error):
    return render_template('errors/404.html'), 404

## Error Logging
if not app.debug:
    file_handler = FileHandler('error.log')
    file_handler.setFormatter(
        Formatter('%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]')
    )
    app.logger.setLevel(logging.INFO)
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.info('errors')