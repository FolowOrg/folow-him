import { createClient } from '@supabase/supabase-js'
import './styles.css'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Check Vercel environment variables.')
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

const root = document.getElementById('root')

const state = {
  session: null,
  view: 'home',
  profile: null,
  content: null,
  authMode: 'login',
  recoveryMode: false
}

const prayerCategories = [
  'Family',
  'Marriage',
  'Children',
  'Work & Purpose',
  'Finances',
  'Personal Growth',
  'Other'
]

async function loadSession() {
  const {
    data: { session }
  } = await supabase.auth.getSession()

  state.session = session

  if (session) {
    await Promise.all([
      loadProfile(),
      loadToday()
    ])
  }

  await render()
}

async function loadProfile() {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', state.session.user.id)
    .maybeSingle()

  state.profile = data
}

async function loadToday() {
  const date = new Date().toISOString().slice(0, 10)

  const { data } = await supabase
    .from('daily_content')
    .select('*')
    .eq('content_date', date)
    .maybeSingle()

  state.content = data
}

function esc(s = '') {
  return String(s).replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[c])
  )
}

function formatDate(dateValue) {
  if (!dateValue) return ''

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return esc(dateValue)
  }

  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

function authView() {
  if (state.recoveryMode) {
    return `<main class="auth">
      <div class="mark">❧</div>
      <h1>Folow Him</h1>
      <p class="tag">Create a new password for your account.</p>

      <section class="card">
        <form id="recoveryForm">

          <label>
            New password
            <input
              id="newPassword"
              type="password"
              minlength="8"
              required
              autocomplete="new-password"
              placeholder="At least 8 characters"
            >
          </label>

          <label>
            Confirm new password
            <input
              id="confirmPassword"
              type="password"
              minlength="8"
              required
              autocomplete="new-password"
              placeholder="Enter your password again"
            >
          </label>

          <button class="primary" type="submit">
            Save new password
          </button>

          <p id="recoveryMsg" class="msg" aria-live="polite"></p>

        </form>
      </section>
    </main>`
  }

  return `<main class="auth">

    <div class="mark">❧</div>

    <h1>Folow Him</h1>

    <p class="tag">
      A gentle place to pray, reflect, and remember His faithfulness.
    </p>

    <section class="card">

      <div class="tabs">

        <button
          id="loginTab"
          class="${state.authMode === 'login' ? 'active' : ''}"
        >
          Sign in
        </button>

        <button
          id="signupTab"
          class="${state.authMode === 'signup' ? 'active' : ''}"
        >
          Create account
        </button>

      </div>

      <form id="authForm">

        <label>
          Email
          <input
            id="email"
            type="email"
            required
            autocomplete="email"
            placeholder="you@example.com"
          >
        </label>

        <label>
          Password
          <input
            id="password"
            type="password"
            minlength="8"
            required
            autocomplete="current-password"
            placeholder="At least 8 characters"
          >
        </label>

        <button class="primary" type="submit">
          Continue
        </button>

        <button
          type="button"
          class="link"
          id="reset"
        >
          Forgot your password?
        </button>

        <p
          id="authMsg"
          class="msg"
          aria-live="polite"
        ></p>

      </form>

    </section>

  </main>`
}

function recoveryView() {
  return `<main class="auth">

    <div class="mark">❧</div>

    <h1>Folow Him</h1>

    <p class="tag">
      Choose a new password for your account.
    </p>

    <section class="card">

      <form id="recoveryForm">

        <label>
          New password
          <input
            id="newPassword"
            type="password"
            minlength="8"
            required
            placeholder="At least 8 characters"
          >
        </label>

        <label>
          Confirm new password
          <input
            id="confirmPassword"
            type="password"
            minlength="8"
            required
            placeholder="Enter it again"
          >
        </label>

        <button class="primary" type="submit">
          Update password
        </button>

        <p
          id="recoveryMsg"
          class="msg"
          aria-live="polite"
        ></p>

      </form>

    </section>

  </main>`
}

