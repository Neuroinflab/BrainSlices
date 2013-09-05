#!/bin/bash
CURRENT_DIR=`pwd`
read -p "Installation directory [$CURRENT_DIR]: " INSTALL_DIR
if [ "$INSTALL_DIR" == "" ]
  then
    INSTALL_DIR=$CURRENT_DIR
  fi

cat app.conf.template | sed -e "s|\${pwd}|$INSTALL_DIR|" > "$INSTALL_DIR/server/app.conf"

mkdir -p "$INSTALL_DIR/sourceImages"
mkdir -p "$INSTALL_DIR/server/tiles"
mkdir -p "$INSTALL_DIR/server/testTiles"
mkdir -p "$INSTALL_DIR/server/outlines"
mkdir -p "$INSTALL_DIR/server/uploadSlots"
mkdir -p "$INSTALL_DIR/server/sourceImages"
mkdir -p "$INSTALL_DIR/server/tilingLogs"

read -p "BrainSlices host [localhost]: " BS_HOST
if [ "$BS_HOST" == "" ]
  then
    BS_HOST=localhost
  fi

read -p "BrainSlices port [80]: " BS_PORT
if [ "$BS_PORT" == "" ]
  then
    BS_PORT=80
  fi
cat site.conf.template | sed -e "s|\${host}|$BS_HOST|; s|\${port}|$BS_PORT| " > "$INSTALL_DIR/server/site.conf"

BS_CONFIG="$INSTALL_DIR/server/brainslices.conf"
echo '[SQL Database]' > "$BS_CONFIG"
read -p 'PostgreSQL database server host [localhost]: ' BS_DB_HOST
if [ "$BS_DB_HOST" == "" ]
  then
    BS_DB_HOST=localhost
  fi

read -p 'PostgreSQL database port [5432]: ' BS_DB_PORT
if [ "$BS_DB_PORT" == "" ]
  then
    BS_DB_PORT=5432
  fi

read -p 'PostgreSQL database user [skwarki]: ' BS_DB_USER
if [ "$BS_DB_USER" == "" ]
  then
    BS_DB_USER=skwarki
  fi

read -p 'PostgreSQL database name [CracklingsDB]: ' BS_DB_NAME
if [ "$BS_DB_NAME" == "" ]
  then
    BS_DB_NAME=CracklingsDB
  fi

read -s -p 'PostgreSQL database password: ' BS_DB_PASSWORD
echo
read -s -p 'Confirm PostgreSQL database password: ' BS_DB_PASSWORD2
echo
while [ "$BS_DB_PASSWORD" != "$BS_DB_PASSWORD2" ]
  do
    echo "Passwords do not match."
    read -s -p 'PostgreSQL database password: ' BS_DB_PASSWORD
    echo
    read -s -p 'Confirm PostgreSQL database password: ' BS_DB_PASSWORD2
    echo
  done

read -p 'PostgreSQL database encoding [UTF8]: ' BS_DB_ENCODING
if [ "$BS_DB_ENCODING" == "" ]
  then
    BS_DB_ENCODING=UTF8
  fi


echo "host: $BS_DB_HOST" >> "$BS_CONFIG"
echo "port: $BS_DB_PORT" >> "$BS_CONFIG"
echo "user: $BS_DB_USER" >> "$BS_CONFIG"
echo "name: $BS_DB_NAME" >> "$BS_CONFIG"
echo "password: $BS_DB_PASSWORD" >> "$BS_CONFIG"
echo "encoding: $BS_DB_ENCODING" >> "$BS_CONFIG"

read -p 'Email host: ' BS_EMAIL_SERVER
read -p 'Email port: ' BS_EMAIL_PORT
read -p 'Email login: ' BS_EMAIL_LOGIN
read -s -p 'Email password: ' BS_EMAIL_PASSWORD
echo
read -s -p 'Confirm email password: ' BS_EMAIL_PASSWORD2
echo
while [ "$BS_EMAIL_PASSWORD" != "$BS_EMAIL_PASSWORD2" ]
  do
    echo "Passwords do not match."
    read -s -p 'Email password: ' BS_EMAIL_PASSWORD
    echo
    read -s -p 'Confirm email password: ' BS_EMAIL_PASSWORD2
    echo
  done
read -p "Email address [$BS_EMAIL_LOGIN@$BS_EMAIL_SERVER]: " BS_EMAIL_ADDRESS
if [ "$BS_EMAIL_ADDRESS" == "" ]
  then
    BS_EMAIL_ADDRESS="$BS_EMAIL_LOGIN@$BS_EMAIL_SERVER"
  fi
