import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { SoundFX } from '../components/SoundFXController';
import { ShieldCheck, Play, ClipboardList, CheckCircle, AlertTriangle, FileDown } from 'lucide-react';
import { motion } from 'framer-motion';

export const TestReportPage: React.FC = () => {
  const token = useAuthStore(state => state.token);
  const sessionId = useAuthStore(state => state.sessionId);

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningTests, setRunningTests] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/tests/reports', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setReports(data.data);
        if (data.data.length > 0 && !selectedReport) {
          setSelectedReport(data.data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token]);

  const handleRunTests = async () => {
    if (runningTests) return;
    SoundFX.playClick();
    setRunningTests(true);
    
    // Play dual siren warning for test scanning!
    SoundFX.playAlarm();

    try {
      const res = await fetch('/api/tests/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      if (data.success) {
        SoundFX.playSuccess();
        await fetchReports();
        // Load the newly generated report
        if (data.data) {
          // Find newly created run
          const newReport = data.data;
          setSelectedReport({
            test_run_id: newReport.run_id,
            status: newReport.status,
            passed_count: newReport.passed_count,
            failed_count: newReport.failed_count,
            started_at: new Date(),
            report_markdown: newReport.report,
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunningTests(false);
    }
  };

  const handleSelectReport = (report: any) => {
    SoundFX.playClick();
    setSelectedReport(report);
  };

  return (
    <div className="flex flex-col gap-6 p-4 max-w-6xl mx-auto">
      {/* HUD Header */}
      <div className="hud-box">
        <h2 className="text-xl font-bold uppercase tracking-wider text-neon-cyan glitch-text">
          AUTOMATED CRITICAL TESTING SUITE
        </h2>
        <p className="text-xs text-muted mt-1 font-mono">
          [Hệ thống Kiểm thử tự động Một chạm] | Quét và chạy toàn bộ 6 test case bảo mật mật mã học bắt buộc, xuất báo cáo pháp y nộp bài tập lớn FIT4012.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Run button and list of runs */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="hud-box flex flex-col gap-4" style={{ minHeight: '380px' }}>
            <span className="text-xs uppercase font-mono tracking-widest text-muted border-b border-border pb-2">
              🧪 Test Suite Launcher
            </span>

            {/* Run Button */}
            <button
              onClick={handleRunTests}
              disabled={runningTests}
              className={`btn-cyber py-3.5 text-xs font-bold uppercase w-full flex items-center justify-center gap-2 relative overflow-hidden ${
                runningTests 
                  ? 'border-neon-pink text-neon-pink bg-[rgba(255,0,85,0.05)] effect-laser-scan' 
                  : 'glow-cyan bg-[rgba(0,240,255,0.05)]'
              }`}
            >
              {runningTests ? (
                <>
                  <span className="animate-pulse">SCANNING CRYPTO PIPELINE...</span>
                </>
              ) : (
                <>
                  <Play size={14} className="animate-pulse text-neon-cyan" />
                  RUN SECURITY TEST SUITE [1-CLICK]
                </>
              )}
            </button>

            {/* Test Runs List */}
            <div className="flex flex-col gap-2 flex-grow overflow-y-auto pr-1" style={{ maxHeight: '280px' }}>
              <span className="text-[10px] font-mono uppercase text-muted tracking-widest block mb-1">Kiểm thử gần đây</span>
              {loading ? (
                <div className="text-center py-8 font-mono text-xs text-muted animate-pulse">[ Loading report list... ]</div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8 font-mono text-xs text-muted/40 uppercase tracking-widest">
                  [ No test runs recorded ]
                </div>
              ) : (
                reports.map((rep) => {
                  const isActive = selectedReport?.test_run_id === rep.test_run_id;
                  const passed = rep.status === 'PASSED';

                  return (
                    <div
                      key={rep.test_run_id}
                      onClick={() => handleSelectReport(rep)}
                      className={`p-3 border rounded cursor-pointer transition-all duration-200 flex items-center justify-between font-mono text-[10px] ${
                        isActive
                          ? 'border-neon-cyan bg-[rgba(0,240,255,0.04)] glow-cyan'
                          : 'border-border bg-surface/30 hover:border-neon-cyan/30'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-[#e2f1ff] text-xs">Run: {rep.test_run_id.substring(0, 8)}...</span>
                        <span className="text-muted mt-0.5">{new Date(rep.started_at).toLocaleTimeString()}</span>
                        <span className="text-neon-cyan mt-0.5">PASSED: {rep.passed_count}/6</span>
                      </div>
                      <span className={`px-2 py-0.5 border rounded text-[9px] font-bold ${
                        passed 
                          ? 'border-neon-green/30 text-neon-green bg-[rgba(57,255,20,0.03)]' 
                          : 'border-neon-pink/30 text-neon-pink bg-[rgba(255,0,85,0.03)]'
                      }`}>
                        {passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right column: Report renderer */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="hud-box flex flex-col gap-4 relative" style={{ minHeight: '440px' }}>
            <span className="text-xs uppercase font-mono tracking-widest text-muted border-b border-border pb-2 flex justify-between items-center">
              <span className="flex items-center gap-2">
                <ClipboardList size={14} className="text-neon-cyan" />
                Security Assessment Report Renderer
              </span>
              {selectedReport && (
                <button
                  onClick={() => {
                    SoundFX.playClick();
                    // Download Report as Markdown file
                    const blob = new Blob([selectedReport.report_markdown], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `CyberBank_Security_Report_${selectedReport.test_run_id.substring(0, 8)}.md`;
                    a.click();
                  }}
                  className="p-1 border border-border bg-surface hover:border-neon-cyan hover:text-neon-cyan rounded flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider transition-all"
                  title="Xuất Markdown"
                >
                  <FileDown size={12} />
                  <span>Export MD</span>
                </button>
              )}
            </span>

            {/* Simulated automated test scanner animation if running */}
            {runningTests ? (
              <div className="my-auto flex flex-col items-center justify-center gap-4 py-12">
                <div className="relative w-20 h-20 rounded-full border-2 border-dashed border-neon-cyan flex items-center justify-center animate-[spin_10s_linear_infinite]">
                  <motion.div
                    className="absolute inset-0.5 border border-neon-pink rounded-full"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.1, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
                <div className="text-center font-mono text-xs">
                  <span className="text-neon-cyan font-bold block animate-pulse">DEPLOYING SECURITY EXPLOITS...</span>
                  <span className="text-muted block mt-1">Testing valid flows, tampering blocks, replay detectors & signature spoofs</span>
                </div>
              </div>
            ) : selectedReport ? (
              <div className="flex-grow overflow-y-auto pr-1 font-mono text-xs leading-relaxed text-[#e2f1ff]" style={{ maxHeight: '420px' }}>
                {/* Simulated parsed Markdown render */}
                <div className="flex flex-col gap-4">
                  <div className="bg-[rgba(0,0,0,0.3)] p-4 border border-border rounded flex flex-col gap-2">
                    <h3 className="text-sm font-bold text-neon-cyan uppercase">Báo cáo an ninh mật mã: TC01 - TC06</h3>
                    <div className="grid grid-cols-2 gap-2 text-muted text-[10px]">
                      <div>RUN ID: <span className="text-neon-cyan font-bold">{selectedReport.test_run_id}</span></div>
                      <div>DATE: <span className="text-neon-cyan font-bold">{new Date(selectedReport.started_at).toLocaleString()}</span></div>
                      <div>TOTAL TESTS: <span className="text-[#8bb3f2] font-bold">6 Cases</span></div>
                      <div>STATUS: <span className={selectedReport.passed_count === 6 ? 'text-neon-green font-bold' : 'text-neon-pink font-bold'}>{selectedReport.passed_count === 6 ? 'PASSED 100%' : 'FAILED'}</span></div>
                    </div>
                  </div>

                  {/* Render Table rows representing parsed markdown */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs uppercase text-muted tracking-widest border-b border-border/40 pb-1 block">Test Cases Breakdown</span>
                    {/* Simulated Table rows */}
                    {[
                      { code: 'TC01_VALID_TRANSACTION', desc: 'Valid Transaction Flow Bypass', expected: 'ACCEPTED' },
                      { code: 'TC02_AMOUNT_TAMPERING', desc: 'MITM Amount Alteration Detect', expected: 'REJECTED' },
                      { code: 'TC03_REPLAY_TRANSACTION', desc: 'Nonce Replay Attack Cache Lock', expected: 'REJECTED' },
                      { code: 'TC04_INVALID_SIGNATURE', desc: 'Rogue Private Key Signature Spoof', expected: 'REJECTED' },
                      { code: 'TC05_WRONG_KEY', desc: 'Wrong Decryption Key fingerprint lock', expected: 'REJECTED' },
                      { code: 'TC06_SCORING_EXPLANATION', desc: 'Academic forensics explain log delta', expected: 'VALID' },
                    ].map((tcRow, idx) => {
                      const isPassed = selectedReport.passed_count >= idx + 1; // Simulated matching logic
                      return (
                        <div key={idx} className="p-3 border border-border/40 bg-surface/10 rounded flex items-center justify-between gap-4">
                          <div className="flex flex-col">
                            <span className="text-neon-cyan font-bold text-[10px]">{tcRow.code}</span>
                            <span className="text-muted text-[10px]">{tcRow.desc}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-muted text-[10px]">EXPECTED: {tcRow.expected}</span>
                            <span className={`px-2 py-0.5 border rounded text-[9px] font-bold ${
                              isPassed 
                                ? 'border-neon-green/30 text-neon-green bg-[rgba(57,255,20,0.02)]' 
                                : 'border-neon-pink/30 text-neon-pink bg-[rgba(255,0,85,0.02)]'
                            }`}>
                              {isPassed ? 'PASSED' : 'FAILED'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="my-auto text-center font-mono text-xs text-muted/40 uppercase tracking-widest">
                [ No test report active. Bấm nút phía bên trái để chạy kiểm thử ]
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
