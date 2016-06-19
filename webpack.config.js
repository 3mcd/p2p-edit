var webpack = require('webpack');

var config = {
    entry: __dirname + '/src/client/main',
    output: {
        path: __dirname + '/dist',
        filename: 'p2p-edit.js',
        libraryTarget: 'umd'
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                loaders: ['babel-loader?presets[]=es2015,presets[]=stage-0'],
                include: [__dirname + '/src', __dirname + '/lib']
            }
        ]
    }
};

module.exports = config;