var request = require("request");

var Router = function(app){
    this.request = request;
    this.urls = app.conf.routeUrls;
    this.commandSendUrls = app.conf.commandSendUrls;
    this.qconn = app.qconn;
    this.queue = app.queue;
};
module.exports = Router;

Router.prototype.route = function(data, rawMessage, cb){

    var self = this;

    console.log("[UDP Server][" +new Date()+ "]Message Received and Proceed for http posting");

    for(j=0 ;j< self.urls.length;j++){
        self.request.post({
            headers: {'content-type' : 'application/x-www-form-urlencoded'},
            url: self.urls[j],
            body: 'type=status&json='+JSON.stringify(data)
        },function(error, response, body){
            console.log("[UDP Server][" +new Date()+ "] Message Posting to the URL : "+self.urls[j]+" and response : "+body);
        });
    }
    cb(null, null);
};

Router.prototype.routeCommandStatus = function(commandResponse, cb){

    console.log(commandResponse);
    var self = this;
    console.log("[UDP Server]["+new Date()+"]Command Response Received and proceed for http posting");

    console.log(self.commandSendUrls);

    for(i=0;i<self.commandSendUrls.length;i++){
        var sentUrl = self.commandSendUrls[i]+"?id="+commandResponse.id+"&channel="+commandResponse.channel+"&imei="+commandResponse.imei+"&resp="+encodeURIComponent(commandResponse.resp)+"&sent="+commandResponse.sent+"&gwstamp="+commandResponse.gwstamp;

        console.log(sentUrl);
        self.request.get({
            headers: {'content-type' : 'text/plain'},
            url: sentUrl
        },function(error, response, body){
            console.log(error);
            console.log("[UDP Server][" +new Date()+ "] Message Posting to the URL : "+self.commandSendUrls[i]+" and response : "+body);
        });
    }
    cb(null, true);
};

Router.prototype.routeViaQueue = function(data, rawMessage, cb){
    var self = this;
    data = JSON.stringify(data);
    self.queue.pub("iiot-beacon-message-queue", new Buffer(data));
    cb(null,true);
};