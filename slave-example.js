var shitStorm = require('./index');
var argv = require('yargs').argv;

var port = argv.p || 666;
shitStorm.createSlave({
    port: port
});