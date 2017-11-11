const nodemailer = require('nodemailer');
const logger = new (require('../logger/logger'))();
const isObject = require('../shared/shared').isObject;

/**
 * Reusable transporter object using the default SMTP transport
 * from provided smtp configuration.
 */
const MAILER = require('../../setup').MAILER;
const smtp = isObject(MAILER) ? MAILER.smtp : {};

if (!smtp.service && (!smtp.host || smtp.port === undefined)) {
  logger.warn('Mailer not properly configured');
}

const transporter = nodemailer.createTransport(smtp);

module.exports = class Mailer {
  static send(opts) {
    if (!MAILER.activate) {
      logger.debug('Mailer not activated');
      return;
    }

    /**
     * Send mail with defined transport object.
     */
    transporter.sendMail(opts, (error, info) => {
      if (error) {
        return logger.error(error);
      }

      logger.info('Message ' + info.messageId + ' sent: ' + info.response);
    });
  }
};
