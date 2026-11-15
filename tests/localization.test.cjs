const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRuntime}=require('../scripts/runtime.cjs'),{validate}=require('../scripts/validate-locales.cjs');
const catalogs=validate();
const createI18n=new Function(fs.readFileSync(path.join(__dirname,'../src/i18n.js'),'utf8')+'\nreturn createI18n;')();
const parseYaml=text=>Object.fromEntries(text.split(/\r?\n/).filter(x=>x.includes(':')).map(x=>{const i=x.indexOf(':');return [x.slice(0,i),x.slice(i+1).trim()];}));
const h={start:'2026-11-01',p:{habit_id:'test',habit_type:'boolean'}},today='2026-11-11',date='2026-11-09';
const head='---\nhabit_id: test\nhabit_type: boolean\nstart_date: 2026-11-01\n---\n';
test('both catalogs contain matching keys and placeholders',()=>{a.ok(Object.keys(catalogs.ru).length>=100);a.deepEqual(Object.keys(catalogs.ru).sort(),Object.keys(catalogs.en).sort());});
test('language defaults and unsupported settings are deterministic and safe',()=>{
 a.equal(createI18n(undefined,catalogs,'en').language,'en');a.equal(createI18n(' RU ',catalogs,'en').language,'ru');
 for(const value of ['de',[],{},12]){const result=createI18n(value,catalogs,'en');a.equal(result.language,'en');a.match(result.warning,/Unsupported language/);}
 a.equal(createI18n('en',catalogs).locale,'en-US');a.equal(createI18n('ru',catalogs).locale,'ru-RU');
});
test('translations interpolate values and preserve weekday arrays',()=>{
 const {t}=createI18n('en',catalogs);a.equal(t('lineLabel',{line:12}),'Line 12');a.equal(t('weekdays')[0],'Mon');a.throws(()=>t('not-a-key'),/Missing translation/);
});
test('statistics are identical in both languages including OR and numeric duplicates',()=>{
 const pages=[{habit_id:'a',habit_name:'Русское название',habit_type:'boolean',start_date:'2026-11-01',order:1,file:{lists:[{date:'2026-11-09',value:false},{date:'2026-11-09',value:true}]}},{habit_id:'b',habit_name:'Numbers',habit_type:'number',unit:'страниц',start_date:'2026-11-01',order:2,file:{lists:[{date:'2026-11-09',value:5},{date:'2026-11-09',value:20},{date:'2026-11-10',value:0}]}}];
 const ru=createRuntime('ru'),en=createRuntime('en');
 for(const p of pages){const r=ru.normalize(p,today),e=en.normalize(p,today);a.deepEqual([...r.values],[...e.values]);a.deepEqual(ru.statistics(r,today,'2026-11'),en.statistics(e,today,'2026-11'));a.deepEqual(ru.series(r,today,'2026-11','daily'),en.series(e,today,'2026-11','daily'));}
});
test('both languages edit both journal headings without renaming or rewriting content',()=>{
 for(const language of ['ru','en'])for(const heading of ['Журнал','Journal']){
  const runtime=createRuntime(language),source=head+'\n## '+heading+'\n\n- [date:: 2026-11-09] [value:: true] заметка 🙂\n';
  const out=runtime.editBooleanJournal(source,source,h,date,false,today,parseYaml);a.equal(out,source.replace('[value:: true]','[value:: false]'));
 }
});
test('new journal heading follows UI language but stored dates and booleans do not',()=>{
 for(const [language,heading]of [['ru','Журнал'],['en','Journal']]){const runtime=createRuntime(language);const out=runtime.editBooleanJournal(head,head,h,date,true,today,parseYaml);a.ok(out.includes('## '+heading));a.ok(out.includes('[date:: 2026-11-09] [value:: true]'));}
});
test('duplicate error classification is independent of translated text',()=>{
 for(const language of ['ru','en']){const runtime=createRuntime(language);const source=head+'\n## Journal\n\n- [date:: 2026-11-09] [value:: false]\n- [date:: 2026-11-09] [value:: true]\n';a.throws(()=>runtime.editBooleanJournal(source,source,h,date,false,today,parseYaml),error=>error.code==='DUPLICATE_DATE'&&error.message.startsWith(runtime.t('duplicatePrefix')));}
});
test('English diagnostics have no embedded Russian strings',()=>{
 const runtime=createRuntime('en'),bad=runtime.normalize({file:{lists:[]}},today);a.ok(bad.errors.length>0);a.doesNotMatch(bad.errors.join(' '),/[А-Яа-яЁё]/);
 a.throws(()=>runtime.inspectBooleanJournal('bad',h,date,today,parseYaml),/YAML properties/);
});
test('date_format remains independent of language',()=>{for(const language of ['ru','en']){const runtime=createRuntime(language);a.equal(runtime.displayDate(date,runtime.dateFormatSetting('DD:MM:YYYY').format),'09:11:2026');a.equal(runtime.displayDate(date,'YYYY-MM-DD'),date);}});
test('locale validation rejects missing keys, mismatched placeholders, wrong arrays and untranslated English',()=>{
 const clone=()=>JSON.parse(JSON.stringify(catalogs));
 const missing=clone();delete missing.en.cancel;a.throws(()=>validate(missing),/keys differ/);
 const placeholder=clone();placeholder.en.lineLabel='Line {wrong}';a.throws(()=>validate(placeholder),/placeholders/);
 const array=clone();array.en.weekdays=['Mon'];a.throws(()=>validate(array),/array/);
 const untranslated=clone();untranslated.en.cancel='Отмена';a.throws(()=>validate(untranslated),/Russian text/);
});
