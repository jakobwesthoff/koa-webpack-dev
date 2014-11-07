"use strict";
var convertArgv = require("webpack/bin/convert-argv"),

    SIMULATE_OPTIMIST = {},
    SIMULATE_ARGV = {
      _: [],
      hot: true
    },
    configurePrototype = Configure.prototype;

module.exports = Configure;

function Configure (originalCLIArguments) {
  if (!(this instanceof Configure)) { return new Configure(originalCLIArguments); }
  var wpOpt,
      options;
  wpOpt = this.wpOpt = convertArgv(SIMULATE_OPTIMIST, SIMULATE_ARGV, {
    outputFilename: "/bundle.js"
  });
  this.originalCLIArguments = originalCLIArguments = originalCLIArguments || {};
  options = this.options = wpOpt.devServer || {};
  if (Array.isArray(wpOpt)) {
    this.wpOptArray = wpOpt;
  } else {
    this.wpOptArray = [wpOpt];
  }
  // start normalizing
  originalCLIArguments.port = originalCLIArguments.port || 8080;

  options.publicPath = options.publicPath || this.getPublicPath();
  // options.outputPath = options.outputPath || "/";// UNUSED
  options.filename = options.filename || (wpOpt.output && wpOpt.output.filename);
  this.wpOptArray.forEach(resetOutputPath);

  options.stats = options.stats || {
    cached: false,
    cachedAssets: false
  };

  if (originalCLIArguments.inline) {
    this.inlineWebpackHotModuleLogic();
  }

  return wpOpt;
}

function resetOutputPath (wpOpt) {
  wpOpt.output.path = "/";
}

configurePrototype.getPublicPath = function () {
  var result = this.wpOpt.output && this.wpOpt.output.publicPath || "";
  if (!(/^(https?:)?\/\//).test(result) && "/" !== result[0]) {
    result = "/" + result;
  }
  return result;
};

configurePrototype.inlineWebpackHotModuleLogic = function () {
  var devClient = [
    require.resolve("webpack-dev-server/client") + "?http://localhost:" + this.originalCLIArguments.port,
    "webpack/hot/dev-server"
  ];
  this.wpOptArray.forEach(function (wpOpt) {
    if ("object" === typeof wpOpt.entry) {
      Object.keys(wpOpt.entry).forEach(function (key) {
        wpOpt.entry[key] = devClient.concat(wpOpt.entry[key]);
      });
    } else {
      wpOpt.entry = devClient.concat(wpOpt.entry);
    }
  });
};
