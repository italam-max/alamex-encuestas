// Re-exports de tipos de base de datos
export type {
  UserRole,
  SurveyStatus,
  QuestionType,
  RecipientStatus,
} from './database';

// ── Modelos de dominio (con joins) ───────────────────────────────
import type { Database } from './database';

export type Profile      = Database['public']['Tables']['profiles']['Row'];
export type Template     = Database['public']['Tables']['templates']['Row'];
export type Survey       = Database['public']['Tables']['surveys']['Row'];
export type Question     = Database['public']['Tables']['questions']['Row'];
export type QuestionOption = Database['public']['Tables']['question_options']['Row'];
export type Distribution = Database['public']['Tables']['distributions']['Row'];
export type Recipient    = Database['public']['Tables']['recipients']['Row'];
export type Response     = Database['public']['Tables']['responses']['Row'];
export type Answer       = Database['public']['Tables']['answers']['Row'];

// ── Tipos con relaciones (para queries con joins) ────────────────
export interface QuestionWithOptions extends Question {
  options: QuestionOption[];
}

export interface SurveyWithQuestions extends Survey {
  questions: QuestionWithOptions[];
}

export interface DistributionWithStats extends Distribution {
  recipients:     Recipient[];
  total:          number;
  opened:         number;
  clicked:        number;
  responded:      number;
}

export interface RecipientWithResponse extends Recipient {
  response?: Response & { answers: Answer[] };
}

// ── Configuraciones de preguntas ─────────────────────────────────
export interface RatingSettings   { max: 5 | 10; labels?: { min: string; max: string }; }
export interface NpsSettings      { question: string; }
export interface MultipleSettings { allowOther: boolean; }
export interface TextSettings     { placeholder?: string; multiline?: boolean; }

// ── Navegación ───────────────────────────────────────────────────
export type NavId =
  | 'dashboard'
  | 'surveys'
  | 'surveys.new'
  | 'analytics'
  | 'settings';

// ── Auth ─────────────────────────────────────────────────────────
export interface AuthUser {
  id:    string;
  email: string;
}
