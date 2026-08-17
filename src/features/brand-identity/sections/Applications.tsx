/**
 * The closing movement: how the brand sounds, how it looks applied, and how to
 * take it away.
 *
 * Two of these sections take the brand's own ground — Voice and Closing. They
 * are the only two, and they are chosen because they are STATEMENTS rather than
 * specifications: everywhere else the brand is the subject on a neutral stage,
 * and here it is the stage. That restraint is what makes the moment land.
 */
import type { IdentityImage, IdentityModel } from '../identityModel';
import { DownloadPill, Section, SplitHeader } from '../components/primitives';
import { useReveal } from '../motion/useReveal';
import { SocialApplications } from './Social';
import { downloadAllColours, downloadAllLogos, fetchAsBlob } from '../download/identityDownloads';
import { downloadCompleteIdentity } from '../download/identityBundle';
import { downloadBlob, slugify } from '@/features/setup/utils/downloads';

export function Voice({ model }: { model: IdentityModel }) {
  const { tone, doList, dontList, examples } = model.voice;
  const head = useReveal();

  return (
    <Section id="voice" ground="brand">
      {/*
        The tone words ARE the headline.

        A tone-of-voice section that describes the voice in a paragraph is
        arguing for it; one that IS the voice demonstrates it. So the brand's
        own words are set at statement size and everything else supports them.
      */}
      <div {...head}>
        <span className="bi-eyebrow">How this brand sounds</span>
        {/*
          The tone alone, never tone plus personality.
          
          A brand's recorded tone is often already a phrase — "bold, playful and
          intentionally premium" — and appending its personality traits to that
          produced "…premium and bold, playful." The traits have their own
          section; saying them twice reads as a bug, because it is one.
        */}
        {tone ? (
          <h2 className="bi-statement bi-voice-lead">
            The voice is <span className="bi-voice-word">{tone}</span>.
          </h2>
        ) : (
          <h2 className="bi-statement bi-voice-lead">How this brand sounds</h2>
        )}
      </div>

      {examples.length > 0 && (
        <div className="bi-voice-examples">
          {examples.map((ex, i) => (
            <VoiceExample key={`${ex.context}-${i}`} example={ex} delay={i * 90} />
          ))}
        </div>
      )}

      {(doList.length > 0 || dontList.length > 0) && (
        <div className="bi-voice-rules">
          {/* Paired, so the rule and its failure mode are read together. */}
          <VoiceList caption="Always" items={doList} />
          <VoiceList caption="Never" items={dontList} muted />
        </div>
      )}
    </Section>
  );
}

function VoiceExample({
  example,
  delay,
}: {
  example: { context: string; text: string };
  delay: number;
}) {
  const reveal = useReveal({ delay });
  return (
    <figure className="bi-voice-example" {...reveal}>
      {/* Uppercase belongs to the things the brand says out loud — never to a
          label. This is the one place the page shouts. */}
      <blockquote className="bi-subhead bi-caps">{example.text}</blockquote>
      {example.context && <figcaption className="bi-quiet">{example.context}</figcaption>}
    </figure>
  );
}

function VoiceList({
  caption,
  items,
  muted,
}: {
  caption: string;
  items: string[];
  muted?: boolean;
}) {
  const reveal = useReveal();
  if (items.length === 0) return null;
  return (
    <div className="bi-voice-list" data-muted={muted ? '' : undefined} {...reveal}>
      <span className="bi-quiet">{caption}</span>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function Photography({ model }: { model: IdentityModel }) {
  return (
    <Section id="photography">
      <SplitHeader
        eyebrow="How this brand looks"
        title="Photography"
        body="The imagery this brand has published. Use these, or shoot to match them."
      />
      <div className="bi-photo-grid">
        {model.photography.images.map((image, i) => (
          <PhotoTile key={image.id} image={image} brandName={model.name} delay={i * 60} />
        ))}
      </div>
    </Section>
  );
}

function PhotoTile({
  image,
  brandName,
  delay,
}: {
  image: IdentityImage;
  brandName: string;
  delay: number;
}) {
  const reveal = useReveal({ delay });
  const grab = async () => {
    const blob = await fetchAsBlob(image.url);
    if (blob) downloadBlob(blob, `${slugify(brandName)}-${slugify(image.name)}`);
  };
  return (
    <figure className="bi-photo" {...reveal}>
      <img src={image.url} alt={image.name} loading="lazy" />
      <button type="button" className="bi-photo-grab" onClick={() => void grab()} aria-label={`Download ${image.name}`}>
        ⤓
      </button>
    </figure>
  );
}

export function Assets({ model }: { model: IdentityModel }) {
  return (
    <Section id="assets" ground="panel">
      <SplitHeader
        eyebrow="Everything else"
        title="Brand assets"
        body="The material this brand keeps, grouped the way it was filed."
      />
      {model.assets.groups.map((group, gi) => (
        <div className="bi-asset-group" key={group.name}>
          <h3 className="bi-card-title">{group.name}</h3>
          <div className="bi-asset-grid">
            {group.items.map((item, i) => (
              <AssetTile
                key={item.id}
                item={item}
                brandName={model.name}
                delay={(gi * 3 + i) * 40}
              />
            ))}
          </div>
        </div>
      ))}
    </Section>
  );
}

function AssetTile({
  item,
  brandName,
  delay,
}: {
  item: IdentityImage;
  brandName: string;
  delay: number;
}) {
  const reveal = useReveal({ delay });
  const grab = async () => {
    const blob = await fetchAsBlob(item.url);
    if (blob) downloadBlob(blob, `${slugify(brandName)}-${slugify(item.name)}`);
  };
  return (
    <button type="button" className="bi-asset" onClick={() => void grab()} title={`Download ${item.name}`} {...reveal}>
      <img src={item.url} alt={item.name} loading="lazy" />
      <span className="bi-asset-name">{item.name}</span>
    </button>
  );
}

export { SocialApplications };

export function Downloads({ model }: { model: IdentityModel }) {
  const head = useReveal();
  return (
    <Section id="downloads">
      <SplitHeader
        eyebrow="Take it with you"
        title="Downloads"
        body="Everything above, in one file — or grab any single piece from the section it belongs to."
      />
      <div className="bi-download-row" {...head}>
        <DownloadPill onClick={() => void downloadCompleteIdentity(model)}>
          Download complete identity
        </DownloadPill>
        {model.logo.present && (
          <DownloadPill ghost onClick={() => void downloadAllLogos(model)}>
            Logos
          </DownloadPill>
        )}
        {model.colour.present && (
          <DownloadPill ghost onClick={() => void downloadAllColours(model)}>
            Palette
          </DownloadPill>
        )}
      </div>
    </Section>
  );
}

export function Closing({ model }: { model: IdentityModel }) {
  const reveal = useReveal();
  return (
    <Section id="closing" ground="brand">
      <div className="bi-closing" {...reveal}>
        {model.hero.logo && (
          <img className="bi-closing-mark" src={model.hero.logo.url} alt="" />
        )}
        {/* The brand's own words, or just its name. Never a slogan we wrote. */}
        <p className="bi-statement">{model.closing.statement ?? model.name}</p>
      </div>
    </Section>
  );
}
