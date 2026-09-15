export interface TimetableEntry {
  id: string;
  day: number; // 0 = Monday … 4 = Friday
  startTime: string; // "HH:MM" 24h
  endTime: string; // "HH:MM" 24h
  subject: string; // user-facing name
  courseCode: string;
  sections: string[];
  batch?: string | null;
  room: string;
}

export const OFFICE_HOURS = { start: "08:45", end: "16:15" };

export const MORNING_BREAK = { start: "10:40", end: "10:50" };
export const AFTERNOON_BREAK = { start: "14:20", end: "14:30" };

export const SUBJECT_MAP: Record<string, string> = {
  CSA1504_P: "Web Design Lab",
  CSA4201: "Data Structures",
  CSA4301: "Data Structures",
  CSA4705_P: "Node.js",
};

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** Merged-cell periods, exactly as provided. Do not split into 1-hour events. */
export const TIMETABLE: TimetableEntry[] = [
  // Monday (index 0)
  {
    id: "mon-wdl-1bcads01",
    day: 0,
    startTime: "12:35",
    endTime: "14:20",
    subject: SUBJECT_MAP.CSA1504_P,
    courseCode: "CSA1504_P",
    sections: ["1BCADS01"],
    batch: "B2",
    room: "DIVL03a",
  },
  {
    id: "mon-nodejs-c6",
    day: 0,
    startTime: "14:30",
    endTime: "16:15",
    subject: SUBJECT_MAP.CSA4705_P,
    courseCode: "CSA4705_P",
    sections: ["3MCA01", "3MCA02", "3MCA03", "3MCA04", "3MCA05", "3MCA06"],
    batch: "C6",
    room: "DFL03a",
  },

  // Tuesday (index 1)
  {
    id: "tue-ds-1mca04",
    day: 1,
    startTime: "08:50",
    endTime: "09:45",
    subject: SUBJECT_MAP.CSA4201,
    courseCode: "CSA4201",
    sections: ["1MCA04"],
    batch: null,
    room: "MT01",
  },
  {
    id: "tue-ds-b1",
    day: 1,
    startTime: "10:50",
    endTime: "13:25",
    subject: SUBJECT_MAP.CSA4301,
    courseCode: "CSA4301",
    sections: ["1MCA04"],
    batch: "B1",
    room: "LFL02",
  },

  // Wednesday (index 2)
  {
    id: "wed-wdl-1bca04",
    day: 2,
    startTime: "08:50",
    endTime: "10:40",
    subject: SUBJECT_MAP.CSA1504_P,
    courseCode: "CSA1504_P",
    sections: ["1BCA04"],
    batch: "B2",
    room: "DIVL04a",
  },
  {
    id: "wed-wdl-1bcads01",
    day: 2,
    startTime: "12:35",
    endTime: "14:20",
    subject: SUBJECT_MAP.CSA1504_P,
    courseCode: "CSA1504_P",
    sections: ["1BCADS01"],
    batch: "B2",
    room: "DIVL03a",
  },

  // Thursday (index 3)
  {
    id: "thu-ds-1mca04",
    day: 3,
    startTime: "14:30",
    endTime: "15:25",
    subject: SUBJECT_MAP.CSA4201,
    courseCode: "CSA4201",
    sections: ["1MCA04"],
    batch: null,
    room: "MT01",
  },

  // Friday (index 4)
  {
    id: "fri-wdl-1bca04",
    day: 4,
    startTime: "12:35",
    endTime: "14:20",
    subject: SUBJECT_MAP.CSA1504_P,
    courseCode: "CSA1504_P",
    sections: ["1BCA04"],
    batch: "B2",
    room: "DIVL01a",
  },
  {
    id: "fri-ds-1mca04",
    day: 4,
    startTime: "14:30",
    endTime: "15:25",
    subject: SUBJECT_MAP.CSA4201,
    courseCode: "CSA4201",
    sections: ["1MCA04"],
    batch: null,
    room: "MT02",
  },
];
