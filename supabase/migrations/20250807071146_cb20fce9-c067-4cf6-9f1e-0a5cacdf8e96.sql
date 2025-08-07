-- Enable real-time updates for device_messages table
ALTER TABLE public.device_messages REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
SELECT pg_advisory_lock(1);
INSERT INTO supabase_realtime.messages (topic, event, payload, private, updated_at)
SELECT 'postgres_changes', 'INSERT', json_build_object(
  'schema', 'public',
  'table', 'device_messages',
  'type', 'INSERT'
), false, now();
SELECT pg_advisory_unlock(1);