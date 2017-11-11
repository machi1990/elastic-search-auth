const Promise = require('bluebird');
const redis = require('../redis/redis');
const userdao = new (require('../dao/user'))();
const uuid = require('../uuid/uuid');
const logger = new (require('../logger/logger'))();
const cron = require('../schedule/cron');
config = require('../../setup');

/**
 * A session expires after 1 hour.
 */
SESSION_TIME = 1000 * 60 * 60;

const authenticationIDs = {};

const auth = '__authenticationsid__';

const credentials = token => {
  token = decodeURIComponent(token || '');
  token = token.replace('Basic ', '');

  if (!token) {
    logger.warn('Authentication token malformed');
    return void 0;
  }

  logger.info('Authentication header found. Verifying if user authorized');

  const buf = new Buffer(token, 'base64');
  const creds = buf
    .toString('ascii')
    .trim()
    .split(':');

  return {
    username: creds[0],
    password: creds[1],
  };
};

const put = (uuid_, user) => {
  user[auth] = user[auth] || uuid_;
  user.date = Date.now();
  user.__server = config.ES.host;

  authenticationIDs[uuid_] = user;

  redis.set(uuid_, authenticationIDs[uuid_]);

  return Promise.resolve(true);
};

const get = token => {
  if (authenticationIDs[token]) {
    put(token, authenticationIDs[token]);
    return Promise.resolve(authenticationIDs[token]);
  }

  return retrieveFromRedis(token);
};

const remove = token => {
  delete authenticationIDs[token];
  redis.remove(token);
};

const isActive = val => {
  return Date.now() - val <= SESSION_TIME;
};

const retrieveFromRedis = token => {
  return redis
    .retrieveIfConnected(token)
    .then(res => {
      if (!isActive(res.date)) {
        redis.remove(token);
        return Promise.reject(false);
      }

      if (res.__server !== config.ES.host) {
        remove(token);
        return Promise.reject(false);
      }

      put(token, res);
      return Promise.resolve(authenticationIDs[token]);
    })
    .catch(_ => {
      remove(token);
      return Promise.reject(false);
    });
};

const authenticate = creds => {
  if (creds.username === auth) {
    if (
      !(creds.password in authenticationIDs) ||
      !isActive(authenticationIDs[creds.password].date)
    ) {
      return retrieveFromRedis(creds.password);
    }

    return get(creds.password);
  }

  /*
    * TODO: Adds a possibility to define other remote authentication.
    * Current supported user index in targetted Elasticsearch instance and ldap auths.
    * Authentication via different API endpoints can be enviosioned.
    */
  return userdao
    .connect(creds.username, creds.password)
    .then(user => {
      return put(uuid(), user)
        .then(ok => {
          return Promise.resolve(user);
        })
        .catch(nok => {
          return Promise.resolve(user);
        });
    })
    .catch(error => {
      return Promise.reject(false);
    });
};

const removeExpiredSessions = () => {
  const expired = [];
  for (const id in authenticationIDs) {
    if (!isActive(authenticationIDs[id])) {
      expired.push(id);
    }
  }

  expired.forEach(id => {
    delete authenticationIDs[id];
  });
};

/**
 * Trigger removeExpiredSessions after every 10 mins.
 */
const INTERVAL = '*/10 * * * *';

const removeExpiredSessionJob = cron(INTERVAL, removeExpiredSessions);

module.exports = {
  authenticate: authenticate,
  authField: auth,
  get: get,
  put: put,
  remove: remove,
};
