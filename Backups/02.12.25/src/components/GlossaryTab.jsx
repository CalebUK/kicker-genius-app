import React from 'react';
import { Calculator, Database, BrainCircuit } from 'lucide-react';
import { GLOSSARY_DATA } from '../data/constants';
import { MathCard } from './KickerComponents';

const GlossaryTab = ({ processed, leagueAvgs, meta }) => {
    // Try to find Aubrey, else use the top-ranked player for the math example
    const aubreyExample = processed.find(p => p.kicker_player_name.includes('Aubrey')) || processed[0];
    
    return (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4">
            {/* LIVE CALCULATION EXAMPLE */}
            {aubreyExample && (
                <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-emerald-400" /> How It Works: Live Example
                    </h3>
                    <MathCard player={aubreyExample} leagueAvgs={leagueAvgs} week={meta.week} />
                </div>
            )}

            <div className="p-4 border-b border-slate-800 bg-slate-900/30 text-center text-xs text-slate-500">
                This website was created by Caleb Hill. If you have any suggestions please <a href="mailto:calebthill@gmail.com" className="text-blue-400 hover:underline">email me</a>.
            </div>

            {/* GLOSSARY GRID LAYOUT */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {GLOSSARY_DATA.map((item, idx) => (
                    <div key={idx} className="bg-slate-800/50 p-4 rounded border border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-mono font-bold text-blue-300">{item.header}</span>
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1 bg-emerald-900/20 px-2 py-1 rounded border border-emerald-900/50">
                                <Database className="w-3 h-3"/> {item.source}
                            </span>
                        </div>
                        <div className="text-sm font-semibold text-white mb-1">{item.title}</div>
                        <div className="text-xs text-slate-400">{item.desc}</div>
                        <div className="mt-2 text-[10px] text-slate-500 italic border-t border-slate-700 pt-1">
                            Why: {item.why}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GlossaryTab;