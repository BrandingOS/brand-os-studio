import { useV4Store } from '../store/onboardingV4Store';
import { AITextarea } from '../components/AITextarea';
import { CopyPromptHint } from '../components/CopyPromptHint';
import { MagicWandInput } from '../components/MagicWandInput';

export function DefineStep() {
  const define = useV4Store((s) => s.define);
  const update = useV4Store((s) => s.updateDefine);

  return (
    <section className="panel is-active">
      <div className="level level-core">
        <div className="field">
          <label htmlFor="brand-name">Brand name</label>
          <MagicWandInput
            value={define.name}
            description={define.description}
            onChange={(v) => update({ name: v })}
          />
        </div>

        <div className="field">
          <div className="ai-field-head">
            <label htmlFor="description">Describe your brand</label>
            <span className="ai-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2 13.5 8.5 20 10 13.5 11.5 12 18 10.5 11.5 4 10 10.5 8.5z" />
              </svg>
              Brand intelligence
            </span>
          </div>
          <AITextarea value={define.description} onChange={(v) => update({ description: v })} />
          <CopyPromptHint brandName={define.name} />
        </div>
      </div>
    </section>
  );
}
