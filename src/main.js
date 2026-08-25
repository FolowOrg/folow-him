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
  editingReflection: null,

  memorySearch: '',
  memoryCategory: 'All',
  memorySource: 'All'
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

const memoryCategories = [
  'All',
  'Faith',
  'Answered Prayer',
  'Lesson Learned',
  'Personal Growth',
  'God’s Faithfulness',
  'Other'
]

/* =========================================================
   SESSION
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
  const date = new Date()
    .toISOString()
    .slice(0, 10)

  const { data } = await supabase
    .from('daily_content')
    .select('*')
    .eq('content_date', date)
    .maybeSingle()

  state.content = data
}

/* =========================================================
   HELPERS
========================================================= */

function esc(value = '') {
  return String(value).replace(
    /[&<>"']/g,
    char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char])
  )
}

function formatDate(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString(
    undefined,
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
  )
}

function formatShortDate(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
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

/* =========================================================
   AUTH VIEW
========================================================= */

function authView() {
  return `
    <main class="auth">

      <div class="mark">❧</div>

      <h1>Folow Him</h1>

      <p class="tag">
        A gentle place to pray, reflect,
        and remember His faithfulness.
      </p>

      <section class="card auth-card">

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
            class="primary full-width"
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

/* =========================================================
   RECOVERY
========================================================= */

function recoveryView() {
  return `
    <main class="auth">

      <div class="mark">❧</div>

      <h1>Folow Him</h1>

      <p class="tag">
        Choose a new password for your account.
      </p>

      <section class="card auth-card">

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
            class="primary full-width"
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

      <header class="app-header">

        <div class="brand">

          <span class="brand-mark">❧</span>

          <span>
            Folow Him
          </span>

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

        <button
          data-view="home"
          class="${state.view === 'home' ? 'active' : ''}"
        >
          <span>⌂</span>
          <small>Today</small>
        </button>

        <button
          data-view="journal"
          class="${state.view === 'journal' ? 'active' : ''}"
        >
          <span>✎</span>
          <small>Journal</small>
        </button>

        <button
          data-view="prayers"
          class="${state.view === 'prayers' ? 'active' : ''}"
        >
          <span>♡</span>
          <small>Prayers</small>
        </button>

        <button
          data-view="memories"
          class="${state.view === 'memories' ? 'active' : ''}"
        >
          <span>✦</span>
          <small>Memories</small>
        </button>

        <button
          data-view="profile"
          class="${state.view === 'profile' ? 'active' : ''}"
        >
          <span>○</span>
          <small>Profile</small>
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

        <p class="date-line">
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
                Add daily content from your
                admin library to personalize
                this screen.
              </p>

            </section>
          `
      }

      <section class="grid">

        <div class="card feature-card">

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

        <div class="card feature-card">

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
  const { data: entries = [] } =
    await supabase
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

        <p class="section-intro">
          Come away. Be still.
          Write what is on your heart.
        </p>

      </div>

      ${
        c?.reflection_prompt
          ? `
            <section class="card reflection-prompt-card">

              <div class="prompt-icon">
                ✦
              </div>

              <p class="eyebrow">
                TODAY'S REFLECTION
              </p>

              <h3>
                ${esc(c.reflection_prompt)}
              </h3>

              <p class="muted">
                Let this question guide your
                reflection, or simply write
                what is on your heart.
              </p>

            </section>
          `
          : ''
      }

      <section class="card journal-editor">

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
              class="secondary voice-button"
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
          entries.length
            ? entries.map(entry => `
                <article class="entry journal-entry">

                  <small class="entry-date">
                    ${esc(
                      formatShortDate(
                        entry.entry_date
                      )
                    )}
                  </small>

                  <h3>
                    ${esc(
                      entry.title ||
                      'Prayer journal'
                    )}
                  </h3>

                  <p>
                    ${esc(entry.body)}
                  </p>

                </article>
              `).join('')
            : `
              <div class="empty-state">
                <div class="empty-icon">✎</div>

                <h3>
                  Your first entry can begin today.
                </h3>

                <p>
                  This is your private space
                  to pray, process, and remember.
                </p>
              </div>
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
  const { data: prayers = [] } =
    await supabase
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

        <p class="section-intro">
          Record what you're praying for
          and watch for His faithfulness.
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
                  .map(category => `
                    <option
                      value="${esc(category)}"
                    >
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
              rows="5"
              placeholder="Add context..."
            ></textarea>

          </label>

          <div class="voice-row">

            <button
              type="button"
              class="secondary voice-button"
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

      <div class="list prayer-list">

        ${
          prayers.length
            ? prayers.map(p => `
                <article class="entry prayer-entry">

                  <div class="row">

                    <div class="pill-group">

                      <span
                        class="pill ${
                          p.status === 'answered'
                            ? 'answered'
                            : ''
                        }"
                      >
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

                          <p class="eyebrow">
                            ANSWER
                          </p>

                          <p>
                            ${esc(p.answer_note)}
                          </p>

                          <div class="answer-actions">

                            <button
                              type="button"
                              class="secondary"
                              data-reflect="${esc(p.id)}"
                            >
                              Reflect on this answer
                            </button>

                          </div>

                        </div>
                      `
                      : ''
                  }

                </article>
              `).join('')
            : `
              <div class="empty-state">
                <div class="empty-icon">♡</div>

                <h3>
                  No prayer requests yet.
                </h3>

                <p>
                  Start by bringing something
                  on your heart to Him.
                </p>
              </div>
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

  return `
    <main>

      <div class="section-title">

        <p class="eyebrow">
          REMEMBER HIS FAITHFULNESS
        </p>

        <h2>
          Hold onto what God has done.
        </h2>

        <p class="muted">
          Take a moment to reflect on this
          answered prayer.
        </p>

      </div>

      <section class="card answered-summary">

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
              <div class="answer-highlight">

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

      <section class="card thought-prompt">

        <div class="prompt-icon">
          ✦
        </div>

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
              rows="9"
              placeholder="What did you learn? What did God reveal to you? What do you want to remember?"
            ></textarea>

          </label>

          <label class="checkbox-row">

            <input
              id="saveMemory"
              type="checkbox"
              checked
            >

            <span>
              Save this as a memory / lesson learned
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

    </main>
  `
}

/* =========================================================
   MEMORY BANK
========================================================= */

async function memoriesView() {
  const { data: memories = [], error } =
    await supabase
      .from('prayer_reflections')
      .select(`
        *,
        prayer_requests (
          id,
          title,
          category,
          answer_note
        )
      `)
      .eq('user_id', state.session.user.id)
      .eq('is_memory', true)
      .order('updated_at', {
        ascending: false
      })

  if (error) {
    return `
      <main>

        <div class="section-title">

          <p class="eyebrow">
            MEMORY BANK
          </p>

          <h2>
            Remember His faithfulness.
          </h2>

        </div>

        <section class="card">

          <p class="msg">
            Memories could not be loaded:
            ${esc(error.message)}
          </p>

        </section>

      </main>
    `
  }

  const categories = [
    ...new Set(
      memories
        .map(m => m.memory_category)
        .filter(Boolean)
    )
  ]

  return `
    <main class="memory-bank-page">

      <div class="memory-hero">

        <p class="eyebrow">
          MEMORY BANK
        </p>

        <h2>
          What God has taught you.
        </h2>

        <p>
          A collection of answered prayers,
          lessons learned, and moments you
          never want to forget.
        </p>

      </div>

      <section class="memory-controls card">

        <div class="search-wrap">

          <span class="search-icon">
            ⌕
          </span>

          <input
            id="memorySearch"
            type="search"
            value="${esc(state.memorySearch)}"
            placeholder="Search your memories..."
            autocomplete="off"
            spellcheck="false"
          >

          ${
            state.memorySearch
              ? `
                <button
                  type="button"
                  class="search-clear"
                  id="clearMemorySearch"
                  aria-label="Clear search"
                >
                  ×
                </button>
              `
              : ''
          }

        </div>

        <div class="filter-heading">
          <span>
            Filter by category
          </span>
        </div>

        <div
          class="memory-filters"
          id="memoryFilters"
        >

          ${memoryCategories.map(category => `
            <button
              type="button"
              class="filter-chip ${
                state.memoryCategory === category
                  ? 'active'
                  : ''
              }"
              data-memory-category="${esc(category)}"
            >
              ${esc(category)}
            </button>
          `).join('')}

        </div>

      </section>

      <div
        id="memoryList"
        class="memory-list"
      >

        ${
          memories.length
            ? memories.map(memory => memoryCard(memory)).join('')
            : `
              <div class="empty-state memory-empty">

                <div class="empty-icon">
                  ✦
                </div>

                <h3>
                  Your Memory Bank is waiting.
                </h3>

                <p>
                  When you reflect on an answered
                  prayer and choose to save it,
                  it will live here.
                </p>

                <button
                  class="secondary"
                  data-view="prayers"
                >
                  View answered prayers
                </button>

              </div>
            `
        }

      </div>

      <div
        id="memoryNoResults"
        class="empty-state memory-empty hidden"
      >

        <div class="empty-icon">
          ⌕
        </div>

        <h3>
          Nothing found.
        </h3>

        <p>
          Try another search or category.
        </p>

      </div>

    </main>
  `
}

function memoryCard(memory) {
  const prayer =
    memory.prayer_requests || {}

  const title =
    memory.memory_title ||
    'A lesson to remember'

  const category =
    memory.memory_category ||
    'Answered Prayer'

  const reflection =
    memory.reflection_text ||
    ''

  return `
    <article
      class="memory-card"
      data-memory-card
      data-memory-id="${esc(memory.id)}"
      data-memory-search="${esc(
        `${title} ${category} ${reflection} ${
          prayer.title || ''
        }`
      ).toLowerCase()}"
      data-memory-category="${esc(category)}"
    >

      <div class="memory-card-top">

        <span class="memory-symbol">
          ✦
        </span>

        <span class="memory-category">
          ${esc(category)}
        </span>

        <span class="memory-date">
          ${esc(
            formatShortDate(
              memory.updated_at ||
              memory.created_at
            )
          )}
        </span>

      </div>

      <h3 class="memory-title">
        ${esc(title)}
      </h3>

      ${
        prayer.title
          ? `
            <div class="memory-source">

              <span>
                Answered prayer
              </span>

              <strong>
                ${esc(prayer.title)}
              </strong>

            </div>
          `
          : ''
      }

      <p class="memory-text">
        ${esc(reflection)}
      </p>

      <div class="memory-card-footer">

        <button
          type="button"
          class="memory-open"
          data-open-memory="${esc(memory.id)}"
        >
          Read memory
          <span>→</span>
        </button>

        <button
          type="button"
          class="memory-more"
          data-edit-memory="${esc(memory.id)}"
          aria-label="Edit memory"
        >
          ✎
        </button>

      </div>

    </article>
  `
}

/* =========================================================
   MEMORY DETAIL
========================================================= */

function memoryDetailView(memory) {
  const prayer =
    memory.prayer_requests || {}

  const title =
    memory.memory_title ||
    'A lesson to remember'

  const category =
    memory.memory_category ||
    'Answered Prayer'

  return `
    <main>

      <div class="memory-detail-header">

        <button
          type="button"
          class="back-button"
          id="backToMemories"
        >
          ← Memory Bank
        </button>

        <p class="eyebrow">
          ${esc(category)}
        </p>

        <h2>
          ${esc(title)}
        </h2>

        <p class="memory-detail-date">
          Saved ${esc(
            formatDate(
              memory.updated_at ||
              memory.created_at
            )
          )}
        </p>

      </div>

      ${
        prayer.title
          ? `
            <section class="card memory-source-card">

              <p class="eyebrow">
                ANSWERED PRAYER
              </p>

              <h3>
                ${esc(prayer.title)}
              </h3>

              ${
                prayer.answer_note
                  ? `
                    <p>
                      ${esc(prayer.answer_note)}
                    </p>
                  `
                  : ''
              }

            </section>
          `
          : ''
      }

      <section class="card memory-reading-card">

        <p class="eyebrow">
          WHAT I WANT TO REMEMBER
        </p>

        <div class="memory-reading-text">
          ${esc(memory.reflection_text)}
        </div>

      </section>

      <div class="memory-detail-actions">

        <button
          class="primary"
          data-edit-memory="${esc(memory.id)}"
        >
          Edit memory
        </button>

        <button
          class="secondary danger-soft"
          data-delete-memory="${esc(memory.id)}"
        >
          Remove from Memory Bank
        </button>

      </div>

    </main>
  `
}

/* =========================================================
   MEMORY EDIT
========================================================= */

function memoryEditView(memory) {
  const title =
    memory.memory_title ||
    'A lesson to remember'

  const category =
    memory.memory_category ||
    'Answered Prayer'

  return `
    <main>

      <div class="section-title">

        <button
          type="button"
          class="back-button"
          id="cancelMemoryEdit"
        >
          ← Back
        </button>

        <p class="eyebrow">
          EDIT MEMORY
        </p>

        <h2>
          Let the lesson grow.
        </h2>

        <p class="section-intro">
          Come back to this reflection whenever
          you learn something new or see God's
          answer more clearly over time.
        </p>

      </div>

      <section class="card memory-edit-card">

        <form id="memoryEditForm">

          <label>
            Memory title

            <input
              id="memoryTitle"
              value="${esc(title)}"
              maxlength="120"
              placeholder="Give this memory a name..."
            >
          </label>

          <label>
            Category

            <select id="memoryCategory">

              ${memoryCategories
                .filter(category => category !== 'All')
                .map(category => `
                  <option
                    value="${esc(category)}"
                    ${
                      category === category
                        ? ''
                        : ''
                    }
                  >
                    ${esc(category)}
                  </option>
                `)
                .join('')
              }

            </select>

          </label>

          <label>
            Reflection

            <textarea
              id="memoryText"
              rows="12"
              required
              placeholder="What do you want to remember?"
            >${esc(memory.reflection_text || '')}</textarea>

          </label>

          <div class="memory-edit-actions">

            <button
              class="primary"
              type="submit"
            >
              Save changes
            </button>

            <button
              type="button"
              class="secondary"
              id="cancelMemoryEditBottom"
            >
              Cancel
            </button>

          </div>

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
          reflections, and memories are
          protected by Supabase Row Level Security.
        </p>

      </section>

      <section class="card profile-feature">

        <div class="profile-feature-icon">
          ✦
        </div>

        <div>

          <p class="eyebrow">
            YOUR MEMORY BANK
          </p>

          <h3>
            Don't forget what He has done.
          </h3>

          <button
            class="secondary"
            data-view="memories"
          >
            Open Memory Bank
          </button>

        </div>

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
    root.innerHTML = shell(
      reflectionView(
        state.reflectionPrayer
      )
    )

    bindReflection()
    return
  }

  if (
    state.view === 'memory-detail' &&
    state.editingReflection
  ) {
    root.innerHTML = shell(
      memoryDetailView(
        state.editingReflection
      )
    )

    bindMemoryDetail()
    return
  }

  if (
    state.view === 'memory-edit' &&
    state.editingReflection
  ) {
    root.innerHTML = shell(
      memoryEditView(
        state.editingReflection
      )
    )

    bindMemoryEdit()
    return
  }

  let content

  if (state.view === 'journal') {
    content = await journalView()
  } else if (state.view === 'prayers') {
    content = await prayersView()
  } else if (state.view === 'memories') {
    content = await memoriesView()
  } else if (state.view === 'profile') {
    content = await profileView()
  } else {
    content = await homeView()
  }

  root.innerHTML = shell(content)

  bindApp()

  if (state.view === 'memories') {
    bindMemoryBank()
  }
}

