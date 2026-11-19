import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pwmjpffrwunrcufrgiss.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3bWpwZmZyd3VucmN1ZnJnaXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwODM4MTksImV4cCI6MjExMDY1OTgxOX0.6haKdGzyWJ76WKAkD8JslgIxvATkOeKegxH9ubYW2VY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
