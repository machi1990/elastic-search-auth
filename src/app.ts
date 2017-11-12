import 'reflect-metadata';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import { Container } from 'inversify';
import { IndexController } from './controllers/index.controller';
import { RequestFilter } from './middleware/request.container.filter';
import { Logger } from './middleware/logger';
import { container } from './setup';
import { ElasticSearchService} from './services/elasticsearch.service';
import {
  interfaces,
  InversifyExpressServer,
  TYPE,
} from 'inversify-express-utils';

/**
 * Router
 */
const ROUTER_CONFIG = express.Router({
  caseSensitive: false,
  mergeParams: false,
  strict: false,
});

// create server
const SERVER = new InversifyExpressServer(container, ROUTER_CONFIG, {
  rootPath: '/api/v2/'
});

const INTERNAL_SERVER_ERROR = 500;

SERVER
  .setConfig(app => {
    container.get<RequestFilter>(RequestFilter).configureMiddlewaresFor(app);
    app.use(container.get<Logger>(Logger).requestConnector());
  })
  .setErrorConfig(app => {
    app.use((err, req, res, next) => {
      container.get<Logger>(Logger).error(err);
      res.status(err.status || INTERNAL_SERVER_ERROR).send(err);
    });
  });

const app = SERVER.build();
export = app;
