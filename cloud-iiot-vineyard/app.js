var express = require('express');
var app = express();
var path = require('path');
var apiRoutes = express.Router();
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
//var api = require('./controller/apiRoutes');
var async = require("async");
var rmQueue = require('rm-queue');

var http = require('http').Server(app);
io = require('socket.io')(http);

var jwt          = require('jsonwebtoken'); // used to create, sign, and verify tokens
var passport     = require('passport');
var morgan       = require('morgan');
var session      = require('express-session');
var consolidate  = require('consolidate');

//require('./config/session_passport')(passport);
//require('./config/token_passport')(passport);

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.set('views', __dirname + '/webapps');

//app.set('views', __dirname + '/views');
//app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname + '/webapps')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'swagger')));

//app.use('/api', api);

app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : true }));  

app.use(session({ secret: 'sessionsecret' })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions

config       = require('./config/config.js');
knex       = require('knex')(config);

app.knex = knex;

var queue = rmQueue.Q;
var qconn = {};

try {
    qconn = queue.connect(config.queue);
} catch(err) {
    console.log('Error @ Queue initialization : ' + err);
}

app.qconn = qconn;
app.queue = queue;

var redis = require('redis-store');
var redisClient = new redis(config.redis.host, config.redis.port);
redisClient.init();

app.redisClient = redisClient;

var Setup = require('./config/setup.js');
var setupObject = new Setup(app);

//require('./controller/routes.js')(app, passport); 
var Routes = require('./controller/routes.js')
var routes = new Routes(app);
routes.init();

module.exports = app;

setupObject.setup(function(err, res) {
    if(!err && (res ==  "done")) {
        console.log("done");
    }
});

var server = http.listen(config.port, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Example app listening at http://%s:%s", host, port);
});

