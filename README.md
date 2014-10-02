# koa-webpack-dev [![Travis CI][travis-image]][travis-url] [![Quality][codeclimate-image]][codeclimate-url] [![Coverage][coveralls-image]][coveralls-url] [![Dependencies][gemnasium-image]][gemnasium-url]
[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/tomchentw/koa-webpack-dev?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
> Koa based middleware for webpack development

[![Version][npm-image]][npm-url]


## Example

```js
var Path = require("path");
var http = require("http");

var koa = require("koa");
var koaStatic = require("koa-static");


var IS_PRODUCTION = "production" === process.env.NODE_ENV;

var app = koa();

app.use(koaStatic(Path.resolve("./public")));

if (!IS_PRODUCTION) {
  var koaWebpackDev = require("koa-webpack-dev");
  var webpackConfig = koaWebpackDev.configure({
    inline: true
  });

  var compiler = require("webpack")(webpackConfig);
  app.use(koaWebpackDev.middleware(compiler, webpackConfig.devServer));
}

var server = http.createServer(app.callback());

if (!IS_PRODUCTION) {
  koaWebpackDev.hotModuleSocket(server, compiler);
}

server.listen(8080);
```

## Usage

### Options


## Contributing

[![devDependency Status][david-dm-image]][david-dm-url]

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request


[npm-image]: https://img.shields.io/npm/v/koa-webpack-dev.svg
[npm-url]: https://www.npmjs.org/package/koa-webpack-dev

[travis-image]: https://travis-ci.org/tomchentw/koa-webpack-dev.svg?branch=master
[travis-url]: https://travis-ci.org/tomchentw/koa-webpack-dev
[codeclimate-image]: https://img.shields.io/codeclimate/github/tomchentw/koa-webpack-dev.svg
[codeclimate-url]: https://codeclimate.com/github/tomchentw/koa-webpack-dev
[coveralls-image]: https://img.shields.io/coveralls/tomchentw/koa-webpack-dev.svg
[coveralls-url]: https://coveralls.io/r/tomchentw/koa-webpack-dev
[gemnasium-image]: https://gemnasium.com/tomchentw/koa-webpack-dev.svg
[gemnasium-url]: https://gemnasium.com/tomchentw/koa-webpack-dev
[david-dm-image]: https://david-dm.org/tomchentw/koa-webpack-dev/dev-status.svg?theme=shields.io
[david-dm-url]: https://david-dm.org/tomchentw/koa-webpack-dev#info=devDependencies
