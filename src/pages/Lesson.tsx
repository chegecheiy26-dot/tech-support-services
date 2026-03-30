import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface LessonPhase {
  phase: 'loading' | 'narrator' | 'qa' | 'quiz' | 'complete';
}

type LessonData = {
  title: string;
  notes: string[];
  qaQuestions: Array<{ q: string; options: string[]; correct: number }>;
  quizQuestions: Array<{ q: string; options: string[]; correct: number }>;
};

type CurriculumSession = {
  label: string;
  title: string;
  focus: string;
  outcomes: string[];
  tools: string[];
  concepts: string[];
  lab: string;
  applications: string[];
};

const curriculumTracks: Record<string, CurriculumSession[]> = {
  'Database Systems': [
    {
      label: 'Introduction to Databases (1h)',
      title: 'Introduction to Databases',
      focus: 'core database concepts, DBMS roles, relational thinking, and data lifecycle foundations',
      outcomes: ['differentiate files from databases', 'identify DBMS responsibilities', 'describe relational vs NoSQL use cases'],
      tools: ['DBMS', 'tables', 'records', 'SQL'],
      concepts: ['data persistence', 'schema', 'integrity', 'structured storage'],
      lab: 'Create a small student records schema and compare it with spreadsheet-based storage.',
      applications: ['student portals', 'inventory systems', 'hospital records'],
    },
    {
      label: 'Data Modeling & ERD (1h 30m)',
      title: 'Data Modeling & ERD',
      focus: 'entity analysis, relationships, normalization, and schema planning for diploma and degree projects',
      outcomes: ['build ER diagrams', 'identify entities and attributes', 'map cardinalities correctly'],
      tools: ['ERD', 'entities', 'attributes', 'normalization'],
      concepts: ['cardinality', 'business rules', 'normal forms', 'schema planning'],
      lab: 'Design an ERD for a school management system with students, courses, lecturers, and payments.',
      applications: ['school systems', 'e-commerce apps', 'library platforms'],
    },
    {
      label: 'SQL Basics & Advanced Queries (1h 30m)',
      title: 'SQL Basics & Advanced Queries',
      focus: 'data retrieval, joins, grouping, subqueries, and query writing for academic and industry tasks',
      outcomes: ['write SELECT queries', 'use joins and grouping', 'interpret query results accurately'],
      tools: ['SELECT', 'JOIN', 'GROUP BY', 'subqueries'],
      concepts: ['projection', 'selection', 'aggregation', 'nested queries'],
      lab: 'Write reports for sales, top customers, and low-stock products from a sample retail database.',
      applications: ['analytics dashboards', 'business reporting', 'operational monitoring'],
    },
    {
      label: 'Database Design Principles (1h)',
      title: 'Database Design Principles',
      focus: 'quality schema design, key constraints, naming discipline, and maintainable relational structures',
      outcomes: ['select proper keys', 'apply naming standards', 'evaluate schema quality'],
      tools: ['primary keys', 'foreign keys', 'constraints', 'schema conventions'],
      concepts: ['candidate keys', 'referential integrity', 'surrogate keys', 'consistency'],
      lab: 'Refactor a poor schema into a cleaner, constraint-driven relational design.',
      applications: ['enterprise databases', 'project systems', 'production schema reviews'],
    },
    {
      label: 'Indexing & Optimization (1h)',
      title: 'Indexing & Optimization',
      focus: 'query performance, access paths, indexing tradeoffs, and execution planning',
      outcomes: ['explain index benefits', 'identify slow-query causes', 'choose useful indexes'],
      tools: ['indexes', 'query plans', 'search conditions', 'optimization'],
      concepts: ['B-trees', 'covering indexes', 'full scans', 'selectivity'],
      lab: 'Measure query timing before and after adding indexes to a transaction table.',
      applications: ['large apps', 'search-heavy systems', 'transaction platforms'],
    },
    {
      label: 'Transactions & Concurrency (1h)',
      title: 'Transactions & Concurrency',
      focus: 'ACID, locking, isolation, rollback, and concurrent user safety',
      outcomes: ['define ACID properties', 'explain concurrency issues', 'identify transaction boundaries'],
      tools: ['transactions', 'locks', 'commit', 'rollback'],
      concepts: ['dirty reads', 'lost updates', 'serializability', 'isolation levels'],
      lab: 'Simulate concurrent account transfers and inspect consistency failures.',
      applications: ['banking software', 'point-of-sale systems', 'reservation services'],
    },
    {
      label: 'Stored Procedures & Views (1h)',
      title: 'Stored Procedures & Views',
      focus: 'server-side logic, reusable database interfaces, and controlled data exposure',
      outcomes: ['define views', 'explain stored procedures', 'use database abstraction for reuse'],
      tools: ['views', 'stored procedures', 'reusable queries', 'encapsulation'],
      concepts: ['abstraction', 'privilege boundaries', 'query reuse', 'parameterized logic'],
      lab: 'Create a reporting view and a reusable stored routine for a fee payment summary.',
      applications: ['reporting portals', 'ERP modules', 'admin dashboards'],
    },
    {
      label: 'Database Security & Access Control (1h)',
      title: 'Database Security & Access Control',
      focus: 'authentication, authorization, secure queries, and protecting institutional data',
      outcomes: ['describe user roles', 'prevent injection risks', 'apply least privilege'],
      tools: ['roles', 'permissions', 'parameterized queries', 'audit logs'],
      concepts: ['least privilege', 'authentication', 'authorization', 'data protection'],
      lab: 'Model role-based access for admin, lecturer, cashier, and student-facing users.',
      applications: ['secure portals', 'financial systems', 'regulated data environments'],
    },
    {
      label: 'Distributed Databases & Replication (1h 30m)',
      title: 'Distributed Databases & Replication',
      focus: 'multi-node storage, replication, consistency tradeoffs, and high availability',
      outcomes: ['explain replication models', 'compare consistency choices', 'describe distributed database tradeoffs'],
      tools: ['replication', 'sharding', 'consistency', 'availability'],
      concepts: ['leader-follower replication', 'partitioning', 'eventual consistency', 'failover'],
      lab: 'Compare a centralized database design with a replicated campus-wide deployment model.',
      applications: ['multi-branch businesses', 'cloud platforms', 'high-availability services'],
    },
    {
      label: 'Backup & Recovery (1h)',
      title: 'Backup & Recovery',
      focus: 'business continuity, backup strategies, recovery objectives, and fault response',
      outcomes: ['compare backup types', 'plan recovery workflow', 'protect data availability'],
      tools: ['full backup', 'incremental backup', 'restore', 'recovery'],
      concepts: ['RPO', 'RTO', 'disaster recovery', 'validation testing'],
      lab: 'Plan and document a weekly backup and restore test process for a college database.',
      applications: ['business continuity', 'IT operations', 'risk management'],
    },
    {
      label: 'Database Administration & Monitoring (1h)',
      title: 'Database Administration & Monitoring',
      focus: 'operational maintenance, health monitoring, capacity planning, and troubleshooting',
      outcomes: ['track database health', 'recognize capacity issues', 'plan maintenance tasks'],
      tools: ['monitoring', 'logs', 'capacity planning', 'maintenance windows'],
      concepts: ['availability metrics', 'performance baselines', 'resource usage', 'incident response'],
      lab: 'Review a mock production incident and propose monitoring metrics and DBA actions.',
      applications: ['production support', 'managed services', 'operations teams'],
    },
  ],
  'Data Communications & Networks': [
    {
      label: 'Networking Fundamentals (1h)',
      title: 'Networking Fundamentals',
      focus: 'network concepts, topology, addressing, and communication basics used across diploma and degree curricula',
      outcomes: ['define network components', 'explain topologies', 'describe network communication flow'],
      tools: ['hosts', 'switches', 'routers', 'media'],
      concepts: ['network scope', 'packet transfer', 'peer communication', 'topology choices'],
      lab: 'Draw and explain a simple campus LAN with switches, routers, clients, and servers.',
      applications: ['campus networks', 'office LANs', 'internet access'],
    },
    {
      label: 'TCP/IP & OSI Models (1h 30m)',
      title: 'TCP/IP & OSI Models',
      focus: 'layered communication models and how protocols map to real network services',
      outcomes: ['name OSI layers', 'map protocols to layers', 'trace packet movement across layers'],
      tools: ['OSI', 'TCP/IP', 'encapsulation', 'protocol stack'],
      concepts: ['layer mapping', 'framing', 'encapsulation', 'service abstraction'],
      lab: 'Trace a web request through each layer from browser to server and back.',
      applications: ['web communication', 'email delivery', 'network troubleshooting'],
    },
    {
      label: 'Routing & Switching (1h 30m)',
      title: 'Routing & Switching',
      focus: 'packet forwarding, MAC learning, subnetting, and network segmentation',
      outcomes: ['explain router vs switch roles', 'interpret forwarding decisions', 'apply subnetting basics'],
      tools: ['routing tables', 'MAC tables', 'subnets', 'VLANs'],
      concepts: ['broadcast domains', 'forwarding decisions', 'subnet masks', 'switching logic'],
      lab: 'Design a segmented network for administration, labs, library, and hostel services.',
      applications: ['enterprise LANs', 'department networks', 'building segmentation'],
    },
    {
      label: 'IP Addressing & Subnetting (1h 30m)',
      title: 'IP Addressing & Subnetting',
      focus: 'IPv4 planning, subnet calculation, host allocation, and efficient address design',
      outcomes: ['calculate subnets', 'assign hosts correctly', 'plan address spaces'],
      tools: ['IPv4', 'subnet masks', 'CIDR', 'host ranges'],
      concepts: ['network IDs', 'broadcast addresses', 'CIDR notation', 'address planning'],
      lab: 'Subnet a /24 network into separate academic, admin, and wireless segments.',
      applications: ['VLAN design', 'router setup', 'network planning'],
    },
    {
      label: 'Network Devices & Media (1h)',
      title: 'Network Devices & Media',
      focus: 'device roles, cabling media, transceivers, and selecting appropriate infrastructure',
      outcomes: ['identify device roles', 'choose media types', 'compare hardware capabilities'],
      tools: ['routers', 'switches', 'access points', 'fiber'],
      concepts: ['throughput', 'distance limits', 'device functions', 'physical constraints'],
      lab: 'Match device types and cable media to different campus deployment cases.',
      applications: ['lab setup', 'office installation', 'data center edge'],
    },
    {
      label: 'Network Security (1h)',
      title: 'Network Security',
      focus: 'threats, controls, firewalls, authentication, and secure network design',
      outcomes: ['identify common threats', 'describe access controls', 'explain defense-in-depth'],
      tools: ['firewalls', 'ACLs', 'IDS/IPS', 'authentication'],
      concepts: ['network attacks', 'segmentation', 'trust boundaries', 'monitoring'],
      lab: 'Draft a secure network policy for student labs, staff offices, and remote access.',
      applications: ['enterprise defense', 'school IT policy', 'remote access security'],
    },
    {
      label: 'Wireless & WAN Technologies (1h 30m)',
      title: 'Wireless & WAN Technologies',
      focus: 'wireless standards, WAN links, mobility, and enterprise connectivity choices',
      outcomes: ['compare WLAN and WAN uses', 'describe wireless challenges', 'identify enterprise connectivity options'],
      tools: ['Wi-Fi', 'WAN', 'latency', 'bandwidth'],
      concepts: ['coverage planning', 'wireless interference', 'ISP links', 'link characteristics'],
      lab: 'Plan a wireless deployment covering lecture halls, offices, and outdoor spaces.',
      applications: ['campus Wi-Fi', 'branch connectivity', 'hybrid office networking'],
    },
    {
      label: 'Network Services & Protocols (1h)',
      title: 'Network Services & Protocols',
      focus: 'supporting services such as DNS, DHCP, NAT, and service discovery in real networks',
      outcomes: ['explain DNS and DHCP', 'describe NAT roles', 'identify protocol dependencies'],
      tools: ['DNS', 'DHCP', 'NAT', 'ARP'],
      concepts: ['name resolution', 'address assignment', 'translation', 'protocol dependency'],
      lab: 'Map the services required for a new branch office to get clients online securely.',
      applications: ['client onboarding', 'internet access', 'service reliability'],
    },
    {
      label: 'Network Management & Troubleshooting (1h 30m)',
      title: 'Network Management & Troubleshooting',
      focus: 'diagnostics, monitoring, documentation, and layered troubleshooting workflow',
      outcomes: ['follow a troubleshooting process', 'interpret symptoms', 'document findings clearly'],
      tools: ['ping', 'traceroute', 'logs', 'monitoring dashboards'],
      concepts: ['fault isolation', 'symptom analysis', 'escalation', 'documentation'],
      lab: 'Troubleshoot a staged outage involving DNS, switching, and wrong subnet configuration.',
      applications: ['service desk support', 'network operations', 'field troubleshooting'],
    },
    {
      label: 'Network Design Project (1h)',
      title: 'Network Design Project',
      focus: 'bringing addressing, routing, security, and services together in one capstone design',
      outcomes: ['integrate prior modules', 'justify design decisions', 'present a workable topology'],
      tools: ['design diagrams', 'address plans', 'security zones', 'service maps'],
      concepts: ['end-to-end design', 'tradeoff analysis', 'documentation', 'implementation planning'],
      lab: 'Prepare a full proposal for a medium-sized organization network with diagrams and services.',
      applications: ['capstone projects', 'client proposals', 'deployment planning'],
    },
  ],
  'Distributed Systems': [
    {
      label: 'Distributed System Concepts (1h)',
      title: 'Distributed System Concepts',
      focus: 'the structure, purpose, and tradeoffs of systems spread across multiple machines',
      outcomes: ['define distributed systems', 'describe benefits and risks', 'relate the model to cloud platforms'],
      tools: ['nodes', 'messages', 'coordination', 'scalability'],
      concepts: ['decentralization', 'message passing', 'resource sharing', 'service coordination'],
      lab: 'Compare a monolithic deployment with a distributed deployment for an online portal.',
      applications: ['cloud services', 'campus systems', 'online platforms'],
    },
    {
      label: 'Consensus & Fault Tolerance (1h 30m)',
      title: 'Consensus & Fault Tolerance',
      focus: 'reliability, replication, leader election, and keeping services available under failure',
      outcomes: ['explain consensus goals', 'describe replication', 'identify fault-tolerance strategies'],
      tools: ['replication', 'consensus', 'failover', 'quorum'],
      concepts: ['agreement', 'fault detection', 'leader election', 'service continuity'],
      lab: 'Model how a distributed grade processing system survives node failure.',
      applications: ['reliable platforms', 'cloud databases', 'critical online services'],
    },
    {
      label: 'Microservices Architecture (1h)',
      title: 'Microservices Architecture',
      focus: 'service decomposition, APIs, independent deployment, and boundaries in modern systems',
      outcomes: ['define microservices', 'compare with monoliths', 'identify service boundaries'],
      tools: ['services', 'APIs', 'deployment', 'service contracts'],
      concepts: ['bounded contexts', 'service contracts', 'deployment independence', 'observability'],
      lab: 'Break a school ERP into admissions, finance, exams, and notification services.',
      applications: ['enterprise software', 'SaaS platforms', 'modular backends'],
    },
    {
      label: 'Scalability & Load Balancing (1h 30m)',
      title: 'Scalability & Load Balancing',
      focus: 'horizontal scaling, bottlenecks, load balancing, and system growth patterns',
      outcomes: ['compare vertical and horizontal scaling', 'identify bottlenecks', 'explain load-balancing behavior'],
      tools: ['scaling', 'load balancer', 'throughput', 'availability'],
      concepts: ['request distribution', 'hotspots', 'performance ceilings', 'elastic growth'],
      lab: 'Design a scaling plan for a student portal during registration week.',
      applications: ['high-traffic apps', 'cloud platforms', 'resource planning'],
    },
    {
      label: 'Distributed Communication Patterns (1h)',
      title: 'Distributed Communication Patterns',
      focus: 'request-response, messaging, event-driven integration, and asynchronous workflows',
      outcomes: ['compare sync and async calls', 'describe message patterns', 'choose suitable communication models'],
      tools: ['REST', 'queues', 'events', 'brokers'],
      concepts: ['coupling', 'latency', 'async processing', 'workflow coordination'],
      lab: 'Map order placement, payment, and notification steps using events and queues.',
      applications: ['e-commerce flows', 'notification systems', 'workflow engines'],
    },
    {
      label: 'Distributed Data Management (1h 30m)',
      title: 'Distributed Data Management',
      focus: 'replicated state, partitioned data, consistency models, and data ownership',
      outcomes: ['explain partitioning', 'describe data ownership', 'compare consistency models'],
      tools: ['partitioning', 'replication', 'consistency', 'data locality'],
      concepts: ['ownership boundaries', 'sync lag', 'eventual consistency', 'data placement'],
      lab: 'Design data ownership for users, billing, and activity logs across services.',
      applications: ['multi-region systems', 'analytics pipelines', 'large-scale products'],
    },
    {
      label: 'Cloud Infrastructure Basics (1h)',
      title: 'Cloud Infrastructure Basics',
      focus: 'compute, storage, networking, virtualization, and service provisioning in distributed environments',
      outcomes: ['explain cloud primitives', 'map services to workloads', 'describe infrastructure tradeoffs'],
      tools: ['VMs', 'containers', 'storage', 'virtual networks'],
      concepts: ['provisioning', 'elasticity', 'service models', 'resource pooling'],
      lab: 'Sketch an infrastructure plan for hosting a student information system in the cloud.',
      applications: ['cloud migration', 'hosting decisions', 'infrastructure planning'],
    },
    {
      label: 'Containerization & Orchestration (1h 30m)',
      title: 'Containerization & Orchestration',
      focus: 'container packaging, deployment consistency, scheduling, and orchestration at scale',
      outcomes: ['define containers', 'describe orchestration goals', 'compare VMs and containers'],
      tools: ['containers', 'images', 'orchestration', 'scheduling'],
      concepts: ['portability', 'resource isolation', 'service discovery', 'rollouts'],
      lab: 'Plan container deployment for three services with scaling and restart requirements.',
      applications: ['DevOps pipelines', 'modern deployment', 'cloud-native apps'],
    },
    {
      label: 'Observability & Monitoring (1h)',
      title: 'Observability & Monitoring',
      focus: 'metrics, logs, tracing, and diagnosing issues across many cooperating components',
      outcomes: ['differentiate logs, metrics, and traces', 'use observability for diagnosis', 'identify service health indicators'],
      tools: ['metrics', 'logs', 'traces', 'alerts'],
      concepts: ['telemetry', 'error budgets', 'latency tracking', 'incident response'],
      lab: 'Design a dashboard and alert set for a distributed learning platform.',
      applications: ['SRE practice', 'production support', 'incident management'],
    },
    {
      label: 'Distributed Systems Capstone (1h)',
      title: 'Distributed Systems Capstone',
      focus: 'integrating architecture, scaling, reliability, and operations into one end-to-end system design',
      outcomes: ['synthesize the module', 'justify architecture decisions', 'prepare a complete distributed design'],
      tools: ['architecture diagrams', 'service maps', 'deployment plans', 'operational controls'],
      concepts: ['tradeoff analysis', 'system design', 'operational readiness', 'scalable delivery'],
      lab: 'Produce a capstone design for a national e-learning platform with resilient services and operations.',
      applications: ['final projects', 'solution architecture', 'portfolio work'],
    },
  ],
};

