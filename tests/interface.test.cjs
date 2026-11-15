const {test}=require('node:test'),a=require('node:assert/strict');
const {Element,walk,fixture,pages,mount,editorHarness,numericHarness,flush,assertQuietSave}=require('./helpers.cjs');
test('actual Markdown samples render three calendars and one chart',()=>{const nodes=walk(mount(pages));a.equal(pages.filter(p=>p.habit_type==='boolean').length,3);a.equal(pages.filter(p=>p.habit_type==='number').length,1);a.equal(nodes.filter(n=>n.tag==='article').length,4);a.equal(nodes.filter(n=>n.tag==='svg').length,1);a.ok(nodes.some(n=>n.attrs['data-href']==='Habit Dashboard/Help.ru.md'));a.equal(nodes.filter(n=>n.className?.includes('hd-day')).length,90);});
test('navigation refreshes all cards and future button is disabled',()=>{const root=mount(pages);let nodes=walk(root);a.equal(nodes.find(n=>n.textContent==='Следующий →').disabled,true);nodes.find(n=>n.textContent==='← Предыдущий').onclick();nodes=walk(root);a.ok(nodes.some(n=>n.tag==='strong'&&n.textContent.includes('октябрь')));a.equal(nodes.filter(n=>n.tag==='article').length,4);nodes.find(n=>n.textContent==='Текущий месяц').onclick();a.equal(walk(root).find(n=>n.textContent==='Следующий →').disabled,true);});
test('chart modes switch inside card',()=>{const root=mount(pages);const select=walk(root).find(n=>n.tag==='select');for(const mode of ['average','cumulative','daily']){select.value=mode;select.onchange();a.equal(walk(root).filter(n=>n.tag==='article').length,4);a.ok(walk(root).find(n=>n.tag==='svg').attrs['aria-label'].endsWith(mode));}});
test('empty vault and invalid configuration are actionable',()=>{a.ok(walk(mount([])).some(n=>n.textContent.includes('Нет корректно')));const bad={...pages[0],habit_type:'invalid'};const nodes=walk(mount([bad]));a.equal(nodes.filter(n=>n.tag==='article').length,0);a.ok(nodes.some(n=>n.textContent.includes('habit_type:')));});
test('duplicate IDs retain separate cards and show warning',()=>{const nodes=walk(mount([pages[0],{...pages[1],habit_id:pages[0].habit_id}]));a.equal(nodes.filter(n=>n.tag==='article').length,2);a.ok(nodes.some(n=>n.textContent.includes('Конфликт habit_id')));});

test('date_format property controls start, calendar tooltip and chart tooltip',()=>{
 for(const [format,start,day]of [['DD:MM:YYYY','01:11:2026','01:11:2026'],['YYYY-MM-DD','2026-11-01','2026-11-01']]){
  const nodes=walk(mount(pages,{date_format:format}));
  a.ok(nodes.some(n=>n.tag==='dd'&&n.textContent===start));
  a.ok(nodes.some(n=>n.title?.startsWith(day+' — ')));
  a.ok(nodes.some(n=>n.tag==='title'&&n.textContent.startsWith(day+': 35')));
 }
});
test('invalid date format warns but keeps all records and cards readable',()=>{
 const nodes=walk(mount(pages,{date_format:'DD:mm:YYYY'}));
 a.equal(nodes.filter(n=>n.tag==='article').length,4);
 a.ok(nodes.some(n=>n.textContent.includes('date_format:')));
 a.ok(nodes.some(n=>n.tag==='title'&&n.textContent.startsWith('2026-11-01: 35')));
});

