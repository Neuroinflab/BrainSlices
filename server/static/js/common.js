//OBSOLETED by internal function of CLoginManager.ajaxAux
function ajaxErrorHandler(xhr, textStatus, errorThrown)
{
  var errormsg = "Server returned error:\n";
  errormsg += "Ready state :" + xhr.readyState + "\n";
  errormsg += "Status " + xhr.status + ", " + errorThrown + "\n";
  //errormsg += "Response text" + xhr.responseText 
  alert(errormsg);
}

function escapeHTML(s)
{
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