/* =========================================================
   AUTH BINDINGS
========================================================= */

function bindAuth() {
  document.getElementById(
    'loginTab'
  )?.addEventListener(
    'click',
    () => {
      state.authMode = 'login'
      render()
    }
  )

  document.getElementById(
    'signupTab'
  )?.addEventListener(
    'click',
    () => {
      state.authMode = 'signup'
      render()
    }
  )

  document.getElementById(
    'authForm'
  )?.addEventListener(
    'submit',
    async e => {
      e.preventDefault()

      const email =
        document
          .getElementById('email')
          .value
          .trim()

      const password =
        document.getElementById('password').value

      const msg =
        document.getElementById('authMsg')

      msg.textContent = 'Please wait…'

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
  )

  document.getElementById(
    'reset'
  )?.addEventListener(
    'click',
    async () => {
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
  )
}

/* =========================================================
   RECOVERY BINDING
========================================================= */

function bindRecovery() {
  document.getElementById(
    'recoveryForm'
  )?.addEventListener(
    'submit',
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
        'Updating your password…'

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
        'Password updated successfully.'

      setTimeout(
        async () => {
          await supabase.auth.signOut()

          state.session = null
          state.recoveryMode = false
          state.view = 'home'

          await render()
        },
        1200
      )
    }
  )
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
    document.getElementById(buttonId)

  const textarea =
    document.getElementById(textareaId)

  const status =
    document.getElementById(statusId)

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
    button.disabled = true

    status.textContent =
      'Voice typing is not supported in this browser.'

    return
  }

  const recognition =
    new SpeechRecognition()

  recognition.continuous = false
  recognition.interimResults = false
  recognition.lang = 'en-US'

  recognition.onstart = () => {
    button.textContent =
      '🎙 Listening…'

    status.textContent =
      'Speak naturally.'
  }

  recognition.onresult = event => {
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

  recognition.onerror = event => {
    status.textContent =
      event.error === 'not-allowed'
        ? 'Microphone permission was denied.'
        : 'Voice typing could not start.'
  }

  recognition.onend = () => {
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

  button.onclick = () => {
    status.textContent = ''

    try {
      recognition.start()
    } catch {
      status.textContent =
        'Voice typing is already active.'
    }
  }
}

/* =========================================================
   APP BINDINGS
========================================================= */

function bindApp() {
  document
    .querySelectorAll('[data-view]')
    .forEach(button => {
      button.onclick = () => {
        state.view =
          button.dataset.view

        state.reflectionPrayer = null

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
        state.reflectionPrayer = null
        state.editingReflection = null

        render()
      }
    )

  bindJournalForm()
  bindPrayerForm()
  bindAnswerButtons()

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
   JOURNAL FORM
========================================================= */

function bindJournalForm() {
  document.getElementById(
    'journalForm'
  )?.addEventListener(
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
        document.getElementById(
          'journalMsg'
        )

      if (!body) {
        msg.textContent =
          'Write something before saving.'

        return
      }

      msg.textContent =
        'Saving…'

      const { error } =
        await supabase
          .from('journal_entries')
          .insert({
            user_id:
              state.session.user.id,
            title,
            body
          })

      if (error) {
        msg.textContent =
          `Could not save: ${error.message}`

        return
      }

      msg.textContent =
        'Saved.'

      await render()
    }
  )
}

/* =========================================================
   PRAYER FORM
========================================================= */

function bindPrayerForm() {
  document.getElementById(
    'prayerForm'
  )?.addEventListener(
    'submit',
    async e => {
      e.preventDefault()

      const title =
        document
          .getElementById('ptitle')
          .value
          .trim()

      const category =
        document.getElementById(
          'pcategory'
        ).value

      const details =
        document
          .getElementById('pdetails')
          .value
          .trim()

      const msg =
        document.getElementById(
          'prayerMsg'
        )

      msg.textContent =
        'Saving…'

      const { error } =
        await supabase
          .from('prayer_requests')
          .insert({
            user_id:
              state.session.user.id,
            title,
            category,
            details
          })

      if (error) {
        msg.textContent =
          `Could not save: ${error.message}`

        return
      }

      msg.textContent =
        'Prayer saved.'

      await render()
    }
  )
}

/* =========================================================
   ANSWERED PRAYER
========================================================= */

function bindAnswerButtons() {
  document
    .querySelectorAll('[data-answer]')
    .forEach(button => {
      button.onclick = async () => {
        const confirmed =
          window.confirm(
            'Mark this prayer as answered?'
          )

        if (!confirmed) return

        const note =
          window.prompt(
            'How did God answer this prayer?'
          )

        if (note === null) return

        const { error } =
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
              button.dataset.answer
            )

        if (error) {
          alert(
            `The prayer could not be updated: ${error.message}`
          )

          return
        }

        await render()
      }
    })

  document
    .querySelectorAll('[data-reflect]')
    .forEach(button => {
      button.onclick = async () => {
        const prayerId =
          button.dataset.reflect

        const {
          data: prayer,
          error
        } =
          await supabase
            .from('prayer_requests')
            .select('*')
            .eq('id', prayerId)
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

        await render()
      }
    })
}

/* =========================================================
   REFLECTION FORM
========================================================= */

function bindReflection() {
  document.getElementById(
    'cancelReflection'
  )?.addEventListener(
    'click',
    () => {
      state.reflectionPrayer = null
      state.view = 'prayers'
      render()
    }
  )

  document.getElementById(
    'reflectionForm'
  )?.addEventListener(
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

      const { error } =
        await supabase
          .from('prayer_reflections')
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

            is_memory:
              saveAsMemory,

            memory_title:
              saveAsMemory
                ? 'A lesson to remember'
                : null,

            memory_category:
              saveAsMemory
                ? 'Answered Prayer'
                : null
          })

      if (error) {
        msg.textContent =
          `Your reflection could not be saved: ${error.message}`

        return
      }

      msg.textContent =
        saveAsMemory
          ? 'Your reflection was saved to your Memory Bank.'
          : 'Your reflection was saved.'

      setTimeout(
        () => {
          state.reflectionPrayer = null
          state.view = 'prayers'
          render()
        },
        900
      )
    }
  )
}

