const {test}=require('node:test'),a=require('node:assert/strict');
const {inspectNumberJournal:scan,appendNumberJournal:append,numberFromInput:parse,decimalToken}=require('./editor.cjs');
const h={start:'2026-11-01',p:{habit_id:'read',habit_type:'number',unit:'страниц'}},today='2026-11-11',date='2026-11-09';
const yaml=text=>Object.fromEntries(text.split(/\r?\n/).filter(x=>x.includes(':')).map(x=>{const i=x.indexOf(':');return [x.slice(0,i),x.slice(i+1).trim()];}));
const head='---\nhabit_id: read\nhabit_type: number\nunit: страниц\nstart_date: 2026-11-01\n---\n';
const base=head+'\n## Журнал\n';const add=(src,value=5,d=date,snapshot=src)=>append(src,snapshot,h,d,value,today,yaml);
test('three explicit additions create three records, summing 5 + 5 + 20',()=>{let text=base;for(const v of [5,5,20])text=add(text,v);const rows=scan(text,h,date,today,yaml).rows;a.deepEqual(rows.map(r=>r.value),[5,5,20]);a.equal(rows.reduce((sum,r)=>sum+r.value,0),30);});
test('existing duplicate lines and comments remain byte-for-byte intact',()=>{const src=base+'\n- [date:: 2026-11-09] [value:: 15] утром 🙂\n- [date:: 2026-11-09] [value:: 20] вечером\n';const out=add(src,7);a.ok(out.startsWith(src));a.equal(scan(out,h,date,today,yaml).rows.length,3);a.equal(scan(out,h,date,today,yaml).rows.reduce((s,r)=>s+r.value,0),42);});
test('zero and fractions are separate numeric observations',()=>{const text=add(add(base,0),2.5);a.deepEqual(scan(text,h,date,today,yaml).rows.map(r=>r.value),[0,2.5]);});
test('input accepts decimal point and comma without implicit empty zero',()=>{for(const [raw,n]of [['5',5],['2,5',2.5],['.5',0.5],[',5',0.5],['0',0],[' 12.25 ',12.25]])a.equal(parse(raw),n);for(const raw of ['', ' ', '-1','NaN','Infinity','1,2,3','1.2.3','1e3','1 000','0.'+'0'.repeat(400)+'1'])a.throws(()=>parse(raw));});
test('decimal serialization never writes scientific notation',()=>{for(const v of [1e-7,1e21,1.234e25,Number.MAX_VALUE,Number.MIN_VALUE]){const token=decimalToken(v);a.doesNotMatch(token,/[eE]/);a.equal(Number(token),v);a.equal(scan(add(base,v),h,date,today,yaml).rows[0].value,v);}});
test('future, pre-start and invalid dates are rejected',()=>{for(const d of ['2026-11-12','2026-10-31','09:11:2026','2026-02-30'])a.throws(()=>add(base,5,d));});
test('nonfinite, negative and nonnumeric additions cannot be persisted',()=>{for(const n of [Infinity,NaN,-1,'5',null,true])a.throws(()=>add(base,n));});
test('concurrent change and changed unit or type block append',()=>{a.throws(()=>add(base+'changed\n',5,date,base),/Файл изменился/);a.throws(()=>add(base.replace('страниц','книг')),/Единица/);a.throws(()=>add(base.replace('number','boolean')),/Настройки/);});
test('invalid existing numeric data is not silently rewritten',()=>{for(const value of ['-1','true','NaN','Infinity','"5"','2,5'])a.throws(()=>add(base+`\n- [date:: 2026-11-09] [value:: ${value}]\n`));});
test('overflow of day or all-time sum is rejected',()=>{a.throws(()=>add(base+'\n- [date:: 2026-11-09] [value:: 1e308]\n',1e308),/Сумма/);a.throws(()=>add(base+'\n- [date:: 2026-11-08] [value:: 1e308]\n',1e308),/Сумма/);});
test('CRLF, fenced examples and following sections are preserved',()=>{const src=(base+'\n```markdown\n- [date:: 2026-11-09] [value:: -1]\n```\n\n## Заметки\nне менять\n').replace(/\n/g,'\r\n');const out=add(src);a.ok(out.endsWith('## Заметки\r\nне менять\r\n'));a.doesNotMatch(out,/(?<!\r)\n/);a.equal(scan(out,h,date,today,yaml).rows.length,1);});
test('missing journal is created; repeated equal additions remain separate',()=>{const out=add(add(head,5),5);a.equal((out.match(/## Журнал/g)||[]).length,1);a.equal(scan(out,h,date,today,yaml).rows.length,2);});
test('successive numeric contributions use one line each without blank rows',()=>{
 let text=base;for(const v of [5,5,20])text=add(text,v);
 a.ok(text.endsWith('- [date:: 2026-11-09] [value:: 5]\n- [date:: 2026-11-09] [value:: 5]\n- [date:: 2026-11-09] [value:: 20]\n'));
});
test('numeric append preserves old spacing and notes while adjoining the last record',()=>{
 const src=base+'\n- [date:: 2026-11-09] [value:: 5] утро\n\n- [date:: 2026-11-09] [value:: 5] день\n \n\n## Заметки\nистория\n';
 const out=add(src,20),row='- [date:: 2026-11-09] [value:: 20]\n';
 a.equal(out.replace(row,''),src);a.ok(out.includes('[value:: 5] день\n'+row));
});
test('numeric append preserves CRLF and adds only the needed final line break',()=>{
 for(const nl of ['\n','\r\n'])for(const final of [true,false]){
  const src=(base+'\n- [date:: 2026-11-09] [value:: 5]').replace(/\n/g,nl)+(final?nl:'');const out=add(src,5);
  a.ok(out.endsWith('[value:: 5]'+nl+'- [date:: 2026-11-09] [value:: 5]'+nl));
  if(nl==='\r\n')a.doesNotMatch(out,/(?<!\r)\n/);
 }
});
