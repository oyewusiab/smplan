import React, { useState, useEffect } from 'react';
import { X, Copy, Check, MessageSquare, Mail, Smartphone, Sparkles, User, Phone, AtSign, Heart } from 'lucide-react';
import { Button } from '../ui/Button';
import type { BulletinCelebrant } from '../../types';
import {
  cleanPhoneNumberForWhatsApp,
  buildWhatsAppBirthdayGreetingUrl,
  buildSmsBirthdayGreetingUrl,
  buildMailtoBirthdayGreetingUrl
} from '../../utils/bulletinBirthdayEngine';
import toast from 'react-hot-toast';

export type BirthdayChannel = 'WHATSAPP' | 'EMAIL' | 'SMS';
export type BirthdayTemplateStyle = 'WARM_FAITHFUL' | 'SHORT_SWEET' | 'WARD_FAMILY';

interface BirthdayWishModalProps {
  open: boolean;
  onClose: () => void;
  celebrant: BulletinCelebrant | null;
  unitName?: string;
  initialChannel?: BirthdayChannel;
}

export function BirthdayWishModal({
  open,
  onClose,
  celebrant,
  unitName = 'Obantoko Ward',
  initialChannel = 'WHATSAPP',
}: BirthdayWishModalProps) {
  const [channel, setChannel] = useState<BirthdayChannel>(initialChannel);
  const [templateStyle, setTemplateStyle] = useState<BirthdayTemplateStyle>('WARM_FAITHFUL');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [senderName, setSenderName] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Initialize or reset state when celebrant or channel changes
  useEffect(() => {
    if (celebrant) {
      setPhone(celebrant.phone || '');
      setEmail(celebrant.email || '');
      setChannel(initialChannel || 'WHATSAPP');
      setSubject(`Happy Birthday, ${celebrant.name}! 🎂🎉`);
    }
  }, [celebrant, initialChannel]);

  // Generate template message based on channel, style, celebrant, sender, and unit
  const generateMessage = (
    curChannel: BirthdayChannel,
    style: BirthdayTemplateStyle,
    cel: BulletinCelebrant | null,
    sName: string,
    uName: string
  ) => {
    if (!cel) return '';
    const name = cel.name || 'Brother / Sister';
    const signOff = sName.trim() ? sName.trim() : `${uName} Family`;

    if (curChannel === 'SMS') {
      if (style === 'SHORT_SWEET') {
        return `Happy Birthday ${name}! 🎂🎉 Wishing you joy and happiness on your special day! - ${signOff}`;
      } else if (style === 'WARD_FAMILY') {
        return `Happy Birthday ${name}! 🎂 On behalf of the ${uName}, we wish you the Lord's richest blessings, joy, and peace in this new year of life!`;
      } else {
        // WARM_FAITHFUL
        return `Happy Birthday ${name}! 🎂🎉 May your day and the coming year be filled with the Lord's peace, love, and richest blessings. - ${signOff}`;
      }
    }

    if (curChannel === 'EMAIL') {
      if (style === 'SHORT_SWEET') {
        return [
          `Dear ${name},`,
          '',
          `Wishing you a very Happy Birthday! 🎂🎉`,
          '',
          `May your special day be filled with lots of joy, love, and wonderful memories.`,
          '',
          `Warm regards,`,
          signOff,
        ].join('\n');
      } else if (style === 'WARD_FAMILY') {
        return [
          `Dear ${name},`,
          '',
          `On behalf of the Bishopric and members of the ${uName}, we extend our heartfelt birthday wishes to you! 🎂🎉`,
          '',
          `We thank the Lord for your life, your faith, and your presence in our ward family. May He bless you with strength, good health, peace, and eternal joy in this new year of your life.`,
          '',
          `With love and blessings,`,
          `The Bishopric & ${uName} Family`,
        ].join('\n');
      } else {
        // WARM_FAITHFUL
        return [
          `Dear ${name},`,
          '',
          `Wishing you a truly wonderful and blessed Birthday! 🎂🎉`,
          '',
          `May our Heavenly Father shower you with His abundant grace, continuous joy, and peace today and throughout the coming year. Thank you for being a light and an inspiration in our community.`,
          '',
          `Warmest regards and blessings,`,
          signOff,
        ].join('\n');
      }
    }

    // Default: WHATSAPP
    if (style === 'SHORT_SWEET') {
      return [
        `Happy Birthday ${name}! 🎂🎉✨`,
        '',
        `Wishing you an amazing celebration filled with joy, laughter, and happiness!`,
        '',
        `Warm regards,`,
        signOff,
      ].join('\n');
    } else if (style === 'WARD_FAMILY') {
      return [
        `Dear ${name},`,
        '',
        `Happy Birthday! 🎂🎉 The Bishopric and members of ${uName} celebrate you today!`,
        '',
        `We pray that the Lord grants you peace, prosperity, good health, and continued spiritual growth in this new year of life.`,
        '',
        `Warm regards,`,
        `The Bishopric & ${uName} Family`,
      ].join('\n');
    } else {
      // WARM_FAITHFUL
      return [
        `Dear ${name},`,
        '',
        `Happy Birthday to you! 🎂🎉✨`,
        '',
        `May your special day and the year ahead be filled with Heavenly Father's sweetest peace, good health, and richest blessings. Have a wonderful celebration!`,
        '',
        `Warmest regards,`,
        signOff,
      ].join('\n');
    }
  };

  // Synchronize message when inputs change
  useEffect(() => {
    if (celebrant) {
      setCustomMessage(generateMessage(channel, templateStyle, celebrant, senderName, unitName));
    }
  }, [channel, templateStyle, celebrant, senderName, unitName]);

  if (!open || !celebrant) return null;

  const handleCopy = () => {
    const textToCopy = channel === 'EMAIL'
      ? `Subject: ${subject}\n\n${customMessage}`
      : customMessage;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Birthday message copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDispatch = () => {
    if (channel === 'WHATSAPP') {
      const cleaned = cleanPhoneNumberForWhatsApp(phone);
      const url = buildWhatsAppBirthdayGreetingUrl(cleaned, celebrant.name, unitName, customMessage);
      window.open(url, '_blank');
      toast.success('Opening WhatsApp...');
      onClose();
    } else if (channel === 'EMAIL') {
      const url = buildMailtoBirthdayGreetingUrl(email, subject, customMessage);
      window.location.href = url;
      toast.success('Opening Email Client...');
      onClose();
    } else if (channel === 'SMS') {
      const url = buildSmsBirthdayGreetingUrl(phone, customMessage);
      window.location.href = url;
      toast.success('Opening SMS app...');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative flex max-h-[94vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 sm:px-6 py-3.5 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-1.5">
                <span>Send Birthday Wish</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold">
                  🎂 Celebrant
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Send personal WhatsApp, Email or SMS birthday blessings to <span className="font-semibold text-slate-800">{celebrant.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Celebrant Identity Header Card */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-sm">
                🎂
              </div>
              <div>
                <p className="font-bold text-slate-900">{celebrant.name}</p>
                <p className="text-[11px] text-amber-800 font-medium">
                  {celebrant.birth_date ? `Birthday: ${celebrant.birth_date}` : 'Celebrant this week'} &bull; {unitName}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-white px-2 py-1 rounded-lg border border-amber-200">
                <Heart className="h-3 w-3 text-red-500 fill-red-500" /> Celebrant
              </span>
            </div>
          </div>

          {/* Channel Selector Tabs */}
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              1. Choose Communication Channel
            </label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChannel('WHATSAPP')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                  channel === 'WHATSAPP'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setChannel('EMAIL')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                  channel === 'EMAIL'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Mail className="h-4 w-4 text-blue-600" />
                <span>Email</span>
              </button>
              <button
                type="button"
                onClick={() => setChannel('SMS')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                  channel === 'SMS'
                    ? 'border-purple-600 bg-purple-50 text-purple-700 ring-2 ring-purple-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Smartphone className="h-4 w-4 text-purple-600" />
                <span>SMS / Text</span>
              </button>
            </div>
          </div>

          {/* Recipient Contact Inputs */}
          <div className="grid sm:grid-cols-2 gap-3">
            {channel === 'EMAIL' ? (
              <>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Recipient Email Address</span>
                    <span className="text-[10px] text-slate-400">From member directory</span>
                  </label>
                  <div className="relative mt-1">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="e.g. celebrant@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Subject Line</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Phone Number</span>
                    <span className="text-[10px] text-slate-400">International format</span>
                  </label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. 2348033333333"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">Auto-formatted for Nigerian (+234) & global numbers</span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Sender Name / Signature</span>
                    <span className="text-[10px] text-slate-400">Optional</span>
                  </label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Bro. John / Ward Family"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Template Switcher */}
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              2. Select Message Preset
            </label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTemplateStyle('WARM_FAITHFUL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  templateStyle === 'WARM_FAITHFUL'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                🌟 Warm & Faithful Blessings
              </button>
              <button
                type="button"
                onClick={() => setTemplateStyle('SHORT_SWEET')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  templateStyle === 'SHORT_SWEET'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                ✨ Short & Sweet
              </button>
              <button
                type="button"
                onClick={() => setTemplateStyle('WARD_FAMILY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  templateStyle === 'WARD_FAMILY'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                🏛️ Bishopric & Ward Greeting
              </button>
            </div>
          </div>

          {/* Message Content Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                3. Editable Birthday Message
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-amber-700 hover:text-amber-800 font-medium flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <textarea
              rows={channel === 'SMS' ? 4 : 8}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50/80 p-3 text-xs leading-relaxed text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-sans shadow-inner"
              placeholder="Type or customize your birthday greeting here..."
            />
            {channel === 'SMS' && (
              <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                <span>SMS character length: {customMessage.length} chars</span>
                <span>Standard SMS &le; 160 chars</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 sm:px-6 py-3.5 bg-slate-50">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {channel === 'WHATSAPP' && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                icon={<MessageSquare className="h-4 w-4" />}
                onClick={handleDispatch}
              >
                Open WhatsApp Web / App
              </Button>
            )}

            {channel === 'EMAIL' && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                icon={<Mail className="h-4 w-4" />}
                onClick={handleDispatch}
              >
                Open in Mail Client
              </Button>
            )}

            {channel === 'SMS' && (
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs"
                icon={<Smartphone className="h-4 w-4" />}
                onClick={handleDispatch}
              >
                Send SMS Text
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
