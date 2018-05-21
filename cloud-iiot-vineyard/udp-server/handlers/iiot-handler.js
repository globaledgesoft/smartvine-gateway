var request = require("request");
var async = require('async');

var UDPMessageHandler = function(app){
    this.conf = app.conf;    
    this.router = app.httpRouter;
};
module.exports = UDPMessageHandler;

UDPMessageHandler.prototype.socketHandler = function(message, rinfo, callback){
    var self = this;

    var ackMessage = self.conf.ackMessage;

    var ackObject = {
        isAck : false
    };

    console.log("[UDP Server][" +new Date()+ "]Message Received and Proceed for Decoding");
    var originalMessage = JSON.parse(JSON.parse(JSON.stringify(message.toString())));
    console.log(originalMessage);
    console.log(originalMessage.beaconValues);
    
    self.routeMessage(originalMessage, message.toString('hex'), function(responseBody) {
        console.log("[UDP Server][" +new Date()+ "]Finished posting messages");
    });
        
    callback(null, ackObject);
};

UDPMessageHandler.prototype.routeMessage = function(message, rawMessage, callback){

    var self = this;
    console.log("[UDP Server][" +new Date()+ "]Message Received and Proceed for routing");

    self.router.routeViaQueue(message, rawMessage, function(error, body){
        if(!error){
            callback(body);
        }
    });

};