test('chart resize keeps fixed height and pixel coordinates; observer is disposed',()=>{
 let width=700,observer;const cleanup=[];
 Object.defineProperty(Element.prototype,'clientWidth',{configurable:true,get:()=>width});
 class Observer{constructor(callback){this.callback=callback;observer=this;}observe(){}disconnect(){this.disconnected=true;}}
 try{
  const root=mount(pages,{}, {ResizeObserver:Observer,component:{register:fn=>cleanup.push(fn)}});
  const chart=()=>walk(root).find(n=>n.tag==='svg');
  a.equal(chart().attrs.height,'190');a.equal(chart().attrs.viewBox,'0 0 700 190');
  width=1200;observer.callback([{contentRect:{width}}]);a.equal(chart().attrs.viewBox,'0 0 1200 190');a.equal(chart().attrs.height,'190');
  a.equal(walk(root).find(n=>n.tag==='circle').attrs.r,3.5);
  const select=walk(root).find(n=>n.tag==='select');select.value='average';select.onchange();
  width=360;observer.callback([{contentRect:{width}}]);a.equal(chart().attrs.viewBox,'0 0 360 190');
  walk(root).find(n=>n.textContent==='← Предыдущий').onclick();a.equal(walk(root).filter(n=>n.tag==='svg').length,1);
  a.equal(cleanup.length,2);cleanup.forEach(fn=>fn());a.equal(observer.disconnected,true);
  const before=chart();width=900;observer.callback([{contentRect:{width}}]);a.equal(chart(),before);
 }finally{delete Element.prototype.clientWidth;}
});

test('duplicate calendar stays visible with OR and linked diagnostics; other cards work',()=>{
 const bad=JSON.parse(JSON.stringify(pages.find(p=>p.habit_type==='boolean')));
 bad.file.lists.push({...bad.file.lists[0],line:99});
 const other=pages.find(p=>p.habit_type==='number');
 const nodes=walk(mount([bad,other]));
 a.equal(nodes.filter(n=>n.tag==='article').length,2);a.equal(nodes.filter(n=>n.tag==='svg').length,1);
 a.equal(nodes.filter(n=>n.className?.includes('hd-day')).length,30);a.ok(nodes.some(n=>n.title?.startsWith('01:11:2026')&&n.className.includes('hd-done')));
 a.ok(nodes.some(n=>n.tag==='details'&&n.open===true));
 a.ok(nodes.some(n=>n.textContent.includes('Повтор даты')&&n.textContent.includes('100')&&n.textContent.includes('вручную')));
 a.ok(nodes.some(n=>n.attrs['data-href']===bad.file.path));
 bad.file.lists.pop();const repaired=walk(mount([bad,other]));
 a.equal(repaired.filter(n=>n.tag==='article').length,2);a.equal(repaired.filter(n=>n.className?.includes('hd-day')).length,30);
});


test('opening dashboard, cancelled selection and Escape never write',async()=>{
 const h=editorHarness();a.equal(h.reads,0);a.equal(h.writes,0);
 h.cells().find(n=>n.title.startsWith('08:11:2026')).onclick();await flush();a.equal(h.writes,0);a.ok(h.dialog().open);
 h.action('Отмена').onclick();a.equal(h.dialog(),undefined);a.equal(h.text,h.source);
 h.cells().find(n=>n.title.startsWith('08:11:2026')).onclick();await flush();let prevented=false;h.dialog().oncancel({preventDefault(){prevented=true;}});a.ok(prevented);a.equal(h.dialog(),undefined);a.equal(h.writes,0);
});
test('existing true becomes false once and calendar/stats update immediately',async()=>{
 const h=editorHarness();h.cells().find(n=>n.title.startsWith('08:11:2026')).onclick();await flush();
 const action=h.action('Не сделал');const saving=action.onclick();a.equal(action.disabled,true);await action.onclick();await saving;
 a.equal(h.writes,1);a.ok(h.text.includes('[date:: 2026-11-08] [value:: false]'));a.equal(h.dialog(),undefined);
 a.ok(h.cells().find(n=>n.title.startsWith('08:11:2026')).className.includes('hd-miss'));
 assertQuietSave(h.container);
});
test('absent date is inserted once; future dates are disabled',async()=>{
 const h=editorHarness();a.ok(h.cells().filter(n=>n.className.includes('hd-future')).every(n=>n.disabled));
 h.cells().find(n=>n.title.startsWith('05:11:2026')).onclick();await flush();await h.action('Сделал').onclick();
 a.equal(h.writes,1);a.equal((h.text.match(/date:: 2026-11-05/g)||[]).length,1);a.ok(h.cells().find(n=>n.title.startsWith('05:11:2026')).className.includes('hd-done'));
});
test('concurrent file edits or new duplicates abort saving without losing edits',async()=>{
 for(const tail of ['\nexternal change\n','\n- [date:: 2026-11-08] [value:: false]\n']){
  const h=editorHarness();h.cells().find(n=>n.title.startsWith('08:11:2026')).onclick();await flush();h.text+=tail;
  const before=h.text;await h.action('Не сделал').onclick();a.equal(h.writes,0);a.equal(h.text,before);
  a.equal(h.dialog(),undefined);assertQuietSave(h.container);if(tail.includes('date::')){a.equal(h.cells().length,90);a.ok(walk(h.container).some(n=>n.textContent.includes('Повтор даты')));}
 }
});
test('rename or deletion aborts save and unload removes pending dialog',async()=>{
 const h=editorHarness();h.cells().find(n=>n.title.startsWith('08:11:2026')).onclick();await flush();h.file.path='renamed.md';await h.action('Сделал').onclick();a.equal(h.writes,0);
 h.clean.forEach(fn=>fn());a.equal(h.dialog(),undefined);
});
test('save preserves selected historical month',async()=>{
 const h=editorHarness('2026-10-01');walk(h.container).find(n=>n.textContent==='← Предыдущий').onclick();
 h.cells().find(n=>n.title.startsWith('30:10:2026')).onclick();await flush();await h.action('Сделал').onclick();
 a.equal(h.container.__habitDashboardMonth,'2026-10');a.ok(walk(h.container).some(n=>n.tag==='strong'&&n.textContent.includes('октябрь')));
 a.ok(h.text.includes('[date:: 2026-10-30] [value:: true]'));
});

