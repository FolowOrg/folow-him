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

  memories: [],
  memorySearch: '',
  memoryCategory: 'All',
  selectedMemory: null,
  editingMemory: null
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
  'Answered Prayer',
  'Lesson Learned',
  'Faith',
  'Growth',
  'Gratitude'
]

function esc(value = '') {
  return String(value).replace(
    /[&<>"']/g,
    character =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      })[character]
  )
}

function formatDate(date) {
  if (!date) return ''

  return new Date(date).toLocaleDateString(
    undefined,
    {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }
  )
}

function shortDate(date) {
  if (!date) return ''

  return new Date(date).toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }
  )
}

function getMemoryTitle(memory) {
  return (
    memory.memory_title ||
    memory.title ||
    'A lesson to remember'
  )
}

function getMemoryCategory(memory) {
  return (
    memory.memory_category ||
    'Answered Prayer'
  )
}

function getMemoryText(memory) {
  return (
    memory.reflection_text ||
    memory.memory_text ||
    ''
  )
}

function getPrayer(memory) {
  return memory.prayer_requests || null
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

async function loadMemories() {
  if (!state.session) return

  const {
    data,
    error
  } = await supabase
    .from('prayer_reflections')
    .select(`
      id,
      user_id,
      prayer_request_id,
      reflection_prompt,
      reflection_text,
      save_as_memory,
      memory_title,
      memory_category,
      is_memory,
      created_at,
      updated_at,
      prayer_requests (
        id,
        title,
        details,
        answer_note,
        answered_at,
        category
      )
    `)
    .eq(
      'user_id',
      state.session.user.id
    )
    .or(
      'is_memory.eq.true,save_as_memory.eq.true'
    )
    .order(
      'updated_at',
      {
        ascending: false
      }
    )

  if (error) {
    console.error(
      'Memory Bank error:',
      error
    )

    state.memories = []
    return
  }

  state.memories = data || []
}

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
          ></p>

        </form>

      </section>

    </main>
  `
}

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
          <span class="nav-icon">⌂</span>
          <span>Today</span>
        </button>

        <button
          data-view="journal"
          class="${
            state.view === 'journal'
              ? 'active'
              : ''
          }"
        >
          <span class="nav-icon">✎</span>
          <span>Journal</span>
        </button>

        <button
          data-view="prayers"
          class="${
            state.view === 'prayers'
              ? 'active'
              : ''
          }"
        >
          <span class="nav-icon">♡</span>
          <span>Prayers</span>
        </button>

        <button
          data-view="memories"
          class="${
            state.view === 'memories'
              ? 'active'
              : ''
          }"
        >
          <span class="nav-icon">✦</span>
          <span>Memories</span>
        </button>

        <button
          data-view="profile"
          class="${
            state.view === 'profile'
              ? 'active'
              : ''
          }"
        >
          <span class="nav-icon">○</span>
          <span>Profile</span>
        </button>

      </nav>

    </div>
  `
}

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
                Add daily content from your
                admin library to personalize
                this screen.
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

