#!/usr/bin/env node
var client = require('./client');
var program = require('commander');

var sendMessages = function (roomId, message, repeat) {
    var i,
        len = repeat ? repeat : 1,
        promises = [];

    for (i = 0; i < len; i++) {
        var m = repeat ? message + ' (' + (i + 1) + ')' : message;
        promises.push(client.sendMessage(roomId, m));
    }

    Promise.all(promises).then(function (jobs) {
        var jobIds = jobs.map(function (job) {
            return job.jobId;
        });
        console.log('Job Id: ' + jobIds);
        process.exit(0);
    }).catch(function (err) {
        console.error(err);
        process.exit(1);
    });
};

program
    .version('0.0.1')
    .arguments('<roomId> <message>')
    .option('-r, --repeat <n>', 'repeat sending <n> times.', parseInt)
    .action(function (roomId, message) {
        sendMessages(roomId, message, program.repeat);
    }).parse(process.argv);
