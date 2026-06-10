import React from 'react';

interface TableSectionProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

interface TableCellProps extends React.HTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({ children, className = '', ...props }) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200/80 shadow-sm" id="table-wrap">
      <table className={`w-full text-left border-collapse bg-white ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
};

export const Thead: React.FC<TableSectionProps> = ({ children, className = '', ...props }) => {
  return (
    <thead className={`bg-slate-50/75 border-b border-slate-200 ${className}`} {...props}>
      {children}
    </thead>
  );
};

export const Tbody: React.FC<TableSectionProps> = ({ children, className = '', ...props }) => {
  return (
    <tbody className={`divide-y divide-slate-100 ${className}`} {...props}>
      {children}
    </tbody>
  );
};

export const Tr: React.FC<TableRowProps> = ({ children, className = '', ...props }) => {
  return (
    <tr className={`hover:bg-slate-50/50 transition-colors ${className}`} {...props}>
      {children}
    </tr>
  );
};

export const Th: React.FC<TableCellProps> = ({ children, className = '', ...props }) => {
  return (
    <th className={`px-4 py-3.5 text-xs font-semibold text-slate-500 tracking-wider capitalize ${className}`} {...props}>
      {children}
    </th>
  );
};

export const Td: React.FC<TableCellProps> = ({ children, className = '', ...props }) => {
  return (
    <td className={`px-4 py-3.5 text-sm text-slate-600 font-normal leading-relaxed ${className}`} {...props}>
      {children}
    </td>
  );
};
