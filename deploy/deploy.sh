#! /bin/bash

#make baseUrl production url, update the manifest count
python deploy/deploy.py

#remove old zip and add new one
cd ../
rm eyebrowse-chrome-ext.zip
zip -r eyebrowse-chrome-ext.zip eyebrowse-chrome-ext/