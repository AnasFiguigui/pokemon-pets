//@ts-check
'use strict';

const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const WebpackObfuscator = require('webpack-obfuscator');

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

    plugins: [
        new WebpackObfuscator({
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.5,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.2,
            identifierNamesGenerator: 'hexadecimal',
            renameGlobals: false,
            rotateStringArray: true,
            selfDefending: false,
            stringArray: true,
            stringArrayEncoding: ['base64'],
            stringArrayThreshold: 0.75,
            transformObjectKeys: true,
            unicodeEscapeSequence: false,

            // Keep reserved names for VS Code API
            reservedNames: ['^activate$', '^deactivate$'],
        }),
    ],
};

module.exports = config;