test('read and write failures leave the file unchanged and offer cancel',async()=>{
 for(const stage of ['read','process']){
  const h=editorHarness();h.app.vault[stage]=async()=>{throw Error('Ошибка доступа к файлу');};
  h.cells().find(n=>n.title.startsWith('08:11:2026')).onclick();await flush();
  if(stage==='process')await h.action('Сделал').onclick();
  a.equal(h.text,h.source);a.equal(h.writes,0);if(stage==='read'){a.ok(walk(h.container.testBody).some(n=>n.attrs.role==='alert'&&n.textContent.includes('Ошибка доступа')));a.equal(h.action('Отмена').disabled,false);}else{a.equal(h.dialog(),undefined);assertQuietSave(h.container);}
 }
});
test('closing the view before a delayed process callback prevents writing',async()=>{
 const h=editorHarness();h.cells().find(n=>n.title.startsWith('08:11:2026')).onclick();await flush();
 let release;h.app.vault.process=(file,callback)=>new Promise((resolve,reject)=>{release=()=>{try{resolve(callback(h.text));}catch(e){reject(e);}};});
 const pending=h.action('Сделал').onclick();h.clean.forEach(fn=>fn());release();await pending;a.equal(h.text,h.source);a.equal(h.writes,0);
});
test('duplicates created before modal load block both choices',async()=>{
 const h=editorHarness();h.text+='\n- [date:: 2026-11-08] [value:: false]\n';
 h.cells().find(n=>n.title.startsWith('08:11:2026')).onclick();await flush();
 a.equal(h.action('Сделал').disabled,true);a.equal(h.action('Не сделал').disabled,true);a.equal(h.writes,0);
 a.ok(walk(h.container.testBody).some(n=>n.attrs.role==='alert'&&n.textContent.includes('Повтор даты')));
});

