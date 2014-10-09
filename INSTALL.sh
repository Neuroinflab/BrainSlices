#!/bin/bash
###############################################################################
#                                                                             #
#    BrainSlices Software                                                     #
#                                                                             #
#    Copyright (C) 2012-2013 Jakub M. Kowalski                                #
#                                                                             #
#    This software is free software: you can redistribute it and/or modify    #
#    it under the terms of the GNU General Public License as published by     #
#    the Free Software Foundation, either version 3 of the License, or        #
#    (at your option) any later version.                                      #
#                                                                             #
#    This software is distributed in the hope that it will be useful,         #
#    but WITHOUT ANY WARRANTY; without even the implied warranty of           #
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the            #
#    GNU General Public License for more details.                             #
#                                                                             #
#    You should have received a copy of the GNU General Public License        #
#    along with this software.  If not, see http://www.gnu.org/licenses/.     #
#                                                                             #
###############################################################################

askPassw ()
{
  if [ "$#" -eq "0" ] || [ "$#" -gt "2" ]
    then
      echo "ERROR: should be $0 <password owner> [<variable name>]"
      return
    fi

  local VAR=ANS
  if [ "$#" -gt "1" ]
    then
      VAR=$2
    fi

  local PASSWORD
  read -s -p "Input $1: " PASSWORD
  echo
  read -s -p "Confirm $1: " $VAR
  echo
  while [ "$PASSWORD" != "${!VAR}" ]
    do
      echo "Passwords do not match."
      read -s -p "Input $1: " PASSWORD
      echo
      read -s -p "Confirm $1: " $VAR
      echo
    done
}

askPrompt ()
{
  if [ "$#" -eq "0" ]
    then
      echo "ERROR: no prompt given"
      return
    fi

  local PROMPT="$1: "
  if [ "$#" -gt "1" ] && [ "$2" != "" ]
    then
      PROMPT="$1 [$2]: "
    fi

  local VAR=ANS
  if [ "$#" -gt "2" ]
    then
      VAR=$3
    fi

  read -p "$PROMPT" $VAR
  if [ "${!VAR}" == "" ] && [ "$#" -gt "1" ]
    then
      eval $VAR=\"$2\"
    fi
}

askBool ()
{
  if [ "$#" -eq "0" ]
    then
      echo "ERROR: should be $0 <prompt> [<defaults [y/N]> [<variable name>]]"
      return
    fi

  local DEFAULT="N/y"
  if [ "$#" -gt "1" ] && ( [ "${2::1}" == "y" ] || [ "${2::1}" == "Y" ] )
    then
      DEFAULT="Y/n"
    fi

  local VAR=ANS
  if [ "$#" -gt "2" ]
    then
      VAR=$3
    fi

  askPrompt "$1" "$DEFAULT" $VAR

  if [ "${!VAR::1}" == "y" ] || [ "${!VAR::1}" == "Y" ]
    then
      eval $VAR="Y"
      return
    fi

  eval $VAR="N"
  false
}

if askBool "Do you want to fetch required packages?
(Operation requires sudo privileges.)" N #FETCH_PACKAGES
  then
    sudo apt-get install authbind libmagick++-dev libboost-thread-dev libboost-system-dev python-cherrypy3 postgresql libssl-dev python-psycopg2 at imagemagick
    # python-cherrypy # Ubuntu 13.10
    # postgresql-contrib postgresql-client
  fi

echo
echo "Default values are given in square braces: '[]'."
echo "Please provide every variable with no default value."
echo

CURRENT_DIR=`pwd`
askPrompt "Installation directory" "$CURRENT_DIR" INSTALL_DIR
mkdir -p "$INSTALL_DIR"
if [ "$INSTALL_DIR" != "$CURRENT_DIR" ]
  then
    cd "$INSTALL_DIR"
    INSTALL_DIR=`pwd`
    cp -r "$CURRENT_DIR/server" "$INSTALL_DIR"
    cp -r "$CURRENT_DIR/auxilaryScripts" "$INSTALL_DIR"
    cp -r "$CURRENT_DIR/demo" "$INSTALL_DIR"
  fi

