import fs from 'node:fs';
import nodemailer from 'nodemailer';
import { env } from '../config/env';

export const sendQuotationEmail = async (input: {
  to: string;
  subject: string;
  text: string;
  attachments: { filename: string; path: string }[];
}) => {
  const host = env.SMTP_HOST?.trim();
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS?.trim();

  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and optionally MAIL_FROM.');
  }

  for (const attachment of input.attachments) {
    if (!fs.existsSync(attachment.path)) {
      throw new Error(`Attachment not found: ${attachment.path}`);
    }
  }

  const transporter = nodemailer.createTransport({
    host,
    port: env.SMTP_PORT || 587,
    secure: env.SMTP_PORT === 465,
    auth: {
      user,
      pass,
    },
  });

  return transporter.sendMail({
    from: env.MAIL_FROM?.trim() || user,
    to: input.to,
    subject: input.subject,
    text: input.text,
    attachments: input.attachments,
  });
};
