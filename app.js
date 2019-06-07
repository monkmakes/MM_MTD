require('dotenv').config();

// Configuration
const clientId = process.env.CLIENT_ID;               
const clientSecret = process.env.CLIENT_SECRET;
const vrn = process.env.VRN;                                  
const apiBaseUrl = process.env.API_BASE;    
const serviceVersion = process.env.SERVICE_VERSION; 

// HMRC Application endpoints etc.
const obligationsEndpoint = 'organisations/vat/' + vrn + '/obligations';
const submitVATEndpoint = 'organisations/vat/' + vrn + '/returns';


// The VAT return to be submitted - just kept in memory (private single-user system)
var vat_return = null;   
var message = null; // message on the page template  

// Modules
const simpleOauthModule = require('simple-oauth2');
const request = require('superagent');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser());
app.set('view engine', 'ejs'); // templating engine
const dateFormat = require('dateformat');
const winston = require('winston');
const log = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      timestamp: () => dateFormat(Date.now(), "isoDateTime"),
      formatter: (options) => `${options.timestamp()} ${options.level.toUpperCase()} ${options.message ? options.message : ''}
          ${options.meta && Object.keys(options.meta).length ? JSON.stringify(options.meta) : ''}`
    })
  ]
});
const cookieSession = require('cookie-session');
app.use(cookieSession({             
  name: 'session',                   
  keys: ['oauth2Token', 'caller'],
  maxAge: 10 * 60 * 60 * 1000 // 10 hours
}));
const redirectUri = 'http://localhost:8080/oauth20/callback';     // This is passed to the request for oauth2 authorization. HMRC server will redirect here


// OAuth2 module
const oauth2 = simpleOauthModule.create({                         // GLOBAL oauth2 - used for authorizing
  client: {
    id: clientId,
    secret: clientSecret,
  },
  auth: {
    tokenHost: apiBaseUrl,
    tokenPath: '/oauth/token',
    authorizePath: '/oauth/authorize',
  },
});  

// Authorization uri definition for reads and writes 
const authorizationUri = oauth2.authorizationCode.authorizeURL({
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: 'write:vat+read:vat',
});


// Route definitions...

// home-page route
app.get('/', (req, res) => {
  res.render('index', {
    vat_return: vat_return, // passed to the template page
    message: message        // messages to show the user in the UI
  });
});



// Call OBLIGATIONS - request handler
//
// The process is:
// see if there is an auth token on the session. 
//   if its expired, ask the oauth2 object to refresh it. This does not require redirection to HMRC website
//   if it hasn't expired, just make the API call
// if there wasn't an auth token on the session then redirect the response to the Auth server's web interface
// the user then logs in and grants permissions for read and write on the VAT API.
app.get("/obligationsCall",(req,res) => {
  message = null; 
  // set the obligations date range from 1 year ago up to current date
  var today = new Date()
  var a_year_ago = new Date()
  a_year_ago.setDate(today.getDate() - 365)
  var endpoint = obligationsEndpoint + '?from=' + a_year_ago.toISOString().slice(0,10) + '&to=' + today.toISOString().slice(0,10)
  log.info(endpoint)
  if(req.session.oauth2Token){
    var accessToken = oauth2.accessToken.create(req.session.oauth2Token);

    if(accessToken.expired()){
        log.info('Token expired: ', accessToken.token);
        accessToken.refresh()
          .then((result) => {
            log.info('Refreshed token: ', result.token);
            req.session.oauth2Token = result.token;
            callApiGetObligations(endpoint, res, result.token.access_token);
          })
          .catch((error) => {
            log.error('Error refreshing token: ', error);
            res.send(error);
           });
    } else {
      log.info('Using token from session: ', accessToken.token);
      callApiGetObligations(endpoint, res, accessToken.token.access_token);
    }
  } else {
    log.info('Need to request token')
    req.session.caller = '/obligationsCall';
    res.redirect(authorizationUri);
  }
});

// Actually call the HMRC obligations API
function callApiGetObligations(resource, res, bearerToken) {
  const acceptHeader = `application/vnd.hmrc.${serviceVersion}+json`;
  const url = apiBaseUrl + resource;
  log.info(`Calling ${url} with Accept: ${acceptHeader}`);
  const req = request
    .get(url)
    .accept(acceptHeader);
  if(bearerToken) {
    log.info('Using bearer token:', bearerToken);
    req.set('Authorization', `Bearer ${bearerToken}`);
  }
  req.end((err, apiResponse) => handleResponseObligations(res, err, apiResponse));
}

// Handle the response following a call to the HMRC obligations API
function handleResponseObligations(res, err, apiResponse){
  if (err || !apiResponse.ok) {
    log.error('Handling error response: ', err);
    message = err;
    res.redirect('/');
  } else {
      // post to rails app
      sendObligationsToMMServer(apiResponse.body);
      var response_data = apiResponse.body;
      var num_obligations = response_data.obligations.length
      message = "Got " + num_obligations + " obligations and sent them to the MonkMakes Server.";
      log.info(response_data);
      res.redirect('/');
  }
};


