import { createClient } from '@supabase/supabase-js'
import './styles.css'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase configuration. Check Vercel environment variables.'
  )
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)

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

/* =========================================================
   HELPERS
========================================================= */

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

/*
  Voice-to-text helper.
  Uses the browser's native Web Speech API when available.
*/

function getSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition

  return SpeechRecognition || null
}

function startVoiceInput(targetId, buttonId) {
  const SpeechRecognition = getSpeechRecognition()

  const button = document.getElementById(buttonId)
  const target = document.getElementById(targetId)

  if (!SpeechRecognition) {
    alert(
      'Voice-to-text is not supported in this browser. Try Chrome or Microsoft Edge.'
    )
    return
  }

  if (!target || !button) return

  const recognition = new SpeechRecognition()

  recognition.lang = 'en-US'
  recognition.interimResults = true
  recognition.continuous = false

  const originalText = button.innerHTML

  button.innerHTML = '🎙 Listening…'
  button.classList.add('listening')
  button.disabled = true

  recognition.onresult = event => {
    let transcript = ''

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {
      transcript +=
        event.results[i][0].transcript
    }

    const existing = target.value.trim()

    target.value =
      existing && transcript
        ? `${existing} ${transcript}`
        : transcript
  }

  recognition.onerror = event => {
    console.error(
      'Voice recognition error:',
      event.error
    )

    if (event.error === 'not-allowed') {
      alert(
        'Microphone access was blocked. Please allow microphone access in your browser settings.'
      )
    } else if (event.error !== 'aborted') {
      alert(
        'Voice-to-text could not start. Please try again.'
      )
    }
  }

  recognition.onend = () => {
    button.innerHTML = originalText
    button.classList.remove('listening')
    button.disabled = false
  }

  try {
    recognition.start()
  } catch (error) {
    console.error(
      'Could not start voice recognition:',
      error
    )

    button.innerHTML = originalText
    button.classList.remove('listening')
    button.disabled = false
  }
}

/* =========================================================
   SESSION / DATA
========================================================= */

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
  if (!state.session) return

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', state.session.user.id)
    .maybeSingle()

  if (error) {
    console.error(
      'Profile load error:',
      error
    )
  }

  state.profile = data
}

async function loadToday() {
  const date =
    new Date()
      .toISOString()
      .slice(0, 10)

  const { data, error } = await supabase
    .from('daily_content')
    .select('*')
    .eq('content_date', date)
    .maybeSingle()

  if (error) {
    console.error(
      'Daily content load error:',
      error
    )
  }

  state.content = data
}

/* =========================================================
   AUTH
========================================================= */

function authView() {
  if (state.recoveryMode) {
    return recoveryView()
  }

  return `
    <main class="auth">

      <div class="mark">❧</div>

      <h1>Folow Him</h1>

      <p class="tag">
        A gentle place to pray, reflect,
        and remember His faithfulness.
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

          <button
            class="primary"
            type="submit"
          >
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

    </main>
  `
}

function recoveryView() {
  return `
    <main class="auth">

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
              placeholder="Enter it again"
            >
          </label>

          <button
            class="primary"
            type="submit"
          >
            Update password
          </button>

          <p
            id="recoveryMsg"
            class="msg"
            aria-live="polite"
          ></p>

        </form>

      </section>

    </main>
  `
}

/* =========================================================
   APP SHELL
========================================================= */

function shell(content) {
  return `
    <div class="app-shell">

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

    </div>
  `
}

/* =========================================================
   HOME
========================================================= */

