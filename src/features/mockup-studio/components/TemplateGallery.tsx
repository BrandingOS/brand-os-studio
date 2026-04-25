/**
 * TemplateGallery — list of templates in the left panel. Uses the cosmos
 * `.panel-item` primitives so the row chrome (hover, active pill, eyebrow
 * categories) matches /setup, /tools/typescale, /tools/ui-color-system.
 */

import { Check } from 'lucide-react';

import type { TemplateMeta } from '../engine/types';

interface TemplateGalleryProps {
  templates: TemplateMeta[];
  activeId: string | null;
  onPick: (template: TemplateMeta) => void;
}

const CATEGORY_ORDER: TemplateMeta['category'][] = [
  'apparel',
  'packaging',
  'print',
  'device',
  'signage',
  'other',
];

const CATEGORY_LABEL: Record<TemplateMeta['category'], string> = {
  apparel: 'Apparel',
  packaging: 'Packaging',
  print: 'Print',
  device: 'Device',
  signage: 'Signage',
  other: 'Other',
};

export function TemplateGallery({ templates, activeId, onPick }: TemplateGalleryProps) {
  if (templates.length === 0) {
    return (
      <p style={{ padding: '12px 8px', fontSize: 12, color: 'var(--text-muted)' }}>
        No templates available.
      </p>
    );
  }

  // Group templates by category, preserving the canonical order.
  const grouped = new Map<TemplateMeta['category'], TemplateMeta[]>();
  for (const t of templates) {
    const list = grouped.get(t.category) ?? [];
    list.push(t);
    grouped.set(t.category, list);
  }

  const sections = CATEGORY_ORDER.filter((c) => grouped.has(c));

  return (
    <>
      {sections.map((category) => {
        const items = grouped.get(category) ?? [];
        return (
          <div key={category}>
            <div className="panel-group-label">{CATEGORY_LABEL[category]}</div>
            {items.map((t) => {
              const active = t.id === activeId;
              return (
                <div
                  key={t.id}
                  className={`panel-item${active ? ' is-active' : ''}`}
                >
                  <button
                    type="button"
                    className="panel-item-body"
                    onClick={() => onPick(t)}
                  >
                    <div className="panel-item-thumb" style={{ width: 36, height: 36 }}>
                      <img
                        src={t.assets.thumbnail ?? t.assets.base}
                        alt=""
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                        }}
                      />
                    </div>
                    <div className="panel-item-meta">
                      <span className="panel-item-name">{t.name}</span>
                      <span className="panel-item-sub">
                        {CATEGORY_LABEL[t.category]}
                      </span>
                    </div>
                  </button>
                  {active && (
                    <span
                      className="status-chip is-added"
                      aria-label="Selected"
                    >
                      <Check size={14} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
