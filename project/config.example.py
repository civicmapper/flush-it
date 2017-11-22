# project/_config.py

import os
# from datetime import timedelta

# Grabs the folder where the script runs.
basedir = os.path.abspath(os.path.dirname(__file__))

# Enable debug mode.
DEBUG = True

# Secret key for session management.
SECRET_KEY = ""

# Session lifetime (matches lifetime of Esri tokens)
# PERMANENT_SESSION_LIFETIME = timedelta(seconds=3600)

# ROKTECH CREDS for accessing 3RWW & CivicMapper ArcGIS Server services
ROK_USER = ''
ROK_PW = ''
ROK_AUTH_URL = 'https://arcgis4.roktech.net/arcgis/tokens/generateToken'
ROK_CLIENT_TYPE = 'requestip'
#ROK_CLIENT_TYPE = 'referer'
ROK_REFERER_URL = 'flush-it.civicmapper.com'

# AGS CREDS for accessing CivicMapper demo services
CMAGS_USER = ''
CMAGS_PW = ''
CMAGS_AUTH_URL = 'https://geodata.civicmapper.com/arcgis/tokens/generateToken'
CMAGS_CLIENT_TYPE = 'requestip'
#CMAGS_CLIENT_TYPE = 'referer'
CMAGS_REFERER_URL = 'flush-it.civicmapper.com'

# AGOL CREDS for accessing 3RWW ArcGIS Online
ESRI_APP_CLIENT_ID = ''
ESRI_APP_CLIENT_SECRET = ''
ESRI_APP_TOKEN_EXPIRATION = '-1'
ESRI_AUTH_URL = 'https://www.arcgis.com/sharing/oauth2/token'