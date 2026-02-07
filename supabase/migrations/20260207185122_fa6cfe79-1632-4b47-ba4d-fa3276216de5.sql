-- Create a table for subtitle profiles
CREATE TABLE public.subtitle_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subtitle_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own subtitle profiles" 
ON public.subtitle_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subtitle profiles" 
ON public.subtitle_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subtitle profiles" 
ON public.subtitle_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subtitle profiles" 
ON public.subtitle_profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_subtitle_profiles_updated_at
BEFORE UPDATE ON public.subtitle_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();