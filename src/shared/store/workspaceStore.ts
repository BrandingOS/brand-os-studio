import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { container } from '@/core/container/ServiceContainer';
import {
  SERVICE_KEYS,
  type IWorkspaceService,
  type Workspace,
  type WorkspaceMember,
  type WorkspaceRole,
  type CreateWorkspaceInput,
} from '@/core/types/services';

function getWorkspaceService(): IWorkspaceService {
  return container.get<IWorkspaceService>(SERVICE_KEYS.WORKSPACES);
}

interface WorkspaceStore {
  list: Workspace[];
  current?: Workspace;
  members: WorkspaceMember[];
  isLoading: boolean;
  error?: string;

  loadAll: () => Promise<void>;
  loadMembers: (workspaceId: string) => Promise<void>;
  setCurrent: (workspace: Workspace | undefined) => void;
  create: (input: CreateWorkspaceInput) => Promise<Workspace>;
  update: (id: string, patch: Partial<CreateWorkspaceInput>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  addMember: (workspaceId: string, email: string, role: WorkspaceRole) => Promise<WorkspaceMember>;
  removeMember: (workspaceId: string, userId: string) => Promise<void>;
  updateMemberRole: (workspaceId: string, userId: string, role: WorkspaceRole) => Promise<void>;
  setError: (error: string | undefined) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  devtools(
    persist(
      (set) => ({
        list: [],
        current: undefined,
        members: [],
        isLoading: false,
        error: undefined,

        loadAll: async () => {
          set({ isLoading: true, error: undefined }, false, 'loadAll/start');
          try {
            const workspaces = await getWorkspaceService().list();
            set((state) => {
              // If no current workspace is set, default to the first one (personal)
              const current = state.current
                ? workspaces.find((ws) => ws.id === state.current!.id) ?? workspaces[0]
                : workspaces[0];
              return { list: workspaces, current, isLoading: false };
            }, false, 'loadAll/success');
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load workspaces',
              isLoading: false,
            }, false, 'loadAll/error');
          }
        },

        loadMembers: async (workspaceId: string) => {
          set({ isLoading: true, error: undefined }, false, 'loadMembers/start');
          try {
            const members = await getWorkspaceService().getMembers(workspaceId);
            set({ members, isLoading: false }, false, 'loadMembers/success');
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load members',
              isLoading: false,
            }, false, 'loadMembers/error');
          }
        },

        setCurrent: (workspace) => set({ current: workspace }, false, 'setCurrent'),

        create: async (input: CreateWorkspaceInput) => {
          set({ isLoading: true, error: undefined }, false, 'create/start');
          try {
            const workspace = await getWorkspaceService().create(input);
            set((state) => ({
              list: [...state.list, workspace],
              isLoading: false,
            }), false, 'create/success');
            return workspace;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to create workspace',
              isLoading: false,
            }, false, 'create/error');
            throw error;
          }
        },

        update: async (id: string, patch: Partial<CreateWorkspaceInput>) => {
          set({ isLoading: true, error: undefined }, false, 'update/start');
          try {
            const updated = await getWorkspaceService().update(id, patch);
            set((state) => ({
              list: state.list.map((ws) => (ws.id === id ? updated : ws)),
              current: state.current?.id === id ? updated : state.current,
              isLoading: false,
            }), false, 'update/success');
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update workspace',
              isLoading: false,
            }, false, 'update/error');
          }
        },

        deleteWorkspace: async (id: string) => {
          set({ isLoading: true, error: undefined }, false, 'delete/start');
          try {
            await getWorkspaceService().delete(id);
            set((state) => ({
              list: state.list.filter((ws) => ws.id !== id),
              current: state.current?.id === id ? state.list[0] : state.current,
              isLoading: false,
            }), false, 'delete/success');
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to delete workspace',
              isLoading: false,
            }, false, 'delete/error');
          }
        },

        addMember: async (workspaceId: string, email: string, role: WorkspaceRole) => {
          set({ isLoading: true, error: undefined }, false, 'addMember/start');
          try {
            const member = await getWorkspaceService().addMember(workspaceId, email, role);
            set((state) => ({
              members: [...state.members, member],
              isLoading: false,
            }), false, 'addMember/success');
            return member;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to add member',
              isLoading: false,
            }, false, 'addMember/error');
            throw error;
          }
        },

        removeMember: async (workspaceId: string, userId: string) => {
          set({ isLoading: true, error: undefined }, false, 'removeMember/start');
          try {
            await getWorkspaceService().removeMember(workspaceId, userId);
            set((state) => ({
              members: state.members.filter((m) => m.userId !== userId),
              isLoading: false,
            }), false, 'removeMember/success');
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to remove member',
              isLoading: false,
            }, false, 'removeMember/error');
          }
        },

        updateMemberRole: async (workspaceId: string, userId: string, role: WorkspaceRole) => {
          set({ isLoading: true, error: undefined }, false, 'updateMemberRole/start');
          try {
            await getWorkspaceService().updateMemberRole(workspaceId, userId, role);
            set((state) => ({
              members: state.members.map((m) =>
                m.userId === userId ? { ...m, role } : m
              ),
              isLoading: false,
            }), false, 'updateMemberRole/success');
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update member role',
              isLoading: false,
            }, false, 'updateMemberRole/error');
          }
        },

        setError: (error) => set({ error }, false, 'setError'),
        setLoading: (isLoading) => set({ isLoading }, false, 'setLoading'),
        reset: () => set({
          list: [],
          current: undefined,
          members: [],
          isLoading: false,
          error: undefined,
        }, false, 'reset'),
      }),
      {
        name: 'brandos-workspace',
        partialize: (state) => ({
          // Only persist the current workspace ID so we can restore it on reload
          current: state.current ? { id: state.current.id } : undefined,
        }),
      }
    ),
    { name: 'workspace-store' }
  )
);
