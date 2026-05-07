import { useV4Store } from '../store/onboardingV4Store';
import { BrandDropzone } from '../components/BrandDropzone';
import { AITextarea } from '../components/AITextarea';
import { CopyPromptHint } from '../components/CopyPromptHint';

export function SetupPanel() {
  const define = useV4Store((s) => s.define);
  const update = useV4Store((s) => s.updateDefine);

  return (
    <section className="panel is-active setup-panel-form">
      <form className="cosmos-form" autoComplete="off" noValidate onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label htmlFor="brand-name">Brand name</label>
          <input
            id="brand-name"
            className="input"
            type="text"
            placeholder="Enter your brand name"
            value={define.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>
        <div className="field">
          <div className="ai-field-head">
            <label htmlFor="description">Describe your brand</label>
            <CopyPromptHint variant="badge" brandName={define.name} />
          </div>
          <AITextarea value={define.description} onChange={(v) => update({ description: v })} />
        </div>

        <div className="field">
          <BrandDropzone />
        </div>
      </form>
    </section>
  );
}
