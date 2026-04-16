import React, { createContext, useCallback, useState } from 'react';
import { BrandSettingsDialog } from './BrandSettingsDialog';

export type BrandSettingsTab =
  | 'general'
  | 'colors'
  | 'typography'
  | 'voice'
  | 'strategy'
  | 'sharing';

export interface BrandSettingsContextValue {
  open: boolean;
  activeTab: BrandSettingsTab;
  openSettings: () => void;
  openSettingsTab: (tab: BrandSettingsTab) => void;
  close: () => void;
}

export const BrandSettingsContext =
  createContext<BrandSettingsContextValue | null>(null);

export function BrandSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BrandSettingsTab>('general');

  const openSettings = useCallback(() => {
    setOpen(true);
  }, []);

  const openSettingsTab = useCallback((tab: BrandSettingsTab) => {
    setActiveTab(tab);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <BrandSettingsContext.Provider
      value={{ open, activeTab, openSettings, openSettingsTab, close }}
    >
      {children}
      <BrandSettingsDialog
        open={open}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenChange={setOpen}
      />
    </BrandSettingsContext.Provider>
  );
}
