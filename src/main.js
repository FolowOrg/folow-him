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

  reflectionReadOnly: false,

  reflectionReturnView: 'prayers',

 

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

 

 

 

/* =======/* =========================================================

   REFLECTION

========================================================= */

 

async function getLatestReflectionForPrayer(

  prayerId

) {

  const {

    data,

    error

  } = await supabase

    .from('prayer_reflections')

    .select('*')

    .eq(

      'prayer_request_id',

      prayerId

    )

    .order(

      'created_at',

      {

        ascending: false

      }

    )

    .limit(1)

    .maybeSingle()

 

  if (error) {

    console.error(error)

    return null

  }

 

  return data

}

 

async function reflectionView(

  prayer,

  existingReflection = null

) {

  const suggestedPrompt =

    `What do you want to remember about how God answered this prayer? What did you learn, notice, or feel God was showing you?`

 

  const reflection =

    existingReflection ||

    await getLatestReflectionForPrayer(

      prayer.id

    )

 

  const showReadOnly =

    Boolean(reflection) &&

    state.reflectionReadOnly &&

    !state.editingReflection

 

  const isEditing =

    !reflection ||

    Boolean(state.editingReflection) ||

    !showReadOnly

 

  return `

    <main>

 

      <div class="section-title">

 

        <p class="eyebrow">

          REFLECT ON THIS ANSWER

        </p>

 

        <h2>

          Remember His faithfulness.

        </h2>

 

        <p class="muted">

          Your understanding can grow over time.

          Come back and add to this reflection as

          you learn more about what God was doing.

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

 

      ${

        showReadOnly

          ? `

            <section

              class="card reflection-read-card"

              tabindex="0"

            >

 

              <div class="reflection-read-header">

 

                <div>

                  <p class="eyebrow">

                    YOUR REFLECTION

                  </p>

 

                  <p class="muted">

                    Last updated

                    ${esc(

                      formatDateTime(

                        reflection.updated_at ||

                        reflection.created_at

                      )

                    )}

                  </p>

                </div>

 

                <span class="reflection-read-icon">

                  🌿

                </span>

 

              </div>

 

              <div class="reflection-read-text">

                ${esc(

                  reflection.reflection_text

                ).replace(

                  /\n/g,

                  '<br>'

                )}

              </div>

 

              <p class="muted reflection-read-hint">

                Your reflection is also your connected memory.

              </p>

 

              <div class="button-row">

 

                <button

                  class="primary"

                  type="button"

                  id="editReflection"

                >

                  Edit reflection

                </button>

 

                <button

                  type="button"

                  class="secondary"

                  id="cancelReflection"

                >

                  Back

                </button>

 

              </div>

 

            </section>

          `

          : `

            <section class="card">

 

              <p class="eyebrow">

                YOUR REFLECTION

              </p>

 

              <h3>

                ${esc(suggestedPrompt)}

              </h3>

 

              <p class="muted">

                Write one reflection. It can be a lesson,

                revelation, personal thought, or anything you

                want to carry forward. You can return and add

                to it later.

              </p>

 

              <form

                id="reflectionForm"

                data-reflection-id="${

                  reflection?.id || ''

                }"

              >

 

                <label>

 

                  Your reflection

 

                  <textarea

                    id="reflectionText"

                    rows="10"

                    placeholder="Write your reflection, revelation, lesson, or anything you want to remember..."

                  >${

                    reflection?.reflection_text

                      ? esc(

                          reflection.reflection_text

                        )

                      : ''

                  }</textarea>

 

                </label>

 

                <div class="button-row">

 

                  <button

                    class="primary"

                    type="submit"

                  >

                    ${

                      isEditing &&

                      reflection

                        ? 'Update reflection'

                        : 'Save reflection'

                    }

                  </button>

 

                  <button

                    type="button"

                    class="secondary"

                    id="cancelReflection"

                  >

                    Back

                  </button>

 

                </div>

 

                <p

                  id="reflectionMsg"

                  class="msg"

                  aria-live="polite"

                ></p>

 

              </form>

 

            </section>

          `

      }

 

    </main>

  `

}==================================================

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

    state.memorySource !== 'all'

  ) {

    query =

      query.eq(

        'source_type',

        state.memorySource

      )

  }

 

  if (

    state.memorySearch.trim()

  ) {

    const search =

      state.memorySearch

        .trim()

        .replace(/,/g, ' ')

 

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

 

  if (error) {

    console.error(

      'Memory Bank error:',

      error

    )

 

    return {

      data: [],

      error

    }

  }

 

  return {

    data: data || [],

    error: null

  }

}

 

