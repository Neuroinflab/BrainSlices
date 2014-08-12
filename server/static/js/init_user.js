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

  scope
    .registerChange(function(value)
    {
      if (value == 'user')
      {
        //$('#changePassword .personalDataVals').text('');
        $('#changePassword .personalDataVals').val('');
      }
    }, 'interfaceMode');


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

/*      case 'confirmed':
        alertWindow.success('Thank you for registration in our service.<br>'
                          + 'Your account has been successfully activated.');
        break;

      case 'confirmationfailed':
        alertWindow.error('Confirmation failed.<br>'
                        + 'Please check your credentials carefully.');
        break;*/
    }
  }

  /*
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
  */
}