async function journalView() {
  const {
    data: entries = []
  } = await supabase
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
            <section class="daily-reflection-card">

              <div class="reflection-icon">
                ✦
              </div>

              <div>

                <p class="eyebrow">
                  TODAY'S REFLECTION
                </p>

                <h3>
                  ${esc(
                    c.reflection_prompt
                  )}
                </h3>

                <p class="muted">
                  Let this question guide
                  your reflection, or simply
                  write what is on your heart.
                </p>

              </div>

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
              entry => `
                <article class="entry">

                  <small>
                    ${esc(
                      entry.entry_date
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
                      entry.body
                    ).slice(0, 280)}
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

async function prayersView() {
  const {
    data: prayers = []
  } = await supabase
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
                    category =>
                      `
                        <option
                          value="${esc(
                            category
                          )}"
                        >
                          ${esc(
                            category
                          )}
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
              prayer => `
                <article class="entry">

                  <div class="row">

                    <div>

                      <span
                        class="pill ${esc(
                          prayer.status
                        )}"
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
                      prayer.status ===
                      'active'
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
                    ${esc(
                      prayer.title
                    )}
                  </h3>

                  <p>
                    ${esc(
                      prayer.details ||
                      ''
                    )}
                  </p>

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

      <section class="card">

        <p class="eyebrow">
          ANSWERED PRAYER
        </p>

        <h3>
          ${esc(
            prayer.title
          )}
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

                <p class="eyebrow">
                  WHAT HAPPENED
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

      <section class="prompt-card">

        <p class="eyebrow">
          A THOUGHT TO CONSIDER
        </p>

        <h3>
          ${esc(
            suggestedPrompt
          )}
        </h3>

        <p class="muted">
          This is only a suggestion.
          Your reflection can be completely
          different.
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

function filteredMemories() {
  const search =
    state.memorySearch
      .trim()
      .toLowerCase()

  return state.memories.filter(
    memory => {

      const category =
        getMemoryCategory(
          memory
        )

      const title =
        getMemoryTitle(
          memory
        )

      const text =
        getMemoryText(
          memory
        )

      const prayer =
        getPrayer(
          memory
        )

      const prayerTitle =
        prayer?.title ||
        ''

      const matchesCategory =
        state.memoryCategory ===
          'All' ||
        category ===
          state.memoryCategory

      const searchable =
        [
          title,
          text,
          prayerTitle,
          category
        ]
          .join(' ')
          .toLowerCase()

      const matchesSearch =
        !search ||
        searchable.includes(
          search
        )

      return (
        matchesCategory &&
        matchesSearch
      )
    }
  )
}

function memoryCard(memory) {
  const prayer =
    getPrayer(memory)

  const title =
    getMemoryTitle(memory)

  const category =
    getMemoryCategory(memory)

  const text =
    getMemoryText(memory)

  return `
    <article class="memory-card">

      <div class="memory-card-top">

        <span class="memory-symbol">
          ✦
        </span>

        <span class="memory-category">
          ${esc(category)}
        </span>

      </div>

      <h3>
        ${esc(title)}
      </h3>

      <p class="memory-excerpt">
        ${esc(text).slice(
          0,
          210
        )}${
          text.length > 210
            ? '…'
            : ''
        }
      </p>

      ${
        prayer
          ? `
            <div class="memory-source">

              <span>
                ANSWERED PRAYER
              </span>

              <strong>
                ${esc(
                  prayer.title
                )}
              </strong>

            </div>
          `
          : ''
      }

      <div class="memory-card-footer">

        <span class="memory-date">
          ${shortDate(
            memory.updated_at ||
            memory.created_at
          )}
        </span>

        <button
          class="memory-open"
          data-memory-view="${esc(
            memory.id
          )}"
        >
          Open memory
          <span>→</span>
        </button>

      </div>

    </article>
  `
}

async function memoriesView() {
  await loadMemories()

  const memories =
    filteredMemories()

  const total =
    state.memories.length

  return `
    <main class="memory-page">

      <div class="memory-hero">

        <div>

          <p class="eyebrow">
            MEMORY BANK
          </p>

          <h2>
            Keep the lessons.
          </h2>

          <p>
            Remember what God has done,
            what He has taught you,
            and how He has been faithful.
          </p>

        </div>

        <div class="memory-hero-mark">
          ✦
        </div>

      </div>

      <section class="memory-search-card">

        <div class="memory-search">

          <span class="search-icon">
            ⌕
          </span>

          <input
            id="memorySearch"
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
                  class="clear-search"
                  id="clearMemorySearch"
                  type="button"
                >
                  ×
                </button>
              `
              : ''
          }

        </div>

        <div class="memory-filters">

          ${memoryCategories
            .map(
              category =>
                `
                  <button
                    type="button"
                    class="memory-filter ${
                      state.memoryCategory ===
                      category
                        ? 'active'
                        : ''
                    }"
                    data-memory-category="${esc(
                      category
                    )}"
                  >
                    ${esc(category)}
                  </button>
                `
            )
            .join('')}

        </div>

      </section>

      ${
        total
          ? `
            <div class="memory-count">

              <span>
                ${
                  memories.length
                }
                ${
                  memories.length === 1
                    ? 'memory'
                    : 'memories'
                }
              </span>

              <span>
                ${total}
                saved
              </span>

            </div>
          `
          : ''
      }

      ${
        memories.length
          ? `
            <section class="memory-grid">

              ${memories
                .map(
                  memory =>
                    memoryCard(
                      memory
                    )
                )
                .join('')}

            </section>
          `
          : `
            <section class="memory-empty">

              <div class="empty-symbol">
                ✦
              </div>

              ${
                total
                  ? `
                    <h3>
                      Nothing matches that search.
                    </h3>

                    <p>
                      Try another word or choose
                      a different category.
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
                      Your memory bank is waiting.
                    </h3>

                    <p>
                      When you reflect on an
                      answered prayer, save it
                      as a memory and it will
                      live here.
                    </p>

                    <button
                      class="primary"
                      data-view="prayers"
                    >
                      Visit my prayers
                    </button>
                  `
              }

            </section>
          `
      }

    </main>
  `
}

