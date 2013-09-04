#!/bin/bash

echo '[SQL Database]' > server/brainslices.conf
read -p 'PostgreSQL database server host:' BS_DB_HOST
read -p 'PostgreSQL database port:' BS_DB_PORT
read -p 'PostgreSQL database user:' BS_DB_USER
read -p 'PostgreSQL database name:' BS_DB_NAME
# run with -s switch and check password!
read -p 'PostgreSQL database password:' BS_DB_PASSWORD
read -p 'PostgreSQL database encoding:' BS_DB_ENCODING

echo "host: $BS_DB_HOST" >> server/brainslices.conf
echo "port: $BS_DB_PORT" >> server/brainslices.conf
echo "user: $BS_DB_USER" >> server/brainslices.conf
echo "name: $BS_DB_NAME" >> server/brainslices.conf
echo "password: $BS_DB_PASSWORD" >> server/brainslices.conf
echo "encoding: $BS_DB_ENCODING" >> server/brainslices.conf

read -p 'Email host:' BS_EMAIL_SERVER
read -p 'Email port:' BS_EMAIL_PORT
read -p 'Email login:' BS_EMAIL_LOGIN
# run with -s switch and check password!
read -p 'Email password:' BS_EMAIL_PASSWORD
read -p 'Email address:' BS_EMAIL_ADDRESS
read -p 'Email encoding:' BS_EMAIL_ENCODING

echo  >> server/brainslices.conf
echo '[Email]' >> server/brainslices.conf
echo "host: $BS_EMAIL_SERVER" >> server/brainslices.conf
echo "port: $BS_EMAIL_PORT" >> server/brainslices.conf
echo "user: $BS_EMAIL_LOGIN" >> server/brainslices.conf
echo "password: $BS_EMAIL_PASSWORD" >> server/brainslices.conf
echo "address: $BS_EMAIL_ADDRESS" >> server/brainslices.conf
echo "encoding: $BS_EMAIL_ENCODING" >> server/brainslices.conf 

read -p 'Service host and port:' BS_SERVICE_SERVER
echo  >> server/brainslices.conf
echo '[Service]' >> server/brainslices.conf
echo "server: $BS_SERVICE_SERVER" >> server/brainslices.conf

read -p 'Tiler threads:' BS_TILER_THREADS
read -p 'Tiler memory:' BS_TILER_MEMORY
echo  >> server/brainslices.conf
echo '[Service]' >> server/brainslices.conf
echo "threads: $BS_TILER_THREADS" >> server/brainslices.conf
echo "memory: $BS_TILER_MEMORY" >> server/brainslices.conf

#sudo apt-get install libmagick++-dev libboost-thread-dev libboost-system-dev python-cherrypy3 postgresql postgresql-client libssl-dev python-psycopg2 
#sudo su postgres
#createuser -P skwarki
#createdb -O skwarki CracklingsDB
#psql -f sql/create_database.sql CracklingsDB
#exit
mkdir sourceImages
mkdir server/tiles
mkdir server/testTiles
mkdir server/outlines
mkdir server/uploadSlots
mkdir server/sourceImages
mkdir server/tilingLogs
cat app.conf.template | sed -e "s|\${pwd}|`pwd`|" > server/app.conf
cd auxilaryScripts/imageProcessing
make all
cd ..
#ln -s ../server/database.py .
#ln -s ../server/tileBase.py .
#ln -s ../server/secrets.py .
cd ..
UserID=`python auxilaryScripts/addUser.py -l admin -p password`
python auxilaryScripts/getBrainmapsTiles.py $UserID sourceImages
python auxilaryScripts/tileImage.py sourceImages/050.jpg -x 256 -y 256 -p 14.72 demo/images/050 -q 75 -X -7948.8 -Y -7728
python auxilaryScripts/tileImage.py sourceImages/051.jpg -x 256 -y 256 -p 14.72 demo/images/051 -q 75 -X -8390.4 -Y -7602.88
python auxilaryScripts/tileImage.py sourceImages/052.jpg -x 256 -y 256 -p 14.72 demo/images/052 -q 75 -X -8390.4 -Y -7529.28
python auxilaryScripts/tileImage.py sourceImages/053.jpg -x 256 -y 256 -p 14.72 demo/images/053 -q 75 -X -9494.4 -Y -7728
python auxilaryScripts/tileImage.py sourceImages/054.jpg -x 256 -y 256 -p 14.72 demo/images/054 -q 75 -X -8611.2 -Y -7529.28
python auxilaryScripts/tileImage.py sourceImages/055.jpg -x 256 -y 256 -p 14.72 demo/images/055 -q 75 -X -8390.4 -Y -7602.88
cd demo
ln -s ../server/static .