function shell(content) {
  return `<div class="app-shell">

    <header>

      <div class="brand">
        <span class="leaf">❧</span>
        <span>Folow Him</span>
      </div>

      <button
        class="ghost"
        id="signout"
      >
        Sign out
      </button>

    </header>

    ${content}

    <nav class="bottom-nav">

      <button data-view="home">
        Today
      </button>

      <button data-view="journal">
        Journal
      </button>

      <button data-view="prayers">
        Prayers
      </button>

      <button data-view="profile">
        Profile
      </button>

    </nav>

  </div>`
}

async function homeView() {
  const c = state.content

  return `<main>

    <div class="welcome">

      <p class="eyebrow">
        TODAY
      </p>

      <h2>
        Come away and be still.
      </h2>

      <p>
        ${new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        })}
      </p>

    </div>

    ${
      c
        ? `<section class="scripture">

            <p class="eyebrow">
              TODAY'S SCRIPTURE
            </p>

            <blockquote>
              “${esc(c.scripture_text)}”
            </blockquote>

            <strong>
              ${esc(c.scripture_reference)}
            </strong>

          </section>`
        : `<section class="card">

            <h3>
              Your first daily prayer is coming.
            </h3>

            <p>
              Add daily content from your admin library
              to personalize this screen.
            </p>

          </section>`
    }

    ${
      c?.reflection_prompt
        ? `<section class="card">

            <p class="eyebrow">
              TODAY'S REFLECTION
            </p>

            <h3>
              ${esc(c.reflection_prompt)}
            </h3>

            <button
              class="secondary"
              data-view="journal"
            >
              Reflect in your journal
            </button>

          </section>`
        : ''
    }

    <section class="grid">

      <div class="card">

        <p class="eyebrow">
          PRAYER PROMPT
        </p>

        <h3>
          ${esc(
            c?.prayer_prompt ||
            'What is on your heart today?'
          )}
        </h3>

        <button
          class="primary"
          data-view="journal"
        >
          Start journaling
        </button>

      </div>

      <div class="card">

        <p class="eyebrow">
          FAITHFULNESS
        </p>

        <h3>
          Remember what God has done.
        </h3>

        <button
          class="secondary"
          data-view="prayers"
        >
          View answered prayers
        </button>

      </div>

    </section>

  </main>`
}

async function journalView() {
  const {
    data: entries = []
  } = await supabase
    .from('journal_entries')
    .select('*')
    .order('entry_date', {
      ascending: false
    })
    .limit(30)

  const c = state.content

  return `<main>

    <div class="section-title">

      <p class="eyebrow">
        JOURNAL
      </p>

      <h2>
        Your quiet place.
      </h2>

    </div>

    ${
      c?.reflection_prompt
        ? `<section class="scripture">

            <p class="eyebrow">
              TODAY'S REFLECTION
            </p>

            <blockquote>
              ${esc(c.reflection_prompt)}
            </blockquote>

            ${
              c.theme
                ? `<strong>
                    ${esc(c.theme)}
                  </strong>`
                : ''
            }

          </section>`
        : ''
    }

    <section class="card">

      <form id="journalForm">

        <label>
          Title

          <input
            id="jtitle"
            placeholder="What is on your heart?"
          >
        </label>

        <label>
          Prayer / reflection

          <textarea
            id="jbody"
            rows="7"
            required
            placeholder="Write freely..."
          ></textarea>
        </label>

        <button
          type="button"
          class="secondary"
          id="journalVoice"
        >
          🎙 Speak your entry
        </button>

        <button
          class="primary"
          type="submit"
        >
          Save entry
        </button>

        <p
          id="journalVoiceMsg"
          class="msg"
          aria-live="polite"
        ></p>

        <p
          id="journalMsg"
          class="msg"
        ></p>

      </form>

    </section>

    <div class="list">

      ${
        entries.map(e => `
          <article class="entry">

            <small>
              ${formatDate(e.entry_date)}
            </small>

            <h3>
              ${esc(
                e.title ||
                'Prayer journal'
              )}
            </h3>

            <p>
              ${esc(
                e.body || ''
              ).slice(0, 320)}
            </p>

          </article>
        `).join('')
        ||
        '<p class="muted">Your first entry can begin today.</p>'
      }

    </div>

  </main>`
}

