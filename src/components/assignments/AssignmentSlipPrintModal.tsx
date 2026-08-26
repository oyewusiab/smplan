import { useRef } from 'react';
import { X, Printer, Scissors } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Assignment } from '../../types';
import { format, parseISO, isValid } from 'date-fns';

interface AssignmentSlipPrintModalProps {
  open: boolean;
  onClose: () => void;
  assignments: Assignment[];
  unitName?: string;
  secretaryName?: string;
  secretaryTitle?: string;
  signatureDataUrl?: string;
}

export function AssignmentSlipPrintModal({
  open,
  onClose,
  assignments,
  unitName = 'OBANTOKO WARD',
  secretaryName = 'Oloyede Michael Oluwagbemiga',
  secretaryTitle = 'SECRETARY',
  signatureDataUrl = '',
}: AssignmentSlipPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!open || assignments.length === 0) return null;

  // Format date as DD-MMM-YYYY (e.g. 16-Aug-2026)
  const formatDateDDMMMYYYY = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const parsed = parseISO(dateStr);
      if (isValid(parsed)) return format(parsed, 'dd-MMM-yyyy');
      const d = new Date(dateStr);
      if (isValid(d)) return format(d, 'dd-MMM-yyyy');
    } catch { /* fallback */ }
    return dateStr;
  };

  const todayFormatted = format(new Date(), 'dd-MMM-yyyy');

  const formatRecipientGreeting = (person: string) => {
    const trimmed = (person || '').trim();
    if (
      trimmed.startsWith('Brother') || trimmed.startsWith('Sister') ||
      trimmed.startsWith('Elder') || trimmed.startsWith('Bishop') ||
      trimmed.startsWith('President')
    ) {
      const parts = trimmed.split(' ');
      const title = parts[0];
      const name = parts.slice(1).join(' ');
      return { title: `Dear ${title}`, name: name };
    }
    if (trimmed.startsWith('Bro.')) {
      return { title: 'Dear Brother', name: trimmed.replace(/^Bro\.\s*/i, '') };
    }
    if (trimmed.startsWith('Sis.')) {
      return { title: 'Dear Sister', name: trimmed.replace(/^Sis\.\s*/i, '') };
    }
    return { title: 'Dear Brother/Sister', name: trimmed };
  };

  const getDutyActionTitle = (role: string) => {
    const r = (role || '').toUpperCase();
    if (r.includes('OPENING_PRAYER') || r === 'INVOCATION') return 'Give the Opening Prayer (2 minutes maximum)';
    if (r.includes('CLOSING_PRAYER') || r === 'BENEDICTION') return 'Give the Closing Prayer (2 minutes maximum)';
    if (r.includes('SACRAMENT_PREPARING')) return 'Prepare the Sacrament';
    if (r.includes('SACRAMENT_BLESSING')) return 'Bless the Sacrament';
    if (r.includes('SACRAMENT_PASSING')) return 'Pass the Sacrament';
    if (r.includes('SACRAMENT')) return 'Administer the Sacrament';
    if (r.includes('YOUTH')) return 'Give a Youth Talk/Presentation';
    if (r.includes('MUSIC') || r.includes('CHORISTER') || r.includes('ORGANIST')) return 'Provide Sacred Music / Accompaniment';
    return 'Give a Talk/Presentation/Lesson';
  };

  // Group assignments into chunks of 3 for 3-Up per page
  const pages: Assignment[][] = [];
  for (let i = 0; i < assignments.length; i += 3) {
    pages.push(assignments.slice(i, i + 3));
  }

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=950,height=1050');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sacrament Meeting Assignment Slips — ${unitName}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            * { box-sizing: border-box; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #000;
              margin: 0;
              padding: 0;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page-container {
              width: 100%;
              min-height: 275mm;
              height: 275mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              page-break-after: always;
              break-after: page;
              margin-bottom: 0;
            }
            .page-container:last-child {
              page-break-after: avoid;
              break-after: avoid;
            }
            .slip-wrapper {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding: 4px 0 6px 0;
            }
            .slip-card {
              border: 1.5px solid #000;
              padding: 14px 18px;
              background: #fff;
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .church-title {
              font-family: 'Times New Roman', Times, serif;
              font-size: 8.5pt;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              color: #111;
            }
            .unit-title {
              font-family: 'Times New Roman', Times, serif;
              font-size: 13pt;
              font-weight: 800;
              text-transform: uppercase;
              margin-top: 1px;
              color: #000;
            }
            .badge-assignment {
              border: 1.5px solid #000;
              padding: 2px 10px;
              font-size: 8.5pt;
              font-weight: 800;
              font-family: sans-serif;
              letter-spacing: 1px;
              text-transform: uppercase;
              color: #000;
            }
            .divider-line {
              border-bottom: 1.5px solid #000;
              margin: 6px 0 10px 0;
            }
            .greeting-row {
              display: flex;
              justify-content: space-between;
              font-size: 10.5pt;
              margin-bottom: 6px;
            }
            .greeting-text {
              font-size: 10.5pt;
            }
            .greeting-name {
              font-weight: bold;
            }
            .date-label {
              font-size: 10pt;
              font-weight: 500;
            }
            .assigned-statement {
              font-size: 10pt;
              margin: 4px 0 2px 0;
            }
            .duty-bar {
              border-left: 3.5px solid #000;
              padding-left: 8px;
              margin: 6px 0;
              font-size: 11.5pt;
              font-weight: bold;
              color: #000;
            }
            .meeting-line {
              font-size: 10pt;
              margin: 4px 0 6px 0;
            }
            .date-pill {
              border: 1px solid #cbd5e1;
              background-color: #f8fafc;
              padding: 1px 6px;
              font-weight: bold;
              border-radius: 2px;
              font-size: 10pt;
            }
            .topic-field {
              margin-top: 6px;
              border-bottom: 1px dotted #444;
              padding-bottom: 2px;
              font-size: 9.5pt;
            }
            .ref-field {
              margin-top: 5px;
              border-bottom: 1px dotted #444;
              padding-bottom: 2px;
              font-size: 9.5pt;
            }
            .field-label {
              font-weight: bold;
              margin-right: 6px;
            }
            .notice-text {
              font-size: 8pt;
              font-style: italic;
              color: #1f2937;
              margin: 8px 0 4px 0;
              line-height: 1.35;
            }
            .signature-row {
              margin-top: 6px;
              display: flex;
              justify-content: flex-end;
            }
            .signature-box {
              width: 220px;
              text-align: center;
            }
            .sig-img {
              max-height: 38px;
              margin: 0 auto -6px auto;
              display: block;
            }
            .sig-underline {
              border-bottom: 1.5px solid #000;
              width: 100%;
              height: 16px;
              margin-bottom: 3px;
            }
            .sig-name {
              font-size: 9.5pt;
              font-weight: bold;
              color: #000;
            }
            .sig-title {
              font-size: 7.5pt;
              font-weight: bold;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              color: #111;
            }
            .cut-line {
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 3px 0;
              border-bottom: 1px dashed #4b5563;
              height: 10px;
            }
            .cut-label {
              background: #fff;
              padding: 0 8px;
              color: #4b5563;
              font-weight: bold;
              font-size: 7pt;
              font-family: monospace;
              letter-spacing: 1.5px;
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Official Assignment Slip Cards (3-Up A4)</h2>
              <p className="text-xs text-slate-500">
                Exact official LDS slip layout with Ward Executive Secretary signature line & dashed cut guides
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" icon={<Printer className="h-4 w-4" />} onClick={handlePrint}>
              Print {assignments.length} Slip{assignments.length !== 1 ? 's' : ''} ({pages.length} Page{pages.length !== 1 ? 's' : ''})
            </Button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Accurate Visual Preview */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
          <div className="mx-auto max-w-2xl bg-white p-6 shadow-lg rounded-lg border border-slate-200" ref={printRef}>
            {pages.map((pageAssignments, pageIndex) => (
              <div key={pageIndex} className="page-container mb-6 last:mb-0">
                {pageAssignments.map((a, slipIndex) => {
                  const isLastSlipInPage = slipIndex === pageAssignments.length - 1;
                  const greeting = formatRecipientGreeting(a.person);
                  const isTalk = !(a.role || '').toUpperCase().includes('PRAYER') && !(a.role || '').toUpperCase().includes('SACRAMENT');

                  return (
                    <div key={a.assignment_id || slipIndex} className="slip-wrapper py-2">
                      <div className="slip-card border-[1.5px] border-black p-4 bg-white">
                        <div>
                          {/* Church Header */}
                          <div className="header-row flex justify-between items-start">
                            <div>
                              <div className="church-title text-[11px] uppercase tracking-wider text-slate-900 font-serif">
                                THE CHURCH OF JESUS CHRIST OF LATTER-DAY SAINTS
                              </div>
                              <div className="unit-title text-base font-extrabold uppercase text-black font-serif">
                                {unitName}
                              </div>
                            </div>
                            <div className="badge-assignment border-[1.5px] border-black px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                              ASSIGNMENT
                            </div>
                          </div>

                          {/* Divider Line */}
                          <div className="divider-line border-b-[1.5px] border-black my-2" />

                          {/* Recipient & Date */}
                          <div className="greeting-row flex justify-between items-center text-sm mb-1.5">
                            <div className="greeting-text text-slate-900">
                              <span>{greeting.title} </span>
                              <strong className="greeting-name font-bold">{greeting.name}</strong>,
                            </div>
                            <div className="date-label text-xs font-medium text-slate-800">
                              Date: <span className="font-semibold">{todayFormatted}</span>
                            </div>
                          </div>

                          {/* Assignment Statement */}
                          <p className="assigned-statement text-xs text-slate-800 my-1">
                            On behalf of the Bishopric, you are assigned to:
                          </p>

                          {/* Highlighted Duty Bar */}
                          <div className="duty-bar border-l-4 border-black pl-2.5 my-1.5 text-sm font-bold text-black">
                            {getDutyActionTitle(a.role)}
                          </div>

                          {/* Meeting Date & Time */}
                          <div className="meeting-line text-xs text-slate-900 my-1.5">
                            in <strong>Sacrament Meeting</strong> on{' '}
                            <span className="date-pill border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-bold rounded text-xs text-black">
                              {formatDateDDMMMYYYY(a.date)}
                            </span>{' '}
                            (Time: <strong>{a.minutes || 10} min</strong>).
                          </div>

                          {/* Topic and Reference Fields (with dotted underlines) */}
                          {isTalk && (
                            <div className="space-y-1 my-2">
                              <div className="topic-field border-b border-dotted border-slate-600 pb-0.5 text-xs text-slate-900">
                                <strong className="field-label font-bold text-black">Topic / Subject:</strong>{' '}
                                <span className="text-slate-800">{a.topic || '—'}</span>
                              </div>
                              <div className="ref-field border-b border-dotted border-slate-600 pb-0.5 text-xs text-slate-900">
                                <strong className="field-label font-bold text-black">Reference:</strong>{' '}
                                <span className="italic text-slate-700">{a.scripture_ref || '—'}</span>
                              </div>
                            </div>
                          )}

                          {/* Instruction Notice */}
                          <p className="notice-text text-[11px] italic text-slate-800 my-2 leading-relaxed">
                            Please join the Bishopric 15 minutes before the meeting. If you cannot fulfill this assignment, please contact a member of the Bishopric immediately.
                          </p>
                        </div>

                        {/* Signature Block (Bottom Right) */}
                        <div className="signature-row flex justify-end mt-2">
                          <div className="signature-box w-56 text-center">
                            {signatureDataUrl ? (
                              <img src={signatureDataUrl} alt="Signature" className="sig-img max-h-9 mx-auto -mb-1 block" />
                            ) : null}
                            <div className="sig-underline border-b-[1.5px] border-black w-full h-4 mb-1" />
                            <div className="sig-name text-xs font-bold text-black">{secretaryName}</div>
                            <div className="sig-title text-[10px] font-bold tracking-wider uppercase text-slate-800">{secretaryTitle}</div>
                          </div>
                        </div>
                      </div>

                      {/* Dashed Cut Line */}
                      {!isLastSlipInPage && (
                        <div className="cut-line flex items-center justify-center my-1 border-b border-dashed border-slate-500 h-3">
                          <span className="cut-label bg-white px-2 text-[10px] font-mono font-bold text-slate-500">
                            ✂ - - - - - - - - - - CUT HERE - - - - - - - - - - ✂
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 bg-slate-50 rounded-b-2xl">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <Scissors className="h-3.5 w-3.5 text-slate-400" />
            Each A4 sheet fits 3 identical assignment slips with dotted guides for easy cutting.
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            <Button size="sm" icon={<Printer className="h-4 w-4" />} onClick={handlePrint}>Print Slips</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
