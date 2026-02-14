import type { Project, Notification } from '../types'

export const mockProjects: Project[] = [
  {
    id: 'proj-goclaw',
    name: 'GoClaw',
    path: '~/GitHub/goclaw',
    color: '#f97316',
    conversations: [
      {
        id: 'conv-gc-1',
        projectId: 'proj-goclaw',
        name: 'Fix claw scheduling bug',
        status: 'running',
        lastMessage: '> Running test suite... 42 tests passed',
        createdAt: '2026-02-14T09:00:00Z',
        unread: false,
        archived: false
      },
      {
        id: 'conv-gc-2',
        projectId: 'proj-goclaw',
        name: 'Add payment webhook',
        status: 'idle',
        lastMessage: '✓ Webhook endpoint created at /api/webhooks/stripe',
        createdAt: '2026-02-13T14:00:00Z',
        unread: true,
        archived: false
      }
    ]
  },
  {
    id: 'proj-cabgoai',
    name: 'CabgoAI',
    path: '~/GitHub/cabgoai',
    color: '#8b5cf6',
    conversations: [
      {
        id: 'conv-ca-1',
        projectId: 'proj-cabgoai',
        name: 'Implement ride matching',
        status: 'running',
        lastMessage: '> Optimizing matching algorithm with geospatial index...',
        createdAt: '2026-02-14T08:30:00Z',
        unread: false,
        archived: false
      },
      {
        id: 'conv-ca-2',
        projectId: 'proj-cabgoai',
        name: 'Driver dashboard UI',
        status: 'waiting',
        lastMessage: '? Which chart library do you prefer for the analytics panel?',
        createdAt: '2026-02-14T10:00:00Z',
        unread: true,
        archived: false
      },
      {
        id: 'conv-ca-3',
        projectId: 'proj-cabgoai',
        name: 'Push notification service',
        status: 'error',
        lastMessage: '✗ Firebase credentials expired. Update FIREBASE_KEY in .env',
        createdAt: '2026-02-12T16:00:00Z',
        unread: true,
        archived: false
      }
    ]
  },
  {
    id: 'proj-apphive',
    name: 'Apphive',
    path: '~/GitHub/apphive',
    color: '#06b6d4',
    conversations: [
      {
        id: 'conv-ah-1',
        projectId: 'proj-apphive',
        name: 'Refactor component engine',
        status: 'running',
        lastMessage: '> Migrating 23 components to new renderer...',
        createdAt: '2026-02-14T07:00:00Z',
        unread: false,
        archived: false
      },
      {
        id: 'conv-ah-2',
        projectId: 'proj-apphive',
        name: 'API rate limiting',
        status: 'idle',
        lastMessage: '✓ Rate limiter middleware added: 100 req/min per user',
        createdAt: '2026-02-11T09:00:00Z',
        unread: true,
        archived: false
      }
    ]
  },
  {
    id: 'proj-travo',
    name: 'Travo',
    path: '~/GitHub/travo',
    color: '#10b981',
    conversations: [
      {
        id: 'conv-tr-1',
        projectId: 'proj-travo',
        name: 'Itinerary generator',
        status: 'waiting',
        lastMessage: '? Should the AI suggest restaurants based on dietary preferences?',
        createdAt: '2026-02-14T11:00:00Z',
        unread: true,
        archived: false
      }
    ]
  },
  {
    id: 'proj-setwalk',
    name: 'Setwalk',
    path: '~/GitHub/setwalk',
    color: '#ec4899',
    conversations: [
      {
        id: 'conv-sw-1',
        projectId: 'proj-setwalk',
        name: 'Video pipeline optimization',
        status: 'idle',
        lastMessage: '✓ Encoding pipeline reduced from 45s to 12s per clip',
        createdAt: '2026-02-13T18:00:00Z',
        unread: true,
        archived: false
      },
      {
        id: 'conv-sw-2',
        projectId: 'proj-setwalk',
        name: 'Scene detection ML model',
        status: 'running',
        lastMessage: '> Training epoch 14/50 — accuracy: 94.2%',
        createdAt: '2026-02-14T06:00:00Z',
        unread: false
      }
    ]
  },
  {
    id: 'proj-holoapi',
    name: 'Holo API',
    path: '~/GitHub/holo-api',
    color: '#eab308',
    conversations: [
      {
        id: 'conv-ha-1',
        projectId: 'proj-holoapi',
        name: 'Content pipeline automation',
        status: 'idle',
        lastMessage: '✓ Pipeline: Ideacion → Mercado → Estrategia → Formatos',
        createdAt: '2026-02-10T12:00:00Z',
        unread: false,
        archived: false
      },
      {
        id: 'conv-ha-2',
        projectId: 'proj-holoapi',
        name: 'Lipsync integration',
        status: 'error',
        lastMessage: '✗ WaveSpeed upstream credits exhausted',
        createdAt: '2026-02-13T20:00:00Z',
        unread: true,
        archived: false
      }
    ]
  }
]

