import * as schedule from 'node-schedule';
import * as uuidV4 from 'uuid/v4';
import * as CONFIG from './config';

const TOKEN = new Buffer(CONFIG.ES.host).toString('base64');

export const isObject = (val: any) => {
  if (val === null) {
    return false;
  }
  return typeof val === 'function' || typeof val === 'object';
};

export const cron = (expression, job) => {
  return schedule.scheduleJob(expression, job);
};

export const uuid = () => {
  return TOKEN + '-' + uuidV4();
};