async function prayersView() {
  const {
    data: prayers = []
  } = await supabase
    .from('prayer_requests')
    .select('*')
    .order('updated_at', {
      ascending: false
    })

  const activePrayers =
    prayers.filter(
      p => p.status !== 'answered'
    )

  const answeredPrayers =
    prayers.filter(
      p => p.status === 'answered'
    )

  return `<main>

    <div class="section-title">

      <p class="eyebrow">
        FAITHFULNESS
      </p>

      <h2>
        Look what God has done.
      </h2>

      <p>
        Keep bringing your prayers to Him
        and remember the moments when He answered.
      </p>

    </div>

    ${
      answeredPrayers.length
        ? `<section class="scripture">

            <p class="eyebrow">
              REMEMBER HIS FAITHFULNESS
            </p>

            <blockquote>
              “Give thanks to the Lord, for He is good;
              His love endures forever.”
            </blockquote>

            <strong>
              Psalm 107:1
            </strong>

          </section>`
        : ''
    }

    <section class="card">

      <p class="eyebrow">
        NEW PRAYER
      </p>

      <h3>
        Keep bringing it to Him.
      </h3>

      <form id="prayerForm">

        <label>
          Prayer request

          <input
            id="ptitle"
            required
            placeholder="What are you praying for?"
          >
        </label>

        <label>
          Category

          <select
            id="pcategory"
            required
          >
            ${
              prayerCategories
                .map(category =>
                  `<option value="${esc(category)}">
                    ${esc(category)}
                  </option>`
                )
                .join('')
            }
          </select>

        </label>

        <label>
          Details

          <textarea
            id="pdetails"
            rows="4"
            placeholder="Add context..."
          ></textarea>
        </label>

        <button
          class="secondary"
          type="button"
          id="prayerVoice"
        >
          🎙 Speak your prayer
        </button>

        <button
          class="primary"
          type="submit"
        >
          Add prayer
        </button>

        <p
          id="prayerVoiceMsg"
          class="msg"
          aria-live="polite"
        ></p>

        <p
          id="prayerMsg"
          class="msg"
        ></p>

      </form>

    </section>

    ${
      activePrayers.length
        ? `<section>

            <div class="section-title">
              <p class="eyebrow">
                ACTIVE PRAYERS
              </p>

              <h3>
                Still believing.
              </h3>
            </div>

            <div class="list">

              ${
                activePrayers.map(p => `
                  <article class="entry">

                    <div class="row">

                      <span class="pill">
                        ${esc(p.status || 'active')}
                      </span>

                      ${
                        p.category
                          ? `<span class="pill">
                              ${esc(p.category)}
                            </span>`
                          : ''
                      }

                    </div>

                    <h3>
                      ${esc(p.title)}
                    </h3>

                    ${
                      p.details
                        ? `<p>
                            ${esc(p.details)}
                          </p>`
                        : ''
                    }

                    <button
                      class="small"
                      data-answer="${esc(p.id)}"
                    >
                      Mark answered
                    </button>

                  </article>
                `).join('')
              }

            </div>

          </section>`
        : `<section class="card">

            <p class="muted">
              You don't have any active prayer requests right now.
            </p>

          </section>`
    }

    ${
      answeredPrayers.length
        ? `<section>

            <div class="section-title">

              <p class="eyebrow">
                ANSWERED PRAYERS
              </p>

              <h3>
                Remember what He has done.
              </h3>

            </div>

            <div class="list">

              ${
                answeredPrayers.map(p => `
                  <article class="entry">

                    <div class="row">

                      <span class="pill answered">
                        Answered
                      </span>

                      ${
                        p.category
                          ? `<span class="pill">
                              ${esc(p.category)}
                            </span>`
                          : ''
                      }

                    </div>

                    <h3>
                      ${esc(p.title)}
                    </h3>

                    ${
                      p.details
                        ? `<p>
                            ${esc(p.details)}
                          </p>`
                        : ''
                    }

                    ${
                      p.answered_at
                        ? `<small class="muted">
                            Answered ${formatDate(p.answered_at)}
                          </small>`
                        : ''
                    }

                    ${
                      p.answer_note
                        ? `<div class="card">

                            <p class="eyebrow">
                              HOW GOD ANSWERED
                            </p>

                            <p>
                              ${esc(p.answer_note)}
                            </p>

                          </div>`
                        : ''
                    }

                    <div class="card">

                      <p class="eyebrow">
                        REFLECT
                      </p>

                      <p>
                        What did this prayer teach you
                        about God's faithfulness?
                      </p>

                    </div>

                  </article>
                `).join('')
              }

            </div>

          </section>`
        : `<section class="card">

            <p class="eyebrow">
              YOUR FAITHFULNESS JOURNAL
            </p>

            <h3>
              Your answered prayers will live here.
            </h3>

            <p>
              When you mark a prayer as answered,
              you'll be able to return here and remember
              what God has done.
            </p>

          </section>`
    }

  </main>`
}

