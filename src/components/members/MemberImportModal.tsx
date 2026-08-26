import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, RefreshCw, X, Users, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { extractTextFromPDF, parseRosterTextLines, parseLcrCsv } from '../../utils/memberRosterParsers';
import { getDynamicAge, normalizeBirthDate } from '../../utils/memberAnalyticsEngine';
import type { Member, MemberImportItem } from '../../types';
import toast from 'react-hot-toast';

interface MemberImportModalProps {
  open: boolean;
  onClose: () => void;
  existingMembers: Member[];
  onConfirmImport: (items: Member[], mode: 'MERGE' | 'OVERWRITE') => Promise<void>;
}

export function MemberImportModal({
  open,
  onClose,
  existingMembers,
  onConfirmImport
}: MemberImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsedItems, setParsedItems] = useState<MemberImportItem[]>([]);
  const [importMode, setImportMode] = useState<'MERGE' | 'OVERWRITE'>('MERGE');
  const [rawPastedText, setRawPastedText] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    processFile(selected);
  };

  const processFile = async (uploadedFile: File) => {
    setParsing(true);
    try {
      const fileName = uploadedFile.name.toLowerCase();
      let items: MemberImportItem[] = [];

      if (fileName.endsWith('.pdf')) {
        const text = await extractTextFromPDF(uploadedFile);
        if (!text || text.trim().length === 0) {
          throw new Error('Could not extract text from this PDF. If scanned as an image, please paste text directly.');
        }
        items = parseRosterTextLines(text, existingMembers);
      } else if (fileName.endsWith('.csv')) {
        const text = await uploadedFile.text();
        items = parseLcrCsv(text, existingMembers);
      } else {
        const text = await uploadedFile.text();
        items = parseRosterTextLines(text, existingMembers);
      }

      if (items.length === 0) {
        toast.error('No member records recognized. Please verify file format.');
      } else {
        toast.success(`Successfully parsed ${items.length} member records!`);
      }
      setParsedItems(items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  const handleProcessPastedText = () => {
    if (!rawPastedText.trim()) {
      toast.error('Please paste roster text first');
      return;
    }
    setParsing(true);
    try {
      let items: MemberImportItem[] = [];
      if (rawPastedText.includes(',') && rawPastedText.includes('\n')) {
        items = parseLcrCsv(rawPastedText, existingMembers);
      }
      if (items.length === 0) {
        items = parseRosterTextLines(rawPastedText, existingMembers);
      }

      if (items.length === 0) {
        toast.error('No records recognized in pasted text');
      } else {
        toast.success(`Found ${items.length} member records!`);
      }
      setParsedItems(items);
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (parsedItems.length === 0) return;
    setSaving(true);
    try {
      const validMembers: Member[] = parsedItems.map(item => ({
        member_id: item.member_id || `mem_${(item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`,
        name: item.name || 'Unnamed',
        gender: (item.gender || '') as 'M' | 'F' | '',
        age: getDynamicAge(item.birth_date, item.age),
        phone: item.phone || '',
        email: item.email || '',
        organisation: item.organisation || 'Elders Quorum',
        status: item.status || 'ACTIVE',
        birth_date: item.birth_date || '',
        calling: item.calling || '',
        priesthood_office: item.priesthood_office || '',
        household_id: item.household_id || '',
        notes: item.notes || '',
        total_assignments: item.total_assignments || 0,
        spoken_count: item.spoken_count || 0,
        prayers_count: item.prayers_count || 0,
        last_assigned_date: item.last_assigned_date || '',
        readiness_score: item.readiness_score || 100
      }));

      await onConfirmImport(validMembers, importMode);
      onClose();
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setFile(null);
    setParsedItems([]);
    setRawPastedText('');
  };

  const validCount = parsedItems.filter(i => i.isValid).length;
  const duplicateCount = parsedItems.filter(i => i.isDuplicate).length;

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); reset(); }}
      title="Import Member Roster (PDF / LCR CSV)"
      size="xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="text-xs text-slate-500">
            {parsedItems.length > 0 && (
              <span>
                Ready to import <strong>{validCount}</strong> members ({duplicateCount} existing matched)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { onClose(); reset(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={parsedItems.length === 0 || parsing}
              icon={<CheckCircle2 className="h-4 w-4" />}
            >
              {importMode === 'MERGE' ? `Merge ${validCount} Members` : `Overwrite Roster (${validCount})`}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Source Tabs */}
        <div className="flex border-b border-slate-200 gap-4">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Upload File (PDF / CSV)
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'paste'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Paste Roster Text / Table
          </button>
        </div>

        {activeTab === 'upload' ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl p-6 text-center cursor-pointer transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,.txt"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {file ? file.name : 'Click to select Official PDF Roster or LCR CSV'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports official Church LCR 'Member List with Callings' CSV & printable ward PDF reports
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              rows={4}
              value={rawPastedText}
              onChange={e => setRawPastedText(e.target.value)}
              placeholder="Paste raw member text from PDF or spreadsheet here (e.g. Bro. Emmanuel O. 34 M 08033333333 Elders Quorum)..."
              className="w-full text-xs font-mono border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none border-slate-300"
            />
            <Button size="sm" onClick={handleProcessPastedText} loading={parsing}>
              Parse Pasted Text
            </Button>
          </div>
        )}

        {/* Merge vs Overwrite Mode Selector */}
        {parsedItems.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Import Strategy:
              </span>
              <div className="flex rounded-md bg-white border border-slate-300 p-0.5 text-xs font-medium">
                <button
                  onClick={() => setImportMode('MERGE')}
                  className={`px-3 py-1 rounded transition-colors ${
                    importMode === 'MERGE'
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Merge & Update
                </button>
                <button
                  onClick={() => setImportMode('OVERWRITE')}
                  className={`px-3 py-1 rounded transition-colors ${
                    importMode === 'OVERWRITE'
                      ? 'bg-rose-600 text-white font-semibold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Full Overwrite
                </button>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {importMode === 'MERGE'
                ? 'Matches existing members by name to update details, adds new names.'
                : 'Replaces current member directory with parsed list.'}
            </div>
          </div>
        )}

        {/* Live Parsed Preview Table */}
        {parsedItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Parsed Records Preview ({parsedItems.length})
              </h4>
              <button
                onClick={reset}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg shadow-inner bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 sticky top-0 text-slate-700 uppercase font-semibold border-b">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Name & Calling</th>
                    <th className="p-2">Age</th>
                    <th className="p-2">Gender</th>
                    <th className="p-2">Phone</th>
                    <th className="p-2">Organisation</th>
                    <th className="p-2">Birthday</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Status Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedItems.map((item, idx) => (
                    <tr key={idx} className={item.isDuplicate ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                      <td className="p-2 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-2">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        {item.calling && <div className="text-[10px] text-amber-700">{item.calling}</div>}
                      </td>
                      <td className="p-2 text-slate-700">{getDynamicAge(item.birth_date, item.age) || '—'}</td>
                      <td className="p-2 text-slate-700">{item.gender || '—'}</td>
                      <td className="p-2 text-slate-600 font-mono text-[11px]">{item.phone || '—'}</td>
                      <td className="p-2">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium text-[10px]">
                          {item.organisation || '—'}
                        </span>
                      </td>
                      <td className="p-2 text-slate-600">{normalizeBirthDate(item.birth_date)}</td>
                      <td className="p-2">
                        <span className="text-[10px] font-semibold text-emerald-700">{item.status || 'Active'}</span>
                      </td>
                      <td className="p-2">
                        {item.isDuplicate ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-medium bg-amber-100 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="h-3 w-3" /> Existing
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium bg-emerald-100 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="h-3 w-3" /> New
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
