const pkg = require('./package');
const configuration = pkg['backend-config'];

configuration.PROJECT_DIR = __dirname;
configuration.VERSION = pkg.version;

module.exports = configuration;
