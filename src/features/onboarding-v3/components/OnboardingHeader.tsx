import { Link } from 'react-router-dom';

interface Props {
  title: string;
  subtitle?: string;
  crossLink: { to: string; label: string };
}

export function OnboardingHeader({ title, subtitle, crossLink }: Props) {
  return (
    <header className="flex items-start justify-between px-6 py-5 border-b border-cosmos-border">
      <div>
        <h1 className="text-[24px] leading-tight font-semibold tracking-[-0.02em] text-cosmos-primary">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[14px] text-cosmos-secondary">{subtitle}</p>
        )}
      </div>
      <Link
        to={crossLink.to}
        className="text-[13px] text-cosmos-secondary hover:text-cosmos-primary underline-offset-4 hover:underline"
      >
        {crossLink.label}
      </Link>
    </header>
  );
}
