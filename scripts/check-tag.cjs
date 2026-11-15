const {version}=require('../package.json');
if(process.env.GITHUB_REF_NAME!=='v'+version)throw Error('Tag must match package.json: v'+version);
console.log('Release tag matches version '+version);
