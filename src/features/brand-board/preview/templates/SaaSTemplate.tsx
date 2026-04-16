import React from 'react';

interface TemplateProps {
  brandName: string;
}

export function SaaSTemplate({ brandName }: TemplateProps) {
  return (
    <div style={{ backgroundColor: 'var(--bb-bg)', color: 'var(--bb-fg)' }}>
      {/* ─── Navbar ─── */}
      <nav style={{ backgroundColor: 'var(--bb-bg)', borderBottom: '1px solid var(--bb-neutral-200)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span
            style={{
              fontFamily: 'var(--bb-font-heading)',
              color: 'var(--bb-fg)',
              fontWeight: 700,
              fontSize: '1.25rem',
            }}
          >
            {brandName}
          </span>
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'Pricing', 'About', 'Blog'].map((link) => (
              <span
                key={link}
                style={{
                  fontFamily: 'var(--bb-font-body)',
                  color: 'var(--bb-neutral-500)',
                  fontSize: '0.875rem',
                }}
              >
                {link}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              style={{
                fontFamily: 'var(--bb-font-body)',
                color: 'var(--bb-fg)',
                fontSize: '0.875rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Log in
            </button>
            <button
              style={{
                fontFamily: 'var(--bb-font-body)',
                backgroundColor: 'var(--bb-primary)',
                color: '#fff',
                padding: '0.5rem 1.25rem',
                borderRadius: 'var(--bb-radius)',
                fontSize: '0.875rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1
            style={{
              fontFamily: 'var(--bb-font-heading)',
              color: 'var(--bb-fg)',
              fontSize: '3rem',
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: '1.5rem',
            }}
          >
            Build something amazing with confidence
          </h1>
          <p
            style={{
              fontFamily: 'var(--bb-font-body)',
              color: 'var(--bb-neutral-500)',
              fontSize: '1.125rem',
              lineHeight: 1.7,
              marginBottom: '2rem',
            }}
          >
            A powerful platform that helps teams create, collaborate, and ship products faster than
            ever before.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              style={{
                fontFamily: 'var(--bb-font-body)',
                backgroundColor: 'var(--bb-primary)',
                color: '#fff',
                padding: '0.75rem 2rem',
                borderRadius: 'var(--bb-radius)',
                fontSize: '1rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Start Free Trial
            </button>
            <button
              style={{
                fontFamily: 'var(--bb-font-body)',
                backgroundColor: 'transparent',
                color: 'var(--bb-primary)',
                padding: '0.75rem 2rem',
                borderRadius: 'var(--bb-radius)',
                fontSize: '1rem',
                fontWeight: 600,
                border: '2px solid var(--bb-primary)',
                cursor: 'pointer',
              }}
            >
              Watch Demo
            </button>
          </div>
        </div>
        <div
          className="rounded-lg aspect-[4/3]"
          style={{
            backgroundColor: 'var(--bb-neutral-100)',
            border: '1px solid var(--bb-neutral-200)',
            boxShadow: 'var(--bb-shadow)',
            borderRadius: 'var(--bb-radius)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: 'var(--bb-neutral-400)', fontSize: '0.875rem', fontFamily: 'var(--bb-font-body)' }}>
            Product Screenshot
          </span>
        </div>
      </section>

      {/* ─── Logo Bar ─── */}
      <section style={{ backgroundColor: 'var(--bb-neutral-50)', borderTop: '1px solid var(--bb-neutral-200)', borderBottom: '1px solid var(--bb-neutral-200)' }}>
        <div className="max-w-6xl mx-auto px-6 py-10 text-center">
          <p
            style={{
              fontFamily: 'var(--bb-font-body)',
              color: 'var(--bb-neutral-400)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '1.5rem',
            }}
          >
            Trusted by leading companies
          </p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-8 rounded"
                style={{
                  width: 100,
                  backgroundColor: 'var(--bb-neutral-200)',
                  borderRadius: 'var(--bb-radius)',
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2
            style={{
              fontFamily: 'var(--bb-font-heading)',
              color: 'var(--bb-fg)',
              fontSize: '2rem',
              fontWeight: 700,
              marginBottom: '0.75rem',
            }}
          >
            Everything you need to succeed
          </h2>
          <p style={{ fontFamily: 'var(--bb-font-body)', color: 'var(--bb-neutral-500)', fontSize: '1rem' }}>
            Powerful features designed to help your team move faster.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: '\u26A1',
              title: 'Lightning Fast',
              body: 'Optimized for speed at every level. Your team will feel the difference from day one.',
            },
            {
              icon: '\uD83D\uDD12',
              title: 'Secure by Default',
              body: 'Enterprise-grade security built in. SOC 2 compliant with end-to-end encryption.',
            },
            {
              icon: '\uD83D\uDE80',
              title: 'Scale Effortlessly',
              body: 'From startup to enterprise, our infrastructure grows with you automatically.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="p-6"
              style={{
                backgroundColor: 'var(--bb-bg)',
                border: '1px solid var(--bb-neutral-200)',
                borderRadius: 'var(--bb-radius)',
                boxShadow: 'var(--bb-shadow)',
              }}
            >
              <div
                className="w-12 h-12 flex items-center justify-center rounded-full mb-4 text-xl"
                style={{ backgroundColor: 'var(--bb-primary)', color: '#fff' }}
              >
                {feature.icon}
              </div>
              <h3
                style={{
                  fontFamily: 'var(--bb-font-heading)',
                  color: 'var(--bb-fg)',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                }}
              >
                {feature.title}
              </h3>
              <p
                style={{
                  fontFamily: 'var(--bb-font-body)',
                  color: 'var(--bb-neutral-500)',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                }}
              >
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Feature Showcase (alternating) ─── */}
      {[
        {
          title: 'Collaborate in real time',
          body: 'Work together seamlessly with live cursors, instant updates, and built-in commenting. No more version conflicts or waiting for feedback.',
          imageLabel: 'Collaboration Preview',
          reverse: false,
        },
        {
          title: 'Insights that drive decisions',
          body: 'Actionable analytics and dashboards help you understand performance, identify bottlenecks, and make data-driven decisions with confidence.',
          imageLabel: 'Analytics Dashboard',
          reverse: true,
        },
      ].map((item) => (
        <section
          key={item.title}
          className="max-w-6xl mx-auto px-6 py-16"
          style={{ borderTop: '1px solid var(--bb-neutral-100)' }}
        >
          <div className={`grid md:grid-cols-2 gap-12 items-center ${item.reverse ? 'md:[direction:rtl]' : ''}`}>
            <div style={{ direction: 'ltr' }}>
              <h2
                style={{
                  fontFamily: 'var(--bb-font-heading)',
                  color: 'var(--bb-fg)',
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  marginBottom: '1rem',
                }}
              >
                {item.title}
              </h2>
              <p
                style={{
                  fontFamily: 'var(--bb-font-body)',
                  color: 'var(--bb-neutral-500)',
                  fontSize: '1rem',
                  lineHeight: 1.7,
                }}
              >
                {item.body}
              </p>
            </div>
            <div
              className="aspect-[4/3] rounded-lg"
              style={{
                direction: 'ltr',
                backgroundColor: 'var(--bb-neutral-100)',
                border: '1px solid var(--bb-neutral-200)',
                borderRadius: 'var(--bb-radius)',
                boxShadow: 'var(--bb-shadow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: 'var(--bb-neutral-400)', fontSize: '0.875rem', fontFamily: 'var(--bb-font-body)' }}>
                {item.imageLabel}
              </span>
            </div>
          </div>
        </section>
      ))}

      {/* ─── Testimonial ─── */}
      <section
        className="py-20"
        style={{
          backgroundColor: 'var(--bb-secondary)',
          opacity: 0.95,
        }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p
            style={{
              fontFamily: 'var(--bb-font-heading)',
              color: '#fff',
              fontSize: '1.75rem',
              fontStyle: 'italic',
              lineHeight: 1.5,
              marginBottom: '2rem',
            }}
          >
            &ldquo;This platform completely transformed how our team works. We shipped 3x faster in
            the first month.&rdquo;
          </p>
          <div>
            <p
              style={{
                fontFamily: 'var(--bb-font-body)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              Sarah Chen
            </p>
            <p
              style={{
                fontFamily: 'var(--bb-font-body)',
                color: 'rgba(255,255,255,0.75)',
                fontSize: '0.875rem',
              }}
            >
              VP of Engineering, TechCorp
            </p>
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section style={{ backgroundColor: 'var(--bb-primary)' }}>
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2
            style={{
              fontFamily: 'var(--bb-font-heading)',
              color: '#fff',
              fontSize: '2.25rem',
              fontWeight: 700,
              marginBottom: '1rem',
            }}
          >
            Ready to get started?
          </h2>
          <p
            style={{
              fontFamily: 'var(--bb-font-body)',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '1.125rem',
              marginBottom: '2rem',
            }}
          >
            Join thousands of teams already building better products.
          </p>
          <button
            style={{
              fontFamily: 'var(--bb-font-body)',
              backgroundColor: 'transparent',
              color: '#fff',
              padding: '0.75rem 2.5rem',
              borderRadius: 'var(--bb-radius)',
              fontSize: '1rem',
              fontWeight: 600,
              border: '2px solid #fff',
              cursor: 'pointer',
            }}
          >
            Start Your Free Trial
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ backgroundColor: 'var(--bb-neutral-500)', color: 'rgba(255,255,255,0.7)' }}>
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {[
              { heading: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
              { heading: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
              { heading: 'Resources', links: ['Docs', 'API', 'Community', 'Tutorials'] },
              { heading: 'Legal', links: ['Privacy', 'Terms', 'Security', 'GDPR'] },
            ].map((group) => (
              <div key={group.heading}>
                <p
                  style={{
                    fontFamily: 'var(--bb-font-heading)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    marginBottom: '1rem',
                  }}
                >
                  {group.heading}
                </p>
                <ul className="space-y-2">
                  {group.links.map((link) => (
                    <li key={link}>
                      <span
                        style={{
                          fontFamily: 'var(--bb-font-body)',
                          color: 'rgba(255,255,255,0.6)',
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                        }}
                      >
                        {link}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div
            className="flex flex-col md:flex-row items-center justify-between pt-8"
            style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}
          >
            <span
              style={{
                fontFamily: 'var(--bb-font-heading)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '1.125rem',
              }}
            >
              {brandName}
            </span>
            <span
              style={{
                fontFamily: 'var(--bb-font-body)',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '0.8125rem',
                marginTop: '0.5rem',
              }}
            >
              &copy; {new Date().getFullYear()} {brandName}. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
