import React, { useState } from 'react';
import { DependencyChange, DatabaseChange, InfraChange } from '../types/reactor.js';
import { X } from 'lucide-react';

interface CustomDeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  isAnalyzing: boolean;
}

export const CustomDeploymentModal: React.FC<CustomDeploymentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isAnalyzing
}) => {
  const [service, setService] = useState('checkout-api');
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'canary'>('production');
  const [commitMessage, setCommitMessage] = useState('feat(db): update postgres client configuration and connection pool');
  const [authorName, setAuthorName] = useState('Alex Rivera');
  
  // Dynamic changes
  const [depName, setDepName] = useState('pg');
  const [fromVer, setFromVer] = useState('8.7.3');
  const [toVer, setToVer] = useState('8.11.3');

  const [hasDbMigration, setHasDbMigration] = useState(false);
  const [migrationName, setMigrationName] = useState('20260928_optimize_indexes');
  const [migrationDetails, setMigrationDetails] = useState('ALTER TABLE orders ADD COLUMN idempotency_key VARCHAR');

  const [hasInfraChange, setHasInfraChange] = useState(false);
  const [infraComponent, setInfraComponent] = useState('kubernetes');
  const [infraDesc, setInfraDesc] = useState('Adjust pod memory limit to 512Mi');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div className="studio-card w-full max-w-lg bg-[#0a0f1d] border border-white/20 p-6 md:p-8 shadow-2xl space-y-5 text-xs">
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <div>
            <h3 className="text-base font-medium text-white tracking-tight">
              Test a Custom Code Change (PR)
            </h3>
            <p className="text-[11px] text-white/50 mt-0.5">
              Simulate submitting code to see how Hindsight evaluates risk and catches past mistakes.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white cursor-pointer p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1-Click Presets */}
        <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.04] border border-white/10">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">
            Quick 1-Click Test Presets:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setService('checkout-api');
                setCommitMessage('feat(checkout): bump pg driver to 8.11.3 for pooling');
                setDepName('pg');
                setFromVer('8.7.3');
                setToVer('8.11.3');
                setHasDbMigration(false);
                setHasInfraChange(false);
              }}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer"
            >
              Repeat Outage (pg driver)
            </button>

            <button
              type="button"
              onClick={() => {
                setService('auth-gateway');
                setCommitMessage('perf(infra): cut container memory from 1Gi to 384Mi');
                setDepName('');
                setHasDbMigration(false);
                setHasInfraChange(true);
                setInfraComponent('kubernetes');
                setInfraDesc('Cut pod memory limit to 384Mi');
              }}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer"
            >
              Cut Server RAM by 50%
            </button>

            <button
              type="button"
              onClick={() => {
                setService('user-service');
                setCommitMessage('feat(db): add non-null column without default');
                setDepName('');
                setHasDbMigration(true);
                setMigrationName('20260929_add_phone_number');
                setMigrationDetails('ALTER TABLE users ADD COLUMN phone_number VARCHAR NOT NULL');
                setHasInfraChange(false);
              }}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer"
            >
              Lock Database Table
            </button>
          </div>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const dependencyChanges: DependencyChange[] = depName ? [
              {
                name: depName,
                fromVersion: fromVer,
                toVersion: toVer,
                isMajor: false,
                type: 'production'
              }
            ] : [];

            const databaseChanges: DatabaseChange[] = hasDbMigration ? [
              {
                migrationName,
                type: 'schema',
                hasDestructiveOperations: false,
                details: migrationDetails
              }
            ] : [];

            const infraChanges: InfraChange[] = hasInfraChange ? [
              {
                component: infraComponent,
                changeType: 'helm',
                description: infraDesc
              }
            ] : [];

            await onSubmit({
              service,
              environment,
              commitMessage,
              authorName,
              dependencyChanges,
              databaseChanges,
              infraChanges
            });
            onClose();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/60 font-mono text-[11px] mb-1">Target Service</label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full rounded-xl bg-white/[0.05] border border-white/15 px-3 py-2 text-white text-xs focus:outline-none focus:border-white/40"
              >
                <option value="checkout-api" className="bg-[#0a0f1d]">checkout-api (Core payments)</option>
                <option value="user-service" className="bg-[#0a0f1d]">user-service (Profiles)</option>
                <option value="search-service" className="bg-[#0a0f1d]">search-service (Catalog)</option>
                <option value="order-router" className="bg-[#0a0f1d]">order-router (Fulfillment)</option>
              </select>
            </div>

            <div>
              <label className="block text-white/60 font-mono text-[11px] mb-1">Target Environment</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as any)}
                className="w-full rounded-xl bg-white/[0.05] border border-white/15 px-3 py-2 text-white text-xs focus:outline-none focus:border-white/40"
              >
                <option value="production" className="bg-[#0a0f1d]">production</option>
                <option value="staging" className="bg-[#0a0f1d]">staging</option>
                <option value="canary" className="bg-[#0a0f1d]">canary</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-white/60 font-mono text-[11px] mb-1">Git Commit Message</label>
            <input
              type="text"
              required
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="w-full rounded-xl bg-white/[0.05] border border-white/15 px-3 py-2 text-white text-xs focus:outline-none focus:border-white/40"
            />
          </div>

          <div>
            <label className="block text-white/60 font-mono text-[11px] mb-1">Author Name</label>
            <input
              type="text"
              required
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full rounded-xl bg-white/[0.05] border border-white/15 px-3 py-2 text-white text-xs focus:outline-none focus:border-white/40"
            />
          </div>

          {/* Dependency Delta */}
          <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 space-y-2">
            <span className="text-[11px] font-mono text-white font-medium block">Dependency Change</span>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Package (e.g. pg)"
                value={depName}
                onChange={(e) => setDepName(e.target.value)}
                className="rounded-lg bg-white/[0.05] border border-white/15 px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-white/40"
              />
              <input
                type="text"
                placeholder="From (8.7.3)"
                value={fromVer}
                onChange={(e) => setFromVer(e.target.value)}
                className="rounded-lg bg-white/[0.05] border border-white/15 px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-white/40"
              />
              <input
                type="text"
                placeholder="To (8.11.3)"
                value={toVer}
                onChange={(e) => setToVer(e.target.value)}
                className="rounded-lg bg-white/[0.05] border border-white/15 px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-white/40"
              />
            </div>
          </div>

          {/* Optional DB Migration */}
          <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-white font-medium text-xs">
              <input
                type="checkbox"
                checked={hasDbMigration}
                onChange={(e) => setHasDbMigration(e.target.checked)}
                className="accent-white"
              />
              Include Database Schema Migration
            </label>
            {hasDbMigration && (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  placeholder="Migration file name"
                  value={migrationName}
                  onChange={(e) => setMigrationName(e.target.value)}
                  className="w-full rounded-lg bg-white/[0.05] border border-white/15 px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-white/40"
                />
                <input
                  type="text"
                  placeholder="SQL statement / details"
                  value={migrationDetails}
                  onChange={(e) => setMigrationDetails(e.target.value)}
                  className="w-full rounded-lg bg-white/[0.05] border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/40"
                />
              </div>
            )}
          </div>

          {/* Optional Infra Change */}
          <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-white font-medium text-xs">
              <input
                type="checkbox"
                checked={hasInfraChange}
                onChange={(e) => setHasInfraChange(e.target.checked)}
                className="accent-white"
              />
              Include Infrastructure / Helm Change
            </label>
            {hasInfraChange && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Component (e.g. k8s)"
                  value={infraComponent}
                  onChange={(e) => setInfraComponent(e.target.value)}
                  className="rounded-lg bg-white/[0.05] border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/40"
                />
                <input
                  type="text"
                  placeholder="Change description"
                  value={infraDesc}
                  onChange={(e) => setInfraDesc(e.target.value)}
                  className="rounded-lg bg-white/[0.05] border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/40"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="pill-outline text-xs !h-9 !px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAnalyzing}
              className="pill text-xs !h-9 !px-5"
            >
              {isAnalyzing ? 'Analyzing...' : 'Ingest & Trigger Pre-Flight'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
