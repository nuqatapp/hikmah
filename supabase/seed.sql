-- Puzzles are seeded idempotently by lib/game/service.ts from seed.json.
-- This bucket was provisioned in the existing project during initial setup.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('hikmah-avatars','hikmah-avatars',false,5242880,
  ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO NOTHING;
