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

  selectedMemory: null,
  editingMemory: null,

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
  const date =
    new Date()
      .toISOString()
      .slice(0, 10)

  const { data } =
    await supabase
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
    character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[character])
  )
}

function formatDate(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
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

function formatDateTime(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString(
    undefined,
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }
  )
}

function sourceLabel(sourceType) {
  switch (sourceType) {
    case 'answered_prayer':
      return 'Answered Prayer'

    case 'journal':
      return 'Journal'

    case 'daily_reflection':
      return 'Daily Reflection'

    default:
      return 'Faith Memory'
  }
}

function sourceIcon(sourceType) {
  switch (sourceType) {
    case 'answered_prayer':
      return '🙏'

    case 'journal':
      return '📖'

    case 'daily_reflection':
      return '🌿'

    default:
      return '♡'
  }
}

function memoryPreview(text, length = 260) {
  const clean =
    String(text || '')
      .replace(/\s+/g, ' ')
      .trim()

  if (clean.length <= length) {
    return clean
  }

  return `${clean.slice(0, length)}…`
}

function setMessage(id, message) {
  const element =
    document.getElementById(id)

  if (element) {
    element.textContent = message
  }
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
          Prayers
        </button>

        <button
          data-view="memory-bank"
          class="${
            state.view === 'memory-bank' ||
            state.view === 'memory-detail'
              ? 'active'
              : ''
          }"
        >
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
            data-view="memory-bank"
          >
            Open Memory Bank
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
    data: entries = [],
    error
  } = await supabase
    .from('journal_entries')
    .select('*')
    .order(
      'entry_date',
      {
        ascending: false
      }
    )
    .limit(50)

  if (error) {
    console.error(error)
  }

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

        <p class="muted">
          Write freely. This is your place to
          process prayer, Scripture, thoughts,
          and what you sense God teaching you.
        </p>

      </div>

      ${
        c?.reflection_prompt
          ? `
            <section class="card daily-reflection-card">

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
              rows="8"
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

      <div class="section-heading-row">

        <div>
          <p class="eyebrow">
            JOURNAL HISTORY
          </p>

          <h3>
            Your entries
          </h3>
        </div>

      </div>

      <div class="list">

        ${
          entries.length
            ? entries
                .map(
                  entry => `
                    <article class="entry journal-entry">

                      <small>
                        ${esc(
                          formatDate(
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
                        ${esc(
                          memoryPreview(
                            entry.body,
                            360
                          )
                        )}
                      </p>

                    </article>
                  `
                )
                .join('')
            : `
              <div class="empty-state">

                <div class="empty-icon">
                  📖
                </div>

                <h3>
                  Your journal begins here.
                </h3>

                <p>
                  Start with what is on your heart
                  today.
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
  const {
    data: prayers = [],
    error
  } = await supabase
    .from('prayer_requests')
    .select('*')
    .order(
      'updated_at',
      {
        ascending: false
      }
    )

  if (error) {
    console.error(error)
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
          Keep your requests here and return to
          them when you see God's faithfulness.
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
                    category =>
                      `
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
          prayers.length
            ? prayers
                .map(
                  prayer => `
                    <article class="entry">

                      <div class="row">

                        <div class="pill-row">

                          <span
                            class="pill ${
                              prayer.status === 'answered'
                                ? 'answered'
                                : 'active'
                            }"
                          >
                            ${esc(
                              prayer.status
                            )}
                          </span>

                          ${
                            prayer.category
                              ? `
                                <span class="pill">
                                  ${esc(
                                    prayer.category
                                  )}
                                </span>
                              `
                              : ''
                          }

                        </div>

                        ${
                          prayer.status === 'active'
                            ? `
                              <button
                                class="small"
                                data-answer="${esc(
                                  prayer.id
                                )}"
                              >
                                Mark answered
                              </button>
                            `
                            : ''
                        }

                      </div>

                      <h3>
                        ${esc(prayer.title)}
                      </h3>

                      ${
                        prayer.details
                          ? `
                            <p>
                              ${esc(
                                prayer.details
                              )}
                            </p>
                          `
                          : ''
                      }

                      ${
                        prayer.answer_note
                          ? `
                            <div class="answer-block">

                              <p>
                                <strong>
                                  Answer:
                                </strong>

                                ${esc(
                                  prayer.answer_note
                                )}
                              </p>

                              <button
                                type="button"
                                class="secondary"
                                data-reflect="${esc(
                                  prayer.id
                                )}"
                              >
                                ${
                                  prayer.status ===
                                  'answered'
                                    ? 'Reflect on this answer'
                                    : 'View reflection'
                                }
                              </button>

                            </div>
                          `
                          : ''
                      }

                    </article>
                  `
                )
                .join('')
            : `
              <div class="empty-state">

                <div class="empty-icon">
                  🙏
                </div>

                <h3>
                  No prayer requests yet.
                </h3>

                <p>
                  Bring your first request to Him here.
                </p>

              </div>
            `
        }

      </div>

    </main>
  `
}
/* =========================================================
   ANSWER PRAYER
========================================================= */

async function answerPrayerView(prayer) {
  return `
    <main>

      <div class="section-title">

        <p class="eyebrow">
          ANSWERED PRAYER
        </p>

        <h2>
          Celebrate the answer.
        </h2>

        <p class="muted">
          Record what happened, then take time to
          reflect on what God is teaching you through it.
        </p>

      </div>

      <section class="card">

        <div class="connected-record prayer-memory-card">

          <div class="connected-record-header">

            <span class="connected-icon">
              🙏
            </span>

            <div>

              <p class="eyebrow">
                PRAYER REQUEST
              </p>

              <h3>
                ${esc(prayer.title)}
              </h3>

            </div>

          </div>

          ${
            prayer.details
              ? `
                <p class="record-body">
                  ${esc(prayer.details)}
                </p>
              `
              : ''
          }

        </div>

        <form id="answerPrayerForm">

          <label>
            How was this prayer answered?

            <textarea
              id="answerNote"
              rows="7"
              required
              placeholder="Describe what happened..."
            >${esc(
              prayer.answer_note || ''
            )}</textarea>

          </label>

          <div class="voice-row">

            <button
              type="button"
              class="secondary"
              id="answerVoice"
            >
              🎙 Voice to text
            </button>

            <span
              id="answerVoiceStatus"
              class="muted"
            ></span>

          </div>

          <button
            class="primary"
            type="submit"
          >
            Save answered prayer
          </button>

          <button
            type="button"
            class="link"
            id="cancelAnswer"
          >
            Cancel
          </button>

          <p
            id="answerMsg"
            class="msg"
          ></p>

        </form>

      </section>

    </main>
  `
}

/* =========================================================
   REFLECTION
========================================================= */

async function reflectionView() {
  const prayer =
    state.reflectionPrayer

  if (!prayer) {
    state.view = 'prayers'
    return prayersView()
  }

  const reflection =
    state.editingReflection

  return `
    <main>

      <div class="detail-back">

        <button
          class="link back-button"
          id="backFromReflection"
        >
          ← Back to prayers
        </button>

      </div>

      <div class="section-title">

        <p class="eyebrow">
          REFLECTION
        </p>

        <h2>
          Sit with the answer.
        </h2>

        <p class="muted">
          Take your time. Your reflection can grow
          as you understand the answer more deeply.
        </p>

      </div>

      <section class="connected-record prayer-memory-card">

        <div class="connected-record-header">

          <span class="connected-icon">
            🙏
          </span>

          <div>

            <p class="eyebrow">
              ANSWERED PRAYER
            </p>

            <h3>
              ${esc(prayer.title)}
            </h3>

          </div>

        </div>

        ${
          prayer.answer_note
            ? `
              <div class="answer-block">

                <p class="eyebrow">
                  HOW GOD ANSWERED
                </p>

                <p>
                  ${esc(
                    prayer.answer_note
                  )}
                </p>

              </div>
            `
            : ''
        }

      </section>

      <section class="card reflection-detail-card">

        <div class="reflection-card-heading">

          <div class="reflection-heading-icon">
            🌿
          </div>

          <div>

            <p class="eyebrow">
              YOUR REFLECTION
            </p>

            <h3>
              ${
                reflection
                  ? 'Continue reflecting'
                  : 'What are you taking away?'
              }
            </h3>

          </div>

        </div>

        <p class="reflection-guidance">
          What did you learn? What did God reveal to you?
          What do you want to carry forward?
        </p>

        <form id="reflectionForm">

          <label class="reflection-input-label">

            <span class="sr-only">
              Your reflection
            </span>

            <textarea
              id="reflectionText"
              rows="10"
              required
              placeholder="Write what you are learning, noticing, and carrying forward..."
            >${esc(
              reflection?.reflection_text || ''
            )}</textarea>

          </label>

          <div class="reflection-save-row">

            <label class="memory-save-option">

              <input
                type="checkbox"
                id="saveReflectionToMemory"
                checked
              >

              <span>

                <strong>
                  Save this reflection to Memory Bank
                </strong>

                <small>
                  Your reflection becomes the memory
                  you can return to later.
                </small>

              </span>

            </label>

          </div>

          <div class="button-row">

            <button
              class="primary"
              type="submit"
            >
              ${
                reflection
                  ? 'Update reflection'
                  : 'Save reflection'
              }
            </button>

            ${
              reflection
                ? `
                  <button
                    type="button"
                    class="secondary"
                    id="cancelReflectionEdit"
                  >
                    Cancel
                  </button>
                `
                : ''
            }

          </div>

          <p
            id="reflectionMsg"
            class="msg"
          ></p>

        </form>

      </section>

      ${
        reflection
          ? `
            <section class="card reflection-history-card">

              <p class="eyebrow">
                KEEP GROWING
              </p>

              <p>
                You can return to this reflection anytime.
                As you learn more about how God answered
                this prayer, you can continue adding to it.
              </p>

              <p class="muted">
                Last updated
                ${esc(
                  formatDate(
                    reflection.updated_at
                  )
                )}
              </p>

            </section>
          `
          : ''
      }

    </main>
  `
}

/* =========================================================
   MEMORY BANK
========================================================= */

async function loadMemories() {
  let query =
    supabase
      .from('memory_points')
      .select('*')
      .eq(
        'user_id',
        state.session.user.id
      )

  if (
    state.memorySource &&
    state.memorySource !== 'all'
  ) {
    query =
      query.eq(
        'source_type',
        state.memorySource
      )
  }

  if (state.memorySearch.trim()) {
    const search =
      state.memorySearch
        .trim()
        .replace(
          /[%_]/g,
          '\\$&'
        )

    query =
      query.or(
        `title.ilike.%${search}%,memory_text.ilike.%${search}%`
      )
  }

  query =
    query.order(
      'created_at',
      {
        ascending:
          state.memorySort === 'oldest'
      }
    )

  const {
    data,
    error
  } = await query

  return {
    data: data || [],
    error
  }
}

async function memoryBankView() {
  const {
    data: memories,
    error
  } = await loadMemories()

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

        <section class="error-state">

          <div class="empty-icon">
            🌿
          </div>

          <h3>
            We couldn't load your memories.
          </h3>

          <p>
            ${esc(error.message)}
          </p>

        </section>

      </main>
    `
  }

  return `
    <main>

      <div class="section-title">

        <p class="eyebrow">
          MEMORY BANK
        </p>

        <h2>
          Remember His faithfulness.
        </h2>

        <p class="muted">
          Keep the moments, lessons, and answered
          prayers you want to carry with you.
        </p>

      </div>

      <section class="memory-intro">

        <div class="memory-intro-icon">
          🌿
        </div>

        <div>

          <strong>
            A place to remember.
          </strong>

          <p>
            Your reflections and meaningful moments
            live here so you can return to them later.
          </p>

        </div>

      </section>

      <section class="card memory-controls">

        <div class="memory-search-wrap">

          <label class="memory-search-label">

            Search your memories

            <input
              id="memorySearch"
              class="memory-search"
              type="search"
              value="${esc(
                state.memorySearch
              )}"
              placeholder="Search memories..."
              autocomplete="off"
              spellcheck="false"
            >

          </label>

        </div>

        <div class="memory-filter-grid">

          <label>

            Source

            <select id="memorySource">

              <option
                value="all"
                ${
                  state.memorySource === 'all'
                    ? 'selected'
                    : ''
                }
              >
                All memories
              </option>

              <option
                value="answered_prayer"
                ${
                  state.memorySource ===
                  'answered_prayer'
                    ? 'selected'
                    : ''
                }
              >
                Answered Prayer
              </option>

              <option
                value="journal"
                ${
                  state.memorySource === 'journal'
                    ? 'selected'
                    : ''
                }
              >
                Journal
              </option>

              <option
                value="daily_reflection"
                ${
                  state.memorySource ===
                  'daily_reflection'
                    ? 'selected'
                    : ''
                }
              >
                Daily Reflection
              </option>

            </select>

          </label>

          <label>

            Sort

            <select id="memorySort">

              <option
                value="newest"
                ${
                  state.memorySort === 'newest'
                    ? 'selected'
                    : ''
                }
              >
                Newest first
              </option>

              <option
                value="oldest"
                ${
                  state.memorySort === 'oldest'
                    ? 'selected'
                    : ''
                }
              >
                Oldest first
              </option>

            </select>

          </label>

        </div>

      </section>

      <div class="memory-results-header">

        ${
          memories.length
            ? `${memories.length}
               ${
                 memories.length === 1
                   ? 'memory'
                   : 'memories'
               }`
            : 'No memories found'
        }

      </div>

      ${
        memories.length
          ? `
            <section class="memory-grid">

              ${memories
                .map(
                  memory => `
                    <article
                      class="memory-card"
                      tabindex="0"
                      role="button"
                      data-memory-id="${esc(
                        memory.id
                      )}"
                    >

                      <div class="memory-card-top">

                        <span class="memory-source">

                          <span>
                            ${sourceIcon(
                              memory.source_type
                            )}
                          </span>

                          ${esc(
                            sourceLabel(
                              memory.source_type
                            )
                          )}

                        </span>

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

                      <p>
                        ${esc(
                          memoryPreview(
                            memory.memory_text
                          )
                        )}
                      </p>

                      <div class="memory-card-footer">

                        <span>
                          Open memory
                        </span>

                        <span class="memory-arrow">
                          →
                        </span>

                      </div>

                    </article>
                  `
                )
                .join('')}

            </section>
          `
          : `
            <section class="empty-state memory-empty">

              <div class="empty-icon">
                🌿
              </div>

              ${
                state.memorySearch ||
                state.memorySource !== 'all'
                  ? `
                    <h3>
                      No memories match your search.
                    </h3>

                    <p>
                      Try another search or clear your
                      filters to see more memories.
                    </p>

                    <button
                      class="secondary"
                      id="clearMemoryFilters"
                    >
                      Clear filters
                    </button>
                  `
                  : `
                    <h3>
                      Your Memory Bank is waiting.
                    </h3>

                    <p>
                      When you save a reflection or
                      meaningful moment, it will live here.
                    </p>

                    <button
                      class="secondary"
                      data-view="prayers"
                    >
                      View prayers
                    </button>
                  `
              }

            </section>
          `
      }

    </main>
  `
}

/* =========================================================
   MEMORY DETAIL DATA
========================================================= */

async function loadMemoryDetail(memoryId) {
  const {
    data: memory,
    error: memoryError
  } = await supabase
    .from('memory_points')
    .select('*')
    .eq(
      'id',
      memoryId
    )
    .eq(
      'user_id',
      state.session.user.id
    )
    .single()

  if (memoryError) {
    return {
      error: memoryError
    }
  }

  let prayer = null
  let reflection = null

  if (memory.prayer_request_id) {
    const {
      data
    } = await supabase
      .from('prayer_requests')
      .select('*')
      .eq(
        'id',
        memory.prayer_request_id
      )
      .eq(
        'user_id',
        state.session.user.id
      )
      .maybeSingle()

    prayer = data
  }

  if (memory.prayer_reflection_id) {
    const {
      data
    } = await supabase
      .from('prayer_reflections')
      .select('*')
      .eq(
        'id',
        memory.prayer_reflection_id
      )
      .eq(
        'user_id',
        state.session.user.id
      )
      .maybeSingle()

    reflection = data
  }

  /*
   * Older memory records may have the reflection
   * relationship but the reflection ID may not be
   * populated in the expected direction. Try the
   * prayer relationship as a fallback.
   */
  if (
    prayer &&
    !reflection
  ) {
    const {
      data
    } = await supabase
      .from('prayer_reflections')
      .select('*')
      .eq(
        'prayer_request_id',
        prayer.id
      )
      .eq(
        'user_id',
        state.session.user.id
      )
      .order(
        'updated_at',
        {
          ascending: false
        }
      )
      .limit(1)
      .maybeSingle()

    reflection = data
  }

  /*
   * If this is an answered-prayer memory but the
   * reflection table does not return a record,
   * the memory itself remains readable.
   */
  return {
    memory,
    prayer,
    reflection,
    error: null
  }
}

/* =========================================================
   MEMORY DETAIL
========================================================= */

async function memoryDetailView(memory) {
  const result =
    await loadMemoryDetail(
      memory.id
    )

  if (result.error) {
    return `
      <main>

        <section class="card soft-card error-card">

          <div class="detail-icon">
            🌿
          </div>

          <p class="eyebrow">
            FAITH MEMORY
          </p>

          <h2>
            We couldn't open this memory.
          </h2>

          <p class="muted">
            ${esc(
              result.error.message
            )}
          </p>

          <button
            class="secondary"
            data-view="memory-bank"
          >
            Back to Memory Bank
          </button>

        </section>

      </main>
    `
  }

  const {
    prayer,
    reflection
  } = result

  return `
    <main class="memory-detail-page">

      <div class="detail-back">

        <button
          class="link back-button"
          id="backToMemoryBank"
        >
          ← Back to Memory Bank
        </button>

      </div>

      <div class="memory-detail-hero">

        <p class="eyebrow memory-detail-eyebrow">
          ♡ FAITH MEMORY
        </p>

        <h2>
          ${esc(
            memory.title ||
            'A lesson to remember'
          )}
        </h2>

        <div class="saved-badge">
          <span>🌿</span>
          Saved
        </div>

      </div>

      ${
        prayer
          ? `
            <section class="connected-record prayer-memory-card">

              <div class="connected-record-header">

                <span class="connected-icon">
                  🙏
                </span>

                <div>

                  <p class="eyebrow">
                    ORIGINAL PRAYER
                  </p>

                  <h3>
                    ${esc(
                      prayer.title
                    )}
                  </h3>

                </div>

              </div>

              ${
                prayer.details
                  ? `
                    <p class="record-body">
                      ${esc(
                        prayer.details
                      )}
                    </p>
                  `
                  : ''
              }

            </section>

            ${
              prayer.answer_note
                ? `
                  <section class="connected-record answer-record">

                    <div class="connected-record-header">

                      <span class="connected-icon answer-icon">
                        ✨
                      </span>

                      <div>

                        <p class="eyebrow">
                          HOW GOD ANSWERED
                        </p>

                      </div>

                      <span class="record-date">
                        ${esc(
                          formatDate(
                            prayer.answered_at ||
                            prayer.updated_at ||
                            memory.created_at
                          )
                        )}
                      </span>

                    </div>

                    <p class="record-body">
                      ${esc(
                        prayer.answer_note
                      )}
                    </p>

                  </section>
                `
                : ''
            }
          `
          : ''
      }

      ${
        reflection
          ? `
            <section class="connected-record reflection-memory-card">

              <div class="connected-record-header">

                <span class="connected-icon reflection-icon">
                  🌿
                </span>

                <div>

                  <p class="eyebrow">
                    REFLECTION
                  </p>

                  <p class="reflection-subtitle">
                    Your reflection is your memory.
                  </p>

                </div>

                <span class="record-date">
                  ${esc(
                    formatDate(
                      reflection.updated_at ||
                      reflection.created_at
                    )
                  )}
                </span>

              </div>

              <p class="reflection-prompt-display">
                What did you learn? What did God reveal to you?
                What do you want to carry forward?
              </p>

              <div class="reflection-detail-text memory-reflection-text">
                ${esc(
                  reflection.reflection_text
                ).replace(
                  /\n/g,
                  '<br>'
                )}
              </div>

              <div class="reflection-card-footer">

                <div>
                  <span class="memory-status">
                    🌿 Saved to Memory Bank
                  </span>
                </div>

                <button
                  class="secondary"
                  data-edit-reflection="${esc(
                    reflection.id
                  )}"
                >
                  Edit reflection
                </button>

              </div>

            </section>
          `
          : `
            <section class="connected-record reflection-memory-card">

              <div class="connected-record-header">

                <span class="connected-icon reflection-icon">
                  🌿
                </span>

                <div>

                  <p class="eyebrow">
                    REFLECTION
                  </p>

                  <h3>
                    Your reflection is waiting.
                  </h3>

                </div>

              </div>

              <p class="muted">
                Take some time to reflect on what you
                learned and what you want to carry forward.
              </p>

              ${
                prayer
                  ? `
                    <button
                      class="secondary"
                      data-open-reflection="${esc(
                        prayer.id
                      )}"
                    >
                      Add reflection
                    </button>
                  `
                  : ''
              }

            </section>
          `
      }

      <section class="card memory-actions-card soft-actions-card">

        <p class="eyebrow">
          MEMORY ACTIONS
        </p>

        <div class="button-row">

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

        </div>

        <p class="muted action-note">
          Your reflection can continue to grow as you
          understand the answered prayer more deeply.
        </p>

      </section>

    </main>
  `
}

/* =========================================================
   MEMORY EDITOR
========================================================= */

async function memoryEditorView(memory) {
  return `
    <main>

      <div class="detail-back">

        <button
          class="link back-button"
          id="backFromMemoryEditor"
        >
          ← Back to memory
        </button>

      </div>

      <div class="section-title">

        <p class="eyebrow">
          EDIT MEMORY
        </p>

        <h2>
          Refine what you want to remember.
        </h2>

        <p class="muted">
          Your reflection is the heart of this memory.
          Make any changes you want to carry forward.
        </p>

      </div>

      <section class="card reflection-editor-card">

        <div class="reflection-card-heading">

          <div class="reflection-heading-icon">
            🌿
          </div>

          <div>

            <p class="eyebrow">
              YOUR REFLECTION
            </p>

            <h3>
              This reflection is your memory.
            </h3>

          </div>

        </div>

        <form id="memoryEditForm">

          <label>

            Memory title

            <input
              id="memoryTitle"
              type="text"
              value="${esc(
                memory.title ||
                'A lesson to remember'
              )}"
              maxlength="120"
            >

          </label>

          <label>

            Reflection

            <textarea
              id="memoryText"
              rows="12"
              required
            >${esc(
              memory.memory_text || ''
            )}</textarea>

          </label>

          <div class="button-row">

            <button
              class="primary"
              type="submit"
            >
              Save changes
            </button>

            <button
              type="button"
              class="secondary"
              id="cancelMemoryEdit"
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
   DELETE MEMORY