/* =========================================================
   MEMORY BANK BINDINGS
========================================================= */

/*
  IMPORTANT:
  The Memory Bank search NEVER calls render().

  This is the fix for the cursor problem.

  The input remains mounted while the cards are
  filtered directly in the DOM.
*/

function bindMemoryBank() {
  const input =
    document.getElementById(
      'memorySearch'
    )

  const list =
    document.getElementById(
      'memoryList'
    )

  const noResults =
    document.getElementById(
      'memoryNoResults'
    )

  if (!input || !list) {
    return
  }

  /* -----------------------------------------
     SEARCH
  ----------------------------------------- */

  input.addEventListener(
    'input',
    event => {
      state.memorySearch =
        event.target.value

      filterMemoryCards()
    }
  )

  /* -----------------------------------------
     CATEGORY FILTERS
  ----------------------------------------- */

  document
    .querySelectorAll(
      '[data-memory-category]'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          state.memoryCategory =
            button.dataset.memoryCategory

          updateMemoryFilterButtons()

          filterMemoryCards()
        }
      )
    })

  /* -----------------------------------------
     CLEAR SEARCH
  ----------------------------------------- */

  document.getElementById(
    'clearMemorySearch'
  )?.addEventListener(
    'click',
    () => {
      input.value = ''
      state.memorySearch = ''

      filterMemoryCards()

      input.focus()
    }
  )

  /* -----------------------------------------
     OPEN MEMORY
  ----------------------------------------- */

  document
    .querySelectorAll(
      '[data-open-memory]'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          openMemory(
            button.dataset.openMemory
          )
        }
      )
    })

  /* -----------------------------------------
     EDIT MEMORY
  ----------------------------------------- */

  document
    .querySelectorAll(
      '[data-edit-memory]'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          openMemoryForEdit(
            button.dataset.editMemory
          )
        }
      )
    })

  /* -----------------------------------------
     Apply current filter
  ----------------------------------------- */

  filterMemoryCards()
}

