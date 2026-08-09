-- Down migration for 015 — drops the designs table.
-- Safe: no other object references it. Authenticated designs fall back to
-- LocalDesignStorage (localStorage) as before, so no code breaks — only
-- server-side design rows are removed.
DROP TABLE IF EXISTS public.designs;
