import { Container } from 'inversify';
import { IndexController } from './controllers/index.controller';
import { ElasticSearchService } from './services/elasticsearch.service';
import { Logger } from './middleware/logger';
import { RequestFilter } from './middleware/request.container.filter';
import { ConfigurationService } from './services/configuration.service';
import { RedisService } from './services/redis.service';
import { interfaces, TYPE } from 'inversify-express-utils';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { ElasticSearchController } from './controllers/elasticsearch.controller';
import { ConfigurationContoller } from './controllers/configuration.controller';
import { AuthService } from './services/auth.service';

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
  .bind<interfaces.Controller>(TYPE.Controller)
  .to(UserController)
  .whenTargetNamed('UserController');
container
  .bind<interfaces.Controller>(TYPE.Controller)
  .to(ElasticSearchController)
  .whenTargetNamed('ElasticSearchController');
container
  .bind<interfaces.Controller>(TYPE.Controller)
  .to(ConfigurationContoller)
  .whenTargetNamed('ConfigurationController');
container
  .bind<ElasticSearchService>(ElasticSearchService)
  .to(ElasticSearchService)
  .inSingletonScope();
container
  .bind<Logger>(Logger)
  .to(Logger)
  .inSingletonScope();
container
  .bind<ConfigurationService>(ConfigurationService)
  .to(ConfigurationService)
  .inSingletonScope();
container
  .bind<RedisService>(RedisService)
  .to(RedisService)
  .inSingletonScope();
container
  .bind<UserService>(UserService)
  .to(UserService)
  .inSingletonScope();
container
  .bind<AuthService>(AuthService)
  .to(AuthService)
  .inSingletonScope();
