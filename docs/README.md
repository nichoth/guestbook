# notes

## envs

4 possible `NODE_ENV`s -- `staging`, `test`, `development`, `production`.

This corresponds to vars for the DB url

1. `DATABASE_URL_TEST`
2. `DATABASE_URL_DEVELOPMENT`
3. `DATABASE_URL_PRODUCTION`
4. `DATABASE_URL_STAGING`

We get the URL for the DB by combining `NODE_ENV` and the DB url param.

```js
const client = new Client(
    process.env[`DATABASE_URL_${process.env.NODE_ENV?.toUpperCase()}`]
)
```

## scratch

```sql
CREATE OR REPLACE FUNCTION update_code(
    code_name VARCHAR,
    new_rules JSONB
  ) 
  RETURNS promo_codes AS $$
    UPDATE promo_codes SET rules = new_rules
    WHERE code = code_name
    RETURNING *;
  $$ LANGUAGE SQL;
```
