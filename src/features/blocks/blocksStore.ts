/**
 * Blocks store — persists block documents per brand. localStorage-backed
 * for v1; a real backend can swap in later (the interface is the same).
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Block, BlockDocument } from './types';

interface BlocksStore {
  documents: Record<string, BlockDocument>;
  /** Get or create the canonical doc for a brand. */
  getOrCreate: (brandId: string, title?: string) => BlockDocument;
  setBlocks: (docId: string, blocks: Block[]) => void;
  insertBlock: (docId: string, block: Block, atIndex?: number) => void;
  updateBlock: (docId: string, blockId: string, patch: Partial<Block>) => void;
  removeBlock: (docId: string, blockId: string) => void;
  moveBlock: (docId: string, blockId: string, direction: 'up' | 'down') => void;
  setTitle: (docId: string, title: string) => void;
}

export const useBlocksStore = create<BlocksStore>()(
  devtools(
    persist(
      (set, get) => ({
        documents: {},

        getOrCreate: (brandId, title = 'Brand Guidelines') => {
          const existing = Object.values(get().documents).find((d) => d.brandId === brandId);
          if (existing) return existing;
          const doc: BlockDocument = {
            id: crypto.randomUUID(),
            brandId,
            title,
            blocks: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          set((state) => ({ documents: { ...state.documents, [doc.id]: doc } }), false, 'blocks/create');
          return doc;
        },

        setBlocks: (docId, blocks) => {
          set(
            (state) => {
              const doc = state.documents[docId];
              if (!doc) return state;
              return {
                documents: { ...state.documents, [docId]: { ...doc, blocks, updatedAt: Date.now() } },
              };
            },
            false,
            'blocks/set',
          );
        },

        insertBlock: (docId, block, atIndex) => {
          set(
            (state) => {
              const doc = state.documents[docId];
              if (!doc) return state;
              const next = [...doc.blocks];
              if (typeof atIndex === 'number') {
                next.splice(atIndex, 0, block);
              } else {
                next.push(block);
              }
              return {
                documents: { ...state.documents, [docId]: { ...doc, blocks: next, updatedAt: Date.now() } },
              };
            },
            false,
            'blocks/insert',
          );
        },

        updateBlock: (docId, blockId, patch) => {
          set(
            (state) => {
              const doc = state.documents[docId];
              if (!doc) return state;
              const next = doc.blocks.map((b) => (b.id === blockId ? ({ ...b, ...patch } as Block) : b));
              return {
                documents: { ...state.documents, [docId]: { ...doc, blocks: next, updatedAt: Date.now() } },
              };
            },
            false,
            'blocks/update',
          );
        },

        removeBlock: (docId, blockId) => {
          set(
            (state) => {
              const doc = state.documents[docId];
              if (!doc) return state;
              return {
                documents: {
                  ...state.documents,
                  [docId]: {
                    ...doc,
                    blocks: doc.blocks.filter((b) => b.id !== blockId),
                    updatedAt: Date.now(),
                  },
                },
              };
            },
            false,
            'blocks/remove',
          );
        },

        moveBlock: (docId, blockId, direction) => {
          set(
            (state) => {
              const doc = state.documents[docId];
              if (!doc) return state;
              const idx = doc.blocks.findIndex((b) => b.id === blockId);
              if (idx === -1) return state;
              const target = direction === 'up' ? idx - 1 : idx + 1;
              if (target < 0 || target >= doc.blocks.length) return state;
              const next = [...doc.blocks];
              [next[idx], next[target]] = [next[target], next[idx]];
              return {
                documents: { ...state.documents, [docId]: { ...doc, blocks: next, updatedAt: Date.now() } },
              };
            },
            false,
            'blocks/move',
          );
        },

        setTitle: (docId, title) => {
          set(
            (state) => {
              const doc = state.documents[docId];
              if (!doc) return state;
              return {
                documents: { ...state.documents, [docId]: { ...doc, title, updatedAt: Date.now() } },
              };
            },
            false,
            'blocks/title',
          );
        },
      }),
      { name: 'brandos-v5-blocks' },
    ),
    { name: 'blocks-store' },
  ),
);
