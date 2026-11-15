const a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.textContent='';this.disabled=false;}
 append(x){this.children.push(x);x.parent=this;}setAttribute(k,v){this.attrs[k]=v;}replaceChildren(){this.children=[];}showModal(){this.open=true;}close(){this.open=false;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}focus(){this.focused=true;}
}
const walk=x=>[x,...x.children.flatMap(walk)];
function fixture(file,fileFolder='Habit Dashboard/Привычки'){const text=fs.readFileSync(file,'utf8'),p={};for(const row of text.split('---')[1].trim().split('\n')){const i=row.indexOf(':');const k=row.slice(0,i),v=row.slice(i+1).trim();p[k]=k==='order'?Number(v):v.replace(/^"|"$/g,'');}p.file={name:path.basename(file,'.md'),folder:fileFolder,path:fileFolder+'/'+path.basename(file),lists:[]};text.split('\n').forEach((row,line)=>{const m=row.match(/^- \[date:: ([^\]]+)\] \[value:: ([^\]]+)\]/);if(m)p.file.lists.push({text:row.replace(/^- /,''),date:m[1],value:m[2]==='true'?true:m[2]==='false'?false:Number(m[2]),line});});return p;}
function loadPages(language='ru'){const relative='Habit Dashboard/'+(language==='ru'?'Привычки':'Habits'),dir=path.join(__dirname,'../dist',language,relative);return fs.readdirSync(dir).filter(f=>f.endsWith('.md')).map(f=>fixture(path.join(dir,f),relative));}
const pages=loadPages();
function mount(data,settings={},runtime={}){const container=runtime.container||new Element('div');const body=new Element('body');container.testBody=body;const code=fs.readFileSync(path.join(__dirname,'../dist',runtime.packageLanguage||'ru','Habit Dashboard',runtime.packageLanguage==='en'?'Dashboard.md':'Дашборд.md'),'utf8').split('```dataviewjs\n')[1].split('\n```')[0];vm.runInNewContext(code,{...runtime,document:{body,createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t)},dv:{container,app:runtime.app,component:runtime.component,current:runtime.current||(()=>({file:{folder:'Habit Dashboard'},...settings})),currentFilePath:runtime.currentFilePath,pages:source=>{runtime.onPages?.(source);return data;}},Date:class extends Date{constructor(...args){super(...(args.length?args:['2026-11-09T12:00:00']));}}});return container;}
function editorHarness(start='2026-11-01',habitId='exercise',packageLanguage='ru',settings={}){
 const packagePages=loadPages(packageLanguage),habit=packagePages.find(p=>p.habit_id===habitId),fileName=habit.file.name+'.md';
 const folder=path.join(__dirname,'../dist',packageLanguage,habit.file.folder);
 const source=fs.readFileSync(path.join(folder,fileName),'utf8').replace(/start_date: \d{4}-\d{2}-\d{2}/,'start_date: '+start);
 let text=source,reads=0,writes=0;const opened=[];const file={path:habit.file.path,extension:'md'};
 const parseYaml=t=>Object.fromEntries(t.split(/\r?\n/).filter(x=>x.includes(':')).map(x=>{const i=x.indexOf(':');return [x.slice(0,i),x.slice(i+1).trim().replace(/^['"]|['"]$/g,'')];}));
 const app={workspace:{openLinkText:async(...args)=>{opened.push(args);}},vault:{getAbstractFileByPath:p=>p===file.path?file:null,read:async()=>{reads++;return text;},process:async(f,fn)=>{const result=fn(text);text=result;writes++;return text;}}};
 const clean=[];const data=packagePages.map(p=>p.habit_id===habitId?{...p,start_date:start}:p);
 const container=mount(data,settings, {packageLanguage,app,require:id=>{a.equal(id,'obsidian');return {parseYaml};},component:{register:fn=>clean.push(fn)}});
 const cells=()=>walk(container).filter(n=>n.tag==='button'&&n.className?.includes('hd-day'));
 return {packageLanguage,app,data,parseYaml,opened,container,file,source,clean,cells,get text(){return text;},set text(v){text=v;},get writes(){return writes;},get reads(){return reads;},dialog:()=>container.testBody.children[0],action:label=>walk(container.testBody).find(n=>n.tag==='button'&&n.textContent===label)};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function assertQuietSave(container){
 const nodes=walk(container);
 a.equal(nodes.some(n=>/^(Сохранено:|Сохранение[:…])/.test(n.textContent)),false);
 a.equal(nodes.some(n=>['hd-save-status','hd-saving-status'].includes(n.className)),false);
}

function numericHarness(packageLanguage='ru',settings={}){const h=editorHarness('2026-10-01','reading',packageLanguage,settings);const label=(settings.language||packageLanguage)==='en'?'Add record':'Добавить запись';h.open=()=>walk(h.container).find(n=>n.textContent===label).onclick();h.date=()=>walk(h.container.testBody).find(n=>n.tag==='input'&&n.type==='date');h.amount=()=>walk(h.container.testBody).find(n=>n.tag==='input'&&n.type==='text');h.fill=(amount,date)=>{if(date){h.date().value=date;h.date().oninput();}h.amount().value=String(amount);h.amount().oninput();};return h;}
module.exports={Element,walk,fixture,loadPages,pages,mount,editorHarness,numericHarness,flush,assertQuietSave};
