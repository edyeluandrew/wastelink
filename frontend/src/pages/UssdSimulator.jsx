import React, { useState, useEffect } from 'react';
import { Smartphone, Send, RotateCcw, Phone, Menu } from 'lucide-react';
import { motion } from 'framer-motion';

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

  // Initialize session on component mount
  useEffect(() => {
    startSession();
  }, []);

  const startSession = async () => {
    setLoading(true);
    setError('');
    setCurrentText('');
    setUserInput('');
    setHistory([]);

    try {
      const response = await fetch('http://localhost:5000/api/ussd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          serviceCode: '*123#',
          phoneNumber,
          text: '',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
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
    if (!userInput.trim() && userInput !== '') return;
    if (!sessionActive) return;

    setLoading(true);
    setError('');

    // Build the next text value by appending input with *
    const nextText = currentText ? `${currentText}*${userInput}` : userInput;

    try {
      const response = await fetch('http://localhost:5000/api/ussd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          serviceCode: '*123#',
          phoneNumber,
          text: nextText,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      setResponseText(text);
      setCurrentText(nextText);
      setHistory([...history, { input: userInput, response: text }]);
      setUserInput('');

      // Check if session should end
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
    if (!sessionActive) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/ussd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          serviceCode: '*123#',
          phoneNumber,
          text: path,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      setResponseText(text);
      setCurrentText(path);
      setHistory([...history, { input: path, response: text }]);
      setUserInput('');

      // Check if session should end
      if (text.startsWith('END')) {
        setSessionActive(false);
      }
    } catch (err) {
      setError(`Could not reach USSD service: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Smartphone className="w-8 h-8 text-emerald-600" />
            <h1 className="text-4xl font-bold text-gray-900">WasteLink USSD Simulator</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Feature-phone access demo for waste pickers without smartphones. Test USSD flows in real-time.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:col-span-2"
          >
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-gray-900">
              {/* Phone Bezel */}
              <div className="bg-gray-900 px-6 py-3 flex items-center gap-2">
                <Phone className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-semibold">WasteLink</span>
              </div>

              {/* Screen */}
              <div className="bg-emerald-950 aspect-video p-6 flex flex-col">
                {/* Response Display */}
                <div className="flex-1 bg-black rounded-lg p-4 mb-4 overflow-y-auto font-mono text-sm text-emerald-400 whitespace-pre-wrap">
                  {responseText || (loading ? 'Loading...' : 'Starting session...')}
                </div>

                {/* Phone Number Display */}
                <div className="bg-emerald-900 rounded p-2 mb-3 text-emerald-300 text-xs font-mono">
                  Phone: {phoneNumber}
                </div>

                {/* Input Area */}
                <div className="space-y-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendInput()}
                    placeholder="Enter option (e.g., 5 or 5*1)"
                    disabled={!sessionActive || loading}
                    className="w-full bg-emerald-900 text-emerald-300 placeholder-emerald-600 px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={sendInput}
                      disabled={!sessionActive || loading || !userInput}
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

                {/* Session Status */}
                <div className="mt-3 text-emerald-300 text-xs">
                  Session: {sessionActive ? '🟢 Active' : '🔴 Ended'}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Panel - Demo & History */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Quick Demo Buttons */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Menu className="w-5 h-5 text-emerald-600" />
                Quick Demo
              </h3>

              <div className="space-y-3">
                <button
                  onClick={() => quickDemo('')}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-4 py-2 rounded font-semibold transition"
                >
                  Main Menu
                </button>

                <button
                  onClick={() => quickDemo('5')}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-4 py-2 rounded font-semibold transition"
                >
                  Collection Points
                </button>

                <button
                  onClick={() => quickDemo('5*1')}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-4 py-2 rounded font-semibold transition"
                >
                  Kawempe Points
                </button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border-l-4 border-red-500 p-4 rounded"
              >
                <p className="text-sm text-red-700 font-semibold">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </motion.div>
            )}

            {/* Phone Number Editor */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-3">Settings</h3>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                placeholder="e.g., +256700000001"
              />
              <p className="text-xs text-gray-500 mt-2">Change and restart session to test</p>
            </div>

            {/* Session Info */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-3">Session Info</h3>
              <div className="text-sm space-y-2">
                <div>
                  <span className="text-gray-600">Session ID:</span>
                  <p className="font-mono text-xs text-gray-800 break-all">{sessionId}</p>
                </div>
                <div>
                  <span className="text-gray-600">Current Path:</span>
                  <p className="font-mono text-xs text-gray-800">{currentText || '(main menu)'}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* History Section */}
        {history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-white rounded-lg shadow-lg p-6"
          >
            <h3 className="font-bold text-gray-900 mb-4">Session History</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {history.map((item, idx) => (
                <div key={idx} className="border-l-4 border-emerald-500 pl-4">
                  <p className="text-sm font-mono text-emerald-600">
                    → {item.input || '(initial)'}
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono mt-1">
                    {item.response.substring(0, 100)}
                    {item.response.length > 100 ? '...' : ''}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
