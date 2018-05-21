var dbConfig = require('./config/config');
var async = require('async');
var _ = require('underscore');
var conf = require('./config/config.js');
var knexVar = require('knex')(dbConfig);

var rmQueue = require('rm-queue');
var queue = rmQueue.Q;
var qconn = {};

try{
    qconn = queue.connect(conf.queue);
} catch(err){
    console.log('Error @ Queue initialization : ' + err);
}

var redis = require('redis-store');
var redisClient = new redis(conf.redis.host,  conf.redis.port);
redisClient.init();

var loadConfigurationToRedisCache = function(){

    var defaultRSSIValue = null;
    var defaultTemperatureValue = null;
    
    async.series({
        readDefaultRSSIThreshold : function(callback){
            knexVar.withSchema(dbConfig.schemaname).select().table('default_rssi_threshold')
            .asCallback(function(err, rows){
                if(!err && rows[0]){
                    defaultRSSIValue = rows[0].rssi_threshold_value;
                    callback(null);
                } else {
                    defaultRSSIValue = -56;
                    callback(null);
                }
            });
        },
        loadDefaultThresholdValue : function(callback){
            redisClient.set('rssi_threshold', defaultRSSIValue, 0, function(err, result){
                if(!err){
                    console.log("RSSI Threshold value stored in Redis Successfully");
                    callback(null);
                } else {
                    console.log("RSSI Threshold value failed to store");
                    callback(null);
                }
            });
        },
        loadScreenTransitionState : function(callback){
            redisClient.set('screen_transition_state', false, 0, function(err, result){
                if(!err){
                    console.log("Screen transition value stored in Redis successfully");
                    callback(null);
                } else {
                    console.log("Screen transition value failed to store in Redis");
                    callback(null);
                }
            });
        },
        readDefaultTemperatureThreshold : function(callback){
            knexVar.withSchema(dbConfig.schemaname).select().table('default_temperature_threshold')
            .asCallback(function(err, rows){
                if(!err && rows[0]){
                    defaultTemperatureValue = rows[0].temperature_threshold_value;
                    callback(null);
                } else {
                    defaultTemperatureValue = 32;
                    callback(null);
                }
            });
        },
        loadDefaultTemperatureThreshold : function(callback){
            redisClient.set('default_temperature_threshold', defaultTemperatureValue, 0, function(err, result){
                if(!err){
                    console.log("Defalt temperature threshold stored in Redis successfully");
                    callback(null);
                } else {
                    console.log("Default temperature threshold value failed to store in Redis");
                    callback(null);
                }
            });
        },
        loadDefaultScreenTransitionStatusForTemperature : function(callback){
            redisClient.set('screen_transition_temperature_status', false, 0, function(err, result){
                if(!err){
                    console.log("Default Screen Transition Temperature Status stored in Redis successfully");
                    callback(null);
                } else {
                    console.log("Default Screen Transition Temperature Status failed to store in Redis");
                    callback(null);
                }
            });
        },
        loadDefaultScreenTransitionStatusForBeacon : function(callback){
            redisClient.set('screen_transition_beacon_status', false, 0, function(err, result){
                if(!err){
                    console.log("Default Screen Transition Beacon Status stored in Redis successfully");
                    callback(null);
                } else {
                    console.log("Default Screen Transition Beacon Status failed to store in Redis");
                    callback(null);
                }
            });
        }
    }, function(err){
        console.log("Default Values stored in redis cache successfully");
    });

};
loadConfigurationToRedisCache();

qconn.on("ready", function(err){
    queue.sub('iiot-beacon-message-queue', function(beaconMessage, q){
        
        var gatewayMessage = JSON.parse(beaconMessage.data);
        if(gatewayMessage.deviceType == "beacon") {
            processBeaconMessage(gatewayMessage, q);
        } else if(gatewayMessage.deviceType == "temperature"){
            processTemperatureMessage(gatewayMessage, q);
        }
        
        var rawmessageData = JSON.stringify(JSON.parse(beaconMessage.data));
        queue.pub('iiot-rawmessage-socket-queue', new Buffer(rawmessageData));
        
    });
});

