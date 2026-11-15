const DAY=86400000;
function dateKey(v){
 if(v && typeof v.toISODate==='function') v=v.toISODate();
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
 const n=Date.parse(v+'T00:00:00Z');
 return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===v?v:null;
}
function dateFormatSetting(value){
 if(value===undefined||value===null)return {format:'DD:MM:YYYY',warning:null};
 const m=typeof value==='string'&&value.match(/^(DD|MM|YYYY)([.:\/-])(DD|MM|YYYY)\2(DD|MM|YYYY)$/);
 if(m&&new Set([m[1],m[3],m[4]]).size===3)return {format:value,warning:null};
 return {format:'YYYY-MM-DD',warning:t('dateFormatWarning')};
}
function displayDate(iso,format){
 if(!dateKey(iso))return '—';
 const parts={YYYY:iso.slice(0,4),MM:iso.slice(5,7),DD:iso.slice(8,10)};
 return format.replace(/YYYY|MM|DD/g,token=>parts[token]);
}
const ordinal=k=>Date.parse(k+'T00:00:00Z')/DAY;
const key=n=>new Date(n*DAY).toISOString().slice(0,10);
function localToday(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function journalRow(row,type){
 // Dataview's typed fields may be arrays or include metadata from multiple lines.
 // The first physical line is the habit record; never silently pick from arrays.
 if(typeof row.text!=='string')return row;
 const line=row.text.split(/\r?\n/,1)[0];
 const dates=[...line.matchAll(/\[\s*date\s*::\s*([^\]]*?)\s*\]/g)];
 const values=[...line.matchAll(/\[\s*value\s*::\s*([^\]]*?)\s*\]/g)];
 if(!dates.length&&!values.length)return {...row,date:undefined,value:undefined};
 const date=dates.length===1?dates[0][1].trim():null;
 let value=values.length===1?values[0][1].trim():undefined;
 if(type==='boolean'){if(value==='true')value=true;else if(value==='false')value=false;}
 else if(type==='number'&&typeof value==='string'&&/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)&&Number.isFinite(Number(value)))value=Number(value);
 return {...row,date,value};
}
function dateDiagnostic(value){
 if(value==null)return t('missingDate');
 const raw=typeof value==='string'?value:String(value);
 return JSON.stringify(raw.replace(/[^\x20-\x7E]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')));
}
function normalize(p,today){
 const errors=[],warn=[],str=x=>typeof x==='string'&&x.trim().length>0;
 for(const f of ['habit_id','habit_name']) if(!str(p[f])) errors.push(t('requiredField',{field:f}));
 if(!['boolean','number'].includes(p.habit_type)) errors.push(t('habitTypeInvalid'));
 const start=dateKey(p.start_date);
 if(!start) errors.push(t('startInvalid'));
 if(!Number.isSafeInteger(p.order)) errors.push(t('orderInvalid'));
 if(p.habit_type==='number'&&!str(p.unit)) errors.push(t('unitRequired'));
 const values=new Map();
 const rows=Array.from(p.file.lists||[],row=>journalRow(row,p.habit_type));
 // Repeated binary dates are visible warnings; valid values combine with OR.
 if(p.habit_type==='boolean'){
  const occurrences=new Map();
  for(const row of rows){
   const d=dateKey(row.date);if(!d)continue;
   if(!occurrences.has(d))occurrences.set(d,[]);
   occurrences.get(d).push(Number.isInteger(row.line)?row.line+1:'?');
  }
  for(const [d,lines] of occurrences)if(lines.length>1){
   warn.push(t('duplicateWarning',{date:d,count:lines.length,lines:lines.join(', ')}));
  }
 }
 if(!errors.length) for(const row of rows){
  if(row.date===undefined&&row.value===undefined) continue;
  const label=t('lineLabel',{line:(row.line??0)+1}),d=dateKey(row.date),v=row.value;
  if(!d){warn.push(t('invalidDate',{label,date:dateDiagnostic(row.date)}));continue;}
  if(p.habit_type==='boolean'?typeof v!=='boolean':typeof v!=='number'||!Number.isFinite(v)||v<0){warn.push(t('invalidValue',{label}));continue;}
  if(d<start){warn.push(t('beforeStart',{label}));continue;}
  if(d>today){warn.push(t('futureRecord',{label}));continue;}
  const old=values.get(d);
  const next=p.habit_type==='boolean'?Boolean(old||v):(old??0)+v;
  if(typeof next==='number'&&!Number.isFinite(next)){warn.push(t('sumOverflowLine',{label}));continue;}
  values.set(d,next);
 }
 return {p,start,values,errors,warn};
}
const done=v=>v===true||(typeof v==='number'&&v>0);
function state(h,d,today){if(d<h.start)return 'before';if(d>today)return 'future';if(!h.values.has(d))return d===today?'pending':'miss';return done(h.values.get(d))?'done':'miss';}
function statistics(h,today,month){
 const s={current:0,misses:0,max:0,total:0,month:0,sum:0,monthSum:0};
 if(!h.start||h.start>today)return s;
 let run=0;
 for(let n=ordinal(h.start);n<=ordinal(today);n++){
  const d=key(n),v=h.values.get(d);
  if(done(v)){run++;s.total++;if(d.startsWith(month))s.month++;}else run=0;
  s.max=Math.max(s.max,run);
  if(typeof v==='number'){s.sum+=v;if(d.startsWith(month))s.monthSum+=v;}
 }
 let end=ordinal(today)-(h.values.has(today)?0:1);
 for(let n=end;n>=ordinal(h.start)&&done(h.values.get(key(n)));n--)s.current++;
 // Only completed days contribute to the miss streak, even if today is explicitly zero.
 if(!done(h.values.get(today)))for(let n=ordinal(today)-1;n>=ordinal(h.start)&&!done(h.values.get(key(n)));n--)s.misses++;
 return s;
}
function monthDays(month){const first=ordinal(month+'-01'),d=new Date(first*DAY);d.setUTCMonth(d.getUTCMonth()+1,0);return Array.from({length:d.getUTCDate()},(_,i)=>key(first+i));}
function series(h,today,month,mode){
 let sum=0;
 return monthDays(month).map(d=>{
  const v=h.values.get(d);if(d<h.start||d>today||v===undefined)return {d,v:null};
  if(mode==='cumulative'){
   // Sum includes all earlier observations in the selected month, including before a gap.
   sum=0;for(const [k,x]of h.values)if(k.startsWith(month)&&k<=d)sum+=x;
   return {d,v:sum};
  }
  if(mode==='average'){let total=0;for(let i=0;i<7;i++)total+=h.values.get(key(ordinal(d)-i))??0;return {d,v:total/7};}
  return {d,v};
 });
}
function monthRange(habits,today){
 const max=today.slice(0,7);let min=max;
 for(const habit of habits){if(habit.errors.length||!habit.start)continue;const start=habit.start.slice(0,7);if(start<min)min=start;}
 return {min,max};
}
function boundedMonth(month,range){
 if(typeof month!=='string'||!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month))return range.max;
 return month<range.min?range.min:month>range.max?range.max:month;
}
function compare(a,b){return a.p.order-b.p.order||a.p.habit_name.localeCompare(b.p.habit_name,locale)||a.p.file.path.localeCompare(b.p.file.path);}
