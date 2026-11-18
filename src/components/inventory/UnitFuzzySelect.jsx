import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown } from "lucide-react";
import { useUnitCatalog } from "@/hooks/useUnitCatalog";
import { normalizeUnit } from "@/lib/unitConversion";

const MAX_VISIBLE_OPTIONS = 6;

function fuzzyUnitScore(unit, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return 0;

  const canonical = String(unit.canonical_label || unit.code || "").toLowerCase();
  const display = String(unit.display_name || unit.label || "").toLowerCase();
  const arabic = String(unit.arabic_label || "").toLowerCase();
  const aliases = (unit.aliases || []).map((a) => String(a).toLowerCase());

  if (canonical === q) return 2000;
  if (aliases.includes(q)) return 1800;
  if (canonical.startsWith(q)) return 1500 - canonical.length;
  if (aliases.some((a) => a.startsWith(q))) return 1300;
  if (display.includes(q) || arabic.includes(q)) return 1100;

  const target = [canonical, display, arabic, ...aliases].join(" ");
  const compactQ = q.replace(/\s+/g, "");
  let score = 0;
  let pos = 0;
  let run = 0;
  for (const ch of compactQ) {
    const found = target.indexOf(ch, pos);
    if (found < 0) return -1;
    run = found === pos ? run + 1 : 0;
    score += 1 + run * 2 + (found === 0 || target[found - 1] === " " ? 3 : 0);
    pos = found + 1;
  }
  return score;
}

export default function UnitFuzzySelect({
  value,
  onChange,
  unitType = "pcs",
  placeholder = "Search unit…",
  className = "",
}) {
  const { activeUnits } = useUnitCatalog();

  const selectedUnit = useMemo(() => {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const norm = normalizeUnit(raw).toLowerCase();
    return (
      activeUnits.find(
        (u) =>
          String(u.canonical_label || u.code).toLowerCase() === raw.toLowerCase() ||
          String(u.code).toLowerCase() === norm
      ) || null
    );
  }, [value, activeUnits]);

  const displayLabel = selectedUnit
    ? selectedUnit.canonical_label || selectedUnit.code
    : String(value || "").trim();

  const [text, setText] = useState(displayLabel);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setText(displayLabel);
  }, [displayLabel]);

  const { results, totalMatches } = useMemo(() => {
    const isSearching = open && text.trim().toLowerCase() !== displayLabel.toLowerCase();
    const query = isSearching ? text.trim() : "";

    if (!query) {
      // Prioritize units matching the selected Type (count vs mass/volume), capped to MAX_VISIBLE_OPTIONS
      const preferredDims = unitType === "weight" ? ["mass", "volume"] : ["count"];
      const sorted = [...activeUnits].sort((a, b) => {
        const aPref = preferredDims.includes(a.dimension) ? 0 : 1;
        const bPref = preferredDims.includes(b.dimension) ? 0 : 1;
        if (aPref !== bPref) return aPref - bPref;
        return String(a.canonical_label || a.code).localeCompare(String(b.canonical_label || b.code));
      });
      return {
        results: sorted.slice(0, MAX_VISIBLE_OPTIONS),
        totalMatches: sorted.length,
      };
    }

    const scored = activeUnits
      .map((u) => ({ unit: u, score: fuzzyUnitScore(u, query) }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score);

    return {
      results: scored.slice(0, MAX_VISIBLE_OPTIONS).map((r) => r.unit),
      totalMatches: scored.length,
    };
  }, [activeUnits, open, text, displayLabel, unitType]);

  const pickUnit = (unit) => {
    if (!unit) return;
    const canonical = unit.canonical_label || unit.code;
    onChange(canonical);
    setText(canonical);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIndex]) {
        pickUnit(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setText(displayLabel);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          value={text}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          autoComplete="off"
          onFocus={(e) => {
            setOpen(true);
            setActiveIndex(0);
            e.target.select();
          }}
          onBlur={() => {
            setTimeout(() => {
              setOpen(false);
              setText(displayLabel);
            }, 150);
          }}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className="pr-7 bg-white font-mono text-sm"
        />
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden"
        >
          {results.length === 0 ? (
            <div className="p-2.5 text-xs text-slate-500">
              No matching unit in Unit Table
            </div>
          ) : (
            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
              {results.map((u, idx) => {
                const canonical = u.canonical_label || u.code;
                const isSelected =
                  selectedUnit &&
                  (selectedUnit.canonical_label || selectedUnit.code) === canonical;
                const aliasSample = (u.aliases || [])
                  .filter((a) => a.toLowerCase() !== canonical.toLowerCase())
                  .slice(0, 3)
                  .join(", ");
                return (
                  <button
                    key={u.code}
                    type="button"
                    role="option"
                    aria-selected={idx === activeIndex}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pickUnit(u);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between gap-2 ${
                      idx === activeIndex ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-slate-900">
                          {canonical}
                        </span>
                        <span className="text-slate-500 truncate">
                          {u.display_name || u.label}
                        </span>
                      </div>
                      {aliasSample && (
                        <div className="text-[10px] text-slate-400 truncate">
                          Aliases: {aliasSample}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
          {totalMatches > results.length && (
            <div className="px-2.5 py-1 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500">
              Showing top {results.length} of {totalMatches} units — type to filter
            </div>
          )}
        </div>
      )}
    </div>
  );
}