async function homeView() {
  const c = state.content

  return `<main>

    <div class="welcome">
      <p class="eyebrow">TODAY</p>

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
        ? `
          <section class="scripture">

            ${
              c.theme
                ? `
                  <p class="eyebrow">
                    TODAY'S THEME
                  </p>

                  <h3 class="daily-theme">
                    ${esc(c.theme)}
                  </h3>
                `
                : ''
            }

            <p class="eyebrow">
              TODAY'S SCRIPTURE
            </p>

            <blockquote>
              “${esc(c.scripture_text)}”
            </blockquote>

            <strong>
              ${esc(c.scripture_reference)}
            </strong>

          </section>

          <section class="card daily-section">

            <p class="eyebrow">
              A PRAYER FOR TODAY
            </p>

            <h3>
              Bring your heart to Him.
            </h3>

            <p class="daily-copy">
              ${esc(c.prayer_prompt)}
            </p>

          </section>

          ${
            c.reflection_prompt
              ? `
                <section class="card daily-section">

                  <p class="eyebrow">
                    REFLECT
                  </p>

                  <h3>
                    Pause and listen.
                  </h3>

                  <p class="daily-copy">
                    ${esc(c.reflection_prompt)}
                  </p>

                  <button
                    class="primary"
                    data-view="journal"
                  >
                    Begin journaling
                  </button>

                </section>
              `
              : `
                <section class="card daily-section">

                  <p class="eyebrow">
                    PRAYER PROMPT
                  </p>

                  <h3>
                    ${esc(
                      c.prayer_prompt ||
                      'What is on your heart today?'
                    )}
                  </h3>

                  <button
                    class="primary"
                    data-view="journal"
                  >
                    Start journaling
                  </button>

                </section>
              `
          }
        `
        : `
          <section class="card">

            <h3>
              Your first daily prayer is coming.
            </h3>

            <p>
              Add daily content from your admin library
              to personalize this screen.
            </p>

          </section>
        `
    }

    <section class="grid">

      <div class="card">

        <p class="eyebrow">
          JOURNAL
        </p>

        <h3>
          What is God placing on your heart?
        </h3>

        <button
          class="primary"
          data-view="journal"
        >
          Open journal
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

/* =========================================================
   JOURNAL 2.0
========================================================= */

async function journalView() {
  const {
    data: entries = [],
    error
  } = await supabase
    .from('journal_entries')
    .select('*')
    .order('entry_date', {
      ascending: false
    })
    .limit(30)

  if (error) {
    console.error(
      'Journal load error:',
      error
    )
  }

  return `
    <main>

      <div class="section-title">

        <p class="eyebrow">
          JOURNAL
        </p>

        <h2>
          Your quiet place.
        </h2>

        <p class="muted">
          Slow down. Be honest. Write what
          is on your heart.
        </p>

      </div>

      <section class="card journal-card">

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
              rows="8"
              required
              placeholder="Write freely..."
            ></textarea>

          </label>

          <div class="voice-row">

            <button
              type="button"
              class="voice-button"
              id="journalVoice"
            >
              🎙 Speak your reflection
            </button>

            <span class="voice-hint">
              Tap to dictate
            </span>

          </div>

          <button
            class="primary"
            type="submit"
          >
            Save journal entry
          </button>

          <p
            id="journalMsg"
            class="msg"
            aria-live="polite"
          ></p>

        </form>

      </section>

      <div class="list">

        ${
          entries.length
            ? entries
                .map(
                  e => `
                    <article class="entry">

                      <small>
                        ${esc(e.entry_date)}
                      </small>

                      <h3>
                        ${esc(
                          e.title ||
                          'Prayer journal'
                        )}
                      </h3>

                      <p>
                        ${esc(e.body || '')}
                      </p>

                    </article>
                  `
                )
                .join('')
            : `
              <p class="muted">
                Your first entry can begin today.
              </p>
            `
        }

      </div>

    </main>
  `
}

/* =========================================================
   PRAYERS
========================================================= */

async function prayersView() {
  const {
    data: prayers = [],
    error
  } = await supabase
    .from('prayer_requests')
    .select('*')
    .order('updated_at', {
      ascending: false
    })

  if (error) {
    console.error(
      'Prayer load error:',
      error
    )
  }

  return `
    <main>

      <div class="section-title">

        <p class="eyebrow">
          MY PRAYERS
        </p>

        <h2>
          Keep bringing it to Him.
        </h2>

        <p class="muted">
          Give your prayers a place to live,
          then come back and remember His
          faithfulness.
        </p>

      </div>

      <section class="card">

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
                  .map(
                    category => `
                      <option value="${esc(
                        category
                      )}">
                        ${esc(category)}
                      </option>
                    `
                  )
                  .join('')
              }

            </select>

          </label>

          <label>
            Details

            <textarea
              id="pdetails"
              rows="5"
              placeholder="Add context..."
            ></textarea>

          </label>

          <div class="voice-row">

            <button
              type="button"
              class="voice-button"
              id="prayerVoice"
            >
              🎙 Speak your prayer
            </button>

            <span class="voice-hint">
              Tap to dictate
            </span>

          </div>

          <button
            class="primary"
            type="submit"
          >
            Add prayer
          </button>

          <p
            id="prayerMsg"
            class="msg"
            aria-live="polite"
          ></p>

        </form>

      </section>

      <div class="list">

        ${
          prayers.length
            ? prayers
                .map(
                  p => `
                    <article class="entry">

                      <div class="row">

                        <div class="row">

                          <span
                            class="pill ${esc(
                              p.status
                            )}"
                          >
                            ${esc(p.status)}
                          </span>

                          ${
                            p.category
                              ? `
                                <span class="pill">
                                  ${esc(
                                    p.category
                                  )}
                                </span>
                              `
                              : ''
                          }

                        </div>

                        ${
                          p.status === 'active'
                            ? `
                              <button
                                class="small"
                                data-answer="${esc(
                                  p.id
                                )}"
                              >
                                Mark answered
                              </button>
                            `
                            : ''
                        }

                      </div>

                      <h3>
                        ${esc(p.title)}
                      </h3>

                      ${
                        p.details
                          ? `
                            <p>
                              ${esc(
                                p.details
                              )}
                            </p>
                          `
                          : ''
                      }

                      ${
                        p.answer_note
                          ? `
                            <p>
                              <strong>
                                Answer:
                              </strong>

                              ${esc(
                                p.answer_note
                              )}
                            </p>
                          `
                          : ''
                      }

                    </article>
                  `
                )
                .join('')
            : `
              <p class="muted">
                No prayer requests yet.
              </p>
            `
        }

      </div>

    </main>
  `
}

/* =========================================================
   PROFILE
========================================================= */

async function profileView() {
  const name =
    state.profile?.display_name ||
    state.session.user.email
      ?.split('@')[0] ||
    'friend'

  return `
    <main>

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
          ${esc(
            state.session.user.email
          )}
        </p>

        <p class="muted">
          Your private journal and prayer
          requests are protected by
          Supabase Row Level Security.
        </p>

      </section>

    </main>
  `
}

/* =========================================================
   RENDER
========================================================= */

async function render() {
  if (state.recoveryMode) {
    root.innerHTML = recoveryView()
    bindRecovery()
    return
  }

  if (!state.session) {
    root.innerHTML = authView()
    bindAuth()
    return
  }

  let content

  if (state.view === 'journal') {
    content = await journalView()
  } else if (state.view === 'prayers') {
    content = await prayersView()
  } else if (state.view === 'profile') {
    content = await profileView()
  } else {
    content = await homeView()
  }

  root.innerHTML = shell(content)

  bindApp()
}

/* =========================================================
   AUTH BINDINGS
========================================================= */

function bindAuth() {
  if (state.recoveryMode) {
    const form =
      document.getElementById(
        'recoveryForm'
      )

    form.onsubmit = async e => {
      e.preventDefault()

      const newPassword =
        document.getElementById(
          'newPassword'
        ).value

      const confirmPassword =
        document.getElementById(
          'confirmPassword'
        ).value

      const msg =
        document.getElementById(
          'recoveryMsg'
        )

      if (newPassword.length < 8) {
        msg.textContent =
          'Your password must be at least 8 characters.'
        return
      }

      if (
        newPassword !==
        confirmPassword
      ) {
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

  document.getElementById(
    'loginTab'
  ).onclick = () => {
    state.authMode = 'login'
    render()
  }

  document.getElementById(
    'signupTab'
  ).onclick = () => {
    state.authMode = 'signup'
    render()
  }

  document.getElementById(
    'authForm'
  ).onsubmit = async e => {
    e.preventDefault()

    const email =
      document
        .getElementById('email')
        .value
        .trim()

    const password =
      document.getElementById(
        'password'
      ).value

    const msg =
      document.getElementById(
        'authMsg'
      )

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
          /invalid login credentials/i.test(
            raw
          )
            ? 'The email or password is incorrect. Try again or use Forgot your password.'
            : /email not confirmed/i.test(
                raw
              )
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

  document.getElementById(
    'reset'
  ).onclick = async e => {
    e.preventDefault()

    const input =
      document.getElementById(
        'email'
      )

    const msg =
      document.getElementById(
        'authMsg'
      )

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

/* =========================================================
   RECOVERY
========================================================= */

function bindRecovery() {
  const form =
    document.getElementById(
      'recoveryForm'
    )

  if (!form) return

  form.onsubmit = async e => {
    e.preventDefault()

    const newPassword =
      document.getElementById(
        'newPassword'
      ).value

    const confirmPassword =
      document.getElementById(
        'confirmPassword'
      ).value

    const msg =
      document.getElementById(
        'recoveryMsg'
      )

    if (
      newPassword !==
      confirmPassword
    ) {
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
        state.recoveryMode = false
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

/* =========================================================
   APP BINDINGS
========================================================= */

function bindApp() {

  /* Navigation */

  document
    .querySelectorAll(
      '[data-view]'
    )
    .forEach(button => {

      button.onclick = () => {

        state.view =
          button.dataset.view

        render()
      }
    })

  /* Sign out */

  document
    .getElementById('signout')
    ?.addEventListener(
      'click',
      async () => {

        await supabase.auth.signOut()

        state.session = null
        state.view = 'home'
        state.recoveryMode = false

        render()
      }
    )

  /* =====================================================
     JOURNAL
  ===================================================== */

  const journalForm =
    document.getElementById(
      'journalForm'
    )

  if (journalForm) {

    journalForm.addEventListener(
      'submit',
      async e => {

        e.preventDefault()

        const title =
          document
            .getElementById(
              'jtitle'
            )
            .value
            .trim()

        const body =
          document
            .getElementById(
              'jbody'
            )
            .value
            .trim()

        const msg =
          document.getElementById(
            'journalMsg'
          )

        if (!body) {
          msg.textContent =
            'Write something in your reflection before saving.'
          return
        }

        msg.textContent =
          'Saving your reflection…'

        const result =
          await supabase
            .from(
              'journal_entries'
            )
            .insert({
              user_id:
                state.session.user.id,

              title,

              body
            })

        if (result.error) {
          msg.textContent =
            result.error.message
          return
        }

        msg.textContent =
          'Your reflection has been saved.'

        await render()
      }
    )

    const journalVoice =
      document.getElementById(
        'journalVoice'
      )

    if (journalVoice) {
      journalVoice.onclick = () => {
        startVoiceInput(
          'jbody',
          'journalVoice'
        )
      }
    }
  }

  /* =====================================================
     PRAYER
  ===================================================== */

  const prayerForm =
    document.getElementById(
      'prayerForm'
    )

  if (prayerForm) {

    prayerForm.addEventListener(
      'submit',
      async e => {

        e.preventDefault()

        const title =
          document
            .getElementById(
              'ptitle'
            )
            .value
            .trim()

        const category =
          document
            .getElementById(
              'pcategory'
            )
            .value

        const details =
          document
            .getElementById(
              'pdetails'
            )
            .value
            .trim()

        const msg =
          document.getElementById(
            'prayerMsg'
          )

        if (!title) {
          msg.textContent =
            'Please enter your prayer request.'
          return
        }

        msg.textContent =
          'Saving your prayer…'

        const result =
          await supabase
            .from(
              'prayer_requests'
            )
            .insert({
              user_id:
                state.session.user.id,

              title,

              category,

              details
            })

        if (result.error) {
          msg.textContent =
            result.error.message
          return
        }

        msg.textContent =
          'Your prayer has been saved.'

        await render()
      }
    )

    const prayerVoice =
      document.getElementById(
        'prayerVoice'
      )

    if (prayerVoice) {
      prayerVoice.onclick = () => {
        startVoiceInput(
          'pdetails',
          'prayerVoice'
        )
      }
    }
  }

  /* =====================================================
     ANSWERED PRAYERS
  ===================================================== */

  document
    .querySelectorAll(
      '[data-answer]'
    )
    .forEach(button => {

      button.onclick = async () => {

        const confirmed =
          window.confirm(
            'Mark this prayer as answered?'
          )

        if (!confirmed) {
          return
        }

        const note =
          window.prompt(
            'How did God answer this prayer?'
          )

        /*
          If the user cancels the answer note,
          do NOT mark the prayer as answered.
        */

        if (note === null) {
          return
        }

        const result =
          await supabase
            .from(
              'prayer_requests'
            )
            .update({
              status:
                'answered',

              answered_at:
                new Date().toISOString(),

              answer_note:
                note.trim() ||
                null
            })
            .eq(
              'id',
              button.dataset.answer
            )

        if (result.error) {
          console.error(
            'Answer prayer error:',
            result.error
          )

          alert(
            `Could not update prayer: ${result.error.message}`
          )

          return
        }

        await render()
      }
    })
}

/* =========================================================
   AUTH STATE
========================================================= */

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
      state.recoveryMode = true

      await render()

      return
    }

    state.session = session

    if (
      event ===
      'SIGNED_OUT'
    ) {

      state.recoveryMode = false
      state.view = 'home'
    }

    if (
      session &&
      !state.recoveryMode
    ) {

      await Promise.all([
        loadProfile(),
        loadToday()
      ])
    }

    await render()
  }
)

/* =========================================================
   START APP
========================================================= */

loadSession()
