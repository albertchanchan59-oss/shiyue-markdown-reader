import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const names=['react','react-dom','scheduler','marked','dompurify','highlight.js','lucide-react','electron'];
const sections=[];
for(const name of names){const root=join('node_modules',name);const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));let license='';for(const file of ['LICENSE','LICENSE.txt','LICENSE.md','license.txt','LICENSE-MIT']){try{license=await readFile(join(root,file),'utf8');break}catch{}}
 if(!license)throw new Error(`Missing third-party license: ${name}`);
 sections.push(`${name} ${pkg.version}\n${'='.repeat(60)}\n${license}`);
}
await writeFile(process.argv[2],sections.join('\n\n'),'utf8');
