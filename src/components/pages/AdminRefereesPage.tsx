import React from "react";
import { ArrowDown, ArrowUp, Search, SlidersHorizontal, UserRoundCheck } from "lucide-react";
import { getRefereeDashboard, REFEREE_CLASSES, setRefereeClass, setRefereeMultiplier, type RefereeClass, type RefereeDashboard, type RefereeMatchStat, type RefereeStat } from "../../lib/refereeRatings";
import type { Match, Role } from "../../types/wpolo";
import { MatchProtocolWorkspace } from "../matches/MatchProtocolWorkspace";

type SortKey = "name" | "class" | "matches" | "score";
type Direction = "asc" | "desc";
type Summary = { matches:number; average:number|null };
const classOrder = new Map<RefereeClass,number>(REFEREE_CLASSES.map((value,index)=>[value,index]));
const surnameKey=(name:string)=>{const parts=name.trim().split(/\s+/);return (parts[parts.length-1]??name).toLocaleLowerCase("pl");};
function summarize(matches:RefereeMatchStat[]):Summary {
  const scored=matches.filter(match=>match.weightedScore!==null);
  return {matches:matches.length,average:scored.length?scored.reduce((sum,match)=>sum+Number(match.weightedScore),0)/scored.length:null};
}
function SortLabel({label,value,active,direction,onSort}:{label:string;value:SortKey;active:SortKey;direction:Direction;onSort:(key:SortKey)=>void}) {
  return <button type="button" onClick={()=>onSort(value)} className="inline-flex items-center gap-1 whitespace-nowrap hover:text-sky-700" aria-label={`Sortuj według: ${label}`}>{label}{active===value&&(direction==="asc"?<ArrowUp className="h-3.5 w-3.5"/>:<ArrowDown className="h-3.5 w-3.5"/>)}</button>;
}

