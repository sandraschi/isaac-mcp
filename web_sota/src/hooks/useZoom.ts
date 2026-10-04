import { useCallback, useEffect, useState } from "react";

const LEVELS = [0.5, 0.6, 0.7, 0.8, 1.0, 1.25, 1.5, 2.0, 3.0];
const KEY = "tauri-zoom";

export function useZoom() {
  const [level, setLevel] = useState<number>(() => {
    try {
      const saved = parseFloat(localStorage.getItem(KEY) || "1");
      return LEVELS.includes(saved) ? saved : 1.0;
    } catch {
      return 1.0;
    }
  });

  useEffect(() => {
    try {
      (document.body.style as CSSStyleDeclaration & { zoom: string }).zoom =
        String(level);
      localStorage.setItem(KEY, String(level));
    } catch {
      // non-visual context: zoom is best-effort
    }
  }, [level]);

  const zoomIn = useCallback(
    () =>
      setLevel(
        (l) => LEVELS[Math.min(LEVELS.length - 1, LEVELS.indexOf(l) + 1)],
      ),
    [],
  );
  const zoomOut = useCallback(
    () => setLevel((l) => LEVELS[Math.max(0, LEVELS.indexOf(l) - 1)]),
    [],
  );
  const resetZoom = useCallback(() => setLevel(1.0), []);

  return { level, zoomIn, zoomOut, resetZoom };
}
