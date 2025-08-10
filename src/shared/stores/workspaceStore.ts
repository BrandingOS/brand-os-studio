import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Brand, Design, Asset } from '@/shared/types';

interface WorkspaceState {
  // Current workspace data
  currentBrand: Brand | null;
  currentDesign: Design | null;
  brands: Brand[];
  designs: Design[];
  assets: Asset[];
  
  // UI state
  sidebarCollapsed: boolean;
  activePanel: 'elements' | 'assets' | 'text' | 'uploads' | null;
  selectedElements: string[];
  
  // Loading states
  isLoadingBrands: boolean;
  isLoadingDesigns: boolean;
  isLoadingAssets: boolean;
}

interface WorkspaceActions {
  // Brand actions
  setCurrentBrand: (brand: Brand | null) => void;
  setBrands: (brands: Brand[]) => void;
  addBrand: (brand: Brand) => void;
  updateBrand: (id: string, updates: Partial<Brand>) => void;
  removeBrand: (id: string) => void;
  
  // Design actions
  setCurrentDesign: (design: Design | null) => void;
  setDesigns: (designs: Design[]) => void;
  addDesign: (design: Design) => void;
  updateDesign: (id: string, updates: Partial<Design>) => void;
  removeDesign: (id: string) => void;
  
  // Asset actions
  setAssets: (assets: Asset[]) => void;
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;
  
  // UI actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActivePanel: (panel: WorkspaceState['activePanel']) => void;
  setSelectedElements: (elementIds: string[]) => void;
  addSelectedElement: (elementId: string) => void;
  removeSelectedElement: (elementId: string) => void;
  clearSelection: () => void;
  
  // Loading actions
  setLoadingBrands: (loading: boolean) => void;
  setLoadingDesigns: (loading: boolean) => void;
  setLoadingAssets: (loading: boolean) => void;
}

type WorkspaceStore = WorkspaceState & WorkspaceActions;

export const useWorkspaceStore = create<WorkspaceStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentBrand: null,
      currentDesign: null,
      brands: [],
      designs: [],
      assets: [],
      sidebarCollapsed: false,
      activePanel: null,
      selectedElements: [],
      isLoadingBrands: false,
      isLoadingDesigns: false,
      isLoadingAssets: false,

      // Brand actions
      setCurrentBrand: (brand) => 
        set({ currentBrand: brand }, false, 'workspace/setCurrentBrand'),
      
      setBrands: (brands) => 
        set({ brands }, false, 'workspace/setBrands'),
      
      addBrand: (brand) => 
        set(state => ({ 
          brands: [...state.brands, brand] 
        }), false, 'workspace/addBrand'),
      
      updateBrand: (id, updates) => 
        set(state => ({
          brands: state.brands.map(brand => 
            brand.id === id ? { ...brand, ...updates } : brand
          ),
          currentBrand: state.currentBrand?.id === id 
            ? { ...state.currentBrand, ...updates }
            : state.currentBrand
        }), false, 'workspace/updateBrand'),
      
      removeBrand: (id) => 
        set(state => ({
          brands: state.brands.filter(brand => brand.id !== id),
          currentBrand: state.currentBrand?.id === id ? null : state.currentBrand
        }), false, 'workspace/removeBrand'),

      // Design actions
      setCurrentDesign: (design) => 
        set({ currentDesign: design }, false, 'workspace/setCurrentDesign'),
      
      setDesigns: (designs) => 
        set({ designs }, false, 'workspace/setDesigns'),
      
      addDesign: (design) => 
        set(state => ({ 
          designs: [...state.designs, design] 
        }), false, 'workspace/addDesign'),
      
      updateDesign: (id, updates) => 
        set(state => ({
          designs: state.designs.map(design => 
            design.id === id ? { ...design, ...updates } : design
          ),
          currentDesign: state.currentDesign?.id === id 
            ? { ...state.currentDesign, ...updates }
            : state.currentDesign
        }), false, 'workspace/updateDesign'),
      
      removeDesign: (id) => 
        set(state => ({
          designs: state.designs.filter(design => design.id !== id),
          currentDesign: state.currentDesign?.id === id ? null : state.currentDesign
        }), false, 'workspace/removeDesign'),

      // Asset actions
      setAssets: (assets) => 
        set({ assets }, false, 'workspace/setAssets'),
      
      addAsset: (asset) => 
        set(state => ({ 
          assets: [...state.assets, asset] 
        }), false, 'workspace/addAsset'),
      
      removeAsset: (id) => 
        set(state => ({
          assets: state.assets.filter(asset => asset.id !== id)
        }), false, 'workspace/removeAsset'),

      // UI actions
      toggleSidebar: () => 
        set(state => ({ 
          sidebarCollapsed: !state.sidebarCollapsed 
        }), false, 'workspace/toggleSidebar'),
      
      setSidebarCollapsed: (collapsed) => 
        set({ sidebarCollapsed: collapsed }, false, 'workspace/setSidebarCollapsed'),
      
      setActivePanel: (panel) => 
        set({ activePanel: panel }, false, 'workspace/setActivePanel'),
      
      setSelectedElements: (elementIds) => 
        set({ selectedElements: elementIds }, false, 'workspace/setSelectedElements'),
      
      addSelectedElement: (elementId) => 
        set(state => ({
          selectedElements: state.selectedElements.includes(elementId) 
            ? state.selectedElements 
            : [...state.selectedElements, elementId]
        }), false, 'workspace/addSelectedElement'),
      
      removeSelectedElement: (elementId) => 
        set(state => ({
          selectedElements: state.selectedElements.filter(id => id !== elementId)
        }), false, 'workspace/removeSelectedElement'),
      
      clearSelection: () => 
        set({ selectedElements: [] }, false, 'workspace/clearSelection'),

      // Loading actions
      setLoadingBrands: (loading) => 
        set({ isLoadingBrands: loading }, false, 'workspace/setLoadingBrands'),
      
      setLoadingDesigns: (loading) => 
        set({ isLoadingDesigns: loading }, false, 'workspace/setLoadingDesigns'),
      
      setLoadingAssets: (loading) => 
        set({ isLoadingAssets: loading }, false, 'workspace/setLoadingAssets'),
    }),
    { name: 'WorkspaceStore' }
  )
);