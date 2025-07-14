import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

const CATEGORIES = ['Demographics', 'Geographics', 'Psychographics'];

export default function SelectTargeting() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { id } = router.query;
  const [country, setCountry] = useState('');
  const [countries, setCountries] = useState([]);
  const [fields, setFields] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Demographics');
  const [selectedField, setSelectedField] = useState('');
  const [options, setOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [surveyMeta, setSurveyMeta] = useState(null);

  useEffect(() => {
    if (id) {
      Promise.all([fetchSurveyMeta(), fetchCountries()]).then(() => {
        setLoading(false);
      });
    }
  }, [id]);

  async function fetchCountries() {
    const { data, error } = await supabase
      .from('geoattributes')
      .select('value')
      .eq('field_name', 'Country')
      .order('value');

    if (!error && data) {
      const unique = [...new Set(data.map(d => d.value))];
      setCountries(unique);
      setCountry(unique[0]);
    } else {
      console.error('Error fetching countries:', error);
    }
  }

  async function fetchSurveyMeta() {
    try {
      const { data, error } = await supabase
        .from('Surveys')
        .select('title, created_at, client_id')
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('Failed to fetch survey meta:', error);
        return;
      }

      const { data: client, error: clientError } = await supabase
        .from('Clients')
        .select('first_name, last_name')
        .eq('id', data.client_id)
        .single();

      if (clientError || !client) {
        console.error('Failed to fetch client meta:', clientError);
        return;
      }

      setSurveyMeta({
        clientName: `${client.first_name} ${client.last_name}`,
        title: data.title,
        createdAt: new Date(data.created_at).toLocaleDateString(),
      });
    } catch (err) {
      console.error('Unexpected error loading survey meta:', err);
    }
  }

  useEffect(() => {
    if (selectedCategory && country) {
      fetchFields(selectedCategory, country);
    }
  }, [selectedCategory, country]);

  async function fetchFields(category, country) {
    const mockFields = {
      Demographics: ['Age', 'Gender', 'Income'],
      Geographics: ['State', 'Region'],
      Psychographics: ['Interests', 'Lifestyle']
    };
    const defaultField = mockFields[category][0];
    setFields(mockFields[category]);
    setSelectedField(defaultField);
    fetchOptions(defaultField);
  }

  async function fetchOptions(field) {
    const mockOptions = {
      Age: ['18-24', '25-34', '35-44', '45+'],
      Gender: ['Male', 'Female', 'Other'],
      Income: ['<50k', '50k-100k', '100k+'],
      State: ['California', 'Texas', 'New York'],
      Region: ['West', 'Midwest', 'Northeast'],
      Interests: ['Eco-Conscious', 'Tech Savvy', 'Adventurous'],
      Lifestyle: ['Luxury', 'Frugal', 'Minimalist']
    };
    setOptions(mockOptions[field] || []);
  }

  function toggleOption(field, option) {
    setSelectedOptions((prev) => {
      const current = prev[field] || [];
      return {
        ...prev,
        [field]: current.includes(option)
          ? current.filter(o => o !== option)
          : [...current, option]
      };
    });
  }

  async function handleSave() {
    console.log('Saving targeting:', selectedOptions);
    const { error } = await supabase
      .from('Surveys')
      .update({ targeting: selectedOptions })
      .eq('id', id);
    if (error) {
      console.error('Save failed:', error);
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <>
      {loading ? (
        <div className="p-8 text-gray-500 italic">Loading targeting interface...</div>
      ) : (
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-2">🎯 Select Targeting</h1>
          <p className="text-sm text-gray-600 italic mb-4">
            {surveyMeta
              ? `Client: ${surveyMeta.clientName} | Survey: ${surveyMeta.title} | Date: ${surveyMeta.createdAt}`
              : '⚠️ surveyMeta not loaded'}
          </p>

          <div className="mb-6">
            <label className="block font-medium mb-1">Select Country:</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="border rounded px-2 py-1 w-40"
            >
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex border rounded divide-x bg-white shadow-sm">
            <div className="w-1/4 p-4 divide-y bg-slate-50 border-r">
              {CATEGORIES.map(cat => (
                <div
                  key={cat}
                  className={`cursor-pointer py-2 border-b ${selectedCategory === cat ? 'font-bold text-blue-700' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </div>
              ))}
            </div>

            <div className="w-1/4 p-4 divide-y bg-slate-50 border-r">
              {fields.map(field => (
                <div
                  key={field}
                  className={`cursor-pointer py-2 border-b ${selectedField === field ? 'font-bold text-blue-700' : ''}`}
                  onClick={() => {
                    setSelectedField(field);
                    fetchOptions(field);
                  }}
                >
                  {field}
                </div>
              ))}
            </div>

            <div className="w-1/2 p-4 divide-y bg-white">
              {options.map(option => (
                <label
                  key={option}
                  className="flex items-center justify-start gap-3 py-2 whitespace-nowrap text-left"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={(selectedOptions[selectedField] || []).includes(option)}
                    onChange={() => toggleOption(selectedField, option)}
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            className="mt-6 bg-blue-600 text-white px-4 py-2 rounded"
            onClick={handleSave}
          >
            ✅ Save Targeting
          </button>
        </div>
      )}
    </>
  );
}
