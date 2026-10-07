import { useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, BookOpen, CalendarDays, Check, CheckCircle2, ChevronRight, CircleHelp, Download, Flag, GraduationCap, HardDrive, Info, LoaderCircle, Mail, Pencil, Plus, RefreshCw, ShieldCheck, Sparkles, Trash2, TriangleAlert, X } from 'lucide-react';
import { COLORS, MAX_BACKUP_BYTES, calculate, demoData, newCourse, parseBackup, parseNumber, uid, upcoming, validDate, type AppData, type Assessment, type Course } from './domain';
import { exportBackup, exportDiagnostics, exportRecovery, loadData, queueSave, recordError } from './storage';

const emptyData = (): AppData => ({ version: 1, language: 'ru', courses: [] });
type Tab = 'courses' | 'plan' | 'settings';
type ModalState =
  | { kind: 'course'; course?: Course }
  | { kind: 'assessment'; course: Course; assessment?: Assessment }
  | { kind: 'confirm'; title: string; body: string; action: string; danger?: boolean; run: () => void }
  | { kind: 'privacy' }
  | { kind: 'document'; document: 'privacy' | 'licenses' };

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = ref.current!;
    (dialog.querySelector<HTMLElement>('[data-initial-focus]') ?? dialog.querySelector<HTMLElement>('input, button') ?? dialog).focus();
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); }
      if (e.key !== 'Tab') return;
      const nodes = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], select:not([disabled]), textarea:not([disabled])')].filter(n => n.getClientRects().length > 0);
      const first = nodes[0], last = nodes.at(-1);
      if (!first) { e.preventDefault(); dialog.focus(); }
      else if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { e.preventDefault(); last!.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keyboard);
      if (before?.isConnected) before.focus();
    };
  }, []);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section ref={ref} className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-heading" tabIndex={-1}>
      <div className="modal-heading"><h2 id="dialog-heading">{title}</h2><button className="icon-button" aria-label="Закрыть / Close" onClick={onClose}><X size={22} /></button></div>
      {children}
    </section>
  </div>;
}

function CourseForm({ course, ru, onSubmit, onDelete }: { course?: Course; ru: boolean; onSubmit: (course: Course) => void; onDelete: () => void }) {
  const [title, setTitle] = useState(course?.title ?? '');
  const [target, setTarget] = useState(String(course?.target ?? 80));
  const [color, setColor] = useState(course?.color ?? COLORS[0]);
  const [error, setError] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const number = parseNumber(target);
    if (!title.trim() || title.trim().length > 80) { setError(ru ? 'Введите название до 80 символов.' : 'Enter a course name of up to 80 characters.'); return; }
    if (number === null || number < 0 || number > 100) { setError(ru ? 'Цель должна быть числом от 0 до 100.' : 'Your target must be a number from 0 to 100.'); return; }
    onSubmit({ ...(course ?? newCourse(title.trim())), title: title.trim(), target: number, color });
  };
  return <form onSubmit={submit} className="editor-form">
    <label>{ru ? 'Название предмета' : 'Course name'}<input data-initial-focus value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder={ru ? 'Например, дискретная математика' : 'e.g. Discrete mathematics'} required /></label>
    <label>{ru ? 'Цель за весь курс, %' : 'Target course grade, %'}<input value={target} onChange={e => setTarget(e.target.value)} inputMode="decimal" maxLength={12} required /><span className="field-hint">{ru ? 'Используйте порог из своего syllabus. Официальная шкала университета не подставляется.' : 'Use a target from your own syllabus. No university grading scale is assumed.'}</span></label>
    <fieldset className="color-picker"><legend>{ru ? 'Цвет предмета' : 'Course color'}</legend><div>{COLORS.map((c, i) => <button type="button" className="color-swatch" key={c} aria-label={(ru ? ['Зелёный', 'Синий', 'Охра', 'Розовый'] : ['Green', 'Blue', 'Ochre', 'Rose'])[i]} aria-pressed={color === c} style={{ background: c }} onClick={() => setColor(c)}>{color === c && <Check size={22} />}</button>)}</div></fieldset>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button type="submit" className="button primary wide">{course ? (ru ? 'Сохранить предмет' : 'Save course') : (ru ? 'Создать предмет' : 'Create course')}<ArrowRight size={18} /></button>
    {course && <button className="button text-danger wide" type="button" onClick={onDelete}><Trash2 size={18} />{ru ? 'Удалить предмет' : 'Delete course'}</button>}
  </form>;
}

