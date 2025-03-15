# API

## Accept Invitation

```
PATCH /api/invitation
```

```js
// request
{
    user: {
        username:string;
        humanName:string;
        email:string;
    },
    machine: {
        did:string;
    },
    code:string;  // the invitation code
}
```
