import { describe, expect, it } from 'vitest';
import { calculate, demoData, MAX_BACKUP_BYTES, parseBackup, parseNumber, upcoming, validDate, validateData } from '../src/domain';
describe('weighted grades', () => {
  it('handles points/max and remaining final', () => { const r=calculate(demoData().courses[0]); expect(r.earned).toBeCloseTo(47); expect(r.requiredAverage).toBeCloseTo(82.5); expect(r.currentAverage).toBeCloseTo(78.333333); expect(r.bestPossible).toBeCloseTo(87); });
  it('counts zero as completed and leaves null ungraded', () => { const c=demoData().courses[0]; c.assessments[0].points=0; const r=calculate(c); expect(r.completedWeight).toBe(60); expect(r.status).toBe('unreachable'); });
  it('does not silently normalize incorrect weights', () => { const c=demoData().courses[0]; c.assessments[0].weight=20; expect(calculate(c).status).toBe('invalid'); expect(calculate(c).errors).toContain('total'); });
  it('tolerates decimal summation', () => { const c=demoData().courses[0]; c.assessments.forEach((a,i)=>a.weight=[33.33,33.33,33.34][i]); expect(calculate(c).status).toBe('reachable'); });
  it('marks secured targets with required 0', () => { const c=demoData().courses[0]; c.target=40; expect(calculate(c).status).toBe('secured'); expect(calculate(c).requiredAverage).toBe(0); });
  it('never divides by zero on complete course', () => { const c=demoData().courses[0]; c.assessments[2].points=90; expect(calculate(c).status).toBe('complete'); expect(calculate(c).requiredAverage).toBeNull(); expect(calculate(c).earned).toBeCloseTo(83); });
  it('distinguishes empty course', () => {const c=demoData().courses[0];c.assessments=[];expect(calculate(c).status).toBe('empty');});
  it('rejects score outside range and zero max', () => { const c=demoData().courses[0]; c.assessments[0].points=31; expect(calculate(c).status).toBe('invalid'); c.assessments[0].maxPoints=0; expect(calculate(c).errors).toContain('max'); });
  it('boundary required 100 remains reachable',()=>{const c=demoData().courses[0];c.target=87;expect(calculate(c).status).toBe('reachable');expect(calculate(c).requiredAverage).toBeCloseTo(100);});
});
describe('backup and numeric inputs',()=>{
  it('round trips backup',()=>{const d=demoData();expect(parseBackup(JSON.stringify(d))).toEqual(d);});
  it('supports decimal comma without allowing exponents/NaN/negatives',()=>{expect(parseNumber(' 82,5 ')).toBe(82.5);for(const v of ['','NaN','1e2','-1','1,2,3','Infinity','100.00001'])expect(parseNumber(v)).toBeNull();});
  it('rejects unknown versions',()=>expect(()=>validateData({...demoData(),version:2})).toThrow());
  it('rejects duplicate ids',()=>{const d=demoData();d.courses[0].assessments[0].id=d.courses[0].id;expect(()=>validateData(d)).toThrow();});
  it('rejects impossible dates',()=>{expect(validDate('2026-02-30')).toBe(false);expect(validDate('2028-02-29')).toBe(true);const d=demoData();d.courses[0].assessments[0].dueDate='bad';expect(()=>validateData(d)).toThrow();});
  it('rejects large backups',()=>expect(()=>parseBackup(' '.repeat(MAX_BACKUP_BYTES+1))).toThrow('backup_too_large'));
  it('rejects language type coercion',()=>expect(()=>validateData({...demoData(),language:['ru']})).toThrow());
  it('round trips the largest schema-valid export',()=>{
    const d=demoData();const template=d.courses[0];
    d.courses=Array.from({length:30},(_,i)=>({...template,id:`course-${i}`,title:'Я'.repeat(80),assessments:Array.from({length:100},(_,j)=>({...template.assessments[0],id:`item-${i}-${j}`,title:'Я'.repeat(80),weight:1}))}));
    const backup=JSON.stringify(d,null,2);expect(parseBackup(backup)).toEqual(d);
  });
  it('allows unfinished course with incomplete weights in backup',()=>{const d=demoData();d.courses[0].assessments.pop();expect(validateData(d)).toEqual(d);});
  it('strips unknown fields',()=>{const d=demoData();expect(validateData({...d,other:'unexpected'})).toEqual(d);});
  it('orders pending deadlines only',()=>{const d=demoData();const c=d.courses[0];c.assessments[0].dueDate='2026-10-01';c.assessments[2].dueDate='2026-10-15';expect(upcoming(d)).toHaveLength(1);});
});