async function memoryBankView() {

  const {

    data: memories = [],

    error

  } = await loadMemories()

 

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

          These are the moments, lessons, and

          revelations you chose to keep.

        </p>

 

      </div>

 

      <section class="memory-intro">

 

        <div class="memory-intro-icon">

          🕊

        </div>

 

        <div>

 

          <strong>

            What God has done matters.

          </strong>

 

          <p>

            Your memories help you look back and

            recognize the story He has been writing.

          </p>

 

        </div>

 

      </section>

 

      <section class="card memory-controls">

 

        <div class="memory-search-wrap">

 

          <label

            class="memory-search-label"

            for="memorySearch"

          >

            Search your memories

          </label>

 

          <input

            id="memorySearch"

            class="memory-search"

            type="search"

            autocomplete="off"

            value="${esc(

              state.memorySearch

            )}"

            placeholder="Search a memory..."

          >

 

        </div>

 

        <div class="memory-filter-grid">

 

          <label>

 

            Source

 

            <select

              id="memorySource"

            >

 

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

                  state.memorySource ===

                  'journal'

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

 

            <select

              id="memorySort"

            >

 

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

 

      ${

        error

          ? `

            <div class="error-state">

 

              <h3>

                Your memories couldn't be loaded.

              </h3>

 

              <p>

                ${esc(error.message)}

              </p>

 

            </div>

          `

          : ''

      }

 

      ${

        !memories.length

          ? `

            <div class="empty-state memory-empty">

 

              <div class="empty-icon">

                🌿

              </div>

 

              <h3>

                ${

                  state.memorySearch ||

                  state.memorySource !== 'all'

                    ? 'No memories match your search.'

                    : 'Your Memory Bank is waiting.'

                }

              </h3>

 

              <p>

                ${

                  state.memorySearch ||

                  state.memorySource !== 'all'

                    ? 'Try another search or filter.'

                    : 'When you choose to save a reflection as a memory, it will live here.'

                }

              </p>

 

              ${

                state.memorySearch ||

                state.memorySource !== 'all'

                  ? `

                    <button

                      class="secondary"

                      id="clearMemoryFilters"

                    >

                      Clear filters

                    </button>

                  `

                  : ''

              }

 

            </div>

          `

          : `

            <div class="memory-results-header">

 

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

 

            </div>

 

            <div class="memory-grid">

 

              ${memories

                .map(

                  memory => `

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

                          class="memory-source"

                        >

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

                          View memory

                        </span>

 

                        <span class="memory-arrow">

                          →

                        </span>

 

                      </div>

 

                    </article>

                  `

                )

                .join('')}

 

            </div>

          `

      }

 

    </main>

  `

}

 

/* =========================================================

   MEMORY DETAIL

========================================================= */

 

async function loadMemoryDetail(

  memoryId

) {

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

      memory: null,

      prayer: null,

      reflection: null,

      error: memoryError

    }

  }

 

  let prayer = null

  let reflection = null

 

  if (

    memory.prayer_request_id

  ) {

    const result =

      await supabase

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

 

    prayer = result.data

  }

 

  if (

    memory.prayer_reflection_id

  ) {

    const result =

      await supabase

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

 

    reflection = result.data

  }

 

  if (

    !reflection &&

    memory.prayer_request_id

  ) {

    reflection =

      await getLatestReflectionForPrayer(

        memory.prayer_request_id

      )

  }

 

  return {

    memory,

    prayer,

    reflection,

    error: null

  }

}

 

async function memoryDetailView(

  memory

) {

  const result =

    await loadMemoryDetail(

      memory.id

    )

 

  if (result.error) {

    return `

      <main>

 

        <section class="card">

 

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

    <main>

 

      <div class="detail-back">

 

        <button

          class="link back-button"

          id="backToMemoryBank"

        >

          ← Back to Memory Bank

        </button>

 

      </div>

 

      <div class="section-title">

 

        <p class="eyebrow">

          ${sourceIcon(

            memory.source_type

          )}

          ${esc(

            sourceLabel(

              memory.source_type

            )

          )}

        </p>

 

        <h2>

          ${esc(

            memory.title ||

            'A lesson to remember'

          )}

        </h2>

 

        <p class="muted">

          Saved

          ${esc(

            formatDate(

              memory.created_at

            )

          )}

        </p>

 

      </div>

 

      ${

        prayer

          ? `

            <section class="connected-record">

 

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

                    <p>

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

 

                    <p class="eyebrow">

                      HOW GOD ANSWERED

                    </p>

 

                    <p>

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

            <section

              class="connected-record reflection-clickable"

              id="openConnectedReflection"

              tabindex="0"

              role="button"

              aria-label="Open connected reflection"

            >

 

              <div class="connected-record-header">

 

                <span class="connected-icon">

                  🌿

                </span>

 

                <div>

                  <p class="eyebrow">

                    CONNECTED REFLECTION

                  </p>

 

                  <p class="muted">

                    Last updated

                    ${esc(

                      formatDate(

                        reflection.updated_at ||

                        reflection.created_at

                      )

                    )}

                  </p>

                </div>

 

              </div>

 

              <div class="reflection-detail-text">

                ${esc(

                  reflection.reflection_text

                ).replace(

                  /\n/g,

                  '<br>'

                )}

              </div>

 

              <div class="reflection-card-link">

                Open reflection →

              </div>

 

            </section>

          `

          : `

            <section class="connected-record">

 

              <p class="eyebrow">

                CONNECTED REFLECTION

              </p>

 

              <h3>

                No reflection is connected yet.

              </h3>

 

              <p class="muted">

                Add a reflection to turn this answered prayer

                into a lasting remembrance.

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

                      Add a reflection

                    </button>

                  `

                  : ''

              }

 

            </section>

          `

      }

 

      <section class="card memory-actions-card">

 

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

 

        <p class="muted">

          ${

            reflection

              ? 'Edit memory opens your connected reflection. Your reflection and memory stay linked to this answered prayer.'

              : 'This memory is not connected to a reflection, so it can be edited directly.'

          }

        </p>

 

      </section>

 

    </main>

  `

}

 

