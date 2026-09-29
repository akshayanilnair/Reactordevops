import { eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { hindsightBanks, hindsightMemories } from '../../db/schema.js';
import { HindsightMemory, HindsightBank, MemoryGraph } from '../types/reactor.js';

// Initial seed organizational memories reflecting rich engineering deployment history
export const INITIAL_MEMORIES: HindsightMemory[] = [
  {
    id: 'mem-deploy-1',
    bankId: 'reactor-production-memory',
    title: 'Deployment #1: pg Postgres driver 8.7 -> 8.11 TLS renegotiation failure',
    content: `Deployment #1 updated 'pg' from 8.7.3 to 8.11.1 in checkout-api service. In production, AWS RDS PostgreSQL required TLS with specific SSL certificate bundle. The newer pg driver enforced strict TLS handshake rejectUnauthorized by default, causing ECONNRESET errors under production traffic spikes. Primary database connection pool completely drained in 4 minutes, causing checkout gateway 502 errors.
Root cause: pg 8.8+ changed default TLS rejection behaviour for self-signed or intermediate RDS certificates.
Resolution: Replaced config with rejectUnauthorized: false using AWS global-bundle.pem cert file and tuned connection pool max clients down from 25 to 12 with idleTimeoutMillis=10000. Fix was verified in production.`,
    summary: 'pg driver upgrade caused strict TLS handshake failure on RDS PostgreSQL connection pool during peak load. Resolved via AWS CA bundle and connection pool tuning.',
    timestamp: '2026-08-14T09:20:00Z',
    tags: ['pg', 'postgres', 'tls', 'econnreset', 'connection-pool', 'checkout-api', 'dependency-upgrade', 'aws-rds'],
    metadata: {
      deploymentId: 'dep-1',
      deploymentNumber: 1,
      service: 'checkout-api',
      environment: 'production',
      rootCause: 'pg v8.8+ default TLS validation change incompatible with RDS certificate chain under pooling',
      resolution: 'Specified AWS global-bundle.pem in ssl config, tuned pool size to 12, added keepAlive: true',
      verifiedFix: true,
      downstreamEffects: ['billing-worker', 'order-fulfillment-stream', 'payment-gateway-proxy'],
      riskScore: 92,
      category: 'dependency_breakage'
    },
    associations: ['mem-deploy-11', 'mem-deploy-22'],
    recallCount: 14,
    importance: 0.95
  },
  {
    id: 'mem-deploy-5',
    bankId: 'reactor-production-memory',
    title: 'Deployment #5: Stripe SDK v11 -> v14 Breaking Webhook Verification',
    content: `Upgraded stripe-node SDK across billing-worker. Stripe v14 introduced asynchronous constructEvent method and changed rawBody middleware handling. Production webhooks failed signature validation, silently rejecting 1,420 subscription renew events over a 2-hour window.
Root cause: Express express.json() consumed raw buffer prior to Stripe webhook signature verification.
Resolution: Mounted raw body parser middleware strictly before standard JSON parser for /api/webhooks/stripe route. Fix verified.`,
    summary: 'Stripe v14 upgrade broke webhook signature verification due to Express body-parser buffer consumption.',
    timestamp: '2026-08-21T14:10:00Z',
    tags: ['stripe', 'billing-worker', 'webhooks', 'signature-verification', 'raw-body', 'dependency-upgrade'],
    metadata: {
      deploymentId: 'dep-5',
      deploymentNumber: 5,
      service: 'billing-worker',
      environment: 'production',
      rootCause: 'Stripe v14 requires pristine raw body buffer; Express json() body parser altered stream',
      resolution: 'Used express.raw({ type: "application/json" }) strictly for webhook endpoint',
      verifiedFix: true,
      downstreamEffects: ['subscription-db', 'customer-portal'],
      riskScore: 88,
      category: 'dependency_breakage'
    },
    associations: ['mem-deploy-1'],
    recallCount: 8,
    importance: 0.88
  },
  {
    id: 'mem-deploy-11',
    bankId: 'reactor-production-memory',
    title: 'Deployment #11: Redis connection pool timeout decreased to 100ms',
    content: `Configuration change in auth-gateway lowered REDIS_CONNECT_TIMEOUT_MS from 1500ms to 100ms to fail fast. During network jitter between Kubernetes nodes and AWS ElastiCache, 18% of session validations timed out, cascading into database read-replica stampedes and 504 Gateway Timeouts.
Root cause: Aggressive 100ms timeout did not accommodate cross-AZ network latency during intermittent cloud packet retransmits.
Resolution: Reverted timeout to 1200ms with exponential backoff retry and circuit breaker fallback to JWT local verification. Fix verified.`,
    summary: 'Redis fail-fast timeout of 100ms caused cascading session authentication failures during cross-AZ jitter.',
    timestamp: '2026-08-30T16:45:00Z',
    tags: ['redis', 'auth-gateway', 'timeout', 'connection-pool', 'circuit-breaker', 'elasticache'],
    metadata: {
      deploymentId: 'dep-11',
      deploymentNumber: 11,
      service: 'auth-gateway',
      environment: 'production',
      rootCause: 'Aggressive 100ms Redis connection timeout triggered stampede during cross-AZ packet variance',
      resolution: 'Restored 1200ms timeout with circuit breaker pattern and local fallback cache',
      verifiedFix: true,
      downstreamEffects: ['all-microservices', 'customer-dashboard'],
      riskScore: 84,
      category: 'infra_misconfig'
    },
    associations: ['mem-deploy-1'],
    recallCount: 11,
    importance: 0.86
  },
  {
    id: 'mem-deploy-18',
    bankId: 'reactor-production-memory',
    title: 'Deployment #18: Kubernetes pod memory limit reduction with Node 20 runtime',
    content: `Helm chart update lowered container memory limits from 1Gi to 384Mi for recommendation-engine to cut cluster spend. Following deployment, Node.js 20 V8 garbage collector heap expansion exceeded 384Mi during cold startup module compilation, resulting in continuous OOMKilled crash loops.
Root cause: Node 20 default max_old_space_size exceeds 384Mi unless explicitly capped via NODE_OPTIONS='--max-old-space-size=256'.
Resolution: Restored container limit to 768Mi and passed explicit --max-old-space-size=512 flag in entrypoint. Fix verified.`,
    summary: 'Container memory limit reduction caused Node.js 20 pods to OOMKill during JIT heap compilation on boot.',
    timestamp: '2026-09-08T11:00:00Z',
    tags: ['kubernetes', 'oomkilled', 'node20', 'memory-limit', 'helm', 'docker'],
    metadata: {
      deploymentId: 'dep-18',
      deploymentNumber: 18,
      service: 'recommendation-engine',
      environment: 'production',
      rootCause: 'Node 20 runtime heap allocation default exceeded tight 384Mi Kubernetes cgroup limit',
      resolution: 'Set container limits to 768Mi with --max-old-space-size=512 and tuned pod anti-affinity',
      verifiedFix: true,
      downstreamEffects: ['search-service', 'home-feed-api'],
      riskScore: 89,
      category: 'runtime_crash'
    },
    associations: ['mem-deploy-11'],
    recallCount: 9,
    importance: 0.90
  },
  {
    id: 'mem-deploy-22',
    bankId: 'reactor-production-memory',
    title: 'Deployment #22: Prisma migration adding NOT NULL column without DEFAULT value',
    content: `Prisma schema migration added 'account_tier' VARCHAR NOT NULL to users table without default value. Migration acquired ACCESS EXCLUSIVE table lock on production PostgreSQL table with 12M rows. The table lock blocked all active read queries for 47 seconds, exhausting pool connections and triggering site-wide 503s.
Root cause: Adding non-null column without default on Postgres <11 or with complex constraints locks table for full rewrite.
Resolution: Split migration into two steps: 1) Add column as nullable, 2) Backfill in batches of 5000 rows, 3) Add NOT NULL constraint with VALIDATE CONSTRAINT. Fix verified.`,
    summary: 'Prisma migration with NOT NULL column locked 12M user table for 47s, exhausting database pool connections.',
    timestamp: '2026-09-17T08:30:00Z',
    tags: ['prisma', 'postgres', 'migration', 'table-lock', 'zero-downtime-db', 'users-table'],
    metadata: {
      deploymentId: 'dep-22',
      deploymentNumber: 22,
      service: 'user-service',
      environment: 'production',
      rootCause: 'ACCESS EXCLUSIVE lock during column addition without default on high-traffic table',
      resolution: 'Adopted expand-contract zero downtime migration pattern with batch backfill script',
      verifiedFix: true,
      downstreamEffects: ['auth-gateway', 'checkout-api', 'customer-dashboard'],
      riskScore: 95,
      category: 'db_drift'
    },
    associations: ['mem-deploy-1'],
    recallCount: 16,
    importance: 0.96
  },
  {
    id: 'mem-deploy-24',
    bankId: 'reactor-production-memory',
    title: 'Deployment #24: Safe Kafka message batching and retry queue implementation',
    content: `Refactored notification-service Kafka consumer to use dead letter queues (DLQ) and exponential backoff retry. Successfully handled upstream message burst of 45,000 notifications without dropping connections or overloading worker threads.
Root cause: Previous implementation lacked dead-letter isolation.
Resolution: Validated circuit-breaker and DLQ routing. Zero customer impact during downstream SMTP downtime. Fix verified.`,
    summary: 'Safe rollout of Kafka dead-letter queues and backoff retry in notification service prevented message drops.',
    timestamp: '2026-09-22T13:15:00Z',
    tags: ['kafka', 'notification-service', 'dead-letter-queue', 'resilience', 'safe-pattern'],
    metadata: {
      deploymentId: 'dep-24',
      deploymentNumber: 24,
      service: 'notification-service',
      environment: 'production',
      rootCause: 'None - proactive resilience hardening',
      resolution: 'Full integration test suite and canary rollout at 10% traffic over 45 minutes',
      verifiedFix: true,
      downstreamEffects: ['email-gateway', 'sms-provider'],
      riskScore: 18,
      category: 'safe_pattern'
    },
    associations: ['mem-deploy-5'],
    recallCount: 4,
    importance: 0.72
  }
];

export const INITIAL_BANKS: HindsightBank[] = [
  {
    id: 'reactor-production-memory',
    name: 'Production Core Memory Bank',
    description: 'Long-term organizational memory of all production deployments, incidents, and verified resolutions.',
    memoryCount: INITIAL_MEMORIES.length,
    lastRetentionAt: new Date().toISOString()
  },
  {
    id: 'database-migrations-bank',
    name: 'Database & Data Layer Memory',
    description: 'Specialized historical memory bank for schema migrations, locking patterns, and query performance drifts.',
    memoryCount: 8,
    lastRetentionAt: new Date().toISOString()
  },
  {
    id: 'infrastructure-k8s-bank',
    name: 'Kubernetes & Cloud Infra Memory',
    description: 'Cluster manifests, resource quotas, OOM patterns, network policies, and egress gateway experiences.',
    memoryCount: 6,
    lastRetentionAt: new Date().toISOString()
  }
];

export class HindsightMemoryEngine {
  private banks: Map<string, HindsightBank> = new Map();
  private memories: Map<string, HindsightMemory> = new Map();

  private async hydrate() {
    const [count] = await db.select({ value: sql<number>`count(*)::int` }).from(hindsightMemories);
    if (count.value === 0) {
      await db.transaction(async tx => {
        await tx.insert(hindsightBanks).values(INITIAL_BANKS.map(data => ({ id: data.id, data }))).onConflictDoNothing();
        await tx.insert(hindsightMemories).values(INITIAL_MEMORIES.map(data => ({ id: data.id, bankId: data.bankId, data }))).onConflictDoNothing();
      });
    }
    this.banks.clear();
    this.memories.clear();
    (await db.select().from(hindsightBanks)).forEach(row => this.banks.set(row.id, row.data));
    (await db.select().from(hindsightMemories)).forEach(row => this.memories.set(row.id, row.data));
  }

  private async persist() {
    await db.transaction(async tx => {
      for (const bank of this.banks.values()) await tx.insert(hindsightBanks).values({ id: bank.id, data: bank }).onConflictDoUpdate({ target: hindsightBanks.id, set: { data: bank, updatedAt: new Date() } });
      for (const memory of this.memories.values()) await tx.insert(hindsightMemories).values({ id: memory.id, bankId: memory.bankId, data: memory }).onConflictDoUpdate({ target: hindsightMemories.id, set: { bankId: memory.bankId, data: memory, updatedAt: new Date() } });
    });
  }

  // --- CORE HINDSIGHT PRIMITIVES ---

  /**
   * Retain a memory into a Hindsight Bank.
   * This represents the permanent organizational memory write operation.
   */
  public async retain(params: {
    bankId?: string;
    title: string;
    content: string;
    summary?: string;
    tags?: string[];
    metadata?: Partial<HindsightMemory['metadata']>;
    associations?: string[];
    importance?: number;
  }): Promise<HindsightMemory> {
    await this.hydrate();
    const bankId = params.bankId || 'reactor-production-memory';
    const id = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Auto-synthesize summary if not provided
    const summary = params.summary || (params.content.length > 180 ? params.content.slice(0, 177) + '...' : params.content);
    
    const memory: HindsightMemory = {
      id,
      bankId,
      title: params.title,
      content: params.content,
      summary,
      timestamp: new Date().toISOString(),
      tags: params.tags || [],
      metadata: {
        category: params.metadata?.category || 'dependency_breakage',
        verifiedFix: params.metadata?.verifiedFix ?? true,
        ...params.metadata
      },
      associations: params.associations || [],
      recallCount: 0,
      importance: params.importance ?? 0.85
    };

    // If there are tags or service associations, automatically link related memories
    const existing = Array.from(this.memories.values());
    for (const other of existing) {
      if (other.id !== id) {
        const sharedTags = memory.tags.filter(t => other.tags.includes(t));
        const sameService = memory.metadata.service && other.metadata.service === memory.metadata.service;
        if (sharedTags.length >= 2 || sameService) {
          if (!memory.associations.includes(other.id)) {
            memory.associations.push(other.id);
          }
          if (!other.associations.includes(id)) {
            other.associations.push(id);
          }
        }
      }
    }

    this.memories.set(id, memory);

    // Update bank metrics
    const bank = this.banks.get(bankId) || {
      id: bankId,
      name: bankId,
      description: 'Dynamic organizational memory bank',
      memoryCount: 0,
      lastRetentionAt: new Date().toISOString()
    };
    bank.memoryCount = Array.from(this.memories.values()).filter(m => m.bankId === bankId).length;
    bank.lastRetentionAt = new Date().toISOString();
    this.banks.set(bankId, bank);

    await this.persist();

    // Check if external Hindsight Cloud endpoint configured
    await this.tryForwardToExternalHindsight(memory);

    return memory;
  }

  /**
   * Recall memories relevant to a deployment query.
   * Employs TF-IDF term-weighting, n-gram lexical overlap, and tag boosting.
   */
  public async recall(params: {
    bankId?: string;
    query: string;
    threshold?: number;
    topK?: number;
    tags?: string[];
  }): Promise<{
    memories: { memory: HindsightMemory; score: number; matchReasons: string[] }[];
    query: string;
    totalRecalled: number;
    latencyMs: number;
  }> {
    await this.hydrate();
    const startTime = Date.now();
    const bankId = params.bankId;
    const threshold = params.threshold ?? 0.25;
    const topK = params.topK ?? 5;
    const searchTags = (params.tags || []).map(t => t.toLowerCase());

    const queryTokens = this.tokenize(params.query);
    const candidateMemories = Array.from(this.memories.values()).filter(m => {
      if (bankId && m.bankId !== bankId) return false;
      return true;
    });

    const scored = candidateMemories.map(mem => {
      const matchReasons: string[] = [];
      const memTokens = this.tokenize(`${mem.title} ${mem.content} ${mem.tags.join(' ')} ${mem.metadata.rootCause || ''}`);
      
      // Calculate token match ratio
      let sharedTokenCount = 0;
      for (const qt of queryTokens) {
        if (memTokens.has(qt)) {
          sharedTokenCount++;
        }
      }
      const tokenScore = queryTokens.size > 0 ? (sharedTokenCount / queryTokens.size) : 0;

      // Tag overlap score
      let tagScore = 0;
      const memTagsLower = mem.tags.map(t => t.toLowerCase());
      for (const st of searchTags) {
        if (memTagsLower.includes(st)) {
          tagScore += 0.35;
          matchReasons.push(`Direct tag match: '${st}'`);
        }
      }

      // Check specific domain matches
      if (params.query.toLowerCase().includes('pg') && memTagsLower.includes('pg')) {
        tagScore += 0.3;
        matchReasons.push("Matched historical PostgreSQL driver 'pg' footprint");
      }
      if (params.query.toLowerCase().includes('postgres') && (memTagsLower.includes('postgres') || memTagsLower.includes('aws-rds'))) {
        tagScore += 0.25;
        matchReasons.push("Matched PostgreSQL RDS failure memory");
      }
      if (params.query.toLowerCase().includes('redis') && memTagsLower.includes('redis')) {
        tagScore += 0.3;
        matchReasons.push("Matched Redis caching & connection timeout pattern");
      }
      if (params.query.toLowerCase().includes('stripe') && memTagsLower.includes('stripe')) {
        tagScore += 0.3;
        matchReasons.push("Matched Stripe SDK webhook signature breakage");
      }
      if (params.query.toLowerCase().includes('prisma') && memTagsLower.includes('prisma')) {
        tagScore += 0.3;
        matchReasons.push("Matched Prisma zero-downtime migration lock issue");
      }
      if (params.query.toLowerCase().includes('kubernetes') && memTagsLower.includes('kubernetes')) {
        tagScore += 0.3;
        matchReasons.push("Matched Kubernetes container resource / OOM crash history");
      }

      // Combine weights
      const totalScore = Math.min(1.0, (tokenScore * 0.55) + (tagScore * 0.45) + (mem.importance * 0.1));

      if (sharedTokenCount > 0) {
        matchReasons.push(`Overlapped ${sharedTokenCount} conceptual tokens with incident history`);
      }

      return {
        memory: mem,
        score: Math.round(totalScore * 100) / 100,
        matchReasons
      };
    });

    // Filter by threshold and sort descending
    const filtered = scored
      .filter(item => item.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    // Increment recall count on retrieved memories
    filtered.forEach(item => {
      item.memory.recallCount = (item.memory.recallCount || 0) + 1;
    });
    await this.persist();

    const latencyMs = Date.now() - startTime;

    return {
      memories: filtered,
      query: params.query,
      totalRecalled: filtered.length,
      latencyMs
    };
  }

  public async listBanks(): Promise<HindsightBank[]> {
    await this.hydrate();
    return Array.from(this.banks.values());
  }

  public async getAllMemories(): Promise<HindsightMemory[]> {
    await this.hydrate();
    return Array.from(this.memories.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getMemoryById(id: string): HindsightMemory | undefined {
    return this.memories.get(id);
  }

  public async getMemoryGraph(): Promise<MemoryGraph> {
    await this.hydrate();
    const nodes: MemoryGraph['nodes'] = [];
    const edges: MemoryGraph['edges'] = [];

    const all = Array.from(this.memories.values());
    for (const mem of all) {
      nodes.push({
        id: mem.id,
        label: mem.title.split(':')[0] || mem.title,
        category: mem.metadata.category,
        size: Math.max(12, Math.min(32, 12 + (mem.recallCount * 1.5))),
        service: mem.metadata.service || 'platform',
        deploymentNumber: mem.metadata.deploymentNumber
      });

      for (const assocId of mem.associations) {
        // Only add forward edge to avoid duplicates
        if (mem.id < assocId && this.memories.has(assocId)) {
          edges.push({
            source: mem.id,
            target: assocId,
            relation: 'historical_correlation',
            weight: 0.75
          });
        }
      }
    }

    return { nodes, edges };
  }

  private tokenize(text: string): Set<string> {
    const clean = text.toLowerCase().replace(/[^a-z0-9_-]/g, ' ');
    const parts = clean.split(/\s+/).filter(w => w.length > 2);
    return new Set(parts);
  }

  private async tryForwardToExternalHindsight(memory: HindsightMemory) {
    const hindsightUrl = Netlify.env.get('HINDSIGHT_API_URL') || 'https://api.hindsight.vectorize.io';
    const hindsightKey = Netlify.env.get('HINDSIGHT_API_KEY');

    if (!hindsightKey) {
      // Local engine active (standalone / embedded Hindsight mode)
      return;
    }

    try {
      await fetch(`${hindsightUrl}/v1/banks/${memory.bankId}/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hindsightKey}`,
          'X-Agent-Name': 'REACTOR-DevOps'
        },
        body: JSON.stringify({
          content: memory.content,
          metadata: memory.metadata,
          tags: memory.tags
        })
      });
      console.log(`[Hindsight Cloud] Synced memory ${memory.id} to remote Hindsight Cloud`);
    } catch (e) {
      console.warn('[Hindsight Cloud] Note: Cloud sync skipped (local memory retained):', e);
    }
  }
}

export const hindsightEngine = new HindsightMemoryEngine();
