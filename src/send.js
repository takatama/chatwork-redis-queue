#!/usr/bin/env node
var Queue = require('bull');
var messages = Queue('chatwork_send_message');
var program = require('commander');

var sendMessage = function (roomId, message, repeat) {
    var i,
        len = repeat ? repeat : 1,
        promises = [];

    for (i = 0; i < len; i++) {
        promises.push(
            messages.add({
                roomId: roomId,
                message: repeat ? message + ' (' + (i + 1) + ')' : message
            }, {
                removeOnComplete: true
            })
        );
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
        sendMessage(roomId, message, program.repeat);
    }).parse(process.argv);
