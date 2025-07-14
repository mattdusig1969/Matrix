import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function Clients() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [companyList, setCompanyList] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [clients, setClients] = useState([]);
  const [editingClient, setEditingClient] = useState(null);

  useEffect(() => {
    fetchCompanies();
    fetchClients();
  }, []);

  const fetchCompanies = async () => {
    const { data, error } = await supabase.from('Company').select('*');
    if (error) {
      console.warn('⚠️ Company fetch error:', error);
    } else {
      setCompanyList(data);
    }
  };

  const fetchClients = async () => {
    const { data, error } = await supabase.from('Clients').select('*, Company(company_name)');
    if (error) {
      console.error('❌ Failed to load clients:', error);
    } else {
      setClients(data);
    }
  };

  const handleSubmit = async () => {
    if (!firstName || !lastName || !email || !selectedCompany) {
      toast.error('Please fill in all fields');
      return;
    }

    let companyId = selectedCompany;
    const existingCompany = companyList.find((c) => c.id === selectedCompany);

    if (!existingCompany) {
      const { data: newCompany, error: companyError } = await supabase
        .from('Company')
        .insert([{ company_name: selectedCompany }])
        .select()
        .single();

      if (companyError) {
        console.error('❌ Error inserting company:', companyError);
        toast.error('Error adding company');
        return;
      }
      companyId = newCompany.id;
    }

    const payload = {
      first_name: firstName,
      last_name: lastName,
      email,
      company_id: companyId,
    };

    let error;
    if (editingClient) {
      ({ error } = await supabase
        .from('Clients')
        .update(payload)
        .eq('id', editingClient.id));
    } else {
      ({ error } = await supabase.from('Clients').insert([payload]));
    }

    if (error) {
      console.error('❌ Supabase insert/update error:', error);
      toast.error('Error saving client');
    } else {
      toast.success(editingClient ? 'Client updated successfully' : 'Client added successfully');
      setFirstName('');
      setLastName('');
      setEmail('');
      setSelectedCompany('');
      setEditingClient(null);
      fetchClients();
      fetchCompanies();
    }
  };

  const handleEdit = (client) => {
    setFirstName(client.first_name);
    setLastName(client.last_name);
    setEmail(client.email);
    setSelectedCompany(client.company_id);
    setEditingClient(client);
  };

  return (
    <div className="p-10">
      <Toaster position="top-right" />
      <h2 className="text-2xl font-bold mb-4">👥 Manage Clients</h2>

      <div className="bg-white p-6 rounded shadow-md w-full max-w-xl mb-10">
        <input
          className="block w-full mb-3 p-2 border rounded bg-blue-50"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <input
          className="block w-full mb-3 p-2 border rounded bg-blue-50"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <input
          className="block w-full mb-3 p-2 border rounded bg-blue-50"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select
          className="block w-full mb-4 p-2 border rounded"
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
        >
          <option value="">Select Company</option>
          {companyList.map((company) => (
            <option key={company.id} value={company.id}>
              {company.company_name}
            </option>
          ))}
        </select>

        <button
          onClick={handleSubmit}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          {editingClient ? 'Update Client' : '+ Add New Client'}
        </button>
      </div>

      <h3 className="text-xl font-semibold mb-3">Client List</h3>
      <div className="bg-white p-4 rounded shadow-md w-full max-w-2xl">
        {clients.length === 0 ? (
          <p className="text-gray-600">No clients yet.</p>
        ) : (
          <ul>
            {clients.map((client) => (
              <li
                key={client.id}
                className="mb-2 flex justify-between items-center border-b pb-2"
              >
                <span>
                  {client.first_name} {client.last_name} – {client.email} (
                  {client.Company?.company_name || 'Unknown'})
                </span>
                <button
                  onClick={() => handleEdit(client)}
                  className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
