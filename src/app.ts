import 'reflect-metadata';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import { Container } from 'inversify';
import {
  interfaces,
  InversifyExpressServer,
  TYPE,
} from 'inversify-express-utils';
import { IndexController } from './controllers/index.controller';
import { RequestFilter } from './middleware/request.container.filter';
import {
  ElasticSearchService,
  IEsService,
} from './services/elasticsearch.service';
import { Logger } from './middleware/logger';
import { container } from './setup';
import { BadRequest } from './middleware/bad-request.filter';

/**
 * Router
 */
const router = express.Router({
  caseSensitive: false,
  mergeParams: false,
  strict: false,
});

// create server
const server = new InversifyExpressServer(container, router, {
  rootPath: '/api/v2/'
});

server
  .setConfig(app => {
    container.get<RequestFilter>(RequestFilter).configureMiddlewaresFor(app);
    // container.get<BadRequest>(BadRequest).config(app);
    app.use(container.get<Logger>(Logger).requestConnector());
  })
  .setErrorConfig(app => {
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).send('Problem occurred!');
    });
  });

const app = server.build();
export = app;
