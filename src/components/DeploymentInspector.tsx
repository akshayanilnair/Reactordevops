import React, { useState } from 'react';
import { 
  Deployment, 
  VerificationCheckItem 
} from '../types/reactor.js';
import { 
  GitCommit, 
  ExternalLink, 
  Copy, 
  Check, 
  Terminal, 
  Database, 
  Share2, 
  Clock, 
  AlertTriangle,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

interface DeploymentInspectorProps {
  deployment: Deployment;
  onRecordOutcome: (data: {
    outcomeStatus: 'SUCCESS' | 'FAILURE' | 'DEGRADED';
    engineerName: string;
    wasPredictionAccurate: boolean;
    actualOutcomeNotes: string;
    lessonsLearned: string;
    resolutionApplied?: string;
  }) => Promise<void>;
  isSubmittingOutcome: boolean;
  onViewHistoricalDeployment?: (depNumber: number) => void;
  onOpenGlossary?: () => void;
  viewMode: 'friendly' | 'technical';
}

export const DeploymentInspector: React.FC<DeploymentInspectorProps> = ({
  deployment,
  onRecordOutcome,
  isSubmittingOutcome,
  onViewHistoricalDeployment,
  onOpenGlossary,
  viewMode
}) => {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<VerificationCheckItem[]>(
    deployment.riskAssessment?.verificationChecklist || []
  );

  // Outcome submission state
  const [outcomeStatus, setOutcomeStatus] = useState<'SUCCESS' | 'FAILURE' | 'DEGRADED'>('SUCCESS');
  const [engineerName, setEngineerName] = useState('Sarah Chen (Staff DevOps)');
  const [wasPredictionAccurate, setWasPredictionAccurate] = useState(true);
  const [actualOutcomeNotes, setActualOutcomeNotes] = useState(
    'Applied verification checks: verified AWS security certificate bundle before releasing to customers. 0 dropped checkouts.'
  );
  const [lessonsLearned, setLessonsLearned] = useState(
    'Always package the AWS RDS SSL security certificate bundle whenever updating the database connection tool. Prevented repeat outage.'
  );

  const risk = deployment.riskAssessment;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(text);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const toggleCheckItem = (id: string) => {
    setChecklist(prev => 
      prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item)
    );
  };

  const handleOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRecordOutcome({
      outcomeStatus,
      engineerName,
      wasPredictionAccurate,
      actualOutcomeNotes,
      lessonsLearned,
      resolutionApplied: outcomeStatus === 'SUCCESS' ? 'Verified with pre-flight checklist and canary rollout' : 'Deployment encountered issues'
    });
  };

  const completedCount = checklist.filter(c => c.completed).length;
  const progressPct = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* 0. Executive Plain-English Summary Banner */}
      <section className="studio-card p-6 md:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs uppercase tracking-wider text-white font-mono">
              Plain English Summary
            </span>
            <span className="text-white/40">&middot;</span>
            <span className="text-xs text-white/60">
              Proposed Code Update #{deployment.number} ({deployment.service})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono font-medium px-2.5 py-1 rounded-full ${
              risk?.riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              {risk?.riskLevel === 'CRITICAL' ? 'High Risk of Outage' : 'Standard Low Risk'}
            </span>

            {onOpenGlossary && (
              <button
                type="button"
                onClick={onOpenGlossary}
                className="text-xs text-amber-300 hover:text-white underline cursor-pointer ml-1"
              >
                Explain Tech Words
              </button>
            )}
          </div>
        </div>

        {/* Big Human Explanation */}
        <div className="space-y-3">
          <h2 className="text-lg md:text-2xl font-medium text-white tracking-tight leading-snug">
            {risk?.plainEnglishHeadline || (
              risk?.riskLevel === 'CRITICAL'
                ? 'Warning: This code update risks crashing customer checkout and payments'
                : 'All clear: This code update appears safe to release'
            )}
          </h2>

          <p className="text-xs md:text-sm text-white/75 leading-relaxed">
            {risk?.plainEnglishSummary || risk?.summary || (
              `A developer is updating code in the ${deployment.service} service. REACTOR scanned past incident memories to verify if this exact change has crashed production before.`
            )}
          </p>
        </div>

        {/* Impact Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Customer Impact */}
          <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 space-y-1">
            <div className="text-[11px] font-mono text-white/50 uppercase">
              What Real Customers Would Experience
            </div>
            <div className="text-xs text-white/90 font-medium leading-snug">
              {risk?.customerImpact || 'Customers may see payment errors, spinning wheels, or blank screens if deployed without the safety check.'}
            </div>
          </div>

          {/* Business Cost Prevented */}
          <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 space-y-1">
            <div className="text-[11px] font-mono text-white/50 uppercase">
              Estimated Business Risk Prevented
            </div>
            <div className="text-xs text-white/90 font-medium leading-snug">
              {risk?.businessRisk || 'Avoids estimated $48,000 revenue loss, 45 minutes of website downtime, and angry support calls.'}
            </div>
          </div>

          {/* Simple Fix */}
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
            <div className="text-[11px] font-mono text-emerald-300 uppercase">
              Simple 1-Minute Fix
            </div>
            <div className="text-xs text-emerald-100 font-medium leading-snug">
              {risk?.simpleFix || 'Include the missing security certificate in the build and test with 5% of users first.'}
            </div>
          </div>
        </div>
      </section>

      {/* 1. Deployment Ingestion Card */}
      <section className="studio-card p-6 md:p-8">
        {/* Header Details */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-white/10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/50 font-mono">
              <span className="font-semibold text-white">Code Update #{deployment.number}</span>
              <span>&middot;</span>
              <span>Service: {deployment.service}</span>
              <span>&middot;</span>
              <span className="uppercase">Target: {deployment.environment}</span>
              <span>&middot;</span>
              <span>{new Date(deployment.timestamp).toLocaleString()}</span>
            </div>

            <h2 className="text-xl md:text-2xl font-medium tracking-tight text-white flex items-center gap-2.5">
              <GitCommit className="h-5 w-5 text-white/50 shrink-0" />
              <span>{deployment.commitMessage}</span>
            </h2>
          </div>

          <div className="flex items-center gap-5 text-xs text-white/60 font-mono shrink-0 pt-1">
            <div>
              <span className="text-white/40 block text-[11px]">Developer</span>
              <span className="text-white font-sans font-medium">{deployment.author.name}</span>
            </div>
            <div className="h-7 w-px bg-white/15" />
            <div>
              <span className="text-white/40 block text-[11px]">Code ID</span>
              <span className="text-white font-mono">{deployment.commitHash}</span>
            </div>
          </div>
        </div>

        {/* Changes Breakdown with Plain English Explanations */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
          {/* Dependencies */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-white/50 font-semibold text-[11px] uppercase tracking-wider font-mono">
                Software Tools &amp; Libraries Updated
              </span>
            </div>
            {deployment.dependencyChanges.length > 0 ? (
              <div className="space-y-2 font-mono">
                {deployment.dependencyChanges.map((dep, i) => (
                  <div key={i} className="py-2 border-b border-white/10 space-y-1">
                    <div className="flex items-center justify-between text-white">
                      <span className="font-semibold">{dep.name}</span>
                      <span className="text-white/60">{dep.fromVersion} &rarr; {dep.toVersion}</span>
                    </div>
                    <div className="text-[11px] text-white/60 font-sans leading-relaxed">
                      {dep.name === 'pg' 
                        ? 'The database connector that lets the website talk to customer accounts. Changing versions can alter security certificate rules.' 
                        : dep.name === 'stripe'
                        ? 'The credit card payment tool. Changing versions requires updating webhook secret keys.'
                        : 'Third-party code library.'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/40 italic py-1">No external libraries changed</p>
            )}
          </div>

          {/* Infrastructure */}
          <div className="space-y-2.5">
            <div className="text-white/50 font-semibold text-[11px] uppercase tracking-wider font-mono">
              Server &amp; Cloud Settings
            </div>
            {deployment.infraChanges.length > 0 || deployment.envVarChanges.length > 0 ? (
              <div className="space-y-2 font-mono">
                {deployment.infraChanges.map((infra, i) => (
                  <div key={i} className="text-white py-2 border-b border-white/10 space-y-0.5">
                    <div><span className="font-semibold">{infra.component}:</span> {infra.description}</div>
                    <div className="text-[11px] text-white/60 font-sans">
                      Changes server memory and CPU limits in the cloud.
                    </div>
                  </div>
                ))}
                {deployment.envVarChanges.map((env, i) => (
                  <div key={i} className="text-white py-2 border-b border-white/10 space-y-0.5">
                    <div><span className="font-semibold">Setting {env.key}:</span> {env.action}</div>
                    <div className="text-[11px] text-white/60 font-sans">
                      Alters timeout or connection retry behavior.
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/40 italic py-1">Standard server settings</p>
            )}
          </div>

          {/* Database */}
          <div className="space-y-2.5">
            <div className="text-white/50 font-semibold text-[11px] uppercase tracking-wider font-mono">
              Database Table Updates
            </div>
            {deployment.databaseChanges.length > 0 ? (
              <div className="space-y-2 font-mono">
                {deployment.databaseChanges.map((db, i) => (
                  <div key={i} className="text-white py-2 border-b border-white/10 space-y-0.5">
                    <div><span className="font-semibold">{db.migrationName}:</span> {db.hasDestructiveOperations ? 'May freeze database' : 'Safe addition'}</div>
                    <div className="text-[11px] text-white/60 font-sans">
                      {db.hasDestructiveOperations 
                        ? 'Warning: May lock customer tables and cause timeouts while rows are being rewritten.'
                        : 'Adds new columns without locking existing customer data.'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/40 italic py-1">No database structure changes</p>
            )}
          </div>
        </div>
      </section>

      {/* 2. Risk Assessment & Historical Memory Comparison */}
      {risk && (
        <section className="space-y-8">
          {/* Risk Evaluation Banner */}
          <div className={`studio-card p-6 md:p-8 ${
            risk.riskLevel === 'CRITICAL' 
              ? 'bg-red-500/10 border-red-500/30' 
              : 'bg-white/[0.04] border-white/10'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className={`font-semibold tracking-wider uppercase ${
                    risk.riskLevel === 'CRITICAL' ? 'text-red-400' : 'text-white'
                  }`}>
                    {risk.riskLevel} Risk Evaluation
                  </span>
                  <span className="text-white/30">&middot;</span>
                  <span className="text-white/60">{risk.confidence}% pattern confidence</span>
                </div>

                <h3 className="text-xl font-medium text-white tracking-tight">
                  {risk.headline}
                </h3>

                <p className="text-sm text-white/70 leading-relaxed">
                  {risk.summary}
                </p>
              </div>

              <div className="sm:text-right shrink-0 pt-1">
                <span className="text-xs text-white/50 font-mono block">Recommended Safe Rollout</span>
                <span className="inline-block mt-1 text-xs font-mono font-medium px-3 py-1 rounded-full bg-white text-[#0a0908]">
                  {risk.recommendedStrategy === 'CANARY_5_PERCENT' ? 'Release to 5% of users first' : risk.recommendedStrategy}
                </span>
              </div>
            </div>
          </div>

          {/* Historical Memory Recall Comparison */}
          {risk.historicalComparison && (
            <div className="studio-card p-6 md:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/10">
                <div>
                  <h4 className="text-base font-medium text-white tracking-tight flex items-center gap-2">
                    <span>Identical Past Mistake Found: Outage #{risk.historicalComparison.similarDeploymentNumber}</span>
                  </h4>
                  <p className="text-xs text-white/60 mt-0.5">
                    REACTOR searched historical memories and matched this code change to an outage that happened to our team previously.
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 font-semibold border border-red-500/40">
                    {risk.historicalComparison.similarityScore}% Pattern Match
                  </span>
                  {onViewHistoricalDeployment && (
                    <button
                      onClick={() => onViewHistoricalDeployment(risk.historicalComparison!.similarDeploymentNumber)}
                      className="text-white/60 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>View Past Incident Log</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Past Outage */}
                <div className="space-y-3.5 p-5 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className="text-red-400 font-semibold text-[11px] uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>What Happened Last Time (Outage #{risk.historicalComparison.similarDeploymentNumber})</span>
                  </div>

                  <div className="space-y-2 text-white/80 leading-relaxed">
                    <div>
                      <span className="text-white/50 font-mono">What Changed: </span>
                      <span className="text-white">{risk.historicalComparison.whatChangedThen}</span>
                    </div>
                    <div>
                      <span className="text-white/50 font-mono">What Broke: </span>
                      <span className="text-red-300 font-medium">{risk.historicalComparison.whatFailedThen}</span>
                    </div>
                    <div>
                      <span className="text-white/50 font-mono">Why It Broke: </span>
                      <span className="text-white/70">{risk.historicalComparison.rootCauseThen}</span>
                    </div>
                    <div className="pt-2.5 border-t border-red-500/20">
                      <span className="text-emerald-400 font-mono font-medium">How It Was Fixed: </span>
                      <span className="text-emerald-200">{risk.historicalComparison.resolutionThen}</span>
                    </div>
                  </div>
                </div>

                {/* Current Deployment & Differences */}
                <div className="space-y-3.5 p-5 rounded-xl bg-white/[0.04] border border-white/10">
                  <div className="text-white font-semibold text-[11px] uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5" />
                    <span>What Is Happening in This New Update (#{deployment.number})</span>
                  </div>

                  <ul className="space-y-2 text-white/80 list-disc list-inside leading-relaxed">
                    {risk.historicalComparison.keyDifferences.map((diff, idx) => (
                      <li key={idx}>{diff}</li>
                    ))}
                  </ul>

                  <div className="pt-2.5 border-t border-white/10 text-white/70 leading-relaxed">
                    <span className="text-white font-medium">Early Warning Advice: </span>
                    {risk.preventionAdvice}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Blast Radius Analysis (With User Facing Impact) */}
          <div className="studio-card p-6 md:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-2">
              <div>
                <h4 className="text-base font-medium text-white tracking-tight flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-white/50" />
                  <span>Who Gets Affected if This Fails? (Blast Radius)</span>
                </h4>
                <p className="text-xs text-white/60 mt-0.5">
                  If this code update crashes in production, here is what stops working for customers and employees.
                </p>
              </div>
              <span className="text-xs text-white/50 font-mono">
                {risk.blastRadius.length} connected services
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
              {risk.blastRadius.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white/[0.04] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{item.service}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      item.severity === 'HIGH' ? 'text-red-300 bg-red-500/20 border border-red-500/30' : 'text-amber-300 bg-amber-500/20 border border-amber-500/30'
                    }`}>
                      {item.severity === 'HIGH' ? 'Critical Failure' : 'Moderate Impact'}
                    </span>
                  </div>

                  {item.userFacingImpact && (
                    <div className="text-xs font-medium text-white bg-white/[0.06] p-2 rounded-lg border border-white/10">
                      User Impact: {item.userFacingImpact}
                    </div>
                  )}

                  <div className="text-white/50 font-mono text-[11px]">System Path: {item.dependencyPath}</div>
                  <div className="text-white/70 leading-snug">{item.potentialImpact}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Pre-Flight Verification Checklist */}
          <div className="studio-card p-6 md:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div>
                <h4 className="text-base font-medium text-white tracking-tight flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-white/50" />
                  <span>Pre-Release Safety Checklist</span>
                </h4>
                <p className="text-xs text-white/60 mt-0.5">
                  Complete these safety verifications to guarantee the code will not crash production.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-24 bg-white/15 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-white h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-white/60 tabular-nums">
                  {completedCount}/{checklist.length} verified
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {checklist.map((item) => (
                <div 
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-colors ${
                    item.completed 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-white/[0.04] border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-start gap-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => toggleCheckItem(item.id)}
                        className="mt-0.5 h-4 w-4 rounded border-white/20 text-white focus:ring-0 cursor-pointer accent-white"
                      />
                      <div className="space-y-0.5">
                        <div className={`text-xs ${item.completed ? 'line-through text-white/40' : 'text-white font-semibold'}`}>
                          {item.plainEnglishTask || item.task}
                        </div>
                        {item.plainEnglishTask && (
                          <div className="text-[11px] text-white/50 font-mono">
                            Technical check: {item.task}
                          </div>
                        )}
                      </div>
                    </label>

                    <span className="text-[10px] font-mono text-white/45 uppercase shrink-0">
                      {item.category}
                    </span>
                  </div>

                  {item.command && (
                    <div className="mt-2.5 ml-7 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-black/40 border border-white/10 font-mono text-xs text-white/90">
                      <code className="truncate">{item.command}</code>
                      <button
                        onClick={() => copyToClipboard(item.command!)}
                        className="text-white/60 hover:text-white px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedCommand === item.command ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Command</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 4. Record Outcome & Retain into Hindsight */}
          <div className="studio-card p-6 md:p-8 space-y-5">
            <div className="pb-4 border-b border-white/10">
              <h4 className="text-base font-medium text-white tracking-tight">
                Save Deployment Outcome &amp; Teach the AI
              </h4>
              <p className="text-xs text-white/60 mt-0.5">
                When your deployment finishes, record what happened so future engineers have this knowledge in their memory bank forever.
              </p>
            </div>

            {deployment.outcome?.retainedInHindsight ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1.5">
                <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Check className="h-4 w-4" />
                  <span>Saved in Hindsight Memory Vault</span>
                </div>
                <div className="text-white/50 font-mono text-[11px]">
                  Memory ID: {deployment.outcome.hindsightMemoryId || 'mem-latest'} &middot; Outcome: {deployment.outcome.status}
                </div>
                <p className="text-white/90 text-xs leading-relaxed">
                  Lessons learned: {deployment.feedback?.lessonsLearned}
                </p>
              </div>
            ) : (
              <form onSubmit={handleOutcomeSubmit} className="space-y-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-white/70 font-medium mb-1.5">Deployment Result</label>
                    <select
                      value={outcomeStatus}
                      onChange={(e) => setOutcomeStatus(e.target.value as any)}
                      className="w-full rounded-lg bg-[#0a0f1d] border border-white/15 px-3 py-2 text-white text-xs focus:outline-none focus:border-white/40"
                    >
                      <option value="SUCCESS">SUCCESS (Deployed smoothly)</option>
                      <option value="DEGRADED">DEGRADED (Some bugs observed)</option>
                      <option value="FAILURE">FAILURE (Crashed and rolled back)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/70 font-medium mb-1.5">Verifying Engineer</label>
                    <input
                      type="text"
                      value={engineerName}
                      onChange={(e) => setEngineerName(e.target.value)}
                      className="w-full rounded-lg bg-[#0a0f1d] border border-white/15 px-3 py-2 text-white text-xs focus:outline-none focus:border-white/40"
                    />
                  </div>

                  <div>
                    <label className="block text-white/70 font-medium mb-1.5">Was the AI Warning Helpful?</label>
                    <div className="flex items-center gap-4 pt-2">
                      <label className="flex items-center gap-1.5 cursor-pointer text-white">
                        <input
                          type="radio"
                          name="accurate"
                          checked={wasPredictionAccurate}
                          onChange={() => setWasPredictionAccurate(true)}
                          className="accent-white"
                        />
                        Accurate Warning (Saved us)
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-white/60">
                        <input
                          type="radio"
                          name="accurate"
                          checked={!wasPredictionAccurate}
                          onChange={() => setWasPredictionAccurate(false)}
                          className="accent-white"
                        />
                        False Alarm
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 font-medium mb-1.5">What happened during deployment?</label>
                  <textarea
                    rows={2}
                    value={actualOutcomeNotes}
                    onChange={(e) => setActualOutcomeNotes(e.target.value)}
                    className="w-full rounded-lg bg-[#0a0f1d] border border-white/15 p-3 text-white text-xs focus:outline-none focus:border-white/40"
                  />
                </div>

                <div>
                  <label className="block text-white/70 font-medium mb-1.5">Lessons learned for future engineers</label>
                  <textarea
                    rows={2}
                    value={lessonsLearned}
                    onChange={(e) => setLessonsLearned(e.target.value)}
                    className="w-full rounded-lg bg-[#0a0f1d] border border-white/15 p-3 text-white text-xs focus:outline-none focus:border-white/40"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <div className="text-white/50 text-[11px] font-mono flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-white/40" />
                    <span>Target memory bank: reactor-core</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingOutcome}
                    className="pill text-xs !h-9 !px-5"
                  >
                    {isSubmittingOutcome ? 'Saving...' : 'Confirm & Save into Team Memory'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
