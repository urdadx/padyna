-- Enable LISTEN/NOTIFY for real-time analytics
-- This triggers notifications on INSERT to visitor_sessions and visitor_events

-- Create function to notify on analytics changes
CREATE OR REPLACE FUNCTION notify_analytics_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'analytics_change_' || NEW.chatbot_id::text,
    json_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'timestamp', NOW()
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for visitor_sessions INSERT
DROP TRIGGER IF EXISTS visitor_sessions_analytics_trigger ON visitor_sessions;
CREATE TRIGGER visitor_sessions_analytics_trigger
AFTER INSERT ON visitor_sessions
FOR EACH ROW
EXECUTE FUNCTION notify_analytics_change();

-- Trigger for visitor_events INSERT
DROP TRIGGER IF EXISTS visitor_events_analytics_trigger ON visitor_events;
CREATE TRIGGER visitor_events_analytics_trigger
AFTER INSERT ON visitor_events
FOR EACH ROW
EXECUTE FUNCTION notify_analytics_change();
