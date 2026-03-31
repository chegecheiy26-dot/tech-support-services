import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  next_path?: 'service' | 'class';
  next_path_status?: 'pending' | 'test_in_progress' | 'test_completed' | 'certification_started';
  owner_agreed?: 'yes' | 'no';
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
  const navigate = useNavigate();
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

  const [consultationFeedback, setConsultationFeedback] = useState<Record<string, 'none' | 'gmail' | 'whatsapp'>>({});
  const [selectedCourse, setSelectedCourse] = useState<Record<string, string>>({});
  const [selectedSession, setSelectedSession] = useState<Record<string, string>>({});
  const [certificationStarted, setCertificationStarted] = useState<Record<string, boolean>>({});
  const [activeLessonConsultationId, setActiveLessonConsultationId] = useState<string | null>(null);

  const certificationCatalog: Record<string, {title: string; description: string; sessions: string[]}> = {
    'Database Systems': {
      title: 'Database Systems Certification',
      description: 'Comprehensive database theory, relational design, and admin skills.',
      sessions: [
        'Introduction to Databases (1h)',
        'Data Modeling & ERD (1h 30m)',
        'SQL Basics & Advanced Queries (1h 30m)',
        'Database Design Principles (1h)',
        'Indexing & Optimization (1h)',
        'Transactions & Concurrency (1h)',
        'Stored Procedures & Views (1h)',
        'Database Security & Access Control (1h)',
        'Distributed Databases & Replication (1h 30m)',
        'Backup & Recovery (1h)',
        'Database Administration & Monitoring (1h)',
      ],
    },
    'Data Communications & Networks': {
      title: 'Data Communications & Networks Certification',
      description: 'Core networking curriculum for routing, switching, and protocols.',
      sessions: [
        'Networking Fundamentals (1h)',
        'TCP/IP & OSI Models (1h 30m)',
        'Routing & Switching (1h 30m)',
        'IP Addressing & Subnetting (1h 30m)',
        'Network Devices & Media (1h)',
        'Network Security (1h)',
        'Wireless & WAN Technologies (1h 30m)',
        'Network Services & Protocols (1h)',
        'Network Management & Troubleshooting (1h 30m)',
        'Network Design Project (1h)',
      ],
    },
    'Distributed Systems': {
      title: 'Distributed Systems Certification',
      description: 'Cloud and distributed computing concepts for modern systems.',
      sessions: [
        'Distributed System Concepts (1h)',
        'Consensus & Fault Tolerance (1h 30m)',
        'Microservices Architecture (1h)',
        'Scalability & Load Balancing (1h 30m)',
        'Distributed Communication Patterns (1h)',
        'Distributed Data Management (1h 30m)',
        'Cloud Infrastructure Basics (1h)',
        'Containerization & Orchestration (1h 30m)',
        'Observability & Monitoring (1h)',
        'Distributed Systems Capstone (1h)',
      ],
    },
    'Data Structures & Algorithms': {
      title: 'Data Structures & Algorithms Certification',
      description: 'Core algorithmic thinking, data organization, and performance analysis for computing students.',
      sessions: [
        'Introduction to Data Structures (1h)',
        'Arrays & Linked Lists (1h 30m)',
        'Stacks & Queues (1h)',
        'Trees & Binary Search Trees (1h 30m)',
        'Heaps & Priority Queues (1h)',
        'Hash Tables & Dictionaries (1h)',
        'Algorithm Analysis & Big O (1h 30m)',
        'Searching & Sorting Techniques (1h 30m)',
        'Recursion & Divide and Conquer (1h)',
        'Graph Algorithms Fundamentals (1h 30m)',
      ],
    },
    'Operating Systems': {
      title: 'Operating Systems Certification',
      description: 'Systems-level computing concepts covering processes, memory, storage, and OS protection.',
      sessions: [
        'Introduction to Operating Systems (1h)',
        'Processes & Threads (1h 30m)',
        'CPU Scheduling (1h)',
        'Process Synchronization (1h 30m)',
        'Deadlocks & Resource Allocation (1h)',
        'Memory Management (1h 30m)',
        'Virtual Memory (1h)',
        'File Systems & Storage (1h 30m)',
        'Device Management & I/O (1h)',
        'OS Security & Protection (1h)',
      ],
    },
    'Software Engineering': {
      title: 'Software Engineering Certification',
      description: 'A full software engineering track from requirements to maintenance and team delivery.',
      sessions: [
        'Introduction to Software Engineering (1h)',
        'Software Development Life Cycle (1h 30m)',
        'Requirements Engineering (1h 30m)',
        'Software Design & Architecture (1h 30m)',
        'Agile & Project Management (1h)',
        'Version Control & Collaboration (1h)',
        'Software Testing Fundamentals (1h 30m)',
        'Software Quality Assurance (1h)',
        'Maintenance & Evolution (1h)',
        'Software Engineering Capstone (1h)',
      ],
    },
    'Web Development': {
      title: 'Web Development Certification',
      description: 'Frontend, backend, authentication, persistence, and deployment for modern web systems.',
      sessions: [
        'Introduction to Web Development (1h)',
        'HTML & Semantic Structure (1h)',
        'CSS Layout & Responsive Design (1h 30m)',
        'JavaScript Fundamentals (1h 30m)',
        'Frontend Framework Concepts (1h)',
        'Backend Development Basics (1h 30m)',
        'Web Databases & Persistence (1h)',
        'Authentication & Authorization (1h)',
        'Deployment & Hosting (1h)',
        'Web Development Capstone (1h)',
      ],
    },
    'Computer Security': {
      title: 'Computer Security Certification',
      description: 'Security foundations, secure systems, monitoring, and governance across computer platforms.',
      sessions: [
        'Introduction to Computer Security (1h)',
        'Cryptography Fundamentals (1h 30m)',
        'Authentication & Access Control (1h)',
        'Network Security Principles (1h 30m)',
        'Web Application Security (1h 30m)',
        'System Hardening & Endpoint Security (1h)',
        'Security Monitoring & Incident Response (1h 30m)',
        'Digital Forensics Basics (1h)',
        'Security Policy, Risk & Governance (1h)',
        'Computer Security Capstone (1h)',
      ],
    },
    // Add additional computer science track courses as needed.
  };

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
  const [manualResetEmail, setManualResetEmail] = useState('');
  const [manualResetError, setManualResetError] = useState('');
  const [manualResetCode, setManualResetCode] = useState('');
  const [manualResetExpiresAt, setManualResetExpiresAt] = useState('');
  const [manualResetGenerating, setManualResetGenerating] = useState(false);

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

  useEffect(() => {
    if (activeTab === 'consultations') {
      fetchData();
    }
  }, [activeTab, fetchData]);

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

  const syncConsultation = (consultation: Consultation) => {
    setOwnerConsultations(prev => prev.map(item => (item.id === consultation.id ? consultation : item)));
    setConsultations(prev => prev.map(item => (item.id === consultation.id ? consultation : item)));
  };

  const handleConsultationWorkflowChange = async (id: string, nextPath: 'service' | 'class') => {
    setStatusUpdatingId(id);
    try {
      const update = await api.updateConsultationWorkflow(id, {
        next_path: nextPath,
        next_path_status: nextPath === 'class' ? 'certification_started' : 'pending',
        owner_agreed: 'yes',
      });
      syncConsultation(update.consultation);
    } catch (err) {
      console.error('Error updating consultation workflow:', err);
    }
    setStatusUpdatingId(null);
  };

  const handleStartClassTest = async (id: string) => {
    setStatusUpdatingId(id);
    try {
      const update = await api.updateConsultationWorkflow(id, {
        next_path: 'class',
        next_path_status: 'test_in_progress',
        owner_agreed: 'yes',
      });
      syncConsultation(update.consultation);
      setTimeout(async () => {
        const completedUpdate = await api.updateConsultationWorkflow(id, {
          next_path: 'class',
          next_path_status: 'test_completed',
          owner_agreed: 'yes',
        });
        syncConsultation(completedUpdate.consultation);
      }, 800);
    } catch (err) {
      console.error('Error starting class test:', err);
    }
    setStatusUpdatingId(null);
  };

  const handleProceedToCertification = async (id: string) => {
    setStatusUpdatingId(id);
    try {
      const update = await api.updateConsultationWorkflow(id, {
        next_path: 'class',
        next_path_status: 'certification_started',
        owner_agreed: 'yes',
      });
      syncConsultation(update.consultation);
    } catch (err) {
      console.error('Error proceeding to certification:', err);
    }
    setStatusUpdatingId(null);
  };

  const handleManualResetGenerate = async () => {
    const normalizedEmail = manualResetEmail.trim().toLowerCase();
    setManualResetError('');
    setManualResetCode('');
    setManualResetExpiresAt('');

    if (!normalizedEmail) {
      setManualResetError('User email is required');
      return;
    }

    setManualResetGenerating(true);
    try {
      const result = await api.createManualPasswordReset(normalizedEmail);
      setManualResetEmail(result.email);
      setManualResetCode(result.otp);
      setManualResetExpiresAt(result.expiresAt);
    } catch (err: any) {
      setManualResetError(err.message || 'Could not generate a manual reset code.');
    } finally {
      setManualResetGenerating(false);
    }
  };

  const openGmailReply = async (consultation: Consultation) => {
    setConsultationFeedback(prev => ({ ...prev, [consultation.id]: 'gmail' }));

    try {
      const response = await api.updateConsultationWorkflow(consultation.id, {
        next_path: consultation.next_path === 'class' ? 'class' : 'service',
        next_path_status: consultation.next_path_status || 'pending',
        owner_agreed: 'yes',
      });
      syncConsultation(response.consultation);
    } catch (err) {
      console.error('Error setting consultation agreement:', err);
    }

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

  const openWhatsApp = async (consultation: Consultation) => {
    if (!consultation.phone) return;
    const phoneNumber = consultation.phone.replace(/\D/g, '');
    if (!phoneNumber) return;

    setConsultationFeedback(prev => ({ ...prev, [consultation.id]: 'whatsapp' }));

    try {
      const response = await api.updateConsultationWorkflow(consultation.id, {
        next_path: consultation.next_path === 'class' ? 'class' : 'service',
        next_path_status: consultation.next_path_status || 'pending',
        owner_agreed: 'yes',
      });
      syncConsultation(response.consultation);
    } catch (err) {
      console.error('Error setting consultation agreement:', err);
    }

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

  const activeCertificationConsultation = !isOwner
    ? consultations.find(c => c.next_path === 'class' && c.next_path_status === 'certification_started')
    : undefined;

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

        {!isOwner && activeCertificationConsultation && (
          <div className="mb-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-6 text-white">
            <h3 className="text-lg font-bold mb-1">🎓 Certification Curriculum</h3>
            <p className="text-sm text-indigo-200 mb-4">Your provider activated the <span className="font-semibold">{activeCertificationConsultation.service}</span> certification path. Select a course to begin your interactive learning journey with AI narrator, Q&A, and certification quiz.</p>

            {!selectedCourse[activeCertificationConsultation.id] ? (
              <div>
                <p className="text-xs text-indigo-300 mb-3 font-medium">Available courses:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(certificationCatalog).map(([key, course]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedCourse(prev => ({ ...prev, [activeCertificationConsultation.id]: key }))}
                      className="text-left p-4 rounded-xl border border-cyan-400/30 bg-cyan-500/5 hover:bg-cyan-500/15 transition-all"
                    >
                      <h4 className="font-bold text-cyan-300 mb-1">{course.title}</h4>
                      <p className="text-xs text-cyan-200/70">{course.description}</p>
                      <p className="text-xs text-cyan-300/50 mt-2">📚 {course.sessions.length} sessions</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setSelectedCourse(prev => ({ ...prev, [activeCertificationConsultation.id]: '' }))}
                    className="px-3 py-1 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 border border-white/20"
                  >
                    ← Back
                  </button>
                  <span className="text-sm font-semibold text-cyan-300">{certificationCatalog[selectedCourse[activeCertificationConsultation.id]]?.title}</span>
                </div>

                <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs text-gray-300">{certificationCatalog[selectedCourse[activeCertificationConsultation.id]]?.description}</p>
                </div>

                <div>
                  <p className="text-xs text-indigo-300 mb-3 font-medium">Select a session to start learning:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {(certificationCatalog[selectedCourse[activeCertificationConsultation.id]]?.sessions || []).map((session, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          sessionStorage.setItem(`lesson_${activeCertificationConsultation.id}`, JSON.stringify({
                            course: selectedCourse[activeCertificationConsultation.id],
                            session: session
                          }));
                          navigate(
                            `/lesson/${activeCertificationConsultation.id}?course=${encodeURIComponent(selectedCourse[activeCertificationConsultation.id])}&session=${encodeURIComponent(session)}`
                          );
                        }}
                        className="text-left p-3 rounded-lg border border-green-400/40 bg-green-500/10 hover:bg-green-500/20 transition-all font-medium text-green-300 text-sm"
                      >
                        ▶ {session}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
                        <div key={c.id} className="space-y-2">
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.07] transition-all">
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
                          { !isOwner && c.owner_agreed === 'yes' && (
                            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                              Provider agreed to your {c.next_path === 'class' ? 'training path' : 'service path'}, status: {c.next_path_status.replace('_', ' ')}
                            </div>
                          )}
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
                    {ownerInboxError} Check that the deployed backend has the correct owner email and API configuration.
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

                            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                              <div className="flex flex-wrap items-center gap-3 mb-4">
                                <span className="text-xs text-blue-200/60">Approval status:</span>
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                                  c.owner_agreed === 'yes'
                                    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                                    : 'border-amber-400/30 bg-amber-500/10 text-amber-300'
                                }`}>
                                  {c.owner_agreed === 'yes' ? '✓ Approved' : '⏳ Pending'}
                                </span>
                              </div>

                              <label className="block text-xs text-blue-200/60 mb-2">Select path for client</label>
                              <div className="grid grid-cols-2 gap-2 mb-4">
                                <button
                                  onClick={() => {
                                    handleConsultationWorkflowChange(c.id, 'service');
                                  }}
                                  className={`p-3 rounded-lg border text-xs font-medium transition-all ${
                                    c.next_path === 'service'
                                      ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-300'
                                      : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                                  }`}
                                >
                                  📦 Service
                                </button>
                                <button
                                  onClick={() => {
                                    handleConsultationWorkflowChange(c.id, 'class');
                                  }}
                                  className={`p-3 rounded-lg border text-xs font-medium transition-all ${
                                    c.next_path === 'class'
                                      ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-300'
                                      : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                                  }`}
                                >
                                  📚 Certification
                                </button>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => openGmailReply(c)}
                                  className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-400/30 text-red-300 text-xs font-medium hover:bg-red-500/30 transition-all"
                                >
                                  📧 Reply via Gmail ∧
                                </button>
                                <button
                                  onClick={() => openWhatsApp(c)}
                                  className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-400/30 text-green-300 text-xs font-medium hover:bg-green-500/30 transition-all"
                                >
                                  💬 WhatsApp ∧
                                </button>
                              </div>
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Consultation History</h3>
                  <button
                    onClick={() => fetchData()}
                    disabled={loadingData}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-50"
                  >
                    {loadingData ? 'Syncing...' : 'Refresh'}
                  </button>
                </div>
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

                        {!isOwner && c.next_path === 'class' && (
                          <div className="mt-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-100">
                            <p className="mb-2 font-semibold">Class learning path for this consultation.</p>

                            {c.next_path_status === 'pending' && (
                              <button
                                onClick={() => handleStartClassTest(c.id)}
                                disabled={statusUpdatingId === c.id}
                                className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                              >
                                Start class test
                              </button>
                            )}

                            {c.next_path_status === 'test_in_progress' && (
                              <p className="text-xs text-cyan-100">Test in progress… please wait just a moment.</p>
                            )}

                            {c.next_path_status === 'test_completed' && (
                              <button
                                onClick={() => handleProceedToCertification(c.id)}
                                disabled={statusUpdatingId === c.id}
                                className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                              >
                                Proceed to Certification Course Introduction
                              </button>
                            )}

                            {c.next_path_status === 'certification_started' && (
                              <>
                                <p className="text-xs text-cyan-100 mb-3">Certification started — choose a course and session.</p>

                                <label className="text-xs text-blue-200/60">Course</label>
                                <select
                                  value={selectedCourse[c.id] || ''}
                                  onChange={e => setSelectedCourse(prev => ({ ...prev, [c.id]: e.target.value }))}
                                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0b1a33] px-3 py-2 text-sm text-white"
                                >
                                  <option value="">Choose a course</option>
                                  {(certificationCatalog[c.service] ? [c.service] : Object.keys(certificationCatalog)).map(key => (
                                    <option key={key} value={key}>{certificationCatalog[key]?.title || key}</option>
                                  ))}
                                </select>

                                {selectedCourse[c.id] && (
                                  <>
                                    <label className="mt-3 block text-xs text-blue-200/60">Session</label>
                                    <select
                                      value={selectedSession[c.id] || ''}
                                      onChange={e => setSelectedSession(prev => ({ ...prev, [c.id]: e.target.value }))}
                                      className="mt-1 w-full rounded-xl border border-white/15 bg-[#0b1a33] px-3 py-2 text-sm text-white"
                                    >
                                      <option value="">Choose a session</option>
                                      {(certificationCatalog[selectedCourse[c.id]]?.sessions || []).map(session => (
                                        <option key={session} value={session}>{session}</option>
                                      ))}
                                    </select>
                                  </>
                                )}

                                <button
                                  onClick={() => {
                                    if (!selectedCourse[c.id] || !selectedSession[c.id]) return;
                                    sessionStorage.setItem(`lesson_${c.id}`, JSON.stringify({ course: selectedCourse[c.id], session: selectedSession[c.id] }));
                                    navigate(
                                      `/lesson/${c.id}?course=${encodeURIComponent(selectedCourse[c.id])}&session=${encodeURIComponent(selectedSession[c.id])}`
                                    );
                                  }}
                                  disabled={!selectedCourse[c.id] || !selectedSession[c.id]}
                                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-3 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                                >
                                  Enter AI Lesson
                                </button>
                              </>
                            )}

                            {c.next_path === 'service' && (
                              <p className="text-xs text-blue-200/70">You selected service delivery path; continue with direct implementation and status updates in consultation history.</p>
                            )}
                          </div>
                        )}
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

                {isOwner && (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Manual Password Reset</h3>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                      <p className="text-blue-200/50 text-sm">
                        Generate a one-time reset code for any user when email delivery is unavailable. Creating a new code replaces the previous one for that email.
                      </p>
                      {manualResetError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                          {manualResetError}
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-blue-200/70 mb-1.5">User Email</label>
                        <input
                          type="email"
                          value={manualResetEmail}
                          onChange={e => setManualResetEmail(e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:border-cyan-500/50 outline-none transition-all"
                          placeholder="user@example.com"
                        />
                      </div>
                      <button
                        onClick={handleManualResetGenerate}
                        disabled={manualResetGenerating}
                        className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-60"
                      >
                        {manualResetGenerating ? 'Generating...' : 'Generate Reset OTP'}
                      </button>
                      {manualResetCode && (
                        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5 space-y-3">
                          <p className="text-amber-200 text-sm">
                            Share this code with the user through a trusted channel, then have them finish the existing reset form.
                          </p>
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-amber-200/70 mb-2">Generated OTP</p>
                            <div className="rounded-xl bg-[#0a1628] border border-white/10 px-4 py-3 text-3xl font-bold tracking-[0.35em] text-white">
                              {manualResetCode}
                            </div>
                          </div>
                          <p className="text-sm text-amber-100/80">
                            Expires at {new Date(manualResetExpiresAt).toLocaleString()}.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
