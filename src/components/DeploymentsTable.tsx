import React, { useState } from 'react';
import { Deployment } from '../types/reactor.js';
import { 
  GitCommit, 
  Search, 
  ArrowUpRight
} from 'lucide-react';

interface DeploymentsTableProps {
  deployments: Deployment[];
  selectedDeploymentId: string | null;
  onSelectDeployment: (id: string) => void;
}

export const DeploymentsTable: React.FC<DeploymentsTableProps> = ({
  deployments,
  selectedDeploymentId,
  onSelectDeployment
}) => {
  const [filterService, setFilterService] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const services = ['ALL', ...Array.from(new Set(deployments.map(d => d.service)))];

  const filtered = deployments.filter(d => {
    if (filterService !== 'ALL' && d.service !== filterService) return false;
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'FAILED' && d.status !== 'failed_in_production' && d.status !== 'rolled_back') return false;
      if (filterStatus === 'SUCCESS' && d.status !== 'deployed_success') return false;
      if (filterStatus === 'FLAGGED' && d.status !== 'risk_flagged') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = d.commitMessage.toLowerCase().includes(q);
      const matchCommit = d.commitHash.toLowerCase().includes(q);
      const matchAuthor = d.author.name.toLowerCase().includes(q);
      const matchService = d.service.toLowerCase().includes(q);
      const matchNum = `#${d.number}`.includes(q);
      if (!matchMsg && !matchCommit && !matchAuthor && !matchService && !matchNum) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commits, authors, services, or #..."
            className="w-full rounded-xl bg-white/[0.05] border border-white/15 pl-10 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-white/40"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-white/50 font-mono text-[11px]">Service:</span>
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="rounded-lg bg-[#0a0f1d] border border-white/15 px-2.5 py-1.5 text-white text-xs focus:outline-none"
            >
              {services.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-white/50 font-mono text-[11px]">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg bg-[#0a0f1d] border border-white/15 px-2.5 py-1.5 text-white text-xs focus:outline-none"
            >
              <option value="ALL">All</option>
              <option value="FAILED">Failures &amp; Rollbacks</option>
              <option value="FLAGGED">Risk Flagged</option>
              <option value="SUCCESS">Deployed Success</option>
            </select>
          </div>
        </div>
      </div>

      {/* Clean Table Container */}
      <div className="studio-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white">
            <thead className="bg-white/[0.03] text-white/50 border-b border-white/10 font-mono text-[11px]">
              <tr>
                <th className="py-3 px-5">#</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-5">Commit Message &amp; Normalized Changes</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Risk</th>
                <th className="py-3 px-4">Author</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {filtered.map((dep) => {
                const isSelected = selectedDeploymentId === dep.id;
                const isFailure = dep.status === 'failed_in_production' || dep.status === 'rolled_back';
                const isFlagged = dep.status === 'risk_flagged';

                return (
                  <tr
                    key={dep.id}
                    onClick={() => onSelectDeployment(dep.id)}
                    className={`hover:bg-white/[0.06] transition-colors cursor-pointer ${
                      isSelected ? 'bg-white/[0.08]' : ''
                    }`}
                  >
                    <td className="py-3.5 px-5 font-mono text-xs font-semibold text-white">
                      #{dep.number}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-white/70">
                      {dep.service}
                    </td>

                    <td className="py-3.5 px-5 max-w-md">
                      <div className="font-medium text-white line-clamp-1 flex items-center gap-1.5">
                        <GitCommit className="h-3.5 w-3.5 text-white/40 shrink-0" />
                        <span>{dep.commitMessage}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-white/50 font-mono">
                        <span>{dep.commitHash}</span>
                        {dep.dependencyChanges.length > 0 && (
                          <span>&middot; {dep.dependencyChanges.map(d => `${d.name} ${d.toVersion}`).join(', ')}</span>
                        )}
                        {dep.databaseChanges.length > 0 && (
                          <span className="text-amber-400">&middot; DB Migration</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-block text-[10px] font-mono px-2.5 py-0.5 rounded-full font-medium ${
                        isFailure
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : isFlagged
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {dep.status === 'failed_in_production' 
                          ? 'Failed Outage' 
                          : dep.status === 'rolled_back'
                          ? 'Rolled Back'
                          : dep.status === 'risk_flagged'
                          ? 'Risk Flagged'
                          : 'Safely Deployed'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {dep.riskAssessment ? (
                        <span className={`text-[11px] font-mono font-semibold ${
                          dep.riskAssessment.riskLevel === 'CRITICAL' 
                            ? 'text-red-400' 
                            : dep.riskAssessment.riskLevel === 'HIGH'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}>
                          {dep.riskAssessment.riskLevel}
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-white/40">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-white/70">
                      {dep.author.name}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDeployment(dep.id);
                        }}
                        className="pill-outline !h-7 !px-2.5 text-[11px] gap-1"
                      >
                        <span>Inspect</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
