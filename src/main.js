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

  memoryDetail: null,
  memorySearch: '',
  memorySourceFilter: 'all',
  memorySort: 'newest',

  memories: []
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

function esc(value = '') {
  return String(value).replace(
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
    return ''
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }
  )
}

function sourceLabel(source) {
  const normalized =
    String(source || '')
      .toLowerCase()
      .trim()

  if (
    normalized ===
    'answered_prayer'
  ) {
    return 'Answered Prayer'
  }

  if (
    normalized === 'journal'
  ) {
    return 'Journal'
  }

  if (
    normalized === 'prayer'
  ) {
    return 'Prayer'
  }

  return source
    ? source
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
    : 'Memory'
}

function sourceClass(source) {
  const normalized =
    String(source || '')
      .toLowerCase()

  if (
    normalized ===
    'answered_prayer'
  ) {
    return 'answered'
  }

  if (
    normalized === 'journal'
  ) {
    return 'journal'
  }

  return 'general'
}

/* =========================================================
   SESSION / PROFILE / DAILY CONTENT
========================================================= */

async function loadSession() {
  const {
    data: { session }
  } =
    await supabase.auth.getSession()

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
  const { data } =
    await supabase
      .from('profiles')
      .select('*')
      .eq(
        'id',
        state.session.user.id
      )
      .maybeSingle()

  state.profile = data
}

async function loadToday() {
  const date =
    new Date()
      .toISOString()
      .slice(0, 10)

  const { data } =
    await supabase
      .from('daily_content')
      .select('*')
      .eq(
        'content_date',
        date
      )
      .maybeSingle()

  state.content = data
}

/* =========================================================
   AUTH VIEWS
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

            <button
              class="primary"
              type="submit"
            >
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
            class="${
              state.authMode === 'login'
                ? 'active'
                : ''
            }"
          >
            Sign in
          </button>

          <button
            id="signupTab"
            class="${
              state.authMode === 'signup'
                ? 'active'
                : ''
            }"
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
  return authView()
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

        <button
          data-view="home"
          class="${
            state.view === 'home'
              ? 'active'
              : ''
          }"
        >
          <span>⌂</span>
          Today
        </button>

        <button
          data-view="journal"
          class="${
            state.view === 'journal'
              ? 'active'
              : ''
          }"
        >
          <span>✎</span>
          Journal
        </button>

        <button
          data-view="prayers"
          class="${
            state.view === 'prayers'
              ? 'active'
              : ''
          }"
        >
          <span>♡</span>
          Prayers
        </button>

        <button
          data-view="memories"
          class="${
            state.view === 'memories' ||
            state.view === 'memory-detail'
              ? 'active'
              : ''
          }"
        >
          <span>✧</span>
          Memories
        </button>

        <button
          data-view="profile"
          class="${
            state.view === 'profile'
              ? 'active'
              : ''
          }"
        >
          <span>○</span>
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
                Add daily content from your admin
                library to personalize this screen.
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
  } =
    await supabase
      .from('journal_entries')
      .select('*')
      .order(
        'entry_date',
        {
          ascending: false
        }
      )
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
            <section class="card journal-prompt-card">

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
          entries
            .map(
              e => `
                <article class="entry">

                  <small>
                    ${esc(
                      formatDate(
                        e.entry_date ||
                        e.created_at
                      )
                    )}
                  </small>

                  <h3>
                    ${esc(
                      e.title ||
                      'Prayer journal'
                    )}
                  </h3>

                  <p>
                    ${esc(e.body || '').slice(
                      0,
                      280
                    )}
                  </p>

                </article>
              `
            )
            .join('')
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
  } =
    await supabase
      .from('prayer_requests')
      .select('*')
      .order(
        'updated_at',
        {
          ascending: false
        }
      )

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
                  .map(
                    category => `
                      <option
                        value="${esc(category)}"
                      >
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

                    <div class="pill-group">

                      <span
                        class="pill ${esc(p.status)}"
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

                  <p>
                    ${esc(p.details || '')}
                  </p>

                  ${
                    p.answer_note
                      ? `
                        <div class="answer-block">

                          <p>
                            <strong>
                              Answer:
                            </strong>

                            ${esc(
                              p.answer_note
                            )}
                          </p>

                          <button
                            type="button"
                            class="secondary"
                            data-reflect="${esc(
                              p.id
                            )}"
                          >
                            Reflect on this answer
                          </button>

                        </div>
                      `
                      : ''
                  }

                </article>
              `
            )
            .join('')
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
          Take a moment to reflect on this answered prayer.
          You can use the prompt below or simply write what
          is on your heart.
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
   MEMORY DATA
========================================================= */

