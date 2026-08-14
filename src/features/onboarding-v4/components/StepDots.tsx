interface Props {
  current: 1 | 2;
}

const STEPS: Array<{ num: number; label: string }> = [
  { num: 1, label: 'Define' },
  { num: 2, label: 'Feel' },
];

export function StepDots({ current }: Props) {
  return (
    <div className="steps" aria-label="Progress">
      {STEPS.map((s, i) => {
        const state = s.num === current ? 'is-active' : s.num < current ? 'is-done' : '';
        return (
          <span key={s.num} style={{ display: 'contents' }}>
            <div className={`step-dot ${state}`}>
              <span className="step-num">{s.num}</span>
              <span>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <span className="step-line" />}
          </span>
        );
      })}
    </div>
  );
}
