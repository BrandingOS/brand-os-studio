import React from 'react';

interface TemplateProps {
  brandName: string;
}

export function EcommerceTemplate({ brandName }: TemplateProps) {
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
            {['Shop', 'Collections', 'About', 'Contact'].map((link) => (
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
          <div className="flex items-center gap-4">
            <span style={{ color: 'var(--bb-fg)', fontSize: '0.875rem', fontFamily: 'var(--bb-font-body)' }}>
              Cart (0)
            </span>
          </div>
        </div>
      </nav>

      {/* ─── Product Hero ─── */}
      <section className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-10 items-start">
        {/* Image placeholder */}
        <div
          className="aspect-square"
          style={{
            backgroundColor: 'var(--bb-neutral-100)',
            border: '1px solid var(--bb-neutral-200)',
            borderRadius: 'var(--bb-radius)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              color: 'var(--bb-neutral-400)',
              fontSize: '0.875rem',
              fontFamily: 'var(--bb-font-body)',
            }}
          >
            Product Image
          </span>
        </div>

        {/* Product details */}
        <div>
          <p
            style={{
              fontFamily: 'var(--bb-font-body)',
              color: 'var(--bb-primary)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '0.5rem',
            }}
          >
            New Arrival
          </p>
          <h1
            style={{
              fontFamily: 'var(--bb-font-heading)',
              color: 'var(--bb-fg)',
              fontSize: '2rem',
              fontWeight: 700,
              marginBottom: '0.75rem',
            }}
          >
            Premium Essential Tee
          </h1>
          <p
            style={{
              fontFamily: 'var(--bb-font-heading)',
              color: 'var(--bb-fg)',
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
            }}
          >
            $48.00
          </p>
          <p
            style={{
              fontFamily: 'var(--bb-font-body)',
              color: 'var(--bb-neutral-500)',
              fontSize: '0.9375rem',
              lineHeight: 1.7,
              marginBottom: '1.5rem',
            }}
          >
            Crafted from 100% organic cotton with a relaxed fit. This everyday essential features a
            garment-dyed finish for a perfectly lived-in look from day one.
          </p>

          {/* Color swatches */}
          <div className="mb-5">
            <p
              style={{
                fontFamily: 'var(--bb-font-body)',
                color: 'var(--bb-fg)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
              }}
            >
              Color
            </p>
            <div className="flex gap-2">
              {['var(--bb-fg)', 'var(--bb-neutral-300)', 'var(--bb-primary)', 'var(--bb-accent)'].map(
                (c, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full"
                    style={{
                      backgroundColor: c,
                      border: i === 0 ? '2px solid var(--bb-primary)' : '1px solid var(--bb-neutral-200)',
                    }}
                  />
                ),
              )}
            </div>
          </div>

          {/* Size selector */}
          <div className="mb-6">
            <p
              style={{
                fontFamily: 'var(--bb-font-body)',
                color: 'var(--bb-fg)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
              }}
            >
              Size
            </p>
            <div className="flex gap-2">
              {['XS', 'S', 'M', 'L', 'XL'].map((size, i) => (
                <div
                  key={size}
                  className="w-10 h-10 flex items-center justify-center text-sm"
                  style={{
                    fontFamily: 'var(--bb-font-body)',
                    borderRadius: 'var(--bb-radius)',
                    border: i === 2 ? '2px solid var(--bb-primary)' : '1px solid var(--bb-neutral-200)',
                    color: i === 2 ? 'var(--bb-primary)' : 'var(--bb-neutral-500)',
                    fontWeight: i === 2 ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {size}
                </div>
              ))}
            </div>
          </div>

          <button
            style={{
              fontFamily: 'var(--bb-font-body)',
              backgroundColor: 'var(--bb-primary)',
              color: '#fff',
              padding: '0.875rem 0',
              borderRadius: 'var(--bb-radius)',
              fontSize: '1rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Add to Cart
          </button>
        </div>
      </section>

      {/* ─── Feature Highlights Row ─── */}
      <section
        style={{
          backgroundColor: 'var(--bb-neutral-50)',
          borderTop: '1px solid var(--bb-neutral-200)',
          borderBottom: '1px solid var(--bb-neutral-200)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: '\uD83D\uDE9A', label: 'Free Shipping' },
            { icon: '\uD83D\uDD04', label: '30-Day Returns' },
            { icon: '\uD83C\uDF3F', label: 'Sustainable' },
            { icon: '\u2B50', label: '5-Star Rated' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div
                className="w-10 h-10 flex items-center justify-center rounded-full text-lg"
                style={{ backgroundColor: 'var(--bb-primary)', color: '#fff' }}
              >
                {item.icon}
              </div>
              <span
                style={{
                  fontFamily: 'var(--bb-font-body)',
                  color: 'var(--bb-fg)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── You Might Also Like ─── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2
          style={{
            fontFamily: 'var(--bb-font-heading)',
            color: 'var(--bb-fg)',
            fontSize: '1.5rem',
            fontWeight: 700,
            marginBottom: '2rem',
          }}
        >
          You might also like
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { name: 'Classic Hoodie', price: '$68.00' },
            { name: 'Relaxed Chinos', price: '$72.00' },
            { name: 'Canvas Sneakers', price: '$95.00' },
            { name: 'Weekender Bag', price: '$128.00' },
          ].map((product) => (
            <div key={product.name}>
              <div
                className="aspect-square mb-3"
                style={{
                  backgroundColor: 'var(--bb-neutral-100)',
                  border: '1px solid var(--bb-neutral-200)',
                  borderRadius: 'var(--bb-radius)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    color: 'var(--bb-neutral-400)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--bb-font-body)',
                  }}
                >
                  Image
                </span>
              </div>
              <p
                style={{
                  fontFamily: 'var(--bb-font-body)',
                  color: 'var(--bb-fg)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  marginBottom: '0.25rem',
                }}
              >
                {product.name}
              </p>
              <p
                style={{
                  fontFamily: 'var(--bb-font-body)',
                  color: 'var(--bb-neutral-500)',
                  fontSize: '0.8125rem',
                }}
              >
                {product.price}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Reviews Section ─── */}
      <section
        style={{
          backgroundColor: 'var(--bb-neutral-50)',
          borderTop: '1px solid var(--bb-neutral-200)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2
              style={{
                fontFamily: 'var(--bb-font-heading)',
                color: 'var(--bb-fg)',
                fontSize: '1.5rem',
                fontWeight: 700,
              }}
            >
              Customer Reviews
            </h2>
            <span
              style={{
                fontFamily: 'var(--bb-font-body)',
                color: 'var(--bb-primary)',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Write a review
            </span>
          </div>
          <div className="space-y-6">
            {[
              {
                author: 'Alex M.',
                rating: 5,
                text: 'Best t-shirt I have ever owned. The fabric is incredibly soft and the fit is perfect. Already ordered two more.',
              },
              {
                author: 'Jordan K.',
                rating: 4,
                text: 'Great quality and fast shipping. Runs slightly large so consider sizing down if you want a fitted look.',
              },
              {
                author: 'Taylor R.',
                rating: 5,
                text: 'Love that it is sustainably made. The color has held up beautifully after multiple washes.',
              },
            ].map((review) => (
              <div
                key={review.author}
                className="p-5"
                style={{
                  backgroundColor: 'var(--bb-bg)',
                  border: '1px solid var(--bb-neutral-200)',
                  borderRadius: 'var(--bb-radius)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ color: 'var(--bb-accent)', fontSize: '0.875rem' }}>
                    {'\u2605'.repeat(review.rating)}
                    {'\u2606'.repeat(5 - review.rating)}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--bb-font-body)',
                      color: 'var(--bb-fg)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                    }}
                  >
                    {review.author}
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: 'var(--bb-font-body)',
                    color: 'var(--bb-neutral-500)',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                  }}
                >
                  {review.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ backgroundColor: 'var(--bb-fg)', color: 'rgba(255,255,255,0.6)' }}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {[
              { heading: 'Shop', links: ['New Arrivals', 'Best Sellers', 'Sale', 'Gift Cards'] },
              { heading: 'Help', links: ['FAQ', 'Shipping', 'Returns', 'Contact'] },
              { heading: 'About', links: ['Our Story', 'Sustainability', 'Careers', 'Press'] },
              { heading: 'Follow', links: ['Instagram', 'Twitter', 'Pinterest', 'TikTok'] },
            ].map((group) => (
              <div key={group.heading}>
                <p
                  style={{
                    fontFamily: 'var(--bb-font-heading)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  {group.heading}
                </p>
                <ul className="space-y-1.5">
                  {group.links.map((link) => (
                    <li key={link}>
                      <span
                        style={{
                          fontFamily: 'var(--bb-font-body)',
                          color: 'rgba(255,255,255,0.5)',
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
            className="flex flex-col md:flex-row items-center justify-between pt-6"
            style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
          >
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
            <span
              style={{
                fontFamily: 'var(--bb-font-body)',
                fontSize: '0.75rem',
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
