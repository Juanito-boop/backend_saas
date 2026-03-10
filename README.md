<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Environment variables

```bash
DATABASE_URL=postgres://...
REDIS_URL=redis://localhost:6379
PORT=3000
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace-with-a-random-32-character-secret
BETTER_AUTH_DISABLE_ORIGIN_CHECK=false
BETTER_AUTH_DISABLE_ORIGIN_CHECK_PATHS=/sign-up/email,/sign-in/email,/send-verification-email,/request-password-reset,/reset-password,/change-password
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM="SaaS Backend <no-reply@example.com>"
```

`BETTER_AUTH_DISABLE_ORIGIN_CHECK_PATHS` allows non-browser clients such as Postman or server-to-server callers that do not send an `Origin` header to use the listed auth endpoints. Set `BETTER_AUTH_DISABLE_ORIGIN_CHECK=true` only if you intentionally want to skip the origin check for every Better Auth route.

If SMTP is not configured, verification emails are not sent externally and the verification link is logged to the API console for local development.

Mailtrap example:

```bash
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
SMTP_FROM="SaaS Backend <no-reply@example.test>"
```

## Email verification

Email and password sign-in now requires a verified email address.

Nest routes are protected by default. Only the health endpoints are marked public. Better Auth routes remain public because they are mounted directly under `/api/auth` in the Express server.

- `POST /api/auth/sign-up/email` creates the user and triggers a verification email.
- `POST /api/auth/send-verification-email` re-sends the verification email for an existing user.
- `GET /api/auth/verify-email?token=...` verifies the email and marks `users.email_verified = true`.
- `api/teams/*` and `api/teams/:teamId/subscription` require both an authenticated session and `emailVerified = true`.
- `POST /api/scrape-jobs` also requires both an authenticated session and `emailVerified = true`.

This means invited members cannot access team or subscription endpoints until they verify their email address.

## Health endpoints

Use `GET /api/health/live` for a lightweight liveness probe and `GET /api/health/ready` for readiness.

- `live`: validates that the API process is running.
- `ready`: validates database connectivity, Better Auth configuration, Redis/BullMQ connectivity, and performs real reads against the `teams` and `subscriptions` tables.

`GET /api/health` currently returns the same payload as readiness for backward compatibility.

## Scrape queue

The API publishes price-check jobs to the `scrape-jobs` BullMQ queue and the worker consumes them in a separate process. Only authenticated users with verified email can enqueue jobs.

Example request:

```bash
curl -X POST http://localhost:3000/api/scrape-jobs \
  -H "Content-Type: application/json" \
  -H "Cookie: <better-auth-session-cookie>" \
  -d '{"productId":"prod_123","domainId":"domain_456"}'
```

Start the API and worker in separate processes:

```bash
# API
$ npm run start:dev

# worker
$ npm run start:worker
```

For a production build:

```bash
$ npm run build
$ npm run start:prod
$ npm run start:worker:prod
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
