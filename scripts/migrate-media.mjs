/**
 * Idempotent migration for the CMS media library.
 *
 * Creates the `media_assets` table that stores METADATA for images uploaded to
 * Vercel Blob. Binary files live in Blob, never in Postgres.
 *
 * - Safe to run multiple times (CREATE TABLE / INDEX IF NOT EXISTS).
 * - Does not touch any existing table or CMS data.
 *
 * Run with env loaded:
 *   node --env-file-if-exists=/vercel/share/.env.project scripts/migrate-media.mjs
 */
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    await client.query(`
      CREATE TABLE IF NOT EXISTS media_assets (
        id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        url               text NOT NULL,
        pathname          text,
        filename          text,
        original_filename text,
        mime_type         text,
        size_bytes        integer,
        width             integer,
        height            integer,
        alt_text          text,
        caption           text,
        category          text,
        created_by        uuid REFERENCES admin_users(id) ON DELETE SET NULL,
        created_at        timestamptz NOT NULL DEFAULT now(),
        updated_at        timestamptz NOT NULL DEFAULT now(),
        is_active         boolean NOT NULL DEFAULT true
      )
    `)

    // Fast lookups for listing (newest first) and filtering.
    await client.query(`CREATE INDEX IF NOT EXISTS media_assets_created_at_idx ON media_assets (created_at DESC)`)
    await client.query(`CREATE INDEX IF NOT EXISTS media_assets_category_idx ON media_assets (category)`)
    await client.query(`CREATE INDEX IF NOT EXISTS media_assets_active_idx ON media_assets (is_active)`)
    // De-duplicate by blob url so re-saving the same upload can't create dupes.
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS media_assets_url_key ON media_assets (url)`)

    await client.query("COMMIT")
    console.log("[migrate-media] media_assets table is ready")
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("[migrate-media] failed:", err)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

main()
