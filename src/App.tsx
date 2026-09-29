import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { ScenarioHeader } from './components/ScenarioHeader.js';
import { DeploymentInspector } from './components/DeploymentInspector.js';
import { HindsightExplorer } from './components/HindsightExplorer.js';
import { DeploymentsTable } from './components/DeploymentsTable.js';
import { DevOpsAgentChat } from './components/DevOpsAgentChat.js';
import { CustomDeploymentModal } from './components/CustomDeploymentModal.js';
import { PlainEnglishGlossaryModal } from './components/PlainEnglishGlossaryModal.js';
import { Deployment, HindsightMemory, HindsightBank, MemoryGraph } from './types/reactor.js';
import { ShieldCheck } from 'lucide-react';
import bgImage from './assets/images/bg.webp';

export default function App() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'memory' | 'history' | 'agent'>('pipeline');
  const [viewMode, setViewMode] = useState<'friendly' | 'technical'>('friendly');
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [activeDeployment, setActiveDeployment] = useState<Deployment | null>(null);
  
  const [hindsightMemories, setHindsightMemories] = useState<HindsightMemory[]>([]);
  const [hindsightBanks, setHindsightBanks] = useState<HindsightBank[]>([]);
  const [hindsightGraph, setHindsightGraph] = useState<MemoryGraph>({ nodes: [], edges: [] });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmittingOutcome, setIsSubmittingOutcome] = useState(false);
  const [isLoadingRecall, setIsLoadingRecall] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    try {
      const [depRes, memRes, bankRes, graphRes] = await Promise.all([
        fetch('/api/deployments'),
        fetch('/api/hindsight/memories'),
        fetch('/api/hindsight/banks'),
        fetch('/api/hindsight/graph')
      ]);

      const depData: Deployment[] = await depRes.json();
      const memData: HindsightMemory[] = await memRes.json();
      const bankData: HindsightBank[] = await bankRes.json();
      const graphData: MemoryGraph = await graphRes.json();

      setDeployments(depData);
      setHindsightMemories(memData);
      setHindsightBanks(bankData);
      setHindsightGraph(graphData);

      // Default to Deployment #27 or latest
      if (!activeDeployment && depData.length > 0) {
        const dep27 = depData.find(d => d.number === 27);
        setActiveDeployment(dep27 || depData[0]);
      }
    } catch (err) {
      console.error('Failed to load reactor data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Run the Core Product Story: Deployment #1 vs Deployment #27
  const handleRunCoreStory = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/deployments/trigger-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: 'deployment_27_core_story' })
      });
      const data = await res.json();
      await loadData();
      setActiveDeployment(data.deployment);
      setActiveTab('pipeline');
      showNotification('Deployment #27 analyzed: Recalled Deployment #1 with 92% similarity');
    } catch (err: any) {
      showNotification(`Error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRunScenario = async (scenario: string) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/deployments/trigger-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario })
      });
      const data = await res.json();
      await loadData();
      setActiveDeployment(data.deployment);
      setActiveTab('pipeline');
      showNotification(`Scenario loaded: ${data.deployment.commitMessage}`);
    } catch (err: any) {
      showNotification(`Error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = async () => {
    try {
      await fetch('/api/deployments/reset', { method: 'POST' });
      await loadData();
      setActiveDeployment(null);
      showNotification('Reset to baseline seed deployments and memories');
    } catch (err: any) {
      showNotification(`Error resetting state: ${err.message}`);
    }
  };

  const handleSelectDeployment = (id: string) => {
    const dep = deployments.find(d => d.id === id);
    if (dep) {
      setActiveDeployment(dep);
      setActiveTab('pipeline');
    }
  };

  const handleViewHistoricalDeployment = (depNumber: number) => {
    const dep = deployments.find(d => d.number === depNumber);
    if (dep) {
      setActiveDeployment(dep);
      showNotification(`Viewing historical Deployment #${depNumber} incident record`);
    }
  };

  const handleRecordOutcome = async (data: any) => {
    if (!activeDeployment) return;
    setIsSubmittingOutcome(true);
    try {
      const res = await fetch(`/api/deployments/${activeDeployment.id}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      await loadData();
      setActiveDeployment(result.deployment);
      showNotification('Deployment outcome recorded and retained into Hindsight');
    } catch (err: any) {
      showNotification(`Error retaining outcome: ${err.message}`);
    } finally {
      setIsSubmittingOutcome(false);
    }
  };

  const handleRecallQuery = async (query: string, bankId?: string) => {
    setIsLoadingRecall(true);
    try {
      const res = await fetch('/api/hindsight/recall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, bankId, threshold: 0.20, topK: 5 })
      });
      return await res.json();
    } catch (err: any) {
      showNotification(`Recall error: ${err.message}`);
      return null;
    } finally {
      setIsLoadingRecall(false);
    }
  };

  const handleRetainMemory = async (memoryData: Partial<HindsightMemory>) => {
    try {
      await fetch('/api/hindsight/retain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memoryData)
      });
      await loadData();
      showNotification('Memory entry retained into Hindsight bank');
    } catch (err: any) {
      showNotification(`Retain error: ${err.message}`);
    }
  };

  const handleCustomDeployment = async (customData: any) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/deployments/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customData)
      });
      const data = await res.json();
      await loadData();
      setActiveDeployment(data.deployment);
      setActiveTab('pipeline');
      showNotification(`Custom deployment #${data.deployment.number} ingested`);
    } catch (err: any) {
      showNotification(`Analysis error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="relative min-h-screen text-white flex flex-col font-sans selection:bg-white selection:text-[#0a0908] antialiased">
      {/* 1. Fixed Atmospheric Flowing Background Video & Animated Streams */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none bg-[#02060f]">
        {/* Looping Ambient Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={bgImage}
          className="absolute inset-0 w-full h-full object-cover object-center scale-[1.03]"
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104303_0c6d60b2-9353-408e-9449-585108a22fb5.mp4" type="video/mp4" />
        </video>

        {/* Fallback Poster in case video stalls or reduced motion */}
        <img
          src={bgImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center opacity-40 mix-blend-screen"
        />

        {/* Flowing Light Stream from Left Side */}
        <div className="absolute top-0 left-0 w-3/4 h-3/4 pointer-events-none animate-flow-left">
          <div className="w-full h-full bg-gradient-to-br from-amber-400/25 via-amber-300/10 to-transparent blur-3xl" />
        </div>

        {/* Dynamic Laser Sweep from Upper-Left */}
        <div className="absolute -top-1/4 -left-1/4 w-[120%] h-[120%] pointer-events-none animate-sweep-left">
          <div className="w-full h-16 bg-gradient-to-r from-transparent via-amber-300/35 to-transparent blur-xl" />
        </div>

        {/* Flowing Light Stream from Right Side */}
        <div className="absolute top-0 right-0 w-3/4 h-3/4 pointer-events-none animate-flow-right">
          <div className="w-full h-full bg-gradient-to-bl from-amber-400/25 via-amber-300/10 to-transparent blur-3xl" />
        </div>

        {/* Dynamic Laser Sweep from Upper-Right */}
        <div className="absolute -top-1/4 -right-1/4 w-[120%] h-[120%] pointer-events-none animate-sweep-right">
          <div className="w-full h-16 bg-gradient-to-r from-transparent via-amber-300/35 to-transparent blur-xl" />
        </div>

        {/* Lower Blue Streams from Both Bottom Corners */}
        <div className="absolute bottom-0 left-0 w-2/3 h-1/2 bg-gradient-to-tr from-sky-500/20 via-sky-400/5 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 w-2/3 h-1/2 bg-gradient-to-tl from-sky-500/20 via-sky-400/5 to-transparent blur-3xl" />

        {/* Center Convergence Pulse */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-amber-200/20 blur-3xl animate-pulse-converge" />

        {/* Subtle Vignette & Scrim for Readability */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[0.5px]" />
      </div>

      {/* 2. Fixed Chrome Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCustomModal={() => setIsCustomModalOpen(true)}
        onOpenGlossary={() => setIsGlossaryOpen(true)}
        onRunCoreStory={handleRunCoreStory}
        isAnalyzing={isAnalyzing}
        hindsightStats={{
          memoryCount: hindsightMemories.length,
          bankCount: hindsightBanks.length
        }}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Floating Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 rounded-full bg-[#0a0908] text-white px-5 py-3 text-xs shadow-2xl flex items-center gap-2.5 border border-white/20">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Viewport Content Floating Over Background */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 md:px-10 pt-20 md:pt-24 pb-16 space-y-10">
        {/* Tab 1: Pre-Flight Pipeline */}
        {activeTab === 'pipeline' && (
          <div className="space-y-10">
            <ScenarioHeader
              onRunCoreStory={handleRunCoreStory}
              onRunScenario={handleRunScenario}
              onReset={handleReset}
              onOpenCustomModal={() => setIsCustomModalOpen(true)}
              onOpenGlossary={() => setIsGlossaryOpen(true)}
              isAnalyzing={isAnalyzing}
              viewMode={viewMode}
            />

            {activeDeployment ? (
              <DeploymentInspector
                deployment={activeDeployment}
                onRecordOutcome={handleRecordOutcome}
                isSubmittingOutcome={isSubmittingOutcome}
                onViewHistoricalDeployment={handleViewHistoricalDeployment}
                onOpenGlossary={() => setIsGlossaryOpen(true)}
                viewMode={viewMode}
              />
            ) : (
              <div className="studio-card p-12 text-center space-y-4">
                <ShieldCheck className="h-10 w-10 text-white/40 mx-auto" />
                <h3 className="text-base font-medium text-white">No Deployment Selected</h3>
                <p className="text-xs text-white/60 max-w-sm mx-auto">
                  Select a simulation above or trigger Deployment #27 to inspect pre-flight risk.
                </p>
                <button
                  onClick={handleRunCoreStory}
                  className="pill text-xs !h-9 !px-4"
                >
                  Run Deployment #27
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Hindsight Agent Memory Explorer */}
        {activeTab === 'memory' && (
          <div className="space-y-8">
            <div className="studio-card p-6 md:p-8 space-y-2">
              <div className="text-xs font-mono text-white/50 uppercase tracking-wider">
                Team Shared Brain
              </div>
              <h1 className="text-2xl md:text-4xl font-normal tracking-tight text-white">
                {viewMode === 'friendly' ? 'Incident Memory Vault' : 'Hindsight Memory Banks'}
              </h1>
              <p className="text-sm text-white/70 max-w-2xl leading-relaxed">
                {viewMode === 'friendly'
                  ? 'Browse the library of past outages, post-mortems, and verified fixes that protect your application before every release.'
                  : 'Query the long-term semantic memory layer to view recalled incident graphs, dependency histories, and verified remediation patterns.'}
              </p>
            </div>

            <HindsightExplorer
              memories={hindsightMemories}
              banks={hindsightBanks}
              graph={hindsightGraph}
              onRecallQuery={handleRecallQuery}
              onRetainMemory={handleRetainMemory}
              isLoadingRecall={isLoadingRecall}
            />
          </div>
        )}

        {/* Tab 3: Historical Deployment Ledger */}
        {activeTab === 'history' && (
          <div className="space-y-8">
            <div className="studio-card p-6 md:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2">
                <div className="text-xs font-mono text-white/50 uppercase tracking-wider">
                  Audit History
                </div>
                <h1 className="text-2xl md:text-4xl font-normal tracking-tight text-white">
                  {viewMode === 'friendly' ? 'Release & Outage History' : 'Deployment Ledger'}
                </h1>
                <p className="text-sm text-white/70 max-w-2xl leading-relaxed">
                  {viewMode === 'friendly'
                    ? 'A timeline of past code releases, incidents caught by the safety gate, and lessons retained for the team.'
                    : 'Historical ledger of deployments, downstream blast radiuses, and post-incident retentions.'}
                </p>
              </div>

              <div className="text-xs font-mono text-white/60 font-medium">
                {deployments.length} deployments indexed
              </div>
            </div>

            <DeploymentsTable
              deployments={deployments}
              selectedDeploymentId={activeDeployment?.id || null}
              onSelectDeployment={handleSelectDeployment}
            />
          </div>
        )}

        {/* Tab 4: DevOps Agent Q&A */}
        {activeTab === 'agent' && (
          <div className="space-y-8">
            <div className="studio-card p-6 md:p-8 space-y-2">
              <div className="text-xs font-mono text-white/50 uppercase tracking-wider">
                Engineering Assistant
              </div>
              <h1 className="text-2xl md:text-4xl font-normal tracking-tight text-white">
                {viewMode === 'friendly' ? 'DevOps Knowledge Assistant' : 'DevOps Knowledge Agent'}
              </h1>
              <p className="text-sm text-white/70 max-w-2xl leading-relaxed">
                {viewMode === 'friendly'
                  ? 'Ask questions in plain English about why a change is risky, what caused a past outage, or request step-by-step fix commands.'
                  : 'Query historical outages, dependency incompatibilities, and preventative remediations via semantic recall.'}
              </p>
            </div>

            <DevOpsAgentChat />
          </div>
        )}
      </main>

      {/* Ingest Custom Deployment Modal */}
      <CustomDeploymentModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSubmit={handleCustomDeployment}
        isAnalyzing={isAnalyzing}
      />

      {/* Plain English Jargon Dictionary Modal */}
      <PlainEnglishGlossaryModal
        isOpen={isGlossaryOpen}
        onClose={() => setIsGlossaryOpen(false)}
      />

      {/* Studio Footer Floating Over Background */}
      <footer className="relative z-10 w-full border-t border-white/10 bg-[#02060f]/80 backdrop-blur-xl py-8 px-6 text-xs text-white/60 font-sans">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2 font-mono">
            <span className="font-semibold text-white">REACTOR</span>
            <span>&middot;</span>
            <span>112 Deployment Lane</span>
            <span>&middot;</span>
            <span>Continuous Memory Loop</span>
          </div>
          <div>
            Powered by Hindsight long-term agent memory
          </div>
        </div>
      </footer>
    </div>
  );
}
