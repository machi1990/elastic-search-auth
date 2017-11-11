const uuidV4 = require('uuid/v4'),
  config = require('../../setup');

const token = new Buffer(config.ES.host).toString('base64');

function uuid() {
  return token + '-' + uuidV4();
}

module.exports = uuid;