var processTemperatureMessage = function(gatewayMessage, q){

    console.log(gatewayMessage);
    
    async.series({
        storeTemperatureInformation : function(callback){
            knexVar.withSchema(dbConfig.schemaname).table('temperature_sensor')
            .insert({
                reported_time : new Date().getTime(),
                value : parseFloat(gatewayMessage.temperature)
            }).asCallback(function(err, rows){
                console.log(err);
                if(!err){
                    console.log("Temperature information stored successfully");
                    callback(null);
                } else {
                    console.log("Temperature information failed to store");
                    callback(null);
                }
            });
        },
        processTemperatureInformation : function(callback){
            redisClient.get('default_temperature_threshold', function(err, defaultTemperatureThreshold){
                if(!err && defaultTemperatureThreshold){
                    if(parseFloat(gatewayMessage.temperature) < parseFloat(defaultTemperatureThreshold)){
                        var transitionMessage = {"event":"temp-event"};
                        checkScreenTransition(transitionMessage, function(successState){
                            callback(null);
                        });   
                    } else {
                        redisClient.set('screen_transition_temperature_status', false, 0, function(err, result){
                            console.log("Updating screen transition status for temperature to false");
                            console.log("No temperature sensor alert generated");
                            callback(null);
                        });                        
                    }
                } else {
                    callback(null);
                }
            });
        }
    }, function(err){
        if(!err){
            console.log("Temperature sensor information processed successfully");
            q.shift();
        } else {
            console.log(err);
            console.log("Temperature sensor information failed to process");
        }
    });
    
};

var processBeaconMessage = function(beaconMessage, q){
    var beaconValues = beaconMessage.beaconValues;
    var beaconEventOccurs = false;
    async.forEachSeries(beaconValues, function(beaconValue, callback){
        processBeacons(beaconValue, function(state){
            console.log("Beacon event occurs "+state);
            if(state){
                beaconEventOccurs = state;
                callback(null, null);
            } else {
                callback(null, "Processing Beacon Failed");
            }
        });
    }, function(err, result){
        if(!err){
            if(beaconEventOccurs){
                var transitionMessage = {"event":"ble-event"};
                checkScreenTransition(transitionMessage, function(successState){
                    console.log("Message processed successfully");
                    q.shift();
                });
            } else {
                redisClient.set('screen_transition_beacon_status', false, 0, function(err, result){
                    console.log("Updating screen Transition state for beacon to false");
                });
                q.shift();
            }            
        } else {
            console.log("Message Processing Failed");
            q.shift();
        }
    });
};

var processBeacons = function(beaconValue, callback){
    console.log(beaconValue);
    var device = null;
    var deviceStatus = null;
    var checkBeaconPresenceFlag = false;
    
    async.series({
        getDevice : function(callback){
            knexVar.withSchema(dbConfig.schemaname).select().table('device')
            .where('device_id', beaconValue.beaconId)
            .asCallback(function(err, rows){    
                if(!err && rows[0]){
                    device = rows[0];
                    callback(null)
                } else {
                    console.log("Device not found");
                    knexVar.withSchema(dbConfig.schemaname).table('device')
                    .insert({
                        device_id : beaconValue.beaconId,
                        device_type : 'beacon'
                    }).asCallback(function(err, rows){
                        if(!err){
                            checkBeaconPresenceFlag = true;
                            callback(null);
                        }
                    });
                }
            });
        },
        getDeviceStatus : function(callback){
            if(device){
                knexVar.withSchema(dbConfig.schemaname).select().table('beacon_status')
                .where('beacon_id', device.id)
                .asCallback(function(err, rows){
                    if(!err && rows[0]){
                        deviceStatus = rows[0];
                        callback(null);
                    } else {
                        console.log("Beacon status not found");
                        knexVar.withSchema(dbConfig.schemaname).table('beacon_status')
                        .insert({
                            beacon_id : device.id,
                            rssi_value : beaconValue.rssi,
                            reported_time : new Date().getTime(),
                            is_present : true
                        }).asCallback(function(err, rows){
                            if(!err){
                                checkBeaconPresenceFlag = true;
                                callback(null);
                            }
                        });
                    }
                });
            } else {
                console.log("No device found and created new one.");
                callback(null);
            }
        }
    }, function(err){
        if(!checkBeaconPresenceFlag){
            checkBeaconPresence(device, deviceStatus, beaconValue, function(state){
                if(state){
                    callback(true);
                } else {
                    callback(false);
                }
            });
        } else {
            callback(false);
        }
    });
    
};

