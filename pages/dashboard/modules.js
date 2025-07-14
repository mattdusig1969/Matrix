import { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function ModulesPage() {
  const [surveys, setSurveys] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [modules, setModules] = useState([]);

  useEffect(() => {
    fetchSurveys();
  }, []);

  useEffect(() => {
    if (selectedSurveyId) fetchQuestions(selectedSurveyId);
  }, [selectedSurveyId]);

  async function fetchSurveys() {
    const { data, error } = await supabase.from("Surveys").select("id, title");
    if (error) {
      toast.error("Failed to load surveys");
    } else {
      setSurveys(data);
    }
  }

  async function fetchQuestions(surveyId) {
    const { data, error } = await supabase
      .from("questions")
      .select("id, question_text, answer_option, survey_id, question_number")
      .eq("survey_id", surveyId);

    if (error) {
      toast.error("Failed to load questions");
    } else {
      setQuestions(data);
    }
  }

  async function generateModules() {
    if (!selectedSurveyId) {
      toast.error("Please select a survey.");
      return;
    }

    if (questions.length === 0) {
      toast.error("No questions found for the selected survey.");
      return;
    }

    if (questions.some(q => !q.question_number)) {
      toast.error("Some questions are missing question numbers. Fix before generating modules.");
      return;
    }

    await supabase
      .from("questions")
      .update({ module_id: null, question_order: null })
      .eq("survey_id", selectedSurveyId);

    const payload = {
      surveyId: selectedSurveyId,
      questions: questions,
    };

    try {
      const response = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error("Failed to generate modules.");
        return;
      }

      const generatedModules = data.modules || [];

      for (let i = 0; i < generatedModules.length; i++) {
        const mod = generatedModules[i];

        const moduleQuestions = mod.questions.map((qCode, index) => {
          const questionMatch = questions.find((q) => {
            const qNum = `${q.question_number}`.trim();
            const code = qCode.replace("Q", "").trim();
            return qNum === code;
          });
          if (questionMatch) {
            return { ...questionMatch, question_order: index };
          } else {
            console.warn(`Missing match for ${qCode}`);
            return null;
          }
        }).filter(Boolean);

        const { data: inserted, error: insertError } = await supabase
          .from("Modules")
          .insert([{ survey_id: selectedSurveyId, module_number: i + 1 }])
          .select();

        if (insertError || !inserted || inserted.length === 0) {
          console.error("Insert error:", insertError);
          continue;
        }

        const moduleId = inserted[0].id;
        const updates = moduleQuestions.map((q) => ({
          id: q.id,
          module_id: moduleId,
          question_order: q.question_order,
        }));

        // Admin-only policy fix: use RPC or ensure RLS allows updates
        const { error: bulkUpdateError } = await supabase
          .rpc("update_question_module_refs", { updates });

        if (bulkUpdateError) {
          console.error("Failed to bulk update questions:", bulkUpdateError);
        }
      }

      toast.success("Modules created and questions linked!");
      setModules(generatedModules);
    } catch (err) {
      console.error("Module generation failed:", err);
      toast.error("Server error while contacting ChatGPT.");
    }
  }

  return (
    <div className="container py-8">
      <Toaster />
      <h1 className="text-2xl font-bold mb-6">📦 Generate Survey Modules</h1>

      <div className="space-y-4 bg-white p-6 shadow rounded mb-6">
        <label>Select a Survey</label>
        <select
          value={selectedSurveyId}
          onChange={(e) => setSelectedSurveyId(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        >
          <option value="">— Choose Survey —</option>
          {surveys.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>

        <button
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          onClick={generateModules}
        >
          🧠 Generate Modules
        </button>
      </div>

      {modules.length > 0 && (
        <div className="bg-white p-6 shadow rounded space-y-4">
          <h2 className="text-xl font-semibold">Generated Modules</h2>
          {modules.map((mod, i) => (
            <div key={i} className="p-4 bg-gray-50 border rounded">
              <h3 className="font-bold mb-2">{mod.title || `Module ${i + 1}`}</h3>
              <ul className="list-disc ml-6">
                {mod.questions.map((qCode, idx) => {
                  const match = questions.find(q => `Q${q.question_number}` === qCode || `${q.question_number}` === qCode.replace("Q", ""));
                  const fullText = match?.question_text || `Missing: ${qCode}`;
                  return <li key={idx}>{fullText}</li>;
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
