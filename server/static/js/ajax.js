		$('document').ready(function() {
        $('#loggedDiv').hide();
        $('#registerDiv').hide();
				$('#changePasswordDiv').hide();
				$('#passwordChangeSuccessDiv').hide();
				$('#registrationOkDiv').hide();
  		

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
