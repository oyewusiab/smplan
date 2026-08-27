import React, { useState } from 'react';
import {
  Calendar,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Award,
  Users,
  Copy,
  Check,
  Music,
  Mic,
  BookOpen,
  ChevronRight,
  UserCheck,
  Flame,
  PieChart
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ROLE_DEFINITIONS } from '../../utils/memberAnalyticsEngine';
import type {
  YearAnalyticsData,
  RecommendedRoleType,
  RoleCandidate,
  Member
} from '../../types';
import toast from 'react-hot-toast';

interface MemberAnalyticsDashboardProps {
  analytics: YearAnalyticsData;
  selectedYear: number;
  onYearChange: (year: number) => void;
  onQuickAssign?: (candidate: RoleCandidate) => void;
}

export function MemberAnalyticsDashboard({
  analytics,
  selectedYear,
  onYearChange,
  onQuickAssign
}: MemberAnalyticsDashboardProps) {
  const [selectedRoleKey, setSelectedRoleKey] = useState<RecommendedRoleType>('SPEAKER');
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const handleCopyName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopiedName(name);
    toast.success(`Copied "${name}" to clipboard`);
    setTimeout(() => setCopiedName(null), 2000);
  };

  const activeCandidates = analytics.rolePredictions[selectedRoleKey] || [];
  const selectedRoleDef = ROLE_DEFINITIONS.find(d => d.key === selectedRoleKey) || ROLE_DEFINITIONS[0];

  const maxMonthTotal = Math.max(...analytics.monthlyStats.map(m => m.total), 1);

  const alerts = analytics.bishopricAlerts || analytics.pastoralAlerts;
  const newcomers0to6 = (alerts?.newcomers || []).filter(n => n.bracket === '0-6m');
  const newcomers7to12 = (alerts?.newcomers || []).filter(n => n.bracket === '7-12m');

  return (
    <div className="space-y-6">
      {/* ─── Top Header & Year Selector ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Calendar Year Bishopric Analytics ({selectedYear})
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                Live Ledger Sync
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Cross-referenced from historical planners, stand agendas, and duty assignments
            </p>
          </div>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Year:</span>
          <div className="flex rounded-lg bg-slate-100 p-1">
            {[2024, 2025, 2026, 2027].map(yr => (
              <button
                key={yr}
                onClick={() => onYearChange(yr)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  selectedYear === yr
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Annual Activity Progress & Timeline ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Progress Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Annual Activity Progress
              </h3>
              <span className="text-2xl font-black text-slate-900">
                {analytics.progressPct}%
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600">Total Ward Roles ({selectedYear}):</span>
                  <span className="text-slate-900 font-bold">{analytics.totalRoles}</span>
                </div>
                {/* 3-Phase Multi-color Progress Bar */}
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${analytics.totalRoles > 0 ? (analytics.doneCount / analytics.totalRoles) * 100 : 0}%` }}
                    className="bg-emerald-500 transition-all duration-500"
                    title={`Done: ${analytics.doneCount}`}
                  />
                  <div
                    style={{ width: `${analytics.totalRoles > 0 ? (analytics.doingCount / analytics.totalRoles) * 100 : 0}%` }}
                    className="bg-amber-400 transition-all duration-500"
                    title={`Doing (This Week): ${analytics.doingCount}`}
                  />
                  <div
                    style={{ width: `${analytics.totalRoles > 0 ? (analytics.willDoCount / analytics.totalRoles) * 100 : 0}%` }}
                    className="bg-blue-500 transition-all duration-500"
                    title={`Will Do (Pipeline): ${analytics.willDoCount}`}
                  />
                </div>
              </div>

              {/* 3-Phase Segmenter Stats */}
              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100">
                <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-100">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase">🟢 Done</div>
                  <div className="text-lg font-bold text-emerald-900">{analytics.doneCount}</div>
                  <div className="text-[9px] text-emerald-600">Past Roles</div>
                </div>
                <div className="p-2 bg-amber-50/60 rounded-lg border border-amber-100">
                  <div className="text-[10px] font-bold text-amber-700 uppercase">🟡 Doing</div>
                  <div className="text-lg font-bold text-amber-900">{analytics.doingCount}</div>
                  <div className="text-[9px] text-amber-600">This Week</div>
                </div>
                <div className="p-2 bg-blue-50/60 rounded-lg border border-blue-100">
                  <div className="text-[10px] font-bold text-blue-700 uppercase">🔵 Will Do</div>
                  <div className="text-lg font-bold text-blue-900">{analytics.willDoCount}</div>
                  <div className="text-[9px] text-blue-600">Pipeline</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Calculated against Sunday–Saturday current week cycle</span>
            <span className="font-semibold text-slate-700">{analytics.doneCount + analytics.doingCount + analytics.willDoCount} accounted</span>
          </div>
        </Card>

        {/* 12-Month Stacked Activity Timeline (Jan - Dec) */}
        <Card className="lg:col-span-2 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-600" />
                Monthly Stacked Activity Timeline ({selectedYear})
              </h3>
              <div className="flex items-center gap-3 text-[11px] font-medium">
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Done
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Doing
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Will Do
                </span>
              </div>
            </div>

            {/* 12-Month Stacked Bar Visualizer */}
            <div className="grid grid-cols-12 gap-1.5 items-end h-40 pt-4 px-1 pb-2 border-b border-slate-200">
              {analytics.monthlyStats.map(m => {
                const heightPct = Math.max(12, Math.round((m.total / maxMonthTotal) * 100));
                return (
                  <div key={m.monthName} className="flex flex-col items-center h-full justify-end group">
                    <div className="text-[9px] font-mono text-slate-400 group-hover:text-slate-900 font-bold mb-1 transition-colors">
                      {m.total > 0 ? m.total : ''}
                    </div>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[28px] rounded-t flex flex-col-reverse overflow-hidden bg-slate-100 shadow-sm transition-all group-hover:opacity-90"
                    >
                      {m.done > 0 && (
                        <div
                          style={{ height: `${(m.done / m.total) * 100}%` }}
                          className="w-full bg-emerald-500"
                          title={`${m.monthName}: ${m.done} Done`}
                        />
                      )}
                      {m.doing > 0 && (
                        <div
                          style={{ height: `${(m.doing / m.total) * 100}%` }}
                          className="w-full bg-amber-400"
                          title={`${m.monthName}: ${m.doing} Doing`}
                        />
                      )}
                      {m.willDo > 0 && (
                        <div
                          style={{ height: `${(m.willDo / m.total) * 100}%` }}
                          className="w-full bg-blue-500"
                          title={`${m.monthName}: ${m.willDo} Will Do`}
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600 mt-1.5">
                      {m.monthName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Hover bars for detailed monthly breakdown</span>
            <span>Peak Month: <strong>{maxMonthTotal} assignments</strong></span>
          </div>
        </Card>
      </div>

      {/* ─── Smart Role Recommendation Engine (Predictions for 8 Roles) ─────── */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Smart Role Recommendation Engine
            </h3>
            <p className="text-xs text-slate-500">
              Ranks top candidate active members based on historical overdue intervals and 100-point readiness scores
            </p>
          </div>
          <div className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
            Overdue Days Algorithm: <code className="font-mono text-purple-700">DaysSinceLast − AvgInterval</code>
          </div>
        </div>

        {/* 8 Role Selector Pills */}
        <div className="flex flex-wrap gap-2">
          {ROLE_DEFINITIONS.map(def => {
            const isSelected = selectedRoleKey === def.key;
            return (
              <button
                key={def.key}
                onClick={() => setSelectedRoleKey(def.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {def.key === 'SPEAKER' && <Mic className="h-3.5 w-3.5" />}
                {def.key.includes('PRAYER') || def.key.includes('INVOCATION') || def.key.includes('BENEDICTION') ? (
                  <BookOpen className="h-3.5 w-3.5" />
                ) : null}
                {def.key.includes('MUSIC') || def.key.includes('ORGANIST') ? (
                  <Music className="h-3.5 w-3.5" />
                ) : null}
                {def.key.includes('SACRAMENT') && <ShieldCheck className="h-3.5 w-3.5" />}
                {def.label}
              </button>
            );
          })}
        </div>

        {/* Candidate List for Selected Role */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 pt-2">
          {activeCandidates.map((cand, idx) => {
            const confColor =
              cand.confidence === 'High'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : cand.confidence === 'Medium'
                ? 'bg-amber-100 text-amber-800 border-amber-200'
                : 'bg-blue-100 text-blue-800 border-blue-200';

            return (
              <div
                key={cand.member.name}
                className="bg-white rounded-xl border border-slate-200 p-3.5 hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between relative group"
              >
                {/* Ranking Ribbon */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    Rank #{idx + 1}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${confColor}`}>
                    {cand.confidence} Fit
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-purple-700 transition-colors">
                    {cand.member.name}
                  </h4>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {cand.member.calling || cand.member.organisation || 'Member'}
                  </div>

                  {/* Reason & Stats */}
                  <div className="mt-2.5 space-y-1.5 text-[11px]">
                    <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded text-slate-700">
                      <span>Overdue Status:</span>
                      <span className={`font-bold ${cand.overdueDays > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                        {cand.overdueDays > 0 ? `+${cand.overdueDays}d overdue` : `${Math.abs(cand.overdueDays)}d to due`}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span>Past Fulfilled:</span>
                      <span className="font-semibold text-slate-700">{cand.pastCount} times</span>
                    </div>

                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span>Readiness Score:</span>
                      <span className="font-bold text-blue-600">{cand.readinessScore}/100</span>
                    </div>

                    <div className="text-[10px] text-purple-700 font-medium italic pt-1">
                      {cand.reason}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                  <button
                    onClick={() => handleCopyName(cand.member.name)}
                    className="text-[11px] font-medium text-slate-600 hover:text-purple-700 flex items-center gap-1 transition-colors"
                  >
                    {copiedName === cand.member.name ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </>
                    )}
                  </button>

                  {onQuickAssign && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7 px-2 text-purple-700 hover:bg-purple-50"
                      onClick={() => onQuickAssign(cand)}
                    >
                      Assign
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {activeCandidates.length === 0 && (
            <div className="col-span-full py-6 text-center text-xs text-slate-400">
              No active candidates found for this role criteria.
            </div>
          )}
        </div>
      </Card>

      {/* ─── Youth Aaronic Priesthood Milestone Progress Tracker ────────────── */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-600" />
              Youth Aaronic Priesthood Milestone Tracker (Ages 12–18)
            </h3>
            <p className="text-xs text-slate-500">
              Ensures every young man actively progresses across the 3 sacred duties of the Sacrament
            </p>
          </div>
          <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            Bishopric Oversight
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Passing (Deacon) */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Passing (Deacon)
                </span>
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  {analytics.youthMilestones.passing.progressPct}% Active
                </span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mb-3">
                <div
                  style={{ width: `${analytics.youthMilestones.passing.progressPct}%` }}
                  className="bg-blue-600 h-full transition-all duration-500"
                />
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Passing Duties:</span>
                  <span className="font-bold text-slate-900">{analytics.youthMilestones.passing.totalDuties}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Participating Boys:</span>
                  <span className="font-bold text-slate-900">{analytics.youthMilestones.passing.activeBoys}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Top Participants:</div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {analytics.youthMilestones.passing.candidates.slice(0, 3).map(c => (
                  <div key={c.name} className="flex justify-between text-[11px] text-slate-700">
                    <span>{c.name} ({c.age}y)</span>
                    <span className="font-semibold text-blue-600">{c.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preparing (Teacher) */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Preparing (Teacher)
                </span>
                <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  {analytics.youthMilestones.preparing.progressPct}% Active
                </span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mb-3">
                <div
                  style={{ width: `${analytics.youthMilestones.preparing.progressPct}%` }}
                  className="bg-purple-600 h-full transition-all duration-500"
                />
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Preparing Duties:</span>
                  <span className="font-bold text-slate-900">{analytics.youthMilestones.preparing.totalDuties}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Participating Boys:</span>
                  <span className="font-bold text-slate-900">{analytics.youthMilestones.preparing.activeBoys}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Top Participants:</div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {analytics.youthMilestones.preparing.candidates.slice(0, 3).map(c => (
                  <div key={c.name} className="flex justify-between text-[11px] text-slate-700">
                    <span>{c.name} ({c.age}y)</span>
                    <span className="font-semibold text-purple-600">{c.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Blessing (Priest) */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Blessing (Priest)
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  {analytics.youthMilestones.blessing.progressPct}% Active
                </span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mb-3">
                <div
                  style={{ width: `${analytics.youthMilestones.blessing.progressPct}%` }}
                  className="bg-emerald-600 h-full transition-all duration-500"
                />
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Blessing Duties:</span>
                  <span className="font-bold text-slate-900">{analytics.youthMilestones.blessing.totalDuties}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Participating Priests:</span>
                  <span className="font-bold text-slate-900">{analytics.youthMilestones.blessing.activeBoys}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Top Participants:</div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {analytics.youthMilestones.blessing.candidates.slice(0, 3).map(c => (
                  <div key={c.name} className="flex justify-between text-[11px] text-slate-700">
                    <span>{c.name} ({c.age}y)</span>
                    <span className="font-semibold text-emerald-600">{c.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── Bishopric Guardrails & Inactivity Alerts ───────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          Bishopric Guardrails & Inactivity Alerts
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Inactive Members Alert (Active members 8+ with no role in 6M+) */}
          <Card className="p-4 border-amber-200 bg-amber-50/30">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600" />
                Inactive Members (6M+ No Role)
              </h4>
              <Badge variant="warning">{alerts?.inactiveMembers?.length || 0}</Badge>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {(alerts?.inactiveMembers || []).map(item => (
                <div key={item.member.name} className="text-xs flex items-center justify-between bg-white/80 p-1.5 rounded border border-amber-100">
                  <span className="font-medium text-slate-800 truncate mr-2">{item.member.name}</span>
                  <span className="text-amber-700 font-semibold text-[11px] shrink-0">
                    {item.neverAssigned ? 'Never assigned' : `${item.monthsSinceLast}m ago`}
                  </span>
                </div>
              ))}
              {(!alerts?.inactiveMembers || alerts.inactiveMembers.length === 0) && (
                <p className="text-xs text-slate-500 py-2 text-center">No inactive member alerts.</p>
              )}
            </div>
          </Card>

          {/* 2. Newcomer Spotlight (Categorized by 0-6 Months vs 7-12 Months) */}
          <Card className="p-4 border-emerald-200 bg-emerald-50/30">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Newcomer Spotlight ({alerts?.newcomers?.length || 0})
              </h4>
              <div className="flex gap-1">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {newcomers0to6.length} in 0–6m
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                  {newcomers7to12.length} in 7–12m
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {/* 0-6 Months Bracket */}
              {newcomers0to6.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    0–6 Months (Recent Converts)
                  </div>
                  {newcomers0to6.map(item => (
                    <div key={item.member.name} className="text-xs flex items-center justify-between bg-white p-1.5 rounded border border-emerald-200 shadow-2xs">
                      <div className="truncate mr-1">
                        <span className="font-semibold text-slate-800">{item.member.name}</span>
                        <span className="text-[10px] text-slate-400 block">
                          {item.confirmationDate ? `Confirmed: ${item.confirmationDate}` : `Joined ~${item.monthsJoined}m ago`}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        item.rolesCount === 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item.rolesCount === 0 ? '0 Roles (Needs talk/prayer)' : `${item.rolesCount} roles`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 7-12 Months Bracket */}
              {newcomers7to12.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                    7–12 Months (1st Year Integration)
                  </div>
                  {newcomers7to12.map(item => (
                    <div key={item.member.name} className="text-xs flex items-center justify-between bg-white p-1.5 rounded border border-teal-200 shadow-2xs">
                      <div className="truncate mr-1">
                        <span className="font-semibold text-slate-800">{item.member.name}</span>
                        <span className="text-[10px] text-slate-400 block">
                          {item.confirmationDate ? `Confirmed: ${item.confirmationDate}` : `Joined ~${item.monthsJoined}m ago`}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        item.rolesCount === 0 ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
                      }`}>
                        {item.rolesCount === 0 ? '0 Roles' : `${item.rolesCount} roles`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {(!alerts?.newcomers || alerts.newcomers.length === 0) && (
                <p className="text-xs text-slate-500 py-3 text-center">No 1st-year newcomers found.</p>
              )}
            </div>
          </Card>

          {/* 3. Double-Dip Overload */}
          <Card className="p-4 border-rose-200 bg-rose-50/30">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Double-Dip Overload (3+ in Month)
              </h4>
              <Badge variant="danger">{alerts?.doubleDips?.length || 0}</Badge>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {(alerts?.doubleDips || []).map(item => (
                <div key={`${item.member.name}_${item.monthKey}`} className="text-xs flex justify-between bg-white/80 p-1.5 rounded border border-rose-100">
                  <span className="font-medium text-slate-800">{item.member.name}</span>
                  <span className="text-rose-700 font-bold text-[11px]">
                    {item.totalRolesCount}x in {item.monthLabel}
                  </span>
                </div>
              ))}
              {(!alerts?.doubleDips || alerts.doubleDips.length === 0) && (
                <p className="text-xs text-slate-500 py-2 text-center">No member overload detected.</p>
              )}
            </div>
          </Card>

          {/* 4. Topic Staleness */}
          <Card className="p-4 border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-orange-500" />
                Topic Staleness (3+ in 60d)
              </h4>
              <Badge>{alerts?.topicStaleness?.length || 0}</Badge>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {(alerts?.topicStaleness || []).map(item => (
                <div key={item.topic} className="text-xs flex justify-between bg-white p-1.5 rounded border border-slate-200">
                  <span className="font-medium text-slate-800 truncate mr-2">{item.topic}</span>
                  <span className="text-orange-600 font-semibold shrink-0">{item.occurrences}x recent</span>
                </div>
              ))}
              {(!alerts?.topicStaleness || alerts.topicStaleness.length === 0) && (
                <p className="text-xs text-slate-500 py-2 text-center">Good doctrinal topic variety.</p>
              )}
            </div>
          </Card>

          {/* 5. Family / Surname Saturation */}
          <Card className="p-4 border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-purple-600" />
                Surname / Family Saturation
              </h4>
              <span className="text-[10px] text-slate-500">Podium balance</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {(alerts?.familySaturation || []).map(item => (
                <div key={item.surname} className="text-xs flex justify-between bg-white p-1.5 rounded border border-slate-200">
                  <span className="font-medium text-slate-800">{item.surname} Family</span>
                  <span className="text-purple-700 font-semibold">{item.count} roles ({item.percentage}%)</span>
                </div>
              ))}
              {(!alerts?.familySaturation || alerts.familySaturation.length === 0) && (
                <p className="text-xs text-slate-500 py-2 text-center">Balanced family distribution.</p>
              )}
            </div>
          </Card>

          {/* 6. Organisation Participation Balance */}
          <Card className="p-4 border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <PieChart className="h-4 w-4 text-blue-600" />
                Organisation Active Balance
              </h4>
              <span className="text-[10px] text-slate-500">Active vs Idle</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {(alerts?.orgParticipation || []).map(item => (
                <div key={item.organisation} className="text-xs flex justify-between bg-white p-1.5 rounded border border-slate-200">
                  <span className="font-medium text-slate-800">{item.organisation}</span>
                  <span className="text-blue-700 font-semibold">
                    {item.participationRate}% Active ({item.idleMembers} idle)
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
