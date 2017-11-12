const bcrypt = require('bcrypt');
const assert = require('assert');
const request = require('request-promise');
const Promise = require('bluebird');
const es = require('../elasticsearch/elasticsearch').client;
const logger = new (require('../logger/logger'))();
const config = require('../../setup');
const isObject = require('../shared/shared').isObject;

assert.notEqual(config.ES, undefined, 'Elasticsearch opts required');
assert.equal(
  true,
  isObject(config.ES),
  'Elasticsearch config must be an object'
);
assert.notEqual(config.ES.host, undefined, 'Elasticsearch host required');

const mapping = {
  properties: {
    username: {
      type: 'text',
      index: false,
    },
    password: {
      type: 'text',
      index: false,
    },
    role: {
      type: 'text',
      index: false,
    },
    email: {
      type: 'text',
      index: false,
    },
    firstname: {
      type: 'text',
      index: false,
    },
    lastname: {
      type: 'text',
      index: false,
    },
  },
};

const roles = {
  ADMIN: true,
  USER: true,
};

const SALT_ROUNDS = 16;

/**
 * TODO REVISE THESE
 */
const INDEX = '12elasticsearchauth34users56index78';
const TYPE = '1011user1213type1415fingers1617crossed1819';

const ES_HOST = config.ES.host;

class User {
  constructor(user) {
    this.username = user.username;
    this.firstname = user.firstname;
    this.lastname = user.lastname;
    this.password = generatePassword(user.password);
    this.role = user.role in roles ? user.role : 'USER';
    this.email = user.email;
  }

  user() {
    return {
      username: this.username,
      firstname: this.firstname,
      lastname: this.lastname,
      password: this.password,
      role: this.role,
      email: this.email,
    };
  }
}

let clean = user => {
  delete user.password;
  return user;
};

const create = user => {
  user = new User(user).user();
  return es
    .create({
      index: INDEX,
      type: TYPE,
      id: user.username,
      body: user,
    })
    .then(res => {
      logger.info(user.username + ' successfully created');
      return Promise.resolve(res);
    })
    .catch(error => {
      logger.warn(user.username + ' could not be created');
      throw error;
    });
};

const delete_ = username => {
  return es
    .delete({
      index: INDEX,
      type: TYPE,
      id: username,
    })
    .then(res => {
      logger.info(username + ' successfully deleted');
      return Promise.resolve(res);
    })
    .catch(error => {
      Promise.resolve(false);
    });
};

const update = user => {
  return es
    .update({
      index: INDEX,
      type: TYPE,
      id: user.username,
      body: {
        doc: user,
      },
    })
    .then(res => {
      return Promise.resolve(true);
    })
    .catch(error => {
      return Promise.resolve(false);
    });
};

const connect = (username, password) => {
  return get_(username)
    .then(user => {
      if (!bcrypt.compareSync(password, user.password)) {
        return Promise.reject(false);
      }

      return Promise.resolve(clean(user));
    })
    .catch(error => {
      return Promise.resolve(undefined);
    });
};

const get_ = username => {
  return es
    .get({
      index: INDEX,
      type: TYPE,
      id: username,
    })
    .then(user => {
      if (!user._source) {
        return Promise.reject('No such user');
      }

      return Promise.resolve(user._source);
    })
    .catch(error => {
      throw error;
    });
};

const get = username => {
  return get_(username)
    .then(user_ => {
      return Promise.resolve(clean(user_));
    })
    .catch(error => {
      throw error;
    });
};

const users = query => {
  query = query || {};
  return es
    .search({
      index: INDEX,
      type: TYPE,
      from: query.from || 0,
      size: query.size || 10,
    })
    .then(
      resp => {
        const hits = resp.hits.hits;
        const users = [];

        hits.forEach(hit => {
          users.push(clean(hit._source));
        });

        return Promise.resolve(users);
      },
      err => {
        logger.error(error);
        return Promise.resolve([]);
      }
    );
};

const generatePassword = password => {
  return bcrypt.hashSync(password, SALT_ROUNDS);
};

/**
 * Create a default user.
 */
(() => {
  const DEFAULT_USER = config.DEFAULT_USER;

  assert.notEqual(
    undefined,
    DEFAULT_USER.username,
    'Default username can not be empty'
  );
  assert.notEqual(
    undefined,
    DEFAULT_USER.password,
    'Default password can not be empty'
  );

  /**
   * Default user is admin always.
   */
  DEFAULT_USER.role = 'ADMIN';

  const createDefault = () => {
    es
      .exists({
        index: INDEX,
        type: TYPE,
        id: DEFAULT_USER.username,
      })
      .then(exists => {
        if (exists !== true) {
          create(DEFAULT_USER)
            .then(res => {
              logger.info(
                'Default user created: ' + JSON.stringify(res, null, 2)
              );
            })
            .catch(error => {
              logger.error(error);
            });
        }
      })
      .catch(error => {
        logger.error(error);
      });
  };

  const createMapping = () => {
    const mappingOpts = {
      method: 'POST',
      uri: ES_HOST + INDEX + '/_mapping/' + TYPE,
      body: mapping,
      json: true, // Automatically stringifies the body to JSON
    };

    request
      .post(mappingOpts)
      .then(body => {
        createDefault();
      })
      .catch(() => {
        createDefault();
      });
  };

  const indexOpts = {
    method: 'POST',
    uri: ES_HOST + INDEX,
    body: {},
    json: true, // Automatically stringifies the body to JSON
  };

  request
    .post(indexOpts)
    .then(() => {
      createMapping();
    })
    .catch(() => {
      createMapping();
    });
})();

module.exports = class UserDAO {
  constructor() {
    this.connect = connect;
    this.get = get;
    this.users = users;
    this.delete = delete_;
    this.create = create;
    this.update = update;
    this.generatePassword = generatePassword;
    this.index = INDEX;
    this.roles = Object.keys(roles);
  }
};
