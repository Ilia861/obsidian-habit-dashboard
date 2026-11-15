function inspectHabitJournal(text,h,date,today,parseYaml,type,allowTargetDuplicate=false){
 const fail=(message,code='INVALID_JOURNAL')=>{const error=new Error(message+' '+t('manualFix'));error.code=code;throw error;};
 if(!dateKey(date)||date>today||date<h.start)fail(t('dateUnavailable'));
 const front=text.match(/^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
 if(!front)fail(t('frontmatterMissing'));
 let meta;try{meta=parseYaml(front[1]);}catch{fail(t('yamlInvalid'));}
 if(!meta||meta.habit_type!==type||meta.habit_id!==h.p.habit_id||dateKey(meta.start_date instanceof Date?meta.start_date.toISOString().slice(0,10):meta.start_date)!==h.start)fail(t('habitConfigChanged'));
 if(type==='number'&&meta.unit!==h.p.unit)fail(t('unitChanged'));
 const newline=text.includes('\r\n')?'\r\n':'\n';
 // Mask HTML comments without changing character offsets; ignore fenced examples.
 let mask=text.replace(/<!--[\s\S]*?-->/g,s=>s.replace(/[^\r\n]/g,' '));
 if(mask.includes('<!--'))fail(t('commentUnclosed'));
 const rows=[],dates=new Map(),journals=[];let fence=null,offset=0,journalEnd=text.length;
 const lines=mask.split(/(?<=\n)/);
 for(let index=0;index<lines.length;index++){
  const line=lines[index],start=offset;offset+=line.length;if(start<front[0].length)continue;
  const f=line.match(/^ {0,3}(`{3,}|~{3,})/);
  if(f){if(!fence)fence=f[1];else if(f[1][0]===fence[0]&&f[1].length>=fence.length&&/^ {0,3}(?:`+|~+)[ \t]*\r?\n?$/.test(line))fence=null;continue;}
  if(fence)continue;
  if(/^ {4}|^\t/.test(line)&&/(?:date|value)\s*::/.test(line))fail(t('lineIndent',{line:index+1}));
  if(/^ {0,3}##[ \t]+(?:Журнал|Journal)[ \t]*\r?\n?$/.test(line))journals.push({start,end:offset});
  else if(journals.length===1&&journalEnd===text.length&&/^ {0,3}#{1,2}[ \t]+/.test(line))journalEnd=start;
  if(!/(?:date|value)\s*::/.test(line))continue;
  if(!/^ {0,3}(?:[-+*]|\d+[.)])[ \t]+/.test(line)||line.includes('`'))fail(t('lineFormat',{line:index+1}));
  const ds=[...line.matchAll(/\[\s*date\s*::\s*([^\]]*?)\s*\]/g)];
  const vs=[...line.matchAll(/(\[\s*value\s*::\s*)([^\]]*?)(\s*\])/g)];
  if(ds.length!==1||vs.length!==1||[...line.matchAll(/(?:date|value)\s*::/g)].length!==2)fail(t('linePair',{line:index+1}));
  const d=dateKey(ds[0][1].trim());if(!d)fail(t('lineDate',{line:index+1}));
  if(type==='boolean'&&!allowTargetDuplicate&&d===date&&dates.has(d))fail(t('duplicateTarget',{date:d,first:dates.get(d).line+1,second:index+1}),'DUPLICATE_DATE');
  const v=vs[0],raw=v[2].trim();let value;
  if(type==='boolean'){
   if(!['true','false'].includes(raw))fail(t('lineBoolean',{line:index+1}));
   value=raw==='true';
  }else{
   if(!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw)||!Number.isFinite(Number(raw)))fail(t('lineNumber',{line:index+1}));
   value=Number(raw);
  }
  const row={date:d,value,line:index,valueStart:start+v.index+v[1].length,valueEnd:start+v.index+v[1].length+v[2].length};
  dates.set(d,row);rows.push(row);
 }
 if(fence)fail(t('fenceUnclosed'));
 if(journals.length>1)fail(t('multipleJournals'));
 return {rows,target:dates.get(date),newline,insertAt:journalEnd,journalStart:journals[0]?.end,newSection:journals.length===0};
}
function inspectBooleanJournal(text,h,date,today,parseYaml){return inspectHabitJournal(text,h,date,today,parseYaml,'boolean');}
function inspectNumberJournal(text,h,date,today,parseYaml){return inspectHabitJournal(text,h,date,today,parseYaml,'number');}
function appendJournalRow(current,scan,date,token){
 let at=scan.newSection?current.length:scan.insertAt,compact=false;
 if(!scan.newSection){
  const last=[...scan.rows].reverse().find(row=>row.valueStart>=scan.journalStart&&row.valueEnd<=at);
  if(last){
   const nextBreak=current.indexOf('\n',last.valueEnd);
   const end=nextBreak<0?current.length:nextBreak+1;
   // Insert before existing trailing blank lines, without rewriting those lines.
   if(end<=at&&/^[ \t\r\n]*$/.test(current.slice(end,at))){at=end;compact=true;}
  }
 }
 const left=current.slice(0,at),right=current.slice(at),nl=scan.newline;
 const gap=compact?(left.endsWith(nl)?'':nl):(left.endsWith(nl+nl)?'':left.endsWith(nl)?nl:nl+nl);
 const separator=right&&!/^[ \t]*(?:\r?\n|$)/.test(right)?nl:'';
 return left+gap+(scan.newSection?'## '+t('journalHeading')+nl+nl:'')+`- [date:: ${date}] [value:: ${token}]`+nl+separator+right;
}

function editBooleanJournal(current,snapshot,h,date,value,today,parseYaml){
 if(typeof value!=='boolean')throw new Error(t('chooseBoolean'));
 const scan=inspectBooleanJournal(current,h,date,today,parseYaml);
 if(current!==snapshot)throw new Error(t('editConflict'));
 if(scan.target){const t=scan.target;return current.slice(0,t.valueStart)+String(value)+current.slice(t.valueEnd);}
 return appendJournalRow(current,scan,date,String(value));
}

function numberFromInput(input){
 const raw=String(input).trim();
 if(!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(raw))throw new Error(t('numericInputInvalid'));
 const value=Number(raw.replace(',','.'));
 if(!Number.isFinite(value))throw new Error(t('numberTooLarge'));
 if(value===0&&/[1-9]/.test(raw))throw new Error(t('numberTooSmall'));
 return value;
}
function decimalToken(value){
 const text=String(value);if(!/[eE]/.test(text))return text;
 const [mantissa,exp]=text.toLowerCase().split('e'),digits=mantissa.replace('.','');
 const point=(mantissa.includes('.')?mantissa.indexOf('.'):mantissa.length)+Number(exp);
 if(point<=0)return '0.'+'0'.repeat(-point)+digits;
 if(point>=digits.length)return digits+'0'.repeat(point-digits.length);
 return digits.slice(0,point)+'.'+digits.slice(point);
}
function appendNumberJournal(current,snapshot,h,date,value,today,parseYaml){
 if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new Error(t('finiteNumberRequired'));
 const scan=inspectNumberJournal(current,h,date,today,parseYaml);
 if(current!==snapshot)throw new Error(t('appendConflict'));
 const day=scan.rows.filter(r=>r.date===date).reduce((s,r)=>s+r.value,0);
 const total=scan.rows.filter(r=>r.date>=h.start&&r.date<=today).reduce((s,r)=>s+r.value,0);
 if(!Number.isFinite(day+value)||!Number.isFinite(total+value))throw new Error(t('sumOverflow'));
 return appendJournalRow(current,scan,date,decimalToken(value));
}