test('calendar keeps confirmed value until write succeeds without extra status rows',async()=>{
 const h=editorHarness();h.cells().find(n=>n.title.startsWith('08:11:2026')).onclick();await flush();
 const process=h.app.vault.process;let release;h.app.vault.process=(file,fn)=>new Promise((resolve,reject)=>{release=()=>process(file,fn).then(resolve,reject);});
 const topology=walk(h.container).map(n=>n.tag).join(',');
 const pending=h.action('Не сделал').onclick();
 a.equal(walk(h.container).map(n=>n.tag).join(','),topology);
 a.equal(h.dialog(),undefined);a.equal(h.writes,0);a.equal(h.text,h.source);
 a.ok(h.cells().find(n=>n.title.startsWith('08:11:2026')).className.includes('hd-done'));
 a.ok(h.cells().slice(0,30).every(n=>n.disabled));
 assertQuietSave(h.container);
 h.cells().find(n=>n.title.startsWith('08:11:2026')).onclick();a.equal(h.dialog(),undefined);
 release();await pending;a.equal(h.writes,1);a.equal(walk(h.container).map(n=>n.tag).join(','),topology);a.ok(h.cells().find(n=>n.title.startsWith('08:11:2026')).className.includes('hd-miss'));
 a.equal(h.cells().find(n=>n.title.startsWith('08:11:2026')).disabled,false);
 assertQuietSave(h.container);
});
test('delayed write failure never changes the displayed value and clears lock',async()=>{
 const h=editorHarness();h.cells().find(n=>n.title.startsWith('08:11:2026')).onclick();await flush();
 let rejectWrite;h.app.vault.process=()=>new Promise((resolve,reject)=>{rejectWrite=reject;});
 const pending=h.action('Не сделал').onclick();a.ok(h.cells().find(n=>n.title.startsWith('08:11:2026')).className.includes('hd-done'));
 rejectWrite(Error('Диск недоступен'));await pending;
 a.ok(h.cells().find(n=>n.title.startsWith('08:11:2026')).className.includes('hd-done'));a.equal(h.text,h.source);
 a.equal(h.container.__habitDashboardWrites.pending.size,0);assertQuietSave(h.container);
});
test('Dataview rerender keeps confirmed value and receives success without status rows',async()=>{
 const h=editorHarness();h.cells().find(n=>n.title.startsWith('08:11:2026')).onclick();await flush();
 const process=h.app.vault.process;let release;h.app.vault.process=(file,fn)=>new Promise((resolve,reject)=>{release=()=>process(file,fn).then(resolve,reject);});
 const pending=h.action('Не сделал').onclick();h.clean.forEach(fn=>fn());h.container.replaceChildren();
 mount(h.data,{}, {container:h.container,app:h.app,require:()=>({parseYaml:h.parseYaml}),component:{register(){}}});
 a.ok(h.cells().find(n=>n.title.startsWith('08:11:2026')).className.includes('hd-done'));a.equal(h.cells().find(n=>n.title.startsWith('08:11:2026')).disabled,true);
 release();await pending;a.equal(h.writes,1);a.ok(h.cells().find(n=>n.title.startsWith('08:11:2026')).className.includes('hd-miss'));a.equal(h.cells().find(n=>n.title.startsWith('08:11:2026')).disabled,false);
 assertQuietSave(h.container);
});
test('modal source link uses Obsidian workspace API and closes without writing',async()=>{
 const h=editorHarness();h.cells().find(n=>n.title.startsWith('08:11:2026')).onclick();await flush();
 const link=walk(h.container.testBody).find(n=>n.tag==='a');let prevented=false,stopped=false;
 await link.onclick({preventDefault(){prevented=true;},stopPropagation(){stopped=true;}});
 a.equal(prevented,true);a.equal(stopped,true);a.equal(h.opened.length,1);
 a.deepEqual(h.opened[0],['Habit Dashboard/Привычки/Зарядка.md','Habit Dashboard/Дашборд.md',true]);a.equal(h.dialog(),undefined);a.equal(h.writes,0);
});
test('source link opening error is visible and modal remains cancellable',async()=>{
 const h=editorHarness();h.app.workspace.openLinkText=async()=>{throw Error('Файл недоступен');};h.cells().find(n=>n.title.startsWith('08:11:2026')).onclick();await flush();
 await walk(h.container.testBody).find(n=>n.tag==='a').onclick({preventDefault(){},stopPropagation(){}});
 a.ok(h.dialog());a.ok(walk(h.container.testBody).some(n=>n.attrs.role==='alert'&&n.textContent.includes('Не удалось открыть файл')));h.action('Отмена').onclick();a.equal(h.writes,0);
});



