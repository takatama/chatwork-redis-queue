var Queue = require('bull');
var messages = Queue('chatwork_send_message');

var fs = require('fs');
var request = require('request');
var token;

var sendMessage = function (job, done) {
    var roomId = job.data.roomId;
    var message = job.data.message;

    request.post({
        url: 'https://api.chatwork.com/v1/rooms/' + roomId + '/messages',
        headers: {
            'X-ChatWorkToken': token
        },
        form: {
            body: message
        }
    }, function (error, response, body) {
        if (error) {
            done(error);
        } else if (response.statusCode === 429) {
            var resetTime = parseInt(response.headers['x-ratelimit-reset'] + '000', 10);
            var waitMillisec = resetTime - Date.now();
            console.log('Rate limit will be reset at ' + new Date(resetTime) + ' (after ' + waitMillisec + ' millisec).');
            messages.add(job.data, {
                lifo: true,
                removeOnComplete: true
            });
            done(new Error('Rate limit'));
            messages.pause().then(function () {
               setTimeout(function () {
                   messages.resume().then(function () {
                       console.log('...resumed at ' + new Date());
                   });
               }, waitMillisec);
            });
        } else if (response.statusCode === 200) {
            var res = JSON.parse(body);
            console.log('message_id: ' + res['message_id']);
            done();
        }
    });
};

messages.process(function (job, done) {
    sendMessage(job, done);
});

fs.readFile('.chatwork.credential', 'utf8', function (err, data) {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    token = data.replace(/\r/g, '').split('\n')[0];
});
