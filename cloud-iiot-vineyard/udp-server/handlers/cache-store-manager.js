var CacheStoreManager = function(app){
    this.redisClient = app.redisClient;
};
module.exports = CacheStoreManager;

CacheStoreManager.prototype.storeIPPortInfo = function(ipPortInfo, callback){

    var self = this;
    if(ipPortInfo.deviceId){
        var ipPort = {
            pIp : ipPortInfo.pIp,
            pPort : ipPortInfo.pPort
        };
        self.redisClient.set(ipPortInfo.deviceId, ipPort, 0, function(err, result){
            if(!err){
                var ipPortKey = ipPortInfo.pIp+":"+ipPortInfo.pPort;
                self.redisClient.set(ipPortKey, {imei : ipPortInfo.deviceId}, 0, function(err2, result){
                    if(!err2){
                        callback(err2, result);
                    } else {
                        console.log("[UDP Server]["+new Date()+"]Problem in caching the ip port and device id");
                        callback(err2, null);
                    }
                });
            } else {
                console.log("[UDP Server]["+new Date()+"]Problem in caching the Device Id and Ip Port Info");
                callback(err, null);
            }
        });
    } else {
        console.log("[UDP Server]["+new Date()+"] No Device Id found");
        callback(null, null);
    }

};

CacheStoreManager.prototype.getImeiByIpPort = function(ipPortKey, callback){

    var self = this;
    self.redisClient.get(ipPortKey, callback);

};

CacheStoreManager.prototype.getIPPortInfo = function(imeiKey, callback){

    var self = this;
    if(imeiKey){
        self.redisClient.get(imeiKey, function(err, ipPortObject){
            if(!err){
                callback(err, ipPortObject);
            } else {
                callback(err, null);
            }
        });
    } else {
        callback(null, null);
    }

};

CacheStoreManager.prototype.storeImeiChannelCommand = function(commandObject, callback){

    var self = this;
    self.redisClient.set(commandObject.imei+"_"+commandObject.channel, commandObject, 0, callback);

};

CacheStoreManager.prototype.getImeiChannelCommand = function(key, callback){

    var self = this;
    self.redisClient.get(key, callback);

};

CacheStoreManager.prototype.removeImeiChannelCommand = function(key, callback){

    var self = this;
    self.redisClient.remove(key, callback);

};