========================================================= */

async function deleteMemory(memoryId) {
  const confirmed =
    window.confirm(
      'Delete this memory? This cannot be undone.'
    )

  if (!confirmed) {
    return
  }

  const {
    error
  } = await supabase
    .from('memory_points')
    .delete()
    .eq(
      'id',
      memoryId
    )
    .eq(
      'user_id',
      state.session.user.id
    )

  if (error) {
    showToast(
      error.message,
      'error'
    )

    return
  }

  state.selectedMemory = null

  showToast(
    'Memory deleted.',
    'success'
  )

  state.view = 'memory-bank'

  await render()
}

/* =========================================================
   REFLECTION EDITOR
========================================================= */

async function editReflectionView(reflection) {
  return `
    <main>

      <div class="detail-back">

        <button
          class="link back-button"
          id="backFromReflectionEditor"
        >
          ← Back
        </button>

      </div>

      <div class="section-title">

        <p class="eyebrow">
          REFLECTION
        </p>

        <h2>
          Keep reflecting.
        </h2>

        <p class="muted">
          Your understanding can change over time.
          Add to your reflection as you continue to
          see the meaning in what happened.
        </p>

      </div>

      <section class="card reflection-editor-card">

        <div class="reflection-card-heading">

          <div class="reflection-heading-icon">
            🌿
          </div>

          <div>

            <p class="eyebrow">
              EDIT REFLECTION
            </p>

            <h3>
              Your reflection
            </h3>

          </div>

        </div>

        <form id="editReflectionForm">

          <label>

            Reflection

            <textarea
              id="editReflectionText"
              rows="12"
              required
            >${esc(
              reflection.reflection_text || ''
            )}</textarea>

          </label>

          <div class="button-row">

            <button
              class="primary"
              type="submit"
            >
              Save reflection
            </button>

            <button
              type="button"
              class="secondary"
              id="cancelEditReflection"
            >
              Cancel
            </button>

          </div>

          <p
            id="editReflectionMsg"
            class="msg"
          ></p>

        </form>

      </section>

    </main>
  `
}

