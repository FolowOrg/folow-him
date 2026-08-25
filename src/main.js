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
  recoveryMode: false,
  reflectionPrayer: null,
  editingReflection: null
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

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', state.session.user.id)
    .maybeSingle()

  state.profile = data
}

async function loadToday() {
  const date =
    new Date()
      .toISOString()
      .slice(0, 10)

  const { data } = await supabase
    .from('daily_content')
    .select('*')
    .eq('content_date', date)
    .maybeSingle()

  state.content = data
}

/* ============================================================
   AUTH
============================================================ */

function authView() {
  if (state.recoveryMode) {
    return `<main class="auth">

      <div class="mark">❧</div>

      <h1>Folow Him</h1>

      <p class="tag">
        Create a new password for your account.
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
              placeholder="Enter your password again"
            >
          </label>

          <button
            class="primary"
            type="submit"
          >
            Save new password
          </button>

          <p
            id="recoveryMsg"
            class="msg"
          ></p>

        </form>

      </section>

    </main>`
  }

  return `<main class="auth">

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
        ></p>

      </form>

    </section>

  </main>`
}

/* ============================================================
   APP SHELL
============================================================ */

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

      <button data-view="memory">
        Memories
      </button>

      <button data-view="profile">
        Profile
      </button>

    </nav>

  </div>`
}

/* ============================================================
   HOME
============================================================ */

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
        ${new Date().toLocaleDateString(
          undefined,
          {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          }
        )}
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
              Add daily content from your
              admin library to personalize
              this screen.
            </p>

          </section>`
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
          data-view="memory"
        >
          Visit Memory Bank
        </button>

      </div>

    </section>

  </main>`
}

/* ============================================================
   JOURNAL
============================================================ */

async function journalView() {
  const {
    data: entries = []
  } = await supabase
    .from('journal_entries')
    .select('*')
    .order(
      'entry_date',
      { ascending: false }
    )
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
        ? `<section class="card reflection-prompt-card">

            <p class="eyebrow">
              TODAY'S REFLECTION
            </p>

            <h3>
              ${esc(c.reflection_prompt)}
            </h3>

            <p class="muted">
              Let this question guide your reflection,
              or simply write what is on your heart.
            </p>

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

        <div class="voice-row">

          <button
            type="button"
            class="secondary"
            id="journalVoice"
          >
            🎙 Voice to text
          </button>

          <span
            id="journalVoiceStatus"
            class="muted"
          ></span>

        </div>

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
                  ${esc(e.body).slice(
                    0,
                    280
                  )}
                </p>

              </article>
            `
          )
          .join('')
        ||
        '<p class="muted">Your first entry can begin today.</p>'
      }

    </div>

  </main>`
}

/* ============================================================
   PRAYERS
============================================================ */

async function prayersView() {
  const {
    data: prayers = []
  } = await supabase
    .from('prayer_requests')
    .select('*')
    .order(
      'updated_at',
      { ascending: false }
    )

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

        <div class="voice-row">

          <button
            type="button"
            class="secondary"
            id="prayerVoice"
          >
            🎙 Voice to text
          </button>

          <span
            id="prayerVoiceStatus"
            class="muted"
          ></span>

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

                  <div>

                    <span class="pill ${esc(p.status)}">
                      ${esc(p.status)}
                    </span>

                    ${
                      p.category
                        ? `<span class="pill">
                            ${esc(p.category)}
                          </span>`
                        : ''
                    }

                  </div>

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
                    ? `<div class="answer-block">

                        <p>
                          <strong>
                            Answer:
                          </strong>

                          ${esc(p.answer_note)}
                        </p>

                        <button
                          type="button"
                          class="secondary"
                          data-reflect="${esc(p.id)}"
                        >
                          Reflect on this answer
                        </button>

                      </div>`
                    : ''
                }

              </article>
            `
          )
          .join('')
        ||
        '<p class="muted">No prayer requests yet.</p>'
      }

    </div>

  </main>`
}

