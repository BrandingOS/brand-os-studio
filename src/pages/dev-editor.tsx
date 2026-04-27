// Phase 1 demo page — loads the social-post fixture into the new
// unified Editor and persists to localStorage. Intentionally minimal so
// the user can verify the demo gate (drag/resize/rotate, add layers,
// reorder, lock, undo/redo, snap guides, export round-trip).

import { useMemo } from 'react';
import { Editor } from '@/features/editor/shell/Editor';
import { BrandOSDocumentSchema, type BrandOSDocument } from '@/features/editor/schema';
import socialPostFixture from '@/features/editor/schema/__fixtures__/social-post.sample.json';

const STORAGE_KEY = 'brandos.editor.phase1.devDoc';

function loadDoc(): BrandOSDocument {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return BrandOSDocumentSchema.parse(JSON.parse(raw));
  } catch {
    // fall through to fixture
  }
  return BrandOSDocumentSchema.parse(socialPostFixture);
}

async function saveDoc(doc: BrandOSDocument): Promise<void> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
}

export default function DevEditorPage() {
  const initial = useMemo(loadDoc, []);
  return (
    <Editor
      initialDocument={initial}
      save={saveDoc}
      backTo="/dashboard"
      breadcrumb={['Dev', 'Editor']}
      title="Phase 1 demo"
    />
  );
}
