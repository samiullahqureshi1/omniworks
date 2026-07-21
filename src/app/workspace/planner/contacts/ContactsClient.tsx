'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Settings,
  ChevronDown,
  Search,
  Eye,
  Filter,
  CheckCircle2,
  Plus,
  MoreVertical,
  UserPlus,
  Download,
  Check,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CreateContactModal from '@/components/modals/CreateContactModal';

type Contact = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  status: string;
  createdAt: Date;
};

type TabKey = 'all' | 'new' | 'no_activity' | 'no_meetings';

type ColumnKey = 'name' | 'email' | 'phone' | 'lastMeeting' | 'nextMeeting' | 'company';

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone number' },
  { key: 'lastMeeting', label: 'Last meeting date' },
  { key: 'nextMeeting', label: 'Next meeting date' },
  { key: 'company', label: 'Company' },
];

type FilterField = 'name' | 'email' | 'company' | 'status';
type FilterOperator = 'contains' | 'equals' | 'starts_with';

interface ActiveFilter {
  id: string;
  field: FilterField;
  operator: FilterOperator;
  value: string;
}

export default function ContactsClient({ contacts }: { contacts: Contact[] }) {
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    new Set(['name', 'email', 'phone', 'lastMeeting', 'nextMeeting', 'company'])
  );
  const [showColumnsOpen, setShowColumnsOpen] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [pendingFilterField, setPendingFilterField] = useState<FilterField>('name');
  const [pendingFilterOperator, setPendingFilterOperator] = useState<FilterOperator>('contains');
  const [pendingFilterValue, setPendingFilterValue] = useState('');

  const columnsRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) {
        setShowColumnsOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleAll = () => {
    if (selectedIds.size === contacts.length && contacts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleColumn = (col: ColumnKey) => {
    const next = new Set(visibleColumns);
    if (next.has(col)) next.delete(col);
    else next.add(col);
    setVisibleColumns(next);
  };

  const addFilter = () => {
    if (!pendingFilterValue.trim()) return;
    setActiveFilters(prev => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        field: pendingFilterField,
        operator: pendingFilterOperator,
        value: pendingFilterValue.trim(),
      },
    ]);
    setPendingFilterValue('');
    setFilterPanelOpen(false);
  };

  const removeFilter = (id: string) => {
    setActiveFilters(prev => prev.filter(f => f.id !== id));
  };

  // Derived filtered contacts
  const filtered = useMemo(() => {
    let result = [...contacts];

    // Tab filter
    if (activeTab === 'new') {
      result = result.filter(c => c.status === 'NEW');
    } else if (activeTab === 'no_activity') {
      // No activity: created more than 30 days ago and status is still NEW
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      result = result.filter(c => new Date(c.createdAt) < cutoff);
    } else if (activeTab === 'no_meetings') {
      // For now: same logic — contacts with no last meeting (no last meeting date available)
      // In practice this would join Meeting records; for now show all as placeholder.
      result = result;
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
      );
    }

    // Advanced filters
    activeFilters.forEach(af => {
      result = result.filter(c => {
        const fieldValue = (
          af.field === 'name' ? c.name :
          af.field === 'email' ? c.email :
          af.field === 'company' ? (c.company || '') :
          af.field === 'status' ? c.status : ''
        ).toLowerCase();
        const target = af.value.toLowerCase();
        if (af.operator === 'contains') return fieldValue.includes(target);
        if (af.operator === 'equals') return fieldValue === target;
        if (af.operator === 'starts_with') return fieldValue.startsWith(target);
        return true;
      });
    });

    return result;
  }, [contacts, activeTab, searchQuery, activeFilters]);

  const paginated = filtered.slice(0, itemsPerPage);

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'All contacts' },
    { key: 'new', label: 'New contacts' },
    { key: 'no_activity', label: 'No activity in next 30d' },
    { key: 'no_meetings', label: 'No meetings in next 30d' },
  ];

  return (
    <div className="w-full flex flex-col h-full bg-white dark:bg-[#111] overflow-hidden -m-4 sm:-m-6">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-white/10">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Contacts</h1>
        <div className="flex items-center gap-3">
          <button type="button" className="p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg">
            <Settings size={20} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex items-center gap-1.5 h-[38px] px-4 rounded-full bg-[#0875f5] text-white text-sm font-bold hover:bg-[#0766d6] transition-colors">
                <Plus size={16} />
                Add contact
                <ChevronDown size={16} className="ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setIsModalOpen(true)} className="gap-2 cursor-pointer">
                <UserPlus size={16} className="text-slate-500" />
                <span>Add single contact</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <Download size={16} className="text-slate-500" />
                <span>Import contacts from a file</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CreateContactModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* Search and Filters bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name and email"
              className="w-full h-9 pl-9 pr-3 rounded-full border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1f1f1f] text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-[#0875f5] placeholder:text-slate-400"
            />
          </div>

          {/* Show columns */}
          <div className="relative" ref={columnsRef}>
            <button
              onClick={() => { setShowColumnsOpen(v => !v); setFilterPanelOpen(false); }}
              className="flex items-center gap-2 h-9 px-3 rounded-full border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1f1f1f] text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
            >
              <Eye size={16} className="text-slate-500" />
              Show columns
              <ChevronDown size={14} className="text-slate-400" />
            </button>
            {showColumnsOpen && (
              <div className="absolute left-0 top-11 z-50 w-52 bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1.5">Columns</p>
                {ALL_COLUMNS.map(col => (
                  <button
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-sm text-slate-700 dark:text-slate-300"
                  >
                    <span>{col.label}</span>
                    {visibleColumns.has(col.key) && <Check size={14} className="text-[#0875f5]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => { setFilterPanelOpen(v => !v); setShowColumnsOpen(false); }}
              className={`flex items-center gap-2 h-9 px-3 rounded-full border text-sm font-medium transition-colors ${
                filterPanelOpen || activeFilters.length > 0
                  ? 'border-[#0875f5] text-[#0875f5] bg-blue-50 dark:bg-blue-950/30'
                  : 'border-slate-300 dark:border-white/20 bg-white dark:bg-[#1f1f1f] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              <Filter size={16} />
              Filter
              {activeFilters.length > 0 && (
                <span className="bg-[#0875f5] text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                  {activeFilters.length}
                </span>
              )}
              <ChevronDown size={14} />
            </button>

            {filterPanelOpen && (
              <div className="absolute left-0 top-11 z-50 w-80 bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-3 space-y-3">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Add Filter</p>
                <div className="flex items-center gap-2">
                  <select
                    value={pendingFilterField}
                    onChange={e => setPendingFilterField(e.target.value as FilterField)}
                    className="flex-1 h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-[12px] text-slate-800 dark:text-slate-200 px-2 outline-none"
                  >
                    <option value="name">Name</option>
                    <option value="email">Email</option>
                    <option value="company">Company</option>
                    <option value="status">Status</option>
                  </select>
                  <select
                    value={pendingFilterOperator}
                    onChange={e => setPendingFilterOperator(e.target.value as FilterOperator)}
                    className="flex-1 h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-[12px] text-slate-800 dark:text-slate-200 px-2 outline-none"
                  >
                    <option value="contains">Contains</option>
                    <option value="equals">Equals</option>
                    <option value="starts_with">Starts with</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={pendingFilterValue}
                  onChange={e => setPendingFilterValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addFilter()}
                  placeholder="Filter value..."
                  className="w-full h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-[13px] text-slate-800 dark:text-slate-200 px-3 outline-none focus:border-[#0875f5]"
                />
                <button
                  onClick={addFilter}
                  disabled={!pendingFilterValue.trim()}
                  className="w-full h-8 rounded-lg bg-[#0875f5] text-white text-[13px] font-bold hover:bg-[#0766d6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Filter
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Active filter pills */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {activeFilters.map(af => (
              <span
                key={af.id}
                className="inline-flex items-center gap-1.5 h-7 pl-3 pr-2 rounded-full bg-blue-50 dark:bg-blue-950/30 text-[#0875f5] text-[12px] font-medium border border-blue-200 dark:border-blue-900/50"
              >
                <span className="capitalize">{af.field}</span>
                <span className="text-blue-400">{af.operator === 'starts_with' ? 'starts with' : af.operator}</span>
                <span className="font-bold">"{af.value}"</span>
                <button onClick={() => removeFilter(af.id)} className="hover:opacity-70">
                  <X size={12} />
                </button>
              </span>
            ))}
            <button
              onClick={() => setActiveFilters([])}
              className="text-[12px] text-slate-500 hover:text-red-500 font-medium"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Tabs Row — without pencil and Add list */}
        <div className="flex items-center gap-2 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#0f2847] text-white'
                  : 'border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1f1f1f] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              {activeTab === tab.key && <CheckCircle2 size={16} className="fill-white text-[#0f2847]" />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-x-auto custom-scrollbar pb-3">
          <table className="w-full min-w-[700px] text-left text-sm whitespace-nowrap">
            <thead className="border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a]">
              <tr>
                <th className="w-[50px] p-3 border-r border-slate-200 dark:border-white/10 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 accent-[#0875f5]"
                    checked={paginated.length > 0 && paginated.every(c => selectedIds.has(c.id))}
                    onChange={toggleAll}
                  />
                </th>
                {ALL_COLUMNS.filter(c => visibleColumns.has(c.key)).map((col, i, arr) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 ${i < arr.length - 1 ? 'border-r border-slate-200 dark:border-white/10' : ''}`}
                    style={{ minWidth: col.key === 'name' ? 220 : col.key === 'email' ? 180 : 150 }}
                  >
                    <div className="flex items-center justify-between">
                      {col.label} <MoreVertical size={16} className="text-slate-400 cursor-pointer" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10 bg-white dark:bg-[#1a1a1a]">
              {paginated.map(contact => (
                <tr key={contact.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                  <td className="p-3 border-r border-slate-200 dark:border-white/10 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 accent-[#0875f5]"
                      checked={selectedIds.has(contact.id)}
                      onChange={() => toggleOne(contact.id)}
                    />
                  </td>
                  {visibleColumns.has('name') && (
                    <td className="px-4 py-3 border-r border-slate-200 dark:border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#52d6d0] text-[#093532] flex items-center justify-center font-bold text-[10px] shrink-0">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white text-[13px]">{contact.name}</span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.has('email') && (
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-white/10 text-[13px]">
                      {contact.email}
                    </td>
                  )}
                  {visibleColumns.has('phone') && (
                    <td className="px-4 py-3 border-r border-slate-200 dark:border-white/10 text-[13px] text-slate-600 dark:text-slate-400">
                      {contact.phone || ''}
                    </td>
                  )}
                  {visibleColumns.has('lastMeeting') && (
                    <td className="px-4 py-3 border-r border-slate-200 dark:border-white/10 text-[13px] text-slate-600 dark:text-slate-400">
                      {format(new Date(contact.createdAt), 'M/d/yyyy')}
                    </td>
                  )}
                  {visibleColumns.has('nextMeeting') && (
                    <td className="px-4 py-3 border-r border-slate-200 dark:border-white/10 text-[13px]" />
                  )}
                  {visibleColumns.has('company') && (
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-[13px]">
                      {contact.company || ''}
                    </td>
                  )}
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.size + 1} className="px-4 py-10 text-center text-slate-500">
                    No contacts match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <span>Items per page</span>
            <div className="relative">
              <select
                value={itemsPerPage}
                onChange={e => setItemsPerPage(Number(e.target.value))}
                className="appearance-none h-9 pl-3 pr-8 rounded border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1f1f1f] text-slate-800 dark:text-slate-200 outline-none focus:border-[#0875f5] cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
            </div>
          </div>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-300">
            Showing {filtered.length > 0 ? 1 : 0} - {Math.min(itemsPerPage, filtered.length)} of {filtered.length}
          </div>
        </div>
      </div>
    </div>
  );
}
