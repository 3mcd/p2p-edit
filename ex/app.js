var webpack = require('webpack');
var webpackConfig = require('./webpack.config');
var webpackMiddleware = require("koa-webpack-dev-middleware");
var compiler = webpack(webpackConfig);

var koa = require('koa');
var koaStatic = require('koa-static');
var app = koa();

app.use(koaStatic(__dirname + '../dist'));
app.use(koaStatic(__dirname + '/public'));

var hotMiddleware = require("webpack-hot-middleware")(compiler);

app.use(webpackMiddleware(compiler, {
    noInfo: true,
    publicPath: webpackConfig.output.publicPath
}));

app.use(function* (next) {
  yield hotMiddleware.bind(null, this.req, this.res);
  yield next;
});

app.listen(8080);