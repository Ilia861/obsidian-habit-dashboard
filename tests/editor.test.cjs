const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {inspectBooleanJournal:scan,editBooleanJournal:edit}=require('./editor.cjs');
const h={start:'2026-11-01',p:{habit_id:'test',habit_type:'boolean'}},today='2026-11-11',date='2026-11-09';
// A narrow YAML adapter for these fixtures; production uses Obsidian's parseYaml.
function yaml(text){return Object.fromEntries(text.split(/\r?\n/).filter(x=>x.includes(':')).map(x=>{const i=x.indexOf(':');return [x.slice(0,i),x.slice(i+1).trim().replace(/^['"]|['"]$/g,'')];}));}
const head='---\nhabit_id: test\nhabit_type: boolean\nstart_date: 2026-11-01\n---\n';
const base=head+'\n## Журнал\n\n- [date:: 2026-11-09] [value:: true] комментарий 🙂\n';
const change=(text,value=false,snapshot=text,d=date)=>edit(text,snapshot,h,d,value,today,yaml);
test('updates only the boolean token, preserving comments and Unicode',()=>{const out=change(base);a.equal(out,base.replace('[value:: true]','[value:: false]'));a.equal(change(out,true),base);});
test('inserts missing date before next section, preserves all other text',()=>{const src=head+'\n## Журнал\n\n## Заметки\nне менять\n',out=change(src);a.ok(out.endsWith('## Заметки\nне менять\n'));a.equal(scan(out,h,date,today,yaml).rows.length,1);a.ok(out.includes('[date:: 2026-11-09] [value:: false]'));});
test('creates journal for correctly configured empty file',()=>{const out=change(head,true);a.ok(out.includes('## Журнал'));a.equal(scan(out,h,date,today,yaml).target.value,true);});
test('preserves CRLF and BOM',()=>{const src='\uFEFF'+base.replace(/\n/g,'\r\n');a.equal(change(src),src.replace('[value:: true]','[value:: false]'));const out=change(src,true,src,'2026-11-10');a.doesNotMatch(out,/(?<!\r)\n/);a.ok(out.startsWith('\uFEFF'));});
test('only editing the duplicated target date is blocked; other dates remain editable',()=>{
 a.throws(()=>change(base+'- [date:: 2026-11-09] [value:: false]\n'),/Повтор даты/);
 for(const d of ['2027-01-01','2026-10-01']){
  const src=base+`- [date:: ${d}] [value:: true]\n- [date:: ${d}] [value:: true]\n`;
  a.equal(change(src),src.replace('[value:: true]','[value:: false]'));
 }
});
test('rejects concurrent edits to target and unrelated content',()=>{for(const current of [base+'new text\n',base.replace('true','false')])a.throws(()=>change(current,false,base),/Файл изменился/);});
test('ignores complete fenced examples and HTML comments',()=>{const src=base+'\n```markdown\n- [date:: 2026-11-09] [value:: false]\n```\n<!--\n- [date:: 2026-11-09] [value:: false]\n-->\n';a.equal(scan(src,h,date,today,yaml).rows.length,1);a.ok(change(src).includes('```markdown\n- [date:: 2026-11-09] [value:: false]'));});
test('rejects unclosed fences/comments and multiple journals',()=>{for(const tail of ['\n```\n','\n<!--\n','\n## Журнал\n'])a.throws(()=>change(base+tail),/вручную/);});
test('rejects multiline, parenthesized, nested and malformed data without writing',()=>{for(const row of ['- [date:: 2026-11-09]\n  [value:: true]\n','- (date:: 2026-11-09) (value:: true)\n','    - [date:: 2026-11-09] [value:: true]\n','> - [date:: 2026-11-09] [value:: true]\n','- [date:: 2026-11-09] [value:: yes]\n','- [date:: 2026-02-30] [value:: true]\n','- `[date:: 2026-11-09] [value:: true]`\n'])a.throws(()=>change(head+row),/вручную/);});
test('preserves inline HTML comment beside value',()=>{const src=base.replace('комментарий 🙂','<!-- made manually -->');a.equal(change(src),src.replace('[value:: true]','[value:: false]'));});
test('rejects changed identity/type/start, missing or invalid YAML',()=>{for(const src of [base.replace('habit_id: test','habit_id: other'),base.replace('boolean','number'),base.replace('start_date: 2026-11-01','start_date: 2026-11-02'),'## no properties\n'])a.throws(()=>change(src));a.throws(()=>scan(base,h,date,today,()=>{throw Error('YAML');}),/YAML/);});
test('rejects future, prestart, invalid dates and nonboolean values',()=>{for(const d of ['2026-11-12','2026-10-31','09:11:2026'])a.throws(()=>change(base,true,base,d));a.throws(()=>change(base,'true'));});
test('supports numbered list, flexible spaces and false values',()=>{const src=head+'\n## Журнал\n\n1. [date :: 2026-11-09] [value :: false] текст\n';a.equal(change(src,true),src.replace('false','true'));});
test('idempotent save never adds another observation',()=>{a.equal(change(base,true),base);const once=change(head,true),twice=change(once,true);a.equal(once,twice);a.equal(scan(twice,h,date,today,yaml).rows.length,1);});
test('tested editor is exactly embedded editor',()=>{const md=fs.readFileSync(path.join(__dirname,'../dist/ru/Habit Dashboard/Дашборд.md'),'utf8');const source=md.slice(md.indexOf('// EDIT-BEGIN'),md.indexOf('// EDIT-END')+11);const tested=fs.readFileSync(path.join(__dirname,'../src/editor.js'),'utf8');a.equal(source,'// EDIT-BEGIN\n'+tested+'// EDIT-END');});
test('new calendar records are contiguous without inserted blank lines',()=>{
 const first='- [date:: 2026-11-07] [value:: true]\n';let text=head+'\n## Журнал\n\n'+first;
 for(const [d,value]of [['2026-11-08',false],['2026-11-09',true],['2026-11-10',false]])text=change(text,value,text,d);
 a.equal(text,head+'\n## Журнал\n\n'+first+'- [date:: 2026-11-08] [value:: false]\n- [date:: 2026-11-09] [value:: true]\n- [date:: 2026-11-10] [value:: false]\n');
});
test('calendar append preserves old blank lines and section separators byte-for-byte',()=>{
 const src=head+'\n## Журнал\n\n- [date:: 2026-11-07] [value:: true]\n\n- [date:: 2026-11-08] [value:: false] заметка\n\n\n## Заметки\nне менять\n';
 const out=change(src,true),added='- [date:: 2026-11-09] [value:: true]\n';
 a.equal(out.replace(added,''),src);a.ok(out.includes('[value:: false] заметка\n'+added));
});
test('calendar append stays contiguous with CRLF or missing final newline',()=>{
 for(const nl of ['\n','\r\n'])for(const final of [true,false]){
  const src=(head+'\n## Журнал\n\n- [date:: 2026-11-08] [value:: true]').replace(/\n/g,nl)+(final?nl:'');const out=change(src,false);
  a.ok(out.includes('[date:: 2026-11-08] [value:: true]'+nl+'- [date:: 2026-11-09] [value:: false]'+nl));
  if(nl==='\r\n')a.doesNotMatch(out,/(?<!\r)\n/);
 }
});
