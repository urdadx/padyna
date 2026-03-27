-- Add is_widget_active column to visitor_sessions for live user tracking
ALTER TABLE visitor_sessions ADD COLUMN is_widget_active boolean NOT NULL DEFAULT false;

CREATE INDEX visitor_sessions_is_widget_active_idx ON visitor_sessions (chatbot_id, is_widget_active) WHERE is_widget_active = true;