function AssessmentForm({ assessment, ru, onSubmit, onDelete }: { assessment?: Assessment; ru: boolean; onSubmit: (a: Assessment) => void; onDelete: () => void }) {
  const [title, setTitle] = useState(assessment?.title ?? '');
  const [weight, setWeight] = useState(String(assessment?.weight ?? ''));
  const [points, setPoints] = useState(assessment?.points == null ? '' : String(assessment.points));
  const [maxPoints, setMaxPoints] = useState(String(assessment?.maxPoints ?? 100));
  const [dueDate, setDueDate] = useState(assessment?.dueDate ?? '');
  const [error, setError] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const w = parseNumber(weight), max = parseNumber(maxPoints), p = points.trim() === '' ? null : parseNumber(points);
    if (!title.trim() || title.trim().length > 80) { setError(ru ? 'Введите название до 80 символов.' : 'Enter a title of up to 80 characters.'); return; }
    if (w === null || w <= 0 || w > 100) { setError(ru ? 'Вес должен быть больше 0 и не больше 100%.' : 'Weight must be greater than 0 and at most 100%.'); return; }
    if (max === null || max <= 0 || max > 1000000) { setError(ru ? 'Максимум должен быть больше 0 и не больше 1 000 000.' : 'Maximum points must be greater than 0 and at most 1,000,000.'); return; }
    if ((points.trim() !== '' && p === null) || (p !== null && (p < 0 || p > max))) { setError(ru ? 'Полученные баллы должны быть от 0 до максимума. Для неизвестной оценки оставьте поле пустым.' : 'Points must be from 0 to the maximum. Leave the field empty for an ungraded assessment.'); return; }
    if (!validDate(dueDate)) { setError(ru ? 'Проверьте дату.' : 'Check the due date.'); return; }
    onSubmit({ id: assessment?.id ?? uid(), title: title.trim(), weight: w, points: p, maxPoints: max, dueDate });
  };
  return <form className="editor-form" onSubmit={submit}>
    <label>{ru ? 'Название работы' : 'Assessment name'}<input data-initial-focus maxLength={80} value={title} onChange={e => setTitle(e.target.value)} placeholder={ru ? 'Например, финальный экзамен' : 'e.g. Final exam'} required /></label>
    <label>{ru ? 'Вес в итоговой оценке, %' : 'Weight in final grade, %'}<input inputMode="decimal" maxLength={12} value={weight} onChange={e => setWeight(e.target.value)} placeholder="40" required /><span className="field-hint">{ru ? 'Вес всех работ по предмету должен составить 100%.' : 'All assessment weights in a course must add up to 100%.'}</span></label>
    <div className="form-columns"><label>{ru ? 'Получено баллов' : 'Points earned'}<input inputMode="decimal" maxLength={14} value={points} onChange={e => setPoints(e.target.value)} placeholder={ru ? 'Пока неизвестно' : 'Not graded yet'} /></label><label>{ru ? 'Максимум баллов' : 'Maximum points'}<input inputMode="decimal" maxLength={14} value={maxPoints} onChange={e => setMaxPoints(e.target.value)} required /></label></div>
    <p className="field-hint below-field"><Info size={15} />{ru ? 'Пустое поле — оценка ещё неизвестна. Ноль — уже полученный результат.' : 'Empty means ungraded. Zero means a grade you have already received.'}</p>
    <label>{ru ? 'Срок сдачи — необязательно' : 'Due date — optional'}<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} max="9999-12-31" /><span className="field-hint">{ru ? 'Дата появится в плане. Уведомления не отправляются.' : 'The date will appear in your plan. No notifications are sent.'}</span></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button type="submit" className="button primary wide">{assessment ? (ru ? 'Сохранить работу' : 'Save assessment') : (ru ? 'Добавить работу' : 'Add assessment')}<Check size={18} /></button>
    {assessment && <button type="button" className="button text-danger wide" onClick={onDelete}><Trash2 size={18} />{ru ? 'Удалить работу' : 'Delete assessment'}</button>}
  </form>;
}

