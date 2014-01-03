/* File: ajax.js */
/*****************************************************************************\
*                                                                             *
*    This file is part of BrainSlices Software                                *
*                                                                             *
*    Copyright (C) 2012-2013 J. M. Kowalski, J. Potworowski                   *
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
(function(BS, $, undefined)
{
  var ajax = BS.ajax;
  var validEmail = BS.forms.validEmail;
  var validLogin = BS.forms.validLogin;

  /**
   * Class: CAjaxProvider
   *
   * A class of objects that provide basic ajax interface (in way used by more
   * sophisticated objects.
   *
   * Attributes:
   *   destroyed - A flag indicating if the object is awaiting for destruction
   *               (AJAX requests are disabled). Boolean
   *   awaiting - A number of ongoing AJAX requests. Integer
   *   ondestroy - A function to be called when destroyed and all triggered AJAX
   *             requests returned.
   *
   ***************************************************************************
   * Constructor: CCAjaxProvider
   *
   * Initialize the object.
   *
   * Parameters:
   *   ondestroy - A function to be called when destroyed and all triggered AJAX
   *             requests returned.
  \***************************************************************************/
  if (ajax.CAjaxProvider == null)
  {
    ajax.CAjaxProvider = function(ondestroy)
    {
      this.destroyed = false;
      this.awaiting = 0;
      this.ondestroy = ondestroy;
    }

    ajax.CAjaxProvider.prototype =
    {
      /**
       * Method: ajax
       *
       * Send an AJAX request to the server, pass the received JSON object to the
       * provided handler.
       *
       * Parameters:
       *   url - An URL of the requested resource. String
       *   successHandler - A handler of the successful AJAX request execution.
       *   data - Optional data for the AJAX request.
       *   errorHandler - An optional handler of the AJAX request execution error.
       *   type - An HTTP method of the request. 'POST' by default. String.
       *   options - Any other jQuery.ajax options.
      \***************************************************************************/
      ajax: function(url, successHandler, data, errorHandler, type, options)
      {
        var thisInstance = this;
        if (!(this.destroyed))
        {
          var ajaxData = {
            type: type == null ? 'POST' : type,
            url: url,
            dataType: 'json',
            error: errorHandler != null ? errorHandler : ajax.errorHandler,
            success: successHandler,
            complete: function(jqXHR, textStatus)
                      {
                        //notify the object about completion of the AJAX request
                        thisInstance.awaiting--;

                        if (thisInstance.destroyed && thisInstance.awaiting == 0)
                        {
                          //if the object is marked as destroyed and there is
                          //no AJAX requests in progress - trigger the delayed
                          //object destruction
                          thisInstance.destroy();
                        }
                      }
          };

          if (options)
          {
            $.extend(ajaxData, options); // Merge all other options passed as is
          }

          if (data != null)
          {
            ajaxData.data = data;
          }

          this.awaiting++;

          return $.ajax(ajaxData);
        }
      },

      /**
       * Destructor: destroy
       *
       * Prepare the object for being disposed.
      \***************************************************************************/
      destroy: function()
      {
        this.destroyed = true; //mark the object as destroyed
        if (this.awaiting == 0 && this.ondestroy != null)
        {
          this.ondestroy();
          this.ondestroy = null;
        }
      }
    }
  }


  /**
   * Class: CLoginManager
   *
   * A class of objects that store (and monitors) information about session
   * state at client side.
   *
   * Attributes:
   *   logged - State of the session (true if logged, false if not, null if
   *            the state is unknown just after instantatiation of the
   *            object). Boolean
   *   loggedAs - Login if logged, null otherwise. String
   *   onlogin - Triggers to be executed when the state changes to logged
   *             (both after login and instantation of the object).
   *             Array of functions
   *   onlogout - Triggers to be executed when the state changes to not logged
   *              (both after logout  and instantation of the object).
   *              Array of functions
   *#  destroyed - A flag indicating if the object is awaiting for destruction
   *#              (AJAX requests are disabled). Boolean
   *#  awaiting - A number of ongoing AJAX requests. Integer
   *   ajaxProvider - An object of <CAjaxProvider> class.
   *
   ***************************************************************************
   * Constructor: CLoginManager
   *
   * Initialize the object.
   *
   * Parameters:
   *   onlogin - Trigger(s) to be executed when the state changes to logged
   *             (both after login and instantation of the object).
   *             function or Array of functions or null or undefined
   *   onlogout - Trigger(s) to be executed when the state changes to not
   *              logged (both after logout and instantation of the object).
   *              function or Array of functions or null or undefined
   *   finalFunction - Trigger to be executed when the state of session is
   *                   known (after login and instantation of the object).
   *                   function or null or undefined
  \***************************************************************************/
  if (ajax.CLoginManager == null)
  {
    ajax.CLoginManager = function(onlogin, onlogout, finalFunction)
    {
      this.logged = null;
      this.loggedAs = null;

      this.onlogin = onlogin == null ? [] : (onlogin instanceof Array ?
                                             onlogin.slice(0) :
                                             [onlogin]);
      this.onlogout = onlogout == null ? [] : (onlogout instanceof Array ?
                                               onlogout.slice(0) :
                                               [onlogout]);

      var thisInstane = this;
      this.ajaxProvider = new ajax.CAjaxProvider(function()
                                                 {
                                                   thisInstane.onlogin = [];
                                                   thisInstane.onlogout = [];
                                                 });
    //  this.destroyed = false;
    //  this.awaiting = 0;
      this.checkLogged(finalFunction);
    }

    ajax.CLoginManager.prototype =
    {

      /**
       * Method: ajax
       *
       * Send an AJAX request to the server, check the received
       * <standart JSON object> for session state information, then pass it to the
       * provided handler.
       *
       * Parameters:
       *   url - An URL of the requested resource. String
       *   successHandler - An optional handler of the successful AJAX request
       *                    execution.
       *   data - Optional data for the AJAX request.
       *   errorHandler - An optional handler of the AJAX request execution error.
       *   type - An HTTP method of the request. 'POST' by default. String.
       *   options - Any other jQuery.ajax options.
      \***************************************************************************/
      ajax:
      function(url, successHandler, data, errorHandler, type, options)
      {
        var thisInstance = this;
        return this.ajaxProvider.ajax(url,
                            function(response)
                            {
                              if (response.logged && thisInstance.logged != true)
                              {
                                //thisInstance.logged = true;
                                thisInstance.checkLogged();
                              }
                              else if (!response.logged && thisInstance.logged != false)
                              {
                                thisInstance.logoutHandler();
                              }

                              if (successHandler != null)
                              {
                                successHandler(response);
                              }
                            },
                            data, errorHandler, type, options);
      },

      /**
       * Method: checkLogged
       *
       * Check the session state (logged in/logged out) with an AJAX request for
       * URL '/user/logged'.
       *
       * Parameters:
       *   finalFunction - A function to be called with a response as its argument
       *                   after the session state has been updated.
      \***************************************************************************/
      checkLogged:
      function(finalFunction)
      {
        var thisInstance = this;
        this.ajaxProvider.ajax('/user/logged', function(response)
          {
            if (response.logged)
            {
              thisInstance.loginHandler(response.data);
            }
            else if (thisInstance.logged != false)
            {
              thisInstance.logoutHandler();
            }

            if (finalFunction != null)
            {
              finalFunction(response);
            }
          }
        );
      },

      /**
       * Method: loginHandler
       *
       * Change session state to logged in and trigger onlogin handlers execution.
       *
       * Parameters:
       *   login - User's login. String.
      \***************************************************************************/
      loginHandler:
      function(login)
      {
        this.logged = true;
        this.loggedAs = login;

        for (var i = 0; i < this.onlogin.length; i++)
        {
          this.onlogin[i]();
        }
      },

      /**
       * Method: logoutHandler
       *
       * Change session state to logged out and trigger onlogout handlers
       * execution.
      \***************************************************************************/
      logoutHandler:
      function()
      {
        this.logged = false;
        this.loggedAs = null;

        for (var i = 0; i < this.onlogout.length; i++)
        {
          this.onlogout[i]();
        }
      },

      /**
       * Destructor: destroy
       *
       * Prepare the object for being disposed.
      \***************************************************************************/
      destroy:
      function()
      {
        this.ajaxProvider.destroy();
      //  this.destroyed = true; //mark the object as destroyed
      //
      //  if (this.awaiting == 0)
      //  {
      //    //if there is no AJAX requests in progress destroy the object immediately
      //    this.onlogin = [];
      //    this.onlogout = [];
      //  }
      },

      /**
       * Method: login
       *
       * Login to the service.
       *
       * Parameters:
       *   login - An user's login. String
       *   password - An user's password. String
       *   onSuccess - An optional handler of successfull login. function
       *   onFailure - An optional handler of unsuccessfull login. function
      \***************************************************************************/
      login:
      function(login, password, onSuccess, onFailure)
      {
        var thisInstance = this;

        this.ajaxProvider.ajax('/user/login', function(response)
          {
            if (response.logged)
            {
              if (thisInstance.logged && thisInstance.loggedAs != response.data)
              {
                thisInstance.logoutHandler();
              }

              if (!thisInstance.logged)
              {
                thisInstance.loginHandler(response.data);
              }

              if (onSuccess != null)
              {
                onSuccess(response);
              }
            }

            if (!response.logged && onFailure != null)
            {
              onFailure(response);
            }
          },
          {
            login: login,
            password: password
          });
      },

      /**
       * Method: logout
       *
       * Logout from the service.
       *
       * Parameters:
       *   finalFunction - A function to be called after the successful logout.
      \***************************************************************************/
      logout:
      function(finalFunction)
      {
        this.ajax('/user/logout', finalFunction);
      },

      /**
       * Method: isLogged
       *
       * Check the session state.
       *
       * Returns:
       *   True if the user is logged, false otherwise.
      \***************************************************************************/
      isLogged:
      function()
      {
        return this.logged && this.loggedAs != null;
      },

      /**
       * Method: isLoggedAs
       *
       * Check the useri's login.
       *
       * Returns:
       *   The user's login. String
      \***************************************************************************/
      isLoggedAs:
      function()
      {
        return this.loggedAs;
      }
    }
  }


  /**
   * Class: CLoginConsole
   *
   * A class of objects that
   *   - store and monitors information about session state at client side,
   *   - handle login panel window interaction with user.
   *
   * Attributes:
   *   $controlPanel - A jQuery object representing the login panel window.
   *   panelShowButtonHandler - See <panelShowButtonHandler>. function
   *   $panelShowButton - A jQuery object representing the login button.
   *   logoutButtonHandler - See <logoutButtonHandler>. function
   *   $logoutButton - A jQuery object representing the logout button.
   *   loginManager - A <CLoginManager> object monitoring the session state.
   *   closeManager - A <CCloseableDiv> object managing the login panel window
   *                  opening and closing.
   *   onLogin - A function to be called when successfully logged in with GUI
   *             (being erased after control panel is closed).
   ***************************************************************************
   * Constructor: CLoginConsole
   *
   * Parameters:
   *   $controlPanel - A jQuery object representing the login panel window.
   *   $panelShowButton - A jQuery object representing the login button.
   *   $logoutButton - A jQuery object representing the logout button.
   *   onlogin - Trigger(s) to be executed when the state changes to logged
   *             (both after login and instantation of the object).
   *             function or Array of functions or null or undefined
   *   onlogout - Trigger(s) to be executed when the state changes to not
   *              logged (both after logout and instantation of the object).
   *              function or Array of functions or null or undefined
   *   finalFunction - A trigger to be executed when the state of session is
   *                   known (after login and instantation of the object).
   *                   function or null or undefined
   *   onClose - A trigger to be executed when the login panel window is
   *             closed. function or null or undefined
  \***************************************************************************/
  if (ajax.CLoginConsole == null)
  {
    ajax.CLoginConsole = function($controlPanel, $panelShowButton,
                                  $logoutButton, onlogin, onlogout,
                                  finalFunction, onClose)
    {
      this.onLogin = null;
      this.$controlPanel = $controlPanel;

      var thisInstance = this;

      /**
       * Function: panelShowButtonHandler
       *
       * Show the login panel window.
       ************************************/
      this.panelShowButtonHandler = function()
      {
        thisInstance.showPanel();
      };

      this.$panelShowButton = $panelShowButton;
      this.$panelShowButton.bind('click',  this.panelShowButtonHandler);

      /**
       * Function: logoutButtonHandler
       *
       * Logout from the service.
       *********************************/
      this.logoutButtonHandler = function()
      {
        thisInstance.logout();
      }

      this.$logoutButton = $logoutButton;
      this.$logoutButton.bind('click',  this.logoutButtonHandler);

      var $form = this.$controlPanel.find('form[name="loginForm"]');

      /**
       * Function: loginButtonHandler
       *
       * Login user to the service with login and password
       * given in the form in the login panel window.
       *****************************************************/
      this.loginButtonHandler = function()
      {
        var login = $form.find('input[name="login"]').val().trim();
        var password = $form.find('input[name="password"]').val();

        thisInstance.$controlPanel.find('.formErrorMessages').hide().html('');
        var permissionToGo = true;

        if (!validLogin(login))
        {
          thisInstance.$controlPanel.find('.loginFieldError').show().html('Enter a valid login.');
          permissionToGo = false;
        }

        if (password == '')
        {
          thisInstance.$controlPanel.find('.passwordFieldError').show().html('Enter a password.');
          permissionToGo = false;
        }

        if (permissionToGo)
        {
          thisInstance.login(login, password, thisInstance.onLogin);
        }
        return false;
      }

      $form.bind('submit', this.loginButtonHandler);

      onlogin = onlogin == null ? [] : (onlogin instanceof Array ?
                                        onlogin.slice(0) : [onlogin]);
      onlogin.push(function()
      {
        thisInstance.$panelShowButton.hide();
        thisInstance.$logoutButton.show();
      });
      onlogout = onlogout == null ? [] : (onlogout instanceof Array ?
                                          onlogout.slice(0) : [onlogout]);
      onlogout.push(function()
      {
        thisInstance.$logoutButton.hide();
        thisInstance.$panelShowButton.show();
      });

      this.loginManager = new ajax.CLoginManager(onlogin, onlogout,
                                                 finalFunction);

      this.closeManager = new BS.gui.CCloseableDiv(
                                            $controlPanel, null,
                                            function()
                                            {
                                              thisInstance.$controlPanel.find('.formField').val('');
                                              thisInstance.$controlPanel.find('.formErrorMessages').hide().html('');
                                              thisInstance.onLogin = null;
                                              if (onClose != null)
                                              {
                                                onClose();
                                              }
                                            });
    }

    ajax.CLoginConsole.prototype =
    {
      /**
       * Method: showPanel
       *
       * Show the login panel window.
       *
       * Parameters:
       *   onLogin - A function to be called when successfully logged in with GUI
       *             (being erased after control panel is closed).
      \***************************************************************************/
      showPanel:
      function(onLogin)
      {
        this.onLogin = onLogin;
        this.closeManager.open();
      },

      /**
       * Destructor: destroy
       *
       * Prepare the object for being disposed.
      \***************************************************************************/
      destroy:
      function()
      {
      //warning: it can be dangerous to destroy the object if there are any async
      //events awaiting
      //TODO: provide some kind of control (like in CLoginManager)
        this.loginManager.destroy();
        this.closeManager.destroy();
        this.onLogin = null;

        this.$panelShowButton.unbind('click',  this.panelShowButtonHandler);
        this.panelShowButtonHandler = null;
        this.$logoutButton.unbind('click',  this.logoutButtonHandler);
        this.logoutButtonHandler = null;
        this.$controlPanel.find('form[name="loginForm"]').unbind('submit', this.loginButtonHandler);
        this.loginButtonHandler = null;
      },

      /**
       * Method: login
       *
       * Login to the service.
       *
       * Parameters:
       *   login - An user's login. String
       *   password - An user's password. String
       *   onSuccess - An optional handler of successfull login. function
       *   onFailure - An optional handler of unsuccessfull login. function
      \***************************************************************************/
      login:
      function(login, password, onSuccess, onFailure)
      {
        var thisInstance = this;

        this.loginManager.login(login, password,
                                function(response)
                                {
                                  if (onSuccess != null)
                                  {
                                    onSuccess(response);
                                  }
                                  thisInstance.closeManager.close();
                                },
                                function(response)
                                {
                                  if (onFailure != null)
                                  {
                                    onFailure(response);
                                  }
                                  thisInstance.$controlPanel.find('.badPass').show().html(response.message);
                                });
      },

      /**
       * Method: logout
       *
       * An alias to loginManager.logout(); see <CLoginManager.logout>.
      \***************************************************************************/
      logout:
      function()
      {
        this.loginManager.logout();
      },

      /**
       * Method: ajax
       *
       * An alias to loginManager.ajax>(url, successHandler, data, errorHandler,
       *                                type, options); see <CLoginManager.ajax>.
      \***************************************************************************/
      ajax:
      function(url, successHandler, data, errorHandler, type, options)
      {
        return this.loginManager.ajax(url, successHandler, data, errorHandler,
                                      type, options);
      },

      /**
       * Method: isLogged
       *
       * An alias to loginManager.isLogged(); see <CLoginManager.isLogged>.
      \***************************************************************************/
      isLogged:
      function()
      {
        return this.loginManager.isLogged();
      },

      /**
       * Method: isLoggedAs
       *
       * An alias to loginManager.isLoggedAs(); see <CLoginManager.isLoggedAs>.
      \***************************************************************************/
      isLoggedAs:
      function()
      {
        return this.loginManager.isLoggedAs();
      },

      logged:
      function()
      {
        console.warn('Obsolete method called - use isLogged instead!');
        //return this.loginManager.logged;
      },

      loggedAs:
      function()
      {
        console.warn('Obsolete method called - use isLoggedAs instead!');
        //return this.loginManager.loggedAs;
      }
    }
  }

  /**
   * Class: CUserPanel
   *
   * A class of objects that
   *   - store and monitors information about session state at client side,
   *   - handle logging in, user registration and password regeneration.
   *
   * Attributes:
   *   $controlPanel - A jQuery object representing the login panel window.
   *   panelShowButtonHandler - See <panelShowButtonHandler>. function
   *   $panelShowButton - A jQuery object representing the login button.
   *   loginManager - A <CLoginConsoler> object monitoring the session state
   *                  and handling control panel display.
   ***************************************************************************
   * Constructor: CUserPanel
   *
   * Parameters:
   *   $controlPanel - A jQuery object representing the login panel window.
   *   $panelShowButton - A jQuery object representing the login button.
   *   $logoutButton - A jQuery object representing the logout button.
   *   onlogin - Trigger(s) to be executed when the state changes to logged
   *             (both after login and instantation of the object).
   *             function or Array of functions or null or undefined
   *   onlogout - Trigger(s) to be executed when the state changes to not
   *              logged (both after logout and instantation of the object).
   *              function or Array of functions or null or undefined
   *   finalFunction - A trigger to be executed when the state of session is
   *                   known (after login and instantation of the object).
   *                   function or null or undefined
   *   onClose - A trigger to be executed when the login panel window is
   *             closed. function or null or undefined
  \***************************************************************************/
  if (ajax.CUserPanel == null)
  {
    ajax.CUserPanel = function ($controlPanel, $panelShowButton,
                                $logoutButton, onlogin, onlogout,
                                finalFunction, onClose)
    {
      this.$controlPanel = $controlPanel;

      var thisInstance = this;
      var $loginForm = $controlPanel.find('form[name="loginForm"]');
      var $registerForm = $controlPanel.find('form[name="registerForm"]');
      var $regenerateForm = $controlPanel.find('form[name="regeneratePasswordForm"]');
      var $regenerateFinalForm = $controlPanel.find('form[name="regeneratePasswordFinalForm"]');
      var $confirmationForm = $controlPanel.find('form[name="confirmationForm"]');
      var $success = $controlPanel.find('div>p.success');

      /**
       * Function: showRegisterForm
       *
       * Show the registration form.
       **********************************/
      this.showRegisterForm = function()
      {
        $loginForm.hide();
        $confirmationForm.hide();
        $registerForm.find('.formField').val('');
        $controlPanel.find('.formErrorMessages').html('');
        $registerForm.show();
      };

      $controlPanel.find('.showRegisterFormButton').bind('click', this.showRegisterForm);

      /**
       * Function: submitRegisterForm
       *
       * Validate and submit the registration form
       ********************************************/
      this.submitRegisterForm = function()
      {
        var login = $registerForm.find('input[name="login"]').val().trim();
        var password = $registerForm.find('input[name="password"]').val();
        var password2 = $registerForm.find('input[name="password2"]').val();
        var name = $registerForm.find('input[name="name"]').val().trim();
        var email = $registerForm.find('input[name="email"]').val().trim();

        $registerForm.find('.formErrorMessages').hide().html('');

        var permissionToGo = true;
        if (!validLogin(login))
        {
          $registerForm.find('.loginFieldError').show().html('Provide a valid login.');
          permissionToGo = false;
        }

        if (password == '')
        {
          $registerForm.find('.passwordFieldError').show().html('Provide a password.');
          permissionToGo = false;
        }

        if (password != password2)
        {
          $registerForm.find('.password2FieldError').show().html("Passwords do not match.");
          permissionToGo = false;
        }
        else if (password2 == '')
        {
          $registerForm.find('.password2FieldError').show().html('Confirm the password.');
          permissionToGo = false;
        }

        if (name == '')
        {
          $registerForm.find('.nameFieldError').show().html('Provide a name.');
          permissionToGo = false;
        }


        if (!validEmail(email,
                        permissionToGo ?
                        "Provided e-mail address is very unusual:\n"
                        + email + "\n"
                        + "- do you want to continue with it?" :
                        null))
        {
          $registerForm.find('.emailFieldError').show().html('Provide a valid e&#8209;mail address.');
          permissionToGo = false;
        }

        if (permissionToGo)
        {
          loginConsole.ajax('/user/registerUser',
                            function(response)
                            {
                              if (response.status)
                              {
                                //$registerForm.hide();
                                //$registerForm.find('.formField').val('');
                                thisInstance.showConfirmationForm(response.message, login);
    //                            $confirmationForm.find('input[name="login"]').val(login);
    //                            $confirmationForm.find('.success').html(response.message);
    //                            //$success.html(response.message).show();
     //                           $confirmationForm.show();
                              }
                              else
                              {
                                $registerForm.find('.submitError').show().html(response.message);
                              }
                            },
                            {
                              login: login,
                              password: password,
                              password2: password2,
                              name: name,
                              email: email
                            });
        }

        return false;
      };

      $registerForm.bind('submit', this.submitRegisterForm);

      /**
       * Function: showLoginForm
       *
       * Show the logging form.
       ***********************************/
      this.showLoginForm = function()
      {
        $registerForm.hide();
        $regenerateForm.hide();
        $loginForm.find('.formField').val('');
        $loginForm.show();
      };

      $controlPanel.find('.showLoginFormButton').bind('click', this.showLoginForm);

      this.showRegeneratePasswordForm = function()
      {
        $loginForm.hide();
        //$confirmationForm.hide();
        $regenerateFinalForm.hide();
        $controlPanel.find('.formErrorMessages').html('');
        $regenerateForm.find('.formField').val('');
        var login = $loginForm.find('input[name="login"]').val();
        $regenerateForm.find('input[name="login"]').val(login);
        $regenerateForm.show();
      };

      $controlPanel.find('.showRegeneratePasswordFormButton').bind('click', this.showRegeneratePasswordForm);

      this.submitRegeneratePasswordForm = function()
      {
        $regenerateForm.find('.formErrorMessages').hide().html('');
        var login = $regenerateForm.find('input[name="login"]').val().trim();
        var email = $regenerateForm.find('input[name="email"]').val().trim();

        var permissionToGo = true;
        if (!validLogin(login))
        {
          $regenerateForm.find('.loginFieldError').show().html('Provide a valid login.');
          permissionToGo = false;
        }

        if (!validEmail(email,
                        permissionToGo ?
                        "Provided e-mail address is very unusual:\n"
                        + email + "\n"
                        + "- do you want to continue with it?" :
                        null))
        {
          $regenerateForm.find('.emailFieldError').show().html('Provide a valid e-mail address.');
          permissionToGo = false;
        }

        if (permissionToGo)
        {
          loginConsole.ajax('/user/regeneratePassword',
                            function(response)
                            {
                              if (response.status)
                              {
                                $regenerateForm.hide();
                                //$success.html(response.message).show();
                                thisInstance.showRegeneratePasswordFinalForm(login, response.message);
                                //$regenerateForm.find('.formField').val('');
                              }
                              else
                              {
                                $regenerateForm.find('.submitError').show().html(response.message);
                              }
                            },
                            {
                              login: login,
                              email: email
                            });
        }

        return false;
      }

      $regenerateForm.bind('submit', this.submitRegeneratePasswordForm);

      this.showRegeneratePasswordFinalForm = function(login, message, confirm)
      {
        $regenerateForm.hide();
        $loginForm.hide();
        $controlPanel.find('.formErrorMessages').html('');
        $regenerateFinalForm.find('.formField').val('');
        $regenerateFinalForm.find('input[name="login"]').val(login != null ?
                                                             login : '');
        if (confirm != null)
        {
          thisInstance.showPanel();
          $regenerateFinalForm.find('input[name="confirm"]').val(confirm);
        }

        if (message != null)
        {
          $regenerateFinalForm.children('p').first().hide();
          $regenerateFinalForm.find('.success').html(message).show();
        }
        else
        {
          $regenerateFinalForm.find('.success').hide();
          $regenerateFinalForm.children('p').first().show();
        }
        $regenerateFinalForm.show();
      };

      this.showRegeneratePasswordFinalFormHandler = function()
      {
        thisInstance.showRegeneratePasswordFinalForm();
      }
      $controlPanel.find('.showRegeneratePasswordFinalFormButton').bind('click', this.showRegeneratePasswordFinalFormHandler);

      this.submitRegeneratePasswordFinalForm = function()
      {
        $regenerateFinalForm.find('.formErrorMessages').hide().html('');

        var login = $regenerateFinalForm.find('input[name="login"]').val().trim();
        var password = $regenerateFinalForm.find('input[name="password"]').val();
        var password2 = $regenerateFinalForm.find('input[name="password2"]').val();
        var confirm = $regenerateFinalForm.find('input[name="confirm"]').val().trim();
        var permissionToGo = true;

        if (!validLogin(login))
        {
          $regenerateFinalForm.find('.loginFieldError').show().html('Provide a valid login.');
          permissionToGo = false;
        }

        if (password == '')
        {
          $regenerateFinalForm.find('.passwordFieldError').show().html('Provide a password.');
          permissionToGo = false;
        }

        if (password != password2)
        {
          $regenerateFinalForm.find('.password2FieldError').show().html("Passwords do not match.");
          permissionToGo = false;
        }
        else if (password2 == '')
        {
          $regenerateFinalForm.find('.password2FieldError').show().html('Confirm the password.');
          permissionToGo = false;
        }

        if (confirm == '')
        {
          $regenerateFinalForm.find('.confirmFieldError').show().html('Provide a confirmation string (sent to you in an e&#8209;mail).');
          permissionToGo = false;
        }

        if (permissionToGo)
        {
          thisInstance.ajax('/user/changePasswordRegenerate',
                            function(response)
                            {
                              if (response.status)
                              {
                                $regenerateFinalForm.hide();
                                $success.html(response.message).show();
                                $regenerateFinalForm.find('.formField').val('');
                              }
                              else
                              {
                                $regenerateFinalForm.find('.submitError').show().html(response.message);
                              }
                            },
                            {
                              login: login,
                              confirm: confirm,
                              password: password,
                              password2: password2
                            });

        }

        return false;
      }

      $regenerateFinalForm.bind('submit', this.submitRegeneratePasswordFinalForm);

      this.validateConfirmationForm = function()
      {
        var confirm = $confirmationForm.find('input[name="confirm"]').val().trim();
        var login = $confirmationForm.find('input[name="login"]').val().trim();
        var valid = true;

        $confirmationForm.find('.formErrorMessages').hide().html('');
        if (!validLogin(login))
        {
          $confirmationForm.find('.loginFieldError').show().html('Provide a valid login.');
          valid = false;
        }

        if (confirm == '')
        {
          $confirmationForm.find('.confirmFieldError').show().html('Provide a confirmation string (sent to you in an e&#8209;mail).');
          valid = false;
        }

        return valid;
      }

      $confirmationForm.bind('submit', this.validateConfirmationForm);

      this.showConfirmationForm = function(message, login, sucess)
      {
        $confirmationForm.find('.formField').val('');
        if (login != null)
        {
          $confirmationForm.find('input[name="login"]').val(login);
        }

        if (message != null)
        {
          $confirmationForm.children('p').first().hide();
          $confirmationForm.find('.success').html(message).show();
        }
        else
        {
          $confirmationForm.find('.success').hide();
          $confirmationForm.children('p').first().show();
        }

        $registerForm.hide();
        $registerForm.find('.formField').val('');
        $confirmationForm.show();
      }

      this.showConfirmationFormHandler = function()
      {
        thisInstance.showConfirmationForm();
      }

      $controlPanel.find('.showConfirmationFormButton').bind('click',
        this.showConfirmationFormHandler);

      onlogin = onlogin == null ? [] : (onlogin instanceof Array ?
                                        onlogin.slice(0) : [onlogin]);
      onlogin.push(function()
      {
        $logoutButton.html('Logout [' + thisInstance.isLoggedAs() + ']');
      });

      this.loginManager = new ajax.CLoginConsole(
                                            $controlPanel, $panelShowButton,
                                            $logoutButton, onlogin, onlogout,
                                            finalFunction,
                                            function()
                                            {
                                              $loginForm.show();
                                              $registerForm.hide();
                                              $regenerateForm.hide();
                                              $regenerateFinalForm.hide();
                                              $confirmationForm.hide();
                                              $success.hide();
                                              //XXX: is this necessary?
                                              $controlPanel.find('.formField').val('');
                                              if (onClose != null)
                                              {
                                                onClose();
                                              }
                                            });
    }

    ajax.CUserPanel.prototype =
    {
      /**
       * Method: showPanel
       *
       * An alias to loginManager.showPanel(onLogin); see <CUserPanel.showPanel>.
      \***************************************************************************/
      showPanel:
      function(onLogin)
      {
        this.loginManager.showPanel(onLogin);
      },

      /**
       * Destructor: destroy
       *
       * Prepare the object for being disposed.
      \***************************************************************************/
      destroy:
      function()
      {
      //warning: it can be dangerous to destroy the object if there are any async
      //events awaiting
      //TODO: provide some kind of control (like in CLoginManager)
        this.loginManager.destroy();
        this.$controlPanel.find('.showRegisterFormButton').unbind('click', this.showRegisterForm);
        this.showRegisterForm = null;
        this.$controlPanel.find('form[name="registerForm"]').unbind('submit', this.submitRegisterForm);
        this.submitRegisterForm = null;
        this.$controlPanel.find('.showLoginFormButton').unbind('click', this.showLoginForm);
        this.showLoginForm = null;

        this.$controlPanel.find('.showRegeneratePasswordFormButton').unbind('click', this.showRegeneratePasswordForm);
        this.showRegeneratePasswordForm = null;

        this.$controlPanel.find('form[name="regeneratePasswordForm"]').unbind('submit', this.submitRegeneratePasswordForm);
        this.submitRegeneratePasswordForm = null;

        this.$controlPanel.find('.showRegeneratePasswordFinalFormButton').unbind('click', this.showRegeneratePasswordFinalFormHandler);
        this.showRegeneratePasswordFinalFormHandler = null;
        this.showRegeneratePasswordFinalForm = null;

        this.$controlPanel.find('form[name="regeneratePasswordFinalForm"]').unbind('submit', this.submitRegeneratePasswordFinalForm);
        this.submitRegeneratePasswordFinalForm = null;

        this.$controlPanel.find('form[name="confirmationForm"]').unbind('submit', this.validateConfirmationForm);
        this.validateConfirmationForm = null;

        this.$controlPanel.find('.showConfirmationFormButton').unbind('click', this.showConfirmationFormHandler);
        this.showConfirmationFormHandler = null;
        this.showConfirmationForm = null;
      },

      /**
       * Method: login
       *
       * An alias to loginManager.login(login, password, onSuccess, onFailure);
       * see <CUserPanel.login>.
      \***************************************************************************/
      login:
      function(login, password, onSuccess, onFailure)
      {
        this.loginManager.login(login, password, onSuccess, onFailure);
      },

      /**
       * Method: logout
       *
       * An alias to loginManager.logout(); see <CUserPanel.logout>.
      \***************************************************************************/
      logout:
      function()
      {
        this.loginManager.logout();
      },

      /**
       * Method: ajax
       *
       * An alias to loginManager.ajax>(url, successHandler, data, errorHandler,
       *                                type, options); see <CUserPanel.ajax>.
      \***************************************************************************/
      ajax:
      function(url, successHandler, data, errorHandler, type, options)
      {
        return this.loginManager.ajax(url, successHandler, data, errorHandler, type,
                                      options);
      },

      /**
       * Method: isLogged
       *
       * An alias to loginManager.isLogged(); see <CUserPanel.isLogged>.
      \***************************************************************************/
      isLogged:
      function()
      {
        return this.loginManager.isLogged();
      },

      /**
       * Method: isLoggedAs
       *
       * An alias to loginManager.isLoggedAs(); see <CUserPanel.isLoggedAs>.
      \***************************************************************************/
      isLoggedAs:
      function()
      {
        return this.loginManager.isLoggedAs();
      }
    }
  }
})(BrainSlices, jQuery);
