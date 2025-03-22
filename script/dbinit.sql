CREATE DATABASE IF NOT EXISTS development-guestbook;
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username STRING
);
