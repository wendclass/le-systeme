import React from 'react';
import { cn } from '../../lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  isNumeric?: boolean;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'Aucune donnée disponible',
  onRowClick,
  className,
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-[#F8F5FF]/50 font-body">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('w-full font-body', className)}>
      {/* Desktop View : Table standard */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#A87FE8]/20 bg-[#0D0A18]/60 backdrop-blur-md">
        <table className="w-full text-left text-sm text-[#F8F5FF]">
          <thead className="bg-white/5 border-b border-[#A87FE8]/20 text-xs uppercase tracking-wider text-[#F8F5FF]/60 font-semibold">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3.5',
                    col.isNumeric ? 'text-right' : 'text-left',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  'transition-colors duration-150',
                  onRowClick ? 'cursor-pointer hover:bg-white/5' : ''
                )}
              >
                {columns.map((col) => {
                  const content = col.render
                    ? col.render(item)
                    : (item as any)[col.key];

                  return (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3',
                        col.isNumeric ? 'text-right tabular-nums' : 'text-left',
                        col.className
                      )}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View : Cartes empilées */}
      <div className="md:hidden space-y-3">
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            onClick={() => onRowClick?.(item)}
            className={cn(
              'p-4 rounded-2xl bg-[#0D0A18]/80 border border-[#A87FE8]/20 space-y-2 transition-all',
              onRowClick ? 'cursor-pointer active:scale-[0.99] hover:border-[#A87FE8]/40' : ''
            )}
          >
            {columns.map((col) => (
              <div key={col.key} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-b-0">
                <span className="text-[#F8F5FF]/60 font-semibold uppercase tracking-wider">
                  {col.header}
                </span>
                <span className={cn('text-[#F8F5FF] font-medium', col.isNumeric && 'tabular-nums text-right font-bold')}>
                  {col.render ? col.render(item) : (item as any)[col.key]}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
