import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fpytddctddiqubxjsfaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZweXRkZGN0ZGRpcXVieGpzZmFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NTkxNDIsImV4cCI6MjA2NjUzNTE0Mn0.veKMuGsRqkEX2Oid2ly9MFMILtrwbtHGegsKWyTPwrI'
);

export default supabase;
