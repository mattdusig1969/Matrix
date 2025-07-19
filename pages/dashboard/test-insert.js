import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function TestInsertPage() {
    const handleTestInsert = async () => {
        const sessionId = uuidv4();
        console.log("Attempting to insert new session ID:", sessionId);

        const { data, error } = await supabase
            .from('usersessions')
            .insert({ 
                user_session_id: sessionId,
                demo_attributes: {},
                geo_attributes: {},
                psycho_attributes: {},
            });

        if (error) {
            console.error("Test Insert Failed:", error);
            alert("Insert failed. Check the console for the error object.");
        } else {
            console.log("Test Insert Succeeded:", data);
            alert("Success! The new session was inserted correctly.");
        }
    };

    return (
        <div style={{ padding: '50px' }}>
            <h1>Database Insert Test</h1>
            <p>Click the button to attempt a minimal insert into the `usersessions` table.</p>
            <button 
                onClick={handleTestInsert} 
                style={{ padding: '10px 20px', fontSize: '16px' }}
            >
                Test Insert
            </button>
        </div>
    );
}