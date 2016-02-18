if (window.location.protocol.toLowerCase() == 'http:')
{
  //ask user what to do
  var content = $('<div>')
    .addClass('go-to-https')
    .append($('<h2>')
      .addClass('centered')
      .text('Insecure connection protocol detected'))
    .append($('<p>')
      .text('You seem to be using plain HTTP protocol. The server facilitates use of TLS secure connection (HTTPS) and we do recommend to use that.'))
    .append($('<p>')
      .text('In plain HTTP everything you transfer via the network (eg. your password) is transferred as a plain text and therefore easily visible even for a not very advanced cracker. Since our service is not a nuclear plant control panel, it might be not a big problem, however, if you use the same password for other services (password reuse is definitively a not recommended practice), then you might be in a serious trouble. So is if either your specimens are removed, or improper content is uploaded from your account after the security of your password is compromised.'))
    .append($('<p>')
      .text('On the other hand, if you are not going to log in, then use of pure HTTP seems to be secure enough. You might also want to use it under some (rare) circumstances, eg. if your internet service provider does not allow you to connect to the HTTPS port.'))
    .append($('<p>')
      .css({'font-weight': 'bold'})
      .text('You might be warned that the HTTPS connection provided is not secure. Still, it is much more secure than a plain HTTP connection.'))
    .append($('<div>')
      .addClass('centered')
      .append($('<button>')
        .addClass('unsafe go-to-https')
        .text('I DO UNDERSTAND THE RISK and choose to stay on the page')
        .click(function()
        {
          alertWindow.close();
        }))
      .append($('<button>')
        .addClass('safe go-to-https')
        .text('Enable a more SECURE CONNECTION')
        .click(function()
        {
          var url = document.createElement('a');
          url.href = window.location.href;
          url.protocol = 'https:';
          url.port = '%HTTPS-PORT-GOES-HERE%';
          window.location.replace(url.href);
        })));

  alertWindow.message(content);

}
