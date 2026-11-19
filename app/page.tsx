'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_CONFIG = { hs: 16, hh: 8, cb: 1, iem: 0 };

function generateMics(config: any) {
  const mics: { id: string; type: string }[] = [];
  for (let i = 1; i <= (config.hs || 0); i++) mics.push({ id: `HS${String(i).padStart(2, '0')}`, type: 'HS' });
  for (let i = 1; i <= (config.hh || 0); i++) mics.push({ id: `HH${String(i).padStart(2, '0')}`, type: 'HH' });
  for (let i = 1; i <= (config.cb || 0); i++) mics.push({ id: `CB${String(i).padStart(2, '0')}`, type: 'CB' });
  for (let i = 1; i <= (config.iem || 0); i++) mics.push({ id: `IEM${String(i).padStart(2, '0')}`, type: 'IEM' });
  return mics;
}

export default function Home() {
  const [productions, setProductions] = useState<any[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, any>>({});
  const [view, setView] = useState<'planner' | 'foh' | 'crew'>('planner');
  const [onlyActive, setOnlyActive] = useState(true);
  const [speakerList, setSpeakerList] = useState('');
  const [newBlock, setNewBlock] = useState({ name: '', start: '', end: '' });
  const [newProductionName, setNewProductionName] = useState('');
  const [loading, setLoading] = useState(true);

  const currentProd = productions.find(p => p.id === currentId) || productions[0];
  const mics = useMemo(() => generateMics(currentProd?.config || DEFAULT_CONFIG), [currentProd]);

  useEffect(() => {
    loadProductions();
  }, []);

  async function loadProductions() {
    const { data } = await supabase.from('productions').select('*').order('created_at');
    setProductions(data || []);
    if (data && data.length > 0 && !currentId) setCurrentId(data[0].id);
    setLoading(false);
  }

  async function loadBlocks(prodId: string) {
    const { data } = await supabase.from('blocks').select('*').eq('production_id', prodId).order('sort_order');
    setBlocks(data || []);
    if (data && data.length > 0) setActiveBlockId(data[0].id);
    else setActiveBlockId(null);
  }

  useEffect(() => {
    if (currentId) loadBlocks(currentId);
  }, [currentId]);

  useEffect(() => {
    if (activeBlockId) loadBlockData(activeBlockId);
  }, [activeBlockId]);

  async function loadBlockData(blockId: string) {
    const { data: spk } = await supabase.from('speakers').select('*').eq('block_id', blockId).order('sort_order');
    setSpeakers(spk || []);
    const { data: asg } = await supabase.from('assignments').select('*').eq('block_id', blockId);
    const asgMap: Record<string, string> = {};
    (asg || []).forEach((a: any) => { asgMap[a.mic_id] = a.speaker_name; });
    setAssignments(asgMap);
    const { data: sts } = await supabase.from('statuses').select('*').eq('block_id', blockId);
    const stsMap: Record<string, any> = {};
    (sts || []).forEach((s: any) => { stsMap[s.mic_id] = s; });
    setStatuses(stsMap);
  }

  async function addProduction() {
    if (!newProductionName.trim()) return;
    const { data } = await supabase.from('productions').insert({ name: newProductionName.trim(), config: DEFAULT_CONFIG }).select().single();
    if (data) {
      setProductions([...productions, data]);
      setCurrentId(data.id);
      setNewProductionName('');
    }
  }

  async function deleteProduction(id: string) {
    if (productions.length <= 1) return alert('Minimaal één productie');
    if (!confirm('Productie verwijderen?')) return;
    await supabase.from('productions').delete().eq('id', id);
    const remaining = productions.filter(p => p.id !== id);
    setProductions(remaining);
    if (currentId === id) setCurrentId(remaining[0]?.id || null);
  }

  async function updateConfig(key: string, value: number) {
    if (!currentId || !currentProd) return;
    const newConfig = { ...currentProd.config, [key]: value };
    await supabase.from('productions').update({ config: newConfig }).eq('id', currentId);
    setProductions(productions.map(p => p.id === currentId ? { ...p, config: newConfig } : p));
  }

  async function addBlock() {
    if (!currentId || !newBlock.name.trim()) return;
    const { data } = await supabase.from('blocks').insert({ name: newBlock.name, start_time: newBlock.start, end_time: newBlock.end, production_id: currentId }).select().single();
    if (data) {
      setBlocks([...blocks, data]);
      setActiveBlockId(data.id);
      setNewBlock({ name: '', start: '', end: '' });
    }
  }

  async function addSpeakersFromList() {
    if (!activeBlockId) return;
    const names = speakerList.split('\n').map(n => n.trim()).filter(Boolean);
    if (!names.length) return;
    const inserts = names.map((name, i) => ({ name, block_id: activeBlockId, sort_order: speakers.length + i }));
    await supabase.from('speakers').insert(inserts);
    setSpeakerList('');
    loadBlockData(activeBlockId);
  }

  async function setAssignment(micId: string, speaker: string | null) {
    if (!activeBlockId) return;
    if (speaker) {
      await supabase.from('assignments').upsert({ block_id: activeBlockId, mic_id: micId, speaker_name: speaker }, { onConflict: 'block_id,mic_id' });
      setAssignments({ ...assignments, [micId]: speaker });
    } else {
      await supabase.from('assignments').delete().eq('block_id', activeBlockId).eq('mic_id', micId);
      const next = { ...assignments };
      delete next[micId];
      setAssignments(next);
    }
  }

  async function setStatus(micId: string, type: 'issued' | 'problem', value: boolean) {
    if (!activeBlockId) return;
    const current = statuses[micId] || { issued: false, problem: false };
    const updated = { ...current, [type]: value };
    await supabase.from('statuses').upsert({ block_id: activeBlockId, mic_id: micId, issued: updated.issued, problem: updated.problem }, { onConflict: 'block_id,mic_id' });
    setStatuses({ ...statuses, [micId]: updated });
  }

  const getSpeaker = (micId: string) => assignments[micId] || null;
  const getStatus = (micId: string) => statuses[micId] || { issued: false, problem: false };

  if (loading) return <div className="p-8 text-white bg-gray-900 min-h-screen">Laden...</div>;

  const activeBlock = blocks.find(b => b.id === activeBlockId);

  return (
    <div className="min-h-screen bg-[#111827] text-gray-100">
      {/* Production tabs */}
      <div className="bg-[#1F2937] border-b border-gray-700 px-6 py-2 flex items-center gap-2 overflow-x-auto">
        {productions.map(p => (
          <div key={p.id} className="flex items-center gap-1 group">
            <button onClick={() => setCurrentId(p.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium ${currentId === p.id ? 'bg-orange-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
              {p.name}
            </button>
            {productions.length > 1 && (
              <button onClick={() => deleteProduction(p.id)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 text-lg px-1">×</button>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2 ml-4">
          <input value={newProductionName} onChange={e => setNewProductionName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addProduction()}
            placeholder="Nieuwe productie" className="px-3 py-1 bg-gray-800 rounded text-sm w-40" />
          <button onClick={addProduction} className="bg-orange-500 text-white px-3 py-1 rounded text-sm">+</button>
        </div>
      </div>

      <header className="border-b border-gray-700 bg-[#1F2937] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MicFlow</h1>
          <p className="text-sm text-gray-400">{currentProd?.name}</p>
        </div>
        <div className="flex gap-2">
          {(['planner', 'foh', 'crew'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${view === v ? 'bg-orange-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
              {v === 'planner' ? 'Planner / Matrix' : v === 'foh' ? 'FOH' : 'Crew'}
            </button>
          ))}
        </div>
      </header>

      <div className="flex h-[calc(100vh-130px)]">
        {view !== 'foh' && (
          <aside className="w-80 bg-[#1F2937] border-r border-gray-700 p-4 overflow-y-auto">
            <h2 className="font-semibold mb-3 text-orange-500">Blokken</h2>
            <div className="space-y-1 mb-6">
              {blocks.map(b => (
                <button key={b.id} onClick={() => setActiveBlockId(b.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${activeBlockId === b.id ? 'bg-orange-500/20 text-orange-400' : 'hover:bg-gray-700'}`}>
                  <div className="font-medium">{b.name}</div>
                  {(b.start_time || b.end_time) && <div className="text-xs text-gray-400">{b.start_time} – {b.end_time}</div>}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-sm font-medium mb-2">Nieuw blok</h3>
              <input value={newBlock.name} onChange={e => setNewBlock({...newBlock, name: e.target.value})} placeholder="Naam" className="w-full mb-2 px-3 py-1.5 bg-gray-800 rounded text-sm" />
              <div className="flex gap-2 mb-2">
                <input value={newBlock.start} onChange={e => setNewBlock({...newBlock, start: e.target.value})} placeholder="Start" className="w-1/2 px-3 py-1.5 bg-gray-800 rounded text-sm" />
                <input value={newBlock.end} onChange={e => setNewBlock({...newBlock, end: e.target.value})} placeholder="Eind" className="w-1/2 px-3 py-1.5 bg-gray-800 rounded text-sm" />
              </div>
              <button onClick={addBlock} className="w-full bg-orange-500 text-white py-1.5 rounded text-sm font-medium">Toevoegen</button>
            </div>

            <div className="border-t border-gray-700 mt-6 pt-4">
              <h2 className="font-semibold mb-3 text-orange-500">Sprekers (dit blok)</h2>
              <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
                {speakers.map((s) => (
                  <div key={s.id} className="flex items-center gap-1 group">
                    <div className="flex-1 text-left px-3 py-2 rounded-lg text-sm bg-gray-800/50">{s.name}</div>
                  </div>
                ))}
              </div>
              <textarea value={speakerList} onChange={e => setSpeakerList(e.target.value)}
                placeholder="Plak namen (één per regel)" className="w-full h-20 px-3 py-2 bg-gray-800 rounded text-sm border border-gray-700 resize-none" />
              <button onClick={addSpeakersFromList} className="mt-2 w-full bg-orange-500 text-white py-1.5 rounded text-sm font-medium">
                Namen toevoegen aan dit blok
              </button>
            </div>

            <div className="border-t border-gray-700 mt-6 pt-4">
              <h3 className="text-sm font-medium mb-2">Configuratie</h3>
              {(['hs', 'hh', 'cb', 'iem'] as const).map(key => (
                <div key={key} className="flex items-center justify-between mb-1 text-sm">
                  <span className="uppercase">{key}</span>
                  <input type="number" min="0" max="64" value={currentProd?.config?.[key] || 0}
                    onChange={e => updateConfig(key, parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-1 bg-gray-800 rounded text-right" />
                </div>
              ))}
            </div>
          </aside>
        )}

        <main className={`flex-1 overflow-auto ${view === 'foh' ? 'p-0' : 'p-6'}`}>
          {view === 'planner' && activeBlock && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold">{activeBlock.name}</h2>
                <p className="text-gray-400 text-sm">{activeBlock.start_time} – {activeBlock.end_time}</p>
              </div>
              <div className="overflow-x-auto bg-[#1F2937] rounded-xl border border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-3 font-medium sticky left-0 bg-[#1F2937]">Mic</th>
                      {speakers.map(s => <th key={s.id} className="p-3 font-medium text-center min-w-[110px]">{s.name}</th>)}
                      <th className="text-center p-3 font-medium min-w-[180px]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mics.map(m => {
                      const status = getStatus(m.id);
                      const rowClass = status.problem ? 'bg-red-900/40' : status.issued ? 'bg-green-900/30' : '';
                      return (
                        <tr key={m.id} className={`border-b border-gray-800 ${rowClass}`}>
                          <td className="p-3 font-mono font-medium sticky left-0 bg-[#1F2937]">{m.id}</td>
                          {speakers.map(s => {
                            const assigned = getSpeaker(m.id) === s.name;
                            return (
                              <td key={s.id} className="p-1 text-center">
                                <button onClick={() => setAssignment(m.id, assigned ? null : s.name)}
                                  className={`w-full h-9 rounded ${assigned ? 'bg-green-500 text-white font-bold' : 'bg-gray-800 hover:bg-gray-700'}`}>
                                  {assigned ? '✓' : ''}
                                </button>
                              </td>
                            );
                          })}
                          <td className="p-2 text-center">
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => setStatus(m.id, 'issued', !status.issued)}
                                className={`px-2 py-1 rounded text-xs ${status.issued ? 'bg-green-500 text-white' : 'bg-gray-700'}`}>🟢 Uitgegeven</button>
                              <button onClick={() => setStatus(m.id, 'problem', !status.problem)}
                                className={`px-2 py-1 rounded text-xs ${status.problem ? 'bg-red-500 text-white' : 'bg-gray-700'}`}>🔴 Probleem</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'foh' && (
            <div className="min-h-screen">
              <div className="px-8 pt-6 pb-4 border-b border-gray-800">
                <div className="text-xs text-gray-500 mb-1">VIEWER · {currentProd?.name}</div>
                <h1 className="text-3xl font-bold">Zenderschema • {activeBlock?.name || 'Geen blok'}</h1>
                <div className="flex items-center gap-6 mt-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Blok</span>
                    <select value={activeBlockId || ''} onChange={e => setActiveBlockId(e.target.value)}
                      className="bg-[#1F2937] border border-gray-700 rounded-lg px-4 py-2 text-sm min-w-[240px]">
                      {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-8 py-6">
                <label className="flex items-center gap-2 mb-4 cursor-pointer text-sm">
                  <input type="checkbox" checked={onlyActive} onChange={e => setOnlyActive(e.target.checked)} className="w-4 h-4 accent-orange-500" />
                  <span>Toon alleen actieve mics</span>
                </label>
                <div className="bg-[#1F2937] rounded-2xl border border-gray-700 overflow-hidden">
                  <table className="w-full text-lg">
                    <thead>
                      <tr className="border-b border-gray-700 bg-gray-800/50">
                        <th className="text-left p-4 font-medium">Mic</th>
                        <th className="text-left p-4 font-medium">Spreker</th>
                        <th className="text-right p-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mics.filter(m => !onlyActive || getSpeaker(m.id)).map(m => {
                        const speaker = getSpeaker(m.id);
                        const status = getStatus(m.id);
                        const rowClass = status.problem ? 'bg-red-900/40' : status.issued ? 'bg-green-900/20' : '';
                        return (
                          <tr key={m.id} className={`border-b border-gray-800 ${rowClass}`}>
                            <td className="p-4 font-mono font-bold text-xl">{m.id}</td>
                            <td className="p-4">{speaker || <span className="text-gray-500">—</span>}</td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-3">
                                {status.issued && <span className="text-2xl">🟢</span>}
                                <button onClick={() => setStatus(m.id, 'problem', !status.problem)}
                                  className={`px-3 py-1 rounded text-sm ${status.problem ? 'bg-red-500 text-white' : 'bg-gray-700'}`}>🔴 Probleem</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!activeBlock && view !== 'foh' && <div className="text-center text-gray-500 mt-20">Selecteer of maak een blok</div>}
        </main>
      </div>
    </div>
  );
}