/* =========================================================
   MEMORY FILTERING
========================================================= */

function filterMemoryCards() {
  const cards =
    document.querySelectorAll(
      '[data-memory-card]'
    )

  const noResults =
    document.getElementById(
      'memoryNoResults'
    )

  if (!cards.length) {
    return
  }

  const query =
    state.memorySearch
      .trim()
      .toLowerCase()

  let visibleCount = 0

  cards.forEach(card => {
    const searchableText =
      (
        card.dataset.memorySearch ||
        card.textContent ||
        ''
      ).toLowerCase()

    const category =
      card.dataset.memoryCategory ||
      ''

    const matchesSearch =
      !query ||
      searchableText.includes(query)

    const matchesCategory =
      state.memoryCategory === 'All' ||
      category === state.memoryCategory

    const visible =
      matchesSearch &&
      matchesCategory

    card.style.display =
      visible
        ? ''
        : 'none'

    if (visible) {
      visibleCount++
    }
  })

  if (noResults) {
    noResults.classList.toggle(
      'hidden',
      visibleCount !== 0
    )
  }
}

function updateMemoryFilterButtons() {
  document
    .querySelectorAll(
      '[data-memory-category]'
    )
    .forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.memoryCategory ===
          state.memoryCategory
      )
    })
}

/* =========================================================
   OPEN MEMORY
========================================================= */

