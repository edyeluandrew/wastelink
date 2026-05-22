export default function PickerHelp() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Help & Instructions</h1>
        <p className="text-sm text-gray-600">How to use WasteLink Picker Portal</p>
      </div>

      {/* Getting Started */}
      <div className="bg-white border border-gray-300 rounded-lg p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-3"><Zap className="inline w-5 h-5 text-green-700 mr-2" /> Getting Started</h2>
        <ol className="space-y-2 text-sm text-gray-700">
          <li><strong>1. Create Account</strong> - Register with your phone number</li>
          <li><strong>2. Log Waste</strong> - Tell us what waste you collected and how much</li>
          <li><strong>3. Get Job Code</strong> - We give you a unique code</li>
          <li><strong>4. Take to Collection Point</strong> - Bring waste to the collection point</li>
          <li><strong>5. Agent Verifies</strong> - Agent weighs and verifies your waste</li>
          <li><strong>6. Earn Money</strong> - Your earnings are calculated automatically</li>
        </ol>
      </div>

      {/* Job Status Guide */}
      <div className="bg-white border border-gray-300 rounded-lg p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-3"><BarChart3 className="inline w-5 h-5 text-blue-700 mr-2" /> Understanding Job Status</h2>
        <div className="space-y-3">
          <div className="border-l-4 border-amber-400 pl-3">
            <p className="font-semibold text-amber-900">⏳ PENDING</p>
            <p className="text-sm text-gray-700">Your waste is waiting for agent verification at the collection point</p>
          </div>
          <div className="border-l-4 border-green-400 pl-3">
            <p className="font-semibold text-green-900">✅ VERIFIED</p>
            <p className="text-sm text-gray-700">Agent confirmed your waste and weighed it. Earnings are calculated.</p>
          </div>
          <div className="border-l-4 border-red-400 pl-3">
            <p className="font-semibold text-red-900">❌ REJECTED</p>
            <p className="text-sm text-gray-700">The waste did not meet quality standards. Ask the agent for details.</p>
          </div>
          <div className="border-l-4 border-blue-400 pl-3">
            <p className="font-semibold text-blue-900">💳 PAID</p>
            <p className="text-sm text-gray-700">You have been paid for this job.</p>
          </div>
        </div>
      </div>

      {/* Job Code Info */}
      <div className="bg-blue-50 border border-blue-300 rounded-lg p-5">
        <h2 className="text-lg font-bold text-blue-900 mb-2"><FileText className="inline w-5 h-5 text-blue-700 mr-2" /> What's a Job Code?</h2>
        <p className="text-sm text-blue-800 mb-2">
          When you log waste in WasteLink, we create a unique Job Code for you. This is like a receipt number.
        </p>
        <p className="text-sm text-blue-800 mb-2">
          <strong>Save or remember this code.</strong> When you go to the collection point with your waste, the agent will scan or enter this code to verify your delivery.
        </p>
        <p className="text-sm text-blue-800">
          If you forget your code, go to "My Jobs" to see all your codes.
        </p>
      </div>

      {/* Waste Types */}
      <div className="bg-white border border-gray-300 rounded-lg p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-3"><Trash2 className="inline w-5 h-5 text-gray-700 mr-2" /> Types of Waste We Accept</h2>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex gap-2">
            <Recycle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-semibold">PLASTIC</p>
              <p className="text-gray-600">Bottles, bags, containers</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-semibold">MIXED RECYCLABLES</p>
              <p className="text-gray-600">Mixed clean recyclables</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Leaf className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-semibold">ORGANIC</p>
              <p className="text-gray-600">Food waste, garden waste</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-semibold">E-WASTE</p>
              <p className="text-gray-600">Electronics, phones, computers</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span>🥫</span>
            <div>
              <p className="font-semibold">METAL & CARDBOARD</p>
              <p className="text-gray-600">Cans, metals, cardboard boxes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings Info */}
      <div className="bg-green-50 border border-green-300 rounded-lg p-5">
        <h2 className="text-lg font-bold text-green-900 mb-2"><Wallet className="inline w-5 h-5 text-green-700 mr-2" /> How Earnings Work</h2>
        <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
          <li>You earn money when waste is <strong>VERIFIED</strong></li>
          <li>Amount depends on waste type and actual weight</li>
          <li>See your earnings in the "My Earnings" section</li>
          <li>Watch for payout notifications</li>
          <li>Payment details coming soon</li>
        </ul>
      </div>

      {/* Important Tips */}
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-5">
        <h2 className="text-lg font-bold text-amber-900 mb-3">⚠️ Important Tips</h2>
        <ul className="text-sm text-amber-900 space-y-2">
          <li>✓ Keep your waste clean and sorted if possible</li>
          <li>✓ Be honest about the weight you estimate</li>
          <li>✓ Save your Job Code before going to collection point</li>
          <li>✓ Arrive at collection point while it's open</li>
          <li>✓ Ask the agent if your waste is rejected - get feedback</li>
        </ul>
      </div>

      {/* Support */}
      <div className="bg-purple-50 border border-purple-300 rounded-lg p-5">
        <h2 className="text-lg font-bold text-purple-900 mb-2">💬 Need Help?</h2>
        <p className="text-sm text-purple-800 mb-2">
          For questions or issues:
        </p>
        <p className="text-sm text-purple-800">
          📍 <strong>Talk to your collection point agent</strong> - they know the system<br/>
          👥 <strong>Contact your community WasteLink champion</strong> if you have one
        </p>
      </div>

      <div className="text-center py-4 text-sm text-gray-600">
        <p>Thank you for helping clean up Kampala! 🌍</p>
      </div>
    </div>
  );
}
