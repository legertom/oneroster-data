export type FieldDef = {
  required: boolean;
  type: "string" | "enum" | "boolean" | "date" | "sourcedIdRef" | "sourcedIdList" | "gradeList";
  values?: readonly string[];
  refFile?: string;
};

export type FileSchemaDef = {
  required: boolean; // whether the file itself is required in a bulk sync
  fields: Record<string, FieldDef>;
};

const STATUS_FIELD: FieldDef = { required: false, type: "enum", values: ["active", "tobedeleted"] };
const DATE_FIELD: FieldDef = { required: false, type: "date" };
const BOOL_FIELD: FieldDef = { required: false, type: "boolean" };
const OPTIONAL_STR: FieldDef = { required: false, type: "string" };
const REQUIRED_STR: FieldDef = { required: true, type: "string" };

const USER_ROLES = ["administrator", "aide", "guardian", "parent", "proctor", "relative", "student", "teacher"] as const;
// enrollments.csv uses a restricted role vocabulary per OneRoster 1.1 §4.13.5
const ENROLLMENT_ROLES = ["administrator", "proctor", "student", "teacher"] as const;
const GRADE_LIST: FieldDef = { required: false, type: "gradeList" };

export const FILE_SCHEMA: Record<string, FileSchemaDef> = {
  "manifest.csv": {
    required: true,
    fields: {
      propertyName: REQUIRED_STR,
      propertyValue: REQUIRED_STR,
    },
  },

  "orgs.csv": {
    required: true,
    fields: {
      sourcedId: REQUIRED_STR,
      status: STATUS_FIELD,
      dateLastModified: DATE_FIELD,
      name: REQUIRED_STR,
      type: { required: true, type: "enum", values: ["district", "school", "local", "state", "national"] },
      identifier: OPTIONAL_STR,
      parentSourcedId: { required: false, type: "sourcedIdRef", refFile: "orgs.csv" },
    },
  },

  "users.csv": {
    required: true,
    fields: {
      sourcedId: REQUIRED_STR,
      status: STATUS_FIELD,
      dateLastModified: DATE_FIELD,
      enabledUser: { required: true, type: "boolean" },
      orgSourcedIds: { required: true, type: "sourcedIdList", refFile: "orgs.csv" },
      role: { required: true, type: "enum", values: USER_ROLES },
      username: REQUIRED_STR,
      userIds: OPTIONAL_STR,
      givenName: REQUIRED_STR,
      familyName: REQUIRED_STR,
      middleName: OPTIONAL_STR,
      identifier: OPTIONAL_STR,
      email: OPTIONAL_STR,
      sms: OPTIONAL_STR,
      phone: OPTIONAL_STR,
      agentSourcedIds: OPTIONAL_STR,
      grades: GRADE_LIST,
      password: OPTIONAL_STR,
    },
  },

  "courses.csv": {
    required: true,
    fields: {
      sourcedId: REQUIRED_STR,
      status: STATUS_FIELD,
      dateLastModified: DATE_FIELD,
      schoolYearSourcedId: { required: false, type: "sourcedIdRef", refFile: "academicSessions.csv" },
      title: REQUIRED_STR,
      courseCode: OPTIONAL_STR,
      grades: GRADE_LIST,
      orgSourcedId: { required: true, type: "sourcedIdRef", refFile: "orgs.csv" },
      subjects: OPTIONAL_STR,
      subjectCodes: OPTIONAL_STR,
    },
  },

  "classes.csv": {
    required: true,
    fields: {
      sourcedId: REQUIRED_STR,
      status: STATUS_FIELD,
      dateLastModified: DATE_FIELD,
      title: REQUIRED_STR,
      grades: GRADE_LIST,
      courseSourcedId: { required: true, type: "sourcedIdRef", refFile: "courses.csv" },
      classCode: OPTIONAL_STR,
      classType: { required: true, type: "enum", values: ["homeroom", "scheduled"] },
      location: OPTIONAL_STR,
      schoolSourcedId: { required: true, type: "sourcedIdRef", refFile: "orgs.csv" },
      termSourcedIds: { required: true, type: "sourcedIdList", refFile: "academicSessions.csv" },
      subjects: OPTIONAL_STR,
      subjectCodes: OPTIONAL_STR,
      periods: OPTIONAL_STR,
    },
  },

  "enrollments.csv": {
    required: true,
    fields: {
      sourcedId: REQUIRED_STR,
      status: STATUS_FIELD,
      dateLastModified: DATE_FIELD,
      classSourcedId: { required: true, type: "sourcedIdRef", refFile: "classes.csv" },
      schoolSourcedId: { required: true, type: "sourcedIdRef", refFile: "orgs.csv" },
      userSourcedId: { required: true, type: "sourcedIdRef", refFile: "users.csv" },
      role: { required: true, type: "enum", values: ENROLLMENT_ROLES },
      primary: { required: false, type: "boolean" },
      beginDate: DATE_FIELD,
      endDate: DATE_FIELD,
    },
  },

  "academicSessions.csv": {
    required: true,
    fields: {
      sourcedId: REQUIRED_STR,
      status: STATUS_FIELD,
      dateLastModified: DATE_FIELD,
      title: REQUIRED_STR,
      type: { required: true, type: "enum", values: ["gradingPeriod", "semester", "schoolYear", "term"] },
      startDate: { required: true, type: "date" },
      endDate: { required: true, type: "date" },
      parentSourcedId: { required: false, type: "sourcedIdRef", refFile: "academicSessions.csv" },
      schoolYear: REQUIRED_STR,
    },
  },

  "demographics.csv": {
    required: false,
    fields: {
      sourcedId: REQUIRED_STR,
      status: STATUS_FIELD,
      dateLastModified: DATE_FIELD,
      birthDate: DATE_FIELD,
      sex: { required: false, type: "enum", values: ["male", "female", ""] },
      americanIndianOrAlaskaNative: BOOL_FIELD,
      asian: BOOL_FIELD,
      blackOrAfricanAmerican: BOOL_FIELD,
      nativeHawaiianOrOtherPacificIslander: BOOL_FIELD,
      white: BOOL_FIELD,
      demographicRaceTwoOrMoreRaces: BOOL_FIELD,
      hispanicOrLatinoEthnicity: BOOL_FIELD,
      countryOfBirthCode: OPTIONAL_STR,
      stateOfBirthAbbreviation: OPTIONAL_STR,
      cityOfBirth: OPTIONAL_STR,
      publicSchoolResidenceStatus: OPTIONAL_STR,
    },
  },
};

export const REQUIRED_FILES = Object.entries(FILE_SCHEMA)
  .filter(([, def]) => def.required)
  .map(([name]) => name);

// Files that must be present if manifest says "bulk" or "delta"
export const MANIFEST_FILE_KEYS: Record<string, string> = {
  "file.academicSessions": "academicSessions.csv",
  "file.classes": "classes.csv",
  "file.courses": "courses.csv",
  "file.demographics": "demographics.csv",
  "file.enrollments": "enrollments.csv",
  "file.orgs": "orgs.csv",
  "file.users": "users.csv",
  "file.categories": "categories.csv",
  "file.lineItems": "lineItems.csv",
  "file.results": "results.csv",
};
