import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardPaste, KeyRound, Power, Search, UserPlus, Users, XCircle } from 'lucide-react';
import { storage } from '../lib/storage.js';
import { formatDate, parseBulkTeachers } from '../lib/utils.js';
import { Alert, PasswordInput, SectionCard } from '../components/ui.jsx';

function CreateTeacherForm({ superPassword, reload, onAuthError }) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setMessage(null);
    if (!fullName.trim()) return setMessage({ tone: 'error', text: 'Full name is required.' });
    if (!/^[a-z0-9._-]{3,40}$/.test(username.trim().toLowerCase())) {
      return setMessage({ tone: 'error', text: 'Username must be 3–40 characters: letters, numbers, dot, dash or underscore.' });
    }
    if (password.length < 6) return setMessage({ tone: 'error', text: 'Password must be at least 6 characters.' });
    setBusy(true);
    try {
      const teacher = await storage.superCreateTeacher(superPassword, fullName.trim(), username.trim().toLowerCase(), password);
      setMessage({ tone: 'success', text: `Created ${teacher.full_name} (${teacher.username}).` });
      setFullName('');
      setUsername('');
      setPassword('');
      reload();
    } catch (err) {
      if (!onAuthError(err)) setMessage({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="Create Teacher Account" icon={UserPlus}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="t-name" className="label">
            Full Name
          </label>
          <input id="t-name" className="input" placeholder="e.g. Mr. Tonkla" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="t-user" className="label">
              Username
            </label>
            <input
              id="t-user"
              className="input"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="e.g. tonkla"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="t-pass" className="label">
              Password
            </label>
            <PasswordInput id="t-pass" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min. 6 characters" />
          </div>
        </div>
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        <button type="submit" className="btn-primary" disabled={busy}>
          <UserPlus className="h-4 w-4" /> {busy ? 'Creating…' : 'Create teacher'}
        </button>
      </form>
    </SectionCard>
  );
}

function BulkImport({ superPassword, reload, onAuthError }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const parsed = useMemo(() => parseBulkTeachers(text), [text]);

  const submit = async () => {
    setError(null);
    setResults(null);
    if (parsed.valid.length === 0) {
      setResults(parsed.errors.map((e) => ({ line: e.line, username: '', status: 'error', message: e.message, raw: e.raw })));
      setError('No valid lines to import.');
      return;
    }
    setBusy(true);
    try {
      const response = await storage.superBulkCreateTeachers(superPassword, parsed.valid);
      const serverRows = (response.results || []).map((r) => ({ ...r }));
      const clientRows = parsed.errors.map((e) => ({ line: e.line, username: '', full_name: '', status: 'error', message: e.message, raw: e.raw }));
      setResults([...serverRows, ...clientRows].sort((a, b) => a.line - b.line));
      if (response.created > 0) {
        // Keep only failed lines in the textarea so they can be fixed and re-submitted.
        const failedLines = new Set([...serverRows.filter((r) => r.status !== 'created'), ...clientRows].map((r) => r.line));
        setText(
          text
            .split(/\r?\n/)
            .filter((_, i) => failedLines.has(i + 1))
            .join('\n'),
        );
      }
      reload();
    } catch (err) {
      if (!onAuthError(err)) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const created = results?.filter((r) => r.status === 'created').length || 0;
  const failed = results ? results.length - created : 0;

  return (
    <SectionCard
      title="Bulk Import Teachers"
      icon={ClipboardPaste}
      description="Paste one teacher per line: Full Name, username, password"
    >
      <textarea
        className="input min-h-[10rem] font-mono text-sm"
        placeholder={'Mr. Tonkla, tonkla, Sunny2026!\nMs. Ploy, ploy, Blue#Lynx9\n"Smith, John", jsmith, Tiger-Roar7'}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setResults(null);
          setError(null);
        }}
        spellCheck={false}
        aria-label="Teachers CSV"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-stone-500">
          <span className="font-semibold text-emerald-700">{parsed.valid.length} valid</span>
          {parsed.errors.length > 0 && <span className="font-semibold text-red-700"> · {parsed.errors.length} with problems</span>}
        </p>
        <button type="button" className="btn-primary" onClick={submit} disabled={busy || (!parsed.valid.length && !parsed.errors.length)}>
          <Users className="h-4 w-4" /> {busy ? 'Importing…' : `Create ${parsed.valid.length} teacher${parsed.valid.length === 1 ? '' : 's'}`}
        </button>
      </div>
      {error && (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      )}
      {results && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-stone-700">
            Import summary: <span className="text-emerald-700">{created} created</span>, <span className="text-red-700">{failed} failed</span>
          </p>
          <ul className="max-h-72 divide-y divide-stone-100 overflow-y-auto rounded-md ring-1 ring-stone-200">
            {results.map((r) => (
              <li key={`${r.line}-${r.username}`} className="flex items-start gap-2 px-3 py-2 text-sm">
                {r.status === 'created' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Created" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-label="Error" />
                )}
                <span className="w-14 shrink-0 tabular-nums text-stone-500">Line {r.line}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-stone-800">{r.full_name || r.raw || ''}</span>
                  {r.username && <span className="text-stone-500"> ({r.username})</span>}
                  <span className={`block text-xs ${r.status === 'created' ? 'text-emerald-700' : 'text-red-700'}`}>{r.message}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}

function TeacherRow({ teacher, superPassword, reload, onAuthError, onMessage }) {
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const call = async (active, password, successText) => {
    setBusy(true);
    try {
      await storage.superManageTeacher(superPassword, teacher.id, active, password);
      onMessage({ tone: 'success', text: successText });
      setResetting(false);
      setNewPassword('');
      reload();
    } catch (err) {
      if (!onAuthError(err)) onMessage({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="align-top hover:bg-stone-50">
      <td className="px-3 py-2.5 font-semibold text-stone-900">{teacher.full_name}</td>
      <td className="px-3 py-2.5 font-mono text-stone-700">{teacher.username}</td>
      <td className="px-3 py-2.5">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${
            teacher.active ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-stone-100 text-stone-600 ring-stone-300'
          }`}
        >
          {teacher.active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-stone-600">{formatDate(teacher.created_at)}</td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap justify-end gap-1.5">
          <button
            type="button"
            className={`btn px-2.5 py-1.5 text-xs ring-1 ${
              teacher.active ? 'bg-white text-red-700 ring-red-200 hover:bg-red-50' : 'bg-white text-emerald-700 ring-emerald-200 hover:bg-emerald-50'
            }`}
            disabled={busy}
            onClick={() =>
              call(!teacher.active, null, `${teacher.full_name} ${teacher.active ? 'deactivated' : 'activated'}.`)
            }
          >
            <Power className="h-3.5 w-3.5" /> {teacher.active ? 'Deactivate' : 'Activate'}
          </button>
          <button type="button" className="btn-secondary px-2.5 py-1.5 text-xs" disabled={busy} onClick={() => setResetting((v) => !v)}>
            <KeyRound className="h-3.5 w-3.5" /> Reset password
          </button>
        </div>
        {resetting && (
          <form
            className="mt-2 flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (newPassword.length < 6) {
                onMessage({ tone: 'error', text: 'Password must be at least 6 characters.' });
                return;
              }
              call(null, newPassword, `Password reset for ${teacher.full_name}.`);
            }}
          >
            <PasswordInput
              aria-label={`New password for ${teacher.full_name}`}
              className="input py-1.5 text-sm"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn-primary px-3 py-1.5 text-xs" disabled={busy}>
              Save
            </button>
          </form>
        )}
      </td>
    </tr>
  );
}

export default function TeachersPanel({ superPassword, teachers, loading, reload, onAuthError }) {
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState(null);
  const filtered = teachers.filter((t) => `${t.full_name} ${t.username}`.toLowerCase().includes(query.trim().toLowerCase()));
  const activeCount = teachers.filter((t) => t.active).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <CreateTeacherForm superPassword={superPassword} reload={reload} onAuthError={onAuthError} />
        <BulkImport superPassword={superPassword} reload={reload} onAuthError={onAuthError} />
      </div>

      <SectionCard
        title="Manage Teachers"
        icon={Users}
        description={`${teachers.length} account${teachers.length === 1 ? '' : 's'} · ${activeCount} active. Deactivated teachers cannot log in; their names stay on past point logs.`}
        actions={
          <label className="relative w-full sm:w-64">
            <span className="sr-only">Search teachers</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input className="input pl-9" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        }
      >
        {message && (
          <Alert tone={message.tone} className="mb-3">
            {message.text}
          </Alert>
        )}
        {loading ? (
          <p className="animate-pulse text-sm text-stone-500">Loading teachers…</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-md bg-stone-50 p-6 text-center text-sm text-stone-500">
            {teachers.length ? 'No teachers match your search.' : 'No teacher accounts yet — create one above.'}
          </p>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[42rem] text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                  <th className="px-3 py-2 font-semibold">Full Name</th>
                  <th className="px-3 py-2 font-semibold">Username</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Created</th>
                  <th className="px-3 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((t) => (
                  <TeacherRow
                    key={t.id}
                    teacher={t}
                    superPassword={superPassword}
                    reload={reload}
                    onAuthError={onAuthError}
                    onMessage={setMessage}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