async function profileView() {
  const name =
    state.profile?.display_name ||
    state.session.user.email?.split('@')[0] ||
    'friend'

  return `<main>

    <div class="section-title">

      <p class="eyebrow">
        PROFILE
      </p>

      <h2>
        Welcome, ${esc(name)}.
      </h2>

    </div>

    <section class="card">

      <p class="eyebrow">
        ACCOUNT
      </p>

      <p>
        ${esc(state.session.user.email)}
      </p>

      <p class="muted">
        Your private journal and prayer requests
        are protected by Supabase Row Level Security.
      </p>

    </section>

  </main>`
}

async function render() {
  if (state.recovery) {
    root.innerHTML = recoveryView()
    bindRecovery()
    return
  }

  if (!state.session) {
    root.innerHTML = authView()
    bindAuth()
    return
  }

  let content =
    state.view === 'journal'
      ? await journalView()
      : state.view === 'prayers'
        ? await prayersView()
        : state.view === 'profile'
          ? await profileView()
          : await homeView()

  root.innerHTML = shell(content)

  bindApp()
}

function bindAuth() {
  if (state.recoveryMode) {
    const form =
      document.getElementById('recoveryForm')

    form.onsubmit = async e => {
      e.preventDefault()

      const newPassword =
        document.getElementById('newPassword').value

      const confirmPassword =
        document.getElementById('confirmPassword').value

      const msg =
        document.getElementById('recoveryMsg')

      if (newPassword.length < 8) {
        msg.textContent =
          'Your password must be at least 8 characters.'
        return
      }

      if (newPassword !== confirmPassword) {
        msg.textContent =
          'The passwords do not match.'
        return
      }

      msg.textContent =
        'Saving your new password…'

      try {
        const { error } =
          await supabase.auth.updateUser({
            password: newPassword
          })

        if (error) {
          msg.textContent =
            `Password could not be updated: ${error.message}`
          return
        }

        msg.textContent =
          'Password updated successfully. Welcome back!'

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname +
            window.location.search
        )

        state.recoveryMode = false
        state.view = 'home'

        await loadSession()

      } catch (error) {
        msg.textContent =
          `Password could not be updated: ${
            error?.message ||
            'Please try again.'
          }`
      }
    }

    return
  }

  document.getElementById('loginTab').onclick =
    () => {
      state.authMode = 'login'
      render()
    }

  document.getElementById('signupTab').onclick =
    () => {
      state.authMode = 'signup'
      render()
    }

  document.getElementById('authForm').onsubmit =
    async e => {
      e.preventDefault()

      const email =
        document.getElementById('email')
          .value
          .trim()

      const password =
        document.getElementById('password')
          .value

      const msg =
        document.getElementById('authMsg')

      msg.textContent =
        'Please wait…'

      try {
        const result =
          state.authMode === 'signup'
            ? await supabase.auth.signUp({
                email,
                password
              })
            : await supabase.auth.signInWithPassword({
                email,
                password
              })

        if (result.error) {
          const raw =
            result.error.message ||
            'Authentication failed.'

          msg.textContent =
            /invalid login credentials/i.test(raw)
              ? 'The email or password is incorrect. Try again or use Forgot your password.'
              : /email not confirmed/i.test(raw)
                ? 'Please confirm your email address before signing in.'
                : raw

          return
        }

        msg.textContent =
          state.authMode === 'signup'
            ? 'Check your email to confirm your account.'
            : 'Welcome back.'

      } catch (error) {
        msg.textContent =
          error?.message ||
          'Something went wrong. Please try again.'
      }
    }

  document.getElementById('reset').onclick =
    async e => {
      e.preventDefault()

      const input =
        document.getElementById('email')

      const msg =
        document.getElementById('authMsg')

      const email =
        input.value.trim()

      if (!email) {
        msg.textContent =
          'Enter your email address above, then click Forgot your password again.'

        input.focus()

        return
      }

      msg.textContent =
        'Sending password reset email…'

      try {
        const result =
          await supabase.auth.resetPasswordForEmail(
            email,
            {
              redirectTo:
                window.location.origin
            }
          )

        msg.textContent =
          result.error
            ? `Password reset could not be sent: ${result.error.message}`
            : 'Password reset instructions were sent. Check your email.'

      } catch (error) {
        msg.textContent =
          `Password reset could not be sent: ${
            error?.message ||
            'Please try again.'
          }`
      }
    }
}

