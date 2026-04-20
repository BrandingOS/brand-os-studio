import { describe, it, expect, beforeEach } from 'vitest';
import { useOnboardingStore } from './onboardingStore';

const reset = () => useOnboardingStore.getState().reset();

describe('onboardingStore', () => {
  beforeEach(reset);

  it('initializes with a session id and three palettes and six styles', () => {
    const s = useOnboardingStore.getState();
    expect(s.sessionId).toMatch(/^onb-/);
    expect(s.feel.styles).toHaveLength(6);
    expect(s.feel.palettes).toHaveLength(3);
    expect(s.step).toBe(1);
  });

  it('updates define answers by patch', () => {
    useOnboardingStore.getState().updateDefine({ name: 'Acme' });
    expect(useOnboardingStore.getState().define.name).toBe('Acme');
  });

  it('locks and unlocks a style', () => {
    const { styles } = useOnboardingStore.getState().feel;
    const id = styles[0].id;
    useOnboardingStore.getState().toggleStyleLock(id);
    expect(useOnboardingStore.getState().feel.styles[0].locked).toBe(true);
    useOnboardingStore.getState().toggleStyleLock(id);
    expect(useOnboardingStore.getState().feel.styles[0].locked).toBe(false);
  });

  it('selects and deselects a style (single-select)', () => {
    const { styles } = useOnboardingStore.getState().feel;
    useOnboardingStore.getState().selectStyle(styles[0].id);
    expect(useOnboardingStore.getState().feel.selectedStyleId).toBe(styles[0].id);
    useOnboardingStore.getState().selectStyle(styles[1].id);
    expect(useOnboardingStore.getState().feel.selectedStyleId).toBe(styles[1].id);
  });

  it('shuffle styles preserves locked', () => {
    const { styles } = useOnboardingStore.getState().feel;
    useOnboardingStore.getState().toggleStyleLock(styles[0].id);
    const beforeId = styles[0].id;
    useOnboardingStore.getState().shuffle('styles');
    const after = useOnboardingStore.getState().feel.styles;
    expect(after[0].id).toBe(beforeId);
    expect(after[0].locked).toBe(true);
  });

  it('addAsset appends and removeAsset removes', () => {
    useOnboardingStore.getState().addAsset({
      id: 'a1', filename: 'f.png', mimeType: 'image/png', kind: 'image',
      previewUrl: null, scratchPath: null, remotePath: null,
      uploadProgress: 0, uploadStatus: 'pending',
    });
    expect(useOnboardingStore.getState().assets).toHaveLength(1);
    useOnboardingStore.getState().removeAsset('a1');
    expect(useOnboardingStore.getState().assets).toHaveLength(0);
  });

  it('reset returns to initial state', () => {
    useOnboardingStore.getState().updateDefine({ name: 'X' });
    useOnboardingStore.getState().reset();
    expect(useOnboardingStore.getState().define.name).toBe('');
  });
});
