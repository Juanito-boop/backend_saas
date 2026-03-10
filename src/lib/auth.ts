import 'dotenv/config';

import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { db } from '../db/database';
import { authSchema } from '../db/schema';

const baseURL = process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? '3000'}`;
const originCheckExemptPaths = (
  process.env.BETTER_AUTH_DISABLE_ORIGIN_CHECK_PATHS ??
  '/sign-up/email,/sign-in/email,/request-password-reset,/reset-password,/change-password'
)
  .split(',')
  .map((path) => path.trim())
  .filter((path) => path.length > 0);
const disableOriginCheck = process.env.BETTER_AUTH_DISABLE_ORIGIN_CHECK === 'true'
  ? true
  : originCheckExemptPaths;

export const auth = betterAuth({
  baseURL,
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
  emailAndPassword: {
    enabled: true
  }
});