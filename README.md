# Internet Guestbook

A contact list, as a demonstration of various web technologies:


* [Single-page application](https://developer.mozilla.org/en-US/docs/Glossary/SPA)
* view library -- [preact](https://preactjs.com/)
* state machine -- [signals](https://preactjs.com/guide/v10/signals/)
* input validation -- [zod](https://zod.dev/)
* web components -- [shoelace](https://shoelace.style/), [@substrate-system](https://github.com/substrate-system/)
* "serverless" SQL -- [Neon DB](https://neon.tech/)
* "serverless" websockets -- [Partykit](https://www.partykit.io/)
* [lambda functions](https://www.netlify.com/platform/core/functions/)

See [the /about page for more](https://guestlist.town/about)

## develop

Start a local lambda function server, frontend server, and websocket server.

```sh
npm start
```
## deployment

Deployment is handled automatically by netlify.

## deploy partykit

Deployments to `staging` and `production` are handled automatically by
[the github action](./.github/workflows/deploy.yml).

The websocket server.

```sh
npx partykit deploy
```

## fork

This is a fork of the Bellingham guestbook. The `fork` branch here should always
be ahead of the bellingham/main branch.
