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
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt?: any; // Firestore Timestamp
  authorUid?: string;
}

export interface ExamDetails {
  institutionName: string;
  examName: string;
  subject: string;
  fullMarks: string;
  date: string;
  time: string;
}
