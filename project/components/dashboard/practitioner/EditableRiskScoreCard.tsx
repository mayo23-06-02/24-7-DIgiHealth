"use client";

import React, { useEffect, useState } from "react";
import { BiShield, BiCheck, BiLoaderAlt, BiEditAlt } from "react-icons/bi";
import {
  clampRiskScore,
  riskBandStyle,
  type RiskBand,
} from "@/lib/riskScore";

interface EditableRiskScoreCardProps {
  patientId: string;
  initialScore?: number;
  onSaved?: (score: number, band: RiskBand) => void;
}

/**
 * KPI-style risk card: solid bg by score band, white text, doctor edits with slider.
 */
export default function EditableRiskScoreCard({
  patientId,
  initialScore = 0,
  onSaved,
}: EditableRiskScoreCardProps) {
  const [score, setScore] = useState(clampRiskScore(initialScore));
  const [draft, setDraft] = useState(clampRiskScore(initialScore));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/practitioner/patients/${patientId}/risk`);
        const json = await res.json();
        if (!cancelled && json.success && typeof json.data?.score === "number") {
          const s = clampRiskScore(json.data.score);
          setScore(s);
          setDraft(s);
        }
      } catch {
        /* keep initial */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  useEffect(() => {
    if (!editing) {
      setDraft(score);
    }
  }, [score, editing]);

  const style = riskBandStyle(editing ? draft : score);
  const display = editing ? draft : score;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/practitioner/patients/${patientId}/risk`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: draft }),
      });
      const json = await res.json();
      if (json.success) {
        const s = clampRiskScore(json.data.score);
        setScore(s);
        setDraft(s);
        setEditing(false);
        onSaved?.(s, riskBandStyle(s).band);
      }
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`rounded-lg p-4 flex flex-col justify-between min-h-[148px]  transition-colors duration-300 ${style.bgClass} ${style.textClass}`}
      style={{ backgroundColor: style.bg }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="w-11 h-11 rounded-lg bg-white/20 flex items-center justify-center text-white">
          <BiShield size={22} />
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs font-bold text-white/90 hover:text-white bg-white/15 hover:bg-white/25 px-2 py-2 rounded-lg transition-colors"
            title="Edit risk score"
          >
            <BiEditAlt size={14} />
            Edit
          </button>
        ) : (
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setDraft(score);
                setEditing(false);
              }}
              className="text-xs font-bold text-white/90 bg-white/15 hover:bg-white/25 px-2 py-2 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="flex items-center gap-1 text-xs font-bold text-emerald-900 bg-white hover:bg-white/90 px-2 py-2 rounded-lg disabled:opacity-60"
            >
              {saving ? (
                <BiLoaderAlt className="animate-spin" size={14} />
              ) : (
                <BiCheck size={14} />
              )}
              Save
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl lg:text-4xl font-bold tracking-tight text-white tabular-nums">
            {loaded || editing ? display : "—"}
          </span>
          <span className="text-sm font-semibold text-white/80">/ 100</span>
        </div>
        <p className="text-sm font-semibold text-white/90">{style.label}</p>
        <p className="text-xs font-medium text-white/75">Clinical risk score</p>
      </div>

      {editing && (
        <div className="mt-4 space-y-2">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={draft}
            onChange={(e) => setDraft(clampRiskScore(Number(e.target.value)))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-white"
            style={{
              background: `linear-gradient(to right, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.95) ${draft}%, rgba(255,255,255,0.25) ${draft}%, rgba(255,255,255,0.25) 100%)`,
            }}
            aria-label="Risk score"
          />
          <div className="flex justify-between text-[10px] font-bold text-white/70 uppercase tracking-wide">
            <span>0 Low</span>
            <span>35</span>
            <span>50</span>
            <span>75</span>
            <span>100 High</span>
          </div>
        </div>
      )}
    </div>
  );
}
