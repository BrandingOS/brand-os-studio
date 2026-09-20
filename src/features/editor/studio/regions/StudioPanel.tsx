// The contextual panel.
//
// One host, one header, one scroll container; the rail decides what goes
// inside. Templates and AI are the EXISTING panels — they are large,
// well-tested surfaces (the AI one carries the whole image-generation
// pipeline, credits included) and there was no reason to rewrite them to
// change the frame around them.
//
// A renderer that does not decompose its document into layers gets its
// own `renderer.Properties` here instead, which is what keeps invoices,
// letterheads and every Brand Kit deliverable editable.

import { X } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import type { BrandOSDocument, Layer, Page } from '@/features/editor/schema';
import type {
  DocumentAdapter,
  EditorAdapter,
  LayerEditingAdapter,
} from '@/features/editor/adapter/EditorAdapter';
import type { DesignRenderer } from '@/features/editor/renderers/types';
import type { BrandKit } from '@/features/editor/brand/BrandKit';
import type { AIAgent, AICommandContext, AICommandResult } from '@/features/editor/ai/types';
import { TemplatesPanel } from '@/features/editor/shell/v2/panels/TemplatesPanel';
import { GeneratePanel } from '@/features/editor/shell/v2/panels/generate/GeneratePanel';
import { IconButton } from '../components/chrome';
import { BrandPanel } from '../panels/BrandPanel';
import { ElementsPanel } from '../panels/ElementsPanel';
import { TextPanel } from '../panels/TextPanel';
import { UploadsPanel } from '../panels/UploadsPanel';
import { LayersPanel } from '../panels/LayersPanel';
import type { RailId } from '../state/studioStore';
import type { InsertRequest } from '../ops/insertRequest';

const TITLES: Record<RailId, string> = {
  brand: 'Brand',
  templates: 'Templates',
  elements: 'Elements',
  text: 'Text',
  uploads: 'Uploads',
  ai: 'Create with AI',
  layers: 'Layers',
};

interface Props {
  rail: RailId | null;
  onClose: () => void;
  adapter: LayerEditingAdapter | null;
  documentAdapter: DocumentAdapter;
  renderer: DesignRenderer;
  initialDocument: BrandOSDocument;
  doc: BrandOSDocument;
  page: Page | null;
  activePageId: string;
  brand?: Brand;
  brandKit: BrandKit | null;
  agent: AIAgent | null;
  readOnly: boolean;
  insert: (request: InsertRequest) => void;
  updateLayer: (pageId: string, layerId: string, patch: Partial<Layer>) => void;
  onReapplyBrand: () => void;
  initialPrompt?: string;
  initialAi?: {
    mode?: 'image' | 'editable';
    model?: string;
    formatId?: string;
    count?: number;
    autoStart?: boolean;
  };
  getAiContext: () => AICommandContext;
  onAiApply: (result: AICommandResult) => void;
}

export function StudioPanel(props: Props) {
  const { rail, onClose, renderer, adapter, documentAdapter, initialDocument, brand } = props;

  // A layerless renderer has one editing surface and it is always open:
  // there is no rail entry that could close it without leaving the user
  // with no way to edit the document at all.
  if (!renderer.supportsLayerEditing && renderer.Properties) {
    return (
      <aside className="st-panel" data-studio-panel="properties">
        <div className="st-panel-head">
          <span className="st-panel-title">Design</span>
        </div>
        <div className="st-panel-body" data-studio-properties>
          <renderer.Properties
            adapter={documentAdapter as EditorAdapter}
            brand={brand}
            initialDocument={initialDocument}
          />
        </div>
      </aside>
    );
  }

  if (!rail) return null;

  return (
    <aside className="st-panel" data-studio-panel={rail}>
      <div className="st-panel-head">
        <span className="st-panel-title">{TITLES[rail]}</span>
        <IconButton
          icon={<X size={15} strokeWidth={1.8} />}
          label="Close panel"
          onClick={onClose}
        />
      </div>
      <div className="st-panel-body">
        <PanelBody {...props} rail={rail} adapter={adapter} />
      </div>
    </aside>
  );
}

function PanelBody({
  rail,
  adapter,
  doc,
  page,
  activePageId,
  brand,
  brandKit,
  agent,
  readOnly,
  insert,
  updateLayer,
  onReapplyBrand,
  initialPrompt,
  initialAi,
  getAiContext,
  onAiApply,
}: Props & { rail: RailId }) {
  switch (rail) {
    case 'brand':
      return (
        <BrandPanel
          brand={brand}
          brandKit={brandKit}
          adapter={adapter}
          page={page}
          readOnly={readOnly}
          insert={insert}
          updateLayer={updateLayer}
          onReapplyBrand={onReapplyBrand}
        />
      );
    case 'elements':
      return (
        <ElementsPanel brandKit={brandKit} page={page} readOnly={readOnly} insert={insert} />
      );
    case 'text':
      return <TextPanel brandKit={brandKit} page={page} readOnly={readOnly} insert={insert} />;
    case 'uploads':
      return <UploadsPanel brand={brand} readOnly={readOnly} insert={insert} />;
    case 'layers':
      return (
        <LayersPanel
          adapter={adapter}
          page={page}
          readOnly={readOnly}
          updateLayer={updateLayer}
        />
      );
    case 'templates':
      return (
        <TemplatesPanel
          mode="editor"
          adapter={adapter ?? undefined}
          activePageId={activePageId}
        />
      );
    case 'ai':
      return adapter ? (
        <GeneratePanel
          adapter={adapter}
          activePageId={activePageId}
          doc={doc}
          brand={brand}
          agent={agent}
          getContext={getAiContext}
          initialPrompt={initialPrompt}
          initialMode={initialAi?.mode}
          initialModel={initialAi?.model}
          initialFormatId={initialAi?.formatId}
          initialCount={initialAi?.count}
          autoStart={initialAi?.autoStart}
          onApply={onAiApply}
          onActivePageChange={(id) => adapter.setActivePage(id)}
        />
      ) : null;
    default:
      return null;
  }
}
