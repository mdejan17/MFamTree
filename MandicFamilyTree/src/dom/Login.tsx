import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header.tsx'
import Footer from '../components/Footer.tsx'
import { useAuth } from '../auth/AuthContext.tsx'
import { ApiRequestError } from '../api/client.ts'
import { useLocale } from '../i18n/LocaleContext.tsx'
import style from './modules/Login.module.css'

function Login() {
  const { login, signup } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password, displayName || undefined);
      }
      navigate('/');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError(t('login.genericError'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={style.rootDiv}>
      <Header></Header>
      <div className={style.content}>
        <div className={style.card}>
          <h1>{mode === 'login' ? t('login.logIn') : t('login.createAccount')}</h1>
          <form className={style.form} onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className={style.field}>
                <label htmlFor="displayName">{t('login.name')}</label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t('login.namePlaceholder')}
                />
              </div>
            )}
            <div className={style.field}>
              <label htmlFor="email">{t('login.email')}</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
              />
            </div>
            <div className={style.field}>
              <label htmlFor="password">{t('login.password')}</label>
              <input
                id="password"
                type="password"
                required
                minLength={mode === 'signup' ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? t('login.passwordPlaceholderSignup') : t('login.passwordPlaceholder')}
              />
            </div>
            {error && <p className={style.error}>{error}</p>}
            <button className={style.submit} type="submit" disabled={submitting}>
              {submitting ? t('login.pleaseWait') : mode === 'login' ? t('login.logIn') : t('login.createAccount')}
            </button>
          </form>
          <p className={style.toggle}>
            {mode === 'login' ? (
              <>
                {t('login.noAccount')}{' '}
                <button type="button" onClick={() => { setMode('signup'); setError(null); }}>
                  {t('login.createOne')}
                </button>
              </>
            ) : (
              <>
                {t('login.haveAccount')}{' '}
                <button type="button" onClick={() => { setMode('login'); setError(null); }}>
                  {t('login.logIn')}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
      <Footer></Footer>
    </div>
  )
}
export default Login
