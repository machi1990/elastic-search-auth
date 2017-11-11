const uuidV4 = require('uuid/v4'),
  config = require('../../setup');

const token = new Buffer(config.ES.host).toString('base64');

module.exports = _ => {
  return token + '-' + uuidV4();
};