export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    conversationId: 'conv-gc-1',
    projectName: 'GoClaw',
    conversationName: 'Fix claw scheduling bug',
    message: 'All 42 tests passed successfully',
    type: 'success',
    read: false,
    timestamp: '2026-02-14T13:15:00Z'
  },
  {
    id: 'notif-2',
    conversationId: 'conv-ca-3',
    projectName: 'CabgoAI',
    conversationName: 'Push notification service',
    message: 'Firebase credentials expired',
    type: 'error',
    read: false,
    timestamp: '2026-02-14T12:30:00Z'
  },
  {
    id: 'notif-3',
    conversationId: 'conv-ca-2',
    projectName: 'CabgoAI',
    conversationName: 'Driver dashboard UI',
    message: 'Waiting for input: chart library preference',
    type: 'warning',
    read: false,
    timestamp: '2026-02-14T12:00:00Z'
  },
  {
    id: 'notif-4',
    conversationId: 'conv-ah-1',
    projectName: 'Apphive',
    conversationName: 'Refactor component engine',
    message: 'Migration progress: 18/23 components done',
    type: 'info',
    read: true,
    timestamp: '2026-02-14T11:00:00Z'
  }
]

export const mockTerminalOutputs: Record<string, string[]> = {
  'conv-gc-1': [
    '\x1b[90m$ claude "Fix the scheduling bug in claw_scheduler.py"\x1b[0m',
    '',
    '\x1b[36m●\x1b[0m Analyzing claw_scheduler.py...',
    '',
    'Found the issue: the cron expression parser doesn\'t handle',
    'timezone offsets correctly. The `next_run` calculation uses',
    'UTC but the user\'s schedule is in local time.',
    '',
    '\x1b[33mFix:\x1b[0m Update `calculate_next_run()` to accept a timezone parameter.',
    '',
    '```python',
    'def calculate_next_run(cron_expr: str, tz: str = "UTC") -> datetime:',
    '    local_tz = pytz.timezone(tz)',
    '    now = datetime.now(local_tz)',
    '    return croniter(cron_expr, now).get_next(datetime)',
    '```',
    '',
    '\x1b[32m✓\x1b[0m Updated claw_scheduler.py',
    '\x1b[32m✓\x1b[0m Updated tests/test_scheduler.py',
    '',
    '\x1b[90m$ Running test suite...\x1b[0m',
    '\x1b[32m  ✓\x1b[0m test_utc_schedule (0.02s)',
    '\x1b[32m  ✓\x1b[0m test_local_timezone (0.03s)',
    '\x1b[32m  ✓\x1b[0m test_dst_transition (0.05s)',
    '\x1b[32m  ✓\x1b[0m test_invalid_timezone (0.01s)',
    '',
    '\x1b[32m42 tests passed\x1b[0m, 0 failed — 1.2s',
    ''
  ],
  'conv-ca-1': [
    '\x1b[90m$ claude "Implement the ride matching algorithm"\x1b[0m',
    '',
    '\x1b[36m●\x1b[0m I\'ll implement a geospatial ride matching system.',
    '',
    'Creating the matching engine with these components:',
    '  1. R-tree spatial index for driver locations',
    '  2. Haversine distance calculation',
    '  3. ETA estimation using road network graph',
    '  4. Score-based ranking (distance + rating + acceptance rate)',
    '',
    '```typescript',
    'interface MatchResult {',
    '  driverId: string;',
    '  distance: number;  // km',
    '  eta: number;       // minutes',
    '  score: number;     // 0-100',
    '}',
    '```',
    '',
    '\x1b[32m✓\x1b[0m Created src/matching/spatial-index.ts',
    '\x1b[32m✓\x1b[0m Created src/matching/scorer.ts',
    '\x1b[36m●\x1b[0m Optimizing matching algorithm with geospatial index...',
    ''
  ],
  'conv-ca-2': [
    '\x1b[90m$ claude "Build the driver analytics dashboard"\x1b[0m',
    '',
    '\x1b[36m●\x1b[0m Setting up the dashboard layout with:',
    '  - Ride history table with filters',
    '  - Earnings chart (daily/weekly/monthly)',
    '  - Heat map of popular pickup zones',
    '  - Rating trend line',
    '',
    '\x1b[33m?\x1b[0m Which chart library do you prefer for the analytics panel?',
    '  \x1b[36m1.\x1b[0m Recharts (React-native, composable)',
    '  \x1b[36m2.\x1b[0m Chart.js (lightweight, canvas-based)',
    '  \x1b[36m3.\x1b[0m D3.js (maximum flexibility)',
    '',
    'Waiting for your response...',
    ''
  ],
  'conv-ca-3': [
    '\x1b[90m$ claude "Set up push notification service"\x1b[0m',
    '',
    '\x1b[36m●\x1b[0m Configuring Firebase Cloud Messaging...',
    '',
    '\x1b[32m✓\x1b[0m Created src/notifications/fcm-client.ts',
    '\x1b[32m✓\x1b[0m Created src/notifications/templates.ts',
    '',
    '\x1b[31m✗ Error: Firebase authentication failed\x1b[0m',
    '',
    '  The FIREBASE_KEY in your .env file has expired.',
    '  Go to Firebase Console → Project Settings → Service Accounts',
    '  to generate a new private key.',
    '',
    '\x1b[31m  Error code: auth/invalid-credential\x1b[0m',
    ''
  ],
  'conv-ah-1': [
    '\x1b[90m$ claude "Refactor the component rendering engine"\x1b[0m',
    '',
    '\x1b[36m●\x1b[0m Analyzing the current component engine...',
    '',
    'Current architecture issues:',
    '  - Components re-render entire tree on state change',
    '  - No virtual DOM diffing — direct DOM manipulation',
    '  - Event handlers leak memory on component unmount',
    '',
    'Migration plan:',
    '  1. Create new VNode-based renderer',
    '  2. Implement efficient tree diffing',
    '  3. Add lifecycle hooks (mount/update/unmount)',
    '  4. Migrate components one-by-one',
    '',
    '\x1b[32m✓\x1b[0m Created src/renderer/vnode.ts',
    '\x1b[32m✓\x1b[0m Created src/renderer/diff.ts',
    '\x1b[32m✓\x1b[0m Migrated: Button, Input, Select (3/23)',
    '\x1b[32m✓\x1b[0m Migrated: Modal, Drawer, Toast (6/23)',
    '\x1b[32m✓\x1b[0m Migrated: Table, List, Grid (9/23)',
    '\x1b[32m✓\x1b[0m Migrated: Form, Checkbox, Radio (12/23)',
    '\x1b[32m✓\x1b[0m Migrated: Tabs, Accordion, Menu (15/23)',
    '\x1b[32m✓\x1b[0m Migrated: Card, Badge, Avatar (18/23)',
    '\x1b[36m●\x1b[0m Migrating 23 components to new renderer...',
    ''
  ],
  'conv-ah-2': [
    '\x1b[90m$ claude "Add API rate limiting middleware"\x1b[0m',
    '',
    '\x1b[36m●\x1b[0m Implementing token bucket rate limiter...',
    '',
    '```typescript',
    'const rateLimiter = new TokenBucket({',
    '  capacity: 100,      // max tokens',
    '  refillRate: 100,     // tokens per minute',
    '  keyExtractor: (req) => req.user.id',
    '});',
    '```',
    '',
    '\x1b[32m✓\x1b[0m Created src/middleware/rate-limiter.ts',
    '\x1b[32m✓\x1b[0m Added Redis backing store for distributed limits',
    '\x1b[32m✓\x1b[0m Added rate limit headers (X-RateLimit-*)',
    '\x1b[32m✓\x1b[0m Rate limiter middleware added: 100 req/min per user',
    ''
  ],
  'conv-tr-1': [
    '\x1b[90m$ claude "Build an AI itinerary generator"\x1b[0m',
    '',
    '\x1b[36m●\x1b[0m Creating the itinerary generation pipeline...',
    '',
    'Architecture:',
    '  - Input: destination, dates, interests, budget',
    '  - LLM generates day-by-day plan',
    '  - Google Places API validates venues',
    '  - Routing optimizer orders stops efficiently',
    '',
    '\x1b[32m✓\x1b[0m Created src/itinerary/generator.ts',
    '\x1b[32m✓\x1b[0m Created src/itinerary/places-validator.ts',
    '',
    '\x1b[33m?\x1b[0m Should the AI suggest restaurants based on dietary',
    '  preferences? This would add ~2s to generation time',
    '  but significantly improve personalization.',
    '',
    'Waiting for your response...',
    ''
  ],
  'conv-sw-1': [
    '\x1b[90m$ claude "Optimize the video encoding pipeline"\x1b[0m',
    '',
    '\x1b[36m●\x1b[0m Profiling the current pipeline...',
    '',
    'Bottlenecks found:',
    '  - Sequential frame extraction (18s)',
    '  - Redundant color space conversions (12s)',
    '  - Unoptimized FFmpeg flags (15s)',
    '',
    'Optimizations applied:',
    '\x1b[32m  ✓\x1b[0m Parallel frame extraction with worker pool (-14s)',
    '\x1b[32m  ✓\x1b[0m Direct YUV→H.264 pipeline (-10s)',
    '\x1b[32m  ✓\x1b[0m Hardware-accelerated encoding with VideoToolbox (-9s)',
    '',
    '\x1b[32m✓\x1b[0m Encoding pipeline reduced from 45s to 12s per clip',
    ''
  ],
  'conv-sw-2': [
    '\x1b[90m$ claude "Train the scene detection model"\x1b[0m',
    '',
    '\x1b[36m●\x1b[0m Setting up training pipeline...',
    '',
    'Model: ResNet-50 backbone + custom scene classifier head',
    'Dataset: 12,400 labeled video segments across 8 scene types',
    'Training config: lr=1e-4, batch=32, epochs=50',
    '',
    '  Epoch  1/50 — loss: 2.145 — acc: 45.2%',
    '  Epoch  5/50 — loss: 1.023 — acc: 72.1%',
    '  Epoch 10/50 — loss: 0.512 — acc: 85.7%',
    '  Epoch 14/50 — loss: 0.301 — acc: 94.2%',
    '\x1b[36m●\x1b[0m Training in progress...',
    ''
  ],
  'conv-ha-1': [
    '\x1b[90m$ claude "Automate the content pipeline"\x1b[0m',
    '',
    '\x1b[36m●\x1b[0m Building automation for the 4-stage pipeline:',
    '  Ideación → Mercado → Estrategia → Formatos',
    '',
    '\x1b[32m✓\x1b[0m Created pipeline orchestrator',
    '\x1b[32m✓\x1b[0m Integrated Holo API for generation',
    '\x1b[32m✓\x1b[0m Added Metricool scheduling',
    '\x1b[32m✓\x1b[0m Pipeline: Ideación → Mercado → Estrategia → Formatos',
    ''
  ],
  'conv-ha-2': [
    '\x1b[90m$ claude "Fix lipsync integration"\x1b[0m',
    '',
    '\x1b[36m●\x1b[0m Checking WaveSpeed lipsync service...',
    '',
    '\x1b[32m✓\x1b[0m API connection OK',
    '\x1b[32m✓\x1b[0m Authentication valid',
    '\x1b[31m✗\x1b[0m Credit balance: 0 remaining',
    '',
    '\x1b[31m✗ WaveSpeed upstream credits exhausted\x1b[0m',
    '',
    '  The lipsync provider has run out of credits.',
    '  Contact WaveSpeed support or top up the account at:',
    '  https://wavespeed.ai/dashboard/billing',
    ''
  ]
}
