var Queue = require('bull');
var messages = Queue('chatwork_send_message');

var sendMessage = function (roomId, message) {
    return messages.add({
        roomId: roomId,
        message: message
    }, {
        removeOnComplete: true
    });
};

exports.sendMessage = sendMessage;
