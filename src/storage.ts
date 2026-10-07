import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { type AppData, validateData } from './domain';
const KEY = 'gradedock.data.v1';
const RECOVERY = 'gradedock.recovery.v1';
type Diagnostic = { at:string; code:string };
const diagnostics: Diagnostic[] = [];
export function recordError(code:string) { diagnostics.push({at:new Date().toISOString(),code}); if (diagnostics.length>20) diagnostics.shift(); }
export async function loadData(): Promise<AppData | null> {
  const {value} = await Preferences.get({key:KEY});
  if (value === null) return null;
  try { return validateData(JSON.parse(value)); }
  catch { recordError('invalid_saved_data'); await Preferences.set({key:RECOVERY,value}); throw new Error('invalid_saved_data'); }
}
export async function saveData(data:AppData): Promise<void> { await Preferences.set({key:KEY,value:JSON.stringify(validateData(data))}); }
// Serialize native writes so an older slow write cannot overwrite a newer edit.
let writes: Promise<void> = Promise.resolve();
export function queueSave(data:AppData): Promise<void> {
  const write = writes.catch(()=>{}).then(()=>saveData(data));
  writes=write;
  return write;
}
export async function exportText(text:string, filename:string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const file = await Filesystem.writeFile({path:'exports/'+filename,data:text,directory:Directory.Cache,encoding:Encoding.UTF8,recursive:true});
    await Share.share({title:'GradeDock',url:file.uri,dialogTitle:'GradeDock'});
  } else {
    const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
}
export function exportBackup(data:AppData) { return exportText(JSON.stringify(data,null,2),'gradedock-backup.json'); }
export async function exportRecovery() {
  const {value}=await Preferences.get({key:RECOVERY});
  if (!value) throw new Error('no_recovery');
  return exportText(value,'gradedock-recovery.json');
}
export function exportDiagnostics() { return exportText(JSON.stringify({app:'GradeDock',version:'1.0.0',platform:Capacitor.getPlatform(),errors:diagnostics},null,2),'gradedock-diagnostics.json'); }
