#!/usr/bin/env node
var Queue = require('bull');
var messages = Queue('chatwork_send_message');
var program = require('commander');

var sendMessage = function (roomId, message, repeat) {
    var i, len = repeat ? repeat: 1, added = 0;
    for (i = 0; i < len; i++) {
        messages.add({
            roomId: roomId,
            message: repeat ? message + ' (' + (i + 1) + ')' : message
        }, {
            removeOnComplete: true
        }).then(function () {
            added += 1;
            if (added == len) {
                process.exit(0);
            }
        });
    }
};

program
    .version('0.0.1')
    .arguments('<roomId> <message>')
    .option('-r, --repeat <n>', 'repeat sending <n> times.', parseInt)
    .action(function (roomId, message) {
        sendMessage(roomId, message, program.repeat);
    }).parse(process.argv);
