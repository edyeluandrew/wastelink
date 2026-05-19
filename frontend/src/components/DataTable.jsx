export default function DataTable({ columns, children }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-wastelink-border">
            {columns.map((column, idx) => (
              <th
                key={idx}
                className="table-cell text-left font-semibold text-wastelink-dark"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
}
