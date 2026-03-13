-- Convert id columns from text to uuid
-- This migration handles the case where existing tables have text-based IDs
-- that need to be converted to UUID type

-- Convert user table id
ALTER TABLE "user" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Convert session table id  
ALTER TABLE "session" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Convert account table id
ALTER TABLE "account" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Convert verification table id
ALTER TABLE "verification" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Convert organization table id
ALTER TABLE "organization" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Convert member table id
ALTER TABLE "member" ALTER COLUMN id TYPE uuid USING id::uuid;
