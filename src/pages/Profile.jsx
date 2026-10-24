import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { deleteAccount, getProfile, removeAvatar, updateNewPerDay, uploadAvatar } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Btn, ErrorBox, Field, PageTitle, Spinner, fieldCls } from '../components/ui';

const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

export default function Profile() {
  const { user, signOut } = useAuth();
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
  if (!profile) return <Spinner label="Loading your profile" />;

  const initial = (user?.email?.[0] || '?').toUpperCase();

  const pickAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Choose an image file.');
    if (file.size > 2 * 1024 * 1024) return setError('That image is larger than 2 MB. Pick a smaller one.');
    setBusy('avatar');
    setError('');
    setNote('');
    try {
      const url = await uploadAvatar(file);
      setProfile((p) => ({ ...p, avatar_url: url }));
      setNote('Avatar updated.');
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
      setNote('Avatar removed.');
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
      setNote('Daily limit saved.');
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
    else setNote(`We sent a password reset email to ${user.email}.`);
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
      <PageTitle>Profile</PageTitle>

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
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-mist">Birth date</dt>
                <dd className="font-semibold">{fmtDate(profile.birth_date)}</dd>
              </div>
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-mist">Member since</dt>
                <dd className="font-semibold">{fmtDate(profile.created_at)}</dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
              <Btn variant="glass" onClick={() => fileRef.current?.click()} disabled={busy === 'avatar'}>
                {busy === 'avatar' ? 'Working…' : profile.avatar_url ? 'Change photo' : 'Upload photo'}
              </Btn>
              {profile.avatar_url && (
                <Btn variant="glass" onClick={clearAvatar} disabled={busy === 'avatar'}>Remove photo</Btn>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickAvatar} />
            </div>
            <p className="mt-2 text-xs text-mist">JPG or PNG, up to 2 MB.</p>
          </div>
        </div>
      </section>

      {/* Studying */}
      <section className="glass rounded-3xl p-6 sm:p-8">
        <h2 className="text-xl font-extrabold">Studying</h2>
        <p className="mt-1 text-sm text-mist">How many unseen cards can enter your queue each day.</p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <Field label="New cards per day">
            <input
              type="number"
              min="0"
              max="200"
              className={`${fieldCls} w-32`}
              value={perDay}
              onChange={(e) => setPerDay(Math.max(0, Math.min(200, Number(e.target.value) || 0)))}
            />
          </Field>
          <Btn onClick={saveLimit} disabled={busy === 'limit'}>{busy === 'limit' ? 'Saving…' : 'Save'}</Btn>
        </div>
      </section>

      {/* Account */}
      <section className="glass rounded-3xl p-6 sm:p-8">
        <h2 className="text-xl font-extrabold">Account</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Btn variant="glass" onClick={sendReset} disabled={busy === 'password'}>
            {busy === 'password' ? 'Sending…' : 'Reset password by email'}
          </Btn>
          <Btn variant="glass" onClick={signOut}>Log out</Btn>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-3xl border border-rose/30 bg-rose/5 p-6 sm:p-8">
        <h2 className="text-xl font-extrabold text-rose">Delete account</h2>
        <p className="mt-2 text-sm text-mist">
          This removes your account along with every deck, card and review record. It cannot be undone.
        </p>

        {!confirming ? (
          <Btn variant="danger" className="mt-5" onClick={() => setConfirming(true)}>Delete my account</Btn>
        ) : (
          <div className="mt-5 space-y-4">
            <Field label="Type DELETE to confirm">
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
                {busy === 'delete' ? 'Deleting…' : 'Delete permanently'}
              </Btn>
              <Btn variant="glass" onClick={() => { setConfirming(false); setConfirmText(''); }}>Cancel</Btn>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}