export default function App() {
  const [data, setData] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [tab, setTab] = useState<Tab>('courses');
  const [modal, setModal] = useState<ModalState | null>(null);
  const [notice, setNotice] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const latestRevision = useRef(0);
  const ru = data.language === 'ru';
  const t = (r: string, e: string) => ru ? r : e;
  const fmt = (number: number, digits = 1) => new Intl.NumberFormat(ru ? 'ru-RU' : 'en-US', { maximumFractionDigits: digits }).format(number);
  const pct = (number: number) => `${fmt(number)}%`;
  const dateLabel = (value: string) => new Intl.DateTimeFormat(ru ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' }).format(new Date(value + 'T12:00:00'));
  const today = (() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; })();
  const selected = data.courses.find(c => c.id === selectedId) ?? data.courses[0];
  const result = selected ? calculate(selected) : null;
  const pending = data.courses.reduce((sum, c) => sum + c.assessments.filter(a => a.points === null).length, 0);
  const planned = upcoming(data);
  useEffect(() => { document.documentElement.lang = data.language; }, [data.language]);
  const isDemo = selected && /^(Демо|Demo) · /.test(selected.title);

  const hydrate = async () => {
    setReady(false); setLoadFailed(false);
    try {
      const loaded = await loadData();
      setData(loaded ?? emptyData()); setRevision(0); latestRevision.current = 0;
      setSelectedId(loaded?.courses[0]?.id ?? ''); setSaveFailed(false);
    } catch { recordError('load_failed'); setLoadFailed(true); }
    finally { setReady(true); }
  };
  useEffect(() => { void hydrate(); }, []);
  useEffect(() => {
    if (!ready || loadFailed || revision === 0) return;
    const thisRevision = revision;
    setSaving(true);
    void queueSave(data).then(() => { if (latestRevision.current === thisRevision) { setSaveFailed(false); setSaving(false); } }).catch(() => { recordError('save_failed'); if (latestRevision.current === thisRevision) { setSaveFailed(true); setSaving(false); } });
  }, [data, revision, ready, loadFailed]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(timer); }, [notice]);

  const update = (change: (previous: AppData) => AppData) => {
    setData(previous => change(previous));
    const next = latestRevision.current + 1; latestRevision.current = next; setRevision(next);
  };
  const replaceCourse = (course: Course) => update(previous => ({ ...previous, courses: previous.courses.map(c => c.id === course.id ? course : c) }));
  const confirmDeleteCourse = (course: Course) => setModal({ kind: 'confirm', title: t('Удалить предмет?', 'Delete this course?'), body: t(`«${course.title}» и все его оценки будут удалены с устройства. Сделайте резервную копию, если хотите их сохранить.`, `“${course.title}” and all its assessments will be removed from this device. Export a backup first if you want to keep them.`), action: t('Удалить предмет', 'Delete course'), danger: true, run: () => { update(previous => ({ ...previous, courses: previous.courses.filter(c => c.id !== course.id) })); setModal(null); } });
  const confirmDeleteAssessment = (course: Course, assessment: Assessment) => setModal({ kind: 'confirm', title: t('Удалить работу?', 'Delete this assessment?'), body: t(`«${assessment.title}» будет удалена. Проверьте веса оставшихся работ после удаления.`, `“${assessment.title}” will be removed. Check the remaining assessment weights afterwards.`), action: t('Удалить работу', 'Delete assessment'), danger: true, run: () => { replaceCourse({ ...course, assessments: course.assessments.filter(a => a.id !== assessment.id) }); setModal(null); } });
  const safeAction = async (action: () => Promise<void>, success?: string) => {
    setActionBusy(true);
    try { await action(); if (success) setNotice(success); }
    catch { recordError('export_failed'); setNotice(t('Не удалось открыть экспорт. Повторите действие.', 'Could not open the export. Please try again.')); }
    finally { setActionBusy(false); }
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('backup_too_large');
      const imported = parseBackup(await file.text());
      setModal({ kind: 'confirm', title: t('Заменить данные резервной копией?', 'Replace data with this backup?'), body: t(`В файле ${imported.courses.length} предметов. Все текущие предметы и язык приложения будут заменены. Сначала экспортируйте текущие данные, если хотите их сохранить.`, `The file contains ${imported.courses.length} courses. All current courses and the app language will be replaced. Export your current data first if you want to keep it.`), action: t('Заменить данные', 'Replace data'), run: () => { update(() => imported); setSelectedId(imported.courses[0]?.id ?? ''); setModal(null); setTab('courses'); setNotice(imported.language === 'ru' ? 'Резервная копия загружена.' : 'Backup imported.'); } });
    } catch { recordError('import_rejected'); setNotice(t('Файл не подходит: выберите резервную копию GradeDock до 4 МБ. Текущие данные сохранены.', 'Invalid file: choose a GradeDock backup up to 4 MB. Your current data is unchanged.')); }
    finally { if (importRef.current) importRef.current.value = ''; }
  };
  const reset = () => {
    const next = { ...emptyData(), language: data.language };
    setLoadFailed(false); update(() => next); setSelectedId(''); setModal(null); setTab('courses');
  };
  const requestReset = () => setModal({ kind: 'confirm', title: t('Удалить все предметы?', 'Delete all courses?'), body: t('Все предметы и оценки в этом приложении будут удалены. Сначала экспортируйте резервную копию. Это действие нельзя отменить в приложении.', 'All courses and grades in this app will be deleted. Export a backup first. You cannot undo this action in the app.'), action: t('Удалить всё', 'Delete everything'), danger: true, run: reset });

  if (!ready) return <main className="loading-screen"><div className="brand-mark"><GraduationCap size={30} /></div><h1>GradeDock</h1><LoaderCircle className="spin" size={24} /><p>{t('Открываем ваши предметы…', 'Opening your courses…')}</p></main>;

  return <div className="app-shell">
    <header className="app-header"><a className="brand" href="#" onClick={e => { e.preventDefault(); setTab('courses'); }} aria-label="GradeDock"><span className="brand-mark"><GraduationCap size={25} /></span><span>Grade<span className="brand-accent">Dock</span></span></a><span className="device-label"><ShieldCheck size={16} />{t('На устройстве', 'On your device')}</span></header>
    <main className="main-content" id="main-content">
      {notice && <div className="notice" role="status"><Info size={18} /><span>{notice}</span><button className="icon-button" onClick={() => setNotice('')} aria-label={t('Скрыть сообщение', 'Dismiss message')}><X size={18} /></button></div>}
      {saveFailed && <div className="warning-banner" role="alert"><TriangleAlert size={20} /><div><strong>{t('Изменения пока не сохранены', 'Changes have not been saved')}</strong><p>{t('Оставьте приложение открытым. Экспортируйте копию или повторите сохранение.', 'Keep the app open. Export a backup or retry saving.')}</p><div className="banner-actions"><button className="button small" onClick={() => { const next = latestRevision.current + 1; latestRevision.current = next; setRevision(next); }}>{t('Повторить', 'Retry')}</button><button className="button small" disabled={actionBusy} onClick={() => void safeAction(() => exportBackup(data))}>{t('Экспорт копии', 'Export backup')}</button></div></div></div>}
      {loadFailed ? <section className="recovery-panel"><div className="empty-symbol warning-symbol"><HardDrive size={38} /></div><p className="eyebrow">{t('СОХРАНЕНИЕ ПОД ЗАЩИТОЙ', 'YOUR SAVED DATA IS PROTECTED')}</p><h1>{t('Не удалось прочитать данные.', 'Could not read saved data.')}</h1><p>{t('Автосохранение остановлено, чтобы не заменить ваши записи пустыми. Попробуйте открыть их снова. Если копия повреждена, экспортируйте её перед сбросом.', 'Autosave is paused so your records cannot be replaced with empty data. Try opening them again. If the backup is damaged, export it before resetting.')}</p><div className="empty-actions"><button className="button primary" onClick={() => void hydrate()}><RefreshCw size={18} />{t('Попробовать снова', 'Try again')}</button><button className="button secondary" disabled={actionBusy} onClick={() => void safeAction(exportRecovery)}><Download size={18} />{t('Экспорт восстановления', 'Export recovery')}</button><button className="button text-danger" onClick={requestReset}>{t('Удалить данные и начать заново', 'Delete data and start again')}</button></div></section> : <>
        {tab === 'courses' && <>
          <div className="page-heading"><div><p className="eyebrow">{t('ВАШ СЕМЕСТР, ЯСНЫЙ ПЛАН', 'YOUR SEMESTER, A CLEAR PLAN')}</p><h1>{t('Предметы', 'Your courses')}<span className="heading-dot" aria-hidden="true">.</span></h1></div><button className="button primary add-course" aria-label={t('Добавить предмет', 'Add course')} disabled={data.courses.length >= 30} onClick={() => setModal({ kind: 'course' })}><Plus size={20} /><span>{t('Предмет', 'Course')}</span></button></div>
          {data.courses.length >= 30 && <p className="limit-note">{t('Достигнут лимит: 30 предметов. Удалите ненужный, чтобы добавить новый.', 'You have reached the 30-course limit. Remove a course before adding another.')}</p>}
          {!selected ? <section className="welcome-card"><div className="welcome-art" aria-hidden="true"><span className="art-orbit orbit-one"/><span className="art-orbit orbit-two"/><div className="art-card"><span className="art-line"/><span className="art-line short"/><span className="art-score">80<span>%</span></span><span className="art-bar"><span/></span></div><span className="art-badge"><Check size={23} /></span><span className="art-star"><Sparkles size={25} /></span></div><p className="eyebrow">{t('ОТ ПЕРВОЙ ОЦЕНКИ ДО ФИНАЛА', 'FROM FIRST GRADE TO FINAL')}</p><h2>{t('Спокойнее к финалу.', 'A calmer path to finals.')}</h2><p>{t('Добавьте предмет, веса работ и свою цель. Узнайте, какой результат нужен дальше — без таблиц и регистрации.', 'Add a course, assessment weights and a target. See what you need next — without spreadsheets or signing up.')}</p><div className="empty-actions"><button className="button primary" onClick={() => setModal({ kind: 'course' })}>{t('Добавить первый предмет', 'Add your first course')}<ArrowRight size={18} /></button><button className="button subtle" onClick={() => { const demo = demoData(data.language); demo.courses[0].title = t('Демо · Математика', 'Demo · Mathematics'); update(() => demo); setSelectedId(demo.courses[0].id); setNotice(t('Это демонстрационные оценки. Замените их своими или удалите демо-предмет.', 'These are sample grades. Replace them with your own or delete the demo course.')); }}><Sparkles size={17} />{t('Посмотреть демо', 'Explore a demo')}</button></div><div className="welcome-trust"><span><ShieldCheck size={16} />{t('Работает офлайн', 'Works offline')}</span><span><HardDrive size={16} />{t('Данные только у вас', 'Your data stays yours')}</span></div></section> : <>
            <div className="course-switcher" role="group" aria-label={t('Выбор предмета', 'Choose a course')}>{data.courses.map(course => <button key={course.id} className={`course-pill ${selected.id === course.id ? 'active' : ''}`} aria-pressed={selected.id === course.id} onClick={() => setSelectedId(course.id)}><span className="course-dot" style={{ background: course.color }} />{course.title}</button>)}</div>
            {isDemo && <div className="demo-banner"><Sparkles size={17} /><span>{t('Демонстрационный предмет — оценки приведены для примера.', 'Demo course — these grades are examples.')}</span></div>}
            <div className="course-heading"><div><h2>{selected.title}</h2><p><Flag size={15} />{t('Цель', 'Target')} <strong>{pct(selected.target)}</strong></p></div><button className="icon-button outlined" aria-label={t('Редактировать предмет', 'Edit course')} onClick={() => setModal({ kind: 'course', course: selected })}><Pencil size={19} /></button></div>
            {result!.status === 'invalid' ? <section className="invalid-card" role="status"><TriangleAlert size={28} /><div><h3>{t('Сначала проверьте веса', 'Check your weights first')}</h3><p>{t(`Сейчас сумма весов — ${pct(result!.totalWeight)}. Для прогноза нужно ровно 100%. Отредактируйте работы или добавьте недостающие.`, `Your weights currently total ${pct(result!.totalWeight)}. A forecast needs exactly 100%. Edit assessments or add the missing ones.`)}</p><span className="invalid-weight">{fmt(result!.totalWeight)} / 100%</span></div></section> : result!.status === 'empty' ? <section className="setup-card"><div className="setup-icon"><BookOpen size={30} /></div><h3>{t('Из чего состоит итоговая оценка?', 'What makes up your final grade?')}</h3><p>{t('Добавьте работы из syllabus: экзамены, проекты и практику. Сумма их весов должна составить 100%.', 'Add exams, projects and coursework from your syllabus. Their weights should add up to 100%.')}</p><button className="button primary" onClick={() => setModal({ kind: 'assessment', course: selected })}><Plus size={18} />{t('Добавить работу', 'Add assessment')}</button></section> : <>
              <section className={`forecast-card ${result!.status === 'unreachable' ? 'forecast-unreachable' : ''}`} aria-labelledby="forecast-heading"><div className="forecast-top"><span className="forecast-label" id="forecast-heading">{result!.status === 'complete' ? t('ИТОГ ПО ВВЕДЁННЫМ ОЦЕНКАМ', 'FINAL GRADE FROM YOUR INPUTS') : t('НУЖНО НА ОСТАВШИХСЯ РАБОТАХ', 'NEEDED ON REMAINING ASSESSMENTS')}</span><span className="forecast-icon">{result!.status === 'secured' || result!.status === 'complete' ? <CheckCircle2 size={21} /> : <Flag size={21} />}</span></div><div className="forecast-value">{fmt(result!.status === 'complete' ? result!.earned : result!.requiredAverage ?? 0)}<span>%</span></div><p className="forecast-message">{result!.status === 'complete' ? t(result!.earned >= selected.target ? 'Цель достигнута по введённым данным.' : 'Итог ниже выбранной цели.', result!.earned >= selected.target ? 'Your target is met based on your inputs.' : 'Your final grade is below your target.') : result!.status === 'secured' ? t('Цель уже набрана по введённой формуле.', 'Your target is already secured by this formula.') : result!.status === 'unreachable' ? t('Больше 100%: выбранная цель пока недостижима.', 'Above 100%: this target is out of reach with these grades.') : t(`В среднем на оставшихся ${pct(100 - result!.completedWeight)} веса курса, чтобы получить ${pct(selected.target)}.`, `As a weighted average across the remaining ${pct(100 - result!.completedWeight)} of the course to reach ${pct(selected.target)}.`)}</p><div className="forecast-bottom"><span><span className="light-dot"/>{t('Оценено', 'Graded')} {pct(result!.completedWeight)} {t('веса', 'of weight')}</span><span>{t('Максимальный итог', 'Best possible')} <strong>{pct(result!.bestPossible)}</strong></span></div><div className="completion-track" aria-label={t(`Оценено ${pct(result!.completedWeight)} веса`, `${pct(result!.completedWeight)} of weight graded`)}><span style={{ width: `${result!.completedWeight}%` }} /></div></section>
              <div className="grade-metrics"><div className="metric"><span>{t('Уже в итоговой оценке', 'Already earned toward final')}</span><strong>{fmt(result!.earned)}<small> / 100</small></strong><p>{t('С учётом веса выполненных работ', 'Including completed assessment weights')}</p></div><div className="metric"><span>{t('Среднее по оценённым', 'Average of graded work')}</span><strong>{result!.currentAverage === null ? '—' : pct(result!.currentAverage)}</strong><p>{t('Без ещё неизвестных результатов', 'Excludes ungraded assessments')}</p></div></div>
              <details className="calculation-note"><summary><CircleHelp size={17} /><span>{t('Как читать прогноз', 'How to read the forecast')}</span><ChevronRight size={17} /></summary><p>{t('Это необходимый средний процент на всём оставшемся весе, а не гарантированный балл на одном экзамене. Работы могут иметь разные результаты. Прогноз предполагает максимум 100% на каждой работе и использует только введённые вами веса.', 'This is the required weighted average across all remaining work, not a guaranteed score for one exam. Individual grades can differ. The forecast assumes a maximum of 100% on each assessment and uses only the weights you entered.')}</p><p>{t('Формула: (цель − уже набранный вклад) ÷ оставшийся вес × 100. Обязательные экзамены, округление и пороги допуска уточните в syllabus.', 'Formula: (target − earned contribution) ÷ remaining weight × 100. Check your syllabus for compulsory exams, rounding and eligibility rules.')}</p></details>
            </>}
            <div className="section-heading"><div><h3>{t('Работы и оценки', 'Assessments & grades')}</h3><span>{selected.assessments.length} {t('из 100', 'of 100')}</span></div><button className="button small secondary" disabled={selected.assessments.length >= 100} onClick={() => setModal({ kind: 'assessment', course: selected })}><Plus size={17} />{t('Добавить', 'Add')}</button></div>
            {selected.assessments.length >= 100 && <p className="limit-note">{t('Достигнут лимит: 100 работ на предмет.', 'The 100-assessment limit for this course has been reached.')}</p>}
            <div className="assessment-list">{selected.assessments.map((a, i) => <article className="assessment-row" key={a.id}><button className="assessment-edit" aria-label={`${t('Редактировать', 'Edit')} ${a.title}`} onClick={() => setModal({ kind: 'assessment', course: selected, assessment: a })}><span className={`assessment-symbol ${a.points === null ? 'pending' : ''}`} style={a.points !== null ? { color: selected.color, background: selected.color + '12' } : undefined}>{a.points === null ? <CalendarDays size={20} /> : <Check size={20} />}</span><span className="assessment-info"><strong>{a.title}</strong><span className="assessment-meta">{pct(a.weight)} {t('веса', 'weight')}{a.dueDate && <><span aria-hidden="true">·</span>{dateLabel(a.dueDate)}</>}</span></span><span className={`assessment-grade ${a.points === null ? 'ungraded' : ''}`}>{a.points === null ? <span>{t('Не оценено', 'Ungraded')}</span> : <><strong>{pct(a.points / a.maxPoints * 100)}</strong><span>{fmt(a.points, 4)} / {fmt(a.maxPoints, 4)}</span></>}</span><Pencil className="row-pencil" size={15} /></button><button className="icon-button row-delete" aria-label={`${t('Удалить', 'Delete')} ${a.title}`} onClick={() => confirmDeleteAssessment(selected, a)}><Trash2 size={17} /></button><span className="sr-only">{i+1}</span></article>)}</div>
            {selected.assessments.length > 0 && <p className="list-footer"><ShieldCheck size={15} />{t('Ваши оценки сохраняются на этом устройстве.', 'Your grades are saved on this device.')}</p>}
          </>}
        </>}
        {tab === 'plan' && <>
          <div className="page-heading"><div><p className="eyebrow">{t('ПО ОДНОЙ РАБОТЕ ЗА РАЗ', 'ONE ASSESSMENT AT A TIME')}</p><h1>{t('План', 'Your plan')}<span className="heading-dot" aria-hidden="true">.</span></h1></div><div className="page-symbol"><CalendarDays size={26} /></div></div>
          <div className="plan-summary"><div><strong>{planned.length}</strong><span>{t('работ со сроком', 'with a due date')}</span></div><div><strong>{pending}</strong><span>{t('ещё не оценено', 'still ungraded')}</span></div></div>
          {planned.length === 0 ? <section className="empty-plan"><div className="empty-symbol"><CalendarDays size={34} /></div><h2>{t('Здесь появятся ваши сроки.', 'Your due dates go here.')}</h2><p>{t('Укажите дату в работе, которая ещё не оценена. План соберёт ближайшие сроки со всех предметов.', 'Add a due date to an ungraded assessment. Your plan will collect upcoming dates across all courses.')}</p><button className="button secondary" onClick={() => setTab('courses')}>{t('Открыть предметы', 'Open courses')}<ArrowRight size={17} /></button></section> : <div className="plan-list">{planned.map(({ course, assessment }) => { const overdue = assessment.dueDate < today; const isToday = assessment.dueDate === today; return <button key={assessment.id} className="plan-row" onClick={() => { setSelectedId(course.id); setModal({ kind: 'assessment', course, assessment }); }}><span className={`date-card ${overdue ? 'overdue' : isToday ? 'today' : ''}`}><strong>{new Date(assessment.dueDate + 'T12:00:00').getDate()}</strong><span>{new Intl.DateTimeFormat(ru ? 'ru-RU' : 'en-US', { month: 'short' }).format(new Date(assessment.dueDate + 'T12:00:00'))}</span></span><span className="plan-row-info"><strong>{assessment.title}</strong><span><i style={{ background: course.color }}/>{course.title}</span>{(overdue || isToday) && <span className={`due-status ${overdue ? 'overdue' : ''}`}>{overdue ? t('Срок прошёл · оценка неизвестна', 'Past due · grade unknown') : t('Сегодня', 'Due today')}</span>}</span><span className="plan-weight">{pct(assessment.weight)}</span><ChevronRight size={18} /></button>; })}</div>}
          <p className="plan-note"><Info size={17} />{t('План — локальный список сроков. Фоновые уведомления не отправляются.', 'Your plan is a local list of dates. No background notifications are sent.')}</p>
        </>}
        {tab === 'settings' && <>
          <div className="page-heading"><div><p className="eyebrow">{t('ВАШИ ДАННЫЕ, ВАШИ ПРАВИЛА', 'YOUR DATA, YOUR CHOICE')}</p><h1>{t('Настройки', 'Settings')}<span className="heading-dot" aria-hidden="true">.</span></h1></div><div className="page-symbol"><ShieldCheck size={26} /></div></div>
          <section className="settings-card"><h2>{t('Язык приложения', 'App language')}</h2><div className="language-options"><button aria-pressed={ru} className={ru ? 'selected' : ''} onClick={() => update(previous => ({ ...previous, language: 'ru' }))}>Русский{ru && <Check size={18} />}</button><button aria-pressed={!ru} className={!ru ? 'selected' : ''} onClick={() => update(previous => ({ ...previous, language: 'en' }))}>English{!ru && <Check size={18} />}</button></div></section>
          <section className="settings-card"><div className="settings-title"><HardDrive size={22} /><h2>{t('Резервная копия', 'Backup & restore')}</h2></div><p>{t('Предметы хранятся только на этом устройстве. Сохраните файл перед сменой телефона или удалением приложения. Файл содержит ваши оценки; передавайте его только тем, кому доверяете.', 'Courses stay on this device. Export a file before changing phones or uninstalling. The file contains your grades; share it only with people you trust.')}</p><div className="settings-actions"><button className="button secondary" disabled={actionBusy} onClick={() => void safeAction(() => exportBackup(data))}><ArrowDownToLine size={18} />{t('Экспорт JSON', 'Export JSON')}</button><button className="button secondary" disabled={actionBusy} onClick={() => importRef.current?.click()}><ArrowUpFromLine size={18} />{t('Импорт JSON', 'Import JSON')}</button></div><p className="setting-caption">{t('Формат GradeDock · до 4 МБ · импорт заменяет текущие данные', 'GradeDock format · up to 4 MB · importing replaces current data')}</p><input ref={importRef} className="sr-only" type="file" accept=".json,application/json" aria-label={t('Выбрать резервную копию', 'Choose backup file')} onChange={e => void importFile(e.target.files?.[0])} tabIndex={-1}/></section>
          <section className="privacy-card"><div className="privacy-badge"><ShieldCheck size={27} /></div><div><h2>{t('Оценки остаются у вас.', 'Your grades stay yours.')}</h2><p>{t('Нет регистрации, рекламы и сетевой аналитики. Приложение не отправляет ваши предметы и оценки на сервер.', 'No account, ads or network analytics. The app does not send your courses or grades to a server.')}</p><button className="inline-link" onClick={() => setModal({ kind: 'privacy' })}>{t('Конфиденциальность', 'Privacy details')}<ArrowRight size={16} /></button></div></section>
          <section className="settings-card"><h2>{t('Помощь и диагностика', 'Help & diagnostics')}</h2><p>{t('Если что-то не работает, можно экспортировать журнал ошибок и отправить его самостоятельно. Журнал содержит только коды ошибок, время и платформу; оценки и названия предметов в него не входят. Автоматической отправки нет.', 'If something goes wrong, export an error log and send it yourself. It contains only error codes, timestamps and platform; no grades or course names. Nothing is sent automatically.')}</p><button className="button secondary" disabled={actionBusy} onClick={() => void safeAction(exportDiagnostics)}><Download size={18} />{t('Экспорт диагностики', 'Export diagnostics')}</button><a className="support-link" href="mailto:zalewko@gmail.com"><Mail size={18}/>zalewko@gmail.com<ArrowRight size={16}/></a></section>
          <section className="settings-card danger-card"><h2>{t('Удаление данных', 'Delete your data')}</h2><p>{t('Очистите предметы и оценки на этом устройстве. Экспортированные вами файлы остаются у вас — удалите их отдельно, если нужно.', 'Clear courses and grades from this device. Files you exported remain yours — delete those separately if needed.')}</p><button className="button text-danger" onClick={requestReset}><Trash2 size={18} />{t('Удалить все предметы', 'Delete all courses')}</button></section>
          <footer className="settings-footer"><span>GradeDock 1.0.0</span><button className="document-link" onClick={() => setModal({ kind: 'document', document: 'licenses' })}>{t('Лицензии компонентов', 'Component licenses')}</button><a href="https://github.com/ZaleshSultan" target="_blank" rel="noreferrer">{t('Разработчик', 'Developer')} ↗</a><span>{t('До 30 предметов · 100 работ на предмет', 'Up to 30 courses · 100 assessments per course')}</span></footer>
        </>}
      </>}
    </main>
    {!loadFailed && <nav className="bottom-nav" aria-label={t('Главная навигация', 'Main navigation')}>{([{ id: 'courses', icon: BookOpen, label: t('Предметы', 'Courses') }, { id: 'plan', icon: CalendarDays, label: t('План', 'Plan') }, { id: 'settings', icon: ShieldCheck, label: t('Настройки', 'Settings') }] as const).map(({ id, icon: Icon, label }) => <button key={id} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); window.scrollTo({ top: 0, behavior: 'instant' }); }}><Icon size={22} strokeWidth={tab === id ? 2.2 : 1.7}/><span>{label}</span></button>)}</nav>}
    {saving && !saveFailed && <span className="saving-indicator" role="status"><LoaderCircle size={13} className="spin" />{t('Сохранение…', 'Saving…')}</span>}
    {modal && <Modal title={modal.kind === 'course' ? (modal.course ? t('Настроить предмет', 'Edit course') : t('Новый предмет', 'New course')) : modal.kind === 'assessment' ? (modal.assessment ? t('Настроить работу', 'Edit assessment') : t('Новая работа', 'New assessment')) : modal.kind === 'confirm' ? modal.title : modal.kind === 'document' ? (modal.document === 'privacy' ? t('Политика конфиденциальности', 'Privacy policy') : t('Лицензии компонентов', 'Component licenses')) : t('Конфиденциальность', 'Privacy')} onClose={() => setModal(null)}>
      {modal.kind === 'course' && <CourseForm course={modal.course} ru={ru} onSubmit={course => { if (modal.course) replaceCourse(course); else if (data.courses.length < 30) { update(previous => ({ ...previous, courses: [...previous.courses, course] })); setSelectedId(course.id); } setModal(null); }} onDelete={() => { if (modal.course) confirmDeleteCourse(modal.course); }} />}
      {modal.kind === 'assessment' && <AssessmentForm assessment={modal.assessment} ru={ru} onSubmit={assessment => { const course = data.courses.find(c => c.id === modal.course.id); if (course && (modal.assessment || course.assessments.length < 100)) replaceCourse({ ...course, assessments: modal.assessment ? course.assessments.map(a => a.id === assessment.id ? assessment : a) : [...course.assessments, assessment] }); setModal(null); }} onDelete={() => { if (modal.assessment) confirmDeleteAssessment(modal.course, modal.assessment); }} />}
      {modal.kind === 'confirm' && <div className="confirmation"><p>{modal.body}</p><div className="confirmation-actions"><button data-initial-focus className="button secondary" onClick={() => setModal(null)}>{t('Отмена', 'Cancel')}</button><button className={`button ${modal.danger ? 'danger' : 'primary'}`} onClick={modal.run}>{modal.action}</button></div></div>}
      {modal.kind === 'privacy' && <div className="privacy-copy"><p>{t('GradeDock хранит названия предметов, цели, оценки, веса, сроки и язык локально на устройстве. Учётная запись не нужна.', 'GradeDock stores course names, targets, grades, weights, due dates and language locally on your device. No account is required.')}</p><p>{t('В приложении нет рекламы, трекеров или автоматической передачи данных. Резервную копию и диагностику вы экспортируете самостоятельно; при выборе другого приложения для отправки действуют правила этого приложения.', 'There are no ads, trackers or automatic data uploads. You choose to export backups and diagnostics; if you share them through another app, that app’s privacy terms apply.')}</p><p>{t('Удаление данных доступно в настройках. Ранее экспортированные файлы нужно удалить отдельно. Автоматическое облачное копирование Android отключено. Для удаления локальной копии восстановления и кэша очистите хранилище приложения в настройках Android.', 'You can delete app data in Settings. Previously exported files must be deleted separately. Automatic Android cloud backup is disabled. Clear app storage in Android Settings to remove local recovery and cache files as well.')}</p><button className="button secondary wide" onClick={() => setModal({ kind: 'document', document: 'privacy' })}>{t('Политика конфиденциальности', 'Privacy policy')}<ArrowRight size={17}/></button><a className="support-link" href="mailto:zalewko@gmail.com"><Mail size={18} />zalewko@gmail.com</a></div>}
      {modal.kind === 'document' && <iframe className="document-frame" title={modal.document === 'privacy' ? t('Политика конфиденциальности', 'Privacy policy') : t('Лицензии компонентов', 'Component licenses')} src={modal.document === 'privacy' ? './privacy.html' : './third-party-notices.txt'} sandbox="" />}
    </Modal>}
  </div>;
}
