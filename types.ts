export interface DinoQuestion {
  correctName: string;
  distractors: string[];
  funFact: string;
  visualDescription: string;
}

export interface GameState {
  correct: number;
  incorrect: number;
  streak: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING_QUESTION = 'LOADING_QUESTION',
  READY_TO_ANSWER = 'READY_TO_ANSWER',
  ANSWERED = 'ANSWERED',
  ERROR = 'ERROR'
}