function createLessonFromCurriculum(session: CurriculumSession): LessonData {
  return {
    title: session.title,
    notes: [
      `${session.title} covers ${session.focus}.`,
      `By the end of this lesson, you should be able to ${session.outcomes[0]}, ${session.outcomes[1]}, and ${session.outcomes[2]}.`,
      `This session is aligned with computer science degree and diploma expectations, where learners are expected to connect theory to lab work, coursework, and real deployments.`,
      `Key study terms in this session include ${session.tools.join(', ')}.`,
      `Core concepts explored here include ${session.concepts.join(', ')}.`,
      `Practical lab focus: ${session.lab}`,
      `Real-world applications tied to this session include ${session.applications.join(', ')}.`,
      `During revision, connect the theory to system analysis, implementation choices, troubleshooting decisions, and professional communication.`,
      `Use the end-of-session questions to confirm you can explain the topic in your own words and apply it in project work.`,
      `As you move through the lesson, focus on how the concepts support software development, infrastructure design, troubleshooting, and professional certification readiness.`,
    ],
    qaQuestions: [
      {
        q: `What is the primary focus of ${session.title}?`,
        options: [
          session.focus,
          'Only memorizing terms without application',
          'Avoiding practical work completely',
          'Replacing every other module in the curriculum',
        ],
        correct: 0,
      },
      {
        q: `Which outcome is expected from ${session.title}?`,
        options: [
          'Ignoring implementation details',
          session.outcomes[1],
          'Skipping assessment tasks',
          'Removing the need for foundational knowledge',
        ],
        correct: 1,
      },
      {
        q: `Which practical task best fits ${session.title}?`,
        options: [
          session.lab,
          'Avoiding all labs and coursework',
          'Replacing the whole curriculum with one topic',
          'Studying unrelated office work only',
        ],
        correct: 0,
      },
      {
        q: `Which area is strongly connected to ${session.title}?`,
        options: [
          'Unrelated non-technical duties only',
          session.applications[1],
          'Ignoring systems and users',
          'Eliminating all analysis and design',
        ],
        correct: 1,
      },
    ],
    quizQuestions: [
      {
        q: `Which set contains concepts central to ${session.title}?`,
        options: [
          session.tools.join(', '),
          'Payroll, accounting, and taxation only',
          'Graphic design and illustration only',
          'Unrelated office stationery terms',
        ],
        correct: 0,
      },
      {
        q: 'Why is this session included in the curriculum?',
        options: [
          'To build academic and practical competency in the track',
          'To delay progress without learning value',
          'To remove the need for future modules',
          'To avoid assessment and review',
        ],
        correct: 0,
      },
      {
        q: 'What is the best approach while studying this lesson?',
        options: [
          'Connect each concept to labs, projects, and real support scenarios',
          'Read only the title and leave',
          'Skip all questions and feedback',
          'Treat all topics as unrelated facts',
        ],
        correct: 0,
      },
      {
        q: `Which phrase best reflects the learning style for ${session.title}?`,
        options: [
          'Theory, lab practice, and applied reasoning should work together',
          'Memorization alone is enough for mastery',
          'This session should be isolated from other units',
          'There is no need to link the topic to projects',
        ],
        correct: 0,
      },
      {
        q: `Why is ${session.title} important in a computer science curriculum?`,
        options: [
          'It supports technical understanding, implementation, and professional readiness',
          'It avoids all technical decisions',
          'It removes the need for future study',
          'It focuses only on unrelated business routines',
        ],
        correct: 0,
      },
    ],
  };
}