/* =========================================================
   JOURNAL
========================================================= */

async function loadJournalEntries() {
  const {
    data,
    error
  } = await supabase
    .from('journal_entries')
    .select('*')
    .eq(
      'user_id',
      state.session.user.id
    )
    .order(
      'created_at',
      {
        ascending: false
      }
    )

  return {
    data: data || [],
    error
  }
}

async function journalView() {
  const {
    data: entries,
    error
  } = await loadJournalEntries()

  if (error) {
    return `
      <main>

        <div class="section-title">

          <p class="eyebrow">
            JOURNAL
          </p>

          <h2>
            Your private place to reflect.
          </h2>

        </div>

        <section class="error-state">

          <div class="empty-icon">
            📖
          </div>

          <h3>
            We couldn't load your journal.
          </h3>

          <p>
            ${esc(
              error.message
            )}
          </p>

        </section>

      </main>
    `
  }

  return `
    <main>

      <div class="section-title">

        <p class="eyebrow">
          JOURNAL
        </p>

        <h2>
          A place to slow down.
        </h2>

        <p class="muted">
          Write freely about what you're experiencing,
          learning, praying, and noticing.
        </p>

      </div>

      <section class="card journal-new-card">

        <div class="reflection-card-heading">

          <div class="reflection-heading-icon">
            ✍️
          </div>

          <div>

            <p class="eyebrow">
              NEW JOURNAL ENTRY
            </p>

            <h3>
              What's on your heart?
            </h3>

          </div>

        </div>

        <form id="journalForm">

          <label>

            Title

            <input
              id="journalTitle"
              type="text"
              maxlength="120"
              placeholder="Give this entry a title..."
            >

          </label>

          <label>

            Journal entry

            <textarea
              id="journalText"
              rows="9"
              required
              placeholder="Start writing..."
            ></textarea>

          </label>

          <div class="journal-memory-option">

            <label class="memory-save-option">

              <input
                type="checkbox"
                id="saveJournalToMemory"
              >

              <span>

                <strong>
                  Save this entry to Memory Bank
                </strong>

                <small>
                  Only select this when this is something
                  you want to intentionally remember later.
                </small>

              </span>

            </label>

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
          ></p>

        </form>

      </section>

      <div class="section-heading-row">

        <h3>
          Previous entries
        </h3>

        <span class="muted">
          ${entries.length}
          ${
            entries.length === 1
              ? 'entry'
              : 'entries'
          }
        </span>

      </div>

      ${
        entries.length
          ? `
            <section class="journal-list">

              ${entries
                .map(
                  entry => `
                    <article
                      class="journal-entry-card"
                      data-journal-id="${esc(
                        entry.id
                      )}"
                      tabindex="0"
                      role="button"
                    >

                      <div class="journal-entry-top">

                        <span class="journal-entry-date">
                          ${esc(
                            formatDate(
                              entry.created_at
                            )
                          )}
                        </span>

                        ${
                          entry.saved_to_memory
                            ? `
                              <span class="memory-status">
                                🌿 In Memory Bank
                              </span>
                            `
                            : ''
                        }

                      </div>

                      <h3>
                        ${esc(
                          entry.title ||
                          'Untitled journal entry'
                        )}
                      </h3>

                      <p>
                        ${esc(
                          memoryPreview(
                            entry.content ||
                            entry.entry_text ||
                            ''
                          )
                        )}
                      </p>

                      <div class="journal-entry-footer">
                        Read entry →
                      </div>

                    </article>
                  `
                )
                .join('')}

            </section>
          `
          : `
            <section class="empty-state">

              <div class="empty-icon">
                📖
              </div>

              <h3>
                Your journal is waiting for you.
              </h3>

              <p>
                Begin with whatever is on your heart.
                There is no right way to write here.
              </p>

            </section>
          `
      }

    </main>
  `
}

