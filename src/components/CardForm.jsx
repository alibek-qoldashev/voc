import { useState } from 'react';
import { Btn, ErrorBox, Field, fieldCls } from './ui';

const empty = { term: '', translation: '', definition: '', example: '' };

export default function CardForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [f, setF] = useState(initial ? { ...empty, ...initial } : empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.term.trim() && (f.definition.trim() || f.translation.trim());

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
      <Field label="Term">
        <input autoFocus className={fieldCls} value={f.term} onChange={set('term')} placeholder="mitigate" />
      </Field>
      <Field label="Translation (Uzbek)">
        <input className={fieldCls} value={f.translation} onChange={set('translation')} placeholder="yengillashtirmoq" />
      </Field>
      <Field label="Definition">
        <input className={fieldCls} value={f.definition} onChange={set('definition')} placeholder="to make something less severe" />
      </Field>
      <Field label="Example sentence">
        <input className={fieldCls} value={f.example} onChange={set('example')} placeholder="Trees help mitigate pollution." />
      </Field>
      <div className="sm:col-span-2">
        <ErrorBox>{error}</ErrorBox>
        <div className="mt-2 flex gap-3">
          <Btn type="submit" disabled={!valid || busy}>{busy ? 'Saving…' : submitLabel}</Btn>
          {onCancel && <Btn variant="glass" onClick={onCancel}>Cancel</Btn>}
        </div>
      </div>
    </form>
  );
}
