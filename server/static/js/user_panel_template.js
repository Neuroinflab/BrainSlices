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
  $('#welcomeDiv').hide();
  $('#personalDataDiv').show();
}


$(function()
{
  $('#userPanel').hide();
  $('#registerDiv').hide();
  $('#regeneratePasswordDiv').hide();
  $('#successDiv').hide();
  //$('#logoutLink').hide();

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
    //$('#logoutLink').show();
    //$('#loginLink').hide();
    $('#helloMessage').text('Logged in')
  }
  else if (mode == 'regeneration')
  {
    $('#welcomeDiv').hide();
    $('#regeneratePasswordFinalDiv').show();
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
  }
  );

  loginConsole = new CLoginConsole($('#userPanel'), $('#loginLink'), $('#logoutLink'),
                     function()
                     {
                       $('#helloMessage').text('Logged as ' + loginConsole.isLoggedAs());
                       $('#personalDataLink').unbind('click', showLoginPanel);
                       $('#personalDataLink').bind('click', showPersonalDataDiv);
                     },
                     function()
                     {
                       $('#helloMessage').text('Not logged in');
                       personalDataDivHide();
                       $('#personalDataLink').unbind('click', showPersonalDataDiv);
                       $('#personalDataLink').bind('click', showLoginPanel);
                     },
                     null,
                     function()
                     {
                       $('#loginDiv').show();
                       $('#registerDiv').hide();
                       $('.formErrorMessages').text(''); //XXX: is necessary?
                       $('#successDiv').hide('');
                       $('#regeneratePasswordDiv').hide('');
                       $('.regenerateForm').val('');
                     });

  $('#registerButton').click(function() 
  {
    $('.loginForm').val('');
    $('#loginDiv').hide();
    $('#registerDiv').show();
    $('.loginMessages').text('');
    $('.formErrorMessages').text('');
  });

  $('form[name="registerForm"]').bind('submit',
  function() 
  {
    var login = $('#newLogin').val().trim();
    var nPassword = $('#registerPassword').val();
    var cPassword = $('#confirmPassword').val();
    var name = $('#name').val().trim();
    var eMail = $('#eMail').val().trim();

    $('form[name="registerForm"] .formErrorMessages').hide().text('');
    var permissionToGo = true;
    if (!validLogin(login))
    {
      $('#newLoginFieldError').show().text('Provide a valid login.');
      permissionToGo = false;
    }

    if (nPassword == '')
    {
      $('#newPasswordFieldError').show().text('Provide a password.');
      permissionToGo = false;
    }

    if (cPassword == '')
    {
      $('#confirmPasswordFieldError').show().text('Confirm the password.');
      permissionToGo = false;
    }

    if (name == '')
    {
      $('#nameFieldError').show().text('Provide a name.');
      permissionToGo = false;
    }

    if (nPassword != cPassword)
    {
      $('#confirmPasswordFieldError').show().text("Passwords do not match.");
      permissionToGo = false;
    }

    if (!validEmail(eMail,
                    permissionToGo ?
                    "Provided e-mail address is very unusual:\n"
                    + eMail + "\n"
                    + "- do you want to continue with it?" :
                    null))
    {
      $('#eMailFieldError').show().text('Provide a valid e-mail address.');
      permissionToGo = false;
    }

    if (permissionToGo)
    {
      loginConsole.ajax('/user/registerUser',
                        function(response)
                        {
                          if (response.status)
                          {
                            $('#registerDiv').hide();
                            $('#successDiv p').html(response.message)
                            $('#successDiv').show();
                            $('.registerForm').val('');
                          }
                          else
                          {
                            $('#registrationError').show().text(response.message);
                          }
                        },
                        {
                          login: login,
                          password: nPassword,
                          password2: cPassword,
                          name: name,
                          email: eMail
                        });
    }

    return false;
  });

  $('#backFromRegistrationOkDiv').click(function()
  {
    $('#successDiv').hide();
    $('#loginDiv').show();
  });

  $('#backFromRegister').click(function()
  {
    $('.registerForm').val('');
    $('#dontMatch').text('');
    $('#registerDiv').hide();
    $('#loginDiv').show();
  });

  $('#regeneratePasswordButton').click(function()
  {
    $('.loginForm').val('');
    $('#loginDiv').hide();
    $('.loginMessages').text('');
    $('.formErrorMessages').text('');
    $('#regeneratePasswordDiv').show();
  });

  $('form[name="regeneratePasswordForm"]').bind('submit',
  function()
  {
    $('form[name="regeneratePasswordForm"] .formErrorMessages').hide().text('');
    var login = $('#regenerateLogin').val().trim();
    var email = $('#regenerateEmail').val().trim();

    var permissionToGo = true;
    if (!validLogin(login))
    {
      $('#regenerateLoginError').show().text('Provide a valid login.');
      permissionToGo = false;
    }

    if (!validEmail(email,
                    permissionToGo ?
                    "Provided e-mail address is very unusual:\n"
                    + email + "\n"
                    + "- do you want to continue with it?" :
                    null))
    {
      $('#regenerateEmailError').show().text('Provide a valid e-mail address.');
      permissionToGo = false;
    }

    if (permissionToGo)
    {


      loginConsole.ajax('/user/regeneratePassword',
                        function(response)
                        {
                          if (response.status)
                          {
                            $('#regeneratePasswordDiv').hide();
                            $('#successDiv p').html(response.message);
                            $('#successDiv').show();
                            $('.regenerateForm').val('');
                          }
                          else
                          {
                            $('#regenerationError').show().html(response.message);
                          }
                        },
                        {
                          login: login,
                          email: email
                        });
    }

    return false;
  });

  $('#backFromRegenerate').click(function()
    {
      $('.regenerateForm').val('');
      $('#regeneratePasswordDiv').hide();
      $('#loginDiv').show();
    });

/**********************************************/

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
      $('#newPasswordFieldError').text("Passwords don't match");
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

  $('#regenerateFinalise').click(function()
  {
    var password = $('#regeneratePassword').val();
    var password2 = $('#regeneratePasswordRetype').val();
    var permissionToGo = true;
    
    $('#regeneratePasswordFieldError').text('');
    $('#regeneratePasswordiRetypeFieldError').text('');

    if (password != password2)
    {
      $('#regeneratePasswordFieldError').text("Passwords do not match.");
      permissionToGo = false;
    }

    if (password == '')
    {
      $('#regeneratePasswordFieldError').text("Provide a new password.");
      permissionToGo = false;
    }

    if (password2 == '')
    {
      $('#regeneratePasswordFieldError').text("Confirm the password.");
      permissionToGo = false;
    }
    
    if (permissionToGo)
    {
      var confirmId = $('#confirmIdForRegenerate').val(); 
      var login = $('#loginForRegenerate').val();

      loginConsole.ajax('changePasswordRegenerate',
                        function(response)
                        {
                          alert(response.message);
                        },
                        {
                          login: login,
                          confirm: confirmId,
                          password: password,
                          password2: password2
                        });

    }

  });

});