cat "$CURRENT_DIR/app.conf.template" | sed -e "s|\${pwd}|$INSTALL_DIR|" > "$INSTALL_DIR/server/app.conf"
mkdir -p "$INSTALL_DIR/sourceImages"
mkdir -p "$INSTALL_DIR/server/tiles"
mkdir -p "$INSTALL_DIR/server/testTiles"
mkdir -p "$INSTALL_DIR/server/outlines"
mkdir -p "$INSTALL_DIR/server/uploadSlots"
mkdir -p "$INSTALL_DIR/server/sourceImages"
mkdir -p "$INSTALL_DIR/server/tilingLogs"


CURRENT_USER=`whoami`
askPrompt "Server system user" "$CURRENT_USER" SERVER_USER

askPrompt "BrainSlices host" 0.0.0.0 BS_HOST
askPrompt "BrainSlices port" 80 BS_PORT

if [ "$BS_PORT" -lt 512 ]
  then
    sudo touch "/etc/authbind/byaddr/$BS_HOST:$BS_PORT"
    sudo chmod 100 "/etc/authbind/byaddr/$BS_HOST:$BS_PORT"
    sudo chown $SERVER_USER "/etc/authbind/byaddr/$BS_HOST:$BS_PORT"
  fi

cat "$CURRENT_DIR/site.conf.template" | sed -e "s|\${host}|$BS_HOST|; s|\${port}|$BS_PORT| " > "$INSTALL_DIR/server/site.conf"


BS_CONFIG="$INSTALL_DIR/server/brainslices.conf"

echo
echo "Now it is time to configure database for your server. You can use existing"
echo "database and user, or create new (sudo privileges required)."
echo
echo '[SQL Database]' > "$BS_CONFIG"

askPrompt "PostgreSQL database server host" localhost BS_DB_HOST
askPrompt "PostgreSQL database port" 5432 BS_DB_PORT

getDbUser()
{
  askPrompt "PostgreSQL database user" skwarki BS_DB_USER
  askPassw "database user's password"
  BS_DB_PASSWORD="$ANS"
}

getDbMaintenance()
{
  echo "Please enter the database's maintenance role (existing one) you want to use"
  echo "when creating new user. You might be asked to input role's password."
  askPrompt "Maintenance role" postgres DB_USER
}

if askBool "Do you want to create a new database user?" N #NEW_DB_USER
  then
    #XXX might fail if cluster not created on instalation -_-
    getDbUser
    if [ "$BS_DB_HOST" == "localhost" ]
      then
        until sudo su postgres -c "psql -c \"CREATE ROLE $BS_DB_USER LOGIN PASSWORD '$BS_DB_PASSWORD'; \""
          do
            echo "An error has occured trying to create role $BS_DB_USER."
            echo "Please try again."
            getDbUser
          done
      else
        getDbMaintenance
        until psql -h "$BS_DB_HOST" -p $BS_DB_PORT -u $DB_USER -c "CREATE ROLE $BS_DB_USER LOGIN PASSWORD '$BS_DB_PASSWORD'; "
          do
            echo "An error has occured trying to create role $BS_DB_USER."
            echo "Please try again."
            getDbUser
            getDbMaintenance
          done
      fi

  else
    getDbUser
  fi

getDb()
{
  askPrompt "PostgreSQL database name" "skwarki" BS_DB_NAME
  askPrompt "PostgreSQL database encoding" "UTF8" BS_DB_ENCODING
}

if askBool "Do you want to create a new database?" N NEW_DB
  then
    getDb
    if [ "$BS_DB_HOST" == "localhost" ]
      then
        #XXX -T template0 because of encoding mismatch -_-
        until sudo su postgres -c "createdb -O $BS_DB_USER -E $BS_DB_ENCODING -T template0 $BS_DB_NAME"
          do
            echo "An error has occured trying to create database $BS_DB_NAME"
            echo "Please try again."
            getDb
          done
      else
        getDbMaintenance
        until createdb -h "$BS_DB_HOST" -p $BS_DB_PORT -u $DB_USER -O $BS_DB_USER -E $BS_DB_ENCODING -T template0 $BS_DB_NAME
          do
            echo "An error has occured trying to create database $BS_DB_NAME"
            echo "Please try again."
            getDb
            getDbMaintenance
          done
      fi

  else
    getDb
  fi

