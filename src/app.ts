import 'reflect-metadata';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import { Container } from 'inversify';
import { IndexController } from './controllers/index.controller';
import { RequestFilter } from './middleware/request.container.filter';
import { Logger } from './middleware/logger';
import { container } from './setup';
import { ElasticSearchService } from './services/elasticsearch.service';
import { AuthProvider } from './services/auth.provider';
import { interfaces, InversifyExpressServer, TYPE } from 'inversify-express-utils';
import { ResponseFilter } from './middleware/response.filter';
import { auth, auth_header } from './services/auth.service';

/**
 * Router
 */
const ROUTER_CONFIG = express.Router({
  caseSensitive: false,
  mergeParams: false,
  strict: false
});

// create server
const SERVER = new InversifyExpressServer(
  container,
  ROUTER_CONFIG,
  {
    rootPath: '/api/v2/'
  },
  null,
  AuthProvider
);

const INTERNAL_SERVER_ERROR = 500;

SERVER.setConfig(app => {
  container.get<RequestFilter>(RequestFilter).configureMiddlewaresFor(app);
  container.get<ResponseFilter>(ResponseFilter).config(app);
  app.use(container.get<Logger>(Logger).requestConnector());
  app.use((req, res, next) => {
    res.setHeader(auth_header, req['user'] ? req['user'][auth] : req.headers['authorization']);
    next();
  });
}).setErrorConfig(app => {
  app.use((err, req, res, next) => {
    container.get<Logger>(Logger).error(err);
    res.status(err.status || INTERNAL_SERVER_ERROR).send(err);
  });
});

const app = SERVER.build();
export = app;
