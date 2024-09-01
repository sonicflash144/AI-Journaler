const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

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
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    plugins: [
        new NodePolyfillPlugin(),
    ],
};