test('numeric entry is opened only by button, graph has no click handlers',async()=>{
 const h=numericHarness();a.equal(h.dialog(),undefined);const svg=walk(h.container).find(n=>n.tag==='svg');a.ok(walk(svg).every(n=>typeof n.onclick==='undefined'&&typeof n.onpointerdown==='undefined'));h.open();await flush();a.ok(h.dialog().open);a.equal(h.date().value,'2026-11-09');a.equal(h.date().min,'2026-10-01');a.equal(h.amount().value,'');a.equal(h.action('Добавить').disabled,true);
});
test('numeric cancel and Escape do not write',async()=>{const h=numericHarness();h.open();await flush();h.fill(5);h.action('Отмена').onclick();a.equal(h.writes,0);a.equal(h.text,h.source);h.open();await flush();h.dialog().oncancel({preventDefault(){}});a.equal(h.writes,0);});
test('numeric three additions are separate rows and graph sums to thirty',async()=>{
 const h=numericHarness();for(const n of [5,5,20]){h.open();await flush();h.fill(n);await h.action('Добавить').onclick();}
 a.equal(h.writes,3);a.equal((h.text.match(/date:: 2026-11-09/g)||[]).length,3);a.ok(h.text.startsWith(h.source));a.ok(walk(h.container).some(n=>n.tag==='title'&&n.textContent.startsWith('09:11:2026: 30')));assertQuietSave(h.container);
});
test('numeric date selection adds to existing sum without modifying old rows',async()=>{
 const h=numericHarness();h.open();await flush();h.fill('2,5','2026-11-01');a.equal(h.action('Добавить').disabled,false);await h.action('Добавить').onclick();a.ok(h.text.startsWith(h.source));a.ok(h.text.includes('[date:: 2026-11-01] [value:: 2.5]'));a.ok(walk(h.container).some(n=>n.tag==='title'&&n.textContent.startsWith('01:11:2026: 37,5')));
});
test('numeric zero is explicit and invalid quantities or dates stay in modal',async()=>{
 const h=numericHarness();h.open();await flush();for(const raw of ['','-1','Infinity','abc','1,2,3']){h.fill(raw);a.equal(h.action('Добавить').disabled,true);}
 h.fill(5,'2026-11-10');a.equal(h.action('Добавить').disabled,true);h.fill(5,'2026-09-30');a.equal(h.action('Добавить').disabled,true);
 h.fill(0,'2026-11-09');a.equal(h.action('Добавить').disabled,false);await h.action('Добавить').onclick();a.ok(h.text.includes('[date:: 2026-11-09] [value:: 0]'));a.ok(walk(h.container).some(n=>n.tag==='title'&&n.textContent.startsWith('09:11:2026: 0')));
});
test('numeric default date is today even when viewing historical month',async()=>{
 const h=numericHarness();walk(h.container).find(n=>n.textContent==='← Предыдущий').onclick();h.open();await flush();a.equal(h.date().value,'2026-11-09');h.fill(5);await h.action('Добавить').onclick();a.equal(h.container.__habitDashboardMonth,'2026-10');a.ok(h.text.includes('[date:: 2026-11-09] [value:: 5]'));
});
test('numeric save is confirmed before graph changes, duplicate click is blocked',async()=>{
 const h=numericHarness();h.open();await flush();h.fill(5,'2026-11-01');const process=h.app.vault.process;let release;h.app.vault.process=(file,fn)=>new Promise((resolve,reject)=>{release=()=>process(file,fn).then(resolve,reject);});
 const add=h.action('Добавить'),pending=add.onclick();await add.onclick();a.equal(h.writes,0);a.ok(walk(h.container).some(n=>n.tag==='title'&&n.textContent.startsWith('01:11:2026: 35')));a.equal(walk(h.container).find(n=>n.textContent==='Добавить запись').disabled,true);assertQuietSave(h.container);
 release();await pending;a.equal(h.writes,1);a.ok(walk(h.container).some(n=>n.tag==='title'&&n.textContent.startsWith('01:11:2026: 40')));assertQuietSave(h.container);
});
test('numeric concurrent modification aborts append without altering history',async()=>{
 const h=numericHarness();h.open();await flush();h.fill(5);h.text+='\nexternal change\n';const before=h.text;await h.action('Добавить').onclick();a.equal(h.writes,0);a.equal(h.text,before);assertQuietSave(h.container);
});
test('numeric quantity is always raw contribution in every graph mode',async()=>{
 const h=numericHarness();for(const mode of ['daily','cumulative','average']){const select=walk(h.container).find(n=>n.tag==='select');select.value=mode;select.onchange();h.open();await flush();h.fill(5);await h.action('Добавить').onclick();a.ok(walk(h.container).find(n=>n.tag==='svg').attrs['aria-label'].endsWith(mode));}
 a.equal((h.text.match(/\[date:: 2026-11-09\] \[value:: 5\]/g)||[]).length,3);
});
test('numeric source link opens the right file without writing',async()=>{
 const h=numericHarness();h.open();await flush();await walk(h.container.testBody).find(n=>n.tag==='a').onclick({preventDefault(){},stopPropagation(){}});a.equal(h.opened[0][0],'Habit Dashboard/Привычки/Чтение.md');a.equal(h.writes,0);a.equal(h.dialog(),undefined);
});