SETUP_DB=N
if [ "$NEW_DB" == "Y" ] || askBool "Reset the database?" N
  then
    SETUP_DB=Y
    if [ "$BS_DB_USER" == "skwarki" ]
      then
        cp "$CURRENT_DIR/sql/create_database.sql" "$INSTALL_DIR/create_database.sql"

      else
        cat "$CURRENT_DIR/sql/create_database.sql" | sed -e "s|skwarki|$BS_DB_USER|" > "$INSTALL_DIR/create_database.sql"
      fi

    if [ "$BS_DB_HOST" == "localhost" ]
      then
        sudo su postgres -c "psql -f '$INSTALL_DIR/create_database.sql' $BS_DB_NAME"

      else
        getDbMaintenance
        until psql -h $BS_DB_HOST -p $BS_DB_PORT -f '$INSTALL_DIR/create_database.sql' $BS_DB_NAME
          do
            getDbMaintenance
          done
      fi

    rm "$INSTALL_DIR/create_database.sql"
  fi


echo "host: $BS_DB_HOST" >> "$BS_CONFIG"
echo "port: $BS_DB_PORT" >> "$BS_CONFIG"
echo "user: $BS_DB_USER" >> "$BS_CONFIG"
echo "name: $BS_DB_NAME" >> "$BS_CONFIG"
echo "password: $BS_DB_PASSWORD" >> "$BS_CONFIG"
echo "encoding: $BS_DB_ENCODING" >> "$BS_CONFIG"

askPrompt "Email host" localhost BS_EMAIL_SERVER
askPrompt "Email port" 587 BS_EMAIL_PORT
askPrompt "Email login" "" BS_EMAIL_LOGIN
askPassw "email password" BS_EMAIL_PASSWORD
askPrompt "Email address" "$BS_EMAIL_LOGIN@$BS_EMAIL_SERVER" BS_EMAIL_ADDRESS
askPrompt "Email encoding" "utf-8" BS_EMAIL_ENCODING

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

askPrompt "Service host and port for external users" "$BS_SERVER" BS_SERVICE_SERVER
askPrompt "Official server name" "" BS_SERVICE_NAME 
askPrompt "Signature for BrainSlices e-mails" "$BS_SERVICE_NAME team" BS_SERVICE_SIGNATURE
echo  >> "$BS_CONFIG"
echo '[Service]' >> "$BS_CONFIG"
echo "server: $BS_SERVICE_SERVER" >> "$BS_CONFIG"
echo "name: $BS_SERVICE_NAME" >> "$BS_CONFIG"
echo "signature: $BS_SERVICE_SIGNATURE" >> "$BS_CONFIG"

askPrompt "Tiler threads" 1 BS_TILER_THREADS
if [ "$BS_TILER_THREADS" -lt "1" ]
  then
    BS_TILER_THREADS=1
  fi

askPrompt "Tiler memory [B]" 536870912 BS_TILER_MEMORY
if [ "$BS_TILER_MEMORY" -lt "0" ]
  then
    BS_TILER_MEMORY=536870912
  fi
echo  >> "$BS_CONFIG"
echo '[Tiler]' >> "$BS_CONFIG"
echo "threads: $BS_TILER_THREADS" >> "$BS_CONFIG"
echo "memory: $BS_TILER_MEMORY" >> "$BS_CONFIG"


echo
echo "The limit of files opened by stream to prevent disk memory mapping has been"
echo "chosen experimentally and might require manual tuning for the system."
echo "The limit is enforced with ulimit -n argument."
askPrompt "Limit of files opened by stream to prevent disk memory mapping" 5 BS_STREAM_FILES
if [ "$BS_STREAM_FILES" -lt "0" ]
  then
    BS_STREAM_FILES=5
  fi

askPrompt "Timeout for streaming process [s]" 60 BS_STREAM_TIMEOUT
if [ "$BS_STREAM_TIMEOUT" -lt "0" ]
  then
    BS_STREAM_TIMEOUT=60
  fi

echo  >> "$BS_CONFIG"
echo '[Stream]' >> "$BS_CONFIG"
echo "files: $BS_STREAM_FILES" >> "$BS_CONFIG"
echo "timeout: $BS_STREAM_TIMEOUT" >> "$BS_CONFIG"

cd auxilaryScripts/imageProcessing
make all
cd ../..

UserID=

