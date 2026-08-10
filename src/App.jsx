import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Edit3, 
  TrendingUp, 
  Target, 
  Flame, 
  Calendar, 
  Code2, 
  X, 
  Search, 
  Sparkles, 
  Award, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  ListTodo, 
  AlertCircle, 
  CalendarDays, 
  BarChart2, 
  ArrowUp, 
  ArrowDown, 
  Filter, 
  Layers,
  Timer,
  LogOut,
  Briefcase,
  Settings2,
  CalendarRange,
  BriefcaseBusiness,
  MessageCircle,
  Clock3,
  XCircle,
  Video,
  PartyPopper,
} from 'lucide-react';
import { classifyItem, isCellDone, sortQueueItems } from './itemClassify.js';
import { TimerPage } from './features/TimerPage.jsx';
import { TimeControl } from './features/TimeControl.jsx';
import { FocusMode } from './features/FocusMode.jsx';
import { useDayTimers } from './features/useDayTimers.js';
import { ApplicationsPage } from './features/applications/ApplicationsPage.jsx';
import { CalendarPage } from './features/applications/CalendarPage.jsx';
import {
  NeedsReplyBadge,
  NeedsReplyNotice,
} from './features/applications/NeedsReply.jsx';
import { useGmailHourlySync } from './features/applications/useGmailHourlySync.js';
import { WorkspaceStatusTags } from './features/applications/WorkspaceStatusTags.jsx';
import {
  clearFocusCountdownSession,
  readFocusOnStart,
} from './features/focus-prefs.js';
import { localISODate } from './utils/date.js';
import { useAuth } from './auth/AuthContext.jsx';
import { isModuleEnabled, getWorkspace } from './lib/modules.js';
import { getVisibleTabs } from './lib/dashboardTabs.js';
import { countOpenNeedsReply, getJobDashboardStats } from './lib/gmail.js';

const MONTHS = [
  { name: 'January', days: 31 },
  { name: 'February', days: 28 },
  { name: 'March', days: 31 },
  { name: 'April', days: 30 },
  { name: 'May', days: 31 },
  { name: 'June', days: 30 },
  { name: 'July', days: 31 },
  { name: 'August', days: 31 },
  { name: 'September', days: 30 },
  { name: 'October', days: 31 },
  { name: 'November', days: 30 },
  { name: 'December', days: 31 }
];

