import { Delete, Phone, PhoneOff } from 'lucide-react';

const KEYPAD = [
  { digit: '1', sub: '' },
  { digit: '2', sub: 'ABC' },
  { digit: '3', sub: 'DEF' },
  { digit: '4', sub: 'GHI' },
  { digit: '5', sub: 'JKL' },
  { digit: '6', sub: 'MNO' },
  { digit: '7', sub: 'PQRS' },
  { digit: '8', sub: 'TUV' },
  { digit: '9', sub: 'WXYZ' },
  { digit: '*', sub: '' },
  { digit: '0', sub: '+' },
  { digit: '#', sub: '' },
];

export default function UssdPhone({
  phoneNumber,
  dialDisplay,
  ussdScreen,
  parsed,
  buffer,
  onBufferChange,
  connected,
  loading,
  onKeyPress,
  onSend,
  onSelectOption,
  onDial,
  onHangUp,
  onBack,
  onMainMenu,
}) {
  const showTextField = connected && parsed.inputMode === 'text';
  const showNumericHint = connected && parsed.inputMode === 'numeric';

  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="rounded-[2.5rem] border-[6px] border-[#1a1a1a] bg-[#1a1a1a] shadow-2xl overflow-hidden">
        {/* Notch / status */}
        <div className="bg-[#111111] px-4 pt-3 pb-1 text-center">
          <div className="mx-auto mb-2 h-5 w-24 rounded-full bg-black" />
          <p className="text-[10px] text-gray-400 tracking-wide">WasteLink · Feature Phone</p>
          <p className="text-xs text-white font-semibold mt-0.5">{phoneNumber}</p>
        </div>

        {/* Dial / USSD screen */}
        <div className="bg-[#eef6ee] px-3 py-2 min-h-[52px] border-b border-[#c8dcc8]">
          <p className="text-center font-mono text-lg text-[#111111] tracking-wider min-h-[28px]">
            {connected ? (dialDisplay || '*123#') : dialDisplay || ''}
          </p>
        </div>

        <div className="bg-[#0c180c] px-3 py-3 min-h-[200px] max-h-[240px] overflow-y-auto">
          {connected ? (
            <>
              {parsed.prompt && (
                <p className="text-[#a7f3a7] text-sm font-medium whitespace-pre-wrap mb-2 leading-snug">
                  {parsed.prompt}
                </p>
              )}
              {parsed.options.length > 0 && (
                <ul className="space-y-1">
                  {parsed.options.map((opt) => (
                    <li key={opt.key}>
                      <button
                        type="button"
                        disabled={loading || parsed.isEnd}
                        onClick={() => onSelectOption(opt.key)}
                        className="w-full text-left rounded px-2 py-1.5 text-sm text-[#4ade80] hover:bg-[#1a3a1a] disabled:opacity-50 transition"
                      >
                        <span className="font-bold text-[#86efac]">{opt.key}.</span> {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!parsed.prompt && !parsed.options.length && ussdScreen && (
                <p className="text-[#4ade80] text-sm whitespace-pre-wrap font-mono">{ussdScreen}</p>
              )}
              {parsed.isEnd && (
                <p className="text-[#fde047] text-xs mt-3 font-semibold">Session ended · Green button to dial again</p>
              )}
            </>
          ) : (
            <p className="text-[#6b7280] text-sm text-center mt-8">
              Press the green call button to dial <span className="text-[#4ade80] font-mono">*123#</span>
            </p>
          )}
        </div>

        {/* Text / numeric entry bar */}
        {connected && (showTextField || showNumericHint) && !parsed.isEnd && (
          <div className="bg-[#1a2e1a] px-3 py-2 border-t border-[#2d4a2d]">
            <label className="text-[10px] text-[#86efac] uppercase tracking-wide">
              {showNumericHint ? 'Enter number · press # to send' : 'Type here · press # to send'}
            </label>
            <input
              type={showNumericHint ? 'tel' : 'text'}
              value={buffer}
              onChange={(e) => onBufferChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSend()}
              disabled={loading}
              className="w-full mt-1 bg-[#0c180c] border border-[#2d4a2d] rounded px-2 py-1.5 text-[#4ade80] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#4ade80]"
              placeholder={showNumericHint ? 'e.g. 5' : 'e.g. Jane Nakato'}
            />
          </div>
        )}

        {/* Nav shortcuts */}
        {connected && !parsed.isEnd && (
          <div className="bg-[#111111] flex text-[10px]">
            <button type="button" onClick={onBack} disabled={loading} className="flex-1 py-1.5 text-gray-400 hover:text-white">
              0 Back
            </button>
            <button type="button" onClick={onMainMenu} disabled={loading} className="flex-1 py-1.5 text-gray-400 hover:text-white border-x border-gray-800">
              00 Menu
            </button>
            <button type="button" onClick={onSend} disabled={loading || !buffer} className="flex-1 py-1.5 text-[#4ade80] hover:text-white">
              # Send
            </button>
          </div>
        )}

        {/* Keypad */}
        <div className="bg-[#111111] px-3 pb-3 pt-2">
          <div className="grid grid-cols-3 gap-1.5">
            {KEYPAD.map(({ digit, sub }) => (
              <button
                key={digit}
                type="button"
                disabled={loading || (!connected && !['*', '0', '#'].includes(digit) && !/^[1-9]$/.test(digit))}
                onClick={() => onKeyPress(digit)}
                className="rounded-xl bg-[#2a2a2a] hover:bg-[#3a3a3a] active:bg-[#444] py-3 flex flex-col items-center justify-center disabled:opacity-40 transition"
              >
                <span className="text-white text-xl font-light">{digit}</span>
                {sub && <span className="text-[8px] text-gray-500 tracking-widest">{sub}</span>}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1.5 mt-2">
            <button
              type="button"
              onClick={() => onBufferChange(String(buffer).slice(0, -1))}
              disabled={!buffer || loading}
              className="col-span-1 rounded-xl bg-[#2a2a2a] py-3 flex items-center justify-center text-gray-400 hover:bg-[#3a3a3a] disabled:opacity-40"
            >
              <Delete size={18} />
            </button>
            <button
              type="button"
              onClick={onDial}
              disabled={loading || (connected && !parsed.isEnd)}
              className="col-span-1 rounded-full bg-[#238636] hover:bg-[#1a6b2b] py-3 flex items-center justify-center text-white disabled:opacity-40 shadow-lg"
              aria-label="Dial"
            >
              <Phone size={22} />
            </button>
            <button
              type="button"
              onClick={onHangUp}
              disabled={loading}
              className="col-span-1 rounded-full bg-[#dc2626] hover:bg-[#b91c1c] py-3 flex items-center justify-center text-white disabled:opacity-40 shadow-lg"
              aria-label="Hang up"
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
