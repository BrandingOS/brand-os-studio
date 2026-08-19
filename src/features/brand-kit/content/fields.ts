/**
 * What the panel shows, per content kind.
 *
 * The panel used to be the same four rails for everything — Image,
 * Colors, Logos, Typography — whether you were editing a favicon or an
 * invoice. This is the replacement: each kind declares its own fields, in
 * its own groups, and the panel is a renderer for that declaration.
 *
 * Every field addresses a `path` in the content model, and that is the
 * same vocabulary a `<Bind>` on the artifact uses. Clicking a region and
 * finding its control is therefore a lookup, not a mapping table someone
 * has to keep in sync.
 */
import type { ContentKind } from './kinds';

export type FieldSpec =
  | { type: 'text'; path: string; label: string; placeholder?: string; multiline?: boolean }
  | { type: 'number'; path: string; label: string; suffix?: string; step?: number }
  | { type: 'money'; path: string; label: string }
  | { type: 'date'; path: string; label: string; placeholder?: string }
  | { type: 'select'; path: string; label: string; options: ReadonlyArray<string> }
  /** An editable collection. `itemFields` paths are RELATIVE to the item. */
  | { type: 'list'; path: string; label: string; itemLabel: string; itemFields: FieldSpec[] };

export type FieldGroup = {
  id: string;
  title: string;
  /** One line under the title. Omitted where the title is self-evident. */
  hint?: string;
  fields: FieldSpec[];
};

const PERSON_GROUPS: FieldGroup[] = [
  {
    id: 'identity',
    title: 'Identity',
    fields: [
      { type: 'text', path: 'fullName', label: 'Full name', placeholder: 'Jane Smith' },
      { type: 'text', path: 'jobTitle', label: 'Job title', placeholder: 'Vice President' },
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    fields: [
      { type: 'text', path: 'email', label: 'Email', placeholder: 'jane@company.com' },
      { type: 'text', path: 'phone', label: 'Phone', placeholder: '+1 234 56789' },
      { type: 'text', path: 'website', label: 'Website', placeholder: 'company.com' },
    ],
  },
];

const LETTER_GROUPS: FieldGroup[] = [
  {
    id: 'sender',
    title: 'From',
    fields: [
      { type: 'text', path: 'senderName', label: 'Sender', placeholder: 'Your company' },
      { type: 'text', path: 'senderAddress', label: 'Address', placeholder: '1234 Studio · NY' },
    ],
  },
  {
    id: 'letter',
    title: 'Letter',
    hint: 'Leave the body empty to keep the blank letterhead.',
    fields: [
      { type: 'text', path: 'recipient', label: 'To', placeholder: 'Acme Co.' },
      { type: 'date', path: 'date', label: 'Date', placeholder: '12 March 2026' },
      { type: 'text', path: 'subject', label: 'Subject', placeholder: 'Project proposal' },
      { type: 'text', path: 'body', label: 'Body', multiline: true, placeholder: 'Dear…' },
    ],
  },
  {
    id: 'footer',
    title: 'Footer',
    fields: [
      { type: 'text', path: 'website', label: 'Website', placeholder: 'company.com' },
      { type: 'text', path: 'phone', label: 'Phone', placeholder: '+1 234 56789' },
    ],
  },
];

export const INVOICE_CURRENCIES = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'EGP', 'JPY'] as const;

const INVOICE_GROUPS: FieldGroup[] = [
  {
    id: 'parties',
    title: 'Bill from · Bill to',
    fields: [
      { type: 'text', path: 'issuerName', label: 'From', placeholder: 'Your company' },
      { type: 'text', path: 'issuerAddress', label: 'From address', placeholder: '1234 Studio · NY' },
      { type: 'text', path: 'clientName', label: 'To', placeholder: 'Acme Co.' },
      { type: 'text', path: 'clientAddress', label: 'To address', placeholder: '587 Recipient Ave' },
    ],
  },
  {
    id: 'reference',
    title: 'Reference',
    fields: [
      { type: 'text', path: 'number', label: 'Invoice №', placeholder: '0014' },
      { type: 'date', path: 'issueDate', label: 'Issued', placeholder: '12 March 2026' },
      { type: 'date', path: 'dueDate', label: 'Due', placeholder: '11 April 2026' },
      { type: 'select', path: 'currency', label: 'Currency', options: INVOICE_CURRENCIES },
    ],
  },
  {
    id: 'items',
    title: 'Line items',
    hint: 'Totals are worked out from these.',
    fields: [
      {
        type: 'list',
        path: 'lineItems',
        label: 'Line items',
        itemLabel: 'Item',
        itemFields: [
          { type: 'text', path: 'label', label: 'Description', placeholder: 'Brand strategy' },
          { type: 'number', path: 'qty', label: 'Qty', step: 1 },
          { type: 'money', path: 'unitPrice', label: 'Unit price' },
        ],
      },
    ],
  },
  {
    id: 'totals',
    title: 'Adjustments',
    fields: [
      { type: 'number', path: 'discountRate', label: 'Discount', suffix: '%', step: 0.5 },
      { type: 'number', path: 'taxRate', label: 'Tax', suffix: '%', step: 0.5 },
    ],
  },
  {
    id: 'notes',
    title: 'Notes',
    fields: [
      { type: 'text', path: 'notes', label: 'Notes', multiline: true, placeholder: 'Payment terms…' },
    ],
  },
];

export function fieldGroupsFor(kind: ContentKind): FieldGroup[] {
  switch (kind) {
    case 'person':
      return PERSON_GROUPS;
    case 'letter':
      return LETTER_GROUPS;
    case 'invoice':
      return INVOICE_GROUPS;
  }
}

/**
 * The field that owns a path, including inside a list.
 *
 * Selecting a bound region on the artifact resolves through here, so the
 * panel can show the control for whatever was clicked. A list item's path
 * (`lineItems.2.unitPrice`) resolves to its item field with the concrete
 * index restored, because the spec stores item paths relative to the item.
 */
export function findFieldForPath(
  kind: ContentKind,
  path: string,
): { field: FieldSpec; group: FieldGroup; absolutePath: string } | null {
  for (const group of fieldGroupsFor(kind)) {
    for (const field of group.fields) {
      if (field.type === 'list') {
        if (!path.startsWith(`${field.path}.`)) continue;
        const rest = path.slice(field.path.length + 1);
        const dot = rest.indexOf('.');
        if (dot < 0) continue;
        const index = rest.slice(0, dot);
        const leaf = rest.slice(dot + 1);
        const itemField = field.itemFields.find((f) => f.path === leaf);
        if (itemField) {
          return {
            field: itemField,
            group,
            absolutePath: `${field.path}.${index}.${leaf}`,
          };
        }
        continue;
      }
      if (field.path === path) return { field, group, absolutePath: path };
    }
  }
  return null;
}