/* =========================================================
   JOURNAL DETAIL
========================================================= */

async function journalDetailView(entry) {
  const content =
    entry.content ||
    entry.entry_text ||
    ''

  return `
    <main>

      <div class="detail-back">

        <button
          class="link back-button"
          id="backToJournal"
        >
          ← Back to journal
        </button>

      </div>

      <section class="card journal-detail-card">

        <div class="journal-detail-top">

          <p class="eyebrow">
            JOURNAL
          </p>

          <span class="journal-entry-date">
            ${esc(
              formatDate(
                entry.created_at
              )
            )}
          </span>

        </div>

        <h2>
          ${esc(
            entry.title ||
            'Untitled journal entry'
          )}
        </h2>

        <div class="journal-full-text">
          ${esc(
            content
          ).replace(
            /\n/g,
            '<br>'
          )}
        </div>

        ${
          entry.saved_to_memory
            ? `
              <div class="journal-memory-badge">

                🌿
                Saved to Memory Bank

              </div>
            `
            : ''
        }

        <div class="button-row journal-actions">

          <button
            class="secondary"
            id="editJournalEntry"
          >
            Edit entry
          </button>

          <button
            class="danger-button"
            id="deleteJournalEntry"
          >
            Delete entry
          </button>

        </div>

      </section>

    </main>
  `
}

