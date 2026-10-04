import { create } from "zustand";

export interface LlmModel {
  name: string;
}

interface LlmState {
  provider: string;
  model: string;
  providers: Record<string, LlmModel[]>;
  gpuDetected: boolean;
  gpuSummary: string;
  setProvider: (provider: string) => void;
  setModel: (model: string) => void;
  setProviders: (providers: Record<string, LlmModel[]>) => void;
  setGpu: (detected: boolean, summary: string) => void;
}

function stored(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export const useLlmStore = create<LlmState>((set) => ({
  provider: stored("llm_provider", "ollama"),
  model: stored("llm_model", "llama3.2:3b"),
  providers: {},
  gpuDetected: false,
  gpuSummary: "",
  setProvider: (provider) => {
    try {
      localStorage.setItem("llm_provider", provider);
    } catch {
      // storage unavailable (private mode) — in-memory still works
    }
    set({ provider });
  },
  setModel: (model) => {
    try {
      localStorage.setItem("llm_model", model);
    } catch {
      // storage unavailable (private mode) — in-memory still works
    }
    set({ model });
  },
  setProviders: (providers) => set({ providers }),
  setGpu: (gpuDetected, gpuSummary) => set({ gpuDetected, gpuSummary }),
}));
