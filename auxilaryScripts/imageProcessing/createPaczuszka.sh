#!/bin/sh
#remove the paczuszka directory (if exists)
rm -rf /tmp/cracklings
#and create it
mkdir /tmp/cracklings

#download latest revision
svn co https://xp-dev.com/svn/cracklings/trunk/auxilaryScripts/imageProcessing /tmp/cracklings

#remove svn entries
find /tmp/cracklings -iname '.svn' -print0 | xargs -0 rm -rfv

#remove this script copy
rm -rfv /tmp/cracklings/createPaczuszka.sh

#remove existing paczuszka
rm GraphicStreamingToolkit.zip

#and create a new one
wd=`pwd`
echo "directory: $wd"
cd /tmp/cracklings
zip -9 -r $wd/GraphicStreamingToolkit.zip *
cd $wd
rm -rf /tmp/cracklings
