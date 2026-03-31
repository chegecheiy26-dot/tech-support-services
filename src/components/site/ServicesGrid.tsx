import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

const serviceCategories = [
  { id: 'all', label: 'All Services', icon: 'grid' },
  { id: 'systems', label: 'Systems & Architecture', icon: 'cpu' },
  { id: 'programming', label: 'Programming & Development', icon: 'code' },
  { id: 'data', label: 'Data & Networks', icon: 'database' },
  { id: 'business', label: 'Business & Research', icon: 'briefcase' },
];

const services = [
  {
    id: 1, category: 'systems', title: 'Computer Systems',
    description: 'Comprehensive computer systems design, setup, maintenance, and optimization for peak performance.',
    icon: 'monitor',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231253716_7858251c.png',
  },
  {
    id: 2, category: 'systems', title: 'Computer Architecture',
    description: 'Deep understanding of processor design, memory hierarchies, instruction sets, and hardware optimization.',
    icon: 'cpu',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231248426_dda129b9.jpg',
  },
  {
    id: 3, category: 'systems', title: 'IT Support & Customer Care',
    description: 'Professional IT helpdesk, troubleshooting, remote support, and customer service excellence.',
    icon: 'headphones',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231252768_6d40d977.jpg',
  },
  {
    id: 4, category: 'systems', title: 'Operating Systems',
    description: 'Installation, configuration, and management of Windows, Linux, and macOS environments.',
    icon: 'layers',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231252863_addfd50a.jpg',
  },
  {
    id: 5, category: 'systems', title: 'System Analysis & Design',
    description: 'Requirements gathering, system modeling, and architectural design for scalable solutions.',
    icon: 'settings',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231255562_ae94d189.png',
  },
  {
    id: 6, category: 'systems', title: 'Digital Electronics',
    description: 'Logic gates, circuit design, microcontrollers, and embedded systems development.',
    icon: 'zap',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231258764_88dba6ea.png',
  },
  {
    id: 7, category: 'programming', title: 'Programming Fundamentals',
    description: 'Core programming concepts, problem-solving, algorithms, and coding best practices.',
    icon: 'terminal',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231253716_7858251c.png',
  },
  {
    id: 8, category: 'programming', title: 'Web-Based Programming',
    description: 'HTML, CSS, JavaScript, React, and modern web development frameworks and tools.',
    icon: 'globe',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231248426_dda129b9.jpg',
  },
  {
    id: 9, category: 'programming', title: 'OO Analysis & Design',
    description: 'UML modeling, design patterns, SOLID principles, and object-oriented architecture.',
    icon: 'box',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231252768_6d40d977.jpg',
  },
  {
    id: 10, category: 'programming', title: 'OO Programming',
    description: 'Java, C++, Python OOP — classes, inheritance, polymorphism, and encapsulation mastery.',
    icon: 'code',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231252863_addfd50a.jpg',
  },
  {
    id: 11, category: 'programming', title: 'Data Structures & Algorithms',
    description: 'Arrays, trees, graphs, sorting, searching, and computational complexity analysis.',
    icon: 'git-branch',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231255562_ae94d189.png',
  },
  {
    id: 12, category: 'programming', title: 'Software System Project',
    description: 'End-to-end software development lifecycle, project management, and delivery.',
    icon: 'package',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231258764_88dba6ea.png',
  },
  {
    id: 13, category: 'data', title: 'Database Systems',
    description: 'SQL, NoSQL, database design, normalization, query optimization, and administration.',
    icon: 'database',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231253716_7858251c.png',
  },
  {
    id: 14, category: 'data', title: 'Data Communications & Networks',
    description: 'Network protocols, TCP/IP, routing, switching, and network security fundamentals.',
    icon: 'wifi',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231248426_dda129b9.jpg',
  },
  {
    id: 15, category: 'data', title: 'Distributed Systems',
    description: 'Cloud computing, microservices, distributed databases, and scalable architectures.',
    icon: 'cloud',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231252768_6d40d977.jpg',
  },
  {
    id: 16, category: 'business', title: 'E-Systems & E-Commerce',
    description: 'Online store development, payment integration, digital marketing, and e-business strategy.',
    icon: 'shopping-cart',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231252863_addfd50a.jpg',
  },
  {
    id: 17, category: 'business', title: 'Techno-Entrepreneurship',
    description: 'Tech startup guidance, business model canvas, MVP development, and investor pitching.',
    icon: 'rocket',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231255562_ae94d189.png',
  },
  {
    id: 18, category: 'business', title: 'Business Management',
    description: 'IT project management, team leadership, agile methodologies, and business strategy.',
    icon: 'bar-chart',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231258764_88dba6ea.png',
  },
  {
    id: 19, category: 'business', title: 'Research Methods in CS',
    description: 'Scientific methodology, literature review, data analysis, and academic writing for CS.',
    icon: 'search',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231253716_7858251c.png',
  },
  {
    id: 20, category: 'business', title: 'Seminar & Report Writing',
    description: 'Technical documentation, presentation skills, report formatting, and academic publishing.',
    icon: 'file-text',
    image: 'https://d64gsuwffb70l.cloudfront.net/6992d77ce0addb6132c1a899_1771231248426_dda129b9.jpg',
  },
];

