var { expect } = require("chai");

var Q = require('q');

var plywood = require("../../build/plywood");
var { concurrentLimitRequesterFactory } = plywood.helper;

describe("Retry requester", function() {
  var makeRequester = function() {
    var deferreds = {};

    var requester = function(request) {
      var deferred = Q.defer();
      deferreds[request.query] = deferred;
      return deferred.promise;
    };

    requester.hasQuery = function(query) {
      return Boolean(deferreds[query]);
    };
    requester.resolve = function(query) {
      return deferreds[query].resolve([1, 2, 3]);
    };
    requester.reject = function(query) {
      return deferreds[query].reject(new Error('fail'));
    };
    return requester;
  };

  it("basic works", function(testComplete) {
    var requester = makeRequester();
    var concurrentLimitRequester = concurrentLimitRequesterFactory({
      requester,
      concurrentLimit: 2
    });

    concurrentLimitRequester({ query: 'a' }).then(function(res) {
        expect(res).to.be.an('array');
        return testComplete();
      }
    ).done();

    return requester.resolve('a');
  });

  it("limit works", function(testComplete) {
    var requester = makeRequester();
    var concurrentLimitRequester = concurrentLimitRequesterFactory({
      requester,
      concurrentLimit: 2
    });

    var nextQuery = 'a';
    concurrentLimitRequester({ query: 'a' }).then(function(res) {
        expect(res).to.be.an('array');
        expect(nextQuery).to.equal('a');
        return nextQuery = 'b';
      }
    ).done();

    concurrentLimitRequester({ query: 'b' }).then(function(res) {
        expect(res).to.be.an('array');
        expect(nextQuery).to.equal('b');
        nextQuery = 'c';
        expect(requester.hasQuery('c', 'has c')).to.equal(true);
        return requester.resolve('c');
      }
    ).done();

    concurrentLimitRequester({ query: 'c' }).then(function(res) {
        expect(res).to.be.an('array');
        expect(nextQuery).to.equal('c');
        return testComplete();
      }
    ).done();

    expect(requester.hasQuery('a'), 'has a').to.equal(true);
    expect(requester.hasQuery('b'), 'has b').to.equal(true);
    expect(requester.hasQuery('c'), 'has c').to.equal(false);
    requester.resolve('a');
    return requester.resolve('b');
  });
});