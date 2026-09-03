//@ts-check
'use strict';

const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

/** @type {import('webpack').Configuration} */
const config = {
    target: 'node',
    mode: 'production',

    entry: './out/extension.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
        clean: true,
    },

    externals: {
        vscode: 'commonjs vscode',
    },

    resolve: {
        extensions: ['.js'],
    },

    devtool: false,

    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_console: true,
                        drop_debugger: true,
                        dead_code: true,
                        passes: 2,
                    },
                    mangle: {
                        reserved: ['activate', 'deactivate'],
                    },
                    output: {
                        comments: false,
                    },
                },
                extractComments: false,
            }),
        ],
    },

    // Note: no obfuscation — the source is public (MIT) and obfuscated
    // bundles are slower, larger, and a known trigger for marketplace
    // malware scanning. Terser minification is sufficient.
};

module.exports = config;