function App({
  data = [],
  updateItem,
  deleteItem,
  insertItem,
  moveItem,
  taskMetaMap = {},
  setTaskMetaMap,
  timerEntries = {},
  onTimerEntriesChange,
}) {
  const { user, signOut } = useAuth();
  const now = new Date();
  const liveMonthIndex = now.getMonth();
  const liveYear = now.getFullYear();
  const todayDay = now.getDate();
  const timers = useDayTimers(localISODate(), {
    entries: timerEntries,
    onEntriesChange: onTimerEntriesChange,
  });
  const [focusItemId, setFocusItemId] = useState(null);
  const [signingOut, setSigningOut] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('todo'); // 'todo' | 'completed' | 'grid' | 'analytics' | 'timer' | 'applications' | 'modules' | 'calendar'
  const [todoPriorityFilter, setTodoPriorityFilter] = useState('all'); // 'all' | 'High' | 'Medium' | 'Normal'
  const [todoTypeFilter, setTodoTypeFilter] = useState('all'); // Both: tasks + habits
  
  // Month & Year Selector — always start on today's month
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(liveMonthIndex);
  const [selectedYear, setSelectedYear] = useState(liveYear);
  const [monthlyLogs, setMonthlyLogs] = useState({});

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState('todo');
  const [newTaskPriority, setNewTaskPriority] = useState('Normal');
  const [quickInput, setQuickInput] = useState('');

  const [editingIndex, setEditingIndex] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [selectedDayModal, setSelectedDayModal] = useState(null);
  const [needsReplyCount, setNeedsReplyCount] = useState(0);
  const [needsReplyOpen, setNeedsReplyOpen] = useState(false);
  const [jobStats, setJobStats] = useState({
    appliedToday: 0,
    noUpdate: 0,
    conversations: 0,
    interviewing: 0,
    rejected: 0,
    offer: 0,
    inPipeline: 0,
  });
  const [jobStatsTick, setJobStatsTick] = useState(0);

  const applicationsEnabled = isModuleEnabled(taskMetaMap, 'applications');
  const workspace = getWorkspace(taskMetaMap);
  const staleDays = workspace.applicationsStaleDays;
  const visibleTabs = useMemo(
    () => getVisibleTabs(workspace),
    // stringify so nested tab prefs trigger updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      applicationsEnabled,
      JSON.stringify(workspace.tabs),
      workspace.modules.applications,
    ],
  );

  const tabIcons = {
    todo: ListTodo,
    completed: CheckCircle2,
    grid: CalendarDays,
    timer: Timer,
    analytics: BarChart2,
    applications: Briefcase,
    calendar: CalendarRange,
  };

  const refreshNeedsReplyCount = useCallback(() => {
    if (!user?.id || !applicationsEnabled) {
      setNeedsReplyCount(0);
      return;
    }
    void countOpenNeedsReply(user.id)
      .then(setNeedsReplyCount)
      .catch(() => setNeedsReplyCount(0));
  }, [user?.id, applicationsEnabled]);

  const refreshJobDashboard = useCallback(() => {
    refreshNeedsReplyCount();
    setJobStatsTick((n) => n + 1);
  }, [refreshNeedsReplyCount]);

  useGmailHourlySync({
    userId: user?.id,
    enabled: applicationsEnabled,
    onSynced: refreshJobDashboard,
  });

  useEffect(() => {
    if (activeTab === 'modules') return;
    const ok = visibleTabs.some((t) => t.id === activeTab);
    if (!ok && visibleTabs[0]) setActiveTab(visibleTabs[0].id);
  }, [visibleTabs, activeTab]);

  useEffect(() => {
    refreshNeedsReplyCount();
  }, [refreshNeedsReplyCount, activeTab]);

  useEffect(() => {
    if (!user?.id || !applicationsEnabled) {
      setJobStats({
        appliedToday: 0,
        noUpdate: 0,
        conversations: 0,
        interviewing: 0,
        rejected: 0,
        offer: 0,
        inPipeline: 0,
      });
      return;
    }
    let cancelled = false;
    void getJobDashboardStats(user.id, staleDays)
      .then((s) => {
        if (!cancelled) setJobStats(s);
      })
      .catch(() => {
        if (!cancelled) {
          setJobStats({
            appliedToday: 0,
            noUpdate: 0,
            conversations: 0,
            interviewing: 0,
            rejected: 0,
            offer: 0,
            inPipeline: 0,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, applicationsEnabled, staleDays, activeTab, needsReplyCount, jobStatsTick]);

  const currentMonth = MONTHS[selectedMonthIndex];
  const activeMonthKey = `${selectedYear}-${selectedMonthIndex}`;
  const isBaseMonth = selectedMonthIndex === liveMonthIndex && selectedYear === liveYear;

  const daysInSelectedMonth = useMemo(() => {
    if (currentMonth.name === 'February') {
      const isLeap = (selectedYear % 4 === 0 && selectedYear % 100 !== 0) || (selectedYear % 400 === 0);
      return isLeap ? 29 : 28;
    }
    return currentMonth.days;
  }, [currentMonth, selectedYear]);

  // To-do queue always uses today's calendar day
  const selectedTargetDay = Math.min(todayDay, daysInSelectedMonth);

  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      setSelectedMonthIndex(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonthIndex(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex === 11) {
      setSelectedMonthIndex(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonthIndex(prev => prev + 1);
    }
  };

  const goToToday = () => {
    const d = new Date();
    setSelectedMonthIndex(d.getMonth());
    setSelectedYear(d.getFullYear());
  };

  // To-do / completed views stay on the real calendar today
  useEffect(() => {
    if (activeTab === 'todo' || activeTab === 'completed') {
      goToToday();
    }
  }, [activeTab]);

  // Restore focus overlay if a timer is already running and preference allows
  useEffect(() => {
    if (focusItemId) return;
    if (!readFocusOnStart()) return;
    const runningKey = Object.keys(timers.entries).find(
      (k) => timers.entries[k]?.timerStartedAt,
    );
    if (runningKey) setFocusItemId(runningKey);
    // intentionally once on mount / when entries first load a runner
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timers.entries]);

  const handleToggleTimer = (key) => {
    const id = String(key);
    const wasRunning = timers.isRunning(id);
    timers.toggleTimer(id);
    if (wasRunning) {
      if (focusItemId === id) {
        clearFocusCountdownSession();
        setFocusItemId(null);
      }
      return;
    }
    if (readFocusOnStart()) {
      setFocusItemId(id);
    }
  };

  // Monthly data scope
  const currentMonthData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    if (isBaseMonth) {
      return data;
    }

    const monthLog = monthlyLogs[activeMonthKey] || {};

    return data.map(item => {
      if (!item.row) return item;
      const title = String(item.row[0] || '').trim();
      const lower = title.toLowerCase();
      if (lower.includes('task') || lower.includes('date')) return item;

      if (monthLog[item.index_] !== undefined) {
        return { ...item, row: monthLog[item.index_] };
      }

      const cleanRow = new Array(34).fill(null);
      cleanRow[0] = item.row[0];
      if (lower === 'daily total') {
        for (let i = 1; i <= 31; i++) cleanRow[i] = 0;
      } else if (lower.includes('leetcode count')) {
        for (let i = 1; i <= 31; i++) cleanRow[i] = null;
      } else {
        for (let i = 1; i <= 31; i++) cleanRow[i] = false;
      }
      cleanRow[32] = 0;
      return { index_: item.index_, row: cleanRow };
    });
  }, [data, selectedMonthIndex, selectedYear, monthlyLogs, activeMonthKey, isBaseMonth]);

  // Task metadata helper
  const getTaskMeta = (item) => {
    const idx = item.index_;
    const title = String(item.row?.[0] || '').trim();

    const stored = taskMetaMap[idx] || taskMetaMap[title] || {};

    const itemType = stored.itemType || 'todo';
    const priority = stored.priority || 'Normal';
    const createdDay = stored.createdDay ?? 1;

    return { itemType, priority, createdDay };
  };

  const setTaskPriority = (itemIndex, priority) => {
    setTaskMetaMap?.(prev => ({
      ...prev,
      [itemIndex]: { ...(prev[itemIndex] || {}), priority }
    }));
  };

  const setTaskType = (itemIndex, itemType) => {
    setTaskMetaMap?.(prev => ({
      ...prev,
      [itemIndex]: {
        ...(prev[itemIndex] || {}),
        itemType,
        ...(itemType === 'todo' && prev[itemIndex]?.createdDay == null
          ? { createdDay: selectedTargetDay }
          : {}),
      },
    }));
  };

  // Structured dataset parsing
  const parsed = useMemo(() => {
    const sourceData = currentMonthData;
    if (!sourceData || !Array.isArray(sourceData) || sourceData.length === 0) {
      return { headerObj: null, taskRows: [], dailyTotalRow: null, leetcodeRow: null, days: [] };
    }

    const headerObj = sourceData.find(item => {
      const firstCell = String(item.row?.[0] || '').toLowerCase();
      return firstCell.includes('task') || firstCell.includes('date');
    }) || sourceData[0];

    const taskRows = [];
    let dailyTotalRow = null;
    let leetcodeRow = null;

    sourceData.forEach(item => {
      if (item.index_ === headerObj.index_) return;
      const title = String(item.row?.[0] || '').trim();
      if (!title) return;

      const lower = title.toLowerCase();
      if (lower === 'daily total') {
        dailyTotalRow = item;
      } else if (lower.includes('leetcode count')) {
        leetcodeRow = item;
      } else {
        taskRows.push(item);
      }
    });

    const days = [];
    for (let i = 1; i <= daysInSelectedMonth; i++) {
      days.push({ dayNum: i, label: `${currentMonth.name.slice(0, 3)} ${i}` });
    }

    return { headerObj, taskRows, dailyTotalRow, leetcodeRow, days };
  }, [currentMonthData, daysInSelectedMonth, currentMonth]);

  // Computed statistics (habit consistency is habit-only; tasks don't pad the rate)
  const stats = useMemo(() => {
    let totalCompleted = 0;
    let totalLeetcode = 0;
    let maxDailyDone = 0;
    const dailyBreakdown = [];
    const habits = parsed.taskRows.filter(item => {
      const title = String(item.row?.[0] || '').trim();
      const stored = taskMetaMap[item.index_] || taskMetaMap[title] || {};
      return (stored.itemType || 'todo') === 'habit';
    });

    for (let day = 1; day <= daysInSelectedMonth; day++) {
      let dayDoneCount = 0;
      const completedList = [];

      habits.forEach(item => {
        if (isCellDone(item.row, day)) {
          dayDoneCount++;
          completedList.push(String(item.row?.[0] || ''));
        }
      });

      const lcVal = parsed.leetcodeRow?.row?.[day];
      const lcNum = typeof lcVal === 'number' ? lcVal : (parseFloat(lcVal) || 0);

      totalCompleted += dayDoneCount;
      totalLeetcode += lcNum;
      if (dayDoneCount > maxDailyDone) maxDailyDone = dayDoneCount;

      dailyBreakdown.push({
        day,
        label: `${currentMonth.name.slice(0, 3)} ${day}`,
        doneCount: dayDoneCount,
        leetcodeCount: lcNum,
        completedList
      });
    }

    const habitCount = habits.length;
    const possibleCheckins = habitCount * daysInSelectedMonth;
    const consistencyRate = possibleCheckins > 0 ? Math.round((totalCompleted / possibleCheckins) * 100) : 0;
    const avgDaily = daysInSelectedMonth > 0 ? (totalCompleted / daysInSelectedMonth).toFixed(1) : '0.0';

    let streak = 0;
    for (let i = dailyBreakdown.length - 1; i >= 0; i--) {
      if (dailyBreakdown[i].doneCount > 0) {
        streak++;
      } else if (streak > 0) {
        break;
      }
    }

    const openTaskCount = parsed.taskRows.filter(item => {
      const title = String(item.row?.[0] || '').trim();
      const stored = taskMetaMap[item.index_] || taskMetaMap[title] || {};
      const itemType = stored.itemType || 'todo';
      if (itemType !== 'todo') return false;
      const createdDay = stored.createdDay ?? 1;
      const classified = classifyItem({
        row: item.row,
        itemType: 'todo',
        createdDay,
        refDay: selectedTargetDay,
      });
      return !classified.isClosed;
    }).length;

    const habitsDoneToday = habits.filter((item) =>
      isCellDone(item.row, selectedTargetDay),
    ).length;

    return {
      totalCompleted,
      totalLeetcode,
      consistencyRate,
      avgDaily,
      streak,
      taskCount: openTaskCount,
      habitCount,
      habitsDoneToday,
      dailyBreakdown,
      maxDailyDone,
    };
  }, [parsed, daysInSelectedMonth, currentMonth, taskMetaMap, selectedTargetDay]);

  // Task queue — todos carry misses; habits are daily-only (no carry)
  const queueTasks = useMemo(() => {
    const list = [];
    const refDay = selectedTargetDay;

    parsed.taskRows.forEach(item => {
      const title = String(item.row?.[0] || 'Untitled').trim();
      const meta = getTaskMeta(item);
      const classified = classifyItem({
        row: item.row,
        itemType: meta.itemType,
        createdDay: meta.createdDay,
        refDay,
      });

      if (!classified.includeInQueue) return;
      if (todoPriorityFilter !== 'all' && meta.priority.toLowerCase() !== todoPriorityFilter.toLowerCase()) return;
      if (todoTypeFilter !== 'all' && classified.itemType !== todoTypeFilter) return;
      if (searchQuery && !title.toLowerCase().includes(searchQuery.toLowerCase())) return;

      list.push({
        item,
        title,
        priority: meta.priority,
        itemType: classified.itemType,
        isDoneToday: classified.isDoneToday || classified.isClosed,
        isRolledOver: classified.isRolledOver,
        missedDay: classified.missedDay,
        statusLabel: classified.statusLabel,
        isClosed: classified.isClosed,
        refDay,
      });
    });

    list.sort(sortQueueItems);
    return list;
  }, [parsed.taskRows, selectedTargetDay, todoPriorityFilter, todoTypeFilter, searchQuery, taskMetaMap]);

  // Completed tasks only (past + today) — derived from sheet cells, no extra DB table
  const completedTasks = useMemo(() => {
    const list = [];
    const refDay = selectedTargetDay;

    parsed.taskRows.forEach((item) => {
      const title = String(item.row?.[0] || 'Untitled').trim();
      const meta = getTaskMeta(item);
      if (meta.itemType !== 'todo') return;

      const classified = classifyItem({
        row: item.row,
        itemType: 'todo',
        createdDay: meta.createdDay,
        refDay,
      });

      if (!classified.isClosed || !classified.completedOn) return;
      if (searchQuery && !title.toLowerCase().includes(searchQuery.toLowerCase())) return;
      if (todoPriorityFilter !== 'all' && meta.priority.toLowerCase() !== todoPriorityFilter.toLowerCase()) return;

      list.push({
        item,
        title,
        priority: meta.priority,
        completedOn: classified.completedOn,
        isDoneToday: classified.completedOn === refDay,
      });
    });

    list.sort((a, b) => b.completedOn - a.completedOn);
    return list;
  }, [parsed.taskRows, selectedTargetDay, searchQuery, todoPriorityFilter, taskMetaMap]);

  const focusItem = focusItemId
    ? parsed.taskRows.find((item) => String(item.index_) === String(focusItemId))
    : null;
  const focusMeta = focusItem ? getTaskMeta(focusItem) : null;

  // Habit matrix — habits only (daily check-ins, no task rows)
  const filteredGridTasks = useMemo(() => {
    const habits = parsed.taskRows.filter(item => getTaskMeta(item).itemType === 'habit');
    if (!searchQuery.trim()) return habits;
    return habits.filter(item =>
      String(item.row?.[0] || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [parsed.taskRows, searchQuery, taskMetaMap]);

  // Cell checkmark toggle handler syncing back to sheet
  const handleToggleCell = (rowIndex, dayNum) => {
    const target = currentMonthData.find(d => d.index_ === rowIndex);
    if (!target) return;

    const newRow = [...target.row];
    const currentVal = newRow[dayNum];
    const isChecked = !(currentVal === true || currentVal === 'true' || currentVal === 'TRUE' || currentVal === 1);
    newRow[dayNum] = isChecked;

    let sum = 0;
    for (let i = 1; i <= daysInSelectedMonth; i++) {
      if (newRow[i] === true || newRow[i] === 'true' || newRow[i] === 'TRUE' || newRow[i] === 1) {
        sum++;
      }
    }
    if (newRow.length > 32) {
      newRow[32] = sum;
    }

    if (isBaseMonth) {
      updateItem(rowIndex, newRow);
    } else {
      setMonthlyLogs(prev => ({
        ...prev,
        [activeMonthKey]: {
          ...(prev[activeMonthKey] || {}),
          [rowIndex]: newRow
        }
      }));
    }
  };

  // Add task handler
  const handleAddTasks = (rawInput, defaultType = 'todo', defaultPriority = 'Normal') => {
    if (!rawInput || !rawInput.trim()) return;
    const items = rawInput.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
    items.forEach(name => {
      const newRow = new Array(34).fill(null);
      newRow[0] = name;
      for (let i = 1; i <= 31; i++) {
        newRow[i] = false;
      }
      newRow[32] = 0;
      
      insertItem(undefined, newRow);
      setTaskMetaMap?.((prev) => ({
        ...prev,
        [name]: {
          itemType: defaultType,
          priority: defaultPriority,
          createdDay: selectedTargetDay,
        }
      }));
    });
  };

  const handleStartEdit = (item) => {
    setEditingIndex(item.index_);
    setEditingTitle(String(item.row?.[0] || ''));
  };

  const handleSaveEdit = (rowIndex) => {
    if (!editingTitle.trim()) return;
    const target = data.find(d => d.index_ === rowIndex);
    if (!target) return;

    const newRow = [...target.row];
    newRow[0] = editingTitle.trim();
    updateItem(rowIndex, newRow);
    setEditingIndex(null);
  };

  const handleLeetcodeChange = (dayNum, val) => {
    if (!parsed.leetcodeRow) return;
    const target = parsed.leetcodeRow;
    const newRow = [...target.row];
    const num = val === '' ? null : (parseFloat(val) || 0);
    newRow[dayNum] = num;

    let sum = 0;
    for (let i = 1; i <= daysInSelectedMonth; i++) {
      const v = newRow[i];
      if (typeof v === 'number') sum += v;
      else if (v && !isNaN(parseFloat(v))) sum += parseFloat(v);
    }
    if (newRow.length > 32) {
      newRow[32] = sum;
    }

    if (isBaseMonth) {
      updateItem(target.index_, newRow);
    } else {
      setMonthlyLogs(prev => ({
        ...prev,
        [activeMonthKey]: {
          ...(prev[activeMonthKey] || {}),
          [target.index_]: newRow
        }
      }));
    }
  };

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-500 font-sans">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center max-w-sm">
          <ListTodo className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-800 mb-1">Loading Workspace...</h2>
          <p className="text-xs text-slate-500">Connecting to synchronized task data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Task & Habit Workspace
              </span>

              {isBaseMonth ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  🟢 Live Sync · Today
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  🔵 {currentMonth.name} Local Log
                </span>
              )}

              <WorkspaceStatusTags
                applicationsEnabled={applicationsEnabled}
                userId={user?.id}
                onOpenModules={() => setActiveTab('modules')}
              />

              {/* MONTH & YEAR SELECTOR */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 ml-1">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-white rounded-lg text-slate-600 transition"
                  title="Previous month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1 px-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <select
                    value={selectedMonthIndex}
                    onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={m.name} value={idx}>{m.name}</option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
                <button 
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-white rounded-lg text-slate-600 transition"
                  title="Next month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              {currentMonth.name} {selectedYear} Dashboard
            </h1>
            <p className="text-xs text-slate-500">
              {applicationsEnabled
                ? 'Habits, to-dos, applications, and calendar.'
                : 'Habits, to-dos, timers, and analytics.'}
            </p>
          </div>

          {/* QUICK ADD & NEW TASK BUTTONS */}
          <div className="flex flex-col items-stretch sm:items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {user?.email ? (
                <span
                  className="hidden sm:inline text-[10px] font-semibold text-slate-500 max-w-[160px] truncate"
                  title={user.email}
                >
                  {user.email}
                </span>
              ) : null}
              <button
                type="button"
                disabled={signingOut}
                onClick={async () => {
                  setSigningOut(true);
                  await signOut();
                  setSigningOut(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                {signingOut ? '…' : 'Log out'}
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddTasks(quickInput);
                  setQuickInput('');
                }}
                className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20"
              >
                <input
                  type="text"
                  placeholder="Quick add task..."
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-transparent focus:outline-none text-slate-800 w-32 md:w-40 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={!quickInput.trim()}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg transition"
                  title="Add Task"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>

              <button
                onClick={() => {
                  setNewTaskType('todo');
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition shadow-sm hover:shadow-md"
              >
                <Plus className="w-4 h-4" /> Add Tasks
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('modules')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 font-semibold text-xs rounded-xl border transition ${
                  activeTab === 'modules'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title="Modules — arrange dashboard tables"
              >
                <Settings2 className="w-4 h-4" /> Modules
              </button>

              {applicationsEnabled ? (
                <NeedsReplyBadge
                  count={needsReplyCount}
                  onOpen={() => {
                    setActiveTab('todo');
                    setNeedsReplyOpen(true);
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>

        {/* METRIC KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Completed</span>
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-slate-900">{stats.totalCompleted}</span>
              <span className="text-xs text-slate-500 ml-1.5">check-ins</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
              <TrendingUp className="w-3 h-3" /> {stats.avgDaily} avg / day
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Completed Habits</span>
              <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-slate-900">{stats.habitsDoneToday}</span>
              <span className="text-xs text-slate-500 ml-1.5">
                of {stats.habitCount} today
              </span>
            </div>
            <div className="mt-1 text-[11px] text-teal-700 font-semibold flex items-center gap-1">
              <Award className="w-3 h-3" /> streak {stats.streak}d
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Consistency Rate</span>
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-slate-900">{stats.consistencyRate}%</span>
            </div>
            <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, stats.consistencyRate)}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">LeetCode Solved</span>
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <Code2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-slate-900">{stats.totalLeetcode}</span>
              <span className="text-xs text-slate-500 ml-1.5">problems</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 font-medium">Logged across month</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Open Tasks</span>
              <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                <ListTodo className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-slate-900">{stats.taskCount}</span>
              <span className="text-xs text-slate-500 ml-1.5">to-dos</span>
            </div>
            <div className="mt-1 text-[11px] text-purple-700 font-semibold flex items-center gap-1">
              <Award className="w-3 h-3" /> {stats.habitCount} habits tracked
            </div>
          </div>
        </div>

        {applicationsEnabled ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-7 gap-2">
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                  In pipeline
                </span>
                <div className="p-1 bg-emerald-50 text-emerald-700 rounded-md shrink-0">
                  <Layers className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-1.5">
                <span className="text-xl font-extrabold text-slate-900">
                  {jobStats.inPipeline ?? 0}
                </span>
                <span className="text-[10px] text-slate-500 ml-1">active</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                  Applied today
                </span>
                <div className="p-1 bg-sky-50 text-sky-600 rounded-md shrink-0">
                  <BriefcaseBusiness className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-1.5">
                <span className="text-xl font-extrabold text-slate-900">
                  {jobStats.appliedToday}
                </span>
                <span className="text-[10px] text-slate-500 ml-1">jobs</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                  Interviewing
                </span>
                <div className="p-1 bg-indigo-50 text-indigo-600 rounded-md shrink-0">
                  <Video className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-1.5">
                <span className="text-xl font-extrabold text-slate-900">
                  {jobStats.interviewing}
                </span>
                <span className="text-[10px] text-slate-500 ml-1">active</span>
              </div>
            </div>

            <div
              className={`p-3 rounded-xl border shadow-sm relative overflow-hidden transition-colors ${
                jobStats.offer > 0
                  ? 'bg-rose-600 border-rose-700 text-white'
                  : 'bg-slate-100 border-slate-200/80 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider leading-tight ${
                    jobStats.offer > 0 ? 'text-rose-100' : 'text-slate-500'
                  }`}
                >
                  Offers
                </span>
                <div
                  className={`p-1 rounded-md shrink-0 ${
                    jobStats.offer > 0
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <PartyPopper className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-1.5">
                <span
                  className={`text-xl font-extrabold ${
                    jobStats.offer > 0 ? 'text-white' : 'text-slate-500'
                  }`}
                >
                  {jobStats.offer}
                </span>
                <span
                  className={`text-[10px] ml-1 ${
                    jobStats.offer > 0 ? 'text-rose-100' : 'text-slate-400'
                  }`}
                >
                  total
                </span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                  Rejected
                </span>
                <div className="p-1 bg-rose-50 text-rose-600 rounded-md shrink-0">
                  <XCircle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-1.5">
                <span className="text-xl font-extrabold text-slate-900">{jobStats.rejected}</span>
                <span className="text-[10px] text-slate-500 ml-1">total</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                  No update
                </span>
                <div className="p-1 bg-slate-100 text-slate-600 rounded-md shrink-0">
                  <Clock3 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-1.5">
                <span className="text-xl font-extrabold text-slate-900">{jobStats.noUpdate}</span>
                <span className="text-[10px] text-slate-500 ml-1">{staleDays}d+</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                  Needs reply
                </span>
                <div className="p-1 bg-amber-50 text-amber-600 rounded-md shrink-0">
                  <MessageCircle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-1.5">
                <span className="text-xl font-extrabold text-slate-900">
                  {jobStats.conversations}
                </span>
                <span className="text-[10px] text-slate-500 ml-1">emails</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* CONTROLS BAR & NAVIGATION TABS (user order / visibility from Modules) */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto overflow-x-auto gap-0.5">
            {visibleTabs.map((tab) => {
              const Icon = tabIcons[tab.id] || ListTodo;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden md:inline">{tab.label}</span>
                  <span className="md:hidden">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-56 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* TAB 1: DYNAMIC TO-DO & PENDING ROLLOVER QUEUE */}
        {activeTab === 'todo' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
            {applicationsEnabled ? (
              <NeedsReplyNotice
                userId={user?.id}
                count={needsReplyCount}
                open={needsReplyOpen}
                onToggle={() => setNeedsReplyOpen((v) => !v)}
                onChanged={refreshNeedsReplyCount}
              />
            ) : null}
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">Dynamic To-Do & Pending Rollover Queue</h2>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                  {isBaseMonth ? (
                    <span>
                      Today:{' '}
                      <span className="font-bold text-indigo-700">
                        {currentMonth.name.slice(0, 3)} {selectedTargetDay}, {selectedYear}
                      </span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={goToToday}
                      className="font-bold text-indigo-700 hover:underline"
                      title="Jump to today"
                    >
                      Jump to today
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  setNewTaskType('todo');
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Task
              </button>
            </div>

            {/* Filter controls row */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-slate-500 flex items-center gap-1 mr-1">
                  <Filter className="w-3 h-3" /> Priority:
                </span>
                {['all', 'High', 'Medium', 'Normal'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setTodoPriorityFilter(p)}
                    className={`px-2.5 py-0.5 rounded-md font-semibold transition ${
                      todoPriorityFilter === p
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p === 'all' ? 'All' : p}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-slate-500 flex items-center gap-1 mr-1">
                  <Layers className="w-3 h-3" /> Category:
                </span>
                {[
                  { id: 'all', label: 'Both' },
                  { id: 'todo', label: 'Tasks' },
                  { id: 'habit', label: 'Habits (today)' }
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setTodoTypeFilter(c.id)}
                    className={`px-2 py-0.5 rounded-md font-semibold transition ${
                      todoTypeFilter === c.id
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table View Matching Specification */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs min-w-[720px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <th className="p-2.5 w-10 text-center">Done</th>
                    <th className="p-2.5">Task Title</th>
                    <th className="p-2.5 w-24">Type</th>
                    <th className="p-2.5 w-28">Priority</th>
                    <th className="p-2.5 w-36">Status / Rollover</th>
                    <th className="p-2.5 w-36 text-center">Timer</th>
                    <th className="p-2.5 w-20 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {queueTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                        No tasks match query for {currentMonth.name} {selectedTargetDay}.
                      </td>
                    </tr>
                  ) : (
                    queueTasks.map(({ item, title, priority, itemType, isDoneToday, isRolledOver, missedDay, refDay, statusLabel, isClosed }) => {
                      const timerRunning = timers.isRunning(item.index_);
                      const taskCompleted = itemType === 'todo' && (isDoneToday || isClosed);
                      const rowBg = timerRunning
                        ? 'bg-emerald-50/80 border-l-4 border-l-emerald-500'
                        : taskCompleted
                        ? 'bg-slate-200/90 text-slate-600 border-l-4 border-l-slate-500'
                        : isRolledOver
                        ? 'bg-amber-50/90 hover:bg-amber-100/70 border-l-4 border-l-amber-500'
                        : isDoneToday
                        ? 'bg-slate-100/80'
                        : 'hover:bg-slate-50/80';

                      return (
                        <tr key={item.index_} className={`transition ${rowBg}`}>
                          {/* Done Checkbox */}
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => handleToggleCell(item.index_, refDay)}
                              className={`w-4 h-4 rounded border inline-flex items-center justify-center transition ${
                                isDoneToday
                                  ? 'bg-slate-700 border-slate-700 text-white'
                                  : 'border-slate-300 bg-white hover:border-indigo-500'
                              }`}
                            >
                              {isDoneToday && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>
                          </td>

                          {/* Task Title */}
                          <td className="p-2.5 font-semibold text-slate-800 truncate max-w-xs">
                            <span className={taskCompleted || isDoneToday ? 'line-through text-slate-600 font-medium' : ''}>
                              {title}
                            </span>
                          </td>

                          {/* Type Select Badge */}
                          <td className="p-2.5">
                            <select
                              value={itemType}
                              onChange={(e) => setTaskType(item.index_, e.target.value)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border-0 cursor-pointer focus:outline-none ${
                                itemType === 'todo'
                                  ? 'bg-indigo-50 text-indigo-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              <option value="todo">Task</option>
                              <option value="habit">Habit</option>
                            </select>
                          </td>

                          {/* Priority Select Badge */}
                          <td className="p-2.5">
                            <select
                              value={priority}
                              onChange={(e) => setTaskPriority(item.index_, e.target.value)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border-0 cursor-pointer focus:outline-none ${
                                priority === 'High'
                                  ? 'bg-rose-100 text-rose-700'
                                  : priority === 'Medium'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Normal">Normal</option>
                            </select>
                          </td>

                          {/* Status / Rollover — tasks miss-carry; habits are daily only */}
                          <td className="p-2.5 whitespace-nowrap">
                            {itemType === 'habit' ? (
                              isDoneToday ? (
                                <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Done today
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-500 font-medium">Daily habit</span>
                              )
                            ) : statusLabel === 'missed' || isRolledOver ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 flex items-center gap-1 w-fit">
                                <AlertCircle className="w-3 h-3 text-amber-700" /> Pending (Day {missedDay})
                              </span>
                            ) : isDoneToday ? (
                              <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Completed
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500 font-medium">Due today</span>
                            )}
                          </td>

                          {/* Timer (replaces calendar reminder) */}
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <div className="inline-flex justify-center">
                              <TimeControl
                                compact
                                running={timerRunning}
                                hours={timers.getLiveHours(item.index_)}
                                onToggleTimer={() => handleToggleTimer(item.index_)}
                              />
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => moveItem && item.index_ > 1 && moveItem(item.index_, item.index_ - 1)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded"
                                title="Move up"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => moveItem && moveItem(item.index_, item.index_ + 1)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded"
                                title="Move down"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteItem && deleteItem(item.index_)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                title="Delete task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: COMPLETED TASKS (tasks only, past + today) */}
        {activeTab === 'completed' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-slate-600" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">Completed Tasks</h2>
                  <p className="text-[11px] text-slate-500">
                    Tasks you finished this month (habits stay on the daily list).
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                {completedTasks.length} completed
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs min-w-[560px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <th className="p-2.5">Task Title</th>
                    <th className="p-2.5 w-28">Priority</th>
                    <th className="p-2.5 w-40">Completed on</th>
                    <th className="p-2.5 w-28 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {completedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                        No completed tasks yet this month. Finish a task from the To-Do queue to see it here.
                      </td>
                    </tr>
                  ) : (
                    completedTasks.map(({ item, title, priority, completedOn, isDoneToday }) => (
                      <tr
                        key={item.index_}
                        className="bg-slate-200/90 text-slate-600 border-l-4 border-l-slate-500"
                      >
                        <td className="p-2.5 font-semibold truncate max-w-xs">
                          <span className="line-through text-slate-600">{title}</span>
                          {isDoneToday ? (
                            <span className="ml-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                              Today
                            </span>
                          ) : null}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              priority === 'High'
                                ? 'bg-rose-100 text-rose-700'
                                : priority === 'Medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {priority}
                          </span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap font-semibold text-slate-700">
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                            {currentMonth.name.slice(0, 3)} {completedOn}, {selectedYear}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => deleteItem && deleteItem(item.index_)}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: FIXED HABIT MATRIX */}
        {activeTab === 'grid' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-3.5 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Fixed Daily Habit Matrix ({currentMonth.name} {selectedYear})</h2>
                <p className="text-[11px] text-slate-500">Everyday habits only — check-ins reset each morning; past days stay in the grid</p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                {filteredGridTasks.length} Habits Tracked
              </span>
            </div>

            <div className="overflow-x-auto pb-2">
              <table className="w-full border-collapse text-left min-w-[1480px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    <th className="p-3 sticky left-0 z-20 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] w-60">
                      Task / Goal Title
                    </th>
                    {parsed.days.map((d) => (
                      <th 
                        key={d.dayNum} 
                        className="p-1.5 text-center w-9 min-w-[36px] hover:bg-slate-100 cursor-pointer transition"
                        title={`View ${d.label}`}
                        onClick={() => setSelectedDayModal(d.dayNum)}
                      >
                        <div className="text-[9px] text-slate-400 uppercase font-bold">{currentMonth.name.slice(0, 3)}</div>
                        <div className="text-xs font-bold text-slate-800">{d.dayNum}</div>
                      </th>
                    ))}
                    <th className="p-3 text-center w-16 sticky right-0 bg-slate-50 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] font-bold text-slate-800">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                  {filteredGridTasks.map((item) => {
                    const taskName = String(item.row?.[0] || 'Untitled');
                    const taskTotal = item.row?.[32] ?? parsed.days.filter(d => item.row?.[d.dayNum] === true || item.row?.[d.dayNum] === 'true').length;
                    const isEditing = editingIndex === item.index_;

                    return (
                      <tr key={item.index_} className="hover:bg-slate-50/70 transition group">
                        {/* Task Title Cell */}
                        <td className="p-2.5 sticky left-0 z-10 bg-white group-hover:bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                className="px-2 py-0.5 border border-indigo-400 rounded text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit(item.index_);
                                  if (e.key === 'Escape') setEditingIndex(null);
                                }}
                              />
                              <button 
                                onClick={() => handleSaveEdit(item.index_)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between group/title">
                              <span className="font-semibold text-slate-800 truncate max-w-[180px]" title={taskName}>
                                {taskName}
                              </span>
                              <div className="opacity-0 group-hover/title:opacity-100 flex items-center gap-1 transition">
                                <button 
                                  onClick={() => handleStartEdit(item)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded"
                                  title="Edit title"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => deleteItem && deleteItem(item.index_)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                  title="Delete task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Checkboxes across days */}
                        {parsed.days.map((d) => {
                          const val = item.row?.[d.dayNum];
                          const isChecked = val === true || val === 'true' || val === 'TRUE' || val === 1;

                          return (
                            <td key={d.dayNum} className="p-1 text-center">
                              <button
                                onClick={() => handleToggleCell(item.index_, d.dayNum)}
                                className={`w-6 h-6 rounded-md inline-flex items-center justify-center transition-all duration-150 ${
                                  isChecked 
                                    ? 'bg-indigo-600 text-white shadow-sm scale-100 hover:bg-indigo-700' 
                                    : 'bg-slate-100 text-slate-300 hover:bg-slate-200 hover:text-slate-500 scale-95'
                                }`}
                              >
                                <Check className={`w-3.5 h-3.5 stroke-[2.5] ${isChecked ? 'opacity-100' : 'opacity-0 hover:opacity-40'}`} />
                              </button>
                            </td>
                          );
                        })}

                        {/* Task Total */}
                        <td className="p-2.5 text-center sticky right-0 z-10 bg-white group-hover:bg-slate-50 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] font-extrabold text-indigo-600">
                          {taskTotal}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Add Habit Row Button */}
                  <tr className="bg-slate-50/50 hover:bg-slate-100 transition border-t border-slate-200">
                    <td colSpan={daysInSelectedMonth + 2} className="p-2 sticky left-0 z-10 bg-slate-50/90 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <button
                        onClick={() => {
                          setNewTaskType('habit');
                          setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-0.5 rounded hover:bg-indigo-50 transition w-full text-left"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add new habit...
                      </button>
                    </td>
                  </tr>

                  {/* DAILY TOTAL ROW */}
                  {parsed.dailyTotalRow && (
                    <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-200 text-slate-800">
                      <td className="p-2.5 sticky left-0 z-10 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        Daily Total
                      </td>
                      {parsed.days.map((d) => {
                        const count = stats.dailyBreakdown[d.dayNum - 1]?.doneCount || 0;
                        return (
                          <td key={d.dayNum} className="p-1 text-center">
                            <span className={`inline-block text-xs ${count > 0 ? 'text-indigo-700 font-extrabold' : 'text-slate-400 font-medium'}`}>
                              {count}
                            </span>
                          </td>
                        );
                      })}
                      <td className="p-2.5 text-center sticky right-0 z-10 bg-slate-100 font-extrabold text-slate-900">
                        {stats.totalCompleted}
                      </td>
                    </tr>
                  )}

                  {/* LEETCODE COUNT ROW */}
                  {parsed.leetcodeRow && (
                    <tr className="bg-amber-50/50 font-semibold border-t border-amber-200 text-amber-950">
                      <td className="p-2.5 sticky left-0 z-10 bg-amber-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] flex items-center gap-1.5">
                        <Code2 className="w-4 h-4 text-amber-700" />
                        LeetCode Count
                      </td>
                      {parsed.days.map((d) => {
                        const lcVal = parsed.leetcodeRow.row?.[d.dayNum];
                        return (
                          <td key={d.dayNum} className="p-1 text-center">
                            <input
                              type="number"
                              min="0"
                              value={lcVal ?? ''}
                              onChange={(e) => handleLeetcodeChange(d.dayNum, e.target.value)}
                              placeholder="-"
                              className="w-6 h-5 text-center text-xs bg-white border border-amber-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold text-amber-900"
                            />
                          </td>
                        );
                      })}
                      <td className="p-2.5 text-center sticky right-0 z-10 bg-amber-50 font-extrabold text-amber-800">
                        {stats.totalLeetcode}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: TIMER (todo-app start/stop + live hours) */}
        {activeTab === 'timer' && (
          <TimerPage
            items={parsed.taskRows}
            getMeta={getTaskMeta}
            timers={timers}
            onToggleTimer={handleToggleTimer}
          />
        )}

        {activeTab === 'modules' && (
          <ApplicationsPage
            userId={user?.id}
            taskMetaMap={taskMetaMap}
            setTaskMetaMap={setTaskMetaMap}
            showModulesOnly
          />
        )}

        {activeTab === 'applications' && applicationsEnabled && (
          <ApplicationsPage
            userId={user?.id}
            taskMetaMap={taskMetaMap}
            setTaskMetaMap={setTaskMetaMap}
          />
        )}

        {activeTab === 'calendar' && applicationsEnabled && <CalendarPage />}

        {/* TAB 3: ANALYTICS & VISUAL TRENDS */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Daily Histogram Chart */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Daily Activity Volume</h3>
                  <p className="text-[11px] text-slate-500">Completed check-ins per day across {currentMonth.name} {selectedYear}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <span className="w-3 h-3 bg-indigo-600 rounded-sm inline-block"></span> Habits Completed
                  </span>
                </div>
              </div>

              <div className="h-56 flex items-end justify-between gap-1 pt-6 border-b border-slate-200">
                {stats.dailyBreakdown.map((item) => {
                  const maxPossible = Math.max(1, stats.maxDailyDone);
                  const heightPercent = Math.round((item.doneCount / maxPossible) * 100);

                  return (
                    <div 
                      key={item.day} 
                      className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer"
                      onClick={() => setSelectedDayModal(item.day)}
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap pointer-events-none">
                        <p className="font-bold">{item.label}</p>
                        <p>{item.doneCount} Completed</p>
                        {item.leetcodeCount > 0 && <p className="text-amber-300">{item.leetcodeCount} LeetCode</p>}
                      </div>

                      <div 
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          item.doneCount > 0 
                            ? 'bg-indigo-600 group-hover:bg-indigo-500' 
                            : 'bg-slate-100 group-hover:bg-slate-200'
                        }`}
                        style={{ height: `${Math.max(6, heightPercent)}%` }}
                      >
                        {item.doneCount > 0 && (
                          <div className="text-[9px] text-white text-center font-bold pt-0.5 hidden sm:block">
                            {item.doneCount}
                          </div>
                        )}
                      </div>

                      <span className="text-[9px] text-slate-500 mt-2 font-medium">
                        {item.day % 3 === 1 ? item.day : ''}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>{currentMonth.name.slice(0, 3)} 1</span>
                <span>{currentMonth.name.slice(0, 3)} {Math.floor(daysInSelectedMonth / 2)}</span>
                <span>{currentMonth.name.slice(0, 3)} {daysInSelectedMonth}</span>
              </div>
            </div>

            {/* Habit Performance Breakdown */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Habit Performance Breakdown</h3>
                <p className="text-[11px] text-slate-500">Monthly check-in frequency by habit</p>
              </div>

              <div className="space-y-2.5 my-2 overflow-y-auto max-h-[240px] pr-1">
                {parsed.taskRows.filter(item => getTaskMeta(item).itemType === 'habit').map((item) => {
                  const name = String(item.row?.[0] || 'Untitled');
                  let doneCount = 0;
                  for (let d = 1; d <= daysInSelectedMonth; d++) {
                    if (isCellDone(item.row, d)) {
                      doneCount++;
                    }
                  }
                  const pct = Math.round((doneCount / daysInSelectedMonth) * 100);

                  return (
                    <div key={item.index_} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-800 truncate max-w-[150px]">{name}</span>
                        <span className="text-indigo-600 font-bold">{doneCount} / {daysInSelectedMonth} days</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 text-xs text-indigo-950 font-medium">
                <span className="font-bold text-indigo-900">Tip:</span> Click any column in the habit grid or bar chart to view detailed task items for that day.
              </div>
            </div>
          </div>
        )}

        {/* DAY DETAIL MODAL */}
        {selectedDayModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    {currentMonth.name} {selectedDayModal}, {selectedYear}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedDayModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Completed Tasks ({stats.dailyBreakdown[selectedDayModal - 1]?.doneCount || 0})
                  </h4>
                  {stats.dailyBreakdown[selectedDayModal - 1]?.completedList.length > 0 ? (
                    <ul className="space-y-1.5">
                      {stats.dailyBreakdown[selectedDayModal - 1].completedList.map((tName, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-800 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>{tName}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No tasks completed on this day.</p>
                  )}
                </div>

                {stats.dailyBreakdown[selectedDayModal - 1]?.leetcodeCount > 0 && (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                      <Code2 className="w-4 h-4 text-amber-700" /> LeetCode Solved
                    </div>
                    <span className="text-base font-extrabold text-amber-800">
                      {stats.dailyBreakdown[selectedDayModal - 1].leetcodeCount}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedDayModal(null)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADD TASK MODAL */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Add New Item(s)</h3>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddTasks(newTaskTitle, newTaskType, newTaskPriority);
                  setNewTaskTitle('');
                  setIsAddModalOpen(false);
                }} 
                className="py-4 space-y-3"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Title(s)
                  </label>
                  <textarea
                    placeholder="Enter task titles (separated by commas or new lines)..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 h-24 resize-none"
                    autoFocus
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Type
                    </label>
                    <select
                      value={newTaskType}
                      onChange={(e) => setNewTaskType(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-slate-800"
                    >
                      <option value="todo">Task (rolls if missed)</option>
                      <option value="habit">Habit (daily reset)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-slate-800"
                    >
                      <option value="High">🔴 High</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="Normal">🔵 Normal</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition shadow-sm"
                  >
                    Create Item(s)
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

      {focusItem && (
        <FocusMode
          taskId={String(focusItem.index_)}
          taskTitle={String(focusItem.row?.[0] || 'Untitled')}
          itemType={focusMeta?.itemType || 'todo'}
          workedHours={timers.getLiveHours(focusItem.index_)}
          onLeave={() => setFocusItemId(null)}
          onStop={() => {
            timers.toggleTimer(focusItem.index_);
            clearFocusCountdownSession();
            setFocusItemId(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
