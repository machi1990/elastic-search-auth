const pkg = require('../package'); 
const CONFIG = pkg['backend-config'];
CONFIG.PROJECT_DIR = __dirname;
CONFIG.VERSION = pkg.version;
export = CONFIG;
