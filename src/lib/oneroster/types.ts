export type Status = "active" | "tobedeleted";
export type OrgType = "district" | "school" | "local" | "state" | "national";
export type UserRole =
  | "administrator"
  | "aide"
  | "guardian"
  | "parent"
  | "proctor"
  | "relative"
  | "student"
  | "teacher";
export type ClassType = "homeroom" | "scheduled";
export type SessionType = "gradingPeriod" | "semester" | "schoolYear" | "term";
export type EnrollmentRole = UserRole;
export type Sex = "male" | "female";

export const VALID_GRADES = [
  "UI",
  "PK",
  "TK",
  "KG",
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
  "13",
] as const;
export type Grade = (typeof VALID_GRADES)[number];

export interface OrgRow {
  sourcedId: string;
  status: Status;
  dateLastModified: string;
  name: string;
  type: OrgType;
  identifier: string;
  parentSourcedId: string;
}

export interface UserRow {
  sourcedId: string;
  status: Status;
  dateLastModified: string;
  enabledUser: "true" | "false";
  orgSourcedIds: string;
  role: UserRole;
  username: string;
  userIds: string;
  givenName: string;
  familyName: string;
  middleName: string;
  identifier: string;
  email: string;
  sms: string;
  phone: string;
  agentSourcedIds: string;
  grades: string;
  password: string;
}

export interface CourseRow {
  sourcedId: string;
  status: Status;
  dateLastModified: string;
  schoolYearSourcedId: string;
  title: string;
  courseCode: string;
  grades: string;
  orgSourcedId: string;
  subjects: string;
  subjectCodes: string;
}

export interface ClassRow {
  sourcedId: string;
  status: Status;
  dateLastModified: string;
  title: string;
  grades: string;
  courseSourcedId: string;
  classCode: string;
  classType: ClassType;
  location: string;
  schoolSourcedId: string;
  termSourcedIds: string;
  subjects: string;
  subjectCodes: string;
  periods: string;
}

export interface EnrollmentRow {
  sourcedId: string;
  status: Status;
  dateLastModified: string;
  classSourcedId: string;
  schoolSourcedId: string;
  userSourcedId: string;
  role: EnrollmentRole;
  primary: "true" | "false";
  beginDate: string;
  endDate: string;
}

export interface AcademicSessionRow {
  sourcedId: string;
  status: Status;
  dateLastModified: string;
  title: string;
  type: SessionType;
  startDate: string;
  endDate: string;
  parentSourcedId: string;
  schoolYear: string;
}

export interface DemographicsRow {
  sourcedId: string;
  status: Status;
  dateLastModified: string;
  birthDate: string;
  sex: Sex | "";
  americanIndianOrAlaskaNative: "true" | "false" | "";
  asian: "true" | "false" | "";
  blackOrAfricanAmerican: "true" | "false" | "";
  nativeHawaiianOrOtherPacificIslander: "true" | "false" | "";
  white: "true" | "false" | "";
  demographicRaceTwoOrMoreRaces: "true" | "false" | "";
  hispanicOrLatinoEthnicity: "true" | "false" | "";
  countryOfBirthCode: string;
  stateOfBirthAbbreviation: string;
  cityOfBirth: string;
  publicSchoolResidenceStatus: string;
}

export interface ManifestEntry {
  propertyName: string;
  propertyValue: string;
}

export type FilePresence = "absent" | "bulk" | "delta";

// "traditional" = Fall + Spring terms; "yearRound" = one continuous 12-month
// term so that today always falls within an active term (guaranteed current
// classes regardless of when the data is generated).
export type TermStructure = "traditional" | "yearRound";

export interface GeneratorConfig {
  numSchools: number;
  studentsPerSchool: number;
  grades: Grade[];
  academicYear: number; // e.g. 2025 means 2025-2026
  coursesPerSchool: number;
  includeDemographics: boolean;
  termStructure: TermStructure;
}

export interface GeneratedDataset {
  manifest: ManifestEntry[];
  orgs: OrgRow[];
  users: UserRow[];
  courses: CourseRow[];
  classes: ClassRow[];
  enrollments: EnrollmentRow[];
  academicSessions: AcademicSessionRow[];
  demographics: DemographicsRow[];
}

// ── Validator types ────────────────────────────────────────────────────────

export type Severity = "error" | "warning";

export interface ValidationIssue {
  row?: number;
  column?: string;
  message: string;
  severity: Severity;
}

export interface FileValidationResult {
  fileName: string;
  status: "valid" | "error" | "warning" | "skipped";
  rowCount: number;
  issues: ValidationIssue[];
}

export interface ValidationSummary {
  totalErrors: number;
  totalWarnings: number;
  filesChecked: number;
  fileResults: FileValidationResult[];
  referentialErrors: ValidationIssue[];
}
