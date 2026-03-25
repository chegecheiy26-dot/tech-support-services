import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { OWNER_EMAIL } from '@/lib/site-config';

interface Consultation {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  status: string;
  created_at: string;
}

interface SavedService {
  id: string;
  service_title: string;
  service_category: string;
  service_description: string;
  saved_at: string;
}

type DashTab = 'overview' | 'consultations' | 'inbox' | 'saved' | 'profile' | 'settings';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const Dashboard: React.FC = () => {
  const { user, profile, updateProfile, changePassword, signOut } = useAuth();
  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL;
  const [activeTab, setActiveTab] = useState<DashTab>('overview');
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [ownerConsultations, setOwnerConsultations] = useState<Consultation[]>([]);
  const [savedServices, setSavedServices] = useState<SavedService[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState('');
  const [ownerInboxError, setOwnerInboxError] = useState('');

  // Profile form
  const [profileForm, setProfileForm] = useState({
    full_name: '', username: '', phone: '', bio: '', company: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Settings
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    setDashboardError('');
    setOwnerInboxError('');

    const [consResult, savedResult, ownerResult] = await Promise.allSettled([
      api.getConsultations(),
      api.getSavedServices(),
      isOwner ? api.getAdminConsultations() : Promise.resolve(null),
    ]);

    if (consResult.status === 'fulfilled') {
      setConsultations(consResult.value.consultations as Consultation[]);
    } else {
      console.error('Error fetching consultations:', consResult.reason);
      setConsultations([]);
      setDashboardError(consResult.reason instanceof Error ? consResult.reason.message : 'Could not load consultations.');
    }

    if (savedResult.status === 'fulfilled') {
      setSavedServices(savedResult.value.savedServices as SavedService[]);
    } else {
      console.error('Error fetching saved services:', savedResult.reason);
      setSavedServices([]);
      setDashboardError(prev => prev || (savedResult.reason instanceof Error ? savedResult.reason.message : 'Could not load saved services.'));
    }

    if (ownerResult.status === 'fulfilled') {
      setOwnerConsultations(ownerResult.value?.consultations ? (ownerResult.value.consultations as Consultation[]) : []);
    } else if (isOwner) {
      console.error('Error fetching owner consultations:', ownerResult.reason);
      setOwnerConsultations([]);
      setOwnerInboxError(ownerResult.reason instanceof Error ? ownerResult.reason.message : 'Could not load the client inbox.');
    }

    setLoadingData(false);
  }, [user, isOwner]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        username: profile.username || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        company: profile.company || '',
      });
    }
  }, [profile]);

  const handleProfileSave = async () => {
    setProfileSaving(true);
    const { error } = await updateProfile(profileForm);
    setProfileSaving(false);
    if (!error) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmNewPassword) { setPasswordError('Passwords do not match'); return; }
    setChangingPassword(true);
    try {
      const { error } = await changePassword(newPassword);
      if (error) setPasswordError(error);
      else {
        setPasswordSuccess(true);
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => setPasswordSuccess(false), 3000);
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Error changing password');
    }
    setChangingPassword(false);
  };

  const handleRemoveSaved = async (id: string) => {
    try {
      await api.deleteSavedService(id);
      setSavedServices(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error removing saved service:', err);
    }
  };

  const handleConsultationStatusChange = async (id: string, status: string) => {
    setStatusUpdatingId(id);
    try {
      const { consultation } = await api.updateConsultationStatus(id, status);
      setOwnerConsultations(prev => prev.map(item => (item.id === id ? consultation as Consultation : item)));
      setConsultations(prev => prev.map(item => (item.id === id ? consultation as Consultation : item)));
    } catch (err) {
      console.error('Error updating consultation status:', err);
    }
    setStatusUpdatingId(null);
  };

  const openGmailReply = (consultation: Consultation) => {
    const subject = encodeURIComponent(`Re: ${consultation.service} consultation`);
    const body = encodeURIComponent(
      `Hello ${consultation.full_name},\n\nThank you for reaching out to Expert Tech Solutions & Training.\n\nI am following up on your ${consultation.service} consultation request.\n\nBest regards,\nKeith Chege Junior\n${OWNER_EMAIL}`
    );
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(consultation.email)}&su=${subject}&body=${body}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const openWhatsApp = (consultation: Consultation) => {
    if (!consultation.phone) return;
    const phoneNumber = consultation.phone.replace(/\D/g, '');
    if (!phoneNumber) return;

    const message = encodeURIComponent(
      `Hello ${consultation.full_name}, this is Keith from Expert Tech Solutions & Training. I am following up on your ${consultation.service} consultation request.`
    );

    window.open(
      `https://wa.me/${phoneNumber}?text=${message}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const inboxConsultations = isOwner ? ownerConsultations : consultations;
  const overviewConsultations = isOwner ? ownerConsultations : consultations;

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.username?.slice(0, 2).toUpperCase() || 'U';

  const tabs: { id: DashTab; label: string; icon: JSX.Element }[] = [
    { id: 'overview', label: 'Overview', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { id: 'consultations', label: 'Consultations', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
    { id: 'saved', label: 'Saved Services', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> },
    { id: 'profile', label: 'Profile', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { id: 'settings', label: 'Settings', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
  ];

  if (isOwner) {
    tabs.splice(2, 0, {
      id: 'inbox',
      label: 'Client Inbox',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    });
  }

  return (
    <div className="min-h-screen bg-[#0a1628] pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-500/20">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Welcome back, <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{profile?.full_name || profile?.username || 'User'}</span>
              </h1>
              <p className="text-blue-200/50 text-sm">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-4">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-blue-200/60 hover:text-white hover:bg-white/5'
              }`}>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loadingData ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          </div>
        ) : (
          <>
            {dashboardError && (
              <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {dashboardError}
              </div>
            )}

            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: isOwner ? 'Client Consultations' : 'Total Consultations', value: overviewConsultations.length, color: 'from-cyan-400 to-blue-600', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
                    { label: 'Pending', value: overviewConsultations.filter(c => c.status === 'pending').length, color: 'from-amber-400 to-orange-500', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
                    { label: 'Completed', value: overviewConsultations.filter(c => c.status === 'completed').length, color: 'from-green-400 to-emerald-600', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
                    { label: 'Saved Services', value: savedServices.length, color: 'from-purple-400 to-pink-600', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white`}>
                          {stat.icon}
                        </div>
                      </div>
                      <p className="text-3xl font-extrabold text-white">{stat.value}</p>
                      <p className="text-blue-200/40 text-sm mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Recent consultations */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">{isOwner ? 'Latest Client Consultations' : 'Recent Consultations'}</h3>
                  {overviewConsultations.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                      <p className="text-blue-200/40">{isOwner ? 'No client consultations yet.' : 'No consultations yet. Submit your first inquiry!'}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {overviewConsultations.slice(0, 5).map(c => (
                        <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.07] transition-all">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{c.service}</p>
                            <p className="text-blue-200/40 text-sm truncate">
                              {isOwner ? `${c.full_name} · ${c.message}` : c.message}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[c.status] || statusColors.pending}`}>
                              {c.status.replace('_', ' ')}
                            </span>
                            <span className="text-blue-200/30 text-xs whitespace-nowrap">
                              {new Date(c.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* OWNER INBOX */}
            {activeTab === 'inbox' && isOwner && (
              <div className="space-y-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Client Inbox</h3>
                    <p className="text-sm text-blue-200/40">
                      Every consultation is saved in SQLite and can be followed up by email or WhatsApp.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
                    Replies go through <span className="font-semibold text-white">{OWNER_EMAIL}</span>
                  </div>
                </div>

                {ownerInboxError && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    {ownerInboxError} Check that the deployed backend has the correct owner email and D1 binding configured.
                  </div>
                )}

                {inboxConsultations.length === 0 && !ownerInboxError ? (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300/30"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <p className="text-blue-200/40 text-lg mb-2">No client consultations yet</p>
                    <p className="text-blue-200/30 text-sm">New consultation requests will appear here for follow-up.</p>
                  </div>
                ) : !ownerInboxError ? (
                  <div className="space-y-4">
                    {inboxConsultations.map(c => (
                      <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-all">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-3">
                                <h4 className="text-white font-bold text-lg">{c.service}</h4>
                                <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${statusColors[c.status] || statusColors.pending}`}>
                                  {c.status.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-blue-200/40 text-sm mt-1">
                                {new Date(c.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>

                            <p className="text-blue-200/70 font-medium">{c.full_name}</p>
                            <p className="text-blue-200/60 text-sm leading-relaxed">{c.message}</p>

                            <div className="flex flex-wrap gap-3 text-xs text-blue-200/40">
                              <a
                                href={`mailto:${c.email}`}
                                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:border-cyan-500/30 hover:text-white transition-all"
                              >
                                {c.email}
                              </a>
                              {c.phone && (
                                <a
                                  href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:border-cyan-500/30 hover:text-white transition-all"
                                >
                                  {c.phone}
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 lg:w-[320px]">
                            <button
                              onClick={() => openGmailReply(c)}
                              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:from-cyan-400 hover:to-blue-500"
                            >
                              Reply in Gmail
                            </button>
                            <button
                              onClick={() => openWhatsApp(c)}
                              disabled={!c.phone}
                              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {c.phone ? 'WhatsApp Client' : 'No Phone Number'}
                            </button>

                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { label: 'Pending', value: 'pending' },
                                { label: 'In Progress', value: 'in_progress' },
                                { label: 'Completed', value: 'completed' },
                                { label: 'Cancelled', value: 'cancelled' },
                              ].map(option => (
                                <button
                                  key={option.value}
                                  onClick={() => handleConsultationStatusChange(c.id, option.value)}
                                  disabled={statusUpdatingId === c.id || c.status === option.value}
                                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                                    c.status === option.value
                                      ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                                      : 'border-white/10 bg-white/5 text-blue-100 hover:bg-white/10'
                                  } disabled:cursor-not-allowed disabled:opacity-60`}
                                >
                                  {statusUpdatingId === c.id && c.status !== option.value ? 'Updating...' : option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {/* CONSULTATIONS */}
            {activeTab === 'consultations' && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Consultation History</h3>
                {consultations.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300/30"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <p className="text-blue-200/40 text-lg mb-2">No consultations yet</p>
                    <p className="text-blue-200/30 text-sm">Submit a consultation request from the Contact section to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {consultations.map(c => (
                      <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-white font-bold text-lg">{c.service}</h4>
                            <p className="text-blue-200/40 text-sm">{new Date(c.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${statusColors[c.status] || statusColors.pending}`}>
                            {c.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-blue-200/60 text-sm leading-relaxed">{c.message}</p>
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5 text-xs text-blue-200/30">
                          <span>Name: {c.full_name}</span>
                          <span>Email: {c.email}</span>
                          {c.phone && <span>Phone: {c.phone}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SAVED SERVICES */}
            {activeTab === 'saved' && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Saved Services</h3>
                {savedServices.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300/30"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <p className="text-blue-200/40 text-lg mb-2">No saved services</p>
                    <p className="text-blue-200/30 text-sm">Browse our services and save the ones you're interested in.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedServices.map(s => (
                      <div key={s.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-white font-bold">{s.service_title}</h4>
                          <button onClick={() => handleRemoveSaved(s.id)} className="text-blue-200/30 hover:text-red-400 transition-colors p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                        <span className="inline-block px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-xs rounded-full mb-2">{s.service_category}</span>
                        <p className="text-blue-200/40 text-sm">{s.service_description}</p>
                        <p className="text-blue-200/20 text-xs mt-3">Saved {new Date(s.saved_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PROFILE */}
            {activeTab === 'profile' && (
              <div className="max-w-2xl">
                <h3 className="text-lg font-bold text-white mb-6">Edit Profile</h3>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                  {profileSaved && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Profile updated successfully!
                    </div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-200/70 mb-1.5">Full Name</label>
                      <input type="text" value={profileForm.full_name} onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:border-cyan-500/50 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-200/70 mb-1.5">Username</label>
                      <input type="text" value={profileForm.username} onChange={e => setProfileForm(p => ({ ...p, username: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:border-cyan-500/50 outline-none transition-all" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-200/70 mb-1.5">Phone</label>
                      <input type="tel" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:border-cyan-500/50 outline-none transition-all"
                        placeholder="+254 700 000 000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-200/70 mb-1.5">Company</label>
                      <input type="text" value={profileForm.company} onChange={e => setProfileForm(p => ({ ...p, company: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:border-cyan-500/50 outline-none transition-all"
                        placeholder="Your company" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-200/70 mb-1.5">Bio</label>
                    <textarea value={profileForm.bio} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))} rows={3}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:border-cyan-500/50 outline-none transition-all resize-none"
                      placeholder="Tell us about yourself..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-200/70 mb-1.5">Email</label>
                    <input type="email" value={user?.email || ''} disabled
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-blue-200/40 cursor-not-allowed" />
                    <p className="text-blue-200/30 text-xs mt-1">Email cannot be changed</p>
                  </div>
                  <button onClick={handleProfileSave} disabled={profileSaving}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-60 flex items-center gap-2">
                    {profileSaving ? (
                      <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Saving...</>
                    ) : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* SETTINGS */}
            {activeTab === 'settings' && (
              <div className="max-w-2xl space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Change Password</h3>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                    {passwordError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{passwordError}</div>
                    )}
                    {passwordSuccess && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Password changed successfully!
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-blue-200/70 mb-1.5">New Password</label>
                      <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:border-cyan-500/50 outline-none transition-all"
                        placeholder="Min 6 characters" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-200/70 mb-1.5">Confirm New Password</label>
                      <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:border-cyan-500/50 outline-none transition-all"
                        placeholder="Re-enter new password" />
                    </div>
                    <button onClick={handlePasswordChange} disabled={changingPassword}
                      className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-60 flex items-center gap-2">
                      {changingPassword ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Account Actions</h3>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <p className="text-blue-200/40 text-sm mb-4">Sign out of your account on this device.</p>
                    <button onClick={signOut}
                      className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition-all">
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
