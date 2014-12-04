/*****************************************************************************\
*                                                                             *
*    This file is part of BrainSlices Software                                *
*                                                                             *
*    Copyright (C) 2013-2014 J. M. Kowalski, J. Potworowski                   *
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


function initUser()
{
  var scope = BrainSlices.scope;
  var gui = BrainSlices.gui;

  function setUserStats(stats)
  {
    if (stats)
    {
      $('#userImageNumber')
        .text(stats.images);
      $('#userDiskUsed')
        .text(gui.hSize(stats.diskUsed))
        [stats.diskLimit != null && stats.diskUsed > stats.diskLimit ?
         'addClass' :
         'removeClass']('limit-exceeded');
      $('#userDiskLimit')
        .text(stats.diskLimit == null ?
              'unlimited' :
              gui.hSize(stats.diskLimit));
      $('#userPixelUsed')
        .text(gui.hSI(stats.pixelUsed) + 'px')
        [stats.pixelLimit != null && stats.pixelUsed > stats.pixelLimit ?
         'addClass' :
         'removeClass']('limit-exceeded');
      $('#userPixelLimit')
        .text(stats.pixelLimit == null ?
              'unlimited' :
              (gui.hSI(stats.pixelLimit)+'px'));
    }
    else
    {
      $('#userImageNumber')
        .empty();
      $('#userDiskUsed')
        .empty()
        .removeClass('limit-exceeded');
      $('#userDiskLimit')
        .empty();
      $('#userPixelUsed')
        .empty()
        .removeClass('limit-exceeded');
      $('#userPixelLimit')
        .empty();
    }
  }

  function refreshUserStats()
  {
    loginConsole.ajax('/upload/getUserStats',
                      function(data)
                      {
                        if (data.status)
                        {
                          setUserStats(data.data);
                        }
                        else
                        {
                          console.error(data.message);
                          setUserStats();
                        }
                      });
  }

  $('#userStatsRefresh').click(refreshUserStats);

  scope
    .registerChange(function(value)
    {
      if (value == 'user')
      {
        $('#changePassword .personalDataVals').val('');
        $('#changePassword .formErrorMessages').empty();
      }
    }, 'interfaceMode')
    .registerChange(function(login)
    {
      if (login == null)
      {
        setUserStats();
      }
      else
      {
        refreshUserStats();
      }
    }, 'login');


  $('#changePassword').bind('submit', function()
  {     
    var oldPassword = $('#oldPassword').val();
    var newPassword = $('#newPassword').val();
    var passwordRetype = $('#newPasswordRetype').val();
    var valid = true;

    $('#changePassword .formErrorMessages').empty();
    if (oldPassword == '')
    {
      $('#oldPasswordFieldError').text("Confirm change with your password.");
      valid = false;
    }

    if (newPassword == '')
    {
      $('#newPasswordFieldError').text("Provide the new password.");
      valid = false;
    }

    if (passwordRetype == '')
    {
      $('#newPasswordRetypeFieldError').text("Retype the new password.");
      valid = false;
    }
    else if (newPassword != passwordRetype)
    {
      $('#newPasswordRetypeFieldError').text("New passwords do not match.");
      valid = false;
    }

    if (valid)
    {
      loginConsole.ajax('/user/changePassword',
                        function(data)
                        {
                          if (data.status == true)
                          {
                            $('#newPasswordFieldError').text("Password changed successfully.");
                          }
                          else
                          {
                            $('#newPasswordFieldError').text(data.message);
                          }
                        },
                        {
                          oldPassword: oldPassword,
                          newPassword: newPassword,
                          passwordRetype: passwordRetype
                        });
    }

    return false;
  });
}

function initUserFinish(state)
{
  if (state.user)
  {
    switch (state.user)
    {
      case 'confirm':
        loginConsole.showConfirmationFormHandler(null, state.login, state.confirm);
        loginConsole.confirmRegistration(state.login, state.confirm);
        break;

      case 'regenerate':
        loginConsole.showRegeneratePasswordFinalForm(state.login, null, state.confirm);
        loginConsole.showPanel();
        break;
    }
  }
}
