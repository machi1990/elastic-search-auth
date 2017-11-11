const elasticsearch = require('elasticsearch'),
  process = require('process'),
  assert = require('assert'),
  request = require('request-promise');

const config = require('../../setup'),
  logger = new (require('../logger/logger'))(),
  isObject = require('../shared/shared').isObject,
  Mailer = require('../shared/mailer'),
  cron = require('../schedule/cron');

function error(res, message) {
  res.status(500);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(message, null, 1));
}

assert.notEqual(config.ES, undefined, 'Elasticsearch opts required');
assert.equal(
  true,
  isObject(config.ES),
  'Elasticsearch config must be an object'
);
assert.notEqual(config.ES.host, undefined, 'Elasticsearch host required');

const ES_HOST = config.ES.host;
const SOME_MINUTES = 1000 * 60 * 10;

function opts(req) {
  const opts_ = {
    method: req.method.toUpperCase(),
    uri: ES_HOST + req.url.substring(1),
    body: req.body,
    timeout: SOME_MINUTES,
    json: true,
  };

  logger.debug(JSON.stringify(opts_, null, 1));

  return opts_;
}

function proxy(req, res) {
  switch (req.method) {
    case 'PUT':
      request
        .put(opts(req))
        .then(function(body) {
          res.json(body);
        })
        .catch(function(err) {
          error(res, err);
        });
      break;
    case 'POST':
      request
        .post(opts(req))
        .then(function(body) {
          res.json(body);
        })
        .catch(function(err) {
          logger.error(err);
          error(res, err);
        });
      break;
    case 'PATCH':
      request
        .patch(opts(req))
        .then(function(body) {
          res.json(body);
        })
        .catch(function(err) {
          logger.error(err);
          error(res, err);
        });
      break;
    case 'HEAD':
      request
        .get(opts(req))
        .then(function(body) {
          res.send(body);
        })
        .catch(function(err) {
          logger.error(err);
          error(res, err);
        });
      break;
    case 'OPTIONS':
      request
        .options(opts(req))
        .then(function(body) {
          res.json(body);
        })
        .catch(function(err) {
          logger.error(err);
          error(res, err);
        });
      break;
    case 'DELETE':
      request
        .delete(opts(req))
        .then(function(body) {
          res.json(body);
        })
        .catch(function(err) {
          logger.error(err);
          error(res, err);
        });
      break;
    case 'GET':
      request
        .get(opts(req))
        .then(function(body) {
          res.json(body);
        })
        .catch(function(err) {
          logger.error(err);
          error(res, err);
        });
      break;
    default: {
      error(res, 'Method not supported');
    }
  }
}

const client = new elasticsearch.Client({
  host: ES_HOST,
  log: {
    type: 'file',
  },
  sniffAfterConnectionFault: true,
  requestTimeout: Infinity,
  keepAlive: true,
});

function sniff(timeout) {
  timeout = Math.max(timeout || 10000, 10000);

  return client
    .ping({
      requestTimeout: timeout,
    })
    .then(function(result) {
      return Promise.resolve(result);
    })
    .catch(function(err) {
      return Promise.reject(err);
    });
}

/**
 * Check if app ES Cluster is up and running. 
 * Alerts otherwise.
 */
(function() {
  function isUp(timeout) {
    return sniff(timeout)
      .then(function(ok) {
        logger.info('Elasticsearch cluster up');
        return Promise.resolve(true);
      })
      .catch(function(err) {
        logger.error(err);
        return Promise.resolve(false);
      });
  }

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

  function sendAlert() {
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
  }

  function monitor() {
    isUp(timeout)
      .then(function(ok) {
        if (!ok) {
          sendAlert();
        }
      })
      .catch(function(nok) {
        sendAlert();
      });
  }

  const INTERVAL = '*/' + interval + ' * * * *';
  cron(interval, monitor); // monotor job
})();

module.exports = {
  client: client,
  proxy: proxy,
  sniff: sniff,
};