function memoryDetailView(memory) {
  const prayer =
    getPrayer(memory)

  const title =
    getMemoryTitle(memory)

  const category =
    getMemoryCategory(memory)

  const text =
    getMemoryText(memory)

  return `
    <main>

      <button
        class="back-link"
        id="backToMemories"
      >
        ← Back to Memory Bank
      </button>

      <div class="memory-detail-header">

        <span class="memory-detail-symbol">
          ✦
        </span>

        <p class="eyebrow">
          ${esc(category)}
        </p>

        <h2>
          ${esc(title)}
        </h2>

        <p class="muted">
          Saved
          ${formatDate(
            memory.created_at
          )}
          ${
            memory.updated_at &&
            memory.updated_at !==
              memory.created_at
              ? ` · Updated ${formatDate(
                  memory.updated_at
                )}`
              : ''
          }
        </p>

      </div>

      ${
        prayer
          ? `
            <section class="memory-prayer-card">

              <p class="eyebrow">
                THE PRAYER
              </p>

              <h3>
                ${esc(
                  prayer.title
                )}
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
          `
          : ''
      }

      ${
        state.editingMemory?.id ===
        memory.id
          ? memoryEditForm(
              memory
            )
          : `
            <section class="memory-full-card">

              <p class="eyebrow">
                WHAT I WANT TO REMEMBER
              </p>

              <p class="memory-full-text">
                ${esc(text)}
              </p>

            </section>

            <div class="memory-detail-actions">

              <button
                class="primary"
                id="editMemory"
              >
                Edit memory
              </button>

              <button
                class="danger-button"
                id="removeMemory"
              >
                Remove from Memory Bank
              </button>

            </div>
          `
      }

      <p
        id="memoryDetailMsg"
        class="msg"
      ></p>

    </main>
  `
}

