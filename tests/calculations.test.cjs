const {test}=require('node:test');const a=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const E=require('./engine.cjs');
const today='2026-11-09';
function h(rows=[],type='boolean',start='2026-11-01',extra={}){return E.normalize({habit_id:'x',habit_name:'Тест',habit_type:type,start_date:start,order:1,unit:'шт',file:{path:'x.md',lists:rows.map(([date,value],line)=>({date,value,line}))},...extra},today);}
test('strict calendar dates and Luxon adapter',()=>{for(const d of ['2026-02-29','2026-13-01','2026-1-01','2026-11-31'])a.equal(E.dateKey(d),null);a.equal(E.dateKey('2024-02-29'),'2024-02-29');a.equal(E.dateKey({toISODate:()=>today}),today);});
test('binary duplicate combinations warn and combine by OR without double counting',()=>{
 for(const values of [[true,true],[false,false],[true,false],[false,true],[true,false,true]]){
  const x=h(values.map(v=>['2026-11-08',v]));
  a.equal(x.errors.length,0);a.equal(x.values.size,1);a.equal(x.values.get('2026-11-08'),values.some(Boolean));a.match(x.warn[0],/2026-11-08/);a.match(x.warn[0],/строки: 1, 2/);a.match(x.warn[0],/вручную/);a.equal(E.statistics(x,today,'2026-11').total,values.some(Boolean)?1:0);
 }
});
test('numeric sums, fractions and explicit zero',()=>{const x=h([['2026-11-01',15],['2026-11-01',20.5],['2026-11-02',0]],'number');const s=E.statistics(x,today,'2026-11');a.equal(s.sum,35.5);a.equal(s.total,1);a.equal(E.series(x,today,'2026-11','daily')[1].v,0);a.equal(E.series(x,today,'2026-11','daily')[2].v,null);});
test('today absent preserves streak, explicit false breaks it',()=>{const rows=[['2026-11-07',true],['2026-11-08',true]];a.equal(E.statistics(h(rows),today,'2026-10').current,2);a.equal(E.statistics(h([...rows,[today,false]]),today,'2026-11').current,0);a.equal(E.statistics(h([...rows,[today,true]]),today,'2026-11').current,3);});
test('completed misses exclude today and reset on success today',()=>{a.equal(E.statistics(h([], 'boolean','2026-11-07'),today,'2026-11').misses,2);a.equal(E.statistics(h([[today,false]],'boolean','2026-11-07'),today,'2026-11').misses,2);a.equal(E.statistics(h([[today,true]],'boolean','2026-11-07'),today,'2026-11').misses,0);});
test('future and prestart records ignored, bad values diagnosed',()=>{const x=h([['2026-10-31',true],['2026-11-10',true],['bad',true],['2026-11-07','true'],[today,true]]);a.equal(x.values.size,1);a.equal(x.warn.length,4);for(const v of [-1,Infinity,NaN,'2',true])a.equal(h([[today,v]],'number').values.size,0);});
test('configuration validation and empty journal',()=>{a.equal(h().errors.length,0);a.equal(E.statistics(h(),today,'2026-11').max,0);for(const extra of [{habit_id:''},{habit_type:'bad'},{start_date:'bad'},{order:1.5},{habit_name:null}])a.ok(h([], 'boolean', '2026-11-01',extra).errors.length);a.ok(h([],'number','2026-11-01',{unit:''}).errors.length);});
test('future start and calendar states',()=>{const x=h([], 'boolean','2026-11-10');a.equal(E.statistics(x,today,'2026-11').misses,0);a.equal(E.state(h(),today,today),'pending');a.equal(E.state(h(),'2026-11-08',today),'miss');a.equal(E.state(h(),'2026-11-10',today),'future');a.equal(E.state(x,today,today),'before');});
test('maximum streak across month/year, month independent current',()=>{const x=E.normalize({habit_id:'x',habit_name:'x',habit_type:'boolean',order:0,start_date:'2025-12-30',file:{lists:['2025-12-30','2025-12-31','2026-01-01'].map(date=>({date,value:true}))}},'2026-01-02');const s=E.statistics(x,'2026-01-02','2025-12');a.equal(s.max,3);a.equal(s.current,3);a.equal(s.month,2);a.equal(s.total,3);});
test('calendar leap year and year transition',()=>{a.equal(E.monthDays('2024-02').length,29);a.equal(E.monthDays('2026-02').length,28);a.equal(E.key(E.ordinal('2025-12-31')+1),'2026-01-01');});
test('cumulative resets at month start and retains gaps',()=>{const x=h([['2026-10-31',100],['2026-11-01',5],['2026-11-03',7]],'number','2026-10-01');const s=E.series(x,today,'2026-11','cumulative');a.deepEqual(s.slice(0,3).map(p=>p.v),[5,null,12]);});
test('average uses previous month and fixed 7 calendar days; missing observations stay gaps',()=>{const x=h([['2026-10-31',7],['2026-11-01',7],['2026-11-03',0]],'number','2026-10-01');const s=E.series(x,today,'2026-11','average');a.equal(s[0].v,2);a.equal(s[1].v,null);a.equal(s[2].v,2);});
test('stable ordering',()=>{const x=h(),y=h([], 'boolean','2026-11-01',{order:2});a.ok(E.compare(x,y)<0);});
test('embedded engine exactly matches tested engine; UI syntax valid',()=>{const md=fs.readFileSync(path.join(__dirname,'../dist/ru/Habit Dashboard/Дашборд.md'),'utf8');const code=md.split('```dataviewjs\n')[1].split('\n```')[0];a.ok(code.includes(fs.readFileSync(path.join(__dirname,'../src/core.js'),'utf8')));new (Object.getPrototypeOf(async function(){}).constructor)('dv',code);});
test('no destructive operations or network dependency',()=>{const md=fs.readFileSync(path.join(__dirname,'../dist/ru/Habit Dashboard/Дашборд.md'),'utf8');a.doesNotMatch(md,/\b(fetch|XMLHttpRequest|localStorage|eval)\s*\(/);a.doesNotMatch(md,/vault\.(?:create|write|modify|delete|trash|rename)\s*\(/);a.equal((md.match(/vault\.process\(/g)||[]).length,1);});
test('performance: 40 habits with ten years history',()=>{const rows=Array.from({length:3650},(_,i)=>[E.key(E.ordinal('2016-11-01')+i),i%3>0]);for(let i=0;i<40;i++){const x=h(rows,'boolean','2016-11-01');a.ok(E.statistics(x,today,'2026-11').max>0);}});
test('uppercase display formats never change ISO parsing or calculations',()=>{
 for(const [format,want]of [['DD:MM:YYYY','09:11:2026'],['DD.MM.YYYY','09.11.2026'],['DD/MM/YYYY','09/11/2026'],['YYYY-MM-DD','2026-11-09'],['MM-DD-YYYY','11-09-2026']]){
  a.equal(E.dateFormatSetting(format).warning,null);a.equal(E.displayDate(today,format),want);
 }
 a.equal(E.dateFormatSetting(undefined).format,'DD:MM:YYYY');
 for(const bad of ['dd:mm:yyyy','DD:mm:YYYY','DD:DD:YYYY','DD:MM-YYYY','YYYY',42,{},['DD:MM:YYYY'],'']){const setting=E.dateFormatSetting(bad);a.equal(setting.format,'YYYY-MM-DD');a.ok(setting.warning);}
 a.equal(E.displayDate('2024-02-29','DD:MM:YYYY'),'29:02:2024');
 a.equal(E.dateKey('09:11:2026'),null);
 const x=h([['2026-11-08',true]]);const before=E.statistics(x,today,'2026-11');
 E.displayDate(x.start,'DD:MM:YYYY');a.deepEqual(E.statistics(x,today,'2026-11'),before);a.ok(x.values.has('2026-11-08'));
});

test('duplicates warn before range/value filtering but do not hide valid data',()=>{
 for(const d of ['2026-10-31','2026-11-10',today]){
  const x=h([[d,true],[d,'invalid']]);a.equal(x.errors.length,0);a.ok(x.warn.some(w=>w.startsWith('Повтор даты')));a.equal(x.values.size,d===today?1:0);
 }
 const x=h([['2026-11-07',true],['2026-11-07',false],['2026-11-08',false],['2026-11-08',false]]);
 a.equal(x.errors.length,0);a.equal(x.warn.length,2);a.equal(x.values.size,2);a.equal(x.values.get('2026-11-07'),true);a.equal(x.values.get('2026-11-08'),false);
});
test('manual duplicate correction restores the same original format',()=>{
 const x=h([['2026-11-08',false]]);a.equal(x.errors.length,0);a.equal(x.values.get('2026-11-08'),false);
 const y=h([['2026-11-08',true]]);a.equal(y.errors.length,0);a.equal(E.statistics(y,today,'2026-11').total,1);
});
test('Dataview text is authoritative when typed date/value fields are arrays',()=>{
 const p={habit_id:'meditation',habit_name:'Медитация',habit_type:'boolean',start_date:'2026-11-01',order:2,file:{lists:[
  {line:10,text:'[date:: 2026-11-01] [value:: true]',date:['bad','data'],value:[false,false]},
  {line:11,text:'[date:: 2026-11-02] [value:: false]\n[date:: 2026-11-03] [value:: true]',date:['2026-11-02','2026-11-03'],value:[false,true]},
  {line:12,text:'[date:: 2026-11-03] [value:: true]',date:null,value:undefined}
 ]}};
 const x=E.normalize(p,today);a.deepEqual(x.errors,[]);a.deepEqual(x.warn,[]);a.equal(x.values.get('2026-11-02'),false);a.equal(x.values.get('2026-11-03'),true);a.equal(x.values.size,3);
});
test('all packaged meditation lines parse from actual text despite absent typed metadata',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../dist/ru/Habit Dashboard/Привычки/Медитация.md'),'utf8');
 const rows=source.split('\n').map((text,line)=>({text,line})).filter(r=>r.text.startsWith('- '));
 const x=E.normalize({habit_id:'meditation',habit_name:'Медитация',habit_type:'boolean',start_date:'2026-11-01',order:2,file:{lists:rows}},'2026-11-11');
 a.deepEqual(x.warn,[]);a.deepEqual(x.errors,[]);a.equal(x.values.size,8);a.equal(x.values.get('2026-11-02'),false);
});
test('text-based reading retains binary OR warning and numeric summation',()=>{
 const rows=[{line:11,text:'[date:: 2026-11-02] [value:: false]',date:null},{line:12,text:'[date:: 2026-11-02] [value:: true]',date:null}];
 const binary=h([], 'boolean','2026-11-01',{file:{lists:rows}});a.match(binary.warn[0],/строки: 12, 13/);a.equal(binary.values.get('2026-11-02'),true);
 const numeric=rows.map((r,i)=>({...r,text:`[date:: 2026-11-02] [value:: ${i===0?0:2.5}]`,date:[1,2],value:['bad']}));
 const x=h([], 'number','2026-11-01',{file:{lists:numeric}});a.equal(x.values.get('2026-11-02'),2.5);a.deepEqual(x.warn,[]);
});
test('invalid literal date is diagnosed and never replaced by valid indexed metadata',()=>{
 const x=h([], 'boolean','2026-11-01',{file:{lists:[{line:11,text:'[date:: 2026-02-30] [value:: true]',date:'2026-11-02',value:true}]}});
 a.equal(x.values.size,0);a.match(x.warn[0],/Строка 12/);a.match(x.warn[0],/2026-02-30/);
 a.ok(E.dateDiagnostic('2026\u201111\u201102').includes('2011'));
});
test('ordinary list text is ignored and multiple dates in a single line are not guessed',()=>{
 const x=h([], 'boolean','2026-11-01',{file:{lists:[{line:1,text:'обычная заметка',date:'2026-11-02',value:true},{line:2,text:'[date:: 2026-11-02] [date:: 2026-11-03] [value:: true]'}]}});
 a.equal(x.values.size,0);a.equal(x.warn.length,1);
});
test('OR duplicate days count once in streaks, maximum and month totals',()=>{
 const x=h([['2026-11-07',true],['2026-11-07',false],['2026-11-08',false],['2026-11-08',true],['2026-11-08',false]]);
 const s=E.statistics(x,today,'2026-11');a.equal(s.current,2);a.equal(s.max,2);a.equal(s.total,2);a.equal(s.month,2);a.equal(s.misses,0);
 const historical=E.statistics(x,today,'2026-10');a.equal(historical.current,2);a.equal(historical.month,0);
 const failed=h([['2026-11-07',true],['2026-11-08',false],['2026-11-08',false]]);a.equal(E.statistics(failed,today,'2026-11').misses,1);
});
test('month range includes the oldest configured start month of either habit type',()=>{
 const oldest=h([],'number','2025-12-15'),newest=h([],'boolean','2026-11-09'),bad=h([],'boolean','2020-01-01',{habit_name:''});
 a.deepEqual(E.monthRange([newest,bad,oldest],today),{min:'2025-12',max:'2026-11'});
});
test('empty, invalid and only future habits cannot move before the current month',()=>{
 for(const list of [[],[h([],'boolean','2027-01-01')],[h([],'boolean','2020-01-01',{order:'bad'})]])a.deepEqual(E.monthRange(list,today),{min:'2026-11',max:'2026-11'});
});
test('remembered month is clamped to valid history including year transitions',()=>{
 const range={min:'2025-12',max:'2026-11'};
 for(const [input,want]of [['2024-01','2025-12'],['2025-12','2025-12'],['2026-01','2026-01'],['2027-03','2026-11'],['2026-13','2026-11'],[null,'2026-11']])a.equal(E.boundedMonth(input,range),want);
});
