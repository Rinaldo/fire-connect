const path = require('path')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.join(__dirname, './build'),
    filename: 'fire-connect.js'
  },
  devtool: 'source-map',
  mode: 'production',
  plugins: [new UglifyJSPlugin({ sourceMap: true })],
  module: {
    rules: [
      {
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            presets: [
              ['@babel/preset-env', { modules: false }],
              '@babel/react'
            ]
          }
        }
      }
    ]
  }
};
