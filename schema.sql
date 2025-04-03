DROP TABLE IF EXISTS machine;
DROP TABLE IF EXISTS usr;
DROP TABLE IF EXISTS invitation;

CREATE TABLE IF NOT EXISTS usr (
    "email"       STRING PRIMARY KEY,
    "username"    STRING NOT NULL,
    "human_name"  STRING NOT NULL,
    "bluesky"     STRING,
    "body"        STRING NOT NULL
);

CREATE TABLE IF NOT EXISTS invitation (
    "id"          UUID        NOT NULL,
    "remaining"   INT         NOT NULL,
    "creator"     STRING      NOT NULL,
    "note"        STRING,
    FOREIGN KEY   (creator)   REFERENCES usr(email) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS machine (
    machine_name        STRING PRIMARY KEY,
    owner               STRING,
    did                 STRING NOT NULL,
    seq                 INT DEFAULT 0,
    human_name          STRING NOT NULL,
    FOREIGN KEY (owner) REFERENCES usr(email) ON DELETE CASCADE
);

INSERT INTO usr (
    username,
    email,
    human_name,
    body
) VALUES (
    'abc_123_tester',
    'test@beef.com',
    'Abc 123 tester',
    'hello, i am a test user'
);

INSERT INTO machine (
    machine_name,
    owner,
    did,
    seq,
    human_name
) VALUES (
    'abc123_machinename_here',
    (SELECT email FROM usr WHERE usr.email = 'test@beef.com'),
    'did:key:zstring_here',
    0,
    'Phone'
);

INSERT INTO invitation (
    id,
    remaining,
    creator,
    note
) VALUES (
    '7a40468e-6233-466f-a22c-5a43e4157c93',
    10,
    (SELECT email from usr WHERE usr.email = 'test@beef.com'),
    'this is a test invitation'
)
