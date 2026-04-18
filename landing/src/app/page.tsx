import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-500 selection:text-white font-sans overflow-x-hidden">
      {/* 1. Hero with live tx hash ticker */}
      <section className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="absolute top-0 w-full overflow-hidden whitespace-nowrap bg-zinc-900 border-b border-zinc-800 text-xs py-2 opacity-80 font-mono text-green-400">
          <span className="inline-block animate-[marquee_15s_linear_infinite]">
             LIVE • SCORE TX: 9vBo...vnm2 FINALIZE TX: 4aBc...99z2 SCORE TX: 8xPo...bn12 FINALIZE TX: xyZ1...2zQ8
          </span>
        </div>
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 mb-8 mt-10">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Beta v2 Available
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 mt-4">
          Tamper-Proof <br/> Hackathon Infrastructure
        </h1>
        <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mb-10">
          JudgeChain scores, verifies, and finalizes hackathon submissions natively on Solana. Zero human bias. Zero test gaming.
        </p>
        <div className="flex gap-4">
          <a href="https://github.com/NitishKumar-ai/judgechain" target="_blank" rel="noopener noreferrer" className="bg-white text-black px-8 py-3 rounded-md font-bold hover:bg-zinc-200 transition shadow-[0_0_20px_rgba(255,255,255,0.3)]">Deploy JudgeChain</a>
          <a href="https://judgechain-dashboard.vercel.app" className="bg-zinc-800 text-white px-8 py-3 rounded-md font-bold border border-zinc-700 hover:bg-zinc-700 transition">View Dashboard</a>
        </div>
      </section>

      {/* 2. Problem statement (3 cards with red top border) */}
      <section className="py-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-red-900/10 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          <div className="bg-zinc-900/80 backdrop-blur-md p-8 rounded-lg border-t-4 border-red-500 shadow-xl transition hover:-translate-y-1">
            <div className="text-red-500 mb-4 h-8 w-8">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h3 className="text-xl font-bold mb-4">Manual Judging Doesn&apos;t Scale</h3>
            <p className="text-zinc-400 text-sm">Organizers spend days reviewing code. It&apos;s slow, expensive, and error-prone when processing 500+ submissions.</p>
          </div>
          <div className="bg-zinc-900/80 backdrop-blur-md p-8 rounded-lg border-t-4 border-red-500 shadow-xl transition hover:-translate-y-1">
             <div className="text-red-500 mb-4 h-8 w-8">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <h3 className="text-xl font-bold mb-4">Easily Manipulated Scores</h3>
            <p className="text-zinc-400 text-sm">Participants fake READMEs or submit empty test files to bypass simple CI checks without actually writing logic.</p>
          </div>
          <div className="bg-zinc-900/80 backdrop-blur-md p-8 rounded-lg border-t-4 border-red-500 shadow-xl transition hover:-translate-y-1">
             <div className="text-red-500 mb-4 h-8 w-8">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <h3 className="text-xl font-bold mb-4">Meaningless Credentials</h3>
            <p className="text-zinc-400 text-sm">A PDF certificate is useless. Web2 platforms offer no cryptographically verifiable proof of skill on-chain.</p>
          </div>
        </div>
      </section>

      {/* 3. How it works (6-step timeline) */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4">How JudgeChain Works</h2>
        <p className="text-center text-zinc-400 mb-16 max-w-2xl mx-auto">An end-to-end decentralized architecture that removes trust from the grading process.</p>
        
        <div className="space-y-4">
          {[
            { step: "01", title: "Organizer Configures", desc: "Define hackathon tracks and custom validation criteria via the dashboard." },
            { step: "02", title: "CLI Submission", desc: "Participants submit using `judgenod submit` from their terminal." },
            { step: "03", title: "Security Layers", desc: "The engine scans for path traversal, code injection, and prompt manipulation." },
            { step: "04", title: "Automated Scoring", desc: "Repos are cloned into an isolated Docker sandbox. Tests are run. Code is graded." },
            { step: "05", title: "On-Chain Finalization", desc: "The final score matrix is committed to the Solana blockchain via Anchor." },
            { step: "06", title: "Soulbound NFTs", desc: "Winners are minted verifiable credentials directly into their wallets." }
          ].map(item => (
            <div key={item.step} className="flex flex-col md:flex-row gap-6 items-start md:items-center p-6 border border-zinc-800 rounded-xl bg-zinc-900/40 hover:bg-zinc-800/60 transition cursor-default">
              <div className="text-4xl font-black text-zinc-700 bg-black w-16 h-16 flex items-center justify-center rounded-lg">{item.step}</div>
              <div>
                <h4 className="text-xl font-bold text-white">{item.title}</h4>
                <p className="text-zinc-400 mt-1 text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Scoring Engine Demo (Animated Bars) */}
      <section className="py-24 bg-zinc-950 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl font-bold mb-4">Real-Time Scoring Engine</h2>
          <p className="text-zinc-400 mb-10 max-w-xl mx-auto">Every push gets analyzed across 5 distinct axes of quality. No more subjective grading.</p>
          
          <div className="p-8 border border-zinc-800 rounded-xl bg-black/80 backdrop-blur-xl font-mono text-sm text-left shadow-2xl">
            <div className="flex gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="mb-6 text-green-400 opacity-90">&gt; running: secure_scoring_pipeline --repo=&quot;solana-defi-swap&quot;</div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-zinc-300 mb-2 text-xs uppercase tracking-wider"><span>Deployment Health</span><span className="text-white font-bold">18/20</span></div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 animate-[width_1s_ease-out_forwards]" style={{width: "90%"}}></div></div>
              </div>
              <div>
                <div className="flex justify-between text-zinc-300 mb-2 text-xs uppercase tracking-wider"><span>Test Coverage</span><span className="text-white font-bold">20/20</span></div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-purple-500 animate-[width_1s_ease-out_forwards]" style={{width: "100%"}}></div></div>
              </div>
              <div>
                <div className="flex justify-between text-zinc-300 mb-2 text-xs uppercase tracking-wider"><span>Code Quality</span><span className="text-white font-bold">14/20</span></div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-red-500 animate-[width_1s_ease-out_forwards]" style={{width: "70%"}}></div></div>
              </div>
              <div>
                <div className="flex justify-between text-zinc-300 mb-2 text-xs uppercase tracking-wider"><span>Custom Constraints</span><span className="text-white font-bold">10/10</span></div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-yellow-500 animate-[width_1s_ease-out_forwards]" style={{width: "100%"}}></div></div>
              </div>
            </div>
            
             <div className="mt-8 pt-4 border-t border-zinc-800 flex justify-between items-center text-green-400">
                <span>[ OK ] Engine Finished</span>
                <span className="text-white font-black text-xl">TOTAL: 62/70</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. On-Chain Finalization Demo */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-900/10 border border-green-500/30 p-12 rounded-3xl text-center relative overflow-hidden backdrop-blur-sm">
           <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
              <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <h2 className="text-3xl font-bold mb-4 text-white relative z-10">Immutable On-Chain Results</h2>
          <p className="text-zinc-300 mb-8 max-w-2xl mx-auto relative z-10 text-lg">Scores aren&apos;t just rows in Postgres. They are cryptographically verifiable records anchored directly to Solana.</p>
          <div className="font-mono bg-black text-green-400 p-4 rounded-xl text-sm select-all inline-block shadow-lg border border-green-500/50">
            Signature: <span className="text-white">4aBcX9JkLpQ2WvBnM...sweep...29z2z</span> (Confirmed)
          </div>
        </div>
      </section>

      {/* 6. Soulbound Certificates */}
      <section className="py-24 bg-zinc-950 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1">
            <h2 className="text-4xl font-bold mb-6">Portable Blockchain Credentials</h2>
            <p className="text-zinc-400 text-lg mb-6">When your hackathon ends, winners claim Soulbound NFTs on Solana. These act as permanent cryptographic proof of their hackathon performance for employers and protocols.</p>
            <ul className="space-y-3 text-sm text-zinc-300">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div> Fully on-chain metadata</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div> Non-transferable (True SBTs)</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div> Metaplex Token Standard</li>
            </ul>
          </div>
          <div className="flex-1 h-[350px] w-full bg-gradient-to-br from-zinc-800 to-black border border-zinc-700 p-4 rounded-2xl relative flex items-center justify-center shadow-2xl group cursor-pointer hover:border-yellow-500/50 transition">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 rounded-2xl pointer-events-none"></div>
             <div className="text-yellow-500 font-bold text-center border border-yellow-500/50 bg-black/50 backdrop-blur-xl p-8 rounded-xl transform transition-transform group-hover:scale-105 group-hover:-rotate-2 duration-500">
                 <div className="w-12 h-12 mx-auto mb-4 bg-yellow-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2l1.66 3.37h3.72l-2.69 2.62.63 3.7-3.32-1.74-3.32 1.74.63-3.7L4.62 5.37h3.72L10 2z" clipRule="evenodd"></path></svg>
                 </div>
                 <div className="text-2xl tracking-widest uppercase mb-2">Verified Winner</div>
                 <div className="text-xs text-yellow-500/70 font-mono">SOLANA GRIZZLYTHON · RANK #1</div>
                 <div className="w-full h-px bg-yellow-500/30 my-4"></div>
                 <div className="text-[10px] text-zinc-400 font-mono truncate max-w-[200px]">OWNER: 7XvP...9nM2</div>
             </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-zinc-900 bg-zinc-950 text-center px-6">
        <div className="w-16 h-16 bg-white rounded-xl mx-auto mb-8 flex items-center justify-center -rotate-12">
             <span className="text-black font-black text-2xl tracking-tighter italic">JC</span>
        </div>
        <h2 className="text-4xl font-bold mb-8 max-w-xl mx-auto tracking-tight">Set a New Standard for Your Hackathon</h2>
        <div className="flex justify-center gap-4 mb-16">
          <Link href="https://github.com/NitishKumar-ai/judgechain" className="bg-white text-black px-8 py-4 rounded-lg font-bold hover:bg-zinc-200 shadow-xl shadow-white/10 transition">Start Free Trial</Link>
          <Link href="mailto:contact@judgechain.xyz" className="bg-transparent text-white px-8 py-4 rounded-lg font-bold border border-zinc-700 hover:bg-zinc-800 transition">Contact Sales</Link>
        </div>
        <p className="text-zinc-600 text-sm font-mono tracking-widest uppercase">JudgeChain / Inmodel Labs &copy; 2026</p>
      </footer>
      
      {/* Marquee Animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
      `}} />
    </div>
  );
}
