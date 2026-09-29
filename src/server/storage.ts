import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { deployments } from '../../db/schema.js';
import { Deployment } from '../types/reactor.js';

export const SEED_DEPLOYMENTS: Deployment[] = [
  {
    id: 'dep-1',
    number: 1,
    commitHash: '7a9f142',
    commitMessage: 'feat(checkout): upgrade pg driver from 8.7.3 to 8.11.1 for connection improvements',
    author: {
      name: 'Sarah Chen',
      email: 'schen@reactor.io'
    },
    branch: 'main',
    environment: 'production',
    service: 'checkout-api',
    timestamp: '2026-08-14T09:12:00Z',
    status: 'failed_in_production',
    fileChanges: [
      { path: 'services/checkout/package.json', type: 'modified' },
      { path: 'services/checkout/src/db/connection.ts', type: 'modified' }
    ],
    dependencyChanges: [
      { name: 'pg', fromVersion: '8.7.3', toVersion: '8.11.1', isMajor: false, type: 'production' }
    ],
    envVarChanges: [],
    infraChanges: [],
    databaseChanges: [],
    riskAssessment: {
      riskLevel: 'HIGH',
      confidence: 85,
      headline: 'PostgreSQL driver minor update with TLS breaking defaults',
      summary: 'Upgraded pg to 8.11.1 without explicit TLS rejectUnauthorized flag.',
      blastRadius: [
        { service: 'checkout-api', severity: 'HIGH', dependencyPath: 'direct', potentialImpact: 'Connection pool starvation' },
        { service: 'billing-worker', severity: 'HIGH', dependencyPath: 'downstream RPC', potentialImpact: 'Order creation timeout' }
      ],
      verificationChecklist: [
        { id: 'c1', task: 'Verify RDS certificate bundle with rejectUnauthorized flag', completed: false, category: 'database' },
        { id: 'c2', task: 'Simulate connection pool load with pgbench', completed: false, category: 'runtime_config' }
      ],
      recommendedStrategy: 'CANARY_5_PERCENT',
      preventionAdvice: 'Do not deploy pg 8.11+ without matching AWS RDS SSL certificate bundle.',
      hindsightMemoriesConsulted: [],
      analyzedAt: '2026-08-14T09:13:00Z'
    },
    outcome: {
      status: 'FAILURE',
      completedAt: '2026-08-14T09:20:00Z',
      errorLogSnippet: 'Error: self signed certificate in certificate chain (AWS RDS Postgres:5432) at TLSSocket.onConnectSecure. Max pool size drained (25/25 clients hung).',
      downstreamIncidents: ['billing-worker (502 Gateway)', 'order-fulfillment (Kafka lag +14,200)'],
      engineerResolution: 'Provided AWS global-bundle.pem in ssl config and tuned pool clients to 12. Fix verified.',
      retainedInHindsight: true,
      hindsightMemoryId: 'mem-deploy-1'
    },
    feedback: {
      engineerName: 'Sarah Chen',
      wasPredictionAccurate: true,
      checklistFollowed: false,
      actualOutcomeNotes: 'We rushed the minor driver upgrade thinking pg 8.11 was backwards compatible. It completely broke RDS TLS handshakes.',
      lessonsLearned: 'Always verify RDS CA bundle compatibility on any pg driver change.',
      submittedAt: '2026-08-14T10:15:00Z'
    }
  },
  {
    id: 'dep-5',
    number: 5,
    commitHash: '3f2b891',
    commitMessage: 'chore(billing): upgrade stripe-node sdk v11 to v14',
    author: {
      name: 'Marcus Brody',
      email: 'mbrody@reactor.io'
    },
    branch: 'main',
    environment: 'production',
    service: 'billing-worker',
    timestamp: '2026-08-21T14:00:00Z',
    status: 'failed_in_production',
    fileChanges: [
      { path: 'services/billing/package.json', type: 'modified' },
      { path: 'services/billing/src/webhooks.ts', type: 'modified' }
    ],
    dependencyChanges: [
      { name: 'stripe', fromVersion: '11.18.0', toVersion: '14.2.0', isMajor: true, type: 'production' }
    ],
    envVarChanges: [],
    infraChanges: [],
    databaseChanges: [],
    outcome: {
      status: 'FAILURE',
      completedAt: '2026-08-21T14:10:00Z',
      errorLogSnippet: 'StripeSignatureVerificationError: No signatures found matching the expected signature for payload.',
      engineerResolution: 'Placed raw body middleware before express.json() parser.',
      retainedInHindsight: true,
      hindsightMemoryId: 'mem-deploy-5'
    }
  },
  {
    id: 'dep-11',
    number: 11,
    commitHash: '8d4e101',
    commitMessage: 'perf(auth): reduce Redis connect timeout to 100ms for faster circuit trip',
    author: {
      name: 'Alex Rivera',
      email: 'arivera@reactor.io'
    },
    branch: 'main',
    environment: 'production',
    service: 'auth-gateway',
    timestamp: '2026-08-30T16:30:00Z',
    status: 'rolled_back',
    fileChanges: [
      { path: 'services/auth/config/redis.json', type: 'modified' }
    ],
    dependencyChanges: [],
    envVarChanges: [
      { key: 'REDIS_CONNECT_TIMEOUT_MS', action: 'modified' }
    ],
    infraChanges: [],
    databaseChanges: [],
    outcome: {
      status: 'FAILURE',
      completedAt: '2026-08-30T16:45:00Z',
      errorLogSnippet: 'RedisConnectionError: Connection timeout (100ms) to master.elasticache.internal during session check.',
      engineerResolution: 'Rolled back to 1200ms timeout with circuit breaker local JWT fallback.',
      retainedInHindsight: true,
      hindsightMemoryId: 'mem-deploy-11'
    }
  },
  {
    id: 'dep-18',
    number: 18,
    commitHash: '2c8a774',
    commitMessage: 'infra(helm): adjust memory requests to 384Mi for recommendation-engine',
    author: {
      name: 'Elena Rostova',
      email: 'erostova@reactor.io'
    },
    branch: 'main',
    environment: 'production',
    service: 'recommendation-engine',
    timestamp: '2026-09-08T10:45:00Z',
    status: 'failed_in_production',
    fileChanges: [
      { path: 'deploy/helm/recommendation/values.yaml', type: 'modified' }
    ],
    dependencyChanges: [],
    envVarChanges: [],
    infraChanges: [
      { component: 'kubernetes', changeType: 'helm', description: 'Reduced memory limit from 1Gi to 384Mi' }
    ],
    databaseChanges: [],
    outcome: {
      status: 'FAILURE',
      completedAt: '2026-09-08T11:00:00Z',
      errorLogSnippet: 'Container recommendation-engine-79bf484d-zxl2 killed by Linux kernel OOM killer (cgroup memory limit reached 384MB).',
      engineerResolution: 'Restored limit to 768Mi with --max-old-space-size=512.',
      retainedInHindsight: true,
      hindsightMemoryId: 'mem-deploy-18'
    }
  },
  {
    id: 'dep-22',
    number: 22,
    commitHash: '5e1199a',
    commitMessage: 'db(users): add account_tier NOT NULL column to users table',
    author: {
      name: 'Devon Lee',
      email: 'dlee@reactor.io'
    },
    branch: 'main',
    environment: 'production',
    service: 'user-service',
    timestamp: '2026-09-17T08:15:00Z',
    status: 'failed_in_production',
    fileChanges: [
      { path: 'prisma/schema.prisma', type: 'modified' },
      { path: 'prisma/migrations/20260917_tier/migration.sql', type: 'added' }
    ],
    dependencyChanges: [],
    envVarChanges: [],
    infraChanges: [],
    databaseChanges: [
      { migrationName: '20260917_tier', type: 'schema', hasDestructiveOperations: true, details: 'ALTER TABLE users ADD COLUMN account_tier VARCHAR NOT NULL' }
    ],
    outcome: {
      status: 'FAILURE',
      completedAt: '2026-09-17T08:30:00Z',
      errorLogSnippet: 'PostgresQueryError: Lock wait timeout exceeded (47000ms) on table users while holding ACCESS EXCLUSIVE lock.',
      engineerResolution: 'Migrated column as nullable, backfilled in batches, added constraint validated.',
      retainedInHindsight: true,
      hindsightMemoryId: 'mem-deploy-22'
    }
  },
  {
    id: 'dep-24',
    number: 24,
    commitHash: '90ab41c',
    commitMessage: 'feat(notifications): add Kafka dead letter queue and exponential backoff retry',
    author: {
      name: 'Sarah Chen',
      email: 'schen@reactor.io'
    },
    branch: 'main',
    environment: 'production',
    service: 'notification-service',
    timestamp: '2026-09-22T13:00:00Z',
    status: 'deployed_success',
    fileChanges: [
      { path: 'services/notification/src/kafka/consumer.ts', type: 'modified' }
    ],
    dependencyChanges: [],
    envVarChanges: [],
    infraChanges: [],
    databaseChanges: [],
    outcome: {
      status: 'SUCCESS',
      completedAt: '2026-09-22T13:15:00Z',
      retainedInHindsight: true,
      hindsightMemoryId: 'mem-deploy-24'
    }
  },
  {
    id: 'dep-26',
    number: 26,
    commitHash: '1a2b3c4',
    commitMessage: 'feat(cart): update session serializer and add promotional banner cache',
    author: {
      name: 'Marcus Brody',
      email: 'mbrody@reactor.io'
    },
    branch: 'main',
    environment: 'production',
    service: 'checkout-api',
    timestamp: '2026-09-26T15:20:00Z',
    status: 'deployed_success',
    fileChanges: [
      { path: 'services/checkout/src/cart/serializer.ts', type: 'modified' }
    ],
    dependencyChanges: [],
    envVarChanges: [],
    infraChanges: [],
    databaseChanges: [],
    outcome: {
      status: 'SUCCESS',
      completedAt: '2026-09-26T15:35:00Z',
      retainedInHindsight: false
    }
  }
];

