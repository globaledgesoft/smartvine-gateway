var _ = require('underscore');
var async = require('async');
var IndexImpl = require('./actions/index.js');

var Routes = function(app){
    this.app = app;
    this.redisClient = app.redisClient;
    this.indexImplInstance = new IndexImpl(app);
    this.qconn = app.qconn;
    this.queue = app.queue;
};
module.exports = Routes;

Routes.prototype.init = function(){
    var self = this;
    var routesApp = this.app;
    
    self.qconn.on("ready", function(err){
        self.queue.sub("iiot-screen-transition-queue", function(msg, q){
            var data = JSON.parse(msg.data);
            console.log("Emitting via socket");
            io.sockets.emit("iiot-transition-screen", data);
            q.shift();
        });
        self.queue.sub("iiot-rawmessage-socket-queue", function(msg, q){
            var data = JSON.parse(msg.data);
            io.sockets.emit("iiot-rawmessage-screen", data);
            q.shift();
        });
    });
    
    routesApp.get('/echoTest', function(req, res){
        res.json({"echoValue" : req.query.echoValue});
    });     
    
    routesApp.get('/', function(req, res){
        res.render('screens');
    });
    
    routesApp.get('/updateDefaultRSSIValue', function(req, res){
        var rssiValue = req.query.defaultRSSIValue;
        knex.withSchema(config.schemaname).table('default_rssi_threshold').where('description', 'default')
        .update({
            rssi_threshold_value : Number(rssiValue)
            })
        .asCallback(function(err, rows) {
            if(!err){
                self.redisClient.set('rssi_threshold', rssiValue, 0, function(err, result){
                    if(!err && result){
                        res.json({"status": "true", "code":200, "message" : "data updated successfully in both pg and redis", "data" :"true"});
                    } else {
                        res.json({"status": "true", "code":200, "message" : "data failed to update in Redis", "data" :"true"});
                    }
                });
            } else {
                res.json({"status": "false", "code" :400, "message" : "data failed to update in both pg and redis", "data" :"failed to update"});
            }
        });
    });
    
    routesApp.get('/getDefaultValues', function(req, res){
        var responseObject = {
            status : true,
            code : 200
        };
        var data = {};
        async.series({
            getDefaultRSSIValue : function(callback){
                self.redisClient.get('rssi_threshold', function(err, defaultRssiValue){
                    if(!err){
                        data.defaultRSSIValue = defaultRssiValue;
                        callback(null, null);
                    } else {
                        data.defaultRSSIValue = 0;
                        callback(null, null);
                    }
                });
            },
            getDefaultTemperatureValue : function(callback){
                self.redisClient.get('default_temperature_threshold', function(err, defaultTemperatureValue){
                    if(!err){
                        data.defaultTemperatureValue = defaultTemperatureValue;
                        callback(null, null);
                    } else {
                        data.defaultTemperatureValue = 0;
                    }
                });
            }
        }, function(err, result){
            if(!err){
                responseObject.data = data;
                responseObject.message = "data retreived successfully";
                res.json(responseObject);
            } else {
                responseObject.data = null;
                responseObject.message = "failed to retreive data";
                res.json(responseObject);
            }
        })
    });
    
    routesApp.get('/updateScreenTransitionState', function(req, res){
        var screenTransitionState = false;
        if(req.query.screenTransitionState == "false"){
            screenTransitionState = false;
        } else {
            screenTransitionState = true;
        }
        self.redisClient.set('screen_transition_state', screenTransitionState, 0, function(err, result){
            if(!err && result){
                res.json({"status" : "true", "code" : 200, "message" : "data updated successfully in redis", "data" : "true"});
            } else {
                res.json({"status" : "true", "code" : 200, "message" : "data failed to update in redis", "data" : "true"});
            }
        });
    });
  
    routesApp.get('/updateDefaultTemperatureThresholdValue', function(req, res){
        var temperatureValue = req.query.defaultTemperatureValue;
        knex.withSchema(config.schemaname).table('default_temperature_threshold').where('description', 'default')
        .update({
            temperature_threshold_value : Number(temperatureValue)
            })
        .asCallback(function(err, rows) {
            if(!err){
                self.redisClient.set('default_temperature_threshold', temperatureValue, 0, function(err, result){
                    if(!err && result){
                        res.json({"status": "true", "code":200, "message" : "data updated successfully in both pg and redis", "data" :"true"});
                    } else {
                        res.json({"status": "true", "code":200, "message" : "data failed to update in Redis", "data" :"true"});
                    }
                });
            } else {
                res.json({"status": "false", "code" :400, "message" : "data failed to update in both pg and redis", "data" :"failed to update"});
            }
        });
    });
    
    routesApp.get('/getTemperatureGraphData', function(req, res){
        var time = new Date().getTime();
        var end_time = time;
        var start_time = time - 48 * 60 * 60 * 1000
        knex.withSchema(config.schemaname).table('temperature_sensor')
        .whereBetween('reported_time', [start_time, end_time])
        .orderBy('id', 'asc')
        .asCallback(function(err, rows){
            if(!err) {
                console.log(rows.length);
                var x_axis = _.pluck(rows, 'value');
                var y_axis = _.pluck(rows, 'reported_time');
                var data = {
                    x_axis : x_axis,
                    y_axis : y_axis
                };
                var jsonObj = {
                    "status" : "true",
                    "code" : 200,
                    "message" : "Data retreived successfully",
                    "data" : data
                };
                res.send(jsonObj);
            } else {
                console.log(err);
            }
            
        });
    });
    
};