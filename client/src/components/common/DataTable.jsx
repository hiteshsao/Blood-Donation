import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Loader from './Loader';
import EmptyState from './EmptyState';

export const DataTable = ({
  columns = [],
  data = [],
  keyField = '_id',
  isLoading = false,
  searchPlaceholder = 'Search records...',
  searchKeys = [],
  pageSize: initialPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
  emptyTitle = 'No data found',
  emptyDescription = 'There are currently no records matching your criteria.',
  headerActions = null,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // 1. Search Filter
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();

    return data.filter((row) => {
      if (searchKeys.length > 0) {
        return searchKeys.some((k) => {
          const val = row[k];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(term);
        });
      }

      // Default: inspect all row fields
      return Object.values(row).some((val) => {
        if (typeof val === 'object' && val !== null) {
          return Object.values(val).some((sub) =>
            sub !== null && sub !== undefined && String(sub).toLowerCase().includes(term)
          );
        }
        return val !== null && val !== undefined && String(val).toLowerCase().includes(term);
      });
    });
  }, [data, searchTerm, searchKeys]);

  // 2. Sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string') {
        const res = aVal.localeCompare(String(bVal));
        return sortConfig.direction === 'asc' ? res : -res;
      }

      return sortConfig.direction === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
    });
  }, [filteredData, sortConfig]);

  // 3. Pagination
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key, sortable = true) => {
    if (!sortable) return;
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden ${className}`}>
      {/* Top Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-red-50/30 to-white">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-sm text-slate-800 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:border-[#C62828] focus:ring-2 focus:ring-red-100 transition-all outline-none"
          />
        </div>

        {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto min-h-[300px] relative">
        {isLoading ? (
          <div className="py-20 flex justify-center items-center">
            <Loader message="Fetching and synchronizing registry records..." />
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              onAction={searchTerm ? () => setSearchTerm('') : null}
              actionLabel="Clear Search"
            />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                {columns.map((col) => {
                  const isSorted = sortConfig.key === col.key;
                  return (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key, col.sortable !== false)}
                      className={`
                        px-5 py-3.5 select-none
                        ${col.sortable !== false ? 'cursor-pointer hover:text-slate-800 transition-colors' : ''}
                        ${col.headerClassName || ''}
                      `}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <span>{col.label}</span>
                        {col.sortable !== false && (
                          <span className="text-slate-400">
                            {isSorted ? (
                              sortConfig.direction === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-[#C62828]" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-[#C62828]" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedData.map((row, idx) => {
                const rowKey = row[keyField] || row.id || idx;
                return (
                  <tr
                    key={rowKey}
                    className="hover:bg-red-50/30 transition-colors duration-150 group"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-5 py-4 text-slate-700 font-medium ${col.cellClassName || ''}`}
                      >
                        {col.render ? col.render(row, idx) : row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {!isLoading && sortedData.length > 0 && (
        <div className="px-5 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-slate-800 font-bold">{Math.min((currentPage - 1) * pageSize + 1, totalItems)}</strong> to{' '}
              <strong className="text-slate-800 font-bold">{Math.min(currentPage * pageSize, totalItems)}</strong> of{' '}
              <strong className="text-slate-800 font-bold">{totalItems}</strong> entries
            </span>

            <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#C62828]"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-bold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
