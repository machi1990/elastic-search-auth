import { inject, injectable } from 'inversify';
import { Logger } from '../middleware/logger';
import { ElasticSearchService } from './elasticsearch.service';
import { User, INDEX, TYPE, ROLES } from '../entities/user';
import { USER_MAPPING } from '../es-mapping';
import * as ASSERT from 'assert';
import * as request from 'request-promise';
import { isObject } from '../utils';
import * as CONFIG from '../config';
import { EncryptionService } from './encryption.service';

ASSERT.notEqual(CONFIG.ES, undefined, 'Elasticsearch opts required');
ASSERT.equal(true, isObject(CONFIG.ES), 'Elasticsearch config must be an object');
ASSERT.notEqual(CONFIG.ES.host, undefined, 'Elasticsearch host required');

const ES_HOST = CONFIG.ES.host;

@injectable()
export class UserService {
  public constructor(
    @inject(Logger) private logger: Logger,
    @inject(ElasticSearchService) private esService: ElasticSearchService
  ) {}

  private async setup() {
    try {
      await request.post({
        method: 'POST',
        uri: ES_HOST + INDEX,
        body: {},
        json: true // Automatically stringifies the body to JSON
      });
    } finally {
      this.prepareMapping();
    }
  }

  public async users(query) {
    query = query || {};

    try {
      const resp = await this.esService.client.search({
        index: INDEX,
        type: TYPE,
        from: query.from || 0,
        size: query.size || 10
      });
      const hits = resp.hits.hits || [];
      return hits.map(hit => {
        hit = hit._source;
        hit.password = undefined;
        return hit;
      });
    } catch (error) {
      this.logger.error(error);
      return [];
    }
  }

  public async delete(username) {
    try {
      const deleted = await this.esService.client.delete({
        index: INDEX,
        type: TYPE,
        id: username
      });
      this.logger.info(username + ' successfully deleted');
      return true;
    } catch (error) {
      return false;
    }
  }

  private async prepareMapping() {
    try {
      await request.post({
        method: 'POST',
        uri: ES_HOST + INDEX + '/_mapping/' + TYPE,
        body: USER_MAPPING,
        json: true,
        timeoute: Infinity // Automatically stringifies the body to JSON
      });
    } finally {
      this.createDefaultUser();
    }
  }

  private async createDefaultUser() {
    const DEFAULT_USER = CONFIG.DEFAULT_USER;

    ASSERT.notEqual(undefined, DEFAULT_USER.username, 'Default username can not be empty');
    ASSERT.notEqual(undefined, DEFAULT_USER.password, 'Default password can not be empty');

    /**
     * Default user is admin always.
     */
    DEFAULT_USER.role = 'ADMIN';

    try {
      const exists = await this.esService.client.exists({
        index: INDEX,
        type: TYPE,
        id: DEFAULT_USER.username
      });

      if (!exists) {
        try {
          const res = await this.create(DEFAULT_USER);
          this.logger.info('Default user created: ' + JSON.stringify(res, null, 2));
        } catch (error) {
          this.logger.error(error);
        }
      }
    } catch (error) {
      this.logger.error(error);
    }
  }

  public async create(user: User) {
    const USER = new User(user).user();

    try {
      const res = await this.esService.client.create({
        index: INDEX,
        type: TYPE,
        id: user.username,
        body: user
      });
      this.logger.info(user.username + ' successfully created');
      return res;
    } catch (error) {
      this.logger.warn(user.username + ' could not be created');
      throw error;
    }
  }

  public async update(user) {
    try {
      const res = await this.esService.client.update({
        index: INDEX,
        type: TYPE,
        id: user.username,
        body: {
          doc: user
        }
      });
      this.logger.info(res);
      return true;
    } catch (error) {
      this.logger.error(error);
      return false;
    }
  }

  public async get_(username) {
    try {
      const user = await this.esService.client.get({
        index: INDEX,
        type: TYPE,
        id: username
      });

      if (!user._source) {
        throw new Error('No such user');
      }

      return user._source;
    } catch (error) {
      throw error;
    }
  }

  public async get(username) {
    try {
      const user = await this.get_(username);
      user['password'] = undefined;
      return user;
    } catch (error) {
      throw error;
    }
  }

  public async connect(username, password) {
    try {
      const user = await this.get_(username);
      if (!EncryptionService.compare(password, user['password'])) {
        return false;
      }

      user['password'] = undefined;
      return user;
    } catch (error) {
      return false;
    }
  }

  public roles() {
    return ROLES;
  }
}
