###############################################################################
#                                                                             #
#    This file is part of Graphic Streaming Toolkit                           #
#    (a detached part of BrainSlices Software).                               #
#                                                                             #
#    Copyright (C) 2012-2013 Jakub M. Kowalski                                #
#                                                                             #
#    Graphic Streaming Toolkit is a free software: you can redistribute it    #
#    and/or modify it under the terms of the GNU General Public License as    #
#    published by the Free Software Foundation, either version 3 of the       #
#    License, or (at your option) any later version.                          #
#                                                                             #
#    Graphic Streaming Toolkit is distributed in the hope that it will be     #
#    useful, but WITHOUT ANY WARRANTY; without even the implied warranty      #
#    of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.                  #
#    See the GNU General Public License for more details.                     #
#                                                                             #
#    You should have received a copy of the GNU General Public License        #
#    along with Graphic Streaming Toolkit.                                    #
#    If not, see http://www.gnu.org/licenses/.                                #
#                                                                             #
###############################################################################

CC = g++ -c
LC = g++
LC_CONF =
CC_CONF = -O3

# libboost-thread-dev and libboost-system-dev required
LC_CONF_SCALE = ${LC_CONF} -lboost_thread -lboost_system

# libmagick++-dev required
CC_CONF_TILE = ${CC_CONF} `Magick++-config --cppflags` 
LC_CONF_TILE = ${LC_CONF_SCALE} `Magick++-config --ldflags --libs`

# libpng required
LC_CONF_RAW2PNG = ${LC_CONF} -lpng

# openssl required
LC_CONF_RAW2PNG_MD5 = ${LC_CONF_RAW2PNG} -lcrypto

PROGS = tileStreamedImage scaleStreamedImage raw2png raw2pngMD5 tileStreamedImageJPG

all: ${PROGS}

clean:
	rm *.o

cleanup:
	rm *.o ${PROGS}

tileStreamedImage: tileStreamedImage.o ThreadSafeIO.o
	echo $@
	${LC} $^ ${LC_CONF_TILE} -o $@

tileStreamedImage.o: tileStreamedImage.cpp LanczosFilter.h BoxFilter.h SumFilter.h TriangleFilter.h StreamedImagePrescaledInputWindow.h TiledImageOutputWindow.h TileCommandlineParser.h ThreadSafeIO.h
	echo $@
	${CC} ${CC_CONF_TILE} tileStreamedImage.cpp -o $@

LanczosFilter.h BoxFilter.h SumFilter.h TriangleFilter.h StreamedImagePrescaledInputWindow.h: CacheableFilter.h
TileCommandlineParser.h: TileCommandlineParserJPG.h
TileCommandlineParserJPG.h StreamCommandlineParser.h: ScaleCommandlineParser.h
PngCommandlineParser.h ScaleCommandlineParser.h: CommandlineParser.h
StreamedImagePrescaledInputWindow.h StreamedImageInputWindow.h TiledImageOutputWindow.h TiledImageOutputWindowJPG.h: ThreadSafeIO.h

*.h:
	echo $@
	touch $@


scaleStreamedImage: scaleStreamedImage.o ThreadSafeIO.o
	echo $@
	${LC} $^ ${LC_CONF_SCALE} -o $@

scaleStreamedImage.o: scaleStreamedImage.cpp LanczosFilter.h BoxFilter.h SumFilter.h TriangleFilter.h StreamedImagePrescaledInputWindow.h StreamedImageOutputWindow.h StreamCommandlineParser.h ThreadSafeIO.h
	echo $@
	${CC} ${CC_CONF_SCALE} scaleStreamedImage.cpp -o $@


raw2png: raw2png.o
	echo $@
	${LC} $^ ${LC_CONF_RAW2PNG} -o $@

raw2png.o: raw2png.cpp PngCommandlineParser.h
	echo $@
	${CC} ${CC_CONF} raw2png.cpp -o $@


raw2pngMD5: raw2pngMD5.o
	echo $@
	${LC} $^ ${LC_CONF_RAW2PNG_MD5} -o $@

raw2pngMD5.o: raw2pngMD5.cpp PngCommandlineParser.h
	echo $@
	${CC} ${CC_CONF} raw2pngMD5.cpp -o $@


tileStreamedImageJPG: tileStreamedImageJPG.o ThreadSafeIO.o TiledImageOutputWindowJPG.o
	echo $@
	${LC} $^ ${LC_CONF_SCALE} -ljpeg -o $@

tileStreamedImageJPG.o: tileStreamedImageJPG.cpp LanczosFilter.h BoxFilter.h SumFilter.h TriangleFilter.h StreamedImagePrescaledInputWindow.h TiledImageOutputWindowJPG.h TileCommandlineParserJPG.h ThreadSafeIO.h
	echo $@
	${CC} ${CC_CONF} tileStreamedImageJPG.cpp -o $@

ThreadSafeIO.o: ThreadSafeIO.cpp ThreadSafeIO.h
	echo $@
	${CC} ${CC_CONF} ThreadSafeIO.cpp -o $@

TiledImageOutputWindowJPG.o: TiledImageOutputWindowJPG.cpp TiledImageOutputWindowJPG.h ThreadSafeIO.h
	echo $@
	${CC} ${CC_CONF} TiledImageOutputWindowJPG.cpp -o $@
