import React from 'react';

interface DataTableProps {
  columns: string[];
  children: React.ReactNode;
}

export const DataTable: React.FC<DataTableProps> = ({ columns, children }) => {
  return (
    <div className="overflow-x-auto w-full">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
};
