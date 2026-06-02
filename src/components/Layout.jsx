import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { IconHome, IconBolt, IconTrophy, IconMap, IconChat, IconUsers, IconCalendar } from './icons.jsx'

const initials = (name = '') => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
const roleLabel = { owner: 'Owner', manager: 'Manager', sub_manager: 'Team Leader', rep: 'Rep' }

export default function Layout({ title, subtitle, children, back }) {
  const { user, isAdmin, HAS_BACKEND } = useAuth()
  const nav = useNavigate()

  const items = [
    { to: '/', label: 'Home', Icon: IconHome, end: true },
    { to: '/log', label: 'Log', Icon: IconBolt },
    { to: '/leaderboard', label: 'Ranks', Icon: IconTrophy },
    { to: '/territory', label: 'Map', Icon: IconMap },
    { to: '/schedule', label: 'Shifts', Icon: IconCalendar },
    { to: '/chat', label: 'Chat', Icon: IconChat },
  ]
  if (isAdmin) items.push({ to: '/admin', label: 'Admin', Icon: IconUsers })

  return (
    <div className="app-shell">
      {!HAS_BACKEND && <div className="mock-banner">Demo mode — sample data, no backend yet. Add Supabase keys to go live.</div>}
      <div className="topbar">
        <div>
          <h1>{title || <span>DAB<span className="logo-dot">.</span></span>}</h1>
          {subtitle && <div className="sub">{subtitle}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="role-chip">{roleLabel[user?.role] || ''}</span>
          <button className="avatar" onClick={() => nav('/profile')} aria-label="Profile">{initials(user?.name)}</button>
        </div>
      </div>

      <div className="page">{children}</div>

      <nav className="bottomnav">
        {items.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => 'navitem' + (isActive ? ' active' : '')}>
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
