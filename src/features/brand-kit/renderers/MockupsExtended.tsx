/**
 * The `mockups` template type — three families, one id space.
 *
 * Signage, Business Card Stack and Device Screen are three separate cards
 * in the kit, but they all render through the SAME template type, so their
 * ids come out of one range and this module is where they are joined:
 *
 *     mockups-ext-21 … -26   Signage           (MockupSignageExtended)
 *     mockups-ext-27 … -32   Business Card Stack (MockupCardStackExtended)
 *     mockups-ext-33 … -38   Device Screen     (MockupDeviceExtended)
 *
 * The ranges start at 21 because `mockups-ext-1 … -20` were the twenty
 * hidden designs this file used to hold — a phone case, a wine bottle, a
 * concert ticket — every one of them painting literals and a hardcoded
 * `#EEECE6` studio. They are archived rather than reused
 * (`curation/mockups.ts`): a template id is a persistence key, and handing
 * `mockups-ext-1` to a different design would repaint a customer's saved
 * work as something they never chose.
 *
 * Dispatch resolves a scene by its `idSuffix` (`sceneAtIndex`), not by its
 * position, which is what lets three modules share one range.
 */
import {
  renderScene,
  templateList,
  type MockupRendererProps,
  type MockupScene,
} from './MockupScene';
import { SIGNAGE_SCENES } from './MockupSignageExtended';
import { CARD_STACK_SCENES } from './MockupCardStackExtended';
import { DEVICE_SCENES } from './MockupDeviceExtended';

/** Every scene the `mockups` type can render, in id order. */
export const MOCKUP_SCENES: ReadonlyArray<MockupScene> = [
  ...SIGNAGE_SCENES,
  ...CARD_STACK_SCENES,
  ...DEVICE_SCENES,
];

export function MockupsExtendedRenderer(props: MockupRendererProps) {
  return <>{renderScene(MOCKUP_SCENES, props)}</>;
}

/** Per-card template lists — each card offers only its own six. */
export const MOCKUP_SIGNAGE_EXTENDED = templateList(SIGNAGE_SCENES);
export const MOCKUP_CARD_STACK_EXTENDED = templateList(CARD_STACK_SCENES);
export const MOCKUP_DEVICE_EXTENDED = templateList(DEVICE_SCENES);

/** The whole `mockups` type, for anything that wants the family at once. */
export const MOCKUPS_EXTENDED = templateList(MOCKUP_SCENES);
