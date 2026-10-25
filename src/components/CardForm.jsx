import { useState } from 'react';
import { Btn, ErrorBox, Field, fieldCls } from './ui';
import { useLang } from '../lib/i18n';

const empty = { term: '', definition: '' };

export default function CardForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [f, setF] = useState(initial ? { ...empty, ...initial } : empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLang();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.term.trim() && f.definition.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit(f);
      if (!onCancel) setF(empty);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label={t("card.term")}>
        <input autoFocus className={fieldCls} value={f.term} onChange={set('term')} placeholder="mitigate" />
      </Field>
      <Field label={t("card.definition")}>
        <input className={fieldCls} value={f.definition} onChange={set('definition')} placeholder="to make something less severe" />
      </Field>
      <div className="sm:col-span-2">
        <ErrorBox>{error}</ErrorBox>
        <div className="mt-2 flex gap-3">
          <Btn type="submit" disabled={!valid || busy}>{busy ? t('common.saving') : submitLabel}</Btn>
          {onCancel && <Btn variant="glass" onClick={onCancel}>{t('common.cancel')}</Btn>}
        </div>
      </div>
    </form>
  );
}
