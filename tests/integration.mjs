import fs from 'node:fs';
import path from 'node:path';
import { bootTestWordPress } from './runtime.mjs';
import { pluginDirectory, resultsDirectory, testsRoot } from './paths.mjs';
const fixtureDir=path.join(resultsDirectory,'fixtures');
fs.mkdirSync(fixtureDir,{recursive:true});
const {handler,php}=await bootTestWordPress({pluginDirectory,extraMounts:[['/test-fixtures',fixtureDir]]});
if(!php.isDir('/wordpress/wp-content/mu-plugins'))php.mkdir('/wordpress/wp-content/mu-plugins');
php.writeFile('/wordpress/wp-content/mu-plugins/quiet-yoast-probe.php',fs.readFileSync(path.join(testsRoot,'fixtures/quiet-yoast-probe.php')));
const run=async code=>{
 const r=await php.run({code:'<?php '+code});
 if(r.errors)console.error('PHP stderr:',r.errors);
 if(r.exitCode)throw new Error(r.text+' '+r.errors);
 return r;
};
const results=[];
const check=(name,pass,detail)=>{results.push({name,pass,detail});if(!pass)console.error('FAIL',name,detail);else console.log('PASS',name);};
try {
 const activate=await run(`require '/wordpress/wp-load.php'; require_once ABSPATH.'wp-admin/includes/plugin.php'; $e=activate_plugin('wordpress-seo/wp-seo.php'); echo json_encode(['wp'=>$GLOBALS['wp_version'],'php'=>PHP_VERSION,'yoast'=>WPSEO_VERSION,'error'=>is_wp_error($e)?$e->get_error_message():$e]);`);
 const versions=JSON.parse(activate.text);check('Native Yoast activation',versions.error===null,versions);
 const header=JSON.parse((await run(`require '/wordpress/wp-load.php'; require_once ABSPATH.'wp-admin/includes/plugin.php'; $d=get_plugin_data(WP_PLUGIN_DIR.'/rktsky-quiet-yoast/rktsky-quiet-yoast.php'); echo json_encode($d);`)).text);
 check('WordPress recognises dependency header',header.RequiresPlugins==='wordpress-seo',header);
 const baseline=await handler.request({url:'/'});
 const baselineProbe=JSON.parse(fs.readFileSync(path.join(fixtureDir,'probe.json')));
 const auth=await run(`require '/wordpress/wp-load.php'; wp_set_current_user(1); wp_set_auth_cookie(1); echo 'ok';`);
 const cookies=(auth.headers['set-cookie']||[]).map(c=>c.split(';')[0]).join('; ');
 check('Native WordPress auth cookie generated',cookies.includes('wordpress_logged_in_'),{cookieCount:(auth.headers['set-cookie']||[]).length});
 let baselineAdmin=await handler.request({url:'/wp-admin/index.php',headers:{cookie:cookies}});
 if(baselineAdmin.httpStatusCode===302)baselineAdmin=await handler.request({url:'/wp-admin/index.php',headers:{cookie:cookies}});
 const baselineAdminProbe=JSON.parse(fs.readFileSync(path.join(fixtureDir,'probe.json')));
 const activateOwn=await run(`require '/wordpress/wp-load.php'; require_once ABSPATH.'wp-admin/includes/plugin.php'; $e=activate_plugin('rktsky-quiet-yoast/rktsky-quiet-yoast.php'); echo json_encode(['error'=>is_wp_error($e)?$e->get_error_message():$e,'active'=>is_plugin_active('rktsky-quiet-yoast/rktsky-quiet-yoast.php')]);`);
 const a=JSON.parse(activateOwn.text);check('Native Quiet Yoast activation',a.error===null&&a.active,a);
 const front=await handler.request({url:'/'});
 const frontProbe=JSON.parse(fs.readFileSync(path.join(fixtureDir,'probe.json')));
 const seoPart=s=>s.match(/<!-- This site is optimized[^]*?<!-- \/ Yoast SEO plugin\. -->/)?.[0]||s.match(/<!-- This site is optimized[^]*?<!-- \/Yoast SEO plugin\. -->/)?.[0];
 check('Anonymous frontend byte-identical',front.text===baseline.text,{baselineLength:baseline.text.length,activeLength:front.text.length});
 check('No frontend assets',frontProbe.frontend_styles?.length===0&&frontProbe.frontend_scripts?.length===0,frontProbe);
 check('Only expected admin and update hooks registered',frontProbe.owned_hooks.every(([h])=>['plugins_loaded','wp_loaded','wpseo_submenu_pages','admin_enqueue_scripts','admin_menu','network_admin_menu','admin_bar_menu','plugin_action_links_wordpress-seo/wp-seo.php','network_admin_plugin_action_links_wordpress-seo/wp-seo.php','update_plugins_github.com','plugins_api'].includes(h)),frontProbe.owned_hooks);
 const admin=await handler.request({url:'/wp-admin/index.php',headers:{cookie:cookies}});
 const probe=JSON.parse(fs.readFileSync(path.join(fixtureDir,'probe.json')));
 check('Authenticated native admin page responds',admin.httpStatusCode===200&&admin.text.includes('wpbody-content'),{status:admin.httpStatusCode,errors:admin.errors});
 const removed=['wpseo_workouts','wpseo_redirects','wpseo_upgrade_sidebar','wpseo_brand_insights'];
 check('Advertised menu entries registered by real Yoast',removed.every(s=>baselineAdminProbe.menus_after?.includes(s)),baselineAdminProbe.menus_after);
 check('Advertising menu entries removed',removed.every(s=>!probe.menus_after?.includes(s)),probe.menus_after);
 check('Tools redirects ad existed in baseline and was removed',baselineAdminProbe.all_submenus.includes('wpseo_redirects_tools')&&!probe.all_submenus.includes('wpseo_redirects_tools'),{before:baselineAdminProbe.all_submenus,after:probe.all_submenus});
 const expectedKept=['wpseo_dashboard','wpseo_page_settings','wpseo_tools','wpseo_licenses','wpseo_support','wpseo_page_academy'];
 check('All unrelated registered menu entries preserved',baselineAdminProbe.menus_after?.filter(s=>!removed.includes(s)).every(s=>probe.menus_after.includes(s)),{before:baselineAdminProbe.menus_after,after:probe.menus_after});
 check('Native toolbar created',probe.toolbar_before?.includes('wpseo-menu'),probe.toolbar_before);
 const toolbarRemoved=['wpseo-get-premium','wpseo_brand_insights','wpseo-frontend-inspector','wpseo-premium-support'];
 check('Promotional toolbar entries removed',toolbarRemoved.every(s=>!probe.toolbar_after?.includes(s)),{before:probe.toolbar_before,after:probe.toolbar_after});
 check('Unrelated toolbar entries preserved',probe.toolbar_before?.filter(s=>!toolbarRemoved.includes(s)&&!['wpseo-workouts','wpseo-redirects','wpseo-upgrade-sidebar','wpseo-brand-insights'].includes(s)).every(s=>probe.toolbar_after.includes(s)),{before:probe.toolbar_before,after:probe.toolbar_after});
 check('Menu and toolbar removers idempotent',JSON.parse((await run(`require '/wordpress/wp-load.php';require_once ABSPATH.'wp-admin/includes/admin.php';require_once ABSPATH.WPINC.'/class-wp-admin-bar.php';$p=new Rocketsky\\Quiet_Yoast\\Plugin();$p->remove_promotional_menus();$p->remove_promotional_menus();$b=new WP_Admin_Bar();$p->remove_promotional_toolbar_nodes($b);$p->remove_promotional_toolbar_nodes($b);echo json_encode(true);`)).text)===true,{});

 const scopes=[];
 let pluginRowResult;
 for(const [url,expected,expectedJs] of [['/wp-admin/index.php',false,false],['/wp-admin/plugins.php',false,false],['/wp-admin/edit.php',false,false],['/wp-admin/post-new.php',true,true],['/wp-admin/post-new.php?quiet_classic=1',true,true],['/wp-admin/admin.php?page=wpseo_page_settings',true,true],['/wp-admin/admin.php?page=wpseo_dashboard',true,false],['/wp-admin/admin.php?page=wpseo_page_support',true,false],['/wp-admin/edit-tags.php?taxonomy=category',true,true],['/wp-admin/term.php?taxonomy=category&tag_ID=1',true,true]]) {
  const response=await handler.request({url,headers:{cookie:cookies}});
  const p=JSON.parse(fs.readFileSync(path.join(fixtureDir,'probe.json')));
  const has=p.own_styles?.includes('rktsky-quiet-yoast');
  const detail={url,status:response.httpStatusCode,screen:p.screen,ownStyles:p.own_styles,ownScripts:p.own_scripts,ownScriptRegistry:p.own_script_registry};
  check('Asset scope '+url,response.httpStatusCode===200&&has===expected,detail);scopes.push(detail);
  check('Counter JS scope '+url,p.own_scripts.includes('rktsky-quiet-yoast-counters')===expectedJs,detail);
  if(expectedJs) {
   const registration=p.own_script_registry['rktsky-quiet-yoast-counters'];
   check('Native JS registration '+url,registration?.deps?.length===0&&registration.ver===header.Version&&registration.extra.group===1&&registration.extra.strategy==='defer'&&new URL(registration.src).pathname.endsWith('/rktsky-quiet-yoast/assets/counters.js'),registration);
   const tag=response.text.match(/<script[^>]*id="rktsky-quiet-yoast-counters-js"[^>]*>/)?.[0]||'';
   check('Native footer output and defer '+url,tag.includes('counters.js?ver='+header.Version)&&tag.includes('defer')&&response.text.indexOf(tag)>response.text.indexOf('id="wpfooter"'),{tag});
  }
  if(url==='/wp-admin/plugins.php') {
   const row=response.text.match(/<tr[^>]*data-plugin="wordpress-seo\/wp-seo\.php"[^]*?<\/tr>/)?.[0]||'';
   pluginRowResult={before:p.plugin_links_before,after:p.plugin_links_after,row};
   const removedKeys=Object.keys(p.plugin_links_before||{}).filter(k=>!(k in (p.plugin_links_after||{})));
   check('Actual Yoast plugin row premium action removed',row.length>0&&!row.includes('yoa.st/1yb')&&removedKeys.length===1,{removedKeys,before:p.plugin_links_before,after:p.plugin_links_after});
   check('Actual Yoast row preserves FAQ settings deactivate',Object.entries(p.plugin_links_before||{}).filter(([k])=>!removedKeys.includes(k)).every(([k,v])=>p.plugin_links_after[k]===v)&&'deactivate' in p.plugin_links_after&&Object.values(p.plugin_links_after).some(v=>v.includes('>FAQ</a>'))&&Object.values(p.plugin_links_after).some(v=>v.includes('>Settings</a>')),{before:p.plugin_links_before,after:p.plugin_links_after});
  }
 }
 const editorAuth=await run(`require '/wordpress/wp-load.php';require_once ABSPATH.'wp-admin/includes/plugin.php';$id=wp_insert_user(['user_login'=>'quiet_editor','user_pass'=>wp_generate_password(32,true,true),'role'=>'editor']);deactivate_plugins('rktsky-quiet-yoast/rktsky-quiet-yoast.php');wp_set_current_user($id);wp_set_auth_cookie($id);echo json_encode($id);`);
 const editorCookies=(editorAuth.headers['set-cookie']||[]).map(c=>c.split(';')[0]).join('; ');
 await handler.request({url:'/wp-admin/index.php',headers:{cookie:editorCookies}});
 const editorBaseline=JSON.parse(fs.readFileSync(path.join(fixtureDir,'probe.json')));
 await run(`require '/wordpress/wp-load.php';require_once ABSPATH.'wp-admin/includes/plugin.php';activate_plugin('rktsky-quiet-yoast/rktsky-quiet-yoast.php');echo 'ok';`);
 const editorResponse=await handler.request({url:'/wp-admin/index.php',headers:{cookie:editorCookies}});
 const editorAfter=JSON.parse(fs.readFileSync(path.join(fixtureDir,'probe.json')));
 check('Editor role actual admin responds',editorResponse.httpStatusCode===200,{status:editorResponse.httpStatusCode});
 check('Editor promotional parents and submenus removed',[...editorAfter.top_menus,...editorAfter.all_submenus].every(s=>!removed.includes(s)&&s!=='wpseo_redirects_tools'),{before:editorBaseline,after:editorAfter});
 check('Editor other Yoast destinations preserved',[...editorBaseline.top_menus,...editorBaseline.all_submenus].filter(s=>!removed.includes(s)&&s!=='wpseo_redirects_tools').every(s=>[...editorAfter.top_menus,...editorAfter.all_submenus].includes(s)),{before:editorBaseline.all_submenus,after:editorAfter.all_submenus});

 const adversarialLinks={
  exact:'<a href="https://yoa.st/1yb?x=1&amp;y=2">Premium</a>',
  upper:'<a href="https://YOA.ST/1yb">Premium</a>',
  sibling:'<a href="https://yoa.st/1yb-more">Keep</a>',
  prefix:'<a href="https://yoa.st/other/1yb">Keep</a>',
  subdomain:'<a href="https://ads.yoa.st/1yb">Keep</a>',
  fakehost:'<a href="https://yoa.st.evil.test/1yb">Keep</a>',
  userinfo:'<a href="https://yoa.st@evil.test/1yb">Keep</a>',
  encoded:'<a href="https://yoa.st/%31yb">Keep</a>',
  other:'<a href="https://yoa.st/1y2">Settings</a>',
  relative:'<a href="/1yb">Keep</a>',
  malformed:'<a href="https://[broken/1yb">Keep</a>',
  text:'Premium https://yoa.st/1yb',
  nonstring:null
 };
 const encoded=Buffer.from(JSON.stringify(adversarialLinks)).toString('base64');
 const filtered=JSON.parse((await run(`require '/wordpress/wp-load.php';$p=new Rocketsky\\Quiet_Yoast\\Plugin();$links=json_decode(base64_decode('${encoded}'),true);echo json_encode($p->filter_plugin_links($links));`)).text);
 const wanted=Object.fromEntries(Object.entries(adversarialLinks).filter(([k])=>!['exact','upper'].includes(k)));
 check('Plugin action exact host and path with adversarial negative controls',JSON.stringify(filtered)===JSON.stringify(wanted),{expected:wanted,actual:filtered});
 const debugLog=php.fileExists('/wordpress/wp-content/debug.log')?php.readFileAsText('/wordpress/wp-content/debug.log'):'';
 fs.writeFileSync(path.join(resultsDirectory,'debug-log.txt'),debugLog);
 check('No PHP errors from integration requests',debugLog.length===0,{debugLog});
 fs.writeFileSync(path.join(resultsDirectory,'integration-results.json'),JSON.stringify({versions,results:results.map(({name,pass})=>({name,pass}))},null,2));
 if(results.some(r=>!r.pass))process.exitCode=1;
} finally { await handler[Symbol.asyncDispose](); }
