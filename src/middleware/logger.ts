import * as LOG4JS from 'log4js';
import * as PATH from 'path';
import * as STACK_TRACE from 'stack-trace';
import * as CONFIG from '../config';
import { injectable } from 'inversify';

const PROJECT_DIR = CONFIG.PROJECT_DIR,
  USEIDENTIFIER = CONFIG.userIdentifer || 'login';

LOG4JS.configure({
  appenders: [
    { type: 'console' },
    {
      type: 'file',
      filename: 'logs/elasticsearch-auth.log',
      category: 'ELASTICSEARCH-AUTH',
    },
  ],
});

const LOGGER = LOG4JS.getLogger('ELASTICSEARCH-AUTH');

@injectable()
export class Logger {
  setLevel(level) {
    LOGGER.setLevel(level);
    return this;
  }

  log(log) {
    LOGGER.log(this.customize(log));
    return this;
  }

  info(info) {
    LOGGER.info(this.customize(info));
    return this;
  }

  trace(trace) {
    LOGGER.trace(this.customize(trace));
    return this;
  }

  debug(debug) {
    LOGGER.debug(this.customize(debug));
    return this;
  }

  warn(warning) {
    LOGGER.warn(this.customize(warning));
    return this;
  }

  error(error) {
    LOGGER.error(this.customize(error));
    return this;
  }

  fatal(fatal) {
    LOGGER.fatal(this.customize(fatal));
    return this;
  }

  customize(obj) {
    const frame = STACK_TRACE.get()[2],
      customized =
        PATH.relative(PROJECT_DIR, frame.getFileName()) +
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
    const connector = LOG4JS.connectLogger(LOGGER, { level: 'auto' });

    return (req, res, next) => {
      /**
       * May be more here.
       */
      connector(req, res, next);
    };
  }
}
