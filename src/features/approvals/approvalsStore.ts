/**
 * Approvals store — review queue for assets, templates, blocks, anything
 * with a stable id. localStorage-backed for v1.
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type ApprovalKind = 'asset' | 'template' | 'block' | 'guideline';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalItem {
  id: string;
  brandId: string;
  kind: ApprovalKind;
  /** Reference to the underlying object id (asset.id, etc.) */
  refId: string;
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  status: ApprovalStatus;
  submittedBy: string;
  submittedAt: number;
  reviewedBy?: string;
  reviewedAt?: number;
  comment?: string;
}

interface ApprovalsStore {
  items: Record<string, ApprovalItem>;
  list: (brandId: string) => ApprovalItem[];
  countPending: (brandId: string) => number;
  submit: (input: Omit<ApprovalItem, 'id' | 'status' | 'submittedAt'>) => ApprovalItem;
  approve: (id: string, reviewerName: string, comment?: string) => void;
  reject: (id: string, reviewerName: string, comment?: string) => void;
  remove: (id: string) => void;
  seedSample: (brandId: string) => void;
}

export const useApprovalsStore = create<ApprovalsStore>()(
  devtools(
    persist(
      (set, get) => ({
        items: {},

        list: (brandId) =>
          Object.values(get().items)
            .filter((i) => i.brandId === brandId)
            .sort((a, b) => b.submittedAt - a.submittedAt),

        countPending: (brandId) =>
          Object.values(get().items).filter((i) => i.brandId === brandId && i.status === 'pending').length,

        submit: (input) => {
          const item: ApprovalItem = {
            id: crypto.randomUUID(),
            ...input,
            status: 'pending',
            submittedAt: Date.now(),
          };
          set((state) => ({ items: { ...state.items, [item.id]: item } }), false, 'approvals/submit');
          return item;
        },

        approve: (id, reviewerName, comment) => {
          set(
            (state) => {
              const item = state.items[id];
              if (!item) return state;
              return {
                items: {
                  ...state.items,
                  [id]: { ...item, status: 'approved', reviewedAt: Date.now(), reviewedBy: reviewerName, comment },
                },
              };
            },
            false,
            'approvals/approve',
          );
        },

        reject: (id, reviewerName, comment) => {
          set(
            (state) => {
              const item = state.items[id];
              if (!item) return state;
              return {
                items: {
                  ...state.items,
                  [id]: { ...item, status: 'rejected', reviewedAt: Date.now(), reviewedBy: reviewerName, comment },
                },
              };
            },
            false,
            'approvals/reject',
          );
        },

        remove: (id) => {
          set(
            (state) => {
              const next = { ...state.items };
              delete next[id];
              return { items: next };
            },
            false,
            'approvals/remove',
          );
        },

        seedSample: (brandId) => {
          const existing = Object.values(get().items).filter((i) => i.brandId === brandId);
          if (existing.length > 0) return;
          const samples: Omit<ApprovalItem, 'id'>[] = [
            {
              brandId,
              kind: 'asset',
              refId: 'sample-1',
              title: 'Q4 social campaign · hero image',
              subtitle: 'Submitted by the social team for brand review',
              status: 'pending',
              submittedBy: 'maya@studio.io',
              submittedAt: Date.now() - 1000 * 60 * 60 * 4,
            },
            {
              brandId,
              kind: 'template',
              refId: 'sample-2',
              title: 'Investor pitch deck v3',
              subtitle: 'Updated with new positioning copy',
              status: 'pending',
              submittedBy: 'daniel@studio.io',
              submittedAt: Date.now() - 1000 * 60 * 60 * 24,
            },
            {
              brandId,
              kind: 'guideline',
              refId: 'sample-3',
              title: 'Updated voice & tone section',
              subtitle: 'Adds 4 new examples and a do/don\'t block',
              status: 'pending',
              submittedBy: 'priya@agency.com',
              submittedAt: Date.now() - 1000 * 60 * 60 * 36,
            },
            {
              brandId,
              kind: 'asset',
              refId: 'sample-4',
              title: 'Annual report cover',
              status: 'approved',
              submittedBy: 'maya@studio.io',
              submittedAt: Date.now() - 1000 * 60 * 60 * 72,
              reviewedBy: 'priya@agency.com',
              reviewedAt: Date.now() - 1000 * 60 * 60 * 48,
              comment: 'Looks great — approved.',
            },
          ];
          samples.forEach((s) => {
            const id = crypto.randomUUID();
            set(
              (state) => ({ items: { ...state.items, [id]: { id, ...s } } }),
              false,
              'approvals/seed',
            );
          });
        },
      }),
      { name: 'brandos-v5-approvals' },
    ),
    { name: 'approvals-store' },
  ),
);
