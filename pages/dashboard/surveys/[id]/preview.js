import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

// --- Reusable Question Component (Updated for all types) ---
const QuestionRenderer = ({ question, answer, onAnswerChange }) => {
    const { question_type, answer_option } = question;

    switch (question_type) {
        case 'single_select_radio':
        case 'likert_scale':
            return (
                <div className="space-y-2">
                    {(answer_option || []).map(opt => (
                        <label key={opt} className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-gray-50">
                            <input type="radio" name={question.id} value={opt} checked={answer === opt} onChange={(e) => onAnswerChange(question.id, e.target.value, question_type)} className="h-4 w-4"/>
                            <span className="text-gray-800">{opt}</span>
                        </label>
                    ))}
                </div>
            );
        case 'single_select_dropdown':
            return (
                <select onChange={(e) => onAnswerChange(question.id, e.target.value, question_type)} value={answer || ''} className="w-full border px-3 py-2 rounded-md bg-white">
                    <option value="" disabled>-- Select an option --</option>
                    {(answer_option || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            );
        case 'multiple_select':
        case 'ranking':
            return (
                <div className="space-y-2">
                    {(answer_option || []).map(opt => (
                        <label key={opt} className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-gray-50">
                            <input type="checkbox" name={question.id} value={opt} checked={(answer || []).includes(opt)} onChange={(e) => onAnswerChange(question.id, e.target.value, question_type)} className="h-4 w-4 rounded"/>
                            <span className="text-gray-800">{opt}</span>
                        </label>
                    ))}
                </div>
            );
        case 'user_input':
            return <textarea value={answer || ''} onChange={(e) => onAnswerChange(question.id, e.target.value, question_type)} className="w-full border p-2 rounded-md" rows={3} />;
        case 'rating_scale':
            const min = parseInt(answer_option?.min, 10) || 1;
            const max = parseInt(answer_option?.max, 10) || 5;
            const scaleOptions = Array.from({ length: max - min + 1 }, (_, i) => i + min);
            return (
                <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">{answer_option?.minLabel}</span>
                    <div className="flex gap-3">
                        {scaleOptions.map(num => (
                            <label key={num} className="flex flex-col items-center cursor-pointer">
                                <span className="text-xs">{num}</span>
                                <input type="radio" name={question.id} value={num} checked={answer == num} onChange={(e) => onAnswerChange(question.id, e.target.value, question_type)} className="h-4 w-4 mt-1"/>
                            </label>
                        ))}
                    </div>
                    <span className="text-sm text-gray-600">{answer_option?.maxLabel}</span>
                </div>
            );
        case 'matrix':
            return (
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr>
                            <th className="p-2"></th>
                            {(answer_option.columns || []).map(col => <th key={col} className="p-2 text-center font-normal text-gray-600">{col}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {(answer_option.rows || []).map(row => (
                            <tr key={row} className="border-t">
                                <td className="p-2 font-medium">{row}</td>
                                {(answer_option.columns || []).map(col => (
                                    <td key={col} className="p-2 text-center">
                                        <input type="radio" name={`${question.id}-${row}`} value={col} checked={(answer || {})[row] === col} onChange={() => onAnswerChange(question.id, { row, value: col }, question_type)} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        default:
            return <p className="text-sm text-red-500">Unsupported question type: {question_type}</p>;
    }
};


export default function SurveyPreviewPage() {
    const router = useRouter();
    const { id, tab = 'preview' } = router.query;
    const [survey, setSurvey] = useState(null);
    const [modules, setModules] = useState([]);
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
    const [userSessionId, setUserSessionId] = useState(null);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (!id) return;
        startNewSession();
    }, [id]);

    const startNewSession = async () => {
        setLoading(true);
        setUserSessionId(uuidv4());
        setCurrentModuleIndex(0);
        setAnswers({});
        setIsComplete(false);
        const { data: surveyData } = await supabase.from('Surveys').select('id, title').eq('id', id).single();
        setSurvey(surveyData);
        const { data: modulesData } = await supabase.from('Modules').select(`*, questions(*)`).eq('survey_id', id).order('module_number');
        setModules(modulesData || []);
        setLoading(false);
    };

    // Updated to handle all answer data formats
    const handleAnswerChange = (questionId, selectedOption, questionType) => {
        setAnswers(prev => {
            const newAnswers = { ...prev };
            if (questionType === 'multiple_select' || questionType === 'ranking') {
                const currentAnswers = prev[questionId] || [];
                newAnswers[questionId] = currentAnswers.includes(selectedOption)
                    ? currentAnswers.filter(a => a !== selectedOption)
                    : [...currentAnswers, selectedOption];
            } else if (questionType === 'matrix') {
                const currentMatrixAnswers = prev[questionId] || {};
                const { row, value } = selectedOption;
                newAnswers[questionId] = { ...currentMatrixAnswers, [row]: value };
            } else {
                newAnswers[questionId] = selectedOption;
            }
            return newAnswers;
        });
    };

    const handleNextModule = async () => {
        const currentModule = modules[currentModuleIndex];
        if (!currentModule) return;

        const responsesToSave = currentModule.questions.map(q => {
            let answerToSave = answers[q.id] || null;
            if (Array.isArray(answerToSave)) {
                answerToSave = answerToSave.join(', ');
            } else if (typeof answerToSave === 'object' && answerToSave !== null) {
                answerToSave = JSON.stringify(answerToSave);
            }
            return {
                user_session_id: userSessionId,
                module_id: currentModule.id,
                question_text: q.question_text,
                selected_answer: answerToSave,
                completed: true
            };
        });

        const { error } = await supabase.from('ModuleResponses').insert(responsesToSave);
        if (error) {
            toast.error("Failed to save responses.");
            return;
        }
        toast.success(`Module ${currentModule.module_number} responses saved!`);
        if (currentModuleIndex < modules.length - 1) {
            setCurrentModuleIndex(prev => prev + 1);
        } else {
            setIsComplete(true);
        }
    };
    
    if (loading) return <div className="p-10">Loading Survey Preview...</div>;
    const currentModule = modules[currentModuleIndex];

    return (
        <div className="p-10">
            <Toaster />
            <h1 className="text-2xl font-bold mb-4">📝 Edit Survey: <span className="text-black">{survey?.title}</span></h1>
            <div className="flex space-x-4 border-b">
                <Link href={`/dashboard/surveys/${id}/general`} className={`px-4 py-2 rounded-t-lg ${tab === 'general' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>General</Link>
                <Link href={`/dashboard/surveys/${id}/targeting`} className={`px-4 py-2 rounded-t-lg ${tab === 'targeting' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>Targeting</Link>
                <Link href={`/dashboard/surveys/${id}/modules`} className={`px-4 py-2 rounded-t-lg ${tab === 'modules' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>Modules</Link>
                <Link href={`/dashboard/surveys/${id}/adcode`} className={`px-4 py-2 rounded-t-lg ${tab === 'adcode' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>Ad Code</Link>
                <Link href={`/dashboard/surveys/${id}/preview`} className={`px-4 py-2 rounded-t-lg ${tab === 'preview' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>Preview</Link>
                <Link href={`/dashboard/surveys/${id}/quotas`} className={`px-4 py-2 rounded-t-lg ${tab === 'quotas' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>Quotas</Link>
                <Link href={`/dashboard/surveys/${id}/reporting`} className={`px-4 py-2 rounded-t-lg ${tab === 'reporting' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>Reporting</Link>
            </div>
            <div className="bg-white shadow p-6 rounded-md max-w-2xl mx-auto mt-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Survey Preview</h2>
                    <button onClick={startNewSession} className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm font-semibold">
                        🔄 Restart Survey
                    </button>
                </div>
                <p className="text-xs text-gray-500 mb-4">Session ID: {userSessionId}</p>
                {isComplete ? (
                    <div className="text-center p-8 bg-green-50 rounded-lg">
                        <h3 className="text-2xl font-bold text-green-700">Survey Complete!</h3>
                        <p className="mt-2 text-gray-600">You can restart to test again.</p>
                    </div>
                ) : currentModule ? (
                    <div>
                        <h3 className="font-bold text-lg mb-4">Module {currentModule.module_number}</h3>
                        <div className="space-y-6">
                            {currentModule.questions.sort((a,b) => a.question_order - b.question_order).map(q => (
                                <div key={q.id} className="p-4 border rounded-lg">
                                    <p className="font-semibold mb-2">{q.question_text}</p>
                                    <QuestionRenderer question={q} answer={answers[q.id]} onAnswerChange={handleAnswerChange} />
                                </div>
                            ))}
                        </div>
                        <button onClick={handleNextModule} className="w-full bg-blue-600 text-white mt-8 py-3 rounded-md font-bold">
                            Next Module
                        </button>
                    </div>
                ) : (
                    <p className="text-gray-500">This survey has no modules to preview.</p>
                )}
            </div>
        </div>
    );
}