async function loadMemories() {
  const {
    data: memoryRows,
    error
  } =
    await supabase
      .from('memory_points')
      .select('*')
      .order(
        'updated_at',
        {
          ascending: false
        }
      )

  if (error) {
    console.error(
      'Memory load error:',
      error
    )

    state.memories = []

    return {
      error
    }
  }

  const memories =
    memoryRows || []

  const reflectionIds =
    memories
      .map(
        memory =>
          memory.prayer_reflection_id
      )
      .filter(Boolean)

  const prayerIds =
    memories
      .map(
        memory =>
          memory.prayer_request_id
      )
      .filter(Boolean)

  let reflections = []
  let prayers = []

  if (reflectionIds.length) {
    const result =
      await supabase
        .from('prayer_reflections')
        .select('*')
        .in(
          'id',
          [
            ...new Set(
              reflectionIds
            )
          ]
        )

    if (!result.error) {
      reflections =
        result.data || []
    }
  }

  if (prayerIds.length) {
    const result =
      await supabase
        .from('prayer_requests')
        .select('*')
        .in(
          'id',
          [
            ...new Set(
              prayerIds
            )
          ]
        )

    if (!result.error) {
      prayers =
        result.data || []
    }
  }

  const reflectionMap =
    new Map(
      reflections.map(
        reflection => [
          reflection.id,
          reflection
        ]
      )
    )

  const prayerMap =
    new Map(
      prayers.map(
        prayer => [
          prayer.id,
          prayer
        ]
      )
    )

  state.memories =
    memories.map(
      memory => ({
        ...memory,

        reflection:
          reflectionMap.get(
            memory.prayer_reflection_id
          ) || null,

        prayer:
          prayerMap.get(
            memory.prayer_request_id
          ) || null
      })
    )

  return {
    data: state.memories
  }
}

