import fs from 'node:fs';
import path from 'node:path';
import { bootTestWordPress } from './runtime.mjs';
import { pluginDirectory, resultsDirectory } from './paths.mjs';
const {handler,php}=await bootTestWordPress({pluginDirectory,withYoast:false,phpVersion:'7.4'});
const results=[];
const run=async code=>{const r=await php.run({code:'<?php '+code});if(r.exitCode||r.errors)throw new Error(r.text+' '+r.errors);return r;};
try {
 for(const scenario of ['absent','premium-file','premium-version']) {
  const constants=scenario==='absent'?'':scenario==='premium-file'?`define('WPSEO_VERSION','28.8');define('WPSEO_PREMIUM_FILE','fixture-only');`:`define('WPSEO_VERSION','28.8');define('WPSEO_PREMIUM_VERSION','fixture-only');`;
  const r=await run(`require '/wordpress/wp-load.php';${constants}require WP_PLUGIN_DIR.'/rktsky-quiet-yoast/rktsky-quiet-yoast.php';Rocketsky\\Quiet_Yoast\\Plugin::boot();$h=[];foreach($GLOBALS['wp_filter'] as $hook=>$callbacks){foreach($callbacks->callbacks as $handlers){foreach($handlers as $callback){$fn=$callback['function'];if(is_array($fn)&&is_object($fn[0])&&get_class($fn[0])==='Rocketsky\\Quiet_Yoast\\Plugin')$h[]=$hook;}}}echo json_encode(['php'=>PHP_VERSION,'hooks'=>$h]);`);
  const data=JSON.parse(r.text),pass=data.hooks.length===0;results.push({scenario,pass,...data,coverage:'Simulated provider constants only; no commercial Premium package available.'});console.log(pass?'PASS':'FAIL',scenario,data);
 }
 const dep=JSON.parse((await run(`require '/wordpress/wp-load.php';require_once ABSPATH.'wp-admin/includes/plugin.php';$e=activate_plugin('rktsky-quiet-yoast/rktsky-quiet-yoast.php');echo json_encode(['error'=>is_wp_error($e)?$e->get_error_code():null,'message'=>is_wp_error($e)?$e->get_error_message():null]);`)).text);
 results.push({scenario:'native missing dependency activation',pass:dep.error==='plugin_missing_dependencies',...dep});console.log('dependency',dep);
 const syntax=JSON.parse((await run(`$files=['/wordpress/wp-content/plugins/rktsky-quiet-yoast/rktsky-quiet-yoast.php','/wordpress/wp-content/plugins/rktsky-quiet-yoast/includes/class-plugin.php'];$r=[];foreach($files as $file){token_get_all(file_get_contents($file),TOKEN_PARSE);$r[]=basename($file);}echo json_encode(['parsed'=>$r,'php'=>PHP_VERSION]);`)).text);
 results.push({scenario:'PHP7.4 syntax parser',pass:syntax.parsed.length===2,...syntax});console.log('PASS parser',syntax);
 fs.writeFileSync(path.join(resultsDirectory,'guard-results.json'),JSON.stringify(results.map(({scenario,pass,php,coverage})=>({scenario,pass,php,coverage})),null,2));
 if(results.some(r=>!r.pass))process.exitCode=1;
}finally{await handler[Symbol.asyncDispose]();}
