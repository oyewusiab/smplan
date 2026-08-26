import React, { useRef } from 'react';
import { Printer, Download, X, FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { generateRosterPrintHtml } from '../../utils/memberRosterParsers';
import type { Member } from '../../types';

interface MemberRosterPrintModalProps {
  open: boolean;
  onClose: () => void;
  members: Member[];
  unitName?: string;
}

export function MemberRosterPrintModal({
  open,
  onClose,
  members,
  unitName = 'Ward Directory'
}: MemberRosterPrintModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const html = generateRosterPrintHtml(members, unitName);

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentWindow?.document;
      if (doc) {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }
    } catch (e) {
      console.error('Print trigger error:', e);
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(html);
        printWin.document.close();
        printWin.focus();
        printWin.print();
      }
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Printable Member Directory & Vector PDF"
      size="xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="text-xs text-slate-500">
            Total <strong>{members.length}</strong> members formatted for A4 vector printout
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handlePrint} icon={<Printer className="h-4 w-4" />}>
              Print / Save as PDF
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg p-2.5 text-xs text-blue-800">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              Previewing vector layout. Click <strong>Print / Save as PDF</strong> and choose <em>Save as PDF</em> in your browser printer options.
            </span>
          </div>
        </div>

        {/* Embedded Iframe Preview */}
        <div className="w-full h-[600px] border border-slate-300 rounded-lg overflow-hidden bg-slate-50 shadow-inner">
          <iframe
            ref={iframeRef}
            srcDoc={html}
            title="Member Roster Print Preview"
            className="w-full h-full border-0 bg-white"
          />
        </div>
      </div>
    </Modal>
  );
}
