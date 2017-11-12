import { injectable, inject } from "inversify";
import {isObject} from '../utils';
import * as nodemailer from 'nodemailer';
import {Logger} from '../middleware/logger';

import * as config from '../config';
const MAILER = config.MAILER;
const smtp = isObject(MAILER) ? MAILER.smtp : {};


/**
 * Reusable transporter object using the default SMTP transport
 * from provided smtp configuration.
 */
const transporter = nodemailer.createTransport(smtp)
@injectable()
export class MailingService {
    public constructor(@inject(Logger) private logger: Logger) {
        if (!smtp.service && (!smtp.host || smtp.port === undefined)) {
            this.logger.warn('Mailer not properly configured');
        }
    }

    public send(opts) {
        if (!MAILER.activate) {
            this.logger.debug('Mailer not activated');
            return;
          }
      
          /**
           * Send mail with defined transport object.
           */
          transporter.sendMail(opts, (error, info) => {
            if (error) {
              return this.logger.error(error);
            }
      
            this.logger.info('Message ' + info.messageId + ' sent: ' + info.response);
          });
    }
}