const lessonContent: Record<string, Record<string, LessonData>> = Object.fromEntries(
  Object.entries(curriculumTracks).map(([course, sessions]) => [
    course,
    Object.fromEntries(sessions.map((session) => [session.label, createLessonFromCurriculum(session)])),
  ]),
);

function buildFallbackLesson(course: string, session: string): LessonData {
  const sessionTitle = session.replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Lesson Session';
  const courseTitle = course || 'Certification Track';

  return {
    title: sessionTitle,
    notes: [
      `Welcome to ${sessionTitle} in the ${courseTitle} track.`,
      `This lesson focuses on the main ideas, vocabulary, and practical workflow used in ${courseTitle}.`,
      `Pay attention to the core concepts introduced in ${sessionTitle}, because they will support later sessions and certification tasks.`,
      `As you proceed, connect each concept to a real project or support scenario so the lesson becomes practical and memorable.`,
      `Use the Q&A and quiz sections to confirm understanding before moving to the next milestone.`,
    ],
    qaQuestions: [
      {
        q: `What is the main goal of the ${sessionTitle} session?`,
        options: [
          'To build understanding of the session fundamentals',
          'To skip directly to certification',
          'To avoid practical examples',
          'To replace all previous lessons',
        ],
        correct: 0,
      },
      {
        q: 'What is the best way to benefit from this lesson?',
        options: [
          'Ignore the examples',
          'Relate the concepts to real tasks and workflows',
          'Memorize only the title',
          'Skip the questions',
        ],
        correct: 1,
      },
    ],
    quizQuestions: [
      {
        q: `Which statement best describes ${sessionTitle}?`,
        options: [
          'It introduces concepts you can apply in practice',
          'It has no connection to the certification path',
          'It is only for entertainment',
          'It replaces every other session',
        ],
        correct: 0,
      },
      {
        q: 'What should you do before moving to the next session?',
        options: [
          'Close the lesson immediately',
          'Confirm understanding through Q&A and quiz review',
          'Delete your progress',
          'Skip the dashboard entirely',
        ],
        correct: 1,
      },
      {
        q: 'Why are lesson activities included in the flow?',
        options: [
          'To help reinforce learning and readiness',
          'To make the page longer',
          'To prevent progress permanently',
          'To remove the need for practice',
        ],
        correct: 0,
      },
    ],
  };
}

