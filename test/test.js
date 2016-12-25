var assert = require('assert');
var sinon = require('sinon');
var nock = require('nock');
var worker = require('../src/worker');

describe('worker.js', function () {
    beforeEach(function () {
        this.now = new Date('2016-12-25T00:00:00').getTime();
        this.clock = sinon.useFakeTimers(this.now);
    });

    afterEach(function () {
        this.clock.restore();
    });

    describe('#handleRateLimit', function () {
        it('should be called when response is 429', function () {
            var roomId = '0';
            var message = 'hello';
            var resetTime = new Date('2016-12-25T00:00:01').getTime();
            sinon.stub(worker, 'handleRateLimit');

            nock('https://api.chatwork.com')
                .post('/v1/rooms/' + roomId + '/messages', function () {
                    return true; // for all posts to this url
                })
                .reply(429, null, {
                    'X-RateLimit-Reset': Math.ceil(resetTime / 1000)
                });

            return worker.sendMessage({
                data: {
                    roomId: roomId,
                    message: message
                }
            }).then(function () {
                assert.ok(false);
            }).catch(function (err) {
                assert.equal(err.message, 'Rate limit');
                assert.ok(worker.handleRateLimit.called);
                var args = worker.handleRateLimit.getCall(0).args;
                assert.equal(args[0], resetTime);
                assert.deepEqual(args[1], {roomId: roomId, message: message});
            });
        });
    });
});
