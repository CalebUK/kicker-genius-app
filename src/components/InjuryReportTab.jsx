import React from 'react';
import { Stethoscope, AlertTriangle, ShieldAlert, UserMinus } from 'lucide-react';
import { InjuryCard } from './KickerComponents';

const InjuryReportTab = ({ injuries, scoring }) => {
    const bucketQuestionable = injuries.filter(k => k.injury_status === 'Questionable');
    const bucketOutDoubtful = injuries.filter(k => ['OUT', 'Doubtful', 'Inactive'].includes(k.injury_status));
    const bucketRest = injuries.filter(k => ['IR', 'CUT', 'Practice Squad'].includes(k.injury_status) || k.injury_status.includes('Roster'));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* BUCKET 1: QUESTIONABLE (YELLOW) */}
            {bucketQuestionable.length > 0 && (
                <div className="bg-yellow-900/20 rounded-xl border border-yellow-800/50 overflow-hidden">
                    <div className="p-4 bg-yellow-900/40 border-b border-yellow-800/50 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        <h3 className="font-bold text-white">QUESTIONABLE (Start with Caution)</h3>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {bucketQuestionable.map((k, i) => <InjuryCard key={i} k={k} borderColor="border-yellow-500" textColor="text-yellow-300" scoring={scoring} />)}
                    </div>
                </div>
            )}

            {/* BUCKET 2: DOUBTFUL & OUT (RED) */}
            {(bucketOutDoubtful.length > 0) && (
                <div className="bg-red-900/20 rounded-xl border border-red-800/50 overflow-hidden">
                    <div className="p-4 bg-red-900/40 border-b border-red-800/50 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                        <h3 className="font-bold text-white">OUT / DOUBTFUL (Do Not Start)</h3>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {bucketOutDoubtful.map((k, i) => <InjuryCard key={i} k={k} borderColor="border-red-600" textColor="text-red-300" scoring={scoring} />)}
                    </div>
                </div>
            )}

            {/* BUCKET 3: PRACTICE SQUAD / RESERVE (DARK RED) */}
            {bucketRest.length > 0 && (
                <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex items-center gap-2">
                        <UserMinus className="w-5 h-5 text-slate-400" />
                        <h3 className="font-bold text-white">IR / INACTIVE / PRACTICE SQUAD / RELEASED</h3>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {bucketRest.map((k, i) => <InjuryCard key={i} k={k} borderColor="border-slate-600" textColor="text-slate-300" scoring={scoring} />)}
                    </div>
                </div>
            )}

            {(!bucketQuestionable.length && !bucketOutDoubtful.length && !bucketRest.length) && (
                <div className="p-12 text-center text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
                    No kickers currently listed on the injury report!
                </div>
            )}
        </div>
    );
};

export default InjuryReportTab;