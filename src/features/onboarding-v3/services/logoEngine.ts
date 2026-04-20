import type { FeelStyle, FeelPalette } from '../types';

export interface LogoBrief {
  brandName: string;
  description: string;
  style: FeelStyle;
  palette: FeelPalette;
  values?: string;
}

export interface LogoResult {
  svg: string;
  layoutId: string;
  fontId: string;
  symbolId?: string;
  mockupSceneUrl?: string;
}

export interface LogoEngine {
  generate(brief: LogoBrief): Promise<LogoResult[]>;
}

export class StubLogoEngine implements LogoEngine {
  async generate(): Promise<LogoResult[]> { return []; }
}

export const logoEngine: LogoEngine = new StubLogoEngine();