/* =========================================================
   JOURNAL EDITOR
========================================================= */

async function journalEditorView(entry) {
  return `
    <main>

      <div class="detail-back">

        <button
          class="link back-button"
          id="backFromJournalEditor"
        >
          ← Back to entry
        </button>

      </div>

      <div class="section-title">

        <p class="eyebrow">
          EDIT JOURNAL
        </p>

        <h2>
          Continue writing.
        </h2>

      </div>

      <section class="card journal-editor-card">

        <form id="journalEditForm">

          <label>

            Title

            <input
              id="editJournalTitle"
              type="text"
              maxlength="120"
              value="${esc(
                entry.title || ''
              )}"
            >

          </label>

          <label>

            Journal entry

            <textarea
              id="editJournalText"
              rows="14"
              required
            >${esc(
              entry.content ||
              entry.entry_text ||
              ''
            )}</textarea>

          </label>

          <label class="memory-save-option">

            <input
              type="checkbox"
              id="editJournalMemory"
              ${
                entry.saved_to_memory
                  ? 'checked'
                  : ''
              }
            >

            <span>

              <strong>
                Save this entry to Memory Bank
              </strong>

              <small>
                This intentionally creates a future
                remembrance from your journal entry.
              </small>

            </span>

          </label>

          <div class="button-row">

            <button
              class="primary"
              type="submit"
            >
              Save changes
            </button>

            <button
              class="secondary"
              type="button"
              id="cancelJournalEdit"
            >
              Cancel
            </button>

          </div>

          <p
            id="journalEditMsg"
            class="msg"
          ></p>

        </form>

      </section>

    </main>
  `
}

/* =========================================================
   SAVE JOURNAL ENTRY
========================================================= */

async function saveJournalEntry() {
  const title =
    document
      .getElementById(
        'journalTitle'
      )
      ?.value
      .trim() || ''

  const content =
    document
      .getElementById(
        'journalText'
      )
      ?.value
      .trim() || ''

  const saveToMemory =
    document
      .getElementById(
        'saveJournalToMemory'
      )
      ?.checked || false

  const msg =
    document.getElementById(
      'journalMsg'
    )

  if (!content) {
    if (msg) {
      msg.textContent =
        'Please write something before saving.'
    }

    return
  }

  if (msg) {
    msg.textContent =
      'Saving...'
  }

  const {
    data: entry,
    error
  } = await supabase
    .from('journal_entries')
    .insert({
      user_id:
        state.session.user.id,

      title:
        title ||
        'Untitled journal entry',

      content,

      saved_to_memory:
        saveToMemory
    })
    .select()
    .single()

  if (error) {
    if (msg) {
      msg.textContent =
        error.message
    }

    return
  }

  if (saveToMemory) {
    await createJournalMemory(
      entry
    )
  }

  showToast(
    'Journal entry saved.',
    'success'
  )

  await render()
}

/* =========================================================
   JOURNAL → MEMORY
========================================================= */

async function createJournalMemory(
  entry
) {
  const {
    error
  } = await supabase
    .from('memory_points')
    .insert({
      user_id:
        state.session.user.id,

      title:
        entry.title ||
        'A lesson to remember',

      memory_text:
        entry.content ||
        entry.entry_text ||
        '',

      source_type:
        'journal'
    })

  if (error) {
    console.error(
      'Could not create journal memory:',
      error
    )
  }
}

/* =========================================================
   UPDATE JOURNAL ENTRY
========================================================= */

