const redis = require('redis'),
  Promise = require('bluebird'),
  process = require('process');

const isObject = require('../shared/shared').isObject,
  logger = new (require('../logger/logger'))(),
  config = require('../../setup');

Promise.promisifyAll(redis);

const __not_object__ = '__not_object__';

const quit = client => {
  process.nextTick(_ => {
    client.quit();
  });
};

const createClient = () => {
  let opts = {};

  if (!isObject(config.REDIS_OPTS)) {
    logger.warn('Redis server options not provided. Using default ones.');
  } else {
    opts = config.REDIS_OPTS;
    opts['retry_strategy'] = options => {
      if (options.error && options.error.code === 'ECONNREFUSED') {
        logger.error('Redis server refused to connect');
        return new Error('The server refused the connection');
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
        logger.error('Redis server retry timeout exhausted');
        return new Error('Retry time exhausted');
      }
      if (options.attempt > 10) {
        // End reconnecting with built in error
        return undefined;
      }
      // reconnect after
      return Math.min(options.attempt * 100, 3000);
    };
  }

  return redis.createClient(opts);
};

const retrieveIfConnected = token => {
  return get(token)
    .then(user => {
      return Promise.resolve(user);
    })
    .catch(error => {
      return Promise.reject(false);
    });
};

const get = key => {
  try {
    const client = createClient();

    const command = client
      .getAsync(key)
      .then(res => {
        let obj;
        try {
          obj = JSON.parse(res);
        } catch (e) {
          logger.error(e);
        }

        obj = obj ? obj : {};

        if (__not_object__ in obj) {
          return Promise.resolve(obj[__not_object__]);
        }

        return Promise.resolve(obj);
      })
      .catch(error => {
        logger.error(error);
        return Promise.reject(error);
      });
    return command;
  } catch (e) {
    logger.info(e);
    return Promise.reject(e);
  }
};

const remove = key => {
  try {
    const client = createClient();

    const command = client.del(key);

    return Promise.resolve(command)
      .then(obj => {
        quit(client);
        return Promise.resolve(obj);
      })
      .catch(error => {
        quit(client);
        logger.error(error);
        return Promise.reject(false);
      });
  } catch (e) {
    logger.info(e);
    return Promise.reject(e);
  }
};

const set = (key, value) => {
  try {
    const client = createClient();

    if (!isObject(value)) {
      value = {
        __not_object__: value,
      };
    }

    const command = client.set(key, JSON.stringify(value));

    return Promise.resolve(command)
      .then(obj => {
        quit(client);
        return Promise.resolve(obj);
      })
      .catch(error => {
        quit(client);
        logger.error(error);
        return Promise.reject(false);
      });
  } catch (e) {
    logger.info(e);
    return Promise.reject(e);
  }
};

module.exports = {
  retrieveIfConnected: retrieveIfConnected,
  get: get,
  set: set,
  remove: remove,
};
