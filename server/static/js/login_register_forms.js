/*****************************************************************************\
*                                                                             *
*    This file is part of BrainSlices Software                                *
*                                                                             *
*    Copyright (C) 2013 J. Potworowski                                        *
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
    $('document').ready(function() {
        $('#loginDiv').hide();
        $('#loggedDiv').hide();
        $('#registerDiv').hide();
        $('#changePasswordDiv').hide();
        $('#passwordChangeSuccessDiv').hide();
        $('#registrationOkDiv').hide();
      
    $('#loginRegister').click(function()
      {
        $('#loginDiv').show();
      }
    );

    $('#registerButton').click(function() 
        {
            $('.loginForm').val('');
            $('#loginDiv').hide();
            $('#registerDiv').show();
            $('.loginMessages').text('');
        });

    $('#registerSubmit').click(function() 
    {
        var login = encodeURIComponent($('#newLogin').val());
        var nPassword =  encodeURIComponent($('#registerPassword').val());
        var cPassword =  encodeURIComponent($('#confirmPassword').val());
        var name = encodeURIComponent($('#name').val());
        var eMail = encodeURIComponent($('#eMail').val());
        if ((nPassword == cPassword)){
            $.ajax({
              type: 'POST',
              url: 'registerUser',
              data: 'login='+login+'&password='+nPassword+'&password2='+cPassword+'&name='+name+'&email='+eMail,
              dataType: 'json',
              success: function(data)
              {
                if (data.status == true)
                {
                  $('#registerDiv').hide();
                  $('#registrationOkDiv').show();
                  $('#dontMatch').text('');
                  $('.registerForm').val('');
                }
                else
                {
                  $('#dontMatch').text("login or email already registered");
                }
              },
              error: ajaxErrorHandler
            });
        } else {
            $('#dontMatch').text("Passwords don't match");
            $('#registerPassword').val('');
            $('#confirmPassword').val('');
        } 
        
    });

    $('#backFromRegistrationOkDiv').click(function()
      {
        $('#registrationOkDiv').hide();
        $('#loginDiv').show();
      }
    );

    $('#button').click(function() 
    {
      var login = encodeURIComponent($('#login').val());
      var password = encodeURIComponent($('#password').val());
      
        $('#login').val('');
        $('#password').val('');    
        $.ajax({
          type: 'POST',
          url: 'login',
          data: 'login=' + login + '&password=' + password ,
          dataType: 'json',
          success: function(data)
          {
            if (data.status == true)
            {
              $('#badPass').text("");
              $('#loginDiv').hide();
              $('#loggedDiv').show();
              $('#welcome').text("hello " + data.data);
              $('#loggedOutMessage').text('');
              $('#login').text('');
              $('#password').text('');
            }
            else
            {         
              $('#badPass').text(data.message);
              $('#loggedOutMessage').text('');
            }
          },
          error: ajaxErrorHandler
        });
    }
    );

    $('#logout').click(function() 
    {
        $.ajax(
        {
            type: 'POST',
            url: 'logout',
            data: '',
            dataType:'json',
            success: function(data)
            {
                $('#loggedDiv').hide();
                $('#loginDiv').show();
                $('#loggedOutMessage').text(data.message);
            }
        });
    });

    $('#backFromRegister').click(function()
    {
      $('.registerForm').val('');
      $('#dontMatch').text('');
      $('#registerDiv').hide();
      $('#loginDiv').show();
    }
    );

    $('#registerButton').click(function() 
        {
            $('#loginDiv').hide();
            $('#registerDiv').show();
            return false;
        });

    $('#changePassword').click(function()
      {
        $('#loggedDiv').hide();
        $('#changePasswordDiv').show();
      }
    );


    $('#backFromChangePassword').click(function()
      {
        $('#changePasswordDiv').hide();
        $('#loggedDiv').show();

        $('.chPassEditField').val('');
        $('.changePasswordMessages').text('');
      }
    );

    $('#changePasswordButton').click(function()
      {
        var oldPassword = $('#oldPassword').val();
        var newPassword = $('#newPassword').val();
        var passwordRetype = $('#passwordRetype').val();
        if (newPassword != passwordRetype){
          $('#badConfirmPass').text('passwords dont match');
        } else {
            $.ajax({
              type: 'POST',
              url: 'changePassword',
              data: '&oldPassword='+oldPassword+'&newPassword='+newPassword+'&passwordRetype='+passwordRetype,
              dataType: 'json',
              success: function(data)
              {
                if (data.status == true)
                {
                  $('#changePasswordDiv').hide();
                  $('#passwordChangeSuccessDiv').show();
                  $('.chPassEditField').val('');
                  $('.changePasswordMessages').text('');
                }
                else
                {
                  $('#badOldPassword').text("not a success :(");
                }
              },
              error: ajaxErrorHandler
            });
          } 
       } 
    );

  $('#backFromPassChangeSuccess').click(function()
    {
      $('#passwordChangeSuccessDiv').hide();
      $('#loggedDiv').show();
    }
  );


});
