import { useState, useEffect } from 'react';
import {
  Moon, Sun, X, CheckSquare, Square, Clock, ArrowLeft,
  Calendar, Users, BookOpen, ChevronRight, Award, Shield
} from 'lucide-react';
import type { Agenda, ReleaseItem, SustainingItem, OrdinationItem, BabyBlessingItem, BaptismItem, ConfirmationItem, FellowshipItem } from '../../types';
import { formatHymnDisplay } from '../../utils/hymnParser';
import { parseSpeakersList, parseStructuredOrLines } from '../../utils/AgendaPrintEngine';
import { format } from 'date-fns';

interface DigitalPodiumModalProps {
  open: boolean;
  onClose: () => void;
  agenda: Agenda;
}

export function DigitalPodiumModal({ open, onClose, agenda }: DigitalPodiumModalProps) {
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'service' | 'business'>('service');
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  if (!open) return null;

  const toggleItem = (id: string) => {
    setCompletedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formattedDate = agenda.date ? format(new Date(agenda.date), 'EEEE, MMMM d, yyyy') : 'Sunday Service';
  const speakers = parseSpeakersList(agenda.speakers);
  
  const announcements = parseStructuredOrLines<string>(agenda.announcements, (l) => l);
  const releases = parseStructuredOrLines<ReleaseItem>(agenda.releases, (l) => {
    const parts = l.split(/released as/i);
    return { name: parts[0]?.trim() || l, calling: parts[1]?.trim() || '' };
  });
  const calls = parseStructuredOrLines<SustainingItem>(agenda.calls, (l) => {
    const parts = l.split(/called as/i);
    return { name: parts[0]?.trim() || l, calling: parts[1]?.trim() || '' };
  });
  const ordinations = parseStructuredOrLines<OrdinationItem>(agenda.aaronic_ordinations || agenda.aaronic_advancements, (l) => {
    return { name: l, office: '', ordained_by: '', ordained_by_office: '' };
  });
  const babies = parseStructuredOrLines<BabyBlessingItem>(agenda.babies || agenda.naming_blessing, (l) => {
    return { baby_name: l, family: '', blessed_by: '', blessed_by_office: '' };
  });
  const baptisms = parseStructuredOrLines<BaptismItem>(agenda.baptized_children, (l) => {
    return { name: l, baptized_by: '', confirmed_by: '' };
  });
  const confirmations = parseStructuredOrLines<ConfirmationItem>(agenda.confirmations || agenda.confirmation_bestowal, (l) => {
    return { name: l, confirmed_by: '' };
  });
  const fellowships = parseStructuredOrLines<FellowshipItem>(agenda.fellowships, (l) => {
    return { name: l };
  });

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto flex flex-col transition-colors duration-200 ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* TOP PODIUM BAR */}
      <header
        className={`sticky top-0 z-10 px-4 py-3 border-b flex items-center justify-between backdrop-blur-md ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Exit Stand Mode"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-base font-bold tracking-tight">
              {agenda.ward_branch || 'Sacrament Meeting'} — Stand Podium
            </h1>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {formattedDate} · {agenda.start_time || '10:00 AM'}
            </p>
          </div>
        </div>

        {/* TIMER & CONTROLS */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-mono font-bold ${
              darkMode ? 'bg-slate-800/80 border-slate-700 text-emerald-400' : 'bg-slate-100 border-slate-200 text-slate-800'
            }`}
          >
            <Clock className="h-4 w-4 text-emerald-500" />
            <span>{format(currentTime, 'HH:mm:ss')}</span>
            <span className="text-xs text-slate-500 font-normal">|</span>
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className={`text-xs px-1.5 py-0.5 rounded cursor-pointer ${
                timerRunning ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
              }`}
              title="Click to start/pause meeting stopwatch"
            >
              ⏱ {formatElapsed(elapsedSeconds)} {timerRunning ? '❚❚' : '▶'}
            </button>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            onClick={onClose}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              darkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-300 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* SUBNAV TABS */}
      <div
        className={`flex border-b px-4 gap-2 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <button
          onClick={() => setActiveTab('service')}
          className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'service'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Order of Service
        </button>
        <button
          onClick={() => setActiveTab('business')}
          className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'business'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="h-4 w-4" />
          Ward Business & Ordinances
          {(releases.length > 0 || calls.length > 0 || ordinations.length > 0) && (
            <span className="bg-amber-500 text-slate-950 text-xs px-1.5 py-0.2 rounded-full font-bold">
              {releases.length + calls.length + ordinations.length}
            </span>
          )}
        </button>
      </div>

      {/* PODIUM CONTENT */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {activeTab === 'service' ? (
          <div className="space-y-4">
            {/* LEADERSHIP GRID */}
            <div
              className={`p-4 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-3 ${
                darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <p className="text-xs uppercase font-bold text-slate-400">Presiding</p>
                <p className="text-base font-bold text-amber-400 mt-0.5">
                  {agenda.presiding || '—'}
                  {agenda.presiding_position && <span className="text-xs font-normal text-slate-400 block">{agenda.presiding_position}</span>}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-slate-400">Conducting</p>
                <p className="text-base font-bold text-blue-400 mt-0.5">
                  {agenda.conducting || '—'}
                  {agenda.conducting_position && <span className="text-xs font-normal text-slate-400 block">{agenda.conducting_position}</span>}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-slate-400">Music Director</p>
                <p className="text-base font-semibold mt-0.5">{agenda.music_director || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-slate-400">Organist</p>
                <p className="text-base font-semibold mt-0.5">{agenda.organist || '—'}</p>
              </div>
            </div>

            {/* INTERACTIVE SERVICE ITEMS */}
            <div className="space-y-3">
              <PodiumItem
                id="prelude"
                darkMode={darkMode}
                completed={!!completedItems['prelude']}
                onToggle={() => toggleItem('prelude')}
                title="Prelude Music"
                detail={agenda.prelude_music || 'Organist Selection'}
                assignee="Organist / Pianist"
              />

              <PodiumItem
                id="welcome"
                darkMode={darkMode}
                completed={!!completedItems['welcome']}
                onToggle={() => toggleItem('welcome')}
                title="Greetings & Welcome"
                detail={`"${agenda.greetings_welcome || 'We warmly welcome everyone, stake officers, friends of the church and those worshipping with us today in our Sacrament Meeting.'}"`}
                assignee="Conducting Officer"
                highlight
              />

              <PodiumItem
                id="opening_hymn"
                darkMode={darkMode}
                completed={!!completedItems['opening_hymn']}
                onToggle={() => toggleItem('opening_hymn')}
                title="Opening Hymn"
                detail={formatHymnDisplay(agenda.opening_hymn_number, agenda.opening_hymn) || '—'}
                assignee="Congregation / Chorister"
                badge={agenda.opening_hymn_number ? `Hymn #${agenda.opening_hymn_number}` : undefined}
              />

              <PodiumItem
                id="invocation"
                darkMode={darkMode}
                completed={!!completedItems['invocation']}
                onToggle={() => toggleItem('invocation')}
                title="Invocation (Opening Prayer)"
                detail={agenda.opening_prayer || '—'}
                assignee="Invited Member"
              />

              <div
                onClick={() => setActiveTab('business')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  darkMode
                    ? 'bg-amber-950/20 border-amber-800/40 hover:bg-amber-950/40 text-amber-200'
                    : 'bg-amber-50 border-amber-200 hover:bg-amber-100/80 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-bold text-sm">Ward Business & Announcements</p>
                    <p className="text-xs opacity-80">Tap to view Announcements, Releases, Sustainings & Ordinances</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-amber-500" />
              </div>

              <PodiumItem
                id="sacrament_hymn"
                darkMode={darkMode}
                completed={!!completedItems['sacrament_hymn']}
                onToggle={() => toggleItem('sacrament_hymn')}
                title="Sacrament Hymn"
                detail={formatHymnDisplay(agenda.sacrament_hymn_number, agenda.sacrament_hymn) || '—'}
                assignee="Congregation"
                badge={agenda.sacrament_hymn_number ? `Hymn #${agenda.sacrament_hymn_number}` : undefined}
                highlight
              />

              <PodiumItem
                id="sacrament_admin"
                darkMode={darkMode}
                completed={!!completedItems['sacrament_admin']}
                onToggle={() => toggleItem('sacrament_admin')}
                title="Administration of the Sacrament"
                detail="Blessed and passed by the Aaronic Priesthood"
                assignee="Priesthood"
              />

              {/* SPEAKERS */}
              <div
                className={`p-4 rounded-xl border ${
                  darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/40 mb-3">
                  <p className="font-bold text-sm uppercase tracking-wider text-blue-400">Speakers & Messages</p>
                  <span className="text-xs text-slate-400">{speakers.length} speakers scheduled</span>
                </div>

                <div className="space-y-3">
                  {speakers.length > 0 ? (
                    speakers.map((sp, idx) => (
                      <div
                        key={idx}
                        onClick={() => toggleItem(`speaker_${idx}`)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                          completedItems[`speaker_${idx}`]
                            ? darkMode
                              ? 'bg-slate-950/40 border-slate-800 opacity-50 line-through'
                              : 'bg-slate-100 border-slate-200 opacity-50 line-through'
                            : darkMode
                            ? 'bg-slate-800/60 border-slate-700 hover:border-blue-500'
                            : 'bg-slate-50 border-slate-200 hover:border-blue-400'
                        }`}
                      >
                        {completedItems[`speaker_${idx}`] ? (
                          <CheckSquare className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-base text-slate-100">
                              {idx + 1}. {sp.name}
                            </span>
                            {sp.minutes && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                                {sp.minutes} mins
                              </span>
                            )}
                          </div>
                          {sp.topic && (
                            <p className="text-sm text-slate-300 mt-1 font-medium">Topic: {sp.topic}</p>
                          )}
                          {sp.scripture_ref && (
                            <p className="text-xs text-slate-400 italic mt-0.5">Ref: {sp.scripture_ref}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400 italic">Bearing of testimonies by the congregation</p>
                  )}
                </div>
              </div>

              {agenda.special_music && (
                <PodiumItem
                  id="special_music"
                  darkMode={darkMode}
                  completed={!!completedItems['special_music']}
                  onToggle={() => toggleItem('special_music')}
                  title="Special Musical Number"
                  detail={agenda.special_music}
                  assignee="Musical Item"
                />
              )}

              <PodiumItem
                id="closing_hymn"
                darkMode={darkMode}
                completed={!!completedItems['closing_hymn']}
                onToggle={() => toggleItem('closing_hymn')}
                title="Closing Hymn"
                detail={formatHymnDisplay(agenda.closing_hymn_number, agenda.closing_hymn) || '—'}
                assignee="Congregation / Chorister"
                badge={agenda.closing_hymn_number ? `Hymn #${agenda.closing_hymn_number}` : undefined}
              />

              <PodiumItem
                id="benediction"
                darkMode={darkMode}
                completed={!!completedItems['benediction']}
                onToggle={() => toggleItem('benediction')}
                title="Benediction (Closing Prayer)"
                detail={agenda.closing_prayer || '—'}
                assignee="Invited Member"
              />

              <PodiumItem
                id="postlude"
                darkMode={darkMode}
                completed={!!completedItems['postlude']}
                onToggle={() => toggleItem('postlude')}
                title="Postlude Music"
                detail={agenda.postlude_music || 'Organist Selection'}
                assignee="Organist"
              />
            </div>
          </div>
        ) : (
          /* WARD BUSINESS TAB */
          <div className="space-y-6">
            {/* ANNOUNCEMENTS */}
            <div
              className={`p-4 rounded-xl border ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-400 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> 1. Announcements & Upcoming Events
              </h2>
              {announcements.length > 0 ? (
                <ul className="space-y-2 text-base">
                  {announcements.map((a, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-blue-500 font-bold">{i + 1}.</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 italic">No announcements listed.</p>
              )}
            </div>

            {/* RELEASES */}
            <div
              className={`p-4 rounded-xl border ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" /> 2. Releases from Callings
              </h2>
              {releases.length > 0 ? (
                <div className="space-y-3">
                  <ul className="space-y-2 text-base">
                    {releases.map((r, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="text-amber-500 font-bold">•</span>
                        <span><strong>{r.name}</strong> {r.calling ? `released as ${r.calling}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs italic text-slate-400 bg-slate-800/40 p-2.5 rounded border border-slate-700/40">
                    Conducting wording: "Those who wish to express appreciation for their devoted service may manifest it by the uplifted hand."
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No releases for this week.</p>
              )}
            </div>

            {/* SUSTAININGS */}
            <div
              className={`p-4 rounded-xl border ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-2">
                <Award className="h-4 w-4" /> 3. Sustaining of Officers & New Callings
              </h2>
              {calls.length > 0 ? (
                <div className="space-y-3">
                  <ul className="space-y-2 text-base">
                    {calls.map((c, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span><strong>{c.name}</strong> {c.calling ? `called as ${c.calling}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs italic text-slate-400 bg-slate-800/40 p-2.5 rounded border border-slate-700/40">
                    Conducting wording: "All who are in favor of sustaining these members may manifest it by the uplifted hand. Any opposed may manifest it."
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No sustainings for this week.</p>
              )}
            </div>

            {/* ORDINATIONS */}
            <div
              className={`p-4 rounded-xl border ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <h2 className="text-sm font-bold uppercase tracking-wider text-purple-400 mb-2">
                4. Aaronic Priesthood Ordinations & Advancements
              </h2>
              {ordinations.length > 0 ? (
                <ul className="space-y-2 text-base">
                  {ordinations.map((o, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-purple-500 font-bold">•</span>
                      <span><strong>{o.name}</strong> {o.office ? `ordained to office of ${o.office}` : ''} {o.ordained_by ? `by ${o.ordained_by} (${o.ordained_by_office || 'Priesthood'})` : ''}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 italic">No ordinations scheduled.</p>
              )}
            </div>

            {/* BABY BLESSINGS & CONFIRMATIONS */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div
                className={`p-4 rounded-xl border ${
                  darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">5. Baby Blessings</h3>
                {babies.length > 0 ? (
                  <ul className="space-y-1.5 text-sm">
                    {babies.map((b, i) => (
                      <li key={i}>• Baby <strong>{b.baby_name}</strong> {b.family ? `(${b.family})` : ''} blessed by {b.blessed_by || 'Priesthood'} ({b.blessed_by_office || 'Elder'})</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic">None scheduled.</p>
                )}
              </div>

              <div
                className={`p-4 rounded-xl border ${
                  darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">6. Baptisms & Confirmations</h3>
                {(baptisms.length > 0 || confirmations.length > 0) ? (
                  <ul className="space-y-1.5 text-sm">
                    {baptisms.map((b, i) => (
                      <li key={i}>• <strong>{b.name}</strong> (Baptism{b.baptized_by ? ` by ${b.baptized_by}` : ''})</li>
                    ))}
                    {confirmations.map((c, i) => (
                      <li key={i}>• <strong>{c.name}</strong> (Confirmation{c.confirmed_by ? ` by ${c.confirmed_by}` : ''})</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic">None scheduled.</p>
                )}
              </div>
            </div>

            {/* FELLOWSHIPS */}
            <div
              className={`p-4 rounded-xl border ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <h2 className="text-sm font-bold uppercase tracking-wider text-teal-400 mb-2">
                7. Fellowships & Welcoming New Members
              </h2>
              {fellowships.length > 0 ? (
                <ul className="space-y-2 text-base">
                  {fellowships.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-teal-500 font-bold">•</span>
                      <span><strong>{f.name}</strong> {f.note ? `— ${f.note}` : 'welcomed to the ward'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 italic">None for this week.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function PodiumItem({
  id,
  darkMode,
  completed,
  onToggle,
  title,
  detail,
  assignee,
  badge,
  highlight,
}: {
  id: string;
  darkMode: boolean;
  completed: boolean;
  onToggle: () => void;
  title: string;
  detail: string;
  assignee?: string;
  badge?: string;
  highlight?: boolean;
}) {
  return (
    <div
      onClick={onToggle}
      className={`p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 select-none ${
        completed
          ? darkMode
            ? 'bg-slate-950/40 border-slate-800/80 opacity-40 line-through'
            : 'bg-slate-100 border-slate-200 opacity-40 line-through'
          : highlight
          ? darkMode
            ? 'bg-blue-950/30 border-blue-800/60 hover:bg-blue-950/50 shadow-sm'
            : 'bg-blue-50/80 border-blue-200 hover:bg-blue-100/70 shadow-sm'
          : darkMode
          ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
      }`}
    >
      {completed ? (
        <CheckSquare className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
      ) : (
        <Square className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400">{title}</span>
          {badge && (
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
              {badge}
            </span>
          )}
        </div>
        <p className="text-base sm:text-lg font-bold mt-0.5 text-slate-100">{detail}</p>
        {assignee && <p className="text-xs text-slate-400 mt-0.5 font-medium">{assignee}</p>}
      </div>
    </div>
  );
}