var checkBeaconPresence = function(device, deviceStatus, beaconValue, callback){

    var bleSource = beaconValue.beaconId;
    var bleValue = beaconValue.rssi;
    
    redisClient.get('rssi_threshold', function(err, defaultRssiThresholdValue){
        if(!err && defaultRssiThresholdValue){
            if(bleValue < parseInt(defaultRssiThresholdValue)){
                console.log(bleSource + "is less than threshold value");
                knexVar.withSchema(dbConfig.schemaname).table('beacon_status')
                .where('id', deviceStatus.id)
                .update('is_present',  false)
                .asCallback(function(err, rows){
                    if(!err){
                        console.log("Updating Beacon status successfully");
//                        var transitionMessage = {"event":"ble-event"};
                        callback(true);
//                        checkScreenTransition(transitionMessage, function(successState){
//                            callback(true);
//                        });                        
                    } else {
                        console.log("Updating Beacon status failed");
                        callback(false);
                    }
                });
            } else {
                console.log(bleSource + "is greater than threshold value");
                knexVar.withSchema(dbConfig.schemaname).table('beacon_status')
                .where('id', deviceStatus.id)
                .update('is_present',  true)
                .asCallback(function(err, rows){
//                    redisClient.set('screen_transition_beacon_status', false, 0, function(err, result){
//                        console.log("Updating screen Transition state for beacon to false");
//                    });
                    if(!err){
                        console.log("Updating Beacon status");
                        callback(false);                  
                    } else {
                        console.log("Updating Beacon status fails");
                        callback(false);
                    }
                });
            }
        }
    });
    
};

var checkScreenTransition = function(transitionMessage, callback){
    
    var screenTransitionState = null;
    var screenTransitionStateForSensor = null;
    
    async.series({
        readScreenTransitionState : function(callback){
            redisClient.get('screen_transition_state', function(err, currentScreenTransitionState){
                if(!err){
                    screenTransitionState = currentScreenTransitionState;
                    callback(null, null);
                } else {
                    screenTransitionState = false;
                    callback(null, null);
                }
            });
        },
        readScreenTransitionStateForSensor : function(callback){
            var screenTransitionString = null;
            if(transitionMessage.event == "temp-event"){
                screenTransitionString = "screen_transition_temperature_status";
            } else if(transitionMessage.event == "ble-event") {
                screenTransitionString = "screen_transition_beacon_status";
            }
            
            redisClient.get(screenTransitionString, function(err, currentScreenTransitionStateForSensor){
                if(!err){
                    screenTransitionStateForSensor = currentScreenTransitionStateForSensor;
                    callback(null, null);
                } else {
                    screenTransitionStateForSensor = false;
                    callback(null, null);
                }
            });
        },
        sendSocketUpdate : function(callback){
            if(!screenTransitionState && !screenTransitionStateForSensor){
                redisClient.set('screen_transition_state', true, 0, function(err, result){
                    if(!err){
                        queue.pub('iiot-screen-transition-queue', new Buffer(JSON.stringify(transitionMessage)));
                        callback(null, null);
                    } else {
                        console.log("Screen transition value failed to store in Redis");
                        callback(null, null);
                    }
                });
            } else {
                callback(null, null);
            }
        },
        updateScreenTransitionStateForSensor : function(callback){
            if(!screenTransitionState){
                if(transitionMessage.event == "temp-event"){
                    redisClient.set('screen_transition_temperature_status', true, 0, function(err, temperatureResult){
                        console.log("updating screen transition temperature status to true");
                        callback(null, null);
                    });
                } else if(transitionMessage.event == "ble-event"){
                    redisClient.set('screen_transition_beacon_status', true, 0, function(err, beaconResult){
                        console.log("updating screen transition beacon status to true");
                        callback(null, null);
                    });
                } else {
                    callback(null, null);
                }
            } else {
                callback(null, null);
            }
        }
    }, function(err){
        console.log("Socket data processing done");
        callback(true);
    });
    
//    redisClient.get('screen_transition_state', function(err, currentScreenTransitionState){
//        if(!err && currentScreenTransitionState){
//            console.log("Screen is already in transition state with different event");
//            callback(false);
//        } else {
//            console.log("Screen transition starts");
//            redisClient.set('screen_transition_state', true, 0, function(err, result){
//                queue.pub('iiot-screen-transition-queue', new Buffer(JSON.stringify(transitionMessage)));
//                callback(true);
//            });            
//        }
//    });
};
