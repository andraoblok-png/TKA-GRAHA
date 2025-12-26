
export type QuestionType = 'multiple_choice' | 'multi_select' | 'matching' | 'ordering' | 'essay';

export interface Question {
  id: string;
  text: string;
  subject?: string; // New: Mata Pelajaran
  imageUrl?: string; // New: Gambar Soal (Base64)
  type: QuestionType;
  points: number;
  // For MC and Multi-Select
  options?: string[];
  correctOptions?: number[]; // indices
  // For Matching (Left side is fixed, Right side needs to be matched)
  matches?: { left: string; right: string }[]; 
  // For Ordering
  orderItems?: string[]; // The correct order
  // For Essay Auto-grading
  keywords?: string[]; // List of required keywords
}

export interface Answer {
  questionId: string;
  // MC/Multi: indices
  selectedOptions?: number[]; 
  // Essay
  textAnswer?: string;
  // Matching: map left index to right index
  pairs?: { leftIndex: number; rightIndex: number }[];
  // Ordering: array of indices representing the user's order
  orderSequence?: number[];
}

export interface Student {
  id: string;
  name: string;
  code: string;
  className: string;
  school: string; // New: Asal Sekolah
  status: 'not_started' | 'in_progress' | 'completed';
  startTime?: number;
  answers: Answer[];
  score: number;
}

export interface SubjectSchedule {
  id: string;
  subject: string;
  scheduledStart: string; // ISO Date String
  scheduledEnd: string;   // ISO Date String
}

export interface ExamConfig {
  title: string;
  durationMinutes: number;
  description: string;
  scheduledStart?: string; // Global start (fallback)
  scheduledEnd?: string;   // Global end (fallback)
  subjectSchedules?: SubjectSchedule[]; // Specific schedules
}

export const EXAMPLE_CONFIG: ExamConfig = {
  title: "TRY OUT TKA SD - GRAHA EDUKASI",
  durationMinutes: 90,
  description: "Tes Kemampuan Akademik untuk persiapan ujian sekolah.",
  scheduledStart: "",
  scheduledEnd: "",
  subjectSchedules: []
};
