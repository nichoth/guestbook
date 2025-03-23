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

async function dropTables (client:InstanceType<typeof Client>) {
    const statements = [
        'DROP TABLE IF EXISTS machine CASCADE;',
        'DROP TABLE IF EXISTS usr CASCADE;',
        'DROP TABLE IF EXISTS invitation CASCADE;',
    ]

    const res = await Promise.all(statements.map(sql => {
        return client.query(sql)
    }))

    return res
}

// the env var determines which DB we are targeting

const statements = [
    // user
    `CREATE TABLE IF NOT EXISTS usr (
        email       STRING PRIMARY KEY NOT NULL UNIQUE,
        username    STRING NOT NULL,
        human_name  STRING NOT NULL,
        body        STRING NOT NULL
    );`,

    // invitation
    `CREATE TABLE IF NOT EXISTS invitation (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        remaining   INT         NOT NULL,
        creator     STRING      NOT NULL,
        note        STRING,
        FOREIGN KEY (creator)   REFERENCES usr(email)
    );`,

    // machine
    `CREATE TABLE IF NOT EXISTS machine (
        machine_name        STRING PRIMARY KEY,
        owner               STRING,
        did                 STRING NOT NULL,
        seq                 INT DEFAULT 0,
        human_name          STRING NOT NULL,
        FOREIGN KEY (owner) REFERENCES usr(email)
    );`,

    // test data
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
        'abc123_machinename_here',
        (SELECT email FROM usr WHERE usr.email = 'test@beef.com'),
        'did:key:zstring',
        0,
        'Phone'
    );`,

    `INSERT INTO invitation (
        remaining,
        creator,
        note
    ) VALUES (
        10,
        (SELECT email from usr WHERE usr.email = 'test@beef.com'),
        'this is a test invitation'
    )
    `,

    // function to check & update the `seq` number
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

    // function to accept an invitation
    // (create a new user & machine)
    `
        CREATE FUNCTION accept_invitation(
            invitation_id UUID,
            new_machine_name VARCHAR(255),
            new_machine_human_name VARCHAR(255),
            new_machine_did VARCHAR(255),
            new_username VARCHAR(255),
            new_user_human_name VARCHAR(255),
            new_user_email VARCHAR(255),
            new_body STRING
        )
        RETURNS JSONB AS $$

        DECLARE
            remaining_count INT;
            user_record JSONB;
            machine_record JSONB;
        BEGIN
            -- Step 1: Get the current remaining count for the invitation
            SELECT remaining INTO remaining_count
            FROM invitation
            WHERE id = invitation_id;

            -- Step 2: Check if the invitation has remaining uses
            IF remaining_count <= 0 THEN
                RETURN jsonb_build_object(
                    'error', 'No remaining uses for this invitation.'
                );
            END IF;

            -- Step 3: Decrement the remaining count
            UPDATE invitation
            SET remaining = remaining - 1
            WHERE id = invitation_id;

            -- Step 4: Check if the remaining count is now 0 or less, and
            -- delete the invitation if so
            SELECT remaining INTO remaining_count
            FROM invitation
            WHERE id = invitation_id;

            IF remaining_count <= 0 THEN
                DELETE FROM invitation
                WHERE id = invitation_id;
            END IF;

            -- Step 5: Create a new user
            INSERT INTO usr (
                username,
                email,
                human_name,
                body
            ) VALUES (
                new_username,
                new_user_email,
                new_user_human_name,
                new_body
            );
            
            -- Retrieve the newly created user record as JSON
            SELECT jsonb_build_object(
                'username', username,
                'email', email,
                'human_name', human_name,
                'body', body
            ) INTO user_record
            FROM usr
            WHERE email = new_user_email;

            -- Step 6: Create a new machine with the new user as its owner
            INSERT INTO machine (
                machine_name,
                owner,
                did,
                seq,
                human_name
            ) VALUES (
                new_machine_name,
                new_user_email,
                new_machine_did,
                0,
                new_machine_human_name
            );

            -- Retrieve the newly created machine record as JSON
            SELECT jsonb_build_object(
                'machine_name', machine_name,
                'owner', owner,
                'did', did,
                'seq', seq,
                'human_name', human_name
            ) INTO machine_record
            FROM machine
            WHERE machine_name = new_machine_name;

            -- Combine the user and machine records into a single JSON object
            RETURN jsonb_build_object(
                'user', user_record,
                'machine', machine_record
            );
        END;
        $$ LANGUAGE plpgsql;
    `,

    // indexes
    `
        CREATE INDEX invitation_by_creator
        ON invitation (creator);
    `,
    `
        CREATE INDEX machine_by_did
        ON machine (did);
    `
]

try {
    await client.connect()
    await dropTables(client)
    const res = await Promise.all(statements.map(sql => {
        return client.query(sql)
    }))

    console.log('success dropping')
    console.log('success', res.filter(r => Boolean(r)).map(r => r.rows))
} catch (err) {
    console.log('**error**', err)
}

client.end()
