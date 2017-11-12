import * as schedule from 'node-schedule';

export const isObject = (val: any) => {
  if (val === null) {
    return false;
  }
  return typeof val === 'function' || typeof val === 'object';
};

export const cron = (expression, job) => {
  return schedule.scheduleJob(expression, job);
};