// Call SUMBIT VAT RETURN  
//
//
app.get("/submitVATCall",(req,res) => {
  //req.session.oauth2Token = null;  // uncomment force re-authentication for testing

  // todo remove start_date and end_date from data incase it upsets the API

  message = null;
  if(req.session.oauth2Token){
    var accessToken = oauth2.accessToken.create(req.session.oauth2Token);

    if(accessToken.expired()){
        log.info('Token expired: ', accessToken.token);
        accessToken.refresh()
          .then((result) => {
            log.info('Refreshed token: ', result.token);
            req.session.oauth2Token = result.token;
            callApiPOST(submitVATEndpoint, res, result.token.access_token, vat_return);
          })
          .catch((error) => {
            log.error('Error refreshing token: ', error);
            res.send(error);
           });
    } else {
      log.info('Using token from session: ', accessToken.token);
      callApiPOST(submitVATEndpoint, res, accessToken.token.access_token, vat_return);
    }
  } else {
    log.info('Need to request token')
    req.session.caller = '/submitVATCall';
    res.redirect(authorizationUri);
  }
});



function callApiPOST(resource, res, bearerToken, postData) {
  const acceptHeader = `application/vnd.hmrc.${serviceVersion}+json`;
  const url = apiBaseUrl + resource;
  log.info(`Calling ${url} with Accept: ${acceptHeader}`);
  const req = request
    .post(url, postData)
    .accept(acceptHeader);
  if(bearerToken) {
    log.info('Using bearer token:', bearerToken);
    req.set('Authorization', `Bearer ${bearerToken}`);
  }
  req.end((err, apiResponse) => handleResponseSubmitReturn(res, err, apiResponse));
}


function handleResponseSubmitReturn(res, err, apiResponse){
  if (err || !apiResponse.ok) {
    //log.error('Handling error response: ', err);
    log.info('Message from error:' + err.response.text);
    // {"code":"BUSINESS_ERROR",
    //  "message":"Business validation error",
    //  "errors":[
    //    {"code":"DUPLICATE_SUBMISSION",
    //     "message":"The VAT return was already submitted for the given period."}]}
    message = err.response.text;
    res.redirect('/');
  } else {
    var response_data = apiResponse.body;
    message = response_data;
    log.info(response_data);
    res.redirect('/');
  }
};




// API for MonkMakes Server

// Receive a VAT return from the MM server and save it. 
app.post("/saveVATReturn",(req,res) => {
  vat_return = req.body;
  vat_return.vatDueSales = parseFloat(vat_return.vatDueSales);
  vat_return.vatDueAcquisitions = parseFloat(vat_return.vatDueAcquisitions);
  vat_return.totalVatDue = parseFloat(vat_return.totalVatDue);
  vat_return.vatReclaimedCurrPeriod = parseFloat(vat_return.vatReclaimedCurrPeriod);
  vat_return.netVatDue = parseFloat(vat_return.netVatDue);
  vat_return.totalValueSalesExVAT = parseFloat(vat_return.totalValueSalesExVAT);
  vat_return.totalValuePurchasesExVAT = parseFloat(vat_return.totalValuePurchasesExVAT);
  vat_return.totalValueGoodsSuppliedExVAT = parseFloat(vat_return.totalValueGoodsSuppliedExVAT);
  vat_return.totalAcquisitionsExVAT = parseFloat(vat_return.totalAcquisitionsExVAT);
  vat_return.finalised = true;
  res.send("OK");
});

// Send the obligations to MM Server - also running on localhost
function sendObligationsToMMServer(obs){
  log.info('OBS')
  log.info(obs)
  request
    .post('http://0.0.0.0:3000/accounts/vatObligations')
    .send(obs)
    .end(function(err, res){
    if (err || !res.ok) {
      log.error(err)
    } else {
      log.info('yay got ' + JSON.stringify(res.body));
    }
  });
}




// Callback service parsing the authorization token and asking for the access token
app.get('/oauth20/callback', (req, res) => {
  const options = {
    redirect_uri: redirectUri,
    code: req.query.code
  };

  oauth2.authorizationCode.getToken(options, (error, result) => {
    if (error) {
      log.error('Access Token Error: ', error);
      return res.json('Authentication failed');
    }

    log.info('Got token: ', result);
    // save token on session and return to calling page
    req.session.oauth2Token = result;
    res.redirect(req.session.caller); // how do I make this do POST too????
  });
});





// Helpers

function str(token){
  return `[A:${token.access_token} R:${token.refresh_token} X:${token.expires_at}]`;
}


Number.prototype.to_gbp = function() {
  var formatter = new Intl.NumberFormat('en-UK', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 });
  return formatter.format(this.valueOf())
}


// Start listening

app.listen(8080,() => {
  log.info('Started at http://localhost:8080');
});