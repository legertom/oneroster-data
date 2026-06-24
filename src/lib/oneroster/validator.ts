import Papa from "papaparse";
import type { ValidationIssue, FileValidationResult, ValidationSummary } from "./types";
import { FILE_SCHEMA, MANIFEST_FILE_KEYS } from "./schema";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const BOOL_VALUES = new Set(["true", "false"]);

function parseCSV(text: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  });
  return result.data;
}

function validateFile(
  fileName: string,
  rows: Record<string, string>[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schemaDef: (typeof FILE_SCHEMA)[string]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (rows.length === 0) {
    issues.push({ message: "File is empty (no data rows)", severity: "warning" });
    return issues;
  }

  const headers = Object.keys(rows[0]);
  const schemaFields = Object.keys(schemaDef.fields);

  // Check required columns exist
  for (const field of schemaFields) {
    if (schemaDef.fields[field].required && !headers.includes(field)) {
      issues.push({ column: field, message: `Required column "${field}" is missing`, severity: "error" });
    }
  }

  // Per-row validation
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header row

    for (const [field, def] of Object.entries(schemaDef.fields)) {
      const value = row[field];

      if (value === undefined) continue; // column missing entirely — already caught above

      if (def.required && (value === "" || value === null)) {
        issues.push({ row: rowNum, column: field, message: `Required field "${field}" is empty`, severity: "error" });
        continue;
      }

      if (!value) continue; // optional empty value is fine

      if (def.type === "date") {
        if (!DATE_RE.test(value)) {
          issues.push({ row: rowNum, column: field, message: `"${field}" value "${value}" is not a valid ISO date (YYYY-MM-DD)`, severity: "error" });
        }
      } else if (def.type === "boolean") {
        if (!BOOL_VALUES.has(value.toLowerCase())) {
          issues.push({ row: rowNum, column: field, message: `"${field}" must be "true" or "false", got "${value}"`, severity: "error" });
        }
      } else if (def.type === "enum" && def.values) {
        if (!def.values.includes(value)) {
          issues.push({ row: rowNum, column: field, message: `"${field}" has invalid value "${value}". Expected one of: ${def.values.join(", ")}`, severity: "error" });
        }
      }
      // sourcedIdRef and sourcedIdList referential checks done in cross-file pass
    }

    // Warn on unknown columns (only once, not per row)
    if (i === 0) {
      for (const col of headers) {
        if (!schemaFields.includes(col) && col !== "") {
          issues.push({ column: col, message: `Unknown column "${col}" (not in OneRoster 1.1 spec)`, severity: "warning" });
        }
      }
    }
  }

  return issues;
}

function buildIdSet(rows: Record<string, string>[]): Set<string> {
  return new Set(rows.map((r) => r.sourcedId).filter(Boolean));
}

function checkRefs(
  sourceFile: string,
  rows: Record<string, string>[],
  field: string,
  targetFile: string,
  targetIds: Set<string>,
  isList: boolean,
  issues: ValidationIssue[]
) {
  for (let i = 0; i < rows.length; i++) {
    const value = rows[i][field];
    if (!value) continue;
    const ids = isList ? value.split(",").map((v) => v.trim()) : [value.trim()];
    for (const id of ids) {
      if (id && !targetIds.has(id)) {
        issues.push({
          row: i + 2,
          column: field,
          message: `[${sourceFile}] Row ${i + 2} "${field}" references unknown ${targetFile} sourcedId "${id}"`,
          severity: "error",
        });
      }
    }
  }
}

