# project/_config.py

import os
#from datetime import timedelta

# Grabs the folder where the script runs.
basedir = os.path.abspath(os.path.dirname(__file__))

# Enable debug mode.
DEBUG = True

# Secret key for session management.
SECRET_KEY = ''

# Session lifetime (matches lifetime of Esri tokens)
# PERMANENT_SESSION_LIFETIME = timedelta(seconds=3600)

# ESRI IDs for accessing to premium AGOL services (elevation and hydrology)
ESRI_APP_ID =''
ESRI_APP_SECRET=''

# ROKTECH CREDS for accessing 3RWW & CivicMapper ArcGIS Server services
ROK_USER = ''
ROK_PW = ''
ROK_AUTH_URL = 'https://arcgis4.roktech.net/arcgis/tokens/generateToken'
ROK_REFERER_URL = 'flush-it.civicmapper.com/'
ROK_CLIENT_TYPE = 'requestip'
#ROK_CLIENT_TYPE = 'referer'

# CivicMapper AGS CREDS for accessing CivicMapper ArcGIS Server demo services for 3RWW
CMG_USER = ''
CMG_PW = ''
CMG_AUTH_URL = 'https://geo.civicmapper.com/arcgis/tokens/generateToken'
CMG_REFERER_URL = 'flush-it.civicmapper.com/'
CMG_CLIENT_TYPE = 'requestip'
#CMG_CLIENT_TYPE = 'referer'