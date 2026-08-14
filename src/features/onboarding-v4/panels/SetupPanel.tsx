import { DsInput } from '@/shared/ds';
import { useV4Store } from '../store/onboardingV4Store';
import { BrandDropzone } from '../components/BrandDropzone';
import { AITextarea } from '../components/AITextarea';
import { CopyPromptHint } from '../components/CopyPromptHint';

interface Props {
  /**
   * 1 asks only for the name; 2 asks for everything else.
   *
   * Split deliberately: the AI prompt is built around the brand's name, so the
   * name has to exist before the badge that hands it over is on screen. On one
   * combined screen people copied the prompt with the field still empty and got
   * a profile for "[BRAND NAME]".
   */
  part: 1 | 2;
}

export function SetupPanel({ part }: Props) {
  const define = useV4Store((s) => s.define);
  const update = useV4Store((s) => s.updateDefine);

  if (part === 1) {
    return (
      <section className="panel is-active setup-panel-form">
        <form className="cosmos-form" autoComplete="off" noValidate onSubmit={(e) => e.preventDefault()}>
          <div className="field">
            <DsInput
              id="brand-name"
              label="Brand name"
              type="text"
              autoFocus
              placeholder="Enter your brand name"
              value={define.name}
              onChange={(e) => update({ name: e.target.value })}
            />
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="panel is-active setup-panel-form">
      <form className="cosmos-form" autoComplete="off" noValidate onSubmit={(e) => e.preventDefault()}>
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
