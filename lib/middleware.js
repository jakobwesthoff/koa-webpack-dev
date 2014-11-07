"use strict";
var Path = require("path");
var mime = require("mime");

var debug = require("debug")("koa-webpack-dev:middleware");
var MemoryFileSystem = require("memory-fs");
/* jshint -W079 */
var Promise = require("native-or-bluebird");

module.exports = Middleware;

function optionsWithDefaults (options) {
  var stats = options.stats;
  if (options.watchDelay === undefined) { options.watchDelay = 200; }
  if (stats === undefined) {
    stats = options.stats = {};
  }
  if (typeof stats === "object" && stats.context === undefined) {
    stats.context = process.cwd();
  }
  return options;
}

function throwError (err) {
  if (err) { throw err; }
}

function noop () {}

function pathJoin (a, b) {
  return "/" === a  ? "/" + b : (a||"") + "/" + b;
}

/*
 * options:
 *  lazy: boolean
 *  watchDelay: Number
 *  filename: String
 *  headers: object
 *  publicPath: String
 *  noInfo: boolean
 *  quiet: boolean
 *  stats: object
 */
function Middleware (compiler, options) {
  if (!(this instanceof Middleware)) { return new Middleware(compiler, options); }
  this.compiler = compiler;
  this.options = options = optionsWithDefaults(options || {});

  this.fileSystem = compiler.outputFileSystem = new MemoryFileSystem();
  this._forceRebuild = false;
  if (options.lazy) {
    this._compileState = true;
    this._watchingCompile = {// Null Object Pattern
      invalidate: noop,
      close: function(it) { it(); }
    };
  } else {
    this._compileState = false;
    this._watchingCompile = compiler.watch(options.watchDelay, throwError);
  }
  this._createPromiseResolver();  

  var _onInvalidCompile = this._onInvalidCompile.bind(this);
  compiler.plugin("invalid", _onInvalidCompile);
  compiler.plugin("compile", _onInvalidCompile);
  compiler.plugin("done", this._onCompileDone.bind(this));

  return createRealMiddleware(this);
}

function createRealMiddleware (middleware) {
  return function* (next) {
    var filename = middleware.getFilenameFromUrl(this.url);
    if (filename === false) {
      yield next;
      return;
    }

    if (middleware.options.lazy &&
      filename === pathJoin(middleware.compiler.outputPath, middleware.options.filename)) {
      middleware._rebuild();
    }

    if (!middleware._compileState) {
      debug("webpack: wait until bundle finished: " + this.url);
    }

    yield middleware._promise;

    try {
      var stat = middleware.fileSystem.statSync(filename);
      if (!stat.isFile()) {
        if (stat.isDirectory()) {
          filename = Path.join(filename, "index.html");
          stat = middleware.fileSystem.statSync(filename);
          if (!stat.isFile()) {
            throw "next";
          }
        } else {
          throw "next";
        }
      }
    } catch(e) {
      yield next;
      return;
    }

    // server content
    this.set("Access-Control-Allow-Origin", "*"); // To support XHR, etc.
    this.set("Content-Type", mime.lookup(filename));
    if (middleware.options.headers) {
      this.set(middleware.options.headers);
    }
    this.body = middleware.fileSystem.readFileSync(filename);
    yield next;
  };
}

var middlewarePrototype = Middleware.prototype;

middlewarePrototype.invalidate = function () {
  this._watchingCompile.invalidate();
};

middlewarePrototype.close = function (callback) {
  callback = callback || noop;
  this._watchingCompile.close(callback);
};

middlewarePrototype.getFilenameFromUrl = function (url) {
  // publicPrefix is the folder our bundle should be in
  var localPrefix = this.options.publicPath || "/";
  if (url.indexOf(localPrefix) !== 0) {
    if (/^(https?:)?\/\//.test(localPrefix)) {
      localPrefix = "/" + localPrefix.replace(/^(https?:)?\/\/[^\/]+\//, "");
      // fast exit if another directory requested
      if (url.indexOf(localPrefix) !== 0) {
        return false;
      }
    } else {
      return false;
    }
  }
  // get filename from request
  var filename = url.substr(localPrefix.length);
  if(filename.indexOf("?") >= 0) {
    filename = filename.substr(0, filename.indexOf("?"));
  }
  return filename ? pathJoin(this.compiler.outputPath, filename) : this.compiler.outputPath;
};

middlewarePrototype._createPromiseResolver = function () {
  debug("_createPromiseResolver");
  this._promise = new Promise(bindDeferredFunction.bind(this));
};

middlewarePrototype._logInfo = function (message) {
  if (!this.options.noInfo && !this.options.quiet) {
    console.info(message);
  }
};

middlewarePrototype._rebuild = function () {
  if (this._compileState) {
    this._compileState = false;
    this.compiler.run(throwError);
  } else {
    this._forceRebuild = true;
  }
};

middlewarePrototype._onInvalidCompile = function () {
  if (this._compileState) {
    this._logInfo("webpack: bundle is now INVALID.");
  }
  this._compileState = false;
};

middlewarePrototype._onCompileDone = function (newStats) {
  this._compileState = true;

  // Do the stuff in nextTick, because bundle may be invalidated
  //  if a change happend while compiling
  process.nextTick(function () {
    if (!this._compileState) { return; }// check if still in valid state

    debug(newStats.toString(this.options.stats));

    this._logInfo("webpack: bundle is now VALID.");

    this._statResolver();
    // this._createPromiseResolver();
  }.bind(this));

  if (this._forceRebuild) {
    this._forceRebuild = false;
    this._rebuild();
  }
};

/* jshint -W040 */
function bindDeferredFunction (resolve, reject) {
  this._statResolver = resolve;
  this._statRejector = reject;
}