async function updateJournalEntry(
  entry
) {
  const title =
    document
      .getElementById(
        'editJournalTitle'
      )
      ?.value
      .trim() || ''

  const content =
    document
      .getElementById(
        'editJournalText'
      )
      ?.value
      .trim() || ''

  const saveToMemory =
    document
      .getElementById(
        'editJournalMemory'
      )
      ?.checked || false

  const msg =
    document.getElementById(
      'journalEditMsg'
    )

  if (!content) {
    if (msg) {
      msg.textContent =
        'Please write something before saving.'
    }

    return
  }

  if (msg) {
    msg.textContent =
      'Saving...'
  }

  const {
    error
  } = await supabase
    .from('journal_entries')
    .update({
      title:
        title ||
        'Untitled journal entry',

      content,

      saved_to_memory:
        saveToMemory,

      updated_at:
        new Date().toISOString()
    })
    .eq(
      'id',
      entry.id
    )
    .eq(
      'user_id',
      state.session.user.id
    )

  if (error) {
    if (msg) {
      msg.textContent =
        error.message
    }

    return
  }

  /*
   * If the user has chosen to save the journal entry
   * and a corresponding memory does not exist yet,
   * create one.
   */
  if (saveToMemory) {
    const {
      data: existingMemory
    } = await supabase
      .from('memory_points')
      .select('id')
      .eq(
        'user_id',
        state.session.user.id
      )
      .eq(
        'source_type',
        'journal'
      )
      .eq(
        'title',
        title ||
        'Untitled journal entry'
      )
      .limit(1)

    if (
      !existingMemory ||
      !existingMemory.length
    ) {
      await createJournalMemory({
        ...entry,
        title:
          title ||
          'Untitled journal entry',
        content
      })
    }
  }

  showToast(
    'Journal entry updated.',
    'success'
  )

  state.selectedJournal = {
    ...entry,
    title:
      title ||
      'Untitled journal entry',
    content,
    saved_to_memory:
      saveToMemory
  }

  state.view = 'journal-detail'

  await render()
}

/* =========================================================
   DELETE JOURNAL ENTRY
========================================================= */

async function deleteJournalEntry(
  entryId
) {
  const confirmed =
    window.confirm(
      'Delete this journal entry? This cannot be undone.'
    )

  if (!confirmed) {
    return
  }

  const {
    error
  } = await supabase
    .from('journal_entries')
    .delete()
    .eq(
      'id',
      entryId
    )
    .eq(
      'user_id',
      state.session.user.id
    )

  if (error) {
    showToast(
      error.message,
      'error'
    )

    return
  }

  showToast(
    'Journal entry deleted.',
    'success'
  )

  state.selectedJournal = null
  state.view = 'journal'

  await render()
}

/* =========================================================
   PART 4 — NAVIGATION, EVENT HANDLERS & APP INITIALIZATION
========================================================= */

/* =========================================================
   APP NAVIGATION
========================================================= */

function navigate(view) {
  state.view = view

  state.selectedMemory = null
  state.selectedJournal = null

  render()
}

/* =========================================================
   MEMORY DETAIL NAVIGATION
========================================================= */

async function openMemory(memoryId) {
  const {
    data,
    error
  } = await supabase
    .from('memory_points')
    .select('*')
    .eq(
      'id',
      memoryId
    )
    .eq(
      'user_id',
      state.session.user.id
    )
    .single()

  if (error) {
    showToast(
      error.message,
      'error'
    )

    return
  }

  state.selectedMemory = data
  state.view = 'memory-detail'

  await render()
}

/* =========================================================
   JOURNAL DETAIL NAVIGATION
========================================================= */

async function openJournalEntry(entryId) {
  const {
    data,
    error
  } = await supabase
    .from('journal_entries')
    .select('*')
    .eq(
      'id',
      entryId
    )
    .eq(
      'user_id',
      state.session.user.id
    )
    .single()

  if (error) {
    showToast(
      error.message,
      'error'
    )

    return
  }

  state.selectedJournal = data
  state.view = 'journal-detail'

  await render()
}

/* =========================================================
   EDIT MEMORY
========================================================= */

async function updateMemory(
  memory
) {
  const title =
    document
      .getElementById(
        'memoryTitle'
      )
      ?.value
      .trim() ||
      'A lesson to remember'

  const memoryText =
    document
      .getElementById(
        'memoryText'
      )
      ?.value
      .trim() || ''

  const msg =
    document.getElementById(
      'memoryEditMsg'
    )

  if (!memoryText) {
    if (msg) {
      msg.textContent =
        'Please add something you want to remember.'
    }

    return
  }

  if (msg) {
    msg.textContent =
      'Saving...'
  }

  const {
    data,
    error
  } = await supabase
    .from('memory_points')
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
    .select()
    .single()

  if (error) {
    if (msg) {
      msg.textContent =
        error.message
    }

    return
  }

  state.selectedMemory = data
  state.view = 'memory-detail'

  showToast(
    'Memory updated.',
    'success'
  )

  await render()
}

/* =========================================================
   UPDATE REFLECTION
========================================================= */

