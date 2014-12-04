#!/usr/bin/python
# -*- coding: utf-8 -*-
###############################################################################
#                                                                             #
#    BrainSlices Software                                                     #
#                                                                             #
#    Copyright (C) 2012-2014 Jakub M. Kowalski                                #
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

def hSize(size, space='\xc2\xa0'):#'\xa0'
  if size < 1024:
    return '%d%sB' % (size, space)

  if size < 1024 * 1024:
    return '%.1f%sKiB' % (size / 1024., space)

  if size < 1024 *  1024 * 1024:
    return '%.1f%sMiB' % (size / (1024. * 1024), space)

  if size < 1024 *  1024 * 1024 * 1024:
     return '%.1f%sGiB' % (size / (1024. * 1024 * 1024), space)

  return '%.1f%sTiB' % (size / (1024. * 1024 * 1024 * 1024), space)

def hSI(size, space='\xc2\xa0'):#'\xa0'
  if size < 1000:
    return '%d%s' % (size, space)

  if size < 1000000:
    return '%.1f%sk' % (size * .001, space)

  if size < 1000000000:
    return '%.1f%sM' % (size * .000001, space)

  if size < 1000000000000L:
     return '%.1f%sG' % (size * .000000001, space)

  return '%.1f%sT' % (size * .000000000001, space)
