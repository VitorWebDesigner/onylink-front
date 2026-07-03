import { create } from 'zustand';

/** Estado de UI de mídia do feed: mute global + qual post está visível (autoplay). */
interface MediaUiState {
  muted: boolean;
  toggleMuted: () => void;
  activePostId: string | null;
  setActivePostId: (id: string | null) => void;
}

export const useMediaUi = create<MediaUiState>((set) => ({
  muted: true, // feed começa mudo (padrão de rede social)
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  activePostId: null,
  setActivePostId: (id) => set({ activePostId: id }),
}));
