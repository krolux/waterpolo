import React from "react";
import { supabase } from "../../lib/supabase";
import type { AppState, Match } from "../../types/wpolo";

export function HostMatchDetails({match,setState,onSaved}:{match:Match;setState:React.Dispatch<React.SetStateAction<AppState>>;onSaved?:()=>Promise<void>|void}) {
 const id=React.useId();
 const [date,setDate]=React.useState(match.date);
 const [time,setTime]=React.useState(match.time?.slice(0,5)||"");
 const [location,setLocation]=React.useState(match.location||"");
 const [stream,setStream]=React.useState(match.streamUrl||"");
 const [busy,setBusy]=React.useState(false);
 const [message,setMessage]=React.useState("");
 const [error,setError]=React.useState("");
 React.useEffect(()=>{setDate(match.date);setTime(match.time?.slice(0,5)||"");setLocation(match.location||"");setStream(match.streamUrl||"");},[match.id,match.date,match.time,match.location,match.streamUrl]);
 async function save(event:React.FormEvent) {
  event.preventDefault();if(busy)return;setBusy(true);setError("");setMessage("");
  try {
   const {data,error:saveError}=await supabase.rpc("save_host_match_details",{target_match_id:match.id,new_date:date,new_time:time||null,new_location:location.trim(),new_stream_url:stream.trim()||null});
   if(saveError)throw saveError;
   if(data?.id!==match.id)throw new Error("Baza nie potwierdziła zapisu.");
   setState(prev=>({...prev,matches:prev.matches.map(m=>m.id===match.id?{...m,date:data.date,time:data.time||"",location:data.location,streamUrl:data.stream_url}:m)}));
   setMessage("Zapisano miejsce, datę i godzinę meczu.");
   if(onSaved)try{await onSaved();}catch{setMessage("Dane zapisano. Odśwież stronę, aby zobaczyć aktualny terminarz.");}
  }catch(e){setError(e instanceof Error?e.message:(e as {message?:string})?.message||String(e));}
  finally{setBusy(false);}
 }
 const cls="w-full rounded-xl border border-sky-200 bg-white p-2";
 return <form onSubmit={save} className="w-full rounded-xl border border-sky-100 bg-white p-3 space-y-3">
  <h4 className="font-semibold">Miejsce i termin meczu — gospodarz</h4>
  <div className="grid gap-3 sm:grid-cols-2">
   <label htmlFor={id+'date'}>Dokładna data<input id={id+'date'} className={cls} type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label>
   <label htmlFor={id+'time'}>Godzina<input id={id+'time'} className={cls} type="time" value={time} onChange={e=>setTime(e.target.value)}/></label>
   <label htmlFor={id+'location'} className="sm:col-span-2">Miejsce / dokładny adres<input id={id+'location'} className={cls} required maxLength={500} placeholder="Nazwa pływalni, ulica i numer, miasto" value={location} onChange={e=>setLocation(e.target.value)}/></label>
   <label htmlFor={id+'stream'} className="sm:col-span-2">Link transmisji (opcjonalnie)<input id={id+'stream'} className={cls} type="url" maxLength={2048} placeholder="https://..." value={stream} onChange={e=>setStream(e.target.value)}/></label>
  </div>
  <button disabled={busy} className="rounded-xl bg-sky-600 px-3 py-2 text-white disabled:opacity-50">{busy?"Zapisywanie…":"Zapisz miejsce i termin"}</button>
  {message&&<p role="status" className="text-green-700">{message}</p>}
  {error&&<p role="alert" className="text-red-700">{error}</p>}
 </form>;
}
