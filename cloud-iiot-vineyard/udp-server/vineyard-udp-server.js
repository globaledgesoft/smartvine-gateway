var UDPServerInstance = require("udp_server");
var conf = global.conf;

var GarudaHandler = require(__dirname+'/handlers/'+conf.udpConf.handler);

var colors = require('colors');

colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'green',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
});

var udpServer = null;
var GarudaUDPServer = function(app){

    this.garudaHandler = new GarudaHandler(app);

    app.conf.udpConf.handler = this.garudaHandler;
    app.conf.udpConf.colors = colors;
    this.udpServer = new UDPServerInstance(app.conf.udpConf);

};
module.exports = GarudaUDPServer;

GarudaUDPServer.prototype.init = function(){
    var self = this;
    try{
        self.udpServer.connect();
    }catch(err){
        console.log(err);
    }
};