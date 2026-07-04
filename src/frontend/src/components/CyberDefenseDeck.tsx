import React from 'react';
import { Shield, Fingerprint, PenTool, Hash, Clock, Database, KeyRound, ListChecks, HelpCircle } from 'lucide-react';
import { SoundFX } from './SoundFXController';

interface DefenseCardData {
  defense_id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  score_cost: number;
  is_correct?: boolean;
  is_required?: boolean;
  hint_text?: string;
}

interface CyberDefenseDeckProps {
  defenseOptions: DefenseCardData[];
  selectedIds: string[];
  onToggleDefense: (id: string) => void;
  disabled: boolean;
}

const categoryIcons: { [key: string]: any } = {
  CONFIDENTIALITY: Shield,
  INTEGRITY: Fingerprint,
  AUTHENTICATION: PenTool,
  ANTI_REPLAY: Clock,
  KEY_MANAGEMENT: KeyRound,
  LOGGING: ListChecks,
};

const categoryColors: { [key: string]: string } = {
  CONFIDENTIALITY: 'var(--neon-cyan)',
  INTEGRITY: 'var(--neon-green)',
  AUTHENTICATION: 'var(--neon-cyan)',
  ANTI_REPLAY: 'var(--neon-amber)',
  KEY_MANAGEMENT: 'var(--neon-cyan)',
  LOGGING: 'var(--neon-cyan)',
};

export const CyberDefenseDeck: React.FC<CyberDefenseDeckProps> = ({
  defenseOptions,
  selectedIds,
  onToggleDefense,
  disabled,
}) => {
  const handleCardClick = (id: string) => {
    if (disabled) return;
    SoundFX.playClick();
    onToggleDefense(id);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header and slots count */}
      <div className="flex justify-between items-center border-b border-border pb-2">
        <span className="text-xs uppercase font-mono tracking-widest text-muted">🛡️ Cryptographic Defense Deck</span>
        <span className="text-xs font-mono text-neon-cyan">
          [SLOTS: {selectedIds.length}/{defenseOptions.length}]
        </span>
      </div>

      {/* Slots Builder Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
        {Array.from({ length: 4 }).map((_, idx) => {
          const equippedId = selectedIds[idx];
          const equippedCard = defenseOptions.find(d => d.defense_id === equippedId);
          const Icon = equippedCard ? categoryIcons[equippedCard.category] || HelpCircle : null;
          
          return (
            <div
              key={idx}
              className={`h-12 border-2 border-dashed rounded-md flex items-center justify-center font-mono text-[10px] uppercase tracking-wider relative transition-all duration-300 ${
                equippedCard 
                  ? 'border-neon-cyan bg-[rgba(0,240,255,0.03)] text-neon-cyan glow-cyan' 
                  : 'border-border bg-transparent text-muted'
              }`}
            >
              {equippedCard ? (
                <div className="flex items-center gap-2 px-2 text-center">
                  {Icon && <Icon size={14} className="animate-pulse" />}
                  <span className="truncate">{equippedCard.name}</span>
                </div>
              ) : (
                `[ Slot ${idx + 1} Empty ]`
              )}
            </div>
          );
        })}
      </div>

      {/* Cards Deck Container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 py-2">
        {defenseOptions.map((card) => {
          const isSelected = selectedIds.includes(card.defense_id);
          const Icon = categoryIcons[card.category] || HelpCircle;
          const color = categoryColors[card.category] || 'var(--neon-cyan)';

          return (
            <div
              key={card.defense_id}
              onClick={() => handleCardClick(card.defense_id)}
              className={`hud-box cursor-pointer select-none transition-all duration-300 hover:-translate-y-1 relative flex flex-col justify-between ${
                isSelected
                  ? 'glow-cyan border-neon-cyan bg-[rgba(0,240,255,0.06)]'
                  : 'hover:border-[rgba(0,240,255,0.4)] opacity-70 hover:opacity-100'
              }`}
              style={{ minHeight: '140px' }}
            >
              {/* Parallax Hologram Effect inside Card */}
              {isSelected && (
                <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(0,240,255,0.02)] to-transparent pointer-events-none" />
              )}

              {/* Card Title & Icon */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                  <span className="text-xs uppercase font-mono tracking-wider font-bold text-neon-cyan truncate" style={{ maxWidth: '120px' }}>
                    {card.name}
                  </span>
                  <span className="text-[9px] font-mono uppercase text-muted tracking-widest mt-0.5">
                    {card.category}
                  </span>
                </div>
                <div className="p-1.5 rounded border border-border bg-[rgba(0,0,0,0.3)]">
                  <Icon size={14} style={{ color }} />
                </div>
              </div>

              {/* Card Description */}
              <p className="text-[10px] text-muted-foreground leading-relaxed flex-grow">
                {card.description}
              </p>

              {/* Card Stats */}
              <div className="border-t border-border/40 pt-2 mt-2 flex justify-between items-center text-[9px] font-mono text-muted">
                <span>COST: {card.score_cost} pts</span>
                {isSelected ? (
                  <span className="text-neon-cyan font-bold blink">EQUIPPED</span>
                ) : (
                  <span className="text-muted/60">STANDBY</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
