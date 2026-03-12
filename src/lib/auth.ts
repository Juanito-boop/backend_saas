import 'dotenv/config';

import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { db } from '../db/database';
import { authSchema } from '../db/schema';
import { sendVerificationEmailMessage } from './email';

const baseURL = process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? '3000'}`;
const trustedOrigins = (
  process.env.BETTER_AUTH_TRUSTED_ORIGINS
  ?? process.env.CORS_ORIGINS
  ?? process.env.FRONTEND_URL
  ?? ''
)
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);
const originCheckExemptPaths = (
  process.env.BETTER_AUTH_DISABLE_ORIGIN_CHECK_PATHS ??
  '/sign-up/email,/sign-in/email,/send-verification-email,/request-password-reset,/reset-password,/change-password'
)
  .split(',')
  .map((path) => path.trim())
  .filter((path) => path.length > 0);
const disableOriginCheck = process.env.BETTER_AUTH_DISABLE_ORIGIN_CHECK === 'true'
  ? true
  : originCheckExemptPaths;

export const auth = betterAuth({
  baseURL,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema
  }),
  advanced: {
    disableOriginCheck: disableOriginCheck as boolean,
    database: {
      generateId: 'uuid'
    }
  },
  secret: process.env.BETTER_AUTH_SECRET,
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    async sendVerificationEmail({ user, url }) {
      await sendVerificationEmailMessage({
        email: user.email,
        url,
      });
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  }
});