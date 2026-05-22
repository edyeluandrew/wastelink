#!/usr/bin/env python3
import os

os.chdir('/home/localhost8081/wastelink/frontend/src/picker')

# 1. PickerDashboard.jsx
with open('pages/PickerDashboard.jsx', 'w') as f:
    f.write("""import { useEffect, useState, useCallback } from 'react';
import { getPickerSession } from '../utils/pickerSession';
import PickerStatCard from '../components/PickerStatCard';
import PickerJobCard from '../components/PickerJobCard';
import { api } from '../../api/axios';
import { Wave, FileText, Wallet } from 'lucide-react';

export default function PickerDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const picker = getPickerSession();

  const fetchJobs = useCallback(async () => {
    if (!picker) return;
    try {
      const res = await api.get(`/waste-logs?picker_id=${picker.id}`);
      setJobs(res.data.data || []);
    } catch (error) {
      console.error('[PickerDashboard] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [picker]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  if (!picker) return <div>Loading...</div>;

  const pending = jobs.filter(j => j.status === 'PENDING').length;
  const verified = jobs.filter(j => j.status === 'VERIFIED').length;
  const paid = jobs.filter(j => j.status === 'PAID').length;
  const totalKg = jobs
    .filter(j => j.status === 'VERIFIED' || j.status === 'PAID')
    .reduce((sum, j) => sum + (j.verified_kg || 0), 0);

  const recentJobs = jobs.slice(0, 5);

  return (
    <div className="space-y-6 pb-24">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
        <div className="flex items-start gap-3">
          <Wave className="w-8 h-8 text-green-700 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Welcome, {picker.name}!
            </h2>
            <p className="text-sm text-gray-700">Code: {picker.picker_code}</p>
            <p className="text-sm text-gray-600">{picker.division} • {picker.main_waste_type}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <PickerStatCard icon="⏳" label="Pending" value={pending} color="amber" />
        <PickerStatCard icon="✅" label="Verified" value={verified} color="green" />
        <PickerStatCard icon="💳" label="Paid" value={paid} color="blue" />
        <PickerStatCard icon="⚖️" label="Total Kg" value={totalKg} color="green" />
      </div>

      {/* Earnings Summary */}
      <div className="space-y-2">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-700">Total Earnings</p>
          <p className="text-2xl font-bold text-blue-900">USh 0</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium">
          <FileText className="w-5 h-5" />
          Log Waste
        </button>
        <button className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
          <Wallet className="w-5 h-5" />
          My Earnings
        </button>
      </div>

      {/* Recent Jobs */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-900">Recent Jobs</h3>
          <button className="text-sm text-green-700 hover:text-green-800 font-medium">
            View all →
          </button>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading jobs...</div>
        ) : recentJobs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-3">No jobs yet</p>
            <button className="text-green-700 hover:text-green-800 font-medium">
              Log your first waste
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentJobs.map(job => (
              <PickerJobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
""")
print('✓ Updated PickerDashboard.jsx')

# 2. MyJobs.jsx
with open('pages/MyJobs.jsx', 'w') as f:
    f.write("""import { useEffect, useState, useCallback } from 'react';
import { getPickerSession } from '../utils/pickerSession';
import PickerJobCard from '../components/PickerJobCard';
import { api } from '../../api/axios';
import { Briefcase } from 'lucide-react';

const statusFilters = ['All', 'Pending', 'Verified', 'Rejected', 'Paid'];

export default function MyJobs() {
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const picker = getPickerSession();

  const fetchJobs = useCallback(async () => {
    if (!picker) return;
    try {
      const res = await api.get(`/waste-logs?picker_id=${picker.id}`);
      setJobs(res.data.data || []);
    } catch (error) {
      console.error('[MyJobs] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [picker]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filteredJobs = filter === 'All'
    ? jobs
    : jobs.filter(j => j.status === filter.toUpperCase());

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="w-6 h-6 text-gray-900" />
        <h1 className="text-2xl font-bold text-gray-900">My Jobs</h1>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {statusFilters.map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition ${
              filter === status
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Job Count */}
      <p className="text-sm text-gray-600">
        {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
      </p>

      {/* Jobs List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading jobs...</div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No {filter.toLowerCase()} jobs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map(job => (
            <PickerJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
""")
print('✓ Updated MyJobs.jsx')

# 3. MyEarnings.jsx
with open('pages/MyEarnings.jsx', 'w') as f:
    f.write("""import { useEffect, useState, useCallback } from 'react';
import { getPickerSession } from '../utils/pickerSession';
import PickerJobCard from '../components/PickerJobCard';
import { api } from '../../api/axios';
import { formatUGX, formatDate } from '../../utils/formatters';
import { Wallet } from 'lucide-react';

export default function MyEarnings() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const picker = getPickerSession();

  const fetchJobs = useCallback(async () => {
    if (!picker) return;
    try {
      const res = await api.get(`/waste-logs?picker_id=${picker.id}`);
      setJobs(res.data.data || []);
    } catch (error) {
      console.error('[MyEarnings] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [picker]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const verifiedJobs = jobs.filter(j => j.status === 'VERIFIED' || j.status === 'PAID');
  const paidJobs = jobs.filter(j => j.status === 'PAID');
  const totalEarnings = verifiedJobs.reduce((sum, j) => sum + (j.earning?.amount || 0), 0);
  const paidEarnings = paidJobs.reduce((sum, j) => sum + (j.earning?.amount || 0), 0);
  const pendingEarnings = totalEarnings - paidEarnings;
  const verifiedKg = verifiedJobs.reduce((sum, j) => sum + (j.verified_kg || 0), 0);

  if (loading) return <div className="text-center py-8">Loading earnings...</div>;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-6 h-6 text-gray-900" />
        <h1 className="text-2xl font-bold text-gray-900">My Earnings</h1>
      </div>

      {/* Summary Cards */}
      <div className="space-y-3">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-700">Total Earnings</p>
          <p className="text-3xl font-bold text-green-900">{formatUGX(totalEarnings)}</p>
          <p className="text-xs text-green-600 mt-1">{verifiedJobs.length} verified job{verifiedJobs.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-700">Verified Weight</p>
          <p className="text-3xl font-bold text-blue-900">{verifiedKg.toFixed(2)} kg</p>
          <p className="text-xs text-blue-600 mt-1">Total waste verified</p>
        </div>
      </div>

      {/* Earnings History */}
      {verifiedJobs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No verified earnings yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Earnings History</h3>
          {verifiedJobs.map(job => (
            <PickerJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
""")
print('✓ Updated MyEarnings.jsx')

