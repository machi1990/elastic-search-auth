import { injectable, inject } from 'inversify';
import { ElasticSearchService } from './elasticsearch.service';
import { Logger } from '../middleware/logger';

import * as ASSERT from 'assert';
import * as CONFIG from '../config';
import { isObject } from '../utils';
import { CONFIGURATION_MAPPING as MAPPING } from '../es-mapping';
import * as REQUEST from 'request-promise';
import { Configuration, IConfiguration } from '../entities/configuration';

@injectable()
export class ConfigurationService {
  private readonly INDEX;
  private readonly TYPE;
  private readonly ES_HOST;
  private readonly ES_AUTH_VERSION;

  public constructor(
    @inject(ElasticSearchService) private esService: ElasticSearchService,
    @inject(Logger) private logger: Logger
  ) {
    ASSERT.notEqual(CONFIG.ES, undefined, 'Elasticsearch opts required');
    ASSERT.equal(true, isObject(CONFIG.ES), 'Elasticsearch config must be an object');
    ASSERT.notEqual(CONFIG.ES.host, undefined, 'Elasticsearch host required');

    this.INDEX = '12elasticsearchauth34users56index78';
    this.TYPE = '1011config1213type1415fingers1617crossed1819';
    this.ES_HOST = CONFIG.ES.host;
    this.ES_AUTH_VERSION = {
      key: 'elasticsearch-auth-version',
      value: CONFIG.VERSION
    };

    this.prepareMapping();
  }

  private async prepareMapping() {
    try {
      await REQUEST.post({
        method: 'POST',
        uri: this.ES_HOST + this.INDEX + '/_mapping/' + this.TYPE,
        body: MAPPING,
        json: true,
        timeout: Infinity
      });
    } catch (e) {
      this.logger.error(e);
    } finally {
      this.updateVersion();
    }
  }
  private async updateVersion() {
    try {
      const updated = await this.esService.client.update({
        index: this.INDEX,
        type: this.TYPE,
        id: this.ES_AUTH_VERSION.key,
        body: {
          doc: this.ES_AUTH_VERSION
        }
      });

      this.logger.info(JSON.stringify(updated, null, 2));
    } catch (error) {
      this.logger.error(error);
      const res = await this.esService.client.create({
        index: this.INDEX,
        type: this.TYPE,
        id: this.ES_AUTH_VERSION.key,
        body: this.ES_AUTH_VERSION
      });
      this.logger.info(JSON.stringify(res, null, 2));
    }
  }

  public get key(): any {
    return this.ES_AUTH_VERSION.key;
  }

  public async create(key, value) {
    const configuration = new Configuration(key, value).values();

    try {
      const res = await this.esService.client.create({
        index: this.INDEX,
        type: this.TYPE,
        id: configuration.key,
        body: configuration
      });

      this.logger.info(configuration.key + ' successfully created');
      return res;
    } catch (error) {
      this.logger.warn(configuration.key + ' could not be created');
      throw error;
    }
  }

  public async get(key) {
    try {
      const config = await this.esService.client.get({
        index: this.INDEX,
        type: this.TYPE,
        id: key
      });

      if (!config._source) {
        return '';
      }

      return config._source.value;
    } catch (error) {
      throw error;
    }
  }

  public async delete(key) {
    try {
      const deleted = await this.esService.client.delete({
        index: this.INDEX,
        type: this.TYPE,
        id: key
      });

      this.logger.info(key + ' successfully deleted');
      return deleted;
    } catch (error) {
      return false;
    }
  }

  public async update(configuration: Configuration) {
    ASSERT.notEqual(configuration, undefined);
    const config: IConfiguration = configuration.values();

    try {
      const updated = await this.esService.client.update({
        index: this.INDEX,
        type: this.TYPE,
        id: config.key,
        body: {
          doc: configuration
        }
      });

      return updated;
    } catch (error) {
      return false;
    }
  }

  public async list(query: Object) {
    query = query || {};
    try {
      const resp = await this.esService.client.search({
        index: this.INDEX,
        type: this.TYPE,
        from: query['from'] || 0,
        size: query['size'] || 10
      });

      const hits = resp.hits.hits || [];

      return hits.map(hit => hit._source);
    } catch (error) {
      return [];
    }
  }
}
