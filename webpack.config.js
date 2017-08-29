/* eslint-env node */
const autoprefixer = require('autoprefixer');
const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  context: __dirname + '/app',
  entry: {
    hglib: ['./scripts/hglib.jsx'],
    worker: ['./scripts/worker.js']
  },
  devtool: "cheap-source-map",
  output: {
  path: __dirname + '/build',
  publicPath: '/',
  filename: '[name].js',
  libraryTarget: 'umd',
  library: '[name]'
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        include: [
          path.resolve(__dirname, 'app/scripts'),
          path.resolve(__dirname, 'test')
        ],
        use: [
          {
            loader: 'babel-loader',
            options: {
              plugins: [
              [
                'react-css-modules',
                {
                  context: path.resolve(__dirname, 'app'),
                  filetypes: {
                    '.scss': {
                    syntax: 'postcss-scss'
                    }
                  },
                  generateScopedName: '[name]_[local]-[hash:base64:5]'
                }
              ]
              ],
              presets: [
                ['es2015', { modules: false }],
                'react'
              ]
            }
          }
        ]
      },
      {
        test: /\.s?css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader',
              options: {
                importLoaders: 2,
                localIdentName: '[name]_[local]-[hash:base64:5]',
                minimize: process.env.NODE_ENV === 'development' ? false : { presets: 'default' },
                modules: true,
                sourceMap: process.env.NODE_ENV === 'development' ? false : true
              }
            },
            {
              loader: 'postcss-loader',
              options: {
                // Necessary for external CSS imports to work
                // https://github.com/facebookincubator/create-react-app/issues/2677
                ident: 'postcss',
                plugins: () => [
                  require('postcss-flexbugs-fixes'),
                  autoprefixer({
                    browsers: [
                      '>1%',
                      'last 4 versions',
                      'Firefox ESR',
                      'not ie < 9'  // React doesn't support IE8 anyway
                    ],
                    flexbox: 'no-2009'
                  })
                ],
                sourceMap: process.env.NODE_ENV === 'development' ? false : true
              }
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: process.env.NODE_ENV === 'development' ? false : true
              }
            }
          ]
        })
      }
    ],
    noParse: [
      /node_modules\/sinon\//
    ]
  },
  externals: {
    "pixi.js": {
      commonjs: "pixi.js",
      commonjs2: "pixi.js",
      amd: "pixi.js",
      root: "PIXI"
    },
    "react" : {
      commonjs: "react",
      commonjs2: "react",
      amd: "react",
      root: "React"
    },
    "react-dom": {
      commonjs: "react-dom",
      commonjs2: "react-dom",
      amd: "react-dom",
      root: "ReactDOM"
    },
    "react-bootstrap": {
      commonjs: "react-bootstrap",
      commonjs2: "react-bootstrap",
      amd: "react-bootstrap",
      root: "ReactBootstrap"
    }
  },
  plugins: [
  /*
  new webpack.DefinePlugin({
      'process.env': {
      'NODE_ENV': JSON.stringify('production')
      }
  }),
  */
  new webpack.IgnorePlugin(/react\/addons/),
  new webpack.IgnorePlugin(/react\/lib\/ReactContext/),
  new webpack.IgnorePlugin(/react\/lib\/ExecutionEnvironment/),
  new ExtractTextPlugin("styles.css")
  /*
  ,
  new BundleAnalyzerPlugin({
    analyzerMode: 'static'
  })
  */
  ]
};

