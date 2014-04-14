/* File: privileges_manager.js; TO BE DOCUMENTED */
/*****************************************************************************\
*                                                                             *
*    This file is part of BrainSlices Software                                *
*                                                                             *
*    Copyright (C) 2013 J. M. Kowalski                                        *
*                                                                             *
*    BrainSlices software is free software: you can redistribute it and/or    *
*    modify it under the terms of the GNU General Public License as           *
*    published by the Free Software Foundation, either version 3 of the       *
*    License, or (at your option) any later version.                          *
*                                                                             *
*    BrainSlices software is distributed in the hope that it will be useful,  *
*    but WITHOUT ANY WARRANTY; without even the implied warranty of           *
*    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the            *
*    GNU General Public License for more details.                             *
*                                                                             *
*    You should have received a copy of the GNU General Public License        *
*    along with BrainSlices software.                                         *
*    If not, see http://www.gnu.org/licenses/.                                *
*                                                                             *
\*****************************************************************************/

function CImagePrivilegesManager(ajaxProvider)
{
  var privileges = {};

  this.add = function(item, $row, onUpdate)
  {
    var iid = item[0];
    if (iid in privileges) return false;
    var publicPrivileges = item[1];
    var groups = item[2];
    var gps = {};
    for (var i = 0; i < groups.length; i++)
    {
      var group = groups[i];
      gps[group[0]] = {edit: group[1],
                       annotate: group[2],
                       outline: group[3]};
    }

    var privilege = {view_: publicPrivileges[0],
                     edit_: publicPrivileges[1],
                     annotate_: publicPrivileges[2],
                     outline_: publicPrivileges[3],
                     groups_: gps,
                     $row: $row,
                     onUpdate: onUpdate};
    privileges[iid] = privilege;
    privilege.reset = function()
    {
      privilege.view = privilege.view_;
      privilege.edit = privilege.edit_;
      privilege.annotate = privilege.annotate_;
      privilege.outline = privilege.outline_;
      var gps = privilege.groups_;
      var groups = {};
      for (var gid in gps)
      {
        var group = gps[gid];
        groups[gid] = {edit: group.edit,
                       annotate: group.annotate,
                       outline: group.outline};
      }
      privilege.groups = groups;
      privilege.changedPublic = false;
      privilege.changedGroup = false;
      if (privilege.onUpdate != null)
      {
        privilege.onUpdate(privilege);
      }

      if (privilege.$row != null && privilege.$row.hasClass('privilegeChanged'))
      {
        privilege.$row.removeClass('privilegeChanged');
      }
    };

    privilege.changePublic = function(view, edit, annotate, outline,
                                      doNotUpdate)
    {
      if (view != null) privilege.view = view;
      if (edit != null) privilege.edit = edit;
      if (annotate != null) privilege.annotate = annotate;
      if (outline != null) privilege.outline = outline;
      privilege.changedPublic = true;
      if (privilege.$row != null)
      {
        privilege.$row.addClass('privilegeChanged');
      }

      if (doNotUpdate != true && privilege.onUpdate != null)
      {
        privilege.onUpdate(privilege);
      }
    };

    //TODO: privilege add/revoke/change group

    privilege.destroy = function()
    {
      privilege.reset = null;
      privilege.changePublic = null;
      privilege.destroy = null;
      delete privileges[iid]; //autoremove :-)
    }

    privilege.reset();
  };

  this.remove = function(iid)
  {
    if (iid in privileges) privileges[iid].destroy();
  };

  this.apply = function(iid, f)
  {
    if (iid == null)
    {
      for (iid in privileges)
      {
        f(privileges[iid]);
      }
    }
    else if (iid in privileges)
    {
      f(privileges[iid]);
    }
  };

  this.changePublic = function(iid, view, edit, annotate, outline,
                               doNotUpdate)
  {
    this.apply(iid, function(x)
    {
      x.changePublic(view, edit, annotate, outline, doNotUpdate);
    });
  };

  this.reset = function(iid)
  {
    this.apply(iid, function(x)
    {
      x.reset();
    });
  };

  this.flush = function()
  {
    var toDismiss = {};
    for (var iid in privileges)
    {
      toDismiss[iid] = null;
    }

    for (var iid in toDismiss)
    {
      this.remove(iid);
    }
  };

  this.savePublic = function(finalFunction)
  {
    var toSave = [];
    for (var iid in privileges)
    {
      var privilege = privileges[iid];
      if (privilege.changedPublic)
      {
        toSave.push([iid, privilege.view ? 1 : 0, privilege.edit ? 1 : 0,
                     privilege.annotate ? 1 : 0, privilege.outline ? 1: 0].join(','));
      }
    }

    if (toSave.length > 0)
    {
      ajaxProvider.ajax('/upload/changePublicPrivileges',
                        function(response)
                        {
                          if (!response.status)
                          {
                            alert(response.message);
                            return;
                          }

                          var list = response.data;
                          for (var i = 0; i < list.length; i++)
                          {
                            var iid = list[i];
                            if (iid in privileges)
                            {
                              var privilege = privileges[iid];
                              privilege.view_ = privilege.view;
                              privilege.edit_ = privilege.edit;
                              privilege.annotate_ = privilege.annotate;
                              privilege.outline_ = privilege.outline;
                              privilege.changedPublic = false;
                              if (privilege.$row != null
                                  && !privilege.changedGroup
                                  && privilege.$row.hasClass('privilegeChanged'))
                              {
                                privilege.$row.removeClass('privilegeChanged');
                              }
                            }
                            else
                            {
                              console.error('changePublicPrivileges success handler received an unknown iid: ' + iid);
                            }
                          }
                        },
                        {privileges: toSave.join(':')});
    }
  }

  this.destroy = function()
  {
    this.flush();
    this.add = null;
    this.remove = null;
    this.reset = null;
    this.changePublic = null;
    this.apply = null;
    this.flush = null;
    this.destroy = null;
  }
}
