// This is a test server crated by Stephen Hall to act as an end point
// so we can see params


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

app.use((req,res,next) => {
    log.info(JSON.stringify(req.headers));
    log.info(JSON.stringify(req.body));
    res.write("Mini Server");
});


app.listen(8081,() => {
    log.info('Started at http://localhost:8081');
});