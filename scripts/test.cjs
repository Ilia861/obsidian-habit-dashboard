const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const dir=path.join(__dirname,'../tests');
const files=fs.readdirSync(dir).filter(name=>name.endsWith('.test.cjs')).sort();
for(const file of files){
 const result=spawnSync(process.execPath,[path.join(dir,file)],{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status??1);
}
