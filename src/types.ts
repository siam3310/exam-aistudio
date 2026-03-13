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
}

export interface ExamDetails {
  institutionName: string;
  examName: string;
  subject: string;
  fullMarks: string;
  date: string;
  time: string;
}
