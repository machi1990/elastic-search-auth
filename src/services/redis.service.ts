import * as redis from 'redis';
import * as promise from 'bluebird';
import * as process from 'process';
import { isObject } from '../utils';
import * as CONFIG from '../config';
import { inject, injectable } from 'inversify';
import { Logger } from '../middleware/logger';

promise.promisifyAll(redis);

const __not_object__ = '__not_object__';

const quit = client => {
  process.nextTick(_ => {
    client.quit();
  });
};

@injectable()
export class RedisService {
  public constructor(@inject(Logger) private logger: Logger) {}

  private createClient() {
    let opts = {};

    if (!isObject(CONFIG.REDIS_OPTS)) {
      this.logger.warn('Redis server options not provided. Using default ones.');
    } else {
      opts = CONFIG.REDIS_OPTS;
      opts['retry_strategy'] = options => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          this.logger.error('Redis server refused to connect');
          return new Error('The server refused the connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          this.logger.error('Redis server retry timeout exhausted');
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          return undefined;
        }
        // reconnect after
        return Math.min(options.attempt * 100, 3000);
      };
    }

    return redis.createClient(opts);
  }
  public async get(key) {
    try {
      const res = await this.createClient().getAsync(key);

      let obj;
      try {
        obj = JSON.parse(res);
      } catch (e) {
        this.logger.error(e);
      }

      obj = obj ? obj : {};

      if (__not_object__ in obj) {
        return obj[__not_object__];
      }

      return obj;
    } catch (e) {
      this.logger.info(e);
      throw e;
    }
  }

  public async remove(key) {
    try {
      const client = this.createClient();
      const command = client.del(key);
      try {
        const obj = await Promise.resolve(command);
        quit(client);
        return true;
      } catch (error) {
        this.logger.error(error);
        quit(client);
        return false;
      }
    } catch (e) {
      this.logger.info(e);
      throw e;
    }
  }

  public async set(key, value) {
    try {
      const client = this.createClient();

      if (!isObject(value)) {
        value = {
          __not_object__: value
        };
      }

      const command = client.set(key, JSON.stringify(value));

      try {
        const obj = await Promise.resolve(command);
        quit(client);
        return obj;
      } catch (error) {
        quit(client);
        this.logger.error(error);
        return false;
      }
    } catch (e) {
      this.logger.info(e);
      return false;
    }
  }

  public async retrieveIfConnected(token) {
    const user = this.get(token);
    if (user) {
      return user;
    }

    return false;
  }
}
