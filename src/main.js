import { createClient } from '@supabase/supabase-js'
import './styles.css'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase configuration. Check Vercel environment variables.'
  )
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

  reflectionPrayer: null,
  editingReflection: null,
  editingMemory: null,

  memoryItems: [],
  memorySearch: '',
  memorySource: 'all',
  memorySort: 'newest'
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

async function loadMemories() {
  if (!state.session) {
    state.memoryItems = []
    return
  }

  const { data, error } = await supabase
    .from('memory_points')
    .select(`
      id,
      user_id,
      prayer_reflection_id,
      prayer_request_id,
      title,
      memory_text,
      source_type,
      created_at,
      updated_at
    `)
    .eq('user_id', state.session.user.id)
    .order('created_at', {
      ascending: false
    })

  if (error) {
    console.error('MEMORY LOAD ERROR:', error)
    state.memoryItems = []
    return
  }

  state.memoryItems = data || []
}

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

function formatDate(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatSource(source = '') {
  if (!source) return 'Memory'

  return source
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

function shortText(text = '', length = 260) {
  const clean = String(text).trim()

  if (clean.length <= length) {
    return clean
  }

  return `${clean.slice(0, length).trim()}…`
}

/* =========================================================
   AUTH
========================================================= */

function authView() {
  if (state.recoveryMode) {
    return `
      <main class="auth">

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

            <button class="primary" type="submit">
              Save new password
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
          <span>Today</span>
        </button>

        <button data-view="journal">
          <span>Journal</span>
        </button>

        <button data-view="prayers">
          <span>Prayers</span>
        </button>

        <button data-view="memories">
          <span>Memories</span>
        </button>

        <button data-view="profile">
          <span>Profile</span>
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

  return `
    <main>

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
            data-view="memories"
          >
            Visit Memory Bank
          </button>

        </div>

      </section>

    </main>
  `
}

/* =========================================================
   JOURNAL
========================================================= */

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

  return `
    <main>

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
          ? `
            <section class="card reflection-prompt-card">

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
          entries.map(e => `
            <article class="entry">

              <small>
                ${esc(e.entry_date || '')}
              </small>

              <h3>
                ${esc(
                  e.title ||
                  'Prayer journal'
                )}
              </h3>

              <p>
                ${esc(
                  shortText(e.body || '', 280)
                )}
              </p>

            </article>
          `).join('')
          ||
          `
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
    data: prayers = []
  } = await supabase
    .from('prayer_requests')
    .select('*')
    .order('updated_at', {
      ascending: false
    })

  return `
    <main>

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
                  .map(category => `
                    <option value="${esc(category)}">
                      ${esc(category)}
                    </option>
                  `)
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
          prayers.map(p => `
            <article class="entry">

              <div class="row">

                <div class="pill-group">

                  <span class="pill ${esc(p.status || '')}">
                    ${esc(p.status || '')}
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

                </div>

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

              ${
                p.details
                  ? `
                    <p>
                      ${esc(p.details)}
                    </p>
                  `
                  : ''
              }

              ${
                p.answer_note
                  ? `
                    <div class="answer-block">

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

                    </div>
                  `
                  : ''
              }

            </article>
          `).join('')
          ||
          `
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
   REFLECTION
========================================================= */

function reflectionView(prayer) {
  const suggestedPrompt =
    `What do you want to remember about how God answered "${prayer.title}"?`

  const editing =
    Boolean(state.editingReflection)

  const initialText =
    editing
      ? state.editingReflection.reflection_text || ''
      : ''

  return `
    <main>

      <div class="section-title">

        <p class="eyebrow">
          REMEMBER HIS FAITHFULNESS
        </p>

        <h2>
          ${
            editing
              ? 'Continue your reflection.'
              : 'Hold onto what God has done.'
          }
        </h2>

        <p class="muted">
          ${
            editing
              ? 'Your reflection can grow as you learn more over time.'
              : 'Take a moment to reflect on this answered prayer.'
          }
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
            ? `
              <p>
                ${esc(prayer.details)}
              </p>
            `
            : ''
        }

        ${
          prayer.answer_note
            ? `
              <div class="scripture">

                <p class="eyebrow">
                  WHAT HAPPENED
                </p>

                <p>
                  ${esc(prayer.answer_note)}
                </p>

              </div>
            `
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
          This is only a suggestion.
          Your reflection can be completely different.
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
            >${esc(initialText)}</textarea>

          </label>

          ${
            !editing
              ? `
                <label class="memory-choice">

                  <input
                    id="saveMemory"
                    type="checkbox"
                    checked
                  >

                  <span>
                    <strong>Keep this in Memory Bank</strong>
                    <small>
                      Save this reflection as a lesson
                      you can return to later.
                    </small>
                  </span>

                </label>
              `
              : ''
          }

          <button
            class="primary"
            type="submit"
          >
            ${
              editing
                ? 'Update reflection'
                : 'Save reflection'
            }
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

    </main>
  `
}

/* =========================================================
   MEMORY BANK
========================================================= */

function getFilteredMemories() {
  const search =
    state.memorySearch
      .trim()
      .toLowerCase()

  let results =
    [...state.memoryItems]

  if (search) {
    results =
      results.filter(memory => {

        const haystack = [
          memory.title,
          memory.memory_text,
          memory.source_type
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return haystack.includes(search)
      })
  }

  if (state.memorySource !== 'all') {
    results =
      results.filter(
        memory =>
          memory.source_type ===
          state.memorySource
      )
  }

  results.sort((a, b) => {

    const dateA =
      new Date(
        a.created_at || 0
      ).getTime()

    const dateB =
      new Date(
        b.created_at || 0
      ).getTime()

    return state.memorySort === 'oldest'
      ? dateA - dateB
      : dateB - dateA
  })

  return results
}

function memoryCard(memory) {
  return `
    <article
      class="memory-card"
      data-memory-card="${esc(memory.id)}"
    >

      <div class="memory-card-top">

        <div class="memory-source">
          <span class="memory-icon">✦</span>

          <span>
            ${esc(
              formatSource(
                memory.source_type
              )
            )}
          </span>
        </div>

        <span class="memory-date">
          ${esc(
            formatDate(
              memory.created_at
            )
          )}
        </span>

      </div>

      <h3>
        ${esc(
          memory.title ||
          'A lesson to remember'
        )}
      </h3>

      <p class="memory-text">
        ${esc(
          shortText(
            memory.memory_text || '',
            420
          )
        )}
      </p>

      <div class="memory-card-bottom">

        <span class="memory-label">
          A lesson to remember
        </span>

        <button
          type="button"
          class="small"
          data-edit-memory="${esc(memory.id)}"
        >
          Edit
        </button>

      </div>

    </article>
  `
}

function memoryResultsMarkup() {
  const memories =
    getFilteredMemories()

  if (!memories.length) {
    return `
      <div class="memory-empty">

        <div class="memory-empty-icon">
          ✦
        </div>

        <h3>
          ${
            state.memoryItems.length
              ? 'No memories match your filters.'
              : 'Your Memory Bank is waiting.'
          }
        </h3>

        <p>
          ${
            state.memoryItems.length
              ? 'Try another search or remove a filter.'
              : 'When you choose to keep a lesson from an answered prayer, it will live here.'
          }
        </p>

      </div>
    `
  }

  return memories
    .map(memoryCard)
    .join('')
}

function memoriesView() {
  const sourceTypes = [
    ...new Set(
      state.memoryItems
        .map(item => item.source_type)
        .filter(Boolean)
    )
  ]

  const memories =
    getFilteredMemories()

  return `
    <main class="memory-bank-page">

      <div class="section-title memory-heading">

        <p class="eyebrow">
          MEMORY BANK
        </p>

        <h2>
          Remember His faithfulness.
        </h2>

        <p class="muted">
          Keep the lessons, revelations,
          and answered prayers you never want to forget.
        </p>

      </div>

      <section class="memory-hero">

        <div class="memory-hero-icon">
          ✦
        </div>

        <div>

          <p class="eyebrow">
            YOUR COLLECTION
          </p>

          <h3>
            ${state.memoryItems.length}
            ${
              state.memoryItems.length === 1
                ? 'memory'
                : 'memories'
            }
          </h3>

          <p>
            A personal record of what
            God has taught you.
          </p>

        </div>

      </section>

      <section class="memory-tools">

        <div class="memory-search-wrap">

          <span class="memory-search-icon">
            ⌕
          </span>

          <input
            id="memorySearch"
            class="memory-search"
            type="search"
            autocomplete="off"
            value="${esc(state.memorySearch)}"
            placeholder="Search your memories..."
            aria-label="Search memories"
          >

        </div>

        <div class="memory-filter-row">

          <select
            id="memorySource"
            class="memory-filter"
            aria-label="Filter memories"
          >

            <option value="all">
              All memories
            </option>

            ${
              sourceTypes.map(source => `
                <option
                  value="${esc(source)}"
                  ${
                    state.memorySource === source
                      ? 'selected'
                      : ''
                  }
                >
                  ${esc(formatSource(source))}
                </option>
              `).join('')
            }

          </select>

          <select
            id="memorySort"
            class="memory-filter"
            aria-label="Sort memories"
          >

            <option
              value="newest"
              ${state.memorySort === 'newest' ? 'selected' : ''}
            >
              Newest first
            </option>

            <option
              value="oldest"
              ${state.memorySort === 'oldest' ? 'selected' : ''}
            >
              Oldest first
            </option>

          </select>

        </div>

      </section>

      <div
        class="memory-result-meta"
        id="memoryResultMeta"
      >
        Showing
        ${memories.length}
        of
        ${state.memoryItems.length}
      </div>

      <section
        class="memory-grid"
        id="memoryResults"
      >
        ${memoryResultsMarkup()}
      </section>

    </main>
  `
}

function editMemoryView(memory) {
  return `
    <main>

      <div class="section-title">

        <p class="eyebrow">
          MEMORY BANK
        </p>

        <h2>
          Edit your memory.
        </h2>

        <p class="muted">
          Your memory stays connected to
          the answered prayer it came from.
        </p>

      </div>

      <section class="card memory-editor">

        <form id="memoryEditForm">

          <label>
            Memory title

            <input
              id="memoryEditTitle"
              value="${esc(memory.title || '')}"
              maxlength="120"
              required
            >
          </label>

          <label>
            Your memory

            <textarea
              id="memoryEditText"
              rows="10"
              required
              placeholder="What do you want to remember?"
            >${esc(memory.memory_text || '')}</textarea>

          </label>

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

    </main>
  `
}

/* =========================================================
   PROFILE
========================================================= */

async function profileView() {
  const name =
    state.profile?.display_name ||
    state.session.user.email?.split('@')[0] ||
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
          ${esc(state.session.user.email)}
        </p>

        <p class="muted">
          Your private journal, prayers,
          reflections, and memories are protected
          by Supabase Row Level Security.
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
    state.view === 'memoryEdit' &&
    state.editingMemory
  ) {
    root.innerHTML =
      shell(
        editMemoryView(
          state.editingMemory
        )
      )

    bindMemoryEdit()
    return
  }

  if (
    state.view === 'memories'
  ) {
    await loadMemories()

    root.innerHTML =
      shell(
        memoriesView()
      )

    bindMemoryBank()
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

  root.innerHTML =
    shell(content)

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

            state.session =
              null

            state.recoveryMode =
              false

            state.authMode =
              'login'

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

/* =========================================================
   VOICE TO TEXT
========================================================= */

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
        event.error === 'not-allowed'
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

      try {
        recognition.start()
      } catch {
        status.textContent =
          'Voice typing is already active.'
      }
    }
}

/* =========================================================
   MAIN APP BINDINGS
========================================================= */

function bindApp() {

  document
    .querySelectorAll(
      '[data-view]'
    )
    .forEach(button => {

      button.onclick =
        () => {

          state.view =
            button.dataset.view

          state.editingMemory =
            null

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

        state.session =
          null

        state.view =
          'home'

        state.reflectionPrayer =
          null

        state.editingMemory =
          null

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

        const r =
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

        document
          .getElementById(
            'journalMsg'
          )
          .textContent =
            r.error?.message ||
            'Saved.'

        if (!r.error) {
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
    .forEach(button => {

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
    })

  document
    .querySelectorAll(
      '[data-reflect]'
    )
    .forEach(button => {

      button.onclick =
        async () => {

          const prayerId =
            button.dataset.reflect

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
                prayerId
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

          state.editingReflection =
            null

          state.view =
            'reflection'

          render()
        }
    })

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
}

/* =========================================================
   REFLECTION BINDINGS
========================================================= */

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

        state.editingReflection =
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

        const msg =
          document.getElementById(
            'reflectionMsg'
          )

        if (!text) {

          msg.textContent =
            'Write a thought or reflection before saving.'

          return
        }

        const prayer =
          state.reflectionPrayer

        msg.textContent =
          'Saving your reflection…'

        /* -------------------------------------------------
           EDIT EXISTING REFLECTION
        ------------------------------------------------- */

        if (state.editingReflection) {

          const reflection =
            state.editingReflection

          const { error } =
            await supabase
              .from(
                'prayer_reflections'
              )
              .update({
                reflection_text:
                  text,

                updated_at:
                  new Date().toISOString()
              })
              .eq(
                'id',
                reflection.id
              )
              .eq(
                'user_id',
                state.session.user.id
              )

          if (error) {

            msg.textContent =
              `Your reflection could not be updated: ${error.message}`

            return
          }

          /*
            Keep the corresponding Memory Bank
            record synchronized when it exists.
          */

          if (
            reflection.id
          ) {

            await supabase
              .from(
                'memory_points'
              )
              .update({
                memory_text:
                  text,

                updated_at:
                  new Date().toISOString()
              })
              .eq(
                'prayer_reflection_id',
                reflection.id
              )
              .eq(
                'user_id',
                state.session.user.id
              )
          }

          msg.textContent =
            'Your reflection was updated.'

          setTimeout(
            () => {

              state.editingReflection =
                null

              state.reflectionPrayer =
                null

              state.view =
                'memories'

              render()

            },
            700
          )

          return
        }

        /* -------------------------------------------------
           NEW REFLECTION
        ------------------------------------------------- */

        const saveAsMemory =
          document
            .getElementById(
              'saveMemory'
            )
            ?.checked ||
          false

        const prompt =
          `What do you want to remember about how God answered "${prayer.title}"?`

        const {
          data: reflection,
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
                saveAsMemory
            })
            .select('*')
            .single()

        if (error) {

          msg.textContent =
            `Your reflection could not be saved: ${error.message}`

          return
        }

        /*
          Some database setups create the memory
          automatically when save_as_memory is true.

          To avoid creating duplicate memories,
          we only create a memory ourselves if the
          database did not create one.
        */

        if (saveAsMemory) {

          const {
            data: existingMemory
          } =
            await supabase
              .from(
                'memory_points'
              )
              .select('id')
              .eq(
                'prayer_reflection_id',
                reflection.id
              )
              .eq(
                'user_id',
                state.session.user.id
              )
              .maybeSingle()

          if (!existingMemory) {

            await supabase
              .from(
                'memory_points'
              )
              .insert({

                user_id:
                  state.session.user.id,

                prayer_reflection_id:
                  reflection.id,

                prayer_request_id:
                  prayer.id,

                title:
                  'A lesson to remember',

                memory_text:
                  text,

                source_type:
                  'answered_prayer'
              })
          }
        }

        msg.textContent =
          saveAsMemory
            ? 'Your reflection was saved to the Memory Bank.'
            : 'Your reflection was saved.'

        setTimeout(
          () => {

            state.reflectionPrayer =
              null

            state.view =
              saveAsMemory
                ? 'memories'
                : 'prayers'

            render()

          },
          700
        )
      }
    )
}

/* =========================================================
   MEMORY BANK BINDINGS
   IMPORTANT:
   Search/filter NEVER re-render root.innerHTML.
   This keeps the cursor in the search field.
========================================================= */

function bindMemoryBank() {

  const searchInput =
    document.getElementById(
      'memorySearch'
    )

  const sourceSelect =
    document.getElementById(
      'memorySource'
    )

  const sortSelect =
    document.getElementById(
      'memorySort'
    )

  const results =
    document.getElementById(
      'memoryResults'
    )

  const meta =
    document.getElementById(
      'memoryResultMeta'
    )

  function updateResults() {

    const filtered =
      getFilteredMemories()

    /*
      Only update the results container.
      The search input itself is NEVER replaced.
    */

    results.innerHTML =
      filtered.length
        ? filtered.map(memoryCard).join('')
        : memoryResultsMarkup()

    meta.textContent =
      `Showing ${filtered.length} of ${state.memoryItems.length}`

    bindMemoryCardButtons()
  }

  searchInput?.addEventListener(
    'input',
    event => {

      state.memorySearch =
        event.target.value

      updateResults()
    }
  )

  sourceSelect?.addEventListener(
    'change',
    event => {

      state.memorySource =
        event.target.value

      updateResults()
    }
  )

  sortSelect?.addEventListener(
    'change',
    event => {

      state.memorySort =
        event.target.value

      updateResults()
    }
  )

  bindMemoryCardButtons()
}

function bindMemoryCardButtons() {

  document
    .querySelectorAll(
      '[data-edit-memory]'
    )
    .forEach(button => {

      button.onclick =
        async () => {

          const memoryId =
            button.dataset.editMemory

          const memory =
            state.memoryItems.find(
              item =>
                item.id ===
                memoryId
            )

          if (!memory) {
            return
          }

          state.editingMemory =
            memory

          state.view =
            'memoryEdit'

          render()
        }
    })
}

/* =========================================================
   MEMORY EDIT
========================================================= */

function bindMemoryEdit() {

  document
    .getElementById(
      'cancelMemoryEdit'
    )
    ?.addEventListener(
      'click',
      () => {

        state.editingMemory =
          null

        state.view =
          'memories'

        render()
      }
    )

  document
    .getElementById(
      'memoryEditForm'
    )
    ?.addEventListener(
      'submit',
      async e => {

        e.preventDefault()

        const title =
          document
            .getElementById(
              'memoryEditTitle'
            )
            .value
            .trim()

        const memoryText =
          document
            .getElementById(
              'memoryEditText'
            )
            .value
            .trim()

        const msg =
          document.getElementById(
            'memoryEditMsg'
          )

        if (!title) {

          msg.textContent =
            'Please add a title.'

          return
        }

        if (!memoryText) {

          msg.textContent =
            'Please add something to remember.'

          return
        }

        msg.textContent =
          'Saving changes…'

        const memory =
          state.editingMemory

        const { error } =
          await supabase
            .from(
              'memory_points'
            )
            .update({

              title,

              memory_text:
                memoryText,

              updated_at:
                new Date().toISOString()

            })
            .eq(
              'id',
              memory.id
            )
            .eq(
              'user_id',
              state.session.user.id
            )

        if (error) {

          msg.textContent =
            `Your memory could not be updated: ${error.message}`

          return
        }

        /*
          Keep linked prayer reflection synchronized
          when the memory came from one.
        */

        if (
          memory.prayer_reflection_id
        ) {

          await supabase
            .from(
              'prayer_reflections'
            )
            .update({

              reflection_text:
                memoryText,

              updated_at:
                new Date().toISOString()

            })
            .eq(
              'id',
              memory.prayer_reflection_id
            )
            .eq(
              'user_id',
              state.session.user.id
            )
        }

        msg.textContent =
          'Memory updated.'

        setTimeout(
          () => {

            state.editingMemory =
              null

            state.view =
              'memories'

            render()

          },
          600
        )
      }
    )
}

/* =========================================================
   AUTH STATE
========================================================= */

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

      state.editingMemory =
        null

      state.memoryItems =
        []
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
   START
========================================================= */

loadSession()
