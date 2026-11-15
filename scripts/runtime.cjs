const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
function createRuntime(language='ru'){
 const catalogs=Object.fromEntries(['ru','en'].map(lang=>[lang,JSON.parse(fs.readFileSync(path.join(root,'locales',lang+'.json'),'utf8'))]));
 const read=file=>fs.readFileSync(path.join(root,'src',file),'utf8');
 const code=read('i18n.js')+'\nconst {t,locale,language}=createI18n(requested,catalogs);\n'+read('core.js')+'\n'+read('editor.js')+'\nreturn {t,locale,language,monthRange,boundedMonth,journalRow,dateDiagnostic,dateFormatSetting,displayDate,dateKey,ordinal,key,localToday,normalize,state,statistics,monthDays,series,compare,inspectBooleanJournal,editBooleanJournal,inspectNumberJournal,appendNumberJournal,numberFromInput,decimalToken,inspectHabitJournal};';
 return new Function('requested','catalogs',code)(language,catalogs);
}
module.exports={createRuntime};
