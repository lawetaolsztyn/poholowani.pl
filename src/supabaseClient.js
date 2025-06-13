import { createClient } from '@supabase/supabase-js';

console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey =" VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6cWFoZnF0YnFzbWhvZHpsZ3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzUxMzksImV4cCI6MjA2MjY1MTEzOX0.q7sQVXNv51PHkpR69P6G7aU1jQJyGKpeEYKEBGKxBVY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
