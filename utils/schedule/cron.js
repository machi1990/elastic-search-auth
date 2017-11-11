const schedule = require('node-schedule');

function cron(expression, job) {
  return schedule.scheduleJob(expression, job);
}

module.exports = cron;