function filteredMemories() {
  let memories =
    [...state.memories]

  const search =
    state.memorySearch
      .trim()
      .toLowerCase()

  if (search) {
    memories =
      memories.filter(
        memory => {

          const searchable = [
            memory.title,
            memory.memory_text,
            memory.source_type,
            memory.prayer?.title,
            memory.prayer?.details,
            memory.prayer?.answer_note,
            memory.reflection?.reflection_text,
            memory.reflection?.reflection_prompt
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          return searchable.includes(
            search
          )
        }
      )
  }

  if (
    state.memorySourceFilter !==
    'all'
  ) {
    memories =
      memories.filter(
        memory =>
          memory.source_type ===
          state.memorySourceFilter
      )
  }

  memories.sort(
    (a, b) => {

      const aDate =
        new Date(
          a.updated_at ||
          a.created_at
        ).getTime()

      const bDate =
        new Date(
          b.updated_at ||
          b.created_at
        ).getTime()

      return state.memorySort ===
        'oldest'
        ? aDate - bDate
        : bDate - aDate
    }
  )

  return memories
}

/* =========================================================
   MEMORY BANK
========================================================= */

async function memoryBankView() {
  await loadMemories()

  const memories =
    filteredMemories()

  const sources =
    [
      ...new Set(
        state.memories
          .map(
            memory =>
              memory.source_type
          )
          .filter(Boolean)
      )
    ]

  return `
    <main>

      <div class="section-title memory-header">

        <div>

          <p class="eyebrow">
            MEMORY BANK
          </p>

          <h2>
            Remember His faithfulness.
          </h2>

          <p class="muted">
            Keep the lessons, revelations,
            and moments you never want to forget.
          </p>

        </div>

        <div class="memory-count">
          ${state.memories.length}
          ${
            state.memories.length === 1
              ? 'memory'
              : 'memories'
          }
        </div>

      </div>

      <section class="memory-tools">

        <div class="search-wrap">

          <span class="search-icon">
            ⌕
          </span>

          <input
            id="memorySearch"
            type="search"
            value="${esc(
              state.memorySearch
            )}"
            placeholder="Search your memories..."
            autocomplete="off"
          >

          ${
            state.memorySearch
              ? `
                <button
                  type="button"
                  class="clear-search"
                  id="clearMemorySearch"
                  aria-label="Clear search"
                >
                  ×
                </button>
              `
              : ''
          }

        </div>

        <div class="memory-filter-row">

          <select
            id="memorySourceFilter"
            aria-label="Filter memories by source"
          >

            <option
              value="all"
              ${
                state.memorySourceFilter ===
                'all'
                  ? 'selected'
                  : ''
              }
            >
              All sources
            </option>

            ${
              sources
                .map(
                  source => `
                    <option
                      value="${esc(source)}"
                      ${
                        state.memorySourceFilter ===
                        source
                          ? 'selected'
                          : ''
                      }
                    >
                      ${esc(
                        sourceLabel(
                          source
                        )
                      )}
                    </option>
                  `
                )
                .join('')
            }

          </select>

          <select
            id="memorySort"
            aria-label="Sort memories"
          >

            <option
              value="newest"
              ${
                state.memorySort ===
                'newest'
                  ? 'selected'
                  : ''
              }
            >
              Newest first
            </option>

            <option
              value="oldest"
              ${
                state.memorySort ===
                'oldest'
                  ? 'selected'
                  : ''
              }
            >
              Oldest first
            </option>

          </select>

        </div>

      </section>

      ${
        state.memories.length === 0
          ? `
            <section class="memory-empty card">

              <div class="empty-icon">
                ✧
              </div>

              <h3>
                Your Memory Bank is waiting.
              </h3>

              <p class="muted">
                When you save a reflection as a memory,
                it will live here as a reminder of what
                God has taught you.
              </p>

              <button
                class="primary"
                data-view="prayers"
              >
                Go to my prayers
              </button>

            </section>
          `
          : memories.length === 0
            ? `
              <section class="memory-empty card">

                <div class="empty-icon">
                  ⌕
                </div>

                <h3>
                  No memories found.
                </h3>

                <p class="muted">
                  Try a different search or filter.
                </p>

                <button
                  class="secondary"
                  id="resetMemoryFilters"
                >
                  Clear filters
                </button>

              </section>
            `
            : `
              <div class="memory-grid">

                ${
                  memories
                    .map(
                      memory =>
                        memoryCard(
                          memory
                        )
                    )
                    .join('')
                }

              </div>
            `
      }

    </main>
  `
}

function memoryCard(memory) {
  const source =
    sourceLabel(
      memory.source_type
    )

  const sourceClassName =
    sourceClass(
      memory.source_type
    )

  const preview =
    String(
      memory.memory_text || ''
    )

  return `
    <article
      class="memory-card"
      data-memory-id="${esc(
        memory.id
      )}"
      tabindex="0"
      role="button"
      aria-label="Open memory"
    >

      <div class="memory-card-top">

        <span
          class="source-badge ${sourceClassName}"
        >
          ${esc(source)}
        </span>

        <span class="memory-date">
          ${esc(
            formatDate(
              memory.updated_at ||
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

      <p class="memory-preview">
        ${esc(
          preview.length > 190
            ? `${preview.slice(
                0,
                190
              )}…`
            : preview
        )}
      </p>

      ${
        memory.prayer?.title
          ? `
            <div class="memory-context">
              <span>Prayer</span>
              ${esc(
                memory.prayer.title
              )}
            </div>
          `
          : ''
      }

      <div class="memory-card-footer">

        <span>
          View memory
        </span>

        <span class="arrow">
          →
        </span>

      </div>

    </article>
  `
}

/* =========================================================
   MEMORY DETAIL
========================================================= */

function memoryDetailView(memory) {
  const prayer =
    memory.prayer

  const reflection =
    memory.reflection

  return `
    <main>

      <div class="detail-back">

        <button
          class="link back-button"
          id="backToMemories"
        >
          ← Back to Memory Bank
        </button>

      </div>

      <div class="section-title">

        <p class="eyebrow">
          MEMORY
        </p>

        <h2>
          ${esc(
            memory.title ||
            'A lesson to remember'
          )}
        </h2>

        <div class="detail-meta">

          <span
            class="source-badge ${sourceClass(
              memory.source_type
            )}"
          >
            ${esc(
              sourceLabel(
                memory.source_type
              )
            )}
          </span>

          <span>
            ${esc(
              formatDate(
                memory.updated_at ||
                memory.created_at
              )
            )}
          </span>

        </div>

      </div>

      <section class="card memory-detail-card">

        <p class="eyebrow">
          WHAT I WANT TO REMEMBER
        </p>

        <div class="memory-full-text">
          ${esc(
            memory.memory_text
          )}
        </div>

      </section>

      ${
        reflection
          ? `
            <section class="card connected-card">

              <div class="connected-heading">
                <p class="eyebrow">
                  MY REFLECTION
                </p>

                <span class="connection-dot">
                  02
                </span>
              </div>

              ${
                reflection.reflection_prompt
                  ? `
                    <p class="reflection-prompt">
                      ${esc(
                        reflection.reflection_prompt
                      )}
                    </p>
                  `
                  : ''
              }

              <div class="connected-text">
                ${esc(
                  reflection.reflection_text ||
                  ''
                )}
              </div>

              <p class="muted connection-note">
                This reflection is connected to
                this memory.
              </p>

            </section>
          `
          : ''
      }

      ${
        prayer
          ? `
            <section class="card connected-card">

              <div class="connected-heading">
                <p class="eyebrow">
                  HOW GOD ANSWERED
                </p>

                <span class="connection-dot">
                  03
                </span>
              </div>

              ${
                prayer.answer_note
                  ? `
                    <div class="connected-text">
                      ${esc(
                        prayer.answer_note
                      )}
                    </div>
                  `
                  : `
                    <p class="muted">
                      No answer note was recorded
                      for this prayer.
                    </p>
                  `
              }

            </section>

            <section class="card connected-card">

              <div class="connected-heading">
                <p class="eyebrow">
                  ORIGINAL PRAYER
                </p>

                <span class="connection-dot">
                  04
                </span>
              </div>

              <h3>
                ${esc(
                  prayer.title
                )}
              </h3>

              ${
                prayer.details
                  ? `
                    <div class="connected-text">
                      ${esc(
                        prayer.details
                      )}
                    </div>
                  `
                  : ''
              }

            </section>
          `
          : ''
      }

      <section class="card memory-actions">

        <button
          class="primary"
          id="editMemory"
        >
          Edit memory
        </button>

        <button
          class="danger-button"
          id="deleteMemory"
        >
          Delete memory
        </button>

      </section>

      <p
        id="memoryDetailMsg"
        class="msg"
      ></p>

    </main>
  `
}

/* =========================================================
   MEMORY EDIT
========================================================= */

function memoryEditView(memory) {
  return `
    <main>

      <div class="detail-back">

        <button
          class="link"
          id="cancelMemoryEdit"
        >
          ← Cancel
        </button>

      </div>

      <div class="section-title">

        <p class="eyebrow">
          EDIT MEMORY
        </p>

        <h2>
          Keep learning from it.
        </h2>

        <p class="muted">
          Your memory can grow as you understand
          the experience more deeply.
        </p>

      </div>

      <section class="card">

        <form id="memoryEditForm">

          <label>
            Memory title

            <input
              id="memoryEditTitle"
              value="${esc(
                memory.title ||
                'A lesson to remember'
              )}"
              required
            >
          </label>

          <label>
            What do you want to remember?

            <textarea
              id="memoryEditText"
              rows="10"
              required
            >${esc(
              memory.memory_text ||
              ''
            )}</textarea>

          </label>

          <button
            class="primary"
            type="submit"
          >
            Save changes
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
    state.session.user.email?.split(
      '@'
    )[0] ||
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
          Your private journal and prayer requests
          are protected by Supabase Row Level Security.
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
    root.innerHTML =
      recoveryView()

    bindAuth()

    return
  }

  if (!state.session) {
    root.innerHTML =
      authView()

    bindAuth()

    return
  }

  if (
    state.view ===
      'memory-detail' &&
    state.memoryDetail
  ) {
    root.innerHTML =
      shell(
        memoryDetailView(
          state.memoryDetail
        )
      )

    bindMemoryDetail()

    return
  }

  if (
    state.view ===
      'memory-edit' &&
    state.memoryDetail
  ) {
    root.innerHTML =
      shell(
        memoryEditView(
          state.memoryDetail
        )
      )

    bindMemoryEdit()

    return
  }

  if (
    state.view ===
      'reflection' &&
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

  let content

  if (
    state.view ===
    'journal'
  ) {
    content =
      await journalView()
  } else if (
    state.view ===
    'prayers'
  ) {
    content =
      await prayersView()
  } else if (
    state.view ===
    'memories'
  ) {
    content =
      await memoryBankView()
  } else if (
    state.view ===
    'profile'
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

/* =========================================================
   AUTH BINDING
========================================================= */

function bindAuth() {
  if (state.recoveryMode) {
    const form =
      document.getElementById(
        'recoveryForm'
      )

    if (!form) return

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
          newPassword.length <
          8
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

        const {
          error
        } =
          await supabase.auth.updateUser(
            {
              password:
                newPassword
            }
          )

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
      }

    return
  }

  document.getElementById(
    'loginTab'
  )?.addEventListener(
    'click',
    () => {

      state.authMode =
        'login'

      render()
    }
  )

  document.getElementById(
    'signupTab'
  )?.addEventListener(
    'click',
    () => {

      state.authMode =
        'signup'

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

      const result =
        state.authMode ===
        'signup'
          ? await supabase.auth.signUp(
              {
                email,
                password
              }
            )
          : await supabase.auth.signInWithPassword(
              {
                email,
                password
              }
            )

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
        state.authMode ===
        'signup'
          ? 'Check your email to confirm your account.'
          : 'Welcome back.'
    }
  )

  document.getElementById(
    'reset'
  )?.addEventListener(
    'click',
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
              result[0]
                .transcript
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

/* =========================================================
   APP BINDING
========================================================= */

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

            state.memoryDetail =
              null

            state.reflectionPrayer =
              null

            render()
          }
      }
    )

  document.getElementById(
    'signout'
  )?.addEventListener(
    'click',
    async () => {

      await supabase.auth.signOut()

      state.session =
        null

      state.view =
        'home'

      state.memoryDetail =
        null

      state.reflectionPrayer =
        null

      render()
    }
  )

  document.getElementById(
    'journalForm'
  )?.addEventListener(
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

      document.getElementById(
        'journalMsg'
      ).textContent =
        r.error?.message ||
        'Saved.'

      if (!r.error) {
        render()
      }
    }
  )

  document.getElementById(
    'prayerForm'
  )?.addEventListener(
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

      document.getElementById(
        'prayerMsg'
      ).textContent =
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
              note ===
              null
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

  document
    .querySelectorAll(
      '[data-reflect]'
    )
    .forEach(
      button => {

        button.onclick =
          async () => {

            const prayerId =
              button.dataset
                .reflect

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

            state.view =
              'reflection'

            render()
          }
      }
    )

  /* Memory cards */

  document
    .querySelectorAll(
      '[data-memory-id]'
    )
    .forEach(
      card => {

        const open =
          async () => {

            const memory =
              state.memories.find(
                item =>
                  item.id ===
                  card.dataset
                    .memoryId
              )

            if (!memory) {
              return
            }

            state.memoryDetail =
              memory

            state.view =
              'memory-detail'

            await render()
          }

        card.addEventListener(
          'click',
          open
        )

        card.addEventListener(
          'keydown',
          event => {

            if (
              event.key ===
                'Enter' ||
              event.key ===
                ' '
            ) {

              event.preventDefault()

              open()
            }
          }
        )
      }
    )

  /* Search */

  const searchInput =
    document.getElementById(
      'memorySearch'
    )

  if (searchInput) {

    searchInput.addEventListener(
      'input',
      event => {

        /*
          IMPORTANT:
          Do NOT call render() here.

          This keeps the input focused and
          prevents the cursor from disappearing
          after every character.
        */

        state.memorySearch =
          event.target.value

        const searchValue =
          state.memorySearch
            .trim()
            .toLowerCase()

        document
          .querySelectorAll(
            '.memory-card'
          )
          .forEach(
            card => {

              const memory =
                state.memories.find(
                  item =>
                    item.id ===
                    card.dataset
                      .memoryId
                )

              if (!memory) {
                return
              }

              const searchable = [
                memory.title,
                memory.memory_text,
                memory.source_type,
                memory.prayer?.title,
                memory.prayer?.details,
                memory.prayer?.answer_note,
                memory.reflection?.reflection_text,
                memory.reflection?.reflection_prompt
              ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()

              const visible =
                !searchValue ||
                searchable.includes(
                  searchValue
                )

              card.style.display =
                visible
                  ? ''
                  : 'none'
            }
          )

        const clear =
          document.getElementById(
            'clearMemorySearch'
          )

        if (clear) {
          clear.style.display =
            state.memorySearch
              ? 'flex'
              : 'none'
        }

        updateVisibleMemoryEmptyState()
      }
    )
  }

  document.getElementById(
    'clearMemorySearch'
  )?.addEventListener(
    'click',
    () => {

      state.memorySearch =
        ''

      if (searchInput) {
        searchInput.value =
          ''

        searchInput.focus()

        searchInput.dispatchEvent(
          new Event(
            'input',
            {
              bubbles: true
            }
          )
        )
      }
    }
  )

  document.getElementById(
    'memorySourceFilter'
  )?.addEventListener(
    'change',
    event => {

      state.memorySourceFilter =
        event.target.value

      render()
    }
  )

  document.getElementById(
    'memorySort'
  )?.addEventListener(
    'change',
    event => {

      state.memorySort =
        event.target.value

      render()
    }
  )

  document.getElementById(
    'resetMemoryFilters'
  )?.addEventListener(
    'click',
    () => {

      state.memorySearch =
        ''

      state.memorySourceFilter =
        'all'

      state.memorySort =
        'newest'

      render()
    }
  )

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
   MEMORY SEARCH EMPTY STATE
========================================================= */

function updateVisibleMemoryEmptyState() {
  const cards =
    Array.from(
      document.querySelectorAll(
        '.memory-card'
      )
    )

  if (!cards.length) {
    return
  }

  const visibleCards =
    cards.filter(
      card =>
        card.style.display !==
        'none'
    )

  let empty =
    document.getElementById(
      'liveMemoryEmpty'
    )

  if (
    visibleCards.length ===
    0
  ) {

    if (!empty) {

      empty =
        document.createElement(
          'div'
        )

      empty.id =
        'liveMemoryEmpty'

      empty.className =
        'memory-empty card'

      empty.innerHTML = `
        <div class="empty-icon">
          ⌕
        </div>

        <h3>
          No memories found.
        </h3>

        <p class="muted">
          Try a different search term.
        </p>
      `

      const grid =
        document.querySelector(
          '.memory-grid'
        )

      grid?.after(
        empty
      )
    }

  } else {

    empty?.remove()
  }
}

/* =========================================================
   MEMORY DETAIL BINDING
========================================================= */

function bindMemoryDetail() {

  document.getElementById(
    'backToMemories'
  )?.addEventListener(
    'click',
    () => {

      state.memoryDetail =
        null

      state.view =
        'memories'

      render()
    }
  )

  document.getElementById(
    'editMemory'
  )?.addEventListener(
    'click',
    () => {

      state.view =
        'memory-edit'

      render()
    }
  )

  document.getElementById(
    'deleteMemory'
  )?.addEventListener(
    'click',
    async () => {

      const memory =
        state.memoryDetail

      if (!memory) {
        return
      }

      const confirmed =
        window.confirm(
          'Delete this memory? The original reflection and prayer will remain safe. Only this saved memory will be removed.'
        )

      if (!confirmed) {
        return
      }

      const {
        error
      } =
        await supabase
          .from(
            'memory_points'
          )
          .delete()
          .eq(
            'id',
            memory.id
          )

      if (error) {

        alert(
          `The memory could not be deleted: ${error.message}`
        )

        return
      }

      state.memoryDetail =
        null

      state.view =
        'memories'

      await render()
    }
  )
}

/* =========================================================
   MEMORY EDIT BINDING
========================================================= */

function bindMemoryEdit() {

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
    'memoryEditForm'
  )?.addEventListener(
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

      if (!memoryText) {

        msg.textContent =
          'Write something you want to remember before saving.'

        return
      }

      msg.textContent =
        'Saving your memory…'

      const {
        data,
        error
      } =
        await supabase
          .from(
            'memory_points'
          )
          .update({

            title:
              title ||
              'A lesson to remember',

            memory_text:
              memoryText,

            updated_at:
              new Date().toISOString()
          })
          .eq(
            'id',
            state.memoryDetail.id
          )
          .select('*')
          .single()

      if (error) {

        msg.textContent =
          `The memory could not be updated: ${error.message}`

        return
      }

      state.memoryDetail =
        {
          ...state.memoryDetail,
          ...data
        }

      msg.textContent =
        'Memory updated successfully.'

      setTimeout(
        () => {

          state.view =
            'memory-detail'

          render()

        },
        600
      )
    }
  )
}

/* =========================================================
   REFLECTION BINDING
========================================================= */

function bindReflection() {

  document.getElementById(
    'cancelReflection'
  )?.addEventListener(
    'click',
    () => {

      state.reflectionPrayer =
        null

      state.view =
        'prayers'

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
        The reflection and memory are deliberately
        stored separately.

        The memory_points record points back to
        this reflection so the full spiritual journey
        can be reconstructed later.
      */

      if (saveAsMemory) {

        const {
          error:
            memoryError
        } =
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

        if (memoryError) {

          msg.textContent =
            `Your reflection was saved, but the memory could not be created: ${memoryError.message}`

          return
        }
      }

      msg.textContent =
        saveAsMemory
          ? 'Your reflection and memory were saved.'
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
        800
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

      state.memoryDetail =
        null

      state.memories =
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
   START APP
========================================================= */

loadSession()
