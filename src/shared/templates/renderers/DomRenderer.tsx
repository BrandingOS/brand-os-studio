/**
 * DOM Renderer — renders a ResolvedTemplate as React JSX.
 *
 * Used for template previews, gallery cards, and html2canvas export.
 * Each element type maps to a positioned React component.
 */
import type {
  ResolvedTemplate,
  TemplatePage,
  TemplateElement,
  TextElement,
  ShapeElement,
  ImageElement,
  LogoElement,
  DividerElement,
  TemplateBackground,
} from '../types';

interface DomRendererProps {
  template: ResolvedTemplate;
  pageIndex?: number;
  className?: string;
  scale?: number;
}

/**
 * Render a resolved template page as positioned HTML elements.
 * All positions/sizes are percentages — the design scales to any container.
 */
export function DomRenderer({ template, pageIndex = 0, className, scale = 1 }: DomRendererProps) {
  const page = template.pages[pageIndex];
  if (!page) return null;

  const { width, height } = template.canvas;
  const aspect = width / height;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${aspect}`,
        overflow: 'hidden',
        borderRadius: 4,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
      }}
    >
      <PageBackground bg={page.background} />
      {page.elements.map((el) => (
        <ElementRenderer key={el.id} element={el} />
      ))}
    </div>
  );
}

function PageBackground({ bg }: { bg: TemplateBackground }) {
  let style: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    opacity: bg.opacity ?? 1,
  };

  if (bg.type === 'solid') {
    style.backgroundColor = bg.value;
  } else if (bg.type === 'gradient') {
    style.background = `linear-gradient(${bg.gradientAngle ?? 135}deg, ${bg.value}, ${bg.gradientTo || bg.value})`;
  } else if (bg.type === 'image') {
    style.backgroundImage = `url(${bg.value})`;
    style.backgroundSize = 'cover';
    style.backgroundPosition = 'center';
  }

  return <div style={style} />;
}

function ElementRenderer({ element }: { element: TemplateElement }) {
  const base: React.CSSProperties = {
    position: 'absolute',
    left: `${element.position.x}%`,
    top: `${element.position.y}%`,
    width: `${element.size.width}%`,
    height: `${element.size.height}%`,
    opacity: element.opacity ?? 1,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
  };

  switch (element.type) {
    case 'text':
      return <TextRenderer el={element} style={base} />;
    case 'shape':
      return <ShapeRenderer el={element} style={base} />;
    case 'image':
      return <ImageRenderer el={element} style={base} />;
    case 'logo':
      return <LogoRenderer el={element} style={base} />;
    case 'divider':
      return <DividerRenderer el={element} style={base} />;
    default:
      return null;
  }
}

function TextRenderer({ el, style }: { el: TextElement; style: React.CSSProperties }) {
  return (
    <div
      style={{
        ...style,
        fontFamily: el.style.fontFamily,
        fontSize: el.style.fontSize,
        fontWeight: el.style.fontWeight || 400,
        color: el.style.color,
        textAlign: el.style.textAlign || 'left',
        lineHeight: el.style.lineHeight || 1.3,
        letterSpacing: el.style.letterSpacing ? `${el.style.letterSpacing}px` : undefined,
        textTransform: el.style.textTransform || 'none',
        display: 'flex',
        alignItems: 'flex-start',
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {el.content}
    </div>
  );
}

function ShapeRenderer({ el, style }: { el: ShapeElement; style: React.CSSProperties }) {
  return (
    <div
      style={{
        ...style,
        backgroundColor: el.style.fill,
        border: el.style.stroke ? `${el.style.strokeWidth || 1}px solid ${el.style.stroke}` : undefined,
        borderRadius: el.shape === 'circle' ? '50%' : el.style.borderRadius || 0,
        opacity: el.style.opacity ?? (style.opacity ?? 1),
      }}
    />
  );
}

function ImageRenderer({ el, style }: { el: ImageElement; style: React.CSSProperties }) {
  if (!el.src) return <div style={{ ...style, backgroundColor: '#f0f0f0' }} />;
  return (
    <img
      src={el.src}
      alt=""
      style={{
        ...style,
        objectFit: el.fit || 'contain',
      }}
    />
  );
}

function LogoRenderer({ el, style }: { el: LogoElement; style: React.CSSProperties }) {
  if (!el.src) {
    // Monogram fallback
    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '50%',
          color: '#666',
        }}
      >
        Logo
      </div>
    );
  }
  return (
    <img
      src={el.src}
      alt="Logo"
      style={{
        ...style,
        objectFit: 'contain',
      }}
    />
  );
}

function DividerRenderer({ el, style }: { el: DividerElement; style: React.CSSProperties }) {
  return (
    <div
      style={{
        ...style,
        backgroundColor: el.style.color,
        height: el.style.thickness || 1,
      }}
    />
  );
}
