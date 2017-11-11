/**
 * Mostly middlewares
 */
const compression = require('compression'),
  logger = new (require('../logger/logger'))();

const shouldCompress = (req, res) => {
  if (req.headers['x-no-compression']) {
    // don't compress responses with this request header
    return false;
  }

  // fallback to standard filter function
  return compression.filter(req, res);
};

module.exports = class ResponseFilter {
  static compression() {
    return compression({ filter: shouldCompress });
  }

  static logs() {
    return logger.responseConnector();
  }

  static config(app) {
    app.use(ResponseFilter.compression());
    app.use(ResponseFilter.logs());
  }
};
