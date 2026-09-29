import React, { useState } from 'react';
import { Search, X, BookOpen, Check } from 'lucide-react';

interface GlossaryItem {
  term: string;
  simpleMeaning: string;
  realWorldAnalogy: string;
  whyItMatters: string;
}

const GLOSSARY_TERMS: GlossaryItem[] = [
  {
    term: 'Deployment / Release',
    simpleMeaning: 'Publishing newly written code from the engineer\'s computer to the live website or app that real customers use.',
    realWorldAnalogy: 'Like printing and sending out the latest revised edition of a textbook to all bookstores.',
    whyItMatters: 'If code has a hidden bug, this is the moment real customers start experiencing problems or broken buttons.'
  },
  {
    term: 'Pull Request (PR)',
    simpleMeaning: 'A proposed set of code changes submitted by a developer that is waiting for safety checks and team review before going live.',
    realWorldAnalogy: 'Like submitting an article draft to an editor for proofreading before it gets published on the front page.',
    whyItMatters: 'Checking code during the PR stage lets us catch mistakes before anything reaches live customers.'
  },
  {
    term: 'Post-Mortem / Incident Record',
    simpleMeaning: 'A written report created after a website crash explaining what broke, why it broke, and how the team fixed it.',
    realWorldAnalogy: 'Like an airplane flight recorder ("black box") report that helps pilots never repeat a past equipment failure.',
    whyItMatters: 'Without an AI memory system, new developers frequently repeat the same mistakes that caused past post-mortems.'
  },
  {
    term: 'Hindsight Memory Bank',
    simpleMeaning: 'An AI-powered long-term memory vault that indexes every past bug and solution so the team never makes the same mistake twice.',
    realWorldAnalogy: 'Like a team of veteran senior engineers who remember every glitch from the last 5 years and tap you on the shoulder before you make a mistake.',
    whyItMatters: 'Eliminates repeat outages and saves engineering teams hundreds of hours of debugging.'
  },
  {
    term: 'Blast Radius',
    simpleMeaning: 'The list of other features, apps, and customer screens that will stop working if this single piece of code breaks.',
    realWorldAnalogy: 'If the main electrical breaker in your house trips, the blast radius is your lights, refrigerator, and Wi-Fi router all shutting off together.',
    whyItMatters: 'Helps engineers understand which customer workflows (like Checkout or Login) are at risk before hitting deploy.'
  },
  {
    term: 'Canary Deployment',
    simpleMeaning: 'Sending a code update to only a tiny fraction of users (like 5%) to verify it works safely before releasing it to 100% of customers.',
    realWorldAnalogy: 'Like the historical canary in a coal mine: sending a small early warning test to verify the air is safe before everyone enters.',
    whyItMatters: 'If a bug exists, only 5% of users notice a glitch instead of bringing down the entire company for all customers.'
  },
  {
    term: 'Database Migration',
    simpleMeaning: 'Updating the structure of where customer data is stored, such as adding new columns, tables, or rules.',
    realWorldAnalogy: 'Like remodeling the shelving system inside a giant warehouse while workers are actively picking and shipping boxes.',
    whyItMatters: 'If done wrong, it can lock tables and freeze the whole website for minutes or hours.'
  },
  {
    term: 'Software Dependency / Package',
    simpleMeaning: 'Pre-made software tools and libraries created by other companies (like Stripe for credit cards or PostgreSQL drivers for databases).',
    realWorldAnalogy: 'Like buying pre-fabricated tires or engines when assembling a car instead of manufacturing every screw from scratch.',
    whyItMatters: 'Updating these third-party packages to newer versions frequently breaks compatibility with existing systems.'
  },
  {
    term: 'TLS / SSL Certificate',
    simpleMeaning: 'A digital security passport that encrypts data between your web browser and the server so passwords and credit cards cannot be stolen.',
    realWorldAnalogy: 'Like a verified security badge with a holographic seal that proves the server is genuine and trusted.',
    whyItMatters: 'If the security certificate doesn\'t match, the computer refuses to connect and users see a connection error.'
  },
  {
    term: 'Connection Pool',
    simpleMeaning: 'A shared pool of open pathways between the web application and the database to quickly fetch information without re-connecting every second.',
    realWorldAnalogy: 'Like having 12 open checkout lanes at a grocery store ready for shoppers instead of building a new cashier booth for every single customer.',
    whyItMatters: 'If all connections are busy or hung, no new customer can log in or buy items.'
  }
];

interface PlainEnglishGlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlainEnglishGlossaryModal: React.FC<PlainEnglishGlossaryModalProps> = ({
  isOpen,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filtered = GLOSSARY_TERMS.filter(item => 
    item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.simpleMeaning.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.realWorldAnalogy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="studio-card w-full max-w-2xl bg-[#070d1a] border border-white/20 p-6 md:p-8 shadow-2xl space-y-5 text-xs max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-white font-medium text-base">
              <BookOpen className="h-4 w-4 text-amber-400" />
              <span>Plain English Dictionary &middot; Jargon Buster</span>
            </div>
            <p className="text-white/60 text-xs">
              Every technical term explained in everyday, human language with real-world analogies.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative shrink-0">
          <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-white/40" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search any term (e.g. 'PR', 'Canary', 'Blast Radius', 'Deployment')..."
            className="w-full rounded-xl bg-white/[0.05] border border-white/15 pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-white/40"
          />
        </div>

        {/* Term List */}
        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-white/[0.04] border border-white/10 space-y-2.5 hover:border-white/25 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-sm tracking-tight">{item.term}</span>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Plain English
                </span>
              </div>

              <div className="space-y-1.5 text-white/80 leading-relaxed">
                <div>
                  <span className="text-white/45 font-mono text-[11px] block">Simple Definition:</span>
                  <p className="text-white/90 text-xs font-medium">{item.simpleMeaning}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 text-white/70 text-xs">
                  <span className="text-amber-400 font-mono text-[11px] font-medium block mb-0.5">Real-World Analogy:</span>
                  <p className="italic">{item.realWorldAnalogy}</p>
                </div>

                <div>
                  <span className="text-white/45 font-mono text-[11px] block">Why It Matters:</span>
                  <p className="text-white/75 text-xs">{item.whyItMatters}</p>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-8 text-white/40 italic">
              No matching terms found. Try searching for "PR", "Database", or "Canary".
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-white/50 font-mono">
            {GLOSSARY_TERMS.length} terms simplified for everyone
          </span>
          <button
            onClick={onClose}
            className="pill text-xs !h-8.5 !px-4"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
