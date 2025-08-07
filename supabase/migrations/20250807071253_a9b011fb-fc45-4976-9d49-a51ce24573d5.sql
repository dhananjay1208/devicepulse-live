-- Enable real-time updates for device_messages table
ALTER TABLE public.device_messages REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_messages;