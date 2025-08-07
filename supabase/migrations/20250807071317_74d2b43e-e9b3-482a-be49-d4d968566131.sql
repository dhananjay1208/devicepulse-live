-- Enable Row Level Security on device_messages table
ALTER TABLE public.device_messages ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow public read access to device_messages
-- Since this is a monitoring dashboard, devices should be publicly viewable
CREATE POLICY "Allow public read access to device_messages" 
ON public.device_messages 
FOR SELECT 
USING (true);