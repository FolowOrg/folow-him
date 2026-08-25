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
  prayerFilter: 'All'
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
  const { data: { session } } = await supabase.auth.getSession()

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
        <button id="loginTab" class="${state.authMode === 'login' ? 'active' : ''}">
          Sign in
        </button>

        <button id="signupTab" class="${state.authMode === 'signup' ? 'active' : ''}">
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

        <button type="button" class="link" id="reset">
          Forgot your password?
        </button>

        <p id="authMsg" class="msg" aria-live="polite"></p>
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

        <p id="recoveryMsg" class="msg" aria-live="polite"></p>

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

      <button class="ghost" id="signout">
        Sign out
      </button>
    </header>

    ${content}

    <nav class="bottom-nav">
      <button data-view="home">Today</button>
      <button data-view="journal">Journal</button>
      <button data-view="prayers">Prayers</button>
      <button data-view="profile">Profile</button>
    </nav>

  </div>`
}

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
        ? `<section class="scripture">
            <p class="eyebrow">TODAY'S SCRIPTURE</p>

            <blockquote>
              “${esc(c.scripture_text)}”
            </blockquote>

            <strong>
              ${esc(c.scripture_reference)}
            </strong>
          </section>`
        : `<section class="card">
            <h3>Your first daily prayer is coming.</h3>

            <p>
              Add daily content from your admin library
              to personalize this screen.
            </p>
          </section>`
    }

    <section class="grid">

      <div class="card">
        <p class="eyebrow">PRAYER PROMPT</p>

        <h3>
          ${esc(c?.prayer_prompt || 'What is on your heart today?')}
        </h3>

        <button class="primary" data-view="journal">
          Start journaling
        </button>
      </div>

      <div class="card">
        <p class="eyebrow">FAITHFULNESS</p>

        <h3>
          Remember what God has done.
        </h3>

        <button class="secondary" data-view="prayers">
          View answered prayers
        </button>
      </div>

    </section>

  </main>`
}
function formatJournalDate(dateValue) {
  if (!dateValue) return ''

  const date = new Date(dateValue + 'T00:00:00')

  if (Number.isNaN(date.getTime())) {
    return esc(dateValue)
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

async function journalView() {
  const { data: entries = [] } = await supabase
    .from('journal_entries')
    .select('*')
    .order('entry_date', { ascending: false })
    .limit(100)

  return `<main class="journal-page">

    <section class="journal-hero">

      <div class="journal-topline">
        <span class="brand">
          <span class="leaf">❧</span>
          <span>Folow Him</span>
        </span>

        <button class="profile-circle" data-view="profile" aria-label="Profile">
          ◯
        </button>
      </div>

      <div class="journal-heading">
        <h1>My Journal</h1>

        <p class="journal-script">
          Your quiet place.
        </p>

        <p class="journal-intent">
          COME AWAY. &nbsp; BE STILL. &nbsp; REMEMBER.
        </p>
      </div>

      <button
        class="journal-write-button"
        id="openJournalComposer"
      >
        <span>✎</span>
        Write New Entry
      </button>

    </section>


    <section class="journal-tools">

      <div class="journal-search">

        <span class="search-icon">⌕</span>

        <input
          id="journalSearch"
          type="search"
          placeholder="Search journal..."
          autocomplete="off"
        >

      </div>

      <button
        class="journal-filter-button"
        id="journalFilterToggle"
        aria-label="Filter journal"
      >
        ☷
      </button>

    </section>


    <div class="journal-filters" id="journalFilters">

      <button
        class="journal-filter active"
        data-journal-filter="all"
      >
        All
      </button>

      <button
        class="journal-filter"
        data-journal-filter="week"
      >
        This Week
      </button>

      <button
        class="journal-filter"
        data-journal-filter="month"
      >
        This Month
      </button>

    </div>


    <section
      class="journal-composer card"
      id="journalComposer"
      hidden
    >

      <div class="composer-heading">
        <div>
          <p class="eyebrow">NEW ENTRY</p>
          <h2>What's on your heart?</h2>
        </div>

        <button
          type="button"
          class="composer-close"
          id="closeJournalComposer"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <form id="journalForm">

        <label>
          Title

          <input
            id="jtitle"
            placeholder="Give this moment a name..."
            autocomplete="off"
          >
        </label>


        <label class="journal-body-label">
          Prayer / reflection

          <div class="voice-field">

            <textarea
              id="jbody"
              rows="8"
              required
              placeholder="Write freely. Tell Him what's on your heart..."
            ></textarea>

            <button
              type="button"
              class="voice-button"
              id="journalVoiceButton"
              title="Use voice to text"
            >
              🎙
              <span>Speak</span>
            </button>

          </div>

          <span
            class="voice-status"
            id="journalVoiceStatus"
            aria-live="polite"
          ></span>

        </label>


        <div class="composer-actions">

          <button
            class="primary"
            type="submit"
          >
            Save Entry
          </button>

          <button
            type="button"
            class="secondary"
            id="cancelJournalComposer"
          >
            Cancel
          </button>

        </div>

        <p
          id="journalMsg"
          class="msg"
          aria-live="polite"
        ></p>

      </form>

    </section>


    <section class="journal-list-section">

      <div class="journal-list-heading">
        <p class="eyebrow">YOUR JOURNEY</p>
        <h2>Moments with Him</h2>
      </div>

      <div
        class="journal-list"
        id="journalList"
      >

        ${
          entries.length
            ? entries.map(e => `
                <article
                  class="journal-entry-card"
                  data-entry-date="${esc(e.entry_date || '')}"
                  data-entry-search="${esc(
                    `${e.title || ''} ${e.body || ''}`
                  ).toLowerCase()}"
                >

                  <div class="journal-entry-date">
                    ${formatJournalDate(e.entry_date)}
                  </div>

                  <h3>
                    ${esc(e.title || 'A moment with God')}
                  </h3>

                  <p>
                    ${esc(e.body || '').slice(0, 360)}
                  </p>

                  <div class="journal-entry-footer">
                    <span>Read reflection</span>
                    <span>→</span>
                  </div>

                </article>
              `).join('')
            : `
              <div class="journal-empty">
                <div class="journal-empty-mark">❧</div>

                <h3>Your journal is waiting.</h3>

                <p>
                  Start with a prayer, a thought, a question,
                  or simply what is on your heart today.
                </p>

                <button
                  class="primary"
                  id="emptyJournalButton"
                >
                  Write your first entry
                </button>
              </div>
            `
        }

      </div>

    </section>

  </main>`
}

