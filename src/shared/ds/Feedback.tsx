import React from 'react';
import { AlertCircleIcon, AlertTriangleIcon, CheckIcon } from './icons';

/** Toast, Banner, Badge, StatusDot — how the product confirms, warns, stops. */

export interface DsToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'success' | 'neutral';
}

/**
 * Charcoal confirmation toast. Success is quiet — a green check inside the
 * charcoal pill, never a green toast.
 */
export function DsToast({ message, actionLabel, onAction, tone = 'success' }: DsToastProps) {
  return (
    <div className="ds-toast" role="status">
      {tone === 'success' && <CheckIcon size={15} className="ds-toast-check" />}
      <span className="ds-toast-message">{message}</span>
      {actionLabel && (
        <button type="button" className="ds-toast-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export interface DsBannerProps {
  tone?: 'warning' | 'danger' | 'success' | 'neutral';
  children: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

/** Inline notice — calm warnings, clear errors, always with a next step. */
export function DsBanner({ tone = 'neutral', children, actionLabel, onAction }: DsBannerProps) {
  const toneClass = tone === 'neutral' ? '' : `ds-banner--${tone}`;
  const Icon =
    tone === 'warning' ? AlertTriangleIcon : tone === 'danger' ? AlertCircleIcon : CheckIcon;
  const iconColor =
    tone === 'warning'
      ? 'var(--ds-warning)'
      : tone === 'danger'
        ? 'var(--ds-danger)'
        : 'var(--ds-success)';
  return (
    <div className={['ds-banner', toneClass].filter(Boolean).join(' ')} role="status">
      <span className="ds-banner-icon" style={{ color: iconColor }}>
        <Icon size={15} />
      </span>
      <span>
        {children}
        {actionLabel && (
          <>
            {' '}
            <span className="ds-banner-action" onClick={onAction} role="button" tabIndex={0}>
              {actionLabel}
            </span>
          </>
        )}
      </span>
    </div>
  );
}

export interface DsBadgeProps {
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
}

/** Status badge: DRAFT · PUBLISHED · NEEDS REVIEW · FAILED. */
export function DsBadge({ tone = 'neutral', children }: DsBadgeProps) {
  const toneClass = tone === 'neutral' ? '' : `ds-badge--${tone}`;
  return <span className={['ds-badge', toneClass].filter(Boolean).join(' ')}>{children}</span>;
}

export interface DsStatusDotProps {
  tone?: 'success' | 'warning' | 'danger' | 'muted';
  /** Status dots always pair with a word — never color alone. */
  label: React.ReactNode;
}

export function DsStatusDot({ tone = 'success', label }: DsStatusDotProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontFamily: 'var(--ds-font)',
        fontSize: '12.5px',
        color: 'var(--ds-text-secondary)',
      }}
    >
      <span className={`ds-status-dot ds-status-dot--${tone}`} />
      {label}
    </span>
  );
}
