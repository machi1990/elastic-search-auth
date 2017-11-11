const elasticsearch = require('elasticsearch'),
  process = require('process'),
  assert = require('assert'),
  request = require('request-promise');

const config = require('../../setup'),
  logger = new (require('../logger/logger'))(),
  isObject = require('../shared/shared').isObject,
  Mailer = require('../shared/mailer'),
  cron = require('../schedule/cron');

const error = (res, message) => {
  res.status(500);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(message, null, 1));
};

assert.notEqual(config.ES, undefined, 'Elasticsearch opts required');
assert.equal(
  true,
  isObject(config.ES),
  'Elasticsearch config must be an object'
);
assert.notEqual(config.ES.host, undefined, 'Elasticsearch host required');

const ES_HOST = config.ES.host;
const SOME_MINUTES = 1000 * 60 * 10;

const opts = req => {
  const opts_ = {
    method: req.method.toUpperCase(),
    uri: ES_HOST + req.url.substring(1),
    body: req.body,
    timeout: SOME_MINUTES,
    json: true,
  };

  logger.debug(JSON.stringify(opts_, null, 1));

  return opts_;
};

const proxy = (req, res) => {
  switch (req.method) {
    case 'PUT':
      request
        .put(opts(req))
        .then(body => {
          res.json(body);
        })
        .catch(err => {
          error(res, err);
        });
      break;
    case 'POST':
      request
        .post(opts(req))
        .then(body => {
          res.json(body);
        })
        .catch(err => {
          logger.error(err);
          error(res, err);
        });
      break;
    case 'PATCH':
      request
        .patch(opts(req))
        .then(body => {
          res.json(body);
        })
        .catch(err => {
          logger.error(err);
          error(res, err);
        });
      break;
    case 'HEAD':
      request
        .get(opts(req))
        .then(body => {
          res.send(body);
        })
        .catch(err => {
          logger.error(err);
          error(res, err);
        });
      break;
    case 'OPTIONS':
      request
        .options(opts(req))
        .then(body => {
          res.json(body);
        })
        .catch(err => {
          logger.error(err);
          error(res, err);
        });
      break;
    case 'DELETE':
      request
        .delete(opts(req))
        .then(body => {
          res.json(body);
        })
        .catch(err => {
          logger.error(err);
          error(res, err);
        });
      break;
    case 'GET':
      request
        .get(opts(req))
        .then(body => {
          res.json(body);
        })
        .catch(err => {
          logger.error(err);
          error(res, err);
        });
      break;
    default: {
      error(res, 'Method not supported');
    }
  }
};

const client = new elasticsearch.Client({
  host: ES_HOST,
  log: {
    type: 'file',
  },
  sniffAfterConnectionFault: true,
  requestTimeout: Infinity,
  keepAlive: true,
});

const sniff = timeout => {
  timeout = Math.max(timeout || 10000, 10000);

  return client
    .ping({
      requestTimeout: timeout,
    })
    .then(result => {
      return Promise.resolve(result);
    })
    .catch(err => {
      return Promise.reject(err);
    });
};

/**
 * Check if app ES Cluster is up and running.
 * Alerts otherwise.
 */
(() => {
  const isUp = timeout => {
    return sniff(timeout)
      .then(ok => {
        logger.info('Elasticsearch cluster up');
        return Promise.resolve(true);
      })
      .catch(err => {
        logger.error(err);
        return Promise.resolve(false);
      });
  };

  if (
    !config.ES.sniffRobot ||
    !isObject(config.ES.sniffRobot) ||
    !config.ES.sniffRobot.activate
  ) {
    logger.debug('Elasticsearch cluster monitoring not enabled');
    return;
  }

  const interval = Math.min(
    (config.ES.sniffRobot.sniffInterval || SOME_MINUTES) / 1000 * 60,
    10
  );
  const timeout = config.ES.sniffRobot.sniffTimeOut || SOME_MINUTES;
  const alerting = isObject(config.ES.sniffRobot.alerting)
    ? config.ES.sniffRobot.alerting
    : {};

  const sendAlert = () => {
    if (!alerting.activate) {
      logger.debug('Elasticsearch cluster down. Alerting not activated');
      return;
    }

    Mailer.send({
      to: alerting.to,
      cc: alerting.cc,
      subject: 'Elasticsearch cluster down',
      text:
        'Monitor robot has detected that your Elasticsearch cluster is down',
      html: '<p>Elasticsearch cluster town.</p>',
    });
  };

  const monitor = () => {
    isUp(timeout)
      .then(ok => {
        if (!ok) {
          sendAlert();
        }
      })
      .catch(nok => {
        sendAlert();
      });
  };

  const INTERVAL = '*/' + interval + ' * * * *';
  cron(interval, monitor); // monotor job
})();

module.exports = {
  client: client,
  proxy: proxy,
  sniff: sniff,
};
