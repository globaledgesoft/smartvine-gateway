module.exports = {

    web : {
        host : '0.0.0.0',
        port : '8118',
        method : 'session',
        views : {},
        static : {}
    },
    udpConf : {
        host : "0.0.0.0",
        port : "6565",
        handler : "iiot-handler.js"
    },
    queue : {
        host : '0.0.0.0',
        port : 5672
    },
    message : "Running Development Configuration",

    ackMessage : "000A0000",

    routeUrls : ["http://0.0.0.0:8119/gateway/sendmsg"],

    commandSendUrls : ["http://172.16.9.31:8118/command/status"]
};