async function updateReflection(
  reflection
) {
  const text =
    document
      .getElementById(
        'editReflectionText'
      )
      ?.value
      .trim() || ''

  const msg =
    document.getElementById(
      'editReflectionMsg'
    )

  if (!text) {
    if (msg) {
      msg.textContent =
        'Please add something to your reflection.'
    }

    return
  }

  if (msg) {
    msg.textContent =
      'Saving...'
  }

  const {
    data,
    error
  } = await supabase
    .from('prayer_reflections')
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
    .select()
    .single()

  if (error) {
    if (msg) {
      msg.textContent =
        error.message
    }

    return
  }

  showToast(
    'Reflection updated.',
    'success'
  )

  /*
   * If this reflection has an associated memory,
   * keep the memory synchronized with the reflection.
   */
  const {
    data: memories
  } = await supabase
    .from('memory_points')
    .select('id')
    .eq(
      'user_id',
      state.session.user.id
    )
    .eq(
      'prayer_reflection_id',
      reflection.id
    )

  if (
    memories &&
    memories.length
  ) {
    await supabase
      .from('memory_points')
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

  state.view =
    state.previousView ||
    'prayers'

  await render()
}

/* =========================================================
   MEMORY DETAIL VIEW
========================================================= */

async function memoryDetailView(
  memory
) {
  let prayer = null
  let reflection = null

  /*
   * Retrieve the original prayer when the memory
   * was created from an answered prayer.
   */
  if (
    memory.prayer_request_id
  ) {
    const {
      data
    } = await supabase
      .from('prayer_requests')
      .select('*')
      .eq(
        'id',
        memory.prayer_request_id
      )
      .eq(
        'user_id',
        state.session.user.id
      )
      .maybeSingle()

    prayer = data
  }

  /*
   * Retrieve the reflection connected to this memory.
   */
  if (
    memory.prayer_reflection_id
  ) {
    const {
      data
    } = await supabase
      .from('prayer_reflections')
      .select('*')
      .eq(
        'id',
        memory.prayer_reflection_id
      )
      .eq(
        'user_id',
        state.session.user.id
      )
      .maybeSingle()

    reflection = data
  }

  const sourceLabel =
    getMemorySourceLabel(
      memory.source_type
    )

  return `
    <main>

      <div class="detail-back">

        <button
          class="link back-button"
          id="backToMemoryBank"
        >
          ← Back to Memory Bank
        </button>

      </div>

      <section class="card memory-detail-main">

        <div class="memory-card-top">

          <span class="memory-source">
            ${sourceLabel}
          </span>

          <span class="memory-date">
            ${esc(
              formatDate(
                memory.created_at
              )
            )}
          </span>

        </div>

        <p class="memory-detail-label">
          SOMETHING WORTH REMEMBERING
        </p>

        <h2>
          ${esc(
            memory.title ||
            'A lesson to remember'
          )}
        </h2>

        <div class="memory-full-text">
          ${esc(
            memory.memory_text ||
            ''
          ).replace(
            /\n/g,
            '<br>'
          )}
        </div>

      </section>

      ${
        prayer
          ? `
            <section class="connected-record">

              <div class="connected-record-header">

                <div class="connected-icon">
                  🙏
                </div>

                <div>

                  <p class="eyebrow">
                    ORIGINAL PRAYER
                  </p>

                  <h3>
                    The prayer behind this memory
                  </h3>

                </div>

              </div>

              <div>
                ${
                  prayer.title
                    ? `
                      <strong>
                        ${esc(
                          prayer.title
                        )}
                      </strong>
                    `
                    : ''
                }

                <p>
                  ${esc(
                    prayer.request ||
                    prayer.prayer_text ||
                    prayer.content ||
                    ''
                  )}
                </p>

              </div>

            </section>
          `
          : ''
      }

      ${
        prayer?.answer ||
        prayer?.answer_note
          ? `
            <section
              class="connected-record answer-record"
            >

              <div class="connected-record-header">

                <div class="connected-icon">
                  ✨
                </div>

                <div>

                  <p class="eyebrow">
                    ANSWERED PRAYER
                  </p>

                  <h3>
                    How the prayer was answered
                  </h3>

                </div>

              </div>

              <p>
                ${esc(
                  prayer.answer ||
                  prayer.answer_note ||
                  ''
                )}
              </p>

            </section>
          `
          : ''
      }

      ${
        reflection
          ? `
            <section
              class="connected-record reflection-detail-card"
            >

              <div class="connected-record-header">

                <div class="connected-icon">
                  🌿
                </div>

                <div>

                  <p class="eyebrow">
                    REFLECTION
                  </p>

                  <h3>
                    What you learned
                  </h3>

                </div>

              </div>

              <div
                class="reflection-detail-text"
              >
                ${esc(
                  reflection.reflection_text ||
                  ''
                ).replace(
                  /\n/g,
                  '<br>'
                )}
              </div>

              <div class="button-row">

                <button
                  class="secondary"
                  id="editReflectionFromMemory"
                >
                  Edit reflection
                </button>

              </div>

            </section>
          `
          : ''
      }

      <section class="card memory-actions-card">

        <div class="row">

          <div>

            <p class="eyebrow">
              MEMORY
            </p>

            <p class="muted">
              This memory can continue to grow
              with your story.
            </p>

          </div>

        </div>

        <div class="button-row">

          <button
            class="secondary"
            id="editMemoryButton"
          >
            Edit memory
          </button>

          <button
            class="danger-button"
            id="deleteMemoryButton"
          >
            Delete memory
          </button>

        </div>

      </section>

    </main>
  `
}

/* =========================================================
   MEMORY SOURCE LABELS
========================================================= */

function getMemorySourceLabel(
  source
) {
  const labels = {
    answered_prayer:
      '🙏 Answered Prayer',

    journal:
      '📖 Journal',

    reflection:
      '🌿 Reflection',

    manual:
      '✦ Personal Memory'
  }

  return (
    labels[source] ||
    '🌿 Memory'
  )
}

/* =========================================================
   MEMORY PREVIEW
========================================================= */

function memoryPreview(
  text,
  length = 180
) {
  if (!text) {
    return ''
  }

  const clean =
    String(text)
      .replace(
        /\s+/g,
        ' '
      )
      .trim()

  if (
    clean.length <= length
  ) {
    return clean
  }

  return (
    clean.substring(
      0,
      length
    ).trim() +
    '…'
  )
}

/* =========================================================
   ESCAPE HTML
========================================================= */

function esc(
  value
) {
  return String(
    value ?? ''
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    )
}

/* =========================================================
   DATE FORMATTING
========================================================= */

function formatDate(
  value
) {
  if (!value) {
    return ''
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return ''
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }
  ).format(date)
}

/* =========================================================
   TOAST
========================================================= */

function showToast(
  message,
  type = 'info'
) {
  let toast =
    document.getElementById(
      'appToast'
    )

  if (!toast) {
    toast =
      document.createElement(
        'div'
      )

    toast.id =
      'appToast'

    toast.className =
      'app-toast'

    document.body.appendChild(
      toast
    )
  }

  toast.textContent =
    message

  toast.dataset.type =
    type

  toast.classList.add(
    'show'
  )

  clearTimeout(
    window.__toastTimer
  )

  window.__toastTimer =
    setTimeout(
      () => {
        toast.classList.remove(
          'show'
        )
      },
      2800
    )
}

/* =========================================================
   EVENT DELEGATION
========================================================= */

