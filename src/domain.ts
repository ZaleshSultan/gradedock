export type Language = 'ru' | 'en';
export interface Assessment { id: string; title: string; weight: number; points: number | null; maxPoints: number; dueDate: string; }
export interface Course { id: string; title: string; target: number; color: string; assessments: Assessment[]; }
export interface AppData { version: 1; language: Language; courses: Course[]; }
export type GradeStatus = 'invalid' | 'empty' | 'reachable' | 'unreachable' | 'secured' | 'complete';
export interface GradeResult { status: GradeStatus; errors: string[]; totalWeight: number; completedWeight: number; earned: number; currentAverage: number | null; requiredAverage: number | null; bestPossible: number; }
export const COLORS = ['#127868', '#5962b5', '#ac6529', '#a65371'];
export const MAX_BACKUP_BYTES = 4 * 1024 * 1024;
export const uid = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), n=>n.toString(16).padStart(2,'0')).join('');
export function parseNumber(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,4})?$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}
export function validDate(value: string): boolean {
  if (value === '') return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function calculate(course: Course): GradeResult {
  const errors: string[] = [];
  if (!Number.isFinite(course.target) || course.target < 0 || course.target > 100) errors.push('target');
  if (course.assessments.length > 100) errors.push('limit');
  for (const a of course.assessments) {
    if (!Number.isFinite(a.weight) || a.weight <= 0 || a.weight > 100) errors.push('weight');
    if (!Number.isFinite(a.maxPoints) || a.maxPoints <= 0 || a.maxPoints > 1000000) errors.push('max');
    if (a.points !== null && (!Number.isFinite(a.points) || a.points < 0 || a.points > a.maxPoints)) errors.push('points');
  }
  const totalWeight = course.assessments.reduce((sum, a) => sum + a.weight, 0);
  if (course.assessments.length > 0 && Math.abs(totalWeight - 100) > 0.0001) errors.push('total');
  const completed = course.assessments.filter(a => a.points !== null);
  const completedWeight = completed.reduce((sum, a) => sum + a.weight, 0);
  const earned = completed.reduce((sum, a) => sum + (a.points! / a.maxPoints) * a.weight, 0);
  const remaining = Math.max(0, totalWeight - completedWeight);
  const bestPossible = earned + remaining;
  const required = remaining > 0 ? Math.max(0, (course.target - earned) / remaining * 100) : null;
  const status: GradeStatus = errors.length ? 'invalid' : !course.assessments.length ? 'empty' : remaining <= 0.0001 ? 'complete' : earned >= course.target - 0.0001 ? 'secured' : bestPossible < course.target - 0.0001 ? 'unreachable' : 'reachable';
  return {status, errors: [...new Set(errors)], totalWeight, completedWeight, earned, currentAverage: completedWeight > 0 ? earned / completedWeight * 100 : null, requiredAverage: required, bestPossible};
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function shortText(value: unknown, max: number): value is string { return typeof value === 'string' && value.trim().length > 0 && value.length <= max; }
/** Treat imported backup data as untrusted; reconstruct known fields only. */
export function validateData(value: unknown): AppData {
  if (!isRecord(value) || value.version !== 1 || typeof value.language !== 'string' || !['ru','en'].includes(value.language) || !Array.isArray(value.courses) || value.courses.length > 30) throw new Error('invalid_backup');
  const ids = new Set<string>();
  const acceptId = (id: unknown): string => { if (!shortText(id, 80) || ids.has(id)) throw new Error('invalid_backup'); ids.add(id); return id; };
  const courses = value.courses.map((c: unknown): Course => {
    if (!isRecord(c) || !shortText(c.title, 80) || typeof c.target !== 'number' || !Number.isFinite(c.target) || c.target < 0 || c.target > 100 || typeof c.color !== 'string' || !COLORS.includes(c.color) || !Array.isArray(c.assessments) || c.assessments.length > 100) throw new Error('invalid_backup');
    const id = acceptId(c.id);
    const assessments = c.assessments.map((a: unknown): Assessment => {
      if (!isRecord(a) || !shortText(a.title, 80) || typeof a.weight !== 'number' || !Number.isFinite(a.weight) || a.weight <= 0 || a.weight > 100 || typeof a.maxPoints !== 'number' || !Number.isFinite(a.maxPoints) || a.maxPoints <= 0 || a.maxPoints > 1000000 || (a.points !== null && (typeof a.points !== 'number' || !Number.isFinite(a.points) || a.points < 0 || a.points > a.maxPoints)) || typeof a.dueDate !== 'string' || !validDate(a.dueDate)) throw new Error('invalid_backup');
      return {id: acceptId(a.id), title: a.title.trim(), weight: a.weight, points: a.points as number | null, maxPoints: a.maxPoints, dueDate: a.dueDate};
    });
    return {id, title: c.title.trim(), target: c.target, color: c.color, assessments};
  });
  return {version:1, language:value.language as Language, courses};
}
export function parseBackup(text: string): AppData {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error('backup_too_large');
  return validateData(JSON.parse(text));
}
export function newCourse(title: string, target = 80): Course {
  return {id:uid(),title,target,color:COLORS[0],assessments:[]};
}
export function demoData(language: Language = 'ru'): AppData {
  const ru = language === 'ru';
  return {version:1,language,courses:[{id:uid(),title:ru?'Математика':'Mathematics',target:80,color:COLORS[0],assessments:[
    {id:uid(),title:ru?'Практические работы':'Coursework',weight:30,points:26,maxPoints:30,dueDate:''},
    {id:uid(),title:ru?'Промежуточный экзамен':'Midterm',weight:30,points:21,maxPoints:30,dueDate:''},
    {id:uid(),title:ru?'Финальный экзамен':'Final exam',weight:40,points:null,maxPoints:100,dueDate:''}
  ]}]};
}
export function upcoming(data: AppData) {
  return data.courses.flatMap(course=>course.assessments.filter(a=>a.points===null && a.dueDate).map(assessment=>({course,assessment}))).sort((a,b)=>a.assessment.dueDate.localeCompare(b.assessment.dueDate));
}
