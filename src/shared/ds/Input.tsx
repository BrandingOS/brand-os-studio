import React, { useId } from 'react';
import { AlertCircleIcon } from './icons';

/**
 * One field style per mode: surface, 1px border, 14px radius. Pills are
 * reserved for single-line search-style inputs. Placeholders speak in the
 * product voice.
 */

interface FieldChrome {
  label?: string;
  error?: string;
}

export interface DsInputProps extends React.InputHTMLAttributes<HTMLInputElement>, FieldChrome {
  /** Search-style single-line pill input. */
  pill?: boolean;
}

export const DsInput = React.forwardRef<HTMLInputElement, DsInputProps>(
  function DsInput({ label, error, pill = false, className, id, ...rest }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const classes = [
      'ds-input',
      pill ? 'ds-input--pill' : '',
      error ? 'ds-input--error' : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');
    const input = (
      <input
        ref={ref}
        id={inputId}
        className={classes}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
    );
    if (!label && !error) return input;
    return (
      <div className="ds-field">
        {label && (
          <label className="ds-label" htmlFor={inputId}>
            {label}
          </label>
        )}
        {input}
        {error && (
          <span className="ds-field-error" role="alert">
            <AlertCircleIcon size={12} /> {error}
          </span>
        )}
      </div>
    );
  },
);

export interface DsTextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    FieldChrome {}

export const DsTextArea = React.forwardRef<HTMLTextAreaElement, DsTextAreaProps>(
  function DsTextArea({ label, error, className, id, ...rest }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const classes = ['ds-textarea', error ? 'ds-input--error' : '', className ?? '']
      .filter(Boolean)
      .join(' ');
    return (
      <div className="ds-field">
        {label && (
          <label className="ds-label" htmlFor={inputId}>
            {label}
          </label>
        )}
        <textarea ref={ref} id={inputId} className={classes} aria-invalid={error ? true : undefined} {...rest} />
        {error && (
          <span className="ds-field-error" role="alert">
            <AlertCircleIcon size={12} /> {error}
          </span>
        )}
      </div>
    );
  },
);

/** Dashed drop zone — empty slots and drop zones only. */
export function DsDropZone({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['ds-dropzone', className ?? ''].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}
