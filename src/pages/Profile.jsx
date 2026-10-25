import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { deleteAccount, getProfile, removeAvatar, updateNewPerDay, uploadAvatar } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Btn, ErrorBox, Field, PageTitle, Spinner, fieldCls } from '../components/ui';
import { formatDate, useLang } from '../lib/i18n';

const fmtDate = (v, lang) => (v ? formatDate(lang, new Date(v)) : '—');

export default function Profile() {
  const { user, signOut } = useAuth();
  const { lang, t } = useLang();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [perDay, setPerDay] = useState(20);
  const [busy, setBusy] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [confirming, setConfirming] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    getProfile()
      .then((p) => {
        setProfile(p);
        setPerDay(p?.new_per_day ?? 20);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error && !profile) return <ErrorBox>{error}</ErrorBox>;
  if (!profile) return <Spinner label={t('profile.loading')} />;

  const initial = (user?.email?.[0] || '?').toUpperCase();

  const pickAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError(t('profile.notImage'));
    if (file.size > 2 * 1024 * 1024) return setError(t('profile.tooBig'));
    setBusy('avatar');
    setError('');
    setNote('');
    try {
      const url = await uploadAvatar(file);
      setProfile((p) => ({ ...p, avatar_url: url }));
      setNote(t('profile.avatarUpdated'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const clearAvatar = async () => {
    setBusy('avatar');
    setError('');
    setNote('');
    try {
      await removeAvatar();
      setProfile((p) => ({ ...p, avatar_url: null }));
      setNote(t('profile.avatarRemoved'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const saveLimit = async () => {
    setBusy('limit');
    setError('');
    setNote('');
    try {
      await updateNewPerDay(perDay);
      setNote(t('profile.limitSaved'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const sendReset = async () => {
    setBusy('password');
    setError('');
    setNote('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(user.email);
    setBusy('');
    if (resetError) setError(resetError.message);
    else setNote(t('profile.resetSent', { email: user.email }));
  };

  const removeAccount = async () => {
    setBusy('delete');
    setError('');
    try {
      await deleteAccount();
      await signOut();
    } catch (err) {
      setError(err.message);
      setBusy('');
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <PageTitle>{t('nav.profile')}</PageTitle>

      {note && <p role="status" className="rounded-xl bg-leaf/15 px-4 py-3 text-sm text-[#a6ee86]">{note}</p>}
      <ErrorBox>{error}</ErrorBox>

      {/* Avatar va asosiy ma'lumot */}
      <section className="glass rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-28 w-28 rounded-full border border-white/15 object-cover"
              />
            ) : (
              <span className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-4xl font-extrabold" aria-hidden="true">
                {initial}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="break-words text-xl font-bold">{user?.email}</p>
            <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              {profile.username && (
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-mist">{t('auth.username')}</dt>
                  <dd className="font-semibold">@{profile.username}</dd>
                </div>
              )}
              {profile.birth_date && (
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-mist">{t('profile.birth')}</dt>
                  <dd className="font-semibold">{fmtDate(profile.birth_date, lang)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-mist">{t('profile.since')}</dt>
                <dd className="font-semibold">{fmtDate(profile.created_at, lang)}</dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
              <Btn variant="glass" onClick={() => fileRef.current?.click()} disabled={busy === 'avatar'}>
                {busy === 'avatar' ? t('profile.working') : profile.avatar_url ? t('profile.changePhoto') : t('profile.uploadPhoto')}
              </Btn>
              {profile.avatar_url && (
                <Btn variant="glass" onClick={clearAvatar} disabled={busy === 'avatar'}>{t('profile.removePhoto')}</Btn>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickAvatar} />
            </div>
            <p className="mt-2 text-xs text-mist">{t('profile.photoHint')}</p>
          </div>
        </div>
      </section>

      {/* Studying */}
      <section className="glass rounded-3xl p-6 sm:p-8">
        <h2 className="text-xl font-extrabold">{t('profile.studying')}</h2>
        <p className="mt-1 text-sm text-mist">{t('profile.studyingHint')}</p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <Field label={t('profile.perDay')}>
            <input
              type="number"
              min="0"
              max="200"
              className={`${fieldCls} w-32`}
              value={perDay}
              onChange={(e) => setPerDay(Math.max(0, Math.min(200, Number(e.target.value) || 0)))}
            />
          </Field>
          <Btn onClick={saveLimit} disabled={busy === 'limit'}>{busy === 'limit' ? t('common.saving') : t('common.save')}</Btn>
        </div>
      </section>

      {/* Account */}
      <section className="glass rounded-3xl p-6 sm:p-8">
        <h2 className="text-xl font-extrabold">{t('auth.account')}</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Btn variant="glass" onClick={sendReset} disabled={busy === 'password'}>
            {busy === 'password' ? t('profile.sending') : t('profile.reset')}
          </Btn>
          <Btn variant="glass" onClick={signOut}>{t('profile.logout')}</Btn>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-3xl border border-rose/30 bg-rose/5 p-6 sm:p-8">
        <h2 className="text-xl font-extrabold text-rose">{t('profile.delete')}</h2>
        <p className="mt-2 text-sm text-mist">
          {t('profile.deleteHint')}
        </p>

        {!confirming ? (
          <Btn variant="danger" className="mt-5" onClick={() => setConfirming(true)}>{t('profile.deleteMine')}</Btn>
        ) : (
          <div className="mt-5 space-y-4">
            <Field label={t('profile.typeDelete')}>
              <input
                autoFocus
                className={`${fieldCls} max-w-xs`}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </Field>
            <div className="flex flex-wrap gap-3">
              <Btn variant="danger" onClick={removeAccount} disabled={confirmText !== 'DELETE' || busy === 'delete'}>
                {busy === 'delete' ? t('profile.deleting') : t('profile.deleteForever')}
              </Btn>
              <Btn variant="glass" onClick={() => { setConfirming(false); setConfirmText(''); }}>{t('common.cancel')}</Btn>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}