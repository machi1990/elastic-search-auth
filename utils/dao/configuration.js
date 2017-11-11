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

/**
 * TODO REVISE THESE
 */
const INDEX = '12elasticsearchauth34users56index78';
const TYPE = '1011config1213type1415fingers1617crossed1819';
const ES_HOST = config.ES.host;
const esAuthVersion = {
  key: 'elasticsearch-auth-version',
  value: config.VERSION,
};

class Configuration {
  constructor(value, key) {
    this.key = key;
    this.value = value;
  }

  getKey() {
    return this.value;
  }

  getValue() {
    return this.value;
  }

  setKey(key) {
    this.key = key;
  }

  setValue(value) {
    this.value = value;
  }

  values() {
    return {
      key: this.key,
      value: this.value,
    };
  }
}

function createConfiguration(key, value) {
  const configuration = new Configuration(key, value).values();
  return es
    .create({
      index: INDEX,
      type: TYPE,
      id: configuration.key,
      body: configuration,
    })
    .then(function(res) {
      logger.info(configuration.key + ' successfully created');
      return Promise.resolve(res);
    })
    .catch(function(error) {
      logger.warn(configuration.key + ' could not be created');
      throw error;
    });
}

function getConfigurations(query) {
  query = query || {};
  return es
    .search({
      index: INDEX,
      type: TYPE,
      from: query.from || 0,
      size: query.size || 10,
    })
    .then(
      function(resp) {
        const hits = resp.hits.hits;
        const configurations = [];

        hits.forEach(function(hit) {
          configurations.push(hit._source);
        });

        return Promise.resolve(configurations);
      },
      function(err) {
        logger.error(error);
        return Promise.resolve([]);
      }
    );
}

function getConfigurationByKey(key) {
  return es
    .get({
      index: INDEX,
      type: TYPE,
      id: key,
    })
    .then(function(config) {
      if (!config._source) {
        return Promise.reject('No such configuration');
      }

      return Promise.resolve(config._source.value);
    })
    .catch(function(error) {
      throw error;
    });
}

function deleteConfiguration(key) {
  return es
    .delete({
      index: INDEX,
      type: TYPE,
      id: key,
    })
    .then(function(res) {
      logger.info(key + ' successfully deleted');
      return Promise.resolve(res);
    })
    .catch(function(error) {
      Promise.resolve(false);
    });
}

function updateConfiguration(configuration) {
  return es
    .update({
      index: INDEX,
      type: TYPE,
      id: configuration.key,
      body: {
        doc: configuration,
      },
    })
    .then(function(res) {
      return Promise.resolve(true);
    })
    .catch(function(error) {
      return Promise.resolve(false);
    });
}

/**
 * Create mapping
 */
(function() {
  const mapping = {
    properties: {
      key: {
        type: 'text',
        index: false,
      },
      value: {
        type: 'text',
        index: false,
      },
    },
  };

  const updateAuthVersion = function() {
    es
      .update({
        index: INDEX,
        type: TYPE,
        id: esAuthVersion.key,
        body: {
          doc: esAuthVersion,
        },
      })
      .then(function(res) {
        logger.info(JSON.stringify(res, null, 2));
      })
      .catch(function(error) {
        logger.error(error);
        es
          .create({
            index: INDEX,
            type: TYPE,
            id: esAuthVersion.key,
            body: esAuthVersion,
          })
          .then(function(res) {
            logger.info(JSON.stringify(res, null, 2));
          });
      });
  };

  const createMapping = function() {
    const mappingOpts = {
      method: 'POST',
      uri: ES_HOST + INDEX + '/_mapping/' + TYPE,
      body: mapping,
      json: true,
    };

    request
      .post(mappingOpts)
      .then(function(body) {
        updateAuthVersion();
      })
      .catch(function() {
        updateAuthVersion();
      });
  };

  const indexOpts = {
    method: 'POST',
    uri: ES_HOST + INDEX,
    body: {},
    json: true,
  };

  request
    .post(indexOpts)
    .then(function() {
      createMapping();
    })
    .catch(function(error) {
      createMapping();
    });
})();

module.exports = class ConfigurationDAO {
  constructor() {
    this.create = createConfiguration;
    this.get = getConfigurationByKey;
    this.update = updateConfiguration;
    this.delete = deleteConfiguration;
    this.configurations = getConfigurations;
    this.KEY = esAuthVersion.key;
  }
};
