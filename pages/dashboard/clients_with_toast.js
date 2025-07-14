
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [editingClient, setEditingClient] = useState(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    company_name: '',
    email: ''
  })

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    const { data, error } = await supabase.from('Clients').select('*').order('created_at', { ascending: false })
    if (error) {
      toast.error('Error loading clients.')
    } else {
      setClients(data)
    }
  }

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleEdit = (client) => {
    setEditingClient(client.id)
    setFormData({
      first_name: client.first_name || '',
      last_name: client.last_name || '',
      company_name: client.company_name || '',
      email: client.email || ''
    })
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('Clients').delete().eq('id', id)
    if (error) {
      toast.error('Error deleting client.')
    } else {
      toast.success('Client deleted.')
      fetchClients()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    let result

    if (editingClient) {
      result = await supabase.from('Clients').update(formData).eq('id', editingClient)
    } else {
      result = await supabase.from('Clients').insert([formData])
    }

    if (result.error) {
      toast.error('Error saving client.')
    } else {
      toast.success(editingClient ? 'Client updated.' : 'New client added.')
      setFormData({ first_name: '', last_name: '', company_name: '', email: '' })
      setEditingClient(null)
      fetchClients()
    }
  }

  return (
    <div style={{ padding: 30, maxWidth: 800 }}>
      <Toaster />
      <h1>👥 Manage Clients</h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: 30 }}>
        <h3>{editingClient ? 'Edit Client' : 'Add New Client'}</h3>
        <input name="first_name" value={formData.first_name} onChange={handleChange} placeholder="First Name" required /><br />
        <input name="last_name" value={formData.last_name} onChange={handleChange} placeholder="Last Name" required /><br />
        <input name="company_name" value={formData.company_name} onChange={handleChange} placeholder="Company Name" /><br />
        <input name="email" value={formData.email} onChange={handleChange} placeholder="Email" type="email" /><br />
        <button type="submit">{editingClient ? 'Update' : 'Add'} Client</button>
      </form>

      <h3>All Clients</h3>
      <table border="1" cellPadding="8" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Company</th>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map(client => (
            <tr key={client.id}>
              <td>{client.first_name} {client.last_name}</td>
              <td>{client.company_name}</td>
              <td>{client.email}</td>
              <td>
                <button onClick={() => handleEdit(client)}>Edit</button>
                <button onClick={() => handleDelete(client.id)} style={{ marginLeft: 10 }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