const iconMap: Record<string, JSX.Element> = {
  monitor: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  cpu: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  headphones: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>,
  layers: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  settings: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  zap: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  terminal: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
  globe: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  box: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  code: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  'git-branch': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>,
  package: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  database: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  wifi: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>,
  cloud: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>,
  'shopping-cart': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  rocket: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>,
  'bar-chart': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
  search: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  'file-text': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  grid: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  briefcase: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
};

const catIconMap: Record<string, JSX.Element> = iconMap;

const ServicesGrid: React.FC = () => {  const navigate = useNavigate();  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [savedTitles, setSavedTitles] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<number | null>(null);
  const [selectedServiceMode, setSelectedServiceMode] = useState<'service' | 'class'>('service');
  const [serviceTestStatus, setServiceTestStatus] = useState<Record<number, 'not_started' | 'in_progress' | 'completed'>>({});
  const [serviceCertificationStarted, setServiceCertificationStarted] = useState<Record<number, boolean>>({});

  const certificationCatalog: Record<string, {sessions: string[]}> = {
    'Database Systems': {
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
  };

  // Load saved services for the user
  useEffect(() => {
    if (!user) { setSavedTitles(new Set()); return; }
    const loadSaved = async () => {
      const { savedServices } = await api.getSavedServices();
      setSavedTitles(new Set(savedServices.map((d: any) => d.service_title)));
    };
    loadSaved();
  }, [user]);

  const toggleSave = async (e: React.MouseEvent, service: typeof services[0]) => {
    e.stopPropagation();
    if (!user) return;
    setSavingId(service.id);
    if (savedTitles.has(service.title)) {
      const { savedServices } = await api.getSavedServices();
      const existing = savedServices.find((item: any) => item.service_title === service.title);
      if (existing) {
        await api.deleteSavedService(existing.id);
      }
      setSavedTitles(prev => { const n = new Set(prev); n.delete(service.title); return n; });
    } else {
      await api.saveService({
        service_title: service.title,
        service_category: service.category,
        service_description: service.description,
      });
      setSavedTitles(prev => new Set(prev).add(service.title));
    }
    setSavingId(null);
  };

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const matchesCategory = activeCategory === 'all' || s.category === activeCategory;
      const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const handleStartServiceTest = (serviceId: number) => {
    setServiceTestStatus(prev => ({ ...prev, [serviceId]: 'in_progress' }));
    setTimeout(() => {
      setServiceTestStatus(prev => ({ ...prev, [serviceId]: 'completed' }));
    }, 800);
  };

  const handleProceedServiceCertification = (serviceId: number, serviceTitle: string) => {
    setServiceCertificationStarted(prev => ({ ...prev, [serviceId]: true }));

    const selectedCourse = serviceTitle;
    const selectedSession = certificationCatalog[serviceTitle]?.sessions?.[0] || 'Introduction';

    // Store the selection for Lesson page
    sessionStorage.setItem(`lesson_service_${serviceId}`, JSON.stringify({ course: selectedCourse, session: selectedSession }));

    // Redirect to lesson route with synthetic id (service-based)
    navigate(`/lesson/service-${serviceId}`);
  };

  return (
    <section id="services" className="py-24 bg-gradient-to-b from-[#0a1628] via-[#0f1d35] to-[#0a1628] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-4">
            <span className="text-cyan-300 text-sm font-medium">What We Offer</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
            Our <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Expert Services</span>
          </h2>
          <p className="text-blue-200/60 max-w-2xl mx-auto text-lg">
            Comprehensive tech solutions spanning 20+ specialized areas to meet all your technology needs.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto mb-10">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/50">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search services..."
              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-blue-300/40 focus:border-cyan-500/50 focus:bg-white/10 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300/50 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {serviceCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeCategory === cat.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white/5 text-blue-200/60 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <span className="w-4 h-4">{catIconMap[cat.icon]}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-blue-300/40 text-sm mb-2 text-center">
          Showing {filteredServices.length} of {services.length} services
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 mb-6 text-sm">
          <label className="text-blue-200/70">Choose activity track:</label>
          <select
            value={selectedServiceMode}
            onChange={e => setSelectedServiceMode(e.target.value as 'service' | 'class')}
            className="rounded-xl border border-white/15 bg-[#0b1a33] px-3 py-2 text-white outline-none"
          >
            <option value="service">Service delivery (default)</option>
            <option value="class">Class & certification</option>
          </select>
        </div>

        {selectedServiceMode === 'class' && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            Class path is active. Click on a service card, then use the "Start class test" button to take the Dreamport-style test. After completion, use the post-test certification link.
          </div>
        )}

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredServices.map(service => (
            <div
              key={service.id}
              onClick={() => setExpandedCard(expandedCard === service.id ? null : service.id)}
              className={`group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:bg-white/10 hover:border-cyan-500/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10 ${
                expandedCard === service.id ? 'ring-2 ring-cyan-500/50 bg-white/10' : ''
              }`}
            >
              {/* Image */}
              <div className="h-36 overflow-hidden relative">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/50 to-transparent" />
                <div className="absolute bottom-3 left-3 w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-lg">
                  {iconMap[service.icon]}
                </div>
                {/* Save button */}
                {user && (
                  <button
                    onClick={e => toggleSave(e, service)}
                    disabled={savingId === service.id}
                    className={`absolute top-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      savedTitles.has(service.title)
                        ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-black/30 backdrop-blur-sm text-white/60 hover:text-white hover:bg-black/50'
                    }`}
                    title={savedTitles.has(service.title) ? 'Remove from saved' : 'Save service'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={savedTitles.has(service.title) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-white font-bold text-lg mb-2 group-hover:text-cyan-300 transition-colors">{service.title}</h3>
                <p className={`text-blue-200/50 text-sm leading-relaxed ${expandedCard === service.id ? '' : 'line-clamp-2'}`}>
                  {service.description}
                </p>
                {expandedCard === service.id && (
                  <>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          const el = document.getElementById('contact');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-bold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all"
                      >
                        Inquire Now
                      </button>
                      {user && (
                        <button
                          onClick={e => toggleSave(e, service)}
                          className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                            savedTitles.has(service.title)
                              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                              : 'border-white/10 text-blue-200/60 hover:text-white hover:border-white/30'
                          }`}
                        >
                          {savedTitles.has(service.title) ? 'Saved' : 'Save'}
                        </button>
                      )}
                    </div>

                    {selectedServiceMode === 'class' && (
                      <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                        <p className="mb-2">Class path selected. Complete the Dreamport-style test to unlock certification.</p>
                        {serviceTestStatus[service.id] !== 'completed' ? (
                          <button
                            onClick={e => { e.stopPropagation(); handleStartServiceTest(service.id); }}
                            className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-2 py-2 text-sm font-semibold text-white hover:opacity-90"
                          >
                            {serviceTestStatus[service.id] === 'in_progress' ? 'Test in progress...' : 'Start class test'}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); handleProceedServiceCertification(service.id, service.title); }}
                              className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-2 py-2 text-sm font-semibold text-white hover:opacity-90"
                            >
                              Proceed to Certification Course Introduction
                            </button>
                            {serviceCertificationStarted[service.id] && (
                              <p className="mt-2 text-xs text-green-200">Certification course introduction activated.</p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300/40"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <p className="text-blue-200/40 text-lg">No services found matching your search.</p>
            <button onClick={() => { setSearchQuery(''); setActiveCategory('all'); }} className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm font-medium">
              Clear filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ServicesGrid;