async function prayersView() {
  const { data: prayers = [] } = await supabase
    .from('prayer_requests')
    .select('*')
    .order('updated_at', { ascending: false })

  const filteredPrayers = prayers.filter(prayer => {
    if (state.prayerFilter === 'All') {
      return true
    }

    const category = prayer.category || 'Other'

    return category === state.prayerFilter
  })

  return `<main>

    <div class="section-title">
      <p class="eyebrow">MY PRAYERS</p>
      <h2>Keep bringing it to Him.</h2>
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

          <select id="pcategory" required>
            ${
              prayerCategories.map(category =>
                `<option value="${esc(category)}">
                  ${esc(category)}
                </option>`
              ).join('')
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

        <button class="primary" type="submit">
          Add prayer
        </button>

        <p id="prayerMsg" class="msg"></p>

      </form>

    </section>

    <section class="card prayer-filters">

      <p class="eyebrow">
        FILTER PRAYERS
      </p>

      <div class="filter-row">

        <button
          type="button"
          class="filter-button ${state.prayerFilter === 'All' ? 'active' : ''}"
          data-prayer-filter="All"
        >
          All
        </button>

        ${
          prayerCategories.map(category => `
            <button
              type="button"
              class="filter-button ${state.prayerFilter === category ? 'active' : ''}"
              data-prayer-filter="${esc(category)}"
            >
              ${esc(category)}
            </button>
          `).join('')
        }

      </div>

    </section>

    <div class="list">

      ${
        filteredPrayers.length
          ? filteredPrayers.map(p => `
              <article class="entry">

                <div class="row">

                  <span class="pill ${esc(p.status)}">
                    ${esc(p.status)}
                  </span>

                  <span class="pill">
                    ${esc(p.category || 'Other')}
                  </span>

                  ${
                    p.status === 'active'
                      ? `<button
                          class="small"
                          data-answer="${esc(p.id)}"
                        >
                          Mark answered
                        </button>`
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
                    ? `<p>
                        <strong>Answer:</strong>
                        ${esc(p.answer_note)}
                      </p>`
                    : ''
                }

              </article>
            `).join('')
          : `<p class="muted">
              No prayers found in this category.
            </p>`
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
      <p class="eyebrow">PROFILE</p>
      <h2>Welcome, ${esc(name)}.</h2>
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
    const form = document.getElementById('recoveryForm')

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

  document.getElementById('loginTab').onclick = () => {
    state.authMode = 'login'
    render()
  }

  document.getElementById('signupTab').onclick = () => {
    state.authMode = 'signup'
    render()
  }

  document.getElementById('authForm').onsubmit =
    async e => {
      e.preventDefault()

      const email =
        document.getElementById('email').value.trim()

      const password =
        document.getElementById('password').value

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
function setupVoiceInput(buttonId, textareaId, statusId) {
  const button = document.getElementById(buttonId)
  const textarea = document.getElementById(textareaId)
  const status = document.getElementById(statusId)

  if (!button || !textarea) return

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition

  if (!SpeechRecognition) {
    button.disabled = true
    button.title =
      'Voice-to-text is not supported in this browser.'
    return
  }

  const recognition = new SpeechRecognition()

  recognition.lang = 'en-US'
  recognition.interimResults = false
  recognition.continuous = false

  let listening = false

  button.addEventListener('click', () => {
    if (listening) {
      recognition.stop()
      return
    }

    listening = true

    button.classList.add('listening')
    button.querySelector('span').textContent = 'Listening…'

    if (status) {
      status.textContent =
        'Speak naturally. Your words will appear here.'
    }

    recognition.start()
  })

  recognition.onresult = event => {
    const transcript =
      Array.from(event.results)
        .map(result => result[0].transcript)
        .join(' ')

    const existing =
      textarea.value.trim()

    textarea.value =
      existing
        ? `${existing} ${transcript}`
        : transcript
  }

  recognition.onerror = event => {
    if (status) {
      status.textContent =
        event.error === 'not-allowed'
          ? 'Microphone access was not allowed.'
          : 'Voice entry could not be started. Please try again.'
    }
  }

  recognition.onend = () => {
    listening = false

    button.classList.remove('listening')
    button.querySelector('span').textContent = 'Speak'

    if (status) {
      status.textContent = ''
    }
  }
}
function bindApp() {

  document
    .querySelectorAll('[data-view]')
    .forEach(b => {
      b.onclick = () => {
        state.view = b.dataset.view
        render()
      }
    })

  document
    .querySelectorAll('[data-prayer-filter]')
    .forEach(button => {
      button.onclick = () => {
        state.prayerFilter =
          button.dataset.prayerFilter

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
        state.prayerFilter = 'All'

        render()
      }
    )

const journalComposer =
  document.getElementById('journalComposer')

const openJournalComposer =
  document.getElementById('openJournalComposer')

const closeJournalComposer =
  document.getElementById('closeJournalComposer')

const cancelJournalComposer =
  document.getElementById('cancelJournalComposer')

const emptyJournalButton =
  document.getElementById('emptyJournalButton')


function openComposer() {
  if (!journalComposer) return

  journalComposer.hidden = false

  journalComposer.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  })

  setTimeout(() => {
    document.getElementById('jbody')?.focus()
  }, 400)
}


function closeComposer() {
  if (!journalComposer) return

  journalComposer.hidden = true
}


openJournalComposer?.addEventListener(
  'click',
  openComposer
)

closeJournalComposer?.addEventListener(
  'click',
  closeComposer
)

cancelJournalComposer?.addEventListener(
  'click',
  closeComposer
)

emptyJournalButton?.addEventListener(
  'click',
  openComposer
)


setupVoiceInput(
  'journalVoiceButton',
  'jbody',
  'journalVoiceStatus'
)


document
  .getElementById('journalForm')
  ?.addEventListener(
    'submit',
    async e => {

      e.preventDefault()

      const title =
        document
          .getElementById('jtitle')
          .value
          .trim()

      const body =
        document
          .getElementById('jbody')
          .value
          .trim()

      const msg =
        document.getElementById('journalMsg')

      if (!body) {
        msg.textContent =
          'Write something before saving your entry.'

        return
      }

      msg.textContent =
        'Saving your reflection…'

      const r =
        await supabase
          .from('journal_entries')
          .insert({
            user_id:
              state.session.user.id,

            title,

            body
          })

      if (r.error) {
        msg.textContent =
          r.error.message

        return
      }

      msg.textContent =
        'Your reflection has been saved.'

      render()
    }
  )
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
  .forEach(b => {
    b.onclick = async () => {

      const note = window.prompt(
        'How did God answer this prayer?'
      )

      // If the user clicks Cancel, do nothing.
      if (note === null) {
        return
      }

      const r =
        await supabase
          .from('prayer_requests')
          .update({
            status: 'answered',
            answered_at:
              new Date().toISOString(),
            answer_note:
              note.trim() || null
          })
          .eq(
            'id',
            b.dataset.answer
          )

      if (r.error) {
        const msg = document.getElementById('prayerMsg')

        if (msg) {
          msg.textContent =
            `Prayer could not be updated: ${r.error.message}`
        }

        return
      }

      await render()
    }
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