function bindRecovery() {
  document.getElementById('recoveryForm').onsubmit =
    async e => {
      e.preventDefault()

      const newPassword =
        document.getElementById('newPassword').value

      const confirmPassword =
        document.getElementById('confirmPassword').value

      const msg =
        document.getElementById('recoveryMsg')

      if (newPassword !== confirmPassword) {
        msg.textContent =
          'The passwords do not match.'
        return
      }

      if (newPassword.length < 8) {
        msg.textContent =
          'Your password must be at least 8 characters.'
        return
      }

      msg.textContent =
        'Updating your password…'

      try {
        const { error } =
          await supabase.auth.updateUser({
            password: newPassword
          })

        if (error) {
          msg.textContent =
            `Password could not be updated: ${error.message}`
          return
        }

        msg.textContent =
          'Password updated successfully. You can now sign in.'

        setTimeout(async () => {
          await supabase.auth.signOut()

          state.session = null
          state.recovery = false
          state.authMode = 'login'

          await render()
        }, 1500)

      } catch (error) {
        msg.textContent =
          `Password could not be updated: ${
            error?.message ||
            'Please try again.'
          }`
      }
    }
}

function setupVoiceInput({
  buttonId,
  targetId,
  messageId
}) {
  const button =
    document.getElementById(buttonId)

  const target =
    document.getElementById(targetId)

  const message =
    document.getElementById(messageId)

  if (!button || !target) {
    return
  }

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition

  if (!SpeechRecognition) {
    button.disabled = true

    if (message) {
      message.textContent =
        'Voice-to-text is not supported in this browser.'
    }

    return
  }

  const recognition =
    new SpeechRecognition()

  recognition.lang = 'en-US'
  recognition.interimResults = false
  recognition.continuous = false

  button.onclick = () => {
    try {
      recognition.start()

      button.textContent =
        '🎙 Listening…'

      if (message) {
        message.textContent =
          'Speak naturally. Your words will appear here.'
      }

    } catch {
      if (message) {
        message.textContent =
          'Voice input is already active.'
      }
    }
  }

  recognition.onresult = event => {
    const transcript =
      event.results?.[0]?.[0]?.transcript || ''

    if (!transcript) return

    const existing =
      target.value.trim()

    target.value =
      existing
        ? `${existing} ${transcript}`
        : transcript

    if (message) {
      message.textContent =
        'Voice entry added.'
    }
  }

  recognition.onerror = event => {
    if (message) {
      message.textContent =
        `Voice input could not be completed: ${
          event.error || 'Please try again.'
        }`
    }
  }

  recognition.onend = () => {
    button.textContent =
      buttonId === 'journalVoice'
        ? '🎙 Speak your entry'
        : '🎙 Speak your prayer'
  }
}

