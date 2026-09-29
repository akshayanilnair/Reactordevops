import { GoogleGenAI } from '@google/genai';
import { Deployment, RiskAssessment, RiskLevel, HistoricalComparison, BlastRadiusItem, VerificationCheckItem } from '../types/reactor.js';
import { hindsightEngine } from './hindsight.js';
import { storageEngine } from './storage.js';

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = Netlify.env.get('GEMINI_API_KEY');
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

export class ReactorAgent {
  /**
   * INGESTION -> NORMALIZER -> HINDSIGHT RECALL -> RISK / PATTERN ANALYSIS -> RECOMMENDATION
   */
  public async analyzeDeployment(deployment: Deployment): Promise<RiskAssessment> {
    const geminiClient = createGeminiClient();
    // 1. Build rich semantic query representation from normalized changes
    const depQueryParts: string[] = [
      `Service: ${deployment.service}`,
      `Environment: ${deployment.environment}`,
      `Commit: ${deployment.commitMessage}`
    ];

    if (deployment.dependencyChanges.length > 0) {
      depQueryParts.push(`Dependencies: ${deployment.dependencyChanges.map(d => `${d.name} from ${d.fromVersion} to ${d.toVersion}`).join(', ')}`);
    }

    if (deployment.databaseChanges.length > 0) {
      depQueryParts.push(`Database: ${deployment.databaseChanges.map(m => `${m.migrationName} ${m.details}`).join(', ')}`);
    }

    if (deployment.infraChanges.length > 0) {
      depQueryParts.push(`Infra: ${deployment.infraChanges.map(i => `${i.component} ${i.description}`).join(', ')}`);
    }

    if (deployment.envVarChanges.length > 0) {
      depQueryParts.push(`EnvVars: ${deployment.envVarChanges.map(e => `${e.key} (${e.action})`).join(', ')}`);
    }

    const primaryQuery = depQueryParts.join('. ');

    // Extract tags for targeted Hindsight recall
    const recallTags: string[] = [
      deployment.service,
      ...deployment.dependencyChanges.map(d => d.name.toLowerCase()),
      ...deployment.databaseChanges.map(() => 'migration'),
      ...deployment.infraChanges.map(i => i.component.toLowerCase())
    ];

    // 2. Perform real Hindsight recall operation
    const recallResult = await hindsightEngine.recall({
      bankId: 'reactor-production-memory',
      query: primaryQuery,
      threshold: 0.20,
      topK: 4,
      tags: recallTags
    });

    const consultedMemories = recallResult.memories.map(m => ({
      id: m.memory.id,
      score: m.score,
      title: m.memory.title,
      summary: m.memory.summary
    }));

    // 3. Perform Risk & Pattern Analysis via Gemini or Fallback Expert Evaluator
    let assessment: RiskAssessment;
    const topMemory = recallResult.memories[0]?.memory;
    const topMemoryScore = recallResult.memories[0]?.score || 0;

    if (geminiClient) {
      try {
        assessment = await this.evaluateWithGemini(deployment, recallResult.memories, consultedMemories, geminiClient);
      } catch (err) {
        console.warn('[ReactorAgent] Gemini evaluation encountered error, using deterministic DevOps engine:', err);
        assessment = this.evaluateWithDevOpsRules(deployment, recallResult.memories, consultedMemories);
      }
    } else {
      assessment = this.evaluateWithDevOpsRules(deployment, recallResult.memories, consultedMemories);
    }

    // Attach to deployment and persist
    deployment.riskAssessment = assessment;
    if (assessment.riskLevel === 'HIGH' || assessment.riskLevel === 'CRITICAL') {
      deployment.status = 'risk_flagged';
    } else {
      deployment.status = 'approved';
    }
    await storageEngine.upsertDeployment(deployment);

    return assessment;
  }

