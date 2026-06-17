import React, { useState, useEffect, useCallback } from 'react';
import {
  Smartphone,
  Phone,
  UserPlus,
  Recycle,
  CheckCircle,
  Wallet,
  Banknote,
  ChevronRight,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const DEMO_AGENT = {
  identifier: import.meta.env.VITE_DEMO_AGENT_EMAIL || 'gib@gmail.com',
  password: import.meta.env.VITE_DEMO_AGENT_PASSWORD || 'stellar.onchain',
};

const DEMO_ADMIN = {
  identifier: import.meta.env.VITE_DEMO_ADMIN_EMAIL || 'gibs@gmail.com',
  password: import.meta.env.VITE_DEMO_ADMIN_PASSWORD || 'stellar.onchain',
};

const CITY_OPTIONS = [
  { key: '1', label: 'Kampala' },
  { key: '2', label: 'Jinja' },
  { key: '3', label: 'Gulu' },
  { key: '4', label: 'Other (Kampala pilot)' },
];

const DIVISIONS = [
  { key: '1', label: 'Kawempe' },
  { key: '2', label: 'Central' },
  { key: '3', label: 'Nakawa' },
  { key: '4', label: 'Makindye' },
  { key: '5', label: 'Rubaga' },
];

const FLOW_STEPS = [
  { id: 'register', label: 'Register', icon: UserPlus },
  { id: 'log', label: 'Log waste', icon: Recycle },
  { id: 'verify', label: 'Verify', icon: CheckCircle },
  { id: 'earnings', label: 'Earnings', icon: Wallet },
  { id: 'withdraw', label: 'Withdraw', icon: Banknote },
];

const formatUgx = (n) => `UGX ${Number(n || 0).toLocaleString('en-UG')}`;

async function apiJson(url, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data, text };
}

