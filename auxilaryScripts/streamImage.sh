#!/bin/bash
# streamImage.sh <infile> <outfile> <memory limit [KB]> <thread limit> <file limit> <timeout [s]>
ulimit -v $3 -m $3 -d $3 -s $3 -n $5
# suggested ImageMagick 6.6.9-7
timeout $6 stream -limit memory $3KB -limit area $3KB -limit map 0 -limit disk 0 -limit thread $4 -limit file 0 -map rgb -storage-type char -regard-warnings $1 $2
exit $?
