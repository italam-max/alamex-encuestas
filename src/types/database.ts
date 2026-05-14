export type UserRole       = 'admin' | 'editor' | 'viewer';
export type SurveyStatus   = 'Borrador' | 'Activa' | 'Cerrada';
export type QuestionType   = 'rating' | 'nps' | 'multiple' | 'checkbox' | 'text' | 'yesno';
export type RecipientStatus = 'enviado' | 'abierto' | 'respondido';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:            string;
          display_name:  string;
          display_title: string | null;
          role:          UserRole;
          avatar_url:    string | null;
          created_at:    string;
        };
        Insert: {
          id:            string;
          display_name:  string;
          display_title?: string | null;
          role?:         UserRole;
          avatar_url?:   string | null;
        };
        Update: {
          display_name?:  string;
          display_title?: string | null;
          role?:          UserRole;
          avatar_url?:    string | null;
        };
      };
      templates: {
        Row: {
          id:          string;
          name:        string;
          description: string | null;
          is_system:   boolean;
          created_by:  string | null;
          created_at:  string;
          updated_at:  string;
        };
        Insert: {
          name:        string;
          description?: string | null;
          is_system?:  boolean;
          created_by?: string | null;
        };
        Update: {
          name?:        string;
          description?: string | null;
          is_system?:   boolean;
        };
      };
      surveys: {
        Row: {
          id:          string;
          title:       string;
          description: string | null;
          status:      SurveyStatus;
          template_id: string | null;
          created_by:  string | null;
          created_at:  string;
          updated_at:  string;
        };
        Insert: {
          title:        string;
          description?: string | null;
          status?:      SurveyStatus;
          template_id?: string | null;
          created_by?:  string | null;
        };
        Update: {
          title?:       string;
          description?: string | null;
          status?:      SurveyStatus;
          template_id?: string | null;
          updated_at?:  string;
        };
      };
      questions: {
        Row: {
          id:          string;
          survey_id:   string | null;
          template_id: string | null;
          type:        QuestionType;
          title:       string;
          description: string | null;
          required:    boolean;
          order_index: number;
          settings:    Record<string, unknown>;
        };
        Insert: {
          survey_id?:   string | null;
          template_id?: string | null;
          type:         QuestionType;
          title:        string;
          description?: string | null;
          required?:    boolean;
          order_index:  number;
          settings?:    Record<string, unknown>;
        };
        Update: {
          type?:        QuestionType;
          title?:       string;
          description?: string | null;
          required?:    boolean;
          order_index?: number;
          settings?:    Record<string, unknown>;
        };
      };
      question_options: {
        Row: {
          id:          string;
          question_id: string;
          label:       string;
          value:       string;
          order_index: number;
        };
        Insert: {
          question_id: string;
          label:       string;
          value:       string;
          order_index: number;
        };
        Update: {
          label?:       string;
          value?:       string;
          order_index?: number;
        };
      };
      distributions: {
        Row: {
          id:         string;
          survey_id:  string;
          subject:    string;
          message:    string | null;
          sent_by:    string | null;
          sent_at:    string | null;
          created_at: string;
        };
        Insert: {
          survey_id:  string;
          subject:    string;
          message?:   string | null;
          sent_by?:   string | null;
          sent_at?:   string | null;
        };
        Update: {
          subject?:  string;
          message?:  string | null;
          sent_at?:  string | null;
        };
      };
      recipients: {
        Row: {
          id:              string;
          distribution_id: string;
          email:           string;
          name:            string | null;
          token:           string;
          status:          RecipientStatus;
          opened_at:       string | null;
          clicked_at:      string | null;
          created_at:      string;
        };
        Insert: {
          distribution_id: string;
          email:           string;
          name?:           string | null;
          status?:         RecipientStatus;
        };
        Update: {
          status?:     RecipientStatus;
          opened_at?:  string | null;
          clicked_at?: string | null;
        };
      };
      responses: {
        Row: {
          id:           string;
          survey_id:    string;
          recipient_id: string;
          submitted_at: string;
        };
        Insert: {
          survey_id:    string;
          recipient_id: string;
        };
        Update: never;
      };
      answers: {
        Row: {
          id:          string;
          response_id: string;
          question_id: string;
          value:       string | null;
          values:      string[] | null;
        };
        Insert: {
          response_id: string;
          question_id: string;
          value?:      string | null;
          values?:     string[] | null;
        };
        Update: never;
      };
    };
  };
}
