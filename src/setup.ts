import { Container } from 'inversify';
import {
  interfaces,
  InversifyExpressServer,
  TYPE,
} from 'inversify-express-utils';
import { IndexController } from './controllers/index.controller';
import { ElasticSearchService } from './services/elasticsearch.service';
import { Logger } from './middleware/logger';
import { RequestFilter } from './middleware/request.container.filter';
import { ConfigurationService } from './services/configuration.service';

export const container = new Container();
container
.bind<RequestFilter>(RequestFilter)
.to(RequestFilter)
.inSingletonScope();
container
  .bind<interfaces.Controller>(TYPE.Controller)
  .to(IndexController)
  .whenTargetNamed('IndexController');
container
  .bind<ElasticSearchService>(ElasticSearchService)
  .to(ElasticSearchService)
  .inSingletonScope();
container
  .bind<Logger>(Logger)
  .to(Logger)
  .inSingletonScope();
container.bind<ConfigurationService>(ConfigurationService).to(ConfigurationService).inSingletonScope();
