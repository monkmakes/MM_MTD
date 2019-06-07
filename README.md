MonkMakes MTD
=========================

This is MonkMakes MTD - this node.js server integrates with an existing Ruby on Rails system (known as the MonkMakes Server).

Both servers run on the same machine. The machine is hosted in MonkMakes' premises and is behind a firewall. The system is 
for internal use by MonkMakes and is kept on our local network behind a firewall. NO PUPLIC ACCESS or access from outside
the firewall is possible, except using a VPN connection.

The usecase for doing a VAT return is as follows:
* Timely information on income and expenditure is entered into the MonkMakes server during the course of a quarter.
* A browser window is opened on this Monk Makes MTD node.js server and the 'Get Obligations' button pressed. This calls the
HMRC server, authenticating with Oauth2 and retrieving this list of obligations. This list is then sent to the Monk Makes 
Rails server, where is is stored in a database.
* The MonkMakes Server displays the list of obligations and the user can select one. This then causes the MonkMakes Server
to make the necessary calculations to produce the VAT return. A button on the MM Server then allows the return data to be 
sent back to the MonkMakes MTD server.
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



### License

This code is open source software licensed under the [Apache 2.0 License]("http://www.apache.org/licenses/LICENSE-2.0.html").
