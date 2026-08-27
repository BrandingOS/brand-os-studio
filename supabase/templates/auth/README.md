# BrandingOS — Supabase (GoTrue) auth e-mail templates

| File | Supabase content key | Subject key |
|---|---|---|
| `confirmation.html` | `mailer_templates_confirmation_content` | `mailer_subjects_confirmation` |
| `recovery.html` | `mailer_templates_recovery_content` | `mailer_subjects_recovery` |
| `magic_link.html` | `mailer_templates_magic_link_content` | `mailer_subjects_magic_link` |
| `email_change.html` | `mailer_templates_email_change_content` | `mailer_subjects_email_change` |
| `invite.html` | `mailer_templates_invite_content` | `mailer_subjects_invite` |
| `reauthentication.html` | `mailer_templates_reauthentication_content` | `mailer_subjects_reauthentication` |

Subjects live in `subjects.json` (same keys, minus the `mailer_subjects_` prefix). Variables used: `{{ .Token }}` (confirmation, reauthentication — and both their subjects), `{{ .ConfirmationURL }}` (recovery, magic_link, email_change, invite), `{{ .Email }}` (email_change, invite), `{{ .NewEmail }}` (email_change only). `{{ .SiteURL }}` is not used — no template needs it. Open `preview.html` in a browser to review all six with sample values.
