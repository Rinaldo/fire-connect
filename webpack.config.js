const path = require('path')

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.join(__dirname, './build'),
    filename: 'index.js'
  },
  mode: 'production',
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
