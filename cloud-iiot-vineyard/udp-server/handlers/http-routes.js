var HTTPRoutes = function(app){

    this.redisClient = app.redisClient;
    this.enforaUDPServer = app.enforaUDPServer;
    this.cacheManager = app.cacheManager;
    this.router = app.httpRouter;
    this.app = app;

};
module.exports = HTTPRoutes;

HTTPRoutes.prototype.init = function(){

    //Command Expired also should not allow another command while the previous one is pending.
    //Command Sending modes need to be differentiated.

    var self = this;

    self.app.get("/enfora/services/cmd/send", function(req, res){
        var commandObject = {};
        if(req.query.imei && req.query.id){

            var commandObject = {
                imei : req.query.imei,
                corrId : req.query.id,
                command : req.query.cmd,
                binary : req.query.binary,
                cr : req.query.cr,
                lf : req.query.lf,
                channel : req.query.channel,
                commandAck : false
            };

            console.log("[UDP Server]["+new Date()+"]Sending Command to the Device : "+commandObject.imei+", command : "+commandObject.command);

            if(req.query.channel == "udp"){

                self.cacheManager.storeImeiChannelCommand(commandObject, function(err, result){
                    if(!err){
                        self.sendUDPCommand(commandObject, function(sendErr, result){
                            if(!sendErr){
                                res.send("QUEUED");
                            } else {
                                res.send("COMMAND SENT ERROR");
                            }
                        });
                    }
                });

            } else if(req.query.channel == "sms"){
                res.send("CHANNEL_NOT_AVAILABLE");
            } else {
                res.send("UNKNOWN_CHANNEL");
            }
        } else {
            res.send("UNKNOWN_DEVICE");
        }
    });

};

HTTPRoutes.prototype.sendUDPCommand = function(commandObject, callback){

    var self = this;

    self.cacheManager.getIPPortInfo(commandObject.imei, function(err, result){
        if(!err && result){
            var command = new Buffer(commandObject.command, "ascii");
            console.log(command.toString('hex'));
            var hexString = command.toString('hex');
            var originalCommand = '00010400'+hexString;
            var originalCommandBuffer = new Buffer(originalCommand, "hex");
            self.enforaUDPServer.udpServer.server.send(originalCommandBuffer, 0, originalCommandBuffer.length, result.pPort, result.pIp, function(err, bytes){
                console.log("[UDPServer]["+new Date()+"]Command Sent Successfully");
                self.setCommandExpire(commandObject, function(expireErr, result){
                    console.log("[UDP Server]["+new Date()+"]Command Expiration set");
                });
                callback(err, true);
            });
        } else {
            self.setCommandExpire(commandObject, function(expireErr, result){
                console.log("[UDP Server]["+new Date()+"]Command Expiration set");
                callback(err, false);
            });
        }
    });

};

HTTPRoutes.prototype.setCommandExpire = function(commandObject, callback){

    var self = this;
    var timeOutMillis = 0;
    var key = null;
    if(commandObject.channel == "udp"){
        timeOutMillis = 10000;
        key = commandObject.imei+"_"+commandObject.channel;
    } else if(commandObject.channel == "sms"){
        timeOutMillis = 180000;
        key = commandObject.imei+"_"+commandObject.channel;
    }

    setTimeout(function(){
        self.cacheManager.getImeiChannelCommand(key, function(err, result){
            if(result && !result.commandAck){
                console.log("[UDP Server]["+new Date()+"]Command with ID : "+commandObject.id+" got Expired");
                self.cacheManager.removeImeiChannelCommand(key, function(err, result){
                    if(!err){
                        console.log("[UDP Server]["+new Date()+"]Command Expired");
                        var commandResponseObject = {};
                        commandResponseObject['id'] = commandObject.corrId;
                        commandResponseObject['imei'] = commandObject.imei;
                        commandResponseObject['channel'] = commandObject.channel;
                        commandResponseObject['resp'] = "expired";
                        commandResponseObject['sent'] = true;
                        commandResponseObject['gwstamp'] = new Date().getTime();
                        self.router.routeCommandStatus(commandResponseObject, function(err, result){
                            console.log("[UDP Server]["+new Date()+"]Command result posted successfully");
                        });
                    }
                });
            } else {
                console.log("[UDP Server]["+new Date()+"]Command with ID : "+commandObject.corrId+" got acknowledgement");
            }
        });
    }, timeOutMillis);
    callback(null, null);
};