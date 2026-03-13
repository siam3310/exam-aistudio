export interface Question {
  id: string;
  text: string;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  answer: 'a' | 'b' | 'c' | 'd';
  className: string;
  subject: string;
  chapter: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt?: any; // Firestore Timestamp
  authorUid?: string;
}

export interface ExamDetails {
  institutionName: string;
  examName: string;
  className: string;
  subject: string;
  fullMarks: string;
  date: string;
  time: string;
}

export interface Exam extends ExamDetails {
  id: string;
  examQuestions: Question[];
  createdAt?: any;
  updatedAt?: any;
}

export interface Taxonomy {
  classes: string[];
  subjects: Record<string, string[]>;
  chapters: Record<string, string[]>;
}
