# SHIT STORM - Distributed online service benchmarking framework

ShitStorm is a simple, lightweight node js framework for creating distibuted testing and benchmarking for your online services. ShitStorm was created in order to provide a simple way to send a predefined set of HTTP requests as many times and from as many different machines as your needs.

A simple use case for using ShitStorm is when you want to send a couple of different HTTP requests in a partucular order many times again and again to a remote server in order to test it's stability, availability and limitations. In such a case, running it from a single machine will your benchmark by the bounds of your machine capabilities. If you want to really put your server to test - let many machines ShitStorm it together.

## Installation

```sh
$ npm install shit-storm
```

## Usage
ShitStorm is based on a master-slave architecture, where slave instances do the actual HTTP work, and the master manages configuration. In simple words - to use ShitStorm, slave instances must be created, then one master instance should be created, configured with the public URLs of all slave instances and the actual data to send. That's it! Then just start it and let the magic happen.

The ShitStorm package contain a very simple example of a master instance and a slave instance. Let's go over it.

##### ShitStorm Slave Instance

```js
var shitStorm = require('shit-storm');
shitStorm.createSlave();
```

Not much to configure for slave instances! Namely, only it's public port. ShitStorm slave default port is `666` Make sure you make this port is publicly available and not taken by another process. If you have to change it, simply use the optional settings parameter:

```js
var shitStorm = require('shit-storm');
shitStorm.createSlave({
    port: 667
});
```

That's it! You have a slave instance up and running.

##### ShitStorm Master Instance

Master instance configuration requires a bit more effort. First, let's define the set of HTTP requests that we want to send

```js
var shitStorm = require('shit-storm');
var master = shitStorm.createMaster([
    {
        host: "localhost",
        port: "8080",
        path: "/some/public/endpoint",
        method: "GET", // optional - default "GET"
        queryParams: { // optional
            userId: 17,
            otherUserId: 18
        }
    },
    {
        host: "localhost",
        port: "8080",
        path: "/some/other/public/endpoint",
        method: "POST", // optional - default "GET"
        headers: { // optional - default {}
            "Content-Type": "application/json"
        },
        body: "{\"userId\":17,\"otherUserId\":18}" // optional - default ""
    }
]);
```

In this case, we defined our HTTP set to contain 2 HTTP calls, first of which is a `GET` request to `http://localhost:8080/some/public/endpoint?userId=17&otherUserId=18`, the second is a `POST` request to `http://localhost:8080/some/other/public/endpoint` with content type of `application/json` and body:
```js
{
    userId: 17,
    otherUserId: 18
}
```
NOTICE: In order to send this test case over and over again, you don't have to create a very big array, you just define the basic set, and then let ShitStorm run it iteratively.

Next, let's define our slave instances

```js
master
        .addSlave({
            host: "localhost",
            port: 666
        })
        .addSlave({
            host: "10.0.0.4",
            port: 666
        });
```

Not much there, just configure each slave host and port (again, default port of slaves is `666`) one by one. Lastly, let's start the test!

```js
master.start(intervalMillis, stormCount);
// intervalMillis - the interval between two consecutive calls of each slave
// stormCount - the total number of iterations each slave should perform on the defined test set
```

On our example, if we run

```js
master.start(100, 20);
```

Our master instance will trigger each of the 2 slaves to send 40 requests at a rate of 10 requests per second.