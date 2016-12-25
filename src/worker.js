var Queue = require('bull');
var messages = Queue('chatwork_send_message');

var fs = require('fs');
var request = require('request');
var token;

var pushBack = function (data) {
    return messages.add(data, {
        lifo: true,
        removeOnComplete: true
    });
};

var suspendWorker = function (millisec) {
    return new Promise(function (resolve, reject) {
        messages.pause().then(function () {
            setTimeout(function () {
                messages.resume().then(function () {
                    resolve();
                }).catch(function (err) {
                    reject(err);
                });
            }, millisec);
        }).catch(function (err) {
            reject(err);
        });
    });
};

var handleRateLimit = function (resetTime, data) {
    var waitMillisec = resetTime - Date.now();
    console.log('Rate limit will be reset at ' + new Date(resetTime) + ' (after ' + waitMillisec + ' millisec).');
    pushBack(data).then(function () {
        suspendWorker(waitMillisec).then(function () {
            console.log('...resumed at ' + new Date());
        });
    });
};

var sendMessage = function (job) {
    return new Promise(function (resolve, reject) {
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
                reject(error);
            } else if (response.statusCode === 429) {
                var resetTime = parseInt(response.headers['x-ratelimit-reset'] + '000', 10);
                handleRateLimit(resetTime, job.data);
                reject(new Error('Rate limit'));
            } else if (response.statusCode === 200) {
                var res = JSON.parse(body);
                console.log('message-id: ' + res['message_id']);
                resolve(res);
            }
        });
    });
};

messages.resume().then(function () { // This worker might be paused if Redis is shutdown unexpectedly.
    messages.process(function (job) {
        return sendMessage(job);
    });
});

fs.readFile('.chatwork.credential', 'utf8', function (err, data) {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    token = data.replace(/\r/g, '').split('\n')[0];
});
