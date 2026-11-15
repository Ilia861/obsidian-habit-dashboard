const currentNote=dv.current?.();
const contextPath=(typeof currentNote?.file?.path==='string'&&currentNote.file.path)||
 (typeof dv.currentFilePath==='string'&&dv.currentFilePath)||null;
const cachedProperties=contextPath?dv.app?.metadataCache?.getCache?.(contextPath)?.frontmatter:undefined;
const i18n=createI18n(currentNote?.language??cachedProperties?.language,CATALOGS,PACKAGE_DEFAULTS.language);
const {t,locale}=i18n;
const base=typeof currentNote?.file?.folder==='string'?currentNote.file.folder:
 contextPath?contextPath.slice(0,Math.max(0,contextPath.lastIndexOf('/'))):null;
if(base===null){
 const doc=dv.container.ownerDocument||document;
 const message=doc.createElement('p');message.textContent=t('contextPending');message.setAttribute('role','status');dv.container.append(message);
}else{
const dashboardPath=contextPath||(base?base+'/':'')+PACKAGE_DEFAULTS.dashboardName;
const settings=dateFormatSetting(currentNote?.date_format??cachedProperties?.date_format);
const dateLabel=d=>displayDate(d,settings.format);
const folderSetting=currentNote?.habits_folder??cachedProperties?.habits_folder??PACKAGE_DEFAULTS.habitsFolder;
const folderValid=typeof folderSetting==='string'&&folderSetting.trim()!==''&&!folderSetting.startsWith('/')&&!folderSetting.includes('\\')&&!folderSetting.split('/').some(part=>part==='..'||part==='.'||part==='');
const habitsFolder=folderValid?(base?base+'/':'')+folderSetting:null;
const helpPath=(base?base+'/':'')+'Help.'+i18n.language+'.md';
const today=localToday();let month=dv.container.__habitDashboardMonth||today.slice(0,7);
const pages=folderValid?Array.from(dv.pages(JSON.stringify(habitsFolder))).filter(p=>p.file.folder===habitsFolder):[];
const writeHub=dv.container.__habitDashboardWrites||(dv.container.__habitDashboardWrites={pending:new Map(),refresh:null});
const habits=pages.map(p=>normalize(p,today));
for(const h of habits){const job=writeHub.pending.get(h.p.file.path);if(job&&!h.errors.length&&job.habitId===h.p.habit_id&&job.start===h.start)Object.assign(h,normalize({...h.p,file:{...h.p.file,lists:job.originalRows}},today));}
const ids=new Map();for(const h of habits){const id=h.p.habit_id;if(typeof id==='string'){if(!ids.has(id))ids.set(id,[]);ids.get(id).push(h);}}
for(const group of ids.values())if(group.length>1)for(const h of group)h.warn.push(t('idConflict',{files:group.map(x=>x.p.file.path).join(', ')}));
const cache=new Map(dv.container.__habitDashboardChartModes||[]);
const root=document.createElement('div');root.className='habit-dashboard';dv.container.append(root);
// Redraw coordinates on width changes; SVG units stay equal to CSS pixels.
const chartDrawers=new Map();
let observedWidth=-1;
const chartResizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{
 const width=entries[0]?.contentRect.width;
 if(width>0&&width!==observedWidth){observedWidth=width;for(const draw of chartDrawers.values())draw();}
}):null;
chartResizeObserver?.observe(root);
dv.component?.register(()=>{chartResizeObserver?.disconnect();chartDrawers.clear();});
function el(tag,parent,text,cls){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;parent.append(x);return x;}
function link(parent,path,label){const a=el('a',parent,label,'internal-link');a.setAttribute('data-href',path);a.setAttribute('href',path);return a;}
function button(parent,text,fn){const b=el('button',parent,text);b.type='button';b.onclick=fn;return b;}
let editor=null,disposed=false;
const editorDocument=dv.container.ownerDocument||document;
function closeEditor(){if(!editor)return;const e=editor;editor=null;e.dialog.close();e.dialog.remove();if(e.trigger?.isConnected)e.trigger.focus({preventScroll:true});}
writeHub.refresh=refreshWrite;
dv.component?.register(()=>{disposed=true;if(writeHub.refresh===refreshWrite)writeHub.refresh=null;closeEditor();});
function openEditor(h,date,trigger){
 if(editor||disposed||writeHub.pending.has(h.p.file.path)||h.errors.length||date>localToday()||date<h.start)return;
 const dialog=el('dialog',editorDocument.body,undefined,'hd-editor');
 const title=el('h2',dialog,h.p.habit_name+' — '+dateLabel(date));title.id='hd-editor-title-'+Math.random().toString(36).slice(2);dialog.setAttribute('aria-labelledby',title.id);
 const status=el('p',dialog,t('loadingEntry'));status.setAttribute('role','status');
 const error=el('p',dialog,'','hd-editor-error');error.setAttribute('role','alert');
 const sourceLink=link(dialog,h.p.file.path,t('openHabitFile'));
 sourceLink.onclick=async event=>{
  event.preventDefault();event.stopPropagation();if(editor!==session||session.saving)return;
  try{
   if(!dv.app.vault.getAbstractFileByPath(h.p.file.path))throw new Error(t('fileMissing'));
   await dv.app.workspace.openLinkText(h.p.file.path,dashboardPath,true);
   if(editor===session)closeEditor();
  }catch(e){if(editor===session)error.textContent=t('openFailed',{error:e.message});}
 };
 const actions=el('div',dialog,undefined,'hd-editor-actions');
 const yes=button(actions,t('doneAction'),()=>save(true)),no=button(actions,t('notDoneAction'),()=>save(false)),cancel=button(actions,t('cancel'),()=>{if(!editor?.saving)closeEditor();});
 yes.disabled=no.disabled=true;
 const session={dialog,trigger,saving:false,snapshot:null,file:null,parseYaml:null};editor=session;
 dialog.oncancel=event=>{event.preventDefault();if(!session.saving)closeEditor();};
 dialog.showModal();cancel.focus();
 (async()=>{try{
  const {parseYaml}=require('obsidian');if(typeof parseYaml!=='function')throw new Error(t('apiUnavailable'));
  const file=dv.app.vault.getAbstractFileByPath(h.p.file.path);if(!file||file.extension!=='md')throw new Error(t('fileMissingReopen'));
  const snapshot=await dv.app.vault.read(file);if(disposed||editor!==session)return;
  const scan=inspectBooleanJournal(snapshot,h,date,localToday(),parseYaml);
  Object.assign(session,{file,snapshot,parseYaml});
  status.textContent=t('currentState',{state:scan.target?(scan.target.value?t('doneLower'):t('notDoneLower')):t('noRecord')});yes.disabled=no.disabled=false;
 }catch(e){if(editor===session){status.textContent=t('saveUnavailable');error.textContent=e.message;}}})();
 async function save(value){
  if(editor!==session||session.saving||session.snapshot===null)return;
  session.saving=true;yes.disabled=no.disabled=cancel.disabled=true;error.textContent='';status.textContent=t('saving');
  await commitJournal(session,h,date,value,'boolean',message=>{session.saving=false;cancel.disabled=false;status.textContent=t('saveFailed');error.textContent=message;});
 }
}
async function commitJournal(session,h,date,value,kind,onError){
 dv.container.__habitDashboardMonth=month;
 const inspect=kind==='number'?inspectNumberJournal:inspectBooleanJournal;
 const update=kind==='number'?appendNumberJournal:editBooleanJournal;
  let job=null;
  try{
   const original=inspect(session.snapshot,h,date,localToday(),session.parseYaml);
   update(session.snapshot,session.snapshot,h,date,value,localToday(),session.parseYaml);
   job={kind,path:h.p.file.path,habitId:h.p.habit_id,start:h.start,date,value,originalRows:original.rows};
   writeHub.pending.set(job.path,job);
   // Keep the last confirmed value until the file operation actually succeeds.
   closeEditor();writeHub.refresh?.(job,job.originalRows,{pending:true});
   const saved=await dv.app.vault.process(session.file,current=>{if(disposed&&!writeHub.refresh)throw new Error(t('viewClosed'));if(session.file.path!==job.path||dv.app.vault.getAbstractFileByPath(job.path)!==session.file)throw new Error(t('fileMoved'));return update(current,session.snapshot,h,date,value,localToday(),session.parseYaml);});
   const scan=inspect(saved,h,date,localToday(),session.parseYaml);
   writeHub.pending.delete(job.path);
   writeHub.refresh?.(job,scan.rows,{});
  }catch(e){
   if(job){
    const duplicate=kind==='boolean'&&e.code==='DUPLICATE_DATE';let rows=job.originalRows;
    // On a duplicate conflict, show the actual current OR result without writing it.
    if(duplicate){try{const current=await dv.app.vault.read(session.file);rows=inspectHabitJournal(current,h,date,localToday(),session.parseYaml,'boolean',true).rows;}catch{}}
    writeHub.pending.delete(job.path);writeHub.refresh?.(job,rows,{text:t('saveFailed')+' '+e.message,error:true,duplicate,path:job.path});
   }
   else if(editor===session)onError(e.message);
  }
}
function openNumberEditor(h,trigger){
 if(editor||disposed||h.errors.length||writeHub.pending.has(h.p.file.path)||h.start>localToday())return;
 const dialog=el('dialog',editorDocument.body,undefined,'hd-editor');
 const title=el('h2',dialog,t('numberTitle',{habit:h.p.habit_name}));title.id='hd-number-title-'+Math.random().toString(36).slice(2);dialog.setAttribute('aria-labelledby',title.id);
 const dateLabelEl=el('label',dialog,t('dateLabel'),'hd-editor-field');
 const dateInput=el('input',dateLabelEl);dateInput.type='date';dateInput.min=h.start;dateInput.max=localToday();dateInput.value=localToday();
 const dateHint=el('small',dateLabelEl,'','hd-muted');
 const valueLabel=el('label',dialog,t('quantityLabel',{unit:h.p.unit}),'hd-editor-field');
 const valueInput=el('input',valueLabel);valueInput.type='text';valueInput.inputMode='decimal';valueInput.value='';valueInput.placeholder=t('quantityExample');
 const summary=el('p',dialog,t('loadingJournal'));summary.setAttribute('aria-live','polite');
 const error=el('p',dialog,'','hd-editor-error');error.setAttribute('role','alert');
 const source=link(dialog,h.p.file.path,t('openHabitFile'));
 const actions=el('div',dialog,undefined,'hd-editor-actions');
 const add=button(actions,t('add'),save),cancel=button(actions,t('cancel'),()=>{if(!session.saving)closeEditor();});add.disabled=true;
 const session={dialog,trigger,saving:false,snapshot:null,file:null,parseYaml:null,rows:[]};editor=session;
 source.onclick=async event=>{event.preventDefault();event.stopPropagation();if(editor!==session||session.saving)return;try{if(!dv.app.vault.getAbstractFileByPath(h.p.file.path))throw new Error(t('fileMissing'));await dv.app.workspace.openLinkText(h.p.file.path,dashboardPath,true);if(editor===session)closeEditor();}catch(e){if(editor===session)error.textContent=t('openFailed',{error:e.message});}};
 dialog.oncancel=event=>{event.preventDefault();if(!session.saving)closeEditor();};
 dateInput.oninput=dateInput.onchange=valueInput.oninput=preview;
 valueInput.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();if(!add.disabled)save();}};
 dialog.showModal();valueInput.focus();
 (async()=>{try{
  const {parseYaml}=require('obsidian');const file=dv.app.vault.getAbstractFileByPath(h.p.file.path);
  if(!file||file.extension!=='md')throw new Error(t('fileMissing'));
  const snapshot=await dv.app.vault.read(file);if(disposed||editor!==session)return;
  const scan=inspectNumberJournal(snapshot,h,localToday(),localToday(),parseYaml);
  Object.assign(session,{file,snapshot,parseYaml,rows:scan.rows});preview();
 }catch(e){if(editor===session){summary.textContent=t('addUnavailable');error.textContent=e.message;}}})();
 function preview(){
  if(editor!==session||session.saving)return;
  dateHint.textContent=dateKey(dateInput.value)?dateLabel(dateInput.value):'';add.disabled=true;
  if(session.snapshot===null)return;error.textContent='';
  const date=dateKey(dateInput.value);
  if(!date||date<h.start||date>localToday()){error.textContent=t('chooseDate');return;}
  const previous=session.rows.filter(r=>r.date===date).reduce((sum,r)=>sum+r.value,0);
  summary.textContent=t('alreadyRecorded',{amount:fmt(previous),unit:h.p.unit});
  if(!valueInput.value.trim())return;
  try{
   const value=numberFromInput(valueInput.value),total=session.rows.filter(r=>r.date>=h.start&&r.date<=localToday()).reduce((sum,r)=>sum+r.value,0);
   if(!Number.isFinite(previous+value)||!Number.isFinite(total+value))throw new Error(t('sumTooLarge'));
   summary.textContent+=t('sumPreview',{amount:fmt(value),total:fmt(previous+value)});add.disabled=false;
  }catch(e){error.textContent=e.message;}
 }
 async function save(){
  if(editor!==session||session.saving||session.snapshot===null||add.disabled)return;
  let value;try{value=numberFromInput(valueInput.value);}catch(e){error.textContent=e.message;return;}
  session.saving=true;add.disabled=cancel.disabled=dateInput.disabled=valueInput.disabled=true;
  await commitJournal(session,h,dateInput.value,value,'number',message=>{
   session.saving=false;cancel.disabled=dateInput.disabled=valueInput.disabled=false;preview();error.textContent=message;
  });
 }
}