export function AdminRefereesPage({matches,user}:{matches:Match[];user:{name:string;role:Role;club?:string}}) {
  const [data,setData]=React.useState<RefereeDashboard|null>(null);
  const [error,setError]=React.useState("");
  const [query,setQuery]=React.useState("");
  const [category,setCategory]=React.useState("");
  const [klass,setKlass]=React.useState("");
  const [selectedId,setSelectedId]=React.useState("");
  const [protocolId,setProtocolId]=React.useState<string|null>(null);
  const [sortKey,setSortKey]=React.useState<SortKey>("name");
  const [direction,setDirection]=React.useState<Direction>("asc");
  const detailRef=React.useRef<HTMLDivElement>(null);
  const load=React.useCallback(async()=>{try{setError("");setData(await getRefereeDashboard());}catch(caught){setError(caught instanceof Error?caught.message:String(caught));}},[]);
  React.useEffect(()=>{void load();},[load]);

  const summaries=React.useMemo(()=>{
    const result=new Map<string,{all:Summary;categories:Map<string,Summary>}>();
    for(const referee of data?.referees??[]) {
      const categories=new Map<string,Summary>();
      for(const competition of data?.categories??[]) categories.set(competition.id,summarize(referee.matches.filter(match=>match.categoryId===competition.id)));
      result.set(referee.id,{all:summarize(referee.matches),categories});
    }
    return result;
  },[data]);
  const scope=React.useCallback((referee:RefereeStat)=>category?summaries.get(referee.id)?.categories.get(category)??{matches:0,average:null}:summaries.get(referee.id)?.all??{matches:0,average:null},[category,summaries]);
  const referees=React.useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase("pl");
    return [...(data?.referees??[])]
      .filter(referee=>(!needle||referee.name.toLocaleLowerCase("pl").includes(needle))&&(!klass||referee.class===klass)&&(!category||(summaries.get(referee.id)?.categories.get(category)?.matches??0)>0))
      .sort((left,right)=>{
        const a=scope(left),b=scope(right);
        let result=sortKey==="name"?surnameKey(left.name).localeCompare(surnameKey(right.name),"pl"):sortKey==="class"?(classOrder.get(left.class)??0)-(classOrder.get(right.class)??0):sortKey==="matches"?a.matches-b.matches:(a.average??-1)-(b.average??-1);
        if(!result) result=surnameKey(left.name).localeCompare(surnameKey(right.name),"pl");
        return direction==="asc"?result:-result;
      });
  },[category,data,direction,klass,query,scope,sortKey,summaries]);
  const selected=data?.referees.find(referee=>referee.id===selectedId);
  const selectedMatches=(selected?.matches??[]).filter(match=>!category||match.categoryId===category);
  const protocolMatch=matches.find(match=>match.id===protocolId);
  const changeSort=(key:SortKey)=>{if(key===sortKey)setDirection(value=>value==="asc"?"desc":"asc");else{setSortKey(key);setDirection(key==="name"||key==="class"?"asc":"desc");}};
  const selectReferee=(id:string)=>{setSelectedId(id);window.requestAnimationFrame(()=>detailRef.current?.scrollIntoView({behavior:"smooth",block:"start"}));};
  const reportError=(caught:unknown)=>setError(caught instanceof Error?caught.message:String(caught));
  const updateMultiplier=async(kind:"category"|"difficulty",key:string,value:string)=>{const number=Number(value);if(!Number.isFinite(number)||number<=0)return;try{setError("");await setRefereeMultiplier(kind,key,number);await load();}catch(caught){reportError(caught);}};

  return <section className="space-y-4">
    <div className="rounded-2xl border border-sky-100 bg-[linear-gradient(135deg,#f8fcff,#eef8ff)] p-5"><div className="flex items-center gap-3"><UserRoundCheck className="h-7 w-7 text-sky-600"/><div><div className="text-xs font-semibold uppercase tracking-wider text-sky-600">Tylko administrator</div><h2 className="text-2xl font-bold">Sędziowie</h2></div></div></div>
    {error&&<div className="rounded-xl bg-red-50 p-3 text-red-700">{error}</div>}
    <div className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-3">
      <label className="text-xs font-bold uppercase text-slate-500">Nazwisko<div className="relative mt-1"><Search className="absolute left-3 top-2.5 h-4 w-4"/><input value={query} onChange={event=>setQuery(event.target.value)} className="w-full rounded-xl border py-2 pl-9 pr-3 font-normal normal-case"/></div></label>
      <label className="text-xs font-bold uppercase text-slate-500">Kategoria<select value={category} onChange={event=>setCategory(event.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal normal-case"><option value="">Wszystkie</option>{data?.categories.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-xs font-bold uppercase text-slate-500">Klasa<select value={klass} onChange={event=>setKlass(event.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal normal-case"><option value="">Wszystkie</option>{REFEREE_CLASSES.map(value=><option key={value}>{value}</option>)}</select></label>
    </div>
    <div className="overflow-hidden rounded-2xl border bg-white">
      <div className="border-b px-4 py-3"><h3 className="font-bold">Zestawienie wszystkich sędziów</h3><p className="text-xs text-slate-500">W kategoriach pokazano liczbę meczów i średnią ocenę ważoną. Kliknij sędziego, aby przejść do szczegółów.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr>
          <th className="border-b px-3 py-3 text-left">Lp.</th>
          <th className="border-b px-3 py-3 text-left"><SortLabel label="Imię i nazwisko" value="name" active={sortKey} direction={direction} onSort={changeSort}/></th>
          <th className="border-b px-3 py-3 text-left"><SortLabel label="Klasa" value="class" active={sortKey} direction={direction} onSort={changeSort}/></th>
          <th className="border-b px-3 py-3 text-center"><SortLabel label="Mecze" value="matches" active={sortKey} direction={direction} onSort={changeSort}/></th>
          <th className="border-b px-3 py-3 text-center"><SortLabel label="Śr. ocena" value="score" active={sortKey} direction={direction} onSort={changeSort}/></th>
          {data?.categories.map(item=><th key={item.id} className="min-w-32 border-b border-l px-3 py-3 text-center normal-case"><span className="block font-bold text-slate-700">{item.name}</span><span className="font-normal text-slate-400">mecze / średnia</span></th>)}
        </tr></thead>
        <tbody>{referees.map((referee,index)=>{
          const total=scope(referee);
          return <tr key={referee.id} onClick={()=>selectReferee(referee.id)} className={`cursor-pointer border-b transition-colors hover:bg-sky-50 ${selectedId===referee.id?"bg-sky-100":""}`}>
            <td className="px-3 py-3 text-slate-500">{index+1}</td>
            <td className="px-3 py-3"><button type="button" onClick={event=>{event.stopPropagation();selectReferee(referee.id);}} className="font-bold hover:text-sky-700">{referee.name}</button></td>
            <td className="whitespace-nowrap px-3 py-3">{referee.class}</td><td className="px-3 py-3 text-center font-semibold">{total.matches}</td><td className="px-3 py-3 text-center font-semibold">{total.average?.toFixed(2)??"—"}</td>
            {data?.categories.map(item=>{const value=summaries.get(referee.id)?.categories.get(item.id)??{matches:0,average:null};return <td key={item.id} className="border-l px-3 py-3 text-center"><b>{value.matches}</b><span className="text-slate-400"> / </span>{value.average?.toFixed(2)??"—"}</td>;})}
          </tr>;
        })}{!referees.length&&<tr><td colSpan={5+(data?.categories.length??0)} className="px-4 py-8 text-center text-slate-500">Brak sędziów spełniających wybrane kryteria.</td></tr>}</tbody>
      </table></div>
    </div>
    <div ref={detailRef} className="scroll-mt-4 rounded-2xl border bg-white p-4">{selected?<><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-bold">{selected.name}</h3><div className="text-sm text-slate-500">Mecze w filtrze: {selectedMatches.length}</div></div><select value={selected.class} onChange={async event=>{try{setError("");await setRefereeClass(selected.id,event.target.value as RefereeClass);await load();}catch(caught){reportError(caught);}}} className="rounded-xl border bg-white px-3 py-2">{REFEREE_CLASSES.map(value=><option key={value}>{value}</option>)}</select></div><div className="mt-4 space-y-2">{selectedMatches.map(match=><button key={match.id} onClick={()=>setProtocolId(match.id)} className="grid w-full gap-1 rounded-xl bg-slate-50 p-3 text-left text-sm transition-colors hover:bg-sky-50 sm:grid-cols-[90px_1fr_auto]"><span>{match.date}</span><span className="font-semibold">{match.home} – {match.away}<span className="block text-xs font-normal text-slate-500">{match.categoryName} • {match.difficulty||"brak trudności"}</span></span><span className="font-bold">{match.weightedScore??"—"}</span></button>)}{!selectedMatches.length&&<div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Brak meczów w wybranej kategorii.</div>}</div></>:<div className="text-slate-500">Kliknij sędziego w tabeli, aby zobaczyć jego mecze.</div>}</div>
    <div className="rounded-2xl border bg-white p-4"><div className="mb-3 flex items-center gap-2 font-bold"><SlidersHorizontal className="h-5 w-5"/>Mnożniki</div><div className="grid gap-4 lg:grid-cols-2"><div><h4 className="mb-2 text-sm font-bold">Kategorie rozgrywek</h4>{data?.categories.map(item=><label key={item.id} className="mb-2 grid grid-cols-[1fr_100px] items-center gap-2 text-sm"><span>{item.name}</span><input type="number" min="0.1" step="0.05" defaultValue={item.multiplier} onBlur={event=>void updateMultiplier("category",item.id,event.target.value)} className="rounded-lg border px-2 py-1.5"/></label>)}</div><div><h4 className="mb-2 text-sm font-bold">Trudność meczu</h4>{data?.difficulties.map(item=><label key={item.name} className="mb-2 grid grid-cols-[1fr_100px] items-center gap-2 text-sm"><span>{item.name}</span><input type="number" min="0.1" step="0.05" defaultValue={item.multiplier} onBlur={event=>void updateMultiplier("difficulty",item.name,event.target.value)} className="rounded-lg border px-2 py-1.5"/></label>)}</div></div></div>
    {protocolMatch&&<MatchProtocolWorkspace match={protocolMatch} user={user} readOnly onClose={()=>setProtocolId(null)}/>}
  </section>;
}