document.addEventListener(
  'click',
  async event => {

    const target =
      event.target

    /*
     * Bottom navigation
     */
    const navButton =
      target.closest(
        '[data-nav]'
      )

    if (navButton) {
      const destination =
        navButton.dataset.nav

      navigate(
        destination
      )

      return
    }

    /*
     * Memory card
     */
    const memoryCard =
      target.closest(
        '[data-memory-id]'
      )

    if (
      memoryCard &&
      !target.closest(
        'button'
      )
    ) {
      await openMemory(
        memoryCard.dataset.memoryId
      )

      return
    }

    /*
     * Journal card
     */
    const journalCard =
      target.closest(
        '[data-journal-id]'
      )

    if (
      journalCard &&
      !target.closest(
        'button'
      )
    ) {
      await openJournalEntry(
        journalCard.dataset.journalId
      )

      return
    }

    /*
     * Back to Memory Bank
     */
    if (
      target.closest(
        '#backToMemoryBank'
      )
    ) {
      state.view =
        'memory-bank'

      state.selectedMemory =
        null

      await render()

      return
    }

    /*
     * Back to Journal
     */
    if (
      target.closest(
        '#backToJournal'
      )
    ) {
      state.view =
        'journal'

      state.selectedJournal =
        null

      await render()

      return
    }

    /*
     * Back from memory editor
     */
    if (
      target.closest(
        '#backFromMemoryEditor'
      ) ||
      target.closest(
        '#cancelMemoryEdit'
      )
    ) {
      state.view =
        'memory-detail'

      await render()

      return
    }

    /*
     * Back from reflection editor
     */
    if (
      target.closest(
        '#backFromReflectionEditor'
      ) ||
      target.closest(
        '#cancelEditReflection'
      )
    ) {
      state.view =
        state.previousView ||
        'prayers'

      await render()

      return
    }

    /*
     * Back from journal editor
     */
    if (
      target.closest(
        '#backFromJournalEditor'
      ) ||
      target.closest(
        '#cancelJournalEdit'
      )
    ) {
      state.view =
        'journal-detail'

      await render()

      return
    }

    /*
     * Edit memory
     */
    if (
      target.closest(
        '#editMemoryButton'
      )
    ) {
      state.view =
        'memory-editor'

      await render()

      return
    }

    /*
     * Edit reflection from Memory detail
     */
    if (
      target.closest(
        '#editReflectionFromMemory'
      )
    ) {
      if (
        !state.selectedMemory
          ?.prayer_reflection_id
      ) {
        showToast(
          'There is no connected reflection to edit.',
          'error'
        )

        return
      }

      const {
        data: reflection,
        error
      } = await supabase
        .from(
          'prayer_reflections'
        )
        .select('*')
        .eq(
          'id',
          state.selectedMemory
            .prayer_reflection_id
        )
        .eq(
          'user_id',
          state.session.user.id
        )
        .single()

      if (error) {
        showToast(
          error.message,
          'error'
        )

        return
      }

      state.previousView =
        'memory-detail'

      state.selectedReflection =
        reflection

      state.view =
        'reflection-editor'

      await render()

      return
    }

    /*
     * Delete memory
     */
    if (
      target.closest(
        '#deleteMemoryButton'
      )
    ) {
      if (
        state.selectedMemory
      ) {
        await deleteMemory(
          state.selectedMemory.id
        )
      }

      return
    }

    /*
     * Edit journal
     */
    if (
      target.closest(
        '#editJournalEntry'
      )
    ) {
      state.view =
        'journal-editor'

      await render()

      return
    }

    /*
     * Delete journal
     */
    if (
      target.closest(
        '#deleteJournalEntry'
      )
    ) {
      if (
        state.selectedJournal
      ) {
        await deleteJournalEntry(
          state.selectedJournal.id
        )
      }

      return
    }

  }
)

/* =========================================================
   FORM EVENT DELEGATION
========================================================= */

document.addEventListener(
  'submit',
  async event => {

    const form =
      event.target

    event.preventDefault()

    /*
     * Memory editor
     */
    if (
      form.id ===
      'memoryEditForm'
    ) {
      if (
        state.selectedMemory
      ) {
        await updateMemory(
          state.selectedMemory
        )
      }

      return
    }

    /*
     * Reflection editor
     */
    if (
      form.id ===
      'editReflectionForm'
    ) {
      if (
        state.selectedReflection
      ) {
        await updateReflection(
          state.selectedReflection
        )
      }

      return
    }

    /*
     * Journal creation
     */
    if (
      form.id ===
      'journalForm'
    ) {
      await saveJournalEntry()

      return
    }

    /*
     * Journal editor
     */
    if (
      form.id ===
      'journalEditForm'
    ) {
      if (
        state.selectedJournal
      ) {
        await updateJournalEntry(
          state.selectedJournal
        )
      }

      return
    }

  }
)

/* =========================================================
   KEYBOARD ACCESSIBILITY
========================================================= */

document.addEventListener(
  'keydown',
  async event => {

    if (
      event.key !==
      'Enter'
    ) {
      return
    }

    const target =
      event.target

    /*
     * Allow keyboard users to open
     * Memory Bank cards.
     */
    if (
      target.matches(
        '[data-memory-id]'
      )
    ) {
      event.preventDefault()

      await openMemory(
        target.dataset.memoryId
      )

      return
    }

    /*
     * Allow keyboard users to open
     * Journal cards.
     */
    if (
      target.matches(
        '[data-journal-id]'
      )
    ) {
      event.preventDefault()

      await openJournalEntry(
        target.dataset.journalId
      )
    }

  }
)

/* =========================================================
   RENDER ROUTER
========================================================= */

async function render() {
  const root =
    document.getElementById(
      'app'
    )

  if (!root) {
    return
  }

  /*
   * Not authenticated
   */
  if (
    !state.session
  ) {
    root.innerHTML =
      await authView()

    return
  }

  /*
   * Memory Bank
   */
  if (
    state.view ===
    'memory-bank'
  ) {
    root.innerHTML =
      await memoryBankView()

    return
  }

  /*
   * Memory Detail
   */
  if (
    state.view ===
    'memory-detail'
  ) {
    root.innerHTML =
      await memoryDetailView(
        state.selectedMemory
      )

    return
  }

  /*
   * Memory Editor
   */
  if (
    state.view ===
    'memory-editor'
  ) {
    root.innerHTML =
      await memoryEditorView(
        state.selectedMemory
      )

    return
  }

  /*
   * Reflection Editor
   */
  if (
    state.view ===
    'reflection-editor'
  ) {
    root.innerHTML =
      await editReflectionView(
        state.selectedReflection
      )

    return
  }

  /*
   * Journal
   */
  if (
    state.view ===
    'journal'
  ) {
    root.innerHTML =
      await journalView()

    return
  }

  /*
   * Journal Detail
   */
  if (
    state.view ===
    'journal-detail'
  ) {
    root.innerHTML =
      await journalDetailView(
        state.selectedJournal
      )

    return
  }

  /*
   * Journal Editor
   */
  if (
    state.view ===
    'journal-editor'
  ) {
    root.innerHTML =
      await journalEditorView(
        state.selectedJournal
      )

    return
  }

  /*
   * Existing application views.
   *
   * Keep the existing prayer/dashboard
   * rendering functions here.
   */
  if (
    state.view ===
    'prayers'
  ) {
    root.innerHTML =
      await prayersView()

    return
  }

  if (
    state.view ===
    'dashboard'
  ) {
    root.innerHTML =
      await dashboardView()

    return
  }

  /*
   * Fallback
   */
  root.innerHTML =
    await dashboardView()
}

/* =========================================================
   AUTH STATE
========================================================= */

async function initializeAuth() {
  const {
    data,
    error
  } =
    await supabase.auth
      .getSession()

  if (error) {
    console.error(
      'Unable to retrieve session:',
      error
    )

    return
  }

  state.session =
    data.session

  if (
    state.session &&
    !state.view
  ) {
    state.view =
      'dashboard'
  }

  await render()

  supabase.auth.onAuthStateChange(
    async (
      event,
      session
    ) => {

      state.session =
        session

      if (!session) {
        state.view =
          'auth'

        state.selectedMemory =
          null

        state.selectedJournal =
          null
      }
      else if (
        !state.view ||
        state.view ===
        'auth'
      ) {
        state.view =
          'dashboard'
      }

      await render()

    }
  )
}

/* =========================================================
   INITIALIZE APP
========================================================= */

if (
  document.readyState ===
  'loading'
) {
  document.addEventListener(
    'DOMContentLoaded',
    initializeAuth
  )
}
else {
  initializeAuth()
}
