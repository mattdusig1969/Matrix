import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast from 'react-hot-toast';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

// ... same imports as before ...
const CATEGORIES = ['Demographics', 'Geographics', 'Psychographics'];

export default function TargetingPage() {
  const router = useRouter();
  const { id } = router.query;

  const [countryId, setCountryId] = useState('');
  const [countryName, setCountryName] = useState('');
  const [countries, setCountries] = useState([]);
  const [fields, setFields] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Demographics');
  const [selectedField, setSelectedField] = useState('');
  const [options, setOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [surveyMeta, setSurveyMeta] = useState(null);
  const [targetingFieldsByCategory, setTargetingFieldsByCategory] = useState({});

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchSurveyMeta().then(fetchCountries).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (countries.length > 0 && countryId && !countryName) {
      const selected = countries.find(c => c.id === countryId);
      if (selected) setCountryName(selected.country_name);
    }
  }, [countries, countryId]);

  useEffect(() => {
    if (countryId && selectedCategory) {
      fetchFields(selectedCategory);
    }
  }, [countryId, selectedCategory]);

  useEffect(() => {
    if (selectedField && selectedCategory) {
      fetchOptions(selectedCategory, selectedField);
    }
  }, [selectedField]);

  function categoryHasSelections(category) {
    const fields = targetingFieldsByCategory[category] || [];
    return fields.some(f => (selectedOptions[f] || []).length > 0);
  }

  async function fetchSurveyMeta() {
    const { data, error } = await supabase
      .from('Surveys')
      .select('*, Clients(first_name, last_name)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Survey fetch error:', error);
      return;
    }

    const clientName = data.Clients
      ? `${data.Clients.first_name} ${data.Clients.last_name}`
      : '';

    setSurveyMeta({
      title: data.title,
      clientName,
      createdAt: new Date(data.created_at).toLocaleDateString(),
    });

    if (data.country_id) setCountryId(data.country_id);

    const targeting = data.targeting || {};
    setSelectedOptions(targeting);

    const categoryFieldMap = {
      Demographics: [],
      Geographics: [],
      Psychographics: [],
    };

    const allFields = Object.keys(targeting || {});
    for (const field of allFields) {
      const demoRes = await supabase.from('demoattributes').select('field_name').eq('field_name', field).maybeSingle();
      const geoRes = await supabase.from('geoattributes').select('field_name').eq('field_name', field).maybeSingle();
      const psychoRes = await supabase.from('psychoattributes').select('field_name').eq('field_name', field).maybeSingle();

      if (demoRes.data) categoryFieldMap.Demographics.push(field);
      else if (geoRes.data) categoryFieldMap.Geographics.push(field);
      else if (psychoRes.data) categoryFieldMap.Psychographics.push(field);
    }

    setTargetingFieldsByCategory(categoryFieldMap);
  }

  async function fetchCountries() {
    const { data, error } = await supabase
      .from('Country')
      .select('id, country_name')
      .order('country_name');

    if (!error) setCountries(data);
    else console.error('Countries fetch error:', error);
  }

  async function fetchFields(category) {
    const table =
      category === 'Demographics' ? 'demoattributes' :
      category === 'Geographics' ? 'geoattributes' :
      'psychoattributes';

    const { data, error } = await supabase
      .from(table)
      .select('field_name, country_id')
      .or(`country_id.eq.${countryId},country_id.is.null`)
      .order('field_name');

    if (!error && data) {
      const uniqueFields = [...new Set(data.map(d => d.field_name))];
      setFields(uniqueFields);
      const initialField = uniqueFields.find(f => selectedOptions[f]?.length > 0) || uniqueFields[0] || '';
      setSelectedField(initialField);
      if (initialField) fetchOptions(category, initialField);
    } else {
      console.error(`Error fetching ${category} fields:`, error);
      setFields([]);
    }
  }

  async function fetchOptions(category, field) {
    const table =
      category === 'Demographics' ? 'demoattributes' :
      category === 'Geographics' ? 'geoattributes' :
      'psychoattributes';

    const { data, error } = await supabase
      .from(table)
      .select('value')
      .eq('field_name', field)
      .or(`country_id.eq.${countryId},country_id.is.null`)
      .order('value');

    if (!error && data) {
      setOptions(data.map(d => d.value));
    } else {
      console.error('Options fetch error:', error);
      setOptions([]);
    }
  }

  function toggleOption(field, option) {
    setSelectedOptions(prev => {
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
    setSaving(true);
    const { error } = await supabase
      .from('Surveys')
      .update({ targeting: selectedOptions, country_id: countryId })
      .eq('id', id);

    if (error) {
      toast.error('Error saving targeting');
      console.error(error);
    } else {
      toast.success('Targeting saved!');
    }
    setSaving(false);
  }

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">
        📝 Edit Survey:{' '}
        <span className="text-black">{surveyMeta?.title}</span>
        {surveyMeta?.clientName && (
          <span className="text-gray-600 text-base ml-2">
            | Client: {surveyMeta.clientName}
          </span>
        )}
      </h1>

      <div className="flex space-x-4 border-b mt-4 mb-8">
        {['general', 'targeting', 'quotas', 'reporting'].map(tab => (
          <Link
            key={tab}
            href={`/dashboard/surveys/${id}/${tab}`}
            className={`px-4 py-2 border border-b-0 bg-white ${
              tab === 'targeting'
                ? 'text-blue-600 font-bold'
                : 'text-black font-semibold'
            } rounded-t`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="p-6 text-gray-500 italic">Loading targeting interface...</div>
      ) : (
        <div className="flex gap-6">
          <div className="bg-white shadow p-6 rounded-md max-w-4xl w-full">
            <div className="mb-4">
              <label className="block font-medium mb-1">Select Country:</label>
              <select
                value={countryId}
                disabled={countries.length === 0}
                onChange={(e) => {
                  const selected = countries.find(c => c.id === e.target.value);
                  setCountryId(e.target.value);
                  setCountryName(selected?.country_name || '');
                }}
                className="border rounded px-2 py-1 w-60"
              >
                <option value="">Select Country</option>
                {countries.map(({ id, country_name }) => (
                  <option key={id} value={id}>{country_name}</option>
                ))}
              </select>
            </div>

            {countryId && (
              <div className="flex border rounded divide-x bg-white shadow">
                <div className="w-1/4 p-4 bg-slate-50 border-r">
                  {CATEGORIES.map(cat => (
                    <div
                      key={cat}
                      className={`cursor-pointer py-2 border-b hover:bg-slate-100 flex justify-between items-center ${
                        selectedCategory === cat ? 'font-bold text-blue-700' : ''
                      }`}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setSelectedField('');
                      }}
                    >
                      <span>{cat}</span>
                      {categoryHasSelections(cat) && (
                        <span className="text-green-600 text-sm">✔</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="w-1/4 p-4 bg-slate-50 border-r">
                  {fields.map(field => (
                    <div
                      key={field}
                      className={`cursor-pointer py-2 border-b hover:bg-slate-100 ${
                        selectedField === field ? 'font-bold text-blue-700' : ''
                      }`}
                      onClick={() => {
                        setSelectedField(field);
                      }}
                    >
                      {field}
                    </div>
                  ))}
                </div>

                <div className="w-1/2 p-4 bg-white">
                  {options.map(option => (
                    <label key={option} className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        checked={(selectedOptions[selectedField] || []).includes(option)}
                        onChange={() => toggleOption(selectedField, option)}
                        className="h-4 w-4"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className={`mt-6 bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 ${
                saving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {saving ? (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
              ) : '✅ Save Targeting'}
            </button>
          </div>

          <div className="bg-gray-50 shadow p-4 rounded-md w-80">
            <h2 className="text-md font-semibold mb-2">Targeting Summary</h2>
            {countryName && (
              <p className="text-sm text-blue-700 font-semibold mb-2">{countryName}</p>
            )}
            {Object.keys(selectedOptions).length === 0 ? (
              <p className="text-sm italic text-gray-500">No attributes selected</p>
            ) : (
              Object.entries(selectedOptions).map(([field, values]) => (
                values.length > 0 && (
                  <div key={field} className="mb-3">
                    <div className="font-medium text-sm text-gray-700">{field}</div>
                    <ul className="ml-3 list-disc text-sm text-gray-800">
                      {values.map(val => <li key={val}>{val}</li>)}
                    </ul>
                  </div>
                )
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