test('numeric read and write failures preserve source and graph',async()=>{
 for(const stage of ['read','process']){
  const h=numericHarness();h.app.vault[stage]=async()=>{throw Error('Ошибка доступа');};h.open();await flush();
  if(stage==='read'){a.equal(h.action('Добавить').disabled,true);h.fill(5);a.ok(walk(h.container.testBody).some(n=>n.attrs.role==='alert'&&n.textContent.includes('Ошибка доступа')));h.action('Отмена').onclick();}
  else{h.fill(5,'2026-11-01');await h.action('Добавить').onclick();a.ok(walk(h.container).some(n=>n.tag==='title'&&n.textContent.startsWith('01:11:2026: 35')));assertQuietSave(h.container);}
  a.equal(h.text,h.source);a.equal(h.writes,0);
 }
});
test('numeric pending append survives Dataview refresh with selected graph mode',async()=>{
 const h=numericHarness(),select=walk(h.container).find(n=>n.tag==='select');select.value='average';select.onchange();h.open();await flush();h.fill(5);
 const process=h.app.vault.process;let release;h.app.vault.process=(file,fn)=>new Promise((resolve,reject)=>{release=()=>process(file,fn).then(resolve,reject);});
 const pending=h.action('Добавить').onclick();h.clean.forEach(fn=>fn());h.container.replaceChildren();
 mount(h.data,{}, {container:h.container,app:h.app,require:()=>({parseYaml:h.parseYaml}),component:{register(){}}});
 a.equal(walk(h.container).find(n=>n.textContent==='Добавить запись').disabled,true);a.equal(walk(h.container).find(n=>n.tag==='select').value,'average');
 release();await pending;a.equal(h.writes,1);a.equal(walk(h.container).find(n=>n.textContent==='Добавить запись').disabled,false);a.equal(walk(h.container).find(n=>n.tag==='select').value,'average');assertQuietSave(h.container);
});

