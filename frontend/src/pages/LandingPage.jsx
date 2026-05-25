import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, MapPin, CheckCircle, BarChart2 } from 'lucide-react'
import { Button } from '../components'
import { getAuthToken, getAuthUser, getDefaultRouteForRole } from '../utils/auth'

export default function LandingPage() {
  const navigate = useNavigate()
  const token = getAuthToken()
  const user = getAuthUser()

  const dashboardRoute = useMemo(() => {
    if (!user) return null
    return getDefaultRouteForRole(user.role)
  }, [user])

  return (
    <div className=
