"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { generateDataset } from "@/lib/oneroster/generator";
import { buildZip, downloadBlob } from "@/lib/oneroster/zipUtils";
import type { GeneratorConfig, Grade } from "@/lib/oneroster/types";
import { VALID_GRADES } from "@/lib/oneroster/types";

const GRADE_LABELS: Record<string, string> = {
  UI: "UI", PK: "PK", TK: "TK", KG: "KG",
  "01": "1", "02": "2", "03": "3", "04": "4", "05": "5",
  "06": "6", "07": "7", "08": "8", "09": "9",
  "10": "10", "11": "11", "12": "12", "13": "13",
};

const K12_GRADES: Grade[] = ["KG", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const ELEM_GRADES: Grade[] = ["KG", "01", "02", "03", "04", "05"];
const MIDDLE_GRADES: Grade[] = ["06", "07", "08"];
const HIGH_GRADES: Grade[] = ["09", "10", "11", "12"];
const CURRENT_YEAR = new Date().getFullYear();

const DEFAULT_CONFIG: GeneratorConfig = {
  numSchools: 3,
  studentsPerSchool: 150,
  grades: K12_GRADES,
  academicYear: CURRENT_YEAR,
  coursesPerSchool: 8,
  includeDemographics: false,
};

function sliderVal(v: number | readonly number[]): number {
  return Array.isArray(v) ? (v as number[])[0] : (v as number);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-border" style={{ backgroundColor: "#DAEBFF" }}>
        <h2
          className="text-sm font-bold tracking-tight"
          style={{ color: "#0A1E46", fontFamily: "var(--font-merriweather)" }}
        >
          {title}
        </h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  hint?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        <span
          className="text-base font-bold tabular-nums"
          style={{ color: "#1464FF" }}
        >
          {value.toLocaleString()}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(sliderVal(v))}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function GeneratorPage() {
  const [config, setConfig] = useState<GeneratorConfig>(DEFAULT_CONFIG);
  const [generating, setGenerating] = useState(false);
  const [lastStats, setLastStats] = useState<null | {
    orgs: number; users: number; courses: number; classes: number; enrollments: number;
  }>(null);

  function set<K extends keyof GeneratorConfig>(key: K, value: GeneratorConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function toggleGrade(grade: Grade) {
    set("grades", config.grades.includes(grade)
      ? config.grades.filter((g) => g !== grade)
      : [...config.grades, grade]
    );
  }

  const estStudents = config.numSchools * config.studentsPerSchool;
  const estTeachers = config.numSchools * config.coursesPerSchool;
  const estClasses = config.numSchools * config.coursesPerSchool * 2;
  const estEnrollments = estStudents * 5 + estTeachers * 2;

  async function handleGenerate() {
    if (config.grades.length === 0) return;
    setGenerating(true);
    try {
      const dataset = generateDataset(config);
      const blob = await buildZip(dataset);
      downloadBlob(blob, "oneroster11.zip");
      setLastStats({
        orgs: dataset.orgs.length,
        users: dataset.users.length,
        courses: dataset.courses.length,
        classes: dataset.classes.length,
        enrollments: dataset.enrollments.length,
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Page header */}
      <div className="mb-8">
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: "#0A1E46", fontFamily: "var(--font-merriweather)" }}
        >
          OneRoster 1.1{" "}
          <span style={{ color: "#1464FF" }}>Generator</span>
        </h1>
        <p className="mt-2 text-muted-foreground text-sm max-w-xl">
          Configure the parameters below and download a complete, spec-compliant district zip
          containing all required OneRoster 1.1 CSV files.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: config */}
        <div className="lg:col-span-2 space-y-5">
          <Section title="District Structure">
            <div className="space-y-6">
              <SliderRow label="Number of schools" value={config.numSchools} min={1} max={12} step={1}
                hint="Plus 1 district org." onChange={(v) => set("numSchools", v)} />
              <SliderRow label="Students per school" value={config.studentsPerSchool} min={10} max={1000} step={10}
                onChange={(v) => set("studentsPerSchool", v)} />
              <SliderRow label="Courses per school" value={config.coursesPerSchool} min={2} max={20} step={1}
                hint="Each course gets one class per term (fall + spring)."
                onChange={(v) => set("coursesPerSchool", v)} />
            </div>
          </Section>

          <Section title="Academic Year">
            <SliderRow
              label="Start year"
              value={config.academicYear}
              min={2020} max={2030} step={1}
              hint={`School year ${config.academicYear}–${config.academicYear + 1} with fall + spring terms.`}
              onChange={(v) => set("academicYear", v)}
            />
          </Section>

          <Section title="Grade Levels">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  ["K–12", K12_GRADES],
                  ["Elementary", ELEM_GRADES],
                  ["Middle", MIDDLE_GRADES],
                  ["High School", HIGH_GRADES],
                  ["All", [...VALID_GRADES]],
                ].map(([label, preset]) => (
                  <button
                    key={String(label)}
                    onClick={() => set("grades", preset as Grade[])}
                    className="px-3 py-1 rounded text-xs font-medium border transition-colors"
                    style={{ borderColor: "#1464FF", color: "#1464FF" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1464FF";
                      (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                      (e.currentTarget as HTMLButtonElement).style.color = "#1464FF";
                    }}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => set("grades", [])}
                  className="px-3 py-1 rounded text-xs font-medium border border-border text-muted-foreground hover:bg-muted transition-colors"
                >
                  Clear
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {VALID_GRADES.map((grade) => {
                  const active = config.grades.includes(grade);
                  return (
                    <button
                      key={grade}
                      onClick={() => toggleGrade(grade)}
                      className="w-10 h-10 rounded-lg text-xs font-bold transition-all border"
                      style={
                        active
                          ? { backgroundColor: "#1464FF", color: "#fff", borderColor: "#1464FF" }
                          : { backgroundColor: "#fff", color: "#666", borderColor: "#DAEBFF" }
                      }
                    >
                      {GRADE_LABELS[grade]}
                    </button>
                  );
                })}
              </div>
              {config.grades.length === 0 && (
                <p className="text-xs text-destructive">Select at least one grade to continue.</p>
              )}
            </div>
          </Section>

          <Section title="Options">
            <div className="flex items-center gap-3">
              <Checkbox
                id="demographics"
                checked={config.includeDemographics}
                onCheckedChange={(v) => set("includeDemographics", !!v)}
              />
              <Label htmlFor="demographics" className="cursor-pointer text-sm">
                Include{" "}
                <code className="text-xs font-mono bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                  demographics.csv
                </code>
              </Label>
            </div>
          </Section>
        </div>

        {/* Right: summary + generate */}
        <div className="space-y-5">
          <div
            className="rounded-xl overflow-hidden border border-border sticky top-6"
            style={{ backgroundColor: "#0A1E46" }}
          >
            <div className="px-5 py-4 border-b border-white/10">
              <h2
                className="text-base font-bold text-white"
                style={{ fontFamily: "var(--font-merriweather)" }}
              >
                Estimated output
              </h2>
              <p className="text-white/50 text-xs mt-0.5">
                {config.academicYear}–{config.academicYear + 1} school year
              </p>
            </div>

            <div className="px-5 py-4 space-y-3">
              {([
                ["Orgs", config.numSchools + 1],
                ["Students", estStudents],
                ["Teachers", estTeachers],
                ["Courses", config.numSchools * config.coursesPerSchool],
                ["Classes", estClasses],
                ["Enrollments", estEnrollments],
                ["Academic sessions", 3],
              ] as [string, number][]).map(([label, count]) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">{label}</span>
                  <span className="text-white font-bold font-mono text-sm tabular-nums">
                    {count.toLocaleString()}
                  </span>
                </div>
              ))}

              <Separator className="bg-white/10" />

              <div className="text-white/40 text-xs leading-relaxed">
                {["manifest.csv", "orgs.csv", "users.csv", "courses.csv", "classes.csv", "enrollments.csv", "academicSessions.csv", ...(config.includeDemographics ? ["demographics.csv"] : [])].map((f) => (
                  <span key={f} className="block font-mono">{f}</span>
                ))}
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || config.grades.length === 0}
                className="w-full mt-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#1464FF", color: "#fff" }}
                onMouseEnter={(e) => {
                  if (!generating && config.grades.length > 0)
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0e50d6";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1464FF";
                }}
              >
                {generating ? "Generating…" : "↓ Download oneroster11.zip"}
              </button>
            </div>
          </div>

          {/* Post-generate stats */}
          {lastStats && (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#4ECC97" }}>
              <div className="px-4 py-2.5" style={{ backgroundColor: "#4ECC97" }}>
                <span className="text-xs font-bold" style={{ color: "#0A1E46" }}>
                  Generated successfully
                </span>
              </div>
              <div className="px-4 py-3 space-y-1.5 bg-white">
                {([
                  ["orgs.csv", lastStats.orgs],
                  ["users.csv", lastStats.users],
                  ["courses.csv", lastStats.courses],
                  ["classes.csv", lastStats.classes],
                  ["enrollments.csv", lastStats.enrollments],
                ] as [string, number][]).map(([file, count]) => (
                  <div key={file} className="flex justify-between text-xs">
                    <code className="text-muted-foreground font-mono">{file}</code>
                    <span className="font-bold tabular-nums" style={{ color: "#1464FF" }}>
                      {count.toLocaleString()} rows
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
