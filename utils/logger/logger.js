const log4js = require('log4js'),
  path = require('path'),
  stackTrace = require('stack-trace');

const config = require('../../setup'),
  PROJECT_DIR = config.PROJECT_DIR,
  userIdentifer = config.userIdentifer || 'login';

log4js.configure({
  appenders: [
    { type: 'console' },
    {
      type: 'file',
      filename: 'logs/elasticsearch-auth.log',
      category: 'ELASTICSEARCH-AUTH',
    },
  ],
});

const logger = log4js.getLogger('ELASTICSEARCH-AUTH');

module.exports = class Logger {
  setLevel(level) {
    logger.setLevel(level);
    return this;
  }

  log(log) {
    logger.log(this.customize(log));
    return this;
  }

  info(info) {
    logger.info(this.customize(info));
    return this;
  }

  trace(trace) {
    logger.trace(this.customize(trace));
    return this;
  }

  debug(debug) {
    logger.debug(this.customize(debug));
    return this;
  }

  warn(warning) {
    logger.warn(this.customize(warning));
    return this;
  }

  error(error) {
    logger.error(this.customize(error));
    return this;
  }

  fatal(fatal) {
    logger.fatal(this.customize(fatal));
    return this;
  }

  customize(obj) {
    const frame = stackTrace.get()[2],
      customized =
        path.relative(PROJECT_DIR, frame.getFileName()) +
        ' at ' +
        frame.getLineNumber() +
        ':' +
        frame.getColumnNumber();

    return customized + ' - ' + obj;
  }

  requestConnector() {
    return (req, res, next) => {
      /**
             * LOG STUFFS HERE
             */
      next();
    };
  }

  responseConnector() {
    const connector = log4js.connectLogger(logger, { level: 'auto' });

    return (req, res, next) => {
      /**
             * May be more here.
             */
      connector(req, res, next);
    };
  }
};
