var request = require("request");
var DecodeEngine = require("decode-engine");
var EnforaHelper = require("./helper.js");
var async = require('async');

var garudaSpecJson = [
    {field: "apiVersion",
        index: 0,
        expression: null,
        LEorBE : "BE",
        type : "smallInt",
        signed : false,
        count: 2},
    {field: "messageType",
        index: 2,
        expression: null,
        LEorBE : "BE",
        type : "byteInt",
        signed : false,
        count: 1},
    {field: "optHdrSize",
        index: 3,
        expression: null,
        LEorBE : "BE",
        type : "byteInt",
        signed : false,
        count: 1},
    {field: "eventId",
        index: 4,
        expression: null,
        LEorBE : "BE",
        type : "integer",
        signed : false,
        count: 4},
    {field: "deviceId",
        index: 8,
        expression: function(input){
            return (input.trim())},
        LEorBE : "BE",
        type : "string",
        signed : false,
        count: 22},
    {field: "gpio",
        index: 30,
        expression: null,
        LEorBE : "BE",
        type : "smallInt",
        signed : false,
        count: 2},
    {field: "date",
        index: 32,
        expression: null,
        LEorBE : "BE",
        type : "byte3",
        signed : false,
        count: 3},
    {field: "validGps",
        index: 35,
        expression: null,
        type : "byteInt",
        signed : false,
        count: 1},
    {field: "latitudeDecoded",
        index : 36,
        expression:function(input){
            var hlat = parseInt(input/100000);
            var dlat = input - (hlat * 100000);
            var ilat = parseInt(dlat / 1000);
            var mlat = ((dlat / 1000) - ilat) * 60;
            var latitudeDecoded = hlat + (ilat / 60) + (mlat / 3600);
            return latitudeDecoded;},
        type : "byte3",
        LEorBE : "BE",
        signed : true,
        count: 3},
    {field: "longitudeDecoded",
        index : 39,
        expression: function(input){
            var hlon = parseInt(input/100000);
            var dlon = input - (hlon * 100000);
            var ilon = parseInt(dlon / 1000);
            var mlon = ((dlon / 1000) - ilon) * 60;
            var longitudeDecoded = hlon + (ilon / 60) + (mlon / 3600);
            return longitudeDecoded;},
        LEorBE : "BE",
        type : "integer",
        signed : true,
        count: 4},
    {field: "speed",
        index: 43,
        expression: null,
        type : "smallInt",
        LEorBE : "BE",
        signed : false,
        count: 2},
    {field: "heading",
        index: 45,
        expression: null,
        type : "smallInt",
        signed : false,
        LEorBE : "BE",
        count: 2},
    {field: "time",
        index: 47,
        expression: null,
        type : "byte3",
        LEorBE : "BE",
        signed : false,
        count: 3},
    {field: "satellietes",
        index: 50,
        expression: null,
        type : "byteInt",
        signed : false,
        count: 1},
    {field: "odometer",
        index: 51,
        expression: null,
        type : "integer",
        signed : false,
        LEorBE : "BE",
        count: 4},
    {field: "rtcYear",
        index: 55,
        expression: null,
        type : "byteInt",
        signed : false,
        count: 1},
    {field: "rtcMonth",
        index: 56,
        expression: null,
        type : "byteInt",
        signed : false,
        count: 1},
    {field: "rtcDay",
        index: 57,
        expression: null,
        type : "byteInt",
        signed : false,
        count: 1},
    {field: "rtcHour",
        index: 58,
        expression: null,
        type : "byteInt",
        signed : false,
        count: 1},
    {field: "rtcMinutes",
        index: 59,
        expression: null,
        type : "byteInt",
        signed : false,
        count: 1},
    {field: "rtcSeconds",
        index: 60,
        expression: null,
        type : "byteInt",
        signed : false,
        count: 1}
];

var UDPMessageHandler = function(app){
    
    this.decodeEngine = new DecodeEngine();
    this.redisClient = app.redisClient;
    this.router = app.httpRouter;
    this.helper = new EnforaHelper(app);
    this.cacheStoreManager = app.cacheManager;
    this.conf = app.conf;
    
};
module.exports = UDPMessageHandler;

UDPMessageHandler.prototype.socketHandler = function(message, rinfo, callback){
    var self = this;

    var spec = {
        msgType : "hex",
        protocol : 'udp',
        device : 'Enfora',
        specArray : garudaSpecJson
    };

    var ackMessage = self.conf.ackMessage;

    var ackObject = {
        message : ackMessage,
        startOffSet : 0,
        msgType : 'hex',
        messageLength : ackMessage.length
    };

    console.log("[UDP Server][" +new Date()+ "]Message Received and Proceed for Decoding");
    var originalMessage = JSON.parse(JSON.parse(JSON.stringify(message.toString())));
    console.log(originalMessage.deviceType);
    console.log(originalMessage.timestamp);
    console.log(originalMessage.deviceId);
    console.log(originalMessage.eventType);
    console.log(originalMessage.event);
    console.log(originalMessage.event.latitude);
    console.log(originalMessage.event.longitude);
    console.log(originalMessage.event.speed);
    console.log(originalMessage.event.rpm);
        
    self.alterMessage(originalMessage, rinfo, function(alteredMessage){
        console.log("[UDP Server][" +new Date()+ "]Decoded Message");
        console.log(JSON.stringify(alteredMessage));
        self.routeMessage(alteredMessage, message.toString('hex'), function(responseBody){
            console.log("[UDP Server][" +new Date()+ "]Finished posting messages");
        });
    });
        
    callback(null, ackObject);
};

UDPMessageHandler.prototype.alterMessage = function(message, rinfo, callback){

    var self = this;
    console.log("[UDP Server][" +new Date()+ "]Message Received and Proceed for altering message");

    var ipPortInfo = {
        deviceId : message.deviceId,
        pIp : rinfo.address,
        pPort : rinfo.port
    };

    self.cacheStoreManager.storeIPPortInfo(ipPortInfo, function(error, cacheResult){
        if(!error){
            console.log("[UDP Server]["+new Date()+"]Cache store success");
        } else {
            console.log("[UDP Server]["+new Date()+"]Cache store failed "+error);
        }
    });

    self.helper.postDecode(message, rinfo, function(error, alteredMessage){
        if(!error){
            callback(alteredMessage);
        }
    });
};

UDPMessageHandler.prototype.routeMessage = function(message, rawMessage, callback){

    var self = this;
    console.log("[UDP Server][" +new Date()+ "]Message Received and Proceed for routing");

    self.router.route(message, rawMessage, function(error, body){
        if(!error){
            callback(body);
        }
    });

};

UDPMessageHandler.prototype.routeCommandStatus = function(commandResponse, callback){

    var self = this;
    console.log("[UDP Server][" +new Date()+ "]Command Received and proceed for routing");

    if(commandResponse && commandResponse.id){
        self.router.routeCommandStatus(commandResponse, function(error, body){
            if(!error){
                callback(body);
            } else {
                callback(null);
            }
        });
    } else {
        callback(null);
    }
};