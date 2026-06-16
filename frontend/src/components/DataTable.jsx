export default function DataTable({ columns, children }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-[#D9D9D9] bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[#D9D9D9] bg-[#F8F9FA]">
            {columns.map((column, idx) => (
              <th
                key={idx}
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6B7280]"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#D9D9D9]">{children}</tbody>
      </table>
    </div>
  );
}
