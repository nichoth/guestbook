import 'dotenv/config'
import pg from 'pg'
const { Client } = pg
const envVar = process.env[`DATABASE_URL_${process.env.NODE_ENV?.toUpperCase()}`]
console.log('NODE_ENV', process.env.NODE_ENV)
const client = new Client(envVar)

const env = process.env.NODE_ENV
if (env !== 'staging' && env !== 'development' && env !== 'test') {
    throw new Error('Bad environment')
}

// the env var determines which DB we are targeting
const statements = [
    'DROP TABLE IF EXISTS machine;',
    'DROP TABLE IF EXISTS usr;',
    `CREATE TABLE IF NOT EXISTS usr (
        user_id  UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
        email    STRING NOT NULL UNIQUE,
        username STRING NOT NULL,
        human_name STRING NOT NULL,
        body STRING NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS machine (
        machine_name STRING PRIMARY KEY,
        owner UUID,
        did STRING NOT NULL,
        seq INT DEFAULT 0,
        human_name STRING NOT NULL,
        FOREIGN KEY (owner) REFERENCES usr(user_id)
    );`,
    `INSERT INTO usr (
        username,
        email,
        human_name,
        body
    ) VALUES (
        'abc_123_tester',
        'test@beef.com',
        'Abc 123 tester',
        'hello, i am a test user'
    );`,
    `INSERT INTO machine (
        machine_name,
        owner,
        did,
        seq,
        human_name
    ) VALUES (
        'abc123machinename',
        (SELECT user_id FROM usr WHERE email = 'test@beef.com'),
        'did:key:zstring',
        0,
        'Phone'
    );`,
    `
    CREATE OR REPLACE FUNCTION check_seq(machinename STRING, new_seq INT)
    RETURNS BOOLEAN AS
    $$
    DECLARE
        current_seq INT;
    BEGIN
        -- Retrieve the current seq for the given machine
        SELECT seq INTO current_seq
        FROM machine
        WHERE machine_name = machinename;

        -- Check if the new seq is greater than the current seq
        IF new_seq > current_seq THEN
            UPDATE machine
            SET seq = new_seq
            WHERE machine_name = machinename;

            RETURN TRUE;
        ELSE
            RETURN FALSE;
        END IF;
    END;
    $$ LANGUAGE plpgsql;
    `,
    `
        CREATE INDEX user_by_email
        ON usr (email);
    `
]

// TODO
// replace `statements` with real seed data.

try {
    await client.connect()
    const res = await Promise.all(statements.map(sql => {
        return client.query(sql)
    }))

    console.log('success', res.filter(r => Boolean(r)).map(r => r.rows))
} catch (err) {
    console.log('**error**', err)
}

client.end()
