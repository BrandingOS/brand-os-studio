import React from 'react';

interface TemplateProps {
  brandName: string;
}

export function PortfolioTemplate({ brandName }: TemplateProps) {
  return (
    <div style={{ backgroundColor: 'var(--bb-bg)', color: 'var(--bb-fg)' }}>
      {/* ─── Full-screen Hero ─── */}
      <section
        className="relative flex items-center justify-center"
        style={{
          minHeight: 520,
          background: `linear-gradient(135deg, var(--bb-fg) 0%, var(--bb-neutral-500) 100%)`,
        }}
      >
        <div className="relative z-10 text-center px-6">
          <p
            style={{
              fontFamily: 'var(--bb-font-body)',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              marginBottom: '1.5rem',
            }}
          >
            Creative Studio
          </p>
          <h1
            style={{
              fontFamily: 'var(--bb-font-heading)',
              color: '#fff',
              fontSize: '3.5rem',
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: '1.5rem',
            }}
          >
            {brandName}
          </h1>
          <p
            style={{
              fontFamily: 'var(--bb-font-body)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '1.125rem',
              maxWidth: 480,
              margin: '0 auto 2rem',
              lineHeight: 1.6,
            }}
          >
            We craft digital experiences that inspire, engage, and deliver results.
          </p>
          <button
            style={{
              fontFamily: 'var(--bb-font-body)',
              backgroundColor: 'var(--bb-primary)',
              color: '#fff',
              padding: '0.75rem 2rem',
              borderRadius: 'var(--bb-radius)',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            View Our Work
          </button>
        </div>
      </section>

      {/* ─── Selected Work ─── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2
          style={{
            fontFamily: 'var(--bb-font-heading)',
            color: 'var(--bb-fg)',
            fontSize: '2rem',
            fontWeight: 700,
            marginBottom: '3rem',
          }}
        >
          Selected Work
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: 'Meridian Rebrand', category: 'Branding' },
            { title: 'Nova App Design', category: 'UI/UX' },
            { title: 'Pulse Campaign', category: 'Marketing' },
          ].map((project) => (
            <div
              key={project.title}
              className="group overflow-hidden"
              style={{
                borderRadius: 'var(--bb-radius)',
                boxShadow: 'var(--bb-shadow)',
                border: '1px solid var(--bb-neutral-200)',
              }}
            >
              <div
                className="aspect-[4/3]"
                style={{
                  backgroundColor: 'var(--bb-neutral-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    color: 'var(--bb-neutral-400)',
                    fontSize: '0.8125rem',
                    fontFamily: 'var(--bb-font-body)',
                  }}
                >
                  Project Image
                </span>
              </div>
              <div className="p-5" style={{ backgroundColor: 'var(--bb-bg)' }}>
                <p
                  style={{
                    fontFamily: 'var(--bb-font-body)',
                    color: 'var(--bb-primary)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.375rem',
                  }}
                >
                  {project.category}
                </p>
                <h3
                  style={{
                    fontFamily: 'var(--bb-font-heading)',
                    color: 'var(--bb-fg)',
                    fontSize: '1.125rem',
                    fontWeight: 600,
                  }}
                >
                  {project.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── About Section ─── */}
      <section
        style={{
          backgroundColor: 'var(--bb-neutral-50)',
          borderTop: '1px solid var(--bb-neutral-200)',
          borderBottom: '1px solid var(--bb-neutral-200)',
        }}
      >
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2
            style={{
              fontFamily: 'var(--bb-font-heading)',
              color: 'var(--bb-fg)',
              fontSize: '2.5rem',
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: '1.5rem',
            }}
          >
            Design is not just what it looks like. Design is how it works.
          </h2>
          <p
            style={{
              fontFamily: 'var(--bb-font-body)',
              color: 'var(--bb-neutral-500)',
              fontSize: '1rem',
              lineHeight: 1.7,
              maxWidth: 600,
              margin: '0 auto',
            }}
          >
            We are a team of designers, developers, and strategists who believe in the power of
            thoughtful design. Every project starts with understanding the problem and ends with a
            solution that delights.
          </p>
        </div>
      </section>

      {/* ─── Contact CTA ─── */}
      <section style={{ backgroundColor: 'var(--bb-primary)' }}>
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2
            style={{
              fontFamily: 'var(--bb-font-heading)',
              color: '#fff',
              fontSize: '2rem',
              fontWeight: 700,
              marginBottom: '1rem',
            }}
          >
            Have a project in mind?
          </h2>
          <p
            style={{
              fontFamily: 'var(--bb-font-body)',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '1rem',
              marginBottom: '2rem',
            }}
          >
            Let&apos;s create something extraordinary together.
          </p>
          <button
            style={{
              fontFamily: 'var(--bb-font-body)',
              backgroundColor: '#fff',
              color: 'var(--bb-primary)',
              padding: '0.75rem 2.5rem',
              borderRadius: 'var(--bb-radius)',
              fontSize: '1rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Get in Touch
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ backgroundColor: 'var(--bb-fg)', color: 'rgba(255,255,255,0.5)' }}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span
            style={{
              fontFamily: 'var(--bb-font-heading)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
            }}
          >
            {brandName}
          </span>
          <span style={{ fontFamily: 'var(--bb-font-body)', fontSize: '0.8125rem' }}>
            &copy; {new Date().getFullYear()} {brandName}. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
