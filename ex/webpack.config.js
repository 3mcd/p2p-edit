var webpack = require('webpack');
console.log(__dirname);
var config = {
    entry: [
        'webpack-hot-middleware/client',
        __dirname + '/client/main.jsx'
    ],
    output: {
        path: __dirname + '/public',
        filename: 'bundle.js'
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                loaders: ['react-hot', 'babel-loader?presets[]=es2015,presets[]=stage-0,presets[]=react'],
                include: __dirname + '/client'
            }
        ]
    },
    plugins: [
        new webpack.optimize.OccurrenceOrderPlugin(),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoErrorsPlugin()
    ]
};

module.exports = config;