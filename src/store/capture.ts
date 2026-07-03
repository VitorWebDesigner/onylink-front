import { create } from 'zustand';

/** Ponte entre a tela de câmera (`app/camera`) e o compose: a câmera grava o resultado
 *  e o compose consome ao voltar (expo-router não devolve valor de tela diretamente). */
interface CaptureState {
  result: { uri: string; type: 'IMAGE' | 'VIDEO' } | null;
  setResult: (r: { uri: string; type: 'IMAGE' | 'VIDEO' }) => void;
  clear: () => void;
}

export const useCapture = create<CaptureState>((set) => ({
  result: null,
  setResult: (r) => set({ result: r }),
  clear: () => set({ result: null }),
}));
