import React, { useState } from 'react';
import { RotateCcw, Plus, Play, Info, ChevronDown, ChevronUp, BookOpen, HelpCircle } from 'lucide-react';

interface ScenarioHeaderProps {
  onRunCoreStory: () => void;
  onRunScenario: (scenario: string) => void;
  onReset: () => void;
  onOpenCustomModal: () => void;
  onOpenGlossary?: () => void;
  isAnalyzing: boolean;
  viewMode: 'friendly' | 'technical';
}

export const ScenarioHeader: React.FC<ScenarioHeaderProps> = ({
  onRunCoreStory,
  onRunScenario,
  onReset,
  onOpenCustomModal,
  onOpenGlossary,
  isAnalyzing,
  viewMode
}) => {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  return (
    <div className="studio-card p-6 md:p-8 space-y-6">
      {/* Studio Eyebrow & Title */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs tracking-wider uppercase text-white/50 font-mono">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AI Website Crash Prevention</span>
            <span>&middot;</span>
            <span>Early Safety Guard</span>
          </div>

          {onOpenGlossary && (
            <button
              type="button"
              onClick={onOpenGlossary}
              className="pill-outline !h-7 !px-3 text-xs gap-1.5 text-amber-300 hover:text-white border-amber-500/30"
            >
              <BookOpen className="w-3 h-3 text-amber-400" />
              <span>Plain English Dictionary</span>
            </button>
          )}
        </div>

        <h1 className="text-3xl md:text-5xl font-normal tracking-[-0.03em] text-white leading-[1.05] max-w-3xl">
          {viewMode === 'friendly' 
            ? 'Stop website crashes before they reach your customers.'
            : 'Pre-flight deployment verification via Hindsight organizational memory.'}
        </h1>

        <p className="text-base text-white/70 max-w-2xl leading-relaxed">
          {viewMode === 'friendly' ? (
            <>
              Every time a developer wants to update the website, <strong>REACTOR</strong> checks its memory of past glitches, outages, and fixes. If this new code looks like something that broke payment checkouts or crashed logins in the past, it sends an early warning with the exact copy-paste fix.
            </>
          ) : (
            <>
              Automated pre-flight gate evaluating pull requests against past post-mortems, AST diffs, schema migrations, and infrastructure drift using semantic vector recall.
            </>
          )}
        </p>

        {/* Friendly "How it works in 3 simple steps" accordion */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="text-xs text-white/70 hover:text-white inline-flex items-center gap-1.5 cursor-pointer font-medium transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
            <span>How does this protect normal users in 3 simple steps?</span>
            {showHowItWorks ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showHowItWorks && (
            <div className="mt-3 p-4 rounded-xl bg-white/[0.04] border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs animate-in fade-in duration-200">
              <div className="space-y-1 p-2">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white text-[10px]">1</span>
                  <span>1. Engineer Writes Code</span>
                </div>
                <p className="text-white/60 leading-relaxed">
                  A team member updates a software library, edits a customer database table, or tunes cloud server settings.
                </p>
              </div>

              <div className="space-y-1 p-2">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/40 text-amber-200 text-[10px]">2</span>
                  <span>2. AI Searches Past Outages</span>
                </div>
                <p className="text-white/60 leading-relaxed">
                  Hindsight searches past incident reports to check: <em>"Did an update like this cause customers to see error pages in the past?"</em>
                </p>
              </div>

              <div className="space-y-1 p-2">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/40 text-emerald-200 text-[10px]">3</span>
                  <span>3. Safety Warning &amp; Fix</span>
                </div>
                <p className="text-white/60 leading-relaxed">
                  Before anything goes live to real users, the engineer gets a clear alert and the exact steps to release safely.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spacious scenario control pills with clear human labels */}
      <div className="space-y-2 pt-1">
        <div className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
          Try an Interactive Safety Simulation:
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onRunCoreStory}
            disabled={isAnalyzing}
            className="pill text-xs !h-9 !px-4 gap-2"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Demo 1: Stop Repeat Checkout Crash (PR #27)</span>
          </button>

          <button
            type="button"
            onClick={() => onRunScenario('prisma_drift')}
            disabled={isAnalyzing}
            className="pill-outline text-xs !h-9 !px-3.5 gap-1.5"
          >
            <span>Demo 2: Database Freeze Warning</span>
          </button>

          <button
            type="button"
            onClick={() => onRunScenario('k8s_memory_reduction')}
            disabled={isAnalyzing}
            className="pill-outline text-xs !h-9 !px-3.5 gap-1.5"
          >
            <span>Demo 3: Server Memory Overload</span>
          </button>

          <button
            type="button"
            onClick={onOpenCustomModal}
            className="pill-outline text-xs !h-9 !px-3.5 gap-1.5 text-amber-200 hover:text-white border-amber-500/30"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Test Your Own Code Update</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            disabled={isAnalyzing}
            className="pill-outline text-xs !h-9 !px-3 text-white/60 hover:text-white gap-1"
            title="Reset to initial seed state"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>
    </div>
  );
};