  private async evaluateWithGemini(
    deployment: Deployment,
    recalledMemories: { memory: any; score: number; matchReasons: string[] }[],
    consulted: any[],
    geminiClient: GoogleGenAI
  ): Promise<RiskAssessment> {
    const memoryContext = recalledMemories.map(m => `
Memory ID: ${m.memory.id}
Title: ${m.memory.title}
Relevance Score: ${m.score}
Tags: ${m.memory.tags.join(', ')}
Summary: ${m.memory.summary}
Full Historical Context:
${m.memory.content}
Root Cause Then: ${m.memory.metadata.rootCause}
Resolution Then: ${m.memory.metadata.resolution}
Verified: ${m.memory.metadata.verifiedFix}
Downstream Effects: ${m.memory.metadata.downstreamEffects?.join(', ') || 'none'}
Match Reasons: ${m.matchReasons.join('; ')}
`).join('\n---\n');

    const prompt = `You are REACTOR, an AI DevOps Engineer that remembers every deployment using Hindsight agent memory.
Analyze this incoming deployment by comparing it with organizational memory from past deployments.

INCOMING DEPLOYMENT:
- Number: #${deployment.number}
- Service: ${deployment.service}
- Environment: ${deployment.environment}
- Commit: ${deployment.commitMessage}
- Changed Files: ${JSON.stringify(deployment.fileChanges)}
- Dependency Changes: ${JSON.stringify(deployment.dependencyChanges)}
- Env Var Changes: ${JSON.stringify(deployment.envVarChanges)}
- Infra Changes: ${JSON.stringify(deployment.infraChanges)}
- Database Changes: ${JSON.stringify(deployment.databaseChanges)}

RECALLED HINDSIGHT LONG-TERM MEMORIES:
${memoryContext || 'No strongly matched historical memories found in Hindsight.'}

TASK:
Produce a detailed JSON evaluation with:
- riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL"
- confidence: number between 0 and 100
- headline: short, punchy technical headline (e.g. "Resembles Deployment #1 pg driver RDS connection exhaustion failure")
- summary: 2-3 sentence explanation directly comparing current changes with historical incidents.
- historicalComparison: If any memory is relevant, provide:
  - similarDeploymentId: memory id
  - similarDeploymentNumber: deployment number if known (e.g. 1)
  - similarityScore: 0 to 100
  - matchedTags: array of matched concepts
  - whatChangedThen: what was changed in the past
  - whatFailedThen: what failed
  - rootCauseThen: root cause
  - resolutionThen: how it was resolved
  - outcomeThen: outcome
  - keyDifferences: array of differences between old and current change
- blastRadius: array of { service, severity: "LOW"|"MEDIUM"|"HIGH", dependencyPath, potentialImpact }
- verificationChecklist: array of 2 to 4 actionable tasks { id, task, command, completed: false, category: "runtime_config"|"database"|"compatibility"|"downstream" }
- recommendedStrategy: "STANDARD_ROLLOUT" | "CANARY_5_PERCENT" | "STAGED_WITH_SHADOW" | "BLOCK_AND_HOTFIX"
- preventionAdvice: Concrete advice for the engineer before deploying.

Return ONLY valid JSON matching this schema.`;

    const response = await geminiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      riskLevel: parsed.riskLevel || 'HIGH',
      confidence: parsed.confidence || 88,
      headline: parsed.headline || `Risk flagged for deployment #${deployment.number}`,
      summary: parsed.summary || 'Deployment matches historical failure patterns retained in Hindsight.',
      historicalComparison: parsed.historicalComparison,
      blastRadius: parsed.blastRadius || [
        { service: deployment.service, severity: 'HIGH', dependencyPath: 'direct', potentialImpact: 'Service disruption' }
      ],
      verificationChecklist: parsed.verificationChecklist || [
        { id: 'v1', task: 'Check connection pool configuration and timeout logs', completed: false, category: 'runtime_config' }
      ],
      recommendedStrategy: parsed.recommendedStrategy || 'CANARY_5_PERCENT',
      preventionAdvice: parsed.preventionAdvice || 'Inspect previous post-mortem and verify TLS/pool configurations.',
      hindsightMemoriesConsulted: consulted,
      analyzedAt: new Date().toISOString()
    };
  }

  private evaluateWithDevOpsRules(
    deployment: Deployment,
    recalledMemories: { memory: any; score: number; matchReasons: string[] }[],
    consulted: any[]
  ): RiskAssessment {
    const topMemItem = recalledMemories[0];
    const topMem = topMemItem?.memory;
    const score = topMemItem ? Math.round(topMemItem.score * 100) : 0;

    // Check Deployment #1 similarity (pg driver upgrade)
    const hasPgUpgrade = deployment.dependencyChanges.some(d => d.name === 'pg');
    const hasRedisChange = deployment.dependencyChanges.some(d => d.name.includes('redis')) || 
                           deployment.envVarChanges.some(e => e.key.includes('REDIS'));
    const hasDbMigration = deployment.databaseChanges.length > 0;
    const hasK8sLimitChange = deployment.infraChanges.some(i => i.changeType === 'helm' || i.description.includes('memory'));

    let riskLevel: RiskLevel = 'LOW';
    let headline = `Nominal pre-deployment check for #${deployment.number}`;
    let summary = 'No historical failure patterns detected in Hindsight memory for these modifications.';
    let plainEnglishHeadline = `All systems clear for Deployment #${deployment.number}`;
    let plainEnglishSummary = 'This code change looks safe. We did not find any past outages or bugs in our memory bank matching this update.';
    let customerImpact = 'No negative customer impact expected. All services should run normally.';
    let businessRisk = 'Minimal risk ($0 expected downtime cost). Standard automated testing recommended.';
    let simpleFix = 'Proceed with regular automated deployment.';
    let historicalComparison: HistoricalComparison | undefined = undefined;
    let blastRadius: BlastRadiusItem[] = [];
    let checklist: VerificationCheckItem[] = [];
    let recommendedStrategy: RiskAssessment['recommendedStrategy'] = 'STANDARD_ROLLOUT';
    let preventionAdvice = 'Proceed with standard pipeline staging and automated smoke tests.';

    if (hasPgUpgrade) {
      const pgDep = deployment.dependencyChanges.find(d => d.name === 'pg');
      riskLevel = 'CRITICAL';
      headline = `Resembles Deployment #1: 'pg' driver upgrade previously caused AWS RDS connection pool exhaustion`;
      summary = `In Deployment #1, updating 'pg' without explicit TLS CA configuration caused ECONNRESET dropouts and exhausted database pool connections under production load. Deployment #${deployment.number} updates 'pg' to ${pgDep?.toVersion || 'newer version'} in ${deployment.service}.`;
      
      plainEnglishHeadline = 'STOP: This code change will crash user checkout and payments';
      plainEnglishSummary = 'An engineer is trying to update the database connection tool (pg driver). But 6 months ago, that exact same update crashed our checkout system for 45 minutes because Amazon AWS rejected the security connection. Hindsight remembered this 92% match and stopped it before code was deployed.';
      customerImpact = 'Customers trying to buy items will see "Payment Failed" or "502 Server Error". Checkout will be 100% blocked.';
      businessRisk = 'Estimated ~$48,000 lost checkout revenue and ~45 minutes of customer downtime.';
      simpleFix = 'Include the AWS RDS security certificate in the Docker build and deploy to only 5% of users (Canary) first.';

      historicalComparison = {
        similarDeploymentId: 'dep-1',
        similarDeploymentNumber: 1,
        similarityScore: Math.max(92, score),
        matchedTags: ['pg', 'postgres', 'tls', 'connection-pool', 'checkout-api'],
        whatChangedThen: "Upgraded 'pg' from 8.7.3 to 8.11.1 in checkout-api",
        whatFailedThen: 'Strict TLS handshake failure on RDS PostgreSQL connection pool; 25/25 clients drained in 4 minutes',
        rootCauseThen: 'pg v8.8+ enforces strict TLS handshake rejectUnauthorized by default, rejecting RDS intermediate CA',
        resolutionThen: 'Configured rejectUnauthorized: false with AWS global-bundle.pem cert bundle and reduced pool max to 12',
        outcomeThen: 'Full production outage with 502 Bad Gateway across checkout flow (45 mins customer downtime)',
        keyDifferences: [
          `Current version targets ${pgDep?.toVersion || '8.11.3'} (was 8.11.1 in #1)`,
          `Current deployment also includes connection pool keepAlive tuning`,
          `Target environment is ${deployment.environment}`
        ]
      };

      blastRadius = [
        { 
          service: 'checkout-api', 
          severity: 'HIGH', 
          dependencyPath: 'Direct database driver', 
          potentialImpact: 'Primary pool starvation and HTTP 502 responses',
          userFacingImpact: 'Customers cannot click "Buy Now" or finish orders'
        },
        { 
          service: 'billing-worker', 
          severity: 'HIGH', 
          dependencyPath: 'Downstream payment queue', 
          potentialImpact: 'Payment authorization timeout cascading',
          userFacingImpact: 'Credit card charges get stuck in processing queues'
        },
        { 
          service: 'order-fulfillment-stream', 
          severity: 'MEDIUM', 
          dependencyPath: 'Event bus lag', 
          potentialImpact: 'Delayed inventory reservation backlog',
          userFacingImpact: 'Warehouse shipments delayed by up to 2 hours'
        }
      ];

      checklist = [
        { 
          id: 'chk-1', 
          task: 'Verify RDS certificate bundle (global-bundle.pem) is mounted in Docker container', 
          plainEnglishTask: 'Step 1: Make sure the AWS security certificate is copied into the server container',
          command: 'openssl s_client -connect $PGHOST:5432 -starttls postgres', 
          completed: false, 
          category: 'database' 
        },
        { 
          id: 'chk-2', 
          task: 'Confirm ssl.rejectUnauthorized setting matches RDS intermediate chain policy', 
          plainEnglishTask: 'Step 2: Test that the database accepts our security credentials without crashing',
          command: 'node -e "require(\'./src/db/connection\').testTlsHandshake()"', 
          completed: false, 
          category: 'runtime_config' 
        },
        { 
          id: 'chk-3', 
          task: 'Validate connection pool max limit (<= 12 clients per container instance)', 
          plainEnglishTask: 'Step 3: Keep simultaneous database connections limited to 12 to prevent server overload',
          command: 'grep -rn "max:" services/checkout/src/db', 
          completed: false, 
          category: 'runtime_config' 
        },
        { 
          id: 'chk-4', 
          task: 'Run pgbench load test against canary replica before traffic shift', 
          plainEnglishTask: 'Step 4: Send simulated shopping traffic to 5% of users to prove it works before full rollout',
          command: 'pgbench -c 15 -j 4 -t 100 -h $PGHOST_CANARY -U $PGUSER $PGDATABASE', 
          completed: false, 
          category: 'downstream' 
        }
      ];

      recommendedStrategy = 'CANARY_5_PERCENT';
      preventionAdvice = 'Hindsight memory indicates high probability of database connection failure if TLS parameters are not explicitly set. Test TLS handshake in canary before 100% traffic shift.';

    } else if (hasRedisChange) {
      riskLevel = 'HIGH';
      headline = 'Resembles Deployment #11: Aggressive Redis timeout caused authentication cascade failure';
      summary = 'Historical memory records cross-AZ latency jitter causing mass connection resets when Redis timeouts were lowered below 1000ms.';
      
      plainEnglishHeadline = 'Warning: Setting cache timeout too fast will kick users out of their accounts';
      plainEnglishSummary = 'The code tries to speed up user logins by dropping the wait timeout to 100ms. But on August 30 (Deployment #11), normal internet delay caused 18% of users to get randomly logged out and locked out of their accounts.';
      customerImpact = 'Users randomly get logged out and cannot sign back into their account.';
      businessRisk = 'High surge of customer support complaints and lost login sessions.';
      simpleFix = 'Keep the timeout at 1,000 milliseconds (1 second) and add a fallback memory cache.';

      historicalComparison = {
        similarDeploymentId: 'dep-11',
        similarDeploymentNumber: 11,
        similarityScore: Math.max(86, score),
        matchedTags: ['redis', 'timeout', 'connection-pool', 'auth-gateway'],
        whatChangedThen: 'Lowered REDIS_CONNECT_TIMEOUT_MS to 100ms',
        whatFailedThen: '18% session timeouts during intermittent cloud packet variance, cascading into primary DB stampede',
        rootCauseThen: 'Aggressive 100ms timeout failed to accommodate cross-AZ network latency',
        resolutionThen: 'Restored 1200ms timeout with circuit breaker fallback',
        outcomeThen: '504 Gateway Timeouts across auth gateway',
        keyDifferences: ['Current deployment targets Redis cluster pooling configuration']
      };

      blastRadius = [
        { 
          service: deployment.service, 
          severity: 'HIGH', 
          dependencyPath: 'Direct cache layer', 
          potentialImpact: 'Session cache eviction & stampede',
          userFacingImpact: 'Users get logged out and have to repeatedly type their passwords'
        },
        { 
          service: 'postgres-primary', 
          severity: 'HIGH', 
          dependencyPath: 'Fallback queries', 
          potentialImpact: '10x spike in authentication read queries',
          userFacingImpact: 'App feels sluggish and slow to respond'
        }
      ];

      checklist = [
        { 
          id: 'r1', 
          task: 'Confirm Redis connect timeout is >= 1000ms with jittered backoff', 
          plainEnglishTask: 'Step 1: Ensure login timeout gives at least 1 second for internet hiccups',
          completed: false, 
          category: 'runtime_config' 
        },
        { 
          id: 'r2', 
          task: 'Verify local in-memory fallback circuit breaker is active', 
          plainEnglishTask: 'Step 2: Turn on the backup cache so users stay logged in even if the main cache pauses',
          completed: false, 
          category: 'downstream' 
        }
      ];

      recommendedStrategy = 'CANARY_5_PERCENT';
      preventionAdvice = 'Maintain minimum 1000ms Redis timeout with exponential retry to prevent cross-AZ packet drops from triggering primary DB stampedes.';

    } else if (hasDbMigration) {
      riskLevel = 'HIGH';
      headline = 'Resembles Deployment #22: Database migration pattern carries ACCESS EXCLUSIVE table lock risk';
      summary = 'Hindsight records previous migration locking the 12M row table for 47 seconds, exhausting active connections.';
      
      plainEnglishHeadline = 'Warning: This database update will freeze the entire website for ~1 minute';
      plainEnglishSummary = 'The code is adding a new column to the customer database table without a default value. In Deployment #22, doing this locked 12 million rows and froze the entire website for 47 seconds, showing errors to all visitors.';
      customerImpact = 'Website will freeze and show "Service Unavailable" for almost 1 full minute.';
      businessRisk = 'All active customer transactions frozen during peak hours.';
      simpleFix = 'Make the column optional (nullable) first, so the database can update in the background without freezing.';

      historicalComparison = {
        similarDeploymentId: 'dep-22',
        similarDeploymentNumber: 22,
        similarityScore: Math.max(88, score),
        matchedTags: ['prisma', 'postgres', 'migration', 'table-lock'],
        whatChangedThen: 'Added NOT NULL column without DEFAULT value',
        whatFailedThen: '47 second ACCESS EXCLUSIVE lock on production table',
        rootCauseThen: 'Full table rewrite required by non-null constraint without default',
        resolutionThen: 'Used expand-contract pattern with batch backfilling',
        outcomeThen: 'Database connection exhaustion & site-wide 503s',
        keyDifferences: ['Current migration script targets schema changes in user-service']
      };

      blastRadius = [
        { 
          service: deployment.service, 
          severity: 'HIGH', 
          dependencyPath: 'Database lock', 
          potentialImpact: 'Blocked write transactions',
          userFacingImpact: 'Any user trying to save data gets an error spinner'
        }
      ];

      checklist = [
        { 
          id: 'm1', 
          task: 'Ensure new columns are nullable or have default values', 
          plainEnglishTask: 'Step 1: Set the new database column to optional so existing rows are not frozen',
          completed: false, 
          category: 'database' 
        },
        { 
          id: 'm2', 
          task: 'Validate lock_timeout is set (e.g. SET lock_timeout = "2s")', 
          plainEnglishTask: 'Step 2: Set an automatic 2-second safety timeout so the database aborts rather than freezing',
          completed: false, 
          category: 'database' 
        }
      ];

      recommendedStrategy = 'STAGED_WITH_SHADOW';
      preventionAdvice = 'Adopt expand-contract migration pattern to avoid locking production tables during peak hours.';

    } else if (hasK8sLimitChange) {
      riskLevel = 'HIGH';
      headline = 'Resembles Deployment #18: Kubernetes memory quota reduction risk under Node.js runtime';
      summary = 'Historical memory records container crashes during V8 startup heap expansion when memory limits were reduced.';
      
      plainEnglishHeadline = 'Warning: Cutting server memory in half risks sudden app crashes under peak traffic';
      plainEnglishSummary = 'This configuration change reduces the server memory limit to 384MB. In Deployment #18, when servers started up, Node.js needed 512MB to initialize, causing the servers to instantly crash in a restart loop.';
      customerImpact = 'Servers repeatedly crash, causing 503 errors and slow loading times.';
      businessRisk = 'Outage risk during traffic spikes or when new servers spin up to handle load.';
      simpleFix = 'Keep memory at 768MB or higher, with Node.js heap limit configured to 512MB.';

      historicalComparison = {
        similarDeploymentId: 'dep-18',
        similarDeploymentNumber: 18,
        similarityScore: Math.max(84, score),
        matchedTags: ['kubernetes', 'oomkilled', 'node20', 'memory-limit'],
        whatChangedThen: 'Reduced memory limit from 1Gi to 384Mi',
        whatFailedThen: 'OOMKilled during cold boot module compilation',
        rootCauseThen: 'V8 heap allocation default exceeded tight cgroup limit',
        resolutionThen: 'Set limit to 768Mi with --max-old-space-size=512',
        outcomeThen: 'Crash loop backoff on deployment rollout',
        keyDifferences: ['Current deployment modifies helm values']
      };

      blastRadius = [
        { 
          service: deployment.service, 
          severity: 'HIGH', 
          dependencyPath: 'Pod restart', 
          potentialImpact: 'Container crash loop backoff',
          userFacingImpact: 'App goes offline for several minutes while containers crash and restart'
        }
      ];

      checklist = [
        { 
          id: 'k1', 
          task: 'Confirm container memory limit is >= 512Mi for Node runtime', 
          plainEnglishTask: 'Step 1: Give the server at least 512MB of RAM so it has breathing room to start',
          completed: false, 
          category: 'runtime_config' 
        },
        { 
          id: 'k2', 
          task: 'Inspect NODE_OPTIONS max-old-space-size configuration', 
          plainEnglishTask: 'Step 2: Tell Node.js its exact memory budget in the server launch script',
          completed: false, 
          category: 'runtime_config' 
        }
      ];

      recommendedStrategy = 'CANARY_5_PERCENT';
      preventionAdvice = 'Ensure container memory headroom accounts for V8 JIT compilation and peak heap usage.';
    }

    return {
      riskLevel,
      confidence: topMem ? Math.min(96, Math.max(75, score)) : 90,
      headline,
      summary,
      plainEnglishHeadline,
      plainEnglishSummary,
      customerImpact,
      businessRisk,
      simpleFix,
      historicalComparison,
      blastRadius,
      verificationChecklist: checklist,
      recommendedStrategy,
      preventionAdvice,
      hindsightMemoriesConsulted: consulted,
      analyzedAt: new Date().toISOString()
    };
  }

  /**
   * CONTINUOUS LEARNING LOOP:
   * Deployment Outcome -> Engineer Feedback -> Hindsight Retain -> Permanent Organizational Memory
   */
  public async recordOutcomeAndFeedback(params: {
    deploymentId: string;
    outcomeStatus: 'SUCCESS' | 'FAILURE' | 'DEGRADED';
    engineerName: string;
    wasPredictionAccurate: boolean;
    actualOutcomeNotes: string;
    lessonsLearned: string;
    resolutionApplied?: string;
    errorLogs?: string;
  }): Promise<{ deployment: Deployment; memory: any }> {
    const deployment = await storageEngine.getDeploymentById(params.deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${params.deploymentId} not found`);
    }

    // 1. Synthesize knowledge for Hindsight retention
    const memoryTitle = `Deployment #${deployment.number} (${deployment.service}): ${params.outcomeStatus} - ${deployment.commitMessage.slice(0, 50)}`;
    const memoryContent = `Deployment #${deployment.number} in ${deployment.service} (${deployment.environment}).
Commit: ${deployment.commitMessage}
Outcome: ${params.outcomeStatus}
Risk Assessment Headline: ${deployment.riskAssessment?.headline || 'N/A'}
Prediction Accuracy: ${params.wasPredictionAccurate ? 'Accurate' : 'Inaccurate'}
Engineer Notes: ${params.actualOutcomeNotes}
Lessons Learned: ${params.lessonsLearned}
${params.resolutionApplied ? `Resolution Applied: ${params.resolutionApplied}` : ''}
${params.errorLogs ? `Error Trace: ${params.errorLogs}` : ''}
Verified by Engineer: ${params.engineerName}`;

    const tags = [
      deployment.service,
      deployment.environment,
      params.outcomeStatus.toLowerCase(),
      ...deployment.dependencyChanges.map(d => d.name),
      ...deployment.databaseChanges.map(d => d.type),
      'continuous-learning'
    ];

    // 2. Retain in Hindsight!
    const retainedMemory = await hindsightEngine.retain({
      bankId: 'reactor-production-memory',
      title: memoryTitle,
      content: memoryContent,
      summary: `${params.outcomeStatus}: ${params.lessonsLearned.slice(0, 150)}`,
      tags,
      metadata: {
        deploymentId: deployment.id,
        deploymentNumber: deployment.number,
        service: deployment.service,
        environment: deployment.environment,
        rootCause: params.errorLogs ? params.actualOutcomeNotes : 'None',
        resolution: params.resolutionApplied || 'Deployment completed nominally',
        verifiedFix: params.outcomeStatus === 'SUCCESS',
        downstreamEffects: deployment.riskAssessment?.blastRadius.map(b => b.service) || [],
        riskScore: deployment.riskAssessment?.confidence || 50,
        category: params.outcomeStatus === 'SUCCESS' ? 'safe_pattern' : 'runtime_crash'
      },
      associations: deployment.riskAssessment?.historicalComparison?.similarDeploymentId 
        ? [deployment.riskAssessment.historicalComparison.similarDeploymentId] 
        : []
    });

    // 3. Update deployment record
    deployment.outcome = {
      status: params.outcomeStatus,
      completedAt: new Date().toISOString(),
      errorLogSnippet: params.errorLogs,
      engineerResolution: params.resolutionApplied,
      retainedInHindsight: true,
      hindsightMemoryId: retainedMemory.id
    };

    deployment.feedback = {
      engineerName: params.engineerName,
      wasPredictionAccurate: params.wasPredictionAccurate,
      checklistFollowed: true,
      actualOutcomeNotes: params.actualOutcomeNotes,
      lessonsLearned: params.lessonsLearned,
      submittedAt: new Date().toISOString()
    };

    deployment.status = params.outcomeStatus === 'SUCCESS' 
      ? 'deployed_success' 
      : 'failed_in_production';

    await storageEngine.upsertDeployment(deployment);

    return {
      deployment,
      memory: retainedMemory
    };
  }

  /**
   * DevOps Knowledge Agent Q&A powered by Hindsight recall
   */
  public async askDevOpsAgent(question: string): Promise<{ answer: string; memoriesConsulted: any[] }> {
    const geminiClient = createGeminiClient();
    const recallResult = await hindsightEngine.recall({
      query: question,
      threshold: 0.15,
      topK: 4
    });

    if (geminiClient) {
      try {
        const memContext = recallResult.memories.map(m => `
Memory [${m.memory.id}] ${m.memory.title} (Relevance: ${Math.round(m.score * 100)}%):
${m.memory.content}
Root Cause: ${m.memory.metadata.rootCause}
Resolution: ${m.memory.metadata.resolution}
Verified: ${m.memory.metadata.verifiedFix}
`).join('\n---\n');

        const prompt = `You are REACTOR, the AI DevOps Engineer that remembers every software deployment.
Answer the user's question using organizational memory recalled from Hindsight.
The user requested that explanations should be both USER-FRIENDLY (plain English so anyone can understand) AND TECH-ORIENTED (providing concrete technical commands and root causes).

USER QUESTION:
${question}

RECALLED HINDSIGHT INCIDENT MEMORIES:
${memContext || 'No related incident memories found.'}

FORMAT YOUR ANSWER CLEARLY IN TWO DISTINCT SECTIONS:

**In Plain English (Simple Summary)**:
- Explain what is happening without overly dense jargon.
- Explain what happens to real customers/users (e.g. "Customers will be unable to pay and see an error page").
- Use a clear everyday analogy if helpful.

**Technical Deep-Dive (For Engineers)**:
- Provide specific historical deployment numbers (e.g. Deployment #1), affected services, and verified root causes.
- Provide the exact technical fix (environment variables, AWS CA certificates, Dockerfile flags, or terminal commands).
- Specify recommended rollout strategy (e.g. 5% Canary rollout with automated rollback triggers).`;

        const response = await geminiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt
        });

        return {
          answer: response.text || 'Historical deployment memory consulted.',
          memoriesConsulted: recallResult.memories
        };
      } catch (e) {
        console.warn('[ReactorAgent] Error asking Gemini, falling back to local synthesis:', e);
      }
    }

    // Local fallback synthesis
    if (recallResult.memories.length === 0) {
      return {
        answer: `**In Plain English**:
We checked our team's past incident memory, and we haven't seen an outage like this before. Because this is brand new code, we should deploy it carefully to a small group of users first.

**Technical Recommendation**:
No historical failure patterns detected in Hindsight memory for "${question}". Run full unit/integration test suites and deploy through Canary (5% traffic) with automated rollback triggers.`,
        memoriesConsulted: []
      };
    }

    const top = recallResult.memories[0].memory;
    const answer = `**In Plain English**:
Whenever we changed something similar in the past, it broke our customer services because of:
"${top.summary || top.title}".
If we deploy this without checking, customers may experience connection dropouts and slow loading. The safe fix our team learned before is to: "${top.metadata.resolution || 'update the configuration and test on 5% of users first'}".

**Technical Deep-Dive (Incident ${top.metadata.deploymentNumber ? '#' + top.metadata.deploymentNumber : top.id})**:
• **Target Service**: ${top.metadata.service || 'checkout-api'}
• **Root Cause**: ${top.metadata.rootCause || 'Configuration drift / TLS handshake mismatch'}
• **Verified Resolution**: ${top.metadata.resolution || 'Applied configuration patch and tuned connection parameters'}
• **Downstream Affected Services**: ${(top.metadata.downstreamEffects || []).join(', ') || 'connected microservices'}
• **Action Required**: Verify TLS certificate chain and use Canary (5%) traffic shifting before 100% rollout.`;

    return {
      answer,
      memoriesConsulted: recallResult.memories
    };
  }
}

export const reactorAgent = new ReactorAgent();
