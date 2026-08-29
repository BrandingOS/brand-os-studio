import { useCallback } from 'react';
import { toast } from 'sonner';
import { DsBadge, DsButton, DsCheckbox, DsSegmented, DsSwitch } from '@/shared/ds';
import { useUiPreference, useSetUiPreference, type UiPreference } from '@/shared/hooks/useUiPreference';
import { useWorkspaceTheme } from '@/shared/theme/useWorkspaceTheme';
import { useGeneratePrefs } from '@/features/editor/shell/v2/panels/generate/generatePrefs';
import { useService } from '@/core';
import { SERVICE_KEYS, type IUserPreferencesService } from '@/core/types/services';
import {
  SettingsRow,
  SettingsSection,
} from '@/features/settings/components/SettingsSection';
import { SettingsSections } from '@/features/settings/components/SettingsSections';

const BRAND_INCLUSIONS = [
  { key: 'logo', label: 'Logo' },
  { key: 'text', label: 'Text' },
  { key: 'colours', label: 'Colours' },
  { key: 'identity', label: 'Brand identity' },
] as const;

/**
 * Preferences — how the product behaves.
 *
 * Each control writes to the store that already owns it, and the preference
 * bridge mirrors that through to `public.user_preferences` so it follows the
 * user to another device. Nothing here reaches into localStorage directly.
 */
export default function PreferencesSettingsPage() {
  const uiPreference = useUiPreference();
  const setUiPreference = useSetUiPreference();
  const { theme, setTheme } = useWorkspaceTheme();
  const generate = useGeneratePrefs();
  const prefs = useService<IUserPreferencesService>(SERVICE_KEYS.USER_PREFERENCES);

  const onPickUi = useCallback(
    (nextValue: UiPreference) => {
      if (nextValue === uiPreference) return;
      setUiPreference(nextValue);
      toast.success(nextValue === 'studio' ? 'Switched to Studio.' : 'Switched to Classic.', {
        description:
          nextValue === 'studio'
            ? 'Brand entry points will open the Studio experience.'
            : 'Brand entry points will open the Classic experience.',
      });
    },
    [uiPreference, setUiPreference],
  );

  const onResetHints = useCallback(async () => {
    await prefs.set({ dismissed: { featuresSeen: {}, hints: {}, tours: {} } });
    toast.success('Hints and tours reset.', {
      description: 'First-run nudges will appear again.',
    });
  }, [prefs]);

  const synced = prefs.isServerBacked();

  return (
    <SettingsSections>
      <SettingsSection
        title="Appearance"
        description="Applies to every BrandOS surface — the workspace, the brand pages and the editor."
        action={
          <DsBadge tone={synced ? 'success' : 'neutral'}>
            {synced ? 'Synced to your account' : 'This device only'}
          </DsBadge>
        }
      >
        <SettingsRow label="Theme" hint="Light or dark.">
          <DsSegmented
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            value={theme}
            onChange={(value) => setTheme(value as 'light' | 'dark')}
            aria-label="Theme"
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Interface"
        description="Which experience opens when you enter a brand. You can switch back any time."
      >
        <SettingsRow stacked>
          <div className="settings-options">
            <button
              type="button"
              className="settings-option"
              aria-pressed={uiPreference === 'studio'}
              onClick={() => onPickUi('studio')}
            >
              <div className="settings-option-head">
                <span className="settings-option-name">Studio</span>
                {uiPreference === 'studio' && <DsBadge tone="success">Active</DsBadge>}
              </div>
              <p className="settings-option-desc">
                Minimal, monochrome chrome with a top segmented nav. Setup ·
                Brand Kit · Guideline · Design · Tools.
              </p>
            </button>
            <button
              type="button"
              className="settings-option"
              aria-pressed={uiPreference === 'classic'}
              onClick={() => onPickUi('classic')}
            >
              <div className="settings-option-head">
                <span className="settings-option-name">Classic</span>
                {uiPreference === 'classic' && <DsBadge tone="success">Active</DsBadge>}
              </div>
              <p className="settings-option-desc">
                Denser left-rail layout. Overview · Identity · Templates ·
                Design · Content · Folders · Share.
              </p>
            </button>
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="AI generation"
        description="The defaults the editor's Generate panel opens with."
      >
        <SettingsRow
          label="Brand includes"
          hint="Which parts of the brand may appear in a generated image. Everything is included by default; each can be left out on its own."
        >
          <div className="flex flex-wrap gap-3">
            {BRAND_INCLUSIONS.map(({ key, label }) => (
              <DsCheckbox
                key={key}
                label={label}
                checked={generate.include[key]}
                onChange={(checked) => generate.setInclude({ [key]: checked })}
              />
            ))}
          </div>
        </SettingsRow>
        <SettingsRow label="Images per generation" hint="Between one and four.">
          <DsSegmented
            options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))}
            value={String(generate.count)}
            onChange={(value) => generate.setCount(Number(value))}
            aria-label="Images per generation"
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Hints and tours"
        description="BrandOS shows a first-run nudge once per feature and then remembers."
      >
        <SettingsRow
          label="Show them all again"
          hint="Clears what you have dismissed so far."
        >
          <DsButton tone="secondary" onClick={onResetHints}>
            Reset
          </DsButton>
        </SettingsRow>
      </SettingsSection>
    </SettingsSections>
  );
}
