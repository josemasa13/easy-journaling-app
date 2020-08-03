// The Auth0 client, initialized in configureClient()
let auth0 = null;
var token = "";
var journalItems = [];
var currDate = new Date();
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
    var lastItem = response.items[0];
    //var lastItemdate = new Date(lastItem.createdAt);
    var time_options = {
      timeZone: "America/Mexico_City"
    }
    var currDate = new Date().toLocaleString([], time_options)

    // ya existe un registro del día de hoy
    if (lastItem.createdAt === currDate.split(',')[0]){
      $("#journalText").val(lastItem.content);
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

// NEW
const updateUI = async () => {
  const isAuthenticated = await auth0.isAuthenticated();
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