if [ "$NEW_DB" == "N" ] || [ "$SETUP_DB" == "Y" ]
  then
    if askBool "Create a service user?" Y SERVICE_USER_CREATE
      then
        askPrompt "Service user login" admin SERVICE_USER_LOGIN
        askPassw "$SERVICE_USER_LOGIN password" SERVICE_USER_PASSWORD
        until UserID=`python auxilaryScripts/addUser.py -l "$SERVICE_USER_LOGIN" -p "$SERVICE_USER_PASSWORD" -q`
          do
            echo "An error has occured. Please try again."
            askPrompt "Service user login" "$SERVICE_USER_LOGIN" SERVICE_USER_LOGIN
            askPassw "$SERVICE_USER_LOGIN password" SERVICE_USER_PASSWORD
          done
    
      fi
  fi

# old database or new user created
if ( [ "$SETUP_DB" == "N" ] || [ "$SERVICE_USER_CREATE" == "Y" ] ) && askBool "Download example images for service?" N DOWNLOAD_BRAINMAPS
  then
    if [ "$UserID" == "" ]
      then
        askPrompt "Service user login" admin SERVICE_USER_LOGIN
        until UserID=`python auxilaryScripts/getUser.py -l "$SERVICE_USER_LOGIN"`
          do
            echo "An error has occured. Please try again."
            askPrompt "Service user login" "$SERVICE_USER_LOGIN" SERVICE_USER_LOGIN
          done
      fi

    python auxilaryScripts/getBrainmapsTiles.py $UserID sourceImages
    OFFLINE_DEMO=Y

  else
    if askBool "Download images for offline demo?" Y OFFLINE_DEMO
      then
        wget http://brainmaps.org/HBP-JPG/42/050.jpg -dc -O sourceImages/050.jpg
        wget http://brainmaps.org/HBP-JPG/42/051.jpg -dc -O sourceImages/051.jpg
        wget http://brainmaps.org/HBP-JPG/42/052.jpg -dc -O sourceImages/052.jpg
        wget http://brainmaps.org/HBP-JPG/42/053.jpg -dc -O sourceImages/053.jpg
        wget http://brainmaps.org/HBP-JPG/42/054.jpg -dc -O sourceImages/054.jpg
        wget http://brainmaps.org/HBP-JPG/42/055.jpg -dc -O sourceImages/055.jpg
      fi

  fi

if [ "$OFFLINE_DEMO" == "Y" ]
  then
    python auxilaryScripts/tileImage.py sourceImages/050.jpg -x 256 -y 256 -p 14.72 demo/images/050 -q 75 -X -7948.8 -Y -7728
    python auxilaryScripts/tileImage.py sourceImages/051.jpg -x 256 -y 256 -p 14.72 demo/images/051 -q 75 -X -8390.4 -Y -7602.88
    python auxilaryScripts/tileImage.py sourceImages/052.jpg -x 256 -y 256 -p 14.72 demo/images/052 -q 75 -X -8390.4 -Y -7529.28
    python auxilaryScripts/tileImage.py sourceImages/053.jpg -x 256 -y 256 -p 14.72 demo/images/053 -q 75 -X -9494.4 -Y -7728
    python auxilaryScripts/tileImage.py sourceImages/054.jpg -x 256 -y 256 -p 14.72 demo/images/054 -q 75 -X -8611.2 -Y -7529.28
    python auxilaryScripts/tileImage.py sourceImages/055.jpg -x 256 -y 256 -p 14.72 demo/images/055 -q 75 -X -8390.4 -Y -7602.88
  fi

cd demo
ln -s ../server/static .

chmod 600 "$BS_CONFIG"

BS_AUTOSTART="NO"
if askBool "Do you want the server to automatically start at boot?"
  then
    BS_AUTOSTART="YES"
    cat "$CURRENT_DIR/init.d/BrainSlices" | sed -e "s|\${path}|$INSTALL_DIR/server|; s|\${user}|$SERVER_USER| " > "$INSTALL_DIR/init.d"
    sudo mv "$INSTALL_DIR/init.d" /etc/init.d/BrainSlices
    sudo chmod 755 /etc/init.d/BrainSlices
    sudo chown root:root /etc/init.d/BrainSlices
    sudo update-rc.d BrainSlices defaults
  fi

if [ "$SERVER_USER" != "$CURRENT_USER" ]
  then
    sudo chown -R "$SERVER_USER" "$INSTALL_DIR"
  fi

if [ "$BS_AUTOSTART" == "YES" ]
  then
    sudo service BrainSlices start
  fi
