import React, { useState, useEffect } from 'react';
import {
  Bell, X, Sparkles, BookOpen, Calendar,
  Users, Heart, Send, Smartphone, ShieldCheck, AlertCircle
} from 'lucide-react';
import {
  BulletinNotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  saveNotificationPreferences,
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  isNotificationSupported,
} from '../../utils/bulletinNotifications';
import toast from 'react-hot-toast';

interface BulletinNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryColor?: string;
}

export function BulletinNotificationModal({
  isOpen,
  onClose,
  primaryColor = '#1e3a8a',
}: BulletinNotificationModalProps) {
  const [prefs, setPrefs] = useState<BulletinNotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [testingCategory, setTestingCategory] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPrefs(getNotificationPreferences());
      setPermission(getNotificationPermission());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const supported = isNotificationSupported();

  const handleToggle = (key: keyof BulletinNotificationPreferences) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    saveNotificationPreferences(updated);
  };

  const handleEnablePermission = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);

    if (result === 'granted') {
      const updated = { ...prefs, enabled: true };
      setPrefs(updated);
      saveNotificationPreferences(updated);
      toast.success('Device notifications enabled!');
    } else if (result === 'denied') {
      toast.error('Notifications were blocked. Please enable them in your browser site settings.');
    }
  };

  const handleSendTest = async (categoryKey = 'birthdays') => {
    if (permission !== 'granted') {
      const res = await requestNotificationPermission();
      setPermission(res);
      if (res !== 'granted') {
        toast.error('Please allow notification permission to receive alerts.');
        return;
      }
    }

    setTestingCategory(categoryKey);
    const success = await sendTestNotification(categoryKey);
    setTestingCategory(null);

    if (success) {
      toast.success('Test notification sent! Check your notification bar.');
    } else {
      toast.error('Could not display test notification on this device.');
    }
  };

  const categories: {
    key: keyof BulletinNotificationPreferences;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      key: 'birthdays',
      title: 'Member Birthdays',
      description: 'Morning alert when ward members celebrate birthdays today.',
      icon: <Heart className="w-4 h-4" />,
      color: 'text-rose-600 bg-rose-50',
    },
    {
      key: 'dailyScriptures',
      title: 'Daily Scripture Studies',
      description: 'Daily uplifting scripture verse & spiritual thought.',
      icon: <BookOpen className="w-4 h-4" />,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      key: 'dailyComeFollowMe',
      title: 'Come, Follow Me Daily Reading',
      description: 'Reading prompt for the current week’s lesson.',
      icon: <Sparkles className="w-4 h-4" />,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      key: 'sundayClasses',
      title: 'Next Sunday Class Lessons',
      description: 'Sunday School, Relief Society, and Elders Quorum lesson reminders.',
      icon: <Users className="w-4 h-4" />,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      key: 'activities',
      title: 'Activities & Programmes for That Day',
      description: 'Alerts on the day of ward activities, youth nights, and meetings.',
      icon: <Calendar className="w-4 h-4" />,
      color: 'text-emerald-600 bg-emerald-50',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div
          className="p-5 text-white flex items-center justify-between"
          style={{ background: primaryColor }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Notification Settings</h2>
              <p className="text-xs text-white/80">Device notification bar alerts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800 text-xs sm:text-sm">
          {/* Permission Card */}
          {!supported ? (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="text-xs">
                <strong>Notifications Not Supported</strong>: Your current browser or device mode does not support device push notifications.
              </div>
            </div>
          ) : permission === 'denied' ? (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div className="text-xs">
                <strong>Notifications Blocked</strong>: You have blocked notifications in your browser. Tap the site settings icon in your browser to set Notifications to <em>Allow</em>.
              </div>
            </div>
          ) : permission !== 'granted' ? (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span>Enable Notification Bar Alerts</span>
              </div>
              <p className="text-xs text-blue-800/90 leading-relaxed">
                Allow notifications to receive birthday reminders, daily scriptures, and ward activities right in your device notification bar.
              </p>
              <button
                type="button"
                onClick={handleEnablePermission}
                className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Allow Notifications on this Device</span>
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Device Notifications Active</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-emerald-200/60 text-emerald-900">
                Connected
              </span>
            </div>
          )}

          {/* Master Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <div className="font-bold text-xs sm:text-sm text-slate-900">Receive Push Notifications</div>
              <div className="text-[11px] text-slate-500">Master switch for all ward alerts</div>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('enabled')}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                prefs.enabled ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  prefs.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Categories List */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
              Select Categories to Receive
            </div>

            {categories.map((cat) => {
              const isChecked = prefs.enabled && prefs[cat.key];
              return (
                <div
                  key={cat.key}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isChecked
                      ? 'border-slate-300 bg-white shadow-xs'
                      : 'border-slate-200 bg-slate-50/60 opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cat.color}`}>
                      {cat.icon}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">{cat.title}</div>
                      <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{cat.description}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!prefs.enabled}
                    onClick={() => handleToggle(cat.key)}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                      isChecked ? 'bg-blue-600' : 'bg-slate-300'
                    } disabled:opacity-40`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${
                        isChecked ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Test Notification Action */}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleSendTest('birthdays')}
              disabled={testingCategory !== null}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5 text-blue-600" />
              <span>{testingCategory ? 'Sending Test…' : 'Send Test Notification to Device'}</span>
            </button>
            <p className="text-[10px] text-slate-400 text-center">
              Tapping above will immediately pop up a sample notification in your device bar.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl font-bold text-xs text-white shadow-xs transition-all"
            style={{ background: primaryColor }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
