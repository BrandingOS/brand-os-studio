// A PERSON's face. `BrandAvatar` is for brands and would draw a brand's logo or letter
// here; people get their own initials, from the same helper the account page uses.
// Never the 9-dot mark, and never a letter B.
import { initialsFromName } from '@/shared/utils/initials';

export function PersonAvatar({
  name,
  url,
  size = 36,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  return (
    <span className="mem-avatar" style={{ width: size, height: size }} aria-hidden>
      {url ? <img src={url} alt="" /> : <span>{initialsFromName(name)}</span>}
    </span>
  );
}
