import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface LessonPhase {
  phase: 'loading' | 'narrator' | 'qa' | 'quiz' | 'complete';
}

type LessonData = {
  title: string;
  notes: string[];
  learningObjectives: string[];
  sections: Array<{ title: string; subtopics: Array<{ title: string; content: string[] }> }>;
  keyTerms: string[];
  practiceTasks: string[];
  summaryPoints: string[];
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
  'Data Structures & Algorithms': [
    {
      label: 'Introduction to Data Structures (1h)',
      title: 'Introduction to Data Structures',
      focus: 'how data is organized in memory and why structure choice affects efficiency and maintainability',
      outcomes: ['define data structures', 'compare structure tradeoffs', 'connect data representation to performance'],
      tools: ['arrays', 'lists', 'memory', 'operations'],
      concepts: ['organization', 'access patterns', 'efficiency', 'representation'],
      lab: 'Compare how student records behave when stored in arrays versus linked structures.',
      applications: ['software systems', 'compiler internals', 'database engines'],
    },
    {
      label: 'Arrays & Linked Lists (1h 30m)',
      title: 'Arrays & Linked Lists',
      focus: 'linear data structures, indexing, insertion cost, and dynamic storage behavior',
      outcomes: ['explain array indexing', 'describe linked list behavior', 'choose between the two structures'],
      tools: ['arrays', 'linked lists', 'nodes', 'references'],
      concepts: ['sequential storage', 'dynamic links', 'insertion cost', 'memory tradeoffs'],
      lab: 'Implement insertion, deletion, and traversal for arrays and singly linked lists.',
      applications: ['record storage', 'buffers', 'low-level software'],
    },
    {
      label: 'Stacks & Queues (1h)',
      title: 'Stacks & Queues',
      focus: 'LIFO and FIFO processing models and how they support scheduling and expression evaluation',
      outcomes: ['differentiate stack and queue behavior', 'identify use cases', 'apply push/pop and enqueue/dequeue operations'],
      tools: ['stacks', 'queues', 'push', 'enqueue'],
      concepts: ['LIFO', 'FIFO', 'overflow', 'underflow'],
      lab: 'Build a call stack simulation and a print queue simulation.',
      applications: ['OS scheduling', 'parsing', 'task processing'],
    },
    {
      label: 'Trees & Binary Search Trees (1h 30m)',
      title: 'Trees & Binary Search Trees',
      focus: 'hierarchical structures, traversal strategies, and ordered search operations',
      outcomes: ['define tree terminology', 'perform traversals', 'explain BST search behavior'],
      tools: ['trees', 'BST', 'traversal', 'nodes'],
      concepts: ['root', 'subtree', 'height', 'ordering'],
      lab: 'Insert and search values in a binary search tree, then trace in-order traversal.',
      applications: ['file systems', 'indexing', 'expression parsing'],
    },
    {
      label: 'Heaps & Priority Queues (1h)',
      title: 'Heaps & Priority Queues',
      focus: 'priority-based retrieval, heap ordering, and efficient selection operations',
      outcomes: ['describe heap properties', 'compare min-heap and max-heap', 'use priority queues in problem solving'],
      tools: ['heaps', 'priority queues', 'heapify', 'ordering'],
      concepts: ['heap property', 'priority retrieval', 'partial ordering', 'selection'],
      lab: 'Model an emergency task scheduler using a priority queue.',
      applications: ['schedulers', 'graph algorithms', 'simulation systems'],
    },
    {
      label: 'Hash Tables & Dictionaries (1h)',
      title: 'Hash Tables & Dictionaries',
      focus: 'key-value access, hashing, collisions, and near-constant-time lookup',
      outcomes: ['explain hashing', 'describe collision handling', 'identify dictionary use cases'],
      tools: ['hash tables', 'hash functions', 'buckets', 'lookup'],
      concepts: ['collisions', 'load factor', 'distribution', 'key-value storage'],
      lab: 'Create a small dictionary implementation and test collision scenarios.',
      applications: ['caches', 'symbol tables', 'session stores'],
    },
    {
      label: 'Algorithm Analysis & Big O (1h 30m)',
      title: 'Algorithm Analysis & Big O',
      focus: 'time complexity, space complexity, and comparing algorithms using asymptotic reasoning',
      outcomes: ['define Big O notation', 'estimate growth rates', 'compare algorithm efficiency'],
      tools: ['Big O', 'complexity', 'growth rate', 'space usage'],
      concepts: ['best case', 'worst case', 'scalability', 'asymptotic analysis'],
      lab: 'Analyze common search and sort routines and compare their performance growth.',
      applications: ['software optimization', 'technical interviews', 'system design decisions'],
    },
    {
      label: 'Searching & Sorting Techniques (1h 30m)',
      title: 'Searching & Sorting Techniques',
      focus: 'classic search and sort algorithms and when each strategy is appropriate',
      outcomes: ['compare sorting algorithms', 'differentiate linear and binary search', 'match techniques to data conditions'],
      tools: ['binary search', 'merge sort', 'quick sort', 'selection sort'],
      concepts: ['comparison-based sorting', 'divide and conquer', 'ordered search', 'stability'],
      lab: 'Run search and sort experiments on ordered and unordered student datasets.',
      applications: ['search systems', 'data pipelines', 'performance tuning'],
    },
    {
      label: 'Recursion & Divide and Conquer (1h)',
      title: 'Recursion & Divide and Conquer',
      focus: 'recursive reasoning, base cases, and problem decomposition for efficient solutions',
      outcomes: ['trace recursive calls', 'define base cases', 'explain divide-and-conquer design'],
      tools: ['recursion', 'call stack', 'base case', 'divide and conquer'],
      concepts: ['self-reference', 'stack frames', 'termination', 'decomposition'],
      lab: 'Trace factorial, tree traversal, and merge sort recursion by hand and in code.',
      applications: ['tree algorithms', 'sorting', 'problem decomposition'],
    },
    {
      label: 'Graph Algorithms Fundamentals (1h 30m)',
      title: 'Graph Algorithms Fundamentals',
      focus: 'graph representation, traversal, shortest paths, and connectivity concepts',
      outcomes: ['represent graphs', 'perform BFS and DFS', 'identify graph problem patterns'],
      tools: ['graphs', 'BFS', 'DFS', 'adjacency lists'],
      concepts: ['vertices', 'edges', 'traversal', 'connectivity'],
      lab: 'Model a road network and run BFS/DFS traversal tasks.',
      applications: ['routing', 'social networks', 'dependency analysis'],
    },
  ],
  'Operating Systems': [
    {
      label: 'Introduction to Operating Systems (1h)',
      title: 'Introduction to Operating Systems',
      focus: 'the role of the operating system as a resource manager and interface between hardware and software',
      outcomes: ['define operating system functions', 'describe kernel responsibilities', 'relate OS roles to user programs'],
      tools: ['kernel', 'processes', 'resources', 'system calls'],
      concepts: ['resource management', 'abstraction', 'coordination', 'services'],
      lab: 'Map how an OS manages CPU, memory, storage, and peripherals in a simple workstation.',
      applications: ['desktop systems', 'servers', 'mobile devices'],
    },
    {
      label: 'Processes & Threads (1h 30m)',
      title: 'Processes & Threads',
      focus: 'execution units, concurrency, context switching, and lightweight threading',
      outcomes: ['differentiate processes and threads', 'explain context switching', 'identify concurrency benefits'],
      tools: ['processes', 'threads', 'context switch', 'scheduling'],
      concepts: ['isolation', 'shared state', 'parallelism', 'execution units'],
      lab: 'Trace process creation and thread scheduling for a multitasking scenario.',
      applications: ['web servers', 'desktop apps', 'background services'],
    },
    {
      label: 'CPU Scheduling (1h)',
      title: 'CPU Scheduling',
      focus: 'how the operating system allocates CPU time fairly and efficiently across tasks',
      outcomes: ['describe scheduling goals', 'compare algorithms', 'interpret turnaround and waiting time'],
      tools: ['FCFS', 'Round Robin', 'priority scheduling', 'time slice'],
      concepts: ['fairness', 'latency', 'throughput', 'responsiveness'],
      lab: 'Compute scheduling metrics for a set of processes using multiple algorithms.',
      applications: ['interactive systems', 'real-time workloads', 'multi-user systems'],
    },
    {
      label: 'Process Synchronization (1h 30m)',
      title: 'Process Synchronization',
      focus: 'critical sections, race conditions, semaphores, and safe coordination',
      outcomes: ['identify race conditions', 'explain critical sections', 'use synchronization primitives conceptually'],
      tools: ['mutexes', 'semaphores', 'critical sections', 'locks'],
      concepts: ['mutual exclusion', 'deadlock risk', 'coordination', 'shared resources'],
      lab: 'Analyze producer-consumer and dining philosophers synchronization problems.',
      applications: ['multithreaded software', 'database engines', 'device drivers'],
    },
    {
      label: 'Deadlocks & Resource Allocation (1h)',
      title: 'Deadlocks & Resource Allocation',
      focus: 'resource contention, deadlock conditions, avoidance, and recovery methods',
      outcomes: ['define deadlock conditions', 'recognize unsafe states', 'compare prevention and avoidance'],
      tools: ['resource graphs', 'Banker algorithm', 'allocation', 'deadlock recovery'],
      concepts: ['hold and wait', 'circular wait', 'safe state', 'contention'],
      lab: 'Model a deadlock scenario and propose prevention or recovery strategies.',
      applications: ['concurrent services', 'transaction systems', 'industrial control'],
    },
    {
      label: 'Memory Management (1h 30m)',
      title: 'Memory Management',
      focus: 'main memory allocation, fragmentation, paging, and efficient use of RAM',
      outcomes: ['explain memory allocation models', 'differentiate paging and segmentation', 'identify fragmentation effects'],
      tools: ['paging', 'segmentation', 'frames', 'virtual addresses'],
      concepts: ['allocation', 'fragmentation', 'address translation', 'memory protection'],
      lab: 'Trace how logical addresses map to physical memory using pages and frames.',
      applications: ['application performance', 'system stability', 'virtual memory systems'],
    },
    {
      label: 'Virtual Memory (1h)',
      title: 'Virtual Memory',
      focus: 'extending memory through disk-backed paging and page replacement policies',
      outcomes: ['define virtual memory', 'explain page faults', 'compare replacement strategies'],
      tools: ['page faults', 'LRU', 'FIFO', 'swap space'],
      concepts: ['working set', 'replacement policy', 'thrashing', 'illusion of large memory'],
      lab: 'Evaluate page replacement behavior on a sample reference string.',
      applications: ['general-purpose OSes', 'server workloads', 'resource-limited systems'],
    },
    {
      label: 'File Systems & Storage (1h 30m)',
      title: 'File Systems & Storage',
      focus: 'files, directories, allocation methods, and storage organization',
      outcomes: ['describe file system structures', 'explain allocation methods', 'compare storage strategies'],
      tools: ['inodes', 'directories', 'allocation', 'storage blocks'],
      concepts: ['metadata', 'hierarchy', 'allocation', 'persistence'],
      lab: 'Design a simple file hierarchy and analyze contiguous versus indexed allocation.',
      applications: ['operating system storage', 'backup systems', 'cloud storage layers'],
    },
    {
      label: 'Device Management & I/O (1h)',
      title: 'Device Management & I/O',
      focus: 'drivers, buffering, interrupts, and communication with hardware devices',
      outcomes: ['explain device drivers', 'describe interrupt handling', 'identify buffering use cases'],
      tools: ['interrupts', 'drivers', 'buffers', 'controllers'],
      concepts: ['I/O coordination', 'latency hiding', 'hardware abstraction', 'interrupt service'],
      lab: 'Trace how keyboard input and disk reads are handled by the operating system.',
      applications: ['embedded systems', 'desktop platforms', 'server hardware'],
    },
    {
      label: 'OS Security & Protection (1h)',
      title: 'OS Security & Protection',
      focus: 'user accounts, permissions, isolation, and operating system hardening',
      outcomes: ['describe protection mechanisms', 'explain permissions', 'recognize OS security risks'],
      tools: ['permissions', 'user accounts', 'protection rings', 'hardening'],
      concepts: ['isolation', 'access control', 'privilege separation', 'system integrity'],
      lab: 'Review a multi-user OS scenario and apply file and account protections.',
      applications: ['server hardening', 'enterprise desktops', 'multi-user platforms'],
    },
  ],
  'Software Engineering': [
    {
      label: 'Introduction to Software Engineering (1h)',
      title: 'Introduction to Software Engineering',
      focus: 'the disciplined development of software systems using engineering processes and quality standards',
      outcomes: ['define software engineering', 'describe why process matters', 'connect engineering practice to software quality'],
      tools: ['requirements', 'process', 'quality', 'lifecycle'],
      concepts: ['discipline', 'maintainability', 'teamwork', 'quality assurance'],
      lab: 'Analyze why a software project failed and map the missing engineering practices.',
      applications: ['enterprise apps', 'consulting projects', 'product teams'],
    },
    {
      label: 'Software Development Life Cycle (1h 30m)',
      title: 'Software Development Life Cycle',
      focus: 'phases of planning, analysis, design, implementation, testing, deployment, and maintenance',
      outcomes: ['name SDLC phases', 'explain their purpose', 'connect deliverables to project stages'],
      tools: ['analysis', 'design', 'implementation', 'maintenance'],
      concepts: ['lifecycle', 'deliverables', 'phase gates', 'traceability'],
      lab: 'Map a sample project to SDLC stages and expected outputs.',
      applications: ['client projects', 'internal tools', 'product releases'],
    },
    {
      label: 'Requirements Engineering (1h 30m)',
      title: 'Requirements Engineering',
      focus: 'eliciting, documenting, validating, and managing software requirements',
      outcomes: ['differentiate functional and non-functional requirements', 'capture stakeholder needs', 'reduce ambiguity'],
      tools: ['user stories', 'use cases', 'requirements specs', 'validation'],
      concepts: ['stakeholders', 'scope', 'constraints', 'acceptance criteria'],
      lab: 'Draft requirements for a student portal from stakeholder interviews.',
      applications: ['business systems', 'government systems', 'startup products'],
    },
    {
      label: 'Software Design & Architecture (1h 30m)',
      title: 'Software Design & Architecture',
      focus: 'structuring systems into components, layers, and maintainable interfaces',
      outcomes: ['describe architecture basics', 'identify components', 'evaluate modular design choices'],
      tools: ['architecture diagrams', 'components', 'interfaces', 'layers'],
      concepts: ['modularity', 'coupling', 'cohesion', 'separation of concerns'],
      lab: 'Create a layered design for a school fee management application.',
      applications: ['scalable apps', 'enterprise solutions', 'maintainable systems'],
    },
    {
      label: 'Agile & Project Management (1h)',
      title: 'Agile & Project Management',
      focus: 'iterative planning, teamwork, delivery tracking, and project coordination',
      outcomes: ['explain agile values', 'describe sprint planning', 'link management to delivery outcomes'],
      tools: ['sprints', 'backlogs', 'kanban', 'milestones'],
      concepts: ['iteration', 'feedback loops', 'planning', 'team coordination'],
      lab: 'Build a simple sprint backlog and release plan for a campus app.',
      applications: ['software teams', 'startup delivery', 'consulting engagements'],
    },
    {
      label: 'Version Control & Collaboration (1h)',
      title: 'Version Control & Collaboration',
      focus: 'source control, branching, merging, and team collaboration practices',
      outcomes: ['explain git workflows', 'describe branch usage', 'prevent common collaboration mistakes'],
      tools: ['git', 'branches', 'commits', 'pull requests'],
      concepts: ['history', 'branching', 'merge conflicts', 'collaboration'],
      lab: 'Simulate a small team workflow using feature branches and pull requests.',
      applications: ['team development', 'open source', 'release management'],
    },
    {
      label: 'Software Testing Fundamentals (1h 30m)',
      title: 'Software Testing Fundamentals',
      focus: 'test levels, defect detection, verification, and validation strategies',
      outcomes: ['differentiate unit and integration testing', 'explain validation', 'identify testing goals'],
      tools: ['unit tests', 'integration tests', 'test cases', 'assertions'],
      concepts: ['verification', 'validation', 'coverage', 'quality control'],
      lab: 'Write a basic test plan and sample unit tests for a calculator or login module.',
      applications: ['quality assurance', 'continuous delivery', 'reliable software'],
    },
    {
      label: 'Software Quality Assurance (1h)',
      title: 'Software Quality Assurance',
      focus: 'quality processes, reviews, standards, and defect prevention across the lifecycle',
      outcomes: ['describe QA activities', 'explain reviews and audits', 'link standards to quality improvement'],
      tools: ['reviews', 'quality metrics', 'standards', 'audits'],
      concepts: ['process quality', 'defect prevention', 'compliance', 'continuous improvement'],
      lab: 'Review a mini project against a quality checklist and propose improvements.',
      applications: ['regulated projects', 'enterprise delivery', 'testing organizations'],
    },
    {
      label: 'Maintenance & Evolution (1h)',
      title: 'Maintenance & Evolution',
      focus: 'keeping software useful through fixes, enhancements, refactoring, and adaptation',
      outcomes: ['define maintenance types', 'explain refactoring value', 'describe software evolution'],
      tools: ['refactoring', 'bug fixes', 'enhancements', 'technical debt'],
      concepts: ['corrective maintenance', 'adaptive maintenance', 'technical debt', 'code health'],
      lab: 'Review an aging codebase and classify needed maintenance actions.',
      applications: ['legacy systems', 'long-lived products', 'support contracts'],
    },
    {
      label: 'Software Engineering Capstone (1h)',
      title: 'Software Engineering Capstone',
      focus: 'integrating requirements, design, testing, delivery, and maintenance in a full project perspective',
      outcomes: ['synthesize prior topics', 'justify engineering choices', 'present a complete project workflow'],
      tools: ['project artifacts', 'plans', 'designs', 'test evidence'],
      concepts: ['end-to-end delivery', 'evidence of quality', 'team accountability', 'professional practice'],
      lab: 'Prepare a complete engineering proposal for a real software project from concept to maintenance.',
      applications: ['portfolio work', 'client proposals', 'final-year projects'],
    },
  ],
  'Web Development': [
    {
      label: 'Introduction to Web Development (1h)',
      title: 'Introduction to Web Development',
      focus: 'how the web works, browser-server interaction, and the main layers of web applications',
      outcomes: ['describe the web request cycle', 'differentiate frontend and backend roles', 'explain the browser-server model'],
      tools: ['browser', 'server', 'HTTP', 'URL'],
      concepts: ['request-response', 'rendering', 'resources', 'web architecture'],
      lab: 'Trace how a browser loads an HTML page with CSS and JavaScript assets.',
      applications: ['web apps', 'content platforms', 'business portals'],
    },
    {
      label: 'HTML & Semantic Structure (1h)',
      title: 'HTML & Semantic Structure',
      focus: 'document structure, semantic tags, accessibility basics, and content organization',
      outcomes: ['build semantic HTML', 'structure documents clearly', 'support accessible navigation'],
      tools: ['HTML', 'semantic tags', 'forms', 'headings'],
      concepts: ['structure', 'accessibility', 'semantics', 'document hierarchy'],
      lab: 'Create a semantic landing page for an academic department site.',
      applications: ['web pages', 'content systems', 'accessible interfaces'],
    },
    {
      label: 'CSS Layout & Responsive Design (1h 30m)',
      title: 'CSS Layout & Responsive Design',
      focus: 'styling, layout systems, responsiveness, and adaptation across devices',
      outcomes: ['use CSS layout tools', 'build responsive views', 'adapt content for multiple screens'],
      tools: ['CSS', 'Flexbox', 'Grid', 'media queries'],
      concepts: ['layout flow', 'responsiveness', 'spacing', 'visual hierarchy'],
      lab: 'Style a responsive dashboard that works on mobile and desktop.',
      applications: ['portfolios', 'client websites', 'web apps'],
    },
    {
      label: 'JavaScript Fundamentals (1h 30m)',
      title: 'JavaScript Fundamentals',
      focus: 'language basics, interactivity, DOM manipulation, and event-driven behavior',
      outcomes: ['write JavaScript logic', 'handle events', 'manipulate page content'],
      tools: ['JavaScript', 'DOM', 'events', 'functions'],
      concepts: ['variables', 'control flow', 'event handling', 'dynamic behavior'],
      lab: 'Build a small interactive page with validation and live updates.',
      applications: ['frontend apps', 'interactive pages', 'dynamic forms'],
    },
    {
      label: 'Frontend Framework Concepts (1h)',
      title: 'Frontend Framework Concepts',
      focus: 'component-based UI design, state, props, and frontend architecture ideas',
      outcomes: ['explain components', 'describe state-driven UI', 'identify framework benefits'],
      tools: ['components', 'state', 'props', 'routing'],
      concepts: ['reusability', 'composition', 'reactivity', 'UI architecture'],
      lab: 'Break a dashboard page into reusable UI components.',
      applications: ['single-page apps', 'admin panels', 'interactive platforms'],
    },
    {
      label: 'Backend Development Basics (1h 30m)',
      title: 'Backend Development Basics',
      focus: 'server logic, APIs, routing, data access, and business logic handling',
      outcomes: ['describe backend responsibilities', 'explain API routes', 'connect data to application behavior'],
      tools: ['APIs', 'routes', 'controllers', 'database access'],
      concepts: ['server processing', 'validation', 'business rules', 'data flow'],
      lab: 'Design simple API endpoints for users, services, and consultations.',
      applications: ['REST APIs', 'service backends', 'client-server apps'],
    },
    {
      label: 'Web Databases & Persistence (1h)',
      title: 'Web Databases & Persistence',
      focus: 'connecting web apps to databases and managing stored application state',
      outcomes: ['relate database design to web apps', 'explain persistence', 'identify common data patterns'],
      tools: ['ORMs', 'SQL', 'queries', 'persistence'],
      concepts: ['CRUD', 'schema mapping', 'storage', 'application state'],
      lab: 'Map a web form to database inserts and dashboard list retrieval.',
      applications: ['portals', 'dashboards', 'content management'],
    },
    {
      label: 'Authentication & Authorization (1h)',
      title: 'Authentication & Authorization',
      focus: 'identity verification, sessions, tokens, and role-based access in web systems',
      outcomes: ['differentiate authentication and authorization', 'explain session flow', 'identify role-based access rules'],
      tools: ['sessions', 'tokens', 'roles', 'permissions'],
      concepts: ['identity', 'access control', 'session lifecycle', 'user roles'],
      lab: 'Design login, owner-only dashboard access, and logout behavior for an app.',
      applications: ['secure dashboards', 'admin portals', 'multi-user platforms'],
    },
    {
      label: 'Deployment & Hosting (1h)',
      title: 'Deployment & Hosting',
      focus: 'publishing applications, environment configuration, and moving from local development to production',
      outcomes: ['describe deployment steps', 'explain environment variables', 'differentiate hosting roles'],
      tools: ['hosting', 'domains', 'builds', 'environment variables'],
      concepts: ['production deployment', 'configuration', 'hosting models', 'release flow'],
      lab: 'Outline a deployment plan for a frontend, backend, and database stack.',
      applications: ['cloud hosting', 'continuous delivery', 'production release'],
    },
    {
      label: 'Web Development Capstone (1h)',
      title: 'Web Development Capstone',
      focus: 'combining frontend, backend, data, security, and deployment into one complete web solution',
      outcomes: ['integrate prior modules', 'justify implementation choices', 'present a full-stack solution design'],
      tools: ['UI', 'API', 'database', 'deployment pipeline'],
      concepts: ['end-to-end systems', 'integration', 'user experience', 'delivery'],
      lab: 'Prepare a complete design for a departmental services portal from UI to deployment.',
      applications: ['portfolio projects', 'client sites', 'startup MVPs'],
    },
  ],
  'Computer Security': [
    {
      label: 'Introduction to Computer Security (1h)',
      title: 'Introduction to Computer Security',
      focus: 'security goals, threats, vulnerabilities, and the importance of protecting systems and information',
      outcomes: ['define security basics', 'identify common threats', 'explain why protection matters'],
      tools: ['CIA triad', 'threats', 'vulnerabilities', 'controls'],
      concepts: ['confidentiality', 'integrity', 'availability', 'risk'],
      lab: 'Analyze a simple breach scenario and identify the violated security goals.',
      applications: ['enterprise IT', 'web platforms', 'personal computing'],
    },
    {
      label: 'Cryptography Fundamentals (1h 30m)',
      title: 'Cryptography Fundamentals',
      focus: 'encryption, hashing, keys, and secure communication foundations',
      outcomes: ['differentiate encryption and hashing', 'describe symmetric and asymmetric models', 'relate crypto to security services'],
      tools: ['encryption', 'hashing', 'keys', 'certificates'],
      concepts: ['confidentiality', 'integrity checks', 'key exchange', 'digital signatures'],
      lab: 'Compare hashing and encryption use cases in password storage and secure messaging.',
      applications: ['HTTPS', 'password storage', 'digital trust'],
    },
    {
      label: 'Authentication & Access Control (1h)',
      title: 'Authentication & Access Control',
      focus: 'identity, login controls, user roles, and access governance',
      outcomes: ['explain authentication factors', 'describe access models', 'identify privilege control needs'],
      tools: ['MFA', 'RBAC', 'permissions', 'identity'],
      concepts: ['identity assurance', 'least privilege', 'authorization', 'accountability'],
      lab: 'Design account and permission rules for a university management platform.',
      applications: ['enterprise login systems', 'admin panels', 'cloud accounts'],
    },
    {
      label: 'Network Security Principles (1h 30m)',
      title: 'Network Security Principles',
      focus: 'defending network boundaries, traffic, and services from attack',
      outcomes: ['identify network threats', 'describe protective controls', 'link policy to defense'],
      tools: ['firewalls', 'IDS/IPS', 'segmentation', 'VPN'],
      concepts: ['perimeter defense', 'traffic inspection', 'segmentation', 'secure channels'],
      lab: 'Plan controls for a campus network with labs, offices, and remote users.',
      applications: ['enterprise networks', 'branch offices', 'remote access'],
    },
    {
      label: 'Web Application Security (1h 30m)',
      title: 'Web Application Security',
      focus: 'common web vulnerabilities and secure development practices',
      outcomes: ['recognize common web attacks', 'explain secure coding practices', 'link input handling to security'],
      tools: ['validation', 'sanitization', 'sessions', 'OWASP'],
      concepts: ['injection', 'XSS', 'session security', 'secure coding'],
      lab: 'Review a login and form flow for injection and session-related weaknesses.',
      applications: ['web platforms', 'e-commerce', 'client portals'],
    },
    {
      label: 'System Hardening & Endpoint Security (1h)',
      title: 'System Hardening & Endpoint Security',
      focus: 'reducing attack surfaces on hosts, devices, and operating environments',
      outcomes: ['describe hardening steps', 'identify insecure defaults', 'explain endpoint protection'],
      tools: ['patching', 'antivirus', 'configuration baselines', 'hardening'],
      concepts: ['attack surface', 'patch hygiene', 'baseline configuration', 'defense'],
      lab: 'Create a hardening checklist for a Windows or Linux workstation.',
      applications: ['enterprise endpoints', 'server maintenance', 'lab environments'],
    },
    {
      label: 'Security Monitoring & Incident Response (1h 30m)',
      title: 'Security Monitoring & Incident Response',
      focus: 'logs, alerts, detection, triage, and coordinated response to security incidents',
      outcomes: ['describe monitoring goals', 'explain incident stages', 'identify response actions'],
      tools: ['logs', 'alerts', 'SIEM', 'incident handling'],
      concepts: ['detection', 'triage', 'containment', 'recovery'],
      lab: 'Walk through an incident response plan for a compromised account or malware alert.',
      applications: ['SOC workflows', 'enterprise response', 'managed security services'],
    },
    {
      label: 'Digital Forensics Basics (1h)',
      title: 'Digital Forensics Basics',
      focus: 'preserving, collecting, and examining digital evidence responsibly',
      outcomes: ['define digital evidence', 'explain preservation needs', 'recognize basic forensic workflow'],
      tools: ['evidence', 'chain of custody', 'imaging', 'analysis'],
      concepts: ['preservation', 'integrity', 'documentation', 'investigation'],
      lab: 'Outline how to preserve evidence from a compromised workstation.',
      applications: ['incident investigation', 'compliance review', 'legal support'],
    },
    {
      label: 'Security Policy, Risk & Governance (1h)',
      title: 'Security Policy, Risk & Governance',
      focus: 'managing security through policies, risk assessment, and governance structures',
      outcomes: ['describe security policy roles', 'explain basic risk treatment', 'connect governance to security practice'],
      tools: ['policy', 'risk assessment', 'controls', 'governance'],
      concepts: ['risk management', 'compliance', 'policy enforcement', 'oversight'],
      lab: 'Draft a short acceptable use and password policy for an institution.',
      applications: ['organizational governance', 'audits', 'security programs'],
    },
    {
      label: 'Computer Security Capstone (1h)',
      title: 'Computer Security Capstone',
      focus: 'integrating preventive, detective, and corrective controls in a full security scenario',
      outcomes: ['synthesize prior topics', 'justify layered defense choices', 'present a basic security plan'],
      tools: ['security layers', 'controls', 'response plans', 'governance'],
      concepts: ['defense in depth', 'risk-driven design', 'resilience', 'accountability'],
      lab: 'Prepare a basic security architecture and response plan for a digital services platform.',
      applications: ['security proposals', 'capstone work', 'real-world readiness'],
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
    learningObjectives: [
      `Explain the main purpose of ${session.title}.`,
      `Describe the major concepts behind ${session.title}.`,
      `Apply the ideas in ${session.title} to labs, coursework, and practical computer science tasks.`,
      `Use the terminology of ${session.title} confidently in discussion and written work.`,
    ],
    sections: [
      {
        title: 'Topic Overview',
        subtopics: [
          {
            title: 'Session Focus',
            content: [
              `${session.title} centers on ${session.focus}.`,
              `This unit is positioned to support diploma and degree learners with both theoretical grounding and practical application.`,
            ],
          },
          {
            title: 'Learning Outcomes',
            content: session.outcomes.map((outcome) => `You should be able to ${outcome}.`),
          },
        ],
      },
      {
        title: 'Core Concepts',
        subtopics: [
          {
            title: 'Key Study Terms',
            content: session.tools.map((tool) => `${tool} is a core term you should be able to define and apply.`),
          },
          {
            title: 'Subtopic Breakdown',
            content: session.concepts.map((concept) => `${concept} is an essential subtopic within ${session.title}.`),
          },
        ],
      },
      {
        title: 'Practice & Application',
        subtopics: [
          {
            title: 'Laboratory Exercise',
            content: [session.lab],
          },
          {
            title: 'Real-World Relevance',
            content: session.applications.map((application) => `${session.title} supports work in ${application}.`),
          },
        ],
      },
    ],
    keyTerms: [...session.tools, ...session.concepts].slice(0, 8),
    practiceTasks: [
      session.lab,
      `Write short notes explaining how ${session.title} fits into the wider ${session.applications[0]} context.`,
      `Compare the theory in ${session.title} with one real project or support case you know.`,
    ],
    summaryPoints: [
      `${session.title} is a core session in this curriculum because it builds both theory and practical readiness.`,
      `The session connects key concepts such as ${session.concepts.slice(0, 3).join(', ')} to real computing work.`,
      `You should leave this lesson able to discuss ${session.outcomes[0]}, ${session.outcomes[1]}, and ${session.outcomes[2]}.`,
      `Before progressing, make sure you understand the key terms, practical exercise, and assessment questions.`,
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

function buildGenericTrackSessions(course: string) {
  return [
    `Introduction to ${course} (1h)`,
    `${course} Foundations (1h 30m)`,
    `${course} Core Components (1h 30m)`,
    `${course} Design & Architecture (1h 30m)`,
    `${course} Methods & Techniques (1h)`,
    `${course} Implementation Practice (1h 30m)`,
    `${course} Analysis & Troubleshooting (1h)`,
    `${course} Security & Best Practices (1h)`,
    `${course} Applications & Case Studies (1h 30m)`,
    `${course} Capstone Review (1h)`,
  ];
}

function buildGenericTrack(course: string): CurriculumSession[] {
  return buildGenericTrackSessions(course).map((label, index) => {
    const sessionTitle = label.replace(/\s*\([^)]*\)\s*$/, '').trim();
    return {
      label,
      title: sessionTitle,
      focus: `${course.toLowerCase()} principles, subtopics, workflows, and academic-practical links for computer science learners`,
      outcomes: [
        `explain the main ideas in ${sessionTitle}`,
        `connect ${sessionTitle} to coursework and lab tasks`,
        `apply ${sessionTitle} ideas to real computing scenarios`,
      ],
      tools: ['theory', 'practice', 'case studies', 'review'],
      concepts: [
        `${course} terminology`,
        `${course} workflow`,
        `${course} problem-solving`,
        `${course} professional application`,
      ],
      lab: `Prepare a structured exercise for ${sessionTitle} that combines explanation, analysis, and implementation steps.`,
      applications: ['coursework', 'projects', 'professional practice'],
    };
  });
}

function resolveTrackSessions(course: string): CurriculumSession[] {
  return curriculumTracks[course] || buildGenericTrack(course);
}

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
    learningObjectives: [
      `Describe the main purpose of ${sessionTitle}.`,
      `Identify the important ideas covered in ${sessionTitle}.`,
      `Relate the lesson to practical work in ${courseTitle}.`,
      `Prepare for review questions and certification checks based on ${sessionTitle}.`,
    ],
    sections: [
      {
        title: 'Topic Overview',
        subtopics: [
          {
            title: 'What This Session Covers',
            content: [
              `${sessionTitle} introduces foundational ideas used throughout the ${courseTitle} curriculum.`,
              `The purpose is to help the learner move from broad awareness into structured understanding.`,
            ],
          },
        ],
      },
      {
        title: 'Subtopics',
        subtopics: [
          {
            title: 'Core Principles',
            content: [
              `Identify the definitions, workflows, and reasoning patterns related to ${sessionTitle}.`,
              `Connect these principles to the larger ${courseTitle} learning path.`,
            ],
          },
          {
            title: 'Practical Context',
            content: [
              `Relate ${sessionTitle} to coursework, labs, service delivery, and project problem-solving.`,
              `Use examples and case studies to make the topic concrete and memorable.`,
            ],
          },
        ],
      },
    ],
    keyTerms: [courseTitle, sessionTitle, 'theory', 'practice', 'analysis', 'application'],
    practiceTasks: [
      `Prepare short notes summarizing the main ideas behind ${sessionTitle}.`,
      `List two practical scenarios where ${sessionTitle} would be useful in ${courseTitle}.`,
      `Discuss the topic with examples from projects, labs, or coursework.`,
    ],
    summaryPoints: [
      `${sessionTitle} introduces important ideas used throughout the ${courseTitle} curriculum.`,
      `The lesson should be understood both theoretically and practically.`,
      `The review and quiz stages are meant to confirm readiness before moving to the next session.`,
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

  const generatedTrack = resolveTrackSessions(course);
  const generatedSession = generatedTrack.find((entry) => entry.label === session);
  if (generatedSession) {
    return createLessonFromCurriculum(generatedSession);
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
  const sessionLabels = resolveTrackSessions(course).map((item) => item.label);
  const currentSessionIndex = sessionLabels.indexOf(session);
  const nextSessionLabel = currentSessionIndex >= 0 ? sessionLabels[currentSessionIndex + 1] || '' : '';
  const chapterNumber = currentSessionIndex >= 0 ? currentSessionIndex + 1 : 1;

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

            <div className="mb-6 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-2">
                Chapter {chapterNumber}{sessionLabels.length ? ` of ${sessionLabels.length}` : ''}
              </p>
              <h3 className="text-2xl font-bold text-white mb-2">{courseData.title}</h3>
              <p className="text-sm text-slate-200">
                This session is arranged like student notes: chapter overview, objectives, topic sections, subtopics, practice work, summary, then assessment.
              </p>
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

            <div className="mb-8 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
              <h3 className="text-lg font-semibold text-emerald-200 mb-4">Learning Objectives</h3>
              <div className="space-y-2">
                {courseData.learningObjectives.map((objective, idx) => (
                  <p key={idx} className="text-sm leading-relaxed text-slate-100">
                    {idx + 1}. {objective}
                  </p>
                ))}
              </div>
            </div>

            <div className="space-y-6 mb-8">
              {courseData.sections.map((section, sectionIdx) => (
                <div key={sectionIdx} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-lg font-semibold text-cyan-200 mb-4">{section.title}</h3>
                  <div className="space-y-4">
                    {section.subtopics.map((subtopic, subtopicIdx) => (
                      <div key={subtopicIdx} className="rounded-xl border border-white/10 bg-[#13233b] p-4">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-cyan-300 mb-3">
                          {subtopic.title}
                        </h4>
                        <div className="space-y-2">
                          {subtopic.content.map((item, itemIdx) => (
                            <p key={itemIdx} className="text-sm leading-relaxed text-slate-200">
                              {item}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2 mb-8">
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-5">
                <h3 className="text-lg font-semibold text-violet-200 mb-4">Key Terms</h3>
                <div className="flex flex-wrap gap-2">
                  {courseData.keyTerms.map((term, idx) => (
                    <span key={idx} className="rounded-full border border-violet-300/30 bg-[#13233b] px-3 py-1 text-sm text-violet-100">
                      {term}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5">
                <h3 className="text-lg font-semibold text-amber-200 mb-4">Practice Tasks</h3>
                <div className="space-y-2">
                  {courseData.practiceTasks.map((task, idx) => (
                    <p key={idx} className="text-sm leading-relaxed text-slate-100">
                      {idx + 1}. {task}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-8 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-5">
              <h3 className="text-lg font-semibold text-blue-200 mb-4">Session Summary</h3>
              <div className="space-y-2">
                {courseData.summaryPoints.map((point, idx) => (
                  <p key={idx} className="text-sm leading-relaxed text-slate-100">
                    {idx + 1}. {point}
                  </p>
                ))}
              </div>
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
