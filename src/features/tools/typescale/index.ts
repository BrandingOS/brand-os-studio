// src/features/tools/typescale/index.ts
export { TypescaleEditor } from './components/TypescaleEditor';
export { useSeedTypescale, seedTypescale } from './hooks/useSeedTypescale';
export { useTypescaleDraft } from './hooks/useTypescaleDraft';
export { EmbeddedTypescaleDialog } from './EmbeddedTypescaleDialog';
// Side effect: registers the materializer with the platform
import './materializer';