export default function UssdSimulator() {
  const [sessionId] = useState(() => `sim-${Date.now()}`);
  const [phoneNumber, setPhoneNumber] = useState('+256700000001');
  const [activeStep, setActiveStep] = useState('register');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ussdScreen, setUssdScreen] = useState('');
  const [sessionActive, setSessionActive] = useState(true);

  const [registerForm, setRegisterForm] = useState({
    name: '',
    cityKey: '1',
    area: 'Bwaise',
  });
  const [registered, setRegistered] = useState(false);

  const [wasteTypes, setWasteTypes] = useState([]);
  const [collectionPoints, setCollectionPoints] = useState([]);
  const [logForm, setLogForm] = useState({
    wasteTypeId: '',
    kg: '5',
    divisionKey: '1',
    collectionPointId: '',
  });
  const [jobCode, setJobCode] = useState('');
  const [wasteLogId, setWasteLogId] = useState(null);
  const [verifiedKg, setVerifiedKg] = useState('5');
  const [verified, setVerified] = useState(false);
  const [earningAmount, setEarningAmount] = useState(null);

  const [earnings, setEarnings] = useState({
    available: 0,
    processing: 0,
    paid: 0,
    pendingJobs: 0,
  });

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawalId, setWithdrawalId] = useState(null);
  const [withdrawalPaid, setWithdrawalPaid] = useState(false);

  const [timeline, setTimeline] = useState([]);

  const addTimeline = (message, tone = 'neutral') => {
    setTimeline((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, message, tone, at: new Date().toLocaleTimeString() },
    ]);
  };

  const postUssd = useCallback(
    async (text) => {
      const response = await fetch(`${API_BASE_URL}/ussd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          serviceCode: '*123#',
          phoneNumber,
          text,
        }),
      });
      if (!response.ok) throw new Error(`USSD HTTP ${response.status}`);
      const body = await response.text();
      setUssdScreen(body);
      setSessionActive(body.startsWith('CON'));
      return body;
    },
    [sessionId, phoneNumber]
  );

  const loginDemo = async (creds) => {
    const result = await apiJson(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: { identifier: creds.identifier, password: creds.password },
    });
    if (!result.ok) throw new Error(result.data?.message || 'Login failed');
    return result.data?.data?.token;
  };

  const loadReferenceData = useCallback(async () => {
    try {
      const [typesRes, pointsRes] = await Promise.all([
        apiJson(`${API_BASE_URL}/city-waste-types/active?city=kampala`),
        apiJson(`${API_BASE_URL}/collection-points`),
      ]);
      const types = typesRes.data?.data || [];
      const points = (pointsRes.data?.data || []).filter((p) => p.status === 'ACTIVE');
      setWasteTypes(types);
      setCollectionPoints(points);

      const kawempeMain = points.find((p) => p.id === 1 || p.name?.includes('Kawempe Main'));
      setLogForm((prev) => ({
        ...prev,
        wasteTypeId: types[0]?.id ? String(types[0].id) : '',
        collectionPointId: kawempeMain ? String(kawempeMain.id) : points[0]?.id ? String(points[0].id) : '',
      }));
    } catch (err) {
      setError(err.message || 'Could not load waste types or collection points');
    }
  }, []);

  useEffect(() => {
    loadReferenceData();
    postUssd('').catch((err) => setError(err.message));
  }, [loadReferenceData, postUssd]);

  const pointsInDivision = collectionPoints.filter(
    (p) => p.division === DIVISIONS.find((d) => d.key === logForm.divisionKey)?.label
  );

  const stepIndex = FLOW_STEPS.findIndex((s) => s.id === activeStep);
  const stepDone = {
    register: registered,
    log: Boolean(jobCode),
    verify: verified,
    earnings: verified && earnings.available >= 0,
    withdraw: withdrawalPaid,
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { name, cityKey, area } = registerForm;
      if (!name.trim()) throw new Error('Enter the picker name');
      const path = `1*${name.trim()}*${cityKey}*${area.trim() || 'Not specified'}*1`;
      const response = await postUssd(path);
      if (response.includes('already registered')) {
        setRegistered(true);
        addTimeline('Picker already registered on this phone', 'warn');
        setActiveStep('log');
        return;
      }
      if (!response.includes('Registration successful')) {
        throw new Error(response.replace(/^END\s*/, ''));
      }
      setRegistered(true);
      addTimeline(`Registered ${name.trim()} on ${phoneNumber}`, 'success');
      setActiveStep('log');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogWaste = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const typeIndex = wasteTypes.findIndex((t) => String(t.id) === String(logForm.wasteTypeId));
      if (typeIndex < 0) throw new Error('Select a waste type');

      const divisionPoints = collectionPoints.filter(
        (p) => p.division === DIVISIONS.find((d) => d.key === logForm.divisionKey)?.label
      );
      const pointIndex = divisionPoints.findIndex(
        (p) => String(p.id) === String(logForm.collectionPointId)
      );
      if (pointIndex < 0) throw new Error('Select a collection point in this division');

      const kg = parseFloat(logForm.kg);
      if (!Number.isFinite(kg) || kg <= 0) throw new Error('Enter a valid weight in kg');

      const path = `2*${typeIndex + 1}*${kg}*${logForm.divisionKey}*${pointIndex + 1}`;
      const response = await postUssd(path);
      if (!response.includes('Waste logged successfully')) {
        throw new Error(response.replace(/^END\s*/, ''));
      }

      const match = response.match(/Job ([A-Z0-9-]+)/i);
      const code = match?.[1] || '';
      setJobCode(code);
      setVerified(false);
      setVerifiedKg(String(kg));
      setWithdrawalPaid(false);
      setWithdrawalId(null);
      addTimeline(`Logged ${kg}kg → ${code}`, 'success');
      setActiveStep('verify');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!jobCode) return;
    setLoading(true);
    setError('');
    try {
      const token = await loginDemo(DEMO_AGENT);
      const search = await apiJson(`${API_BASE_URL}/waste-logs/job/${encodeURIComponent(jobCode)}`, { token });
      const logId = search.data?.data?.id;
      if (!logId) throw new Error('Could not find waste log for job ' + jobCode);

      const kg = parseFloat(verifiedKg);
      if (!Number.isFinite(kg) || kg <= 0) throw new Error('Enter verified kg');

      const verify = await apiJson(`${API_BASE_URL}/waste-logs/${logId}/verify`, {
        method: 'PATCH',
        token,
        body: { verified_kg: kg },
      });
      if (!verify.ok) throw new Error(verify.data?.message || 'Verify failed');

      setWasteLogId(logId);
      setVerified(true);
      const amount = verify.data?.data?.earning?.amount;
      setEarningAmount(amount);
      addTimeline(`Agent verified ${kg}kg → ${formatUgx(amount)} available`, 'success');
      await refreshEarnings();
      setActiveStep('earnings');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const parseEarningsResponse = (text) => {
    const available = text.match(/Available: UGX ([\d,]+)/)?.[1]?.replace(/,/g, '') || '0';
    const processing = text.match(/Processing: UGX ([\d,]+)/)?.[1]?.replace(/,/g, '') || '0';
    const paid = text.match(/Paid: UGX ([\d,]+)/)?.[1]?.replace(/,/g, '') || '0';
    const pending = text.match(/Pending verification: (\d+)/)?.[1] || '0';
    return {
      available: Number(available),
      processing: Number(processing),
      paid: Number(paid),
      pendingJobs: Number(pending),
    };
  };

  const refreshEarnings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await postUssd('4');
      const parsed = parseEarningsResponse(response);
      setEarnings(parsed);
      addTimeline(
        `Balance: ${formatUgx(parsed.available)} available, ${formatUgx(parsed.paid)} paid`,
        'neutral'
      );
      return parsed;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const amount = parseInt(withdrawAmount, 10);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a valid withdrawal amount');

      const balance = await refreshEarnings();
      if (amount > (balance?.available || 0)) {
        throw new Error(`Insufficient balance. Available: ${formatUgx(balance?.available)}`);
      }

      const confirmScreen = await postUssd(`5*${amount}`);
      if (!confirmScreen.includes('Confirm')) {
        throw new Error(confirmScreen.replace(/^END\s*/, ''));
      }

      const submitted = await postUssd(`5*${amount}*1`);
      if (!submitted.includes('Withdrawal request received')) {
        throw new Error(submitted.replace(/^END\s*/, ''));
      }

      addTimeline(`Withdrawal ${formatUgx(amount)} submitted (processing)`, 'success');

      const adminToken = await loginDemo(DEMO_ADMIN);
      const list = await apiJson(`${API_BASE_URL}/withdrawals?all=true`, { token: adminToken });
      const latest = (list.data?.data || []).find(
        (w) =>
          String(w.phone || '').includes(phoneNumber.replace('+', '')) ||
          String(w.picker_phone || '').includes(phoneNumber.replace('+256', ''))
      ) || (list.data?.data || [])[0];

      if (latest?.id) {
        setWithdrawalId(latest.id);
        const confirm = await apiJson(`${API_BASE_URL}/withdrawals/${latest.id}/simulate-confirm`, {
          method: 'PATCH',
          token: adminToken,
        });
        if (confirm.ok) {
          setWithdrawalPaid(true);
          addTimeline(`Payout confirmed → ${formatUgx(amount)} paid to mobile money (demo)`, 'success');
        }
      }

      await refreshEarnings();
      setActiveStep('withdraw');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetDemo = async () => {
    setRegistered(false);
    setJobCode('');
    setWasteLogId(null);
    setVerified(false);
    setEarningAmount(null);
    setWithdrawalId(null);
    setWithdrawalPaid(false);
    setWithdrawAmount('');
    setEarnings({ available: 0, processing: 0, paid: 0, pendingJobs: 0 });
    setTimeline([]);
    setActiveStep('register');
    setError('');
    setLoading(true);
    try {
      await postUssd('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Smartphone className="w-8 h-8 text-[#238636]" />
            <h1 className="text-3xl font-bold text-[#111111]">Picker Journey Demo</h1>
          </div>
          <p className="text-[#666666] max-w-2xl mx-auto">
            Fill in the forms step by step — register, log waste, verify, earn, and withdraw — like a feature-phone picker on USSD.
          </p>
        </div>

        {/* Step progress */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {FLOW_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const done = stepDone[step.id];
            const current = step.id === activeStep;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition ${
                  current
                    ? 'bg-[#238636] text-white border-[#238636]'
                    : done
                      ? 'bg-[#238636]/10 text-[#238636] border-[#238636]/30'
                      : 'bg-white text-[#666666] border-[#D9D9D9]'
                }`}
              >
                <Icon size={16} />
                {idx + 1}. {step.label}
                {done && !current ? ' ✓' : ''}
              </button>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Phone preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden border-4 border-[#111111] sticky top-4">
              <div className="bg-[#111111] px-4 py-2 flex items-center gap-2">
                <Phone size={14} className="text-white" />
                <span className="text-white text-xs font-semibold">WasteLink *123# · {phoneNumber}</span>
              </div>
              <div className="bg-[#0a1f0a] p-4 min-h-[280px] flex flex-col">
                <div className="flex-1 bg-black rounded-lg p-3 font-mono text-sm text-[#4ade80] whitespace-pre-wrap overflow-y-auto">
                  {ussdScreen || (loading ? 'Loading...' : 'Dial *123#')}
                </div>
                <p className="mt-2 text-xs text-[#86efac]">
                  {sessionActive ? '🟢 Session open (CON)' : '🔴 Session ended (END) — continue next step'}
                </p>
              </div>
            </div>

            <div className="mt-4 bg-white rounded-2xl border border-[#D9D9D9] p-4">
              <h3 className="font-bold text-sm text-[#111111] mb-3">Live journey</h3>
              <ul className="space-y-2 text-sm">
                <li className={registered ? 'text-[#238636]' : 'text-[#999999]'}>
                  {registered ? '✓' : '○'} Registered {registered ? `(${phoneNumber})` : ''}
                </li>
                <li className={jobCode ? 'text-[#238636]' : 'text-[#999999]'}>
                  {jobCode ? '✓' : '○'} Waste logged {jobCode ? `→ ${jobCode}` : ''}
                </li>
                <li className={verified ? 'text-[#238636]' : 'text-[#999999]'}>
                  {verified ? '✓' : '○'} Agent verified {earningAmount != null ? `→ ${formatUgx(earningAmount)}` : ''}
                </li>
                <li className={earnings.available > 0 || earnings.paid > 0 ? 'text-[#238636]' : 'text-[#999999]'}>
                  {(earnings.available > 0 || earnings.paid > 0) ? '✓' : '○'} Earnings {formatUgx(earnings.available)} available
                </li>
                <li className={withdrawalPaid ? 'text-[#238636]' : 'text-[#999999]'}>
                  {withdrawalPaid ? '✓' : '○'} Withdrawal {withdrawalPaid ? 'paid (demo)' : withdrawalId ? 'processing' : ''}
                </li>
              </ul>
            </div>
          </div>

          {/* Step forms */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-[#D9D9D9] shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#111111]">
                  Step {stepIndex + 1}: {FLOW_STEPS[stepIndex]?.label}
                </h2>
                <button
                  type="button"
                  onClick={resetDemo}
                  className="flex items-center gap-1 text-sm text-[#666666] hover:text-[#238636]"
                >
                  <RotateCcw size={14} /> New demo
                </button>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {activeStep === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone number (USSD identity)</label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full rounded-lg border border-[#D9D9D9] px-3 py-2"
                      placeholder="+256700000099"
                    />
                    <p className="text-xs text-[#666666] mt-1">Use a new number each time you test registration</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Full name</label>
                    <input
                      type="text"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-lg border border-[#D9D9D9] px-3 py-2"
                      placeholder="Jane Nakato"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">City</label>
                    <select
                      value={registerForm.cityKey}
                      onChange={(e) => setRegisterForm((f) => ({ ...f, cityKey: e.target.value }))}
                      className="w-full rounded-lg border border-[#D9D9D9] px-3 py-2"
                    >
                      {CITY_OPTIONS.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Area / location</label>
                    <input
                      type="text"
                      value={registerForm.area}
                      onChange={(e) => setRegisterForm((f) => ({ ...f, area: e.target.value }))}
                      className="w-full rounded-lg border border-[#D9D9D9] px-3 py-2"
                      placeholder="Bwaise"
                    />
                  </div>
                  <SubmitButton loading={loading} label="Register picker via USSD" />
                </form>
              )}

              {activeStep === 'log' && (
                <form onSubmit={handleLogWaste} className="space-y-4">
                  {!registered && (
                    <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                      Register first, or use a phone that is already registered.
                    </p>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1">Waste type</label>
                    <select
                      value={logForm.wasteTypeId}
                      onChange={(e) => setLogForm((f) => ({ ...f, wasteTypeId: e.target.value }))}
                      className="w-full rounded-lg border border-[#D9D9D9] px-3 py-2"
                      required
                    >
                      {wasteTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} — {formatUgx(t.price_per_kg)}/kg
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Estimated weight (kg)</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={logForm.kg}
                      onChange={(e) => setLogForm((f) => ({ ...f, kg: e.target.value }))}
                      className="w-full rounded-lg border border-[#D9D9D9] px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Division</label>
                    <select
                      value={logForm.divisionKey}
                      onChange={(e) => {
                        const divisionKey = e.target.value;
                        const label = DIVISIONS.find((d) => d.key === divisionKey)?.label;
                        const first = collectionPoints.find((p) => p.division === label);
                        setLogForm((f) => ({
                          ...f,
                          divisionKey,
                          collectionPointId: first ? String(first.id) : '',
                        }));
                      }}
                      className="w-full rounded-lg border border-[#D9D9D9] px-3 py-2"
                    >
                      {DIVISIONS.map((d) => (
                        <option key={d.key} value={d.key}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Collection point</label>
                    <select
                      value={logForm.collectionPointId}
                      onChange={(e) => setLogForm((f) => ({ ...f, collectionPointId: e.target.value }))}
                      className="w-full rounded-lg border border-[#D9D9D9] px-3 py-2"
                      required
                    >
                      {pointsInDivision.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-[#666666] mt-1">Pick Kawempe Main for agent demo verify</p>
                  </div>
                  <SubmitButton loading={loading} label="Log waste via USSD" />
                </form>
              )}

              {activeStep === 'verify' && (
                <form onSubmit={handleVerify} className="space-y-4">
                  {jobCode ? (
                    <div className="rounded-lg bg-[#238636]/10 border border-[#238636]/20 px-4 py-3">
                      <p className="text-sm font-semibold text-[#238636]">Job {jobCode}</p>
                      <p className="text-xs text-[#666666] mt-1">Waiting for collection point agent to verify weight</p>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-700">Log waste first to get a job code.</p>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1">Verified weight (kg)</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={verifiedKg}
                      onChange={(e) => setVerifiedKg(e.target.value)}
                      className="w-full rounded-lg border border-[#D9D9D9] px-3 py-2"
                    />
                  </div>
                  <p className="text-xs text-[#666666]">
                    Demo uses agent account ({DEMO_AGENT.identifier}) to verify automatically.
                  </p>
                  <SubmitButton loading={loading} label="Verify as agent" disabled={!jobCode} />
                  <a
                    href="/agent/pending"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-[#238636] hover:underline"
                  >
                    Or verify in Agent dashboard <ExternalLink size={14} />
                  </a>
                </form>
              )}

              {activeStep === 'earnings' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <StatBox label="Available" value={formatUgx(earnings.available)} highlight />
                    <StatBox label="Processing" value={formatUgx(earnings.processing)} />
                    <StatBox label="Paid" value={formatUgx(earnings.paid)} />
                  </div>
                  {earnings.pendingJobs > 0 && (
                    <p className="text-sm text-amber-700">{earnings.pendingJobs} job(s) still pending verification</p>
                  )}
                  <button
                    type="button"
                    onClick={refreshEarnings}
                    disabled={loading}
                    className="w-full rounded-lg bg-[#238636] text-white py-2.5 font-semibold disabled:opacity-50"
                  >
                    Refresh from USSD (option 4)
                  </button>
                  {earnings.available > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setWithdrawAmount(String(Math.min(earnings.available, 500)));
                        setActiveStep('withdraw');
                      }}
                      className="w-full rounded-lg border border-[#238636] text-[#238636] py-2.5 font-semibold flex items-center justify-center gap-2"
                    >
                      Continue to withdraw <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              )}

              {activeStep === 'withdraw' && (
                <form onSubmit={handleWithdraw} className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <StatBox label="Available" value={formatUgx(earnings.available)} highlight />
                    <StatBox label="Processing" value={formatUgx(earnings.processing)} />
                    <StatBox label="Paid" value={formatUgx(earnings.paid)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Withdraw amount (UGX)</label>
                    <input
                      type="number"
                      min="1"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full rounded-lg border border-[#D9D9D9] px-3 py-2"
                      placeholder={earnings.available ? String(earnings.available) : '500'}
                      required
                    />
                    <p className="text-xs text-[#666666] mt-1">
                      Pays out to {phoneNumber} via USSD, then demo admin confirms payout
                    </p>
                  </div>
                  {withdrawalPaid && (
                    <div className="rounded-lg bg-[#238636]/10 border border-[#238636]/20 px-4 py-3 text-sm text-[#238636] font-semibold">
                      ✓ Withdrawal complete (demo mobile money payout confirmed)
                    </div>
                  )}
                  <SubmitButton
                    loading={loading}
                    label={withdrawalPaid ? 'Withdraw again (new amount)' : 'Withdraw via USSD + confirm payout'}
                    disabled={!verified}
                  />
                </form>
              )}
            </div>

            {timeline.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#D9D9D9] p-4">
                <h3 className="font-bold text-sm mb-3">Activity log</h3>
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {timeline.map((item) => (
                    <li key={item.id} className="text-sm flex gap-2">
                      <span className="text-[#999999] shrink-0">{item.at}</span>
                      <span
                        className={
                          item.tone === 'success'
                            ? 'text-[#238636]'
                            : item.tone === 'warn'
                              ? 'text-amber-700'
                              : 'text-[#444444]'
                        }
                      >
                        {item.message}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmitButton({ loading, label, disabled }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full rounded-lg bg-[#238636] hover:bg-[#1a6b2b] text-white py-2.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Working...' : label}
    </button>
  );
}

function StatBox({ label, value, highlight }) {
  return (
    <div
      className={`rounded-xl border p-3 text-center ${
        highlight ? 'border-[#238636] bg-[#238636]/5' : 'border-[#D9D9D9] bg-[#f8f9fa]'
      }`}
    >
      <p className="text-xs text-[#666666]">{label}</p>
      <p className="text-sm font-bold text-[#111111] mt-1">{value}</p>
    </div>
  );
}
