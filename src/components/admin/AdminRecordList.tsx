import React, { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { Search, Filter, ChevronRight } from 'lucide-react';

export interface ColumnDef<T> {
  header: React.ReactNode;
  className?: string; // used for grid col-span, e.g. 'col-span-2'
  render: (item: T) => React.ReactNode;
}

export interface AdminRecordListProps<T> {
  title: string;
  subtitle: string;
  icon?: React.ElementType; 
  
  items: T[];
  statuses: string[];
  
  searchPlaceholder?: string;
  onSearch: (item: T, query: string) => boolean;
  sortByOptions?: string[];
  onSort?: (items: T[], sortBy: string) => T[];
  
  getStatus: (item: T) => string;
  getValidTransitions: (status: string) => string[];
  onStatusChange: (item: T, newStatus: string) => void;
  statusColors?: Record<string, string>; 
  
  columns: ColumnDef<T>[];
  onRowClick: (item: T) => void;
  
  extraHeaderActions?: React.ReactNode;
  extraListHeaderActions?: React.ReactNode; 
  renderRowActions?: (item: T) => React.ReactNode;
  getRowHighlight?: (item: T) => React.ReactNode; 
  getRowClassName?: (item: T) => string; 
  
  emptyMessage?: string;
  getItemId: (item: T) => string;

  // Grouping support
  enableGrouping?: boolean;
  onGroupToggle?: (grouped: boolean) => void;
  isGrouped?: boolean;
}

export function AdminRecordList<T>({
  title,
  subtitle,
  icon: Icon,
  items,
  statuses,
  searchPlaceholder = "Search...",
  onSearch,
  sortByOptions,
  onSort,
  getStatus,
  getValidTransitions,
  onStatusChange,
  statusColors = {},
  columns,
  onRowClick,
  extraHeaderActions,
  extraListHeaderActions,
  renderRowActions,
  getRowHighlight,
  getRowClassName,
  emptyMessage = "No records found matching your criteria.",
  getItemId,
  enableGrouping = false,
  onGroupToggle,
  isGrouped = false
}: AdminRecordListProps<T>) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState(sortByOptions?.[0] || '');
  const [statusFilter, setStatusFilter] = useState('All');

  const counts = useMemo(() => {
     const c: Record<string, number> = { 'All': items.length };
     statuses.forEach(st => c[st] = 0);
     items.forEach(item => {
        const st = getStatus(item);
        c[st] = (c[st] || 0) + 1;
     });
     return c;
  }, [items, statuses, getStatus]);

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (statusFilter !== 'All') {
       result = result.filter(item => getStatus(item) === statusFilter);
    }

    if (searchQuery.trim().length > 0) {
      result = result.filter(item => onSearch(item, searchQuery));
    }

    if (onSort && sortBy) {
       result = onSort(result, sortBy);
    }

    return result;
  }, [items, searchQuery, sortBy, statusFilter, onSearch, onSort, getStatus]);

  const groupedItems = useMemo(() => {
     if (!isGrouped) return { 'All Results': filteredItems };
     const groups: Record<string, T[]> = {};
     statuses.forEach(st => {
       const groupTasks = filteredItems.filter(t => getStatus(t) === st);
       if (groupTasks.length > 0) groups[st] = groupTasks;
     });
     return groups;
  }, [filteredItems, isGrouped, statuses, getStatus]);

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[#c5a059]/10 pb-6 shrink-0">
        <div>
           {Icon ? (
              <div className="flex items-center gap-3">
                 <Icon className="w-8 h-8 text-[#c5a059]" />
                 <h1 className="text-2xl md:text-3xl font-bold tracking-[0.2em] uppercase text-content">{title}</h1>
              </div>
           ) : (
              <h1 className="text-2xl md:text-3xl font-bold tracking-[0.2em] uppercase text-content">{title}</h1>
           )}
           <p className="text-muted tracking-widest uppercase text-[10px] mt-2">{subtitle} — Showing {filteredItems.length} results</p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
          <div className="relative flex-1 md:w-64 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c5a059]" />
            <input 
              type="text" 
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-[#c5a059]/30 py-2 pl-9 pr-4 text-xs text-content focus:border-[#c5a059] focus:outline-none placeholder-muted uppercase tracking-widest"
            />
          </div>
          {sortByOptions && sortByOptions.length > 0 && (
             <div className="flex items-center border border-[#c5a059]/30 bg-surface pl-3 pr-1 py-1 shrink-0">
                <Filter className="w-4 h-4 text-[#c5a059] mr-2" />
                <select 
                  value={sortBy} 
                  onChange={e => setSortBy(e.target.value)}
                  className="bg-transparent text-[10px] uppercase tracking-widest text-content focus:outline-none cursor-pointer p-1"
                >
                  {sortByOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
             </div>
          )}
          {enableGrouping && onGroupToggle && (
             <label className="flex items-center gap-2 text-[10px] text-content uppercase tracking-widest font-bold cursor-pointer shrink-0">
                <input 
                   type="checkbox" 
                   checked={isGrouped} 
                   onChange={e => onGroupToggle(e.target.checked)}
                   className="accent-[#c5a059]"
                />
                Group by stage
             </label>
          )}
          {extraHeaderActions}
        </div>
      </div>

      {/* Tabs */}
      {!isGrouped && (
        <div className="flex overflow-x-auto gap-2 pb-2 shrink-0 hide-scrollbar border-b border-[#c5a059]/10 items-center">
          {['All', ...statuses].map(tab => (
             <button 
               key={tab}
               onClick={() => setStatusFilter(tab)}
               className={clsx(
                 "whitespace-nowrap px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors border-b-2 flex items-center gap-2",
                 statusFilter === tab 
                   ? "border-[#c5a059] text-premium-gold-text bg-[#c5a059]/10" 
                   : "border-transparent text-muted hover:text-content hover:bg-surface"
               )}
             >
               {tab}
               <span className="bg-bg border border-[#c5a059]/20 px-1.5 py-0.5 rounded-full text-[8px]">{counts[tab] || 0}</span>
             </button>
          ))}
          <div className="ml-auto"></div>
          {extraListHeaderActions}
        </div>
      )}

      {/* List Body */}
      <div className="flex-1 overflow-y-auto w-full pb-10">
         {filteredItems.length === 0 ? (
            <div className="p-12 text-center text-muted uppercase tracking-widest text-xs border border-[#c5a059]/10 border-dashed bg-surface/30">
               {emptyMessage}
            </div>
         ) : (
            <div className="flex flex-col gap-8">
              {Object.entries(groupedItems).map(([groupName, groupTasks]) => (
                 <div key={groupName} className="flex flex-col gap-4">
                    {isGrouped && (
                       <h3 className="text-content font-bold uppercase tracking-widest text-xs border-b border-[#c5a059]/30 pb-2">{groupName} ({groupTasks.length})</h3>
                    )}
                    
                    {/* Desktop Table Header */}
                    <div className="hidden md:grid grid-cols-12 gap-4 p-4 text-[10px] uppercase tracking-widest border border-[#c5a059]/20 font-bold bg-surface text-[#c5a059]">
                       {columns.map((col, i) => (
                          <div key={i} className={col.className || "col-span-1"}>
                             {col.header}
                          </div>
                       ))}
                       <div className="col-span-2 text-right">Status Action</div>
                    </div>
                    
                    {/* Rows */}
                    <div className="flex flex-col gap-4 md:gap-2">
                       {groupTasks.map(item => {
                          const currentStatus = getStatus(item);
                          const validTransitions = getValidTransitions(currentStatus);
                          const highlight = getRowHighlight ? getRowHighlight(item) : null;
                          const customClass = getRowClassName ? getRowClassName(item) : "border-[#c5a059]/20";

                          return (
                          <div 
                            key={getItemId(item)}
                            className={clsx("group bg-surface/50 border hover:border-[#c5a059] transition-colors p-4 md:grid md:grid-cols-12 gap-4 items-center flex flex-col relative", customClass)}
                          >
                             {highlight}
                             
                             {columns.map((col, i) => (
                                <div key={i} className={clsx(col.className || "col-span-1", "flex flex-col items-start w-full cursor-pointer md:border-0 border-t border-[#c5a059]/10 pt-3 md:pt-0 first:border-0 first:pt-0")} onClick={() => onRowClick(item)}>
                                   {col.render(item)}
                                </div>
                             ))}

                             <div className="col-span-2 flex flex-col md:items-end w-full border-t border-[#c5a059]/10 pt-3 md:border-0 md:pt-0 space-y-2 lg:col-span-3">
                                <select 
                                   value={currentStatus}
                                   onChange={(e) => onStatusChange(item, e.target.value)}
                                   className={clsx(
                                      "w-full bg-surface text-[9px] font-bold uppercase tracking-widest p-1.5 focus:outline-none focus:border-[#c5a059] border text-center md:text-right relative z-raised",
                                      statusColors[currentStatus] || "border-[#c5a059]/30 text-content"
                                   )}
                                   onClick={e => e.stopPropagation()}
                                >
                                   {!validTransitions.includes(currentStatus) && (
                                     <option value={currentStatus}>{currentStatus}</option>
                                   )}
                                   {validTransitions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                
                                {renderRowActions && (
                                   <div className="flex flex-wrap gap-1 md:justify-end w-full">
                                      {renderRowActions(item)}
                                   </div>
                                )}
                             </div>

                             <button 
                                onClick={() => onRowClick(item)}
                                className="absolute right-4 hidden lg:block text-[#c5a059]/50 hover:text-[#c5a059] transition-colors"
                             >
                                <ChevronRight className="w-5 h-5" />
                             </button>
                          </div>
                          );
                       })}
                    </div>
                 </div>
              ))}
            </div>
         )}
      </div>
    </div>
  );
}
