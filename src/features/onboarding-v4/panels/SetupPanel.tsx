import { DsInput } from '@/shared/ds';
import { useV4Store } from '../store/onboardingV4Store';
import { BrandDropzone } from '../components/BrandDropzone';
import { BriefHandoff } from '../components/BriefHandoff';
import { DetectedSiteChip } from '@/features/onboarding/website/DetectedSiteChip';
import { detectedBesidesPill, hostOf, scanTarget } from '@/features/onboarding/website/detectSite';
import { genId } from '../utils/assetUpload';

interface Props {
  /**
   * Advances the flow. Wired to the form's submit so Enter works — on a screen
   * with a single text field, pressing Enter IS the expected way to continue,
   * and swallowing it makes the form feel broken.
   */
  onSubmit?(): void;
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

export function SetupPanel({ part, onSubmit }: Props) {
  const define = useV4Store((s) => s.define);
  const update = useV4Store((s) => s.updateDefine);
  const assets = useV4Store((s) => s.assets);
  const addAsset = useV4Store((s) => s.addAsset);
  const removeAsset = useV4Store((s) => s.removeAsset);
  // Which site the scan will read, and the address it will NOT read because a
  // link the user added outranks one we spotted in their description.
  const target = scanTarget(assets, define.description, define.ignoredSite);
  const besidesPill = detectedBesidesPill(assets, define.description, define.ignoredSite);
  const useDetected = () => {
    if (!besidesPill) return;
    for (const a of assets) {
      if (a.kind === 'link' && a.sourceUrl && hostOf(a.sourceUrl) === target?.host && target.source === 'pill') removeAsset(a.id);
    }
    addAsset({
      id: genId(),
      name: besidesPill,
      sub: 'Link',
      kind: 'link',
      previewUrl: null,
      sourceUrl: `https://${besidesPill}`,
      uploadStatus: 'done',
      uploadProgress: 1,
    });
  };

  if (part === 1) {
    return (
      <section className="panel is-active setup-panel-form">
        <form
          className="cosmos-form"
          autoComplete="off"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit?.();
          }}
        >
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
          <BriefHandoff
            brandName={define.name}
            value={define.description}
            onChange={(v) => update({ description: v })}
            onAuthorship={(descriptionAuthorship) => update({ descriptionAuthorship })}
            autoFocus
          />
        </div>

        <DetectedSiteChip
          pill={target?.source === 'pill' ? target.host : null}
          detected={target?.source === 'description' ? target.host : besidesPill}
          onDismiss={() => update({ ignoredSite: target?.host ?? besidesPill ?? undefined })}
          onUseDetected={useDetected}
        />

        <div className="field">
          <BrandDropzone />
        </div>
      </form>
    </section>
  );
}
