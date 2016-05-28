/* jshint esversion: 6 */

var EE       = require('events').EventEmitter;
var url      = require('url');
var path     = require('path');
var http     = require('http');
var debuglog = require('util').debuglog;
var spawn    = require('child_process').spawn;
var async    = require('async');
var stream   = require('stream-util2');
var javaHome = require('locate-java-home');

var urlTpl = { protocol: 'http:', hostname: '127.0.0.1' };

var defaults = {
  jar        : 'cc-web-runner-standalone-1.0.5.jar',
  port       : 8081,
  startup    : 5000,
  statusUrl  : Object.assign({}, urlTpl, { path: '/status' }),
  externsUrl : Object.assign({}, urlTpl, { path: '/externs' }),
  compileUrl : Object.assign({}, urlTpl, { path: '/compile' })
};

var debug = debuglog('cc-runner');

module.exports = create;
function create(options) {
  var runner = new EE();

  runner.status = function $status(query, done) {
    if (typeof query == 'function') {
      done  = query;
      query = {};
    }

    status(this, query, done);
  };

  runner.externs = function $externs(done) {
    externs(this, done);
  };

  runner.compile = function $compile(data, done) {
    compile(this, data, done);
  };

  runner.kill = function $kill() {
    kill(this);
  };

  if (typeof options == 'function') {
    done    = options;
    options = {};
  }

  options = Object.assign({}, defaults, options);
  options.runner = runner;
  options.statusUrl.port  = options.port;
  options.externsUrl.port = options.port;
  options.compileUrl.port = options.port;
  runner._options = options;

  async.waterfall([
    async.apply(locateJava, runner),
    startRunner
  ], test);

  return runner;
}

function locateJava(runner, next) {
  javaHome({ version: '>=1.8' }, (error, home) => {
    var java;

    if ( ! error) {
      home = home.length && home[0];
      java = home && home.executables;
      java = java && java.java;

      if (java) {
        runner._options.java = java;
        debug('Java executable found at %s', java);
      } else {
        error = new Error('Java not found');
      }
    }

    next(error, runner);
  });
}

function startRunner(runner, next) {
  var options = runner._options;
  var args = [
    '-Dport='+ options.port,
    '-jar', path.resolve(__dirname, options.jar)
  ].concat((options.javaArgs || []));

  debug('Execute runner: %s %s', options.java, args.join(' '));
  options.cp = spawn(options.java, args);

  next(null, runner);
}

function test(error, runner) {
  var options, success, t0, lastError;

  options = runner._options;
  success = false;

  if (error) {
    debug('Error\n', error.stack);
    runner.emit('error', error);
  } else {
    t0 = +new Date();

    debug('Online');
    runner.emit('online');
    options.cp.once('error', (error) => runner.emit('error', error));

    async.doWhilst(function (next) {
      status(runner, {}, (error) => {
        if (error) {
          debug('Retry');
          lastError = error;
          setTimeout(next, Math.min(1000, options.startup / 3));
        } else {
          success = true;
          debug('Listening');
          runner.emit('listening');
        }
      });
    }, function () {
      return ! success && (+new Date()) - t0 < options.startup;
    }, function (error) {
      if ( ! error && ! success) {
        error = lastError;
      }

      if (error) {
        runner.emit('error', error);
      }
    });
  }
}

function status(instance, query, done) {
  var url;

  query = Object.keys(query)
  .map(key => [ key, query[key] ].join('='))
  .reduce((q, pair) => q + pair, '?');

  url = Object.assign({
    method: 'GET',
  }, instance._options.statusUrl);
  url.path += query;

  debug('Status');
  _requestAndDecode(url, done);
}

function externs(instance, done) {
  var url = Object.assign({
    method: 'GET'
  }, instance._options.externsUrl);

  debug('Externs');
  _requestAndDecode(url, done);
}

function compile(instance, data, done) {
  var url = Object.assign({
    method: 'POST',
    data: data
  }, instance._options.compileUrl);

  debug('Compile\n', data);
  _requestAndDecode(url, done);
}

function kill(instance) {
  instance._options.cp.kill();
}

function _requestAndDecode(url, done) {
  _request(url, (error, res) => {
    if (error) {
      debug('Error\n', error.stack);
      done(error);
    } else {
      _decode(res, done);
    }
  });
}

function _request(options, done) {
  var req;

  try {
    debug('Request '+ JSON.stringify(options));
    req = http.request(options, (res) => {
      if (res.statusCode != 200) {
        done(new Error('HTTP '+ res.statusCode +' '+ res.statusMessage));
      } else {
        done(null, res);
      }
    });
    req.on('error', done);
    req.setHeader('content-type', 'application/json');
    if (options.data) {
      req.write(JSON.stringify(options.data));
    }
    req.end();
  } catch (ex) {
    done(ex);
  }
}

function _decode(res, done) {
  res
  .on('error', done)
  .pipe(stream.buffer())
  .pipe(stream.writable((chunk, done_) => {
    chunk = JSON.parse(chunk.toString());
    done_();
    done(null, chunk);
  }));
}
