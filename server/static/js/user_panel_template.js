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


$('document').ready(function()
{

  $('#userPanel').hide();
  $('#registerDiv').hide();
  $('#regeneratePasswordDiv').hide();
  $('#registrationOkDiv').hide();
  $('#logoutLink').hide();
  $('#personalDataDiv').hide();
  $('#regeneratePasswordFinalDiv').hide();

  if (!mode)
  {
    var mode = 'normal';
  }

  if (mode == 'normal'){
    $('#helloMessage').text('Not logged in');
  } else if (mode == 'confirmation'){
    $('#logoutLink').show();
    $('#loginLink').hide();
    $('#helloMessage').text('Logged in')
  } else if(mode == 'regeneration'){
    $('#welcomeDiv').hide();
    $('#regeneratePasswordFinalDiv').show();
  }


  $('#welcomeLink').click(function()
  {
    $('#welcomeDiv').show();
    personalDataDivHide();
  }
  );

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
  }
  );

  $('#changePasswordButton').click(function()
  {     
    var oldpass = /*encodeURIComponent(*/$('#oldPassword').val()/*)*/;
    var npass = /*encodeURIComponent(*/$('#newPassword').val()/*)*/;
    var npassRetype = /*encodeURIComponent(*/$('#newPasswordRetype').val()/*)*/;

    if (npass != npassRetype)
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
                          oldPassword: oldpass,
                          newPassword: npass,
                          passwordRetype: npassRetype
                        });

      /*$.ajax({
        type: 'POST',
        url: 'changePassword', 
        data: 'oldPassword='+oldpass+'&newPassword='+npass+'&passwordRetype='+npassRetype,
        dataType: 'json',
        success: function(data)
        {
          if (data.status == true)
          {
            alert('password changed!');
            changePasswordHide();
          } else
          {
            alert(data.message);
          }
        },
        error: ajaxErrorHandler
      }
      );*/
    }
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
                       $('.formErrorMessages').text('');
                       $('#registerOkDiv').hide('');
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



  $('#registerSubmit').click(function() 
  {

    $('.formErrorMessages').text('');
    var permissionToGo = 1;
    if ($('#newLogin').val() == '')
    {
      $('#newLoginFieldError').text('provide a login');
      permissionToGo = 0;
    }

    if ($('#registerPassword').val() == '')
    {
      $('#newPasswordFieldError').text('provide a login');
      permissionToGo = 0;
    }

    if ($('#confirmPassword').val() == '')
    {
      $('#confirmPasswordFieldError').text('confirm new password');
      permissionToGo = 0;
    }

    if ($('#name').val() == '')
    {
      $('#nameFieldError').text('provide a name');
      permissionToGo = 0;
    }
    if ($('#registerPassword').val() == '')
    {
      $('#newPasswordFieldError').text('provide a login');
      permissionToGo = 0;
    }
    if ($('#eMail').val() == '')
    {
      $('#eMailFieldError').text('provide an e-mail');
      permissionToGo = 0;
    }

    if (nPassword != cPassword)
    {
      $('#confirmPasswordFieldError').text("password and confirmation don't match");
      permissionToGo = 0;
    }

    var login = /*encodeURIComponent(*/$('#newLogin').val()/*)*/;
    var nPassword =  /*encodeURIComponent(*/$('#registerPassword').val()/*)*/;
    var cPassword =  /*encodeURIComponent(*/$('#confirmPassword').val()/*)*/;
    var name = /*encodeURIComponent(*/$('#name').val()/*)*/;
    var eMail = /*encodeURIComponent(*/$('#eMail').val()/*)*/;
  
    if (nPassword == cPassword)
    {
      loginConsole.ajax('registerUser',
                        function(response)
                        {
                          if (response.status)
                          {
                            $('#registerDiv').hide();
                            $('#registrationOkDiv').show();
                            $('.registerForm').val('');
                          }
                          else
                          {
                            alert(response.message);
                          }
                        },
                        {
                          login: login,
                          password: nPassword,
                          password2: cPassword,
                          name: name,
                          email: eMail
                        });
//        $.ajax({
//          type: 'POST',
//          url: 'registerUser',
//          data: 'login='+login+'&password='+nPassword+'&password2='+cPassword+'&name='+name+'&email='+eMail,
//          dataType: 'json',
//          success: function(data)
//          {
//            if (data.status == true)
//            {
//              $('#registerDiv').hide();
//              $('#registrationOkDiv').show();
//              $('.registerForm').val('');
//            }
//            else
//            {
//            /*  $('#newLoginFieldError').text(data.message);*/
//            alert(data.message);
//            }
//
//          },
//          error: ajaxErrorHandler
//        });
    
    } 
      
  });

  $('#backFromRegistrationOkDiv').click(function()
    {
      $('#registrationOkDiv').hide();
      $('#loginDiv').show();
    }
  );

  $('#backFromRegister').click(function()
    {
      $('.registerForm').val('');
      $('#dontMatch').text('');
      $('#registerDiv').hide();
      $('#loginDiv').show();
    }
    );

  $('#regeneratePasswordButton').click(function()
  {
    $('.loginForm').val('');
    $('#loginDiv').hide();
    $('.loginMessages').text('');
    $('.formErrorMessages').text('');
    $('#regeneratePasswordDiv').show();
  });

  $('#regenerateSubmit').click(function()
  {
    $('.regenerationFieldsErrors').text('');
    var permissionToGo = 1;
    if ($('#regenerateLogin').val() == ''){
      $('#regenerateLoginError').text('login?');
      permissionToGo = 0;
    }

    if ($('#regenerateEmail').val() == ''){
      $('#regenerateEmailError').text('e-mail?');
      permissionToGo = 0;
    }

    if (permissionToGo == 1)
    {
      alert('idzie!');
      var login = /*encodeURIComponent(*/$('#regenerateLogin').val()/*)*/;
      var email = /*encodeURIComponent(*/$('#regenerateEmail').val()/*)*/;

      loginConsole.ajax('regeneratePassword',
                        function(response)
                        {
                          alert(response.message);
                        },
                        {
                          login: login,
                          email: email
                        });

//      $.ajax({
//        type: 'POST',
//        url: 'regeneratePassword',
//        data: 'login='+login+'&email='+email,
//        dataType: 'json',
//        success: function(data)
//        {
//          if (data.status == true)
//          {
//            alert(data.message);
//          }
//          else
//          {
//            alert(data.message);
//          }
//        },
//        error: ajaxErrorHandler
//
//      });
    }

  }
  );

  $('#regenerateFinalise').click(function()
  {
    var npass = encodeURIComponent($('#regeneratePassword').val());
    alert(npass);
    var npassRetype =  encodeURIComponent($('#regeneratePasswordRetype').val());
    var permissionToGo = 1;
    
    $('#regeneratePasswordFieldError').text('');
    $('#regeneratePasswordiRetypeFieldError').text('');

    if (npass != npassRetype){
      $('#regeneratePasswordFieldError').text("Passwords don't match");
      permissionToGo = 0;
    }

    if (npass = ''){
      $('#regeneratePasswordFieldError').text("enter a password");
      permissionToGo = 0;
    }

    if (npassRetype = ''){
      $('#regeneratePasswordFieldError').text("Retype");
      permissionToGo = 0;
    }
    
    if (permissionToGo == 1){
      var confirmId = $('#confirmIdForRegenerate').val(); 
      var login = $('#loginForRegenerate').val();
      var npass = /*encodeURIComponent(*/$('#regeneratePassword').val()/*)*/;

      loginConsole.ajax('changePasswordRegenerate',
                        function(response)
                        {
                          alert(response.message);
                        },
                        {
                          login: login,
                          confirmId: confirmId,
                          npass: npass
                        });

//      $.ajax({
//        type: 'POST',
//        url: 'changePasswordRegenerate',
//        data: 'login='+login+'&confirmId='+confirmId+'&npass='+npass,
//        dataType: 'json',
//        success: function(data)
//        {
//          if (data.status == true)
//          {
//            alert(data.message);
//          }
//          else
//          {
//            alert(data.message);
//          }
//        },
//        error: ajaxErrorHandler
//        
//        });
    }

  }
  );

  $('#backFromRegenerate').click(function()
    {
      $('.regenerateForm').val('');
      $('#regeneratePasswordDiv').hide();
      $('#loginDiv').show();
    }
    );


});
