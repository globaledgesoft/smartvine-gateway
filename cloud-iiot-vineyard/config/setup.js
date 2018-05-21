var async = require('async');

var Setup = function(app){
    this.app = app;
    this.knex = app.knex;
    this.config = app.config;
};
module.exports = Setup;

var createSchema = function(callback){
    knex.raw('create schema if not exists '+this.config.schemaname)
    .asCallback(function(err, result){
        if(!err) {
            callback(null, 'Schema creation done');
        } else {
            callback(null, 'Schema already exists');
        }
    });
};

var createDeviceTable = function(callback){
    knex.schema.withSchema(config.schemaname).createTableIfNotExists('device', function(table){
        table.increments('id').primary();
        table.string('device_id', 10).notNullable();
        table.string('device_type', 10).notNullable();
    }).asCallback(function(err, rows){
        if(!err){
            callback(null, 'Device table created');
        } else {
            callback(null, 'Device table already exists');
        }
    });
};

var createTemperatureSensorTable = function(callback){
    knex.schema.withSchema(config.schemaname).createTableIfNotExists('temperature_sensor', function(table){
        table.increments('id').primary();
//        table.integer('year').notNullable();
//        table.integer('month').notNullable();
//        table.integer('day').notNullable();
//        table.integer('hour').notNullable();
        table.bigInteger('reported_time');
        table.float('value').notNullable();
    }).asCallback(function(err, rows) {
        if(!err) {
            callback(null, "temperature_sensor table created");
        } else {
            callback(null, "temperature_sensor table already exists");
        }
    });
};

var createBeaconStatusTable = function(callback){
    knex.schema.withSchema(this.config.schemaname).createTableIfNotExists('beacon_status', function(table){
        table.increments('id').primary();
        table.integer('beacon_id').references('id').inTable(config.schemaname+'.device').notNullable();
        table.integer('rssi_value');
        table.bigInteger('reported_time');
        table.boolean('is_present');
    }).asCallback(function(err, rows){
        if(!err) {
            callback(null, "beacon_status table created");
        } else {
            callback(null, "beacon_status table already exists");
        }
    });
};

var createDefaultRSSIThresholdTable = function(callback){
    knex.schema.withSchema(config.schemaname).createTableIfNotExists('default_rssi_threshold', function(table){
        table.increments('id').primary();
        table.integer('rssi_threshold_value');
        table.string('description', 50);
    })
    .asCallback(function(err, rows){
        if(!err){
            callback(null, "default_rssi_threshold table created");
        } else {
            callback(null, "default_rssi_threshold table creation error");
        }
    });
};

var insertDefaultRSSIValue = function(callback){
    knex.withSchema(config.schemaname).select().table('default_rssi_threshold')
    .asCallback(function(err, rows) {
        if(!err && rows[0]) {
            callback(null, "insertion into default_rssi_threshold failed");
        } else {
            knex.withSchema(config.schemaname).table('default_rssi_threshold')
            .insert({
                rssi_threshold_value : -54,
                description : 'default'
            })
            .asCallback(function(err, rows) {
                if(!err) {
                    callback(null, "default_rssi_value inserted");
                } else {
                    callback(null, "default_rssi_value insertion failed");
                }
            });
        }
    });
};

var createDefaultTemperatureThresholdTable = function(callback){
    knex.schema.withSchema(config.schemaname).createTableIfNotExists('default_temperature_threshold', function(table){
        table.increments('id').primary();
        table.integer('temperature_threshold_value');
        table.string('description', 50);
    })
    .asCallback(function(err, rows){
        if(!err){
            callback(null, "default_temperature_threshold table created");
        } else {
            callback(null, "default_temperature_threshold table creation error");
        }
    });
};

var insertDefaultTemperatureValue = function(callback){
    knex.withSchema(config.schemaname).select().table('default_temperature_threshold')
    .asCallback(function(err, rows) {
        if(!err && rows[0]) {
            callback(null, "insertion into default_temperature_threshold failed");
        } else {
            knex.withSchema(config.schemaname).table('default_temperature_threshold')
            .insert({
                temperature_threshold_value : 32,
                description : 'default'
            })
            .asCallback(function(err, rows) {
                if(!err) {
                    callback(null, "default_temperature_value inserted");
                } else {
                    callback(null, "default_temperature_value insertion failed");
                }
            });
        }
    });
};

Setup.prototype.setup = function(){
    async.series({
        createSchema : createSchema,
        createDeviceTable :createDeviceTable,
        createTemperatureSensorTable : createTemperatureSensorTable,
        createBeaconStatusTable : createBeaconStatusTable,
        createDefaultRSSIThresholdTable : createDefaultRSSIThresholdTable,
        insertDefaultRSSIValue : insertDefaultRSSIValue,
        createDefaultTemperatureThresholdTable : createDefaultTemperatureThresholdTable,
        insertDefaultTemperatureValue : insertDefaultTemperatureValue
    }, function(err, results){
        console.log(results);
    });
};