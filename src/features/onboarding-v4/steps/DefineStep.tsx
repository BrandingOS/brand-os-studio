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
            <CopyPromptHint variant="badge" brandName={define.name} />
          </div>
          <AITextarea value={define.description} onChange={(v) => update({ description: v })} />
        </div>
      </div>
    </section>
  );
}
