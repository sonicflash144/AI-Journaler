const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const path = require('path');

module.exports = {
    target: 'electron-renderer',
    mode: 'development',
    entry: {
        heatmap: './heatmap.js'
    },
    output: {
        filename: 'webpack.[name].js',
        path: __dirname + '/dist'
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                loader: 'babel-loader',
                options: {
                    presets: ['@babel/preset-env']
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    resolve: {
        extensions: ['.js']
    },
    plugins: [
        new NodePolyfillPlugin(),
    ],
};