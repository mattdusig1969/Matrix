import { useState } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://fpytddctddiqubxjsfaq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZweXRkZGN0ZGRpcXVieGpzZmFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NTkxNDIsImV4cCI6MjA2NjUzNTE0Mn0.veKMuGsRqkEX2Oid2ly9MFMILtrwbtHGegsKWyTPwrI')

export default function Login() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email for the login link!')
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
        <button type="submit">Send Magic Link</button>
      </form>
      <p>{message}</p>
    </div>
  )
}
