var shitStorm = require('./index');
var master = shitStorm.createMaster([
    {
        host: "localhost",
        port: "8080",
        path: "/AIServer/GetPerformance",
        method: "GET"
    },
    {
        host: "localhost",
        port: "8080",
        path: "/AIServer/ReloadAIConfig?approvalKey={{STORM_INDEX}}",
        method: "GET" 
    }
]);

master
        .addSlave({
            host: "localhost",
            port: 666
        })
        .addSlave({
            host: "localhost",
            port: 667
        })
        .start(100, 10);
master.start(100, 10);