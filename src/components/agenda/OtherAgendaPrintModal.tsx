import React, { useState } from 'react';
import { Printer, Download, X, CheckSquare, Square, FileText, Users } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { OtherAgenda } from '../../types';
import { generateOtherAgendaHtml } from '../../utils/otherAgendaPrintEngine';

interface OtherAgendaPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  agenda: OtherAgenda | null;
  unitName?: string;
}

export function OtherAgendaPrintModal({
  isOpen,
  onClose,
  agenda,
  unitName,
}: OtherAgendaPrintModalProps) {
  const [includeProposedRoll, setIncludeProposedRoll] = useState(false);
  const [requestSignature, setRequestSignature] = useState(true);

  if (!agenda) return null;

  const htmlContent = generateOtherAgendaHtml(agenda, unitName, {
    includeProposedRoll,
    requestSignature,
  });

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print / save as PDF.');
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agenda.title.replace(/\s+/g, '_')}_${agenda.date}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <span>Print & Export Agenda — {agenda.title}</span>
        </div>
      }
      size="4xl"
    >
      <div className="space-y-4">
        {/* Controls & Export Options Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Toggle Include Roll */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={includeProposedRoll}
                onChange={(e) => setIncludeProposedRoll(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-blue-600" />
                Include Proposed Attendees Roll (Page 2)
              </span>
            </label>

            {/* Sub-option Request Signature */}
            {includeProposedRoll && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-semibold text-slate-700 ml-2 sm:ml-0 pl-3 sm:pl-3 border-l border-slate-300">
                <input
                  type="checkbox"
                  checked={requestSignature}
                  onChange={(e) => setRequestSignature(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <span>Request Signatures</span>
              </label>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              size="sm"
              variant="outline"
              icon={<Download className="h-4 w-4" />}
              onClick={handleDownloadHtml}
            >
              Download PDF / HTML
            </Button>
            <Button
              size="sm"
              variant="primary"
              className="bg-blue-600 hover:bg-blue-700"
              icon={<Printer className="h-4 w-4" />}
              onClick={handlePrint}
            >
              Print / Save as PDF
            </Button>
          </div>
        </div>

        {/* Live Document Preview */}
        <div className="border border-slate-300 rounded-xl overflow-hidden shadow-inner bg-white h-[70vh]">
          <iframe
            title="Agenda Print Preview"
            srcDoc={htmlContent}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </Modal>
  );
}
