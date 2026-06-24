"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { generateDataset } from "@/lib/oneroster/generator";
import { buildZip, downloadBlob } from "@/lib/oneroster/zipUtils";
import type { GeneratorConfig, Grade } from "@/lib/oneroster/types";
import { VALID_GRADES } from "@/lib/oneroster/types";

function sliderVal(v: number | readonly number[]): number {
  return Array.isArray(v) ? (v as number[])[0] : (v as number);
}

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

  const estimatedStudents = config.numSchools * config.studentsPerSchool;
  const estimatedTeachers = config.numSchools * config.coursesPerSchool;
  const estimatedClasses = config.numSchools * config.coursesPerSchool * 2;
  const estimatedEnrollments = estimatedStudents * 5 + estimatedTeachers * 2;

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
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">OneRoster 1.1 Generator</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Generate a realistic sample district zip containing all required OneRoster 1.1 CSV files.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">District Structure</CardTitle>
              <CardDescription>Configure the shape of the generated district.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Number of schools</Label>
                  <span className="font-mono text-muted-foreground">{config.numSchools}</span>
                </div>
                <Slider min={1} max={12} step={1} value={[config.numSchools]}
                  onValueChange={(v) => set("numSchools", sliderVal(v))} />
                <p className="text-xs text-muted-foreground">Plus 1 district org.</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Students per school</Label>
                  <span className="font-mono text-muted-foreground">{config.studentsPerSchool}</span>
                </div>
                <Slider min={10} max={1000} step={10} value={[config.studentsPerSchool]}
                  onValueChange={(v) => set("studentsPerSchool", sliderVal(v))} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Courses per school</Label>
                  <span className="font-mono text-muted-foreground">{config.coursesPerSchool}</span>
                </div>
                <Slider min={2} max={20} step={1} value={[config.coursesPerSchool]}
                  onValueChange={(v) => set("coursesPerSchool", sliderVal(v))} />
                <p className="text-xs text-muted-foreground">Each course gets one class per term (fall + spring).</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Academic Year</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Start year</Label>
                  <span className="font-mono text-muted-foreground">
                    {config.academicYear}–{config.academicYear + 1}
                  </span>
                </div>
                <Slider min={2020} max={2030} step={1} value={[config.academicYear]}
                  onValueChange={(v) => set("academicYear", sliderVal(v))} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Grade Levels</CardTitle>
              <CardDescription>Select which grades to include.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {[
                  ["K–12", K12_GRADES],
                  ["Elementary", ELEM_GRADES],
                  ["Middle", MIDDLE_GRADES],
                  ["High School", HIGH_GRADES],
                  ["All", [...VALID_GRADES]],
                ].map(([label, preset]) => (
                  <Button key={String(label)} size="sm" variant="outline"
                    onClick={() => set("grades", preset as Grade[])}>
                    {label}
                  </Button>
                ))}
                <Button size="sm" variant="outline" onClick={() => set("grades", [])}>None</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {VALID_GRADES.map((grade) => {
                  const active = config.grades.includes(grade);
                  return (
                    <button key={grade} onClick={() => toggleGrade(grade)}
                      className={`px-3 py-1 rounded-md text-xs font-mono border transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-transparent hover:border-border"
                      }`}>
                      {GRADE_LABELS[grade]}
                    </button>
                  );
                })}
              </div>
              {config.grades.length === 0 && (
                <p className="text-xs text-destructive">Select at least one grade.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Checkbox id="demographics" checked={config.includeDemographics}
                  onCheckedChange={(v) => set("includeDemographics", !!v)} />
                <Label htmlFor="demographics" className="cursor-pointer text-sm">
                  Include{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">demographics.csv</code>
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Estimated Output</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                {([
                  ["Orgs", config.numSchools + 1],
                  ["Students", estimatedStudents],
                  ["Teachers", estimatedTeachers],
                  ["Courses", config.numSchools * config.coursesPerSchool],
                  ["Classes", estimatedClasses],
                  ["Enrollments", estimatedEnrollments],
                  ["Academic sessions", 3],
                ] as [string, number][]).map(([label, count]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono text-xs">{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">
                Files: manifest, orgs, users, courses, classes, enrollments, academicSessions
                {config.includeDemographics ? ", demographics" : ""}
              </p>
              <Button className="w-full" onClick={handleGenerate}
                disabled={generating || config.grades.length === 0}>
                {generating ? "Generating…" : "Download zip"}
              </Button>
            </CardContent>
          </Card>

          {lastStats && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-600 dark:text-green-400">Last generated</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {([
                  ["orgs.csv", lastStats.orgs],
                  ["users.csv", lastStats.users],
                  ["courses.csv", lastStats.courses],
                  ["classes.csv", lastStats.classes],
                  ["enrollments.csv", lastStats.enrollments],
                ] as [string, number][]).map(([file, count]) => (
                  <div key={file} className="flex justify-between text-xs">
                    <code className="text-muted-foreground">{file}</code>
                    <Badge variant="secondary">{count.toLocaleString()} rows</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