/* ============================================================
   REFLECTION
============================================================ */

function reflectionView(prayer) {
  const suggestedPrompt =
    `What do you want to remember about how God answered "${prayer.title}"?`

  return `<main>

    <div class="section-title">

      <p class="eyebrow">
        REMEMBER HIS FAITHFULNESS
      </p>

      <h2>
        Hold onto what God has done.
      </h2>

      <p class="muted">
        Take a moment to reflect on this answered prayer.
      </p>

    </div>

    <section class="card">

      <p class="eyebrow">
        ANSWERED PRAYER
      </p>

      <h3>
        ${esc(prayer.title)}
      </h3>

      ${
        prayer.details
          ? `<p>
              ${esc(prayer.details)}
            </p>`
          : ''
      }

      ${
        prayer.answer_note
          ? `<div class="answer-highlight">

              <p class="eyebrow">
                WHAT HAPPENED
              </p>

              <p>
                ${esc(prayer.answer_note)}
              </p>

            </div>`
          : ''
      }

    </section>

    <section class="card">

      <p class="eyebrow">
        A THOUGHT TO CONSIDER
      </p>

      <h3>
        ${esc(suggestedPrompt)}
      </h3>

      <p class="muted">
        This is only a suggestion. Your reflection
        can be completely different.
      </p>

    </section>

    <section class="card">

      <form id="reflectionForm">

        <label>
          Your personal reflection

          <textarea
            id="reflectionText"
            rows="8"
            placeholder="What did you learn? What did God reveal to you? What do you want to remember?"
          ></textarea>

        </label>

        <label class="memory-choice">

          <input
            id="saveMemory"
            type="checkbox"
            checked
          >

          <span>
            <strong>
              Save to my Memory Bank
            </strong>

            <small>
              Keep this thought or lesson
              so you can return to it later.
            </small>
          </span>

        </label>

        <button
          class="primary"
          type="submit"
        >
          Save reflection
        </button>

        <button
          type="button"
          class="link"
          id="cancelReflection"
        >
          Cancel
        </button>

        <p
          id="reflectionMsg"
          class="msg"
        ></p>

      </form>

    </section>

  </main>`
}

/* ============================================================
   MEMORY BANK
============================================================ */

async function memoryView() {
  const {
    data: memories = [],
    error
  } = await supabase
    .from('prayer_reflections')
    .select(`
      *,
      prayer_requests (
        title,
        answer_note,
        category
      )
    `)
    .eq(
      'save_as_memory',
      true
    )
    .order(
      'updated_at',
      { ascending: false }
    )

  if (error) {
    return `<main>

      <div class="section-title">

        <p class="eyebrow">
          MEMORY BANK
        </p>

        <h2>
          What I want to remember.
        </h2>

      </div>

      <section class="card">

        <p class="msg">
          Unable to load your memories:
          ${esc(error.message)}
        </p>

      </section>

    </main>`
  }

  return `<main>

    <div class="memory-header">

      <div>

        <p class="eyebrow">
          MEMORY BANK
        </p>

        <h2>
          What I want to remember.
        </h2>

        <p>
          Keep the moments, lessons,
          and reminders of God's faithfulness
          that you want to carry with you.
        </p>

      </div>

      <div class="memory-count">
        <span>
          ${memories.length}
        </span>

        <small>
          ${
            memories.length === 1
              ? 'memory'
              : 'memories'
          }
        </small>
      </div>

    </div>

    ${
      memories.length
        ? `<div class="memory-grid">

            ${memories
              .map(
                memory =>
                  memoryCard(
                    memory
                  )
              )
              .join('')}

          </div>`
        : `<section class="empty-memory card">

            <div class="empty-memory-icon">
              ✦
            </div>

            <h3>
              Your Memory Bank is waiting.
            </h3>

            <p>
              When an answered prayer holds
              a thought, lesson, or revelation
              you want to remember, save it here.
            </p>

            <button
              class="primary"
              data-view="prayers"
            >
              Visit my prayers
            </button>

          </section>`
    }

  </main>`
}

