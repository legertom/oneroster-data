import { faker } from "@faker-js/faker";
import type {
  GeneratorConfig,
  GeneratedDataset,
  OrgRow,
  UserRow,
  CourseRow,
  ClassRow,
  EnrollmentRow,
  AcademicSessionRow,
  DemographicsRow,
  ManifestEntry,
  Grade,
} from "./types";

const isoDate = (d: Date) => d.toISOString().split("T")[0];
const NOW = isoDate(new Date());

function uid() {
  return faker.string.uuid();
}

const SUBJECTS = [
  { name: "Mathematics", code: "MAT" },
  { name: "English Language Arts", code: "ELA" },
  { name: "Science", code: "SCI" },
  { name: "Social Studies", code: "SOC" },
  { name: "Physical Education", code: "PE" },
  { name: "Art", code: "ART" },
  { name: "Music", code: "MUS" },
  { name: "Computer Science", code: "CS" },
  { name: "Foreign Language", code: "FL" },
  { name: "Health", code: "HLT" },
];

const GRADE_LABELS: Record<string, string> = {
  KG: "Kindergarten",
  "01": "1st Grade",
  "02": "2nd Grade",
  "03": "3rd Grade",
  "04": "4th Grade",
  "05": "5th Grade",
  "06": "6th Grade",
  "07": "7th Grade",
  "08": "8th Grade",
  "09": "9th Grade",
  "10": "10th Grade",
  "11": "11th Grade",
  "12": "12th Grade",
};

function gradeLabel(g: string) {
  return GRADE_LABELS[g] ?? `Grade ${g}`;
}

