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
    .append($('<div>')
      .addClass('centered')
      .append($('<button>')
        .addClass('unsafe go-to-https')
        .text('I DO UNDERSTAND THE RISK and choose to stay on the page')
        .click(stay))
//      .append($('<span>')
//        .css({width: '30%', display: 'inline-block'})
//        .text(' '))
      .append($('<button>')
        .addClass('safe go-to-https')
        .text('Leave the page and go to a secure connection')
        .click(go)));

  alertWindow.message(content);

  function go()
  {
    var url = document.createElement('a');
    url.href = window.location.href;
    url.protocol = 'https:';
    url.port = '%HTTPS-PORT-GOES-HERE%';
    window.location.replace(url.href);
  }

  function stay()
  {
    alertWindow.close();
  }
}
