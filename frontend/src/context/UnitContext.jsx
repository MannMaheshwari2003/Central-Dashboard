import { createContext, useContext, useEffect, useRef, useState } from "react";
import { setApiUnit } from "../api/client.js";

const UnitContext = createContext();

export const UNIT_OPTIONS = [
  { value: "lakh_mt", label: "Lakh MT" },
  { value: "million_mt", label: "Mill Tons" },
  { value: "thousand_mt", label: "Thous. MT" },
  { value: "mt", label: "MT" },
  { value: "crore_mt", label: "Crore MT" },
];

const VALID_UNITS = new Set(UNIT_OPTIONS.map((item) => item.value));

function storedUnit() {
  try {
    const saved = localStorage.getItem("food_pds_display_unit");
    return VALID_UNITS.has(saved) ? saved : "lakh_mt";
  } catch {
    return "lakh_mt";
  }
}

export function UnitProvider({ children }) {
  const [unit, setUnitState] = useState(storedUnit);
  const unitLabel = UNIT_OPTIONS.find((item) => item.value === unit)?.label || "Lakh MT";

  const setUnit = (next) => {
    const safe = VALID_UNITS.has(next) ? next : "lakh_mt";
    setUnitState(safe);
    setApiUnit(safe);
    try {
      localStorage.setItem("food_pds_display_unit", safe);
    } catch {
      // localStorage is optional; the dashboard still works without persistence.
    }
  };

  useEffect(() => {
    setApiUnit(unit);
  }, [unit]);

  return (
    <UnitContext.Provider value={{ unit, unitLabel, setUnit, unitOptions: UNIT_OPTIONS }}>
      <UnitTextBoundary unitLabel={unitLabel}>{children}</UnitTextBoundary>
    </UnitContext.Provider>
  );
}

/*
 * Some legacy page labels still contain their original source unit text.
 * The backend converts the numeric values; this boundary only updates the
 * visible unit label. It deliberately ignores the global Unit selector so
 * every option always keeps its own correct name.
 */
function UnitTextBoundary({ unitLabel, children }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const shouldIgnore = (textNode) => {
      const parent = textNode?.parentElement;
      return !parent || Boolean(parent.closest(".global-unit-control, [data-unit-label-static='true']"));
    };

    const updateTextNode = (textNode) => {
      if (shouldIgnore(textNode)) return;
      const current = textNode.nodeValue;
      const next = replaceMassUnitText(current, unitLabel);
      if (next !== current) textNode.nodeValue = next;
    };

    const updateElement = (node) => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.closest?.(".global-unit-control, [data-unit-label-static='true']")) return;

      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      let current;
      while ((current = walker.nextNode())) updateTextNode(current);
    };

    updateElement(root);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) updateTextNode(node);
          else if (node.nodeType === Node.ELEMENT_NODE) updateElement(node);
        });
      });
    });

    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [unitLabel]);

  return <div ref={rootRef} className="unit-display-root">{children}</div>;
}

export function useUnit() {
  return useContext(UnitContext);
}

/*
 * IMPORTANT: use ONE replacement pass. Chained replacements caused labels
 * such as "Lakh MT" to become "Lakh Lakh MT" when Lakh MT was selected.
 */
export function replaceMassUnitText(text, label) {
  if (typeof text !== "string") return text;

  const massUnitPattern = /(?:Million\s+Tonnes?|Million\s+MT|Million\s+T\b|Thousand\s+MT|Crore\s+MT|Lakh\s+Tons?|Lakh\s+MT|Lakh\s+T\b|\bMT\b)/gi;
  return text.replace(massUnitPattern, label);
}
