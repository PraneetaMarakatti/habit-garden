
import { useEffect, useMemo, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import {
  Activity,
  Apple,
  ArrowDown,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Dumbbell,
  Flame,
  Flower2,
  Footprints,
  Heart,
  Plus,
  Sparkles,
  Sprout,
  Target,
  Trophy,
  Waves,
  X,
} from 'lucide-react';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import './App.css';

const STORAGE_KEY = 'habit-garden-v1';

const HABITS = [
  {
    id: 'healthy',
    label: 'Nourish well',
    short: 'Healthy eating',
    icon: Apple,
    color: '#e59b87',
    hint: 'A little care in every bite',
  },
  {
    id: 'steps',
    label: 'Get moving',
    short: 'Steps',
    icon: Footprints,
    color: '#8cae9b',
    hint: 'Every step counts',
  },
  {
    id: 'dsa',
    label: 'Brain garden',
    short: 'DSA practice',
    icon: Code2,
    color: '#9b91c9',
    hint: 'Grow one idea at a time',
  },
  {
    id: 'strength',
    label: 'Get stronger',
    short: 'Strength workout',
    icon: Dumbbell,
    color: '#e5b65f',
    hint: 'Strong looks different every day',
  },
  {
    id: 'cardio',
    label: 'Find your rhythm',
    short: 'Cardio',
    icon: Waves,
    color: '#83a9cf',
    hint: 'Move in a way that feels good',
  },
];

const todayKey = () => dateKey(new Date());

function dateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDate(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function shiftDate(key, amount) {
  const date = parseDate(key);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

function emptyDay() {
  return {
    healthy: false,
    steps: 0,
    stepsGoal: 0,
    dsa: false,
    strength: false,
    cardio: false,
    dsaMinutes: 0,
    cardioMinutes: 0,
    workoutMinutes: 0,
    note: '',
  };
}



function prettyDate(
  key,
  options = { weekday: 'long', month: 'long', day: 'numeric' }
) {
  return parseDate(key).toLocaleDateString('en-US', options);
}

function completion(day) {
  const goal = Number(day.stepsGoal) || 0;

  return [
    Boolean(day.healthy),
    goal > 0 && Number(day.steps) >= goal,
    Boolean(day.dsa),
    Boolean(day.strength),
    Boolean(day.cardio),
  ].filter(Boolean).length;
}

function getDay(store, key) {
  return { ...emptyDay(), ...(store[key] || {}) };
}

function getStreak(store, key) {
  let streak = 0;
  let cursor = key;

  while (completion(getDay(store, cursor)) > 0) {
    streak++;
    cursor = shiftDate(cursor, -1);

    if (streak > 3650) break;
  }

  return streak;
}

function Heatmap({ store, habit, year, onPick }) {
  const start = new Date(year, 0, 1, 12);
  const end = new Date(year, 11, 31, 12);
  const offset = start.getDay();
  const daysInYear = Math.round((end - start) / 86400000) + 1;
  const total = Math.ceil((offset + daysInYear) / 7) * 7;

  const cells = Array.from({ length: total }, (_, i) => {
    const date = new Date(year, 0, 1 + i - offset, 12);
    const key = dateKey(date);
    const inYear = date.getFullYear() === year;
    const day = getDay(store, key);

    let value = 0;

    if (habit.id === 'steps') {
      value = Math.min(4, Math.floor(Number(day.steps || 0) / 2500));
    } else {
      value = day[habit.id] ? 4 : 0;
    }

    return { key, inYear, value, date };
  });

  const colors = [
    '#f5edf5',
    '#e8d8ef',
    '#d2b8e2',
    '#b293d1',
    '#8c6ab3',
  ];

  const monthLabels = [];
  let lastMonth = -1;

  cells.forEach((cell, i) => {
    if (
      cell.inYear &&
      cell.date.getDay() === 0 &&
      cell.date.getMonth() !== lastMonth
    ) {
      monthLabels.push({
        month: cell.date.toLocaleDateString('en-US', { month: 'short' }),
        col: Math.floor(i / 7),
      });
      lastMonth = cell.date.getMonth();
    }
  });

  return (
    <div className="heatmap-wrap">
      <div className="month-labels">
        {monthLabels.map((month, i) => (
          <span
            key={`${month.month}-${i}`}
            style={{ gridColumn: month.col + 1 }}
          >
            {month.month}
          </span>
        ))}
      </div>

      <div
        className="heatmap-grid"
        role="grid"
        aria-label={`${habit.short} calendar heatmap for ${year}`}
      >
        {cells.map(cell => (
          <button
            key={cell.key}
            className={`heat-cell ${cell.inYear ? '' : 'outside'}`}
            style={{ '--cell-color': colors[cell.value] }}
            title={`${prettyDate(cell.key)} · ${
              habit.id === 'steps'
                ? `${Number(getDay(store, cell.key).steps).toLocaleString()} steps`
                : cell.value
                  ? 'Completed'
                  : 'Not completed'
            }`}
            onClick={() => cell.inYear && onPick(cell.key)}
            aria-label={`${cell.key}, ${
              cell.value ? 'activity logged' : 'no activity logged'
            }`}
            disabled={!cell.inYear}
          />
        ))}
      </div>

      <div className="heatmap-legend">
        <span>Less</span>
        {colors.map(color => (
          <i key={color} style={{ background: color }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

function MiniBars({ store, selectedDate }) {
  const days = Array.from({ length: 7 }, (_, i) =>
    shiftDate(selectedDate, i - 6)
  );

  const max = Math.max(
    8000,
    ...days.map(key => Number(getDay(store, key).steps) || 0)
  );

  return (
    <div className="bars">
      {days.map(key => {
        const steps = Number(getDay(store, key).steps) || 0;
        const percent = Math.max(4, Math.round((steps / max) * 100));

        return (
          <button
            className="bar-day"
            key={key}
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent('habit-date-pick', { detail: key })
              )
            }
            title={`${prettyDate(key)}: ${steps.toLocaleString()} steps`}
          >
            <div className="bar-track">
              <div
                className={`bar-fill ${
                  key === selectedDate ? 'selected' : ''
                }`}
                style={{ height: `${percent}%` }}
              />
              <span className="bar-value">
                {steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : steps}
              </span>
            </div>

            <span
              className={`bar-label ${
                key === selectedDate ? 'active' : ''
              }`}
            >
              {parseDate(key)
                .toLocaleDateString('en-US', { weekday: 'short' })
                .slice(0, 1)}
            </span>
          </button>
        );
      })}
    </div>
  );
}


function StepsChart({ store, selectedDate }) {
  const data = Array.from({ length: 30 }, (_, i) => {
    const key = shiftDate(selectedDate, i - 29);
    const day = getDay(store, key);

    return {
      date: key,
      label: parseDate(key).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      steps: Number(day.steps) || 0,
      goal: Number(day.stepsGoal) > 0
        ? Number(day.stepsGoal)
        : null,
    };
  });

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;

    const point = payload[0].payload;

    return (
      <div className="steps-tooltip">
        <strong>{prettyDate(point.date)}</strong>
        <p>Steps: {point.steps.toLocaleString()}</p>
        <p>
          Daily goal:{' '}
          {point.goal == null
            ? 'Not set'
            : point.goal.toLocaleString()}
        </p>
      </div>
    );
  };

  return (
    <section className="panel steps-chart-panel">
      <div className="panel-heading">
        <div className="panel-icon steps-icon">
          <Footprints size={17} />
        </div>
        <div>
          <h3>Your step journey</h3>
          <p>Hover over a point to see the date and exact count.</p>
        </div>
      </div>

      <div className="steps-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 12, right: 18, left: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              interval={4}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              width={48}
              tick={{ fontSize: 11 }}
              tickFormatter={value =>
                value >= 1000
                  ? `${(value / 1000).toFixed(0)}k`
                  : value
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="steps"
              name="Steps"
              stroke="#8cae9b"
              strokeWidth={3}
              dot={{ r: 3, fill: '#8cae9b' }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="goal"
              name="Daily goal"
              stroke="#b293d1"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="steps-chart-legend">
        <span><i className="legend-steps" /> Steps recorded</span>
        <span><i className="legend-goal" /> Daily goal</span>
      </div>
    </section>
  );
}


export default function App() {
  const [store, setStore] = useState({});
  const [storeLoaded, setStoreLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [activeTab, setActiveTab] = useState('Today');
  const [editingNote, setEditingNote] = useState(false);
  const [draftNote, setDraftNote] = useState('');
  const [toast, setToast] = useState('');
  const [heatYear, setHeatYear] = useState(new Date().getFullYear());

  // Load saved habit data from Capacitor Preferences.
  useEffect(() => {
    let cancelled = false;

    async function loadStore() {
      try {
        const { value } = await Preferences.get({ key: STORAGE_KEY });

        if (!cancelled) {
          const parsed = value ? JSON.parse(value) : {};

          setStore(
            parsed && typeof parsed === 'object' && !Array.isArray(parsed)
              ? parsed
              : {}
          );
          setStoreLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load habit data:', error);

        if (!cancelled) {
          setStoreLoaded(true);
        }
      }
    }

    loadStore();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist changes only after the initial load has completed.

  useEffect(() => {
    if (!storeLoaded) return;

    let cancelled = false;

    const timeoutId = window.setTimeout(async () => {
      if (cancelled) return;

      try {
        await Preferences.set({
          key: 'habit-garden-v1',
          value: JSON.stringify(store),
        });
      } catch (error) {
        console.error('Failed to save habit data:', error);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [store, storeLoaded]);


  // All Hooks must be called before any conditional return.
  const day = getDay(store, selectedDate);
  const done = completion(day);
  const progress = Math.round((done / 5) * 100);

  const streak = useMemo(
    () => getStreak(store, selectedDate),
    [store, selectedDate]
  );

  const isToday = selectedDate === todayKey();

  useEffect(() => {
    const listener = event => setSelectedDate(event.detail);

    window.addEventListener('habit-date-pick', listener);

    return () => {
      window.removeEventListener('habit-date-pick', listener);
    };
  }, []);

  // Loading check is now after every Hook.
  if (!storeLoaded) {
    return <div className="app-shell">Loading your garden… 🌱</div>;
  }

  function update(patch) {
    setStore(previous => ({
      ...previous,
      [selectedDate]: {
        ...emptyDay(),
        ...(previous[selectedDate] || {}),
        ...patch,
      },
    }));
  }

  function toggle(id) {
    const next = !day[id];
    update({ [id]: next });

    if (next) {
      setToast('A little win for your garden ✨');
      window.setTimeout(() => setToast(''), 2200);
    }
  }

  const weeklyAverage = Math.round(
    Array.from({ length: 7 }, (_, i) =>
      Number(getDay(store, shiftDate(selectedDate, -i)).steps) || 0
    ).reduce((a, b) => a + b, 0) / 7
  );

  const tabs = [
    { label: 'Today', icon: Sprout },
    { label: 'Garden', icon: CalendarDays },
    { label: 'Insights', icon: Activity },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Flower2 size={23} />
          </div>
          <div>
            <strong>habit garden</strong>
            <span>little steps, lovely growth</span>
          </div>
        </div>

        <div className="side-caption">YOUR SPACE</div>

        <nav className="side-nav">
          {tabs.map(tab => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.label}
                onClick={() => setActiveTab(tab.label)}
                className={
                  activeTab === tab.label ? 'nav-item active' : 'nav-item'
                }
              >
                <Icon size={18} />
                <span>{tab.label}</span>
                {activeTab === tab.label && <span className="nav-dot" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-flower">
          <div className="flower-art">
            <span>✿</span>
            <i>✧</i>
            <b>✿</b>
          </div>
          <p>
            Progress is a garden.
            <br />
            Give it time to grow.
          </p>
          <span className="tiny-leaf">made for your becoming ♡</span>
        </div>

        <div className="sidebar-foot">
          <span className="status-dot" /> Your data stays on this device
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand">
            <Flower2 size={21} /> habit garden
          </div>

          <div className="breadcrumb">
            Your little corner <span>/</span> <b>{activeTab}</b>
          </div>

          <div className="top-actions">
            <span className="today-chip">
              <span className="live-dot" />
              {isToday ? 'Today' : prettyDate(selectedDate, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <div className="avatar">♡</div>
          </div>
        </header>

        <div className="page-content">
          {activeTab === 'Today' && (
            <>
              <section className="welcome-row">
                <div>
                  <div className="eyebrow">
                    <Sparkles size={14} /> A FRESH LITTLE START
                  </div>
                  <h1>
                    Hello, lovely <span>🌷</span>
                  </h1>
                  <p className="subhead">
                    Every tiny promise you keep helps you bloom.
                  </p>

                  <div className="date-switch">
                    <button
                      onClick={() =>
                        setSelectedDate(shiftDate(selectedDate, -1))
                      }
                      aria-label="Previous day"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span>{prettyDate(selectedDate)}</span>
                    <button
                      onClick={() =>
                        setSelectedDate(shiftDate(selectedDate, 1))
                      }
                      aria-label="Next day"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      className="today-link"
                      onClick={() => setSelectedDate(todayKey())}
                    >
                      Jump to today
                    </button>
                  </div>
                </div>

                <div className="hero-illustration">
                  <div className="sun-glow" />
                  <div className="hero-flower flower-one">✿</div>
                  <div className="hero-flower flower-two">✿</div>
                  <div className="hero-flower flower-three">✿</div>
                  <div className="hero-leaf leaf-one" />
                  <div className="hero-leaf leaf-two" />
                  <div className="hero-pot">
                    <span>hg</span>
                  </div>
                  <span className="sparkle s-one">✧</span>
                  <span className="sparkle s-two">✦</span>
                </div>
              </section>

              <section className="summary-grid">
                <div className="summary-card progress-card">
                  <div className="summary-label">
                    TODAY'S BLOOM <span className="tiny-pill">{done}/5 habits</span>
                  </div>
                  <div className="progress-content">
                    <div
                      className="progress-ring"
                      style={{ '--progress': `${progress * 3.6}deg` }}
                    >
                      <div>
                        <strong>{progress}%</strong>
                        <span>in bloom</span>
                      </div>
                    </div>
                    <div className="progress-copy">
                      <h3>
                        {done === 5
                          ? 'You did it, flower!'
                          : done >= 3
                            ? 'Look at you growing!'
                            : done > 0
                              ? 'A lovely start'
                              : 'Every day is a new seed'}
                      </h3>
                      <p>
                        {done === 5
                          ? 'You showed up for yourself in five beautiful ways.'
                          : `${5 - done} little ${
                              5 - done === 1 ? 'thing' : 'things'
                            } left to nurture today. No rush, just grow.`}
                      </p>
                      <div className="mini-progress">
                        <span style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="summary-card streak-card">
                  <div className="streak-icon">
                    <Flame size={21} />
                  </div>
                  <div className="summary-label">YOUR GROWING STREAK</div>
                  <div className="streak-number">
                    {streak}<span> days</span>
                  </div>
                  <p>
                    {streak > 0
                      ? 'Your consistency is taking root.'
                      : 'Your next streak starts with one small win.'}
                  </p>
                  <div className="streak-decoration">✧ ✿ ✧</div>
                </div>
              </section>

              <section className="section-heading">
                <div>
                  <div className="eyebrow">
                    <Sprout size={14} /> YOUR DAILY RITUAL
                  </div>
                  <h2>
                    Little things that add up <span>♡</span>
                  </h2>
                  <p>
                    Check in with yourself. There is no perfect way to grow.
                  </p>
                </div>
                <span className="date-badge">
                  <CalendarDays size={14} />
                  {prettyDate(selectedDate, { month: 'short', day: 'numeric' })}
                </span>
              </section>

              <section className="habit-list">
                {HABITS.map(habit => {
                  const Icon = habit.icon;
                  const checked =
                    habit.id === 'steps'
                      ? Number(day.stepsGoal) > 0 &&
                        Number(day.steps) >= Number(day.stepsGoal)
                      : Boolean(day[habit.id]);

                  return (
                    <article
                      key={habit.id}
                      className={`habit-row ${checked ? 'is-done' : ''}`}
                    >
                      <div
                        className="habit-icon"
                        style={{ '--habit-color': habit.color }}
                      >
                        <Icon size={21} />
                      </div>

                      <div className="habit-info">
                        <div className="habit-title-line">
                          <h3>{habit.label}</h3>
                          {checked && (
                            <span className="done-label">
                              <Check size={11} /> done
                            </span>
                          )}
                        </div>
                        <p>
                          {habit.id === 'steps'
                            ? `${Number(day.steps).toLocaleString()} of ${
                               Number(day.stepsGoal) > 0
                                ? Number(day.stepsGoal).toLocaleString()
                                : 'no goal set'
                              } steps · ${habit.hint}`
                            : habit.id === 'dsa'
                              ? `${day.dsaMinutes || 0} min of practice · ${habit.hint}`
                              : habit.id === 'cardio'
                                ? `${day.cardioMinutes || 0} min · ${habit.hint}`
                                : habit.id === 'strength'
                                  ? `${day.workoutMinutes || 0} min · ${habit.hint}`
                                  : habit.hint}
                        </p>
                      </div>

                      {habit.id === 'steps' ? (
                        <div className="step-editor">
                          <button
                            onClick={() =>
                              update({
                                steps: Math.max(0, Number(day.steps) - 500),
                              })
                            }
                            aria-label="Subtract 500 steps"
                          >
                            <ArrowDown size={13} />
                          </button>
                          <input
                            aria-label="Steps for the day"
                            type="number"
                            min="0"
                            max="100000"
                            step="100"
                            value={day.steps}
                            onChange={event =>
                              update({
                                steps: Math.max(
                                  0,
                                  Math.min(100000, Number(event.target.value) || 0)
                                ),
                              })
                            }
                          />
                          <button
                            onClick={() =>
                              update({
                                steps: Math.min(100000, Number(day.steps) + 500),
                              })
                            }
                            aria-label="Add 500 steps"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                                            ) : (
                        <div className="habit-actions">
                          {['dsa', 'strength', 'cardio'].includes(habit.id) && (
                            <label className="minutes-editor">
                              <input
                                aria-label={`${habit.short} minutes`}
                                type="number"
                                min="0"
                                max="1440"
                                step="5"
                                value={
                                  habit.id === 'dsa'
                                    ? day.dsaMinutes
                                    : habit.id === 'strength'
                                      ? day.workoutMinutes
                                      : day.cardioMinutes
                                }
                                onChange={event =>
                                  update({
                                    [habit.id === 'dsa'
                                      ? 'dsaMinutes'
                                      : habit.id === 'strength'
                                        ? 'workoutMinutes'
                                        : 'cardioMinutes']: Math.max(
                                      0,
                                      Math.min(
                                        1440,
                                        Number(event.target.value) || 0
                                      )
                                    ),
                                  })
                                }
                              />
                              <span>min</span>
                            </label>
                          )}
                          <button
                            className={`check-button ${
                              checked ? 'checked' : ''
                            }`}
                            onClick={() => toggle(habit.id)}
                            aria-label={`${checked ? 'Uncheck' : 'Complete'} ${habit.short}`}
                          >
                            {checked ? <Check size={18} /> : <span />}
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>

              <section className="bottom-grid">
                <div className="panel note-panel">
                  <div className="panel-heading">
                    <div className="panel-icon note-icon">
                      <Heart size={17} />
                    </div>
                    <div>
                      <h3>A note to yourself</h3>
                      <p>Leave a little thought for today.</p>
                    </div>
                    <button
                      className="icon-button"
                      onClick={() => {
                        setDraftNote(day.note || '');
                        setEditingNote(true);
                      }}
                      aria-label="Edit note"
                    >
                      ✎
                    </button>
                  </div>

                  {day.note ? (
                    <p className="saved-note">“{day.note}”</p>
                  ) : (
                    <button
                      className="note-placeholder"
                      onClick={() => {
                        setDraftNote('');
                        setEditingNote(true);
                      }}
                    >
                      <Plus size={15} /> Write something kind to yourself...
                    </button>
                  )}
                </div>

                <div className="panel movement-panel">
                  <div className="panel-heading">
                    <div className="panel-icon steps-icon">
                      <Footprints size={17} />
                    </div>
                    <div>
                      <h3>Your steps, lately</h3>
                      <p>Little walks, big feelings.</p>
                    </div>
                    <span className="trend-chip">
                      <ArrowUpRight size={13} /> 7 days
                    </span>
                  </div>

                  <div className="weekly-total">
                    <strong>{weeklyAverage.toLocaleString()}</strong>
                    <span>
                      daily average <i>steps</i>
                    </span>
                  </div>

                  <MiniBars store={store} selectedDate={selectedDate} />
                </div>
              </section>
            </>
          )}

          {activeTab === 'Garden' && (
            <>
              <section className="page-intro">
                <div className="eyebrow">
                  <Flower2 size={14} /> YOUR YEAR IN BLOOM
                </div>
                <h1>
                  Your garden <span>✿</span>
                </h1>
                <p>
                  Every little square is a day you showed up for yourself.
                </p>
                <div className="year-switch">
                  <button onClick={() => setHeatYear(year => year - 1)}>
                    <ChevronLeft size={16} />
                  </button>
                  <strong>{heatYear}</strong>
                  <button
                    onClick={() => setHeatYear(year => year + 1)}
                    disabled={heatYear >= new Date().getFullYear()}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </section>

              <div className="heatmap-stack">
                {HABITS.map(habit => {
                  if (habit.id === 'steps') {
                    return (
                      <StepsChart 
                      key={habit.id}
                      store={store}
                      selectedDate={selectedDate}
                      />
                    );
                  }

                  const Icon = habit.icon;


                  return (
                    <section className="panel heat-panel" key={habit.id}>
                      <div className="heat-heading">
                        <div
                          className="habit-icon"
                          style={{ '--habit-color': habit.color }}
                        >
                          <Icon size={19} />
                        </div>
                        <div>
                          <h3>{habit.short}</h3>
                          <p>Your days of showing up, at a glance.</p>
                        </div>
                        <span className="year-count">
                          {Object.keys(store).filter(
                            key =>
                              key.startsWith(`${heatYear}-`) &&
                              Boolean(store[key]?.[habit.id])
                          ).length}{' '}
                          days
                        </span>
                      </div>

                      <Heatmap
                        store={store}
                        habit={habit}
                        year={heatYear}
                        onPick={key => {
                          setSelectedDate(key);
                          setActiveTab('Today');
                        }}
                      />
                    </section>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'Insights' && (
            <>
              <section className="page-intro">
                <div className="eyebrow">
                  <Sparkles size={14} /> YOUR GROWTH STORY
                </div>
                <h1>
                  Look how far <span>♡</span>
                </h1>
                <p>
                  Gentle reminders that your small steps are becoming something.
                </p>
              </section>

              <section className="insight-stats">
                <div className="insight-card">
                  <span className="insight-icon pink">
                    <Target size={19} />
                  </span>
                  <p>Habits checked</p>
                  <strong>
                    {Object.keys(store).reduce(
                      (sum, key) => sum + completion(getDay(store, key)),
                      0
                    )}
                  </strong>
                  <span>little wins logged</span>
                </div>

                <div className="insight-card">
                  <span className="insight-icon green">
                    <Footprints size={19} />
                  </span>
                  <p>Total steps</p>
                  <strong>
                    {Object.keys(store)
                      .reduce(
                        (sum, key) => sum + (Number(store[key]?.steps) || 0),
                        0
                      )
                      .toLocaleString()}
                  </strong>
                  <span>steps on your journey</span>
                </div>

                <div className="insight-card">
                  <span className="insight-icon lavender">
                    <Code2 size={19} />
                  </span>
                  <p>DSA practice</p>
                  <strong>
                    {Object.keys(store).reduce(
                      (sum, key) =>
                        sum + (Number(store[key]?.dsaMinutes) || 0),
                      0
                    )}
                  </strong>
                  <span>minutes of brain growth</span>
                </div>

                <div className="insight-card">
                  <span className="insight-icon yellow">
                    <Dumbbell size={19} />
                  </span>
                  <p>Workout minutes</p>
                  <strong>
                    {Object.keys(store).reduce(
                      (sum, key) =>
                        sum +
                        (Number(store[key]?.workoutMinutes) || 0) +
                        (Number(store[key]?.cardioMinutes) || 0),
                      0
                    )}
                  </strong>
                  <span>minutes of movement</span>
                </div>
              </section>

              <section className="panel insight-panel">
                <div className="panel-heading">
                  <div className="panel-icon note-icon">
                    <Trophy size={17} />
                  </div>
                  <div>
                    <h3>Your gentle goals</h3>
                    <p>Progress, not perfection.</p>
                  </div>
                </div>

                <div className="goal-row">
                  <div className="goal-emoji">🌱</div>
                  <div className="goal-info">
                    <strong>Daily step goals</strong>
                    <span>Days you reached your steps</span>
                  </div>
                  <b>
                    {
                        Object.keys(store).filter(key => {
                          const day = getDay(store, key);
                          const goal = Number(day.stepsGoal) || 0;
                          return goal > 0 && Number(day.steps) >= goal;
                        }).length
                    }
                  </b>
                </div>

                <div className="goal-row">
                  <div className="goal-emoji">🧠</div>
                  <div className="goal-info">
                    <strong>Keep learning</strong>
                    <span>Days you practised DSA</span>
                  </div>
                  <b>
                    {Object.keys(store).filter(key => store[key]?.dsa).length}
                  </b>
                </div>

                <div className="goal-row">
                  <div className="goal-emoji">🌸</div>
                  <div className="goal-info">
                    <strong>Care for your body</strong>
                    <span>Days you worked out or did cardio</span>
                  </div>
                  <b>
                    {
                      Object.keys(store).filter(
                        key => store[key]?.strength || store[key]?.cardio
                      ).length
                    }
                  </b>
                </div>
              </section>

              <p className="privacy-note">
                <Heart size={14} /> Your numbers are yours. Everything is saved
                locally on this device.
              </p>
            </>
          )}

          <footer className="page-footer">
            <span>✿</span> growing at your own pace is still growing{' '}
            <span>✿</span>
          </footer>
        </div>
      </main>

      {editingNote && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setEditingNote(false)}
        >
          <div
            className="note-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-title"
            onClick={event => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setEditingNote(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="modal-flower">✿</div>
            <h2 id="note-title">A note to your future self</h2>
            <p>{prettyDate(selectedDate)}</p>

            <textarea
              autoFocus
              maxLength={400}
              value={draftNote}
              onChange={event => setDraftNote(event.target.value)}
              placeholder="What went well today? What are you proud of?"
            />

            <div className="modal-actions">
              <span>{draftNote.length}/400</span>
              <button
                onClick={() => {
                  update({ note: draftNote.trim() });
                  setEditingNote(false);
                }}
              >
                Save this thought <Heart size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast">
          <Sparkles size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
