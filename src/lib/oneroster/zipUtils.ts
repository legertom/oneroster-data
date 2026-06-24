import JSZip from "jszip";
import Papa from "papaparse";
import type { GeneratedDataset } from "./types";

function toCsv(rows: object[]): string {
  if (rows.length === 0) return "";
  return Papa.unparse(rows);
}

export async function buildZip(dataset: GeneratedDataset): Promise<Blob> {
  const zip = new JSZip();

  zip.file("manifest.csv", toCsv(dataset.manifest));
  zip.file("orgs.csv", toCsv(dataset.orgs));
  zip.file("users.csv", toCsv(dataset.users));
  zip.file("courses.csv", toCsv(dataset.courses));
  zip.file("classes.csv", toCsv(dataset.classes));
  zip.file("enrollments.csv", toCsv(dataset.enrollments));
  zip.file("academicSessions.csv", toCsv(dataset.academicSessions));

  if (dataset.demographics.length > 0) {
    zip.file("demographics.csv", toCsv(dataset.demographics));
  }

  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

export async function readZip(file: File): Promise<Record<string, string>> {
  const zip = await JSZip.loadAsync(file);
  const result: Record<string, string> = {};

  const entries = Object.entries(zip.files);
  await Promise.all(
    entries.map(async ([name, zipEntry]) => {
      if (zipEntry.dir) return;
      // Strip any directory prefix — vendors sometimes nest files
      const baseName = name.split("/").pop()!;
      result[baseName] = await zipEntry.async("string");
    })
  );

  return result;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
