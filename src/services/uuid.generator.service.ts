import * as uuidV4 from 'uuid/v4';
import * as CONFIG from '../config';

const TOKEN = new Buffer(CONFIG.ES.host).toString('base64');

module.exports = _ => {
  return TOKEN + '-' + uuidV4();
};
