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
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          placeholder="Enter Job Code (e.g. WL20260520120345)"
          value={jobCode}
          onChange={(e) => setJobCode(e.target.value.toUpperCase())}
          className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-base focus:border-[#238636] focus:outline-none focus:ring-2 focus:ring-[#238636]/20"
          disabled={isLoading}
          autoComplete="off"
          autoCapitalize="characters"
        />
        <button
          type="submit"
          disabled={isLoading || !jobCode.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#238636] px-6 py-3 font-semibold text-white transition hover:bg-[#2F9E44] disabled:cursor-not-allowed disabled:bg-[#9CA3AF] sm:shrink-0"
        >
          <Search size={18} />
          Search
        </button>
      </div>
    </form>
  );
}
