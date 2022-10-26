const path = require('path');

module.exports = {
    entry: './dist/index.js',
    mode: 'production',
    output: {
        filename: 'simple-turtle.min.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'SimpleTurtle',
        libraryTarget: 'umd',
        umdNamedDefine: true,
        auxiliaryComment: 'TurtleJS simplified',
    },
};