import React, { useState, useCallback, useMemo } from 'react';
import { Smartphone, RotateCcw, CheckCircle, UserPlus, Recycle, Wallet, Banknote } from 'lucide-react';
import UssdPhone from './ussd/UssdPhone';
import { parseUssdScreen, parseJourneyFromEnd } from './ussd/ussdScreenParser';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const SERVICE_CODE = '*123#';

const DEMO_AGENT = {
  identifier: import.meta.env.VITE_DEMO_AGENT_EMAIL || 'gib@gmail.com',
  password: import.meta.env.VITE_DEMO_AGENT_PASSWORD || 'stellar.onchain',
};

const DEMO_ADMIN = {
  identifier: import.meta.env.VITE_DEMO_ADMIN_EMAIL || 'gibs@gmail.com',
  password: import.meta.env.VITE_DEMO_ADMIN_PASSWORD || 'stellar.onchain',
};

const formatUgx = (n) => `UGX ${Number(n || 0).toLocaleString('en-UG')}`;

async function apiJson(url, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
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
  const [sessionId, setSessionId] = useState(() => `sim-${Date.now()}`);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dialDisplay, setDialDisplay] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [ussdScreen, setUssdScreen] = useState('');
  const [buffer, setBuffer] = useState('');

  const [journey, setJourney] = useState({
    registered: false,
    jobCode: '',
    verified: false,
    earningAmount: null,
    earnings: { available: 0, processing: 0, paid: 0 },
    withdrawalPaid: false,
  });
  const [timeline, setTimeline] = useState([]);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const parsed = useMemo(() => parseUssdScreen(ussdScreen), [ussdScreen]);

  const addTimeline = (message, tone = 'neutral') => {
    setTimeline((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, message, tone, at: new Date().toLocaleTimeString() },
    ]);
  };

  const postUssd = useCallback(
    async (text, phoneOverride) => {
      const activePhone = phoneOverride ?? phoneNumber;
      const response = await fetch(`${API_BASE_URL}/ussd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          serviceCode: SERVICE_CODE,
          phoneNumber: activePhone,
          text,
        }),
      });
      if (!response.ok) throw new Error(`USSD HTTP ${response.status}`);
      const body = await response.text();
      setUssdScreen(body);
      setCurrentPath(text);

      if (body.startsWith('END')) {
        const updates = parseJourneyFromEnd(body);
        setJourney((prev) => ({ ...prev, ...updates }));
        if (updates.registered) addTimeline('Registered via USSD', 'success');
        if (updates.jobCode) addTimeline(`Logged waste → ${updates.jobCode}`, 'success');
        if (updates.withdrawSubmitted) addTimeline('Withdrawal submitted', 'success');
        if (updates.earnings) {
          addTimeline(`Earnings: ${formatUgx(updates.earnings.available)} available`, 'neutral');
        }
      }

      return body;
    },
    [sessionId, phoneNumber]
  );

  const sendPath = async (nextPath) => {
    setLoading(true);
    setError('');
    try {
      await postUssd(nextPath);
      setBuffer('');
    } catch (err) {
      setError(err.message || 'Could not reach USSD service');
    } finally {
      setLoading(false);
    }
  };

  const appendSegment = (segment) => {
    const next = currentPath ? `${currentPath}*${segment}` : segment;
    return sendPath(next);
  };

  const normalizePhoneInput = (raw) => {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('+')) return trimmed;
    if (trimmed.startsWith('0')) return `+256${trimmed.slice(1)}`;
    if (trimmed.startsWith('256')) return `+${trimmed}`;
    return trimmed;
  };

  const handleDial = async () => {
    const normalized = normalizePhoneInput(phoneNumber);
    if (!normalized || normalized.length < 10) {
      setError('Enter your phone number first (e.g. +256700000099 or 0779305759)');
      return;
    }
    if (normalized !== phoneNumber) setPhoneNumber(normalized);

    setLoading(true);
    setError('');
    setDialDisplay(SERVICE_CODE);
    try {
      await postUssd('', normalized);
      setConnected(true);
      setCurrentPath('');
      addTimeline(`Dialed ${SERVICE_CODE} as ${normalized}`, 'neutral');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHangUp = () => {
    setConnected(false);
    setCurrentPath('');
    setUssdScreen('');
    setBuffer('');
    setDialDisplay('');
    setSessionId(`sim-${Date.now()}`);
    addTimeline('Hung up — dial again to start', 'neutral');
  };

  const handleSelectOption = (key) => {
    if (loading || parsed.isEnd) return;
    appendSegment(key);
  };

  const handleKeyPress = (digit) => {
    if (!connected) {
      if (/^[0-9]$/.test(digit)) {
        setPhoneNumber((p) => p + digit);
      } else if (digit === '*') {
        setPhoneNumber((p) => (p ? p : '+'));
      } else if (digit === '0') {
        setPhoneNumber((p) => p + '0');
      } else if (digit === '#') {
        handleDial();
      }
      return;
    }

    if (parsed.isEnd) return;

    if (parsed.inputMode === 'menu') {
      if (/^[0-9]$/.test(digit)) {
        appendSegment(digit);
      }
      return;
    }

    if (parsed.inputMode === 'numeric') {
      if (/^[0-9.]$/.test(digit)) setBuffer((b) => b + digit);
      else if (digit === '#') handleSend();
      return;
    }

    if (parsed.inputMode === 'text') {
      if (digit === '#') handleSend();
      else if (/^[0-9*#]$/.test(digit)) setBuffer((b) => b + digit);
    }
  };

  const handleSend = () => {
    const value = buffer.trim();
    if (!value || loading || parsed.isEnd) return;
    appendSegment(value);
  };

  const handleBack = () => {
    if (!connected || loading) return;
    sendPath(currentPath ? `${currentPath}*0` : '0');
  };

  const handleMainMenu = () => {
    if (!connected || loading) return;
    sendPath(currentPath ? `${currentPath}*00` : '00');
  };

  const resetAll = () => {
    handleHangUp();
    setJourney({
      registered: false,
      jobCode: '',
      verified: false,
      earningAmount: null,
      earnings: { available: 0, processing: 0, paid: 0 },
      withdrawalPaid: false,
    });
    setTimeline([]);
    setError('');
  };

  const handleDemoVerify = async () => {
    if (!journey.jobCode || journey.verified) return;
    setVerifyLoading(true);
    setError('');
    try {
      const login = await apiJson(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        body: DEMO_AGENT,
      });
      const token = login.data?.data?.token;
      if (!token) throw new Error('Agent login failed');

      const search = await apiJson(
        `${API_BASE_URL}/waste-logs/job/${encodeURIComponent(journey.jobCode)}`,
        { token }
      );
      const logId = search.data?.data?.id;
      if (!logId) throw new Error('Job not found');

      const verify = await apiJson(`${API_BASE_URL}/waste-logs/${logId}/verify`, {
        method: 'PATCH',
        token,
        body: { verified_kg: 5 },
      });
      if (!verify.ok) throw new Error(verify.data?.message || 'Verify failed');

      const amount = verify.data?.data?.earning?.amount;
      setJourney((prev) => ({
        ...prev,
        verified: true,
        earningAmount: amount,
        earnings: { ...prev.earnings, available: Number(amount || 0) },
      }));
      addTimeline(`Agent verified → ${formatUgx(amount)} available`, 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleDemoConfirmPayout = async () => {
    setVerifyLoading(true);
    setError('');
    try {
      const adminToken = (
        await apiJson(`${API_BASE_URL}/auth/login`, { method: 'POST', body: DEMO_ADMIN })
      ).data?.data?.token;
      const list = await apiJson(`${API_BASE_URL}/withdrawals?all=true`, { token: adminToken });
      const phoneTail = phoneNumber.replace(/\D/g, '').slice(-9);
      const wd = (list.data?.data || []).find(
        (w) =>
          w.status === 'PROCESSING' &&
          String(w.picker_phone || w.phone || '')
            .replace(/\D/g, '')
            .includes(phoneTail)
      );
      if (!wd) throw new Error('No processing withdrawal for this phone');

      const confirm = await apiJson(`${API_BASE_URL}/withdrawals/${wd.id}/simulate-confirm`, {
        method: 'PATCH',
        token: adminToken,
      });
      if (!confirm.ok) throw new Error(confirm.data?.message || 'Confirm failed');

      setJourney((prev) => ({ ...prev, withdrawalPaid: true }));
      addTimeline(`Payout confirmed ${formatUgx(wd.amount)}`, 'success');
      if (connected) await sendPath('4');
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleDeletePress = () => {
    if (!connected) {
      setPhoneNumber((p) => p.slice(0, -1));
      return;
    }
    setBuffer((b) => String(b).slice(0, -1));
  };

  const pathDisplay = connected ? (currentPath || '(main menu)') : '';

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Smartphone className="w-8 h-8 text-[#238636]" />
            <h1 className="text-3xl font-bold text-[#111111]">WasteLink USSD Phone</h1>
          </div>
          <p className="text-[#666666] max-w-xl mx-auto">
            Dial <strong>*123#</strong>, use the keypad, pick menu options, and enter name, weight, or amount — just like a real feature phone.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-2">
            <UssdPhone
              phoneNumber={phoneNumber}
              onPhoneNumberChange={setPhoneNumber}
              dialDisplay={pathDisplay}
              ussdScreen={ussdScreen}
              parsed={parsed}
              buffer={buffer}
              onBufferChange={setBuffer}
              connected={connected}
              loading={loading}
              onKeyPress={handleKeyPress}
              onSend={handleSend}
              onSelectOption={handleSelectOption}
              onDial={parsed.isEnd && connected ? () => sendPath('') : handleDial}
              onHangUp={handleHangUp}
              onBack={handleBack}
              onMainMenu={handleMainMenu}
              onDeletePress={handleDeletePress}
            />
          </div>

          <div className="lg:col-span-3 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="bg-white rounded-2xl border border-[#D9D9D9] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[#111111]">How to use the phone</h2>
                <button
                  type="button"
                  onClick={resetAll}
                  className="flex items-center gap-1 text-sm text-[#666666] hover:text-[#238636]"
                >
                  <RotateCcw size={14} /> Reset all
                </button>
              </div>
              <ol className="text-sm text-[#444444] space-y-2 list-decimal list-inside">
                <li>Enter <strong>your phone number</strong> (type or use keypad), then tap <span className="text-[#238636] font-semibold">green call</span> to dial *123#</li>
                <li>Tap a menu number on screen <em>or</em> press it on the keypad</li>
                <li>When asked for name, area, kg, or amount — type in the bar and press <strong># Send</strong></li>
                <li>Use <strong>0 Back</strong> or <strong>00 Menu</strong> to navigate</li>
                <li>Red button hangs up — change number and dial again for a new picker</li>
              </ol>
            </div>

            <div className="bg-white rounded-2xl border border-[#D9D9D9] p-5">
              <h2 className="font-bold text-[#111111] mb-3">Live journey</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <JourneyItem
                  icon={UserPlus}
                  done={journey.registered}
                  label="Registered"
                  detail={journey.registered ? phoneNumber : 'Dial → 1 Register'}
                />
                <JourneyItem
                  icon={Recycle}
                  done={Boolean(journey.jobCode)}
                  label="Waste logged"
                  detail={journey.jobCode || 'Dial → 2 Log Waste'}
                />
                <JourneyItem
                  icon={CheckCircle}
                  done={journey.verified}
                  label="Verified"
                  detail={
                    journey.verified
                      ? formatUgx(journey.earningAmount)
                      : journey.jobCode
                        ? `Job ${journey.jobCode} — needs agent`
                        : 'After log waste'
                  }
                />
                <JourneyItem
                  icon={Wallet}
                  done={journey.earnings.available > 0 || journey.earnings.paid > 0}
                  label="Earnings"
                  detail={`${formatUgx(journey.earnings.available)} avail · ${formatUgx(journey.earnings.paid)} paid`}
                />
                <JourneyItem
                  icon={Banknote}
                  done={journey.withdrawalPaid}
                  label="Withdrawn"
                  detail={journey.withdrawalPaid ? 'Paid (demo)' : 'Dial → 5 Withdraw'}
                />
              </div>

              {journey.jobCode && !journey.verified && (
                <button
                  type="button"
                  onClick={handleDemoVerify}
                  disabled={verifyLoading}
                  className="mt-4 w-full rounded-lg bg-[#238636] text-white py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {verifyLoading ? 'Working...' : `Demo: verify ${journey.jobCode} as agent`}
                </button>
              )}

              {journey.verified && !journey.withdrawalPaid && journey.earnings.available >= 0 && (
                <p className="mt-3 text-xs text-[#666666]">
                  After withdraw on phone, tap below to simulate mobile money payout (demo admin).
                </p>
              )}
              {journey.verified && !journey.withdrawalPaid && (
                <button
                  type="button"
                  onClick={handleDemoConfirmPayout}
                  disabled={verifyLoading}
                  className="mt-2 w-full rounded-lg border border-[#238636] text-[#238636] py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Demo: confirm payout
                </button>
              )}
            </div>

            <div className="bg-[#238636]/5 rounded-2xl border border-[#238636]/20 p-5">
              <h3 className="font-bold text-[#238636] text-sm mb-2">Quick path example</h3>
              <p className="text-xs text-[#444444] leading-relaxed">
                Register: <code className="bg-white px-1 rounded">1</code> → name → division → area →{' '}
                <code className="bg-white px-1 rounded">1</code> confirm
                <br />
                Log waste: <code className="bg-white px-1 rounded">2</code> → type → kg → division → collection point
                <br />
                Earnings: <code className="bg-white px-1 rounded">4</code> · Withdraw:{' '}
                <code className="bg-white px-1 rounded">5</code> → amount → confirm
              </p>
            </div>

            {timeline.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#D9D9D9] p-4">
                <h3 className="font-bold text-sm mb-2">Activity</h3>
                <ul className="space-y-1 max-h-40 overflow-y-auto text-sm">
                  {timeline.map((item) => (
                    <li key={item.id} className="flex gap-2">
                      <span className="text-[#999999] shrink-0 text-xs">{item.at}</span>
                      <span className={item.tone === 'success' ? 'text-[#238636]' : 'text-[#444444]'}>
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

function JourneyItem({ icon: Icon, done, label, detail }) {
  return (
    <div
      className={`rounded-xl border p-3 flex gap-3 items-start ${
        done ? 'border-[#238636]/40 bg-[#238636]/5' : 'border-[#D9D9D9] bg-[#fafafa]'
      }`}
    >
      <Icon size={18} className={done ? 'text-[#238636]' : 'text-[#bbbbbb]'} />
      <div>
        <p className={`text-sm font-semibold ${done ? 'text-[#238636]' : 'text-[#666666]'}`}>{label}</p>
        <p className="text-xs text-[#888888] mt-0.5">{detail}</p>
      </div>
    </div>
  );
}
