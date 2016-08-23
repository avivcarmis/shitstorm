// -------------------------- CONSTANTS -----------------------------------

var DEFAULT_PORT = 666;

// -------------------------- LIBS -----------------------------------

var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');

// -------------------------- MASTER -----------------------------------

function ShitStormMaster(stormMessages) {
    if (!stormMessages instanceof Array) {
        stormMessages = [stormMessages];
    }
    for (var i = 0; i < stormMessages.length; i++) {
        var messageDescriptor = stormMessages[i];
        var template = {
            host: null,
            port: null,
            path: null,
            method: "GET",
            headers: {},
            body: "",
            queryParams: {}
        };
        migrateObject(template, messageDescriptor);
        if (template.host === null || template.port === null || template.path === null) {
            throw "Error: a storm message must specify at least host, port and path";
        }
        stormMessages[i] = template;
    }
    this.stormMessages = stormMessages;
}

ShitStormMaster.prototype.slaves = [];

ShitStormMaster.prototype.stormMessages = null;

ShitStormMaster.prototype.addSlave = function(slave) {
    if (typeof slave === "string") {
        slave = {
            host: slave,
            port: DEFAULT_PORT
        };
    }
    this.slaves.push(slave);
    return this;
};

ShitStormMaster.prototype.start = function(intervalMillis, stormCount) {
    var body = JSON.stringify({
        intervalMillis: intervalMillis,
        stormCount: stormCount,
        stormDescriptor: this.stormMessages
    });
    for (var i = 0; i < this.slaves.length; i++) {
        var slave = this.slaves[i];
        this.startSlave(slave, body);
    }
};

ShitStormMaster.prototype.startSlave = function(slave, body) {
    sendHTTPRequest({
        host: slave.host,
        port: slave.port,
        path: "/start",
        method: "POST",
        body: body,
        headers: {
            "Content-Type": "application/json"
        }
    }, {
        success: function(res) {
            if (res !== "") {
                console.log("failed to start slave " + slave.host + ":" + slave.port + " due to: " + res);
            }
            else {
                console.log("successfully started slave " + slave.host + ":" + slave.port);
            }
        },
        error: function(err) {
            console.log("failed to start slave " + slave.host + ":" + slave.port + " due to: " + err);
        }
    });
};

// -------------------------- SLAVE -----------------------------------

function ShitStormSlave(settings) {
    var template = {
        port: DEFAULT_PORT
    };
    migrateObject(template, settings);
    this.settings = template;
    this.start();
}

ShitStormSlave.prototype.settings = null;

ShitStormSlave.prototype.start = function() {
    var self = this;
    var app = express();
    app.use(bodyParser.json());
    app.post('/start', function (req, res) {
        try {
            if (typeof req.body.intervalMillis === "undefined") {
                throw "must specify intervalMillis";
            }
            if (typeof req.body.stormCount === "undefined") {
                throw "must specify stormCount";
            }
            if (typeof req.body.stormDescriptor === "undefined") {
                throw "must specify stormDescriptor";
            }
            self.doShitStorm(0, req.body.intervalMillis, req.body.stormCount, req.body.stormDescriptor);
            res.send("");
        } catch (e) {
            res.send(e.toString());
        }
    });
    app.listen(this.settings.port);
    console.log("Slave started on port " + this.settings.port);
};

ShitStormSlave.prototype.doShitStorm = function(stormIndex, intervalMillis, totalCount, stormDescriptor) {
    if (stormIndex === totalCount) {
        return;
    }
    for (var i = 0; i < stormDescriptor.length; i++) {
        var descriptorString = JSON.stringify(stormDescriptor[i]);
        descriptorString = descriptorString.split("{{STORM_INDEX}}").join(stormIndex);
        var messageDescriptor = JSON.parse(descriptorString);
        this.queueMessage(i * intervalMillis, messageDescriptor, {
            success: function() {
                console.log("success");
            },
            error: function(err) {
                console.log("error: " + err);
            }
        });
    }
    var self = this;
    setTimeout(function() {
        self.doShitStorm(stormIndex + 1, intervalMillis, totalCount, stormDescriptor);
    }, intervalMillis * stormDescriptor.length);
};

ShitStormSlave.prototype.queueMessage = function(timeout, messageDescriptor, callbacks) {
    setTimeout(function() {
        sendHTTPRequest(messageDescriptor, callbacks);
    }, timeout);
};

// -------------------------- UTILS -----------------------------------

function migrateObject(template, data) {
    if (data) {
        for (var key in data) {
            template[key] = data[key];
        }
    }
}

function sendHTTPRequest(messageDescriptor, callbacks) {
    var queryParams = [];
    if (messageDescriptor.queryParams) {
        for (var key in messageDescriptor.queryParams) {
            queryParams.push(key + "=" + messageDescriptor.queryParams[key]);
        }
    }
    var queryString = queryParams.length > 0 ? ("?" + queryParams.join("&")) : "";
    if (!messageDescriptor.headers) {
        messageDescriptor.headers = {};
    }
    messageDescriptor.headers['Content-Length'] = Buffer.byteLength(messageDescriptor.body);
    var options = {
        host: messageDescriptor.host,
        port: messageDescriptor.port,
        path: messageDescriptor.path + queryString,
        method: messageDescriptor.method,
        headers: messageDescriptor.headers
    };
    var req = http.request(options, function (res) {
        res.setEncoding('utf8');
        var body = "";
        res.on('data', function(chunk) {
            body += chunk.toString();
        });
        res.on('end', function() {
            if (typeof callbacks.success === "function") {
                callbacks.success(body);
            }
        });
    });
    req.on('error', function (err) {
        if (typeof callbacks.error === "function") {
            callbacks.error(err);
        }
    });
    req.write(messageDescriptor.body);
    req.end();
}

// -------------------------- EXPORT -----------------------------------

module.exports = {
    createMaster: function(stormMessages) {
        return new ShitStormMaster(stormMessages);
    },
    createSlave: function(settings) {
        return new ShitStormSlave(settings);
    }
};