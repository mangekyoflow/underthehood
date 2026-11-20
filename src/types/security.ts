export type SecurityTrackId = 'auth' | 'exploits' | 'architecture' | 'crypto';

export interface LessonStep {
  title: string;
  description: string;
  detail: string;
  actionSummary?: string;
  securityTakeaway?: string;
  codeSnippet?: {
    language: string;
    code: string;
    label?: string;
  };
}

export interface CveCaseStudy {
  title: string;
  cveId?: string;
  year: string;
  organization: string;
  damage: string;
  breakdown: string;
  rootCause: string;
  takeaway: string;
}

export interface HardeningGuide {
  title: string;
  checklist: string[];
  codeSample: {
    language: string;
    filename: string;
    code: string;
    note: string;
  };
}

export interface SecurityFaq {
  question: string;
  answer: string;
}

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  track: SecurityTrackId;
  trackTitle: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  summary: string;
  keyConcepts: string[];
  threatModel: {
    actor: string;
    goal: string;
    vulnerability: string;
    defense: string;
  };
  steps: LessonStep[];
  cveCaseStudy?: CveCaseStudy;
  hardeningGuide?: HardeningGuide;
  faqs?: SecurityFaq[];
}