function bindApp() {

  document
    .querySelectorAll('[data-view]')
    .forEach(button => {
      button.onclick = () => {
        state.view =
          button.dataset.view

        render()
      }
    })

  document
    .getElementById('signout')
    ?.addEventListener(
      'click',
      async () => {

        await supabase.auth.signOut()

        state.session = null
        state.view = 'home'

        render()
      }
    )

  document
    .getElementById('journalForm')
    ?.addEventListener(
      'submit',
      async e => {

        e.preventDefault()

        const r =
          await supabase
            .from('journal_entries')
            .insert({
              user_id:
                state.session.user.id,

              title:
                document
                  .getElementById('jtitle')
                  .value
                  .trim(),

              body:
                document
                  .getElementById('jbody')
                  .value
                  .trim()
            })

        document
          .getElementById('journalMsg')
          .textContent =
            r.error?.message ||
            'Saved.'

        if (!r.error) {
          render()
        }
      }
    )

  document
    .getElementById('prayerForm')
    ?.addEventListener(
      'submit',
      async e => {

        e.preventDefault()

        const r =
          await supabase
            .from('prayer_requests')
            .insert({
              user_id:
                state.session.user.id,

              title:
                document
                  .getElementById('ptitle')
                  .value
                  .trim(),

              category:
                document
                  .getElementById('pcategory')
                  .value,

              details:
                document
                  .getElementById('pdetails')
                  .value
                  .trim()
            })

        document
          .getElementById('prayerMsg')
          .textContent =
            r.error?.message ||
            'Prayer saved.'

        if (!r.error) {
          render()
        }
      }
    )

  document
    .querySelectorAll('[data-answer]')
    .forEach(button => {

      button.onclick = async () => {

        const prayerId =
          button.dataset.answer

        const prayer =
          await supabase
            .from('prayer_requests')
            .select('*')
            .eq('id', prayerId)
            .maybeSingle()

        if (prayer.error) {
          return
        }

        const note =
          window.prompt(
            'How did God answer this prayer?'
          )

        if (note === null) {
          return
        }

        const trimmedNote =
          note.trim()

        const r =
          await supabase
            .from('prayer_requests')
            .update({
              status: 'answered',

              answered_at:
                new Date().toISOString(),

              answer_note:
                trimmedNote || null
            })
            .eq(
              'id',
              prayerId
            )

        if (!r.error) {
          render()
        }
      }
    })

  setupVoiceInput({
    buttonId: 'journalVoice',
    targetId: 'jbody',
    messageId: 'journalVoiceMsg'
  })

  setupVoiceInput({
    buttonId: 'prayerVoice',
    targetId: 'pdetails',
    messageId: 'prayerVoiceMsg'
  })
}

supabase.auth.onAuthStateChange(
  async (event, session) => {

    console.log(
      'AUTH EVENT:',
      event
    )

    if (
      event ===
      'PASSWORD_RECOVERY'
    ) {
      state.session = session
      state.recovery = true

      await render()

      return
    }

    state.session = session

    if (
      event ===
      'SIGNED_OUT'
    ) {
      state.recovery = false
      state.view = 'home'
    }

    if (
      session &&
      !state.recovery
    ) {
      await Promise.all([
        loadProfile(),
        loadToday()
      ])
    }

    await render()
  }
)

loadSession()
