"use strict";
var Path = require("path"),

    debug = require("debug")("koa-webpack-dev:hot_module_socket"),
    socketio = require("socket.io"),
    /* jshint -W079 */
    Promise = require("native-or-bluebird"),

    hotModuleSocketPrototype = HotModuleSocket.prototype;

module.exports = HotModuleSocket;

function noop () {}

function HotModuleSocket (server, compiler, options) {
  if (!(this instanceof HotModuleSocket)) { return new HotModuleSocket(server, compiler, options); }
  options = options || {};
  this._hot = (false !== options.hot);// This is a HotModuleSocket!!
  this._io = {// Null Object Pattern
    emit: noop
  };

  var _onInvalidCompile = this._onInvalidCompile.bind(this),
      io;

  compiler.plugin("invalid", _onInvalidCompile);
  compiler.plugin("compile", _onInvalidCompile);
  compiler.plugin("done", this._onCompileDone.bind(this));

  io = socketio.listen(server);
  io.on("connection", this._onSocketConnection.bind(this));
  return io;
}

hotModuleSocketPrototype._onSocketConnection = function (io) {
  debug("_onSocketConnection");
  this._io = io;
  if (this._hot) { this._io.emit("hot"); }
  if (this._stats) { this._sendStats(true); }
};

hotModuleSocketPrototype._onInvalidCompile = function () {
  this._io.emit("invalid");
};

hotModuleSocketPrototype._onCompileDone = function (newStats) {
  this._stats = newStats;
  this._sendStats(false);
};

hotModuleSocketPrototype._sendStats = function (force) {
  var stats = this._stats.toJson(),
      io = this._io;
  if (!force && stats && stats.assets && stats.assets.every(assetsNotEmitted)) {
    return;
  }
  io.emit("hash", stats.hash);
  if (0 < stats.errors.length) {
    io.emit("errors", stats.errors);
  } else if (0 < stats.warnings.length) {
    io.emit("warnings", stats.warnings);
  } else {
    io.emit("ok");
  }
};

function assetsNotEmitted (asset) {
  return !asset.emitted;
}
