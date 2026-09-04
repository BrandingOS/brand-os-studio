/**
 * BrandingOS Design System v1 — public API.
 *
 * Source spec: "BrandingOS Design System.dc.html" (claude.ai/design project,
 * Aug 2026). Tokens live in tokens.css (--ds-*, light + dark maps); every
 * component here reads tokens only. Importing anything from '@/shared/ds'
 * pulls the stylesheets in.
 */

import './tokens.css';
import './components.css';

export { dsLight, dsDark, dsMotion, dsRadius } from './tokens';
export { DsButton, type DsButtonProps } from './Button';
export { DsInput, DsTextArea, DsDropZone, type DsInputProps, type DsTextAreaProps } from './Input';
export { DsSelect, type DsSelectOption, type DsSelectProps } from './Select';
export {
  DsSwitch,
  DsCheckbox,
  DsRadio,
  DsSegmented,
  type DsSwitchProps,
  type DsCheckboxProps,
  type DsRadioProps,
  type DsSegmentedProps,
} from './Toggle';
export {
  DsToast,
  DsBanner,
  DsBadge,
  DsStatusDot,
  type DsToastProps,
  type DsBannerProps,
  type DsBadgeProps,
  type DsStatusDotProps,
} from './Feedback';
export { DsMenu, DsMenuItem, DsMenuDivider, type DsMenuItemProps } from './Menu';
export { DsModal, DsConfirmDialog, type DsModalProps, type DsConfirmDialogProps } from './Modal';
export { DsSlider, type DsSliderProps } from './Slider';
export { DsSkeleton, DsProgress, type DsSkeletonProps, type DsProgressProps } from './Progress';
export { DsTabBar, type DsTabBarProps } from './TabBar';
export { DsRail, type DsRailItem, type DsRailProps } from './Rail';
export { DsAssetRow, type DsAssetRowAction, type DsAssetRowProps } from './AssetRow';
export { DsSwatchRow, type DsSwatchRowSwatch, type DsSwatchRowProps } from './SwatchRow';
export { DsLogoTile, DsLogoTileEmpty, type DsLogoTileProps } from './LogoTile';
export { BrandMark, LoadingPill, RING_CENTRES, CORE_CENTRE, type BrandMarkProps } from './BrandMark';
export { DsEyebrow, DsKbd, DsChip, DsTooltip, DsEmptyState, type DsChipProps } from './primitives';