test('meditation with actual list text tolerates transformed indexed fields on line 12',()=>{
 const p=JSON.parse(JSON.stringify(pages.find(p=>p.habit_id==='meditation')));
 const row=p.file.lists.find(r=>r.line===11);a.ok(row);a.ok(row.text.includes('2026-11-02'));row.date=['2026-11-02','2026-11-03'];row.value=[false,true];
 const nodes=walk(mount([p]));a.equal(nodes.some(n=>n.textContent.includes('некорректная дата')),false);
 a.equal(nodes.filter(n=>n.tag==='article').length,1);a.ok(nodes.some(n=>n.title?.startsWith('02:11:2026')&&n.className.includes('hd-miss')));
});
test('other calendar dates remain editable when one date has duplicates',async()=>{
 const h=editorHarness();h.text+='\n- [date:: 2026-11-08] [value:: false]\n';
 h.cells().find(n=>n.title.startsWith('05:11:2026')).onclick();await flush();a.equal(h.action('Сделал').disabled,false);await h.action('Сделал').onclick();
 a.equal(h.writes,1);a.equal((h.text.match(/date:: 2026-11-08/g)||[]).length,2);a.ok(h.cells().find(n=>n.title.startsWith('05:11:2026')).className.includes('hd-done'));a.ok(h.cells().find(n=>n.title.startsWith('08:11:2026')).className.includes('hd-done'));
 h.cells().find(n=>n.title.startsWith('08:11:2026')).onclick();await flush();a.equal(h.action('Сделал').disabled,true);a.equal(h.action('Не сделал').disabled,true);a.ok(walk(h.container.testBody).some(n=>n.textContent.includes('Повтор даты')));
});
test('new conflicting duplicate during save keeps calendar visible with actual OR state',async()=>{
 const h=editorHarness();h.cells().find(n=>n.title.startsWith('02:11:2026')).onclick();await flush();h.text+='\n- [date:: 2026-11-02] [value:: true]\n';const source=h.text;
 await h.action('Не сделал').onclick();a.equal(h.writes,0);a.equal(h.text,source);a.equal(h.cells().length,90);a.ok(h.cells().find(n=>n.title.startsWith('02:11:2026')).className.includes('hd-done'));a.ok(walk(h.container).some(n=>n.tag==='details'&&n.open));
});
function navButton(container,label){return walk(container).find(n=>n.tag==='button'&&n.textContent===label);}
test('previous stops at oldest start month and even direct callback cannot go earlier',()=>{
 const root=mount(pages);a.equal(navButton(root,'← Предыдущий').disabled,false);navButton(root,'← Предыдущий').onclick();
 a.equal(root.__habitDashboardMonth,'2026-10');a.equal(navButton(root,'← Предыдущий').disabled,true);a.equal(navButton(root,'Следующий →').disabled,false);
 navButton(root,'← Предыдущий').onclick();a.equal(root.__habitDashboardMonth,'2026-10');navButton(root,'Следующий →').onclick();a.equal(root.__habitDashboardMonth,'2026-11');a.equal(navButton(root,'Следующий →').disabled,true);
});
test('mid-month start enables its entire month and stops there across December and January',()=>{
 const p={...pages.find(p=>p.habit_type==='boolean'),start_date:'2025-12-15'};const root=mount([p]);
 for(let i=0;i<10;i++)navButton(root,'← Предыдущий').onclick();a.equal(root.__habitDashboardMonth,'2026-01');
 navButton(root,'← Предыдущий').onclick();a.equal(root.__habitDashboardMonth,'2025-12');a.equal(navButton(root,'← Предыдущий').disabled,true);a.equal(walk(root).filter(n=>n.className?.includes('hd-day')).length,31);
 navButton(root,'Следующий →').onclick();a.equal(root.__habitDashboardMonth,'2026-01');
});
test('no habits, invalid habits, current-month starts and future-only starts disable both directions',()=>{
 const p=pages.find(p=>p.habit_type==='boolean');
 for(const data of [[],[{...p,habit_type:'invalid',start_date:'2020-01-01'}],[{...p,start_date:'2026-11-05'}],[{...p,start_date:'2027-01-01'}]]){
  const root=mount(data);a.equal(navButton(root,'← Предыдущий').disabled,true);a.equal(navButton(root,'Следующий →').disabled,true);a.equal(root.__habitDashboardMonth,'2026-11');
 }
});
test('adding or deleting the oldest habit updates lower bound and clamps remembered month',()=>{
 const recent={...pages.find(p=>p.habit_type==='boolean'),start_date:'2026-11-01'},oldest={...pages.find(p=>p.habit_type==='number'),start_date:'2026-09-15'};
 const root=mount([recent,oldest]);navButton(root,'← Предыдущий').onclick();navButton(root,'← Предыдущий').onclick();a.equal(root.__habitDashboardMonth,'2026-09');
 root.replaceChildren();mount([recent],{}, {container:root});a.equal(root.__habitDashboardMonth,'2026-11');a.equal(navButton(root,'← Предыдущий').disabled,true);
 root.replaceChildren();mount([recent,oldest],{}, {container:root});a.equal(navButton(root,'← Предыдущий').disabled,false);navButton(root,'← Предыдущий').onclick();navButton(root,'← Предыдущий').onclick();a.equal(root.__habitDashboardMonth,'2026-09');
});
test('duplicate warnings and empty journals still establish a valid earliest start',()=>{
 const p=JSON.parse(JSON.stringify(pages.find(p=>p.habit_type==='boolean')));p.start_date='2026-09-20';p.file.lists.push({...p.file.lists[0],line:99});
 const root=mount([p]);navButton(root,'← Предыдущий').onclick();navButton(root,'← Предыдущий').onclick();a.equal(root.__habitDashboardMonth,'2026-09');a.equal(navButton(root,'← Предыдущий').disabled,true);a.equal(walk(root).filter(n=>n.tag==='article').length,1);
 root.replaceChildren();mount([{...p,file:{...p.file,lists:[]}}],{}, {container:root});a.equal(root.__habitDashboardMonth,'2026-09');a.equal(navButton(root,'← Предыдущий').disabled,true);
});