function resolveLessonData(course: string, session: string): LessonData | null {
  if (!course || !session) {
    return null;
  }

  const exactCourse = lessonContent[course];
  if (exactCourse?.[session]) {
    return exactCourse[session];
  }

  return buildFallbackLesson(course, session);
}

const Lesson: React.FC = () => {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [phase, setPhase] = useState<'loading' | 'narrator' | 'qa' | 'quiz' | 'complete'>('narrator');
  const [qaAnswers, setQaAnswers] = useState<Record<number, number>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [narrating, setNarrating] = useState(true);

  // Parse from sessionStorage (passed from Dashboard or ServicesGrid)
  let storageKey = '';

  if (consultationId) {
    if (consultationId.startsWith('service-')) {
      const serviceId = consultationId.split('service-')[1];
      storageKey = `lesson_service_${serviceId}`;
    } else {
      storageKey = `lesson_${consultationId}`;
    }
  }

  const sessionData = storageKey ? sessionStorage.getItem(storageKey) : null;
  const searchParams = new URLSearchParams(location.search);
  const queryCourse = searchParams.get('course') || '';
  const querySession = searchParams.get('session') || '';
  const payload = sessionData ? JSON.parse(sessionData) : { course: queryCourse, session: querySession };
  const course = payload.course || queryCourse;
  const session = payload.session || querySession;

  const courseData = resolveLessonData(course, session);
  const sessionLabels = curriculumTracks[course]?.map((item) => item.label) || [];
  const currentSessionIndex = sessionLabels.indexOf(session);
  const nextSessionLabel = currentSessionIndex >= 0 ? sessionLabels[currentSessionIndex + 1] || '' : '';

  useEffect(() => {
    if (storageKey && course && session) {
      sessionStorage.setItem(storageKey, JSON.stringify({ course, session }));
    }
  }, [storageKey, course, session]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user || !courseData) {
      navigate('/');
      return;
    }
    setPhase((current) => (current === 'loading' ? 'narrator' : current));
  }, [user, courseData, loading, navigate]);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleNarratorComplete = () => {
    setNarrating(false);
    setTimeout(() => setPhase('qa'), 1000);
  };

  const handleQASubmit = () => {
    setPhase('quiz');
  };

  const handleQuizSubmit = () => {
    setPhase('complete');
  };

  const handleNextSession = () => {
    if (!consultationId || !nextSessionLabel) {
      navigate('/dashboard');
      return;
    }

    const nextPayload = { course, session: nextSessionLabel };
    sessionStorage.setItem(`lesson_${consultationId}`, JSON.stringify(nextPayload));
    setQaAnswers({});
    setQuizAnswers({});
    setNarrating(true);
    setPhase('narrator');
    navigate(`/lesson/${consultationId}?course=${encodeURIComponent(course)}&session=${encodeURIComponent(nextSessionLabel)}`);
  };

  if (!courseData) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl">Loading lesson...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] to-[#0f1f35] pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-cyan-400 hover:text-cyan-300 text-sm mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">{courseData.title}</h1>
          <p className="text-gray-400">{session}</p>
        </div>

        {/* NARRATOR PHASE */}
        {(phase === 'loading' || phase === 'narrator') && (
          <div className="bg-white/5 border border-cyan-500/30 rounded-2xl p-8 mb-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5h4V7h2v5h4l-5 5z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">🎙️ AI Narrator</h2>
                <p className="text-gray-300 text-sm">Your lesson is being narrated. Listen carefully.</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {courseData.notes.map((note, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border transition-all ${
                    narrating
                      ? 'bg-cyan-500/10 border-cyan-400/40 text-cyan-100'
                      : 'bg-white/5 border-white/10 text-gray-300'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{note}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => speakText(courseData.notes.join(' '))}
                className="flex-1 px-4 py-3 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-medium hover:bg-cyan-500/30 transition-all"
              >
                🔊 Re-play Narrator
              </button>
              <button
                onClick={handleNarratorComplete}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:opacity-90 transition-all"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Q&A PHASE */}
        {phase === 'qa' && (
          <div className="bg-white/5 border border-violet-500/30 rounded-2xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-6">❓ Session Q&A</h2>
            <div className="space-y-6 mb-8">
              {courseData.qaQuestions.map((q, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <p className="text-white font-medium mb-4">{idx + 1}. {q.q}</p>
                  <div className="space-y-2">
                    {q.options.map((option, optIdx) => (
                      <label key={optIdx} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/10 cursor-pointer transition-all">
                        <input
                          type="radio"
                          name={`qa-${idx}`}
                          value={optIdx}
                          checked={qaAnswers[idx] === optIdx}
                          onChange={() => setQaAnswers(prev => ({ ...prev, [idx]: optIdx }))}
                          className="w-4 h-4"
                        />
                        <span className="text-gray-300">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleQASubmit}
              className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold hover:opacity-90 transition-all"
            >
              Proceed to Certification Quiz →
            </button>
          </div>
        )}

        {/* QUIZ PHASE */}
        {phase === 'quiz' && (
          <div className="bg-white/5 border border-green-500/30 rounded-2xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">🏆 Certification Quiz</h2>
            <p className="text-gray-400 mb-6">Answer these questions to earn your certification.</p>
            <div className="space-y-6 mb-8">
              {courseData.quizQuestions.map((q, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <p className="text-white font-medium mb-4">{idx + 1}. {q.q}</p>
                  <div className="space-y-2">
                    {q.options.map((option, optIdx) => (
                      <label key={optIdx} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/10 cursor-pointer transition-all">
                        <input
                          type="radio"
                          name={`quiz-${idx}`}
                          value={optIdx}
                          checked={quizAnswers[idx] === optIdx}
                          onChange={() => setQuizAnswers(prev => ({ ...prev, [idx]: optIdx }))}
                          className="w-4 h-4"
                        />
                        <span className="text-gray-300">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleQuizSubmit}
              disabled={Object.keys(quizAnswers).length < courseData.quizQuestions.length}
              className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold hover:opacity-90 disabled:opacity-50 transition-all disabled:cursor-not-allowed"
            >
              Submit Certification Quiz
            </button>
          </div>
        )}

        {/* COMPLETION PHASE */}
        {phase === 'complete' && (
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-green-300 mb-3">🎓 Certification Complete!</h2>
            <p className="text-green-200 mb-2">Congratulations! You've successfully completed the {session} session.</p>
            <p className="text-green-100/70 mb-8">Your certification has been recorded and you can now advance to the next session in the {course} curriculum.</p>
            
            <div className={`grid gap-4 ${nextSessionLabel ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 rounded-lg bg-white/10 border border-white/20 text-white font-medium hover:bg-white/20 transition-all"
              >
                Home
              </button>
              {nextSessionLabel && (
                <button
                  onClick={handleNextSession}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:opacity-90 transition-all"
                >
                  Next Session
                </button>
              )}
              <button
                onClick={() => {
                  sessionStorage.removeItem(`lesson_${consultationId}`);
                  navigate('/dashboard');
                }}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:opacity-90 transition-all"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Lesson;
