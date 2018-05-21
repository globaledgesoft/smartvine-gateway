var moment = require('moment');
var EnforaHelper = function(){
    this.moment = moment;
};
module.exports = EnforaHelper;

EnforaHelper.prototype.postDecode = function(data, rinfo, callback){

    var self = this;
    console.log("[UDP Server][" + new Date()+ "]Message received and proceeding for Post Decoding the data");
    
    if(data){
        var alteredMessageData = {};
        if(data.eventType == 'register'){
            alteredMessageData.deviceType = 'garuda';
            alteredMessageData.deviceId = data.deviceId;
            alteredMessageData.eventId = data.eventType;
            alteredMessageData.timestamp = data.timestamp;
            alteredMessageData.gatewayMessageTimeMillis = new Date().getTime();
            alteredMessageData.channel = "udp";
            alteredMessageData.pip = rinfo.address;
            alteredMessageData.pport = rinfo.port;
            callback(null, alteredMessageData);
        } else if(data.eventType == 'heartbeat'){            
            alteredMessageData.deviceType = 'garuda';
            alteredMessageData.deviceId = data.deviceId;
            alteredMessageData.eventId = data.eventType;
            alteredMessageData.speed = data.event.speed;
            alteredMessageData.rpm = data.event.rpm;
            alteredMessageData.timestamp = data.timestamp;
            alteredMessageData.gatewayMessageTimeMillis = new Date().getTime();
            alteredMessageData.channel = "udp";
            alteredMessageData.latitudeDecoded = data.event.latitude;
            alteredMessageData.longitudeDecoded = data.event.longitude;
            alteredMessageData.pip = rinfo.address;
            alteredMessageData.pport = rinfo.port;
            callback(null, alteredMessageData);
        }        
    } else {
        callback(null, data);
    }
    
};

EnforaHelper.prototype.dateDecode = function(data, callback){

    var self = this;
    var dateTime = data.date.toString()+data.time.toString();
    var dateFormat = "DDMMYYHHmmss";
    var formattedDate = self.moment(dateTime, dateFormat);
    var timeMillis = new Date(formattedDate).getTime();

    return timeMillis;

};
