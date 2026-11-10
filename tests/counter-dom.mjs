/** Fixture DOM regression tests; these do not replace the real browser checks. */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { pluginDirectory, resultsDirectory } from './paths.mjs';
const css=fs.readFileSync(path.join(pluginDirectory,'assets/admin.css'),'utf8');
const script=fs.readFileSync(path.join(pluginDirectory,'assets/counters.js'),'utf8');
const results=[];
const check=(name,pass,detail={})=>{results.push({name,pass,detail});console.log(pass?'PASS':'FAIL',name,pass?'':JSON.stringify(detail));};
const card=(id,{ad=false,available=false}={})=>`<li><div id="card-wpseo-${id}"><label>${id}<input type="checkbox"${available?' checked':''}></label>${ad?'<a class="yst-button--upsell" href="https://yoa.st/test-upgrade">Upgrade</a>':''}</div></li>`;
const feature=(id='features',count=3,rows=[card('free-one',{available:true}),card('locked',{ad:true}),card('free-two')])=>`<fieldset id="${id}" class="yst-group"><button><h2><svg data-icon="chevron"><path d="M0 0"></path></svg> Features (${count})</h2><span class="yst-sr-only">Einklappen</span></button><ul>${rows.join('')}</ul></fieldset>`;
const realRow=`<li id="real-with-ai">Real assessment <div class="yst-relative yst-inline-flex"><button data-id="testAIFixes"><span class="yst-fixes-button__lock-icon"></span></button></div></li>`;
const adRow=`<li id="word-ad"><a href="https://yoa.st/word-complexity-test">Premium word complexity</a></li>`;
const readability=(id='read',count=3,rows=[realRow,'<li id="real-two">Real second assessment</li>',adRow])=>`<section id="${id}"><h3><button id="yoast-readability-analysis-results-metabox-problems-collapsible" aria-expanded="true"><svg data-icon="chevron"><path d="M0 0"></path></svg> Problems (${count})</button></h3><ul>${rows.join('')}</ul></section>`;
const settle=async window=>{for(let i=0;i<3;i++)await new Promise(resolve=>window.setTimeout(resolve,0));};
async function env(body) {
 const errors=[];const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(`<!doctype html><html><head><style>${css}</style></head><body>${body}</body></html>`,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://local.test/wp-admin/',virtualConsole:console});
 const {window}=dom;let callbacks=0;const Native=window.MutationObserver;
 window.MutationObserver=class extends Native {constructor(callback){super((records,observer)=>{callbacks++;callback(records,observer);});}};
 window.eval(script);await settle(window);
 return {dom,window,document:window.document,errors,get callbacks(){return callbacks;},close(){dom.window.close();}};
}
function textNode(heading){return [...heading.childNodes].find(n=>n.nodeType===3&&/\(\d+\)/.test(n.data));}
function count(heading){return /\((\d+)\)/.exec(heading.textContent)?.[1];}
{
 const e=await env(`<div id="yoast-seo-settings">${feature()}</div>`),d=e.document,section=d.querySelector('fieldset'),heading=section.querySelector('h2'),svg=heading.querySelector('svg'),text=textNode(heading),input=d.querySelector('input');
 check('Actual stylesheet applies without computed-style shim',e.errors.length===0&&e.window.getComputedStyle(d.querySelector('#card-wpseo-locked').parentElement).display==='none',{errors:e.errors});
 check('Features native3 displays2',count(heading)==='2',{title:heading.textContent});
 check('Available feature remains visible and counted',e.window.getComputedStyle(input.closest('li')).display!=='none'&&input.checked&&count(heading)==='2');
 section.classList.add('native-refresh');await settle(e.window);
 check('Repeated refresh does not double-subtract',count(heading)==='2',{title:heading.textContent});
 // The provider now writes native2, which equals our previous displayed2.
 text.data=' Features (2)';section.querySelector('ul').lastElementChild.remove();await settle(e.window);
 check('Upstream2 equal to last displayed2 still becomes1',count(heading)==='1',{title:heading.textContent});
 check('SVG element and title Text node identities preserved',heading.querySelector('svg')===svg&&textNode(heading)===text);
 const list=section.querySelector('ul');section.querySelector('.yst-sr-only').textContent='Ausklappen';list.remove();await settle(e.window);
 check('Collapse/unmount retains confirmed excluded count',count(heading)==='1',{title:heading.textContent});
 section.querySelector('.yst-sr-only').textContent='Einklappen';section.append(list);await settle(e.window);
 check('Reopen restores correct observed count',count(heading)==='1');
 const before=e.callbacks;await new Promise(r=>e.window.setTimeout(r,30));
 check('No observer feedback loop while idle',e.callbacks===before,{before,after:e.callbacks});e.close();
}
{
 const e=await env(`<div id="wpseo_meta" class="yoast">${readability()}</div>`),d=e.document,section=d.querySelector('section'),button=section.querySelector('button');
 check('Readability native3 displays2',count(button)==='2');
 check('Real assessment with locked AI button still counts',e.window.getComputedStyle(d.querySelector('#real-with-ai')).display!=='none'&&count(button)==='2');
 check('Locked AI upsell control itself remains hidden',e.window.getComputedStyle(d.querySelector('#real-with-ai .yst-relative')).display==='none');
 const svg=button.querySelector('svg'),text=textNode(button);section.classList.add('refresh');await settle(e.window);
 check('Readability SVG and Text identities preserved',button.querySelector('svg')===svg&&textNode(button)===text);
 const list=section.querySelector('ul');button.setAttribute('aria-expanded','false');list.remove();await settle(e.window);
 check('Readability confirmed aria-collapse reuses observed exclusion',count(button)==='2');
 button.setAttribute('aria-expanded','true');section.append(list);await settle(e.window);
 check('Readability reopen recomputes real rows',count(button)==='2');e.close();
}
{
 const e=await env(`<div id="wpseo_meta" class="yoast">${readability('only-ad',1,[adRow])}</div>`),section=e.document.querySelector('section'),heading=section.querySelector('button');
 check('Advertisement-only panel receives owned empty marker',count(heading)==='0'&&section.getAttribute('data-rktsky-quiet-empty')==='true');
 check('Advertisement-only panel is hidden by actual stylesheet',e.window.getComputedStyle(section).display==='none');
 textNode(heading).data=' Problems (2)';section.querySelector('ul').insertAdjacentHTML('afterbegin',realRow);await settle(e.window);
 check('Real result restores previously empty panel',count(heading)==='1'&&!section.hasAttribute('data-rktsky-quiet-empty')&&e.window.getComputedStyle(section).display!=='none');e.close();
}
{
 const e=await env(`<div id="yoast-seo-settings">${feature('spa-old')}</div>`),root=e.document.querySelector('#yoast-seo-settings');
 root.innerHTML=feature('spa-new',2,[card('new-real'),card('new-ad',{ad:true})]);await settle(e.window);
 check('SPA replacement counter discovered',count(root.querySelector('h2'))==='1',{title:root.textContent});
 root.innerHTML=feature('spa-final',1,[card('final-real')]);await settle(e.window);
 check('SPA replacement with no advertisements stays native',count(root.querySelector('h2'))==='1'&&!root.querySelector('fieldset').hasAttribute('data-rktsky-quiet-empty'));e.close();
}
{
 const e=await env(`<div id="yoast-seo-settings">${feature('initially-collapsed',3,[]).replace('<ul></ul>','').replace('Einklappen','Ausklappen')}</div>`),section=e.document.querySelector('fieldset'),heading=section.querySelector('h2');
 check('Initially unknown collapsed list retains native count',count(heading)==='3');
 section.querySelector('.yst-sr-only').textContent='Einklappen';
 section.insertAdjacentHTML('beforeend',`<ul>${card('later-real')}${card('later-ad',{ad:true})}${card('later-real2')}</ul>`);await settle(e.window);
 check('Previously collapsed list corrects only after evidence',count(heading)==='2');e.close();
}
{
 const e=await env(`<div id="yoast-seo-settings">${feature('mismatch',4)}${feature('ambiguous',3).replace(' Features (3)','<span>Extra (7)</span> Features (3)')}<fieldset id="unknown" class="yst-group"><header><button><h2>Unknown (3)</h2></button></header><ul>${card('unknown-ad',{ad:true})}</ul></fieldset></div>`),d=e.document;
 check('Mismatched list/count retains native heading',count(d.querySelector('#mismatch h2'))==='4');
 check('Ambiguous numeric title is not edited',d.querySelector('#ambiguous h2').textContent.includes('Features (3)'));
 check('Unsupported heading markup is not edited',count(d.querySelector('#unknown h2'))==='3');e.close();
}
{
 const e=await env(`<div id="outside">${feature()}</div>`);
 check('No recognised root leaves counters untouched',count(e.document.querySelector('h2'))==='3'&&e.callbacks===0);e.close();
}

{
 const e=await env(`<div id="yoast-seo-settings">${feature('wrapped')}</div>`),section=e.document.querySelector('fieldset'),heading=section.querySelector('h2'),list=section.querySelector('ul');
 const wrapper=e.document.createElement('div');list.replaceWith(wrapper);wrapper.append(list);await settle(e.window);
 check('Unexpected wrapped UL in expanded settings restores native count',count(heading)==='3'&&!section.hasAttribute('data-rktsky-quiet-empty'),{title:heading.textContent});
 wrapper.replaceWith(list);await settle(e.window);
 check('Direct UL restoration supplies fresh evidence',count(heading)==='2');e.close();
}
{
 const e=await env(`<div id="yoast-seo-settings">${feature('removed-without-collapse')}</div>`),section=e.document.querySelector('fieldset'),heading=section.querySelector('h2');
 section.querySelector('ul').remove();await settle(e.window);
 check('Removed settings UL with unchanged expanded label restores native',count(heading)==='3');e.close();
}
{
 const e=await env(`<div id="yoast-seo-settings">${feature('changed-structure')}</div>`),section=e.document.querySelector('fieldset'),heading=section.querySelector('h2');
 section.querySelector('.yst-sr-only').textContent='Ausklappen';section.querySelector('ul').remove();section.insertAdjacentHTML('beforeend','<div>Unknown new structure</div>');await settle(e.window);
 check('Changed settings structure rejects cached exclusion despite label change',count(heading)==='3');e.close();
}
{
 const e=await env(`<div id="wpseo_meta" class="yoast">${readability('missing-aria-change')}</div>`),section=e.document.querySelector('section'),button=section.querySelector('button');
 section.querySelector('ul').remove();await settle(e.window);
 check('Removed readability UL without aria-false restores native',count(button)==='3');e.close();
}
{
 const markup=readability('initial-read-collapsed',3,[]).replace('aria-expanded="true"','aria-expanded="false"').replace('<ul></ul>','');
 const e=await env(`<div id="wpseo_meta" class="yoast">${markup}</div>`),section=e.document.querySelector('section'),button=section.querySelector('button');
 check('Initially collapsed readability with no evidence stays native',count(button)==='3');
 button.setAttribute('aria-expanded','true');section.insertAdjacentHTML('beforeend',`<ul>${realRow}<li>Second real</li>${adRow}</ul>`);await settle(e.window);
 check('Initially collapsed readability corrects upon first observed open',count(button)==='2');e.close();
}

{
 const e=await env(`<div id="wpseo_meta" class="yoast">${readability('aria-only-state')}</div>`),section=e.document.querySelector('section'),button=section.querySelector('button');
 button.setAttribute('aria-expanded','false');section.querySelector('ul').remove();await settle(e.window);
 button.setAttribute('aria-expanded','true');await settle(e.window);
 check('Aria-only expansion without direct UL restores native count',count(button)==='3',{title:button.textContent});e.close();
}

{
 const e=await env(`<div id="yoast-seo-settings">${feature('label-text-state')}</div>`),section=e.document.querySelector('fieldset'),heading=section.querySelector('h2'),label=section.querySelector('.yst-sr-only');
 label.textContent='Ausklappen';section.querySelector('ul').remove();await settle(e.window);
 label.firstChild.data='Einklappen';await settle(e.window);
 check('Label Text-only expansion without direct UL restores native count',count(heading)==='3',{title:heading.textContent});e.close();
}
fs.writeFileSync(path.join(resultsDirectory,'counter-dom-results.json'),JSON.stringify({environment:'jsdom fixture DOM; real plugin CSS + JS, no getComputedStyle shim; not a browser/React integration test',results:results.map(({name,pass})=>({name,pass}))},null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
