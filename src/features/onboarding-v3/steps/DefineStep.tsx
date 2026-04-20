import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useOnboardingStore } from '../store/onboardingStore';
import { SparkleAssist } from '../components/SparkleAssist';

interface Props { onNext(): void; onBack?(): void }

export function DefineStep({ onNext, onBack }: Props) {
  const define = useOnboardingStore(s => s.define);
  const update = useOnboardingStore(s => s.updateDefine);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const coreValid = define.name.trim().length > 0 && define.description.trim().length > 0;

  const input = 'w-full h-[44px] rounded-xl border border-cosmos-border bg-cosmos-surface px-3.5 text-[14px] placeholder:text-cosmos-muted focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-ring)]';
  const textarea = 'w-full min-h-[96px] rounded-xl border border-cosmos-border bg-cosmos-surface p-3.5 text-[14px] placeholder:text-cosmos-muted focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-ring)]';
  const label = 'text-[11px] font-medium uppercase tracking-wider text-cosmos-muted';

  return (
    <div className="flex flex-col gap-8 max-w-[620px] mx-auto">
      <section className="flex flex-col gap-4">
        <h2 className={label}>Core</h2>
        <div>
          <input
            type="text"
            className={input}
            placeholder="Brand name"
            value={define.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>
        <div className="relative">
          <textarea
            className={textarea}
            placeholder="Describe your brand in a sentence or two"
            value={define.description}
            onChange={(e) => update({ description: e.target.value })}
          />
          <SparkleAssist
            brandName={define.name}
            onText={(t) => update({ description: t })}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className={label}>Context <span className="text-cosmos-muted normal-case">(optional)</span></h2>
        <input type="text" className={input} placeholder="Target audience"
          value={define.audience} onChange={(e) => update({ audience: e.target.value })} />
        <input type="text" className={input} placeholder="Market or competitors"
          value={define.market} onChange={(e) => update({ market: e.target.value })} />
      </section>

      <section className="flex flex-col gap-4">
        <button type="button" onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-cosmos-muted hover:text-cosmos-primary">
          {showAdvanced ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
          Advanced
        </button>
        {showAdvanced && (
          <>
            <textarea className={textarea} placeholder="Goals"
              value={define.goals} onChange={(e) => update({ goals: e.target.value })} />
            <textarea className={textarea} placeholder="Values"
              value={define.values} onChange={(e) => update({ values: e.target.value })} />
          </>
        )}
      </section>

      <footer className="flex items-center justify-between pt-4">
        <button type="button" onClick={onBack} disabled={!onBack}
          className="text-[13px] text-cosmos-secondary disabled:opacity-30">Previous</button>
        <button type="button" onClick={onNext} disabled={!coreValid}
          className="rounded-full h-10 px-5 bg-cosmos-accent text-cosmos-accent-contrast text-[13px] font-medium disabled:opacity-40">
          Next →
        </button>
      </footer>
    </div>
  );
}