/* =========================================================

   MEMORY EDIT

========================================================= */

 

function memoryEditView(

  memory

) {

  return `

    <main>

 

      <div class="detail-back">

 

        <button

          class="link"

          id="cancelMemoryEdit"

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

 

      </div>

 

      <section class="card">

 

        <form id="memoryEditForm">

 

          <label>

            Memory title

 

            <input

              id="memoryTitle"

              maxlength="200"

              value="${esc(

                memory.title ||

                'A lesson to remember'

              )}"

              required

            >

          </label>

 

          <label>

            Memory

 

            <textarea

              id="memoryText"

              rows="10"

              required

            >${esc(

              memory.memory_text

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

              id="cancelMemoryEditButton"

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

  if (

    state.recoveryMode

  ) {

    root.innerHTML =

      authView()

 

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

      'reflection' &&

    state.reflectionPrayer

  ) {

    root.innerHTML =

      shell(

        await reflectionView(

          state.reflectionPrayer,

          state.editingReflection

        )

      )

 

    bindReflection()

 

    return

  }

 

  if (

    state.view ===

    'memory-detail'

  ) {

    root.innerHTML =

      shell(

        await memoryDetailView(

          state.selectedMemory

        )

      )

 

    bindMemoryDetail()

 

    return

  }

 

  if (

    state.view ===

    'memory-edit'

  ) {

    root.innerHTML =

      shell(

        memoryEditView(

          state.editingMemory

        )

      )

 

    bindMemoryEdit()

 

    return

  }

 

  let content

 

  if (

    state.view === 'journal'

  ) {

    content =

      await journalView()

 

  } else if (

    state.view === 'prayers'

  ) {

    content =

      await prayersView()

 

  } else if (

    state.view === 'memory-bank'

  ) {

    content =

      await memoryBankView()

 

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

 

/* =========================================================

   AUTH BINDING

========================================================= */

 

function bindAuth() {

  if (

    state.recoveryMode

  ) {

    const form =

      document.getElementById(

        'recoveryForm'

      )

 

    form.onsubmit =

      async event => {

        event.preventDefault()

 

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

 

        const {

          error

        } =

          await supabase.auth.updateUser({

            password:

              newPassword

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

    async event => {

      event.preventDefault()

 

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

    }

 

  document.getElementById(

    'reset'

  ).onclick =

    async event => {

      event.preventDefault()

 

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

}

 

/* =========================================================

   VOICE

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

    .forEach(button => {

      button.onclick =

        () => {

          state.view =

            button.dataset.view

 

          if (

            state.view !==

            'memory-detail'

          ) {

            state.selectedMemory =

              null

          }

 

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

 

        state.selectedMemory =

          null

 

        state.editingMemory =

          null

 

        state.reflectionPrayer =

          null

 

        render()

      }

    )

 

  bindJournal()

 

  bindPrayers()

 

  bindMemoryBank()

 

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

   JOURNAL BINDING

========================================================= */

 

function bindJournal() {

  document

    .getElementById(

      'journalForm'

    )

    ?.addEventListener(

      'submit',

      async event => {

        event.preventDefault()

 

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

 

        if (!body) {

          setMessage(

            'journalMsg',

            'Write something before saving.'

          )

 

          return

        }

 

        const {

          error

        } =

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

 

        if (error) {

          setMessage(

            'journalMsg',

            `Your entry could not be saved: ${error.message}`

          )

 

          return

        }

 

        render()

      }

    )

}

 

/* =========================================================

   PRAYER BINDING

========================================================= */

 

function bindPrayers() {

  document

    .getElementById(

      'prayerForm'

    )

    ?.addEventListener(

      'submit',

      async event => {

        event.preventDefault()

 

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

 

        const {

          error

        } =

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

 

        if (error) {

          setMessage(

            'prayerMsg',

            `Prayer could not be saved: ${error.message}`

          )

 

          return

        }

 

        render()

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

 

          if (

            note === null

          ) {

            return

          }

 

          const {

            error

          } =

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

 

          if (error) {

            window.alert(

              `The prayer could not be updated: ${error.message}`

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

            window.alert(

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

}

 

/* =========================================================

   REFLECTION BINDING

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

      async event => {

        event.preventDefault()

 

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

            'Write your reflection before saving.'

 

          return

        }

 

        const prayer =

          state.reflectionPrayer

 

        if (!prayer) {

          msg.textContent =

            'The answered prayer could not be found. Please go back and try again.'

 

          return

        }

 

        msg.textContent =

          'Saving your reflection…'

 

        const reflectionId =

          event.currentTarget

            .dataset

            .reflectionId

 

        const prompt =

          `What do you want to remember about how God answered this prayer? What did you learn, notice, or feel God was showing you?`

 

        try {

          let savedReflection = null

 

          /* --------------------------------------------------

             SAVE OR UPDATE THE SINGLE REFLECTION

             -------------------------------------------------- */

 

          if (reflectionId) {

            const {

              data,

              error

            } =

              await supabase

                .from(

                  'prayer_reflections'

                )

                .update({

                  reflection_prompt:

                    prompt,

 

                  reflection_text:

                    text,

 

                  updated_at:

                    new Date().toISOString()

                })

                .eq(

                  'id',

                  reflectionId

                )

                .eq(

                  'user_id',

                  state.session.user.id

                )

                .select()

                .single()

 

            if (error) {

              throw error

            }

 

            savedReflection =

              data

          } else {

            const {

              data,

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

                    true

                })

                .select()

                .single()

 

            if (error) {

              throw error

            }

 

            savedReflection =

              data

          }

 

          /* --------------------------------------------------

             SYNCHRONIZE MEMORY BANK

 

             The user's reflection IS the memory.

             We never ask the user to save it separately.

             -------------------------------------------------- */

 

          const {

            data: existingMemory,

            error: memoryLookupError

          } =

            await supabase

              .from(

                'memory_points'

              )

              .select('*')

              .eq(

                'prayer_reflection_id',

                savedReflection.id

              )

              .eq(

                'user_id',

                state.session.user.id

              )

              .maybeSingle()

 

          if (memoryLookupError) {

            throw memoryLookupError

          }

 

          if (existingMemory) {

            const {

              error

            } =

              await supabase

                .from(

                  'memory_points'

                )

                .update({

                  memory_text:

                    text,

 

                  prayer_request_id:

                    prayer.id,

 

                  updated_at:

                    new Date().toISOString()

                })

                .eq(

                  'id',

                  existingMemory.id

                )

                .eq(

                  'user_id',

                  state.session.user.id

                )

 

            if (error) {

              throw error

            }

          } else {

            const {

              error

            } =

              await supabase

                .from(

                  'memory_points'

                )

                .insert({

                  user_id:

                    state.session.user.id,

 

                  prayer_reflection_id:

                    savedReflection.id,

 

                  prayer_request_id:

                    prayer.id,

 

                  title:

                    'A lesson to remember',

 

                  memory_text:

                    text,

 

                  source_type:

                    'answered_prayer'

                })

 

            if (error) {

              throw error

            }

          }

 

          msg.textContent =

            reflectionId

              ? 'Reflection updated. Your Memory Bank was updated too.'

              : 'Reflection saved to your Memory Bank.'

 

          setTimeout(

            () => {

              state.reflectionPrayer =

                null

 

              state.editingReflection =

                null

 

              state.view =

                'memory-bank'

 

              render()

            },

            900

          )

 

        } catch (error) {

          console.error(

            'Reflection / memory save error:',

            error

          )

 

          msg.textContent =

            `Your reflection could not be saved: ${

              error?.message ||

              'Please try again.'

            }`

        }

      }

    )

}

 

/* =========================================================

   MEMORY BANK BINDING

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

 

  /*

    Important:

    We do NOT re-render on every keystroke.

 

    This preserves the cursor position and fixes

    the issue where the search field previously lost

    focus after every letter.

  */

 

  let searchTimer = null

 

  searchInput?.addEventListener(

    'input',

    event => {

      state.memorySearch =

        event.target.value

 

      clearTimeout(

        searchTimer

      )

 

      searchTimer =

        setTimeout(

          () => {

            render()

          },

          250

        )

    }

  )

 

  sourceSelect?.addEventListener(

    'change',

    event => {

      state.memorySource =

        event.target.value

 

      render()

    }

  )

 

  sortSelect?.addEventListener(

    'change',

    event => {

      state.memorySort =

        event.target.value

 

      render()

    }

  )

 

  document

    .getElementById(

      'clearMemoryFilters'

    )

    ?.addEventListener(

      'click',

      () => {

        state.memorySearch =

          ''

 

        state.memorySource =

          'all'

 

        state.memorySort =

          'newest'

 

        render()

      }

    )

 

  document

    .querySelectorAll(

      '[data-memory-id]'

    )

    .forEach(card => {

      const openMemory =

        () => {

          state.selectedMemory = {

            id:

              card.dataset

                .memoryId

          }

 

          state.view =

            'memory-detail'

 

          render()

        }

 

      card.addEventListener(

        'click',

        openMemory

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

 

            openMemory()

          }

        }

      )

    })

}

 

/* =========================================================

   MEMORY DETAIL BINDING

========================================================= */

 

function bindMemoryDetail() {

  document

    .getElementById(

      'backToMemoryBank'

    )

    ?.addEventListener(

      'click',

      () => {

        state.selectedMemory =

          null

 

        state.view =

          'memory-bank'

 

        render()

      }

    )

 

  document

    .getElementById(

      'editMemory'

    )

    ?.addEventListener(

      'click',

      async () => {

        const {

          data,

          error

        } =

          await supabase

            .from(

              'memory_points'

            )

            .select('*')

            .eq(

              'id',

              state.selectedMemory.id

            )

            .eq(

              'user_id',

              state.session.user.id

            )

            .single()

 

        if (error) {

          window.alert(

            `Unable to edit this memory: ${error.message}`

          )

 

          return

        }

 

        state.editingMemory =

          data

 

        state.view =

          'memory-edit'

 

        render()

      }

    )

 

  document

    .getElementById(

      'deleteMemory'

    )

    ?.addEventListener(

      'click',

      async () => {

        const confirmed =

          window.confirm(

            'Delete this memory? This will remove the saved memory from your Memory Bank, but it will not delete the original prayer or reflection.'

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

              state.selectedMemory.id

            )

            .eq(

              'user_id',

              state.session.user.id

            )

 

        if (error) {

          window.alert(

            `The memory could not be deleted: ${error.message}`

          )

 

          return

        }

 

        state.selectedMemory =

          null

 

        state.view =

          'memory-bank'

 

        render()

      }

    )

 

  document

    .querySelectorAll(

      '[data-edit-reflection]'

    )

    .forEach(button => {

      button.onclick =

        async () => {

          const reflectionId =

            button.dataset

              .editReflection

 

          const {

            data: reflection,

            error

          } =

            await supabase

              .from(

                'prayer_reflections'

              )

              .select('*')

              .eq(

                'id',

                reflectionId

              )

              .eq(

                'user_id',

                state.session.user.id

              )

              .single()

 

          if (error) {

            window.alert(

              `Unable to edit this reflection: ${error.message}`

            )

 

            return

          }

 

          if (

            state.selectedMemory &&

            state.selectedMemory.id

          ) {

            const detail =

              await loadMemoryDetail(

                state.selectedMemory.id

              )

 

            if (

              detail.prayer

            ) {

              state.reflectionPrayer =

                detail.prayer

 

              state.editingReflection =

                reflection

 

              state.view =

                'reflection'

 

              render()

            }

          }

        }

    })

 

  document

    .querySelectorAll(

      '[data-open-reflection]'

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

                button.dataset

                  .openReflection

              )

              .single()

 

          if (error) {

            window.alert(

              `Unable to open the prayer: ${error.message}`

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

}

 

/* =========================================================

   MEMORY EDIT BINDING

========================================================= */

 

function bindMemoryEdit() {

  const cancel =

    () => {

      state.editingMemory =

        null

 

      state.view =

        'memory-detail'

 

      render()

    }

 

  document

    .getElementById(

      'cancelMemoryEdit'

    )

    ?.addEventListener(

      'click',

      cancel

    )

 

  document

    .getElementById(

      'cancelMemoryEditButton'

    )

    ?.addEventListener(

      'click',

      cancel

    )

 

  document

    .getElementById(

      'memoryEditForm'

    )

    ?.addEventListener(

      'submit',

      async event => {

        event.preventDefault()

 

        const title =

          document

            .getElementById(

              'memoryTitle'

            )

            .value

            .trim()

 

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

 

        if (

          !title ||

          !text

        ) {

          msg.textContent =

            'Please enter both a title and memory.'

 

          return

        }

 

        msg.textContent =

          'Saving your changes…'

 

        const {

          error

        } =

          await supabase

            .from(

              'memory_points'

            )

            .update({

              title,

 

              memory_text:

                text,

 

              updated_at:

                new Date().toISOString()

            })

            .eq(

              'id',

              state.editingMemory.id

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

 

        state.selectedMemory = {

          id:

            state.editingMemory.id

        }

 

        state.editingMemory =

          null

 

        state.view =

          'memory-detail'

 

        render()

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

 

      state.selectedMemory =

        null

 

      state.editingMemory =

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