function memoryEditForm(memory) {
  const title =
    getMemoryTitle(memory)

  const category =
    getMemoryCategory(memory)

  const text =
    getMemoryText(memory)

  return `
    <section class="card memory-edit-card">

      <div class="edit-heading">

        <p class="eyebrow">
          EDIT MEMORY
        </p>

        <h3>
          Shape this memory as you learn more.
        </h3>

      </div>

      <form id="memoryEditForm">

        <label>
          Memory title

          <input
            id="memoryTitle"
            value="${esc(title)}"
            maxlength="120"
            required
          >
        </label>

        <label>
          Category

          <select
            id="memoryCategory"
          >

            ${memoryCategories
              .filter(
                category =>
                  category !==
                  'All'
              )
              .map(
                category =>
                  `
                    <option
                      value="${esc(
                        category
                      )}"
                      ${
                        category ===
                        category
                          ? ''
                          : ''
                      }
                    >
                      ${esc(
                        category
                      )}
                    </option>
                  `
              )
              .join('')}

          </select>

        </label>

        <label>
          Your reflection

          <textarea
            id="memoryText"
            rows="9"
            required
          >${esc(text)}</textarea>

        </label>

        <div class="edit-actions">

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

      </form>

    </section>
  `
}

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
          ${esc(
            state.session.user.email
          )}
        </p>

        <p class="muted">
          Your private journal, prayers,
          reflections, and memories are
          protected by Supabase Row Level Security.
        </p>

      </section>

    </main>
  `
}

async function render() {
  if (state.recoveryMode) {
    root.innerHTML =
      authView()

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

  if (
    state.view ===
      'memory-detail' &&
    state.selectedMemory
  ) {
    root.innerHTML =
      shell(
        memoryDetailView(
          state.selectedMemory
        )
      )

    bindMemoryDetail()

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
      await memoriesView()
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

function bindAuth() {
  if (state.recoveryMode) {
    bindRecovery()
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
    async event => {

      event.preventDefault()

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
          state.authMode ===
          'signup'
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
          state.authMode ===
          'signup'
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

      const {
        error
      } =
        await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              window.location.origin
          }
        )

      msg.textContent =
        error
          ? `Password reset could not be sent: ${error.message}`
          : 'Password reset instructions were sent. Check your email.'
    }
  )
}

function bindRecovery() {
  const form =
    document.getElementById(
      'recoveryForm'
    )

  if (!form) return

  form.onsubmit =
    async event => {

      event.preventDefault()

      const password =
        document.getElementById(
          'newPassword'
        ).value

      const confirmation =
        document.getElementById(
          'confirmPassword'
        ).value

      const msg =
        document.getElementById(
          'recoveryMsg'
        )

      if (
        password.length <
        8
      ) {
        msg.textContent =
          'Your password must be at least 8 characters.'

        return
      }

      if (
        password !==
        confirmation
      ) {
        msg.textContent =
          'The passwords do not match.'

        return
      }

      msg.textContent =
        'Updating your password…'

      const {
        error
      } =
        await supabase.auth.updateUser({
          password
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

          state.session =
            null

          state.recoveryMode =
            false

          state.authMode =
            'login'

          await render()
        },
        1200
      )
    }
}

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

          state.selectedMemory =
            null

          render()
        }
    })

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

      state.memories =
        []

      render()
    }
  )

  document.getElementById(
    'journalForm'
  )?.addEventListener(
    'submit',
    async event => {

      event.preventDefault()

      const result =
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
        result.error?.message ||
        'Saved.'

      if (!result.error) {
        render()
      }
    }
  )

  document.getElementById(
    'prayerForm'
  )?.addEventListener(
    'submit',
    async event => {

      event.preventDefault()

      const result =
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
        result.error?.message ||
        'Prayer saved.'

      if (!result.error) {
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

          const result =
            await supabase
              .from(
                'prayer_requests'
              )
              .update({
                status:
                  'answered',

                answered_at:
                  new Date()
                    .toISOString(),

                answer_note:
                  note.trim() ||
                  null
              })
              .eq(
                'id',
                button.dataset.answer
              )

          if (result.error) {
            alert(
              `The prayer could not be updated: ${result.error.message}`
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
    })

  document
    .querySelectorAll(
      '[data-memory-category]'
    )
    .forEach(button => {

      button.onclick =
        () => {

          state.memoryCategory =
            button.dataset
              .memoryCategory

          render()
        }
    })

  document.getElementById(
    'memorySearch'
  )?.addEventListener(
    'input',
    event => {

      state.memorySearch =
        event.target.value

      render()
    }
  )

  document.getElementById(
    'clearMemorySearch'
  )?.addEventListener(
    'click',
    () => {

      state.memorySearch =
        ''

      render()
    }
  )

  document.getElementById(
    'clearMemoryFilters'
  )?.addEventListener(
    'click',
    () => {

      state.memorySearch =
        ''

      state.memoryCategory =
        'All'

      render()
    }
  )

  document
    .querySelectorAll(
      '[data-memory-view]'
    )
    .forEach(button => {

      button.onclick =
        () => {

          const memory =
            state.memories.find(
              item =>
                item.id ===
                button.dataset
                  .memoryView
            )

          if (!memory) {
            return
          }

          state.selectedMemory =
            memory

          state.view =
            'memory-detail'

          state.editingMemory =
            null

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
    async event => {

      event.preventDefault()

      const text =
        document
          .getElementById(
            'reflectionText'
          )
          .value
          .trim()

      const saveAsMemory =
        document.getElementById(
          'saveMemory'
        ).checked

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

      const result =
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

      if (result.error) {
        msg.textContent =
          `Your reflection could not be saved: ${result.error.message}`

        return
      }

      msg.textContent =
        saveAsMemory
          ? 'Your reflection was saved as a memory.'
          : 'Your reflection was saved.'

      setTimeout(
        () => {

          state.reflectionPrayer =
            null

          state.view =
            'prayers'

          render()
        },
        900
      )
    }
  )
}

function bindMemoryDetail() {
  document.getElementById(
    'backToMemories'
  )?.addEventListener(
    'click',
    () => {

      state.selectedMemory =
        null

      state.editingMemory =
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

      state.editingMemory =
        state.selectedMemory

      render()
    }
  )

  document.getElementById(
    'cancelMemoryEdit'
  )?.addEventListener(
    'click',
    () => {

      state.editingMemory =
        null

      render()
    }
  )

  document.getElementById(
    'memoryEditForm'
  )?.addEventListener(
    'submit',
    async event => {

      event.preventDefault()

      const title =
        document.getElementById(
          'memoryTitle'
        ).value.trim()

      const category =
        document.getElementById(
          'memoryCategory'
        ).value

      const text =
        document.getElementById(
          'memoryText'
        ).value.trim()

      const msg =
        document.getElementById(
          'memoryDetailMsg'
        )

      if (!title || !text) {
        msg.textContent =
          'Please add a title and reflection.'

        return
      }

      msg.textContent =
        'Saving your changes…'

      const result =
        await supabase
          .from(
            'prayer_reflections'
          )
          .update({
            memory_title:
              title,

            memory_category:
              category,

            reflection_text:
              text,

            is_memory:
              true,

            save_as_memory:
              true,

            updated_at:
              new Date()
                .toISOString()
          })
          .eq(
            'id',
            state.selectedMemory.id
          )
          .eq(
            'user_id',
            state.session.user.id
          )

      if (result.error) {
        msg.textContent =
          `Your memory could not be updated: ${result.error.message}`

        return
      }

      const {
        data: updated,
        error
      } =
        await supabase
          .from(
            'prayer_reflections'
          )
          .select(`
            id,
            user_id,
            prayer_request_id,
            reflection_prompt,
            reflection_text,
            save_as_memory,
            memory_title,
            memory_category,
            is_memory,
            created_at,
            updated_at,
            prayer_requests (
              id,
              title,
              details,
              answer_note,
              answered_at,
              category
            )
          `)
          .eq(
            'id',
            state.selectedMemory.id
          )
          .single()

      if (error) {
        msg.textContent =
          'Your memory was saved, but could not be refreshed.'

        return
      }

      state.selectedMemory =
        updated

      state.editingMemory =
        null

      render()
    }
  )

  document.getElementById(
    'removeMemory'
  )?.addEventListener(
    'click',
    async () => {

      const confirmed =
        window.confirm(
          'Remove this from your Memory Bank? Your original reflection will remain saved.'
        )

      if (!confirmed) {
        return
      }

      const result =
        await supabase
          .from(
            'prayer_reflections'
          )
          .update({
            is_memory:
              false,

            save_as_memory:
              false,

            updated_at:
              new Date()
                .toISOString()
          })
          .eq(
            'id',
            state.selectedMemory.id
          )
          .eq(
            'user_id',
            state.session.user.id
          )

      if (result.error) {
        alert(
          `The memory could not be removed: ${result.error.message}`
        )

        return
      }

      state.selectedMemory =
        null

      state.editingMemory =
        null

      state.view =
        'memories'

      render()
    }
  )
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

      state.selectedMemory =
        null

      state.editingMemory =
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

loadSession()
