import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function CreativePreview() {
  const [html, setHtml] = useState('');
  const [css, setCss] = useState('');

  useEffect(() => {
    const creative_id = '3de85ba1-4601-41f5-b07a-06d6adfc8cb3'; // update this

    const fetchCreative = async () => {
      const { data, error } = await supabase
        .from('creativevariants')
        .select('html_code, css_code')
        .eq('id', creative_id)
        .single();

      if (error) return console.error('Error:', error);
      if (data) {
        setHtml(data.html_code.replace('{{SURVEY_BLOCK}}', '<div id="survey-block">[Survey Block]</div>'));
        setCss(data.css_code);
      }
    };

    fetchCreative();
  }, []);

  return (
    <div>
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      {html && <div dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  );
}
