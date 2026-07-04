import React from 'react';

interface HexMatrixViewerProps {
  payload: any;
  isAttacked: boolean;
  attackType: string;
}

export const HexMatrixViewer: React.FC<HexMatrixViewerProps> = ({
  payload,
  isAttacked,
  attackType,
}) => {
  // Convert payload values into custom Hex Dump representation
  const jsonString = JSON.stringify(payload || {}, null, 2);
  
  // Helper to generate a hex dump from a string
  const generateHexDump = (str: string) => {
    const lines = [];
    const bytes = Array.from(str).map(c => c.charCodeAt(0));
    
    for (let i = 0; i < bytes.length && i < 160; i += 8) {
      const chunk = bytes.slice(i, i + 8);
      const hexPart = chunk.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      const asciiPart = chunk.map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');
      
      const offset = i.toString(16).padStart(4, '0').toUpperCase();
      lines.push({ offset, hexPart, asciiPart, rawBytes: chunk });
    }
    return lines;
  };

  const hexLines = generateHexDump(jsonString);

  // Check if a byte corresponds to the amount value to highlight
  const isAmountByte = (byteValue: number) => {
    // Character codes for "amount" (97, 109, 111, 117, 110, 116) or the value inside
    return isAttacked && attackType === 'AMOUNT_TAMPERING';
  };

  return (
    <div className="w-full bg-terminal border border-border p-4 rounded-lg flex flex-col md:flex-row gap-4 relative overflow-hidden" style={{ minHeight: '280px' }}>
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-neon-cyan opacity-40"></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-neon-cyan opacity-40"></div>

      {/* Column 1: JSON Payload Display */}
      <div className="w-full md:w-1/2 flex flex-col border-r border-border md:pr-4">
        <div className="text-xs uppercase font-mono tracking-widest text-muted mb-2 flex justify-between items-center">
          <span>📁 Canonical JSON Payload</span>
          <span className="text-[10px] text-neon-cyan font-mono">[UTF-8 ENCODED]</span>
        </div>
        <div className="bg-[rgba(0,0,0,0.4)] p-3 rounded border border-border flex-grow overflow-auto font-mono text-[11px] text-neon-cyan" style={{ maxHeight: '200px' }}>
          <pre className="whitespace-pre-wrap leading-relaxed">
            {jsonString.split('\n').map((line, idx) => {
              const isAmountLine = isAttacked && attackType === 'AMOUNT_TAMPERING' && line.includes('"amount"');
              return (
                <div key={idx} className={isAmountLine ? 'text-neon-pink bg-[rgba(255,0,85,0.1)] px-1 font-bold animate-pulse' : ''}>
                  {line}
                </div>
              );
            })}
          </pre>
        </div>
      </div>

      {/* Column 2: Simulated Hex Dump */}
      <div className="w-full md:w-1/2 flex flex-col">
        <div className="text-xs uppercase font-mono tracking-widest text-muted mb-2 flex justify-between items-center">
          <span>💻 Cryptographic Hex Memory Dump</span>
          <span className={`text-[10px] font-mono ${isAttacked && attackType === 'AMOUNT_TAMPERING' ? 'text-neon-pink font-bold animate-pulse' : 'text-muted'}`}>
            {isAttacked && attackType === 'AMOUNT_TAMPERING' ? '[!] TAMPER DETECTED' : '[OK] NO BUFFER ERRORS'}
          </span>
        </div>
        <div className="bg-[rgba(0,0,0,0.5)] p-3 rounded border border-border flex-grow overflow-auto font-mono text-[11px] leading-relaxed text-[#5a738e]" style={{ maxHeight: '200px' }}>
          {hexLines.map((line, idx) => {
            // Check if amount is tampered, apply glitch styling to some middle rows representing the values
            const isTamperedRow = isAttacked && attackType === 'AMOUNT_TAMPERING' && (idx >= 3 && idx <= 5);
            return (
              <div key={idx} className={`flex justify-between hover:bg-[rgba(0,240,255,0.02)] py-0.5 px-1 rounded transition-colors ${
                isTamperedRow ? 'text-neon-pink bg-[rgba(255,0,85,0.05)] border-l border-neon-pink' : ''
              }`}>
                <span className="text-[#00f0ff] opacity-60">{line.offset}</span>
                <span className={`mx-4 tracking-wide ${isTamperedRow ? 'text-neon-pink font-bold' : 'text-[#8bb3f2]'}`}>{line.hexPart}</span>
                <span className={isTamperedRow ? 'text-neon-pink font-bold animate-pulse' : 'text-muted-foreground'}>{line.asciiPart}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
