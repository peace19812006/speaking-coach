export type LearningLevel = 'beginner' | 'intermediate' | 'advanced';

export type PracticeType = 'read-aloud' | 'dialogue' | 'roleplay' | 'ielts' | 'debate';

export interface PracticeTopic {
  id: string;
  title: string;
  vnTitle: string;
  description: string;
  vnDescription: string;
  level: LearningLevel;
  type: PracticeType;
  prompt: string;
  context?: string; // situational context, e.g., "At the airport" or "Job Interview"
  suggestedPhrases: {phrase: string; meaning: string}[];
  ieltsPart?: 1 | 2 | 3;
  dialogueScript?: { speaker: string; text: string; vnText?: string; roleTag?: 'A' | 'B' }[];
  roles?: { roleA: string; roleB: string; vnRoleA?: string; vnRoleB?: string };
}

export interface CorrectedSentence {
  original: string;
  corrected: string;
  reasoning: string;
  vnReasoning: string;
}

export interface EnhancedVocabulary {
  original: string;
  suggested: string; // advanced synonym or idiom
  meaning: string; // explanation
  vnMeaning: string;
  example: string; // example sentence using the suggestion
}

export interface AssessmentResult {
  overallScore: number; // 0 to 10
  scores: {
    grammar: number;
    vocabulary: number;
    pronunciationAndClarity: number; // clarity, pronunciation suggestions based on text
    fluencyAndCohesion: number;
  };
  generalFeedback: string;
  vnGeneralFeedback: string;
  correctedSentences: CorrectedSentence[];
  enhancedVocabulary: EnhancedVocabulary[];
  modelAnswer: string;
  transcriptAnalyzed: string;
}

export interface RoleplaySession {
  topicId: string;
  messages: {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: number;
  }[];
}