read -p 'Email encoding [utf-8]: ' BS_EMAIL_ENCODING
if [ "$BS_EMAIL_ENCODING" == "" ]
  then
    BS_EMAIL_ENCODING=utf-8
  fi

echo  >> "$BS_CONFIG"
echo '[Email]' >> "$BS_CONFIG"
echo "host: $BS_EMAIL_SERVER" >> "$BS_CONFIG"
echo "port: $BS_EMAIL_PORT" >> "$BS_CONFIG"
echo "user: $BS_EMAIL_LOGIN" >> "$BS_CONFIG"
echo "password: $BS_EMAIL_PASSWORD" >> "$BS_CONFIG"
echo "address: $BS_EMAIL_ADDRESS" >> "$BS_CONFIG"
echo "encoding: $BS_EMAIL_ENCODING" >> "$BS_CONFIG" 

if [ "$BS_PORT" == "80" ]
  then
    BS_SERVER="$BS_HOST"
  else
    BS_SERVER="$BS_HOST:$BS_PORT"
  fi
read -p "Service host and port for external users [$BS_SERVER]: " BS_SERVICE_SERVER
if [ "$BS_SERVICE_SERVER" == "" ]
  then
    BS_SERVICE_SERVER="$BS_SERVER"
  fi
echo  >> "$BS_CONFIG"
echo '[Service]' >> "$BS_CONFIG"
echo "server: $BS_SERVICE_SERVER" >> "$BS_CONFIG"

read -p 'Tiler threads [1]: ' BS_TILER_THREADS
if [ "$BS_TILER_THREADS" == "" ] || [ "$BS_TILER_THREADS" -lt "1" ]
  then
    BS_TILER_THREADS=1
  fi
read -p 'Tiler memory [536870912] : ' BS_TILER_MEMORY
if [ "$BS_TILER_MEMORY" == "" ] || [ "$BS_TILER_MEMORY" -lt "0" ]
  then
    BS_TILER_MEMORY=536870912
  fi
echo  >> "$BS_CONFIG"
echo '[Tiler]' >> "$BS_CONFIG"
echo "threads: $BS_TILER_THREADS" >> "$BS_CONFIG"
echo "memory: $BS_TILER_MEMORY" >> "$BS_CONFIG"

#sudo apt-get install libmagick++-dev libboost-thread-dev libboost-system-dev python-cherrypy3 postgresql postgresql-client libssl-dev python-psycopg2 
#sudo su postgres
#createuser -P skwarki
#createdb -O skwarki CracklingsDB
#psql -f sql/create_database.sql CracklingsDB
#exit
cd auxilaryScripts/imageProcessing
make all
cd ..
#ln -s ../server/database.py .
#ln -s ../server/tileBase.py .
#ln -s ../server/secrets.py .
cd ..

read -p 'Download example images? [y/N]:' DOWNLOAD_BRAINMAPS
if [ "${DOWNLOAD_BRAINMAPS::1}" == "y" ] || [ "${DOWNLOAD_BRAINMAPS::1}" == "Y" ]; then
  UserID=`python auxilaryScripts/addUser.py -l admin -p password`
  python auxilaryScripts/getBrainmapsTiles.py $UserID sourceImages
  python auxilaryScripts/tileImage.py sourceImages/050.jpg -x 256 -y 256 -p 14.72 demo/images/050 -q 75 -X -7948.8 -Y -7728
  python auxilaryScripts/tileImage.py sourceImages/051.jpg -x 256 -y 256 -p 14.72 demo/images/051 -q 75 -X -8390.4 -Y -7602.88
  python auxilaryScripts/tileImage.py sourceImages/052.jpg -x 256 -y 256 -p 14.72 demo/images/052 -q 75 -X -8390.4 -Y -7529.28
  python auxilaryScripts/tileImage.py sourceImages/053.jpg -x 256 -y 256 -p 14.72 demo/images/053 -q 75 -X -9494.4 -Y -7728
  python auxilaryScripts/tileImage.py sourceImages/054.jpg -x 256 -y 256 -p 14.72 demo/images/054 -q 75 -X -8611.2 -Y -7529.28
  python auxilaryScripts/tileImage.py sourceImages/055.jpg -x 256 -y 256 -p 14.72 demo/images/055 -q 75 -X -8390.4 -Y -7602.88
fi
cd demo
ln -s ../server/static .
