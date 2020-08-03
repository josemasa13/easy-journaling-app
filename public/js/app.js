// The Auth0 client, initialized in configureClient()
let auth0 = null;
var token = "";
var journalItems = [];
var time_options = {
  timeZone: "America/Mexico_City"
}
var currDate = new Date().toLocaleString([], time_options).split(",")[0]

/**
 * Starts the authentication flow
 */
const login = async (targetUrl) => {
  try {
    console.log("Logging in", targetUrl);

    const options = {
      redirect_uri: window.location.origin
    };

    if (targetUrl) {
      options.appState = { targetUrl };
    }

    await auth0.loginWithRedirect(options);
  } catch (err) {
    console.log("Log in failed", err);
  }
};

/**
 * Executes the logout flow
 */
const logout = () => {
  try {
    console.log("Logging out");
    auth0.logout({
      returnTo: window.location.origin
    });
  } catch (err) {
    console.log("Log out failed", err);
  }
};

/**
 * Retrieves the auth configuration from the server
 */
const fetchAuthConfig = () => fetch("/auth_config.json");

/**
 * Initializes the Auth0 client
 */
const configureClient = async () => {
  const response = await fetchAuthConfig();
  const config = await response.json();

  auth0 = await createAuth0Client({
    domain: config.domain,
    client_id: config.clientId
  });
};

const placeJournalItems = (response) => {
  if(response.items.length > 0){
    var lastItem = response.items[response.items.length - 1];

    //var lastItemdate = new Date(lastItem.createdAt);
    var time_options = {
      timeZone: "America/Mexico_City"
    }
    var currDate = new Date().toLocaleString([], time_options)

    // ya existe un registro del día de hoy
    if (lastItem.createdAt === currDate.split(',')[0]){
      $("#journalText").val(lastItem.content);
    } else{
    }
  }
}

const getJournalItems = async () => {
  var journalItems = [];
  await $.ajax({
    type: "GET",
    url: `${root}/journalitems`,
    headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    },
    success: placeJournalItems
  })
}

const searchItems = async (date) => {
  $.ajax({
    type: "GET",
    url: `${root}/journalitems`,
    headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    },
    success: function(res){
      if(reformatDate($("#picker").val()) > reformatDate(currDate)){
        alert("No puedes seleccionar una fecha mayor al día de hoy");
        $("#journalText").val("");
        $("#journalText").attr('disabled', 'disabled');
      } else{
        $("#journalText").removeAttr('disabled');
        if(res.items.length > 0){
          var items = res.items;
          var item = "";
          var newDate = reformatDate(date);

          for(var i = 0; i < items.length; i++){
            if(items[i].createdAt === newDate){
              alert("Se ha encontrado el elemento");
              item = items[i];
              break;
            }
          }

          if(item != ""){
            $("#journalText").val(item.content);
          } else{
            alert("No se encontró ninguna entrada para el día seleccionado");
            $("#journalText").val("");
          }

          
        } else{
          if(date <= reformatDate(currDate)){
            alert("La fecha debe ser igual o menor que el día de hoy");
          }
          else if(res.items.length == 0){
            alert("No existe ningún registro para el día seleccionado, puedes escribir algo desde cero");
          }
        }
      }
    }
  })
}

const reformatDate = (date) => {
  var newDate = date.split("/");
  var newMonth = newDate[0];
  var newDay = newDate[1];
  var newYear = newDate[2];
  if(newMonth[0] == '0'){
    newMonth = newMonth[1];
  }

  if(newDay[0] == '0'){
    newDay = newDay[1];
  }
  newDate = `${newMonth}/${newDay}/${newYear}`;

  return newDate
}

// NEW
const updateUI = async () => {
  const isAuthenticated = await auth0.isAuthenticated();
  var time_options = {
    timeZone: "America/Mexico_City"
  }
  var currDate = new Date().toLocaleString([], time_options)
  $("#picker").val(currDate.split(',')[0]);
  if(isAuthenticated){
    $("#journalText").removeAttr('disabled');
    var user = await auth0.getUser();
    token = await auth0.getIdTokenClaims();
    token = token["__raw"];
    document.getElementById("username").innerHTML = user.name
    var journalItems = await getJournalItems();

  } else{
    $("#journalText").attr('disabled', 'disabled');
  }

  

};

/**
 * Checks to see if the user is authenticated. If so, `fn` is executed. Otherwise, the user
 * is prompted to log in
 * @param {*} fn The function to execute if the user is logged in
 */
const requireAuth = async (fn, targetUrl) => {
  const isAuthenticated = await auth0.isAuthenticated();

  if (isAuthenticated) {
    return fn();
  }

  return login(targetUrl);
};

// Will run when page finishes loading
window.onload = async () => {
  await configureClient();
  updateUI();
  const isAuthenticated = await auth0.isAuthenticated();

  if (isAuthenticated) {
    // show the gated content
    //document.getElementById("username").innerHTML = await auth0.getUser().name;
    return;
  }

  // NEW - check for the code and state parameters
  const query = window.location.search;
  if (query.includes("code=") && query.includes("state=")) {

    // Process the login state
    await auth0.handleRedirectCallback();
    
    updateUI();

    // Use replaceState to redirect the user away and remove the querystring parameters
    window.history.replaceState({}, document.title, "/");
  }
};