async function openMemory(memoryId) {
  const {
    data: memory,
    error
  } =
    await supabase
      .from('prayer_reflections')
      .select(`
        *,
        prayer_requests (
          id,
          title,
          category,
          answer_note
        )
      `)
      .eq('id', memoryId)
      .eq(
        'user_id',
        state.session.user.id
      )
      .single()

  if (error) {
    alert(
      `Unable to open memory: ${error.message}`
    )

    return
  }

  state.editingReflection =
    memory

  state.view =
    'memory-detail'

  await render()
}

/* =========================================================
   OPEN MEMORY FOR EDIT
========================================================= */

async function openMemoryForEdit(memoryId) {
  const {
    data: memory,
    error
  } =
    await supabase
      .from('prayer_reflections')
      .select(`
        *,
        prayer_requests (
          id,
          title,
          category,
          answer_note
        )
      `)
      .eq('id', memoryId)
      .eq(
        'user_id',
        state.session.user.id
      )
      .single()

  if (error) {
    alert(
      `Unable to edit memory: ${error.message}`
    )

    return
  }

  state.editingReflection =
    memory

  state.view =
    'memory-edit'

  await render()
}

/* =========================================================
   MEMORY DETAIL BINDINGS
========================================================= */

function bindMemoryDetail() {
  document.getElementById(
    'backToMemories'
  )?.addEventListener(
    'click',
    () => {
      state.editingReflection = null
      state.view = 'memories'
      render()
    }
  )

  document
    .querySelectorAll(
      '[data-edit-memory]'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          openMemoryForEdit(
            button.dataset.editMemory
          )
        }
      )
    })

  document
    .querySelectorAll(
      '[data-delete-memory]'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        async () => {
          const confirmed =
            window.confirm(
              'Remove this reflection from your Memory Bank? Your original reflection will remain saved, but it will no longer appear in the Memory Bank.'
            )

          if (!confirmed) {
            return
          }

          const { error } =
            await supabase
              .from(
                'prayer_reflections'
              )
              .update({
                is_memory: false
              })
              .eq(
                'id',
                button.dataset.deleteMemory
              )
              .eq(
                'user_id',
                state.session.user.id
              )

          if (error) {
            alert(
              `The memory could not be removed: ${error.message}`
            )

            return
          }

          state.editingReflection = null
          state.view = 'memories'

          await render()
        }
      )
    })
}

