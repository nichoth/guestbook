# Bellingham Guestbook

A contact list for the [Innovate Bellingham](https://innovatebellingham.org/)
events.

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
