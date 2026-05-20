import React, { useState } from 'react';
import { Search } from 'lucide-react';

export default function JobSearchBox({ onSearch, isLoading }) {
  const [jobCode, setJobCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (jobCode.trim()) {
      onSearch(jobCode.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter Job Code (e.g., WL20260520120345)"
          value={jobCode}
          onChange={(e) => setJobCode(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !jobCode.trim()}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
        >
          <Search size={18} />
          <span className="hidden sm:inline">Search</span>
        </button>
      </div>
    </form>
  );
}
