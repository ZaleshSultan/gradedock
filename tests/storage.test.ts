import { beforeEach, describe, expect, it, vi } from 'vitest';
import { demoData } from '../src/domain';
const mocks = vi.hoisted(()=>({get:vi.fn(),set:vi.fn(),writeFile:vi.fn(),share:vi.fn()}));
vi.mock('@capacitor/preferences',()=>({Preferences:{get:mocks.get,set:mocks.set}}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'android'}}));
vi.mock('@capacitor/filesystem',()=>({Directory:{Cache:'CACHE'},Encoding:{UTF8:'utf8'},Filesystem:{writeFile:mocks.writeFile}}));
vi.mock('@capacitor/share',()=>({Share:{share:mocks.share}}));
beforeEach(()=>{vi.resetModules();Object.values(mocks).forEach(mock=>mock.mockReset());mocks.set.mockResolvedValue(undefined);mocks.writeFile.mockResolvedValue({uri:'file:///cache/exports/backup.json'});mocks.share.mockResolvedValue({});});
describe('local persistence',()=>{
  it('returns null for a new install',async()=>{mocks.get.mockResolvedValue({value:null});const storage=await import('../src/storage');expect(await storage.loadData()).toBeNull();});
  it('preserves damaged save before throwing',async()=>{mocks.get.mockResolvedValue({value:'{"broken":true}'});const storage=await import('../src/storage');await expect(storage.loadData()).rejects.toThrow('invalid_saved_data');expect(mocks.set).toHaveBeenCalledWith({key:'gradedock.recovery.v1',value:'{"broken":true}'});});
  it('serializes writes so stale saves cannot overtake edits',async()=>{
    let release:()=>void=()=>{};mocks.set.mockImplementationOnce(()=>new Promise<void>(resolve=>{release=resolve;}));
    const storage=await import('../src/storage');const first=demoData();const second={...first,language:'en' as const};
    const p1=storage.queueSave(first);const p2=storage.queueSave(second);
    await vi.waitFor(()=>expect(mocks.set).toHaveBeenCalledTimes(1));release();await Promise.all([p1,p2]);
    expect(JSON.parse(mocks.set.mock.calls[1][0].value).language).toBe('en');
  });
  it('reports a failed save but permits a later retry',async()=>{mocks.set.mockRejectedValueOnce(new Error('disk'));const storage=await import('../src/storage');await expect(storage.queueSave(demoData())).rejects.toThrow('disk');await expect(storage.queueSave(demoData())).resolves.toBeUndefined();});
  it('shares a backup only by explicit export',async()=>{const storage=await import('../src/storage');const data=demoData();await storage.saveData(data);expect(mocks.share).not.toHaveBeenCalled();await storage.exportBackup(data);expect(mocks.writeFile.mock.calls[0][0].path).toBe('exports/gradedock-backup.json');expect(JSON.parse(mocks.writeFile.mock.calls[0][0].data)).toEqual(data);expect(mocks.share).toHaveBeenCalledTimes(1);});
  it('diagnostics expose generic errors and no course data',async()=>{const storage=await import('../src/storage');storage.recordError('save_failed');await storage.exportDiagnostics();const json=JSON.parse(mocks.writeFile.mock.calls[0][0].data);expect(json.errors[0].code).toBe('save_failed');expect(json.courses).toBeUndefined();expect(json.platform).toBe('android');});
});
