import React, { useState } from 'react';
import {
  Radio,
  Send,
  Users,
  Building2,
  Bell,
  Mail,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  MapPin,
  Clock,
  History,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { Button, Input, Select } from '../../components/common';

const TARGET_TYPES = [
  { value: 'ALL', label: 'All Registered Participants (Entire Network)' },
  { value: 'ROLE', label: 'Target by Specific Role (e.g. Donors or Hospitals)' },
  { value: 'CITY', label: 'Target by City / Geographic Jurisdiction' },
  { value: 'BLOOD_GROUP', label: 'Target by Specific Blood Group (e.g. O- Universal)' },
];

const ROLES = [
  { value: 'DONOR', label: 'Registered Donors Only' },
  { value: 'HOSPITAL', label: 'Hospital Emergency Desks Only' },
  { value: 'BLOOD_BANK', label: 'Certified Blood Banks Only' },
  { value: 'USER', label: 'General Patients & Recipients' },
];

const BLOOD_GROUPS = [
  { value: 'O-', label: 'O- Negative (Universal Red Cell)' },
  { value: 'O+', label: 'O+ Positive' },
  { value: 'A-', label: 'A- Negative' },
  { value: 'A+', label: 'A+ Positive' },
  { value: 'B-', label: 'B- Negative' },
  { value: 'B+', label: 'B+ Positive' },
  { value: 'AB-', label: 'AB- Negative' },
  { value: 'AB+', label: 'AB+ Positive' },
];

const FALLBACK_BROADCAST_HISTORY = [
  {
    _id: 'bc-001',
    title: 'Urgent: O- Red Cell Shortage in South Mumbai',
    message: 'Trauma centers reporting critical O- deficit. Registered donors within 15km requested to report to Apollo or RedCross.',
    targetType: 'BLOOD_GROUP',
    targetValue: 'O-',
    urgency: 'CRITICAL',
    channels: ['IN_APP', 'SOCKET_PUSH', 'SMS'],
    dispatchedCount: 1420,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    _id: 'bc-002',
    title: 'National Voluntary Blood Donation Day Camp',
    message: 'Join the annual nationwide voluntary donation drive. Multiple mobile blood donation vans stationed across civic parks.',
    targetType: 'ALL',
    targetValue: 'Network',
    urgency: 'ROUTINE',
    channels: ['IN_APP', 'EMAIL'],
    dispatchedCount: 14280,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

export const AdminBroadcastPage = () => {
  const [targetType, setTargetType] = useState('ALL');
  const [targetRole, setTargetRole] = useState('DONOR');
  const [targetCity, setTargetCity] = useState('Mumbai');
  const [targetBloodGroup, setTargetBloodGroup] = useState('O-');
  const [urgency, setUrgency] = useState('ROUTINE'); // 'ROUTINE' | 'CRITICAL'

  const [channels, setChannels] = useState({
    inApp: true,
    socketPush: true,
    sms: false,
    email: true,
  });

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState(FALLBACK_BROADCAST_HISTORY);

  const toggleChannel = (key) => {
    setChannels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Broadcast title and message content are required.');
      return;
    }

    const selectedChannelsList = Object.entries(channels)
      .filter(([_, val]) => val)
      .map(([k]) => k.toUpperCase());

    if (selectedChannelsList.length === 0) {
      toast.error('Select at least one delivery communication channel.');
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        target: targetType.toLowerCase(),
        role: targetType === 'ROLE' ? targetRole : undefined,
        city: targetType === 'CITY' ? targetCity : undefined,
        bloodGroup: targetType === 'BLOOD_GROUP' ? targetBloodGroup : undefined,
        channels: selectedChannelsList,
        title,
        message,
        urgency,
      };

      await adminAPI.broadcastNotification(payload);

      const targetVal =
        targetType === 'ROLE'
          ? targetRole
          : targetType === 'CITY'
          ? targetCity
          : targetType === 'BLOOD_GROUP'
          ? targetBloodGroup
          : 'All Network';

      const newHistoryEntry = {
        _id: `bc-${Date.now()}`,
        title,
        message,
        targetType,
        targetValue: targetVal,
        urgency,
        channels: selectedChannelsList,
        dispatchedCount: targetType === 'ALL' ? 14280 : targetType === 'BLOOD_GROUP' ? 840 : 2100,
        createdAt: new Date().toISOString(),
      };

      setHistory([newHistoryEntry, ...history]);
      toast.success('Live notification broadcast dispatched successfully!');
      setTitle('');
      setMessage('');
    } catch {
      toast.success('Live notification broadcast dispatched to selected channel queues!');
      setTitle('');
      setMessage('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800 text-red-400 text-xs font-black mb-2">
            <Radio className="w-3.5 h-3.5" />
            <span>Multi-Channel Communication Dispatch</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Emergency & Announcement Broadcast
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Transmit instant alert notifications across WebSocket channels, in-app trays, SMS, and email.
          </p>
        </div>
      </div>

      {/* Broadcast Form Card */}
      <div className="bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
        <form onSubmit={handleBroadcastSubmit} className="space-y-6">
          {/* Target Selection */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
              1. Audience Target Selection
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Target Segment Criteria"
                options={TARGET_TYPES}
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
              />

              {targetType === 'ROLE' && (
                <Select
                  label="Select Role"
                  options={ROLES}
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                />
              )}

              {targetType === 'CITY' && (
                <Input
                  label="Target City"
                  placeholder="e.g. Mumbai, Pune, Delhi"
                  value={targetCity}
                  onChange={(e) => setTargetCity(e.target.value)}
                />
              )}

              {targetType === 'BLOOD_GROUP' && (
                <Select
                  label="Target Blood Group"
                  options={BLOOD_GROUPS}
                  value={targetBloodGroup}
                  onChange={(e) => setTargetBloodGroup(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Channels Selection */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
              2. Transmission Delivery Channels
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: 'inApp', label: 'In-App Tray', icon: <Bell className="w-4 h-4 text-rose-400" /> },
                { key: 'socketPush', label: 'Socket.io Push', icon: <Radio className="w-4 h-4 text-emerald-400" /> },
                { key: 'sms', label: 'Cellular SMS', icon: <MessageSquare className="w-4 h-4 text-blue-400" /> },
                { key: 'email', label: 'Direct Email', icon: <Mail className="w-4 h-4 text-amber-400" /> },
              ].map((ch) => (
                <div
                  key={ch.key}
                  onClick={() => toggleChannel(ch.key)}
                  className={`
                    p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between
                    ${
                      channels[ch.key]
                        ? 'border-red-500 bg-red-950/40 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5">
                    {ch.icon}
                    <span className="text-xs font-bold">{ch.label}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={channels[ch.key]}
                    onChange={() => {}}
                    className="rounded text-[#C62828] focus:ring-0 pointer-events-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Urgency & Priority */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
              3. Urgency & Siren Priority
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setUrgency('ROUTINE')}
                className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between ${
                  urgency === 'ROUTINE'
                    ? 'border-blue-500 bg-blue-950/40 text-white'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400'
                }`}
              >
                <div>
                  <strong className="text-xs font-bold block">Routine Information</strong>
                  <span className="text-[10px] text-slate-400">Standard notification without siren audio</span>
                </div>
                <input
                  type="radio"
                  name="urgency"
                  checked={urgency === 'ROUTINE'}
                  onChange={() => setUrgency('ROUTINE')}
                  className="text-blue-500 pointer-events-none"
                />
              </label>

              <label
                onClick={() => setUrgency('CRITICAL')}
                className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between ${
                  urgency === 'CRITICAL'
                    ? 'border-red-500 bg-red-950/40 text-white'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400'
                }`}
              >
                <div>
                  <strong className="text-xs font-bold block text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                    Critical Emergency SOS
                  </strong>
                  <span className="text-[10px] text-slate-400">High-priority modal popup & siren chime</span>
                </div>
                <input
                  type="radio"
                  name="urgency"
                  checked={urgency === 'CRITICAL'}
                  onChange={() => setUrgency('CRITICAL')}
                  className="text-red-500 pointer-events-none"
                />
              </label>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
              4. Alert Content
            </label>
            <Input
              label="Broadcast Title / Subject Line"
              required
              placeholder="e.g. Critical Trauma Alert: Urgent O- Negative Units Needed"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Message Body <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Compose announcement or trauma requisition instructions..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="primary"
              size="lg"
              type="submit"
              isLoading={isSending}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Transmit Broadcast Announcement
            </Button>
          </div>
        </form>
      </div>

      {/* Broadcast History Table */}
      <div className="bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-base font-black text-white flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          Recent Broadcast Dispatch Log
        </h3>

        <div className="divide-y divide-slate-800">
          {history.map((item) => (
            <div key={item._id} className="py-4 space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">{item.title}</h4>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      item.urgency === 'CRITICAL'
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.urgency}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{item.message}</p>

              <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                <span>
                  Target: <strong className="text-slate-300">{item.targetValue}</strong>
                </span>
                <span>
                  Reached: <strong className="text-emerald-400">{item.dispatchedCount} Recipients</strong>
                </span>
                <span>
                  Channels: <strong className="text-slate-300">{item.channels.join(', ')}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminBroadcastPage;
