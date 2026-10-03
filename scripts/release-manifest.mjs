import {stat,writeFile,readFile} from 'node:fs/promises';
import {dirname,basename,join} from 'node:path';
import {createHash} from 'node:crypto';
const [dmg,identity,notarized]=process.argv.slice(2);
const file=await readFile(dmg);
const {version}=JSON.parse(await readFile('package.json','utf8'));
await writeFile(join(dirname(dmg),'release-manifest.json'),JSON.stringify({
 application:'拾页',version,artifact:basename(dmg),bytes:(await stat(dmg)).size,
 sha256:createHash('sha256').update(file).digest('hex'),architectures:['arm64','x86_64'],minimumMacOS:'13.0',
 signing:identity==='-'?'ad-hoc':'Developer ID',notarized:notarized==='true',
 distributionStatus:identity==='-'||notarized!=='true'?'preview-requires-developer-id-and-notarization':'notarized',
 builtAt:new Date().toISOString()
},null,2)+'\n');
