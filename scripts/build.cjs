const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {validate}=require('./validate-locales.cjs'),{zip}=require('./zip.cjs');
const root=path.join(__dirname,'..'),pkg=require('../package.json');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function templates(text,vars){return text.replace(/\{\{(\w+)\}\}/g,(_,key)=>{if(!Object.hasOwn(vars,key))throw Error('Unknown template variable: '+key);return vars[key];});}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
function build({testFixtures=false}={}){
 const catalogs=validate(),sources=Object.fromEntries(['i18n','core','editor','view'].map(name=>[name,read('src/'+name+'.js')]));
 const habitData=JSON.parse(read('examples/habits.json')),checksums=[];
 // Remove only our generated release archives so previous bilingual builds cannot leak into a release.
 const dist=path.join(root,'dist');fs.mkdirSync(dist,{recursive:true});
 for(const name of fs.readdirSync(dist))if(/^habit-dashboard-v[0-9][A-Za-z0-9.+-]*\.zip$/.test(name))fs.unlinkSync(path.join(dist,name));
 // Russian defaults are generated only as a legacy compatibility test fixture.
 for(const language of (testFixtures?['ru','en']:['en'])){
  const defaults={language,habitsFolder:language==='ru'?'Привычки':'Habits',dashboardName:language==='ru'?'Дашборд.md':'Dashboard.md'};
  const dest=path.join(root,'dist',language);fs.mkdirSync(dest,{recursive:true});
  const folder='Habit Dashboard';
  const vars={version:pkg.version,language,habitsFolder:defaults.habitsFolder,dashboardName:defaults.dashboardName,folder};
  const code='const PACKAGE_DEFAULTS='+JSON.stringify(defaults)+';\nconst CATALOGS='+JSON.stringify(catalogs)+';\n'+sources.i18n+'\n// ENGINE-BEGIN\n'+sources.core+'// ENGINE-END\n\n// EDIT-BEGIN\n'+sources.editor+'// EDIT-END\n\n'+sources.view;
  const note='---\nlanguage: '+language+'\ndate_format: "'+(language==='ru'?'DD:MM:YYYY':'YYYY-MM-DD')+'"\nhabits_folder: "'+defaults.habitsFolder+'"\ncssclasses:\n  - habit-dashboard-page\n---\n\n# Habit Dashboard\n\n```dataviewjs\n'+code+'\n```\n';
  const files=new Map([[folder+'/'+defaults.dashboardName,note],['.obsidian/snippets/habit-dashboard.css',read('src/styles.css')]]);
  for(const lang of ['ru','en'])files.set(folder+'/Help.'+lang+'.md',templates(read('docs/'+lang+'/Help.md'),vars));
  files.set('README.md',templates(read('docs/'+language+'/INSTALL.md'),vars));
  files.set('TESTING.md',templates(read('docs/'+language+'/TESTING.md'),vars));
  for(const habit of habitData){
   const meta='---\nhabit_id: '+habit.habit_id+'\nhabit_name: '+JSON.stringify(habit.names[language])+'\nhabit_type: '+habit.habit_type+'\nstart_date: '+habit.start_date+'\norder: '+habit.order+'\n'+(habit.habit_type==='number'?'unit: '+JSON.stringify(habit.units[language])+'\n':'')+'---\n\n## '+catalogs[language].journalHeading+'\n\n';
   const records=habit.records.map(r=>'- [date:: '+r.date+'] [value:: '+String(r.value)+']').join('\n')+'\n';
   files.set(folder+'/'+defaults.habitsFolder+'/'+habit.names[language]+'.md',meta+records);
  }
  const manifest={version:pkg.version,language,sharedSourceSha256:crypto.createHash('sha256').update(Object.values(sources).join('\n')).digest('hex')};
  files.set('BUILD.json',JSON.stringify(manifest,null,2)+'\n');
  // Remove stale generated files only inside this package's own dist subdirectory.
  for(const file of walk(dest))if(!files.has(path.relative(dest,file).split(path.sep).join('/')))fs.unlinkSync(file);
  for(const [file,content]of files){const target=path.join(dest,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);}
  if(language!=='en')continue;
  const filename='habit-dashboard-v'+pkg.version+'.zip';const archive=zip([...files].sort(([a],[b])=>a.localeCompare(b,'en')));
  fs.mkdirSync(path.join(root,'dist'),{recursive:true});fs.writeFileSync(path.join(root,'dist',filename),archive);
  checksums.push(crypto.createHash('sha256').update(archive).digest('hex')+'  '+filename);
  console.log(filename+': '+files.size+' files');
 }
 fs.writeFileSync(path.join(root,'dist','SHA256SUMS.txt'),checksums.join('\n')+'\n');
 fs.writeFileSync(path.join(root,'dist','RELEASE.md'),templates(read('docs/en/RELEASE.md'),{version:pkg.version}));
}
module.exports={build,templates};if(require.main===module)build({testFixtures:process.argv.includes('--test-fixtures')});
