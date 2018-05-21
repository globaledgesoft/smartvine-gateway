/*******************************************************************************************
 * Variable
 ******************************************************************************************/
var root_path = __dirname,
    views_path = __dirname + '/views',
    webapps_path = __dirname + '/webapps';

/*******************************************************************************************
 * Required module
 ******************************************************************************************/
var httpServer = require('http-server');
var conf = require('./conf.js');
var _ = require("underscore");

var app = {};


/*******************************************************************************************
 * HTTP Server Startup
 ******************************************************************************************/
var http = {};

try {
//    http = httpServer.HTTP;

//    var http_conf = {};
//    http_conf = conf['web'];
//    http_conf['views'].path = views_path;
//    http_conf['static'].path = webapps_path;
//    http_conf['sessioStore'] = conf['sessio-store'];

//    app = http.start (http_conf);
    app.conf = conf;

    global.app = app;
    global.conf = conf;
    global.sessionCheck = http.sessionCheck;
    global.express = http.express;

//    var redisCli = require("redis-store");

//    var redisClient = new redisCli(conf.redis.host, conf.redis.port);
//    redisClient.init();
//    app.redisClient = redisClient;

//    var CacheStoreManager = require("./handlers/cache-store-manager.js");
//    var cacheManager = new CacheStoreManager(app);
//    app.cacheManager = cacheManager;

    var rmQueue = require('rm-queue');
    var queue = rmQueue.Q;
    var qconn = {};
    
    try{
        qconn = queue.connect(conf.queue);
    } catch(err){
        console.log('Error @ Queue initialization : ' + err);
    }

    app.qconn = qconn;
    app.queue = queue;
    
    var Router = require("./handlers/router.js");
    var httpRouter = new Router(app);
    app.httpRouter = httpRouter;

    var GarudaUDPServer = require('./vineyard-udp-server.js');
    var garudaUDPServer = new GarudaUDPServer(app);
    garudaUDPServer.init();
    app.garudaUDPServer = garudaUDPServer;

//    var HTTPRoutes = require('./handlers/http-routes.js');
//    var httpRoutes = new HTTPRoutes(app);
//    httpRoutes.init();

}
catch(err) {
    console.log(err.stack);
    console.log('Error @ HTTP Server Initialization : ' + err);
}
