import React, { useState, useEffect } from 'react';
import { Smartphone, Send, RotateCcw, Phone, Menu, BookOpen } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const DEMO_STEPS = [
  { label: '1. Register', path: '1', hint: 'Then enter name, city, area, confirm' },
  { label: '2. Log Waste', path: '2', hint: 'Type → kg → division → point' },
  { label: '3. Job Status', path: '3', hint: 'Shows recent logs' },
  { label: '4. Earnings', path: '4', hint: 'Available / processing / paid' },
  { label: '5. Withdraw', path: '5', hint: 'Amount → confirm (needs balance)' },
  { label: '6. Collection Points', path: '6', hint: 'Pick division e.g. 6*1' },
  { label: '7. Help', path: '7', hint: 'Support info' },
];

export default function UssdSimulator() {
  const [sessionId] = useState(`sim-${Date.now()}`);
  const [phoneNumber, setPhoneNumber] = useState('+256700000001');
  const [currentText, setCurrentText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [responseText, setResponseText] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    startSession();
  }, []);

  const postUssd = async (text) => {
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

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.text();
  };

  const startSession = async () => {
    setLoading(true);
    setError('');
    setCurrentText('');
    setUserInput('');
    setHistory([]);

    try {
      const text = await postUssd('');
      setResponseText(text);
      setSessionActive(true);
      setHistory([{ input: '', response: text }]);
    } catch (err) {
      setError(`Could not reach USSD service: ${err.message}`);
      setSessionActive(false);
    } finally {
      setLoading(false);
    }
  };

  const sendInput = async () => {
    if (!sessionActive) return;

    setLoading(true);
    setError('');

    const nextText = currentText ? `${currentText}*${userInput}` : userInput;

    try {
      const text = await postUssd(nextText);
      setResponseText(text);
      setCurrentText(nextText);
      setHistory((prev) => [...prev, { input: userInput, response: text }]);
      setUserInput('');

      if (text.startsWith('END')) {
        setSessionActive(false);
      }
    } catch (err) {
      setError(`Could not reach USSD service: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    startSession();
  };

  const quickDemo = async (path) => {
    setLoading(true);
    setError('');

    try {
      const text = await postUssd(path);
      setResponseText(text);
      setCurrentText(path);
      setHistory((prev) => [...prev, { input: path || '(main menu)', response: text }]);
      setUserInput('');

      if (text.startsWith('END')) {
        setSessionActive(false);
      } else {
        setSessionActive(true);
      }
    } catch (err) {
      setError(`Could not reach USSD service: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Smartphone className="w-8 h-8 text-emerald-600" />
            <h1 className="text-4xl font-bold text-gray-900">WasteLink USSD Simulator</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Feature-phone demo for pickers without smartphones. Uses <code className="text-sm bg-gray-100 px-1 rounded">{API_BASE_URL}/ussd</code>
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-gray-900">
              <div className="bg-gray-900 px-6 py-3 flex items-center gap-2">
                <Phone className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-semibold">WasteLink *123#</span>
              </div>

              <div className="bg-emerald-950 aspect-video p-6 flex flex-col">
                <div className="flex-1 bg-black rounded-lg p-4 mb-4 overflow-y-auto font-mono text-sm text-emerald-400 whitespace-pre-wrap">
                  {responseText || (loading ? 'Loading...' : 'Starting session...')}
                </div>

                <div className="bg-emerald-900 rounded p-2 mb-3 text-emerald-300 text-xs font-mono">
                  Phone: {phoneNumber} · Path: {currentText || '(main menu)'}
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendInput()}
                    placeholder="Enter option (e.g. 2 or 2*1*5*1*3). Use 0=back, 00=menu"
                    disabled={!sessionActive || loading}
                    className="w-full bg-emerald-900 text-emerald-300 placeholder-emerald-600 px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={sendInput}
                      disabled={!sessionActive || loading}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-500 text-white px-4 py-2 rounded font-semibold flex items-center justify-center gap-2 transition disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                    <button
                      onClick={resetSession}
                      disabled={loading}
                      className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-white px-4 py-2 rounded font-semibold flex items-center gap-2 transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-emerald-300 text-xs">
                  Session: {sessionActive ? '🟢 Active (CON)' : '🔴 Ended (END)'}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Menu className="w-5 h-5 text-emerald-600" />
                Quick Demo
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => quickDemo('')}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-4 py-2 rounded font-semibold transition text-sm"
                >
                  Main Menu
                </button>
                {DEMO_STEPS.map((step) => (
                  <button
                    key={step.path}
                    onClick={() => quickDemo(step.path)}
                    disabled={loading}
                    className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 px-4 py-2 rounded font-semibold transition text-sm text-left"
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                Demo Guide
              </h3>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                {DEMO_STEPS.map((step) => (
                  <li key={step.path}>
                    <span className="font-medium text-gray-800">{step.label.replace(/^\d+\.\s/, '')}</span>
                    <span className="block text-xs text-gray-500 ml-5">{step.hint}</span>
                  </li>
                ))}
              </ol>
              <p className="text-xs text-gray-500 mt-4">
                Registration example path: <code className="bg-gray-100 px-1">1*Your Name*1*Bwaise*1</code>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Log waste example: <code className="bg-gray-100 px-1">2*1*5*1*3</code> (type → kg → Kawempe → Kawempe Main = option 3)
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-sm text-red-700 font-semibold">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-3">Settings</h3>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                placeholder="e.g., +256700000001"
              />
              <p className="text-xs text-gray-500 mt-2">Change phone and Reset to test registration</p>
            </div>
          </div>
        </div>

        {history.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h3 className="font-bold text-gray-900 mb-4">Session History</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {history.map((item, idx) => (
                <div key={idx} className="border-l-4 border-emerald-500 pl-4">
                  <p className="text-sm font-mono text-emerald-600">→ {item.input || '(initial)'}</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono mt-1">{item.response}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