export class StorageEngine {
  private async ensureSeeded() {
    const [count] = await db.select({ value: sql<number>`count(*)::int` }).from(deployments);
    if (count.value === 0) {
      await db.insert(deployments).values(SEED_DEPLOYMENTS.map(data => ({ id: data.id, number: data.number, data }))).onConflictDoNothing();
    }
  }

  public async getAllDeployments(): Promise<Deployment[]> {
    await this.ensureSeeded();
    return (await db.select({ data: deployments.data }).from(deployments).orderBy(desc(deployments.number))).map(row => row.data);
  }

  public async getDeploymentById(id: string): Promise<Deployment | undefined> {
    await this.ensureSeeded();
    return (await db.select({ data: deployments.data }).from(deployments).where(eq(deployments.id, id)).limit(1))[0]?.data;
  }

  public async upsertDeployment(deployment: Deployment): Promise<Deployment> {
    await db.insert(deployments).values({ id: deployment.id, number: deployment.number, data: deployment })
      .onConflictDoUpdate({ target: deployments.id, set: { number: deployment.number, data: deployment, updatedAt: new Date() } });
    return deployment;
  }

  public async getNextDeploymentNumber(): Promise<number> {
    await this.ensureSeeded();
    const [result] = await db.select({ value: sql<number>`coalesce(max(${deployments.number}), 0)::int + 1` }).from(deployments);
    return result.value;
  }

  public async resetToSeed(): Promise<void> {
    await db.transaction(async tx => {
      await tx.delete(deployments);
      await tx.insert(deployments).values(SEED_DEPLOYMENTS.map(data => ({ id: data.id, number: data.number, data })));
    });
  }
}

export const storageEngine = new StorageEngine();
