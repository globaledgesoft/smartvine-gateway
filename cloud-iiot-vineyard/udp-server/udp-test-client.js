var PORT = 6565;
var HOST = '0.0.0.0';
//var jsonObj = {
//	gatewayId : "12345",
//    deviceType: 'beacon',
//	beaconValues : [
//		{
//			beaconId : "123",
//			rssi : -58
//		} 
//        {
//			beaconId : "234",
//			rssi : -57
//		}, {
//			beaconId : "345",
//			rssi : -54
//		}
//	]
//};

var jsonObj = { 
    gatewayId: '12345',
    deviceType: 'temperature',
    temperature: '38.00' 
};

var dgram = require('dgram');
var message = new Buffer(JSON.stringify(jsonObj));

var client = dgram.createSocket('udp4');
client.send(message, 0, message.length, PORT, HOST, function(err, bytes) {
    if (err) throw err;
    console.log('UDP message sent to ' + HOST +':'+ PORT);
    client.close();
});
