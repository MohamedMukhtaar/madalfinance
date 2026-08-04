import nodemailer from 'nodemailer';
import env from '../config/index.js';
import logger from '../utils/logger.js';

let transporter = null;

const getTransporter = () => {
  if (!env.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user
        ? { user: env.smtp.user, pass: env.smtp.pass }
        : undefined,
    });
  }
  return transporter;
};

/**
 * Send an email. No-op (and never throws) when SMTP is not configured,
 * so email stays optional in development.
 */
export const sendMail = async ({ to, subject, html, text }) => {
  const transport = getTransporter();
  if (!transport) {
    logger.debug(`Email skipped (SMTP not configured): "${subject}" -> ${to}`);
    return null;
  }
  try {
    const info = await transport.sendMail({ from: env.smtp.from, to, subject, html, text });
    logger.debug(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`Email delivery failed: ${err.message}`);
    return null;
  }
};

export default { sendMail };
