/* Insert popover — matches the Chronicle reference:
 *   "Insert widget" → Paragraph · Heading · Image › · Card › · Embed or link › ·
 *                     Mockup › · Quote · Sticky note · Diagrams ›
 *   "Add structure" → Choose template · Blank chapter
 *
 * The popover is wired through callbacks; no Fabric work happens in this
 * file. The host editor (ChronicleEditor) maps each call to the right
 * adapter action.
 */

import {
  ChevronRight,
  FileText,
  Heading1,
  Image as ImageIcon,
  Layers,
  Link2,
  Plus,
  Quote,
  Smartphone,
  StickyNote,
  Table2,
  Workflow,
} from "lucide-react";

export interface InsertMenuActions {
  paragraph: () => void;
  heading: () => void;
  image: () => void;
  card: () => void;
  embed: () => void;
  mockup: () => void;
  quote: () => void;
  stickyNote: () => void;
  diagram: () => void;
  template: () => void;
  blankChapter: () => void;
}

export function InsertMenu({ on }: { on: InsertMenuActions }) {
  return (
    <div style={{ minWidth: 260 }}>
      <div className="ch-popover-label">Insert widget</div>
      <div className="ch-popover-section">
        <Row icon={<FileText size={16} />} label="Paragraph" onClick={on.paragraph} />
        <Row icon={<Heading1 size={16} />} label="Heading" onClick={on.heading} />
        <Row icon={<ImageIcon size={16} />} label="Image" chev onClick={on.image} />
        <Row icon={<Layers size={16} />} label="Card" chev onClick={on.card} />
        <Row icon={<Link2 size={16} />} label="Embed or link" chev onClick={on.embed} />
        <Row icon={<Smartphone size={16} />} label="Mockup" chev onClick={on.mockup} />
        <Row icon={<Quote size={16} />} label="Quote" onClick={on.quote} />
        <Row icon={<StickyNote size={16} />} label="Sticky note" onClick={on.stickyNote} />
        <Row icon={<Workflow size={16} />} label="Diagrams" chev onClick={on.diagram} />
      </div>
      <div className="ch-popover-label">Add structure</div>
      <div className="ch-popover-section">
        <Row icon={<Table2 size={16} />} label="Choose template" onClick={on.template} />
        <Row icon={<Plus size={16} />} label="Blank chapter" onClick={on.blankChapter} />
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  chev,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  chev?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className="ch-popover-row"
      onClick={onClick}
      type="button"
      style={{ width: "100%", textAlign: "left", background: "transparent", border: 0 }}
    >
      <span className="lead">{icon}</span>
      <span className="label">{label}</span>
      {chev ? (
        <span className="chev">
          <ChevronRight size={14} />
        </span>
      ) : null}
    </button>
  );
}
