import { TemplateInstanceAdapter } from './TemplateInstanceAdapter';
import { TemplateInstanceCanvas } from './TemplateInstanceCanvas';
import { TemplateInstanceProperties } from './TemplateInstanceProperties';
import type { DesignRenderer } from '../types';

export const templateInstanceRenderer: DesignRenderer = {
  id: 'template-instance',
  createAdapter: () => new TemplateInstanceAdapter(),
  Canvas: TemplateInstanceCanvas,
  Properties: TemplateInstanceProperties,
  supportsLayerEditing: false,
};
