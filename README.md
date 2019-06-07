MonkMakes MTD
=========================

This is MonkMakes MTD - this node.js server that pulls data from an existing Ruby on Rails system (known as the MonkMakes Server).

The MonkMakes MTD node.js app runs on the user's computer (local host) as an Installed Application. 

The usecase for doing a VAT return is as follows:
* Timely information on income and expenditure is entered into the MonkMakes server during the course of a quarter.
* A browser window is opened on this Monk Makes MTD node.js server on localhost:8080 and the 'Get Obligations' button pressed. This calls the
HMRC server, authenticating with Oauth2 and retrieving this list of obligations. This list is then sent to the Monk Makes 
Rails server, where is is stored in a database.
* The MonkMakes Server displays the list of obligations and the user can select one. This then causes the MonkMakes Server
to make the necessary calculations to produce the VAT return. A button on the MM Server then allows the return data to be 
pushed back to the MonkMakes MTD app (on localhost).
* The user presses Submit on the MonkMakes MTD server and the VAT return is sent to the Inland Revenue API.

Source code
------------
Although the code is kept on github with an open license, credentials are NOT. They are stored using a .env file that is 
also swapped out to allow switching between test and live environments.


Installation
------------

The node dependencies can be installed locally by running:
```
npm install
```

The server can be started with the following command:
```
npm start
```

Once running, the application will be available at:

```
http://localhost:8080/
```


HMRC
----
Because this runs in a browser on Localhost, then it counts as an Application connection method of: DESKTOP_APP_DIRECT 
This means the following headers must be added to all requests.
```
Gov-Client-Connection-Method: DESKTOP_APP_DIRECT
Gov-Client-Device-ID: a93825f3-3128-49ba-a56e-590191e289c2 - generated using: https://www.guidgenerator.com/online-guid-generator.aspx
Gov-Client-User-IDs: os=linda
Gov-Client-Timezone: UTC+01:00 - but account for BST
Gov-Client-Local-IPs: 10.10.10.103
Gov-Client-Screens: width=1920&height=1080&scaling-factor=1&colour-depth=16,width=3000&height=2000&scaling-factor=1.25&colour-depth=
Gov-Client-Window-Size: width=1256&height=803
Gov-Client-User-Agent: Intel Mac OS X 10_11_6
Gov-Vendor-Version: MonkMakes%20MTD%20Software=1.0.0.build0023

```



### License

This code is open source software licensed under the [Apache 2.0 License]("http://www.apache.org/licenses/LICENSE-2.0.html").
