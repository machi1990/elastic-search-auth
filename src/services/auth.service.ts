import { injectable, inject } from 'inversify';
import * as passport from 'passport';
import { UserService } from './user.service';
import { RedisService } from './redis.service';
import { Logger } from '../middleware/logger';
import { cron, uuid } from '../utils';
import * as config from '../config';

import * as passport_http from 'passport-http';
import * as LdapStrategy from 'passport-ldapauth';
import * as basicAuth from 'basic-auth';

export const auth_header = 'AuthenticationSid';
const userService = inject(UserService);
const redisService = inject(RedisService);
const logger = inject(Logger);
const BasicStrategy = passport_http.BasicStrategy;
const SESSION_TIME = 1000 * 60 * 60;
const authenticationIDs = {};
/**
 * Default authentication field
 */
const strategyOpts = {
  usernameField: 'username',
  passwordField: 'password',
  type: 'basic', // ldapauth for ldap,
  server: {
    url: 'ldap://localhost:389',
    bindDn: 'cn=root',
    bindCredentials: 'secret',
    searchBase: 'ou=passport-ldapauth',
    searchFilter: '(uid={{username}})'
  }
};

const supportedStrategies = {
  local: true,
  ldap: true
};

if (config.AUTH) {
  strategyOpts.usernameField = config.AUTH.usernameField || strategyOpts.usernameField;
  strategyOpts.passwordField = config.AUTH.passwordField || strategyOpts.passwordField;
  strategyOpts.type =
    config.AUTH.type in supportedStrategies ? config.AUTH.type : strategyOpts.type;
  strategyOpts.server = config.AUTH.ldapOpts || strategyOpts.server;
}

export const auth = '__authenticationsid__';

@injectable()
export class AuthService {
  public static readonly TYPE = strategyOpts.type;
  @userService private userService: UserService;
  @redisService private redisService: RedisService;
  @logger private logger: Logger;

  public static authenticate() {
    return passport.authenticate(AuthService.TYPE);
  }

  public async remove(token) {
    delete authenticationIDs[token];
    await this.redisService.remove(token);
  }

  public async put(uuid_, user) {
    user[auth] = user[auth] || uuid_;
    user.date = Date.now();
    user.__server = config.ES.host;

    authenticationIDs[uuid_] = user;

    return await this.redisService.set(uuid_, authenticationIDs[uuid_]);
  }

  private credentials(token) {
    token = decodeURIComponent(token || '');
    token = token.replace('Basic ', '');

    if (!token) {
      this.logger.warn('Authentication token malformed');
      return void 0;
    }

    this.logger.info('Authentication header found. Verifying if user authorized');

    const buf = new Buffer(token, 'base64');
    const creds = buf
      .toString('utf-8')
      .trim()
      .split(':');

    return {
      username: creds[0],
      password: creds[1]
    };
  }

  private async retrieveFromRedis(token) {
    const res: any = await this.redisService.retrieveIfConnected(token);
    if (!res) {
      this.remove(token);
      return false;
    }

    if (!isActive(res.date)) {
      this.redisService.remove(token);
      return false;
    }

    if (res.__server !== config.ES.host) {
      this.remove(token);
      return false;
    }

    this.put(token, res);
    return authenticationIDs[token];
  }

  public async get(token) {
    if (authenticationIDs[token]) {
      this.put(token, authenticationIDs[token]);
      return authenticationIDs[token];
    }

    return await this.retrieveFromRedis(token);
  }

  public async authenticate(creds) {
    if (creds.username === auth) {
      if (
        !(creds.password in authenticationIDs) ||
        !isActive(authenticationIDs[creds.password].date)
      ) {
        return await this.retrieveFromRedis(creds.password);
      }

      return await this.get(creds.password);
    }

    const user = await this.userService.connect(creds.username, creds.password);

    if (!user) {
      return false;
    }

    this.put(uuid(), user);
    return user;
  }
}

@injectable()
export class PassportService {
  public constructor(@inject(AuthService) private authService: AuthService) {
    this.setup();
  }

  private get strategy() {
    if (strategyOpts.type === 'basic') {
      return new BasicStrategy(
        {
          passReqToCallback: true
        },
        async (req, username, password, passportCb) => {
          if (!username || !password) {
            return passportCb(null, false);
          }

          /**
           * Authentication.
           */
          const user = await this.authService.authenticate({
            username: username,
            password: password
          });

          if (!user) {
            return passportCb(null, false);
          }

          return this.strategyCb(req, user, passportCb);
        }
      );
    }

    return new LdapStrategy(
      {
        server: strategyOpts.server,
        credentialsLookup: basicAuth,
        passReqToCallback: true
      },
      this.strategyCb
    );
  }

  private strategyCb(req, user, passportCb) {
    if (!user) {
      return passportCb(null, user);
    }

    if (user[auth] === undefined) {
      this.authService.put(uuid(), user);
    }

    return passportCb(null, user);
  }

  private setup() {
    passport.use(this.strategy);

    passport.serializeUser((user, callback) => {
      callback(null, user[auth]);
    });

    passport.deserializeUser((uuid_, callback) => {
      const user = this.authService.get(uuid_);
      callback(null, user);
    });
  }

  public initialize() {
    return passport.initialize();
  }

  public session() {
    return passport.session();
  }
}

const isActive = val => {
  return Date.now() - val <= SESSION_TIME;
};

const removeExpiredSessions = () => {
  const expired = [];
  for (const id in authenticationIDs) {
    if (!isActive(authenticationIDs[id])) {
      expired.push(id);
    }
  }

  expired.forEach(id => {
    delete authenticationIDs[id];
  });
};

/**
 * Trigger removeExpiredSessions after every 10 mins.
 */
const INTERVAL = '*/10 * * * *';

const removeExpiredSessionJob = cron(INTERVAL, removeExpiredSessions);