function memoryCard(memory) {
  const prayer =
    memory.prayer_requests || {}

  const type =
    memory.memory_type === 'lesson'
      ? 'lesson'
      : 'memory'

  const title =
    memory.memory_title ||
    (
      type === 'lesson'
        ? 'A lesson learned'
        : 'Something to remember'
    )

  const date =
    memory.updated_at ||
    memory.created_at

  return `<article
    class="memory-card ${type}"
  >

    <div class="memory-card-top">

      <span class="memory-type">
        ${
          type === 'lesson'
            ? '🌱 Lesson learned'
            : '✦ Memory'
        }
      </span>

      <span class="memory-date">
        ${formatDate(date)}
      </span>

    </div>

    <h3>
      ${esc(title)}
    </h3>

    <div class="memory-text">
      ${esc(memory.reflection_text)}
    </div>

    ${
      prayer.title
        ? `<div class="memory-prayer">

            <span class="eyebrow">
              ANSWERED PRAYER
            </span>

            <strong>
              ${esc(prayer.title)}
            </strong>

            ${
              prayer.answer_note
                ? `<p>
                    ${esc(
                      prayer.answer_note
                    )}
                  </p>`
                : ''
            }

          </div>`
        : ''
    }

    <div class="memory-actions">

      <button
        class="secondary"
        data-edit-memory="${esc(memory.id)}"
      >
        Edit
      </button>

      <button
        class="memory-delete"
        data-delete-memory="${esc(memory.id)}"
      >
        Delete
      </button>

    </div>

  </article>`
}

function formatDate(value) {
  if (!value) return ''

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return ''
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }
  )
}

/* ============================================================
   EDIT MEMORY
============================================================ */

function editMemoryView(memory) {
  const type =
    memory.memory_type === 'lesson'
      ? 'lesson'
      : 'memory'

  return `<main>

    <div class="section-title">

      <p class="eyebrow">
        MEMORY BANK
      </p>

      <h2>
        Edit your memory.
      </h2>

      <p class="muted">
        Memories can grow and change as
        you understand more over time.
      </p>

    </div>

    <section class="card">

      <form id="editMemoryForm">

        <label>
          Memory title

          <input
            id="memoryTitle"
            value="${esc(
              memory.memory_title || ''
            )}"
            placeholder="Give this memory a name"
          >
        </label>

        <label>
          What kind of memory is this?

          <select id="memoryType">

            <option
              value="memory"
              ${type === 'memory' ? 'selected' : ''}
            >
              ✦ Memory
            </option>

            <option
              value="lesson"
              ${type === 'lesson' ? 'selected' : ''}
            >
              🌱 Lesson learned
            </option>

          </select>

        </label>

        <label>
          Your reflection

          <textarea
            id="memoryText"
            rows="10"
            required
          >${esc(
            memory.reflection_text || ''
          )}</textarea>

        </label>

        <div class="voice-row">

          <button
            type="button"
            class="secondary"
            id="memoryVoice"
          >
            🎙 Voice to text
          </button>

          <span
            id="memoryVoiceStatus"
            class="muted"
          ></span>

        </div>

        <button
          class="primary"
          type="submit"
        >
          Save changes
        </button>

        <button
          type="button"
          class="link"
          id="cancelMemoryEdit"
        >
          Cancel
        </button>

        <p
          id="memoryEditMsg"
          class="msg"
        ></p>

      </form>

    </section>

  </main>`
}