/* =========================================================
   MEMORY EDIT BINDINGS
========================================================= */

function bindMemoryEdit() {
  const select =
    document.getElementById(
      'memoryCategory'
    )

  const memory =
    state.editingReflection

  if (select && memory) {
    select.value =
      memory.memory_category ||
      'Answered Prayer'
  }

  document.getElementById(
    'cancelMemoryEdit'
  )?.addEventListener(
    'click',
    () => {
      state.view =
        'memory-detail'

      render()
    }
  )

  document.getElementById(
    'cancelMemoryEditBottom'
  )?.addEventListener(
    'click',
    () => {
      state.view =
        'memory-detail'

      render()
    }
  )

  document.getElementById(
    'memoryEditForm'
  )?.addEventListener(
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

      const category =
        document
          .getElementById(
            'memoryCategory'
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

      const { data, error } =
        await supabase
          .from('prayer_reflections')
          .update({
            memory_title:
              title ||
              'A lesson to remember',

            memory_category:
              category,

            reflection_text:
              text,

            is_memory:
              true,

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
          .select(`
            *,
            prayer_requests (
              id,
              title,
              category,
              answer_note
            )
          `)
          .single()

      if (error) {
        msg.textContent =
          `Changes could not be saved: ${error.message}`

        return
      }

      state.editingReflection =
        data

      msg.textContent =
        'Your memory was updated.'

      setTimeout(
        () => {
          state.view =
            'memory-detail'

          render()
        },
        700
      )
    }
  )
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

/* =========================================================
   START APP
========================================================= */

loadSession()