export async function validateZip(
  files: Record<string, string>
): Promise<ValidationSummary> {
  const fileNames = Object.keys(files);
  const fileResults: FileValidationResult[] = [];
  const referentialErrors: ValidationIssue[] = [];

  // ── Manifest check ────────────────────────────────────────────────────────
  if (!files["manifest.csv"]) {
    fileResults.push({
      fileName: "manifest.csv",
      status: "error",
      rowCount: 0,
      issues: [{ message: "manifest.csv is missing from the zip", severity: "error" }],
    });
  } else {
    const manifestRows = parseCSV(files["manifest.csv"]);
    const manifestMap: Record<string, string> = {};
    for (const row of manifestRows) {
      manifestMap[row.propertyName] = row.propertyValue;
    }

    const manifestIssues: ValidationIssue[] = [];

    if (!manifestMap["oneroster.version"]) {
      manifestIssues.push({ message: 'Missing required property "oneroster.version"', severity: "error" });
    } else if (manifestMap["oneroster.version"] !== "1.1") {
      manifestIssues.push({ message: `oneroster.version is "${manifestMap["oneroster.version"]}", expected "1.1"`, severity: "warning" });
    }

    // Check that files declared as bulk/delta actually exist
    for (const [propName, csvFile] of Object.entries(MANIFEST_FILE_KEYS)) {
      const presence = manifestMap[propName];
      if ((presence === "bulk" || presence === "delta") && !files[csvFile]) {
        manifestIssues.push({
          message: `manifest.csv declares "${propName}" as "${presence}" but ${csvFile} is not in the zip`,
          severity: "error",
        });
      }
      if (presence === undefined) {
        manifestIssues.push({
          message: `manifest.csv is missing entry for "${propName}"`,
          severity: "warning",
        });
      }
    }

    fileResults.push({
      fileName: "manifest.csv",
      status: manifestIssues.some((i) => i.severity === "error") ? "error" : manifestIssues.length > 0 ? "warning" : "valid",
      rowCount: manifestRows.length,
      issues: manifestIssues,
    });
  }

  // ── Parse all present CSVs ────────────────────────────────────────────────
  const parsedFiles: Record<string, Record<string, string>[]> = {};
  for (const [name, content] of Object.entries(files)) {
    if (name === "manifest.csv") continue;
    parsedFiles[name] = parseCSV(content);
  }

  // ── Per-file schema validation ────────────────────────────────────────────
  for (const [fileName, schemaDef] of Object.entries(FILE_SCHEMA)) {
    if (fileName === "manifest.csv") continue;

    if (!files[fileName]) {
      if (schemaDef.required) {
        fileResults.push({
          fileName,
          status: "error",
          rowCount: 0,
          issues: [{ message: `Required file "${fileName}" is missing from the zip`, severity: "error" }],
        });
      }
      continue;
    }

    const rows = parsedFiles[fileName] ?? [];
    const issues = validateFile(fileName, rows, schemaDef);

    fileResults.push({
      fileName,
      status: issues.some((i) => i.severity === "error") ? "error" : issues.some((i) => i.severity === "warning") ? "warning" : "valid",
      rowCount: rows.length,
      issues,
    });
  }

  // Warn on unexpected files in zip
  for (const name of fileNames) {
    if (name === "manifest.csv") continue;
    if (!FILE_SCHEMA[name]) {
      fileResults.push({
        fileName: name,
        status: "warning",
        rowCount: parsedFiles[name]?.length ?? 0,
        issues: [{ message: `File "${name}" is not a recognized OneRoster 1.1 CSV file`, severity: "warning" }],
      });
    }
  }

  // ── Referential integrity ─────────────────────────────────────────────────
  const idSets: Record<string, Set<string>> = {};
  for (const [name, rows] of Object.entries(parsedFiles)) {
    idSets[name] = buildIdSet(rows);
  }

  for (const [fileName, schemaDef] of Object.entries(FILE_SCHEMA)) {
    if (fileName === "manifest.csv") continue;
    const rows = parsedFiles[fileName];
    if (!rows) continue;

    for (const [field, def] of Object.entries(schemaDef.fields)) {
      if (def.type !== "sourcedIdRef" && def.type !== "sourcedIdList") continue;
      const refFile = def.refFile!;
      const targetIds = idSets[refFile];
      if (!targetIds) continue; // target file missing — already flagged

      checkRefs(fileName, rows, field, refFile, targetIds, def.type === "sourcedIdList", referentialErrors);
    }
  }

  const totalErrors =
    fileResults.reduce((n, f) => n + f.issues.filter((i) => i.severity === "error").length, 0) + referentialErrors.filter((i) => i.severity === "error").length;
  const totalWarnings =
    fileResults.reduce((n, f) => n + f.issues.filter((i) => i.severity === "warning").length, 0) + referentialErrors.filter((i) => i.severity === "warning").length;

  return {
    totalErrors,
    totalWarnings,
    filesChecked: fileResults.length,
    fileResults,
    referentialErrors,
  };
}
