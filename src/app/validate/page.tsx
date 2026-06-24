"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { readZip } from "@/lib/oneroster/zipUtils";
import { validateZip } from "@/lib/oneroster/validator";
import type { ValidationSummary, FileValidationResult } from "@/lib/oneroster/types";

type State = "idle" | "loading" | "done";

function StatusBadge({ status }: { status: FileValidationResult["status"] }) {
  const variants: Record<string, string> = {
    valid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    skipped: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${variants[status] ?? variants.skipped}`}>
      {status}
    </span>
  );
}

function FileResult({ result }: { result: FileValidationResult }) {
  const [open, setOpen] = useState(result.status === "error");
  const errors = result.issues.filter((i) => i.severity === "error");
  const warnings = result.issues.filter((i) => i.severity === "warning");

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <code className="text-xs font-mono truncate">{result.fileName}</code>
          <StatusBadge status={result.status} />
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          {errors.length > 0 && (
            <span className="text-xs text-red-600 dark:text-red-400">{errors.length} error{errors.length !== 1 ? "s" : ""}</span>
          )}
          {warnings.length > 0 && (
            <span className="text-xs text-yellow-600 dark:text-yellow-500">{warnings.length} warning{warnings.length !== 1 ? "s" : ""}</span>
          )}
          <span className="text-xs text-muted-foreground">{result.rowCount.toLocaleString()} rows</span>
          <span className="text-muted-foreground">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && result.issues.length > 0 && (
        <div className="border-t bg-muted/20">
          <div className="divide-y">
            {result.issues.map((issue, idx) => (
              <div key={idx} className="px-4 py-2 text-xs flex gap-3">
                <span className={issue.severity === "error"
                  ? "text-red-600 dark:text-red-400 font-medium shrink-0"
                  : "text-yellow-600 dark:text-yellow-500 font-medium shrink-0"}>
                  {issue.severity === "error" ? "ERR" : "WARN"}
                </span>
                {issue.row && (
                  <span className="text-muted-foreground font-mono shrink-0">row {issue.row}</span>
                )}
                {issue.column && (
                  <code className="text-muted-foreground shrink-0">{issue.column}</code>
                )}
                <span className="text-foreground">{issue.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {open && result.issues.length === 0 && (
        <div className="border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground">No issues found.</div>
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
      alert("Failed to read zip file. Make sure it is a valid .zip archive.");
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
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">OneRoster 1.1 Validator</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Upload a OneRoster 1.1 zip to check for spec compliance, required fields, enum values, and referential integrity.
          All processing happens in your browser — no data is uploaded to a server.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors mb-6 ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30"
        }`}
      >
        <input ref={inputRef} type="file" accept=".zip" className="hidden" onChange={onFileChange} />
        <div className="space-y-2">
          <div className="text-3xl">📦</div>
          <p className="text-sm font-medium">
            {state === "loading" ? "Validating…" : "Drop a OneRoster zip here"}
          </p>
          <p className="text-xs text-muted-foreground">or click to browse</p>
        </div>
      </div>

      {state === "done" && summary && (
        <div className="space-y-4">
          {/* Summary bar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Results for{" "}
                <code className="text-sm font-mono">{fileName}</code>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${summary.totalErrors > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                    {summary.totalErrors}
                  </span>
                  <span className="text-muted-foreground">error{summary.totalErrors !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${summary.totalWarnings > 0 ? "text-yellow-600 dark:text-yellow-500" : "text-muted-foreground"}`}>
                    {summary.totalWarnings}
                  </span>
                  <span className="text-muted-foreground">warning{summary.totalWarnings !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{summary.filesChecked}</span>
                  <span className="text-muted-foreground">files checked</span>
                </div>
              </div>
              {summary.totalErrors === 0 && summary.totalWarnings === 0 && (
                <p className="mt-3 text-sm text-green-600 dark:text-green-400 font-medium">
                  All checks passed. This looks like valid OneRoster 1.1 data.
                </p>
              )}
              {summary.totalErrors === 0 && summary.totalWarnings > 0 && (
                <p className="mt-3 text-sm text-yellow-600 dark:text-yellow-500">
                  No errors, but there are warnings worth reviewing.
                </p>
              )}
            </CardContent>
          </Card>

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

          {/* Referential integrity errors */}
          {summary.referentialErrors.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  Referential Integrity
                  <Badge variant="destructive">{summary.referentialErrors.length} issue{summary.referentialErrors.length !== 1 ? "s" : ""}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {summary.referentialErrors.map((issue, idx) => (
                    <div key={idx} className="text-xs flex gap-3 py-1 border-b last:border-0">
                      <span className="text-red-600 dark:text-red-400 font-medium shrink-0">ERR</span>
                      {issue.row && <span className="text-muted-foreground font-mono shrink-0">row {issue.row}</span>}
                      <span>{issue.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />
          <Button variant="outline" onClick={() => { setState("idle"); setSummary(null); setFileName(null); }}>
            Validate another file
          </Button>
        </div>
      )}
    </div>
  );
}
