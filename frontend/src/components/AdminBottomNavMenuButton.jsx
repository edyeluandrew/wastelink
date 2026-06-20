import { Menu } from 'lucide-react';

export function AdminMenuButton({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-[#D9D9D9] bg-[#F8F9FA] p-2.5 text-[#111111] md:hidden"
      aria-label="Open menu"
    >
      <Menu size={20} />
    </button>
  );
}