/* ============================================================
   PROFILE
============================================================ */

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
        ${esc(
          state.session.user.email
        )}
      </p>

      <p class="muted">
        Your private journal, prayers,
        and memories are protected by
        Supabase Row Level Security.
      </p>

      <button
        class="secondary"
        data-view="memory"
      >
        Open Memory Bank
      </button>

    </section>

  </main>`
}

/* ============================================================
   RENDER
============================================================ */

async function render() {
  if (state.recoveryMode) {
    root.innerHTML =
      recoveryView()

    bindRecovery()

    return
  }

  if (!state.session) {
    root.innerHTML =
      authView()

    bindAuth()

    return
  }

  if (
    state.view === 'reflection' &&
    state.reflectionPrayer
  ) {
    root.innerHTML =
      shell(
        reflectionView(
          state.reflectionPrayer
        )
      )

    bindReflection()

    return
  }

  if (
    state.view === 'edit-memory' &&
    state.editingReflection
  ) {
    root.innerHTML =
      shell(
        editMemoryView(
          state.editingReflection
        )
      )

    bindEditMemory()

    return
  }

  let content

  if (state.view === 'journal') {
    content =
      await journalView()
  } else if (
    state.view === 'prayers'
  ) {
    content =
      await prayersView()
  } else if (
    state.view === 'memory'
  ) {
    content =
      await memoryView()
  } else if (
    state.view === 'profile'
  ) {
    content =
      await profileView()
  } else {
    content =
      await homeView()
  }

  root.innerHTML =
    shell(content)

  bindApp()
}

/* ============================================================
   AUTH BINDINGS
============================================================ */

function bindAuth() {
  if (state.recoveryMode) {

    const form =
      document.getElementById(
        'recoveryForm'
      )

    form.onsubmit =
      async e => {

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
          newPassword.length < 8
        ) {
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
              password:
                newPassword
            })

          if (error) {
            msg.textContent =
              `Password could not be updated: ${error.message}`

            return
          }

          state.recoveryMode =
            false

          state.view =
            'home'

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

    state.authMode =
      'login'

    render()
  }

  document.getElementById(
    'signupTab'
  ).onclick = () => {

    state.authMode =
      'signup'

    render()
  }

  document.getElementById(
    'authForm'
  ).onsubmit =
    async e => {

      e.preventDefault()

      const email =
        document
          .getElementById(
            'email'
          )
          .value
          .trim()

      const password =
        document
          .getElementById(
            'password'
          )
          .value

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
  ).onclick =
    async e => {

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
  ).onsubmit =
    async e => {

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

      if (
        newPassword.length < 8
      ) {
        msg.textContent =
          'Your password must be at least 8 characters.'

        return
      }

      msg.textContent =
        'Updating your password…'

      try {

        const { error } =
          await supabase.auth.updateUser({
            password:
              newPassword
          })

        if (error) {

          msg.textContent =
            `Password could not be updated: ${error.message}`

          return
        }

        await supabase.auth.signOut()

        state.session =
          null

        state.recoveryMode =
          false

        state.authMode =
          'login'

        await render()

      } catch (error) {

        msg.textContent =
          `Password could not be updated: ${
            error?.message ||
            'Please try again.'
          }`
      }
    }
}

/* ============================================================
   VOICE TO TEXT
============================================================ */

function startVoiceToText(
  buttonId,
  textareaId,
  statusId
) {
  const button =
    document.getElementById(
      buttonId
    )

  const textarea =
    document.getElementById(
      textareaId
    )

  const status =
    document.getElementById(
      statusId
    )

  if (
    !button ||
    !textarea ||
    !status
  ) {
    return
  }

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition

  if (!SpeechRecognition) {

    button.disabled =
      true

    status.textContent =
      'Voice typing is not supported in this browser.'

    return
  }

  const recognition =
    new SpeechRecognition()

  recognition.continuous =
    false

  recognition.interimResults =
    false

  recognition.lang =
    'en-US'

  recognition.onstart =
    () => {

      button.textContent =
        '🎙 Listening…'

      status.textContent =
        'Speak naturally.'
    }

  recognition.onresult =
    event => {

      const transcript =
        Array.from(
          event.results
        )
          .map(
            result =>
              result[0].transcript
          )
          .join(' ')

      const existing =
        textarea.value.trim()

      textarea.value =
        existing
          ? `${existing} ${transcript}`
          : transcript
    }

  recognition.onerror =
    event => {

      status.textContent =
        event.error ===
        'not-allowed'
          ? 'Microphone permission was denied.'
          : 'Voice typing could not start.'
    }

  recognition.onend =
    () => {

      button.textContent =
        '🎙 Voice to text'

      if (
        status.textContent ===
        'Speak naturally.'
      ) {
        status.textContent =
          'Voice entry complete.'
      }
    }

  button.onclick =
    () => {

      status.textContent =
        ''

      recognition.start()
    }
}

/* ============================================================
   APP BINDINGS
============================================================ */

function bindApp() {

  document
    .querySelectorAll(
      '[data-view]'
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            state.view =
              button.dataset.view

            state.reflectionPrayer =
              null

            state.editingReflection =
              null

            render()
          }
      }
    )

  document
    .getElementById(
      'signout'
    )
    ?.addEventListener(
      'click',
      async () => {

        await supabase.auth.signOut()

        state.session =
          null

        state.view =
          'home'

        state.reflectionPrayer =
          null

        state.editingReflection =
          null

        render()
      }
    )

  /* Journal */

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

        const msg =
          document.getElementById(
            'journalMsg'
          )

        msg.textContent =
          r.error?.message ||
          'Saved.'

        if (!r.error) {
          render()
        }
      }
    )

  /* Prayer */

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

        const msg =
          document.getElementById(
            'prayerMsg'
          )

        msg.textContent =
          r.error?.message ||
          'Prayer saved.'

        if (!r.error) {
          render()
        }
      }
    )

  /* Mark answered */

  document
    .querySelectorAll(
      '[data-answer]'
    )
    .forEach(
      button => {

        button.onclick =
          async () => {

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

            if (
              note === null
            ) {
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
                    note.trim() ||
                    null
                })
                .eq(
                  'id',
                  button.dataset.answer
                )

            if (r.error) {

              alert(
                `The prayer could not be updated: ${r.error.message}`
              )

              return
            }

            render()
          }
      }
    )

  /* Reflection */

  document
    .querySelectorAll(
      '[data-reflect]'
    )
    .forEach(
      button => {

        button.onclick =
          async () => {

            const {
              data: prayer,
              error
            } =
              await supabase
                .from(
                  'prayer_requests'
                )
                .select('*')
                .eq(
                  'id',
                  button.dataset.reflect
                )
                .single()

            if (error) {

              alert(
                `Unable to open this reflection: ${error.message}`
              )

              return
            }

            state.reflectionPrayer =
              prayer

            state.view =
              'reflection'

            render()
          }
      }
    )

  /* Voice */

  startVoiceToText(
    'journalVoice',
    'jbody',
    'journalVoiceStatus'
  )

  startVoiceToText(
    'prayerVoice',
    'pdetails',
    'prayerVoiceStatus'
  )

  /* Memory Bank */

  document
    .querySelectorAll(
      '[data-edit-memory]'
    )
    .forEach(
      button => {

        button.onclick =
          async () => {

            const {
              data: memory,
              error
            } =
              await supabase
                .from(
                  'prayer_reflections'
                )
                .select('*')
                .eq(
                  'id',
                  button.dataset.editMemory
                )
                .single()

            if (error) {

              alert(
                `Unable to open this memory: ${error.message}`
              )

              return
            }

            state.editingReflection =
              memory

            state.view =
              'edit-memory'

            render()
          }
      }
    )

  document
    .querySelectorAll(
      '[data-delete-memory]'
    )
    .forEach(
      button => {

        button.onclick =
          async () => {

            const confirmed =
              window.confirm(
                'Remove this memory from your Memory Bank? The original answered prayer will remain.'
              )

            if (!confirmed) {
              return
            }

            const {
              error
            } =
              await supabase
                .from(
                  'prayer_reflections'
                )
                .delete()
                .eq(
                  'id',
                  button.dataset.deleteMemory
                )

            if (error) {

              alert(
                `The memory could not be deleted: ${error.message}`
              )

              return
            }

            render()
          }
      }
    )
}

/* ============================================================
   REFLECTION BINDING
============================================================ */

function bindReflection() {

  document
    .getElementById(
      'cancelReflection'
    )
    ?.addEventListener(
      'click',
      () => {

        state.reflectionPrayer =
          null

        state.view =
          'prayers'

        render()
      }
    )

  document
    .getElementById(
      'reflectionForm'
    )
    ?.addEventListener(
      'submit',
      async e => {

        e.preventDefault()

        const text =
          document
            .getElementById(
              'reflectionText'
            )
            .value
            .trim()

        const saveAsMemory =
          document
            .getElementById(
              'saveMemory'
            )
            .checked

        const msg =
          document.getElementById(
            'reflectionMsg'
          )

        if (!text) {

          msg.textContent =
            'Write a thought or reflection before saving.'

          return
        }

        msg.textContent =
          'Saving your reflection…'

        const prayer =
          state.reflectionPrayer

        const prompt =
          `What do you want to remember about how God answered "${prayer.title}"?`

        const {
          error
        } =
          await supabase
            .from(
              'prayer_reflections'
            )
            .insert({

              user_id:
                state.session.user.id,

              prayer_request_id:
                prayer.id,

              reflection_prompt:
                prompt,

              reflection_text:
                text,

              save_as_memory:
                saveAsMemory,

              memory_type:
                'memory',

              memory_title:
                null
            })

        if (error) {

          msg.textContent =
            `Your reflection could not be saved: ${error.message}`

          return
        }

        msg.textContent =
          saveAsMemory
            ? 'Saved to your Memory Bank.'
            : 'Your reflection was saved.'

        setTimeout(
          () => {

            state.reflectionPrayer =
              null

            state.view =
              saveAsMemory
                ? 'memory'
                : 'prayers'

            render()

          },
          900
        )
      }
    )
}

/* ============================================================
   EDIT MEMORY BINDING
============================================================ */

function bindEditMemory() {

  document
    .getElementById(
      'cancelMemoryEdit'
    )
    ?.addEventListener(
      'click',
      () => {

        state.editingReflection =
          null

        state.view =
          'memory'

        render()
      }
    )

  startVoiceToText(
    'memoryVoice',
    'memoryText',
    'memoryVoiceStatus'
  )

  document
    .getElementById(
      'editMemoryForm'
    )
    ?.addEventListener(
      'submit',
      async e => {

        e.preventDefault()

        const title =
          document
            .getElementById(
              'memoryTitle'
            )
            .value
            .trim()

        const type =
          document
            .getElementById(
              'memoryType'
            )
            .value

        const text =
          document
            .getElementById(
              'memoryText'
            )
            .value
            .trim()

        const msg =
          document.getElementById(
            'memoryEditMsg'
          )

        if (!text) {

          msg.textContent =
            'Your reflection cannot be empty.'

          return
        }

        msg.textContent =
          'Saving changes…'

        const {
          error
        } =
          await supabase
            .from(
              'prayer_reflections'
            )
            .update({

              memory_title:
                title || null,

              memory_type:
                type,

              reflection_text:
                text,

              save_as_memory:
                true
            })
            .eq(
              'id',
              state.editingReflection.id
            )

        if (error) {

          msg.textContent =
            `Your memory could not be updated: ${error.message}`

          return
        }

        state.editingReflection =
          null

        state.view =
          'memory'

        await render()
      }
    )
}

/* ============================================================
   AUTH STATE
============================================================ */

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

      state.recoveryMode =
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

      state.recoveryMode =
        false

      state.view =
        'home'

      state.reflectionPrayer =
        null

      state.editingReflection =
        null
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

loadSession()