test('missing indexed current note uses Dataview context path and cached date format',()=>{
 for(const note of [undefined,null,{}, {file:{}}]){
  const seen=[];const app={metadataCache:{getCache(path){seen.push(path);return {frontmatter:{date_format:'YYYY-MM-DD'}};}},workspace:{getActiveFile(){throw Error('must not use active pane');}}};
  const root=mount(pages,{}, {current:()=>note,currentFilePath:'Habit Dashboard/Дашборд.md',app});
  a.equal(walk(root).filter(n=>n.tag==='article').length,4);a.ok(walk(root).some(n=>n.tag==='dd'&&n.textContent==='2026-11-01'));a.deepEqual(seen,['Habit Dashboard/Дашборд.md']);
 }
});
test('no indexed properties or metadata cache safely uses default date format',()=>{
 const root=mount(pages,{}, {current:()=>undefined,currentFilePath:'Habit Dashboard/Дашборд.md'});
 a.equal(walk(root).filter(n=>n.tag==='article').length,4);a.ok(walk(root).some(n=>n.tag==='dd'&&n.textContent==='01:11:2026'));
});
test('unknown note context gives controlled message without querying or editing',()=>{
 const root=mount(pages,{}, {current:()=>undefined,onPages(){throw Error('wrong source query');}});
 a.equal(walk(root).filter(n=>n.tag==='article').length,0);a.ok(walk(root).some(n=>n.textContent.includes('Дождитесь индексации')));a.equal(walk(root).filter(n=>n.tag==='button').length,0);
});
test('root-level dashboard resolves relative habits and help without leading slash',()=>{
 const data=pages.map(p=>({...p,file:{...p.file,folder:'Привычки',path:'Привычки/'+p.file.name+'.md'}}));const queried=[];
 const root=mount(data,{}, {current:()=>undefined,currentFilePath:'Дашборд.md',onPages:source=>queried.push(source)});
 a.deepEqual(queried,['"Привычки"']);a.equal(walk(root).filter(n=>n.tag==='article').length,4);a.ok(walk(root).some(n=>n.attrs['data-href']==='Help.ru.md'));
});
test('modal links retain captured dashboard path when current note disappears later',async()=>{
 const h=editorHarness();h.clean.forEach(fn=>fn());h.container.replaceChildren();let ready=true;
 mount(h.data,{}, {container:h.container,current:()=>ready?{file:{folder:'Habit Dashboard',path:'Habit Dashboard/Мои привычки.md'}}:undefined,currentFilePath:'Habit Dashboard/Мои привычки.md',app:h.app,require:()=>({parseYaml:h.parseYaml}),component:{register(){}}});
 ready=false;h.cells().find(n=>n.title.startsWith('08:11:2026')).onclick();await flush();await walk(h.container.testBody).find(n=>n.tag==='a').onclick({preventDefault(){},stopPropagation(){}});
 a.deepEqual(h.opened[0],['Habit Dashboard/Привычки/Зарядка.md','Habit Dashboard/Мои привычки.md',true]);a.equal(h.writes,0);
});
test('indexed date format takes priority over fallback cached properties',()=>{
 const root=mount(pages,{date_format:'YYYY-MM-DD',file:{folder:'Habit Dashboard',path:'Habit Dashboard/Дашборд.md'}},{app:{metadataCache:{getCache:()=>({frontmatter:{date_format:'DD:MM:YYYY'}})}}});
 a.ok(walk(root).some(n=>n.tag==='dd'&&n.textContent==='2026-11-01'));
});
