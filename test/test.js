var assert = require('assert');
var sinon = require('sinon');
var nock = require('nock');
var worker = require('../src/worker');

describe('worker.js', function () {
    var now = new Date('2016-12-25T00:00:00').getTime(),
        resetTime = new Date('2016-12-25T00:00:01').getTime(),
        sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        sandbox.useFakeTimers(now);
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('#handleRateLimit', function () {
        it('should be called when response is 429', function () {
            var roomId = '0';
            var message = 'hello';
            sandbox.stub(worker, 'handleRateLimit');

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

    describe('#pushBack, #suspendWorker', function () {
        it('should be called in handleRateLimit', function () {
            var roomId = '0';
            var message = 'hello';
            sandbox.stub(worker, 'pushBack').returns(Promise.resolve());
            sandbox.stub(worker, 'suspendWorker').returns(Promise.resolve());

            var promise = worker.handleRateLimit(resetTime, {
                roomId: roomId,
                message: message
            }).then(function () {
                assert.ok(worker.pushBack.called);
                assert.deepEqual(worker.pushBack.getCall(0).args[0], {roomId: roomId, message: message});

                assert.ok(worker.suspendWorker.called);
                assert.deepEqual(worker.suspendWorker.getCall(0).args[0], 1000);
            });

            sandbox.clock.tick(1001);

            return promise;
        });
    });
});