# 4. PickerHelp.jsx - Most comprehensive
with open('pages/PickerHelp.jsx', 'w') as f:
    f.write("""import { Zap, BarChart3, Edit3, Trash2, Leaf, Cpu, Package, Recycle, AlertCircle, MessageCircle, HelpCircle } from 'lucide-react';

export default function PickerHelp() {
  return (
    <div className="space-y-8 pb-24">
      <h1 className="text-2xl font-bold text-gray-900">Help & Instructions</h1>
      <p className="text-gray-600">How to use WasteLink Picker Portal</p>

      {/* Getting Started */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Getting Started</h2>
        </div>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li><strong>Create Account</strong> - Register with your phone number</li>
          <li><strong>Log Waste</strong> - Tell us what waste you collected and how much</li>
          <li><strong>Get Job Code</strong> - We give you a unique code</li>
          <li><strong>Take to Collection Point</strong> - Bring waste to the collection point</li>
          <li><strong>Agent Verifies</strong> - Agent weighs and verifies your waste</li>
          <li><strong>Earn Money</strong> - Your earnings are calculated automatically</li>
        </ol>
      </section>

      {/* Job Status */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Understanding Job Status</h2>
        </div>
        <div className="space-y-3">
          <div className="border-l-4 border-amber-500 pl-3">
            <p className="font-semibold text-amber-900">⏳ PENDING</p>
            <p className="text-sm text-gray-700">Your waste is waiting for agent verification at the collection point</p>
          </div>
          <div className="border-l-4 border-green-500 pl-3">
            <p className="font-semibold text-green-900">✅ VERIFIED</p>
            <p className="text-sm text-gray-700">Agent confirmed your waste and weighed it. Earnings are calculated.</p>
          </div>
          <div className="border-l-4 border-red-500 pl-3">
            <p className="font-semibold text-red-900">❌ REJECTED</p>
            <p className="text-sm text-gray-700">The waste did not meet quality standards. Ask the agent for details.</p>
          </div>
          <div className="border-l-4 border-blue-500 pl-3">
            <p className="font-semibold text-blue-900">💳 PAID</p>
            <p className="text-sm text-gray-700">You have been paid for this job.</p>
          </div>
        </div>
      </section>

      {/* Job Code */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Edit3 className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">What's a Job Code?</h2>
        </div>
        <div className="space-y-2 text-sm text-gray-700">
          <p>When you log waste in WasteLink, we create a unique Job Code for you. This is like a receipt number.</p>
          <p><strong>Save or remember this code.</strong> When you go to the collection point with your waste, the agent will scan or enter this code to verify your delivery.</p>
          <p>If you forget your code, go to "My Jobs" to see all your codes.</p>
        </div>
      </section>

      {/* Waste Types */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Trash2 className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Types of Waste We Accept</h2>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <Recycle className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <p className="font-semibold">PLASTIC</p>
              <p className="text-sm text-gray-600">Bottles, bags, containers</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <p className="font-semibold">MIXED RECYCLABLES</p>
              <p className="text-sm text-gray-600">Mixed clean recyclables</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Leaf className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <p className="font-semibold">ORGANIC</p>
              <p className="text-sm text-gray-600">Food waste, garden waste</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Cpu className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <p className="font-semibold">E-WASTE</p>
              <p className="text-sm text-gray-600">Electronics, phones, computers</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <p className="font-semibold">METAL & CARDBOARD</p>
              <p className="text-sm text-gray-600">Cans, metals, cardboard boxes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Earnings */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-green-600" />
          How Earnings Work
        </h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li>You earn money when waste is <strong>VERIFIED</strong></li>
          <li>Amount depends on waste type and actual weight</li>
          <li>See your earnings in the "My Earnings" section</li>
          <li>Watch for payout notifications</li>
          <li>Payment details coming soon</li>
        </ul>
      </section>

      {/* Tips */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-amber-600" />
          <h2 className="text-lg font-bold text-gray-900">Important Tips</h2>
        </div>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li>Keep your waste clean and sorted if possible</li>
          <li>Be honest about the weight you estimate</li>
          <li>Save your Job Code before going to collection point</li>
          <li>Arrive at collection point while it's open</li>
          <li>Ask the agent if your waste is rejected - get feedback</li>
        </ul>
      </section>

      {/* Support */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Need Help?</h2>
        </div>
        <div className="space-y-2 text-sm text-gray-700">
          <p><strong>For questions or issues:</strong></p>
          <p>Talk to your collection point agent - they know the system</p>
          <p>Contact your community WasteLink champion if you have one</p>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center py-4 text-gray-600 text-sm">
        <p>Thank you for helping clean up Kampala! 🌍</p>
      </div>
    </div>
  );
}
""")
print('✓ Updated PickerHelp.jsx')

print('\n✓ ALL emoji icons replaced with lucide-react!')
