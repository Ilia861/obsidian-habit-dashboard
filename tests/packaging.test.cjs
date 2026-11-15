const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {build}=require('../scripts/build.cjs'),{crc32}=require('../scripts/zip.cjs');
const root=path.join(__dirname,'..'),version=require('../package.json').version;
const read=p=>fs.readFileSync(path.join(root,p));
function entries(language){const b=read('dist/habit-dashboard-v'+version+'.zip'),out=new Map();let i=0;while(b.readUInt32LE(i)===0x04034b50){const size=b.readUInt32LE(i+18),names=b.readUInt16LE(i+26),extra=b.readUInt16LE(i+28),name=b.subarray(i+30,i+30+names).toString(),start=i+30+names+extra,raw=zlib.inflateRawSync(b.subarray(start,start+size));a.equal(crc32(raw),b.readUInt32LE(i+14));out.set(name,raw);i=start+size;}a.equal(b.readUInt32LE(i),0x02014b50);a.equal(b.readUInt32LE(b.length-22),0x06054b50);return out;}
test('ZIP CRC matches the standard reference vector',()=>{a.equal(crc32(Buffer.from('123456789')),0xcbf43926);});
test('single English-default ZIP contains both Help languages, switching instructions and 4 demos',()=>{
 for(const language of ['en']){
  const files=entries(language);a.equal(files.size,11);a.ok(files.has('.obsidian/snippets/habit-dashboard.css'));a.ok(files.has('Habit Dashboard/Help.ru.md'));a.ok(files.has('Habit Dashboard/Help.en.md'));
  a.match(files.get('Habit Dashboard/Dashboard.md').toString(),/^---\nlanguage: en\n/);
  a.match(files.get('Habit Dashboard/Help.en.md').toString(),/^# Help[^\n]+\n\n## Change language\n\n[^\n]+language: ru/);
  a.match(files.get('Habit Dashboard/Help.ru.md').toString(),/^# Помощь[^\n]+\n\n## Смена языка\n\n[^\n]+language: en/);
  for(const lang of ['ru','en']){const help=files.get('Habit Dashboard/Help.'+lang+'.md').toString();a.match(help,/habit_name/);a.match(help,/habit_id/);a.match(help,/Чтение.md/);}
  a.equal(files.has('Habit Dashboard/Help.md'),false);
  a.deepEqual([...files.keys()].filter(p=>/^Habit Dashboard\/Help.*\.md$/.test(p)).sort(),['Habit Dashboard/Help.en.md','Habit Dashboard/Help.ru.md']);
  const habits=[...files].filter(([p])=>p.includes('/'+(language==='ru'?'Привычки':'Habits')+'/'));a.equal(habits.length,4);a.equal(habits.filter(([,b])=>b.toString().includes('habit_type: boolean')).length,3);
  for(const [filename,data]of files){a.equal(filename.startsWith('/'),false);a.equal(filename.split('/').includes('..'),false);a.deepEqual(data,read('dist/'+language+'/'+filename));if(filename.endsWith('.md'))a.doesNotMatch(data.toString(),/\{\{\w+\}\}/);}
 }
});
test('release and legacy Russian fixture embed the same logic and catalogs',()=>{
 const ru=read('dist/ru/Habit Dashboard/Дашборд.md').toString().split('```dataviewjs\n')[1].split('\n```')[0],en=read('dist/en/Habit Dashboard/Dashboard.md').toString().split('```dataviewjs\n')[1].split('\n```')[0];
 a.equal(ru.split('\n').slice(1).join('\n'),en.split('\n').slice(1).join('\n'));a.equal(JSON.parse(read('dist/ru/BUILD.json')).sharedSourceSha256,JSON.parse(read('dist/en/BUILD.json')).sharedSourceSha256);
});
test('demo journal data is language-independent and existing Russian demo data is unchanged',()=>{
 const canonical=JSON.parse(read('examples/habits.json'));
 for(const language of ['ru','en'])for(const h of canonical){const folder=language==='ru'?'Привычки':'Habits',text=read('dist/'+language+'/Habit Dashboard/'+folder+'/'+h.names[language]+'.md').toString();a.ok(text.includes('habit_id: '+h.habit_id));const rows=[...text.matchAll(/^- \[date:: ([^\]]+)\] \[value:: ([^\]]+)\]$/gm)].map(m=>({date:m[1],value:m[2]==='true'?true:m[2]==='false'?false:Number(m[2])}));a.deepEqual(rows,h.records);}
});
test('build produces exactly one deterministic install ZIP and matching checksum',()=>{
 const filename='dist/habit-dashboard-v'+version+'.zip',before=read(filename);build();a.deepEqual(read(filename),before);
 a.deepEqual(fs.readdirSync(path.join(root,'dist')).filter(f=>f.endsWith('.zip')),['habit-dashboard-v'+version+'.zip']);
 for(const line of read('dist/SHA256SUMS.txt').toString().trim().split('\n')){const [sha,file]=line.split('  ');a.equal(crypto.createHash('sha256').update(read('dist/'+file)).digest('hex'),sha);}
});
