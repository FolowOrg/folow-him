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
  recoveryMode: false,
  journalPrompt: ''
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
                    data-journal-prompt="${esc(c.reflection_prompt)}"
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
      state.journalPrompt
        ? `
          <section class="card journal-reflection">

            <p class="eyebrow">
              TODAY'S REFLECTION
            </p>

            <h3>
              Pause and listen.
            </h3>

            <p class="daily-copy">
              ${esc(state.journalPrompt)}
            </p>

          </section>
        `
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
            rows="6"
            required
            placeholder="Write freely..."
          ></textarea>
        </label>

        <button
          class="primary"
          type="submit"
        >
          Save entry
        </button>

        <p
          id="journalMsg"
          class="msg"
        ></p>

      </form>

    </section>

    <div class="list">

      ${
        entries
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
                  ${esc(e.body).slice(0, 280)}
                </p>

              </article>
            `
          )
          .join('') ||
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

  return `<main>

    <div class="section-title">

      <p class="eyebrow">
        MY PRAYERS
      </p>

      <h2>
        Keep bringing it to Him.
      </h2>

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
                  category =>
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
          class="primary"
          type="submit"
        >
          Add prayer
        </button>

        <p
          id="prayerMsg"
          class="msg"
        ></p>

      </form>

    </section>

    <div class="list">

      ${
        prayers
          .map(
            p => `
              <article class="entry">

                <div class="row">

                  <span class="pill ${esc(p.status)}">
                    ${esc(p.status)}
                  </span>

                  ${
                    p.category
                      ? `
                        <span class="pill">
                          ${esc(p.category)}
                        </span>
                      `
                      : ''
                  }

                  ${
                    p.status === 'active'
                      ? `
                        <button
                          class="small"
                          data-answer="${esc(p.id)}"
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

                <p>
                  ${esc(p.details || '')}
                </p>

                ${
                  p.answer_note
                    ? `
                      <p>
                        <strong>
                          Answer:
                        </strong>
                        ${esc(p.answer_note)}
                      </p>
                    `
                    : ''
                }

              </article>
            `
          )
          .join('') ||
        '<p class="muted">No prayer requests yet.</p>'
      }

    </div>

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
      document.getElementById(
        'email'
      ).value.trim()

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

function bindRecovery() {
  document.getElementById(
    'recoveryForm'
  ).onsubmit = async e => {
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

      setTimeout(
        async () => {
          await supabase.auth.signOut()

          state.session = null
          state.recovery = false
          state.authMode = 'login'

          await render()
        },
        1500
      )

    } catch (error) {
      msg.textContent =
        `Password could not be updated: ${
          error?.message ||
          'Please try again.'
        }`
    }
  }
}

function bindApp() {

  document
    .querySelectorAll('[data-view]')
    .forEach(b => {

      b.onclick = () => {

        state.view =
          b.dataset.view

        if (
          state.view !==
          'journal'
        ) {
          state.journalPrompt = ''
        }

        render()
      }
    })

  /*
    DAILY REFLECTION → JOURNAL

    When the user clicks "Begin journaling"
    from today's reflection, save the reflection
    temporarily in state and open Journal.

    The reflection is displayed as a prompt only.
    It is NOT automatically inserted into the
    journal entry itself.
  */

  document
    .querySelectorAll(
      '[data-journal-prompt]'
    )
    .forEach(button => {

      button.onclick = () => {

        state.journalPrompt =
          button.dataset.journalPrompt || ''

        state.view =
          'journal'

        render()
      }
    })

  document
    .getElementById(
      'signout'
    )
    ?.addEventListener(
      'click',
      async () => {

        await supabase.auth.signOut()

        state.session = null
        state.view = 'home'
        state.journalPrompt = ''

        render()
      }
    )

  document
    .getElementById(
      'journalForm'
    )
    ?.addEventListener(
      'submit',
      async e => {

        e.preventDefault()

        const r =
          await supabase
            .from(
              'journal_entries'
            )
            .insert({
              user_id:
                state.session.user.id,

              title:
                document
                  .getElementById(
                    'jtitle'
                  )
                  .value
                  .trim(),

              body:
                document
                  .getElementById(
                    'jbody'
                  )
                  .value
                  .trim()
            })

        document
          .getElementById(
            'journalMsg'
          )
          .textContent =
            r.error?.message ||
            'Saved.'

        if (!r.error) {

          /*
            Clear the reflection prompt after
            successfully saving the entry so it
            doesn't remain when the user returns
            to the Journal later.
          */

          state.journalPrompt = ''

          render()
        }
      }
    )

  document
    .getElementById(
      'prayerForm'
    )
    ?.addEventListener(
      'submit',
      async e => {

        e.preventDefault()

        const r =
          await supabase
            .from(
              'prayer_requests'
            )
            .insert({
              user_id:
                state.session.user.id,

              title:
                document
                  .getElementById(
                    'ptitle'
                  )
                  .value
                  .trim(),

              category:
                document
                  .getElementById(
                    'pcategory'
                  )
                  .value,

              details:
                document
                  .getElementById(
                    'pdetails'
                  )
                  .value
                  .trim()
            })

        document
          .getElementById(
            'prayerMsg'
          )
          .textContent =
            r.error?.message ||
            'Prayer saved.'

        if (!r.error) {
          render()
        }
      }
    )

  document
    .querySelectorAll(
      '[data-answer]'
    )
    .forEach(b => {

      b.onclick = async () => {

        const note =
          window.prompt(
            'How did God answer this prayer?'
          )

        /*
          If the user cancels the prompt,
          DO NOT mark the prayer answered.
        */

        if (note === null) {
          return
        }

        const r =
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
                note || null
            })
            .eq(
              'id',
              b.dataset.answer
            )

        if (!r.error) {
          render()
        }
      }
    })
}

supabase.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {

    console.log(
      'AUTH EVENT:',
      event
    )

    if (
      event ===
      'PASSWORD_RECOVERY'
    ) {

      state.session =
        session

      state.recovery =
        true

      await render()

      return
    }

    state.session =
      session

    if (
      event ===
      'SIGNED_OUT'
    ) {

      state.recovery =
        false

      state.view =
        'home'

      state.journalPrompt =
        ''
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
