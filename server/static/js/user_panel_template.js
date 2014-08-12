/*****************************************************************************\
*                                                                             *
*    This file is part of BrainSlices Software                                *
*                                                                             *
*    Copyright (C) 2013 J. M. Kowalski, J. Potworowski                        *
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
function personalDataDivHide()
{
  changePasswordHide();
  $('#personalDataDiv').hide();
}

function changePasswordHide()
{
  $('#changePasswordDiv').hide();
  $('.personalDataVals').val('');
  $('.personalDataVals').text('');
  $('#changePassword').text('Change Password (click to show)');
}

function showLoginPanel()
{
  loginConsole.showPanel();
}

function showPersonalDataDiv()
{
  if (loginConsole.isLogged())
  {
    $('#welcomeDiv').hide();
    $('#personalDataDiv').show();
  }
  else
  {
    loginConsole.showPanel(showPersonalDataDiv);
  }
}


$(function()
{
  loginConsole = new BrainSlices.ajax.CUserPanel(
                     $('#userPanel'),
                     $('#loginLink'),
                     $('#logoutLink'),
                     function()
                     {
                       $('#helloMessage').text('Logged as ' + loginConsole.isLoggedAs());
                     },
                     function()
                     {
                       $('#helloMessage').text('Not logged in');
                       personalDataDivHide();
                     },
                     null,
                     function()
                     {
                       $('.formErrorMessages').text(''); //XXX: is necessary?
                     });

  if (!mode)
  {
    mode = 'normal';
  }

  if (mode == 'normal')
  {
    $('#helloMessage').text('Not logged in');
  }
  else if (mode == 'confirmation')
  {
    $('#helloMessage').text('Logged in')
  }
  else if (mode == 'regeneration')
  {
    loginConsole.showRegeneratePasswordFinalForm(
      login,
      'Your identity has been confirmed. Provide a new password, please.',
      confirmId);
  }
  else if (mode == 'regeneration failed')
  {
    $('#welcomeDiv').hide();
    $('#regeneratePasswordFail').show();
  }
  else
  {
    alert(mode);
  }

  $('#welcomeLink').click(function()
  {
    $('#welcomeDiv').show();
    personalDataDivHide();
  });

  $('#personalDataLink').bind('click', showPersonalDataDiv);

  $('#changePassword').click(function()
  {
    if ($('#changePasswordDiv').is(":visible")){
      $('#changePasswordDiv').hide();
      $('#changePassword').text('Change Password (click to show)');
      $('.personalDataVals').text('');
      $('.personalDataVals').val('');
    } else {

      $('#changePasswordDiv').show();
      $('#changePassword').text('Change Password (click to hide)');
    }
  });

  $('#changePasswordButton').click(function()
  {     
    var oldPassword = $('#oldPassword').val();
    var newPassword = $('#newPassword').val();
    var passwordRetype = $('#newPasswordRetype').val();

    if (newPassword != passwordRetype)
    {
      $('#newPasswordFieldError').text("Passwords do not match.");
    }
    else
    {
      loginConsole.ajax('changePassword',
                        function(data)
                        {
                          if (data.status == true)
                          {
                            alert('password changed!');
                            changePasswordHide();
                          }
                          else
                          {
                            alert(data.message);
                          }
                        },
                        {
                          oldPassword: oldPassword,
                          newPassword: newPassword,
                          passwordRetype: passwordRetype
                        });
    }
  });

});