function refreshWrite(job,rows,notice){
 if(disposed)return;
 const habit=habits.find(h=>h.p.file.path===job.path&&h.p.habit_id===job.habitId&&h.start===job.start);
 if(habit){const existingErrors=habit.errors;Object.assign(habit,normalize({...habit.p,file:{...habit.p.file,lists:rows}},localToday()));if(notice.error&&existingErrors.length)habit.errors=existingErrors;if(notice.duplicate&&!habit.warn.some(message=>message.startsWith(t('duplicatePrefix'))))habit.warn.push(notice.text);}
 for(const [key,value]of cache)if(typeof value!=='string'&&key.startsWith(job.path+'|'))cache.delete(key);
 render();
 if(!notice.pending&&!editor){const target=[...(root.querySelectorAll?.(job.kind==='number'?'button.hd-add-number':'button[data-hd-date]')||[])].find(x=>x.getAttribute('data-hd-path')===job.path&&(job.kind==='number'||x.getAttribute('data-hd-date')===job.date));target?.focus({preventScroll:true});}
}

const fmt=x=>Number(x.toFixed(2)).toLocaleString(locale);
function svgEl(tag,parent,attrs={}){const x=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))x.setAttribute(k,v);parent.append(x);return x;}
function chart(parent,h,mode){
 const data=series(h,today,month,mode),max=Math.max(1,...data.map(x=>x.v??0));
 const draw=()=>{
 parent.replaceChildren();const width=parent.clientWidth||420;
 const left=Math.max(42,Math.min(width*0.4,fmt(max).length*7+12));
 const right=width-12;
 const svg=svgEl('svg',parent,{viewBox:`0 0 ${width} 190`,width:'100%',height:'190',role:'img','aria-label':h.p.habit_name+' — '+month+' — '+mode});
 const title=svgEl('title',svg);title.textContent=t('chartDescription');
 const X=i=>left+i*(right-left)/(data.length-1),Y=v=>155-v/max*130;
 for(const v of [0,max/2,max]){svgEl('line',svg,{x1:left,x2:right,y1:Y(v),y2:Y(v),class:'hd-gridline'});const t=svgEl('text',svg,{x:1,y:Y(v)+4});t.textContent=fmt(v);}
 let path='';let active=false;
 data.forEach((p,i)=>{if(p.v===null){active=false;return;}path+=`${active?'L':'M'}${X(i)} ${Y(p.v)} `;active=true;});
 svgEl('path',svg,{d:path,class:'hd-line'});
 data.forEach((p,i)=>{if(p.v===null)return;const c=svgEl('circle',svg,{cx:X(i),cy:Y(p.v),r:3.5,class:'hd-point'});const t=svgEl('title',c);t.textContent=dateLabel(p.d)+': '+fmt(p.v)+' '+h.p.unit;});
 for(const i of [0,6,13,20,data.length-1]){const t=svgEl('text',svg,{x:X(i),y:178,'text-anchor':'middle'});t.textContent=String(i+1);}
 if(!data.some(x=>x.v!==null))el('p',parent,t('noMonthRecords'),'hd-muted');
 };
 chartDrawers.set(parent,draw);draw();
}
function render(){
 const range=monthRange(habits,today);month=boundedMonth(month,range);dv.container.__habitDashboardMonth=month;
 chartDrawers.clear();root.replaceChildren();el('h1',root,t('dashboardTitle'));link(root,helpPath,t('help'));
 if(settings.warning)el('p',root,settings.warning,'hd-diagnostics');
 if(i18n.warning)el('p',root,i18n.warning,'hd-diagnostics');
 if(!folderValid)el('p',root,t('invalidHabitsFolder'),'hd-diagnostics');
 const nav=el('nav',root,undefined,'hd-nav');nav.setAttribute('aria-label',t('monthSelection'));
 function move(delta){if((delta<0&&month<=range.min)||(delta>0&&month>=range.max))return;const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+delta);month=boundedMonth(d.toISOString().slice(0,7),range);dv.container.__habitDashboardMonth=month;render();}
 const previous=button(nav,t('previous'),()=>move(-1));previous.disabled=month<=range.min;
 const dt=new Date(month+'-01T12:00:00Z');el('strong',nav,dt.toLocaleDateString(locale,{month:'long',year:'numeric',timeZone:'UTC'}));
 const next=button(nav,t('next'),()=>move(1));next.disabled=month>=range.max;
 button(nav,t('currentMonth'),()=>{month=today.slice(0,7);dv.container.__habitDashboardMonth=month;render();});
 const diagnostics=habits.filter(h=>h.errors.length||h.warn.length);
 if(diagnostics.length){const details=el('details',root,undefined,'hd-diagnostics');details.open=diagnostics.some(h=>h.errors.length>0||h.warn.some(message=>message.startsWith(t('duplicatePrefix'))));el('summary',details,t('diagnostics',{count:diagnostics.length}));for(const h of diagnostics){link(details,h.p.file.path,h.p.file.name);const ul=el('ul',details);for(const msg of [...h.errors,...h.warn])el('li',ul,msg);}}
 const valid=habits.filter(h=>!h.errors.length);
 if(!valid.length){el('p',root,t('emptyDashboard'));link(root,helpPath,t('openHelp'));}
 for(const type of ['boolean','number']){
  const list=valid.filter(h=>h.p.habit_type===type).sort(compare);if(!list.length)continue;
  el('h2',root,type==='boolean'?t('calendars'):t('numericHabits'));const grid=el('div',root,undefined,'hd-cards '+(type==='number'?'hd-numbers':''));
  for(const h of list){const card=el('article',grid,undefined,'hd-card');link(el('h3',card),h.p.file.path,h.p.habit_name);
   if(type==='boolean'){
    const cal=el('div',card,undefined,'hd-calendar');for(const w of t('weekdays'))el('span',cal,w,'hd-weekday');
    const days=monthDays(month),offset=(new Date(days[0]+'T12:00:00Z').getUTCDay()+6)%7;for(let i=0;i<offset;i++)el('span',cal);
    const names={done:t('stateDone'),miss:t('stateMiss'),pending:t('statePending'),before:t('stateBefore'),future:t('stateFuture')};
    for(const d of days){const st=state(h,d,today),x=el('button',cal,String(+d.slice(-2)),'hd-day hd-'+st+(d===today?' hd-today':''));x.type='button';x.disabled=st==='before'||st==='future'||writeHub.pending.has(h.p.file.path);x.title=dateLabel(d)+' — '+names[st];x.setAttribute('aria-label',x.title);x.setAttribute('data-hd-date',d);x.setAttribute('data-hd-path',h.p.file.path);x.onclick=()=>openEditor(h,d,x);}
    el('p',card,t('legend'),'hd-legend');
   }else{
    const addNumber=button(card,t('addRecord'),()=>openNumberEditor(h,addNumber));addNumber.className='hd-add-number';addNumber.setAttribute('data-hd-path',h.p.file.path);addNumber.disabled=writeHub.pending.has(h.p.file.path)||h.start>localToday();
    el('p',card,h.p.unit,'hd-muted');const label=el('label',card,t('modeLabel'));const select=el('select',label);for(const[v,labelText]of [['daily',t('daily')],['cumulative',t('cumulative')],['average',t('average')]]){const o=el('option',select,labelText);o.value=v;}
    select.value=cache.get(h.p.file.path)||'daily';const canvas=el('div',card,undefined,'hd-chart');chart(canvas,h,select.value);select.onchange=()=>{cache.set(h.p.file.path,select.value);(dv.container.__habitDashboardChartModes||(dv.container.__habitDashboardChartModes=new Map())).set(h.p.file.path,select.value);chart(canvas,h,select.value);};
   }
   const ckey=h.p.file.path+'|'+month;let s=cache.get(ckey);if(!s){s=statistics(h,today,month);cache.set(ckey,s);}
   const dl=el('dl',card,undefined,'hd-stats');for(const[k,v]of [[t('start'),dateLabel(h.start)],[t('currentStreak'),s.current],[t('currentMisses'),s.misses],[t('longestStreak'),s.max],[t('totalDone'),s.total],[t('monthDone'),s.month],...(type==='number'?[[t('totalSum'),fmt(s.sum)+' '+h.p.unit],[t('monthSum'),fmt(s.monthSum)+' '+h.p.unit]]:[])]){el('dt',dl,k);el('dd',dl,String(v));}
  }
 }
}
render();

}
