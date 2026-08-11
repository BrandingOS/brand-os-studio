import React from 'react';
import { CheckIcon } from './icons';

/** Toggle, checkbox, radio and segmented control — the selection controls. */

export interface DsSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function DsSwitch({ checked, onChange, label, disabled }: DsSwitchProps) {
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={['ds-switch', checked ? 'ds-switch--on' : ''].filter(Boolean).join(' ')}
      onClick={() => onChange(!checked)}
    />
  );
  if (!label) return control;
  return (
    <span className="ds-control-row" onClick={() => !disabled && onChange(!checked)}>
      {control}
      <span style={{ color: checked ? undefined : 'var(--ds-text-secondary)' }}>{label}</span>
    </span>
  );
}

export interface DsCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function DsCheckbox({ checked, onChange, label, disabled }: DsCheckboxProps) {
  const control = (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={['ds-checkbox', checked ? 'ds-checkbox--checked' : ''].filter(Boolean).join(' ')}
      onClick={() => onChange(!checked)}
    >
      {checked && <CheckIcon size={11} />}
    </button>
  );
  if (!label) return control;
  return (
    <span className="ds-control-row" onClick={() => !disabled && onChange(!checked)}>
      {control}
      <span>{label}</span>
    </span>
  );
}

export interface DsRadioProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
  disabled?: boolean;
}

export function DsRadio({ checked, onChange, label, disabled }: DsRadioProps) {
  const control = (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={['ds-radio', checked ? 'ds-radio--checked' : ''].filter(Boolean).join(' ')}
      onClick={onChange}
    />
  );
  if (!label) return control;
  return (
    <span className="ds-control-row" onClick={() => !disabled && onChange()}>
      {control}
      <span style={{ color: checked ? undefined : 'var(--ds-text-secondary)' }}>{label}</span>
    </span>
  );
}

export interface DsSegmentedProps {
  options: { value: string; label: React.ReactNode }[];
  value: string;
  onChange: (value: string) => void;
  'aria-label'?: string;
}

export function DsSegmented({ options, value, onChange, 'aria-label': ariaLabel }: DsSegmentedProps) {
  return (
    <div className="ds-segmented" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          role="radio"
          aria-checked={option.value === value}
          className={[
            'ds-segmented-option',
            option.value === value ? 'ds-segmented-option--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
