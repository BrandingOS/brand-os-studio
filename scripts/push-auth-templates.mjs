#!/usr/bin/env node
/**
 * Push the versioned auth e-mail templates (supabase/templates/auth/*.html +
 * subjects.json) to the Supabase project via the Management API.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_… node scripts/push-auth-templates.mjs [--dry-run]
 *
 * The token is a personal access token (supabase.com/dashboard/account/tokens)
 * or the one `supabase login` stored. Never commit it. The project ref comes
 * from supabase/config.toml.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = resolve(root, 'supabase/templates/auth');
const ref = readFileSync(resolve(root, 'supabase/config.toml'), 'utf8').match(/project_id\s*=\s*"([^"]+)"/)?.[1];
const token = process.env.SUPABASE_ACCESS_TOKEN;
const dryRun = process.argv.includes('--dry-run');
if (!ref) throw new Error('project_id not found in supabase/config.toml');
if (!token && !dryRun) throw new Error('Set SUPABASE_ACCESS_TOKEN (or pass --dry-run)');

const KINDS = ['confirmation', 'recovery', 'magic_link', 'email_change', 'invite', 'reauthentication'];
const subjects = JSON.parse(readFileSync(resolve(dir, 'subjects.json'), 'utf8'));
const body = {};
for (const kind of KINDS) {
  const file = resolve(dir, `${kind}.html`);
  if (!existsSync(file)) throw new Error(`missing template: ${file}`);
  const html = readFileSync(file, 'utf8');
  if (html.length > 30_000) throw new Error(`${kind}.html is ${html.length} bytes — keep templates small`);
  body[`mailer_templates_${kind}_content`] = html;
  if (subjects[kind]) body[`mailer_subjects_${kind}`] = subjects[kind];
}

console.log(`Pushing ${KINDS.length} templates to project ${ref}${dryRun ? ' (dry run)' : ''}`);
for (const kind of KINDS) console.log(`  ${kind.padEnd(17)} ${body[`mailer_templates_${kind}_content`].length}B  subject: ${subjects[kind] ?? '(unchanged)'}`);
if (dryRun) process.exit(0);

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const json = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error('Failed:', res.status, json.message ?? json);
  process.exit(1);
}
console.log('Done. Live subjects:', KINDS.map((k) => `${k}="${json[`mailer_subjects_${k}`]}"`).join(', '));
