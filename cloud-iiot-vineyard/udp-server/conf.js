var ENV =

    "development";
//    "test";
//    "production";

/* ***********************************************************
 * Node Module Requirements
 * ***********************************************************/
var _ = require("underscore");


/* ***********************************************************
 * Conf - Properties - Options
 * ***********************************************************/
var env_conf = require ( './conf/conf-' + ENV + '.js');
//var sys_props = require('./conf/caref-system-properties.js');
var sys_props = {};

/* ***********************************************************
 * Conf
 * ***********************************************************/
var conf = {};
conf = _.extend (env_conf, sys_props);

module.exports = conf;