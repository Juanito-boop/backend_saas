import 'dotenv/config';

import { createTransport, type Transporter } from 'nodemailer';

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

let cachedTransporter: Transporter | null = null;

function getFrontendUrl() {
  return process.env.FRONTEND_URL
    ?? process.env.BETTER_AUTH_URL
    ?? `http://localhost:${process.env.PORT ?? '3000'}`;
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  const secure = process.env.SMTP_SECURE === 'true';

  return {
    host,
    port,
    user,
    pass,
    from,
    secure,
  };
}

function hasSmtpConfig() {
  const config = getSmtpConfig();

  return Boolean(config.host && config.port && config.user && config.pass && config.from);
}

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const config = getSmtpConfig();

  if (!config.host || !config.user || !config.pass || !config.from) {
    throw new Error('SMTP configuration is incomplete');
  }

  cachedTransporter = createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return cachedTransporter;
}

function normalizeVerificationUrl(url: string) {
  const parsedUrl = new URL(url);
  parsedUrl.searchParams.set('callbackURL', getFrontendUrl());

  return parsedUrl.toString();
}

export async function sendEmail(input: SendEmailInput) {
  if (!hasSmtpConfig()) {
    console.info('[auth-email] SMTP not configured. Email delivery skipped.');
    console.info(`[auth-email] To: ${input.to}`);
    console.info(`[auth-email] Subject: ${input.subject}`);
    console.info(`[auth-email] ${input.text}`);
    return;
  }

  const transporter = getTransporter();
  const { from } = getSmtpConfig();

  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}

export async function sendVerificationEmailMessage(input: { email: string; url: string }) {
  const verificationUrl = normalizeVerificationUrl(input.url);

  await sendEmail({
    to: input.email,
    subject: 'Verify your email',
    text: `Verify your email to continue using the SaaS backend: ${verificationUrl}`,
    html: `<p>Verify your email to continue using the SaaS backend.</p><p><a href="${verificationUrl}">Verify email</a></p><p>If you did not create this account, you can ignore this email.</p>`,
  });
}