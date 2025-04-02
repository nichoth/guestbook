import 'dotenv/config'
import { neonConfig, Client } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

console.log('**NODE_ENV**', process.env.NODE_ENV)

async function dropTables (client:InstanceType<typeof Client>) {
    const statements = [
        'DROP TABLE IF EXISTS machine CASCADE;',
        'DROP TABLE IF EXISTS usr CASCADE;',
        'DROP TABLE IF EXISTS invitation CASCADE;',
    ]

    return await Promise.all(statements.map(s => {
        return client.query(s)
    }))
}

// the env var determines which DB we are targeting

const statements = [
    // user
    `CREATE TABLE IF NOT EXISTS usr (
        id          UUID         PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
        email       VARCHAR(255) NOT NULL UNIQUE,
        ts          TIMESTAMP    WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        username    VARCHAR(255) NOT NULL,
        human_name  VARCHAR(255) NOT NULL,
        bluesky     VARCHAR(255),
        body        TEXT NOT NULL
    );`,

    // invitation
    `CREATE TABLE IF NOT EXISTS invitation (
        id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
        ts          TIMESTAMP       WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        remaining   INT             NOT NULL,
        creator     VARCHAR(255)    NOT NULL,
        note        TEXT,
        FOREIGN KEY (creator)       REFERENCES usr(email) ON DELETE CASCADE
    );`,

    // machine
    `CREATE TABLE IF NOT EXISTS machine (
        machine_name        VARCHAR(255) PRIMARY KEY,
        ts                  TIMESTAMP    WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        owner               UUID,
        did                 TEXT NOT NULL,
        seq                 INT DEFAULT 0,
        human_name          VARCHAR(255) NOT NULL,
        FOREIGN KEY (owner) REFERENCES usr(id) ON DELETE CASCADE
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
        (SELECT id FROM usr WHERE usr.email = 'test@beef.com'),
        'did:key:zstring',
        0,
        'Root Machine'
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
    CREATE OR REPLACE FUNCTION check_seq(machinename VARCHAR(255), new_seq INT)
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

    // function to "login"
    // return a user record & all machine records
    `CREATE OR REPLACE FUNCTION check_seq_and_get_user(
        machinename VARCHAR,
        new_seq INT
    )
    RETURNS JSONB AS $$
    DECLARE
        is_valid BOOLEAN;
        user_record JSONB;
        machines JSONB;
        usr_id VARCHAR(255);
    BEGIN
        -- Step 1: Check if the sequence number is valid
        SELECT check_seq(machinename, new_seq) INTO is_valid;

        -- Step 2: Abort early if the sequence number is not valid
        IF NOT is_valid THEN
            RAISE EXCEPTION 'Invalid sequence number for machine: %', machinename;
        END IF;

        -- Step 3: If valid, retrieve the user who owns the machine
        SELECT owner INTO usr_id
        FROM machine
        WHERE machine_name = machinename
        LIMIT 1;

        -- Step 4: Retrieve the user who owns the machine
        SELECT jsonb_build_object(
            'email', u.email,
            'id', u.id,
            'username', u.username,
            'human_name', u.human_name,
            'bluesky', u.bluesky,
            'body', u.body
        ) INTO user_record
        FROM usr u
        WHERE u.email = email_address;

        -- Step 5: get their machines
        SELECT COALESCE(json_agg(json_build_object(
            'machine_name', m.machine_name,
            'human_name', m.human_name
        )), '[]') INTO machines
        FROM machine m
        WHERE m.owner = usr_id;

        -- Step 6: Return the user and machines as JSON
        RETURN jsonb_build_object(
            'user', user_record,
            'machines', machines
        );
    END;
    $$ LANGUAGE plpgsql;`,

    // function to accept an invitation
    // (create a new user & machine)
    `
        CREATE OR REPLACE FUNCTION accept_invitation(
            invitation_id UUID,
            new_machine_name VARCHAR(255),
            new_machine_human_name VARCHAR(255),
            new_machine_did TEXT,
            new_username VARCHAR(255),
            new_user_human_name VARCHAR(255),
            new_user_email VARCHAR(255),
            new_body VARCHAR(255),
            new_bluesky VARCHAR(255)
        )
        RETURNS JSONB AS $$

        DECLARE
            remaining_count INT;
            user_record JSONB;
            machine_record JSONB;
            new_user_id UUID;
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
                body,
                bluesky
            ) VALUES (
                new_username,
                new_user_email,
                new_user_human_name,
                new_body,
                new_bluesky
            ) RETURNING id INTO new_user_id;
            
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
                new_user_id,
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

    // invitation by email of the creator
    `
        CREATE INDEX invitation_by_creator
        ON invitation (creator);
    `,

    `
        CREATE INDEX machine_by_did
        ON machine (did);
    `,

    `
        CREATE INDEX machine_by_machine_name
        ON machine (machine_name);
    `,

    `
        CREATE INDEX user_by_email ON usr(email ASC);
    `
]

try {
    const client = new Client(getDbString(process.env))
    await client.connect()
    await dropTables(client)
    console.log('success dropping')

    await Promise.all(statements.map(s => {
        return client.query(s)
    }))
    console.log('success creating')
    await client.end()
} catch (_err) {
    const err = _err as Error
    console.log('**error**', err)
    console.log('****', err.stack)
}

function getDbString (env:NodeJS.ProcessEnv):string {
    let envVar:string|undefined = env[`NEON_URL_${process.env.NODE_ENV?.toUpperCase()}`]
    if (envVar) return envVar

    envVar = env['NEON_URL']
    if (!envVar) throw new Error('Not DB URL')

    return envVar
}
