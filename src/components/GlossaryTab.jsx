import React from 'react';
import { Calculator, Database } from 'lucide-react';
import { GLOSSARY_SECTIONS, BUY_ME_A_COFFEE_URL } from '../data/constants';
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
                    <MathCard player={aubreyExample} leagueAvgs={leagueAvgs} week={meta.week} settings={meta.model_settings} />
                </div>
            )}

            <div className="p-4 border-b border-slate-800 bg-slate-900/30 text-center text-xs text-slate-500">
                This website was created by 16BitHill. If you have any suggestions please <a href="mailto:16bithill@gmail.com" className="text-blue-400 hover:underline">email me</a>.
                {' '}Enjoying it? <a href={BUY_ME_A_COFFEE_URL} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">Buy me a coffee ☕</a>
            </div>

            {/* THE LEGEND, grouped by the tab each number appears on */}
            <div className="p-4 space-y-6">
                {GLOSSARY_SECTIONS.map((sec) => (
                    <section key={sec.section}>
                        <h3 className="text-sm font-bold text-white">{sec.section}</h3>
                        {sec.intro && <p className="text-xs text-slate-500 mb-3">{sec.intro}</p>}
                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${sec.intro ? '' : 'mt-3'}`}>
                            {sec.items.map((item) => (
                                <div key={item.header} className="bg-slate-800/50 p-3 rounded border border-slate-700">
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <span className="font-mono font-bold text-blue-300 text-sm">{item.header}</span>
                                        <span className="text-[11px] text-emerald-400 flex items-center gap-1 bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-900/50 whitespace-nowrap">
                                            <Database className="w-3 h-3"/> {item.source}
                                        </span>
                                    </div>
                                    {item.title !== item.header && <div className="text-xs font-semibold text-white mb-1">{item.title}</div>}
                                    <div className="text-xs text-slate-400 leading-relaxed">{item.desc}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
};

export default GlossaryTab;