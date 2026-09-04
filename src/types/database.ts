export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_code_redemptions: {
        Row: {
          code_hash: string
          id: string
          redeemed_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          id?: string
          redeemed_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          id?: string
          redeemed_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_code_redemptions_code_hash_fkey"
            columns: ["code_hash"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["code_hash"]
          },
          {
            foreignKeyName: "access_code_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      access_codes: {
        Row: {
          active: boolean | null
          code_hash: string
          created_at: string | null
          current_uses: number | null
          expires_at: string | null
          id: string
          label: string | null
          max_uses: number | null
          plan_granted: string | null
        }
        Insert: {
          active?: boolean | null
          code_hash: string
          created_at?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          label?: string | null
          max_uses?: number | null
          plan_granted?: string | null
        }
        Update: {
          active?: boolean | null
          code_hash?: string
          created_at?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          label?: string | null
          max_uses?: number | null
          plan_granted?: string | null
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          context: string | null
          created_at: string | null
          id: string
          question_id: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          id?: string
          question_id?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string | null
          id?: string
          question_id?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          created_at: string | null
          estimated_cost_usd: number | null
          id: string
          input_tokens: number | null
          model: string
          output_tokens: number | null
          request_type: string
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          model: string
          output_tokens?: number | null
          request_type: string
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          model?: string
          output_tokens?: number | null
          request_type?: string
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          confidence: number | null
          correct: boolean | null
          created_at: string | null
          desmos_used: boolean
          hint_used: boolean
          id: string
          mistake_type: string | null
          question_id: string
          selected_answer: string | null
          session_id: string | null
          time_spent_seconds: number | null
          tutor_used: boolean
          user_id: string
        }
        Insert: {
          confidence?: number | null
          correct?: boolean | null
          created_at?: string | null
          desmos_used?: boolean
          hint_used?: boolean
          id?: string
          mistake_type?: string | null
          question_id: string
          selected_answer?: string | null
          session_id?: string | null
          time_spent_seconds?: number | null
          tutor_used?: boolean
          user_id: string
        }
        Update: {
          confidence?: number | null
          correct?: boolean | null
          created_at?: string | null
          id?: string
          mistake_type?: string | null
          question_id?: string
          selected_answer?: string | null
          session_id?: string | null
          time_spent_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          id: string
          name: string
          section_id: string | null
          sort_order: number | null
        }
        Insert: {
          id?: string
          name: string
          section_id?: string | null
          sort_order?: number | null
        }
        Update: {
          id?: string
          name?: string
          section_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      mistake_tags: {
        Row: {
          attempt_id: string
          id: string
          tag: string
        }
        Insert: {
          attempt_id: string
          id?: string
          tag: string
        }
        Update: {
          attempt_id?: string
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "mistake_tags_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number | null
          created_at: string | null
          currency: string | null
          id: string
          plan: string | null
          status: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          plan?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          plan?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_snapshots: {
        Row: {
          created_at: string | null
          id: string
          ovr_score: number | null
          predicted_math: number | null
          predicted_reading_writing: number | null
          predicted_total: number | null
          snapshot_date: string
          study_minutes: number | null
          test_type: string | null
          total_correct: number | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ovr_score?: number | null
          predicted_math?: number | null
          predicted_reading_writing?: number | null
          predicted_total?: number | null
          snapshot_date: string
          study_minutes?: number | null
          test_type?: string | null
          total_correct?: number | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ovr_score?: number | null
          predicted_math?: number | null
          predicted_reading_writing?: number | null
          predicted_total?: number | null
          snapshot_date?: string
          study_minutes?: number | null
          test_type?: string | null
          total_correct?: number | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          completed_at: string | null
          completed_questions: number | null
          correct_count: number | null
          id: string
          is_adaptive: boolean | null
          is_timed: boolean | null
          section_name: string | null
          session_type: string | null
          started_at: string | null
          status: string | null
          test_type: string | null
          time_limit_seconds: number | null
          time_spent_seconds: number | null
          topic_id: string | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_questions?: number | null
          correct_count?: number | null
          id?: string
          is_adaptive?: boolean | null
          is_timed?: boolean | null
          section_name?: string | null
          session_type?: string | null
          started_at?: string | null
          status?: string | null
          test_type?: string | null
          time_limit_seconds?: number | null
          time_spent_seconds?: number | null
          topic_id?: string | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_questions?: number | null
          correct_count?: number | null
          id?: string
          is_adaptive?: boolean | null
          is_timed?: boolean | null
          section_name?: string | null
          session_type?: string | null
          started_at?: string | null
          status?: string | null
          test_type?: string | null
          time_limit_seconds?: number | null
          time_spent_seconds?: number | null
          topic_id?: string | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_code_used: string | null
          created_at: string | null
          current_estimated_score: number | null
          diagnostic_completed: boolean | null
          email: string | null
          focus_section: string | null
          full_name: string | null
          grade_level: string | null
          id: string
          prior_prep: string | null
          school_name: string | null
          test_goal: string | null
          weakest_areas: string[] | null
          onboarding_completed: boolean | null
          role: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          study_days: string[] | null
          study_minutes_per_day: number | null
          study_start_time: string | null
          subscription_plan: string | null
          subscription_status: string | null
          target_score: number | null
          test_date: string | null
          test_preference: string | null
          updated_at: string | null
        }
        Insert: {
          access_code_used?: string | null
          created_at?: string | null
          current_estimated_score?: number | null
          diagnostic_completed?: boolean | null
          email?: string | null
          focus_section?: string | null
          full_name?: string | null
          grade_level?: string | null
          id: string
          prior_prep?: string | null
          school_name?: string | null
          test_goal?: string | null
          weakest_areas?: string[] | null
          onboarding_completed?: boolean | null
          role?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          study_days?: string[] | null
          study_minutes_per_day?: number | null
          study_start_time?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          target_score?: number | null
          test_date?: string | null
          test_preference?: string | null
          updated_at?: string | null
        }
        Update: {
          access_code_used?: string | null
          created_at?: string | null
          current_estimated_score?: number | null
          diagnostic_completed?: boolean | null
          email?: string | null
          focus_section?: string | null
          full_name?: string | null
          grade_level?: string | null
          id?: string
          prior_prep?: string | null
          school_name?: string | null
          test_goal?: string | null
          weakest_areas?: string[] | null
          onboarding_completed?: boolean | null
          role?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          study_days?: string[] | null
          study_minutes_per_day?: number | null
          study_start_time?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          target_score?: number | null
          test_date?: string | null
          test_preference?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          active: boolean | null
          ai_explanation: string | null
          ai_explanation_simple: string | null
          approved: boolean | null
          calculator_allowed: boolean | null
          calculator_config: Json | null
          category_name: string | null
          choice_a: string | null
          choice_b: string | null
          choice_c: string | null
          choice_d: string | null
          choice_e: string | null
          correct_answer: string
          created_at: string | null
          difficulty: string | null
          difficulty_score: number | null
          desmos_mode: string | null
          desmos_strategy_id: string | null
          desmos_useful: boolean | null
          exam_name: string | null
          fingerprint: string | null
          id: string
          image_url: string | null
          module_label: string | null
          official_explanation: string | null
          passage_id: string | null
          question_text: string
          question_type: string | null
          reasoning_type: string | null
          review_status: string | null
          section_name: string | null
          source: string | null
          source_document_id: string | null
          source_page: number | null
          source_question_number: number | null
          source_rights_status: string | null
          source_type: string | null
          subtopic_name: string | null
          test_type: string
          topic_id: string | null
          topic_name: string | null
          updated_at: string | null
          answer_verification_status: string | null
        }
        Insert: {
          active?: boolean | null
          ai_explanation?: string | null
          ai_explanation_simple?: string | null
          approved?: boolean | null
          calculator_config?: Json | null
          category_name?: string | null
          choice_a?: string | null
          choice_b?: string | null
          choice_c?: string | null
          choice_d?: string | null
          choice_e?: string | null
          correct_answer: string
          created_at?: string | null
          difficulty?: string | null
          exam_name?: string | null
          id?: string
          image_url?: string | null
          official_explanation?: string | null
          question_text: string
          section_name?: string | null
          source?: string | null
          source_type?: string | null
          subtopic_name?: string | null
          test_type: string
          topic_id?: string | null
          topic_name?: string | null
          updated_at?: string | null
          calculator_allowed?: boolean | null
          desmos_useful?: boolean | null
          desmos_mode?: string | null
          question_type?: string | null
          passage_id?: string | null
          source_rights_status?: string | null
          fingerprint?: string | null
          difficulty_score?: number | null
          reasoning_type?: string | null
          answer_verification_status?: string | null
          review_status?: string | null
        }
        Update: {
          active?: boolean | null
          ai_explanation?: string | null
          ai_explanation_simple?: string | null
          approved?: boolean | null
          calculator_config?: Json | null
          category_name?: string | null
          choice_a?: string | null
          choice_b?: string | null
          choice_c?: string | null
          choice_d?: string | null
          choice_e?: string | null
          correct_answer?: string
          created_at?: string | null
          difficulty?: string | null
          exam_name?: string | null
          id?: string
          image_url?: string | null
          official_explanation?: string | null
          question_text?: string
          review_status?: string | null
          section_name?: string | null
          source?: string | null
          source_type?: string | null
          subtopic_name?: string | null
          test_type?: string
          topic_id?: string | null
          topic_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "passages"
            referencedColumns: ["id"]
          },
        ]
      }
      passages: {
        Row: {
          active: boolean
          author: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          section_id: string | null
          source_document_id: string | null
          source_rights_status: string
          source_type: string
          test_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          author?: string | null
          content: string
          id?: string
          title: string
        }
        Update: {
          active?: boolean
          content?: string
          title?: string
        }
        Relationships: []
      }
      question_topic_mappings: {
        Row: {
          confidence: number
          question_id: string
          relationship: string
          topic_id: string
          weight: number
        }
        Insert: {
          confidence?: number
          question_id: string
          relationship?: string
          topic_id: string
          weight?: number
        }
        Update: {
          relationship?: string
          weight?: number
        }
        Relationships: []
      }
      source_documents: {
        Row: {
          checksum: string
          contains_answer_key: boolean
          created_at: string
          exam_name: string
          exam_number: number | null
          exam_type: string
          exam_year: string | null
          filename: string
          folder: string | null
          id: string
          metadata: Json
          notes: string | null
          page_count: number
          processing_status: string
          question_count_detected: number
          question_count_imported: number
          question_count_needing_review: number
          section: string | null
          source_rights_status: string
          source_type: string
          updated_at: string
        }
        Insert: {
          checksum: string
          exam_name: string
          exam_type: string
          filename: string
        }
        Update: {
          processing_status?: string
        }
        Relationships: []
      }
      english_strategies: {
        Row: {
          act_applicable: boolean
          active: boolean
          approved: boolean
          category: string
          created_at: string
          description: string
          example: string | null
          id: string
          recognition_rule: string
          sat_applicable: boolean
          slug: string
          student_steps: string[]
          title: string
          when_to_use: string
          why_it_works: string
        }
        Insert: {
          description: string
          recognition_rule: string
          slug: string
          title: string
          when_to_use: string
          why_it_works: string
        }
        Update: {
          approved?: boolean
        }
        Relationships: []
      }
      score_predictions: {
        Row: {
          calculated_at: string | null
          confidence: string | null
          id: string
          ovr_score: number | null
          practice_tests_used: number | null
          predicted_english: number | null
          predicted_math: number | null
          predicted_reading: number | null
          predicted_reading_writing: number | null
          predicted_science: number | null
          predicted_total: number | null
          questions_used: number | null
          score_high: number | null
          score_low: number | null
          test_type: string
          user_id: string
        }
        Insert: {
          calculated_at?: string | null
          confidence?: string | null
          id?: string
          ovr_score?: number | null
          practice_tests_used?: number | null
          predicted_english?: number | null
          predicted_math?: number | null
          predicted_reading?: number | null
          predicted_reading_writing?: number | null
          predicted_science?: number | null
          predicted_total?: number | null
          questions_used?: number | null
          score_high?: number | null
          score_low?: number | null
          test_type: string
          user_id: string
        }
        Update: {
          calculated_at?: string | null
          confidence?: string | null
          id?: string
          ovr_score?: number | null
          practice_tests_used?: number | null
          predicted_english?: number | null
          predicted_math?: number | null
          predicted_reading?: number | null
          predicted_reading_writing?: number | null
          predicted_science?: number | null
          predicted_total?: number | null
          questions_used?: number | null
          score_high?: number | null
          score_low?: number | null
          test_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          active: boolean | null
          id: string
          name: string
          score_max: number | null
          score_min: number | null
          short_name: string | null
          sort_order: number | null
          test_id: string | null
        }
        Insert: {
          active?: boolean | null
          id?: string
          name: string
          score_max?: number | null
          score_min?: number | null
          short_name?: string | null
          sort_order?: number | null
          test_id?: string | null
        }
        Update: {
          active?: boolean | null
          id?: string
          name?: string
          score_max?: number | null
          score_min?: number | null
          short_name?: string | null
          sort_order?: number | null
          test_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sections_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      study_day_logs: {
        Row: {
          minutes_done: number
          plan_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          minutes_done?: number
          plan_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          minutes_done?: number
          plan_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_day_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_level_progress: {
        Row: {
          completed_at: string | null
          extra_problems: number
          level_index: number
          status: string
          track: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          extra_problems?: number
          level_index: number
          status?: string
          track: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          extra_problems?: number
          level_index?: number
          status?: string
          track?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_level_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_tasks: {
        Row: {
          completed_minutes: number | null
          completed_questions: number | null
          description: string | null
          id: string
          plan_id: string
          sort_order: number | null
          status: string | null
          target_minutes: number
          target_questions: number | null
          task_type: string
          title: string
          topic_id: string | null
        }
        Insert: {
          completed_minutes?: number | null
          completed_questions?: number | null
          description?: string | null
          id?: string
          plan_id: string
          sort_order?: number | null
          status?: string | null
          target_minutes: number
          target_questions?: number | null
          task_type: string
          title: string
          topic_id?: string | null
        }
        Update: {
          completed_minutes?: number | null
          completed_questions?: number | null
          description?: string | null
          id?: string
          plan_id?: string
          sort_order?: number | null
          status?: string | null
          target_minutes?: number
          target_questions?: number | null
          task_type?: string
          title?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_tasks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plan_tasks_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          ai_explanation: string | null
          completed_minutes: number | null
          created_at: string | null
          id: string
          plan_date: string
          status: string | null
          total_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_explanation?: string | null
          completed_minutes?: number | null
          created_at?: string | null
          id?: string
          plan_date: string
          status?: string | null
          total_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_explanation?: string | null
          completed_minutes?: number | null
          created_at?: string | null
          id?: string
          plan_date?: string
          status?: string | null
          total_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subtopics: {
        Row: {
          id: string
          name: string
          sort_order: number | null
          topic_id: string | null
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number | null
          topic_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number | null
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subtopics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          active: boolean | null
          description: string | null
          id: string
          name: string
          score_max: number
          score_min: number
          short_name: string
        }
        Insert: {
          active?: boolean | null
          description?: string | null
          id?: string
          name: string
          score_max: number
          score_min: number
          short_name: string
        }
        Update: {
          active?: boolean | null
          description?: string | null
          id?: string
          name?: string
          score_max?: number
          score_min?: number
          short_name?: string
        }
        Relationships: []
      }
      topic_daily_snapshots: {
        Row: {
          correct_attempts: number | null
          created_at: string | null
          id: string
          knowledge_mastery: number | null
          overall_mastery: number | null
          snapshot_date: string
          speed_mastery: number | null
          topic_id: string
          total_attempts: number | null
          user_id: string
        }
        Insert: {
          correct_attempts?: number | null
          created_at?: string | null
          id?: string
          knowledge_mastery?: number | null
          overall_mastery?: number | null
          snapshot_date: string
          speed_mastery?: number | null
          topic_id: string
          total_attempts?: number | null
          user_id: string
        }
        Update: {
          correct_attempts?: number | null
          created_at?: string | null
          id?: string
          knowledge_mastery?: number | null
          overall_mastery?: number | null
          snapshot_date?: string
          speed_mastery?: number | null
          topic_id?: string
          total_attempts?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_daily_snapshots_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_daily_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_mastery: {
        Row: {
          correct_attempts: number | null
          easy_correct: number | null
          easy_total: number | null
          hard_correct: number | null
          hard_total: number | null
          id: string
          knowledge_mastery: number | null
          last_practiced_at: string | null
          medium_correct: number | null
          medium_total: number | null
          overall_mastery: number | null
          recent_attempts: number | null
          recent_correct: number | null
          recent_time_seconds: number | null
          speed_mastery: number | null
          topic_id: string
          total_attempts: number | null
          total_time_seconds: number | null
          trend: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          correct_attempts?: number | null
          easy_correct?: number | null
          easy_total?: number | null
          hard_correct?: number | null
          hard_total?: number | null
          id?: string
          knowledge_mastery?: number | null
          last_practiced_at?: string | null
          medium_correct?: number | null
          medium_total?: number | null
          overall_mastery?: number | null
          recent_attempts?: number | null
          recent_correct?: number | null
          recent_time_seconds?: number | null
          speed_mastery?: number | null
          topic_id: string
          total_attempts?: number | null
          total_time_seconds?: number | null
          trend?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          correct_attempts?: number | null
          easy_correct?: number | null
          easy_total?: number | null
          hard_correct?: number | null
          hard_total?: number | null
          id?: string
          knowledge_mastery?: number | null
          last_practiced_at?: string | null
          medium_correct?: number | null
          medium_total?: number | null
          overall_mastery?: number | null
          recent_attempts?: number | null
          recent_correct?: number | null
          recent_time_seconds?: number | null
          speed_mastery?: number | null
          topic_id?: string
          total_attempts?: number | null
          total_time_seconds?: number | null
          trend?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_mastery_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_mastery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          category_id: string | null
          description: string | null
          id: string
          name: string
          sort_order: number | null
          target_time_seconds: number | null
          test_weight: number | null
        }
        Insert: {
          category_id?: string | null
          description?: string | null
          id?: string
          name: string
          sort_order?: number | null
          target_time_seconds?: number | null
          test_weight?: number | null
        }
        Update: {
          category_id?: string | null
          description?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          target_time_seconds?: number | null
          test_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_usage_daily: {
        Row: {
          ai_chats_used: number | null
          created_at: string | null
          id: string
          questions_answered: number | null
          study_minutes: number | null
          updated_at: string | null
          usage_date: string
          user_id: string
        }
        Insert: {
          ai_chats_used?: number | null
          created_at?: string | null
          id?: string
          questions_answered?: number | null
          study_minutes?: number | null
          updated_at?: string | null
          usage_date: string
          user_id: string
        }
        Update: {
          ai_chats_used?: number | null
          created_at?: string | null
          id?: string
          questions_answered?: number | null
          study_minutes?: number | null
          updated_at?: string | null
          usage_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_usage_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_preferences: {
        Row: {
          analogy_topics: string[]
          custom_interest: string | null
          desmos_guidance: string
          explanation_level: string
          graph_comfort: string
          method_scores: Json
          methods: string[]
          pacing: string
          prefers_desmos: boolean
          prefers_manual_algebra: boolean
          prefers_socratic: boolean
          prefers_visual: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          analogy_topics?: string[]
          custom_interest?: string | null
          desmos_guidance?: string
          explanation_level?: string
          graph_comfort?: string
          method_scores?: Json
          methods?: string[]
          pacing?: string
          prefers_desmos?: boolean
          prefers_manual_algebra?: boolean
          prefers_socratic?: boolean
          prefers_visual?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          analogy_topics?: string[]
          custom_interest?: string | null
          desmos_guidance?: string
          explanation_level?: string
          graph_comfort?: string
          method_scores?: Json
          methods?: string[]
          pacing?: string
          prefers_desmos?: boolean
          prefers_manual_algebra?: boolean
          prefers_socratic?: boolean
          prefers_visual?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tutor_misconceptions: {
        Row: {
          category: string
          created_at: string
          id: string
          last_seen_at: string
          note: string | null
          occurrences: number
          topic_id: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          last_seen_at?: string
          note?: string | null
          occurrences?: number
          topic_id?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          last_seen_at?: string
          note?: string | null
          occurrences?: number
          topic_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tutor_interactions: {
        Row: {
          confidence: number | null
          created_at: string
          hints_given: number
          id: string
          latency_ms: number | null
          misconception: string | null
          question_id: string | null
          strategy: string | null
          topic_id: string | null
          trigger: string | null
          used_desmos: boolean
          used_simplified_example: boolean
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          hints_given?: number
          id?: string
          latency_ms?: number | null
          misconception?: string | null
          question_id?: string | null
          strategy?: string | null
          topic_id?: string | null
          trigger?: string | null
          used_desmos?: boolean
          used_simplified_example?: boolean
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          hints_given?: number
          id?: string
          latency_ms?: number | null
          misconception?: string | null
          question_id?: string | null
          strategy?: string | null
          topic_id?: string | null
          trigger?: string | null
          used_desmos?: boolean
          used_simplified_example?: boolean
          user_id?: string
        }
        Relationships: []
      }
      desmos_strategies: {
        Row: {
          active: boolean
          act_applicable: boolean
          agent_actions: Json
          approved: boolean
          category: string
          common_mistakes: string[]
          created_at: string
          description: string
          desmos_capability: string
          desmos_first_recommended: boolean
          desmos_input_template: string[]
          desmos_only_possible: boolean
          difficulty: string
          estimated_time_savings: string | null
          example_desmos_input: string[]
          example_problem: string
          example_result: string
          explanation: string
          hybrid_recommended: boolean
          id: string
          keywords: string[]
          mode: string
          recognition_rule: string
          sat_applicable: boolean
          slug: string
          source_reference: string[]
          student_steps: string[]
          title: string
          try_it_prompt: string | null
          updated_at: string
          what_to_look_for: string
          when_not_to_use: string
          when_to_use: string
          why_it_works: string
        }
        Insert: {
          active?: boolean
          act_applicable?: boolean
          agent_actions?: Json
          approved?: boolean
          category: string
          common_mistakes?: string[]
          created_at?: string
          description: string
          desmos_capability: string
          desmos_first_recommended?: boolean
          desmos_input_template?: string[]
          desmos_only_possible?: boolean
          difficulty?: string
          estimated_time_savings?: string | null
          example_desmos_input?: string[]
          example_problem: string
          example_result: string
          explanation: string
          hybrid_recommended?: boolean
          id?: string
          keywords?: string[]
          mode: string
          recognition_rule: string
          sat_applicable?: boolean
          slug: string
          source_reference?: string[]
          student_steps?: string[]
          title: string
          try_it_prompt?: string | null
          updated_at?: string
          what_to_look_for: string
          when_not_to_use: string
          when_to_use: string
          why_it_works: string
        }
        Update: {
          active?: boolean
          approved?: boolean
          slug?: string
          title?: string
        }
        Relationships: []
      }
      desmos_strategy_topics: {
        Row: {
          strategy_id: string
          topic_id: string
        }
        Insert: {
          strategy_id: string
          topic_id: string
        }
        Update: {
          strategy_id?: string
          topic_id?: string
        }
        Relationships: []
      }
      desmos_strategy_mastery: {
        Row: {
          failed_uses: number
          independent_uses: number
          last_used_at: string | null
          mastery_score: number
          needs_review: boolean
          strategy_id: string
          successful_uses: number
          times_shown: number
          times_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          failed_uses?: number
          independent_uses?: number
          last_used_at?: string | null
          mastery_score?: number
          needs_review?: boolean
          strategy_id: string
          successful_uses?: number
          times_shown?: number
          times_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          mastery_score?: number
          needs_review?: boolean
          times_shown?: number
          times_used?: number
        }
        Relationships: []
      }
      vocabulary_attempts: {
        Row: {
          correct: boolean
          created_at: string | null
          ease_factor: number | null
          id: string
          interval_days: number | null
          next_review_at: string | null
          repetitions: number | null
          time_spent_seconds: number | null
          user_id: string
          word_id: string
        }
        Insert: {
          correct: boolean
          created_at?: string | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          next_review_at?: string | null
          repetitions?: number | null
          time_spent_seconds?: number | null
          user_id: string
          word_id: string
        }
        Update: {
          correct?: boolean
          created_at?: string | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          next_review_at?: string | null
          repetitions?: number | null
          time_spent_seconds?: number | null
          user_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocabulary_attempts_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_words"
            referencedColumns: ["id"]
          },
        ]
      }
      vocabulary_words: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string | null
          definition: string
          difficulty: string | null
          example_sentence: string | null
          id: string
          part_of_speech: string | null
          test_type: string | null
          word: string
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          definition: string
          difficulty?: string | null
          example_sentence?: string | null
          id?: string
          part_of_speech?: string | null
          test_type?: string | null
          word: string
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          definition?: string
          difficulty?: string | null
          example_sentence?: string | null
          id?: string
          part_of_speech?: string | null
          test_type?: string | null
          word?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { uid: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const


export type Profile = Database['public']['Tables']['profiles']['Row']
export type Question = Database['public']['Tables']['questions']['Row']
export type Attempt = Database['public']['Tables']['attempts']['Row']
export type TopicMastery = Database['public']['Tables']['topic_mastery']['Row']
export type PracticeSession = Database['public']['Tables']['practice_sessions']['Row']
export type StudyPlan = Database['public']['Tables']['study_plans']['Row']
export type StudyPlanTask = Database['public']['Tables']['study_plan_tasks']['Row']
export type VocabularyWord = Database['public']['Tables']['vocabulary_words']['Row']
export type ScorePrediction = Database['public']['Tables']['score_predictions']['Row']
export type Topic = Database['public']['Tables']['topics']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Section = Database['public']['Tables']['sections']['Row']
export type Test = Database['public']['Tables']['tests']['Row']
export type UserUsageDaily = Database['public']['Tables']['user_usage_daily']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
