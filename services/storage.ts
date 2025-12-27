import { Student, Question, ExamConfig, EXAMPLE_CONFIG, Answer } from '../types';

const KEYS = {
  STUDENTS: 'graha_cbt_students',
  QUESTIONS: 'graha_cbt_questions',
  CONFIG: 'graha_cbt_config',
  SUBJECTS: 'graha_cbt_subjects', // New Key
};

// --- Mock Data Seeding ---

const MOCK_QUESTIONS: Question[] = [
  {
    id: 'q1',
    type: 'multiple_choice',
    subject: 'IPS',
    text: 'Ibu kota negara Indonesia yang baru bernama...',
    points: 10,
    options: ['Jakarta', 'Nusantara', 'Bandung', 'Surabaya'],
    correctOptions: [1]
  },
  {
    id: 'q2',
    type: 'multi_select',
    subject: 'IPA',
    text: 'Manakah dari berikut ini yang merupakan hewan mamalia? (Pilih lebih dari satu)',
    points: 10,
    options: ['Ayam', 'Kucing', 'Sapi', 'Buaya'],
    correctOptions: [1, 2]
  },
  {
    id: 'q3',
    type: 'ordering',
    subject: 'IPA',
    text: 'Urutkan tahapan metamorfosis kupu-kupu dengan benar.',
    points: 15,
    orderItems: ['Telur', 'Ulat (Larva)', 'Kepompong (Pupa)', 'Kupu-kupu']
  },
  {
    id: 'q4',
    type: 'matching',
    subject: 'IPS',
    text: 'Pasangkan nama provinsi dengan ibu kotanya.',
    points: 15,
    matches: [
      { left: 'Jawa Barat', right: 'Bandung' },
      { left: 'Jawa Timur', right: 'Surabaya' },
      { left: 'Bali', right: 'Denpasar' }
    ]
  },
  {
    id: 'q5',
    type: 'essay',
    subject: 'Bahasa Indonesia',
    text: 'Jelaskan mengapa kita harus menjaga kebersihan lingkungan!',
    points: 20,
    keywords: ['sehat', 'banjir', 'nyaman', 'penyakit']
  },
  {
    id: 'q6',
    type: 'multiple_choice',
    subject: 'Matematika',
    text: 'Hasil dari 12 x 5 adalah...',
    points: 10,
    options: ['50', '55', '60', '65'],
    correctOptions: [2]
  }
];

const DEFAULT_SUBJECTS = ['Matematika', 'Bahasa Indonesia', 'IPA', 'IPS', 'PKN', 'Bahasa Inggris'];

// --- Service Functions ---

export const getExamConfig = (): ExamConfig => {
  const stored = localStorage.getItem(KEYS.CONFIG);
  if (stored) {
    const parsed = JSON.parse(stored);
    // Ensure structure compatibility
    return { ...EXAMPLE_CONFIG, ...parsed, subjectSchedules: parsed.subjectSchedules || [] };
  }
  return EXAMPLE_CONFIG;
};

export const saveExamConfig = (config: ExamConfig) => {
  localStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
};

export const getStudents = (): Student[] => {
  const stored = localStorage.getItem(KEYS.STUDENTS);
  return stored ? JSON.parse(stored) : [];
};

export const saveStudent = (student: Student) => {
  const students = getStudents();
  const idx = students.findIndex(s => s.id === student.id);
  if (idx >= 0) {
    students[idx] = student;
  } else {
    students.push(student);
  }
  localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
};

export const deleteStudent = (id: string) => {
  const students = getStudents().filter(s => s.id !== id);
  localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
};

export const getQuestions = (): Question[] => {
  const stored = localStorage.getItem(KEYS.QUESTIONS);
  if (!stored) {
    localStorage.setItem(KEYS.QUESTIONS, JSON.stringify(MOCK_QUESTIONS));
    return MOCK_QUESTIONS;
  }
  return JSON.parse(stored);
};

export const saveQuestion = (question: Question) => {
  const questions = getQuestions();
  const idx = questions.findIndex(q => q.id === question.id);
  if (idx >= 0) {
    questions[idx] = question;
  } else {
    questions.push(question);
  }
  localStorage.setItem(KEYS.QUESTIONS, JSON.stringify(questions));
};

export const deleteQuestion = (id: string) => {
  // Use String conversion to ensure ID comparison works even if types mismatch
  const questions = getQuestions().filter(q => String(q.id) !== String(id));
  localStorage.setItem(KEYS.QUESTIONS, JSON.stringify(questions));
};

// --- Subject Management ---

export const getSubjects = (): string[] => {
  const stored = localStorage.getItem(KEYS.SUBJECTS);
  if (!stored) {
    localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(DEFAULT_SUBJECTS));
    return DEFAULT_SUBJECTS;
  }
  return JSON.parse(stored);
};

export const saveSubjects = (subjects: string[]) => {
  localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(subjects));
};

export const generateCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// --- Analysis Logic ---

export const evaluateAnswer = (question: Question, ans: Answer): number => {
  let score = 0;

  if (question.type === 'multiple_choice') {
    if (ans.selectedOptions && ans.selectedOptions[0] === question.correctOptions?.[0]) {
      score = question.points;
    }
  } else if (question.type === 'multi_select') {
    const correctSet = new Set(question.correctOptions);
    const answerSet = new Set(ans.selectedOptions);
    // Strict equality for points: must select ALL correct and NO incorrect
    if (correctSet.size === answerSet.size && [...correctSet].every(x => answerSet.has(x))) {
      score = question.points;
    }
  } else if (question.type === 'ordering') {
    // Check if orderSequence matches [0, 1, 2, 3...] which means it matches the 'orderItems' array definition
    const isCorrect = ans.orderSequence?.every((val, index) => val === index);
    if (isCorrect && ans.orderSequence?.length === question.orderItems?.length) {
      score = question.points;
    }
  } else if (question.type === 'matching') {
    let correctPairs = 0;
    const totalPairs = question.matches?.length || 0;
    ans.pairs?.forEach(p => {
      if (p.leftIndex === p.rightIndex) correctPairs++;
    });
    if (totalPairs > 0) {
      score = (correctPairs / totalPairs) * question.points;
    }
  } else if (question.type === 'essay') {
    // Keyword based auto-grading
    if (question.keywords && question.keywords.length > 0) {
      const userText = (ans.textAnswer || '').toLowerCase();
      let matches = 0;
      
      question.keywords.forEach(keyword => {
        if (userText.includes(keyword.toLowerCase())) {
          matches++;
        }
      });
      
      // Calculate partial score ratio
      const ratio = matches / question.keywords.length;
      // Cap at 1.0 (100%)
      const finalRatio = Math.min(ratio, 1);
      
      score = Math.round(finalRatio * question.points);
    } else {
      // Fallback if no keywords defined: Simple length check
      if ((ans.textAnswer?.length || 0) > 10) {
        score = question.points;
      }
    }
  }

  return score;
};

export const calculateScore = (student: Student, questions: Question[]): number => {
  let totalScore = 0;
  
  student.answers.forEach(ans => {
    const question = questions.find(q => q.id === ans.questionId);
    if (!question) return;
    totalScore += evaluateAnswer(question, ans);
  });

  return Math.round(totalScore);
};