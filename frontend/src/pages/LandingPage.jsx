import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, MapPin, CheckCircle, BarChart2, Smartphone } from 'lucide-react'
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
    <div className="min-h-screen bg-white px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center gap-2">
              <img src="/brand/wastelink-icon.png" alt="WasteLink" className="h-16 w-16 object-contain" />
              <h1 className="text-3xl font-bold text-[#238636]">WasteLink Uganda</h1>
            </div>
            <div className="flex items-center gap-3">
              {token && dashboardRoute ? (
                <Button onClick={() => navigate(dashboardRoute)} className="bg-[#238636] text-white">Go to Dashboard</Button>
              ) : (
                <>
                  <Button onClick={() => navigate('/login')} className="bg-[#238636] text-white">Login</Button>
                  <Button variant="secondary" onClick={() => navigate('/picker/register')}>Register as Picker</Button>
                </>
              )}
            </div>
          </div>
          <div className="rounded-lg overflow-hidden bg-gradient-to-r from-[#238636] to-[#2F9E44]">
            <img src="/brand/wastelink-uganda-hero.png" alt="WasteLink Uganda" className="w-full h-64 md:h-80 object-cover" />
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-[#238636] mb-2">Verified waste collection. Fair earnings. Cleaner communities.</h2>
            <p className="text-base text-wastelink-muted max-w-2xl mx-auto">WasteLink connects waste pickers, collection point agents, and city administrators through verified collection, transparent earnings, and real-time reporting.</p>
          </div>
        </header>

        <main className="grid gap-8 md:grid-cols-2">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">How it works</h2>
            <ol className="list-inside list-decimal space-y-2 text-sm text-wastelink-muted">
              <li>Picker logs waste</li>
              <li>Agent verifies kg</li>
              <li>Earnings are calculated</li>
              <li>City/Admin monitors impact</li>
            </ol>

            <h2 className="mt-6 text-lg font-semibold">User roles</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2"><Users size={18} className="text-[#238636]" /><strong>Pickers</strong></div>
                <p className="text-sm text-wastelink-muted mt-2">Log waste and earn from verified collections.</p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2"><MapPin size={18} className="text-[#238636]" /><strong>Collection Point Agents</strong></div>
                <p className="text-sm text-wastelink-muted mt-2">Verify weights and manage collections at points.</p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2"><BarChart2 size={18} className="text-[#238636]" /><strong>City Admins</strong></div>
                <p className="text-sm text-wastelink-muted mt-2">Monitor city-wide impact and reports.</p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2"><CheckCircle size={18} className="text-[#238636]" /><strong>Super Admin</strong></div>
                <p className="text-sm text-wastelink-muted mt-2">Manage system settings and users.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Kampala pilot focus</h2>
            <ul className="list-inside list-disc text-sm text-wastelink-muted">
              <li>Kawempe</li>
              <li>Makindye</li>
              <li>Nakawa</li>
            </ul>

            <h2 className="mt-6 text-lg font-semibold">Impact highlights</h2>
            <ul className="grid gap-2 text-sm text-wastelink-muted">
              <li>Verified waste</li>
              <li>Transparent earnings</li>
              <li>Cleaner communities</li>
              <li>Informal worker inclusion</li>
            </ul>
          </section>
        </main>

        <section className="mt-12 pt-8 border-t">
          <div className="rounded-lg bg-gradient-to-br from-[#238636]/5 to-[#2F9E44]/5 p-8 text-center">
            <div className="flex justify-center mb-4">
              <Smartphone className="w-8 h-8 text-[#238636]" />
            </div>
            <h3 className="text-2xl font-bold text-[#238636] mb-3">Try the full picker journey</h3>
            <p className="text-base text-wastelink-muted max-w-2xl mx-auto mb-6">
              Register, log waste, verify, check earnings, and withdraw — step by step in one demo UI (same USSD backend as feature phones).
            </p>
            <Button onClick={() => navigate('/ussd-simulator')} className="bg-[#238636] text-white">
              Open Picker Journey Demo
            </Button>
          </div>
        </section>

