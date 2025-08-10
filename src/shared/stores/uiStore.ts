import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  // Global UI state
  theme: 'light' | 'dark' | 'system';
  sidebarWidth: number;
  panelWidth: number;
  
  // Modals and dialogs
  modals: {
    createBrand: boolean;
    uploadAsset: boolean;
    shareDesign: boolean;
    exportDesign: boolean;
    settings: boolean;
    deleteConfirm: boolean;
  };
  
  // Notifications
  notifications: Notification[];
  
  // Loading states
  globalLoading: boolean;
  
  // Canvas state (for design editor)
  canvasState: {
    zoom: number;
    panX: number;
    panY: number;
    gridVisible: boolean;
    rulersVisible: boolean;
    guidesVisible: boolean;
  };
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: {
    label: string;
    action: () => void;
  }[];
}

interface UIActions {
  // Theme actions
  setTheme: (theme: UIState['theme']) => void;
  
  // Layout actions
  setSidebarWidth: (width: number) => void;
  setPanelWidth: (width: number) => void;
  
  // Modal actions
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
  closeAllModals: () => void;
  
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Loading actions
  setGlobalLoading: (loading: boolean) => void;
  
  // Canvas actions
  setCanvasZoom: (zoom: number) => void;
  setCanvasPan: (panX: number, panY: number) => void;
  toggleGrid: () => void;
  toggleRulers: () => void;
  toggleGuides: () => void;
  resetCanvas: () => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      theme: 'system',
      sidebarWidth: 280,
      panelWidth: 320,
      modals: {
        createBrand: false,
        uploadAsset: false,
        shareDesign: false,
        exportDesign: false,
        settings: false,
        deleteConfirm: false,
      },
      notifications: [],
      globalLoading: false,
      canvasState: {
        zoom: 100,
        panX: 0,
        panY: 0,
        gridVisible: true,
        rulersVisible: true,
        guidesVisible: true,
      },

      // Theme actions
      setTheme: (theme) => 
        set({ theme }, false, 'ui/setTheme'),

      // Layout actions
      setSidebarWidth: (width) => 
        set({ sidebarWidth: Math.max(200, Math.min(400, width)) }, false, 'ui/setSidebarWidth'),
      
      setPanelWidth: (width) => 
        set({ panelWidth: Math.max(250, Math.min(500, width)) }, false, 'ui/setPanelWidth'),

      // Modal actions
      openModal: (modal) => 
        set(state => ({
          modals: { ...state.modals, [modal]: true }
        }), false, 'ui/openModal'),
      
      closeModal: (modal) => 
        set(state => ({
          modals: { ...state.modals, [modal]: false }
        }), false, 'ui/closeModal'),
      
      closeAllModals: () => 
        set(state => ({
          modals: Object.keys(state.modals).reduce((acc, key) => ({
            ...acc,
            [key]: false
          }), {} as UIState['modals'])
        }), false, 'ui/closeAllModals'),

      // Notification actions
      addNotification: (notification) => {
        const id = Math.random().toString(36).substring(2);
        const newNotification = { ...notification, id };
        
        set(state => ({
          notifications: [...state.notifications, newNotification]
        }), false, 'ui/addNotification');

        // Auto-remove notification after duration
        if (notification.duration !== 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, notification.duration || 5000);
        }
      },
      
      removeNotification: (id) => 
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }), false, 'ui/removeNotification'),
      
      clearNotifications: () => 
        set({ notifications: [] }, false, 'ui/clearNotifications'),

      // Loading actions
      setGlobalLoading: (loading) => 
        set({ globalLoading: loading }, false, 'ui/setGlobalLoading'),

      // Canvas actions
      setCanvasZoom: (zoom) => 
        set(state => ({
          canvasState: { ...state.canvasState, zoom: Math.max(10, Math.min(500, zoom)) }
        }), false, 'ui/setCanvasZoom'),
      
      setCanvasPan: (panX, panY) => 
        set(state => ({
          canvasState: { ...state.canvasState, panX, panY }
        }), false, 'ui/setCanvasPan'),
      
      toggleGrid: () => 
        set(state => ({
          canvasState: { ...state.canvasState, gridVisible: !state.canvasState.gridVisible }
        }), false, 'ui/toggleGrid'),
      
      toggleRulers: () => 
        set(state => ({
          canvasState: { ...state.canvasState, rulersVisible: !state.canvasState.rulersVisible }
        }), false, 'ui/toggleRulers'),
      
      toggleGuides: () => 
        set(state => ({
          canvasState: { ...state.canvasState, guidesVisible: !state.canvasState.guidesVisible }
        }), false, 'ui/toggleGuides'),
      
      resetCanvas: () => 
        set(state => ({
          canvasState: {
            ...state.canvasState,
            zoom: 100,
            panX: 0,
            panY: 0,
          }
        }), false, 'ui/resetCanvas'),
    }),
    { name: 'UIStore' }
  )
);