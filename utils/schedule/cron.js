const schedule = require('node-schedule');

module.exports = (expression, job) => {
  return schedule.scheduleJob(expression, job);
};
