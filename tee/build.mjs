import fs from 'node:fs';import * as esbuild from 'esbuild';
await import('./restore.mjs');
const glb=fs.readFileSync('generated/tee/tshirt.glb');const report=JSON.parse(fs.readFileSync('generated/tee/report.json','utf8'));
fs.writeFileSync('generated/tee-data.js',`export const asset=${JSON.stringify(glb.toString('base64'))};export const report=${JSON.stringify(report)};`);
const out=await esbuild.build({entryPoints:['tee/src/app.js'],bundle:true,write:false,minify:true,format:'iife',target:'es2022',legalComments:'inline'});
const fonts=[400,500,600].map(w=>`@font-face{font-family:Plex;font-weight:${w};src:url(data:font/ttf;base64,${fs.readFileSync('vendor/fonts/IBM-Plex-Sans-Arabic-'+w+'.ttf').toString('base64')}) format('truetype');font-display:swap}`).join('');
const notices=['vendor/three/LICENSE','vendor/body-model/LICENSE','vendor/fonts/OFL.txt'].map(p=>fs.readFileSync(p,'utf8')).join('\n');
const html=fs.readFileSync('tee/src/shell.html','utf8').replace('/* STYLES */',()=>fonts+fs.readFileSync('tee/src/style.css','utf8')).replace('/* APP */',()=>out.outputFiles[0].text.replaceAll('</script','<\\/script')).replace('</body>',()=>`<!-- THIRD PARTY NOTICES\n${notices.replaceAll('--','—')}\n--></body>`);
fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/maka-tee-01.html',html);console.log('Built tee study',html.length);
