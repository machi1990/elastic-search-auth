const ResponseFilter = require('./utils/filters/response'),
  RequestFilter = require('./utils/filters/request');

module.exports = app => {
  ResponseFilter.config(app);
  RequestFilter.config(app);
  return app;
};
