/* ===================== config ===================== */
const ROLLOVER=4, FREEZE_AT=120, MAX_FREEZE=3;
/* the daily water goal is S.waterGoal (editable) — read it through waterGoal() for "the goal
   now" or goalOn(dayKey) for "the goal that applied on that day". It was a const until v:5. */
const DAY_START=360, DAY_END=1320; /* 6:00am – 10:00pm skeleton */
/* ---------- fixed proportional grid (Google-Calendar-style timeline) ----------
   Replaces the earlier elastic/floor-ceiling sizing: every block's on-screen height is now a
   true function of its clock duration, same rate for all of them, so 8am really is twice as far
   from 6am as 7am is. "Compact" per the ask that replaced elastic sizing — 0.95px/minute keeps
   the full 6am-10pm day under 920px instead of a full 1:1 minute-per-pixel sprawl.
   On a phone that's still taller than the screen has room for, forcing a scroll through the
   card just to see the whole day — so phone widths get a smaller ratio instead, computed live
   (not a frozen const) so it tracks orientation changes. Every consumer of the ratio goes
   through gridPxPerMin()/gridTotalPx() rather than reading a fixed number directly. */
/* On the desktop the ratio is derived from the viewport instead of fixed, so the stretch of day
   you are actually in fills the pane: DESK_ACTIVE_WINDOW minutes are sized to the visible height,
   and the rest of the 6am-10pm skeleton stays reachable by scrolling. Fitting the *whole* day
   instead would put a 30-minute block at about 13px - too short for a label, let alone the task
   rows and play buttons that now live inside one. Clamped at both ends so a very short viewport
   can't crush the blocks and a very tall one can't stretch them into slabs. */
const DESK_ACTIVE_WINDOW=8*60;
function gridPxPerMin(){
  if(typeof window==='undefined') return 0.95;
  if(window.innerWidth<=760) return 0.5;
  if(window.innerWidth<=900) return 0.95;
  /* keep in step with the .timeline max-height in the desktop media query */
  const avail=window.innerHeight-250;
  return Math.max(0.6,Math.min(1.7,avail/DESK_ACTIVE_WINDOW));
}
function gridTotalPx(){ return Math.round((DAY_END-DAY_START)*gridPxPerMin()); }
function minToPx(min){ return Math.round((min-DAY_START)*gridPxPerMin()); }
const DEFAULT_CATEGORIES=['home','research','admin','self-care','hobbies','school'];
/* ===== appearance =====
   Prism Terminal is the app's look: one fixed dark phosphor palette, not a theme among several.
   The five presets, the light/dark toggle and the saved-theme snapshots were retired with the
   redesign — but the palette is still *data*, not literals. S.theme holds every colour, the CSS
   in styles.css references only custom properties, and applyTheme() pushes the one onto the
   other. Re-adding a colour picker later means building UI over the object below; it does not
   mean going back through the stylesheet. */
const DEFAULT_THEME={mode:'dark',
  bgpage:'#060a07', glass:'#0b120d', glassStrong:'#12200f',
  ink:'#c9ffd9', ink2:'#a9cfb5', ink3:'#4a7a55',
  stroke:'#1d3323', rule:'#12200f',
  /* accent 1 — amber: deadlines, priority, budget */
  pink:'rgba(232,163,61,.15)', pinkDeep:'#e8a33d',
  /* accent 2 — phosphor green: primary, active, ok */
  mint:'rgba(125,250,160,.14)', mintDeep:'#7dfaa0',
  /* teal, used for water and secondary bars */
  aqua:'rgba(79,214,168,.14)', aquaDeep:'#4fd6a8',
  alert:'#e05c4a',
  radius:'0px', fontKey:'mono'};
const FONT_STACKS={
  mono:"'IBM Plex Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace",
  system:"system-ui,-apple-system,'Segoe UI',Roboto,sans-serif"
};
/* block categories — the one colour set that is keyed by meaning rather than by accent slot */
const CAT_COLORS={home:'#9b7fd4', work:'#7dfaa0', meeting:'#e8a33d', reading:'#4fd6a8', social:'#d4736f'};
/* default card order per column, across BOTH the today view (cols 0-2: todayColA/B/C) and the
   more view (cols 3-5: moreColA/B/C) — ids match each card's actual DOM id. Water lives in the
   header now (see waterHeader). Today keeps habit streaks, the calendar, the inbox (tasks
   assigned to today from the planning tab), and side quests; everything else (meditation,
   bookshelf, movement, intentions, papers, spending) lives in the more tab. Any id
   dropped from this list is also dropped from a saved layout by backfillLayout, which is how
   the retired sunrise/moonlight panels (and card moves like this one) clear themselves out of
   existing users' columns. */
const CARD_COL_IDS=['todayColA','todayColB','todayColC', 'weekColA', 'weekColB', 'weekColC', 'moreColA','moreColB','moreColC'];
const DEFAULT_LAYOUT_COLS=[
  ['card-day'],
  ['todayTasksCard'],
  ['questCard','intentionsCard'],
  ['taskBankCard'],
  ['weekPlanCard'],
  ['futureLogCard'],
  ['habitStreakCard','waterCard','meditationCard'],
  ['bookshelfCard','movementCard'],
  ['papersCard','spendCard']
];
const CAL_TOOL='mcp__b11aad2b-1f8f-4672-9e75-3d83a6b8e73f__list_events';
const ITEMS=[
  {id:'med_rit_am', name:'Ritalin',            ritual:'sunrise', type:'med'},
  {id:'med_fluox',  name:'Fluoxetine',         ritual:'sunrise', type:'med'},
  {id:'med_fish',   name:'Fish oil',           ritual:'sunrise', type:'med'},
  {id:'shower',     name:'Shower',             ritual:'sunrise', type:'core', movable:true},
  {id:'teeth_am',   name:'Brush teeth',        ritual:'sunrise', type:'core'},
  {id:'skin_am',    name:'Skincare',           ritual:'sunrise', type:'core'},
  {id:'bed',        name:'Make the bed',       ritual:'sunrise', type:'core'},
  {id:'med_rit_pm', name:'Ritalin — 2nd dose', ritual:'day',     type:'med'},
  {id:'med_guan',   name:'Guanfacine',         ritual:'moonlight', type:'med'},
  {id:'med_allergy',name:'Allergy medicine',   ritual:'moonlight', type:'med'},
  {id:'med_bc',     name:'Birth control',      ritual:'moonlight', type:'med'},
  {id:'packfood',   name:'Pack food for tomorrow', ritual:'moonlight', type:'core'},
  {id:'dishes',     name:'Do the dishes',      ritual:'moonlight', type:'core'},
  {id:'teeth_pm',   name:'Brush teeth',        ritual:'moonlight', type:'core'},
  {id:'skin_pm',    name:'Skincare',           ritual:'moonlight', type:'core'},
];
const QCATS=['self-care','home','admin','hobbies'];
const DEFAULT_QUESTS=[
  {id:'medit',  name:'Meditation',     cat:'self-care'},
  {id:'sunsal', name:'Sun salutation', cat:'self-care'},
  {id:'vacuum', name:'Vacuum',         cat:'home'},
  {id:'laundry',name:'Laundry',        cat:'home'},
  {id:'outfit', name:'Pick tomorrow’s outfit', cat:'admin'},
];
/* The points/cents economy that used to live here (CENTS payout table, weekly earn cap, paper
   status payouts, treats, the pay-as-you-go ledger) was removed in v:5. Completing something now
   simply completes it — there is no currency to keep in sync, and therefore no way for an edit,
   a delete or an un-complete to leave the balance wrong. Historical `cents`/`ptsEarned` values
   are left untouched in stored state; nothing reads them. */
const STUDIO_CHECKLIST=['yoga mat','music','hairtie'];
const OUTDOOR_CHECKLIST=['get dressed','put on shoes','fill water','grab headphones'];
const ACTS=[
  {id:'yoga', name:'yoga', checklist:STUDIO_CHECKLIST},
  {id:'pilates', name:'pilates', checklist:STUDIO_CHECKLIST},
  {id:'lift', name:'lift', checklist:OUTDOOR_CHECKLIST},
  {id:'run', name:'run', checklist:OUTDOOR_CHECKLIST},
  {id:'walk', name:'walk', checklist:OUTDOOR_CHECKLIST},
  {id:'hike', name:'hike', checklist:OUTDOOR_CHECKLIST}
];
const BOOK_COLORS=['#A48DE8','#F09CC0','#7FB8DC','#F5CE58','#8ED0A0','#E88DA4'];
/* matcha ↔ strawberry: alternating soft green and pink block fills with a deeper edge/accent */
/* Block fills are a translucent wash of the edge colour rather than an opaque pastel: on the
   terminal's black page an opaque light fill would need dark text, which fights every other label
   on screen. A wash keeps the page's own text colour readable straight through it. */
const BLOCK_PALETTE=[
  {bg:'rgba(125,250,160,.13)', edge:'#7dfaa0'},  /* work — green */
  {bg:'rgba(155,127,212,.15)', edge:'#9b7fd4'},  /* home — violet */
  {bg:'rgba(232,163,61,.14)',  edge:'#e8a33d'},  /* meeting — amber */
  {bg:'rgba(79,214,168,.13)',  edge:'#4fd6a8'},  /* reading — teal */
  {bg:'rgba(212,115,111,.14)', edge:'#d4736f'},  /* social — clay */
  {bg:'rgba(125,250,160,.07)', edge:'#3b6b47'}   /* muted green */
];
function blockHash(id){ let h=0; for(let i=0;i<String(id).length;i++){ h=(h*31+String(id).charCodeAt(i))>>>0; } return h; }
function blockColor(b){ return BLOCK_PALETTE[blockHash(b.id)%BLOCK_PALETTE.length]; }
const PX_PER_MIN=1.25; /* the calendar is spatially honest: 1 hour ≈ 75px of height */
/* real-money spending categories for the budget tracker (S.txnCats) — user-extendable at runtime */
const DEFAULT_TXN_CATS=['Groceries','Dining','Transport','Supplies','Other'];
const DEFAULT_AFFIRM=[
  'When mindfulness embraces those we love, they will bloom like flowers. — Thich Nhat Hanh',
  'If our love is only a will to possess, it is not love. — Thich Nhat Hanh',
  'Man is an idea, and a precious small idea once he turns his back on love. — Albert Camus',
  'Life can be magnificent and overwhelming — that is the whole tragedy. Without beauty, love, or danger it would almost be easy to live. — Albert Camus, Notebooks',
  'Attention is the rarest and purest form of generosity. — Simone Weil',
  'This complete acceptance of ourselves as we are is called maitri, unconditional friendliness, a simple, direct relationship with the way we are. — Pema Chödrön',
  'What we call obstacles are really the way the world and our entire experience teach us where we’re stuck. — Pema Chödrön',
  'Accept the things to which fate binds you, and love the people with whom fate brings you together, but do so with all your heart. — Marcus Aurelius, Meditations'];
/* ===================== state ===================== */
const KEY='aura_v4'; const OLD_KEY='aura_v3'; let S=null;
function blankState(){ return { v:5, lastDate:null, days:{},
  custom:[], removed:[], moves:{},
  vessels:[{name:'Everyday cup',oz:20},{name:'Big bottle',oz:32},{name:'Mug',oz:12}], vesselIdx:0,
  waterStreak:0, waterBest:0, freezes:0, frozenDays:[], waterGoal:100,
  books:[], doneBooks:[],
  affirm:DEFAULT_AFFIRM.slice(), affirmIdx:{},
  tea:{}, moveGoal:150, readGoal:150,
  quests:DEFAULT_QUESTS.map(function(q){return Object.assign({},q);}),
  workStart:'12:00', workHours:8, lastBackup:null,
  tasks:[], notionImportedAt:null, notionLinksRepairedAt:null, blockTasksMigratedAt:null,
  mediBestSec:0, papers:[],
  budget:{monthlyCents:0, startsOn:1}, txns:[], txnCats:DEFAULT_TXN_CATS.slice(),
  blockRules:[],
  categories:DEFAULT_CATEGORIES.slice(),
  layout:{cols:DEFAULT_LAYOUT_COLS.map(function(c){return c.slice();}), collapsed:{}},
  theme:Object.assign({},DEFAULT_THEME),
  customActs:[], actTimers:{}, exMoves:[],
  weekNotes:{},
}; }
function migrateFromV3(old){
  const s=blankState();
  ['custom','removed','moves','vessels','vesselIdx','waterStreak','waterBest','freezes','frozenDays',
   'books','doneBooks','affirm','affirmIdx','tea','moveGoal','quests','workStart','workHours','lastDate'].forEach(function(k){
    if(old[k]!==undefined) s[k]=old[k];
  });
  s.days={};
  Object.keys(old.days||{}).forEach(function(k){
    const od=old.days[k];
    s.days[k]={
      water:od.water||0, log:od.log||[], done:od.done||{}, ex:od.ex||{},
      pagesLogged:od.pagesLogged||0, pagesBy:od.pagesBy||{}, pomos:od.pomos||0,
      qdone:{}, questAssign:{}, goal:100, meals:[],
      blocks:(od.blocks||[]).map(function(b){
        return {id:b.id,start:b.start,end:b.end||fromMin(toMin(b.start)+60),focus:b.focus||'',
          tasks:(b.tasks||[]).map(function(t){return {t:t.t,done:!!t.done,elapsed:0,timerStart:null};}),
          notes:b.notes||'',pomos:b.pomos||0,fromCal:!!b.fromCal,auto:!!b.auto,calTitle:b.calTitle||''};
      }),
    };
    // fold legacy pulled quest ids + qdone-as-'medit' bonus into new model
    if(od.qdone) s.days[k].qdone=od.qdone;
    if(od.pulled){
      Object.keys(od.pulled).forEach(function(r){ (od.pulled[r]||[]).forEach(function(qid){ s.days[k].questAssign[qid]=r; }); });
    }
  });
  return s;
}
function backfillAffirm(){
  if(!S.affirm||!S.affirm.length||!S.affirm.some(function(x){return x.indexOf(' — ')>=0;})){
    S.affirm=DEFAULT_AFFIRM.slice(); S.affirmIdx={};
  }
}
/* v:5 — the old spendLog was real purchases charged against the points balance. The points half
   is gone; the purchases are not, and they already have the shape the budget tracker wants, so
   they become the seed for S.txns rather than being thrown away. `balanceAfter` is dropped (it
   referred to a balance that no longer exists) and `amount` is renamed to `amountCents` to say
   plainly what it holds. Runs once — after it, S.spendLog is left in place but unread. */
function backfillTxns(){
  if(!S.txns) S.txns=[];
  if(!S.txnCats||!S.txnCats.length) S.txnCats=DEFAULT_TXN_CATS.slice();
  if(!S.budget) S.budget={monthlyCents:0, startsOn:1};
  if(S.budget.monthlyCents===undefined) S.budget.monthlyCents=0;
  if(S.budget.startsOn===undefined) S.budget.startsOn=1;
  if(S.txnsMigratedAt) return;
  (S.spendLog||[]).forEach(function(s){
    S.txns.push({id:s.id||('tx'+Date.now()+Math.random().toString(36).slice(2,7)),
      name:s.name||'', amountCents:s.amount||0, cat:'Uncategorized',
      day:s.day||dayKeyOf(new Date(s.at||Date.now())), at:s.at||Date.now()});
  });
  S.txns.sort(function(a,b){ return (b.at||0)-(a.at||0); });
  if(S.txns.some(function(t){return t.cat==='Uncategorized';})&&S.txnCats.indexOf('Uncategorized')<0){
    S.txnCats.push('Uncategorized');
  }
  S.txnsMigratedAt=Date.now();
}
/* v:5 — the water goal was a module const, so changing it would silently re-judge every past day's
   streak. The goal in effect is now snapshotted onto each day record when the day is created;
   dayCounts() reads that, never the live setting. Existing days are stamped with 100, the value
   that was actually in force while they were being logged. */
function backfillWaterGoal(){
  if(!S.waterGoal) S.waterGoal=100;
  Object.keys(S.days).forEach(function(k){
    const d=S.days[k];
    if(d.goal===undefined) d.goal=100;
  });
}
/* v:5 — meals are the one tracker with nothing to migrate from; day-keyed for consistency with
   water, so a meal belongs to the day it was eaten rather than to a global list. */
function backfillMeals(){
  Object.keys(S.days).forEach(function(k){
    const d=S.days[k];
    if(!d.meals) d.meals=[];
  });
}
/* v:5 — the chronological personal log from the mock's notes sheet. Distinct from S.weekNotes,
   which is block-scoped prose attached to a specific block on a specific day. */
function backfillLogEntries(){
  if(!S.logEntries) S.logEntries=[];
}
/* v:5 — repeating blocks. Additive: a state with no rules simply has none, and every existing
   block stays a one-off until someone gives it a repeat. */
function backfillBlockRules(){
  if(!S.blockRules) S.blockRules=[];
  S.blockRules.forEach(function(r){
    if(!r.sched) r.sched={type:'none'};
    if(!r.anchor) r.anchor=today();
  });
}
/* v:5 — rail pinning. `atMin` places a task at an exact clock minute outside any block; `metric`
   is the display unit for a count-mode task ("pages", "plates"). Everything else the task tree
   needs — parentId, subtaskIds, order, day, blockId, mode, targetN, doneN — makeUnit() has
   created since the unified-item migration, so there is nothing else to add here. */
function backfillPinning(){
  (S.tasks||[]).forEach(function(t){
    if(t.atMin===undefined) t.atMin=null;
    if(t.pinned===undefined) t.pinned=false;
    if(t.metric===undefined) t.metric='';
  });
}
function backfillCategories(){ if(!S.categories||!S.categories.length) S.categories=DEFAULT_CATEGORIES.slice(); }
/* the two fixed ritual blocks used to be a hardcoded const (ROUTINE_DEFS/RITUALS) — now they're
   the seed for a persisted, user-extendable list, so "add a ritual block" is just pushing another
   entry here rather than a code change. Seeded once; yours to add to, rename, or (via delRitualDef)
   remove after that. */
const DEFAULT_RITUAL_DEFS=[
  {id:'sunrise',   name:'morning routine', start:'06:00', end:'07:00'},
  {id:'moonlight', name:'night routine',   start:'21:00', end:'22:00'}
];
function backfillRitualDefs(){ if(!S.ritualDefs||!S.ritualDefs.length) S.ritualDefs=DEFAULT_RITUAL_DEFS.map(function(r){return Object.assign({},r);}); }
function isRitualId(id){ return (S.ritualDefs||[]).some(function(r){return r.id===id;}); }
function ritualDefName(id){ const r=(S.ritualDefs||[]).filter(function(x){return x.id===id;})[0]; return r?r.name:id; }
function addRitualDef(name,start,end){
  name=(name||'').trim(); if(!name) return null;
  if(!S.ritualDefs) S.ritualDefs=[];
  const rd={id:'ritual'+Date.now(), name:name, start:start||'12:00', end:end||'13:00'};
  S.ritualDefs.push(rd); save(); return rd;
}
function submitAddRitualDef(){
  const nameEl=document.getElementById('newRitualName'), sEl=document.getElementById('newRitualStart'), eEl=document.getElementById('newRitualEnd');
  if(!nameEl) return;
  if(addRitualDef(nameEl.value, sEl&&sEl.value, eEl&&eEl.value)){ nameEl.value=''; render(); toast('Ritual block added — it seeds onto tomorrow’s calendar'); }
}
function delRitualDef(id,ev){
  if(ev) ev.stopPropagation();
  if(!arm('rdef:'+id)) return;
  armed=null;
  S.ritualDefs=(S.ritualDefs||[]).filter(function(r){return r.id!==id;});
  /* habits that belonged to it fall back to "unassigned" rather than vanishing */
  S.tasks.forEach(function(t){ if(t.kind==='ritual'&&t.ritual===id) t.ritual=null; });
  save(); render();
}
/* every block now carries an explicit type — single focus / project / open / ritual — instead of
   that being inferred on the fly from routine/auto flags. Idempotent and ungated (like
   normalizeUnits): infers once for any block that predates the field, a no-op for blocks that
   already have one, so it just runs on every load. Also retires the dead .pomos field blocks have
   carried since v3 (never read anywhere once no pomodoro system was ever built on it). */
function backfillBlockTypes(){
  Object.keys(S.days||{}).forEach(function(k){
    (S.days[k].blocks||[]).forEach(function(b){
      if(!b.type) b.type=b.routine?'ritual':(b.auto?'open':'single');
      if(b.category===undefined) b.category=null;
      delete b.pomos;
    });
  });
}
/* one-time + ongoing reconciliation for the card layout: a brand-new user gets the default
   order; an existing user's saved order is kept, but any card id that's new since they last
   saved (a feature shipped after their layout was written) gets appended to its default column,
   and any id that no longer exists (renamed/removed card) is dropped so it doesn't leave a
   phantom gap. */
function backfillLayout(){
  if(!S.layout) S.layout={cols:DEFAULT_LAYOUT_COLS.map(function(c){return c.slice();}), collapsed:{}};
  if(!S.layout.collapsed) S.layout.collapsed={};
  if(!S.layout.cols||!S.layout.cols.length){ S.layout.cols=DEFAULT_LAYOUT_COLS.map(function(c){return c.slice();}); return; }
  const allIds=[]; DEFAULT_LAYOUT_COLS.forEach(function(c){ allIds.push.apply(allIds,c); });
  const known={}; S.layout.cols.forEach(function(c){ c.forEach(function(id){ known[id]=true; }); });
  S.layout.cols=S.layout.cols.map(function(c){ return c.filter(function(id){ return allIds.indexOf(id)>=0; }); });
  /* a layout saved before a column was added (e.g. the more tab's 3 new columns) is shorter than
     DEFAULT_LAYOUT_COLS — pad it out with empty columns first so indexing by ci below never hits
     undefined, instead of assuming every saved layout already has the current column count. */
  while(S.layout.cols.length<DEFAULT_LAYOUT_COLS.length) S.layout.cols.push([]);
  DEFAULT_LAYOUT_COLS.forEach(function(defCol,ci){
    defCol.forEach(function(id){ if(!known[id]) S.layout.cols[ci].push(id); });
  });
  /* the day-shift card became permanent as of the elastic-timeline redesign — it lost its
     collapse toggle entirely, but a layout saved before then could still have collapsed:true
     stuck on it with no UI path left to undo that, so it's force-cleared here every load. */
  if(S.layout.collapsed['card-day']) delete S.layout.collapsed['card-day'];
  relocateHabitCard();
  relocateIntentionsCard();
}
/* v:5 — SCAN leads with the day now, not the habit grid. On the phone the columns stack, so
   whatever sits in the first today-column is what you land on, and the mock puts the habit grid
   under BIO. A saved layout keeps its own card order, so this move has to be applied once
   explicitly rather than left to DEFAULT_LAYOUT_COLS. */
function relocateHabitCard(){
  if(S.habitCardMovedAt) return;
  const TODAY_COLS=[0,1,2], BIO_COL=6;
  TODAY_COLS.forEach(function(ci){
    const col=S.layout.cols[ci]; if(!col) return;
    const at=col.indexOf('habitStreakCard');
    if(at>=0){
      col.splice(at,1);
      if(S.layout.cols[BIO_COL].indexOf('habitStreakCard')<0) S.layout.cols[BIO_COL].unshift('habitStreakCard');
    }
  });
  /* moving the habit grid out left the third today-column empty on desktop, which reads as a
     layout bug rather than as space. Spread what's left across the two free columns. */
  if(!S.layout.cols[2].length&&S.layout.cols[1].length>1) S.layout.cols[2].push(S.layout.cols[1].pop());
  S.habitCardMovedAt=Date.now();
}
/* v:5 — the day view is a half-width timeline with today's tasks in the other half, so the second
   today-column must lead with the tasks. intentionsCard was never in DEFAULT_LAYOUT_COLS, which
   meant applyLayoutDom left it parked wherever the static HTML put it — the same column, above the
   tasks. Now it is placed like every other card, in the full-width row underneath. */
function relocateIntentionsCard(){
  if(S.intentionsMovedAt) return;
  for(let i=0;i<S.layout.cols.length;i++){
    const at=S.layout.cols[i].indexOf('intentionsCard');
    if(at>=0) S.layout.cols[i].splice(at,1);
  }
  if(S.layout.cols[2].indexOf('intentionsCard')<0) S.layout.cols[2].push('intentionsCard');
  S.intentionsMovedAt=Date.now();
}
/* v:5 — the redesign replaced the palette outright, so a theme saved under the old system is
   dropped rather than merged: half-migrating it would leave light-mode pinks on a black page.
   `terminal:true` marks a theme object as already converted, so this runs exactly once. */
function backfillTheme(){
  if(!S.theme||!S.theme.terminal) S.theme=Object.assign({},DEFAULT_THEME,{terminal:true});
  Object.keys(DEFAULT_THEME).forEach(function(k){ if(S.theme[k]===undefined) S.theme[k]=DEFAULT_THEME[k]; });
  delete S.savedThemes;
}
function backfillWeekNotes(){ if(!S.weekNotes) S.weekNotes={}; }
function backfillMovement(){
  if(!S.customActs) S.customActs=[];
  if(!S.actTimers) S.actTimers={};
  if(!S.exMoves) S.exMoves=[];
  S.exMoves.forEach(function(m){
    if(m.bestSec===undefined) m.bestSec=0;
    if(m.lastSec===undefined) m.lastSec=0;
    if(m.timerStart===undefined) m.timerStart=null;
  });
}
/* pushes S.theme onto the actual CSS custom properties. Both accents cascade to every alias that
   was folded into that accent family during the palette consolidation, so changing "accent 1"
   recolors everything derived from it in one go, same for accent 2. This is the single seam
   between the palette-as-data and the stylesheet. */
function applyTheme(){
  const t=S.theme, r=document.documentElement.style;
  r.setProperty('color-scheme','dark');
  r.setProperty('--bgpage',t.bgpage);
  r.setProperty('--glass',t.glass);
  r.setProperty('--glass-strong',t.glassStrong);
  r.setProperty('--ink',t.ink);
  r.setProperty('--ink-2',t.ink2);
  r.setProperty('--ink-3',t.ink3);
  r.setProperty('--stroke',t.stroke);
  r.setProperty('--rule',t.rule);
  r.setProperty('--alert',t.alert);
  r.setProperty('--r',t.radius);
  r.setProperty('--serif',FONT_STACKS[t.fontKey]||FONT_STACKS.mono);
  ['--pink','--lav','--peach'].forEach(function(v){ r.setProperty(v,t.pink); });
  ['--pink-deep','--lav-deep','--peach-deep'].forEach(function(v){ r.setProperty(v,t.pinkDeep); });
  ['--mint','--sun','--leaf'].forEach(function(v){ r.setProperty(v,t.mint); });
  ['--mint-deep','--sun-deep','--leaf-deep'].forEach(function(v){ r.setProperty(v,t.mintDeep); });
  ['--aqua','--sky','--water'].forEach(function(v){ r.setProperty(v,t.aqua); });
  ['--aqua-deep','--sky-deep','--water-deep'].forEach(function(v){ r.setProperty(v,t.aquaDeep); });
  Object.keys(CAT_COLORS).forEach(function(k){ r.setProperty('--cat-'+k,CAT_COLORS[k]); });
}
function setThemeColor(key,val){ S.theme[key]=val; save(); applyTheme(); }
function toggleSettingsPanel(){
  const p=document.getElementById('settingsPanel'); if(!p) return;
  p.style.display=p.style.display==='none'?'flex':'none';
}
function cardCollapsed(id){ return !!(S.layout&&S.layout.collapsed&&S.layout.collapsed[id]); }
function toggleCardCollapse(id,ev){
  if(ev) ev.stopPropagation();
  S.layout.collapsed[id]=!S.layout.collapsed[id];
  save();
  const el=document.getElementById(id);
  if(el){
    el.classList.toggle('cardcollapsed',S.layout.collapsed[id]);
    const chev=el.querySelector('.cardchev');
    if(chev) chev.textContent=S.layout.collapsed[id]?'▸':'▾';
  }
}
function onCardDragStart(ev,id){
  ev.dataTransfer.setData('text/aura-card',id);
  ev.dataTransfer.effectAllowed='move';
  const card=ev.currentTarget.closest('.card,.ritualpanel');
  if(card) card.classList.add('dragging');
}
function onCardDragEnd(ev){
  const card=ev.currentTarget.closest('.card,.ritualpanel');
  if(card) card.classList.remove('dragging');
}
function onCardDrop(ev,targetId){
  ev.preventDefault(); if(ev.stopPropagation) ev.stopPropagation();
  ev.currentTarget.classList.remove('drophover');
  const draggedId=ev.dataTransfer.getData('text/aura-card'); if(!draggedId||draggedId===targetId) return;
  S.layout.cols.forEach(function(col){ const idx=col.indexOf(draggedId); if(idx>=0) col.splice(idx,1); });
  S.layout.cols.forEach(function(col){ const idx=col.indexOf(targetId); if(idx>=0) col.splice(idx,0,draggedId); });
  save(); applyLayoutDom();
}
function onColDrop(ev,colIdx){
  ev.preventDefault();
  const draggedId=ev.dataTransfer.getData('text/aura-card'); if(!draggedId) return;
  S.layout.cols.forEach(function(col){ const idx=col.indexOf(draggedId); if(idx>=0) col.splice(idx,1); });
  S.layout.cols[colIdx].push(draggedId);
  save(); applyLayoutDom();
}
/* physically reorders the card DOM nodes to match S.layout.cols — deliberately NOT called from
   the main render() hot path (which runs every second for live timers) since moving a focused
   input/contenteditable node around the DOM blurs it. Only called at boot and right after a
   drag actually completes. */
function applyLayoutDom(){
  document.querySelectorAll('.card.dragging,.ritualpanel.dragging').forEach(function(el){ el.classList.remove('dragging'); });
  const colEls=CARD_COL_IDS.map(function(id){ return document.getElementById(id); });
  S.layout.cols.forEach(function(col,i){
    const colEl=colEls[i]; if(!colEl) return;
    col.forEach(function(id){ const el=document.getElementById(id); if(el) colEl.appendChild(el); });
  });
  renderDropZones();
  /* this function's whole job is to put every card back where S.layout.cols says it belongs,
     which on the desktop drags the timeline and the inbox straight back out of the panes
     syncDeskDay just put them in. It runs after render() at boot and after any card reorder, so
     re-asserting here is what keeps the two in agreement rather than racing.
     The guard is because the reverse call exists too: syncDeskDay re-runs this function when it
     hands the cards back at the breakpoint, and without it the two would call each other. */
  if(applyingLayout) return;
  applyingLayout=true;
  try{ syncDeskDay(); syncDeskPanel(); }
  finally{ applyingLayout=false; }
}
let applyingLayout=false;
/* explicit insertion-line drop targets: one above the first card, one between every pair, one
   below the last — so you can place a dragged card at an exact spot instead of only being able
   to drop "onto" another card. An empty column still gets its lone zone (index 0), which fills
   the column so there's always something real to drop onto. */
function renderDropZones(){
  const colEls=CARD_COL_IDS.map(function(id){ return document.getElementById(id); });
  colEls.forEach(function(colEl,ci){
    if(!colEl) return;
    Array.prototype.slice.call(colEl.querySelectorAll('.dropzone')).forEach(function(z){ z.remove(); });
    const cards=Array.prototype.slice.call(colEl.children);
    const mkZone=function(idx){
      const z=document.createElement('div');
      z.className='dropzone';
      z.addEventListener('dragover',function(e){ e.preventDefault(); z.classList.add('active'); });
      z.addEventListener('dragleave',function(){ z.classList.remove('active'); });
      z.addEventListener('drop',function(e){ z.classList.remove('active'); onZoneDrop(e,ci,idx); });
      return z;
    };
    colEl.insertBefore(mkZone(0),cards[0]||null);
    cards.forEach(function(card,i){ colEl.insertBefore(mkZone(i+1),card.nextSibling); });
  });
}
function onZoneDrop(ev,colIdx,idx){
  ev.preventDefault();
  /* without this, the drop event bubbles from the zone up to the column's own ondrop=onColDrop
     handler, which then also fires for the same drop and shoves the card to the very end of the
     column — silently undoing the precise placement this function just made. */
  if(ev.stopPropagation) ev.stopPropagation();
  const draggedId=ev.dataTransfer.getData('text/aura-card'); if(!draggedId) return;
  let removedFromIdxSameCol=-1;
  S.layout.cols.forEach(function(col,ci){
    const p=col.indexOf(draggedId);
    if(p>=0){ col.splice(p,1); if(ci===colIdx) removedFromIdxSameCol=p; }
  });
  let insertIdx=idx;
  if(removedFromIdxSameCol>=0&&removedFromIdxSameCol<idx) insertIdx=idx-1;
  S.layout.cols[colIdx].splice(insertIdx,0,draggedId);
  save(); applyLayoutDom();
}
function applyCollapsedDom(){
  Object.keys(S.layout.collapsed).forEach(function(id){
    if(!S.layout.collapsed[id]) return;
    const el=document.getElementById(id); if(!el) return;
    el.classList.add('cardcollapsed');
    const chev=el.querySelector('.cardchev'); if(chev) chev.textContent='▸';
  });
}
function addCategory(name){
  const nv=(name||'').trim().toLowerCase(); if(!nv) return;
  if(S.categories.some(function(c){return c.toLowerCase()===nv;})) return;
  S.categories.push(nv); save(); render();
}
function delCategory(name,ev){ if(ev)ev.stopPropagation(); if(!arm('cat:'+name)) return;
  S.categories=S.categories.filter(function(c){return c!==name;}); armed=null; save(); render(); }
/* category select options: always include the master list, plus whatever this particular task
   is currently set to (even if it's since been removed from the master list, or is legacy
   free-text from before the dropdown existed) so the current value never silently disappears */
function categoryOptionsHTML(selected){
  const list=S.categories.slice();
  if(selected&&list.indexOf(selected)<0) list.push(selected);
  if(list.indexOf('Uncategorized')<0) list.push('Uncategorized');
  return list.map(function(c){
    return '<option value="'+String(c).replace(/"/g,'&quot;')+'"'+(c===selected?' selected':'')+'>'+c+'</option>';
  }).join('');
}
/* Which stored versions we can still open, for ANY state object — local storage, the GitHub
   pull, a backup file, a pasted blob, the pre-merge snapshot. v4 is upgraded in place by the
   backfill chain; every v:5 change is additive, so there is nothing to convert beyond stamping
   the new number.
   This has to be one function used by every reader. The v:4 -> v:5 bump originally widened only
   the localStorage guard in load() and left four identical `obj.v!==4` checks behind, the worst
   of which was in ghPull(): once a device had pushed v:5, every later pull rejected its own data
   as "not a backup", which reads as sync being broken and, on a device with no local state, as
   the app coming up empty. */
function acceptVersion(obj){
  const o=(obj===undefined)?S:obj;
  if(!o) return false;
  if(o.v===5) return true;
  if(o.v===4){ o.v=5; return true; }
  return false;
}
function backfillTasks(){
  if(!S.tasks) S.tasks=[];
  S.tasks.forEach(function(t){
    if(t.day===undefined) t.day=null;
    if(t.blockId===undefined) t.blockId=null;
    if(t.priority===undefined) t.priority=null;
    if(t.done===undefined) t.done=false;
    if(t.project===undefined&&t.tag!==undefined){ t.project=t.tag; delete t.tag; }
    if(!t.project) t.project='Uncategorized';
    if(!t.envelope) t.envelope='work';
    if(t.elapsed===undefined) t.elapsed=0;
    if(t.timerStart===undefined) t.timerStart=null;
    if(t.estMin===undefined) t.estMin=null;
    if(t.questDock===undefined) t.questDock=false;
    if(t.paperId===undefined) t.paperId=null;
    if(t.notionUrl===undefined) t.notionUrl=null;
    if(t.starred===undefined) t.starred=false;
    if(!t.kind) t.kind='task';
    if(!t.sched) t.sched={type:'none'};
    if(t.day==='FUTURE'&&!t.futureBucket) t.futureBucket='month';
    if(t.day!=='FUTURE'&&!t.questDock) t.futureBucket=null;
    if(t.questDock){ t.day=null; t.blockId=null; t.futureBucket=null; } /* quest-dock placement is exclusive */
    if(t.kind===undefined) t.kind='task';
    if(t.text===undefined&&t.name!==undefined) t.text=t.name;
    if(t.sched===undefined) t.sched={type:'none'};
    if(t.doneAt===undefined) t.doneAt=null;
  });
}
/* one-time fix: the original Notion import stored URLs as https://app.notion.com/{id}
   which is not a real clickable page link. Real Notion page links need the /p/ path
   segment and ?pvs=1 query param. Patch any task that still has the broken shape. */
function repairNotionLinks(){
  if(S.notionLinksRepairedAt) return;
  const byText={}; NOTION_IMPORT_SEED.forEach(function(it){ byText[it.text]=it.notionUrl; });
  S.tasks.forEach(function(t){
    if(t.source!=='notion') return;
    const fixed=byText[t.text];
    if(fixed) t.notionUrl=fixed;
  });
  S.notionLinksRepairedAt=Date.now();
  save();
}
/* one-time migration: fold the old per-block inline task list (block.tasks, shape {t,done,elapsed,timerStart})
   into the unified S.tasks model so every task — however it was created — is the same object shape. */
function migrateBlockTasksToUnified(){
  if(S.blockTasksMigratedAt) return;
  Object.keys(S.days).forEach(function(k){
    const d=S.days[k];
    (d.blocks||[]).forEach(function(b){
      (b.tasks||[]).forEach(function(t){
        S.tasks.push({
          id:'tk'+Date.now()+Math.floor(Math.random()*1000000), text:(t.t||'').trim()||'(untitled task)',
          envelope:'work', project:'Uncategorized', priority:null, done:!!t.done,
          day:k, blockId:b.id, futureBucket:null, questDock:false,
          estMin:null, elapsed:t.elapsed||0, timerStart:null, /* don't resurrect a running timer across the migration */
          notionUrl:null, source:'block', createdAt:Date.now()
        });
      });
      b.tasks=[];
    });
  });
  S.blockTasksMigratedAt=Date.now();
  save();
}
/* Folds the old per-day plan goals (day.plan.items, shape {t,done}) into S.tasks as ordinary
   day-assigned tasks. These were the one capture surface that never produced a real task: the
   week planner already RENDERED S.tasks for each day, but its own "add a goal" input wrote here
   instead, so anything typed into a day of the week was invisible to the day view, the inbox and
   the backlog.
   Deliberately NOT gated on a stamp. addPlanItem no longer writes to plan.items, so after the
   first pass this list is permanently empty and the loop is a no-op — while a stamp would strand
   the items again on any restore of a pre-fix backup, which is exactly the trap restorePreUnify
   has to `delete obj.unifiedAt` to escape. Emptiness is the real guard. */
function migratePlanItemsToUnified(){
  let moved=0;
  Object.keys(S.days).forEach(function(k){
    const p=S.days[k]&&S.days[k].plan;
    if(!p||!Array.isArray(p.items)||!p.items.length) return;
    /* a goal ticked off three weeks ago completed three weeks ago — stamping doneAt with "now"
       would make every historical item look freshly finished */
    const parts=k.split('-').map(Number);
    const dayTs=new Date(parts[0],parts[1]-1,parts[2],12,0,0).getTime();
    p.items.forEach(function(it){
      const text=String((it&&it.t)||'').trim(); if(!text) return;
      S.tasks.push(makeUnit({text:text, kind:'task', day:k, done:!!(it&&it.done),
        doneAt:(it&&it.done)?dayTs:null, envelope:'work', project:'Uncategorized',
        source:'planitem'}));
      moved++;
    });
    p.items=[];
  });
  if(moved) save();
  return moved;
}
/* one-time import of open items from the "To-Do List" Notion database (all "work" envelope —
   none of these had "Personal" in their Notion Category property; tag = their Notion "project" value) */
const NOTION_IMPORT_SEED=[
  {text:'Read: Waveguide-based measurement of the SiN refractive index and thermo-optic coefficient', project:'literature', priority:'Low', notionUrl:'https://app.notion.com/p/390570fa261481399cd4f95edf3ec47f?pvs=1'},
  {text:'Read: Inverse designed resistive heaters for uniform switching of Phase Change Materials', project:'literature', priority:'Medium', notionUrl:'https://app.notion.com/p/390570fa2614813ba48fd64a8133ba22?pvs=1'},
  {text:'Read: Silicon Photonic Switch Fabrics: Technology and Architecture', project:'Qflex', priority:'Medium', notionUrl:'https://app.notion.com/p/390570fa2614817bb6e8e92892ca51cb?pvs=1'},
  {text:'Gather data from DAC as it is', project:'Qflex', priority:'High', notionUrl:'https://app.notion.com/p/390570fa261481df8ed2c05c7ca3265b?pvs=1'},
  {text:'Read: A cavity-less architecture for high-power integrated frequency combs', project:'literature', priority:'Medium', notionUrl:'https://app.notion.com/p/394570fa261481e081e4ced16131ea05?pvs=1'},
  {text:'create outline for quals slideshow with brainstorm', project:'quals', priority:'Medium', notionUrl:'https://app.notion.com/p/396570fa261480629344e0fa666de1eb?pvs=1'},
  {text:'Start thermally tuned wg example', project:'Qflex', priority:'High', notionUrl:'https://app.notion.com/p/397570fa261480e2821ae9b528c89f37?pvs=1'},
  {text:'move monte carlo scripts to new github repo folder', project:'Qflex', priority:'Low', notionUrl:'https://app.notion.com/p/398570fa26148009899eeb1bd9b21954?pvs=1'},
  {text:'move monte carlo sim files to google drive', project:'Qflex', priority:'Low', notionUrl:'https://app.notion.com/p/398570fa2614800b8cb4e327b35ea03e?pvs=1'},
  {text:'export slides from PICs course to google drive', project:'admin', priority:null, notionUrl:'https://app.notion.com/p/398570fa26148047a10cff35e73a1037?pvs=1'},
  {text:'skim Razavi chapter 3', project:'quals', priority:null, notionUrl:'https://app.notion.com/p/399570fa26148033a778c8fc94995896?pvs=1'},
  {text:'review sacher paper flashcards for 30 minutes', project:'quals', priority:'High', notionUrl:'https://app.notion.com/p/399570fa26148043a8d5c9332ef991d1?pvs=1'},
  {text:'schedule meeting with Dr. Liu', project:'quals', priority:null, notionUrl:'https://app.notion.com/p/399570fa2614808f8fbee4e2fb23d379?pvs=1'},
  {text:'create flashcards over Razavi ch 3 section 1', project:'quals', priority:null, notionUrl:'https://app.notion.com/p/399570fa261480d1b88ff3dbc501aa75?pvs=1'},
  {text:'create zip file of GUI, python script, and .bat file to install dependencies for DAC', project:'admin', priority:null, notionUrl:'https://app.notion.com/p/39c570fa26148026b4b9fcdfbcc3ec48?pvs=1'},
  {text:'draw schematic of DAC power supply wiring', project:'Qflex', priority:null, notionUrl:'https://app.notion.com/p/39c570fa2614802c90bfdf15fff43607?pvs=1'},
  {text:'debug multimeter measurement - try other multimeter and other resistors', project:'Qflex', priority:null, notionUrl:'https://app.notion.com/p/3a0570fa26148081ba41e89f6a85a312?pvs=1'},
  {text:'get more info abt testing ring resonator chips', project:'testing', priority:null, notionUrl:'https://app.notion.com/p/3a0570fa261480b0ac47cfe49ae7fdf6?pvs=1'},
  {text:'study chapter 1 pics cards for 30 minutes', project:'quals', priority:'Low', notionUrl:'https://app.notion.com/p/cc4570fa261482d2ac5581f986342a0c?pvs=1'}
];
function importNotionSeed(){
  if(S.notionImportedAt) return;
  const existing={}; S.tasks.forEach(function(t){ if(t.notionUrl) existing[t.notionUrl]=true; });
  NOTION_IMPORT_SEED.forEach(function(it){
    if(existing[it.notionUrl]) return;
    S.tasks.push({id:'nt'+Date.now()+Math.floor(Math.random()*10000), text:it.text, envelope:'work', project:it.project,
      priority:it.priority||null, done:false, day:null, blockId:null, futureBucket:null, questDock:false, estMin:null,
      source:'notion', notionUrl:it.notionUrl, createdAt:Date.now(),
      elapsed:0, timerStart:null});
  });
  S.notionImportedAt=Date.now();
  save();
}
/* ===================== persistence =====================
   Backed by the artifact persistent-storage API instead of localStorage. Everything is written
   to ONE personal key (shared=false), so this data is visible only to you and never to anyone
   else who opens the artifact.
   The API is async while save() is called synchronously from ~60 places, so save() keeps its
   synchronous signature and queues a debounced background write. Consequences worth knowing:
   - scheduleUndoCheckpoint() still runs synchronously inside save(), so Ctrl+Z behaviour and the
     suppressUndoTracking flag in doUndo/doRedo work exactly as before.
   - Writes coalesce: the first save() after an idle period schedules a flush SAVE_DEBOUNCE_MS
     later, and every save() in that window rides along on the same write. This keeps bursts of
     rapid clicks from hitting the API's rate limit.
   - A pending write is flushed on pagehide/visibilitychange so closing the tab mid-debounce
     doesn't drop the last action. */
const SAVE_DEBOUNCE_MS=600;
let saveTimer=null, savePending=false;
function storageAvailable(){ return !!(window.storage&&window.storage.get&&window.storage.set); }
function flushSave(){
  if(saveTimer){ clearTimeout(saveTimer); saveTimer=null; }
  if(!savePending) return;
  savePending=false;
  if(!storageAvailable()) return;
  try{
    const json=JSON.stringify(S);
    Promise.resolve(window.storage.set(KEY,json,false)).catch(function(){ /* best-effort */ });
  }catch(e){ /* best-effort */ }
}
/* ===================== GitHub sync =====================
   window.storage only exists inside the artifact runtime, so on GitHub Pages storageAvailable()
   above is always false and this file has nothing durable to fall back on. A separate private
   repo is the store instead: paste a fine-grained personal access token (Contents: read/write,
   scoped to just that repo) and the current state gets written to GH_PATH there. Keeping the data
   in its own repo rather than a branch of this one is what lets it sit on main without ever
   touching the branch the Pages site is built from.
   The token is kept only in this browser's localStorage - it is never embedded in the page and
   only ever sent to api.github.com.
   Push is debounced separately from (and longer than) the local save() debounce above, so a burst
   of edits produces one commit, not one per click.

   These four values are load-bearing and easy to break silently, because nothing here fails at
   build time if they point somewhere that doesn't exist - the app just comes up empty. They have
   been wrong once already: the Prism Terminal branch was cut from a base still carrying the
   original focus_maxxer/data/data/state.json placeholders, and merging it on 2026-08-01 carried
   those back over the working values, which is why syncing stopped dead after 2026-07-31 and
   "load latest from GitHub" started answering 404. If a merge ever touches this line, check it
   against where the data actually lives before shipping. */
const GH_OWNER='eve-wils', GH_REPO='focus_data', GH_BRANCH='main', GH_PATH='state.json';
const GH_TOKEN_KEY='aura_gh_token';
const GH_PRECONNECT_BACKUP_KEY='aura_gh_preconnect_backup';
/* One commit per edit-burst, and this is how wide a burst is. At 2s it was effectively one commit
   per action: a single day of real use produced 324 of them, which buries anything worth reading
   in `git log` and made the CI guard expensive enough to need moving off per-push. 30s collapses
   a working stretch into a handful of commits instead.
   The cost is a wider window where an edit exists only in this tab: closing it inside that window
   is what the beforeunload prompt is for, and it will now show up more often. That is the right
   side to err on - flushGhPushUrgent() still fires the pending push on pagehide, so the warning
   is a backstop for a hard close rather than the only thing standing between an edit and GitHub. */
const GH_PUSH_DEBOUNCE_MS=30000;
let ghToken=localStorage.getItem(GH_TOKEN_KEY)||'';
let ghSha=null, ghSyncing=false, ghLastSyncAt=null, ghLastError=null, ghBranchReady=false;
let ghSaveTimer=null, ghPushInFlight=false, ghPushQueued=false;
/* ghReadOnly latches for the rest of the session when a read fails; ghGoodVolume is the size of
   the last state we know GitHub actually holds; ghForceNext is the one-shot manual override. */
let ghReadOnly=false, ghGoodVolume=-1, ghForceNext=false;
/* ---------- wipe guard ----------
   The bug this exists for: ghPull() returned null both for "the file isn't on the branch yet"
   and for "the request failed", and load() treated the two identically — so one flaky read at
   startup produced a blankState(), and the save() at the end of load() pushed that blank over
   the real file two seconds later. In the commit log it looks like an ordinary sync, and every
   device that pulls afterwards comes up empty.
   Two independent defences, because either one alone can be walked around:
     1. readers below distinguish 'absent' from 'error' and never blank on an error, and a failed
        read latches ghReadOnly, which blocks every push for the rest of the session;
     2. stateVolume()/wipeVerdict() weigh whatever is about to be pushed against the last state
        GitHub is known to hold, and refuse one that destroys most of it — whatever produced it.
   The same two thresholds are enforced again server-side in eve-wils/focus_data
   (.github/workflows/state-guard.yml), which catches pushes from an older cached build of this
   page that predates this file. Keep the numbers in step if you ever change them. */
const WIPE_MIN_VOLUME=20;   /* under this there isn't enough data for a ratio to mean anything */
const WIPE_RATIO=0.5;       /* losing half of everything inside one debounce is never a real edit */
/* one number standing in for "how much of this person's data is in here". Counts records rather
   than bytes, so a formatting change or a long note doesn't read as data appearing or vanishing. */
function stateVolume(o){
  if(!o||typeof o!=='object') return -1;
  const days=(o.days&&typeof o.days==='object')?o.days:{};
  let blocks=0, done=0, logs=0;
  Object.keys(days).forEach(function(k){
    const d=days[k]; if(!d||typeof d!=='object') return;
    blocks+=(d.blocks||[]).length;
    done+=Object.keys(d.done||{}).length;
    logs+=(d.log||[]).length;
  });
  const len=function(v){ return Array.isArray(v)?v.length:0; };
  return Object.keys(days).length+blocks+done+logs+
    len(o.tasks)+len(o.quests)+len(o.custom)+len(o.papers)+len(o.spendLog)+
    len(o.books)+len(o.doneBooks)+len(o.categories)+len(o.ritualDefs);
}
/* null when the candidate is safe to write, otherwise a human-readable reason to refuse it */
function wipeVerdict(prevVolume,next){
  if(!next||typeof next!=='object') return 'state is not an object';
  if(next.v===undefined) return 'state has no version field';
  const v=stateVolume(next);
  if(v<0) return 'state could not be measured';
  if(!(prevVolume>0)) return null;   /* nothing known-good to compare against yet */
  if(v===0) return 'it is completely empty, and '+prevVolume+' records would be lost';
  if(prevVolume>=WIPE_MIN_VOLUME&&v<prevVolume*WIPE_RATIO)
    return 'it drops from '+prevVolume+' records to '+v;
  return null;
}
function ghConfigured(){ return !!ghToken; }
function ghSetToken(t){
  ghToken=(t||'').trim();
  if(ghToken) localStorage.setItem(GH_TOKEN_KEY,ghToken); else localStorage.removeItem(GH_TOKEN_KEY);
  ghBranchReady=false; ghSha=null; ghLastError=null; ghLastSyncAt=null;
  /* a new token is a fresh relationship with the remote: drop the latch and the known-good mark
     rather than judging the next push against a number measured under the old one */
  ghReadOnly=false; ghGoodVolume=-1; ghForceNext=false;
}
function utf8ToB64(str){ return btoa(unescape(encodeURIComponent(str))); }
function b64ToUtf8(str){ return decodeURIComponent(escape(atob(str.replace(/\n/g,'')))); }
/* The copy pushed to GitHub is written one value per line with object keys sorted, so a sync
   shows up in `git diff` as the few lines that actually changed instead of one rewritten 50KB
   line. Sorting the keys matters as much as the newlines do: object key order in JS is insertion
   order, so a day or a field that happens to be created in a different order would otherwise
   rewrite its whole block for no reason, and the diff would be noise again. As a side effect the
   day map comes out chronological, which is how you'd want to read it anyway.
   Arrays are deliberately left alone - the order of S.tasks is data the user set by dragging
   things around, not an implementation detail to normalise away.
   Only the pushed copy is formatted. The localStorage write and the undo snapshots stay compact:
   nothing ever diffs those, they run on every keystroke-ish action, and the indentation would be
   pure overhead. Formatting is a serialisation choice, so nothing that reads state needs to know
   about it - JSON.parse is indifferent, and the wipe guard counts records, not bytes. */
function ghStableJson(o){
  return JSON.stringify(o,function(key,value){
    if(value&&typeof value==='object'&&!Array.isArray(value)){
      const out={};
      Object.keys(value).sort().forEach(function(k){ out[k]=value[k]; });
      return out;
    }
    return value;
  },2);
}
function ghHeaders(){
  return {Authorization:'Bearer '+ghToken, Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28', 'Content-Type':'application/json'};
}
/* the sync branch may not exist yet on a repo that's only ever had main - create it once, forked
   off main's current tip, then remember it's there for the rest of the session.
   The errors below name the repo and say what the status actually means. The old ones didn't:
   pointing GH_REPO at a repo that doesn't exist produced "could not read main branch (404)",
   which reads as a problem with the branch when the repo is what is missing, and sent a real
   debugging session off in the wrong direction. GitHub answers 404 rather than 403 for a repo
   the token cannot see, so the two are genuinely indistinguishable here and the message has to
   offer both. */
async function ghEnsureBranch(){
  if(ghBranchReady||!ghConfigured()) return ghBranchReady;
  const where=GH_OWNER+'/'+GH_REPO;
  const base='https://api.github.com/repos/'+where;
  const r=await fetch(base+'/git/ref/heads/'+GH_BRANCH,{headers:ghHeaders()});
  if(r.ok){ ghBranchReady=true; return true; }
  if(r.status===401) throw new Error('the token was rejected (401) - it may have expired');
  if(r.status!==404) throw new Error('could not check branch ‘'+GH_BRANCH+'’ on '+where+' ('+r.status+')');
  /* the branch 404'd; find out whether the repo is there at all before trying to create it */
  const repoRes=await fetch(base,{headers:ghHeaders()});
  if(repoRes.status===404) throw new Error(where+' could not be read (404) - either it does not '+
    'exist or this token is not scoped to it');
  if(!repoRes.ok) throw new Error(where+' could not be read ('+repoRes.status+')');
  const mainRef=await fetch(base+'/git/ref/heads/main',{headers:ghHeaders()});
  if(!mainRef.ok) throw new Error('branch ‘'+GH_BRANCH+'’ is missing from '+where+
    ' and its main branch could not be read to fork from ('+mainRef.status+')');
  const mainSha=(await mainRef.json()).object.sha;
  const created=await fetch(base+'/git/refs',{method:'POST',headers:ghHeaders(),
    body:JSON.stringify({ref:'refs/heads/'+GH_BRANCH, sha:mainSha})});
  if(!created.ok&&created.status!==422)
    throw new Error('could not create branch ‘'+GH_BRANCH+'’ on '+where+' ('+created.status+')');
  ghBranchReady=true; return true;
}
async function ghFetchFile(){
  const url='https://api.github.com/repos/'+GH_OWNER+'/'+GH_REPO+'/contents/'+GH_PATH+'?ref='+GH_BRANCH;
  const r=await fetch(url,{headers:ghHeaders()});
  if(r.status===404){ ghSha=null; return null; }
  if(!r.ok) throw new Error('fetch failed ('+r.status+')');
  const j=await r.json();
  ghSha=j.sha;
  return b64ToUtf8(j.content);
}
/* three genuinely different outcomes, and collapsing them into one nullable return is what cost
   the data: 'ok' - parsed state in hand; 'absent' - the file really is not on the branch (a clean
   404), so a first push is safe; 'error' - anything else (offline, 401, rate limit, 5xx, empty or
   unparseable body, a version this build can't read), which means the remote file may be perfectly
   fine and must not be written over on the strength of a failed read. */
async function ghPullResult(){
  if(!ghConfigured()) return {status:'absent'};
  let raw;
  try{
    await ghEnsureBranch();
    raw=await ghFetchFile();
  }catch(e){ ghLastError=String(e&&e.message||e); return {status:'error',error:ghLastError}; }
  if(raw===null||raw===undefined){ ghLastError=null; return {status:'absent'}; }
  if(!String(raw).trim()){
    ghLastError='the file on GitHub is empty';
    return {status:'error',error:ghLastError};
  }
  let obj;
  try{ obj=JSON.parse(raw); }
  catch(e){ ghLastError='the file on GitHub is not valid JSON'; return {status:'error',error:ghLastError}; }
  if(!acceptVersion(obj)){
    ghLastError='the file on GitHub is a version this build cannot read';
    return {status:'error',error:ghLastError};
  }
  ghLastError=null; ghGoodVolume=stateVolume(obj);
  return {status:'ok',data:obj};
}
async function ghPull(){ const r=await ghPullResult(); return r.status==='ok'?r.data:null; }
async function ghPushNow(opts){
  opts=opts||{};
  if(!ghConfigured()) return;
  /* the override is consumed here whatever happens next, so a forced push can never leak into
     the queued/retry pushes that follow it */
  const forced=ghForceNext; ghForceNext=false;
  if(ghReadOnly&&!forced){
    ghLastError='sync paused — GitHub could not be read on this load'; renderSyncLine(); return;
  }
  if(!forced){
    const why=wipeVerdict(ghGoodVolume,S);
    if(why){ ghLastError='push blocked: '+why; renderSyncLine(); return; }
  }
  if(ghPushInFlight){ ghPushQueued=true; return; }
  ghPushInFlight=true; ghSyncing=true; renderSyncLine();
  try{
    await ghEnsureBranch();
    if(ghSha===null){ try{ await ghFetchFile(); }catch(e){ /* no file synced yet - fine */ } }
    const body={message:'sync '+new Date().toISOString(), content:utf8ToB64(ghStableJson(S)), branch:GH_BRANCH};
    if(ghSha) body.sha=ghSha;
    const url='https://api.github.com/repos/'+GH_OWNER+'/'+GH_REPO+'/contents/'+GH_PATH;
    let r=await fetch(url,{method:'PUT',headers:ghHeaders(),body:JSON.stringify(body),keepalive:!!opts.keepalive});
    if(r.status===409){
      /* another tab or device pushed since we last read the sha - refetch once and retry. Re-run
         the wipe check against what is actually on the branch now: "someone else pushed newer
         data" is exactly the moment a stale in-memory state is most likely to be the smaller one,
         and the old code resolved the conflict by handing that stale state the winning sha. */
      const fresh=await ghFetchFile();
      if(fresh&&!forced){
        let remoteVol=-1;
        try{ remoteVol=stateVolume(JSON.parse(fresh)); }catch(e){ /* unreadable - keep the old mark */ }
        if(remoteVol>0&&remoteVol>ghGoodVolume) ghGoodVolume=remoteVol;
        const why=wipeVerdict(ghGoodVolume,S);
        if(why) throw new Error('push blocked: '+why);
      }
      body.sha=ghSha;
      r=await fetch(url,{method:'PUT',headers:ghHeaders(),body:JSON.stringify(body),keepalive:!!opts.keepalive});
    }
    if(!r.ok) throw new Error('push failed ('+r.status+')');
    const j=await r.json();
    ghSha=(j.content&&j.content.sha)||ghSha;
    ghGoodVolume=stateVolume(S);
    ghLastSyncAt=Date.now(); ghLastError=null;
  }catch(e){ ghLastError=String(e&&e.message||e); }
  finally{
    ghSyncing=false; ghPushInFlight=false;
    renderSyncLine();
    if(ghPushQueued){ ghPushQueued=false; ghPushNow(); }
  }
}
function scheduleGhPush(){
  if(!ghConfigured()) return;
  /* nothing can be written while paused, so don't arm a timer for it — an armed timer is also
     what makes beforeunload nag, and "don't close this tab" is a lie when no push is coming */
  if(ghReadOnly){ renderSyncLine(); return; }
  if(ghSaveTimer) clearTimeout(ghSaveTimer);
  ghSaveTimer=setTimeout(function(){ ghSaveTimer=null; ghPushNow(); },GH_PUSH_DEBOUNCE_MS);
  renderSyncLine();
}
function flushGhPushUrgent(){
  /* only fires early if a push was actually pending - closing the tab shouldn't push unchanged
     state just because it happens to still be connected */
  if(!ghConfigured()||!ghSaveTimer) return;
  clearTimeout(ghSaveTimer); ghSaveTimer=null;
  ghPushNow({keepalive:true});
}
/* refreshing or closing the tab while an edit hasn't reached GitHub yet would silently discard
   it - the next load() always trusts whatever's already on the branch, it has no way to know a
   newer edit existed only in this tab's memory. This is the guardrail: force a confirmation
   dialog so there's a real pause for the debounced push (or a manual "sync now") to land. */
window.addEventListener('beforeunload',function(e){
  if(!ghConfigured()||(!ghSaveTimer&&!ghPushInFlight)) return;
  e.preventDefault(); e.returnValue='';
});
function ghTimeAgo(ts){
  const s=Math.max(0,Math.round((Date.now()-ts)/1000));
  if(s<10) return 'just now';
  if(s<60) return s+'s ago';
  const m=Math.round(s/60); if(m<60) return m+'m ago';
  const h=Math.round(m/60); if(h<24) return h+'h ago';
  return new Date(ts).toLocaleDateString();
}
function ghStatusText(){
  if(!ghConfigured()) return '';
  if(ghSyncing) return 'syncing…';
  /* the paused states outrank "unsynced changes": if nothing can be written, saying the tab just
     needs a moment is the wrong story to tell */
  if(ghReadOnly) return 'sync paused — GitHub could not be read'+(ghLastError?(' ('+ghLastError+')'):'')+
    '. Use “load latest from GitHub” to retry.';
  if(ghLastError&&ghLastError.indexOf('push blocked')===0)
    return ghLastError+'. Nothing was written — “load latest from GitHub” to retry.';
  if(ghSaveTimer) return 'unsynced changes — don’t close this tab yet';
  if(ghLastError) return 'sync error: '+ghLastError;
  if(ghLastSyncAt) return 'synced '+ghTimeAgo(ghLastSyncAt);
  return 'not yet synced';
}
function renderSyncLine(){
  const el=document.getElementById('ghSyncLine'); if(el) el.textContent=ghStatusText();
  const box=document.getElementById('ghSyncBox');
  if(box&&editing==='ghsync') box.innerHTML=ghSyncPanelHtml();
}
function ghSyncPanelHtml(){
  if(!ghConfigured()){
    return '<div class="restorewarn"><span>Paste a fine-grained GitHub personal access token '+
      '(Contents: read and write, scoped to just '+GH_OWNER+'/'+GH_REPO+') to sync your data to the '+
      '‘'+GH_BRANCH+'’ branch of this repo automatically as you use the app. The token is stored only in this browser.</span>'+
      '<textarea class="restorepaste" id="ghTokenIn" placeholder="github_pat_…" spellcheck="false" style="height:2.4em"></textarea>'+
      '<div style="display:flex;gap:8px"><button class="btn tiny" onclick="submitGhToken()">connect</button>'+
      '<button class="btn tiny ghost" onclick="toggleEdit(null)">cancel</button></div></div>';
  }
  const stuck=ghReadOnly||(ghLastError&&ghLastError.indexOf('push blocked')===0);
  return '<div class="restorewarn"><span>Synced to '+GH_OWNER+'/'+GH_REPO+' · branch ‘'+GH_BRANCH+'’ · '+GH_PATH+'. '+ghStatusText()+'</span>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn tiny" onclick="ghPushNow()">sync now</button>'+
    '<button class="btn tiny" onclick="ghPullNowManual()">load latest from GitHub</button>'+
    /* only offered once the guard has actually stopped something, so the normal path never
       presents a one-click way to overwrite everything */
    (stuck?'<button class="btn tiny" onclick="ghForcePush()">push this device anyway…</button>':'')+
    '<button class="btn tiny ghost" onclick="ghDisconnect()">disconnect</button>'+
    '<button class="btn tiny ghost" onclick="toggleEdit(null)">close</button></div></div>';
}
/* connecting used to push this browser's state straight away — fine on the device that's been
   using the app all along, but a fresh browser/device has blank/default state, and pushing that
   immediately silently erased whatever was already synced from elsewhere. Pull first, exactly
   like a normal page load already does once a token is configured, and only push when the
   branch genuinely has nothing yet. The pre-connect state is snapshotted to localStorage first,
   purely as a recovery net, in case this device actually did have real data of its own that had
   simply never been synced before. */
async function submitGhToken(){
  const el=document.getElementById('ghTokenIn'); const t=el&&el.value;
  if(!t||!t.trim()){ toast('Paste a token first'); return; }
  ghSetToken(t); toggleEdit(null);
  try{ localStorage.setItem(GH_PRECONNECT_BACKUP_KEY,JSON.stringify(S)); }catch(e){}
  toast('Connecting…');
  const res=await ghPullResult();
  if(res.status==='ok'){
    ghReadOnly=false;
    adoptState(res.data);
    toast('Connected — loaded your existing data from GitHub');
  } else if(res.status==='absent'){
    /* only a clean 404 earns "this device is the starting point" — on an error the branch may
       already hold everything, and pushing this browser's state would be the wipe */
    ghPushNow();
    toast('Connected — this device is now the starting point');
  } else {
    ghReadOnly=true; renderSyncLine();
    toast('Connected, but GitHub could not be read: '+(res.error||'unknown')+' — sync paused');
  }
}
function ghDisconnect(){ ghSetToken(''); toggleEdit(null); toast('GitHub sync disconnected'); }
async function ghPullNowManual(){
  toast('Loading latest from GitHub…');
  const res=await ghPullResult();
  if(res.status==='ok'){
    /* a good read is the only thing that clears the latch — sync resumes from real data */
    ghReadOnly=false;
    adoptState(res.data);
    toast('Loaded latest from GitHub'); renderSyncLine(); return;
  }
  if(res.status==='absent'){ toast('No synced data found yet'); renderSyncLine(); return; }
  ghReadOnly=true;
  toast('Could not load: '+(res.error||'unknown'));
  renderSyncLine();
}
/* the deliberate way out, for the two cases the guard can't tell apart from a wipe: genuinely
   starting over, and a device whose local state is the only good copy left. Both are real, both
   are rare, and neither should be reachable without saying so out loud. */
function ghForcePush(){
  const v=stateVolume(S);
  if(!confirm('Replace the copy on GitHub with what this device has right now?\n\n'+
    'This device is holding '+v+' record'+(v===1?'':'s')+
    ', and whatever is stored on GitHub will be overwritten.')) return;
  ghForceNext=true; ghReadOnly=false;
  ghPushNow();
}
/* ===================== notifications =====================
   What this can and cannot do, because the ceiling is set by where the app is hosted rather than
   by this code: the page is static, so there is no server to send Web Push from, and without one
   nothing can reach you while the app is fully closed. What does work is everything that fires
   while the page is alive - open in a tab on the desktop, or open/recently-backgrounded as an
   installed PWA on a phone. That covers the cases worth having: a block about to start, a block
   starting, and a block ending and handing its unfinished tasks back.
   Going through the service worker registration when there is one (rather than `new
   Notification`) is what makes it work on Android and on an installed iOS PWA - constructing a
   Notification directly throws on those. Desktop browsers accept either, so the SW path is the
   only one wired up, with the constructor as the fallback.
   Permission is never requested on load. An unprompted permission dialog is the thing browsers
   now punish with a permanent block, so it is asked for from a button (enableNotifications), on
   a real click. */
let notifyReady=false, swReg=null;
const NOTIFY_SEEN_KEY='aura_notify_seen';
let notifySeen={};
try{ notifySeen=JSON.parse(localStorage.getItem(NOTIFY_SEEN_KEY)||'{}')||{}; }catch(e){ notifySeen={}; }
function notifySupported(){ return typeof Notification!=='undefined'; }
function notifyPermission(){ return notifySupported()?Notification.permission:'unsupported'; }
async function registerServiceWorker(){
  if(!('serviceWorker' in navigator)) return null;
  try{
    /* scope-relative so it works on a project Pages site (/focus/) as well as a root domain */
    swReg=await navigator.serviceWorker.register('sw.js');
    return swReg;
  }catch(e){ return null; }
}
async function enableNotifications(){
  if(!notifySupported()){ toast('This browser can’t show notifications'); return; }
  if(Notification.permission==='denied'){
    toast('Notifications are blocked — turn them back on in your browser’s site settings');
    return;
  }
  const res=await Notification.requestPermission();
  if(res==='granted'){
    notifyReady=true;
    notifyUser('Notifications on', 'You’ll hear about blocks starting and ending.');
    toast('Notifications enabled');
  } else {
    toast('Notifications not enabled');
  }
  render();
}
function notifyUser(title,body,tag){
  /* always mirror to the in-app toast: the tab you are looking at should not stay silent just
     because permission was never granted, and a toast is the only channel that always works */
  toast(title);
  if(!notifySupported()||Notification.permission!=='granted') return;
  const opts={body:body||'', icon:'favicon.png', badge:'favicon.png',
    tag:tag||('prism-'+Date.now()), renotify:false};
  try{
    if(swReg&&swReg.showNotification){ swReg.showNotification(title,opts); return; }
    new Notification(title,opts);
  }catch(e){ /* the toast already fired, so a failure here is not worth surfacing */ }
}
/* fires each alert at most once per day per block, surviving reloads. Keyed by day so the store
   stays small and yesterday's keys are dropped rather than accumulating forever. */
function notifyOnce(key,title,body){
  const k=today()+'|'+key;
  /* re-read rather than trusting the in-memory copy, so a second tab doesn't re-fire an alert
     the first one already showed */
  let stored={};
  try{ stored=JSON.parse(localStorage.getItem(NOTIFY_SEEN_KEY)||'{}')||{}; }catch(e){ stored={}; }
  if(stored[k]||notifySeen[k]) return false;
  stored[k]=1;
  /* drop everything that isn't today's, so this never grows without bound */
  Object.keys(stored).forEach(function(x){ if(x.indexOf(today()+'|')!==0) delete stored[x]; });
  notifySeen=stored;
  try{ localStorage.setItem(NOTIFY_SEEN_KEY,JSON.stringify(stored)); }catch(e){}
  notifyUser(title,body,key);
  return true;
}
/* the minute hand: what is about to start, what just started. Block *endings* are announced by
   sweepEndedBlocks instead, since that is where the consequences actually happen. */
function checkBlockAlerts(){
  if(notifyPermission()!=='granted') return;
  const k=today(), d=S.days[k];
  if(!d||!d.blocks) return;
  const nm=nowMinutes()%1440;
  d.blocks.forEach(function(b){
    if(isEmptyBlock(b)) return;
    const s=toMin(b.start), label=b.focus||b.calTitle||'Untitled block';
    const lead=s-nm;
    if(lead===5) notifyOnce('soon-'+b.id,'Starting in 5 minutes',label+' at '+b.start);
    if(lead===0) notifyOnce('now-'+b.id,'Block starting now',label+' · '+b.start+'–'+(b.end||''));
  });
}
function makeUnit(o){
  return Object.assign({id:'u'+Date.now()+Math.floor(Math.random()*100000), text:'', kind:'task',
    envelope:'work', project:'Uncategorized', priority:null, starred:false, done:false, doneAt:null,
    day:null, blockId:null, futureBucket:null, bucket:'bank', order:Date.now(), estMin:null, paperId:null,
    parentId:null, subtaskIds:[],
    source:'manual', notionUrl:null, createdAt:Date.now(), elapsed:0, timerStart:null,
    sched:{type:'none'},
    mode:'simple', targetN:0, targetSec:0, doneN:0, timedN:0}, o);
}
/* one-time fold of the three old entity lists into S.tasks. Ids are carried across verbatim so
   every historical S.days[<date>].done / .qdone entry still points at a real item, and the habit
   streak grid keeps its history. The legacy arrays are left in place untouched rather than
   deleted, so restoring an older backup still works. */
function migrateToUnifiedItems(){
  if(S.unifiedAt) return;
  const have={}; S.tasks.forEach(function(t){ have[t.id]=true; });
  ITEMS.forEach(function(it){
    if(S.removed.indexOf(it.id)>=0||have[it.id]) return;
    S.tasks.push(makeUnit({id:it.id, text:it.name, kind:'ritual', type:it.type, bucket:'habit',
      ritual:S.moves[it.id]||it.ritual, movable:!!it.movable,
      envelope:'personal', project:'self-care', sched:{type:'daily'}, source:'seed'}));
  });
  (S.custom||[]).forEach(function(c){
    if(have[c.id]) return;
    S.tasks.push(makeUnit({id:c.id, text:c.name, kind:'ritual', type:'custom', bucket:'habit',
      ritual:S.moves[c.id]||c.ritual, envelope:'personal', project:'self-care',
      sched:{type:'daily'}, source:'custom'}));
  });
  (S.quests||[]).forEach(function(q){
    if(have[q.id]) return;
    S.tasks.push(makeUnit({id:q.id, text:q.name, kind:'quest', cat:q.cat, bucket:'quest', envelope:'personal',
      project:q.cat||'Uncategorized', sched:{type:'daily'}, source:'quest'}));
  });
  Object.keys(S.days).forEach(function(k){
    const d=S.days[k];
    if(!d.done) d.done={};
    if(d.qdone) Object.keys(d.qdone).forEach(function(id){ if(!d.done[id]) d.done[id]=d.qdone[id]; });
    if(!d.assign) d.assign={};
    if(d.questAssign) Object.keys(d.questAssign).forEach(function(id){ if(!d.assign[id]) d.assign[id]=d.questAssign[id]; });
    if(!d.skipped) d.skipped={};
  });
  S.unifiedAt=Date.now();
}
/* runs on every load, after every importer: anything that reached S.tasks by another route still
   ends up a well-formed unit */
/* Self-healing, and deliberately NOT gated on unifiedAt. migrateToUnifiedItems only ever runs
   once, so when a bad build wrote malformed rows into S.tasks the rebuild could never run again
   and the ritual items simply stayed gone. This runs on every single load instead: it discards
   anything that isn't a real unit and restores, by id, any ritual item or side quest that has
   gone missing. Because all history lives in S.days[<date>].done keyed by those same ids, the
   streaks and the habit grid come back the moment the definitions do. */
/* Everything a freshly-parsed state has to go through before it can be rendered. load() used to
   own this inline, which meant restoring a backup skipped all of it — so a pre-merge backup came
   back with no habits at all, because nothing ran the merge or the heal on it. */
function hydrateState(){
  backfillAffirm(); backfillTasks(); backfillPapers();
  backfillCategories(); backfillLayout(); backfillTheme(); backfillMovement(); backfillWeekNotes();
  backfillRitualDefs(); backfillBlockTypes();
  /* v:5 additions — each idempotent and null-safe, same convention as the ones above */
  backfillTxns(); backfillWaterGoal(); backfillMeals(); backfillFoodCats(); backfillLogEntries(); backfillPinning();
  backfillBlockRules();
  if(S.readGoal===undefined) S.readGoal=150;
  if(S.mediBestSec===undefined) S.mediBestSec=0;
  importNotionSeed(); repairNotionLinks(); migrateBlockTasksToUnified();
  migratePlanItemsToUnified();
  migrateToUnifiedItems(); normalizeUnits(); guessTaskModes();
  return healUnits();
}
function reportHeal(res){
  if(!res||(!res.restored&&!res.dropped)) return;
  setTimeout(function(){
    toast('Restored '+res.restored+' habit'+(res.restored===1?'':'s')+' \u00b7 your history was kept');
  },900);
}
function healUnits(){
  if(!Array.isArray(S.tasks)) S.tasks=[];
  const before=S.tasks.length;
  S.tasks=S.tasks.filter(function(t){
    return t && typeof t==='object' && typeof t.id==='string' && t.id.length>0;
  });
  const dropped=before-S.tasks.length;
  const have={}; S.tasks.forEach(function(t){ have[t.id]=true; });
  let restored=0;
  ITEMS.forEach(function(it){
    if((S.removed||[]).indexOf(it.id)>=0||have[it.id]) return;
    S.tasks.push(makeUnit({id:it.id, text:it.name, kind:'ritual', type:it.type, bucket:'habit',
      ritual:(S.moves||{})[it.id]||it.ritual, movable:!!it.movable,
      envelope:'personal', project:'self-care', sched:{type:'daily'}, source:'seed'}));
    have[it.id]=true; restored++;
  });
  (S.custom||[]).forEach(function(c){
    if(have[c.id]) return;
    S.tasks.push(makeUnit({id:c.id, text:c.name, kind:'ritual', type:'custom', bucket:'habit',
      ritual:(S.moves||{})[c.id]||c.ritual, envelope:'personal', project:'self-care',
      sched:{type:'daily'}, source:'custom'}));
    have[c.id]=true; restored++;
  });
  (S.quests||[]).forEach(function(q){
    if(have[q.id]) return;
    S.tasks.push(makeUnit({id:q.id, text:q.name, kind:'quest', cat:q.cat, bucket:'quest', envelope:'personal',
      project:q.cat||'Uncategorized', sched:{type:'daily'}, source:'quest'}));
    have[q.id]=true; restored++;
  });
  return {dropped:dropped, restored:restored};
}
/* last resort: the whole state as it was immediately before the merge ever ran */
async function restorePreUnify(){
  if(!storageAvailable()){ toast('Storage isn\u2019t available here'); return; }
  if(!arm('preunify')){ toast('Tap again to roll back to the pre-merge snapshot'); return; }
  armed=null;
  try{
    const r=await window.storage.get(KEY+'_pre_unify',false);
    const obj=r&&r.value?JSON.parse(r.value):null;
    if(!acceptVersion(obj)){ toast('No pre-merge snapshot saved'); return; }
    delete obj.unifiedAt;
    adoptState(obj);
    toast('Rolled back to the pre-merge snapshot');
  }catch(e){ toast('No pre-merge snapshot saved'); }
}
/* One-time pass over the tasks that predate modes. Deliberately conservative: it only promotes a
   task when the text states a target outright ("for 30 minutes", "15 chips"), and otherwise
   leaves it as the plain checkbox it already behaved like. It will get some wrong — the mode
   picker is one tap. */
function guessTaskModes(){
  if(S.modesGuessedAt) return;
  S.tasks.forEach(function(t){
    if(t.kind!=='task'||t.mode) return;
    const txt=String(t.text||'').toLowerCase();
    const cnt=txt.match(/\b(\d+)\s+(chips|cards|flashcards|problems|pages|papers|slides|units|reps|sets)\b/);
    const dur=txt.match(/for\s+(\d+)\s*(minutes|minute|mins|min|hours|hour|hrs|hr)\b/);
    let m='simple';
    if(cnt){ m='count'; t.targetN=parseInt(cnt[1],10); }
    else if(dur){
      const n=parseInt(dur[1],10);
      const sec=/^h/.test(dur[2])?n*3600:n*60;
      /* anything two hours or over is something you chip away at, not something you sit down and
         do in one go */
      m=sec>=2*3600?'cumulative':'timed';
      t.targetSec=sec;
    }
    else if(t.estMin&&t.estMin<=5) m='quick';
    t.mode=m;
  });
  S.modesGuessedAt=Date.now();
}
function normalizeUnits(){
  S.tasks.forEach(function(t){
    if(t.mode===undefined) t.mode='';   /* '' means "not yet guessed"; modeOf() reads it as simple */
    if(t.targetN===undefined) t.targetN=0;
    if(t.targetSec===undefined) t.targetSec=0;
    if(t.doneN===undefined) t.doneN=0;
    if(t.timedN===undefined) t.timedN=0;
    if(t.kind===undefined) t.kind='task';
    if(t.text===undefined) t.text=t.name||'(untitled)';
    if(t.sched===undefined) t.sched={type:'none'};
    if(t.doneAt===undefined) t.doneAt=null;
    if(t.elapsed===undefined) t.elapsed=0;
    if(t.timerStart===undefined) t.timerStart=null;
    /* bucket replaces the old implicit day/questDock/kind soup as the one source of truth for
       placement — derived once here from whatever legacy fields a pre-bucket row still carries,
       then questDock is retired for good (see plan: "clean up task/block data structures"). */
    if(t.bucket===undefined){
      if(t.kind==='ritual') t.bucket='habit';
      else if(t.kind==='quest') t.bucket='quest';
      else if(t.questDock) t.bucket='quest';
      else if(t.day==='FUTURE') t.bucket='future';
      else if(t.day) t.bucket='day';
      else t.bucket='bank';
    }
    delete t.questDock;
    if(t.order===undefined) t.order=t.createdAt||Date.now();
    if(t.parentId===undefined) t.parentId=null;
    if(!Array.isArray(t.subtaskIds)) t.subtaskIds=[];
  });
}
/* belt and braces: keep a copy of the pre-merge state under its own key, so there is a way back
   that doesn't depend on anyone having remembered to export first */
async function snapshotBeforeUnify(){
  if(S.unifiedAt||!storageAvailable()) return;
  try{ await window.storage.set(KEY+'_pre_unify', JSON.stringify(S), false); }catch(e){}
}
async function load(){
  let raw=null;
  if(storageAvailable()){
    /* a missing key throws rather than returning null, so a failed read simply means "no saved
       state yet" and falls through to the v3 check / blank state below */
    try{ const r=await window.storage.get(KEY,false); raw=r?r.value:null; }catch(e){ raw=null; }
  }
  if(raw){ try{ S=JSON.parse(raw); }catch(e){ S=blankState(); } if(!acceptVersion()) S=blankState();
    await snapshotBeforeUnify(); reportHeal(hydrateState()); save(); return; }
  /* no artifact storage here (e.g. this is the GitHub Pages deploy) - if a sync token is already
     saved in this browser, the repo's data branch is the durable store, so try it before ever
     falling back to the old v3 key or a blank state */
  if(ghConfigured()){
    const res=await ghPullResult();
    if(res.status==='ok'){ S=res.data; await snapshotBeforeUnify(); reportHeal(hydrateState()); save(); return; }
    if(res.status==='error'){
      /* the whole data-loss bug lived in this branch. Falling through from a *failed* read to
         blankState() and then reaching the save() at the bottom of load() is what pushed an empty
         file over good data. Come up blank but latched read-only instead: the page is usable and
         the error is on screen, and nothing this session does can reach GitHub until a pull
         succeeds (or the override in the sync panel is used deliberately). */
      S=blankState(); ghReadOnly=true; hydrateState();
      setTimeout(function(){
        toast('Could not load from GitHub — sync paused so nothing gets overwritten');
        renderSyncLine();
      },400);
      return;
    }
    /* 'absent' - the branch genuinely has no file yet, so a blank start is the right answer */
  }
  let oldRaw=null;
  if(storageAvailable()){
    try{ const r2=await window.storage.get(OLD_KEY,false); oldRaw=r2?r2.value:null; }catch(e){ oldRaw=null; }
  }
  if(oldRaw){ try{ S=migrateFromV3(JSON.parse(oldRaw)); }catch(e){ S=blankState(); } }
  else S=blankState();
  await snapshotBeforeUnify(); reportHeal(hydrateState()); save();
}
function save(){
  savePending=true;
  if(!saveTimer) saveTimer=setTimeout(flushSave,SAVE_DEBOUNCE_MS);
  scheduleGhPush();
  scheduleUndoCheckpoint();
}
/* ===================== undo/redo (Ctrl+Z) =====================
   Every discrete action in this app already funnels through save() exactly once per action —
   nothing mutates S on a per-second timer tick (elapsed time on running timers is computed
   lazily from a stored start timestamp at render time, not written every second), so a plain
   "diff against the last committed state" approach works without needing to special-case
   timers. Multiple save() calls that happen synchronously within one click (e.g. completing a
   ritual item that also completes the whole ritual and fires the seal bonus) are coalesced into
   a single undo step via a microtask flush, so one Ctrl+Z reverts the whole action. */
let undoStack=[], redoStack=[], lastSnapshot=null, pendingUndoFlush=false, suppressUndoTracking=false;
const UNDO_MAX=25;
function scheduleUndoCheckpoint(){
  if(suppressUndoTracking) return;
  if(pendingUndoFlush) return;
  pendingUndoFlush=true;
  Promise.resolve().then(flushUndoCheckpoint);
}
function flushUndoCheckpoint(){
  pendingUndoFlush=false;
  const now=JSON.stringify(S);
  if(lastSnapshot===null){ lastSnapshot=now; return; }
  if(now===lastSnapshot) return;
  undoStack.push(lastSnapshot);
  if(undoStack.length>UNDO_MAX) undoStack.shift();
  redoStack=[];
  lastSnapshot=now;
}
function repaintEverything(){
  render(); applyLayoutDom(); applyCollapsedDom(); applyTheme(); mediPaint();
}
function doUndo(){
  if(!undoStack.length){ toast('nothing to undo'); return; }
  redoStack.push(JSON.stringify(S));
  const prev=undoStack.pop();
  S=JSON.parse(prev);
  lastSnapshot=prev;
  suppressUndoTracking=true; save(); suppressUndoTracking=false;
  repaintEverything();
  toast('undone');
}
function doRedo(){
  if(!redoStack.length){ toast('nothing to redo'); return; }
  undoStack.push(JSON.stringify(S));
  const next=redoStack.pop();
  S=JSON.parse(next);
  lastSnapshot=next;
  suppressUndoTracking=true; save(); suppressUndoTracking=false;
  repaintEverything();
  toast('redone');
}
function dayKeyOf(d){ const x=new Date(d.getTime()); if(x.getHours()<ROLLOVER) x.setDate(x.getDate()-1);
  return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); }
function today(){ return dayKeyOf(new Date()); }
/* ===================== which day am I looking at? =====================
   viewDay stays null whenever we're on the real today, so nothing needs resetting at midnight.
   Everything that renders or mutates a day record goes through vday(). The things that are
   genuinely about "now" — streaks, the weekly earning cap, the auto-backup, the rollover check —
   deliberately keep calling today() directly. Earning is hard-blocked off-today (see earn), so
   ticking boxes while planning ahead or backfilling never moves money. */
let viewDay=null;
function vday(){ return viewDay||today(); }
function isViewingToday(){ return vday()===today(); }
function setViewDay(k){
  viewDay=(k===today())?null:k;
  panelOverride=undefined; manualRollup={}; /* expansion state is per-day; don't carry it across */
  if(daysBetween(today(),vday())>=0) buildGaps(vday());
  save(); render();
}
function shiftViewDay(n){ setViewDay(shiftKey(vday(),n)); }
function goToday(){ setViewDay(today()); }
function vdayLabel(){
  const p=vday().split('-').map(Number);
  const rel=daysBetween(today(),vday());
  if(rel===0) return 'Today';
  if(rel===1) return 'Tomorrow';
  if(rel===-1) return 'Yesterday';
  return new Date(p[0],p[1]-1,p[2]).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
}
function shiftKey(k,n){ const p=k.split('-').map(Number); const dt=new Date(p[0],p[1]-1,p[2]+n);
  return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0'); }
function daysBetween(a,b){ const p=a.split('-').map(Number),q=b.split('-').map(Number);
  return Math.round((new Date(q[0],q[1]-1,q[2])-new Date(p[0],p[1]-1,p[2]))/86400000); }
function day(k){ k=k||today();
  if(!S.days[k]) S.days[k]={water:0,log:[],done:{},blocks:[],ex:{},exLog:[],pagesLogged:0,pagesBy:{},bookLog:[],pomos:0,qdone:{},questAssign:{},goal:(S.waterGoal||100),meals:[]};
  const d=S.days[k];
  /* the water goal in force the day this record was created, frozen here on purpose: changing
     S.waterGoal today must not retroactively make a past day pass or fail its streak */
  if(d.goal===undefined) d.goal=S.waterGoal||100;
  if(!d.meals) d.meals=[];
  if(!d.pagesBy) d.pagesBy={};
  if(!d.qdone) d.qdone={};
  if(!d.questAssign) d.questAssign={};
  if(!d.assign) d.assign={};
  if(!d.skipped) d.skipped={};
  if(!d.exLog) d.exLog=[];
  if(!d.secs) d.secs={};
  if(!d.bookLog) d.bookLog=[];
  if(!d.plan) d.plan={items:[],notes:''};
  if(d.mediMin===undefined) d.mediMin=0;
  if(!d.skipped) d.skipped={};
  if(!d.assign) d.assign={};
  if(!d.focusSegs) d.focusSegs={};
  return d; }
function vessel(){ return S.vessels[S.vesselIdx]||S.vessels[0]||{name:'Cup',oz:20}; }
/* resize the cup in place rather than adding another vessel — the sheet offers one number, not a
   vessel picker, so editing it should change the cup you already use */
function setVesselOz(v){
  const n=Math.round(parseFloat(v)||0); if(n<=0) return;
  const ve=vessel(); ve.oz=n; save(); render();
}
function nowMinutes(){ const n=new Date(); const h=n.getHours()<ROLLOVER?n.getHours()+24:n.getHours(); return h*60+n.getMinutes(); }
function phase(){ const m=nowMinutes(); if(m<12*60) return 'sunrise'; if(m<17*60) return 'day'; return 'moonlight'; }
function reconcile(){
  const t=today();
  if(S.lastDate&&S.lastDate!==t){
    let k=S.lastDate;
    while(k!==t){
      const dd=S.days[k], got=dd?dd.water:0;
      if(got<goalOn(k)&&S.frozenDays.indexOf(k)<0&&S.freezes>0){ S.freezes--; S.frozenDays.push(k); }
      k=shiftKey(k,1); if(daysBetween(S.lastDate,k)>400) break;
    }
  }
  S.lastDate=t; recomputeStreak(); buildGaps(today()); save();
}
function waterGoal(){ return S.waterGoal||100; }
/* The goal that applies on a given day. Today and anything ahead of it track the live setting, so
   raising the goal takes effect immediately rather than tomorrow. Days already in the past read
   their own frozen snapshot (or the 100 that was hardcoded for all of history before v:5), so
   changing the goal can never retroactively make a past day pass or fail its streak. */
function goalOn(k){
  if(k>=today()) return waterGoal();
  const dd=S.days[k];
  return (dd&&dd.goal)||100;
}
function setWaterGoal(v){
  const n=Math.round(parseFloat(v)||0);
  if(n<=0) return;
  S.waterGoal=n;
  /* keep today's snapshot in step so that when today becomes the past, it freezes at the goal
     that was actually in force while it was being logged */
  const d=day(today()); d.goal=n;
  recomputeStreak(); save(); render();
}
function dayCounts(k){ const dd=S.days[k]; return (dd&&dd.water>=goalOn(k))||S.frozenDays.indexOf(k)>=0; }
function recomputeStreak(){ let k=today(),n=0; if(!dayCounts(k)) k=shiftKey(k,-1);
  while(dayCounts(k)){n++;k=shiftKey(k,-1);if(n>3000)break;} S.waterStreak=n; if(n>S.waterBest)S.waterBest=n; }
/* ===================== the unified item model =====================
   Ritual habits, side quests and tasks used to be three entities with three completion stores.
   They are now one record type living in S.tasks, told apart only by `kind`
   ('ritual' | 'quest' | 'task') — so every one of them gets the same timer, the same block
   assignment, the same schedule, and the same skip/delete controls. The three panels on screen
   are filtered views over that single list.
   Completion splits on whether something repeats, not on what kind it is:
     recurring -> per day, in S.days[<date>].done[id]
     one-off   -> the item's own `done` boolean, exactly as tasks always worked
   The migration preserves every existing id, so the day records you already have (and the habit
   streak grid that reads them) keep working untouched. */
const SCHED_NONE={type:'none'};
const DOW_LABELS=['sun','mon','tue','wed','thu','fri','sat'];
function schedOf(t){ return (t&&t.sched)||SCHED_NONE; }
function isRecurring(t){ return schedOf(t).type!=='none'; }
function dowOf(k){ const p=k.split('-').map(Number); return new Date(p[0],p[1]-1,p[2]).getDay(); }
function schedLabel(t){
  const sc=schedOf(t);
  if(sc.type==='daily') return 'daily';
  if(sc.type==='weekly'){
    const d=(sc.days||[]).slice().sort();
    if(!d.length) return 'weekly \u00b7 no days set';
    return (d.length>1?d.length+'\u00d7 weekly \u00b7 ':'')+d.map(function(n){return DOW_LABELS[n];}).join('/');
  }
  if(sc.type==='monthly') return 'monthly \u00b7 day '+(sc.dom||1);
  return '';
}
/* "2x weekly" is expressed as the two weekdays it lands on, so there's never any ambiguity about
   whether a given day counts toward the quota — the day either is one of yours or it isn't */
function dueOnDay(t,k){
  const sc=schedOf(t);
  if(sc.type==='daily') return true;
  if(sc.type==='weekly') return (sc.days||[]).indexOf(dowOf(k))>=0;
  if(sc.type==='monthly') return (+k.split('-')[2])===(sc.dom||1);
  return t.day===k;
}
function unitById(id){ return S.tasks.filter(function(t){return t.id===id;})[0]; }
/* what the planning backlog is actually for: one-off work you haven't placed yet. A habit is
   never "unassigned" — it recurs by definition — and a side quest already has its own dock. */
function isBacklogTask(t){ return t.kind==='task'&&t.bucket!=='quest'&&!t.parentId; }
/* ===================== task modes =====================
   "Task" was one label over five genuinely different interactions. They differ in what finishing
   even means, so they can't share one checkbox:
     quick      — under five minutes; tick and move on
     simple     — a checkbox with no timer pressure (read a paper, one homework problem)
     cumulative — hours pile up across many sittings toward a total (study Razavi for 10h)
     timed      — a duration to hit, counted down (yoga, 15 min)
     count      — a target quantity, which also yields a pace and a projection
                  (15/30 chips tested · ~80 min each · ~9h left)
   Only the last three carry a target; the first two are presentation. */
const TASK_MODES=[
  {id:'quick',      name:'quick',      hint:'under 5 minutes — tick and move on'},
  {id:'simple',     name:'simple',     hint:'a checkbox, no timer pressure'},
  {id:'cumulative', name:'hours',      hint:'hours add up across sittings toward a total'},
  {id:'timed',      name:'timed',      hint:'a duration to hit, counted down'},
  {id:'count',      name:'count',      hint:'a target quantity, with pace and a projection'}
];
function modeOf(t){
  const m=t&&t.mode;
  return TASK_MODES.some(function(x){return x.id===m;})?m:'simple';
}
function modeHasTarget(m){ return m==='cumulative'||m==='timed'||m==='count'; }
function isCountTask(t){ return modeOf(t)==='count'; }
/* the target, in whichever unit the mode measures: seconds for cumulative/timed, units for count */
function targetOf(t){
  const m=modeOf(t);
  if(m==='count') return Math.max(0,t.targetN||0);
  if(m==='cumulative'||m==='timed') return Math.max(0,t.targetSec||0);
  return 0;
}
function progressOf(t){
  const m=modeOf(t);
  if(m==='count') return Math.max(0,t.doneN||0);
  if(m==='cumulative'||m==='timed') return taskElapsed(t);
  return itemDone(t)?1:0;
}
function progressPct(t){
  const tgt=targetOf(t); if(!tgt) return itemDone(t)?100:0;
  return Math.max(0,Math.min(100,Math.round(progressOf(t)/tgt*100)));
}
/* how long one unit of a count task actually takes you. Only units logged with the timer running
   count toward the pace — a bare +1 still moves the bar, it just can't claim to know how long it
   took. Same rule as the habit session average, for the same reason. */
function paceSecPerUnit(t){
  const timed=Math.max(0,t.timedN||0);
  if(!timed) return 0;
  return Math.round((t.elapsed||0)/timed);
}
function remainingSecEstimate(t){
  const pace=paceSecPerUnit(t); if(!pace) return 0;
  return Math.max(0,targetOf(t)-progressOf(t))*pace;
}
function fmtHrs(sec){
  if(sec<60) return Math.round(sec)+'s';
  if(sec<3600) return Math.round(sec/60)+'m';
  const h=sec/3600;
  return (h<10?Math.round(h*10)/10:Math.round(h))+'h';
}
function ritualUnits(){ return S.tasks.filter(function(t){return t.kind==='ritual';}); }
function questUnits(){ return S.tasks.filter(function(t){return t.kind==='quest';}); }
function allItems(){ return ritualUnits(); }
function itemDef(id){ return unitById(id); }
function placementOf(id,k){ const dd=S.days[k||vday()]; return (dd&&dd.assign)?dd.assign[id]:undefined; }
/* Two different questions that used to share one answer, and had to be split once habits moved
   onto the timeline:
     ritualFamilyOf — which ritual does this habit BELONG to? Drives the seal, the streak grid,
       and the habit roster. Independent of where it's drawn.
     homeOf         — where is it DRAWN today? Normally its ritual's routine block on the
       calendar, unless it's been explicitly parked somewhere else for the day.
   Keeping these separate is what lets you drag a habit into an afternoon block for one day
   without it silently leaving the morning ritual it counts toward. */
function ritualFamilyOf(t,k){
  const p=placementOf(t.id,k||vday());
  if(isRitualId(p)) return p;
  return t.kind==='ritual'?t.ritual:null;
}
function routineBlockFor(r,k){
  const dd=S.days[k||vday()]; if(!dd) return null;
  return (dd.blocks||[]).filter(function(b){return b.routine===r;})[0]||null;
}
function homeOf(t,k){
  k=k||vday();
  const p=placementOf(t.id,k);
  if(p&&!isRitualId(p)) return p;
  const fam=p||(t.kind==='ritual'?t.ritual:null);
  if(!fam) return null;
  const rb=routineBlockFor(fam,k);
  return rb?rb.id:fam;
}
function itemSkipped(t,k){ const dd=S.days[k||vday()]; const id=(t&&t.id)||t; return !!(dd&&dd.skipped&&dd.skipped[id]); }
function itemDone(t,k){
  if(!t) return false;
  k=k||vday();
  if(isRecurring(t)){ const dd=S.days[k]; return !!(dd&&dd.done&&dd.done[t.id]); }
  return !!t.done;
}
function isDone(id){ return itemDone(unitById(id)); }
function doneTs(id){
  const t=unitById(id); if(!t) return undefined;
  if(isRecurring(t)){ const dd=S.days[vday()]; return dd&&dd.done?dd.done[id]:undefined; }
  return t.done?(t.doneAt||1):undefined;
}
/* every ritual item that belongs to this ritual today, skipped or not — the habit grid needs the
   full roster, whereas itemsFor() is the "what's actually on the list right now" view */
function ritualRoster(r){ const k=vday(); return ritualUnits().filter(function(t){ return ritualFamilyOf(t,k)===r; }); }
function itemsFor(r){
  const k=vday();
  return ritualUnits().filter(function(t){
    return ritualFamilyOf(t,k)===r && dueOnDay(t,k) && !itemSkipped(t,k);
  });
}
/* anything non-ritual that has been parked into a ritual for the day */
function ritualQuests(r){
  const k=vday();
  return S.tasks.filter(function(t){
    return t.kind!=='ritual' && placementOf(t.id,k)===r && !itemSkipped(t,k);
  });
}
function itemsForFull(r){ return itemsFor(r).concat(ritualQuests(r)); }
/* ===================== worst habit of the week =====================
   The daily ritual habit you've hit least often over the previous 7 completed days pays double
   while you rebuild it. Skipped days drop out of the denominator instead of counting as misses,
   and today is excluded so the highlight doesn't swing around as the day fills in. A tie means
   every tied habit gets it. If nothing has been missed, nobody gets a bonus. */
function worstHabitIds(){
  const pool=ritualUnits().filter(function(t){return schedOf(t).type==='daily';});
  if(pool.length<2) return {};
  const scores=pool.map(function(t){
    let hit=0, elig=0;
    for(let n=1;n<=7;n++){
      const k=shiftKey(today(),-n);
      if(itemSkipped(t,k)) continue;
      elig++;
      const dd=S.days[k];
      if(dd&&dd.done&&dd.done[t.id]) hit++;
    }
    return {id:t.id, ratio:elig?hit/elig:1};
  });
  let min=1;
  scores.forEach(function(sc){ if(sc.ratio<min) min=sc.ratio; });
  const out={};
  if(min>=1) return out;
  scores.forEach(function(sc){ if(sc.ratio===min) out[sc.id]=true; });
  return out;
}
function isWorstHabit(id){ return !!worstHabitIds()[id]; }
/* money formatting is still needed — for the budget tracker, which deals in real dollars */
function dollarsStr(cents){ return '$'+(Math.max(0,cents)/100).toFixed(2); }
/* ===================== inline edit / two-tap confirm ===================== */
let editing=null, armed=null;
function toggleEdit(id){ editing=editing===id?null:id; armed=null; render(); }
function arm(key){ if(armed===key){ armed=null; return true; } armed=key;
  setTimeout(function(){ if(armed===key){armed=null; render();} },3500); render(); return false; }
/* ===================== acting on an item (any kind) ===================== */
function toggleUnit(id,ev){
  if(ev&&ev.stopPropagation) ev.stopPropagation();
  const t=unitById(id); if(!t) return;
  const k=vday(), d=day(k), was=itemDone(t,k);
  if(was){
    if(t.type==='med'&&!arm('undo:'+id)) return;
    if(isRecurring(t)) delete d.done[id];
    else { t.done=false; t.doneAt=null; }
    armed=null;
  }else{
    /* a running timer has done its job the moment you tick the box — leaving it ticking silently
       in the background was inflating totals for hours after the fact */
    stopTimer(t,k);
    if(isRecurring(t)) d.done[id]=Date.now();
    else { t.done=true; t.doneAt=Date.now(); }
    celebrateBurst();
    if(t.blockId){ const b=blockOf(t.blockId);
      if(b&&isBlockCleared(b)){ celebrateBurst(true); toast('Block cleared \u2014 '+(b.focus||'untitled')); } }
  }
  save();
  /* the seal follows the ritual the habit belongs to, not the block it happens to be drawn in —
     otherwise moving your shower into an afternoon block for one day would quietly make the
     sunrise seal unreachable */
  const fam=ritualFamilyOf(t,k);
  if(!was&&isRitualId(fam)) checkSeal(fam);
  const el=document.getElementById('it-'+id);
  if(!was&&el){ el.classList.add('fading'); setTimeout(render,460); } else render();
}
/* skipping is not failing: the day drops out of the streak denominator entirely, so a deliberate
   rest day never shows up as a miss and never drags an item into the worst-habit slot */
function skipItem(id,ev){
  if(ev&&ev.stopPropagation) ev.stopPropagation();
  const t=unitById(id); if(!t) return;
  const k=vday(), d=day(k);
  if(d.skipped[id]){ delete d.skipped[id]; toast('Back on the list'); }
  else{
    if(itemDone(t,k)){ if(isRecurring(t)) delete d.done[id]; else t.done=false; }
    d.skipped[id]=Date.now();
    toast('Skipped for '+(isViewingToday()?'today':vdayLabel().toLowerCase())+' \u2014 streak safe');
  }
  save(); render();
}
function delUnit(id,ev){
  if(ev&&ev.stopPropagation) ev.stopPropagation();
  if(!arm('del:'+id)) return;
  const t=unitById(id);
  /* deleting a task takes its subtasks with it — otherwise they'd become invisible orphans
     (parentId pointing nowhere, never surfacing in the bank or anywhere else again) */
  const subIds=(t&&t.subtaskIds)||[];
  const doomed={}; doomed[id]=true; subIds.forEach(function(sid){ doomed[sid]=true; });
  S.tasks=S.tasks.filter(function(x){return !doomed[x.id];});
  /* also drop this id out of ITS OWN parent's subtaskIds, if it was a subtask itself */
  if(t&&t.parentId){ const parent=unitById(t.parentId); if(parent) parent.subtaskIds=(parent.subtaskIds||[]).filter(function(x){return x!==id;}); }
  /* Tombstone it in the legacy lists as well, otherwise healUnits does its job and faithfully
     restores it on the next load. "Delete permanently" has to mean permanently. */
  if(t){
    if(ITEMS.some(function(i){return i.id===id;})){
      if(!S.removed) S.removed=[];
      if(S.removed.indexOf(id)<0) S.removed.push(id);
    }
    S.custom=(S.custom||[]).filter(function(c){return c.id!==id;});
    S.quests=(S.quests||[]).filter(function(q){return q.id!==id;});
  }
  armed=null; save(); render();
}
/* legacy entry points, kept so every bit of existing markup still resolves */
function castItem(id){ toggleUnit(id); }
function uncast(id){ toggleUnit(id); }
function toggleQuest(id){ toggleUnit(id); }
function toggleTaskDone(id){ toggleUnit(id); }
function questDone(id){ return itemDone(unitById(id)); }
function delTask(id,ev){ delUnit(id,ev); }
function delQuest(id,ev){ delUnit(id,ev); }
function removeItem(id,ev){ delUnit(id,ev); }
function moveItem(id,ev){
  if(ev) ev.stopPropagation();
  const t=unitById(id); if(!t) return;
  const ids=(S.ritualDefs||[]).map(function(r){return r.id;});
  const cur=ids.indexOf(t.ritual);
  t.ritual=ids.length?ids[(cur+1+ids.length)%ids.length]:null;
  const d=day(vday()); if(d.assign) delete d.assign[id];
  toast('Moved to '+t.ritual); save(); render();
}
/* ===================== scheduling ===================== */
function schedEditorHTML(id){
  const t=unitById(id); if(!t) return '';
  const sc=schedOf(t);
  const full=['sun','mon','tue','wed','thu','fri','sat'];
  let h='<div class="schededit" onclick="event.stopPropagation()">';
  h+='<div class="schedhead">how often does this repeat?</div>';
  h+='<div class="schedrow seg">';
  [['none','one-off'],['daily','every day'],['weekly','certain days'],['monthly','monthly']].forEach(function(o){
    h+='<button class="schedbtn'+(sc.type===o[0]?' on':'')+'" onclick="setSchedType(\''+id+'\',\''+o[0]+'\')">'+o[1]+'</button>';
  });
  h+='</div>';
  if(sc.type==='weekly'){
    const on=(sc.days||[]);
    h+='<div class="schedrow days">'+full.map(function(lb,n){
      return '<button class="schedday'+(on.indexOf(n)>=0?' on':'')+'" title="'+lb+'" onclick="toggleSchedDay(\''+id+'\','+n+')">'+lb.charAt(0).toUpperCase()+'</button>';
    }).join('')+'</div>';
    h+='<div class="schedhint">'+(on.length
      ? '<b>'+on.length+'\u00d7 weekly</b> \u00b7 '+on.slice().sort().map(function(n){return full[n];}).join(', ')
      : 'tap the days it should land on \u2014 two days makes it a 2\u00d7 weekly habit')+'</div>';
  }
  if(sc.type==='monthly'){
    h+='<div class="schedrow"><span class="schedhint">on day</span>'+
       '<input type="number" class="schednum" min="1" max="28" value="'+(sc.dom||1)+'" onclick="event.stopPropagation()" onchange="setSchedDom(\''+id+'\',this.value)">'+
       '<span class="schedhint">of every month</span></div>'+
       '<div class="schedhint">capped at 28 so it lands in every month</div>';
  }
  if(sc.type==='daily') h+='<div class="schedhint">counts toward your habit streak, and can win the 2\u00d7 rebuild bonus</div>';
  if(sc.type==='none') h+='<div class="schedhint">a one-off \u2014 completed once, then done</div>';
  h+='<div class="schedrow"><button class="btn tiny ghost" onclick="toggleEdit(null)">done</button></div>';
  return h+'</div>';
}
/* ===================== placement for the day ===================== */
/* Placement has to follow the same split as completion: a recurring item is placed per day, in
   the day record, because it comes back tomorrow; a one-off task carries its own day/blockId,
   which is what today's list and blockTasksFor read. Writing a one-off into the per-day map
   instead would schedule it into thin air. */
function assignItemTo(id,target){
  const t=unitById(id); if(!t) return;
  const k=vday(), d=day(k);
  if(isRecurring(t)) d.assign[id]=target;
  else if(target==='day'){ t.day=k; t.blockId=null; t.futureBucket=null; t.bucket='day'; }
  else if(isRitualId(target)) d.assign[id]=target;
  else { t.day=k; t.blockId=target; t.futureBucket=null; t.bucket='day'; }
  save(); render();
}
function assignQuest(id,targetKey){ assignItemTo(id,targetKey); toast('Scheduled'); }
function unassignQuest(id,ev){
  if(ev)ev.stopPropagation();
  const t=unitById(id); if(!t) return;
  const d=day(vday());
  delete d.assign[id];
  if(!isRecurring(t)){ t.day=null; t.blockId=null; }
  save(); render();
}
function questAssignedTo(id){ return placementOf(id,vday())||null; }
function itemToNow(id,ev){ if(ev&&ev.stopPropagation) ev.stopPropagation();
  const bid=currentBlockId(); if(!bid){ toast('No blocks on this day yet'); return; }
  assignItemTo(id,bid);
  const b=blockOf(bid); toast('Now \u00b7 '+(b?b.start+(b.focus?' \u00b7 '+b.focus:''):''));
}
function itemToDay(id,ev){ if(ev&&ev.stopPropagation) ev.stopPropagation();
  assignItemTo(id,'day'); toast('On '+vdayLabel().toLowerCase());
}
function unitPlacement(t,k){
  k=k||vday();
  if(isRecurring(t)) return placementOf(t.id,k)||null;
  return t.day===k?(t.blockId||'day'):null;
}
function placementLabel(id){
  const t=unitById(id); if(!t) return '';
  const at=unitPlacement(t);
  if(!at) return '';
  if(isRitualId(at)) return ritualDefName(at);
  if(at==='day') return vdayLabel().toLowerCase();
  const b=blockOf(at); return b?b.start:'';
}
/* ONE control strip for every unit, everywhere. A button is only drawn when it would actually
   change something: no "now" when it's already in the current block, no "-> today" when it's
   already on the day (or repeats daily, so it always is), no skip on a one-off, no "back to the
   bank" when it's already there. */
/* Which actions sit on the row itself, by where the row is. Everything else moves behind one
   "more" toggle, so the common case is two taps' worth of buttons instead of eleven.
   Note that a row inside a time block is never offered the repeat schedule: a block is one slot
   on one particular day, so changing what an item repeats as from inside it reads like you're
   editing the block rather than the habit. */
/* the three surfaces of the planning tab: the bank, a day in the weekly strip, the future log */
function isPlanningCtx(ctx){ return ctx==='bank'||ctx==='plan'||ctx==='future'; }
function taskToFuture(id,ev){ if(ev&&ev.stopPropagation) ev.stopPropagation(); assignTaskToFuture(id,'month'); }
function unitPrimary(ctx){
  if(ctx==='block')  return ['timer','skip'];
  if(ctx==='ritual') return ['timer','skip'];
  if(ctx==='dock')   return ['timer','now','skip'];
  if(ctx==='bank'||ctx==='future') return ['timer','day'];
  return ['timer','now'];
}
function unitCtlHTML(t,ctx){
  ctx=ctx||'row';
  const k=vday(), id=t.id;
  const isArmDel=armed==='del:'+id;
  const delBtn='<button class="arrowbtn wide'+(isArmDel?' on':'')+'" title="delete permanently" onclick="delUnit(\''+id+'\',event)">'+(isArmDel?'tap again':'delete')+'</button>';
  /* §10 — a finished row is two things: what it cost you, and a way to be rid of it. It had an
     "undo" too, which was redundant (the checkbox already un-finishes it) and unreliable, since
     on row-click renderers it raced the row's own toggle handler. Undo now belongs solely to
     skipping, which has no checkbox of its own to reverse. */
  if(itemDone(t,k)){
    const el0=taskElapsed(t), logged=sessionSecsOn(id,k);
    let dh='';
    if(logged||el0>0)
      dh+='<button class="statechip" title="tap to correct the time logged for this" onclick="event.stopPropagation();toggleEdit(\'sess:'+id+'\')">'+mmss(logged||el0)+'</button>';
    return dh+delBtn;
  }
  if(itemSkipped(t,k)){
    return '<span class="statechip">skipped</span>'+
      '<button class="arrowbtn wide" title="put it back on the list" onclick="skipItem(\''+id+'\',event)">undo</button>'+delBtn;
  }
  /* ===================== the planning tab is for placing, not doing =====================
     A play button, a "now" button and an "@ today" chip are all about executing something in the
     moment — that's the today view's job. Here they were furniture you had to look past to see
     where a task was actually scheduled. What's left is the four moves (back to the bank, onto a
     day, on to the next day, out to the future log) and, behind "more", the three things worth
     configuring while planning: what kind of task it is, how it repeats, and its category. */
  if(isPlanningCtx(ctx)){
    const openMore=editing==='more:'+id;
    const placed=t.bucket!=='bank';
    let ph='';
    if(isRecurring(t)) ph+='<span class="statechip">'+schedLabel(t)+'</span>';
    if(placed)
      ph+='<button class="arrowbtn" title="back to the task bank" onclick="taskLeft(\''+id+'\',event)">←</button>';
    if(ctx==='bank')
      ph+='<button class="arrowbtn wide" title="pull it onto '+vdayLabel().toLowerCase()+'" onclick="itemToDay(\''+id+'\',event)">→ '+vdayLabel().toLowerCase()+'</button>';
    else
      ph+='<button class="arrowbtn" title="push it to the next day" onclick="taskRight(\''+id+'\',event)">→</button>';
    if(t.day!=='FUTURE')
      ph+='<button class="arrowbtn" title="file it in the future log" onclick="taskToFuture(\''+id+'\',event)">»</button>';
    ph+='<button class="morebtn'+(openMore?' on':'')+'" title="type, repeat, category" onclick="event.stopPropagation();toggleEdit(\'more:'+id+'\')">⋯</button>';
    ph+=reorderArrowsHTML(t);
    ph+='<button class="drag'+(isPicked(id)?' picked':'')+'" title="tap to pick it up, then tap a day or a block" onclick="pickTask(\''+id+'\',event)">⠿</button>';
    return ph;
  }
  const running=!!t.timerStart, sk=itemSkipped(t,k);
  const at=unitPlacement(t,k), nowId=currentBlockId();
  const inNow=!!at&&at===nowId;
  const onDay=isRecurring(t)?(dueOnDay(t,k)||!!at):(t.day===k);
  const el=taskElapsed(t), want=unitPrimary(ctx), open=editing==='more:'+id;
  /* only real tasks nest; a ritual habit or a side quest has no subtask model behind it */
  const isTask=t.kind==='task';
  let h='';
  /* state reads as text, not as more buttons competing for the eye */
  if(el>0||running) h+='<span class="tclock"'+(running?' data-timer-live-task="'+id+'"':'')+'>'+mmss(el)+'</span>';
  if(at&&ctx!=='block') h+='<span class="statechip">@ '+placementLabel(id)+'</span>';
  if(isRecurring(t)&&ctx!=='block') h+='<span class="statechip">'+schedLabel(t)+'</span>';
  if(sk) h+='<span class="statechip">skipped</span>';
  if(want.indexOf('timer')>=0)
    h+='<button class="timerbtn'+(running?' on':'')+'" title="start / stop the timer" onclick="toggleTaskTimerBank(\''+id+'\',event)">'+(running?'\u275a\u275a':'\u25b6')+'</button>';
  if(want.indexOf('now')>=0&&nowId&&!inNow)
    h+='<button class="arrowbtn wide" title="put it in the block happening right now" onclick="itemToNow(\''+id+'\',event)">now</button>';
  if(want.indexOf('day')>=0&&!onDay)
    h+='<button class="arrowbtn wide" title="put it on the day you\u2019re viewing" onclick="itemToDay(\''+id+'\',event)">\u2192 '+vdayLabel().toLowerCase()+'</button>';
  if(want.indexOf('skip')>=0&&isRecurring(t))
    h+='<button class="arrowbtn wide'+(sk?' on':'')+'" title="skip just this day \u2014 your streak stays safe" onclick="skipItem(\''+id+'\',event)">'+(sk?'unskip':'skip')+'</button>';
  /* subtasks used to be reachable only by opening ⋯ first, which made a core action feel like a
     hidden setting. This puts it on the row, showing the child count once there are any. */
  if(isTask){
    const nkids=subtasksOf(t).length;
    h+='<button class="subbtn'+(editing==='subs:'+id?' on':'')+'" title="subtasks" onclick="event.stopPropagation();toggleEdit(\'subs:'+id+'\')">+ sub'+(nkids?' \u00b7 '+nkids:'')+'</button>';
  }
  h+='<button class="morebtn'+(open?' on':'')+'" title="more actions" onclick="event.stopPropagation();toggleEdit(\'more:'+id+'\')">\u22ef</button>';
  h+=reorderArrowsHTML(t);
  h+='<button class="drag'+(isPicked(id)?' picked':'')+'" title="tap to pick it up, then tap a day or a block" onclick="pickTask(\''+id+'\',event)">\u283f</button>';
  return h;
}
/* the drawer behind the "more" button — labelled words, not a wall of glyphs */
function unitMoreHTML(t,ctx){
  ctx=ctx||'row';
  const k=vday(), id=t.id, want=unitPrimary(ctx);
  const at=unitPlacement(t,k), nowId=currentBlockId();
  const inNow=!!at&&at===nowId;
  const onDay=isRecurring(t)?(dueOnDay(t,k)||!!at):(t.day===k);
  const later=at&&at!=='day'&&!isRitualId(at)?nextBlockId(at):null;
  const isTask=t.kind==='task', isArm=armed==='del:'+id, sk=itemSkipped(t,k);
  if(isPlanningCtx(ctx)){
    let ph='<div class="moreacts" onclick="event.stopPropagation()">';
    if(isTask)
      ph+='<button class="moreact'+(editing==='mode:'+id?' on':'')+'" title="quick, simple, hours, timed, or a count" onclick="event.stopPropagation();toggleEdit(\'mode:'+id+'\')">◇ '+
          (TASK_MODES.filter(function(x){return x.id===modeOf(t);})[0]||{name:'simple'}).name+'</button>';
    ph+='<button class="moreact'+(editing==='sched:'+id?' on':'')+'" onclick="event.stopPropagation();toggleEdit(\'sched:'+id+'\')">⟳ repeat'+(isRecurring(t)?' · '+schedLabel(t):'')+'</button>';
    /* the bank is the main place you'd want this — it's where an unplanned task sits, and until
       now the only way out of it onto a specific weekday was a press-and-drag onto the strip */
    if(isTask)
      ph+='<button class="moreact'+(editing==='dayp:'+id?' on':'')+'" title="put it on a specific day" onclick="event.stopPropagation();toggleEdit(\'dayp:'+id+'\')">▦ plan a day</button>';
    if(isTask)
      ph+='<select class="moreact" onclick="event.stopPropagation()" onchange="setTaskProject(\''+id+'\',this.value)">'+categoryOptionsHTML(t.project)+'</select>';
    ph+='<button class="moreact danger'+(isArm?' on':'')+'" onclick="delUnit(\''+id+'\',event)">'+(isArm?'tap again to delete':'✕ delete')+'</button>';
    ph+='</div>';
    if(editing==='dayp:'+id) ph+=dayPickerHTML(id);
    if(isTask) ph+=subtaskRowsHTML(t);
    return ph;
  }
  let h='<div class="moreacts" onclick="event.stopPropagation()">';
  h+='<button class="moreact'+(t.starred?' on':'')+'" title="hard or high-friction \u2014 doubles the reward" onclick="toggleTaskStar(\''+id+'\',event)">'+(t.starred?'\u2605 hard':'\u2606 mark hard')+'</button>';
  if(ctx!=='block')
    h+='<button class="moreact'+(editing==='sched:'+id?' on':'')+'" onclick="event.stopPropagation();toggleEdit(\'sched:'+id+'\')">\u27f3 repeat'+(isRecurring(t)?' \u00b7 '+schedLabel(t):'')+'</button>';
  if(want.indexOf('now')<0&&nowId&&!inNow)
    h+='<button class="moreact" onclick="itemToNow(\''+id+'\',event)">\u2192 now</button>';
  if(want.indexOf('day')<0&&!onDay)
    h+='<button class="moreact" onclick="itemToDay(\''+id+'\',event)">\u2192 '+vdayLabel().toLowerCase()+'</button>';
  if(isTask)
    h+='<button class="moreact'+(editing==='dayp:'+id?' on':'')+'" title="put it on a specific day" onclick="event.stopPropagation();toggleEdit(\'dayp:'+id+'\')">\u25a6 plan a day</button>';
  h+='<button class="moreact'+(editing==='sess:'+id?' on':'')+'" title="type in a time you forgot to track" onclick="event.stopPropagation();toggleEdit(\'sess:'+id+'\')">\u23f1 log time'+(avgSessionSecs(id)?' \u00b7 avg '+mmss(avgSessionSecs(id)):'')+'</button>';
  if(later) h+='<button class="moreact" onclick="taskDown(\''+id+'\',event)">\u2193 next block</button>';
  /* only offer to unpin from a specific block. "Unpin from today" sat next to "back to the bank"
     doing very nearly the same job, so the pair just made you stop and work out the difference. */
  if(at&&at!=='day') h+='<button class="moreact" onclick="unassignQuest(\''+id+'\',event)">\u232b unpin from '+placementLabel(id)+'</button>';
  if(want.indexOf('skip')<0&&isRecurring(t))
    h+='<button class="moreact'+(sk?' on':'')+'" onclick="skipItem(\''+id+'\',event)">'+(sk?'unskip':'skip today')+'</button>';
  if(isTask){
    h+='<button class="moreact'+(editing==='mode:'+id?' on':'')+'" title="quick, simple, hours, timed, or a count" onclick="event.stopPropagation();toggleEdit(\'mode:'+id+'\')">\u25c7 '+
       (TASK_MODES.filter(function(x){return x.id===modeOf(t);})[0]||{name:'simple'}).name+'</button>';
    if(t.bucket!=='bank') h+='<button class="moreact" onclick="taskLeft(\''+id+'\',event)">\u2190 back to the bank</button>';
    if(t.bucket!=='quest') h+='<button class="moreact" onclick="taskToQuest(\''+id+'\',event)">\u2726 side quests</button>';
    h+='<span class="moreact" style="cursor:default">est <input type="number" class="estpill" min="0" step="5" placeholder="min" value="'+(t.estMin||'')+'" onclick="event.stopPropagation()" onchange="setTaskEst(\''+id+'\',this.value)"></span>';
    h+='<select class="moreact" onclick="event.stopPropagation()" onchange="setTaskProject(\''+id+'\',this.value)">'+categoryOptionsHTML(t.project)+'</select>';
  }
  h+='<button class="moreact danger'+(isArm?' on':'')+'" onclick="delUnit(\''+id+'\',event)">'+(isArm?'tap again to delete':'\u2715 delete')+'</button>';
  h+='</div>';
  if(isTask) h+=subtaskRowsHTML(t);
  return h;
}
function unitControlsHTML(t,ctx){ return '<span class="unitctl">'+unitCtlHTML(t,ctx)+'</span>'; }
/* The progress line for the three modes that carry a target. Quick and simple render nothing —
   they're a checkbox and shouldn't grow furniture. */
function unitProgressHTML(t){
  const m=modeOf(t);
  if(!modeHasTarget(m)) return '';
  const tgt=targetOf(t); if(!tgt) return '';
  const pct=progressPct(t), id=t.id;
  let read='', extra='';
  if(m==='count'){
    const pace=paceSecPerUnit(t), left=remainingSecEstimate(t);
    read=(t.doneN||0)+' / '+tgt;
    if(pace) extra=' · ~'+fmtHrs(pace)+' each · ~'+fmtHrs(left)+' left';
    else if((t.doneN||0)<tgt) extra=' · time a unit to get a pace';
  }else if(m==='cumulative'){
    read=fmtHrs(progressOf(t))+' / '+fmtHrs(tgt);
    const leftS=Math.max(0,tgt-progressOf(t));
    if(leftS) extra=' · '+fmtHrs(leftS)+' to go';
  }else{
    read=mmss(progressOf(t))+' / '+mmss(tgt);
  }
  let h='<div class="uprog">'+
    '<div class="bar'+(m==='count'?' aqua':(m==='timed'?' lav':' sun'))+'"><div class="fill" style="width:'+pct+'%"></div></div>'+
    '<span class="uprogread">'+read+'<span class="uprogextra">'+extra+'</span></span>';
  if(m==='count')
    h+='<span class="uprogbtns">'+
       '<button class="arrowbtn" title="one fewer" onclick="bumpCount(\''+id+'\',-1,event)">−</button>'+
       '<button class="arrowbtn" title="log one — with the timer running it also sets your pace" onclick="bumpCount(\''+id+'\',1,event)">+</button>'+
       '</span>';
  return h+'</div>';
}
/* the mode picker + its target field, shown inside the more-drawer */
function modeEditorHTML(id){
  const t=unitById(id); if(!t) return '';
  const m=modeOf(t);
  let h='<div class="schededit" onclick="event.stopPropagation()">';
  h+='<div class="schedhead">what kind of thing is this?</div><div class="schedrow seg">';
  TASK_MODES.forEach(function(o){
    h+='<button class="schedbtn'+(m===o.id?' on':'')+'" title="'+o.hint+'" onclick="setTaskMode(\''+id+'\',\''+o.id+'\',event)">'+o.name+'</button>';
  });
  h+='</div>';
  const cur=TASK_MODES.filter(function(x){return x.id===m;})[0];
  h+='<div class="schedhint">'+(cur?cur.hint:'')+'</div>';
  if(m==='count')
    h+='<div class="schedrow"><span class="schedhint">target</span>'+
       '<input type="number" class="schednum" min="1" value="'+(t.targetN||'')+'" onclick="event.stopPropagation()" onchange="setTaskTargetN(\''+id+'\',this.value)">'+
       '<span class="schedhint">units · logged so far <b>'+(t.doneN||0)+'</b>'+
       ((t.timedN||0)?', '+t.timedN+' of them timed':'')+'</span></div>';
  if(m==='timed')
    h+='<div class="schedrow"><span class="schedhint">goal</span>'+
       '<input type="number" class="schednum" min="1" value="'+(t.targetSec?Math.round(t.targetSec/60):'')+'" onclick="event.stopPropagation()" onchange="setTaskTargetTime(\''+id+'\',this.value)">'+
       '<span class="schedhint">minutes</span></div>';
  if(m==='cumulative')
    h+='<div class="schedrow"><span class="schedhint">goal</span>'+
       '<input type="number" class="schednum" min="0.5" step="0.5" value="'+(t.targetSec?Math.round(t.targetSec/360)/10:'')+'" onclick="event.stopPropagation()" onchange="setTaskTargetTime(\''+id+'\',this.value)">'+
       '<span class="schedhint">hours total, across as many sittings as it takes</span></div>';
  if(modeHasTarget(m)&&targetOf(t))
    h+='<div class="schedhint">progress pays as you go, up to what the whole task is worth</div>';
  h+='<div class="schedrow"><button class="btn tiny ghost" onclick="toggleEdit(null)">done</button></div>';
  return h+'</div>';
}
function checkSeal(r){
  const d=day(vday());
  const req=itemsFor(r).filter(function(t){return t.type==='core'||t.type==='med';});
  if(req.length&&req.every(function(t){return itemDone(t);})){
    const key='seal_'+r;
    if(!d.done[key]){ d.done[key]=Date.now(); save(); celebrateBurst(true);
      /* the ritual's home is its routine block on the timeline now, so that's what celebrates */
      const rb=routineBlockFor(r);
      const c=document.getElementById(rb?'tb-'+rb.id:'panel-'+r);
      if(c){ c.classList.remove('pulse'); void c.offsetWidth; c.classList.add('pulse'); }
      toast(r+' ritual complete'); }
  }
}
/* ===================== ritual item habit grid (any day, not just today) =====================
   The rituals UI above only ever reads/writes today's day() record. The habit grid needs to
   toggle a single item (e.g. "brush teeth") done/not-done for any of the last 7 days, so these
   are day-keyed equivalents of isDone/castItem/uncast/checkSeal. */
function itemDoneOnDay(itemId,dayKey){ const dd=S.days[dayKey]; return !!(dd&&dd.done&&dd.done[itemId]); }
function toggleItemOnDay(itemId,dayKey){
  const t=unitById(itemId); if(!t) return;
  const dd=day(dayKey);
  const wasDone=!!dd.done[itemId];
  if(wasDone) delete dd.done[itemId];
  else dd.done[itemId]=Date.now();
  const r=t.ritual;
  if(isRitualId(r)){
    const req=ritualRoster(r).filter(function(i){return i.type==='core'||i.type==='med';});
    const key='seal_'+r;
    const allDone=req.length>0&&req.every(function(i){return !!dd.done[i.id];});
    const hadSeal=!!dd.done[key];
    if(allDone&&!hadSeal) dd.done[key]=Date.now();
    else if(!allDone&&hadSeal) delete dd.done[key];
  }
  save(); render();
}
/* creating a habit, independent of which bit of UI asked for it */
function addRitualItem(r,raw){
  raw=(raw||'').trim(); if(!raw) return null;
  const t=addTask(raw,'personal','self-care');
  t.kind='ritual'; t.type='custom'; t.ritual=r; t.sched={type:'daily'}; t.bucket='habit';
  /* mirrored into the legacy list so healUnits can always put it back */
  if(!S.custom) S.custom=[];
  S.custom.push({id:t.id, name:raw, ritual:r, type:'custom'});
  save(); return t;
}
function addCustom(r){
  const el=document.getElementById('add-'+r); if(!el) return;
  if(addRitualItem(r,el.value)){ el.value=''; render(); }
}
function togglePanel(r){ manualPanel[r]=!panelExpanded(r); render(); }
/* side quests */
let manualPanel={};
/* which block's detail panel is showing, if any. undefined = no explicit choice yet (falls back
   to whichever block the clock is currently inside); a block id = that block is pinned open;
   false = explicitly closed, overriding even the current-block default. Only one panel shows at
   once now that expanding means "open a side drawer" instead of "grow inline". */
let panelOverride;
/* on a phone the detail panel is a full-screen drawer, so auto-opening the current block would
   mean landing on a block editor instead of the day. Desktop keeps the auto-open, where the panel
   is a 360px drawer alongside the timeline and costs nothing. Tapping a block still opens it. */
function isPhone(){ return typeof window!=='undefined'&&window.innerWidth<=760; }
function openBlockId(){
  if(panelOverride!==undefined) return panelOverride||null;
  if(isPhone()) return null;
  /* The panel used to spring open on the current block by default, which made sense when nothing
     else on screen said what you were meant to be doing. The desktop now leads with the focus
     card - same block, same tasks, same play button, and it doesn't cover anything. Opening a
     fixed drawer over the inbox to repeat it is just something to close, so on the desktop the
     panel is opened by clicking a block and not before. */
  if(isDesktopLayout()) return null;
  const d=day(vday());
  const curB=(d.blocks||[]).filter(function(b){return isCurrentBlock(b);})[0];
  return curB?curB.id:null;
}
function toggleBlock(id){ panelOverride=(openBlockId()===id)?false:id; render(); }
function closeBlockPanel(){ panelOverride=false; render(); }
/* rituals used to only be reachable through the habit streak card, tucked away in the more tab.
   This is the shortcut from anywhere — any view, any day you happen to be looking at — straight to
   today's real routine block on the timeline, panel already open. */
function openRitualToday(ritualId){
  viewMode='today';
  if(viewDay!==null){ viewDay=null; panelOverride=undefined; manualRollup={}; }
  buildGaps(today());
  const b=(day(today()).blocks||[]).filter(function(bl){return bl.routine===ritualId;})[0];
  panelOverride=b?b.id:undefined;
  save(); render();
  if(b){
    const el=document.getElementById('tb-'+b.id);
    if(el) el.scrollIntoView({behavior:'smooth',block:'center'});
  }
}
function ritualQuickIcon(rd){
  if(rd.id==='sunrise') return '🌅';
  if(rd.id==='moonlight') return '🌙';
  return '⏰';
}
function renderRitualQuickRow(){
  const el=document.getElementById('ritualQuickRow'); if(!el) return;
  el.innerHTML=(S.ritualDefs||[]).map(function(rd){
    return '<button class="ritualquickbtn" onclick="openRitualToday(\''+rd.id+'\')" title="jump to today’s '+
      String(rd.name).replace(/</g,'&lt;')+' · '+rd.start+'–'+rd.end+'">'+ritualQuickIcon(rd)+
      '<span class="rqlabel">'+String(rd.name).replace(/</g,'&lt;')+'</span></button>';
  }).join('');
}
function onQuestDragStart(ev,qid){ ev.dataTransfer.setData('text/plain',qid); ev.dataTransfer.effectAllowed='move'; }
function onDropQuest(ev,targetKey){ ev.preventDefault(); ev.currentTarget.classList.remove('drophover');
  const qid=ev.dataTransfer.getData('text/plain'); if(!qid) return; assignQuest(qid,targetKey); }
function addQuest(){
  const el=document.getElementById('newQuest'); const n=el.value.trim(); if(!n)return;
  const cat=document.getElementById('newQuestCat').value||QCATS[0];
  const t=addTask(n,'personal',cat);
  t.kind='quest'; t.cat=cat; t.sched={type:'daily'}; t.bucket='quest';
  /* mirror the definition into the legacy list so healUnits can always put it back */
  if(!S.quests) S.quests=[];
  S.quests.push({id:t.id, name:n, cat:cat});
  el.value=''; save(); render();
}
/* ===================== weekly plan ===================== */
function weekDatesOf(k){
  k=k||vday();
  const p=k.split('-').map(Number);
  const dt=new Date(p[0],p[1]-1,p[2]);
  const dow=dt.getDay(); // 0=Sun..6=Sat
  const mondayOffset=(dow===0)?-6:(1-dow);
  const arr=[];
  for(let i=0;i<7;i++) arr.push(shiftKey(k,mondayOffset+i));
  return arr;
}
function weekDates(){ return weekDatesOf(vday()); }
/* the Monday of a given day's week — also the storage key for that week's free-text note */
function weekKeyOf(k){ return weekDatesOf(k||vday())[0]; }
function planOf(k){ return day(k).plan; }
let manualPlanDay={};
function togglePlanDay(k){ const cur=manualPlanDay[k]!==undefined?manualPlanDay[k]:(k===vday()); manualPlanDay[k]=!cur; render(); }
/* Creates a REAL task assigned to that day, not a private plan-goal row. renderPlan already lists
   S.tasks for each day, so what you type into a day of the week now shows up in that day's view,
   its inbox, and every other surface — which is the whole point of typing it there. */
function addDayTask(k,inputId){
  const el=document.getElementById(inputId); if(!el) return;
  const txt=el.value.trim(); if(!txt) return;
  const t=addTask(txt,'work','Uncategorized');
  if(t){ t.day=k; save(); }
  el.value=''; render();
  requestAnimationFrame(function(){ const e2=document.getElementById(inputId); if(e2) e2.focus(); });
}
function addPlanItem(k){ addDayTask(k,'planIn-'+k); }
/* the inbox files into whichever day you're looking at, not always today */
function addTodayTask(){ addDayTask(vday(),'todayTaskIn'); }
function setPlanNotes(k,v){ planOf(k).notes=v; save(); }
/* ===================== task backlog ===================== */
const ENVELOPES=['work','personal'];
let manualEnvelope={}, taskBankCollapsed=false;
function toggleTaskBank(){ taskBankCollapsed=!taskBankCollapsed; render(); }
function toggleEnvelope(env){ const cur=manualEnvelope[env]!==undefined?manualEnvelope[env]:true; manualEnvelope[env]=!cur; render(); }
function taskById(id){ return S.tasks.filter(function(t){return t.id===id;})[0]; }
function addTask(text,envelope,project,priority){
  text=(text||'').trim(); if(!text) return null;
  /* built by makeUnit so a task created at runtime is the same shape as one that came through
     the migration — otherwise it silently lacks kind/sched and loses half its controls */
  const t=makeUnit({text:text, kind:'task',
    envelope:(envelope==='personal'?'personal':'work'),
    project:(project||'Uncategorized').trim()||'Uncategorized',
    priority:priority||null, source:'manual'});
  S.tasks.push(t); save(); return t;
}
function addTaskFromForm(){
  const txt=document.getElementById('newTaskText'); const env=document.getElementById('newTaskEnvelope'); const proj=document.getElementById('newTaskProject');
  if(!txt||!txt.value.trim()) return;
  addTask(txt.value,env?env.value:'work',proj?proj.value:'');
  txt.value=''; if(proj) proj.value=''; render();
}
/* one add form per envelope — the envelope is implied by which form you typed into */
function addTaskInEnvelope(env){
  const txt=document.getElementById('newTaskText-'+env);
  const proj=document.getElementById('newTaskProject-'+env);
  if(!txt||!txt.value.trim()) return;
  addTask(txt.value,env,proj?proj.value:'');
  txt.value=''; render();
  requestAnimationFrame(function(){ const e2=document.getElementById('newTaskText-'+env); if(e2) e2.focus(); });
}
function setTaskProject(id,v){ const t=taskById(id); if(!t) return; const nv=(v||'').trim(); t.project=nv||'Uncategorized'; save(); render(); }
function setTaskText(id,v){ const t=taskById(id); if(!t) return; const nv=(v||'').trim(); t.text=nv||t.text; save(); render(); }
function setTaskEst(id,v){
  const t=taskById(id); if(!t) return;
  const n=parseInt(v,10);
  t.estMin=(isFinite(n)&&n>0)?n:null;
  save(); render();
}
/* ===================== subtasks ===================== */
/* a subtask is just a normal bank task with parentId set — subtaskIds on the parent is only the
   denormalized, order-respecting display list, kept in sync by these two functions rather than
   left for every call site to maintain the invariant itself. */
function subtasksOf(t){ return (t.subtaskIds||[]).map(function(id){return taskById(id);}).filter(Boolean).sort(byOrder); }
function addSubtask(parentId,text){
  const parent=taskById(parentId); if(!parent) return null;
  text=(text||'').trim(); if(!text) return null;
  const sub=addTask(text,parent.envelope,parent.project);
  sub.parentId=parentId;
  if(!Array.isArray(parent.subtaskIds)) parent.subtaskIds=[];
  parent.subtaskIds.push(sub.id);
  save(); return sub;
}
function unlinkSubtask(id,ev){
  if(ev) ev.stopPropagation();
  const t=taskById(id); if(!t||!t.parentId) return;
  const parent=taskById(t.parentId);
  if(parent) parent.subtaskIds=(parent.subtaskIds||[]).filter(function(x){return x!==id;});
  t.parentId=null;
  save(); render();
}
function quickAddSubtask(parentId){
  const el=document.getElementById('subIn-'+parentId); if(!el) return;
  if(addSubtask(parentId,el.value)){ el.value=''; render(); }
}
/* Renders a task's children, and *their* children, to any depth. The model always supported this
   — makeUnit() has created parentId/subtaskIds since the unified-item migration — but the render
   was capped at one level by a `!t.parentId` guard at both call sites, so a sub-subtask existed in
   state and was simply never drawn.
   MAX_NEST is a cycle guard, not a product limit: subtaskIds is hand-editable state and a task
   that ends up its own ancestor would otherwise recurse until the stack gives out. */
const MAX_NEST=8;
function subtaskRowsHTML(t,depth){
  depth=depth||0;
  if(depth>=MAX_NEST) return '';
  const subs=subtasksOf(t);
  let h='<div class="subtasks" onclick="event.stopPropagation()">';
  subs.forEach(function(s){
    const dn=itemDone(s);
    const kids=subtasksOf(s).length;
    h+='<div class="subrow'+(dn?' done':'')+'">'+
       '<input type="checkbox"'+(dn?' checked':'')+' onchange="toggleUnit(\''+s.id+'\')">'+
       '<span class="tt" contenteditable="true" onblur="setTaskText(\''+s.id+'\',this.textContent)">'+String(s.text).replace(/</g,'&lt;')+'</span>'+
       (kids?'<span class="nestcount" title="'+kids+' subtask'+(kids===1?'':'s')+'">'+kids+'</span>':'')+
       '<button class="rowbtn" style="opacity:.5" onclick="unlinkSubtask(\''+s.id+'\',event)" title="remove subtask">✕</button>'+
       '</div>';
    /* each child gets the same treatment, indented one step by .subtasks' own left padding */
    h+=subtaskRowsHTML(s,depth+1);
  });
  h+='<div class="addtiny"><input id="subIn-'+t.id+'" placeholder="add a subtask, press enter…" maxlength="80" onkeydown="if(event.key===\'Enter\'){event.preventDefault();quickAddSubtask(\''+t.id+'\')}">'+
     '<button class="btn tiny soft" onclick="quickAddSubtask(\''+t.id+'\')">+</button></div>';
  return h+'</div>';
}
function toggleTaskStar(id,ev){
  if(ev)ev.stopPropagation();
  const t=taskById(id); if(!t) return;
  t.starred=!t.starred;
  save(); render();
}
/* ===================== task modes: setters ===================== */
function setTaskMode(id,m,ev){
  if(ev&&ev.stopPropagation) ev.stopPropagation();
  const t=unitById(id); if(!t) return;
  if(!TASK_MODES.some(function(x){return x.id===m;})) return;
  t.mode=m;
  /* give a freshly-promoted task a sensible target so the bar isn't stuck at 0% with no way in */
  if(m==='count'&&!t.targetN) t.targetN=10;
  if((m==='timed'||m==='cumulative')&&!t.targetSec) t.targetSec=(m==='timed'?15*60:5*3600);
  save(); render();
}
function setTaskTargetN(id,v){
  const t=unitById(id); if(!t) return;
  const n=parseInt(v,10);
  t.targetN=(isFinite(n)&&n>0)?n:0;
  save(); render();
}
/* entered in minutes for a timed task, hours for a cumulative one — those are the units you'd
   actually say out loud for each */
function setTaskTargetTime(id,v){
  const t=unitById(id); if(!t) return;
  const n=parseFloat(v);
  const mult=modeOf(t)==='cumulative'?3600:60;
  t.targetSec=(isFinite(n)&&n>0)?Math.round(n*mult):0;
  save(); render();
}
function bumpCount(id,delta,ev){
  if(ev&&ev.stopPropagation) ev.stopPropagation();
  const t=unitById(id); if(!t||!isCountTask(t)) return;
  const tgt=targetOf(t);
  if(delta>0){
    /* a unit finished with the timer running is a *timed* unit, and only those feed the pace.
       A bare +1 still moves the bar — it just can't claim to know how long it took. */
    if(t.timerStart){ stopTimer(t); t.timedN=(t.timedN||0)+1; }
    t.doneN=(t.doneN||0)+1;
    if(tgt&&t.doneN>=tgt&&!itemDone(t)){
      t.done=true; t.doneAt=Date.now(); celebrateBurst(true);
      toast(String(t.text)+' — all '+tgt+' done');
    }
  }else{
    t.doneN=Math.max(0,(t.doneN||0)-1);
    if((t.timedN||0)>t.doneN) t.timedN=t.doneN;
    if(itemDone(t)&&tgt&&t.doneN<tgt){ t.done=false; t.doneAt=null; }
  }
  save(); render();
}
function assignTaskToDay(id,dayKey){
  const t=taskById(id); if(!t) return;
  t.day=dayKey; t.blockId=null; t.futureBucket=null; t.bucket='day'; save(); render(); toast('Scheduled for '+dayKey);
}
function unassignTaskDay(id,ev){ if(ev)ev.stopPropagation();
  const t=taskById(id); if(!t) return; t.day=null; t.blockId=null; t.futureBucket=null; t.bucket='bank'; save(); render(); }
function assignTaskToBlock(id,blockId){
  const t=taskById(id); if(!t||t.day!==vday()) return; /* a task can only pin to a block on its own day */
  t.blockId=blockId; t.bucket='day'; save(); render(); toast('Pinned to block');
}
/* the week grid drops onto days other than the one being viewed, so the day moves with the pin -
   a task pinned to Thursday's 2pm block belongs to Thursday. assignTaskToBlock keeps its stricter
   same-day rule because in the day view a cross-day pin would only ever be a mistake. */
function assignTaskToBlockOnDay(id,blockId,dayKey){
  const t=taskById(id); if(!t) return;
  t.day=dayKey; t.blockId=blockId; t.bucket='day';
  save(); render();
  toast('Pinned to '+dayKey.slice(5)+' block');
}
function onWeekBlockDrop(ev,dayKey,blockId){
  ev.preventDefault(); ev.stopPropagation();
  ev.currentTarget.classList.remove('drophover');
  const taskId=ev.dataTransfer.getData('text/task');
  if(taskId){ assignTaskToBlockOnDay(taskId,blockId,dayKey); return; }
  const qid=ev.dataTransfer.getData('text/plain');
  if(qid){ setViewDay(dayKey); assignQuest(qid,blockId); }
}
/* Pull an existing bank task straight into a block. assignTaskToBlock() alone can't do this: it
   guards on the task already being on the block's day, which a bank task never is. This sets the
   day and the block together, which is what "pull it in from the bank" actually means.
   It exists because on a phone the only non-drag route into a block was the "now" button, and
   that only ever targets the block running right now — there was no tap path into tomorrow's
   2pm block. */
function pullTaskIntoBlock(id,blockId,ev){
  if(ev&&ev.stopPropagation) ev.stopPropagation();
  const t=taskById(id), b=blockOf(blockId);
  if(!t||!b) return;
  t.day=vday(); t.blockId=blockId; t.futureBucket=null; t.bucket='day';
  save(); render(); toast('Pulled into '+(b.focus||'the block'));
}
/* A tap path to "put this on Thursday". Dragging a chip onto the week strip already worked, but
   drag was the ONLY way to reach a specific weekday: the row buttons offer "now" and "the day
   you're viewing" and nothing else, so on a phone a deliberate press-hold-drag was required for
   something as ordinary as moving a task to Friday. */
function dayPickerHTML(id){
  const t=taskById(id); if(!t) return '';
  const L=['S','M','T','W','T','F','S'];
  let h='<div class="daypick" onclick="event.stopPropagation()">';
  for(let i=0;i<7;i++){
    const k=shiftKey(today(),i);
    const p=k.split('-').map(Number), d=new Date(p[0],p[1]-1,p[2]);
    const on=t.day===k;
    h+='<button class="dpday'+(on?' on':'')+'" onclick="pickTaskDay(\''+id+'\',\''+k+'\',event)" title="'+k+'">'+
       '<span class="dpl">'+(i===0?'TODAY':L[d.getDay()])+'</span>'+
       '<span class="dpn">'+d.getDate()+'</span></button>';
  }
  h+='<button class="dpday dpclear" onclick="unassignTaskDay(\''+id+'\',event)" title="back to the bank">'+
     '<span class="dpl">BANK</span><span class="dpn">\u232b</span></button>';
  return h+'</div>';
}
function pickTaskDay(id,k,ev){
  if(ev&&ev.stopPropagation) ev.stopPropagation();
  assignTaskToDay(id,k);
  editing=null; render();
}
/* the unassigned bank, minus anything already placed — what's actually pullable right now */
function pullableBankTasks(){
  return S.tasks.filter(function(t){ return isBacklogTask(t)&&!t.day&&!itemDone(t); }).sort(byOrder);
}
function unassignTaskBlock(id,ev){ if(ev)ev.stopPropagation();
  const t=taskById(id); if(!t) return; t.blockId=null; save(); render(); }
const FUTURE_BUCKETS=['blocked','month','year'];
function assignTaskToFuture(id,bucket){
  const t=taskById(id); if(!t) return;
  t.day='FUTURE'; t.blockId=null; t.bucket='future'; t.futureBucket=(FUTURE_BUCKETS.indexOf(bucket)>=0?bucket:'month');
  save(); render(); toast('Filed under '+t.futureBucket);
}
function assignTaskToQuestDock(id){
  const t=taskById(id); if(!t) return;
  t.day=null; t.blockId=null; t.futureBucket=null; t.bucket='quest';
  save(); render(); toast('Sent to side quests');
}
function taskToQuest(id,ev){ if(ev)ev.stopPropagation(); assignTaskToQuestDock(id); }
function onTaskDragStart(ev,id){ ev.dataTransfer.setData('text/task',id); ev.dataTransfer.effectAllowed='move'; }
function onDayDrop(ev,dayKey){
  ev.preventDefault(); ev.currentTarget.classList.remove('drophover');
  const taskId=ev.dataTransfer.getData('text/task'); if(!taskId) return;
  assignTaskToDay(taskId,dayKey);
}
function onFutureDrop(ev,bucket){
  ev.preventDefault(); ev.currentTarget.classList.remove('drophover');
  const taskId=ev.dataTransfer.getData('text/task'); if(!taskId) return;
  assignTaskToFuture(taskId,bucket);
}
function onBlockDrop(ev,blockId){
  ev.preventDefault(); ev.currentTarget.classList.remove('drophover');
  const taskId=ev.dataTransfer.getData('text/task');
  if(taskId){ assignTaskToBlock(taskId,blockId); return; }
  const qid=ev.dataTransfer.getData('text/plain'); if(!qid) return; assignQuest(qid,blockId);
}
function onQuestDockTaskDrop(ev){
  ev.preventDefault(); ev.currentTarget.classList.remove('drophover');
  const taskId=ev.dataTransfer.getData('text/task'); if(!taskId) return;
  assignTaskToQuestDock(taskId);
}
/* a task can only ever be legitimately pinned to a block on its own day (assignTaskToBlock
   enforces this going forward), but a task assigned before this fix — or any future edge case
   where day/blockId drift apart — should never bleed into a different day's timeline just
   because a block id happens to match. Belt-and-suspenders alongside the day-scoped auto ids. */
function blockTasksFor(b,k){ k=k||vday(); return S.tasks.filter(function(t){return t.blockId===b.id&&t.day===k;}); }
/* ===================== add a block from the + button =====================
   The timeline is a static picture of the day: it never creates anything by being dragged or
   long-pressed on, because both gestures collide with scrolling a tall grid on a phone. Blocks
   come from this button (and from the + on a collapsed open stretch, which is the same call with
   the gap's own start time already filled in).
   The default start is the next clean half-hour that isn't already inside a real block, so the
   common case is one tap and done. */
function nextFreeStart(){
  const d=day(vday());
  const real=(d.blocks||[]).filter(function(b){ return !isUnassignedBlock(b); });
  let m=isViewingToday()?Math.ceil((nowMinutes()%1440)/30)*30:9*60;
  if(m<DAY_START) m=DAY_START;
  for(let guard=0; guard<48 && m<DAY_END; guard++){
    const clash=real.some(function(b){ return m>=toMin(b.start)&&m<toMin(b.end||fromMin(toMin(b.start)+60)); });
    if(!clash) return fromMin(m);
    m+=30;
  }
  return fromMin(Math.min(m,DAY_END-60));
}
/* the strip above the day doubles as the placement prompt, so a picked task always says where it
   can go and how to let go of it */
function renderDayRailHint(){
  const el=document.getElementById('dayRailHint');
  if(!el) return;
  const t=pickedTask();
  el.innerHTML=t?('<span class="picking">PLACING: '+String(t.text).replace(/</g,'&lt;')+
    '</span> <button class="pickcancel" onclick="clearPick()">cancel</button>'):'';
}
function addBlockPrompt(){
  createBlockAt(nextFreeStart(),60);
}
/* ===================== week grid =====================
   Seven day columns against one shared time axis. It reads S.days[k].blocks directly — no new
   state, no cache — so a block edited here and a block edited on the day timeline are the same
   record. Tapping empty space creates a block at that time on that day; tapping a block opens it
   on its own day. */
let weekGridOpen=false;
function openWeekGrid(){ weekGridOpen=true; render(); }
function closeWeekGrid(){ weekGridOpen=false; render(); }
function weekGridDays(){
  /* the Sunday-based week containing the day you're looking at, matching the header strip */
  const p=vday().split('-').map(Number), dt=new Date(p[0],p[1]-1,p[2]);
  const start=new Date(dt); start.setDate(dt.getDate()-dt.getDay());
  const out=[];
  for(let i=0;i<7;i++){
    const d2=new Date(start); d2.setDate(start.getDate()+i);
    out.push(d2.getFullYear()+'-'+String(d2.getMonth()+1).padStart(2,'0')+'-'+String(d2.getDate()).padStart(2,'0'));
  }
  return out;
}
const WG_PX_PER_MIN=0.62;
function wgTop(min){ return Math.round((min-DAY_START)*WG_PX_PER_MIN); }
function createBlockOnDay(dayKey,startTime){
  const d=day(dayKey);
  const id='b'+Date.now();
  d.blocks.push({id:id, start:startTime, end:fromMin(toMin(startTime)+60), focus:'', notes:'', type:'open', category:null});
  d.blocks.sort(function(a,b){return toMin(a.start)-toMin(b.start);});
  save();
  /* jump to that day with the new block open, which is what you wanted if you tapped empty space */
  weekGridOpen=false; setViewDay(dayKey); panelOverride=id; render();
}
function wgEmptyTap(dayKey,ev){
  const host=ev.currentTarget;
  const r=host.getBoundingClientRect();
  const y=(ev.clientY!==undefined?ev.clientY:0)-r.top;
  /* same 15-minute grid the day view uses, so a block made here lines up with one made there */
  let m=DAY_START+floor15(y/WG_PX_PER_MIN);
  m=Math.max(DAY_START,Math.min(DAY_END-15,m));
  if(pickedTaskId){ toast('Pick a block, not empty space'); return; }
  createBlockOnDay(dayKey,fromMin(m));
}
function wgOpenBlock(dayKey,blockId,ev){
  if(ev&&ev.stopPropagation) ev.stopPropagation();
  if(pickedTaskId){
    /* placing needs the task and the block on the same day, so switch first, then place */
    setViewDay(dayKey);
    placePickedInBlock(blockId);
    weekGridOpen=false; render();
    return;
  }
  weekGridOpen=false; setViewDay(dayKey); panelOverride=blockId; render();
}
/* The week calendar has two homes: the phone's full-screen overlay (#weekGrid, opened from the
   day rail) and the week tab on the desktop (#weekCal), where it is the main event rather than
   something you open on top of things. Same markup, same handlers, one implementation - the only
   difference is the chrome around it, which is why the head/foot are parameterised instead of
   the grid being rebuilt for each. */
function renderWeekGrid(){
  renderWeekCalInto('weekCal');
  const host=document.getElementById('weekGrid');
  if(!host) return;
  if(!weekGridOpen){ host.style.display='none'; host.innerHTML=''; return; }
  host.style.display='flex';
  const days=weekGridDays(), tk=today();
  const L=['S','M','T','W','T','F','S'];
  const height=wgTop(DAY_END);
  let axis='';
  for(let m=DAY_START;m<=DAY_END;m+=120) axis+='<span class="wgh" style="top:'+wgTop(m)+'px">'+fromMin(m).slice(0,2)+'</span>';
  let cols='';
  days.forEach(function(k,i){
    const p=k.split('-').map(Number), dt=new Date(p[0],p[1]-1,p[2]);
    const dd=S.days[k];
    let boxes='';
    ((dd&&dd.blocks)||[]).filter(function(b){ return !isUnassignedBlock(b); }).forEach(function(b){
      const st=Math.max(DAY_START,toMin(b.start));
      const en=Math.min(DAY_END,toMin(b.end||fromMin(toMin(b.start)+60)));
      const col=blockColor(b);
      const label=String(b.focus||b.calTitle||'').replace(/</g,'&lt;');
      const wsettled=isBlockSettled(b,k);
      boxes+='<div class="wgblk'+(pickedTaskId?' armed':'')+(wsettled?' settled':'')+'" '+
        'style="top:'+wgTop(st)+'px;height:'+Math.max(14,wgTop(en)-wgTop(st))+'px;'+
        'background:'+col.bg+';border-color:'+col.edge+'" onclick="wgOpenBlock(\''+k+'\',\''+b.id+'\',event)" '+
        'ondragover="onBlockDragOver(event,this)" ondragleave="onBlockDragLeave(event,this)" '+
        'ondrop="onWeekBlockDrop(event,\''+k+'\',\''+b.id+'\')" '+
        'title="'+b.start+'–'+(b.end||'')+' '+label+'">'+
        (wsettled?'<span class="wgchk">✓</span>':'')+
        '<span class="wgt">'+label+'</span></div>';
    });
    cols+='<div class="wgcol'+(k===tk?' today':'')+(k===vday()?' sel':'')+'">'+
      '<div class="wgcolhead"><span class="wgl">'+L[dt.getDay()]+'</span><span class="wgn">'+dt.getDate()+'</span>'+
      '<span class="wgs">'+Math.round(dayScore(k)*100)+'</span></div>'+
      '<div class="wgbody" style="height:'+height+'px" onclick="wgEmptyTap(\''+k+'\',event)">'+boxes+'</div>'+
      '</div>';
  });
  weekCalCache={axis:axis, cols:cols, height:height, days:days};
  host.innerHTML=
    '<div class="wghead"><div><div class="wgttl">WEEK GRID</div>'+
      '<div class="wgrange">'+days[0].slice(5)+' – '+days[6].slice(5)+'</div></div>'+
      '<div class="wgnav"><button onclick="shiftViewDay(-7)">←</button>'+
      '<button onclick="shiftViewDay(7)">→</button>'+
      '<button onclick="closeWeekGrid()">✕</button></div></div>'+
    '<div class="wgscroll"><div class="wggrid">'+
      '<div class="wgaxis" style="height:'+height+'px">'+axis+'</div>'+cols+
    '</div>'+
    '<div class="wgfoot">'+(pickedTaskId?'tap a block to place the picked task':'tap empty space to add a block · tap a block to open it')+'</div>'+
    '</div>';
}
let weekCalCache=null;
/* the week tab's copy: no overlay chrome, and it renders whether or not the overlay is open */
function renderWeekCalInto(hostId){
  const host=document.getElementById(hostId);
  if(!host) return;
  if(viewMode!=='planning'){ host.innerHTML=''; return; }
  const days=weekGridDays(), tk=today();
  const L=['S','M','T','W','T','F','S'];
  const height=wgTop(DAY_END);
  let axis='';
  /* 12-hour marks: "6a" fits the narrow axis where "06:00" was clipped to ":00", and unlike a
     bare 2-digit hour it still distinguishes morning from evening */
  for(let m=DAY_START;m<=DAY_END;m+=60){
    const h=Math.floor(m/60)%24;
    axis+='<span class="wgh" style="top:'+wgTop(m)+'px">'+((h%12)||12)+(h<12?'a':'p')+'</span>';
  }
  let cols='';
  days.forEach(function(k){
    const p=k.split('-').map(Number), dt=new Date(p[0],p[1]-1,p[2]);
    const dd=S.days[k];
    const blocks=((dd&&dd.blocks)||[]).filter(function(b){ return !isUnassignedBlock(b); });
    const lanes=layoutLanes(blocks);
    let boxes='';
    blocks.forEach(function(b){
      const st=Math.max(DAY_START,toMin(b.start));
      const en=Math.min(DAY_END,toMin(b.end||fromMin(toMin(b.start)+60)));
      const col=blockColor(b);
      const label=String(b.focus||b.calTitle||'').replace(/</g,'&lt;');
      const ln=lanes[b.id]||{lane:0,lanes:1}, w=100/Math.max(1,ln.lanes);
      const settled=isBlockSettled(b,k);
      const n=blockAllTasks(b,k).length;
      boxes+='<div class="wgblk'+(settled?' settled':'')+'" '+
        'style="top:'+wgTop(st)+'px;height:'+Math.max(15,wgTop(en)-wgTop(st))+'px;'+
        'left:calc('+(ln.lane*w).toFixed(3)+'% + 1px);width:calc('+w.toFixed(3)+'% - 2px);'+
        'background:'+col.bg+';border-color:'+col.edge+'" '+
        'onclick="wgOpenBlock(\''+k+'\',\''+b.id+'\',event)" '+
        'ondragover="onBlockDragOver(event,this)" ondragleave="onBlockDragLeave(event,this)" '+
        'ondrop="onWeekBlockDrop(event,\''+k+'\',\''+b.id+'\')" '+
        'title="'+b.start+'–'+(b.end||'')+' '+label+'">'+
        (settled?'<span class="wgchk">✓</span>':'')+
        '<span class="wgt">'+label+'</span>'+
        (n?'<span class="wgn2">'+n+'</span>':'')+'</div>';
    });
    cols+='<div class="wgcol'+(k===tk?' today':'')+(k===vday()?' sel':'')+'">'+
      '<div class="wgcolhead" onclick="setViewDay(\''+k+'\')"><span class="wgl">'+L[dt.getDay()]+'</span>'+
      '<span class="wgn">'+dt.getDate()+'</span>'+
      '<span class="wgs">'+Math.round(dayScore(k)*100)+'</span></div>'+
      '<div class="wgbody" style="height:'+height+'px" onclick="wgEmptyTap(\''+k+'\',event)">'+boxes+'</div>'+
      '</div>';
  });
  host.innerHTML=
    '<div class="wcbar"><div class="wcttl">week of '+days[0].slice(5)+' – '+days[6].slice(5)+'</div>'+
      '<div class="wcnav"><button onclick="shiftViewDay(-7)">← prev</button>'+
      '<button onclick="goToday()">this week</button>'+
      '<button onclick="shiftViewDay(7)">next →</button></div></div>'+
    '<div class="wchint">click empty time to add a 15-minute block · drag a task from the bank onto a block to pin it</div>'+
    '<div class="wcscroll"><div class="wggrid">'+
      '<div class="wgaxis" style="height:'+height+'px">'+axis+'</div>'+cols+
    '</div></div>';
}
/* ===================== planning: the sticky week banner =====================
   Seven days pinned above the task bank. With nothing picked, tapping a day opens that day's list
   of tasks; with a task picked, the days light up and tapping one plans it there. Sticky because
   the whole point is to still be able to reach a day after scrolling down the bank to find the
   task you wanted to plan. */
let openPlanDay=null;
function togglePlanDayList(k){ openPlanDay=(openPlanDay===k)?null:k; render(); }
function planBannerTap(k,ev){
  if(ev&&ev.stopPropagation) ev.stopPropagation();
  /* set the target day BEFORE placing: placePickedOnDay() renders, and assigning after it would
     leave the list closed until something else happened to trigger another render */
  if(pickedTaskId){ openPlanDay=k; placePickedOnDay(k); return; }
  togglePlanDayList(k);
}
function renderPlanBanner(){
  const host=document.getElementById('planBanner');
  if(!host) return;
  const L=['S','M','T','W','T','F','S'], tk=today();
  const picked=pickedTask();
  let cells='';
  for(let i=0;i<7;i++){
    const k=shiftKey(tk,i);
    const p=k.split('-').map(Number), dt=new Date(p[0],p[1]-1,p[2]);
    const n=S.tasks.filter(function(t){return t.day===k&&!itemDone(t);}).length;
    cells+='<button class="pbday'+(picked?' armed':'')+(k===tk?' today':'')+(openPlanDay===k?' open':'')+'" '+
      'onclick="planBannerTap(\''+k+'\',event)" title="'+k+'">'+
      '<span class="pbl">'+(i===0?'TODAY':L[dt.getDay()])+'</span>'+
      '<span class="pbn">'+dt.getDate()+'</span>'+
      '<span class="pbc">'+(n||'')+'</span></button>';
  }
  let list='';
  if(openPlanDay){
    const items=S.tasks.filter(function(t){return t.day===openPlanDay;}).sort(byOrder);
    list='<div class="pblist"><div class="pblisthead">'+
      '<span>'+openPlanDay+' · '+items.length+' task'+(items.length===1?'':'s')+'</span>'+
      '<button onclick="openDay(\''+openPlanDay+'\')">open day</button>'+
      '<button onclick="togglePlanDayList(\''+openPlanDay+'\')">✕</button></div>'+
      (items.length?items.map(function(t){return taskRowHTML(t,'plan');}).join('')
        :'<div class="qempty">nothing planned for this day yet</div>')+
      '</div>';
  }
  host.innerHTML='<div class="pbhint">'+(picked?('PLACING: '+String(picked.text).replace(/</g,'&lt;')+' — tap a day')
    :'tap a task, then a day · tap a day to see its list')+'</div>'+
    '<div class="pbdays">'+cells+'</div>'+list;
}
/* ===================== tap to place =====================
   One picked task at a time, then tap where it goes. Drag still works everywhere it did, but a
   drag needs a press-and-hold on a phone and cannot cross a scroll boundary, so every placement
   target now also answers a plain tap: blocks on the day timeline, days in the planning banner,
   columns in the week grid.
   The pick lives in a module variable rather than in S — it is interaction state, not user data,
   and it should not survive a reload or sync to another device. */
let pickedTaskId=null;
function pickedTask(){ return pickedTaskId?(taskById(pickedTaskId)||unitById(pickedTaskId)):null; }
function isPicked(id){ return pickedTaskId===id; }
/* A click that landed on a real control inside the row is that control's click, not a pick.
   `.ring` and `.hsdot` are in the list because they are clickable DIVs, not buttons — the tick
   circle on a bank chip is a div with its own onclick, so without naming it here ticking a task
   off would also pick it up, and you'd tick something and silently arm a placement. */
const PICK_IGNORE='button,input,select,textarea,a,[contenteditable="true"],.ring,.hsdot,.subrow';
function fromControl(ev){
  const el=ev&&(ev.target||ev.srcElement);
  return !!(el&&el.closest&&el.closest(PICK_IGNORE));
}
function pickTask(id,ev){
  /* the handle IS a button, so it has to be allowed to call this even though the guard below
     rejects clicks that came from buttons — it opts in explicitly by passing no event */
  const viaHandle=ev&&ev.target&&ev.target.closest&&ev.target.closest('.drag');
  if(!viaHandle&&fromControl(ev)) return;
  if(ev&&ev.stopPropagation) ev.stopPropagation();
  pickedTaskId=(pickedTaskId===id)?null:id;
  render();
}
function clearPick(){ if(pickedTaskId){ pickedTaskId=null; render(); } }
/* placing into a block from a pick has to work from anywhere — the task may be in the bank with
   no day at all, on another day, or already in a different block on this one */
function placePickedInBlock(blockId,ev){
  if(ev&&ev.stopPropagation) ev.stopPropagation();
  const t=pickedTask(); if(!t) return false;
  const b=blockOf(blockId); if(!b) return false;
  if(t.kind==='ritual'||t.kind==='quest'){ assignItemTo(t.id,blockId); }
  else { t.day=vday(); t.blockId=blockId; t.futureBucket=null; t.bucket='day'; }
  pickedTaskId=null; save(); render();
  toast('Placed in '+(b.focus||b.calTitle||'the block'));
  return true;
}
function placePickedOnDay(dayKey,ev){
  if(ev&&ev.stopPropagation) ev.stopPropagation();
  const t=pickedTask(); if(!t) return false;
  assignTaskToDay(t.id,dayKey);
  pickedTaskId=null; render();
  return true;
}
/* ===================== within-list reordering (arrows + drag) =====================
   order is only ever compared against siblings in the exact same place — the task bank, one
   block's task list, the inbox, a side-quest category — so a swap or a drop only ever touches the
   two rows actually involved, never a global renumber. */
function byOrder(a,b){ return (a.order||0)-(b.order||0); }
/* Everything sharing one block on a given day, whatever kind it is — the rows you actually see
   listed together inside that block. Rituals resolve through homeOf() rather than a raw blockId,
   because a habit lands in its routine block by derivation, without anyone assigning it there day
   by day. */
function unitsInBlock(blockId,k){
  k=k||vday();
  return S.tasks.filter(function(x){
    if(itemSkipped(x,k)) return false;
    if(x.kind==='ritual') return homeOf(x,k)===blockId&&dueOnDay(x,k);
    if(x.blockId===blockId&&x.day===k) return true;
    return placementOf(x.id,k)===blockId;
  });
}
function siblingGroup(t){
  /* Reordering inside a block comes first, because a block mixes kinds: a routine block holds
     ritual habits, an ordinary one holds tasks, and either can also hold a placed side quest.
     Grouping by bucket alone got this wrong in a way that showed: ritual units carry
     bucket:'habit', which had no case at all below, so siblingGroup returned [t] — sibs.length<2
     — and reorderArrowsHTML rendered nothing. Routine items simply could not be reordered, by
     arrow or by drag, since onTaskRowDrop consults the same grouping.
     Ordering lives on the unit's own `order`, not per day, so a routine you arrange once keeps
     that arrangement every following day. */
  const k=vday();
  const home=(t.kind==='ritual')?homeOf(t,k)
    :((t.blockId&&t.day===k)?t.blockId:placementOf(t.id,k));
  if(home&&blockOf(home)) return unitsInBlock(home,k);
  /* a ritual whose routine block doesn't exist on this day still reorders within its family */
  if(t.kind==='ritual'){
    const fam=ritualFamilyOf(t,k);
    if(fam) return ritualUnits().filter(function(x){ return ritualFamilyOf(x,k)===fam&&dueOnDay(x,k); });
  }
  /* the bank's visual grouping is envelope -> project, so "up"/"down" only ever compares against
     the exact chips shown in that same sub-list, not the whole bank */
  if(t.bucket==='bank') return S.tasks.filter(function(x){return x.bucket==='bank'&&x.envelope===t.envelope&&(x.project||'Uncategorized')===(t.project||'Uncategorized');});
  if(t.bucket==='day') return S.tasks.filter(function(x){return x.bucket==='day'&&x.day===t.day&&x.blockId===t.blockId;});
  if(t.bucket==='future') return S.tasks.filter(function(x){return x.bucket==='future'&&x.futureBucket===t.futureBucket;});
  if(t.bucket==='quest'){
    if(t.kind==='quest') return S.tasks.filter(function(x){return x.kind==='quest'&&(x.cat||'admin')===(t.cat||'admin');});
    return S.tasks.filter(function(x){return x.kind==='task'&&x.bucket==='quest';});
  }
  return [t];
}
/* Give a sibling group distinct, evenly spaced order values, but only when it needs it.
   Why this is necessary: makeUnit() defaults `order` to Date.now(), and anything created in one
   pass — the ritual seed, the unified-items migration, a bulk import — gets the SAME millisecond
   for every record. Swapping two identical values is a no-op, and the drop path's midpoint
   (prev.order+target.order)/2 lands back on the value it started from, so reordering silently did
   nothing for any group born together.
   Array.prototype.sort is stable, so sorting a tied group preserves the order already on screen:
   normalizing writes down the arrangement you can currently see, then the caller moves one row
   within it. */
function normalizeOrders(sibs){
  const sorted=sibs.slice().sort(byOrder);
  const distinct={}; let dupes=false;
  sorted.forEach(function(x){ if(distinct[x.order]) dupes=true; distinct[x.order]=true; });
  if(dupes) sorted.forEach(function(x,i){ x.order=(i+1)*1000; });
  return sorted;
}
function moveUnit(id,dir,ev){
  if(ev) ev.stopPropagation();
  const t=taskById(id)||unitById(id); if(!t) return;
  const sibs=normalizeOrders(siblingGroup(t));
  const i=sibs.findIndex(function(x){return x.id===id;});
  const j=i+dir;
  if(i<0||j<0||j>=sibs.length) return;
  const tmp=sibs[i].order; sibs[i].order=sibs[j].order; sibs[j].order=tmp;
  save(); render();
}
function reorderArrowsHTML(t){
  const sibs=siblingGroup(t).slice().sort(byOrder);
  if(sibs.length<2) return '';
  const i=sibs.findIndex(function(x){return x.id===t.id;});
  return '<button class="arrowbtn" title="move up"'+(i<=0?' disabled':'')+' onclick="moveUnit(\''+t.id+'\',-1,event)">↑</button>'+
         '<button class="arrowbtn" title="move down"'+(i>=sibs.length-1?' disabled':'')+' onclick="moveUnit(\''+t.id+'\',1,event)">↓</button>';
}
/* dropping one row directly onto another (same list) inserts the dragged row just before the
   target, by splitting the gap between the target and whatever's already before it — same idea as
   the arrow swap above, just driven by a drop instead of a click. Cross-container drops (onto a
   block/day/future-log/dock) are unaffected; those go through the assignTaskTo* handlers below. */
function onTaskRowDrop(ev,targetId){
  /* quests reorder the same way tasks do, just carried in the 'text/plain' slot instead of
     'text/task' (see onQuestDragStart) — taskById/unitById cover either, and an unrelated
     'text/plain' payload (e.g. a dashboard-card drag) simply won't resolve to a real unit below */
  const id=ev.dataTransfer.getData('text/task')||ev.dataTransfer.getData('text/plain');
  if(!id||id===targetId) return; /* let it bubble to the container */
  const t=taskById(id), target=taskById(targetId); if(!t||!target) return;
  const sibs=normalizeOrders(siblingGroup(target));
  /* dragged from a different list entirely — don't handle it here, let it bubble up to whatever
     container drop handler (onBlockDrop/onDayDrop/...) actually reassigns its placement */
  if(!sibs.some(function(x){return x.id===id;})) return;
  ev.preventDefault(); ev.stopPropagation();
  if(ev.currentTarget&&ev.currentTarget.classList) ev.currentTarget.classList.remove('drophover');
  const ti=sibs.findIndex(function(x){return x.id===targetId;});
  const prev=sibs[ti-1];
  t.order=prev?(prev.order+target.order)/2:target.order-1;
  save(); render();
}
function firstBlockId(){
  const d=day(vday()); const sorted=d.blocks.slice().sort(function(a,b){return toMin(a.start)-toMin(b.start);});
  return sorted.length?sorted[0].id:null;
}
/* the quick-move actions available on every task row — down/right/left mirror the calendar's
   spatial layout (next block / next day / back to bank); the quest-dock button is a 4th, separate
   placement any task can be sent to. */
function taskDown(id,ev){ if(ev)ev.stopPropagation();
  const t=taskById(id); if(!t||t.day!==vday()){ toast('Assign it to this day first'); return; }
  if(!t.blockId){ const fb=firstBlockId(); if(!fb){toast('No blocks today');return;} t.blockId=fb; t.bucket='day'; save(); render(); return; }
  const nb=nextBlockId(t.blockId); if(!nb){ toast('No later block today'); return; }
  t.blockId=nb; save(); render();
}
function taskRight(id,ev){ if(ev)ev.stopPropagation();
  const t=taskById(id); if(!t) return;
  const base=(t.day&&t.day!=='FUTURE')?t.day:today();
  t.day=shiftKey(base,1); t.blockId=null; t.futureBucket=null; t.bucket='day'; save(); render(); toast('Moved to '+t.day);
}
function taskLeft(id,ev){ if(ev)ev.stopPropagation();
  const t=taskById(id); if(!t) return;
  t.day=null; t.blockId=null; t.futureBucket=null; t.bucket='bank'; save(); render(); toast('Back in the task bank');
}
/* the block the clock is sitting in right now (or, if we're between blocks, the next one up).
   On any day other than today there is no "now", so this falls back to that day's first block. */
function currentBlockId(){
  const d=day(vday());
  const sorted=d.blocks.slice().sort(function(a,b){return toMin(a.start)-toMin(b.start);});
  if(!sorted.length) return null;
  if(!isViewingToday()) return sorted[0].id;
  const cur=sorted.filter(isCurrentBlock)[0];
  if(cur) return cur.id;
  const nm=nowMinutes()%1440;
  const next=sorted.filter(function(b){return toMin(b.start)>=nm;})[0];
  return next?next.id:sorted[sorted.length-1].id;
}
/* one tap: take this task and drop it into the block that's happening right now */
function taskToNow(id,ev){ itemToNow(id,ev); }
/* the sibling of taskToNow: onto the day itself rather than a particular block */
function unitToDay(id,ev){ itemToDay(id,ev); }
/* one tap: pull a task out of the bank onto the day currently on screen */
function taskToViewedDay(id,ev){ itemToDay(id,ev); }
function openDay(k){ viewMode='today'; setViewDay(k); }
function toggleTaskTimerBank(id,ev){ if(ev)ev.stopPropagation();
  const t=taskById(id); if(!t) return;
  if(t.timerStart){
    stopTimer(t);
    const m=modeOf(t), tgt=targetOf(t);
    /* clocking up to your goal IS finishing a timed or cumulative task — there's nothing left to
       tick once the hours are in */
    if((m==='timed'||m==='cumulative')&&tgt&&taskElapsed(t)>=tgt&&!itemDone(t)){
      t.done=true; t.doneAt=Date.now(); celebrateBurst(true);
      toast(String(t.text)+' — '+fmtHrs(tgt)+' logged');
    }
  }
  else t.timerStart=Date.now();
  save(); render();
}
/* ===================== water ===================== */
function addWater(kind,amtOverride){
  const d=day(vday()), v=vessel().oz; let amt=0;
  if(kind==='half') amt=Math.round(v/2);
  else if(kind==='full') amt=v;
  else if(kind==='custom') amt=Math.round(amtOverride||0);
  else if(kind==='undo'){
    const last=d.log.length?d.log.pop():0; if(!last){toast('Nothing to undo');return;}
    d.water=Math.max(0,d.water-last);
    recomputeStreak(); save(); render(); return;
  }
  if(!amt) return;
  const before=d.water; d.water+=amt; d.log.push(amt);
  celebrateBurst();
  const goal=goalOn(vday());
  if(before<goal&&d.water>=goal){ recomputeStreak();
    glow('waterCard'); celebrateBurst(true); toast(goal+' oz — '+S.waterStreak+' day streak'); }
  if(before<FREEZE_AT&&d.water>=FREEZE_AT&&S.freezes<MAX_FREEZE){ S.freezes++;
    toast('Freeze token earned ('+S.freezes+'/'+MAX_FREEZE+')'); }
  save(); render();
}
function submitCustomOz(){
  const el=document.getElementById('customOzIn'); const n=Math.round(parseFloat(el.value)||0);
  if(n>0){ editing=null; addWater('custom',n); } }
function submitVessel(){
  const n=document.getElementById('vesNameIn').value.trim();
  const oz=Math.round(parseFloat(document.getElementById('vesOzIn').value)||0);
  if(!n||!oz)return;
  S.vessels.push({name:n,oz:oz}); S.vesselIdx=S.vessels.length-1;
  editing=null; save(); render();
}
function setVessel(i){ S.vesselIdx=+i; save(); render(); }
let cupClickTimer=null;
function cupClick(){
  if(cupClickTimer){ clearTimeout(cupClickTimer); cupClickTimer=null; addWater('full'); return; }
  cupClickTimer=setTimeout(function(){ cupClickTimer=null; addWater('half'); },260);
}
function fmtCups(n){ return (n%1===0)?String(n):n.toFixed(1); }
/* ===================== work blocks + calendar ===================== */
function hhmm(dt){ const x=new Date(dt); return String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0'); }
function toMin(s){ const p=s.split(':').map(Number); return p[0]*60+p[1]; }
function fromMin(m){ m=((m%1440)+1440)%1440; return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); }
function blockDur(b){ let e=toMin(b.end||fromMin(toMin(b.start)+60)), s=toMin(b.start); if(e<=s)e+=1440; return e-s; }
function overlaps(s1,e1,s2,e2){ return s1<e2&&s2<e1; }
function isCurrentBlock(b){ if(!isViewingToday()) return false; const nm=nowMinutes()%1440; const s=toMin(b.start); let e=s+blockDur(b); return nm>=s&&nm<e; }
function isPastBlock(b){ return isPastBlockOn(b,vday()); }
/* the same question, but about a stated day rather than the one on screen. The week grid draws
   seven days at once, and asking isPastBlock() there measured every one of them against the
   viewed day's clock - so on a Monday afternoon, Thursday morning's blocks came back "past" and
   the whole rest of the week rendered ticked off and struck through. */
function isPastBlockOn(b,k){
  const rel=daysBetween(today(),k||vday());
  if(rel>0) return false;  /* a future day hasn't happened yet */
  if(rel<0) return true;   /* a past day is entirely behind us */
  const nm=nowMinutes()%1440; const s=toMin(b.start); const e=s+blockDur(b); return e<=nm;
}
function isEmptyBlock(b){ return !b.focus&&!(b.notes&&b.notes.trim())&&!blockQuests(b).length&&!blockTasksFor(b).length&&!b.category; }
/* rituals and quests parked into a block for the day. Plain tasks are excluded because they
   already pin to a block via t.blockId — this keeps a task from showing up twice. */
function blockQuests(b){
  const k=vday();
  return S.tasks.filter(function(t){
    if(itemSkipped(t,k)) return false;
    /* a habit lands in its routine block without anyone having to assign it there day by day,
       so homeOf (not the raw placement map) is the right question to ask for rituals */
    if(t.kind==='ritual') return homeOf(t,k)===b.id&&dueOnDay(t,k);
    return placementOf(t.id,k)===b.id;
  });
}
function isBlockCleared(b){
  if(!isPastBlock(b)) return false; /* a block can't be cleared until its time has actually passed */
  const quests=blockQuests(b), btasks=blockTasksFor(b);
  const total=quests.length+btasks.length;
  const done=quests.filter(function(q){return itemDone(q);}).length+btasks.filter(function(t){return itemDone(t);}).length;
  return done===total; /* no tasks/quests at all still counts as cleared, once the time has passed */
}
/* every task actually pinned to this block for the day, rituals/quests included, as one list.
   blockQuests and blockTasksFor deliberately cover different halves (see the comment on
   blockQuests) and nearly every caller wants both, so the union lives here rather than being
   re-derived at each call site. */
function blockAllTasks(b,k){
  k=k||vday();
  /* blockQuests reads the viewed day internally, so it only speaks for the day on screen - for
     any other day the pinned-task half is the honest answer on its own */
  return (k===vday()?blockQuests(b):[]).concat(blockTasksFor(b,k));
}
/* "everything in here is done", independent of whether the time has passed - isBlockCleared()
   answers the narrower "past AND done" question and is kept as-is because the rollup grouping
   relies on that meaning. */
function isBlockFinished(b,k){
  const all=blockAllTasks(b,k);
  if(!all.length) return false;   /* an empty block isn't an accomplishment */
  return all.every(function(t){ return itemDone(t,k); });
}
/* a block is settled once its time is up or its work is done - this is what earns the tick and
   the strike-through on the label */
function isBlockSettled(b,k){ return isPastBlockOn(b,k||vday())||isBlockFinished(b,k); }
/* ---------- when a block's time runs out ----------
   A block is a commitment to a stretch of clock time, so when that time is gone the block is
   over whether or not the work inside it happened. Three consequences, all here so they can
   never drift apart:
     1. anything still unchecked goes back to the day's inbox. Leaving it pinned to a block that
        has already ended hides it - the block rolls up into the "earlier today" summary and the
        task silently goes with it. Only the pin is cleared; t.day stays, so it lands in the
        inbox for the same day rather than disappearing into the bank.
     2. a running timer is stopped, not discarded. stopTimer() folds the elapsed seconds into
        t.elapsed and files the session, so the time already spent is kept - it just stops
        accruing against a block that no longer exists in the present.
     3. a focus session locked to that block ends. Staying "engaged" on a block whose window has
        closed is the state that made it possible to sit in a focus overlay for an hour after
        the thing was over.
   Rituals and quests are deliberately left alone: they aren't pinned by t.blockId, they belong
   to their routine, and unpinning them would mean rewriting placement history. */
function sweepEndedBlocks(k){
  k=k||today();
  if(k!==today()) return 0;        /* only ever sweeps the live day */
  const d=S.days[k]; if(!d||!d.blocks) return 0;
  const nm=nowMinutes()%1440;
  let returned=0, names=[];
  d.blocks.forEach(function(b){
    const end=toMin(b.start)+blockDur(b);
    if(end>nm) return;             /* still running, or yet to start */
    blockTasksFor(b,k).forEach(function(t){
      if(itemDone(t,k)) return;
      if(t.timerStart) stopTimer(t,k);
      t.blockId=null;
      returned++;
      if(names.length<3) names.push(t.text);
    });
  });
  /* a locked-in session outlives its block only until the next tick, by design - the check is
     here rather than in focusTick so it also fires on a plain render after the tab wakes up */
  if(focusBlockId){
    const fb=blockOf(focusBlockId);
    if(!fb||toMin(fb.start)+blockDur(fb)<=nm){
      const label=fb?(fb.focus||'that block'):'that block';
      exitFocus();
      notifyUser('Block ended', label+' is over — focus session closed.');
    }
  }
  if(returned){
    save();
    notifyUser(
      returned+' task'+(returned===1?'':'s')+' back in your inbox',
      names.join(', ')+(returned>names.length?' and '+(returned-names.length)+' more':''));
  }
  return returned;
}
function nextBlockId(id){
  const d=day(vday());
  const sorted=d.blocks.slice().sort(function(a,b){return toMin(a.start)-toMin(b.start);});
  const idx=sorted.findIndex(function(b){return b.id===id;});
  if(idx<0||idx===sorted.length-1) return null;
  return sorted[idx+1].id;
}
function mergeEvents(evs){
  const d=day(vday()); const seen={};
  evs.forEach(function(ev){
    if(!ev.start||!ev.start.dateTime) return;
    const id='ev_'+ev.id; seen[id]=true;
    const st=hhmm(ev.start.dateTime), en=hhmm(ev.end&&ev.end.dateTime?ev.end.dateTime:ev.start.dateTime);
    let b=d.blocks.filter(function(x){return x.id===id;})[0];
    if(b){ b.start=st; b.end=en; if(!b.focus||b.focus===b.calTitle) b.focus=ev.summary||''; b.calTitle=ev.summary||''; }
    else d.blocks.push({id:id, start:st, end:en, focus:ev.summary||'', calTitle:ev.summary||'', fromCal:true, notes:'', type:'single', category:null});
  });
  d.blocks=d.blocks.filter(function(b){
    if(!b.fromCal||seen[b.id]) return true;
    return blockTasksFor(b).length>0||(b.notes&&b.notes.trim());
  });
}
/* fills every uncovered stretch of the 6am-10pm skeleton with a filler block sized to the
   actual gap — not a fixed hourly grid. A 30-minute gap between two real blocks gets a
   30-minute filler, not a whole empty hour sitting next to a half-empty one. */
/* Your rituals are fixed points of the day, so they get real blocks on the timeline rather than a
   panel off to the side. Seeded once per day and then yours: move them, rename them, drop other
   things in, or delete one for a day and it stays deleted — routineSeeded is what stops tomorrow's
   regeneration from undoing today's decision. The list of rituals itself lives in S.ritualDefs
   (backfillRitualDefs), not a fixed const, so adding one is just addRitualDef() — this loop then
   seeds its block onto every day going forward same as sunrise/moonlight always have. */
/* ===================== repeating blocks =====================
   A repeating block is a RULE in S.blockRules, not a row copied into every future day. Days are
   historical fact: writing instances forward would mean a rule edited in March silently rewrote
   what February looked like, and deleting a rule would strand orphans in days you had already
   lived. Instead ensureRuleBlocks(k) materialises `rule_<ruleId>_<k>` into a day the first time
   that day is opened, and prunes any instance that is still untouched once its rule stops
   applying — the same shape ensureRoutineBlocks/buildGaps already use for ritual and filler
   blocks.
   Recurrence reuses the task `sched` vocabulary ({type,days,dom}) so there is one idea of
   "repeats" in the app, plus `interval` for every-other-week, which tasks never needed. */
const BLOCK_REPEATS=[
  {id:'none',    label:'once'},
  {id:'daily',   label:'every day'},
  {id:'weekly',  label:'certain days'},
  {id:'biweekly',label:'every other week'},
  {id:'monthly', label:'monthly'}
];
function blockRuleById(id){ return (S.blockRules||[]).filter(function(r){return r.id===id;})[0]; }
/* whole weeks between two dates, measured from each one's Sunday, so an every-other-week rule
   lands on the same parity regardless of which weekday you are asking about */
function weeksBetween(aKey,bKey){
  const wa=weekDatesOf(aKey)[0], wb=weekDatesOf(bKey)[0];
  return Math.round(daysBetween(wa,wb)/7);
}
function ruleDueOn(rule,k){
  const sc=rule.sched||{type:'none'};
  const dow=dowOf(k);
  if(sc.type==='daily') return true;
  if(sc.type==='weekly') return (sc.days||[]).indexOf(dow)>=0;
  if(sc.type==='biweekly'){
    if((sc.days||[]).indexOf(dow)<0) return false;
    const n=weeksBetween(rule.anchor||today(),k);
    return ((n%2)+2)%2===0;
  }
  if(sc.type==='monthly') return (+k.split('-')[2])===(sc.dom||1);
  return false;
}
/* An instance nobody has touched is safe to withdraw when its rule changes or goes away; one with
   tasks, quests, notes or a renamed focus has become that day's own record and is left alone.
   Two things this has to get right:
   - the placement lookup is day-keyed, not vday()-keyed. blockQuests() reads vday() internally,
     so using it here would judge every day by whatever day happened to be on screen.
   - once the rule is deleted there is nothing left to compare the focus against, so an orphan is
     judged on content alone. Comparing against a missing rule made every orphan look renamed,
     and turning a repeat back into a one-off stranded its future copies instead of withdrawing
     them. */
function ruleInstanceUntouched(b,k){
  k=k||vday();
  if(blockTasksFor(b,k).length) return false;
  if(b.notes&&b.notes.trim()) return false;
  const dd=S.days[k];
  const placed=(S.tasks||[]).some(function(t){
    return !!(dd&&dd.assign&&dd.assign[t.id]===b.id);
  });
  if(placed) return false;
  const r=blockRuleById(b.ruleId);
  if(r&&b.focus!==r.focus) return false;
  return true;
}
function ensureRuleBlocks(k){
  k=k||vday();
  if(daysBetween(today(),k)<0) return;   /* never invent a block on a day already behind us */
  const d=day(k);
  (S.blockRules||[]).forEach(function(r){
    const iid='rule_'+r.id+'_'+k;
    /* The block the rule was PROMOTED FROM still lives on its own day carrying this ruleId, and
       it is that day's instance. Matching only on the generated id meant the origin day got the
       real block plus a generated twin of itself. */
    const has=(d.blocks||[]).some(function(b){return b.id===iid||b.ruleId===r.id;});
    if(ruleDueOn(r,k)){
      if(!has) d.blocks.push({id:iid, ruleId:r.id, start:r.start, end:r.end, focus:r.focus||'',
        notes:'', type:r.type||'open', category:r.category||null});
    }else{
      /* only ever withdraw a generated instance — the origin block is a real block the user made
         on that day, and a rule no longer covering it is not a reason to delete it */
      d.blocks=d.blocks.filter(function(b){ return !(b.id===iid&&ruleInstanceUntouched(b,k)); });
    }
  });
  /* a rule that was deleted outright takes its untouched instances with it */
  d.blocks=d.blocks.filter(function(b){
    return !(b.ruleId&&!blockRuleById(b.ruleId)&&ruleInstanceUntouched(b,k));
  });
  d.blocks.sort(function(a,b){return toMin(a.start)-toMin(b.start);});
}
/* Turning a one-off block into a repeating one promotes it to a rule and re-points the block at
   it, so the row you were looking at becomes this week's instance rather than a leftover twin. */
function setBlockRepeat(blockId,type){
  const b=blockOf(blockId); if(!b) return;
  if(type==='none'){
    if(b.ruleId){ S.blockRules=(S.blockRules||[]).filter(function(r){return r.id!==b.ruleId;}); delete b.ruleId; }
    save(); render(); return;
  }
  let r=b.ruleId?blockRuleById(b.ruleId):null;
  if(!r){
    r={id:'r'+Date.now(), start:b.start, end:b.end, focus:b.focus||'', category:b.category||null,
       type:b.type||'open', anchor:vday(), sched:{type:type, days:[dowOf(vday())], dom:+vday().split('-')[2]}};
    if(!S.blockRules) S.blockRules=[];
    S.blockRules.push(r);
    b.ruleId=r.id;
  }
  r.sched=Object.assign({days:[dowOf(vday())], dom:+vday().split('-')[2]}, r.sched||{}, {type:type});
  if(type==='biweekly'||type==='weekly'){ if(!r.sched.days||!r.sched.days.length) r.sched.days=[dowOf(vday())]; }
  save(); render();
}
function toggleBlockRepeatDay(blockId,n){
  const b=blockOf(blockId); if(!b||!b.ruleId) return;
  const r=blockRuleById(b.ruleId); if(!r) return;
  const days=(r.sched.days||[]).slice();
  const i=days.indexOf(n);
  if(i>=0) days.splice(i,1); else days.push(n);
  r.sched.days=days;
  save(); render();
}
function setBlockRepeatDom(blockId,v){
  const b=blockOf(blockId); if(!b||!b.ruleId) return;
  const r=blockRuleById(b.ruleId); if(!r) return;
  const n=parseInt(v,10);
  r.sched.dom=(isFinite(n)&&n>=1&&n<=28)?n:1;
  save(); render();
}
/* edits to a repeating block's shape belong to the rule, or every future instance would revert */
function syncRuleFromBlock(b){
  if(!b||!b.ruleId) return;
  const r=blockRuleById(b.ruleId); if(!r) return;
  r.start=b.start; r.end=b.end; r.focus=b.focus||''; r.category=b.category||null; r.type=b.type||'open';
}
function blockRepeatLabel(b){
  if(!b||!b.ruleId) return '';
  const r=blockRuleById(b.ruleId); if(!r) return '';
  const sc=r.sched||{}, full=['sun','mon','tue','wed','thu','fri','sat'];
  if(sc.type==='daily') return 'every day';
  if(sc.type==='monthly') return 'monthly · day '+(sc.dom||1);
  const ds=(sc.days||[]).slice().sort();
  const names=ds.map(function(n){return full[n];}).join('/');
  if(sc.type==='weekly') return (ds.length>1?ds.length+'× weekly · ':'weekly · ')+names;
  if(sc.type==='biweekly') return 'every other week · '+names;
  return '';
}
function blockRepeatEditorHTML(b){
  const r=b.ruleId?blockRuleById(b.ruleId):null;
  const cur=r?(r.sched||{}).type:'none';
  const full=['sun','mon','tue','wed','thu','fri','sat'];
  let h='<div class="schededit" onclick="event.stopPropagation()">';
  h+='<div class="schedhead">how often does this block repeat?</div><div class="schedrow seg">';
  BLOCK_REPEATS.forEach(function(o){
    h+='<button class="schedbtn'+(cur===o.id?' on':'')+'" onclick="setBlockRepeat(\''+b.id+'\',\''+o.id+'\')">'+o.label+'</button>';
  });
  h+='</div>';
  if(r&&(cur==='weekly'||cur==='biweekly')){
    const on=(r.sched.days||[]);
    h+='<div class="schedrow days">'+full.map(function(lb,n){
      return '<button class="schedday'+(on.indexOf(n)>=0?' on':'')+'" title="'+lb+'" onclick="toggleBlockRepeatDay(\''+b.id+'\','+n+')">'+lb.charAt(0).toUpperCase()+'</button>';
    }).join('')+'</div>';
    h+='<div class="schedhint">'+(on.length?'<b>'+blockRepeatLabel(b)+'</b>':'tap the days it lands on')+
      (cur==='biweekly'?' · counted from the week of '+(r.anchor||today()):'')+'</div>';
  }
  if(r&&cur==='monthly'){
    h+='<div class="schedrow"><span class="schedhint">on day</span>'+
       '<input type="number" class="schednum" min="1" max="28" value="'+(r.sched.dom||1)+'" onchange="setBlockRepeatDom(\''+b.id+'\',this.value)">'+
       '<span class="schedhint">of every month</span></div>';
  }
  if(cur==='none') h+='<div class="schedhint">a one-off — this day only</div>';
  else h+='<div class="schedhint">future days get this block when you open them; days you have already used keep whatever they had</div>';
  h+='<div class="schedrow"><button class="btn tiny ghost" onclick="toggleEdit(null)">done</button></div>';
  return h+'</div>';
}
function ensureRoutineBlocks(k){
  k=k||vday();
  if(daysBetween(today(),k)<0) return;   /* never invent a routine on a day already behind us */
  const d=day(k);
  if(d.routineSeeded) return;
  (S.ritualDefs||[]).forEach(function(def){
    if((d.blocks||[]).some(function(b){return b.routine===def.id;})) return;
    d.blocks.push({id:'routine_'+def.id+'_'+k, start:def.start, end:def.end,
      focus:def.name, routine:def.id, notes:'', type:'ritual', category:null});
  });
  d.routineSeeded=true;
  d.blocks.sort(function(a,b){return toMin(a.start)-toMin(b.start);});
}
function buildGaps(k){
  k=k||vday();
  /* only ever generate a skeleton for today or a future day — filling in a past day that was
     never opened would invent blocks that day never actually had */
  if(daysBetween(today(),k)<0) return;
  ensureRoutineBlocks(k);
  ensureRuleBlocks(k);
  const d=day(k);
  d.blocks=d.blocks.filter(function(b){
    return !(b.auto&&!blockTasksFor(b,k).length&&!(b.notes&&b.notes.trim())&&!b.focus&&!b.category);
  });
  const real=d.blocks.map(function(b){
    const s=Math.max(DAY_START,toMin(b.start));
    const e=Math.min(DAY_END,s+blockDur(b));
    return [s,e];
  }).filter(function(iv){return iv[1]>iv[0];}).sort(function(a,b){return a[0]-b[0];});
  const merged=[];
  real.forEach(function(iv){
    const last=merged[merged.length-1];
    if(last&&iv[0]<=last[1]) last[1]=Math.max(last[1],iv[1]);
    else merged.push(iv.slice());
  });
  let cursor=DAY_START;
  merged.forEach(function(iv){
    if(iv[0]>cursor) fillGapRange(d,cursor,iv[0],k);
    cursor=Math.max(cursor,iv[1]);
  });
  if(cursor<DAY_END) fillGapRange(d,cursor,DAY_END,k);
  d.blocks.sort(function(a,b){return toMin(a.start)-toMin(b.start);});
}
/* how an open stretch gets chunked: snap to the clock hour first, then run whole hours,
   then leave whatever's left as a short final session. 2:15pm-10pm becomes 2:15-3, 3-4, 4-5 …
   12:00-2:15pm becomes 12-1, 1-2, 2-2:15. Slivers under MIN_GAP are skipped entirely —
   a 5-minute strip is not a work session, it's visual noise. */
const MIN_GAP=15;
/* a contiguous run of unassigned (empty, auto-filled) blocks totaling at least this many minutes
   collapses into a single toggle row instead of showing each open hour as its own line */
const UNASSIGNED_COLLAPSE_MIN=120;
function fillGapRange(d,from,to,dayKey){
  if(to-from<MIN_GAP) return;
  let cur=from;
  /* ids are day-scoped (not just minute-of-day) so that yesterday's 6am gap block and today's
     6am gap block never collide — otherwise a task pinned to yesterday's auto-filled block would
     still turn up "inside" today's identically-numbered block once it regenerates, since
     blockTasksFor matches purely by block id (see the day-check fix there too). */
  const dayPrefix=dayKey||vday();
  while(cur<to){
    let next;
    if(cur%60!==0) next=Math.min(to,cur+(60-cur%60)); /* partial leading hour: snap up to the hour */
    else next=Math.min(to,cur+60);                    /* on the hour: take a whole hour (or what's left) */
    if(to-next>0&&to-next<MIN_GAP) next=to;           /* would strand a sliver — absorb it into this block */
    if(next-cur>=MIN_GAP){
      d.blocks.push({id:'auto'+dayPrefix+'_'+cur, start:fromMin(cur), end:fromMin(next), focus:'', auto:true, notes:'', type:'open', category:null});
    }
    cur=next;
  }
}
async function syncCalendar(){
  const st=document.getElementById('syncStatus');
  if(!(window.cowork&&window.cowork.callMcpTool)){
    if(st) st.textContent='calendar sync needs Cowork — add blocks manually here, they stay saved locally';
    return;
  }
  if(st) st.textContent='syncing…';
  try{
    const t=today().split('-').map(Number);
    const start=new Date(t[0],t[1]-1,t[2],0,0,0), end=new Date(t[0],t[1]-1,t[2]+1,0,0,0);
    const r=await window.cowork.callMcpTool(CAL_TOOL,{startTime:start.toISOString(), endTime:end.toISOString(), pageSize:50});
    let payload=r.structuredContent;
    if(!payload&&r.content&&r.content[0]&&r.content[0].text) payload=JSON.parse(r.content[0].text);
    const evs=(payload&&payload.events?payload.events:[]).filter(function(e){ return e.status!=='cancelled'&&e.start&&e.start.dateTime; });
    mergeEvents(evs); buildGaps(); save(); render();
    const st2=document.getElementById('syncStatus');
    if(st2) st2.textContent='synced '+evs.length+' event'+(evs.length===1?'':'s')+' · '+new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  }catch(e){
    const st2=document.getElementById('syncStatus');
    if(st2) st2.textContent='sync failed — try again';
  }
}
/* legacy entry point — an id="newBlockTime" input was never actually wired into the page, so this
   was dead code. createBlockAt() below is the real, reachable way to make a new block now (tap an
   open gap on the timeline); addBlock() is kept only for whatever external caller might still
   reach for it, now with a sane fallback instead of crashing on a missing element. */
function addBlock(){
  const el=document.getElementById('newBlockTime');
  createBlockAt((el&&el.value)||'12:00');
}
/* opening a stretch of open time (as opposed to locking one in, which is a separate, deliberate
   action via lockIn()) claims a generous 2-4 hour swath of it by default rather than a token hour —
   open time is meant to be roomy and flexible, not sliced into meeting-sized crumbs. Capped to
   whatever's actually available in the gap being opened, so a 90-minute gap just becomes one
   90-minute block instead of overshooting into whatever comes next. */
const OPEN_BLOCK_MIN=120, OPEN_BLOCK_MAX=240;
function pickOpenBlockDur(availableMin){
  if(availableMin==null) return OPEN_BLOCK_MAX;
  if(availableMin<=OPEN_BLOCK_MIN) return availableMin;
  return Math.min(availableMin,OPEN_BLOCK_MAX);
}
/* tap-to-create: turns a stretch of open time into a real, open-type block starting at startTime.
   buildGaps() re-derives the filler blocks around whatever's "real" on every render (see the call
   in day-view render), so pushing just the new block and re-rendering is enough — the rest of the
   day's open time refills itself around it automatically. */
function createBlockAt(startTime,durMin){
  durMin=durMin||pickOpenBlockDur();
  const id='b'+Date.now();
  day(vday()).blocks.push({id:id, start:startTime, end:fromMin(toMin(startTime)+durMin), focus:'', notes:'', type:'open', category:null});
  day(vday()).blocks.sort(function(a,b){return toMin(a.start)-toMin(b.start);});
  save(); render();
  panelOverride=id; render();
}
function delBlock(id){ if(!arm('blk:'+id))return;
  const d=day(vday()); d.blocks=d.blocks.filter(function(b){return b.id!==id;}); armed=null; save(); render(); }
function blockOf(id){ return day(vday()).blocks.filter(function(b){return b.id===id;})[0]; }
function setFocus(id,v){ const b=blockOf(id); if(b){b.focus=v; syncRuleFromBlock(b); save();} }
function setNotes(id,v){ const b=blockOf(id); if(b){b.notes=v;save();} }
/* ===================== block type ===================== */
/* single focus / open are freely interchangeable by hand; ritual is exclusively the seeded routine
   blocks (ensureRoutineBlocks) and project just needs a category to go with it — so "convert" is
   nothing more than picking a type and, for project, a category. */
const BLOCK_TYPES=['single','project','open'];
const BLOCK_TYPE_ICON={single:'🔒', project:'📁', open:'', ritual:'☀'};
const BLOCK_TYPE_LABEL={single:'single focus', project:'project', open:'open', ritual:'ritual'};
function setBlockType(id,ty){
  const b=blockOf(id); if(!b||b.routine||BLOCK_TYPES.indexOf(ty)<0) return;
  b.type=ty;
  if(ty==='project'){ if(!b.category) b.category=(S.categories&&S.categories[0])||'Uncategorized'; }
  else b.category=null;
  syncRuleFromBlock(b);
  save(); render();
}
function setBlockCategory(id,v){
  const b=blockOf(id); if(!b) return;
  b.category=(v||'').trim()||null; syncRuleFromBlock(b); save(); render();
}
/* a project block pulls its work straight from the task bank instead of you assigning tasks to it
   one by one — whatever's first in that category's order is "current"; finishing or skipping it
   just naturally promotes the next, so there's no separate "current task" pointer to maintain. */
function projectBlockTasks(b){
  if(!b||b.type!=='project'||!b.category) return [];
  return S.tasks.filter(function(t){return t.kind==='task'&&t.bucket==='bank'&&t.project===b.category&&!itemDone(t);}).sort(byOrder);
}
/* skip everything in the block at once — a thin wrapper over the existing per-item skipItem
   (streak-safe already), so a ritual block's whole morning can be waved off in one tap without
   reimplementing the streak-safety logic. Symmetric: tapping again un-skips everything it skipped. */
function skipBlock(id,ev){
  if(ev) ev.stopPropagation();
  const b=blockOf(id); if(!b) return;
  const items=blockQuests(b).concat(blockTasksFor(b)).concat(projectBlockTasks(b)).filter(function(t){return !itemDone(t);});
  if(!items.length) return;
  const allSkipped=items.every(function(t){return itemSkipped(t);});
  items.forEach(function(t){ if(itemSkipped(t)===allSkipped) skipItem(t.id); });
  toast(allSkipped?'Back on the list':'Skipped — streak safe');
}
/* editable start/end time fields — "the reliable path, and the one that works on a phone" per
   the calendar-redesign spec, standing in for drag-to-resize. A block can't be dragged shorter
   than MIN_GAP or flipped past its own end/start, so both setters clamp rather than silently
   producing an inverted or zero-length block. */
function setBlockStart(id,v){
  const b=blockOf(id); if(!b||!v) return;
  const endMin=toMin(b.end||fromMin(toMin(b.start)+60));
  let startMin=toMin(v);
  if(endMin-startMin<MIN_GAP) startMin=endMin-MIN_GAP;
  if(startMin<0) startMin=0;
  b.start=fromMin(startMin);
  syncRuleFromBlock(b);
  day(vday()).blocks.sort(function(a,bb){return toMin(a.start)-toMin(bb.start);});
  save(); render();
}
function setBlockEnd(id,v){
  const b=blockOf(id); if(!b||!v) return;
  const startMin=toMin(b.start);
  let endMin=toMin(v);
  if(endMin-startMin<MIN_GAP) endMin=startMin+MIN_GAP;
  if(endMin>1440) endMin=1440;
  b.end=fromMin(endMin);
  syncRuleFromBlock(b);
  save(); render();
}
/* quick-capture inside a block creates a real, unified task pinned straight to this block —
   same object every other task is, just born here instead of the bank */
function quickAddBlockTask(blockId){
  const inp=document.getElementById('tinyIn-'+blockId); if(!inp) return;
  const txt=inp.value.trim(); if(!txt) return;
  const b=blockOf(blockId);
  /* typing into a routine block means "add this to my morning/evening routine", i.e. a daily
     habit — not a one-off task that happens to sit at 6am today */
  if(b&&b.routine){ addRitualItem(b.routine,txt); }
  else { const t=addTask(txt,'work','Uncategorized'); t.day=vday(); t.blockId=blockId; }
  inp.value=''; save(); render();
  requestAnimationFrame(function(){ const el=document.getElementById('tinyIn-'+blockId); if(el) el.focus(); });
}
function mmss(sec){ sec=Math.max(0,Math.round(sec)); const m=Math.floor(sec/60), s=sec%60; return m+':'+String(s).padStart(2,'0'); }
function taskElapsed(task){ return (task.elapsed||0)+(task.timerStart?Math.round((Date.now()-task.timerStart)/1000):0); }
/* ===================== timer sessions =====================
   `elapsed` is an item's lifetime total, which is the right number for a one-off task and the
   wrong one for a daily habit — a habit's lifetime total blends every morning together and only
   ever climbs. So a stopped timer also books its seconds against the day it was worked, in
   S.days[k].secs[id]. That per-day record is what the average reads, and it's editable, because
   a timer left running through lunch shouldn't quietly become your typical shower. */
function sessionSecsOn(id,k){ const dd=S.days[k]; return (dd&&dd.secs)?(dd.secs[id]||0):0; }
function setSessionSecs(id,k,secs){
  const d=day(k);
  if(!d.secs) d.secs={};
  secs=Math.round(secs||0);
  if(secs>0) d.secs[id]=secs; else delete d.secs[id];
  save();
}
function addSessionSecs(id,k,secs){ if(secs>0) setSessionSecs(id,k,sessionSecsOn(id,k)+secs); }
/* days you did the thing but never timed it are skipped entirely rather than counted as zero —
   otherwise the average decays toward nothing every time you just tick the box */
function avgSessionSecs(id){
  let sum=0,n=0;
  Object.keys(S.days).forEach(function(k){
    const v=sessionSecsOn(id,k);
    if(v>0){ sum+=v; n++; }
  });
  return n?Math.round(sum/n):0;
}
function sessionCount(id){
  let n=0;
  Object.keys(S.days).forEach(function(k){ if(sessionSecsOn(id,k)>0) n++; });
  return n;
}
/* the single place a running timer gets folded back in, so stopping it by hand and stopping it
   by completing the item can never drift apart */
function stopTimer(t,k){
  if(!t||!t.timerStart) return 0;
  const secs=Math.max(0,Math.round((Date.now()-t.timerStart)/1000));
  t.elapsed=(t.elapsed||0)+secs;
  t.timerStart=null;
  if(secs>0) addSessionSecs(t.id,k||vday(),secs);
  return secs;
}
function submitSessionEdit(id,k){
  const el=document.getElementById('sessIn-'+id); if(!el) return;
  const mins=parseFloat(el.value);
  setSessionSecs(id,k,(isFinite(mins)&&mins>0)?Math.round(mins*60):0);
  editing=null; render();
}
/* the correct-this-time editor, shared by every row type so a logged duration is fixable
   wherever you happen to be looking at the item */
function sessEditorHTML(id){
  const k=vday(), avg=avgSessionSecs(id), n=sessionCount(id), cur=sessionSecsOn(id,k);
  return '<div class="freqedit" onclick="event.stopPropagation()">'+
    '<div class="freqhint">how long did this actually take'+(isViewingToday()?' today':' that day')+'?'+
    (avg?' · you average <b>'+mmss(avg)+'</b> over '+n+' timed session'+(n===1?'':'s'):'')+'</div>'+
    '<div class="freqrow"><input type="number" class="schednum" id="sessIn-'+id+'" min="0" step="1" placeholder="min" value="'+(cur?Math.round(cur/60):'')+'">'+
    '<span class="freqhint">minutes</span>'+
    '<button class="btn tiny" onclick="submitSessionEdit(\''+id+'\',\''+k+'\')">save</button>'+
    '<button class="btn tiny ghost" onclick="toggleEdit(null)">cancel</button></div>'+
    '<div class="freqhint">leave it blank to drop this day out of the average entirely</div>'+
    '</div>';
}
function tickTimers(){
  document.querySelectorAll('[data-timer-live-paper]').forEach(function(el){
    const pid=el.getAttribute('data-timer-live-paper');
    const p=paperById(pid); if(!p||!p.timerStart) return;
    el.textContent=mmss(paperTotalSec(p));
  });
  document.querySelectorAll('[data-timer-live-task]').forEach(function(el){
    const tid=el.getAttribute('data-timer-live-task');
    const t=taskById(tid); if(!t||!t.timerStart) return;
    el.textContent=mmss(taskElapsed(t));
  });
  document.querySelectorAll('[data-timer-live-act]').forEach(function(el){
    const aid=el.getAttribute('data-timer-live-act');
    if(!S.actTimers||!S.actTimers[aid]) return;
    el.textContent=mmss(actElapsedSec(aid));
  });
  document.querySelectorAll('[data-timer-live-move]').forEach(function(el){
    const mid=el.getAttribute('data-timer-live-move');
    const m=S.exMoves.filter(function(x){return x.id===mid;})[0]; if(!m||!m.timerStart) return;
    el.textContent=mmss(exMoveElapsedSec(m));
  });
}
/* ===================== bookshelf ===================== */
function addBook(){
  const t=document.getElementById('newBookTitle').value.trim();
  const p=Math.round(parseFloat(document.getElementById('newBookPages').value)||0);
  if(!t||!p)return;
  const curEl=document.getElementById('newBookCur');
  const startCur=curEl?Math.max(0,Math.min(p,Math.round(parseFloat(curEl.value)||0))):0;
  S.books.push({id:'bk'+Date.now(), title:t, pages:p, cur:startCur, color:BOOK_COLORS[S.books.length%BOOK_COLORS.length]});
  document.getElementById('newBookTitle').value=''; document.getElementById('newBookPages').value='';
  if(curEl) curEl.value='';
  save(); render();
}
function submitPages(id){
  const b=S.books.filter(function(x){return x.id===id;})[0]; if(!b)return;
  const el=document.getElementById('pageIn-'+id); if(!el)return;
  const np=Math.max(0,Math.min(b.pages,Math.round(parseFloat(el.value)||0)));
  const prevCur=b.cur;
  const gained=np-prevCur;
  b.cur=np; editing=null;
  if(gained!==0){
    const d=day(vday());
    let removedBook=null, finishedAt=null;
    if(gained>0){
      d.pagesLogged=(d.pagesLogged||0)+gained;
      d.pagesBy[id]=(d.pagesBy[id]||0)+gained;
      celebrateBurst();
    }
    if(b.cur>=b.pages){
      finishedAt=Date.now();
      S.doneBooks.push({title:b.title,at:finishedAt,color:b.color});
      S.books=S.books.filter(function(x){return x.id!==id;});
      removedBook={id:b.id,title:b.title,pages:b.pages,color:b.color};
      celebrateBurst(true);
      toast('Finished “'+b.title+'” — onto the shelf');
    } else if(gained>0) toast('+'+gained+' pages');
    d.bookLog.push({bookId:id, prevCur:prevCur, newCur:np, removedBook:removedBook, finishedAt:finishedAt});
  }
  save(); render();
}
function undoBook(){
  const d=day(vday());
  if(!d.bookLog||!d.bookLog.length){ toast('Nothing to undo'); return; }
  const last=d.bookLog.pop();
  if(last.removedBook){
    S.books.push({id:last.removedBook.id, title:last.removedBook.title, pages:last.removedBook.pages, cur:last.prevCur, color:last.removedBook.color});
    S.doneBooks=S.doneBooks.filter(function(x){ return !(x.title===last.removedBook.title&&x.at===last.finishedAt); });
  } else {
    const b=S.books.filter(function(x){return x.id===last.bookId;})[0];
    if(b) b.cur=last.prevCur;
  }
  if(last.newCur>last.prevCur){
    const delta=last.newCur-last.prevCur;
    d.pagesLogged=Math.max(0,(d.pagesLogged||0)-delta);
    d.pagesBy[last.bookId]=Math.max(0,(d.pagesBy[last.bookId]||0)-delta);
  }
  toast('Undid page update');
  save(); render();
}
function delBook(id,ev){ ev.stopPropagation(); if(!arm('bk:'+id))return;
  S.books=S.books.filter(function(x){return x.id!==id;}); armed=null; save(); render(); }
/* ===================== papers ===================== */
/* papers are their own entity (like books), not tasks — a paper outlives any one sitting with it.
   A task can point at a paper via task.paperId ("read this paper for 15 minutes"), so the paper
   accumulates total time and notes across however many tasks/sessions you spend on it. */
const PAPER_STATUSES=['queued','abstract read','skimmed','notes taken'];
function backfillPapers(){
  if(!S.papers) S.papers=[];
  S.papers.forEach(function(p){
    if(p.status===undefined||PAPER_STATUSES.indexOf(p.status)<0) p.status='queued';
    if(p.notes===undefined) p.notes='';
    if(p.elapsed===undefined) p.elapsed=0;
    if(p.timerStart===undefined) p.timerStart=null;
    if(p.url===undefined) p.url='';
    if(p.createdAt===undefined) p.createdAt=Date.now();
    if(p.syncedAt===undefined) p.syncedAt=null; /* set by the daily Notion push once we build it */
  });
}
function addPaper(title,url){
  title=(title||'').trim(); if(!title) return null;
  const p={id:'pp'+Date.now()+Math.floor(Math.random()*1000), title:title, url:(url||'').trim(),
    status:'queued', notes:'', elapsed:0, timerStart:null, createdAt:Date.now(), syncedAt:null};
  S.papers.push(p); save(); return p;
}
function addPaperFromForm(){
  const t=document.getElementById('newPaperTitle'), u=document.getElementById('newPaperUrl');
  if(!t||!t.value.trim()) return;
  addPaper(t.value,u?u.value:'');
  t.value=''; if(u) u.value=''; render();
}
function paperById(id){ return S.papers.filter(function(p){return p.id===id;})[0]; }
function setPaperTitle(id,v){ const p=paperById(id); if(!p) return; const nv=(v||'').trim(); if(nv) p.title=nv; save(); }
function setPaperNotes(id,v){ const p=paperById(id); if(!p) return; p.notes=v; save(); }
function cyclePaperStatus(id,ev){ if(ev)ev.stopPropagation();
  const p=paperById(id); if(!p) return;
  const i=PAPER_STATUSES.indexOf(p.status);
  const ni=(i+1)%PAPER_STATUSES.length;
  p.status=PAPER_STATUSES[ni];
  save(); render();
  toast(p.status);
}
function delPaper(id,ev){ if(ev)ev.stopPropagation(); if(!arm('pp:'+id))return;
  S.papers=S.papers.filter(function(p){return p.id!==id;});
  S.tasks.forEach(function(t){ if(t.paperId===id) t.paperId=null; }); /* don't orphan a link */
  armed=null; save(); render(); }
function togglePaperTimer(id,ev){ if(ev)ev.stopPropagation();
  const p=paperById(id); if(!p) return;
  if(p.timerStart){ p.elapsed=(p.elapsed||0)+Math.max(0,Math.round((Date.now()-p.timerStart)/1000)); p.timerStart=null; }
  else p.timerStart=Date.now();
  save(); render();
}
function movePaper(id,dir,ev){ if(ev)ev.stopPropagation();
  const i=S.papers.findIndex(function(p){return p.id===id;});
  const j=i+dir;
  if(i<0||j<0||j>=S.papers.length) return;
  const tmp=S.papers[i]; S.papers[i]=S.papers[j]; S.papers[j]=tmp;
  save(); render();
}
function linkTaskToPaper(taskId,paperId){
  const t=taskById(taskId); if(!t) return;
  t.paperId=paperId||null; save(); render();
}
function paperTotalSec(p){ return (p.elapsed||0)+(p.timerStart?Math.round((Date.now()-p.timerStart)/1000):0); }
/* ===================== meditation ===================== */
let medi={mode:'countdown',len:600,left:600,running:false,iv:null,cueIv:null,swStart:null};
/* both modes funnel into this — logs real minutes to the week's total (for the bar chart),
   and still marks the daily "medit" habit + pays its usual quest bonus the first time each day */
function logMeditationMinutes(min){
  if(min<=0) return;
  const d=day(vday());
  d.mediMin=(d.mediMin||0)+min;
  if(!d.done['medit']) d.done['medit']=Date.now();
  const secs=Math.round(min*60);
  if(secs>(S.mediBestSec||0)){ S.mediBestSec=secs; toast('New personal best · '+mmss(secs)); }
  else toast(Math.round(min)+' min meditation logged');
  celebrateBurst(true);
  save(); render();
}
function setMediMode(m){
  if(medi.running) return; // don't let a mode switch orphan a running timer
  medi.mode=m;
  document.getElementById('mtab-countdown').classList.toggle('on',m==='countdown');
  document.getElementById('mtab-stopwatch').classList.toggle('on',m==='stopwatch');
  const pr=document.getElementById('presetRow'); if(pr) pr.style.display=m==='countdown'?'':'none';
  const cue=document.getElementById('breathCue'); if(cue) cue.style.display=m==='countdown'?'':'none';
  mediPaint();
}
function mediPreset(m){ if(medi.running)return; medi.len=m*60; medi.left=m*60;
  document.querySelectorAll('.preset').forEach(function(b){b.classList.toggle('on',+b.dataset.min===m);});
  mediPaint(); }
function mediToggle(){
  if(medi.mode==='stopwatch'){ stopwatchToggle(); return; }
  const cue=document.getElementById('breathCue');
  if(medi.running){
    clearInterval(medi.iv); clearInterval(medi.cueIv); medi.running=false; medi.left=medi.len;
    cue.innerHTML='&nbsp;';
    document.getElementById('mediGo').textContent='begin'; mediPaint(); return; }
  medi.running=true;
  document.getElementById('mediGo').textContent='end';
  let ph=0; cue.textContent='inhale';
  medi.cueIv=setInterval(function(){ ph=1-ph; cue.textContent=ph?'exhale':'inhale'; },4000);
  medi.iv=setInterval(function(){
    medi.left--;
    if(medi.left<=0){
      clearInterval(medi.iv); clearInterval(medi.cueIv); medi.running=false; medi.left=medi.len;
      cue.innerHTML='&nbsp;';
      document.getElementById('mediGo').textContent='begin';
      logMeditationMinutes(medi.len/60);
    }
    mediPaint();
  },1000);
  mediPaint();
}
/* the stopwatch is the other on-ramp into meditation logging — for whenever a fixed preset
   doesn't fit and you just want to sit for however long and log the real elapsed time after */
function stopwatchToggle(){
  if(medi.running){
    clearInterval(medi.iv); medi.running=false;
    const secs=Math.max(0,Math.round((Date.now()-medi.swStart)/1000));
    medi.swStart=null;
    document.getElementById('mediGo').textContent='begin';
    logMeditationMinutes(secs/60);
    return;
  }
  medi.running=true; medi.swStart=Date.now();
  document.getElementById('mediGo').textContent='end';
  medi.iv=setInterval(mediPaint,1000);
  mediPaint();
}
const MRING_CIRC=2*Math.PI*44; /* r=44 in the svg viewBox */
function mediBestSec(){ return S.mediBestSec||0; }
/* countdown: ring drains as the timer runs down.
   stopwatch: ring fills toward your personal best. Once you pass it the ring flips to pink
   and re-fills once a minute, so every extra minute past your record reads as its own lap. */
function mediRingState(){
  if(medi.mode==='stopwatch'){
    const secs=medi.running?Math.max(0,Math.round((Date.now()-medi.swStart)/1000)):0;
    const best=mediBestSec();
    if(best>0&&secs>=best) return {pct:(secs-best)%60/60, past:true, secs:secs};
    return {pct:best>0?Math.min(1,secs/best):0, past:false, secs:secs};
  }
  return {pct:medi.len?medi.left/medi.len:0, past:false, secs:medi.left};
}
function mediPaint(){
  const t=document.getElementById('mediTime'); if(!t) return;
  const st=mediRingState();
  if(medi.mode==='stopwatch') t.textContent=mmss(st.secs);
  else { const m=Math.floor(medi.left/60),s=medi.left%60; t.textContent=m+':'+String(s).padStart(2,'0'); }
  const ring=document.getElementById('mediRing');
  if(ring){
    ring.setAttribute('stroke-dasharray',MRING_CIRC);
    ring.setAttribute('stroke-dashoffset',MRING_CIRC*(1-Math.max(0,Math.min(1,st.pct))));
    ring.classList.toggle('past',!!st.past);
  }
  const cue=document.getElementById('breathCue');
  if(cue&&medi.mode==='stopwatch'){
    const best=mediBestSec();
    cue.style.display='';
    cue.textContent=!best?'no record yet':(st.past?'past your best · '+mmss(best):'best '+mmss(best));
  }
}
/* ===================== movement ===================== */
/* activities (yoga, lift, run…) are the top-level workout types that count toward the weekly
   minutes goal + points. Tapping one opens a small pre-flight checklist (just a reminder, not
   gating anything) plus a start/stop stopwatch — you start it on your way out and stop it when
   you're back, so time spent resting between sets/movements still counts as part of the session.
   "Moves" (below) are a separate, ungated bank of individual movements (e.g. a plank hold) with
   their own independent stopwatch and a personal-best time — they never touch the weekly goal or
   points, they're purely a per-move duration tracker. */
function allActs(){ return ACTS.concat(S.customActs); }
let actPanelFor=null, actChecklistState={};
function openActPanel(id){ actPanelFor=actPanelFor===id?null:id; actChecklistState={}; render(); }
function toggleChecklistItem(idx){ actChecklistState[idx]=!actChecklistState[idx]; render(); }
function addAct(name){
  const nv=(name||'').trim(); if(!nv) return;
  if(allActs().some(function(a){return a.name.toLowerCase()===nv.toLowerCase();})) return;
  S.customActs.push({id:'act'+Date.now(), name:nv, checklist:OUTDOOR_CHECKLIST.slice()});
  save(); render();
}
function delAct(id,ev){ if(ev)ev.stopPropagation(); if(!arm('act:'+id)) return;
  S.customActs=S.customActs.filter(function(a){return a.id!==id;});
  if(S.actTimers) delete S.actTimers[id];
  if(actPanelFor===id) actPanelFor=null;
  armed=null; save(); render();
}
function actElapsedSec(actId){ return (S.actTimers&&S.actTimers[actId])?Math.round((Date.now()-S.actTimers[actId])/1000):0; }
function toggleActTimer(actId){
  if(!S.actTimers) S.actTimers={};
  if(S.actTimers[actId]){
    const minutes=Math.max(1,Math.round((Date.now()-S.actTimers[actId])/60000));
    const d=day(vday()); d.ex[actId]=(d.ex[actId]||0)+minutes;
    d.exLog.push({act:actId,min:minutes});
    delete S.actTimers[actId];
    celebrateBurst();
    const a=allActs().filter(function(x){return x.id===actId;})[0];
    toast((a?a.name+' — ':'')+minutes+' min logged');
  }else{
    S.actTimers[actId]=Date.now();
  }
  save(); render();
}
function undoMove(){
  const d=day(vday());
  if(!d.exLog.length){ toast('Nothing to undo'); return; }
  const last=d.exLog.pop();
  d.ex[last.act]=Math.max(0,(d.ex[last.act]||0)-last.min);
  const a=allActs().filter(function(x){return x.id===last.act;})[0];
  toast('Undid '+last.min+' min '+(a?a.name:last.act));
  save(); render();
}
function weekMove(){ let tot=0;
  for(let n=0;n<7;n++){ const dd=S.days[shiftKey(vday(),-n)]; if(dd&&dd.ex) for(const k in dd.ex) tot+=dd.ex[k]; }
  return tot; }
/* moves: an ungated bank of individual movements you can add on the fly, each timed independently
   with its own personal-best duration — never counted toward the weekly minutes goal or points */
function addExMove(name){
  const nv=(name||'').trim(); if(!nv) return;
  if(S.exMoves.some(function(m){return m.name.toLowerCase()===nv.toLowerCase();})) return;
  S.exMoves.push({id:'mv'+Date.now(), name:nv, bestSec:0, lastSec:0, timerStart:null});
  save(); render();
}
function delExMove(id,ev){ if(ev)ev.stopPropagation(); if(!arm('mv:'+id)) return;
  S.exMoves=S.exMoves.filter(function(m){return m.id!==id;});
  armed=null; save(); render();
}
function exMoveElapsedSec(m){ return m.timerStart?Math.round((Date.now()-m.timerStart)/1000):(m.lastSec||0); }
function toggleExMoveTimer(id){
  const m=S.exMoves.filter(function(x){return x.id===id;})[0]; if(!m) return;
  if(m.timerStart){
    const sec=Math.max(1,Math.round((Date.now()-m.timerStart)/1000));
    m.lastSec=sec; if(sec>m.bestSec) m.bestSec=sec;
    m.timerStart=null;
  }else{
    m.timerStart=Date.now();
  }
  save(); render();
}
function submitMoveGoal(){
  const el=document.getElementById('moveGoalIn'); const g=Math.round(parseFloat(el.value)||0);
  if(g>0){ S.moveGoal=g; editing=null; save(); render(); } }
function submitReadGoal(){
  const el=document.getElementById('readGoalIn'); const g=Math.round(parseFloat(el.value)||0);
  if(g>0){ S.readGoal=g; editing=null; save(); render(); } }
function setTea(i,v){ const k=vday(); const t=S.tea[k]||['','','']; t[i]=v; S.tea[k]=t; save(); }
/* ===================== spending / budget =====================
   Real money, and only real money. This used to debit the points balance (a purchase made you
   "go into deficit" against earned points); with the economy gone these are simply transactions
   against a monthly budget. Amounts are integer cents throughout — dollars exist only at the
   input and output edges. */
function budgetMonthlyCents(){ return (S.budget&&S.budget.monthlyCents)||0; }
/* the budget period containing dayKey, honouring a start-of-month other than the 1st */
function budgetPeriodOf(k){
  const p=k.split('-').map(Number);
  const startsOn=(S.budget&&S.budget.startsOn)||1;
  let y=p[0], m=p[1];
  if(p[2]<startsOn){ m--; if(m<1){ m=12; y--; } }
  return y+'-'+String(m).padStart(2,'0');
}
function txnsInPeriod(period){
  period=period||budgetPeriodOf(vday());
  return (S.txns||[]).filter(function(t){ return budgetPeriodOf(t.day)===period; });
}
function spentInPeriod(period){
  return txnsInPeriod(period).reduce(function(a,t){ return a+(t.amountCents||0); },0);
}
function remainingCents(period){ return budgetMonthlyCents()-spentInPeriod(period); }
function logSpend(name,amountCents,dayKey,cat){
  dayKey=dayKey||vday();
  S.txns.unshift({id:'tx'+Date.now()+Math.random().toString(36).slice(2,7), name:name,
    amountCents:amountCents, cat:cat||'Uncategorized', at:Date.now(), day:dayKey});
  if(S.txns.length>500) S.txns.length=500;
  save(); render();
  const left=remainingCents();
  toast(budgetMonthlyCents()
    ? 'logged '+dollarsStr(amountCents)+' · '+dollarsStr(Math.max(0,left))+' left'
    : 'logged '+dollarsStr(amountCents));
}
function addSpend(){
  const nameEl=document.getElementById('spendName'), amtEl=document.getElementById('spendAmt');
  const name=(nameEl.value||'').trim();
  const amt=Math.round((parseFloat(amtEl.value)||0)*100);
  if(!name||amt<=0) return;
  logSpend(name,amt,vday());
  nameEl.value=''; amtEl.value='';
}
/* deleting a transaction is now just a delete — there is no balance to put back */
function delSpend(id,ev){ if(ev)ev.stopPropagation(); if(!arm('sp:'+id)) return;
  S.txns=S.txns.filter(function(t){return t.id!==id;});
  armed=null; save(); render();
}
function setTxnName(id,v){ const t=(S.txns||[]).filter(function(x){return x.id===id;})[0];
  if(!t) return; const nv=(v||'').trim(); if(nv) t.name=nv; save(); }
function setTxnAmount(id,v){ const t=(S.txns||[]).filter(function(x){return x.id===id;})[0];
  if(!t) return; const n=Math.round((parseFloat(v)||0)*100); if(n>0) t.amountCents=n; save(); render(); }
function setTxnDay(id,v){ const t=(S.txns||[]).filter(function(x){return x.id===id;})[0];
  if(!t||!/^\d{4}-\d{2}-\d{2}$/.test(v||'')) return; t.day=v; save(); render(); }
function setTxnCat(id,v){ const t=(S.txns||[]).filter(function(x){return x.id===id;})[0];
  if(!t) return; t.cat=v||'Uncategorized'; save(); render(); }
function addTxnCat(name){ name=(name||'').trim();
  if(!name||S.txnCats.indexOf(name)>=0) return; S.txnCats.push(name); save(); render(); }
function setBudgetMonthly(v){ const n=Math.round((parseFloat(v)||0)*100);
  S.budget.monthlyCents=Math.max(0,n); save(); render(); }
/* ===================== habit streak grid =====================
   Same visual language as the no-spend row, but inverted: here presence (not absence) of the
   habit is the win. Only habits with a clean built-in daily pass/fail signal get a row —
   the ritual seal (every core/med item in that ritual done) and the water goal. */
/* The rows are DERIVED, never stored. This used to be a hardcoded list of three (sunrise,
   moonlight, water) which quietly disagreed with S.ritualDefs — that list has been user-extendable
   via addRitualDef() for a while, so adding a fourth ritual produced no fourth habit row.
   Now every ritual contributes a row (it passes on a day when its seal is set, i.e. every core/med
   item in it was done) plus one row for the water goal. Adding a habit is adding a ritual; there
   is deliberately no parallel S.habits array to drift out of sync. */
function habitRows(){
  return (S.ritualDefs||[]).map(function(rd){ return {id:rd.id, name:rd.name}; })
    .concat([{id:'water', name:'water goal'}]);
}
function habitDoneOnDay(habitId,dayKey){
  const dd=S.days[dayKey];
  if(habitId==='water') return !!(dd&&dd.water>=goalOn(dayKey))||S.frozenDays.indexOf(dayKey)>=0;
  if(isRitualId(habitId)) return !!(dd&&dd.done&&dd.done['seal_'+habitId]);
  return false;
}
function habitStreak(habitId){
  const doneToday=habitDoneOnDay(habitId,today());
  /* if today isn't done yet that's not a broken streak, just an in-progress day — don't let the
     display drop to 0 every morning before the ritual/water goal has had a chance to happen */
  const startN=doneToday?0:1;
  let streak=0;
  for(let n=startN;n<365+startN;n++){
    if(!habitDoneOnDay(habitId,shiftKey(today(),-n))) break;
    streak++;
  }
  return streak;
}
/* ===================== day score =====================
   One number for "how did this day go", used by the header bar, the month calendar rings and
   (in the mobile shell) the day-of-week strip and week-grid column headers. Deliberately a
   single definition: before this there were two different scores — a 0.7 habits / 0.3 water blend
   in render() and a separate shape in dayStats() for the month view — which disagreed with each
   other on the same day. Both now call this.

   The mean of four equally-weighted components, each 0..1:
     water   drunk / that day's goal, capped at 1
     food    healthy / (healthy + poor) over the day's logged meal categories
     habits  derived habit rows passing (see habitRows())
     blocks  blocks whose tasks are all done / blocks that have tasks
   A component with nothing to measure yet is skipped rather than counted as zero, so a day with
   no meals logged isn't punished for it — the score reflects what you actually track. A day with
   nothing at all scores 0. Days in the future score 0, never partial. */
const FOOD_HEALTHY=['veggies','protein','berries','greens','dairy'];
const FOOD_POOR=['sugary','fried','starch'];
/* 'grains' is in neither list on purpose: a neutral filler that shouldn't reward or penalise.
   Those two arrays are the seed only. What actually counts is S.foodCats, which starts as a copy
   of the chip list and is editable. Scoring reads that list rather than the constants, so a
   category you add is scored exactly like a built-in one. */
function foodCats(){
  if(!Array.isArray(S.foodCats)||!S.foodCats.length) backfillFoodCats();
  return S.foodCats;
}
function backfillFoodCats(){
  if(Array.isArray(S.foodCats)&&S.foodCats.length) return;
  S.foodCats=FOOD_CHIP_SEED.map(function(c){ return {id:c.id, cls:c.cls}; });
}
function foodCatCls(id){
  const c=foodCats().filter(function(x){ return x.id===id; })[0];
  if(c) return c.cls;
  /* a category logged before it was deleted still has to score the way it did at the time */
  if(FOOD_HEALTHY.indexOf(id)>=0) return 'good';
  if(FOOD_POOR.indexOf(id)>=0) return 'bad';
  return '';
}
function addFoodCat(name,cls){
  const nv=String(name||'').trim().toLowerCase();
  if(!nv) return;
  if(foodCats().some(function(c){ return c.id===nv; })){ toast('That category already exists'); return; }
  S.foodCats.push({id:nv, cls:(cls==='good'||cls==='bad')?cls:''});
  save(); render(); toast('Added '+nv);
}
function submitFoodCat(){
  const el=document.getElementById('newFoodCat'), sel=document.getElementById('newFoodCatCls');
  if(!el) return;
  addFoodCat(el.value,sel&&sel.value);
  el.value='';
}
/* deleting only takes it out of the picker - meals already logged keep their categories, and
   foodCatCls falls back to the seed lists so an old day's score doesn't silently change */
function delFoodCat(id,ev){
  if(ev) ev.stopPropagation();
  if(!arm('fc:'+id)) return;
  S.foodCats=foodCats().filter(function(c){ return c.id!==id; });
  mealDraft=mealDraft.filter(function(x){ return x!==id; });
  armed=null; save(); render();
}
function foodScore(k){
  const dd=S.days[k]; if(!dd||!dd.meals||!dd.meals.length) return null;
  let good=0, bad=0;
  dd.meals.forEach(function(m){ (m.cats||[]).forEach(function(c){
    const cls=foodCatCls(c);
    if(cls==='good') good++; else if(cls==='bad') bad++;
  }); });
  if(!good&&!bad) return null;
  return good/(good+bad);
}
function blockScore(k){
  const dd=S.days[k]; if(!dd||!dd.blocks||!dd.blocks.length) return null;
  const withTasks=dd.blocks.filter(function(b){ return blockTasksFor(b,k).length; });
  if(!withTasks.length) return null;
  const cleared=withTasks.filter(function(b){
    return blockTasksFor(b,k).every(function(t){ return itemDone(t,k); });
  }).length;
  return cleared/withTasks.length;
}
function habitScore(k){
  const rows=habitRows(); if(!rows.length) return null;
  const done=rows.filter(function(h){ return habitDoneOnDay(h.id,k); }).length;
  return done/rows.length;
}
function dayScore(k){
  if(k>today()) return 0;
  const dd=S.days[k];
  const parts=[];
  if(dd&&dd.water) parts.push(Math.min(1,dd.water/goalOn(k)));
  const f=foodScore(k); if(f!==null) parts.push(f);
  const h=habitScore(k); if(h!==null) parts.push(h);
  const b=blockScore(k); if(b!==null) parts.push(b);
  if(!parts.length) return 0;
  return parts.reduce(function(a,x){return a+x;},0)/parts.length;
}
/* ===================== no-spend streak ===================== */
function spentOnDay(dayKey){ return (S.txns||[]).some(function(t){return t.day===dayKey;}); }
function noSpendStreak(){
  let streak=0;
  for(let n=0;n<365;n++){
    const k=shiftKey(today(),-n);
    if(spentOnDay(k)) break;
    streak++;
  }
  return streak;
}
function toggleNoSpendDay(dayKey){ toggleEdit('nospend:'+dayKey); }
function addSpendForDay(dayKey){
  const nameEl=document.getElementById('nsName'), amtEl=document.getElementById('nsAmt');
  const name=(nameEl&&nameEl.value||'').trim();
  const amt=Math.round((parseFloat(amtEl&&amtEl.value)||0)*100);
  if(!name||amt<=0) return;
  editing=null;
  logSpend(name,amt,dayKey);
}
/* ===================== backup ===================== */
function downloadSnapshot(silent){
  const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='aura-farm-backup-'+today()+'.json'; a.click();
  S.lastBackup=today(); save();
  if(!silent) toast('Backup downloaded'); render();
}
function maybeAutoBackup(){ if(S.lastBackup!==today()) downloadSnapshot(true); }
function onImportFile(ev){
  const f=ev.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=function(){
    try{
      const obj=JSON.parse(r.result);
      if(acceptVersion(obj)) adoptState(obj);
      else toast('That file doesn\u2019t look like an Aura Farm backup');
    }catch(e){ toast('Could not read that file'); }
  };
  r.readAsText(f);
  ev.target.value='';
}
/* the single way a restored state enters the app: hydrate it exactly as a fresh load would,
   then repaint everything (layout and theme included, which the old path forgot) */
function adoptState(obj){
  S=obj;
  const res=hydrateState();
  reconcile(); editing=null; save(); repaintEverything();
  toast(res.restored?('Backup restored \u00b7 '+res.restored+' habit'+(res.restored===1?'':'s')+' rebuilt')
                    :'Backup restored');
}
/* paste-in restore: same thing as the file picker, for whenever a file download/upload isn't
   available (a sandboxed frame, a phone, moving data over from another browser) — open the
   backup JSON, copy all of it, paste it here */
function restoreFromPaste(){
  const el=document.getElementById('restorePasteIn'); if(!el) return;
  const txt=(el.value||'').trim();
  if(!txt){ toast('Paste your backup JSON first'); return; }
  let obj=null;
  try{ obj=JSON.parse(txt); }catch(e){ toast('That isn\u2019t valid JSON \u2014 copy the whole file'); return; }
  if(!acceptVersion(obj)){ toast('That doesn\u2019t look like an Aura Farm backup'); return; }
  adoptState(obj);
}
function exportData(){ downloadSnapshot(false); }
function hardReset(){
  if(!arm('reset')) { document.getElementById('resetBtn').textContent='tap again to erase everything'; return; }
  S=blankState(); save(); reconcile();
  document.getElementById('resetBtn').textContent='reset all';
  render();
}
/* ===================== fx ===================== */
function toast(msg){
  document.querySelectorAll('.toast').forEach(function(t){t.remove();});
  const t=document.createElement('div'); t.className='toast'; t.textContent=msg;
  document.body.appendChild(t); setTimeout(function(){t.remove();},2800);
}
function glow(id){ const el=document.getElementById(id); if(!el)return;
  el.classList.remove('glowpulse'); void el.offsetWidth; el.classList.add('glowpulse'); }
function celebrateBurst(big){
  const ev=(typeof window!=='undefined')?window.event:null;
  const x=ev&&ev.clientX?ev.clientX:innerWidth/2;
  const y=ev&&ev.clientY?ev.clientY:innerHeight/2;
  const n=big?14:7;
  const cols=['var(--pink-deep)','var(--lav-deep)','var(--leaf-deep)'];
  for(let i=0;i<n;i++){
    const el=document.createElement('div');
    el.className='burstdot';
    const a=(Math.PI*2*i)/n+Math.random()*0.5;
    const r=(big?52:32)+Math.random()*(big?26:16);
    el.style.setProperty('--dx',(Math.cos(a)*r)+'px');
    el.style.setProperty('--dy',(Math.sin(a)*r-14)+'px');
    el.style.left=x+'px'; el.style.top=y+'px';
    el.style.background=cols[i%cols.length];
    document.body.appendChild(el);
    setTimeout(function(){el.remove();},760);
  }
}
/* ===================== view mode ===================== */
/* The laptop opens on the focus screen: what you are meant to be doing right now, and the one
   task at the top of it. Everything else - the timeline, the inbox, the week - is a click away
   from there. The phone keeps opening on its own day view, which is already built around the
   same idea and has no room for a second landing layer. */
let viewMode=(typeof window!=='undefined'&&window.innerWidth>760)?'focus':'today';
const VIEWS=['focus','today','planning','notes','month','more'];
function setView(v){ viewMode=v; window.scrollTo(0,0); render(); }
/* ===================== panel/block expand rules ===================== */
function panelExpanded(r){
  const d=day(vday());
  const req=itemsFor(r).filter(function(i){return i.type==='core'||i.type==='med';});
  const allDone=req.length>0&&req.every(function(i){return isDone(i.id);})&&ritualQuests(r).every(function(i){return isDone(i.id);});
  const nm=nowMinutes();
  /* the time-of-day default only means anything for today; on any other day just open whatever
     still has something outstanding in it */
  const def = !isViewingToday() ? !allDone
    : (r==='sunrise' ? (!allDone && nm<12*60) : (!allDone && nm>=17*60));
  return manualPanel[r]!==undefined?manualPanel[r]:def;
}
/* ===================== Prism Terminal — mobile shell =====================
   The phone frame from the redesign: a sticky header (stardate, day-of-week score rings, four
   tracker rings, day progress) and a four-tab bottom bar. It does NOT own navigation state — the
   tabs call setView(), the same router the desktop tab strip uses, so there is exactly one idea
   of which view is showing. Everything here reads the same state the desktop cards do. */
let openSheetKind=null;
/* stardate, purely decorative: years since 1946 + day-of-year + the fraction of the day elapsed */
function stardate(){
  const n=new Date();
  const doy=Math.floor((n-new Date(n.getFullYear(),0,0))/86400000);
  return 'SD '+(n.getFullYear()-1946)+String(doy).padStart(3,'0')+'.'+
    Math.floor((n.getHours()*60+n.getMinutes())/144);
}
/* an SVG progress ring. pct 0..1, drawn from 12 o'clock via the -90deg rotate in CSS. */
function ringSvg(pct,color,r,sw){
  const C=2*Math.PI*r;
  const off=C*(1-Math.max(0,Math.min(1,pct)));
  return '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="'+r+'" fill="none" stroke="var(--glass-strong)" stroke-width="'+sw+'"></circle>'+
    '<circle cx="50" cy="50" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="'+sw+'" '+
    'stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'"></circle></svg>';
}
function scoreColor(sc){ return sc>=0.75?'var(--mint-deep)':sc>=0.45?'var(--aqua-deep)':'#3b6b47'; }
/* the four tracker rings. Each returns {pct, color, glyph, value} and opens its sheet. */
function trackerRings(){
  const k=vday(), d=day(k);
  const monthly=budgetMonthlyCents(), spent=spentInPeriod();
  const f=foodScore(k);
  const notesToday=(S.logEntries||[]).filter(function(n){return n.day===k;}).length;
  const APPLE='<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.2 8.3c-1 0-2 .5-2.9.5-.9 0-1.9-.5-3-.5-1.6 0-3.9 1.4-3.9 5 0 3.5 2.7 7.8 4.3 7.8.8 0 1.3-.5 2.5-.5s1.6.5 2.5.5c1.4 0 3.1-2.7 3.9-4.3-2.6-1.1-2.9-5.4.2-6.6-.9-1.2-2.2-1.9-3.6-1.9zM13 5.3c.7-.9 1.2-2.1 1-3.3-1.1.1-2.4.8-3.1 1.7-.7.8-1.3 2-1.1 3.2 1.2.1 2.5-.6 3.2-1.6z"></path></svg>';
  const PENCIL='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20l1-4.5L15.5 5l3.5 3.5L8.5 19 4 20z"></path><path d="M13.2 6.8l3.5 3.5"></path></svg>';
  return [
    {kind:'money', glyph:'$', color:'var(--pink-deep)',
     pct: monthly?Math.max(0,(monthly-spent))/monthly:0,
     value: monthly?dollarsStr(Math.max(0,monthly-spent)):dollarsStr(spent)},
    {kind:'food', glyph:APPLE, color:(f===null?'var(--ink-3)':f>=0.6?'var(--mint-deep)':f>=0.35?'var(--pink-deep)':'var(--alert)'),
     pct:(f===null?0:f), value:(f===null?'—':Math.round(f*100)+'%')},
    {kind:'water', glyph:'≋', color:'var(--aqua-deep)',
     pct: Math.min(1,d.water/goalOn(k)), value: d.water+'oz'},
    {kind:'notes', glyph:PENCIL, color:'var(--mint-deep)',
     pct: notesToday?1:0, value: notesToday?notesToday+' logged':'—'},
  ];
}
function renderPrismShell(){
  const host=document.getElementById('prismShell');
  if(!host) return;
  const k=vday(), d=day(k);
  const p=k.split('-').map(Number), dt=new Date(p[0],p[1]-1,p[2]);
  /* the week containing the viewed day, Sunday-first to match the design */
  const wkStart=new Date(dt); wkStart.setDate(dt.getDate()-dt.getDay());
  const letters=['S','M','T','W','T','F','S'];
  let dots='';
  for(let i=0;i<7;i++){
    const dd=new Date(wkStart); dd.setDate(wkStart.getDate()+i);
    const dk=dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')+'-'+String(dd.getDate()).padStart(2,'0');
    const sc=dayScore(dk), sel=dk===k;
    dots+='<button class="psdot'+(sel?' on':'')+'" onclick="setViewDay(\''+dk+'\')" title="'+dk+'">'+
      '<span class="rw">'+ringSvg(sc,scoreColor(sc),43,9)+'<span class="face">'+letters[i]+'</span></span></button>';
  }
  let rings='';
  trackerRings().forEach(function(r){
    rings+='<button class="psring" onclick="openSheet(\''+r.kind+'\')">'+
      '<span class="rw">'+ringSvg(r.pct,r.color,43,7)+
      '<span class="gl" style="color:'+r.color+'">'+r.glyph+'</span></span>'+
      '<span class="vl">'+r.value+'</span></button>';
  });
  const blocks=(d.blocks||[]).filter(function(b){ return blockTasksFor(b,k).length; });
  const cleared=blocks.filter(function(b){ return blockTasksFor(b,k).every(function(t){return itemDone(t,k);}); }).length;
  const pct=blocks.length?Math.round(cleared/blocks.length*100):0;
  host.innerHTML=
    '<div class="pshead">'+
      '<div class="psbar"><span>PRISM MK VII · LOCAL</span><span>'+stardate()+'</span></div>'+
      '<div class="psdayrow">'+
        '<div class="psnum"><div class="mo">'+dt.toLocaleDateString(undefined,{month:'short'}).toUpperCase()+'</div>'+
        '<div class="dd">'+dt.getDate()+'</div></div>'+
        '<div class="psweek">'+
          '<button class="psarrow" onclick="shiftViewDay(-7)">←</button>'+dots+
          '<button class="psarrow" onclick="shiftViewDay(7)">→</button>'+
        '</div>'+
      '</div>'+
      '<div class="psrings">'+rings+'</div>'+
      '<div class="psprog"><div class="track"><div class="fill" style="width:'+pct+'%"></div></div>'+
        '<span class="cap">'+cleared+'/'+blocks.length+' · '+pct+'%</span></div>'+
    '</div>';
  renderSheets();
}
/* one task inside a block, wherever a block shows its contents: the focus card at the top of the
   desktop, and the block detail panel. Checkbox, a play button that runs that task's own timer,
   and its subtasks nested underneath. The play button is the same toggleTaskTimerBank the bank
   rows use, so a task timed from inside a block and one timed from the inbox are the same timer
   with the same history - not two ideas of "how long did this take". */
function blockTaskRowHTML(t,k,opts){
  opts=opts||{};
  const dn=itemDone(t,k), running=!!t.timerStart, el=taskElapsed(t);
  const subs=subtasksOf(t);
  return '<div class="btrow'+(dn?' done':'')+(running?' running':'')+'">'+
    '<button class="btbox" onclick="toggleUnit(\''+t.id+'\',event)" title="'+(dn?'mark not done':'mark done')+'">'+(dn?'✓':'')+'</button>'+
    '<span class="bttext"'+(opts.draggable?' draggable="true" ondragstart="onTaskDragStart(event,\''+t.id+'\')"':'')+'>'+
      String(t.text).replace(/</g,'&lt;')+'</span>'+
    (el?'<span class="btel" data-timer-live-task="'+t.id+'">'+mmss(el)+'</span>':'')+
    '<button class="btplay'+(running?' on':'')+'" onclick="toggleTaskTimerBank(\''+t.id+'\',event)" '+
      'title="'+(running?'pause this task':'start timing this task')+'">'+(running?'❚❚':'▶')+'</button>'+
    (subs.length?'<div class="btsubs">'+subs.map(function(s){
      const sdn=itemDone(s,k);
      return '<div class="btsub'+(sdn?' done':'')+'">'+
        '<button class="btbox sm" onclick="toggleUnit(\''+s.id+'\',event)">'+(sdn?'✓':'')+'</button>'+
        '<span class="bttext">'+String(s.text).replace(/</g,'&lt;')+'</span>'+
        '<button class="btplay sm'+(s.timerStart?' on':'')+'" onclick="toggleTaskTimerBank(\''+s.id+'\',event)">'+(s.timerStart?'❚❚':'▶')+'</button>'+
        '</div>';
    }).join('')+'</div>':'')+
    '</div>';
}
/* the current block, pinned above the timeline on the desktop. Same idea as the phone's priority
   card (renderPrismFocus) but with room to show the tasks properly rather than as a bare list -
   each one checkable, timeable and expanded to its subtasks. */
function renderDeskFocus(){
  const host=document.getElementById('deskFocus');
  if(!host) return;
  if(!isViewingToday()||viewMode!=='today'){ host.innerHTML=''; host.classList.remove('has'); return; }
  const d=day(vday());
  const b=(d.blocks||[]).filter(function(x){ return isCurrentBlock(x)&&!isEmptyBlock(x); })[0];
  if(!b){
    /* nothing scheduled right now is worth saying out loud rather than leaving a gap */
    const nxt=(d.blocks||[]).filter(function(x){ return !isEmptyBlock(x)&&toMin(x.start)>nowMinutes()%1440; })
      .sort(function(a,c){ return toMin(a.start)-toMin(c.start); })[0];
    host.classList.add('has');
    host.innerHTML='<div class="dfcard empty"><div class="dfnow">nothing scheduled right now</div>'+
      (nxt?'<div class="dfnext">next up · <b>'+String(nxt.focus||'untitled').replace(/</g,'&lt;')+'</b> at '+nxt.start+'</div>'
         :'<div class="dfnext">the rest of the day is open — click any empty stretch to make a block</div>')+
      '</div>';
    return;
  }
  const st=toMin(b.start), dur=blockDur(b), nm=nowMinutes()%1440;
  const leftMin=Math.max(0,st+dur-nm);
  const pct=dur?Math.min(1,Math.max(0,(nm-st)/dur)):0;
  const tasks=blockAllTasks(b,vday());
  const done=tasks.filter(function(t){ return itemDone(t,vday()); }).length;
  const locked=focusBlockId===b.id;
  host.classList.add('has');
  host.innerHTML=
    '<div class="dfcard'+(locked?' locked':'')+'">'+
      '<div class="dfring">'+ringSvg(pct,locked?'var(--pink-deep)':'var(--mint-deep)',42,9)+
        '<span class="dfmin"><b>'+leftMin+'</b><i>min</i></span></div>'+
      '<div class="dfmain">'+
        '<div class="dfk">'+(locked?'locked in':'current focus')+'</div>'+
        '<div class="dft">'+String(b.focus||b.calTitle||'open block').replace(/</g,'&lt;')+'</div>'+
        '<div class="dfmeta">'+b.start+'–'+(b.end||'')+(tasks.length?' · '+done+'/'+tasks.length+' done':' · no tasks yet')+'</div>'+
        (tasks.length?'<div class="dftasks">'+tasks.map(function(t){ return blockTaskRowHTML(t,vday()); }).join('')+'</div>':'')+
      '</div>'+
      '<div class="dfbtns">'+
        '<button class="dfgo'+(locked?' on':'')+'" onclick="'+(locked?'exitFocus()':'lockIn(\''+b.id+'\')')+'" '+
          'title="'+(locked?'stop the focus session':'start focusing on this block')+'">'+(locked?'❚❚ hold':'▶ focus')+'</button>'+
        '<button class="dfalt" onclick="toggleBlock(\''+b.id+'\')">open</button>'+
      '</div>'+
    '</div>';
}
/* ===================== the focus screen =====================
   The laptop's landing view. One question answered above everything else - what am I meant to be
   doing right now, and what is the single next thing inside it - with the handful of numbers that
   are worth a glance underneath, and a way out to the timeline, the inbox and the week.
   It is always about *now*, whatever day the rail is pointed at: a focus screen for last Tuesday
   is a contradiction. Changing days from the rail moves you to the day view instead (goDay). */
function goDay(k){ setViewDay(k); setView('today'); }
function nextBlockToday(){
  const k=today(), d=S.days[k]; if(!d||!d.blocks) return null;
  const nm=nowMinutes()%1440;
  return d.blocks.filter(function(b){ return !isEmptyBlock(b)&&toMin(b.start)>nm; })
    .sort(function(a,b){ return toMin(a.start)-toMin(b.start); })[0]||null;
}
/* the one task the focus screen leads with: the first thing in the block that isn't done yet.
   Falls back to nothing rather than to a finished task - "next up: something you already did"
   is worse than an empty state. */
function topTaskOf(b,k){
  return blockAllTasks(b,k).filter(function(t){ return !itemDone(t,k); })[0]||null;
}
function focusTrackerRowHTML(){
  const wanted={water:1,food:1,money:1};
  let out='';
  trackerRings().filter(function(r){ return wanted[r.kind]; }).forEach(function(r){
    const label=r.kind==='food'?'health':r.kind;
    out+='<button class="fhring" onclick="openSheet(\''+r.kind+'\')">'+
      '<span class="rw">'+ringSvg(r.pct,r.color,43,8)+
      '<span class="gl" style="color:'+r.color+'">'+r.glyph+'</span></span>'+
      '<span class="lb">'+label+'</span><span class="vl">'+r.value+'</span></button>';
  });
  const nb=nextBlockToday();
  out+='<div class="fhnext'+(nb?'':' empty')+'"'+(nb?' onclick="goBlock(\''+nb.id+'\')"':'')+'>'+
    '<span class="lb">next up</span>'+
    (nb?'<span class="tt">'+String(nb.focus||nb.calTitle||'untitled').replace(/</g,'&lt;')+'</span>'+
        '<span class="tm">'+nb.start+'–'+(nb.end||'')+'</span>'
       :'<span class="tt">nothing else scheduled</span>'+
        '<span class="tm">the rest of the day is yours</span>')+
    '</div>';
  return out;
}
function goBlock(id){ setViewDay(today()); setView('today'); panelOverride=id; render(); }
function renderFocusHome(){
  const host=document.getElementById('focusView');
  if(!host||viewMode!=='focus') return;
  const k=today(), d=day(k);
  const b=(d.blocks||[]).filter(function(x){ return isCurrentBlock(x)&&!isEmptyBlock(x); })[0];
  let hero;
  if(!b){
    const nb=nextBlockToday();
    hero='<div class="fhhero idle">'+
      '<div class="fhk">nothing scheduled right now</div>'+
      (nb?'<div class="fhtop">'+String(nb.focus||'untitled').replace(/</g,'&lt;')+'</div>'+
          '<div class="fhmeta">starts at '+nb.start+'</div>'
         :'<div class="fhtop">the day is open</div>'+
          '<div class="fhmeta">make a block on the timeline whenever you want one</div>')+
      '<div class="fhbtns"><button class="fhgo" onclick="setView(\'today\')">open the timeline</button></div>'+
      '</div>';
  } else {
    const st=toMin(b.start), dur=blockDur(b), nm=nowMinutes()%1440;
    const leftMin=Math.max(0,st+dur-nm);
    const pct=dur?Math.min(1,Math.max(0,(nm-st)/dur)):0;
    const all=blockAllTasks(b,k);
    const done=all.filter(function(t){ return itemDone(t,k); }).length;
    const top=topTaskOf(b,k);
    const rest=all.filter(function(t){ return !top||t.id!==top.id; });
    const locked=focusBlockId===b.id;
    hero='<div class="fhhero'+(locked?' locked':'')+'">'+
      '<div class="fhtoprow">'+
        '<div class="fhring">'+ringSvg(pct,locked?'var(--pink-deep)':'var(--mint-deep)',42,9)+
          '<span class="fhmin"><b>'+leftMin+'</b><i>min left</i></span></div>'+
        '<div class="fhwhat">'+
          '<div class="fhk">'+(locked?'locked in':'right now')+'</div>'+
          '<div class="fhblock">'+String(b.focus||b.calTitle||'open block').replace(/</g,'&lt;')+'</div>'+
          '<div class="fhmeta">'+b.start+'–'+(b.end||'')+' · '+done+'/'+all.length+' done</div>'+
        '</div>'+
        '<div class="fhbtns">'+
          '<button class="fhgo'+(locked?' on':'')+'" onclick="'+(locked?'exitFocus()':'lockIn(\''+b.id+'\')')+'">'+
            (locked?'❚❚ hold':'▶ focus')+'</button>'+
          '<button class="fhalt" onclick="goBlock(\''+b.id+'\')">open block</button>'+
        '</div>'+
      '</div>'+
      (top?
        '<div class="fhtask">'+
          '<div class="fhtk">top task</div>'+
          '<div class="fhtrow">'+
            '<button class="fhbox" onclick="toggleUnit(\''+top.id+'\',event)" title="mark done"></button>'+
            '<span class="fhtx">'+String(top.text).replace(/</g,'&lt;')+'</span>'+
            (taskElapsed(top)?'<span class="fhel" data-timer-live-task="'+top.id+'">'+mmss(taskElapsed(top))+'</span>':'')+
            '<button class="fhplay'+(top.timerStart?' on':'')+'" onclick="toggleTaskTimerBank(\''+top.id+'\',event)">'+
              (top.timerStart?'❚❚ pause':'▶ start')+'</button>'+
          '</div>'+
          (subtasksOf(top).length?'<div class="fhsubs">'+subtasksOf(top).map(function(sx){
            const sd=itemDone(sx,k);
            return '<div class="fhsub'+(sd?' done':'')+'">'+
              '<button class="btbox sm" onclick="toggleUnit(\''+sx.id+'\',event)">'+(sd?'✓':'')+'</button>'+
              '<span>'+String(sx.text).replace(/</g,'&lt;')+'</span></div>';
          }).join('')+'</div>':'')+
        '</div>'
        :'<div class="fhtask empty"><div class="fhtk">top task</div>'+
         '<div class="fhtrow"><span class="fhtx dim">'+(all.length?'everything in this block is done':'nothing pinned to this block yet')+'</span>'+
         '<button class="fhalt" onclick="goBlock(\''+b.id+'\')">'+(all.length?'open block':'add tasks')+'</button></div></div>')+
      (rest.length?'<div class="fhrest"><div class="fhtk">also in this block</div>'+
        rest.map(function(t){ return blockTaskRowHTML(t,k); }).join('')+'</div>':'')+
      '</div>';
  }
  host.innerHTML=hero+'<div class="fhtrackers">'+focusTrackerRowHTML()+'</div>'+
    '<div class="fhnav">'+
      '<button onclick="setView(\'today\')"><b>day</b><span>timeline &amp; inbox</span></button>'+
      '<button onclick="setView(\'planning\')"><b>week</b><span>plan the calendar</span></button>'+
      '<button onclick="openSheet(\'habits\')"><b>track</b><span>habits, reading, more</span></button>'+
      '<button onclick="setView(\'notes\')"><b>notes</b><span>this week’s log</span></button>'+
    '</div>';
}
/* ===================== desktop sidebar =====================
   Replaces the hero header above 900px. The header laid the date, day navigation and a single
   water bar across the top and left every other tracker to the card grid, which meant most of
   them were only visible if you scrolled past the timeline. Down the left they are all in view
   at once, and the full width of the page is free for the thing you actually work in.
   Three shapes, by how much attention each earns: the date/week header, rings for the things
   logged many times a day (water, food, money - the same three the phone shows, off the same
   trackerRings() source), and thin bars for the ones that move once a day or less.
   Everything here is a read-only summary that opens the real editor as a slide-over. No logging
   UI is duplicated. */
function sidebarBars(){
  const k=vday();
  const h=habitScore(k);
  let pagesWk=0; for(let n=0;n<7;n++){ const dd=S.days[shiftKey(k,-n)]; if(dd) pagesWk+=dd.pagesLogged||0; }
  let mediDays=0; for(let n=0;n<7;n++){ const dd=S.days[shiftKey(k,-n)]; if(dd&&dd.done&&dd.done['medit']) mediDays++; }
  const moveWk=weekMove();
  const rows=habitRows();
  const habitDone=rows.filter(function(r){ return habitDoneOnDay(r.id,k); }).length;
  return [
    {key:'habits', sheet:'habits', glyph:'◈', label:'habits',
     pct:(h===null?0:h), value:rows.length?habitDone+'/'+rows.length:'—', color:'var(--lav-deep)'},
    {key:'reading', sheet:'reading', glyph:'▤', label:'reading',
     pct:S.readGoal?Math.min(1,pagesWk/S.readGoal):0, value:pagesWk+'/'+S.readGoal+'p', color:'var(--aqua-deep)'},
    {key:'medi', sheet:'medi', glyph:'❍', label:'meditation',
     pct:mediDays/7, value:mediDays+'/7d', color:'var(--mint-deep)'},
    {key:'exercise', sheet:'exercise', glyph:'⚡', label:'exercise',
     pct:S.moveGoal?Math.min(1,moveWk/S.moveGoal):0, value:moveWk+'/'+S.moveGoal+'m', color:'var(--pink-deep)'}
  ];
}
function nextPaper(){
  const open=(S.papers||[]).filter(function(p){ return p.status!=='notes taken'; });
  /* whatever is furthest along comes up first - something half-read is a smaller commitment than
     starting a new one, so 'skimmed' outranks 'queued' */
  const rank={skimmed:0,queued:1};
  open.sort(function(a,b){
    const ra=(rank[a.status]===undefined?2:rank[a.status]), rb=(rank[b.status]===undefined?2:rank[b.status]);
    return ra-rb || (a.createdAt||0)-(b.createdAt||0);
  });
  return open[0]||null;
}
function renderDeskSidebar(){
  const host=document.getElementById('deskSidebar');
  if(!host) return;
  const k=vday();
  const p=k.split('-').map(Number), dt=new Date(p[0],p[1]-1,p[2]);
  const wkStart=new Date(dt); wkStart.setDate(dt.getDate()-dt.getDay());
  const letters=['S','M','T','W','T','F','S'];
  let dots='';
  for(let i=0;i<7;i++){
    const dd=new Date(wkStart); dd.setDate(wkStart.getDate()+i);
    const dk=dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')+'-'+String(dd.getDate()).padStart(2,'0');
    const sc=dayScore(dk), sel=dk===k, isTdy=dk===today();
    dots+='<button class="dsdot'+(sel?' on':'')+(isTdy?' istoday':'')+'" onclick="goDay(\''+dk+'\')" title="'+dk+'">'+
      '<span class="rw">'+ringSvg(sc,scoreColor(sc),43,10)+'<span class="face">'+letters[i]+'</span></span>'+
      '<span class="dnum">'+dd.getDate()+'</span></button>';
  }
  const wanted={water:1,food:1,money:1};
  let rings='';
  trackerRings().filter(function(r){ return wanted[r.kind]; }).forEach(function(r){
    rings+='<button class="dsring" onclick="openSheet(\''+r.kind+'\')" title="'+r.kind+'">'+
      '<span class="rw">'+ringSvg(r.pct,r.color,43,8)+
      '<span class="gl" style="color:'+r.color+'">'+r.glyph+'</span></span>'+
      '<span class="vl">'+r.value+'</span></button>';
  });
  let bars='';
  sidebarBars().forEach(function(b){
    bars+='<button class="dsbar" onclick="openSheet(\''+b.sheet+'\')">'+
      '<span class="bg" style="color:'+b.color+'">'+b.glyph+'</span>'+
      '<span class="bmid"><span class="btop"><span class="bl">'+b.label+'</span>'+
      '<span class="bv">'+b.value+'</span></span>'+
      '<span class="btrack"><span class="bfill" style="width:'+Math.round(Math.max(0,Math.min(1,b.pct))*100)+'%;background:'+b.color+'"></span></span>'+
      '</span></button>';
  });
  const np=nextPaper();
  const paper=np?
    '<button class="dspaper" onclick="openSheet(\'papers\')">'+
      '<span class="pk">next paper</span>'+
      '<span class="pt">'+String(np.title).replace(/</g,'&lt;')+'</span>'+
      '<span class="pstat">'+String(np.status)+'</span></button>'
    :'<button class="dspaper empty" onclick="openSheet(\'papers\')">'+
      '<span class="pk">next paper</span><span class="pt">queue is empty</span></button>';
  const notifState=notifyPermission();
  host.innerHTML=
    '<div class="dsinner">'+
      '<div class="dstop">'+
        '<div class="dsdate">'+
          '<div class="dsmo">'+dt.toLocaleDateString(undefined,{month:'short'}).toUpperCase()+'</div>'+
          '<div class="dsdd">'+dt.getDate()+'</div>'+
          '<div class="dsdow">'+dt.toLocaleDateString(undefined,{weekday:'long'})+'</div>'+
        '</div>'+
        '<div class="dsnav">'+
          '<button onclick="shiftViewDay(-1)" aria-label="previous day">‹</button>'+
          '<button class="tdy" onclick="goToday()" title="jump back to today">today</button>'+
          '<button onclick="shiftViewDay(1)" aria-label="next day">›</button>'+
        '</div>'+
      '</div>'+
      '<div class="dsweek">'+dots+'</div>'+
      /* the view switcher lives here now. It used to be the .viewtabs strip inside the hero, and
         the hero is what the rail replaced - without this there was no way back to the focus
         screen once you had navigated off it. */
      '<nav class="dsnav2">'+
        [['focus','focus'],['today','day'],['planning','week'],['month','month'],['notes','notes'],['more','more']]
        .map(function(v){
          return '<button class="'+(viewMode===v[0]?'on':'')+'" onclick="setView(\''+v[0]+'\')">'+v[1]+'</button>';
        }).join('')+
      '</nav>'+
      '<div class="dsrings">'+rings+'</div>'+
      '<div class="dsbars">'+bars+'</div>'+
      paper+
      '<div class="dsfoot">'+
        (notifState==='granted'?'<span class="dsok">◉ alerts on</span>':
         notifState==='denied'?'<span class="dsoff" title="re-enable in your browser’s site settings">◌ alerts blocked</span>':
         notifState==='unsupported'?'':
         '<button class="dsnotif" onclick="enableNotifications()">◌ turn on alerts</button>')+
        '<span class="dssync">'+ghStatusText()+'</span>'+
      '</div>'+
    '</div>';
}
/* ===================== tracker sheets =====================
   openSheet drives two presentations of the same thing: the bottom sheet on a phone, and the
   slide-over on the desktop. The desktop one does not re-implement any of it - for every tracker
   that already has a card, the card's own DOM node is *moved* into the panel and moved back when
   it closes. Moving rather than cloning is the whole point: the node keeps its identity, so every
   getElementById in render() keeps finding it and every inline handler keeps working, with no
   second copy to keep in sync. Food and notes have no card (they were built as phone sheets), so
   those two fall through to the sheet markup, restyled for the side. */
const DESK_PANEL_CARD={
  water:'waterCard', money:'spendCard', habits:'habitStreakCard', reading:'bookshelfCard',
  medi:'meditationCard', exercise:'movementCard', papers:'papersCard', quests:'questCard'
};
const DESK_PANEL_TITLE={
  water:'water', money:'spending', habits:'habit streaks', reading:'bookshelf',
  medi:'meditation', exercise:'movement', papers:'paper queue', quests:'side quests',
  food:'food', notes:'log'
};
/* ---------- borrowing a card's DOM node ----------
   Which column a card sits in is user state (S.layout.cols, applied by applyLayoutDom), so the
   desktop layout can't be expressed by hiding columns or by hiding cards by id - the first
   version of this hid #todayColA and lost the timeline, because that is simply where this user
   had dragged it. Instead the two nodes the desktop needs are *moved* to where it wants them and
   moved back below the breakpoint. Moving keeps each node's identity, so every getElementById in
   render() still finds it and there is never a second copy to keep in sync. */
let domHomes={};
function isDesktopLayout(){ return typeof window!=='undefined'&&window.innerWidth>900; }
function relocateNode(id,host,cls){
  const node=document.getElementById(id);
  if(!node||!host||node.parentNode===host) return 0;
  if(!domHomes[id]) domHomes[id]={parent:node.parentNode, next:node.nextSibling};
  if(cls) node.classList.add(cls);
  host.appendChild(node);
  return 1;
}
function restoreNode(id){
  const node=document.getElementById(id), home=domHomes[id];
  if(!node||!home){ return; }
  node.classList.remove('inpanel','indesk');
  if(home.parent&&home.parent.isConnected){
    if(home.next&&home.next.parentNode===home.parent) home.parent.insertBefore(node,home.next);
    else home.parent.appendChild(node);
  }
  delete domHomes[id];
}
/* the timeline and the inbox, side by side under the focus card */
function syncDeskDay(){
  const wrap=document.getElementById('deskDay');
  if(!wrap) return;
  const on=isDesktopLayout()&&viewMode==='today';
  wrap.classList.toggle('on',on);
  /* The drawer is position:fixed, so where it sits in the DOM has no bearing on where it draws -
     but it does decide whether it draws at all. It lives inside .grid, the desktop hides .grid,
     and display:none takes the whole subtree with it, fixed children included. The result was a
     panel that opened (display:block, 12KB of markup) and measured 0x0, so clicking a block
     looked like it did nothing. Parking it on <body> keeps it out of any hidden ancestor.
     Handled before the day-view gate below so a block opened from the week grid or the focus
     screen gets a visible drawer too. */
  if(isDesktopLayout()) relocateNode('blockDetailPanel',document.body);
  else restoreNode('blockDetailPanel');
  if(!on){
    const had=['card-day','todayTasksCard'].filter(function(id){ return domHomes[id]; });
    ['card-day','todayTasksCard'].forEach(restoreNode);
    /* the recorded home is only a fallback: S.layout.cols is the real answer to where a card
       belongs, and it can have changed while the card was borrowed. Re-running the layout puts
       both back in their proper columns instead of leaving them wherever they were picked up. */
    if(had.length) applyLayoutDom();
    return;
  }
  const moved=relocateNode('card-day',document.getElementById('deskTimelinePane'),'indesk')
    |relocateNode('todayTasksCard',document.getElementById('deskInboxPane'),'indesk');
  /* the timeline only gains its scrollable height once it is in the pane, so the first anchor
     attempt during render() ran against a container with nothing to scroll */
  /* moving a node resets its scrollTop, so an anchor that already ran is undone by the move and
     has to be re-armed - otherwise the once-per-day guard sees the day as already anchored and
     leaves the timeline sitting at 6am */
  if(moved){ timelineAnchoredFor=null; scrollTimelineIntoView(document.getElementById('timeline')); }
}
function syncDeskPanel(){
  const panel=document.getElementById('deskPanel');
  if(!panel) return;
  const body=document.getElementById('deskPanelBody');
  const wantCard=isDesktopLayout()&&openSheetKind?DESK_PANEL_CARD[openSheetKind]:null;
  /* put back anything borrowed by the panel that is no longer wanted, before borrowing the next */
  Object.keys(DESK_PANEL_CARD).forEach(function(kind){
    const id=DESK_PANEL_CARD[kind];
    if(id===wantCard) return;
    const node=document.getElementById(id);
    if(node&&node.parentNode===body) restoreNode(id);
  });
  const open=isDesktopLayout()&&!!openSheetKind&&(wantCard||openSheetKind==='food'||openSheetKind==='notes');
  panel.classList.toggle('open',!!open);
  if(!open) return;
  const ttl=document.getElementById('deskPanelTitle');
  if(ttl) ttl.textContent=DESK_PANEL_TITLE[openSheetKind]||openSheetKind;
  if(wantCard) relocateNode(wantCard,body,'inpanel');
}
function openSheet(kind){ openSheetKind=kind; mealDraft=[]; render(); }
function closeSheet(){ openSheetKind=null; render(); }
let mealDraft=[];
function toggleMealCat(c){
  mealDraft=mealDraft.indexOf(c)>=0?mealDraft.filter(function(x){return x!==c;}):mealDraft.concat([c]);
  render();
}
function saveMeal(){
  if(!mealDraft.length) return;
  const d=day(vday());
  d.meals.push({id:'ml'+Date.now(), at:Date.now(), cats:mealDraft.slice()});
  mealDraft=[]; save(); render(); toast('Meal logged');
}
function delMeal(id,ev){ if(ev)ev.stopPropagation(); if(!arm('ml:'+id)) return;
  const d=day(vday()); d.meals=d.meals.filter(function(m){return m.id!==id;});
  armed=null; save(); render();
}
function saveNote(){
  const el=document.getElementById('noteDraft'); if(!el) return;
  const v=(el.value||'').trim(); if(!v) return;
  S.logEntries.unshift({id:'lg'+Date.now(), at:Date.now(), day:vday(), text:v});
  el.value=''; save(); render(); toast('Entry filed');
}
function setNoteText(id,v){
  const n=(S.logEntries||[]).filter(function(x){return x.id===id;})[0];
  if(!n) return; n.text=v; save();
}
function delNote(id,ev){ if(ev)ev.stopPropagation(); if(!arm('lg:'+id)) return;
  S.logEntries=S.logEntries.filter(function(n){return n.id!==id;});
  armed=null; save(); render();
}
function submitTxn(){
  const n=document.getElementById('txnName'), a=document.getElementById('txnAmt'),
        dd=document.getElementById('txnDay'), c=document.getElementById('txnCat');
  const name=(n&&n.value||'').trim(), amt=Math.round((parseFloat(a&&a.value)||0)*100);
  if(!name||amt<=0) return;
  logSpend(name,amt,(dd&&dd.value)||vday(),(c&&c.value)||'Uncategorized');
  n.value=''; a.value='';
}
function submitTxnCat(){
  const el=document.getElementById('newTxnCat'); if(!el) return;
  addTxnCat(el.value); el.value='';
}
const FOOD_CHIP_SEED=[
  {id:'veggies',cls:'good'},{id:'protein',cls:'good'},{id:'berries',cls:'good'},
  {id:'greens',cls:'good'},{id:'dairy',cls:'good'},{id:'grains',cls:''},
  {id:'starch',cls:'bad'},{id:'fried',cls:'bad'},{id:'sugary',cls:'bad'}
];
function sheetHead(title,color){
  return '<div class="pssheethead"><span class="ttl" style="color:'+color+'">'+title+'</span>'+
    '<button onclick="closeSheet()">✕</button></div>';
}
function renderSheets(){
  /* on the desktop these are shown inside the slide-over instead, except food and notes, which
     have no card of their own and so keep using this markup. The scrim follows the same rule:
     opening it whenever *any* sheet kind was set meant the phone's full-screen scrim covered the
     desktop panel and swallowed every click on it, including its own close button. */
  const asSheet=!!openSheetKind&&(!isDesktopLayout()||openSheetKind==='food'||openSheetKind==='notes');
  const scrim=document.getElementById('sheetScrim');
  if(scrim) scrim.classList.toggle('open',asSheet);
  ['Money','Water','Food','Notes'].forEach(function(n){
    const el=document.getElementById('sheet'+n);
    if(el) el.classList.toggle('open',openSheetKind===n.toLowerCase()&&asSheet);
  });
  syncDeskPanel();
  const k=vday(), d=day(k);
  /* --- money --- */
  const mEl=document.getElementById('sheetMoney');
  if(mEl&&openSheetKind==='money'){
    const monthly=budgetMonthlyCents(), spent=spentInPeriod(), left=monthly-spent;
    const rows=(S.txns||[]).slice(0,25).map(function(t){
      const a=armed==='sp:'+t.id;
      return '<div class="psrow"><div style="flex:1;min-width:0">'+
        '<div class="nm">'+String(t.name).replace(/</g,'&lt;')+'</div>'+
        '<div class="mt">'+String(t.cat||'').toUpperCase()+' · '+t.day+'</div></div>'+
        '<span class="amt">−'+dollarsStr(t.amountCents)+'</span>'+
        '<button class="del" onclick="delSpend(\''+t.id+'\',event)">'+(a?'!':'✕')+'</button></div>';
    }).join('')||'<div class="mt" style="color:var(--ink-3);font-size:11px">nothing logged yet</div>';
    mEl.innerHTML=sheetHead('RESOURCE ALLOCATION','var(--pink-deep)')+
      '<div class="psbig"><span class="v" style="color:var(--pink-deep)">'+
        (monthly?dollarsStr(Math.max(0,left)):dollarsStr(spent))+'</span>'+
        '<span class="u">'+(monthly?'REMAINING OF '+dollarsStr(monthly):'SPENT THIS PERIOD')+'</span></div>'+
      '<div class="track" style="height:7px;background:var(--glass-strong);margin-top:9px">'+
        '<div style="height:100%;background:var(--pink-deep);width:'+
        (monthly?Math.min(100,Math.max(0,Math.round(spent/monthly*100))):0)+'%"></div></div>'+
      '<div class="pssec">&gt; monthly budget</div>'+
      '<input class="psin" id="budgetIn" inputmode="decimal" placeholder="0.00" value="'+
        (monthly?(monthly/100).toFixed(2):'')+'" onchange="setBudgetMonthly(this.value)">'+
      '<div class="pssec">&gt; log transaction</div>'+
      '<input class="psin" id="txnName" placeholder="DESCRIPTION">'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">'+
        '<input class="psin" id="txnAmt" inputmode="decimal" placeholder="AMOUNT $">'+
        '<input class="psin" id="txnDay" type="date" value="'+k+'">'+
      '</div>'+
      '<select class="psin" id="txnCat" style="margin-top:8px">'+
        (S.txnCats||[]).map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('')+
      '</select>'+
      '<button class="psbtn" onclick="submitTxn()">RECORD TRANSACTION</button>'+
      '<div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:8px">'+
        '<input class="psin" id="newTxnCat" placeholder="NEW CATEGORY">'+
        '<button class="pschip" onclick="submitTxnCat()">+ ADD</button></div>'+
      '<div class="pslist">'+rows+'</div>';
  }
  /* --- water: reuses addWater/d.log so undo, streaks and freezes keep working --- */
  const wEl=document.getElementById('sheetWater');
  if(wEl&&openSheetKind==='water'){
    const g=goalOn(k), v=vessel();
    wEl.innerHTML=sheetHead('HYDRATION LEVELS','var(--aqua-deep)')+
      '<div class="psbig"><span class="v" style="color:var(--aqua-deep)">'+d.water+'oz</span>'+
        '<span class="u">OF '+g+'oz GOAL</span></div>'+
      '<div class="track" style="height:7px;background:var(--glass-strong);margin-top:9px">'+
        '<div style="height:100%;background:var(--aqua-deep);width:'+Math.min(100,Math.round(d.water/g*100))+'%"></div></div>'+
      '<button class="psbtn" onclick="addWater(\'full\')">+ LOG '+v.oz+'oz CUP</button>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
        '<button class="psghost" onclick="addWater(\'half\')">+ HALF CUP</button>'+
        '<button class="psghost" onclick="addWater(\'undo\')">UNDO</button></div>'+
      '<div class="pssec">&gt; calibrate</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
        '<div><div class="mt" style="font-size:9px;letter-spacing:1.5px;color:var(--ink-3);margin-bottom:5px">CUP SIZE (OZ)</div>'+
          '<input class="psin" inputmode="numeric" value="'+v.oz+'" onchange="setVesselOz(this.value)"></div>'+
        '<div><div class="mt" style="font-size:9px;letter-spacing:1.5px;color:var(--ink-3);margin-bottom:5px">DAILY GOAL (OZ)</div>'+
          '<input class="psin" inputmode="numeric" value="'+waterGoal()+'" onchange="setWaterGoal(this.value)"></div>'+
      '</div>'+
      '<div class="pssec">&gt; streak</div>'+
      '<div class="mt" style="color:var(--ink-2);font-size:11.5px">'+S.waterStreak+
        ' day streak · best '+S.waterBest+' · '+S.freezes+' freeze'+(S.freezes===1?'':'s')+'</div>';
  }
  /* --- food --- */
  const fEl=document.getElementById('sheetFood');
  if(fEl&&openSheetKind==='food'){
    const f=foodScore(k);
    const verdict=f===null?'NO DATA':f>=0.75?'CLEAN':f>=0.5?'BALANCED':f>=0.3?'HEAVY':'FLAGGED';
    const col=f===null?'var(--ink-3)':f>=0.6?'var(--mint-deep)':f>=0.35?'var(--pink-deep)':'var(--alert)';
    const meals=(d.meals||[]).slice().reverse().map(function(m){
      const a=armed==='ml:'+m.id;
      const t=new Date(m.at).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
      return '<div class="psrow"><div style="flex:1;min-width:0">'+
        '<div class="nm">'+(m.cats||[]).join(' · ')+'</div>'+
        '<div class="mt">'+t+'</div></div>'+
        '<button class="del" onclick="delMeal(\''+m.id+'\',event)">'+(a?'!':'✕')+'</button></div>';
    }).join('')||'<div class="mt" style="color:var(--ink-3);font-size:11px">nothing logged today</div>';
    fEl.innerHTML=sheetHead('NUTRITIONAL INTAKE',col)+
      '<div class="psbig"><span class="v" style="font-size:24px;color:'+col+'">'+verdict+'</span>'+
        '<span class="u">'+(d.meals||[]).length+' MEAL'+((d.meals||[]).length===1?'':'S')+' TODAY</span></div>'+
      '<div class="pssec">&gt; select composition</div>'+
      '<div class="pschips">'+foodCats().map(function(c){
        const armd=armed==='fc:'+c.id;
        return '<span class="pschipwrap"><button class="pschip '+c.cls+(mealDraft.indexOf(c.id)>=0?' on':'')+
          '" onclick="toggleMealCat(\''+c.id+'\')">'+String(c.id).toUpperCase()+'</button>'+
          '<button class="pschipx" title="remove this category" onclick="delFoodCat(\''+c.id+'\',event)">'+
          (armd?'!':'\u00d7')+'</button></span>';
      }).join('')+'</div>'+
      '<div class="psaddcat">'+
        '<input id="newFoodCat" placeholder="new category…" maxlength="18" '+
          'onkeydown="if(event.key===\'Enter\')submitFoodCat()">'+
        '<select id="newFoodCatCls">'+
          '<option value="good">counts as good</option>'+
          '<option value="">neutral</option>'+
          '<option value="bad">counts as poor</option>'+
        '</select>'+
        '<button class="btn tiny" onclick="submitFoodCat()">add</button>'+
      '</div>'+
      '<button class="psbtn" onclick="saveMeal()">LOG MEAL</button>'+
      '<div class="pslist">'+meals+'</div>';
  }
  /* --- notes --- */
  const nEl=document.getElementById('sheetNotes');
  if(nEl&&openSheetKind==='notes'){
    const list=(S.logEntries||[]).slice(0,40).map(function(n){
      const a=armed==='lg:'+n.id;
      const when=new Date(n.at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
      return '<div class="psrow"><div style="flex:1;min-width:0">'+
        '<div class="mt">'+when.toUpperCase()+'</div>'+
        '<textarea class="psin" style="margin-top:4px;min-height:60px" onchange="setNoteText(\''+n.id+'\',this.value)">'+
        String(n.text).replace(/</g,'&lt;')+'</textarea></div>'+
        '<button class="del" onclick="delNote(\''+n.id+'\',event)">'+(a?'!':'✕')+'</button></div>';
    }).join('')||'<div class="mt" style="color:var(--ink-3);font-size:11px">no entries yet</div>';
    nEl.innerHTML=sheetHead('PERSONAL LOG ENTRY','var(--mint-deep)')+
      '<textarea class="psin" id="noteDraft" style="height:96px;margin-top:12px" placeholder="BEGIN DICTATION…"></textarea>'+
      '<button class="psbtn" onclick="saveNote()">FILE ENTRY</button>'+
      '<div class="pslist">'+list+'</div>';
  }
}
/* The SCAN tab's priority directive: whatever block is happening right now, with a countdown
   ring, its task list and the lock-in button. It is a *view* of the current block, not a second
   place to store one — the tasks are blockTasksFor(), the toggle is toggleUnit(), ENGAGE is the
   existing lockIn(). Renders nothing when no block is running, or when you are looking at another
   day, since "now" only means something on today. */
function renderPrismFocus(){
  const host=document.getElementById('prismFocus');
  if(!host) return;
  if(!isViewingToday()||viewMode!=='today'){ host.innerHTML=''; return; }
  const d=day(vday());
  const b=(d.blocks||[]).filter(function(x){return isCurrentBlock(x);})[0];
  if(!b){ host.innerHTML=''; return; }
  const st=toMin(b.start), dur=blockDur(b), nm=nowMinutes()%1440;
  const leftMin=Math.max(0,st+dur-nm);
  const pct=dur?Math.min(1,(nm-st)/dur):0;
  const tasks=blockTasksFor(b,vday());
  const done=tasks.filter(function(t){return itemDone(t,vday());}).length;
  const locked=focusBlockId===b.id;
  host.innerHTML=
    '<div class="pfcard">'+
      '<div class="pfhead"><span class="pfk">PRIORITY DIRECTIVE</span>'+
        '<span class="pfst">'+(locked?'ENGAGED':'ON SCHEDULE')+'</span></div>'+
      '<div class="pfbody">'+
        '<div class="pfring">'+ringSvg(pct,'var(--mint-deep)',42,8)+
          '<span class="pfmin"><b>'+leftMin+'</b><i>MIN</i></span></div>'+
        '<div class="pfmeta">'+
          '<div class="pft">'+b.start+' '+String(b.focus||b.calTitle||'open block').replace(/</g,'&lt;')+'</div>'+
          '<div class="pfsub">'+done+'/'+tasks.length+' SUBROUTINES</div>'+
        '</div>'+
      '</div>'+
      (tasks.length?'<div class="pftasks">'+tasks.map(function(t){
        const dn=itemDone(t,vday());
        return '<button class="pftask'+(dn?' done':'')+'" onclick="toggleUnit(\''+t.id+'\')">'+
          '<span class="bx">'+(dn?'✓':'')+'</span>'+
          '<span class="tx">'+String(t.text).replace(/</g,'&lt;')+'</span></button>';
      }).join('')+'</div>':'')+
      '<div class="pfbtns">'+
        '<button class="pfgo" onclick="'+(locked?'exitFocus()':'lockIn(\''+b.id+'\')')+'">'+
          (locked?'❚❚ HOLD':'▶ ENGAGE')+'</button>'+
        '<button class="pfalt" onclick="toggleBlock(\''+b.id+'\')">OPEN</button>'+
      '</div>'+
    '</div>';
}
/* ===================== render ===================== */
function ritualFullyDone(r){
  const items=itemsFor(r).concat(ritualQuests(r));
  const req=items.filter(function(t){return t.type==='core'||t.type==='med';});
  return items.length>0 && req.length>0 && req.every(function(t){return itemDone(t);});
}
/* The controls every unit gets, whichever panel it happens to be sitting in: a play/pause timer,
   its repeat schedule, one tap onto the block happening now or onto the day, skip-for-this-day,
   and permanent delete. One strip, so a ritual item, a side quest and a task behave identically. */
/* the little editor behind the frequency pill: daily, the weekdays it lands on, or a day of the month */
function setSchedType(id,ty){
  const t=unitById(id); if(!t) return;
  if(ty==='none') t.sched={type:'none'};
  else if(ty==='daily') t.sched={type:'daily'};
  else if(ty==='weekly') t.sched={type:'weekly', days:(t.sched&&t.sched.days)||[dowOf(vday())]};
  else t.sched={type:'monthly', dom:(t.sched&&t.sched.dom)||(+vday().split('-')[2])};
  save(); render();
}
function toggleSchedDay(id,n){
  const t=unitById(id); if(!t||schedOf(t).type!=='weekly') return;
  const days=(t.sched.days||[]).slice();
  const i=days.indexOf(n);
  if(i>=0) days.splice(i,1); else days.push(n);
  t.sched.days=days.sort(); save(); render();
}
function setSchedDom(id,v){
  const t=unitById(id); if(!t) return;
  const n=Math.max(1,Math.min(28,parseInt(v,10)||1));
  t.sched={type:'monthly', dom:n}; save(); render();
}
/* Everything belonging to this ritual on the viewed day, in reading order: what's still to do
   first, then what's already handled underneath. Done and skipped rows stay on the page \u2014 the
   list emptying itself as you worked through it erased the morning you actually had, and made
   the ritual impossible to review or correct after the fact.
   Note this deliberately does NOT go through itemsFor(), which filters skipped items out. */
function sortSettledLast(list){
  const k=vday();
  const open=list.filter(function(t){ return !itemDone(t)&&!itemSkipped(t,k); }).sort(byOrder);
  const settled=list.filter(function(t){ return itemDone(t)||itemSkipped(t,k); }).sort(byOrder);
  return open.concat(settled);
}
function ritualVisibleUnits(r){
  const k=vday();
  const mine=ritualRoster(r).filter(function(t){
    return dueOnDay(t,k)||itemDone(t,k)||itemSkipped(t,k);
  });
  const parked=S.tasks.filter(function(t){ return t.kind!=='ritual'&&placementOf(t.id,k)===r; });
  return sortSettledLast(mine.concat(parked));
}
/* renderRitualPanel used to live here. The sunrise/moonlight panels are gone — habits are
   drawn inside their routine block on the timeline now, so there is exactly one place a
   habit appears and exactly one place to tick it off. ritualVisibleUnits (above) survives
   as the shared 'open first, settled last' ordering rule. */
/* how far through this block "now" is — 0 before it starts, 100 once it's past, in between
   while it's the current block. Rendered as a small vertical fill next to the time label. */
function blockProgressPct(b){
  if(isPastBlock(b)) return 100;
  if(!isViewingToday()) return 0;
  const nm=nowMinutes()%1440, s=toMin(b.start), e=s+blockDur(b);
  if(nm<=s) return 0;
  if(nm>=e) return 100;
  return Math.round((nm-s)/(e-s)*100);
}
function fmtDurShort(min){
  const h=Math.floor(min/60), m=Math.round(min%60);
  if(h&&m) return h+'h '+m+'m';
  if(h) return h+'h';
  return m+'m';
}
/* an "unassigned" block is filler time nobody has put anything in — it's not the same as a real
   block that got fully cleared, so it groups separately (and regardless of whether its time has
   passed yet — a wide-open afternoon collapses just as readily as a wide-open morning that's
   already gone by) */
function isUnassignedBlock(b){ return !!b.auto&&isEmptyBlock(b); }
/* pure grouping pass over a day's blocks: decides which consecutive runs collapse into a single
   toggle row (unassigned gaps, and separately cleared-block runs) versus rendering individually.
   Kept side-effect-free and separate from renderTimeline so it's directly testable. */
function groupTimelineSegments(blocks){
  const segs=[];
  let i=0;
  while(i<blocks.length){
    const b=blocks[i];
    if(isUnassignedBlock(b)){
      let j=i;
      while(j<blocks.length&&isUnassignedBlock(blocks[j])) j++;
      const run=blocks.slice(i,j);
      const totalMin=run.reduce(function(a,bb){return a+blockDur(bb);},0);
      if(run.length>=2&&totalMin>=UNASSIGNED_COLLAPSE_MIN){
        segs.push({type:'gap', run:run, totalMin:totalMin});
        i=j; continue;
      }
    }
    /* every block whose end time has already passed condenses into one toggle, whether or not
       everything inside it got done — "past" is a clock fact, not a completion fact. This is
       broader than the old cleared-only grouping (isBlockCleared required 100% done), which is
       exactly the change phase 1 asked for: a half-finished 9am block still collapses once it's
       10am, instead of sitting open and demanding attention for something that's already over. */
    if(isPastBlock(b)&&!isUnassignedBlock(b)){
      let j=i;
      while(j<blocks.length&&isPastBlock(blocks[j])&&!isUnassignedBlock(blocks[j])) j++;
      const run=blocks.slice(i,j);
      if(run.length>=2){
        segs.push({type:'past', run:run, totalMin:run.reduce(function(a,bb){return a+blockDur(bb);},0)});
        i=j; continue;
      }
    }
    segs.push({type:'block', run:[b]});
    i++;
  }
  return segs;
}
let manualRollup={};
function toggleRollup(id){ manualRollup[id]=!manualRollup[id]; render(); }
/* ---------- side-by-side lanes for overlapping blocks ----------
   Every block is positioned absolutely by its clock time, which is what makes the grid
   proportional, but it also meant two blocks booked over each other were drawn on top of each
   other: the later one simply hid the earlier one, and there was no way to tell from the
   timeline that you had double-booked at all. The real data has this - an 11:15-12:15 block and
   an 11:15-12:00 block on the same morning.
   Standard calendar treatment: find each cluster of mutually-overlapping blocks, pack them into
   the fewest lanes where no two blocks in a lane overlap, and split the width between the lanes
   that cluster actually needs. A block with nothing over it still gets the full width, so the
   common case looks exactly as it did.
   Pure function of the block list so it can be reasoned about (and tested) without a DOM. */
function layoutLanes(blocks){
  const out={};
  const spans=blocks.map(function(b){
    const s=Math.max(DAY_START,toMin(b.start));
    return {id:b.id, s:s, e:Math.max(s+1,Math.min(DAY_END,toMin(b.start)+blockDur(b)))};
  }).sort(function(a,b){ return a.s-b.s || b.e-a.e; });

  let i=0;
  while(i<spans.length){
    /* grow a cluster while anything in it still reaches past the next block's start */
    let clusterEnd=spans[i].e, j=i+1;
    while(j<spans.length&&spans[j].s<clusterEnd){ clusterEnd=Math.max(clusterEnd,spans[j].e); j++; }
    const cluster=spans.slice(i,j);
    /* first lane whose occupant has already finished; a new lane only when none has */
    const laneEnds=[];
    cluster.forEach(function(sp){
      let lane=laneEnds.findIndex(function(end){ return end<=sp.s; });
      if(lane<0){ lane=laneEnds.length; laneEnds.push(sp.e); }
      else laneEnds[lane]=sp.e;
      out[sp.id]={lane:lane};
    });
    cluster.forEach(function(sp){ out[sp.id].lanes=laneEnds.length; });
    i=j;
  }
  return out;
}
/* ---------- creating a block by clicking empty time ----------
   Blocks land on the 15-minute grid. Clicking anywhere in a free stretch starts the new block at
   that 15-minute slot (or at the moment the free stretch begins, if the click is above the first
   slot boundary) and runs it to the next 15-minute mark. So a meeting ending at 2:45 followed by
   a click underneath it gives 2:45-3:00, and a meeting ending at 2:50 gives 2:50-3:00 -- the end
   is what snaps, so blocks stay aligned to the grid even when the thing before them didn't. */
function floor15(m){ return Math.floor(m/15)*15; }
function ceil15(m){ return Math.ceil(m/15)*15; }
function newBlockRange(regionStart,regionEnd,clickMin){
  let s=regionStart;
  if(isFinite(clickMin)){
    const snapped=Math.max(regionStart,floor15(clickMin));
    if(snapped<regionEnd) s=snapped;
  }
  let e=ceil15(s+1);                 /* strictly after s, so a slot boundary advances a full step */
  if(e>regionEnd) e=regionEnd;
  return (e-s>=5)?[s,e]:null;        /* a sliver too thin to hold anything isn't worth creating */
}
function onEmptySlotClick(ev,id){
  /* task-placement mode owns the click: the whole grid is a drop target then */
  if(pickedTaskId){ placePickedInBlock(id,ev); return; }
  const b=blockOf(id); if(!b) return;
  const host=ev.currentTarget;
  const rect=host.getBoundingClientRect();
  const regionStart=Math.max(DAY_START,toMin(b.start));
  const regionEnd=Math.min(DAY_END,toMin(b.start)+blockDur(b));
  const clickMin=regionStart+(ev.clientY-rect.top)/gridPxPerMin();
  const range=newBlockRange(regionStart,regionEnd,clickMin);
  if(!range){ toggleBlock(id); return; }
  createBlockAt(fromMin(range[0]),range[1]-range[0]);
}
/* one small absolutely-positioned box per block, sized and placed by its real clock time on the
   fixed grid — no more elastic floor/ceiling. Clicking it opens the side detail panel instead of
   growing the box inline, which is what keeps the grid actually proportional: an expanded block
   used to blow past its real time-slot height, which a Google-Calendar-style grid can't allow. */
function blockGridBoxHTML(b,openId,lanes){
  const cur=isCurrentBlock(b), past=!cur&&isPastBlock(b), empty=isEmptyBlock(b), cleared=isBlockCleared(b);
  const col=blockColor(b);
  const isOpen=openId===b.id;
  const startMin=Math.max(DAY_START,toMin(b.start));
  const endMin=Math.min(DAY_END,toMin(b.end||fromMin(toMin(b.start)+60)));
  const top=minToPx(startMin), heightPx=Math.max(20,minToPx(endMin)-top);
  /* settled = its time is up, or everything in it is checked off. Either way it gets a tick and
     its label struck through, so a glance down the day separates what's handled from what isn't
     without having to open anything. */
  const settled=isBlockSettled(b,vday())&&!empty;
  const lane=(lanes&&lanes[b.id])||{lane:0,lanes:1};
  const laneW=100/Math.max(1,lane.lanes);
  const quests=blockQuests(b), btasks=blockTasksFor(b), ptasks=projectBlockTasks(b);
  /* ptasks are pulled fresh from the bank each render and are never "done" by definition (a done
     one drops out of the pull), so they'd only ever pad the denominator without a matching
     numerator — the progress dot stays about what's actually pinned to this block, same as before */
  const totalCount=quests.length+btasks.length;
  const doneCount=quests.filter(function(q){return itemDone(q);}).length+btasks.filter(function(t){return itemDone(t);}).length;
  /* a project block previews whatever's currently first up in its category, instead of a fixed
     title — that's the whole point of "pulls the top task from the list" */
  const previewText=(b.type==='project'&&ptasks.length)?ptasks[0].text:(b.focus||b.calTitle||'');
  /* lanes are a percentage of the body width with a small gutter, so a cluster of three fits the
     same column a single block would have filled */
  let styleAttr='top:'+top+'px;height:'+heightPx+'px'+
    ';left:calc('+(lane.lane*laneW).toFixed(4)+'% + 2px);width:calc('+laneW.toFixed(4)+'% - 4px)';
  if(!empty) styleAttr+=';background:'+col.bg+';border-color:'+col.edge;
  /* an empty auto-filler gets regenerated from scratch by buildGaps() every render (see the
     comment on that function), so dragging its edge would just get silently undone on the next
     render — resize handles only make sense on a block that's actually real. */
  const canResize=!isUnassignedBlock(b);
  /* mousedown only — no ontouchstart here. Every real block has one of these 8px strips at each
     edge, and a scroll swipe on a phone routinely starts with a finger right on one, silently
     turning "I'm scrolling" into "I'm resizing this block." Touch users still get to change a
     block's time via the start/end inputs in its detail panel. */
  return '<div class="gridblock'+(empty?' emptyblk':'')+(cur?' current':'')+(past?' past':'')+(cleared&&!empty?' cleared':'')+(settled?' settled':'')+(isOpen?' open':'')+(b.fromCal?' fromcal':'')+(pickedTaskId?' armed':'')+'" id="tb-'+b.id+'" style="'+styleAttr+'" '+
    'ondragover="onBlockDragOver(event,this)" ondragleave="onBlockDragLeave(event,this)" ondrop="onBlockDrop(event,\''+b.id+'\')" '+
    /* an empty stretch is a place to make a block, not a thing to open - clicking it carves a
       15-minute slot at the point clicked instead of opening the filler for editing */
    'onclick="'+(empty?'onEmptySlotClick(event,\''+b.id+'\')':(pickedTaskId?'placePickedInBlock(\''+b.id+'\',event)':'toggleBlock(\''+b.id+'\')'))+'" '+
    'title="'+b.start+'–'+(b.end||'')+' '+(pickedTaskId?'· tap to put the picked task here':(empty?'· click to make a 15-minute block here':'· click for details'))+'">'+
    (canResize?'<div class="reshandle top" onmousedown="startBlockResize(event,\''+b.id+'\',\'top\')"></div>':'')+
    /* no clock in the label. The axis running down the left already states the time for every
       row, so repeating it inside a half-width block spent most of the width restating what was
       already on screen and pushed the focus and the task count out of view. Kept in the title
       attribute, and the detail panel still shows real start/end inputs. */
    (settled?'<span class="blkcheck" title="finished">✓</span>':
      (BLOCK_TYPE_ICON[b.type]?'<span class="typeicon" title="'+BLOCK_TYPE_LABEL[b.type]+' block">'+BLOCK_TYPE_ICON[b.type]+'</span>':''))+
    (empty&&!previewText?'<span class="gfocus emptyhint">+ block</span>':'<span class="gfocus">'+String(previewText).replace(/</g,'&lt;')+'</span>')+
    (b.ruleId?'<span class="repeattag" title="'+blockRepeatLabel(b)+'">\u27f3</span>':'')+
    (totalCount?'<span class="progdot">'+doneCount+'/'+totalCount+'</span>':'')+
    (b.fromCal?'<span class="caltag">cal</span>':'')+
    (canResize?'<div class="reshandle bottom" onmousedown="startBlockResize(event,\''+b.id+'\',\'bottom\')"></div>':'')+
    '</div>';
}
/* the detail panel: subtasks, notes, the editable time fields, delete — everything that used to
   live inline inside an "expanded" block now lives here instead, opened to the side so the grid
   itself never has to grow a box taller than its real duration warrants. */
function renderBlockDetailPanel(){
  const panel=document.getElementById('blockDetailPanel'); if(!panel) return;
  const id=openBlockId();
  const b=id?blockOf(id):null;
  if(!b){ panel.style.display='none'; panel.innerHTML=''; return; }
  panel.style.display='block';
  const quests=blockQuests(b), btasks=blockTasksFor(b), ptasks=projectBlockTasks(b);
  const isArm=armed==='blk:'+b.id;
  const pct=blockProgressPct(b);
  let h='<div class="bdhead">'+
    '<button class="btn tiny ghost" onclick="closeBlockPanel()">✕ close</button>'+
    '<button class="rowbtn'+(isArm?' arm':'')+'" style="opacity:.6;margin-left:auto" onclick="delBlock(\''+b.id+'\')">'+(isArm?'sure? delete':'delete block')+'</button>'+
    '</div>'+
    '<div class="bdactions">'+
    (b.routine?'<span class="typeicon" title="ritual block">'+BLOCK_TYPE_ICON.ritual+'</span>'
      :'<select class="moreact" title="block type" onchange="setBlockType(\''+b.id+'\',this.value)">'+
        BLOCK_TYPES.map(function(ty){return '<option value="'+ty+'"'+(b.type===ty?' selected':'')+'>'+BLOCK_TYPE_LABEL[ty]+'</option>';}).join('')+'</select>')+
    (b.type==='project'?'<select class="moreact" title="project category" onchange="setBlockCategory(\''+b.id+'\',this.value)">'+categoryOptionsHTML(b.category)+'</select>':'')+
    (b.routine?'':'<button class="moreact'+(editing==='brep:'+b.id?' on':'')+'" title="how often this block repeats" onclick="event.stopPropagation();toggleEdit(\'brep:'+b.id+'\')">\u27f3 '+(blockRepeatLabel(b)||'once')+'</button>')+
    '<button class="btn tiny soft" title="lock in and go fullscreen" onclick="lockIn(\''+b.id+'\')">'+(BLOCK_TYPE_ICON[b.type]||'🔒')+' lock in</button>'+
    '<button class="rowbtn" style="opacity:.6" title="skip everything in this block — streak safe" onclick="skipBlock(\''+b.id+'\',event)">skip all</button>'+
    '</div>'+
    '<div class="bdtime">'+
      '<input type="time" value="'+b.start+'" onchange="setBlockStart(\''+b.id+'\',this.value)">–'+
      '<input type="time" value="'+(b.end||'')+'" onchange="setBlockEnd(\''+b.id+'\',this.value)">'+
    '</div>'+
    '<div class="bdfocus" contenteditable="true" data-ph="focus…" onblur="setFocus(\''+b.id+'\',this.textContent)">'+String(b.focus||'').replace(/</g,'&lt;')+'</div>';
  if(editing==='brep:'+b.id) h+=blockRepeatEditorHTML(b);
  if(isCurrentBlock(b)) h+='<div class="nowline">'+hhmm(new Date())+' now · '+pct+'% through this block</div>';
  h+='<div class="bdtasks">';
  /* whatever's still open floats to the top; done and skipped rows stay put but settle
     underneath, so a half-finished routine reads at a glance. Project blocks additionally pull
     in whatever's next up from the task bank in their category — completing/skipping the top one
     just naturally promotes the next, no separate "current task" pointer to maintain. */
  sortSettledLast(quests.concat(btasks)).forEach(function(t){ h+=taskRowHTML(t,'block'); });
  ptasks.forEach(function(t){ h+=taskRowHTML(t,'block'); });
  h+='</div>';
  /* tap-to-pull from the bank: no drag, works the same on a phone as on a desktop. Hidden for
     routine blocks, where typing means "add a habit to this routine" rather than "schedule a
     task", so pulling a one-off task in would be the wrong gesture. */
  if(!b.routine){
    const bank=pullableBankTasks();
    if(bank.length){
      /* every pullable task, in a scrolling strip — NOT a truncated top-N. Tasks are ordered by
         `order`, which is Date.now() at creation, so a cap would hide the most recently added
         ones: exactly the tasks you're most likely to be scheduling right now. */
      h+='<div class="bdbanklbl">pull from the task bank · '+bank.length+'</div><div class="bdbank">';
      bank.forEach(function(t){
        h+='<button class="bankchip" onclick="pullTaskIntoBlock(\''+t.id+'\',\''+b.id+'\',event)">+ '+
           String(t.text).replace(/</g,'&lt;')+
           (t.estMin?'<span class="bcmin">'+t.estMin+'m</span>':'')+'</button>';
      });
      h+='</div>';
    }
  }
  h+='<div class="addtiny"><input id="tinyIn-'+b.id+'" placeholder="'+(b.routine?'add a habit to this routine, press enter…':'add a task to this block, press enter…')+'" maxlength="80" onkeydown="if(event.key===\'Enter\'){event.preventDefault();quickAddBlockTask(\''+b.id+'\')}">'+
     '<button class="btn tiny soft" onclick="quickAddBlockTask(\''+b.id+'\')">+</button></div>'+
     '<textarea class="bnotes" placeholder="notes…" onchange="setNotes(\''+b.id+'\',this.value)">'+(b.notes||'')+'</textarea>';
  panel.innerHTML=h;
}
/* ===================== lock-in focus mode =====================
   Fullscreen session for one block. focusBlockId/focusState are transient — same category as
   medi/editing/armed — nothing about "being locked in" is persisted except the one earned-segment
   counter (S.days[k].focusSegs), so a refresh mid-session just drops you back at the block panel
   with everything you actually did (tasks ticked, notes typed, water logged) intact. */
let focusBlockId=null, focusState=null, focusTimerHandle=null;
function lockIn(blockId){
  const b=blockOf(blockId); if(!b) return;
  focusBlockId=blockId;
  focusState={activeSec:0, onBreak:false, breakSec:0, breakOffered:false};
  panelOverride=false;
  playLockAnim(b);
  if(focusTimerHandle) clearInterval(focusTimerHandle);
  focusTimerHandle=setInterval(focusTick,1000);
  render();
}
function exitFocus(){
  focusBlockId=null; focusState=null;
  if(focusTimerHandle){ clearInterval(focusTimerHandle); focusTimerHandle=null; }
  render();
}
function focusTick(){
  if(!focusState||!focusBlockId||!blockOf(focusBlockId)){ exitFocus(); return; }
  if(focusState.onBreak){
    focusState.breakSec--;
    if(focusState.breakSec<=0){ focusState.onBreak=false; focusState.breakSec=0; }
  } else {
    focusState.activeSec++;
    /* a completed 30-minute segment pays out and offers a break, whether or not you take it —
       the reward is for the time actually spent, the break is just a wellness nudge on top */
    if(focusState.activeSec%1800===0){ awardFocusSegment(); focusState.breakOffered=true; }
  }
  renderFocusSession();
}
function awardFocusSegment(){
  const d=day(vday());
  d.focusSegs[focusBlockId]=(d.focusSegs[focusBlockId]||0)+1;
  save();
}
function startFocusBreak(){ if(!focusState) return; focusState.breakOffered=false; focusState.onBreak=true; focusState.breakSec=300; renderFocusSession(); }
function dismissFocusBreak(){ if(!focusState) return; focusState.breakOffered=false; renderFocusSession(); }
function quickCaptureFocusTask(){
  const el=document.getElementById('focusCaptureIn'); if(!el||!el.value.trim()) return;
  addTask(el.value,'work','Uncategorized');
  el.value=''; render();
}
/* a small padlock-closing + sparkle moment before the sheet itself renders — pure CSS keyframes,
   removes its own DOM node when the fade-out finishes so it never lingers behind the overlay */
function playLockAnim(b){
  const host=document.createElement('div');
  host.className='lockanim';
  host.innerHTML='<span class="lockglyph">🔒</span><span class="spark" style="left:38%;top:38%">✨</span>'+
    '<span class="spark" style="left:60%;top:44%;animation-delay:.12s">✨</span>'+
    '<span class="locktext">locking in…'+(b.focus?' · '+String(b.focus).replace(/</g,'&lt;'):'')+'</span>';
  document.body.appendChild(host);
  host.addEventListener('animationend',function(ev){ if(ev.animationName==='lockFade') host.remove(); });
}
function renderFocusSession(){
  const el=document.getElementById('focusOverlay'); if(!el) return;
  const b=focusBlockId?blockOf(focusBlockId):null;
  if(!b||!focusState){ el.style.display='none'; el.innerHTML=''; return; }
  el.style.display='flex';
  const k=vday(), d=day(k);
  const quests=blockQuests(b), btasks=blockTasksFor(b), ptasks=projectBlockTasks(b);
  const pct=blockProgressPct(b);
  let h='<div class="focussheet">';
  h+='<div class="focustop"><div class="focustitle">'+(BLOCK_TYPE_ICON[b.type]||'')+' '+
     String(b.focus||b.calTitle||'untitled').replace(/</g,'&lt;')+'</div>'+
     '<button class="btn tiny ghost" onclick="exitFocus()">✕ done for now</button></div>';
  h+='<div class="focusbar"><div class="focusbarfill" style="width:'+pct+'%"></div></div>';
  h+='<div class="focusmeta">'+b.start+'–'+(b.end||'')+' · locked in '+mmss(focusState.activeSec)+
     (d.focusSegs&&d.focusSegs[b.id]?' · '+d.focusSegs[b.id]+' segment'+(d.focusSegs[b.id]===1?'':'s')+' earned':'')+'</div>';
  if(focusState.onBreak) h+='<div class="focusbreak">🌿 on a break — back in '+mmss(focusState.breakSec)+'</div>';
  else if(focusState.breakOffered)
    h+='<div class="focusbreakoffer">30 minutes in — take a 5 minute break?'+
       '<button class="btn tiny soft" onclick="startFocusBreak()">take it</button>'+
       '<button class="btn tiny ghost" onclick="dismissFocusBreak()">keep going</button></div>';
  /* a single-focus block (a meeting, a lecture) has nothing to check off — it's just the lock
     itself, the notes, and the water tracker */
  if(b.type!=='single'){
    const list=sortSettledLast(quests.concat(btasks)).concat(ptasks);
    h+='<div class="focustasks">'+(list.length?list.map(function(t){return taskRowHTML(t,'block');}).join(''):
       '<div class="qempty">nothing pinned to this block yet</div>')+'</div>';
  }
  h+='<div class="focusaside">';
  h+='<div class="focuswater">💧 '+d.water+' / '+goalOn(vday())+' oz'+
     '<button class="btn tiny soft" onclick="addWater(\'full\')">+cup</button></div>';
  h+='<textarea class="focusnotes" placeholder="notes…" onchange="setNotes(\''+b.id+'\',this.value)">'+(b.notes||'')+'</textarea>';
  h+='<div class="focusadd"><input id="focusCaptureIn" placeholder="something for later, so it doesn’t derail the session…" maxlength="120" '+
     'onkeydown="if(event.key===\'Enter\'){event.preventDefault();quickCaptureFocusTask()}">'+
     '<button class="btn tiny soft" onclick="quickCaptureFocusTask()">+</button></div>';
  h+='</div></div>';
  el.innerHTML=h;
}
/* dragging a task anywhere near a block lights that block up, in the day grid and the week grid
   alike. dragleave fires when the pointer crosses onto a *child* of the block too, which made the
   highlight flicker off as soon as the cursor reached the label, so the leave is ignored unless
   the pointer has genuinely left the box. */
function onBlockDragOver(ev,el){
  ev.preventDefault();
  if(ev.dataTransfer) ev.dataTransfer.dropEffect='move';
  el.classList.add('drophover');
}
function onBlockDragLeave(ev,el){
  const to=ev.relatedTarget;
  if(to&&el.contains(to)) return;
  el.classList.remove('drophover');
}
function clearDropHighlights(){
  document.querySelectorAll('.drophover').forEach(function(el){ el.classList.remove('drophover'); });
}
function renderTimeline(){
  const d=day(vday());
  const openId=openBlockId();
  const lanes=layoutLanes(d.blocks||[]);
  let axis='';
  for(let m=DAY_START;m<=DAY_END;m+=60) axis+='<span class="gh" style="top:'+minToPx(m)+'px">'+fromMin(m)+'</span>';
  let body='';
  for(let m=DAY_START;m<=DAY_END;m+=60) body+='<div class="gridline" style="top:'+minToPx(m)+'px"></div>';
  groupTimelineSegments(d.blocks).forEach(function(seg){
    const segStartMin=toMin(seg.run[0].start);
    const segEndMin=toMin(seg.run[seg.run.length-1].end||fromMin(segStartMin+60));
    const top=minToPx(Math.max(DAY_START,segStartMin)), height=Math.max(20,minToPx(Math.min(DAY_END,segEndMin))-top);
    if(seg.type==='gap'){
      const rk='gap-'+seg.run[0].id, expanded=!!manualRollup[rk];
      if(!expanded){
        body+='<div class="gaprollupabs" style="top:'+top+'px;height:'+height+'px" onclick="toggleRollup(\''+rk+'\')">'+
          '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">▸ '+seg.run[0].start+'–'+seg.run[seg.run.length-1].end+' · '+fmtDurShort(seg.totalMin)+' open</span>'+
          '<button class="btn tiny ghost" onclick="event.stopPropagation();createBlockAt(\''+seg.run[0].start+'\','+pickOpenBlockDur(seg.totalMin)+')">+</button>'+
          '</div>';
      }else{
        /* the re-collapse control lives in the axis column, not the body, so it never overlaps
           the individual blocks it's sitting next to — those already fill this exact span */
        axis+='<span class="gaxis-toggle" style="top:'+top+'px" onclick="toggleRollup(\''+rk+'\')" title="collapse">▾</span>';
        seg.run.forEach(function(rb){ body+=blockGridBoxHTML(rb,openId,lanes); });
      }
    }else if(seg.type==='past'){
      const rk='rollup-'+seg.run[0].id, expanded=!!manualRollup[rk];
      if(!expanded){
        body+='<div class="pastrollupabs" style="top:'+top+'px;height:'+height+'px" onclick="toggleRollup(\''+rk+'\')">⋯ '+
          seg.run[0].start+'–'+seg.run[seg.run.length-1].end+' · '+seg.run.length+' block'+(seg.run.length===1?'':'s')+' earlier today</div>';
      }else{
        axis+='<span class="gaxis-toggle" style="top:'+top+'px" onclick="toggleRollup(\''+rk+'\')" title="collapse">▾</span>';
        seg.run.forEach(function(rb){ body+=blockGridBoxHTML(rb,openId,lanes); });
      }
    }else{
      body+=blockGridBoxHTML(seg.run[0],openId,lanes);
    }
  });
  /* the now line: a real absolute line across the fixed grid, at the actual live-time offset —
     unlike the elastic layout, the grid has a real fixed pixel height now, so this position is
     reliable instead of resolving against an auto-height container. */
  if(isViewingToday()){
    const nm=nowMinutes()%1440;
    if(nm>=DAY_START&&nm<=DAY_END) body+='<div class="gridnowline" style="top:'+minToPx(nm)+'px" data-lbl="'+hhmm(new Date())+'"></div>';
  }
  const host=document.getElementById('timeline');
  host.innerHTML=
    '<div class="gridwrap"><div class="gridaxis" style="height:'+gridTotalPx()+'px">'+axis+'</div>'+
    '<div class="gridbody" style="height:'+gridTotalPx()+'px">'+body+'</div></div>';
  scrollTimelineIntoView(host);
  renderBlockDetailPanel();
}
/* Put the interesting part of the day on screen once, not on every render - the timeline
   re-renders on every save, and yanking the scroll position back each time would make it
   impossible to look at the evening while ticking something off in the morning. Re-armed only
   when the viewed day changes. */
let timelineAnchoredFor=null;
function scrollTimelineIntoView(host){
  if(!host||host.scrollHeight<=host.clientHeight) return;
  if(timelineAnchoredFor===vday()) return;
  timelineAnchoredFor=vday();
  /* today anchors on the current time, another day on the first thing actually scheduled */
  let focusMin;
  if(isViewingToday()) focusMin=nowMinutes()%1440;
  else{
    const real=(day(vday()).blocks||[]).filter(function(b){ return !isEmptyBlock(b); })
      .sort(function(a,b){ return toMin(a.start)-toMin(b.start); })[0];
    focusMin=real?toMin(real.start):DAY_START;
  }
  /* a third of the way down, so what is coming next is visible below it */
  const target=minToPx(focusMin)-host.clientHeight/3;
  host.scrollTop=Math.max(0,Math.min(host.scrollHeight-host.clientHeight,target));
}
/* ---------- drag-to-resize: mouse only, alongside the time-input fields ----------
   Added on top of (not instead of) the editable start/end inputs in the detail panel — inputs
   are the only path on a phone (see the reshandle comment above for why touch was dropped),
   this is the fast path with a mouse. Snapped to 5-minute increments so a shaky drag doesn't
   leave a block ending at 2:47. */
let resizeState=null;
function resizeEventY(ev){ return ev.clientY; }
function startBlockResize(ev,id,edge){
  ev.preventDefault(); ev.stopPropagation();
  const b=blockOf(id); if(!b) return;
  resizeState={id:id, edge:edge, startY:resizeEventY(ev), origStart:toMin(b.start), origEnd:toMin(b.end||fromMin(toMin(b.start)+60))};
  document.addEventListener('mousemove',onBlockResizeMove);
  document.addEventListener('mouseup',onBlockResizeEnd);
}
function onBlockResizeMove(ev){
  if(!resizeState) return;
  if(ev.cancelable) ev.preventDefault();
  const deltaPx=resizeEventY(ev)-resizeState.startY;
  const deltaMin=Math.round(deltaPx/gridPxPerMin()/5)*5;
  if(resizeState.edge==='top') setBlockStart(resizeState.id,fromMin(resizeState.origStart+deltaMin));
  else setBlockEnd(resizeState.id,fromMin(resizeState.origEnd+deltaMin));
}
function onBlockResizeEnd(){
  resizeState=null;
  document.removeEventListener('mousemove',onBlockResizeMove);
  document.removeEventListener('mouseup',onBlockResizeEnd);
}
function renderPlan(){
  const dates=weekDates();
  const dows=['mon','tue','wed','thu','fri','sat','sun'];
  const t=today();
  let h='';
  dates.forEach(function(k,i){
    const p=planOf(k);
    const dayTasks=S.tasks.filter(function(tk){return tk.day===k&&!tk.blockId;});
    const isToday=k===t;
    const expanded=manualPlanDay[k]!==undefined?manualPlanDay[k]:isToday;
    const doneN=dayTasks.filter(function(x){return x.done;}).length;
    const totalN=dayTasks.length;
    const dnum=+k.split('-')[2];
    const isSel=k===vday();
    h+='<div class="planday'+(expanded?'':' collapsed')+(isToday?' istoday':'')+(isSel?' isselected':'')+'" '+
       'ondragover="event.preventDefault();this.classList.add(\'drophover\')" ondragleave="this.classList.remove(\'drophover\')" ondrop="onDayDrop(event,\''+k+'\')">'+
       '<div class="pdhead" onclick="togglePlanDay(\''+k+'\')"><span class="pdow">'+dows[i]+'</span><span class="pdnum">'+dnum+'</span>'+
       '<span class="pdcount">'+(totalN?doneN+'/'+totalN:'')+'</span>'+
       '<button class="btn tiny ghost" onclick="event.stopPropagation();openDay(\''+k+'\')">open</button></div>'+
       '<div class="pdbody">';
    dayTasks.forEach(function(tk){ h+=taskRowHTML(tk,'plan'); });
    h+='<div class="addtiny"><input id="planIn-'+k+'" placeholder="add a task…" maxlength="50" onkeydown="if(event.key===\'Enter\'){event.preventDefault();addPlanItem(\''+k+'\')}">'+
       '<button class="btn tiny soft" onclick="addPlanItem(\''+k+'\')">+</button></div>'+
       '<textarea class="plannotes" placeholder="notes…" onchange="setPlanNotes(\''+k+'\',this.value)">'+String(p.notes||'').replace(/</g,'&lt;')+'</textarea>'+
       '</div></div>';
  });
  document.getElementById('planStrip').innerHTML=h;
  const first=dates[0].split('-'), last=dates[6].split('-');
  const mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const rangeTxt=mo[+first[1]-1]+' '+(+first[2])+' – '+(first[1]===last[1]?'':mo[+last[1]-1]+' ')+(+last[2]);
  const pr=document.getElementById('planRange'); if(pr) pr.textContent=rangeTxt;
}
function renderDock(){
  const k=vday();
  const quests=questUnits();
  const cats={}; QCATS.forEach(function(c){cats[c]=[];});
  quests.forEach(function(q){ const c=q.cat||'admin'; if(!cats[c])cats[c]=[]; cats[c].push(q); });
  let qh='', qdoneN=0, unscheduled=0;
  Object.keys(cats).forEach(function(c){
    if(!cats[c].length) return;
    qh+='<div class="dockcat"><div class="qhead">'+c+'</div>';
    cats[c].sort(byOrder).forEach(function(q){
      const dn=itemDone(q,k); if(dn)qdoneN++;
      const assigned=placementOf(q.id,k);
      const skipped=itemSkipped(q,k);
      if(!assigned&&!dn&&!skipped) unscheduled++;
      const due=isRecurring(q)?dueOnDay(q,k):true;
      qh+='<div class="unitrow qunit'+(dn?' done':'')+(skipped?' skipped':'')+(due?'':' notdue')+'" draggable="'+(dn?'false':'true')+'" ondragstart="onQuestDragStart(event,\''+q.id+'\')" '+
        'ondragover="event.preventDefault();event.stopPropagation();this.classList.add(\'drophover\')" ondragleave="this.classList.remove(\'drophover\')" ondrop="onTaskRowDrop(event,\''+q.id+'\')">'+
        '<div class="unitmain" onclick="toggleUnit(\''+q.id+'\')">'+
        '<div class="ring" style="'+(dn?'background:var(--lav-deep);border-color:var(--lav-deep);color:var(--bgpage)':'')+'">\u2713</div>'+
        '<span class="nm">'+String(q.text).replace(/</g,'&lt;')+'</span>'+
        (assigned?'<span class="tag">'+assigned+'</span>':'')+
        (due?'':'<span class="tag">not today</span>')+
        '</div>'+
        unitControlsHTML(q,'dock')+
        '<span class="drag">\u283f</span>'+
        (editing==='more:'+q.id?unitMoreHTML(q,'dock'):'')+(editing==='sched:'+q.id?schedEditorHTML(q.id):'')+
        '</div>';
    });
    qh+='</div>';
  });
  const dockTasks=S.tasks.filter(function(t){return t.kind==='task'&&t.bucket==='quest';}).sort(byOrder);
  if(dockTasks.length){
    qh+='<div class="dockcat"><div class="qhead">from your tasks</div>'+dockTasks.map(function(t){return taskRowHTML(t,'flat');}).join('')+'</div>';
  }
  document.getElementById('questDock').innerHTML=qh||'<div class="qempty">no side quests yet</div>';
  document.getElementById('qcnt').textContent=qdoneN+' done \u00b7 '+unscheduled+' unscheduled';
  document.getElementById('newQuestCat').innerHTML=QCATS.map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('');
}
/* the ONE canonical task row — every task, wherever it was born (bank, block, Notion import),
   is this exact object shape and gets this exact row: checkbox, editable text, timer, delete,
   editable project, editable time estimate, and the move actions.
   ctx:'block' shows the down-arrow (move to next block — only meaningful on the calendar);
   ctx:'flat' (inbox / weekly plan / side quests) hides it since there's no "next block" there. */
/* the title gets its OWN full-width line — every icon/button/pill lives on the line(s) below it.
   Cramming timer+delete+project+est+arrows onto the same line as the text was squeezing the
   title down to almost no width in narrow columns, wrapping it into an unreadable vertical strip. */
function taskRowHTML(t, ctx){
  ctx = ctx || 'block';
  const dn=itemDone(t), worst=isWorstHabit(t.id), sk=itemSkipped(t);
  return '<div class="taskrow2'+(dn?' done':'')+(worst?' worst':'')+(sk?' skipped':'')+(isPicked(t.id)?' picked':'')+'" draggable="true" onclick="pickTask(\''+t.id+'\',event)" ondragstart="onTaskDragStart(event,\''+t.id+'\')" '+
    'ondragover="event.preventDefault();event.stopPropagation();this.classList.add(\'drophover\')" ondragleave="this.classList.remove(\'drophover\')" ondrop="onTaskRowDrop(event,\''+t.id+'\')">'+
    '<div class="tr2-title">'+
    '<input type="checkbox"'+(dn?' checked':'')+' onchange="toggleUnit(\''+t.id+'\')">'+
    '<span class="tt" contenteditable="true" onclick="event.stopPropagation()" onblur="setTaskText(\''+t.id+'\',this.textContent)">'+String(t.text).replace(/</g,'&lt;')+'</span>'+
    (worst?'<span class="worsttag" title="your weakest daily habit this week \u2014 worth double">2\u00d7</span>':'')+
    /* the other modes announce themselves with a progress bar; quick is the one that needs a word */
    (modeOf(t)==='quick'&&!dn?'<span class="tag" title="under five minutes">quick</span>':'')+
    '</div>'+
    unitProgressHTML(t)+
    '<div class="tr2-meta">'+unitCtlHTML(t,ctx)+'</div>'+
    (editing==='more:'+t.id?unitMoreHTML(t,ctx):'')+
    (editing==='sched:'+t.id&&ctx!=='block'?schedEditorHTML(t.id):'')+
    (editing==='sess:'+t.id?sessEditorHTML(t.id):'')+
    (editing==='mode:'+t.id?modeEditorHTML(t.id):'')+
    (editing==='dayp:'+t.id?dayPickerHTML(t.id):'')+
    (editing==='subs:'+t.id?subtaskRowsHTML(t):'')+
    '</div>';
}
function renderTaskChip(t){
  const prioColor=t.priority==='High'?'var(--pink-deep)':t.priority==='Medium'?'var(--sun-deep)':t.priority==='Low'?'var(--lav-deep)':'';
  const dn=itemDone(t);
  return '<div class="tbchip'+(dn?' done':'')+(isPicked(t.id)?' picked':'')+'" draggable="true" onclick="pickTask(\''+t.id+'\',event)" ondragstart="onTaskDragStart(event,\''+t.id+'\')" '+
    'ondragover="event.preventDefault();event.stopPropagation();this.classList.add(\'drophover\')" ondragleave="this.classList.remove(\'drophover\')" ondrop="onTaskRowDrop(event,\''+t.id+'\')">'+
    '<div class="tbchip-title">'+
    '<div class="ring" onclick="toggleUnit(\''+t.id+'\')" style="'+(dn?'background:var(--lav-deep);border-color:var(--lav-deep);color:var(--bgpage)':'')+'">\u2713</div>'+
    (prioColor?'<span class="prio" style="background:'+prioColor+'" title="'+t.priority+' priority"></span>':'')+
    '<span class="nm" contenteditable="true" onclick="event.stopPropagation()" onblur="setTaskText(\''+t.id+'\',this.textContent)">'+String(t.text).replace(/</g,'&lt;')+'</span>'+
    '</div>'+
    unitProgressHTML(t)+
    '<div class="tbchip-meta">'+unitCtlHTML(t,'bank')+'</div>'+
    (editing==='more:'+t.id?unitMoreHTML(t,'bank'):'')+
    (editing==='sched:'+t.id?schedEditorHTML(t.id):'')+
    (editing==='sess:'+t.id?sessEditorHTML(t.id):'')+
    (editing==='mode:'+t.id?modeEditorHTML(t.id):'')+
    (editing==='dayp:'+t.id?dayPickerHTML(t.id):'')+
    (editing==='subs:'+t.id?subtaskRowsHTML(t):'')+
    '</div>';
}
function renderTaskBank(){
  const catChipsEl=document.getElementById('catChips');
  if(catChipsEl){
    catChipsEl.innerHTML=S.categories.map(function(c){
      const dArm=armed==='cat:'+c;
      return '<span class="catchip">'+c+'<button class="rowbtn'+(dArm?' arm':'')+'" style="opacity:.5" onclick="delCategory(\''+c+'\',event)">'+(dArm?'sure?':'✕')+'</button></span>';
    }).join('');
  }
  let totalUnassigned=0;
  ENVELOPES.forEach(function(env){
    /* tasks only. Rituals and side quests also carry day:null — they're never "scheduled" in the
       task-bank sense — so an unqualified !t.day filter swept every daily habit into this list
       and inflated the unassigned count with things that were never unassigned. Habits live on
       the timeline, quests live in the side-quest dock; neither belongs in the planning backlog. */
    const items=S.tasks.filter(function(t){return isBacklogTask(t)&&t.envelope===env&&!t.day;});
    totalUnassigned+=items.length;
    const tags={};
    items.forEach(function(t){ const pj=t.project||'Uncategorized'; if(!tags[pj])tags[pj]=[]; tags[pj].push(t); });
    const expanded=manualEnvelope[env]!==undefined?manualEnvelope[env]:true;
    let h='<div class="tbenv-head" onclick="toggleEnvelope(\''+env+'\')"><span class="lbl">'+env+'</span><span class="stripcount">'+items.length+'</span></div>';
    h+='<div class="tbenv-body">';
    Object.keys(tags).sort().forEach(function(tg){
      h+='<div class="tbtag"><div class="tbtaghead">'+tg+'</div>';
      tags[tg].sort(byOrder).forEach(function(t){ h+=renderTaskChip(t); });
      h+='</div>';
    });
    if(!items.length) h+='<div class="qempty">nothing unassigned here</div>';
    /* each envelope gets its own add form, so a new task lands in the section you're looking at
       and you never have to pick "work vs personal" from a dropdown */
    h+='<div class="addstack">'+
       '<input id="newTaskText-'+env+'" placeholder="new '+env+' task…" maxlength="120" '+
       'onkeydown="if(event.key===\'Enter\'){event.preventDefault();addTaskInEnvelope(\''+env+'\')}">'+
       '<select id="newTaskProject-'+env+'">'+categoryOptionsHTML('Uncategorized')+'</select>'+
       '<button class="btn tiny soft" onclick="addTaskInEnvelope(\''+env+'\')">add to '+env+'</button>'+
       '</div>';
    h+='</div>';
    const el=document.getElementById('envelope-'+env);
    if(el){ el.className='tbenv'+(expanded?'':' collapsed'); el.innerHTML=h; }
  });
  const cnt=document.getElementById('tbCnt'); if(cnt) cnt.textContent=totalUnassigned+' unassigned';
  const bankCard=document.getElementById('taskBankCard');
  if(bankCard) bankCard.classList.toggle('cardcollapsed',taskBankCollapsed);
  const tbb=document.getElementById('taskBankBtn'); if(tbb) tbb.textContent=taskBankCollapsed?'▸':'▾';
}
function renderFutureLog(){
  const items=S.tasks.filter(function(t){return t.day==='FUTURE';});
  FUTURE_BUCKETS.forEach(function(bucket){
    const box=document.getElementById('future-'+bucket);
    if(!box) return;
    const bItems=items.filter(function(t){return t.futureBucket===bucket;}).sort(byOrder);
    box.innerHTML=bItems.length?bItems.map(renderTaskChip).join(''):'<div class="qempty">drag a task here</div>';
  });
  const cnt=document.getElementById('futureCnt'); if(cnt) cnt.textContent=items.length+' filed';
}
function renderTodayTasksCard(){
  const tKey=vday();
  const allToday=S.tasks.filter(function(t){return t.day===tKey;});
  const card=document.getElementById('todayTasksCard');
  if(!card) return;
  /* the card stays up even with nothing on the day — it holds the only way to
     add a task from the day view, so hiding it when empty stranded you. */
  card.style.display='';
  const doneN=allToday.filter(function(t){return t.done;}).length;
  const pct=allToday.length?Math.round(doneN/allToday.length*100):0;
  const bar=document.getElementById('todayTasksBar'); if(bar) bar.style.width=pct+'%';
  const n=document.getElementById('todayTasksN'); if(n) n.textContent=allToday.length?doneN+'/'+allToday.length:'';
  const unpinned=allToday.filter(function(t){return !t.blockId;}).sort(byOrder);
  const list=document.getElementById('todayTasksList');
  if(list) list.innerHTML=unpinned.length?unpinned.map(function(t){return taskRowHTML(t,'flat');}).join('')
    :'<div class="qempty">'+(allToday.length?'everything is pinned into the calendar below':'nothing on this day yet — add one below')+'</div>';
}
function renderPapers(){
  const list=document.getElementById('paperList');
  if(!list) return;
  const statusClass={'queued':'s-queued','abstract read':'s-abstract','skimmed':'s-skimmed','notes taken':'s-notes'};
  list.innerHTML=S.papers.length?S.papers.map(function(p,i){
    const running=!!p.timerStart, isArm=armed==='pp:'+p.id;
    const linked=S.tasks.filter(function(t){return t.paperId===p.id&&!t.done;}).length;
    return '<div class="paper">'+
      '<div class="ptitle">'+
      '<span class="pt" contenteditable="true" onblur="setPaperTitle(\''+p.id+'\',this.textContent)">'+String(p.title).replace(/</g,'&lt;')+'</span>'+
      (p.url?'<a href="'+p.url+'" target="_blank" rel="noopener" style="color:var(--ink-3);text-decoration:none;font-size:11px" title="open the paper">↗</a>':'')+
      '</div>'+
      '<div class="pmeta">'+
      '<button class="pstatus '+(statusClass[p.status]||'s-queued')+'" title="click to advance" onclick="cyclePaperStatus(\''+p.id+'\',event)">'+p.status+'</button>'+
      '<span class="tclock"'+(running?' data-timer-live-paper="'+p.id+'"':'')+'>'+mmss(paperTotalSec(p))+'</span>'+
      '<button class="timerbtn'+(running?' on':'')+'" style="width:20px;height:20px" title="start/stop reading" onclick="togglePaperTimer(\''+p.id+'\',event)">'+(running?'❚❚':'▶')+'</button>'+
      (linked?'<span class="tbtagpill" title="open tasks pointing at this paper">'+linked+' task'+(linked===1?'':'s')+'</span>':'')+
      '<button class="arrowbtn" title="move up the queue" onclick="movePaper(\''+p.id+'\',-1,event)"'+(i===0?' disabled':'')+'>↑</button>'+
      '<button class="arrowbtn" title="move down the queue" onclick="movePaper(\''+p.id+'\',1,event)"'+(i===S.papers.length-1?' disabled':'')+'>↓</button>'+
      '<button class="rowbtn'+(isArm?' arm':'')+'" onclick="delPaper(\''+p.id+'\',event)">'+(isArm?'sure?':'✕')+'</button>'+
      '</div>'+
      '<textarea class="pnotes" placeholder="what stuck out…" onchange="setPaperNotes(\''+p.id+'\',this.value)">'+String(p.notes||'').replace(/</g,'&lt;')+'</textarea>'+
      '</div>';
  }).join(''):'<div class="qempty">queue is empty — add a paper below</div>';
  const cnt=document.getElementById('papersCnt');
  if(cnt){
    const done=S.papers.filter(function(p){return p.status==='notes taken';}).length;
    cnt.textContent=S.papers.length?done+'/'+S.papers.length+' with notes':'';
  }
}
function render(){
  VIEWS.forEach(function(v){
    const tab=document.getElementById('vtab-'+v), box=document.getElementById(v+'View'), bt=document.getElementById('btab-'+v);
    if(tab) tab.classList.toggle('on',viewMode===v);
    if(bt) bt.classList.toggle('on',viewMode===v);
    if(box) box.style.display=viewMode===v?'':'none';
  });
  const d=day(vday()), now=new Date(); const hh=now.getHours();
  document.getElementById('greet').textContent=
    (hh<ROLLOVER||hh>=17)?'Good evening, Evelyn':(hh<12?'Good morning, Evelyn':'Good afternoon, Evelyn');
  const vp=vday().split('-').map(Number);
  document.getElementById('dateLine').textContent=new Date(vp[0],vp[1]-1,vp[2]).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  const navLbl=document.getElementById('navDayLabel');
  if(navLbl){ navLbl.textContent=vdayLabel(); navLbl.classList.toggle('off',!isViewingToday()); }
  const offBar=document.getElementById('offTodayBar');
  if(offBar){
    offBar.style.display=isViewingToday()?'none':'';
    offBar.innerHTML=isViewingToday()?'':
      '<div class="offtodaybar" onclick="goToday()">viewing '+vdayLabel().toLowerCase()+
      ' \u00b7 ticking things off here won\u2019t earn or affect streaks \u00b7 <b>back to today</b></div>';
  }
  const overall=Math.round(dayScore(vday())*100);
  document.getElementById('dayPct').textContent=overall+'%';
  document.getElementById('dayFill').style.width=overall+'%';
  renderPrismShell();
  renderDeskSidebar();
  /* must run before the view branches below, so the timeline and inbox are already parked in the
     desktop panes by the time their contents are filled in */
  syncDeskDay();
  renderPrismFocus();
  renderDeskFocus();
  renderFocusHome();
  renderWeekGrid();
  renderDayRailHint();
  renderFocusSession();
  /* water lives in the app header now (waterHeader/waterFillHeader/cupCaptionHeader), so it has
     to render on every view, not just today — this block runs before the view branches below,
     and the detail card (still full waterCard, now parked in the more tab) is refreshed further
     down alongside the rest of the more-tab cards so its elements only get touched when present. */
  const hv=vessel();
  const hNumCups=Math.max(1,Math.round(goalOn(vday())/hv.oz));
  const hWaterPct=Math.min(100,Math.round(d.water/goalOn(vday())*100));
  const waterFillHeaderEl=document.getElementById('waterFillHeader');
  if(waterFillHeaderEl) waterFillHeaderEl.style.width=hWaterPct+'%';
  const waterHeaderEl=document.getElementById('waterHeader');
  if(waterHeaderEl) waterHeaderEl.classList.toggle('full',d.water>=goalOn(vday()));
  const cupCaptionHeaderEl=document.getElementById('cupCaptionHeader');
  if(cupCaptionHeaderEl) cupCaptionHeaderEl.textContent=d.water+'/'+goalOn(vday())+'oz';
  renderRitualQuickRow();
  if(viewMode==='notes'){ renderNotes(); return; }
  if(viewMode==='month'){ renderMonth(); return; }
  if(viewMode==='planning'){ renderPlanBanner(); renderTaskBank(); renderFutureLog(); renderPlan(); return; }
  /* everything below here used to be gated to the today view only, back when every one of these
     cards lived there. Now most of them (water detail, habit streaks, meditation, books,
     movement, spend, papers, today's-tasks) live in the more tab instead — but their
     DOM nodes are always present (display:none on the container, not removed), so it's simplest
     to just keep refreshing them every render() regardless of which tab is on screen, and only
     gate the two genuinely today-only pieces (the timeline itself and the quest dock). */
  if(viewMode==='today'){ renderTimeline(); renderDock(); }
  renderTodayTasksCard(); renderPapers();
  document.getElementById('cnt-day').textContent=d.blocks.filter(isBlockCleared).length+'/'+d.blocks.length+' blocks cleared';
  const v=vessel();
  const numCups=Math.max(1,Math.round(goalOn(vday())/v.oz));
  const halfSteps=Math.min(numCups,Math.round(d.water/v.oz*2)/2);
  const waterPct=Math.min(100,Math.round(d.water/goalOn(vday())*100));
  const waterBarEl=document.getElementById('waterBar');
  if(waterBarEl) waterBarEl.classList.toggle('full',d.water>=goalOn(vday()));
  const waterFillEl=document.getElementById('waterFill');
  if(waterFillEl) waterFillEl.style.width=waterPct+'%';
  const waterDivEl=document.getElementById('waterDividers');
  if(waterDivEl){
    /* dividers mark real cup-sized boundaries (i cups * this vessel's oz), not an even 1/numCups
       split — numCups is rounded, so an even split drifts away from where the fill bar actually
       is whenever the goal isn't a clean multiple of the vessel size */
    let dh='';
    for(let i=1;i<numCups;i++){
      const pos=Math.min(100,Math.round(i*v.oz/goalOn(vday())*100));
      if(pos>=100) continue;
      const past=pos<=waterPct;
      dh+='<div class="wdiv'+(past?' past':'')+'" style="left:'+pos+'%"></div>';
    }
    waterDivEl.innerHTML=dh;
  }
  document.getElementById('cupCaption').textContent=d.water+' / '+goalOn(vday())+' oz · '+fmtCups(halfSteps)+' of '+numCups+' '+v.name.toLowerCase()+' cups';
  document.getElementById('waterHint').textContent=d.water>=goalOn(vday())?'goal met':(goalOn(vday())-d.water)+' oz to go';
  document.getElementById('vesselSel').innerHTML=S.vessels.map(function(x,i){
    return '<option value="'+i+'"'+(i===S.vesselIdx?' selected':'')+'>'+x.name+' · '+x.oz+'oz</option>';}).join('');
  document.getElementById('wStreakN').textContent=S.waterStreak;
  document.getElementById('wBestN').textContent=S.waterBest;
  document.getElementById('wFreezeN').textContent=S.freezes;
  let web='';
  if(editing==='customOz') web='<div class="inline-edit"><span class="lbl">ounces</span><input id="customOzIn" type="number" min="1" autofocus>'+
    '<button class="btn tiny" onclick="submitCustomOz()">add</button><button class="btn tiny ghost" onclick="toggleEdit(null)">cancel</button></div>';
  if(editing==='newVessel') web='<div class="inline-edit"><span class="lbl">new cup</span><input id="vesNameIn" class="wide" placeholder="name">'+
    '<input id="vesOzIn" type="number" min="1" placeholder="oz">'+
    '<button class="btn tiny" onclick="submitVessel()">save</button><button class="btn tiny ghost" onclick="toggleEdit(null)">cancel</button></div>';
  document.getElementById('waterEditBox').innerHTML=web;
  const hsEl=document.getElementById('habitStreakRows');
  if(hsEl){
    const hsDays=[]; for(let n=6;n>=0;n--) hsDays.push(shiftKey(vday(),-n));
    /* one column per ritual, one row per item within it — meds in pink so it's obvious at a
       glance whether every dose landed, everything else (brush teeth, skincare, ...) in green */
    const hsCol=function(ritual,label){
      /* itemsFor() is the same resolver the ritual panels themselves use — it already accounts
         for items you've removed, moved between rituals, or added as custom, so the streak grid
         always matches what's actually in your sunrise/moonlight ritual right now */
      const items=ritualRoster(ritual).filter(function(i){return i.type==='core'||i.type==='med'||i.type==='custom';});
      const rows=items.map(function(it){
        const dotsHtml=hsDays.map(function(k){
          const dn=itemDoneOnDay(it.id,k), sk=itemSkipped(it,k);
          return '<span class="hsdot'+(it.type==='med'?' med':'')+(dn?' on':'')+(sk?' skip':'')+
            '" title="'+String(it.text||'')+' · '+k+(sk?' — skipped':(dn?' — done':' — not done'))+' (click to toggle)" onclick="toggleItemOnDay(\''+it.id+'\',\''+k+'\')"></span>';
        }).join('');
        return '<div class="hscompact'+(worstHabitIds()[it.id]?' worst':'')+'"><span class="hsname">'+String(it.text||'')+'</span><span class="hsdots">'+dotsHtml+'</span></div>';
      }).join('');
      const delBtn=ritual?'<button class="rowbtn'+(armed==='rdef:'+ritual?' arm':'')+'" style="opacity:.4" onclick="delRitualDef(\''+ritual+'\',event)">'+(armed==='rdef:'+ritual?'sure?':'✕')+'</button>':'';
      return '<div class="hscol"><div class="hscolhead">'+label+delBtn+'</div>'+rows+'</div>';
    };
    let hsColsHtml=(S.ritualDefs||[]).map(function(rd){return hsCol(rd.id,rd.name);}).join('');
    /* habits with no ritual block at all surface here, in their own column — never in the side
       quest dock, which is only ever for genuinely repeating non-habit quests */
    const unassignedHabits=ritualRoster(null).filter(function(i){return i.type==='core'||i.type==='med'||i.type==='custom';});
    if(unassignedHabits.length) hsColsHtml+=hsCol(null,'unassigned');
    hsColsHtml+='<div class="hscol hscoladd">'+
      '<input id="newRitualName" placeholder="new ritual block…" maxlength="40">'+
      '<div class="ritualaddtimes"><input id="newRitualStart" type="time" value="12:00"><input id="newRitualEnd" type="time" value="13:00"></div>'+
      '<button class="btn tiny soft" onclick="submitAddRitualDef()">+ add ritual</button></div>';
    hsEl.innerHTML='<div class="hscols">'+hsColsHtml+'</div>';
  }
  let gh='';
  S.books.forEach(function(b){
    const pct=Math.round(b.cur/b.pages*100);
    const isEdit=editing==='book:'+b.id, isArm=armed==='bk:'+b.id;
    gh+='<div class="book"><div class="brow"><span class="dot" style="background:'+b.color+'"></span><span class="bt">'+b.title+'</span>'+
        '<span class="bpg">p. '+b.cur+' / '+b.pages+'</span>'+
        '<button class="rowbtn'+(isArm?' arm':'')+'" style="opacity:.4" onclick="delBook(\''+b.id+'\',event)">'+(isArm?'sure?':'✕')+'</button></div>'+
        '<div class="brow2"><div class="bar"><div class="fill" style="width:'+pct+'%;background:'+b.color+'"></div></div>'+
        '<button class="btn tiny soft" onclick="toggleEdit(\'book:'+b.id+'\')">'+(isEdit?'close':'log pages')+'</button></div>';
    if(isEdit) gh+='<div class="inline-edit"><span class="lbl">i’m on page</span>'+
        '<input id="pageIn-'+b.id+'" type="number" min="0" max="'+b.pages+'" value="'+b.cur+'">'+
        '<button class="btn tiny" onclick="submitPages(\''+b.id+'\')">save</button></div>';
    gh+='</div>';
  });
  if(!S.books.length) gh='<div class="sub" style="color:var(--ink-3);font-size:12px;padding:2px 0 6px">no open books — add one below</div>';
  document.getElementById('bookList').innerHTML=gh;
  let wk=0; for(let n=0;n<7;n++){ const dd=S.days[shiftKey(vday(),-n)]; if(dd)wk+=dd.pagesLogged||0; }
  document.getElementById('pagesWk').textContent=wk+' pages this week';
  document.getElementById('readGoalFill').style.width=Math.min(100,Math.round(wk/S.readGoal*100))+'%';
  document.getElementById('readGoalN').textContent=wk+'/'+S.readGoal;
  document.getElementById('readGoalBtn').textContent=S.readGoal+' pages';
  document.getElementById('readGoalEditBox').innerHTML= editing==='readGoal'?
    '<div class="inline-edit"><span class="lbl">weekly pages</span><input id="readGoalIn" type="number" min="10" value="'+S.readGoal+'">'+
    '<button class="btn tiny" onclick="submitReadGoal()">save</button><button class="btn tiny ghost" onclick="toggleEdit(null)">cancel</button></div>':'';
  const allBooksById={}; S.books.forEach(function(b){allBooksById[b.id]=b;});
  let maxDay=1; const daysArr=[];
  for(let n=6;n>=0;n--){
    const k=shiftKey(vday(),-n), dd=S.days[k]; const by=dd&&dd.pagesBy?dd.pagesBy:{};
    const tot=Object.keys(by).reduce(function(a,x){return a+by[x];},0); if(tot>maxDay)maxDay=tot;
    daysArr.push({k:k, by:by, tot:tot, isToday:n===0});
  }
  document.getElementById('readChart').innerHTML=daysArr.map(function(dd){
    let segs='';
    Object.keys(dd.by).forEach(function(bid,i){
      const bk=allBooksById[bid]; const col=bk?bk.color:BOOK_COLORS[i%BOOK_COLORS.length];
      const hpx=Math.max(3,Math.round(dd.by[bid]/maxDay*70));
      segs+='<div class="cseg" style="height:'+hpx+'px;background:'+col+'" title="'+dd.by[bid]+' pages"></div>';
    });
    if(!segs) segs='<div class="cseg" style="height:3px;background:rgba(190,150,140,.12)"></div>';
    return '<div class="cday" title="'+dd.tot+' pages">'+segs+'</div>';
  }).join('');
  const dows=['sun','mon','tue','wed','thu','fri','sat'];
  document.getElementById('readLbls').innerHTML=daysArr.map(function(dd){
    const p=dd.k.split('-').map(Number); const dow=dows[new Date(p[0],p[1]-1,p[2]).getDay()];
    return '<div class="cl'+(dd.isToday?' today':'')+'">'+dow+'</div>';}).join('');
  document.getElementById('shelf').innerHTML=S.doneBooks.length?
    'finished: '+S.doneBooks.map(function(b){return '<b>'+b.title+'</b>';}).join(' · '):'';
  let mc=0; for(const k in S.days){ const dd=S.days[k]; if(dd.done&&dd.done['medit'])mc++; }
  document.getElementById('mediCount').textContent=mc+' sessions total';
  let mediMax=1, mediWkTot=0; const mediDays=[];
  for(let n=6;n>=0;n--){
    const k=shiftKey(vday(),-n), dd=S.days[k];
    const mins=dd&&dd.mediMin?Math.round(dd.mediMin):0;
    if(mins>mediMax) mediMax=mins;
    mediWkTot+=mins;
    mediDays.push({k:k,mins:mins,isToday:n===0});
  }
  const mediChartEl=document.getElementById('mediChart');
  if(mediChartEl) mediChartEl.innerHTML=mediDays.map(function(dd){
    const hpx=dd.mins?Math.max(3,Math.round(dd.mins/mediMax*70)):3;
    const col=dd.mins?'var(--lav-deep)':'rgba(190,150,140,.12)';
    return '<div class="cday" title="'+dd.mins+' min"><div class="cseg" style="height:'+hpx+'px;background:'+col+'"></div></div>';
  }).join('');
  const mediLblsEl=document.getElementById('mediLbls');
  const mdows=['sun','mon','tue','wed','thu','fri','sat'];
  if(mediLblsEl) mediLblsEl.innerHTML=mediDays.map(function(dd){
    const p=dd.k.split('-').map(Number); const dow=mdows[new Date(p[0],p[1]-1,p[2]).getDay()];
    return '<div class="cl'+(dd.isToday?' today':'')+'">'+dow+'</div>';}).join('');
  const mediWkEl=document.getElementById('mediWk');
  if(mediWkEl) mediWkEl.textContent=mediWkTot+' min this week · '+(d.mediMin?Math.round(d.mediMin)+' min today':'nothing logged today');
  const wkMin=weekMove();
  document.getElementById('chips').innerHTML=allActs().map(function(a){
    const m=d.ex[a.id]||0;
    const running=!!(S.actTimers&&S.actTimers[a.id]);
    const isCustom=!ACTS.some(function(x){return x.id===a.id;});
    const isArm=armed==='act:'+a.id;
    const label=running?'<span class="chiptimer" data-timer-live-act="'+a.id+'">'+mmss(actElapsedSec(a.id))+'</span>':a.name+(m?' · '+m+'m':'');
    return '<span class="chipwrap"><button class="chip'+(running?' timeron':(m?' logged':''))+'" onclick="openActPanel(\''+a.id+'\')">'+label+'</button>'+
      (isCustom?'<button class="chipx" onclick="delAct(\''+a.id+'\',event)">'+(isArm?'!':'✕')+'</button>':'')+
      '</span>';
  }).join('');
  let sb='';
  if(actPanelFor){
    const a=allActs().filter(function(x){return x.id===actPanelFor;})[0];
    if(a){
      const running=!!(S.actTimers&&S.actTimers[a.id]);
      sb='<div class="actpanel"><span class="actpanelhead">'+a.name+'</span>'+
         '<div class="checklist">'+(a.checklist||[]).map(function(item,idx){
           const on=!!actChecklistState[idx];
           return '<label class="checkitem'+(on?' done':'')+'"><input type="checkbox"'+(on?' checked':'')+' onchange="toggleChecklistItem('+idx+')">'+
             String(item).replace(/</g,'&lt;')+'</label>';
         }).join('')+'</div>'+
         '<div class="actpanelbtns">'+
           (running
             ?'<span class="chiptimer" data-timer-live-act="'+a.id+'">'+mmss(actElapsedSec(a.id))+'</span><button class="btn tiny" onclick="toggleActTimer(\''+a.id+'\')">■ stop</button>'
             :'<button class="btn tiny" onclick="toggleActTimer(\''+a.id+'\')">▶ start stopwatch</button>')+
         '</div></div>';
    }
  }
  document.getElementById('stepperBox').innerHTML=sb;
  const movesRowEl=document.getElementById('movesRow');
  if(movesRowEl) movesRowEl.innerHTML=S.exMoves.map(function(m){
    const running=!!m.timerStart;
    const isArm=armed==='mv:'+m.id;
    const label=running?'<span class="chiptimer" data-timer-live-move="'+m.id+'">'+mmss(exMoveElapsedSec(m))+'</span>'
      :(String(m.name).replace(/</g,'&lt;')+(m.bestSec?' · best '+mmss(m.bestSec):''));
    return '<span class="chipwrap"><button class="chip move'+(running?' timeron':'')+'" onclick="toggleExMoveTimer(\''+m.id+'\')">'+label+'</button>'+
      '<button class="chipx" onclick="delExMove(\''+m.id+'\',event)">'+(isArm?'!':'✕')+'</button></span>';
  }).join('');
  document.getElementById('moveFill').style.width=Math.min(100,Math.round(wkMin/S.moveGoal*100))+'%';
  document.getElementById('moveN').textContent=wkMin+'/'+S.moveGoal;
  const todayMin=Object.keys(d.ex).reduce(function(a,k){return a+d.ex[k];},0);
  document.getElementById('moveToday').textContent=todayMin?todayMin+' min today':'';
  document.getElementById('moveGoalBtn').textContent=S.moveGoal+' min';
  document.getElementById('moveEditBox').innerHTML= editing==='moveGoal'?
    '<div class="inline-edit"><span class="lbl">weekly minutes</span><input id="moveGoalIn" type="number" min="10" value="'+S.moveGoal+'">'+
    '<button class="btn tiny" onclick="submitMoveGoal()">save</button><button class="btn tiny ghost" onclick="toggleEdit(null)">cancel</button></div>':'';
  /* budget summary — remaining against the monthly allowance, or just the period total when no
     budget has been set yet */
  const budEl=document.getElementById('budgetV');
  if(budEl){
    const monthly=budgetMonthlyCents(), spent=spentInPeriod(), left=monthly-spent;
    budEl.textContent=monthly?dollarsStr(Math.max(0,left)):dollarsStr(spent);
    budEl.style.color=(monthly&&left<0)?'var(--pink-deep)':'';
    const budLbl=document.getElementById('budgetLbl');
    if(budLbl) budLbl.textContent=monthly
      ? (left<0?'over by '+dollarsStr(-left):'left of '+dollarsStr(monthly))
      : 'spent this period';
    const budFill=document.getElementById('budgetBarFill');
    if(budFill) budFill.style.width=(monthly?Math.min(100,Math.max(0,Math.round(spent/monthly*100))):0)+'%';
  }
  const spendListEl=document.getElementById('spendList');
  if(spendListEl){
    const txns=S.txns||[];
    spendListEl.innerHTML=txns.length?txns.slice(0,25).map(function(s){
      const dArm=armed==='sp:'+s.id;
      const dp=(s.day||today()).split('-').map(Number);
      const when=new Date(dp[0],dp[1]-1,dp[2]).toLocaleDateString(undefined,{month:'short',day:'numeric'});
      return '<div class="spend"><span class="nm">'+String(s.name).replace(/</g,'&lt;')+'</span>'+
        '<span class="amt">'+dollarsStr(s.amountCents)+'</span>'+
        '<span class="bal">'+String(s.cat||'').replace(/</g,'&lt;')+'</span>'+
        '<span class="when">'+when+'</span>'+
        '<button class="rowbtn'+(dArm?' arm':'')+'" style="opacity:.4" onclick="delSpend(\''+s.id+'\',event)">'+(dArm?'sure?':'✕')+'</button></div>';
    }).join(''):'<div class="redeemed-line">nothing logged yet</div>';
  }
  const nsDows=['sun','mon','tue','wed','thu','fri','sat'];
  const nsDays=[]; for(let n=6;n>=0;n--) nsDays.push(shiftKey(vday(),-n));
  const noSpendRowEl=document.getElementById('noSpendRow');
  if(noSpendRowEl){
    const checkSvg='<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 13l4 4L19 7" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    noSpendRowEl.innerHTML=nsDays.map(function(k){
      const isToday=k===today();
      const clean=!spentOnDay(k);
      const cls=clean?(isToday?'cleantoday':'clean'):'';
      return '<div class="nsday"><div class="nscircle '+cls+'" onclick="toggleNoSpendDay(\''+k+'\')" title="'+k+'">'+
        (clean&&!isToday?checkSvg:'')+'</div></div>';
    }).join('');
    document.getElementById('noSpendLbls').innerHTML=nsDays.map(function(k){
      const p=k.split('-').map(Number); const dow=nsDows[new Date(p[0],p[1]-1,p[2]).getDay()];
      return '<div class="cl'+(k===today()?' today':'')+'">'+dow+'</div>';
    }).join('');
    document.getElementById('noSpendStreakV').textContent=noSpendStreak();
    const nsEditingKey=(editing||'').indexOf('nospend:')===0?editing.slice(8):null;
    document.getElementById('noSpendEditBox').innerHTML=nsEditingKey?
      '<div class="inline-edit"><span class="lbl">log a spend for '+nsEditingKey+'</span>'+
      '<input id="nsName" class="wide" placeholder="what did you buy?" maxlength="60">'+
      '<input id="nsAmt" placeholder="$" type="number" min="0" step="0.25">'+
      '<button class="btn tiny" onclick="addSpendForDay(\''+nsEditingKey+'\')">save</button>'+
      '<button class="btn tiny ghost" onclick="toggleEdit(null)">cancel</button></div>':'';
  }
  const tKey=vday(), tea=S.tea[tKey]||['','',''];
  const yTea=(S.tea[shiftKey(tKey,-1)]||[]).filter(Boolean);
  let th='';
  if(phase()==='sunrise'&&yTea.length) th+='<div class="teaview">from last night: '+yTea.map(function(x){return '“'+x+'”';}).join(' · ')+'</div>';
  for(let i=0;i<3;i++) th+='<div class="tearow"><input placeholder="intention '+(i+1)+'" value="'+String(tea[i]||'').replace(/"/g,'&quot;')+'" onchange="setTea('+i+',this.value)"></div>';
  document.getElementById('teaBox').innerHTML=th;
  document.getElementById('lastBackupLine').textContent=S.lastBackup?('last backup '+S.lastBackup):'no backup yet';
  document.getElementById('restoreBox').innerHTML= editing==='restore'?
    '<div class="restorewarn"><span>Restoring replaces everything currently in the app with the backup you choose.</span>'+
    '<div style="display:flex;gap:8px"><button class="btn tiny" onclick="document.getElementById(\'importFile\').click()">choose backup file…</button>'+
    '<button class="btn tiny ghost" onclick="toggleEdit(null)">cancel</button></div>'+
    '<span style="font-size:11px;color:var(--ink-2)">or paste the contents of a backup file here:</span>'+
    '<textarea class="restorepaste" id="restorePasteIn" placeholder="{&quot;v&quot;:4, …}" spellcheck="false"></textarea>'+
    '<div style="display:flex;gap:8px"><button class="btn tiny" onclick="restoreFromPaste()">restore from pasted text</button></div>'+
    '</div>':'';
  renderSyncLine();
}
/* ===================== notes =====================
   Block notes were never actually being lost — they live on in S.days[<date>].blocks[].notes, and
   buildGaps only ever discards an auto block that has no notes, no tasks, no focus and no pomos.
   They were just unreachable once the day rolled over. This view gathers every non-empty block
   note across the viewed week and makes it editable in place (edits write straight back to the
   block they came from), alongside one free-text note per week keyed by that week's Monday. */
function esc1(v){ return String(v).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
function setWeekNote(v){ S.weekNotes[weekKeyOf(vday())]=v; save(); }
function setBlockNoteOn(dayKey,blockId,v){
  const dd=S.days[dayKey]; if(!dd) return;
  const b=(dd.blocks||[]).filter(function(x){return x.id===blockId;})[0];
  if(b){ b.notes=v; save(); }
}
function weekNoteEntries(k){
  return weekDatesOf(k).map(function(dk){
    const dd=S.days[dk];
    const blocks=dd?(dd.blocks||[]).filter(function(b){return b.notes&&b.notes.trim();})
                      .sort(function(a,b){return toMin(a.start)-toMin(b.start);}):[];
    return {day:dk, blocks:blocks};
  });
}
function renderNotes(){
  const dows=['mon','tue','wed','thu','fri','sat','sun'];
  const mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dates=weekDatesOf(vday());
  const f=dates[0].split('-'), l=dates[6].split('-');
  const rangeEl=document.getElementById('notesRange');
  if(rangeEl) rangeEl.textContent=mo[+f[1]-1]+' '+(+f[2])+' – '+(f[1]===l[1]?'':mo[+l[1]-1]+' ')+(+l[2]);
  const wk=document.getElementById('weekNoteIn');
  if(wk&&document.activeElement!==wk) wk.value=S.weekNotes[weekKeyOf(vday())]||'';
  const entries=weekNoteEntries(vday());
  const total=entries.reduce(function(a,e){return a+e.blocks.length;},0);
  let h='';
  entries.forEach(function(e,i){
    if(!e.blocks.length) return;
    const dn=+e.day.split('-')[2];
    h+='<div class="noteday">'+
       '<div class="notedayhead"><span class="ndow">'+dows[i]+'</span><span class="ndnum">'+dn+'</span>'+
       '<button class="btn tiny ghost" onclick="openDay(\''+esc1(e.day)+'\')">open day</button></div>';
    e.blocks.forEach(function(b){
      h+='<div class="noteblk"><div class="noteblkhead">'+b.start+'–'+(b.end||'')+
         (b.focus?' · <b>'+String(b.focus).replace(/</g,'&lt;')+'</b>':'')+'</div>'+
         '<textarea class="noteblktext" onchange="setBlockNoteOn(\''+esc1(e.day)+'\',\''+esc1(b.id)+'\',this.value)">'+
         String(b.notes||'').replace(/</g,'&lt;')+'</textarea></div>';
    });
    h+='</div>';
  });
  const body=document.getElementById('notesBody');
  if(body) body.innerHTML=h||'<div class="qempty">No block notes this week yet — anything you type into a block\u2019s notes field shows up here and stays put after the day ends.</div>';
  const cnt=document.getElementById('notesCnt');
  if(cnt) cnt.textContent=total?total+' note'+(total===1?'':'s'):'';
}
/* ===================== insights (month view) ===================== */
function daysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function dayStats(k){
  const dd=S.days[k]; if(!dd) return {habitPct:0,pages:0,exMin:0,waterHit:false,quests:0,hasData:false};
  const req=allItems().filter(function(i){return i.type==='core'||i.type==='med';});
  const doneN=req.filter(function(i){return dd.done&&dd.done[i.id];}).length;
  const exMin=dd.ex?Object.keys(dd.ex).reduce(function(a,k){return a+dd.ex[k];},0):0;
  const quests=dd.qdone?Object.keys(dd.qdone).length:0;
  return {habitPct:req.length?doneN/req.length:0, pages:dd.pagesLogged||0, exMin:exMin,
    waterHit:dd.water>=goalOn(k), quests:quests, hasData:true, score:dayScore(k)};
}
function renderMonth(){
  const now=new Date(); const y=now.getFullYear(), m=now.getMonth();
  document.getElementById('monthLbl').textContent=now.toLocaleDateString(undefined,{month:'long',year:'numeric'});
  const nDays=daysInMonth(y,m);
  let fullDays=0, pageSum=0, pageDays=0, exSum=0, waterHitDays=0, questSum=0, elapsedDays=0;
  const cats={}; QCATS.forEach(function(c){cats[c]=0;});
  for(let dnum=1;dnum<=nDays;dnum++){
    const dt=new Date(y,m,dnum); if(dt>now) break;
    const k=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
    const st=dayStats(k); elapsedDays++;
    if(st.habitPct>=0.999) fullDays++;
    if(st.pages>0){ pageSum+=st.pages; pageDays++; }
    exSum+=st.exMin; if(st.waterHit) waterHitDays++; questSum+=st.quests;
    const dd=S.days[k];
    if(dd&&dd.qdone) Object.keys(dd.qdone).forEach(function(qid){
      const q=S.quests.filter(function(x){return x.id===qid;})[0]; if(q&&cats[q.cat]!==undefined) cats[q.cat]++;
    });
  }
  document.getElementById('monthMetrics').innerHTML=
    '<div class="metric"><div class="mv">'+fullDays+' / '+elapsedDays+'</div><div class="ml">full habit days</div></div>'+
    '<div class="metric"><div class="mv">'+(pageDays?Math.round(pageSum/pageDays):0)+'</div><div class="ml">avg pages, active days</div></div>'+
    '<div class="metric"><div class="mv">'+Math.round(exSum/60*10)/10+'h</div><div class="ml">exercise this month</div></div>'+
    '<div class="metric"><div class="mv">'+waterHitDays+' / '+elapsedDays+'</div><div class="ml">water goal hit</div></div>';
  /* one ring per date, driven by dayScore — the same number the header bar and the phone's
     day-of-week strip show, so a date reads identically wherever you meet it. Future dates draw
     an empty track rather than a partial score. */
  const firstDow=new Date(y,m,1).getDay();
  let hh=''; for(let i=0;i<firstDow;i++) hh+='<div></div>';
  const tk=today();
  for(let dnum=1;dnum<=nDays;dnum++){
    const dt=new Date(y,m,dnum);
    const k=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
    const future=k>tk, isToday=k===tk;
    const sc=future?0:dayScore(k);
    const col=future?'var(--glass-strong)':scoreColor(sc);
    hh+='<div class="scell'+(isToday?' today':'')+(future?' future':'')+'" onclick="openDay(\''+k+'\')" '+
      'title="'+k+' · '+Math.round(sc*100)+'%">'+ringSvg(sc,col,44,10)+
      '<span class="n">'+dnum+'</span></div>';
  }
  const sg=document.getElementById('scoreGrid');
  if(sg) sg.innerHTML=hh;
  let maxWk=1; const weeks=[];
  for(let w=5;w>=0;w--){
    let sum=0;
    for(let n=0;n<7;n++){ const k=shiftKey(today(),-(w*7+n)); const dd=S.days[k]; if(dd&&dd.ex) sum+=Object.keys(dd.ex).reduce(function(a,x){return a+dd.ex[x];},0); }
    if(sum>maxWk) maxWk=sum; weeks.push(sum);
  }
  document.getElementById('exTrend').innerHTML=weeks.map(function(sum,i){
    const h=Math.max(3,Math.round(sum/maxWk*64));
    return '<div class="tbar"><div class="tbarfill" style="height:'+h+'px" title="'+sum+' min"></div><div class="tbarlbl">'+(i===5?'now':'-'+(5-i)+'w')+'</div></div>';
  }).join('');
  const maxCat=Math.max(1,Object.values(cats).reduce(function(a,b){return Math.max(a,b);},0));
  document.getElementById('qcatChart').innerHTML=QCATS.map(function(c){
    const v=cats[c]||0, pct=Math.round(v/maxCat*100);
    return '<div class="qcatbar"><span class="qn">'+c+'</span><div class="bar lav"><div class="fill" style="width:'+pct+'%"></div></div><span class="qv">'+v+'</span></div>';
  }).join('');
}
/* ===================== touch drag and drop =====================
   HTML5 drag events never fire from a finger, so every draggable in this app used to be
   mouse-only. Rather than rewrite each widget, this turns a press-and-drag gesture into the very
   same dragstart/dragover/dragleave/drop/dragend events the existing handlers already listen
   for — so cards, tasks, quests, bank chips and the insertion drop-zones all become touch
   draggable at once, with no change to their handlers.
   It takes a short press (not an immediate drag) to start, so ordinary scrolling still works. */
/* long enough that resting a finger before scrolling doesn't turn into a drag, short enough that
   a deliberate press-and-move still feels immediate */
const TOUCH_HOLD_MS=420, TOUCH_SLOP=10;
const HAS_DT=(function(){ try{ return !!new DataTransfer(); }catch(e){ return false; } })();
let tdrag=null, tdragTimer=null, pendingTouch=null;
function makeDT(){
  if(HAS_DT) return new DataTransfer();
  const store={};
  return {setData:function(t,v){store[t]=String(v);}, getData:function(t){return store[t]||'';},
          effectAllowed:'', dropEffect:''};
}
function fireDrag(el,type,dt){
  let ev;
  if(HAS_DT) ev=new DragEvent(type,{bubbles:true,cancelable:true,dataTransfer:dt});
  else { ev=new Event(type,{bubbles:true,cancelable:true}); ev.dataTransfer=dt; }
  el.dispatchEvent(ev);
  return ev;
}
function dropTargetAt(x,y){
  const el=document.elementFromPoint(x,y);
  return el&&el.closest?el.closest('[ondrop],.dropzone'):null;
}
function cancelPendingTouch(){
  if(tdragTimer){ clearTimeout(tdragTimer); tdragTimer=null; }
  pendingTouch=null;
}
function beginTouchDrag(st){
  tdragTimer=null; pendingTouch=null;
  const src=st.src, dt=makeDT();
  fireDrag(src,'dragstart',dt);
  const r=src.getBoundingClientRect();
  const ghost=src.cloneNode(true);
  /* strip ids off the clone so it can't shadow the real nodes for getElementById */
  ghost.removeAttribute('id');
  Array.prototype.forEach.call(ghost.querySelectorAll('[id]'),function(el){ el.removeAttribute('id'); });
  ghost.classList.add('touchghost');
  ghost.style.width=r.width+'px';
  document.body.appendChild(ghost);
  src.classList.add('touchdragsrc');
  document.body.classList.add('touchdragging');
  tdrag={src:src, dt:dt, ghost:ghost, dx:st.x-r.left, dy:st.y-r.top, target:null};
  if(navigator.vibrate){ try{ navigator.vibrate(10); }catch(e){} }
  moveTouchGhost(st.x,st.y);
}
function moveTouchGhost(x,y){
  if(!tdrag) return;
  tdrag.ghost.style.left=(x-tdrag.dx)+'px';
  tdrag.ghost.style.top=(y-tdrag.dy)+'px';
  tdrag.ghost.style.visibility='hidden';
  const tgt=dropTargetAt(x,y);
  tdrag.ghost.style.visibility='';
  if(tgt!==tdrag.target){
    if(tdrag.target) fireDrag(tdrag.target,'dragleave',tdrag.dt);
    tdrag.target=tgt;
  }
  if(tgt) fireDrag(tgt,'dragover',tdrag.dt);
}
function onTouchDragStart(e){
  if(tdrag||e.touches.length!==1) return;
  const t=e.touches[0];
  const el=t.target||e.target;
  if(!el||!el.closest) return;
  /* a tap on a real control inside the row is a tap, not the start of a drag */
  if(el.closest('button,input,select,textarea,a,[contenteditable="true"]')) return;
  /* Never arm a drag inside a bottom sheet. A sheet is a small scrolling surface, and once the
     hold timer fires the move handler preventDefault()s every touchmove to keep the page still
     under the drag — which reads as "the popup won't scroll". Nothing inside a sheet is a drag
     source today, so there is nothing to lose by excluding it outright. */
  if(el.closest('.pssheet')) return;
  const src=el.closest('[draggable="true"]');
  if(!src) return;
  pendingTouch={x:t.clientX, y:t.clientY, src:src};
  tdragTimer=setTimeout(function(){ if(pendingTouch) beginTouchDrag(pendingTouch); },TOUCH_HOLD_MS);
}
function onTouchDragMove(e){
  const t=e.touches[0]; if(!t) return;
  if(pendingTouch){
    if(Math.abs(t.clientX-pendingTouch.x)>TOUCH_SLOP||Math.abs(t.clientY-pendingTouch.y)>TOUCH_SLOP) cancelPendingTouch();
    return;
  }
  if(!tdrag) return;
  e.preventDefault(); /* keep the page from scrolling out from under the drag */
  moveTouchGhost(t.clientX,t.clientY);
  const edge=72;
  if(t.clientY<edge) window.scrollBy(0,-14);
  else if(t.clientY>window.innerHeight-edge) window.scrollBy(0,14);
}
function onTouchDragEnd(){
  cancelPendingTouch();
  if(!tdrag) return;
  if(tdrag.target) fireDrag(tdrag.target,'drop',tdrag.dt);
  fireDrag(tdrag.src,'dragend',tdrag.dt);
  if(tdrag.ghost) tdrag.ghost.remove();
  tdrag.src.classList.remove('touchdragsrc');
  document.body.classList.remove('touchdragging');
  tdrag=null;
  document.querySelectorAll('.drophover').forEach(function(el){ el.classList.remove('drophover'); });
  document.querySelectorAll('.dropzone.active').forEach(function(el){ el.classList.remove('active'); });
}
/* boot — load() is async now (the storage API returns promises), so the whole startup
   sequence waits for state to come back before the first render */
(async function boot(){
  await load();
  reconcile(); render(); mediPaint(); maybeAutoBackup();
  applyLayoutDom(); applyCollapsedDom(); applyTheme();
  lastSnapshot=JSON.stringify(S);
  registerServiceWorker();
  notifyReady=notifyPermission()==='granted';
  setInterval(tickTimers,1000);
  /* the minute hand. It used to only do anything on a date rollover, which meant a block could
     end and keep holding its tasks until something else happened to trigger a render. Now every
     minute: hand back what an ended block was holding, announce what's about to start, and
     re-render if either changed something. */
  setInterval(function(){
    if(today()!==S.lastDate){ reconcile(); render(); return; }
    const returned=sweepEndedBlocks(today());
    checkBlockAlerts();
    if(returned||isViewingToday()) render();
  },60000);
  /* a laptop that was asleep wakes up minutes or hours later having missed every tick, and the
     tasks of every block that ended in the meantime are still pinned to it */
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState!=='visible') return;
    if(today()!==S.lastDate){ reconcile(); }
    sweepEndedBlocks(today());
    render();
  });
  sweepEndedBlocks(today());
  /* these inputs only exist if the old ritual panels are still in the page — habits are added
     from inside their routine block now, so guard rather than assume */
  (S.ritualDefs||[]).forEach(function(rd){
    const r=rd.id;
    const el=document.getElementById('add-'+r);
    if(el) el.addEventListener('keydown',function(e){ if(e.key==='Enter')addCustom(r); });
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&focusBlockId){ exitFocus(); return; }
    const mod=e.ctrlKey||e.metaKey;
    if(!mod) return;
    const t=e.target;
    const typing=t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable);
    if(typing) return;
    const k=e.key.toLowerCase();
    if(k==='z'&&!e.shiftKey){ e.preventDefault(); doUndo(); }
    else if((k==='z'&&e.shiftKey)||k==='y'){ e.preventDefault(); doRedo(); }
  });
  /* don't let a pending debounced write die with the tab */
  document.addEventListener('touchstart',onTouchDragStart,{passive:true});
  document.addEventListener('touchmove',onTouchDragMove,{passive:false});
  document.addEventListener('touchend',onTouchDragEnd);
  document.addEventListener('touchcancel',onTouchDragEnd);
  window.addEventListener('pagehide',function(){ flushSave(); flushGhPushUrgent(); });
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden'){ flushSave(); flushGhPushUrgent(); } });
  /* rotating a phone crosses the gridPxPerMin() breakpoint in either direction, so the timeline
     needs a re-render to pick up the new ratio — it doesn't otherwise get one until the next
     unrelated interaction. */
  let resizeRenderTimer=null;
  window.addEventListener('resize',function(){
    clearTimeout(resizeRenderTimer);
    resizeRenderTimer=setTimeout(function(){ if(viewMode==='today') render(); },150);
  });
})();
