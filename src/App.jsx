import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import LogJob from './pages/LogJob.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Territory from './pages/Territory.jsx'
import Schedule from './pages/Schedule.jsx'
import Chat from './pages/Chat.jsx'
import Profile from './pages/Profile.jsx'
import Admin from './pages/admin/Admin.jsx'

export default function App() {
  const { user, loading } = useAuth()
  if (loading) {
    return <div className="app-shell"><div className="empty" style={{ marginTop: 120 }}>Loading DAB…</div></div>
  }
  if (!user) {
    return <Routes><Route path="*" element={<Login />} /></Routes>
  }
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/log" element={<LogJob />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/territory" element={<Territory />} />
      <Route path="/schedule" element={<Schedule />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
