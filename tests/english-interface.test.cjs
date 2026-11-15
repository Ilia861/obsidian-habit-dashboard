const {test}=require('node:test'),a=require('node:assert/strict');
const {walk,loadPages,mount,editorHarness,numericHarness,flush,assertQuietSave}=require('./helpers.cjs');
const button=(root,label)=>walk(root).find(n=>n.tag==='button'&&n.textContent===label);
test('English package renders full English UI, weekdays, help and examples',()=>{
 const root=mount(loadPages('en'),{}, {packageLanguage:'en'}),nodes=walk(root);a.equal(nodes.filter(n=>n.tag==='article').length,4);a.ok(nodes.some(n=>n.textContent==='My habits'));a.ok(nodes.some(n=>n.textContent==='Mon'));a.ok(nodes.some(n=>n.attrs['data-href']==='Habit Dashboard/Help.en.md'));a.doesNotMatch(nodes.map(n=>n.textContent).join('\n'),/[А-Яа-яЁё]/);
});
test('English calendar and numeric dialogs save and cancel correctly',async()=>{
 const h=editorHarness('2026-11-01','exercise','en');h.cells().find(n=>n.title.startsWith('08:11:2026')).onclick();await flush();a.ok(h.action('Done'));h.action('Cancel').onclick();a.equal(h.writes,0);
 h.cells().find(n=>n.title.startsWith('08:11:2026')).onclick();await flush();await h.action('Not done').onclick();a.equal(h.writes,1);a.ok(h.text.includes('[date:: 2026-11-08] [value:: false]'));assertQuietSave(h.container);
 const n=numericHarness('en');n.open();await flush();n.fill('2,5');await n.action('Add').onclick();a.equal(n.writes,1);a.ok(n.text.includes('[date:: 2026-11-09] [value:: 2.5]'));a.ok(n.text.includes('## Journal'));assertQuietSave(n.container);
});
test('English duplicate warnings keep calendar visible and duplicate dialog read-only',async()=>{
 const h=editorHarness('2026-11-01','exercise','en');h.text+='\n- [date:: 2026-11-08] [value:: false]\n';h.cells().find(n=>n.title.startsWith('05:11:2026')).onclick();await flush();await h.action('Done').onclick();a.equal(h.writes,1);a.ok(walk(h.container).some(n=>n.textContent.startsWith('Duplicate date')));a.equal(h.cells().length,90);
 h.cells().find(n=>n.title.startsWith('08:11:2026')).onclick();await flush();a.equal(h.action('Done').disabled,true);a.ok(walk(h.container.testBody).some(n=>n.attrs.role==='alert'&&n.textContent.startsWith('Duplicate date')));
});
test('language switch on Russian package keeps the Russian data folder and user names',()=>{
 const queried=[],root=mount(loadPages('ru'),{language:'en',date_format:'YYYY-MM-DD',habits_folder:'Привычки'}, {onPages:source=>queried.push(source)});
 a.deepEqual(queried,['"Habit Dashboard/Привычки"']);a.equal(walk(root).filter(n=>n.tag==='article').length,4);a.ok(walk(root).some(n=>n.textContent==='My habits'));a.ok(walk(root).some(n=>n.textContent==='Зарядка'));a.ok(walk(root).some(n=>n.tag==='dd'&&n.textContent==='2026-11-01'));
});
test('switching English installation to Russian keeps Habits folder',()=>{
 const queried=[],root=mount(loadPages('en'),{language:'ru',habits_folder:'Habits'},{packageLanguage:'en',onPages:source=>queried.push(source)});a.deepEqual(queried,['"Habit Dashboard/Habits"']);a.equal(walk(root).filter(n=>n.tag==='article').length,4);a.ok(walk(root).some(n=>n.textContent==='Мои привычки'));a.ok(walk(root).some(n=>n.textContent==='Exercise'));
});
test('English fallback loads when current note is not indexed and caches settings',()=>{
 const root=mount(loadPages('en'),{}, {packageLanguage:'en',current:()=>undefined,currentFilePath:'Habit Dashboard/Dashboard.md',app:{metadataCache:{getCache:()=>({frontmatter:{language:'en',habits_folder:'Habits',date_format:'YYYY-MM-DD'}})}}});a.equal(walk(root).filter(n=>n.tag==='article').length,4);a.ok(walk(root).some(n=>n.tag==='dd'&&n.textContent==='2026-11-01'));
});
test('unknown language has translated fallback and invalid folder does not query',()=>{
 let queries=0;const root=mount(loadPages('en'),{language:'unknown',habits_folder:'../elsewhere'},{packageLanguage:'en',onPages(){queries++;}});a.equal(queries,0);a.ok(walk(root).some(n=>n.textContent.startsWith('Unsupported language')));a.ok(walk(root).some(n=>n.textContent.startsWith('habits_folder:')));a.equal(walk(root).filter(n=>n.tag==='article').length,0);
});
test('English month boundaries, graph mode labels and inert graph are preserved',()=>{
 const root=mount(loadPages('en'),{}, {packageLanguage:'en'});a.equal(button(root,'Next →').disabled,true);button(root,'← Previous').onclick();a.equal(root.__habitDashboardMonth,'2026-10');a.equal(button(root,'← Previous').disabled,true);
 const nodes=walk(root);a.ok(nodes.some(n=>n.tag==='option'&&n.textContent==='7-day average'));a.ok(nodes.filter(n=>n.tag==='svg'||n.tag==='circle'||n.tag==='path').every(n=>n.onclick===undefined));a.equal(nodes.find(n=>n.tag==='svg').attrs.height,'190');
});
test('English numeric window on Russian history appends without translating the file',async()=>{
 const h=numericHarness('ru',{language:'en',habits_folder:'Привычки'});const before=h.text;h.open();await flush();h.fill(5);await h.action('Add').onclick();a.equal(h.writes,1);a.ok(h.text.startsWith(before));a.ok(h.text.includes('## Журнал'));a.equal(h.text.includes('## Journal'),false);assertQuietSave(h.container);
});