export function generateDataset(config: GeneratorConfig): GeneratedDataset {
  faker.seed(42); // deterministic output for the same config

  const {
    numSchools,
    studentsPerSchool,
    grades,
    academicYear,
    coursesPerSchool,
    includeDemographics,
  } = config;

  // Term dates. Note: Clever drops any class whose term startDate is in the
  // future, which cascades to dropping all enrollments. Callers should default
  // academicYear to a school year that has already started.
  const yearStart = new Date(`${academicYear}-08-15`);
  const fallEnd = new Date(`${academicYear}-12-20`);
  const springStart = new Date(`${academicYear + 1}-01-08`);
  const yearEnd = new Date(`${academicYear + 1}-06-30`);

  // ── Academic sessions ───────────────────────────────────────────────────
  const schoolYearId = uid();
  const fallTermId = uid();
  const springTermId = uid();

  const academicSessions: AcademicSessionRow[] = [
    {
      sourcedId: schoolYearId,
      status: "active",
      dateLastModified: NOW,
      title: `${academicYear}-${academicYear + 1} School Year`,
      type: "schoolYear",
      startDate: isoDate(yearStart),
      endDate: isoDate(yearEnd),
      parentSourcedId: "",
      schoolYear: String(academicYear + 1),
    },
    {
      sourcedId: fallTermId,
      status: "active",
      dateLastModified: NOW,
      title: `Fall ${academicYear}`,
      type: "semester",
      startDate: isoDate(yearStart),
      endDate: isoDate(fallEnd),
      parentSourcedId: schoolYearId,
      schoolYear: String(academicYear + 1),
    },
    {
      sourcedId: springTermId,
      status: "active",
      dateLastModified: NOW,
      title: `Spring ${academicYear + 1}`,
      type: "semester",
      startDate: isoDate(springStart),
      endDate: isoDate(yearEnd),
      parentSourcedId: schoolYearId,
      schoolYear: String(academicYear + 1),
    },
  ];

  // ── District org ─────────────────────────────────────────────────────────
  const districtId = uid();
  const districtName = `${faker.location.city()} Unified School District`;
  const orgs: OrgRow[] = [
    {
      sourcedId: districtId,
      status: "active",
      dateLastModified: NOW,
      name: districtName,
      type: "district",
      identifier: faker.string.alphanumeric(8).toUpperCase(),
      parentSourcedId: "",
    },
  ];

  const schoolIds: string[] = [];
  for (let i = 0; i < numSchools; i++) {
    const schoolId = uid();
    schoolIds.push(schoolId);
    orgs.push({
      sourcedId: schoolId,
      status: "active",
      dateLastModified: NOW,
      name: `${faker.person.lastName()} ${i < numSchools / 2 ? "Elementary" : "Middle"} School`,
      type: "school",
      identifier: faker.string.alphanumeric(6).toUpperCase(),
      parentSourcedId: districtId,
    });
  }

  // ── Courses (per school) ─────────────────────────────────────────────────
  const courses: CourseRow[] = [];
  // Map schoolId -> array of courseIds
  const schoolCourseIds: Record<string, string[]> = {};

  for (const schoolId of schoolIds) {
    schoolCourseIds[schoolId] = [];
    const subjectPool = faker.helpers.shuffle([...SUBJECTS]).slice(0, coursesPerSchool);
    for (const subject of subjectPool) {
      const courseId = uid();
      schoolCourseIds[schoolId].push(courseId);
      courses.push({
        sourcedId: courseId,
        status: "active",
        dateLastModified: NOW,
        schoolYearSourcedId: schoolYearId,
        title: subject.name,
        courseCode: `${subject.code}-${faker.string.numeric(3)}`,
        grades: grades.join(","),
        orgSourcedId: districtId,
        subjects: subject.name,
        subjectCodes: subject.code,
      });
    }
  }

  // ── Classes (one per course per school, one per term) ────────────────────
  const classes: ClassRow[] = [];
  // Map schoolId -> array of classIds (for enrollment)
  const schoolClassMap: Record<string, { classId: string; courseId: string; grade: Grade }[]> = {};

  for (const schoolId of schoolIds) {
    schoolClassMap[schoolId] = [];
    const courseIds = schoolCourseIds[schoolId];
    const terms = [fallTermId, springTermId];

    for (const courseId of courseIds) {
      const course = courses.find((c) => c.sourcedId === courseId)!;
      for (const termId of terms) {
        const grade = faker.helpers.arrayElement(grades);
        const classId = uid();
        schoolClassMap[schoolId].push({ classId, courseId, grade });
        classes.push({
          sourcedId: classId,
          status: "active",
          dateLastModified: NOW,
          title: `${course.title} - ${gradeLabel(grade)} (${termId === fallTermId ? "Fall" : "Spring"})`,
          grades: grade,
          courseSourcedId: courseId,
          classCode: `${course.courseCode}-${grade}-${classId.slice(0, 6)}`,
          classType: "scheduled",
          location: `Room ${faker.number.int({ min: 100, max: 399 })}`,
          schoolSourcedId: schoolId,
          termSourcedIds: termId,
          subjects: course.subjects,
          subjectCodes: course.subjectCodes,
          periods: String(faker.number.int({ min: 1, max: 8 })),
        });
      }
    }
  }

  // ── Users (teachers + students) ──────────────────────────────────────────
  const users: UserRow[] = [];
  const enrollments: EnrollmentRow[] = [];
  const demographics: DemographicsRow[] = [];

  // Teachers: one per course-school combination (shared across terms)
  const teacherMap: Record<string, string> = {}; // courseId+schoolId -> teacherId

  for (const schoolId of schoolIds) {
    const courseIds = schoolCourseIds[schoolId];
    for (const courseId of courseIds) {
      const teacherId = uid();
      teacherMap[`${courseId}:${schoolId}`] = teacherId;
      const givenName = faker.person.firstName();
      const familyName = faker.person.lastName();
      users.push({
        sourcedId: teacherId,
        status: "active",
        dateLastModified: NOW,
        enabledUser: "true",
        orgSourcedIds: schoolId,
        role: "teacher",
        username: `${givenName.toLowerCase()}.${familyName.toLowerCase()}.${teacherId.slice(0, 8)}`,
        userIds: "",
        givenName,
        familyName,
        middleName: "",
        identifier: faker.string.alphanumeric(8).toUpperCase(),
        email: `${givenName.toLowerCase()}.${familyName.toLowerCase()}.${teacherId.slice(0, 6)}@school.edu`,
        sms: "",
        phone: faker.phone.number(),
        agentSourcedIds: "",
        grades: "",
        password: "",
      });

      // Enroll teacher in both term classes for this course
      const teacherClasses = schoolClassMap[schoolId].filter((c) => c.courseId === courseId);
      for (const { classId } of teacherClasses) {
        enrollments.push({
          sourcedId: uid(),
          status: "active",
          dateLastModified: NOW,
          classSourcedId: classId,
          schoolSourcedId: schoolId,
          userSourcedId: teacherId,
          role: "teacher",
          primary: "true",
          beginDate: isoDate(yearStart),
          endDate: isoDate(yearEnd),
        });
      }
    }
  }

  // Students per school
  for (const schoolId of schoolIds) {
    const classEntries = schoolClassMap[schoolId];

    for (let i = 0; i < studentsPerSchool; i++) {
      const studentId = uid();
      const grade = faker.helpers.arrayElement(grades);
      const givenName = faker.person.firstName();
      const familyName = faker.person.lastName();
      const birthYear = academicYear - (parseInt(grade, 10) || 5) - 5;

      users.push({
        sourcedId: studentId,
        status: "active",
        dateLastModified: NOW,
        enabledUser: "true",
        orgSourcedIds: schoolId,
        role: "student",
        username: `${givenName.toLowerCase()}.${familyName.toLowerCase()}.${studentId.slice(0, 8)}`,
        userIds: "",
        givenName,
        familyName,
        middleName: faker.helpers.maybe(() => faker.person.middleName(), { probability: 0.3 }) ?? "",
        identifier: faker.string.alphanumeric(8).toUpperCase(),
        email: `${givenName.toLowerCase()}.${familyName.toLowerCase()}.${studentId.slice(0, 6)}@students.school.edu`,
        sms: "",
        phone: "",
        agentSourcedIds: "",
        grades: grade,
        password: "",
      });

      // Enroll in 4-6 classes that match their grade (or any grade if few available)
      const gradeClasses = classEntries.filter((c) => c.grade === grade);
      const pool = gradeClasses.length >= 3 ? gradeClasses : classEntries;
      const numClasses = Math.min(faker.number.int({ min: 4, max: 6 }), pool.length);
      const assigned = faker.helpers.arrayElements(pool, numClasses);

      for (const { classId } of assigned) {
        enrollments.push({
          sourcedId: uid(),
          status: "active",
          dateLastModified: NOW,
          classSourcedId: classId,
          schoolSourcedId: schoolId,
          userSourcedId: studentId,
          role: "student",
          primary: "false",
          beginDate: isoDate(yearStart),
          endDate: isoDate(yearEnd),
        });
      }

      // Demographics
      if (includeDemographics) {
        const races = ["americanIndianOrAlaskaNative", "asian", "blackOrAfricanAmerican", "nativeHawaiianOrOtherPacificIslander", "white"] as const;
        const primaryRace = faker.helpers.arrayElement(races);
        const raceValues = Object.fromEntries(races.map((r) => [r, r === primaryRace ? "true" : "false"])) as Record<typeof races[number], "true" | "false">;

        demographics.push({
          sourcedId: studentId,
          status: "active",
          dateLastModified: NOW,
          birthDate: isoDate(new Date(birthYear, faker.number.int({ min: 0, max: 11 }), faker.number.int({ min: 1, max: 28 }))),
          sex: faker.helpers.arrayElement(["male", "female"] as const),
          americanIndianOrAlaskaNative: raceValues.americanIndianOrAlaskaNative,
          asian: raceValues.asian,
          blackOrAfricanAmerican: raceValues.blackOrAfricanAmerican,
          nativeHawaiianOrOtherPacificIslander: raceValues.nativeHawaiianOrOtherPacificIslander,
          white: raceValues.white,
          demographicRaceTwoOrMoreRaces: "false",
          hispanicOrLatinoEthnicity: faker.helpers.arrayElement(["true", "false"] as const),
          countryOfBirthCode: "US",
          stateOfBirthAbbreviation: faker.location.state({ abbreviated: true }),
          cityOfBirth: faker.location.city(),
          publicSchoolResidenceStatus: "",
        });
      }
    }
  }

  // ── Manifest ─────────────────────────────────────────────────────────────
  const manifest: ManifestEntry[] = [
    { propertyName: "manifest.version", propertyValue: "1.0" },
    { propertyName: "oneroster.version", propertyValue: "1.1" },
    { propertyName: "file.academicSessions", propertyValue: "bulk" },
    { propertyName: "file.categories", propertyValue: "absent" },
    { propertyName: "file.classes", propertyValue: "bulk" },
    { propertyName: "file.classResources", propertyValue: "absent" },
    { propertyName: "file.courses", propertyValue: "bulk" },
    { propertyName: "file.courseResources", propertyValue: "absent" },
    { propertyName: "file.demographics", propertyValue: includeDemographics ? "bulk" : "absent" },
    { propertyName: "file.enrollments", propertyValue: "bulk" },
    { propertyName: "file.lineItems", propertyValue: "absent" },
    { propertyName: "file.orgs", propertyValue: "bulk" },
    { propertyName: "file.resources", propertyValue: "absent" },
    { propertyName: "file.results", propertyValue: "absent" },
    { propertyName: "file.users", propertyValue: "bulk" },
  ];

  return {
    manifest,
    orgs,
    users,
    courses,
    classes,
    enrollments,
    academicSessions,
    demographics,
  };
}
