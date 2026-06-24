"use client";

import { useState, useCallback, useRef } from "react";
import { Separator } from "@/components/ui/separator";
import { readZip } from "@/lib/oneroster/zipUtils";
import { validateZip } from "@/lib/oneroster/validator";
import type { ValidationSummary, FileValidationResult } from "@/lib/oneroster/types";

type State = "idle" | "loading" | "done";

function FileResult({ result }: { result: FileValidationResult }) {
  const [open, setOpen] = useState(result.status === "error");
  const errors = result.issues.filter((i) => i.severity === "error");
  const warnings = result.issues.filter((i) => i.severity === "warning");

  const statusColors = {
    valid: { bg: "#F0FDF4", border: "#4ECC97", dot: "#4ECC97", label: "Valid" },
    error: { bg: "#FFF1F1", border: "#EF4444", dot: "#EF4444", label: "Error" },
    warning: { bg: "#FFFBEB", border: "#F78239", dot: "#F78239", label: "Warning" },
    skipped: { bg: "#F9FAFB", border: "#D1D5DB", dot: "#9CA3AF", label: "Skipped" },
  };
  const s = statusColors[result.status];

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: s.border }}>
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors"
        style={{ backgroundColor: s.bg }}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
          <code className="text-sm font-mono font-medium text-foreground truncate">
            {result.fileName}
          </code>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: s.dot + "20", color: s.dot }}
          >
            {s.label}
          </span>
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-4">
          {errors.length > 0 && (
            <span className="text-xs font-medium" style={{ color: "#EF4444" }}>
              {errors.length} error{errors.length !== 1 ? "s" : ""}
            </span>
          )}
          {warnings.length > 0 && (
            <span className="text-xs font-medium" style={{ color: "#F78239" }}>
              {warnings.length} warning{warnings.length !== 1 ? "s" : ""}
            </span>
          )}
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {result.rowCount.toLocaleString()} rows
          </span>
          <span className="text-muted-foreground text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="bg-white">
          {result.issues.length === 0 ? (
            <div className="px-5 py-3 text-sm text-muted-foreground border-t border-border">
              No issues found.
            </div>
          ) : (
            <div className="divide-y divide-border max-h-72 overflow-y-auto">
              {result.issues.map((issue, idx) => (
                <div key={idx} className="px-5 py-2.5 flex gap-4 text-xs">
                  <span
                    className="font-bold shrink-0 w-10"
                    style={{ color: issue.severity === "error" ? "#EF4444" : "#F78239" }}
                  >
                    {issue.severity === "error" ? "ERR" : "WARN"}
                  </span>
                  {issue.row && (
                    <span className="text-muted-foreground font-mono shrink-0 w-14">
                      row {issue.row}
                    </span>
                  )}
                  {issue.column && (
                    <code
                      className="shrink-0 px-1 rounded text-xs"
                      style={{ backgroundColor: "#DAEBFF", color: "#0A1E46" }}
                    >
                      {issue.column}
                    </code>
                  )}
                  <span className="text-foreground">{issue.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ValidatePage() {
  const [state, setState] = useState<State>("idle");
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".zip")) {
      alert("Please upload a .zip file.");
      return;
    }
    setState("loading");
    setSummary(null);
    setFileName(file.name);
    try {
      const files = await readZip(file);
      const result = await validateZip(files);
      setSummary(result);
      setState("done");
    } catch (e) {
      console.error(e);
      setState("idle");
      alert("Failed to read the zip file. Make sure it is a valid .zip archive.");
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: "#0A1E46", fontFamily: "var(--font-merriweather)" }}
        >
          OneRoster 1.1{" "}
          <span style={{ color: "#1464FF" }}>Validator</span>
        </h1>
        <p className="mt-2 text-muted-foreground text-sm max-w-xl">
          Upload any OneRoster 1.1 zip to check for spec compliance — manifest integrity, required
          fields, valid enum values, date formats, and cross-file referential integrity.
          Nothing leaves your browser.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed cursor-pointer transition-all mb-8"
        style={{
          borderColor: dragging ? "#1464FF" : "#DAEBFF",
          backgroundColor: dragging ? "#EFF6FF" : "#F8FBFF",
        }}
      >
        <input ref={inputRef} type="file" accept=".zip" className="hidden" onChange={onFileChange} />
        <div className="py-16 flex flex-col items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: "#DAEBFF" }}
          >
            📦
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm" style={{ color: "#0A1E46" }}>
              {state === "loading" ? "Validating…" : "Drop your OneRoster zip here"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {state === "loading" ? "Parsing CSV files and checking referential integrity" : "or click to browse"}
            </p>
          </div>
          {state === "idle" && (
            <button
              className="mt-1 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
              style={{ backgroundColor: "#1464FF" }}
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            >
              Browse files
            </button>
          )}
        </div>
      </div>

      {state === "done" && summary && (
        <div className="space-y-6">
          {/* Summary bar */}
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: "#0A1E46" }}
          >
            <div className="flex flex-wrap items-center gap-8">
              <div>
                <p className="text-white/50 text-xs uppercase tracking-widest mb-1">File</p>
                <p className="text-white font-mono text-sm font-medium">{fileName}</p>
              </div>
              <Separator orientation="vertical" className="h-10 bg-white/10 hidden sm:block" />
              <div className="flex gap-8">
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Errors</p>
                  <p
                    className="text-2xl font-bold font-mono tabular-nums"
                    style={{ color: summary.totalErrors > 0 ? "#EF4444" : "#4ECC97" }}
                  >
                    {summary.totalErrors}
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Warnings</p>
                  <p
                    className="text-2xl font-bold font-mono tabular-nums"
                    style={{ color: summary.totalWarnings > 0 ? "#F78239" : "rgba(255,255,255,0.4)" }}
                  >
                    {summary.totalWarnings}
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Files</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-white">
                    {summary.filesChecked}
                  </p>
                </div>
              </div>
              {summary.totalErrors === 0 && (
                <div
                  className="ml-auto px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: "#4ECC97", color: "#0A1E46" }}
                >
                  {summary.totalWarnings === 0 ? "✓ Fully valid" : "✓ No errors"}
                </div>
              )}
            </div>
          </div>

          {/* Per-file results */}
          <div className="space-y-2">
            {summary.fileResults
              .sort((a, b) => {
                const order = { error: 0, warning: 1, valid: 2, skipped: 3 };
                return order[a.status] - order[b.status];
              })
              .map((result) => (
                <FileResult key={result.fileName} result={result} />
              ))}
          </div>

          {/* Referential integrity */}
          {summary.referentialErrors.length > 0 && (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#EF4444" }}>
              <div
                className="px-5 py-3 flex items-center gap-3"
                style={{ backgroundColor: "#FFF1F1" }}
              >
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <h3
                  className="text-sm font-bold"
                  style={{ color: "#0A1E46", fontFamily: "var(--font-merriweather)" }}
                >
                  Referential Integrity
                </h3>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#EF444420", color: "#EF4444" }}
                >
                  {summary.referentialErrors.length} issue{summary.referentialErrors.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="bg-white max-h-80 overflow-y-auto divide-y divide-border">
                {summary.referentialErrors.map((issue, idx) => (
                  <div key={idx} className="px-5 py-2.5 flex gap-4 text-xs">
                    <span className="font-bold text-red-500 shrink-0 w-10">ERR</span>
                    {issue.row && (
                      <span className="text-muted-foreground font-mono shrink-0 w-14">
                        row {issue.row}
                      </span>
                    )}
                    <span className="text-foreground">{issue.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => { setState("idle"); setSummary(null); setFileName(null); }}
            className="text-sm font-medium transition-colors"
            style={{ color: "#1464FF" }}
          >
            ← Validate another file
          </button>
        </div>
      )}
    </div>
  );
}
