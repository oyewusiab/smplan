import React from 'react';
import { Printer, Download, X } from 'lucide-react';
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
  if (!agenda) return null;

  const htmlContent = generateOtherAgendaHtml(agenda, unitName);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the agenda.');
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
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
      title={`Print Preview — ${agenda.title}`}
      size="xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-xs text-slate-600 font-medium">
            This document follows standard church administrative guidelines for meeting records.
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              icon={<Download className="h-4 w-4" />}
              onClick={handleDownloadHtml}
            >
              Download HTML / PDF
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<Printer className="h-4 w-4" />}
              onClick={handlePrint}
            >
              Print Document
            </Button>
          </div>
        </div>

        {/* Live Preview Iframe */}
        <div className="border border-slate-300 rounded-xl overflow-hidden shadow-inner bg-white h-[65vh]">
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
