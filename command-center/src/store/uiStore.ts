import { create } from 'zustand';

interface UIStore {
  activeTarget: string | null;
  selectedTargets: Set<string>;
  whatIfMode: boolean;
  baselineLoss: number;
  showHeatmap: boolean;
  showMinimap: boolean;
  
  setSingleSelection: (nodeId: string | null) => void;
  setMultiSelection: (selection: Set<string>) => void;
  toggleWhatIf: () => void;
  setBaselineLoss: (loss: number) => void;
  toggleHeatmap: () => void;
  toggleMinimap: () => void;
  resetUI: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeTarget: null,
  selectedTargets: new Set(),
  whatIfMode: false,
  baselineLoss: 0.0,
  showHeatmap: false,
  showMinimap: true,

  setSingleSelection: (nodeId: string | null) => 
    set({ activeTarget: nodeId, selectedTargets: new Set() }),

  setMultiSelection: (selection: Set<string>) => set((state) => {
    if (selection.size === 0) return { selectedTargets: new Set(), activeTarget: null };
    if (selection.size === 1) {
      const [id] = selection;
      return { activeTarget: id, selectedTargets: new Set() };
    }
    return { selectedTargets: selection, activeTarget: null };
  }),

  toggleWhatIf: () => set((state) => ({ whatIfMode: !state.whatIfMode })),
  setBaselineLoss: (loss: number) => set({ baselineLoss: loss }),
  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
  toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),
  resetUI: () => set({
    activeTarget: null,
    selectedTargets: new Set(),
    whatIfMode: false,
    baselineLoss: 0.0,
  }),
}));
