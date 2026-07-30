/* ===================== config ===================== */
const ROLLOVER=4, WATER_GOAL=100, FREEZE_AT=120, MAX_FREEZE=3;
const DAY_START=360, DAY_END=1320; /* 6:00am – 10:00pm skeleton */
/* ---------- fixed proportional grid (Google-Calendar-style timeline) ----------
   Replaces the earlier elastic/floor-ceiling sizing: every block's on-screen height is now a
   true function of its clock duration, same rate for all of them, so 8am really is twice as far
   from 6am as 7am is. "Compact" per the ask that replaced elastic sizing — 0.95px/minute keeps
   the full 6am-10pm day under 920px instead of a full 1:1 minute-per-pixel sprawl.
   On a phone that's still taller than the screen has room for even with today's past-folding —
   so phone widths get a smaller ratio instead, computed live (not a frozen const) so it tracks
   orientation changes. Every consumer goes through gridPxPerMin() rather than a fixed number. */
function gridPxPerMin(){ return (typeof window!=='undefined'&&window.innerWidth<=760)?0.5:0.95; }
/* origin defaults to the full day (DAY_START) but the "live" grid for today passes its own
   origin — see renderTimeline — so folded-past time doesn't cost any vertical space */
function minToPx(min,origin){ origin=(origin===undefined)?DAY_START:origin; return Math.round((min-origin)*gridPxPerMin()); }
function pxToMin(px,origin){ origin=(origin===undefined)?DAY_START:origin; return origin+Math.round(px/gridPxPerMin()); }
/* the click/drag snap increment on the calendar */
function snap15(min){ return Math.round(min/15)*15; }
const DEFAULT_CATEGORIES=['home','research','admin','self-care','hobbies','school'];
/* appearance: background/card/text + the app's two accent families (strawberry, matcha), plus
   a small curated set of font stacks — free-text font input isn't offered since a bad value
   would just silently fall back to the browser default with no feedback */
/* full repaint — the old strawberry-cream/matcha default replaced with a warm-cream "citrus
   neutral" base so the app's own baseline look stops reading as "pink app" before anyone even
   opens the theme picker */
const DEFAULT_THEME={mode:'light', bgpage:'#F7F1E8', glass:'#FFFFFF', glassStrong:'#FBF7F0',
  ink:'#231F1A', ink2:'#6E6459', ink3:'#A79C8C', stroke:'rgba(35,31,26,.14)', rule:'rgba(35,31,26,.08)',
  pink:'#FFB4A8', pinkDeep:'#E85D4A', mint:'#A8E0C8', mintDeep:'#2E9E72', fontKey:'inter',
  hueBlue:'#A8CDEE', hueBlueDeep:'#4A85C4', hueViolet:'#D3BFF0', hueVioletDeep:'#8B5FD1',
  hueYellow:'#FFE29A', hueYellowDeep:'#E0A72A', gradA1:'#FFB4A8', gradA2:'#A8CDEE',
  gradB1:'#A8E0C8', gradB2:'#FFE29A'};
/* dark mode is its own curated preset (not a computed inverse of the light one) so contrast and
   accent saturation can be tuned by hand rather than relying on a naive color-flip — a cooler
   "slate" dark instead of the old pink-tinted dark */
const DEFAULT_DARK_THEME={mode:'dark', bgpage:'#14151A', glass:'#1E2028', glassStrong:'#282A34',
  ink:'#F1F1F4', ink2:'#9A9CA8', ink3:'#5A5C68', stroke:'rgba(255,255,255,.12)', rule:'rgba(255,255,255,.06)',
  pink:'#4A2E38', pinkDeep:'#E8637E', mint:'#1F3D33', mintDeep:'#3ECF9A', fontKey:'inter',
  hueBlue:'#25344A', hueBlueDeep:'#5B9BE8', hueViolet:'#332A47', hueVioletDeep:'#A47FE8',
  hueYellow:'#3D3520', hueYellowDeep:'#E8C24A', gradA1:'#1F2733', gradA2:'#241E2E',
  gradB1:'#241E28', gradB2:'#1E2620'};
/* real webfonts (loaded in index.html's <head>) instead of the old OS-font-fallback stacks —
   most people don't have Inter/Trebuchet actually installed, so those used to silently fall back
   to whatever generic sans/serif the OS shipped; each of these five now has real character */
const FONT_STACKS={
  inter:"'Inter','Helvetica Neue',Helvetica,Arial,sans-serif",
  serif:"'Fraunces',Georgia,'Times New Roman',serif",
  rounded:"'Quicksand','Trebuchet MS',Verdana,sans-serif",
  system:"'Space Grotesk',system-ui,-apple-system,'Segoe UI',sans-serif",
  mono:"'Space Mono','Courier New',ui-monospace,monospace"
};
/* five one-tap presets, same shape as DEFAULT_THEME/DEFAULT_DARK_THEME — picking one just replaces
   S.theme wholesale (see applyPresetTheme), same as switching light/dark mode does. Anyone can still
   hand-tune from there and save their own on top via saveCurrentTheme. */
const PRESET_THEMES=[
  {id:'citrus', name:'citrus pop', mode:'light', bgpage:'#FFF8E7', glass:'#FFFFFF', glassStrong:'#FFFBF0',
    ink:'#2B2110', ink2:'#8A7A54', ink3:'#D9C99A', stroke:'rgba(43,33,16,.16)', rule:'rgba(43,33,16,.09)',
    pink:'#FF9EC4', pinkDeep:'#FF3E96', mint:'#C8F27A', mintDeep:'#8FCC1F', fontKey:'rounded',
    hueBlue:'#8FD9F2', hueBlueDeep:'#1FAEDB', hueViolet:'#D9A8F2', hueVioletDeep:'#B24FE0',
    hueYellow:'#FFD166', hueYellowDeep:'#F2A800', gradA1:'#FF9EC4', gradA2:'#FFD166',
    gradB1:'#C8F27A', gradB2:'#8FD9F2'},
  {id:'lavenderfog', name:'lavender fog', mode:'light', bgpage:'#F1EEF7', glass:'#FFFFFF', glassStrong:'#F8F6FB',
    ink:'#2E2A3D', ink2:'#7A7390', ink3:'#C2BCD4', stroke:'rgba(46,42,61,.14)', rule:'rgba(46,42,61,.08)',
    pink:'#E8B8D4', pinkDeep:'#C36FA0', mint:'#B8CFE0', mintDeep:'#5C8CAD', fontKey:'serif',
    hueBlue:'#B0B8E8', hueBlueDeep:'#6670C4', hueViolet:'#C9B0E8', hueVioletDeep:'#8A5FC7',
    hueYellow:'#E8D9B0', hueYellowDeep:'#B89A4F', gradA1:'#E8B8D4', gradA2:'#B0B8E8',
    gradB1:'#C9B0E8', gradB2:'#B8CFE0'},
  {id:'terracotta', name:'terracotta', mode:'light', bgpage:'#FBEDE2', glass:'#FFFDF9', glassStrong:'#F7E9DC',
    ink:'#3D2418', ink2:'#8C6A52', ink3:'#D4B69E', stroke:'rgba(61,36,24,.16)', rule:'rgba(61,36,24,.09)',
    pink:'#E8967A', pinkDeep:'#C1512E', mint:'#A8C49A', mintDeep:'#5F8A4C', fontKey:'serif',
    hueBlue:'#8FBBC7', hueBlueDeep:'#3E7E92', hueViolet:'#C4A8B8', hueVioletDeep:'#8A5470',
    hueYellow:'#E8C67A', hueYellowDeep:'#C4941F', gradA1:'#E8967A', gradA2:'#E8C67A',
    gradB1:'#A8C49A', gradB2:'#8FBBC7'},
  {id:'neon', name:'midnight neon', mode:'dark', bgpage:'#0A0E17', glass:'#131826', glassStrong:'#1C2233',
    ink:'#E8F4FF', ink2:'#8FA3C4', ink3:'#4A5670', stroke:'rgba(255,255,255,.14)', rule:'rgba(255,255,255,.07)',
    pink:'#3D1A38', pinkDeep:'#FF2E9C', mint:'#123D38', mintDeep:'#00E5B8', fontKey:'system',
    hueBlue:'#1A2A4A', hueBlueDeep:'#3E7EFF', hueViolet:'#2A1A4A', hueVioletDeep:'#9D4EFF',
    hueYellow:'#3A331A', hueYellowDeep:'#FFE500', gradA1:'#FF2E9C', gradA2:'#3E7EFF',
    gradB1:'#00E5B8', gradB2:'#9D4EFF'},
  {id:'foresttrail', name:'forest trail', mode:'light', bgpage:'#EEF2E4', glass:'#FBFCF7', glassStrong:'#F1F5E8',
    ink:'#1F2E1A', ink2:'#5C6E52', ink3:'#A3B598', stroke:'rgba(31,46,26,.15)', rule:'rgba(31,46,26,.08)',
    pink:'#E0A87A', pinkDeep:'#B8722E', mint:'#A0C48A', mintDeep:'#4F8A38', fontKey:'serif',
    hueBlue:'#8FBFCC', hueBlueDeep:'#3E8598', hueViolet:'#C4B0D4', hueVioletDeep:'#8A64A8',
    hueYellow:'#E0D084', hueYellowDeep:'#B89A1F', gradA1:'#A0C48A', gradA2:'#8FBFCC',
    gradB1:'#E0A87A', gradB2:'#E0D084'},
  /* the "vivid cards floating on near-black" look from the dashboard-style inspiration — an
     opt-in preset, not a DEFAULT_DARK_THEME replacement, since it's a much more saturated,
     higher-contrast-per-surface aesthetic than the quiet default dark mode should commit to */
  {id:'aurora', name:'aurora glow', mode:'dark', bgpage:'#0E0F13', glass:'#1A1B22', glassStrong:'#242530',
    ink:'#F5F5F7', ink2:'#9A9BA3', ink3:'#5C5D66', stroke:'rgba(255,255,255,.12)', rule:'rgba(255,255,255,.06)',
    pink:'#FF6FA8', pinkDeep:'#FF3D82', mint:'#5CE6B0', mintDeep:'#22C48C', fontKey:'inter',
    hueBlue:'#5B8DEF', hueBlueDeep:'#2F65D6', hueViolet:'#B37FEA', hueVioletDeep:'#8A4FD1',
    hueYellow:'#FFD166', hueYellowDeep:'#F2A900', gradA1:'#FF8A5B', gradA2:'#7B6FEA',
    gradB1:'#FF6FA8', gradB2:'#5B8DEF'}
];
/* default card order per column, across BOTH the today view (cols 0-2: todayColA/B/C) and the
   more view (cols 3-5: moreColA/B/C) — ids match each card's actual DOM id. Water lives in the
   header now (see waterHeader). Today keeps habit streaks, the calendar, the inbox (tasks
   assigned to today from the planning tab), and side quests; everything else (meditation,
   bookshelf, movement, intentions, papers, treats, spending) lives in the more tab. Any id
   dropped from this list is also dropped from a saved layout by backfillLayout, which is how
   the retired sunrise/moonlight panels (and card moves like this one) clear themselves out of
   existing users' columns. */
const CARD_COL_IDS=['todayColA','todayColB','todayColC', 'weekColA', 'weekColB', 'weekColC', 'moreColA','moreColB','moreColC'];
const DEFAULT_LAYOUT_COLS=[
  ['habitStreakCard'],
  ['card-day'],
  ['todayTasksCard','questCard'],
  ['taskBankCard'],
  ['weekPlanCard'],
  ['futureLogCard'],
  ['meditationCard','movementCard'],
  ['bookshelfCard','treatsCard'],
  ['waterCard','papersCard','spendCard']
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
/* points expressed directly in cents, real-money value. Rebalanced so a fully-completed day of
   rituals + quests + water alone (no bonus tasks) lands well under the cost of the cheapest treat
   ($2.50 coffee) — it should take roughly 3 solid days to earn a coffee out, with task/block/pomo
   completions as the main path to bigger treats. */
const CENTS={med:3, core:5, quest:8, custom:8, waterGoal:21, seal:17, pomo:3, blockClear:8, move:8, pages:5};
/* cumulative reward for reaching each paper status, indexed to PAPER_STATUSES below */
const PAPER_STATUS_CENTS=[0, 15, 50, 110];
/* weekly earning guardrails: $20/wk should be easy with consistent habits, $100/wk is a hard ceiling */
const WEEKLY_TARGET_CENTS=2000, WEEKLY_CAP_CENTS=10000;
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
/* the 5-hue accent set (set by applyTheme() from S.theme) shared by calendar blocks, task/project
   category chips, and priority pills — one hash function, one palette, so the same category or
   block type always reads as the same color everywhere it shows up, not just decoratively varied. */
const CATEGORY_PALETTE=[
  {bg:'var(--blue)', edge:'var(--blue-deep)'},
  {bg:'var(--mint)', edge:'var(--mint-deep)'},
  {bg:'var(--violet)', edge:'var(--violet-deep)'},
  {bg:'var(--pink)', edge:'var(--pink-deep)'},
  {bg:'var(--yellow)', edge:'var(--yellow-deep)'}
];
function blockHash(id){ let h=0; for(let i=0;i<String(id).length;i++){ h=(h*31+String(id).charCodeAt(i))>>>0; } return h; }
function categoryColor(name){ return CATEGORY_PALETTE[blockHash(String(name))%CATEGORY_PALETTE.length]; }
/* block color is now information-bearing, not a decorative hash-of-id alternation: ritual blocks
   are always violet, an open-ended block is always yellow, a project block picks up its own
   category's color (so the block and every chip for that category match), and a plain
   single-focus block — the majority case, since category only exists on project blocks — is
   the shared default blue. */
function blockColor(b){
  if(b.type==='ritual') return CATEGORY_PALETTE[2];
  if(b.type==='project'&&b.category) return categoryColor(b.category);
  if(b.type==='open') return CATEGORY_PALETTE[4];
  return CATEGORY_PALETTE[0];
}
const PX_PER_MIN=1.25; /* the calendar is spatially honest: 1 hour ≈ 75px of height */
const DEFAULT_TREATS=[
  {id:'t1',name:'Coffee out',points:250},{id:'t2',name:'Skein of yarn',points:400},
  {id:'t3',name:'A new book',points:900},{id:'t4',name:'Dinner out',points:2000}];
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
function blankState(){ return { v:4, lastDate:null, days:{},
  custom:[], removed:[], moves:{},
  vessels:[{name:'Everyday cup',oz:20},{name:'Big bottle',oz:32},{name:'Mug',oz:12}], vesselIdx:0,
  cents:0, waterStreak:0, waterBest:0, freezes:0, frozenDays:[],
  treats:DEFAULT_TREATS.map(function(t){return Object.assign({},t);}), redeemed:[],
  books:[], doneBooks:[],
  affirm:DEFAULT_AFFIRM.slice(), affirmIdx:{},
  tea:{}, moveGoal:150, readGoal:150,
  quests:DEFAULT_QUESTS.map(function(q){return Object.assign({},q);}),
  workStart:'12:00', workHours:8, lastBackup:null,
  tasks:[], notionImportedAt:null, notionLinksRepairedAt:null, blockTasksMigratedAt:null,
  mediBestSec:0, papers:[],
  spendLog:[], pointsRebalancedAt:Date.now(),
  categories:DEFAULT_CATEGORIES.slice(),
  layout:{cols:DEFAULT_LAYOUT_COLS.map(function(c){return c.slice();}), collapsed:{}},
  theme:Object.assign({},DEFAULT_THEME),
  customActs:[], actTimers:{}, exMoves:[],
  savedThemes:[], weekNotes:{},
}; }
function migrateFromV3(old){
  const s=blankState();
  ['custom','removed','moves','vessels','vesselIdx','waterStreak','waterBest','freezes','frozenDays',
   'books','doneBooks','affirm','affirmIdx','tea','moveGoal','quests','workStart','workHours','lastDate'].forEach(function(k){
    if(old[k]!==undefined) s[k]=old[k];
  });
  s.cents=Math.round((old.pts||0)*2.5);
  s.treats=(old.treats||[]).map(function(t){return {id:t.id,name:t.name,points:Math.round((t.cost||0)*2.5)||10};});
  s.redeemed=old.redeemed||[];
  s.days={};
  Object.keys(old.days||{}).forEach(function(k){
    const od=old.days[k];
    s.days[k]={
      water:od.water||0, log:od.log||[], done:od.done||{}, ex:od.ex||{},
      pagesLogged:od.pagesLogged||0, pagesBy:od.pagesBy||{}, pomos:od.pomos||0,
      qdone:{}, questAssign:{}, ptsEarned:0,
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
function backfillTreats(){
  if(!S.treats) { S.treats=[]; return; }
  S.treats=S.treats.map(function(t){
    if(t.points!==undefined) return t;
    if(t.dollars!==undefined) return {id:t.id,name:t.name,points:Math.round(t.dollars*100)};
    return {id:t.id,name:t.name,points:100};
  });
}
function backfillAffirm(){
  if(!S.affirm||!S.affirm.length||!S.affirm.some(function(x){return x.indexOf(' — ')>=0;})){
    S.affirm=DEFAULT_AFFIRM.slice(); S.affirmIdx={};
  }
}
function backfillSpendLog(){
  if(!S.spendLog) { S.spendLog=[]; return; }
  S.spendLog.forEach(function(s){ if(!s.day) s.day=dayKeyOf(new Date(s.at||Date.now())); });
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
/* the quick way to add a habit under morning or evening — no ritual-block creation UI, just
   morning/evening always, per how you actually use this */
function submitAddHabit(){
  const nameEl=document.getElementById('newHabitName'), selEl=document.getElementById('newHabitRitual');
  if(!nameEl||!nameEl.value.trim()) return;
  const r=selEl&&selEl.value?selEl.value:((S.ritualDefs&&S.ritualDefs[0])?S.ritualDefs[0].id:null);
  if(addRitualItem(r,nameEl.value)){ nameEl.value=''; render(); }
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
  /* the raw color-picker section in Settings defaults to collapsed (presets are the prominent
     path); only seed this the first time so a user who's deliberately expanded it keeps that choice */
  if(S.layout.collapsed.advancedColors===undefined) S.layout.collapsed.advancedColors=true;
}
function backfillTheme(){
  if(!S.theme) S.theme=Object.assign({},DEFAULT_THEME);
  Object.keys(DEFAULT_THEME).forEach(function(k){ if(S.theme[k]===undefined) S.theme[k]=DEFAULT_THEME[k]; });
  if(!S.savedThemes) S.savedThemes=[];
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
   was folded into that accent family during the matcha/strawberry palette consolidation, so
   changing "accent 1" recolors everything derived from strawberry in one go, same for matcha. */
function applyTheme(){
  const t=S.theme, r=document.documentElement.style;
  r.setProperty('color-scheme',t.mode==='dark'?'dark':'light');
  r.setProperty('--bgpage',t.bgpage);
  r.setProperty('--glass',t.glass);
  r.setProperty('--glass-strong',t.glassStrong);
  r.setProperty('--ink',t.ink);
  r.setProperty('--ink-2',t.ink2);
  r.setProperty('--ink-3',t.ink3);
  r.setProperty('--stroke',t.stroke);
  r.setProperty('--rule',t.rule);
  r.setProperty('--serif',FONT_STACKS[t.fontKey]||FONT_STACKS.inter);
  ['--pink','--lav','--peach'].forEach(function(v){ r.setProperty(v,t.pink); });
  ['--pink-deep','--lav-deep','--peach-deep'].forEach(function(v){ r.setProperty(v,t.pinkDeep); });
  ['--mint','--aqua','--sun','--sky','--leaf','--water'].forEach(function(v){ r.setProperty(v,t.mint); });
  ['--mint-deep','--aqua-deep','--sun-deep','--sky-deep','--leaf-deep','--water-deep'].forEach(function(v){ r.setProperty(v,t.mintDeep); });
  /* 3 more saturated hues rounding the accent set out to 5 (plus pink/mint above) — || fallbacks
     so a theme object saved before these keys existed (an old localStorage state, an imported
     pre-refactor backup) degrades to a sane default instead of writing "undefined" into a CSS var */
  r.setProperty('--blue',t.hueBlue||'#8FB8E0');
  r.setProperty('--blue-deep',t.hueBlueDeep||'#4A7FB5');
  r.setProperty('--violet',t.hueViolet||'#C9B6E8');
  r.setProperty('--violet-deep',t.hueVioletDeep||'#8B6BC4');
  r.setProperty('--yellow',t.hueYellow||'#F0D878');
  r.setProperty('--yellow-deep',t.hueYellowDeep||'#C4A030');
  r.setProperty('--grad-a','linear-gradient(135deg,'+(t.gradA1||t.pink)+','+(t.gradA2||t.mint)+')');
  r.setProperty('--grad-b','linear-gradient(135deg,'+(t.gradB1||t.mint)+','+(t.gradB2||t.pink)+')');
  /* card/block elevation needs to be visibly stronger on a dark theme to read against a
     near-black page — same shadow tokens, just a mode-branched intensity, so this needs no new
     field on any of the 8 theme objects, only the mode they already carry */
  if(t.mode==='dark'){
    r.setProperty('--shadow-card','0 1px 2px rgba(0,0,0,.35), 0 10px 28px -4px rgba(0,0,0,.55)');
    r.setProperty('--shadow-card-hover','0 2px 4px rgba(0,0,0,.4), 0 18px 44px -6px rgba(0,0,0,.65)');
    r.setProperty('--shadow-block','0 2px 6px rgba(0,0,0,.5), 0 1px 2px rgba(0,0,0,.3)');
  } else {
    r.setProperty('--shadow-card','0 1px 2px rgba(20,16,10,.05), 0 8px 24px -4px rgba(20,16,10,.10)');
    r.setProperty('--shadow-card-hover','0 2px 4px rgba(20,16,10,.06), 0 16px 40px -6px rgba(20,16,10,.16)');
    r.setProperty('--shadow-block','0 2px 6px rgba(20,16,10,.14), 0 1px 2px rgba(20,16,10,.07)');
  }
}
function setThemeColor(key,val){ S.theme[key]=val; save(); applyTheme(); }
function setThemeFont(key){ S.theme.fontKey=key; save(); applyTheme(); }
/* switches the whole palette to the light or dark preset in one step, keeping whatever font the
   person picked. Any hand-picked colors get replaced by the preset — mode is a starting point to
   customize from, not a filter layered on top of custom colors. */
function setThemeMode(mode){
  const fontKey=S.theme.fontKey;
  S.theme=Object.assign({},mode==='dark'?DEFAULT_DARK_THEME:DEFAULT_THEME,{fontKey:fontKey});
  save(); applyTheme(); paintThemePanel();
}
function resetTheme(){
  const mode=S.theme.mode;
  S.theme=Object.assign({},mode==='dark'?DEFAULT_DARK_THEME:DEFAULT_THEME);
  save(); applyTheme(); paintThemePanel();
}
/* named, saveable snapshots of the whole appearance config — colors, font, and mode — so you can
   build out a look once and jump back to it later without re-picking every color by hand */
function saveCurrentTheme(name){
  const nv=(name||'').trim(); if(!nv) return;
  const snapshot=Object.assign({},S.theme);
  const existing=S.savedThemes.filter(function(t){return t.name.toLowerCase()===nv.toLowerCase();})[0];
  if(existing){ existing.theme=snapshot; }
  else S.savedThemes.push({id:'th'+Date.now(), name:nv, theme:snapshot});
  save(); paintThemePanel();
  toast((existing?'updated':'saved')+' theme "'+nv+'"');
}
function applySavedTheme(id){
  const st=S.savedThemes.filter(function(t){return t.id===id;})[0]; if(!st) return;
  S.theme=Object.assign({},st.theme);
  save(); applyTheme(); paintThemePanel();
}
function applyPresetTheme(id){
  const p=PRESET_THEMES.filter(function(t){return t.id===id;})[0]; if(!p) return;
  S.theme=Object.assign({},p); delete S.theme.id; delete S.theme.name;
  save(); applyTheme(); paintThemePanel();
  toast('theme set to "'+p.name+'"');
}
function delSavedTheme(id,ev){ if(ev)ev.stopPropagation(); if(!arm('th:'+id)) return;
  S.savedThemes=S.savedThemes.filter(function(t){return t.id!==id;});
  armed=null; save(); paintThemePanel();
}
function paintThemePanel(){
  const t=S.theme;
  const FALLBACK_HUES={hueBlue:'#8FB8E0',hueBlueDeep:'#4A7FB5',hueViolet:'#C9B6E8',hueVioletDeep:'#8B6BC4',
    hueYellow:'#F0D878',hueYellowDeep:'#C4A030',gradA1:t.pink,gradA2:t.mint,gradB1:t.mint,gradB2:t.pink};
  ['bgpage','glass','glassStrong','ink','ink2','ink3','pink','pinkDeep','mint','mintDeep',
   'hueBlue','hueBlueDeep','hueViolet','hueVioletDeep','hueYellow','hueYellowDeep',
   'gradA1','gradA2','gradB1','gradB2'].forEach(function(k){
    const el=document.getElementById('th-'+k); if(el) el.value=t[k]||FALLBACK_HUES[k]||'#000000';
  });
  const fontEl=document.getElementById('th-font'); if(fontEl) fontEl.value=t.fontKey;
  const savedEl=document.getElementById('savedThemesRow');
  if(savedEl){
    savedEl.innerHTML=S.savedThemes.length?S.savedThemes.map(function(st){
      const isArm=armed==='th:'+st.id;
      return '<div style="display:flex;align-items:center;gap:8px">'+
        '<button class="btn tiny ghost" style="flex:1;text-align:left" onclick="applySavedTheme(\''+st.id+'\')">'+String(st.name).replace(/</g,'&lt;')+'</button>'+
        '<button class="btn tiny ghost" onclick="delSavedTheme(\''+st.id+'\',event)">'+(isArm?'sure?':'✕')+'</button>'+
        '</div>';
    }).join(''):'<span style="font-size:11px;color:var(--ink-3)">no saved themes yet</span>';
  }
  const lb=document.getElementById('th-mode-light'), db=document.getElementById('th-mode-dark');
  if(lb) lb.classList.toggle('on',t.mode!=='dark');
  if(db) db.classList.toggle('on',t.mode==='dark');
  paintPresetThemes();
}
/* the 5 built-in looks, rendered as tap-to-preview swatches so picking a vibe never means fiddling
   with eight separate color pickers first */
function paintPresetThemes(){
  const el=document.getElementById('presetThemesRow'); if(!el) return;
  const cur=S.theme;
  el.innerHTML=PRESET_THEMES.map(function(p){
    const isOn=['mode','bgpage','ink','pink','pinkDeep','mint','mintDeep'].every(function(k){return cur[k]===p[k];});
    return '<button class="presetswatch'+(isOn?' on':'')+'" onclick="applyPresetTheme(\''+p.id+'\')" title="'+String(p.name).replace(/</g,'&lt;')+'">'+
      '<span class="pschip" style="background:'+p.bgpage+';border-color:'+p.stroke+'">'+
        '<span style="background:'+p.pinkDeep+'"></span><span style="background:'+p.mintDeep+'"></span>'+
      '</span>'+
      '<span class="psname">'+String(p.name).replace(/</g,'&lt;')+'</span></button>';
  }).join('');
}
function toggleSettingsPanel(){
  const p=document.getElementById('settingsPanel'); if(!p) return;
  const show=p.style.display==='none';
  p.style.display=show?'flex':'none';
  if(show) paintThemePanel();
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
}
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
/* one-time fix: the CENTS payout table was cut to roughly a third of its old values so that a
   full ritual-only day stays under the cheapest treat. A balance earned under the old table would
   otherwise look inflated under the new one, so rescale existing balances (and each day's
   ptsEarned, which the weekly cap reads) by the same factor, once. */
function rebalancePointsScale(){
  if(S.pointsRebalancedAt) return;
  const factor=1/3;
  S.cents=Math.round(S.cents*factor);
  Object.keys(S.days).forEach(function(k){
    const d=S.days[k];
    if(d.ptsEarned) d.ptsEarned=Math.round(d.ptsEarned*factor);
  });
  S.pointsRebalancedAt=Date.now();
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
   above is always false and this file has nothing durable to fall back on. This section makes
   this repo itself the store: paste a fine-grained personal access token (Contents: read/write,
   scoped to just this repo) and the current state gets written to GH_PATH on a dedicated GH_BRANCH
   instead of main, so data syncs never touch the branch the Pages site is built from.
   The token is kept only in this browser's localStorage - it is never embedded in the page and
   only ever sent to api.github.com.
   Push is debounced separately from (and longer than) the local save() debounce above, so a burst
   of edits produces one commit, not one per click. */
const GH_OWNER='eve-wils', GH_REPO='focus_data', GH_BRANCH='main', GH_PATH='state.json';
const GH_TOKEN_KEY='aura_gh_token';
const GH_PRECONNECT_BACKUP_KEY='aura_gh_preconnect_backup';
const GH_PUSH_DEBOUNCE_MS=100000;
let ghToken=localStorage.getItem(GH_TOKEN_KEY)||'';
let ghSha=null, ghSyncing=false, ghLastSyncAt=null, ghLastError=null, ghBranchReady=false;
let ghSaveTimer=null, ghPushInFlight=false, ghPushQueued=false;
function ghConfigured(){ return !!ghToken; }
function ghSetToken(t){
  ghToken=(t||'').trim();
  if(ghToken) localStorage.setItem(GH_TOKEN_KEY,ghToken); else localStorage.removeItem(GH_TOKEN_KEY);
  ghBranchReady=false; ghSha=null; ghLastError=null; ghLastSyncAt=null;
}
function utf8ToB64(str){ return btoa(unescape(encodeURIComponent(str))); }
function b64ToUtf8(str){ return decodeURIComponent(escape(atob(str.replace(/\n/g,'')))); }
function ghHeaders(){
  return {Authorization:'Bearer '+ghToken, Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28', 'Content-Type':'application/json'};
}
/* the data branch may not exist yet on a repo that's only ever had main - create it once,
   forked off main's current tip, then remember it's there for the rest of the session */
async function ghEnsureBranch(){
  if(ghBranchReady||!ghConfigured()) return ghBranchReady;
  const base='https://api.github.com/repos/'+GH_OWNER+'/'+GH_REPO;
  const r=await fetch(base+'/git/ref/heads/'+GH_BRANCH,{headers:ghHeaders()});
  if(r.ok){ ghBranchReady=true; return true; }
  if(r.status!==404) throw new Error('branch check failed ('+r.status+')');
  const mainRef=await fetch(base+'/git/ref/heads/main',{headers:ghHeaders()});
  if(!mainRef.ok) throw new Error('could not read main branch ('+mainRef.status+')');
  const mainSha=(await mainRef.json()).object.sha;
  const created=await fetch(base+'/git/refs',{method:'POST',headers:ghHeaders(),
    body:JSON.stringify({ref:'refs/heads/'+GH_BRANCH, sha:mainSha})});
  if(!created.ok&&created.status!==422) throw new Error('could not create data branch ('+created.status+')');
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
async function ghPull(){
  if(!ghConfigured()) return null;
  try{
    await ghEnsureBranch();
    const raw=await ghFetchFile();
    if(!raw) return null;
    const obj=JSON.parse(raw);
    if(!obj||obj.v!==4) return null;
    ghLastError=null;
    return obj;
  }catch(e){ ghLastError=String(e&&e.message||e); return null; }
}
async function ghPushNow(opts){
  opts=opts||{};
  if(!ghConfigured()) return;
  if(ghPushInFlight){ ghPushQueued=true; return; }
  ghPushInFlight=true; ghSyncing=true; renderSyncLine();
  try{
    await ghEnsureBranch();
    if(ghSha===null){ try{ await ghFetchFile(); }catch(e){ /* no file synced yet - fine */ } }
    const body={message:'sync '+new Date().toISOString(), content:utf8ToB64(JSON.stringify(S)), branch:GH_BRANCH};
    if(ghSha) body.sha=ghSha;
    const url='https://api.github.com/repos/'+GH_OWNER+'/'+GH_REPO+'/contents/'+GH_PATH;
    let r=await fetch(url,{method:'PUT',headers:ghHeaders(),body:JSON.stringify(body),keepalive:!!opts.keepalive});
    if(r.status===409){
      /* another tab or device pushed since we last read the sha - refetch once and retry */
      await ghFetchFile();
      body.sha=ghSha;
      r=await fetch(url,{method:'PUT',headers:ghHeaders(),body:JSON.stringify(body),keepalive:!!opts.keepalive});
    }
    if(!r.ok) throw new Error('push failed ('+r.status+')');
    const j=await r.json();
    ghSha=(j.content&&j.content.sha)||ghSha;
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
  return '<div class="restorewarn"><span>Synced to '+GH_OWNER+'/'+GH_REPO+' · branch ‘'+GH_BRANCH+'’ · '+GH_PATH+'. '+ghStatusText()+'</span>'+
    '<div style="display:flex;gap:8px"><button class="btn tiny" onclick="ghPushNow()">sync now</button>'+
    '<button class="btn tiny" onclick="ghPullNowManual()">load latest from GitHub</button>'+
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
  const remote=await ghPull();
  if(remote){
    adoptState(remote);
    toast('Connected — loaded your existing data from GitHub');
  } else {
    ghPushNow();
    toast('Connected — this device is now the starting point');
  }
}
function ghDisconnect(){ ghSetToken(''); toggleEdit(null); toast('GitHub sync disconnected'); }
async function ghPullNowManual(){
  toast('Loading latest from GitHub…');
  const remote=await ghPull();
  if(!remote){ toast(ghLastError?('Could not load: '+ghLastError):'No synced data found yet'); renderSyncLine(); return; }
  adoptState(remote);
  toast('Loaded latest from GitHub');
}
function makeUnit(o){
  return Object.assign({id:'u'+Date.now()+Math.floor(Math.random()*100000), text:'', kind:'task',
    envelope:'work', project:'Uncategorized', priority:null, starred:false, done:false, doneAt:null,
    day:null, blockId:null, futureBucket:null, bucket:'bank', order:Date.now(), estMin:null, paperId:null,
    parentId:null, subtaskIds:[],
    source:'manual', notionUrl:null, createdAt:Date.now(), elapsed:0, timerStart:null,
    sched:{type:'none'},
    mode:'simple', targetN:0, targetSec:0, doneN:0, timedN:0, paidCents:0}, o);
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
  backfillTreats(); backfillAffirm(); backfillTasks(); backfillPapers(); backfillSpendLog();
  backfillCategories(); backfillLayout(); backfillTheme(); backfillMovement(); backfillWeekNotes();
  backfillRitualDefs(); backfillBlockTypes();
  if(S.readGoal===undefined) S.readGoal=150;
  if(S.mediBestSec===undefined) S.mediBestSec=0;
  rebalancePointsScale();
  importNotionSeed(); repairNotionLinks(); migrateBlockTasksToUnified();
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
    if(!obj||obj.v!==4){ toast('No pre-merge snapshot saved'); return; }
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
    if(t.paidCents===undefined) t.paidCents=itemDone(t)&&!isRecurring(t)?centsFor(t):0;
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
  if(raw){ try{ S=JSON.parse(raw); }catch(e){ S=blankState(); } if(!S||S.v!==4) S=blankState();
    await snapshotBeforeUnify(); reportHeal(hydrateState()); save(); return; }
  /* no artifact storage here (e.g. this is the GitHub Pages deploy) - if a sync token is already
     saved in this browser, the repo's data branch is the durable store, so try it before ever
     falling back to the old v3 key or a blank state */
  if(ghConfigured()){
    const remote=await ghPull();
    if(remote){ S=remote; await snapshotBeforeUnify(); reportHeal(hydrateState()); save(); return; }
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
  pendingBlockStart=null; /* a pending double-click start doesn't survive switching days */
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
  if(!S.days[k]) S.days[k]={water:0,log:[],done:{},blocks:[],ex:{},exLog:[],pagesLogged:0,pagesBy:{},bookLog:[],pomos:0,qdone:{},questAssign:{},ptsEarned:0};
  const d=S.days[k];
  if(!d.pagesBy) d.pagesBy={};
  if(!d.qdone) d.qdone={};
  if(!d.questAssign) d.questAssign={};
  if(!d.assign) d.assign={};
  if(!d.skipped) d.skipped={};
  if(!d.exLog) d.exLog=[];
  if(!d.secs) d.secs={};
  if(!d.bookLog) d.bookLog=[];
  if(d.ptsEarned===undefined) d.ptsEarned=0;
  if(!d.plan) d.plan={items:[],notes:''};
  if(d.mediMin===undefined) d.mediMin=0;
  if(!d.skipped) d.skipped={};
  if(!d.assign) d.assign={};
  if(!d.focusSegs) d.focusSegs={};
  return d; }
function vessel(){ return S.vessels[S.vesselIdx]||S.vessels[0]||{name:'Cup',oz:20}; }
function nowMinutes(){ const n=new Date(); const h=n.getHours()<ROLLOVER?n.getHours()+24:n.getHours(); return h*60+n.getMinutes(); }
function phase(){ const m=nowMinutes(); if(m<12*60) return 'sunrise'; if(m<17*60) return 'day'; return 'moonlight'; }
function reconcile(){
  const t=today();
  if(S.lastDate&&S.lastDate!==t){
    let k=S.lastDate;
    while(k!==t){
      const dd=S.days[k], got=dd?dd.water:0;
      if(got<WATER_GOAL&&S.frozenDays.indexOf(k)<0&&S.freezes>0){ S.freezes--; S.frozenDays.push(k); }
      k=shiftKey(k,1); if(daysBetween(S.lastDate,k)>400) break;
    }
  }
  S.lastDate=t; recomputeStreak(); buildGaps(today()); save();
}
function dayCounts(k){ const dd=S.days[k]; return (dd&&dd.water>=WATER_GOAL)||S.frozenDays.indexOf(k)>=0; }
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
function centsFor(t){
  if(!t) return 0;
  let base;
  if(t.kind==='ritual') base=(t.type==='med'?CENTS.med:t.type==='core'?CENTS.core:CENTS.custom);
  else if(t.kind==='quest') base=CENTS.quest;
  else base=CENTS.custom;
  if(t.priority==='High') base=Math.round(base*1.6);
  else if(t.priority==='Low') base=Math.round(base*0.7);
  if(t.starred) base=base*2;
  if(isWorstHabit(t.id)) base=base*2;   /* the one you're struggling with is worth double */
  return base;
}
/* returns what was ACTUALLY applied, which is not always what was asked for — the weekly cap
   clamps it and another day's view blocks it entirely. The pay-as-you-go ledger depends on
   knowing the difference, so it can top a task up later once headroom frees up. */
function earn(n){
  /* browsing or planning another day never moves money */
  if(!isViewingToday()) return 0;
  if(n>0){
    const headroom=Math.max(0,WEEKLY_CAP_CENTS-weeklyCents());
    n=Math.min(n,headroom);
    if(n<=0) return 0;
  }
  /* no floor at 0 here on purpose: a real spending-log deficit (see logSpend) should be paid
     down gradually as normal earning happens, not wiped out by the next ritual tick */
  S.cents=S.cents+n; const d=day(today()); d.ptsEarned=(d.ptsEarned||0)+n;
  return n;
}
/* ===================== pay-as-you-go ledger =====================
   An accumulating task pays a slice of its own value as it progresses, and the slices are capped
   at that value — nine hours of a ten-hour task shouldn't pay nothing, and it shouldn't pay more
   than the task is worth either. t.paidCents is what has actually been handed over so far, so
   every route in and out (progress, completion, un-completion, starring) is just "settle up to
   what's owed now" rather than a separate hand-rolled adjustment. */
function payUnitTo(t,cents){
  const already=t.paidCents||0;
  const delta=Math.round(cents)-already;
  if(!delta) return 0;
  const applied=earn(delta);
  t.paidCents=already+applied;
  return applied;
}
function settlePay(t){
  /* a habit pays fresh every day, so it has no running ledger to settle */
  if(isRecurring(t)) return;
  const full=centsFor(t), m=modeOf(t), tgt=targetOf(t);
  let owed=0;
  if(itemDone(t)) owed=full;
  else if(modeHasTarget(m)&&tgt) owed=full*Math.min(1,progressOf(t)/tgt);
  payUnitTo(t,owed);
}
function dollarsStr(cents){ return '$'+(Math.max(0,cents)/100).toFixed(2); }
function fmtSigned(cents){ const neg=cents<0; return (neg?'-$':'$')+(Math.abs(cents)/100).toFixed(2); }
function weeklyCents(){ let t=0; for(let n=0;n<7;n++){ const dd=S.days[shiftKey(today(),-n)]; if(dd) t+=dd.ptsEarned||0; } return t; }
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
    if(isRecurring(t)){ delete d.done[id]; earn(-centsFor(t)); }
    else { t.done=false; t.doneAt=null; settlePay(t); }
    armed=null;
  }else{
    /* a running timer has done its job the moment you tick the box — leaving it ticking silently
       in the background was inflating totals for hours after the fact */
    stopTimer(t,k);
    if(isRecurring(t)){ d.done[id]=Date.now(); earn(centsFor(t)); }
    else { t.done=true; t.doneAt=Date.now(); settlePay(t); }
    celebrateBurst();
    if(t.blockId){ const b=blockOf(t.blockId);
      if(b&&isBlockCleared(b)){ earn(CENTS.blockClear); celebrateBurst(true); toast('Block cleared \u2014 '+(b.focus||'untitled')); } }
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
    if(itemDone(t,k)){ if(isRecurring(t)) delete d.done[id]; else t.done=false; earn(-centsFor(t)); }
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
    ph+='<span class="drag" title="drag onto a day or the future log">⠿</span>';
    return ph;
  }
  const running=!!t.timerStart, sk=itemSkipped(t,k);
  const at=unitPlacement(t,k), nowId=currentBlockId();
  const inNow=!!at&&at===nowId;
  const onDay=isRecurring(t)?(dueOnDay(t,k)||!!at):(t.day===k);
  const el=taskElapsed(t), want=unitPrimary(ctx), open=editing==='more:'+id;
  let h='', actions='';
  /* state reads as text, not as more buttons competing for the eye */
  if(el>0||running) h+='<span class="tclock"'+(running?' data-timer-live-task="'+id+'"':'')+'>'+mmss(el)+'</span>';
  if(at&&ctx!=='block') h+='<span class="statechip">@ '+placementLabel(id)+'</span>';
  if(isRecurring(t)&&ctx!=='block') h+='<span class="statechip">'+schedLabel(t)+'</span>';
  if(sk) h+='<span class="statechip">skipped</span>';
  if(want.indexOf('timer')>=0)
    actions+='<button class="timerbtn'+(running?' on':'')+'" title="start / stop the timer" onclick="toggleTaskTimerBank(\''+id+'\',event)">'+(running?'\u275a\u275a':'\u25b6')+'</button>';
  if(want.indexOf('now')>=0&&nowId&&!inNow)
    actions+='<button class="arrowbtn wide" title="put it in the block happening right now" onclick="itemToNow(\''+id+'\',event)">now</button>';
  if(want.indexOf('day')>=0&&!onDay)
    actions+='<button class="arrowbtn wide" title="put it on the day you\u2019re viewing" onclick="itemToDay(\''+id+'\',event)">\u2192 '+vdayLabel().toLowerCase()+'</button>';
  if(want.indexOf('skip')>=0&&isRecurring(t))
    actions+='<button class="arrowbtn wide'+(sk?' on':'')+'" title="skip just this day \u2014 your streak stays safe" onclick="skipItem(\''+id+'\',event)">'+(sk?'unskip':'skip')+'</button>';
  actions+='<button class="morebtn'+(open?' on':'')+'" title="more actions" onclick="event.stopPropagation();toggleEdit(\'more:'+id+'\')">\u22ef</button>';
  actions+=reorderArrowsHTML(t);
  actions+='<span class="drag" title="drag onto a block, a day, or the future log">\u283f</span>';
  return h+'<span class="tr2-actions">'+actions+'</span>';
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
    if(isTask)
      ph+='<select class="moreact" onclick="event.stopPropagation()" onchange="setTaskProject(\''+id+'\',this.value)">'+categoryOptionsHTML(t.project)+'</select>';
    ph+='<button class="moreact danger'+(isArm?' on':'')+'" onclick="delUnit(\''+id+'\',event)">'+(isArm?'tap again to delete':'✕ delete')+'</button>';
    ph+='</div>';
    if(isTask&&!t.parentId) ph+=subtaskRowsHTML(t);
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
  if(isTask&&!t.parentId) h+=subtaskRowsHTML(t);
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
    if(!d.done[key]){ d.done[key]=Date.now(); earn(CENTS.seal); save(); celebrateBurst(true);
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
   are day-keyed equivalents of isDone/castItem/uncast/checkSeal. Money still credits to the
   current balance "now" (via earn(), which always books to today's ptsEarned bucket) regardless
   of which calendar day the habit itself is tagged to — same convention as backdated spend-log
   entries. */
function itemDoneOnDay(itemId,dayKey){ const dd=S.days[dayKey]; return !!(dd&&dd.done&&dd.done[itemId]); }
function toggleItemOnDay(itemId,dayKey){
  const t=unitById(itemId); if(!t) return;
  const dd=day(dayKey);
  const wasDone=!!dd.done[itemId];
  if(wasDone){ delete dd.done[itemId]; earn(-centsFor(t)); }
  else { dd.done[itemId]=Date.now(); earn(centsFor(t)); }
  const r=t.ritual;
  if(isRitualId(r)){
    const req=ritualRoster(r).filter(function(i){return i.type==='core'||i.type==='med';});
    const key='seal_'+r;
    const allDone=req.length>0&&req.every(function(i){return !!dd.done[i.id];});
    const hadSeal=!!dd.done[key];
    if(allDone&&!hadSeal){ dd.done[key]=Date.now(); earn(CENTS.seal); }
    else if(!allDone&&hadSeal){ delete dd.done[key]; earn(-CENTS.seal); }
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
function openBlockId(){
  if(panelOverride!==undefined) return panelOverride||null;
  const d=day(vday());
  const curB=(d.blocks||[]).filter(function(b){return isCurrentBlock(b);})[0];
  return curB?curB.id:null;
}
function toggleBlock(id){ panelOverride=(openBlockId()===id)?false:id; render(); }
function closeBlockPanel(){ panelOverride=false; render(); }
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
function addPlanItem(k){
  const el=document.getElementById('planIn-'+k); if(!el) return;
  const t=el.value.trim(); if(!t) return;
  planOf(k).items.push({t:t,done:false});
  el.value=''; save(); render();
  requestAnimationFrame(function(){ const e2=document.getElementById('planIn-'+k); if(e2) e2.focus(); });
}
function togglePlanItem(k,i){
  const p=planOf(k), it=p.items[i]; if(!it) return;
  it.done=!it.done; if(it.done) celebrateBurst();
  save(); render();
}
function delPlanItem(k,i,ev){ if(ev)ev.stopPropagation(); planOf(k).items.splice(i,1); save(); render(); }
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
function subtaskRowsHTML(t){
  const subs=subtasksOf(t);
  let h='<div class="subtasks" onclick="event.stopPropagation()">';
  subs.forEach(function(s){
    const dn=itemDone(s);
    h+='<div class="subrow'+(dn?' done':'')+'">'+
       '<input type="checkbox"'+(dn?' checked':'')+' onchange="toggleUnit(\''+s.id+'\')">'+
       '<span class="tt" contenteditable="true" onblur="setTaskText(\''+s.id+'\',this.textContent)">'+String(s.text).replace(/</g,'&lt;')+'</span>'+
       '<button class="rowbtn" style="opacity:.5" onclick="unlinkSubtask(\''+s.id+'\',event)" title="remove subtask">✕</button>'+
       '</div>';
  });
  h+='<div class="addtiny"><input id="subIn-'+t.id+'" placeholder="add a subtask, press enter…" maxlength="80" onkeydown="if(event.key===\'Enter\'){event.preventDefault();quickAddSubtask(\''+t.id+'\')}">'+
     '<button class="btn tiny soft" onclick="quickAddSubtask(\''+t.id+'\')">+</button></div>';
  return h+'</div>';
}
function toggleTaskStar(id,ev){
  if(ev)ev.stopPropagation();
  const t=taskById(id); if(!t) return;
  const wasWorth=centsFor(t), wasDone=itemDone(t);
  t.starred=!t.starred;
  /* the ledger handles the adjustment: whatever was already paid for this task is topped up or
     clawed back to match its new value, whether it's finished, part-done, or untouched */
  if(isRecurring(t)){ if(wasDone) earn(centsFor(t)-wasWorth); }
  else settlePay(t);
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
  settlePay(t); save(); render();
}
function setTaskTargetN(id,v){
  const t=unitById(id); if(!t) return;
  const n=parseInt(v,10);
  t.targetN=(isFinite(n)&&n>0)?n:0;
  settlePay(t); save(); render();
}
/* entered in minutes for a timed task, hours for a cumulative one — those are the units you'd
   actually say out loud for each */
function setTaskTargetTime(id,v){
  const t=unitById(id); if(!t) return;
  const n=parseFloat(v);
  const mult=modeOf(t)==='cumulative'?3600:60;
  t.targetSec=(isFinite(n)&&n>0)?Math.round(n*mult):0;
  settlePay(t); save(); render();
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
  settlePay(t); save(); render();
}
/* small tasks pay a little, big/high-priority ones pay more — same idea as CENTS.custom, just
   scaled. A starred task (really hard, high-friction, or urgent) simply doubles whatever that
   base would have been. */
function estimateCents(t){
  let base=CENTS.custom;
  if(t.priority==='High') base=Math.round(base*1.6);
  else if(t.priority==='Low') base=Math.round(base*0.7);
  if(t.starred) base=base*2;
  return base;
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
/* ===================== within-list reordering (arrows + drag) =====================
   order is only ever compared against siblings in the exact same place — the task bank, one
   block's task list, the inbox, a side-quest category — so a swap or a drop only ever touches the
   two rows actually involved, never a global renumber. */
function byOrder(a,b){ return (a.order||0)-(b.order||0); }
function siblingGroup(t){
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
function moveUnit(id,dir,ev){
  if(ev) ev.stopPropagation();
  const t=taskById(id)||unitById(id); if(!t) return;
  const sibs=siblingGroup(t).sort(byOrder);
  const i=sibs.findIndex(function(x){return x.id===id;});
  const j=i+dir;
  if(i<0||j<0||j>=sibs.length) return;
  const tmp=sibs[i].order; sibs[i].order=sibs[j].order; sibs[j].order=tmp;
  save(); render();
}
function reorderArrowsHTML(t){
  const sibs=siblingGroup(t).sort(byOrder);
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
  const sibs=siblingGroup(target).sort(byOrder);
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
    settlePay(t);
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
    const was=d.water>=WATER_GOAL; d.water=Math.max(0,d.water-last);
    if(was&&d.water<WATER_GOAL) earn(-CENTS.waterGoal);
    recomputeStreak(); save(); render(); return;
  }
  if(!amt) return;
  const before=d.water; d.water+=amt; d.log.push(amt);
  celebrateBurst();
  if(before<WATER_GOAL&&d.water>=WATER_GOAL){ earn(CENTS.waterGoal); recomputeStreak();
    glow('waterCard'); celebrateBurst(true); toast('100 oz — '+S.waterStreak+' day streak'); }
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
/* a block's start/end used to be a native time input, which on a phone means scrolling a wheel
   one minute at a time to reach the number you want — this offers only the 15-minute marks so
   picking one is a single tap. Existing times aren't guaranteed to land on one of those marks
   though (a calendar-synced block keeps the source event's exact minute, and drag-resize snaps
   to 5-minute steps) — for those, the current value gets its own extra option so it still shows
   correctly and stays put until you actually pick a different, 15-minute-aligned one; nothing
   gets silently rounded just by opening the panel. */
function timeOptionsHTML(selected){
  let onGrid=false;
  let h=Array.from({length:96},function(_,i){
    const v=fromMin(i*15);
    if(v===selected) onGrid=true;
    return '<option value="'+v+'"'+(v===selected?' selected':'')+'>'+v+'</option>';
  }).join('');
  if(selected&&!onGrid) h='<option value="'+selected+'" selected>'+selected+'</option>'+h;
  return h;
}
function blockDur(b){ let e=toMin(b.end||fromMin(toMin(b.start)+60)), s=toMin(b.start); if(e<=s)e+=1440; return e-s; }
function overlaps(s1,e1,s2,e2){ return s1<e2&&s2<e1; }
function isCurrentBlock(b){ if(!isViewingToday()) return false; const nm=nowMinutes()%1440; const s=toMin(b.start); let e=s+blockDur(b); return nm>=s&&nm<e; }
function isPastBlock(b){
  const rel=daysBetween(today(),vday());
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
/* Your rituals are fixed points of the day, so they get real blocks on the timeline rather than a
   panel off to the side. Seeded once per day and then yours: move them, rename them, drop other
   things in, or delete one for a day and it stays deleted — routineSeeded is what stops tomorrow's
   regeneration from undoing today's decision. The list of rituals itself lives in S.ritualDefs
   (backfillRitualDefs), not a fixed const, so adding one is just addRitualDef() — this loop then
   seeds its block onto every day going forward same as sunrise/moonlight always have. */
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
/* the calendar is blank wherever nothing's scheduled now — no more synthetic filler blocks tiling
   the whole day. buildGaps is just "seed the routines, and drop any auto:true block a block from
   before this change might still be carrying" (cheap every-render check, doubles as one-time
   cleanup of old data with no separate migration needed). */
function buildGaps(k){
  k=k||vday();
  if(daysBetween(today(),k)<0) return;
  ensureRoutineBlocks(k);
  const d=day(k);
  d.blocks=d.blocks.filter(function(b){return !b.auto;});
  d.blocks.sort(function(a,b){return toMin(a.start)-toMin(b.start);});
}
/* the shortest a block is allowed to be — also the drag/click snap increment on the calendar */
const MIN_GAP=15;
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
   was dead code. createBlockAt() below is the real, reachable way to make a new block now
   (double-click twice on the calendar, drag across it, or the "+" button); addBlock() is kept
   only for whatever external caller might still reach for it, now with a sane fallback instead
   of crashing on a missing element. */
function addBlock(){
  const el=document.getElementById('newBlockTime');
  createBlockAt((el&&el.value)||'12:00',60);
}
/* the one path every creation gesture (double-click-twice, drag, "+") funnels through: a new
   block at startTime for durMin, opened immediately so setup (name, type, category/tasks)
   continues right there in the expand view. */
function createBlockAt(startTime,durMin){
  durMin=durMin||60;
  const id='b'+Date.now();
  day(vday()).blocks.push({id:id, start:startTime, end:fromMin(toMin(startTime)+durMin), focus:'', notes:'', type:'single', category:null});
  day(vday()).blocks.sort(function(a,b){return toMin(a.start)-toMin(b.start);});
  panelOverride=id;
  save(); render();
}
/* a persistent, guided way in: same createBlockAt everything else uses, just defaulted to "now"
   (or day start, viewing another day) instead of wherever you clicked. */
function quickCreateBlock(){
  const start=fromMin(snap15(isViewingToday()?nowMinutes()%1440:DAY_START));
  createBlockAt(start,60);
}
/* ===================== creating a block by clicking/dragging blank calendar space =====================
   Two gestures, one destination (createBlockAt): drag across blank time like Google Calendar, or
   double-click once to mark a start and again to mark an end. Both snap to 15 minutes and both
   bail out if the pointer actually landed on an existing block — that's its own click target. */
/* mousedown only — no ontouchstart. On a phone, scrolling the calendar routinely moves more than
   the 6px slop below before your finger lifts, so every scroll swipe over blank calendar space
   was silently becoming "drag to create a block." Touch still gets double-click-twice
   (ondblclick, via a double-tap) and the "+" quick-create button in the card header. */
function gridCanvasHandlers(origin){
  return 'data-origin="'+origin+'" onmousedown="startCanvasCreate(event)" ondblclick="onCanvasDblClick(event)"';
}
function canvasEventY(ev,el){
  const rect=el.getBoundingClientRect();
  return ev.clientY-rect.top;
}
let canvasDrag=null;
function startCanvasCreate(ev){
  if(ev.target.closest('.gridblock')) return;
  const el=ev.currentTarget;
  canvasDrag={el:el, origin:parseInt(el.dataset.origin,10), startPx:canvasEventY(ev,el), moved:false};
  document.addEventListener('mousemove',onCanvasCreateMove);
  document.addEventListener('mouseup',onCanvasCreateEnd);
}
function onCanvasCreateMove(ev){
  if(!canvasDrag) return;
  const curPx=canvasEventY(ev,canvasDrag.el);
  if(!canvasDrag.moved&&Math.abs(curPx-canvasDrag.startPx)<6) return; /* still just a click, not a drag */
  canvasDrag.moved=true;
  if(ev.cancelable) ev.preventDefault();
  let startMin=snap15(pxToMin(canvasDrag.startPx,canvasDrag.origin));
  let endMin=snap15(pxToMin(curPx,canvasDrag.origin));
  if(endMin<startMin){ const t=startMin; startMin=endMin; endMin=t; }
  endMin=Math.max(endMin,startMin+MIN_GAP);
  canvasDrag.ghostStart=startMin; canvasDrag.ghostEnd=endMin;
  const el=canvasDrag.el;
  let ghost=el.querySelector('.creatorghost');
  if(!ghost){ ghost=document.createElement('div'); ghost.className='creatorghost'; el.appendChild(ghost); }
  const top=minToPx(startMin,canvasDrag.origin), h=Math.max(20,minToPx(endMin,canvasDrag.origin)-top);
  ghost.style.top=top+'px'; ghost.style.height=h+'px';
  ghost.textContent=fromMin(startMin)+'–'+fromMin(endMin);
}
function onCanvasCreateEnd(){
  document.removeEventListener('mousemove',onCanvasCreateMove);
  document.removeEventListener('mouseup',onCanvasCreateEnd);
  if(!canvasDrag) return;
  const ghost=canvasDrag.el.querySelector('.creatorghost'); if(ghost) ghost.remove();
  if(canvasDrag.moved&&canvasDrag.ghostStart!==undefined) createBlockAt(fromMin(canvasDrag.ghostStart),canvasDrag.ghostEnd-canvasDrag.ghostStart);
  canvasDrag=null;
}
let pendingBlockStart=null;
function onCanvasDblClick(ev){
  if(ev.target.closest('.gridblock')) return;
  const el=ev.currentTarget;
  const origin=parseInt(el.dataset.origin,10);
  const min=snap15(pxToMin(canvasEventY(ev,el),origin));
  if(pendingBlockStart===null){
    pendingBlockStart=min;
    toast('double-click again to set the end — Escape to cancel');
    render();
  }else{
    let s=pendingBlockStart, e=min;
    if(e<s){ const t=s; s=e; e=t; }
    e=Math.max(e,s+MIN_GAP);
    pendingBlockStart=null;
    createBlockAt(fromMin(s),e-s);
  }
}
function cancelPendingBlock(){ if(pendingBlockStart!==null){ pendingBlockStart=null; render(); } }
function delBlock(id){ if(!arm('blk:'+id))return;
  const d=day(vday()); d.blocks=d.blocks.filter(function(b){return b.id!==id;}); armed=null; save(); render(); }
function blockOf(id){ return day(vday()).blocks.filter(function(b){return b.id===id;})[0]; }
function setFocus(id,v){ const b=blockOf(id); if(b){b.focus=v;save();} }
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
  save(); render();
}
function setBlockCategory(id,v){
  const b=blockOf(id); if(!b) return;
  b.category=(v||'').trim()||null; save(); render();
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
    let gainedCents=0, removedBook=null, finishedAt=null;
    if(gained>0){
      d.pagesLogged=(d.pagesLogged||0)+gained;
      d.pagesBy[id]=(d.pagesBy[id]||0)+gained;
      earn(CENTS.pages); gainedCents=CENTS.pages; celebrateBurst();
    }
    if(b.cur>=b.pages){
      finishedAt=Date.now();
      S.doneBooks.push({title:b.title,at:finishedAt,color:b.color});
      S.books=S.books.filter(function(x){return x.id!==id;});
      removedBook={id:b.id,title:b.title,pages:b.pages,color:b.color};
      celebrateBurst(true);
      toast('Finished “'+b.title+'” — onto the shelf');
    } else if(gained>0) toast('+'+gained+' pages');
    d.bookLog.push({bookId:id, prevCur:prevCur, newCur:np, gainedCents:gainedCents, removedBook:removedBook, finishedAt:finishedAt});
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
  if(last.gainedCents){
    const delta=last.newCur-last.prevCur;
    d.pagesLogged=Math.max(0,(d.pagesLogged||0)-delta);
    d.pagesBy[last.bookId]=Math.max(0,(d.pagesBy[last.bookId]||0)-delta);
    earn(-last.gainedCents);
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
  const delta=PAPER_STATUS_CENTS[ni]-PAPER_STATUS_CENTS[i];
  p.status=PAPER_STATUSES[ni];
  if(delta) earn(delta);
  save(); render();
  const tag=delta>0?' +$'+(delta/100).toFixed(2):(delta<0?' -$'+(-delta/100).toFixed(2):'');
  toast(p.status+tag);
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
  if(!d.done['medit']){ d.done['medit']=Date.now(); earn(CENTS.quest); }
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
/* generic percentage-ring painter — the reusable half of what the meditation ring below already
   does by hand: any future ring (a goal, a budget bucket, a macro balance) just needs its own
   static <svg> skeleton in markup (same shape as .mring/.pring) and a call to paintRing(id,pct,r)
   to animate the arc. Not a markup generator — this codebase's convention throughout is a static
   HTML skeleton patched by targeted DOM writes each render, not innerHTML regeneration, so a new
   ring's skeleton lives in index.html same as .mring's does. */
function paintRing(id,pct,r){
  const ring=document.getElementById(id); if(!ring) return;
  const circ=2*Math.PI*(r||40);
  ring.setAttribute('stroke-dasharray',circ);
  ring.setAttribute('stroke-dashoffset',circ*(1-Math.max(0,Math.min(1,pct))));
}
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
    paintRing('mediRing',st.pct,44);
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
    earn(CENTS.move); celebrateBurst();
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
  earn(-CENTS.move);
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
/* ===================== tea / treats ===================== */
function setTea(i,v){ const k=vday(); const t=S.tea[k]||['','','']; t[i]=v; S.tea[k]=t; save(); }
function redeem(id){
  const r=S.treats.filter(function(x){return x.id===id;})[0];
  const cost=Math.round(r.points);
  if(S.cents<cost){ toast(dollarsStr(cost-S.cents)+' more to go'); return; }
  if(!arm('redeem:'+id)) return;
  S.cents-=cost; S.redeemed.push({name:r.name,at:Date.now()});
  armed=null; celebrateBurst(true); toast('Enjoy: '+r.name); save(); render();
}
function addTreat(){
  const n=document.getElementById('newTreatName').value.trim();
  const c=Math.round(parseFloat(document.getElementById('newTreatCost').value)||0);
  if(!n||!c)return;
  S.treats.push({id:'tr'+Date.now(),name:n,points:c});
  document.getElementById('newTreatName').value=''; document.getElementById('newTreatCost').value='';
  save(); render();
}
function delTreat(id,ev){ ev.stopPropagation(); if(!arm('tr:'+id))return;
  S.treats=S.treats.filter(function(t){return t.id!==id;}); armed=null; save(); render(); }
/* ===================== spending log =====================
   For real, already-happened purchases (a coffee, a book, anything discretionary). Unlike
   redeem(), this is allowed to push S.cents negative — that negative balance IS the deficit,
   and it gets paid back down by ordinary earning over the following days. */
function logSpend(name,amountCents,dayKey){
  dayKey=dayKey||vday();
  S.cents-=amountCents;
  S.spendLog.unshift({id:'sp'+Date.now()+Math.random().toString(36).slice(2,7), name:name, amount:amountCents, at:Date.now(), day:dayKey, balanceAfter:S.cents});
  if(S.spendLog.length>200) S.spendLog.length=200;
  save(); render();
  toast(S.cents>=0?'logged '+dollarsStr(amountCents)+' · '+fmtSigned(S.cents)+' left'
                  :'logged '+dollarsStr(amountCents)+' · '+fmtSigned(S.cents)+' deficit');
}
function addSpend(){
  const nameEl=document.getElementById('spendName'), amtEl=document.getElementById('spendAmt');
  const name=(nameEl.value||'').trim();
  const amt=Math.round((parseFloat(amtEl.value)||0)*100);
  if(!name||amt<=0) return;
  logSpend(name,amt,vday());
  nameEl.value=''; amtEl.value='';
}
function delSpend(id,ev){ if(ev)ev.stopPropagation(); if(!arm('sp:'+id)) return;
  const item=S.spendLog.filter(function(s){return s.id===id;})[0];
  if(item) S.cents+=item.amount; /* reverse it out */
  S.spendLog=S.spendLog.filter(function(s){return s.id!==id;});
  armed=null; save(); render();
}
/* ===================== habit streak grid =====================
   Same visual language as the no-spend row, but inverted: here presence (not absence) of the
   habit is the win. Only habits with a clean built-in daily pass/fail signal get a row —
   the ritual seal (every core/med item in that ritual done) and the water goal. */
const HABIT_STREAKS=[
  {id:'sunrise', name:'sunrise ritual'},
  {id:'moonlight', name:'moonlight ritual'},
  {id:'water', name:'water goal'}
];
function habitDoneOnDay(habitId,dayKey){
  const dd=S.days[dayKey];
  if(habitId==='sunrise') return !!(dd&&dd.done&&dd.done['seal_sunrise']);
  if(habitId==='moonlight') return !!(dd&&dd.done&&dd.done['seal_moonlight']);
  if(habitId==='water') return !!(dd&&dd.water>=WATER_GOAL)||S.frozenDays.indexOf(dayKey)>=0;
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
/* ===================== no-spend streak ===================== */
function spentOnDay(dayKey){ return S.spendLog.some(function(s){return s.day===dayKey;}); }
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
  a.download='prism-backup-'+today()+'.json'; a.click();
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
      if(obj&&obj.v===4) adoptState(obj);
      else toast('That file doesn\u2019t look like a Prism backup');
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
  if(!obj||obj.v!==4){ toast('That doesn\u2019t look like a Prism backup'); return; }
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
function ptsStr(n){ return Math.round(n)+' pts'; }
/* ===================== view mode ===================== */
let viewMode='today';
const VIEWS=['today','planning','notes','month','more'];
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
/* pure grouping pass over a day's blocks: every consecutive run of already-past blocks collapses
   into one toggle row, regardless of how many blocks are in it — "earlier today" is one line
   until you ask to see it, not one line per block. Kept side-effect-free and separate from
   renderTimeline so it's directly testable. */
function groupTimelineSegments(blocks){
  const segs=[];
  let i=0;
  while(i<blocks.length){
    const b=blocks[i];
    if(isPastBlock(b)){
      let j=i;
      while(j<blocks.length&&isPastBlock(blocks[j])) j++;
      const run=blocks.slice(i,j);
      segs.push({type:'past', run:run, totalMin:run.reduce(function(a,bb){return a+blockDur(bb);},0)});
      i=j; continue;
    }
    segs.push({type:'block', run:[b]});
    i++;
  }
  return segs;
}
let manualRollup={};
function toggleRollup(id){ manualRollup[id]=!manualRollup[id]; render(); }
/* a compact, non-time-proportional row for a folded-past block — once it's behind "now" its exact
   pixel position stops mattering, you just want to skim what happened and reopen one if needed */
function pastBlockRowHTML(b){
  const quests=blockQuests(b), btasks=blockTasksFor(b), ptasks=projectBlockTasks(b);
  const total=quests.length+btasks.length;
  const done=quests.filter(function(q){return itemDone(q);}).length+btasks.filter(function(t){return itemDone(t);}).length;
  const previewText=(b.type==='project'&&ptasks.length)?ptasks[0].text:(b.focus||b.calTitle||'(untitled)');
  return '<div class="pastrow'+(isBlockCleared(b)?' cleared':'')+'" onclick="toggleBlock(\''+b.id+'\')">'+
    '<span class="gtime">'+b.start+'–'+(b.end||'')+'</span>'+
    (BLOCK_TYPE_ICON[b.type]?'<span class="typeicon">'+BLOCK_TYPE_ICON[b.type]+'</span>':'')+
    '<span class="gfocus">'+String(previewText).replace(/</g,'&lt;')+'</span>'+
    (total?'<span class="progdot">'+done+'/'+total+'</span>':'')+
    '</div>';
}
/* one small absolutely-positioned box per block, sized and placed by its real clock time on the
   fixed grid — no more elastic floor/ceiling. Clicking it opens the inline detail view instead of
   growing the box itself, which is what keeps the grid actually proportional: an expanded block
   used to blow past its real time-slot height, which a Google-Calendar-style grid can't allow.
   gridOrigin defaults to DAY_START (a full day, e.g. viewing a past/future day) but the live
   "now onward" grid for today passes its own origin so folded-past time doesn't eat vertical
   space — see renderTimeline. */
function blockGridBoxHTML(b,openId,gridOrigin){
  gridOrigin=(gridOrigin===undefined)?DAY_START:gridOrigin;
  const cur=isCurrentBlock(b), past=!cur&&isPastBlock(b), empty=isEmptyBlock(b), cleared=isBlockCleared(b);
  const col=blockColor(b);
  const isOpen=openId===b.id;
  const startMin=Math.max(gridOrigin,toMin(b.start));
  const endMin=Math.min(DAY_END,toMin(b.end||fromMin(toMin(b.start)+60)));
  const top=minToPx(startMin,gridOrigin), heightPx=Math.max(20,minToPx(endMin,gridOrigin)-top);
  const quests=blockQuests(b), btasks=blockTasksFor(b), ptasks=projectBlockTasks(b);
  /* ptasks are pulled fresh from the bank each render and are never "done" by definition (a done
     one drops out of the pull), so they'd only ever pad the denominator without a matching
     numerator — the progress dot stays about what's actually pinned to this block, same as before */
  const totalCount=quests.length+btasks.length;
  const doneCount=quests.filter(function(q){return itemDone(q);}).length+btasks.filter(function(t){return itemDone(t);}).length;
  /* a project block previews whatever's currently first up in its category, instead of a fixed
     title — that's the whole point of "pulls the top task from the list" */
  const previewText=(b.type==='project'&&ptasks.length)?ptasks[0].text:(b.focus||b.calTitle||'');
  let styleAttr='top:'+top+'px;height:'+heightPx+'px';
  if(!empty) styleAttr+=';background:'+col.bg+';border-color:'+col.edge;
  return '<div class="gridblock'+(empty?' emptyblk':'')+(cur?' current':'')+(past?' past':'')+(cleared&&!empty?' cleared':'')+(isOpen?' open':'')+(b.fromCal?' fromcal':'')+'" id="tb-'+b.id+'" style="'+styleAttr+'" '+
    'ondragover="event.preventDefault();this.classList.add(\'drophover\')" ondragleave="this.classList.remove(\'drophover\')" ondrop="onBlockDrop(event,\''+b.id+'\')" '+
    'onclick="toggleBlock(\''+b.id+'\')" title="'+(empty?'click to add a focus':'click for details')+'">'+
    '<div class="reshandle top" onmousedown="startBlockResize(event,\''+b.id+'\',\'top\')" ontouchstart="startBlockResize(event,\''+b.id+'\',\'top\')"></div>'+
    '<span class="gtime">'+b.start+'–'+(b.end||'')+'</span>'+
    (BLOCK_TYPE_ICON[b.type]?'<span class="typeicon" title="'+BLOCK_TYPE_LABEL[b.type]+' block">'+BLOCK_TYPE_ICON[b.type]+'</span>':'')+
    (empty&&!previewText?'<span class="gfocus emptyhint">+ add focus</span>':'<span class="gfocus">'+String(previewText).replace(/</g,'&lt;')+'</span>')+
    (totalCount?'<span class="progdot">'+doneCount+'/'+totalCount+'</span>':'')+
    (b.fromCal?'<span class="caltag">cal</span>':'')+
    /* the current block is the one you actually want to jump into right now — a direct lock-in
       button here skips the "click to expand, then click lock in" detour */
    (cur?'<button class="lockbtn" title="lock in" onclick="event.stopPropagation();lockIn(\''+b.id+'\')">🔒</button>':'')+
    '<div class="reshandle bottom" onmousedown="startBlockResize(event,\''+b.id+'\',\'bottom\')" ontouchstart="startBlockResize(event,\''+b.id+'\',\'bottom\')"></div>'+
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
    '<button class="btn tiny soft" title="lock in and go fullscreen" onclick="lockIn(\''+b.id+'\')">'+(BLOCK_TYPE_ICON[b.type]||'🔒')+' lock in</button>'+
    '<button class="rowbtn" style="opacity:.6" title="skip everything in this block — streak safe" onclick="skipBlock(\''+b.id+'\',event)">skip all</button>'+
    '</div>'+
    '<div class="bdtime">'+
      '<select onchange="setBlockStart(\''+b.id+'\',this.value)">'+timeOptionsHTML(b.start)+'</select>–'+
      '<select onchange="setBlockEnd(\''+b.id+'\',this.value)">'+timeOptionsHTML(b.end||'')+'</select>'+
    '</div>'+
    '<div class="bdfocus" contenteditable="true" data-ph="focus…" onblur="setFocus(\''+b.id+'\',this.textContent)">'+String(b.focus||'').replace(/</g,'&lt;')+'</div>';
  if(isCurrentBlock(b)) h+='<div class="nowline">'+hhmm(new Date())+' now · '+pct+'% through this block</div>';
  /* a single-focus block (a meeting, a lecture) has nothing to check off — mirrors the same
     gate applied in focus mode (renderFocusSession) so tasks never silently vanish on lock-in */
  if(b.type!=='single'){
    h+='<div class="bdtasks">';
    /* whatever's still open floats to the top; done and skipped rows stay put but settle
       underneath, so a half-finished routine reads at a glance. Project blocks additionally pull
       in whatever's next up from the task bank in their category — completing/skipping the top one
       just naturally promotes the next, no separate "current task" pointer to maintain. */
    sortSettledLast(quests.concat(btasks)).forEach(function(t){ h+=taskRowHTML(t,'block'); });
    ptasks.forEach(function(t){ h+=taskRowHTML(t,'block'); });
    h+='</div>';
    h+='<div class="addtiny"><input id="tinyIn-'+b.id+'" placeholder="'+(b.routine?'add a habit to this routine, press enter…':'add a task to this block, press enter…')+'" maxlength="80" onkeydown="if(event.key===\'Enter\'){event.preventDefault();quickAddBlockTask(\''+b.id+'\')}">'+
       '<button class="btn tiny soft" onclick="quickAddBlockTask(\''+b.id+'\')">+</button></div>';
  }
  h+='<textarea class="bnotes" placeholder="notes…" onchange="setNotes(\''+b.id+'\',this.value)">'+(b.notes||'')+'</textarea>';
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
    if(focusState.breakSec<=0){ focusState.onBreak=false; focusState.breakSec=0; renderFocusSession(); return; }
  } else {
    focusState.activeSec++;
    /* a completed 30-minute segment pays out and offers a break, whether or not you take it —
       the reward is for the time actually spent, the break is just a wellness nudge on top */
    if(focusState.activeSec%1800===0){ awardFocusSegment(); focusState.breakOffered=true; renderFocusSession(); return; }
  }
  /* the common case, every second: patch just the numbers in place rather than the full
     renderFocusSession() rebuild below — that does el.innerHTML= on the whole overlay, which
     destroys and recreates whatever's focused (the notes textarea, the quick-capture input, a
     task's editable title), forcing a blur that instantly dismisses the mobile keyboard mid-
     type. A full rebuild only happens above, on the two actual structural transitions (a break
     newly offered, a break ending) — not on the silent per-second tick. */
  updateFocusTickDisplay();
}
function updateFocusTickDisplay(){
  const b=focusBlockId&&blockOf(focusBlockId); if(!b) return;
  const pct=blockProgressPct(b);
  const fill=document.getElementById('focusBarFill'); if(fill) fill.style.width=pct+'%';
  const meta=document.getElementById('focusMeta');
  if(meta){
    const d=day(vday());
    meta.textContent=b.start+'–'+(b.end||'')+' · locked in '+mmss(focusState.activeSec)+
      (d.focusSegs&&d.focusSegs[b.id]?' · '+d.focusSegs[b.id]+' segment'+(d.focusSegs[b.id]===1?'':'s')+' earned':'');
  }
  if(focusState.onBreak){
    const breakBox=document.getElementById('focusBreakBox');
    if(breakBox) breakBox.textContent='🌿 on a break — back in '+mmss(focusState.breakSec);
  }
}
function awardFocusSegment(){
  const d=day(vday());
  d.focusSegs[focusBlockId]=(d.focusSegs[focusBlockId]||0)+1;
  earn(CENTS.pomo); save();
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
  h+='<div class="focusbar"><div class="focusbarfill" id="focusBarFill" style="width:'+pct+'%"></div></div>';
  h+='<div class="focusmeta" id="focusMeta">'+b.start+'–'+(b.end||'')+' · locked in '+mmss(focusState.activeSec)+
     (d.focusSegs&&d.focusSegs[b.id]?' · '+d.focusSegs[b.id]+' segment'+(d.focusSegs[b.id]===1?'':'s')+' earned':'')+'</div>';
  if(focusState.onBreak) h+='<div class="focusbreak" id="focusBreakBox">🌿 on a break — back in '+mmss(focusState.breakSec)+'</div>';
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
  h+='<div class="focuswater">💧 '+d.water+' / '+WATER_GOAL+' oz'+
     '<button class="btn tiny soft" onclick="addWater(\'full\')">+cup</button></div>';
  h+='<textarea class="focusnotes" placeholder="notes…" onchange="setNotes(\''+b.id+'\',this.value)">'+(b.notes||'')+'</textarea>';
  h+='<div class="focusadd"><input id="focusCaptureIn" placeholder="something for later, so it doesn’t derail the session…" maxlength="120" '+
     'onkeydown="if(event.key===\'Enter\'){event.preventDefault();quickCaptureFocusTask()}">'+
     '<button class="btn tiny soft" onclick="quickCaptureFocusTask()">+</button></div>';
  h+='</div></div>';
  el.innerHTML=h;
}
function renderTimeline(){
  const d=day(vday());
  const openId=openBlockId();
  const viewingToday=isViewingToday();
  /* today only: everything already past folds into one line, and the live grid's own coordinate
     origin shifts to "now" (snapped to a quarter hour) so that folded time costs zero vertical
     space instead of pushing the current block down the page. Any other day (past or future)
     renders as one plain full-day grid — folding only matters when there's a "now" inside it. */
  let liveOrigin=DAY_START, pastRun=null;
  if(viewingToday){
    const segs=groupTimelineSegments(d.blocks);
    pastRun=(segs[0]&&segs[0].type==='past')?segs[0].run:null;
    if(pastRun) liveOrigin=Math.min(DAY_END,snap15(nowMinutes()%1440));
  }
  const liveBlocks=viewingToday?d.blocks.filter(function(b){return !isPastBlock(b);}):d.blocks;
  let h='';
  if(pastRun&&pastRun.length){
    const rk='pastday-'+vday(), expanded=!!manualRollup[rk];
    h+='<div class="pastfold" onclick="toggleRollup(\''+rk+'\')">'+(expanded?'▾ ':'▸ ')+
       pastRun[0].start+'–'+fromMin(liveOrigin)+' · '+pastRun.length+' block'+(pastRun.length===1?'':'s')+' earlier today</div>';
    if(expanded) h+='<div class="pastfoldbody">'+pastRun.map(pastBlockRowHTML).join('')+'</div>';
  }
  const totalPx=Math.round((DAY_END-liveOrigin)*gridPxPerMin());
  let axis='', body='';
  const axisStartHour=Math.ceil(liveOrigin/60)*60;
  for(let m=axisStartHour;m<=DAY_END;m+=60){ axis+='<span class="gh" style="top:'+minToPx(m,liveOrigin)+'px">'+fromMin(m)+'</span>'; body+='<div class="gridline" style="top:'+minToPx(m,liveOrigin)+'px"></div>'; }
  liveBlocks.forEach(function(b){ body+=blockGridBoxHTML(b,openId,liveOrigin); });
  if(!liveBlocks.length) body+='<div class="qempty gridempty">nothing on the calendar yet — drag to add a block</div>';
  /* the now line: a real absolute line across the fixed grid, at the actual live-time offset —
     the grid has a real fixed pixel height, so this position is reliable instead of resolving
     against an auto-height container. */
  if(viewingToday){
    const nm=nowMinutes()%1440;
    if(nm>=liveOrigin&&nm<=DAY_END) body+='<div class="gridnowline" style="top:'+minToPx(nm,liveOrigin)+'px" data-lbl="'+hhmm(new Date())+'"></div>';
  }
  if(pendingBlockStart!==null&&pendingBlockStart>=liveOrigin&&pendingBlockStart<=DAY_END){
    body+='<div class="pendingline" style="top:'+minToPx(pendingBlockStart,liveOrigin)+'px" data-lbl="'+fromMin(pendingBlockStart)+' — double-click the end"></div>';
  }
  h+='<div class="gridwrap"><div class="gridaxis" style="height:'+totalPx+'px">'+axis+'</div>'+
    '<div class="gridbody" style="height:'+totalPx+'px" '+gridCanvasHandlers(liveOrigin)+'>'+body+'</div></div>';
  document.getElementById('timeline').innerHTML=h;
  renderBlockDetailPanel();
}
/* ---------- drag-to-resize: mouse on desktop, touch too, alongside the time-input fields ----------
   Added on top of (not instead of) the editable start/end inputs in the detail panel — inputs
   stay the reliable path on a phone, this is the fast path with a mouse. Snapped to 5-minute
   increments so a shaky drag doesn't leave a block ending at 2:47. */
let resizeState=null;
function resizeEventY(ev){ return (ev.touches&&ev.touches[0])?ev.touches[0].clientY:ev.clientY; }
function startBlockResize(ev,id,edge){
  ev.preventDefault(); ev.stopPropagation();
  const b=blockOf(id); if(!b) return;
  resizeState={id:id, edge:edge, startY:resizeEventY(ev), origStart:toMin(b.start), origEnd:toMin(b.end||fromMin(toMin(b.start)+60))};
  document.addEventListener('mousemove',onBlockResizeMove);
  document.addEventListener('mouseup',onBlockResizeEnd);
  document.addEventListener('touchmove',onBlockResizeMove,{passive:false});
  document.addEventListener('touchend',onBlockResizeEnd);
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
  document.removeEventListener('touchmove',onBlockResizeMove);
  document.removeEventListener('touchend',onBlockResizeEnd);
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
    const doneN=p.items.filter(function(x){return x.done;}).length+dayTasks.filter(function(x){return x.done;}).length;
    const totalN=p.items.length+dayTasks.length;
    const dnum=+k.split('-')[2];
    const isSel=k===vday();
    h+='<div class="planday'+(expanded?'':' collapsed')+(isToday?' istoday':'')+(isSel?' isselected':'')+'" '+
       'ondragover="event.preventDefault();this.classList.add(\'drophover\')" ondragleave="this.classList.remove(\'drophover\')" ondrop="onDayDrop(event,\''+k+'\')">'+
       '<div class="pdhead" onclick="togglePlanDay(\''+k+'\')"><span class="pdow">'+dows[i]+'</span><span class="pdnum">'+dnum+'</span>'+
       '<span class="pdcount">'+(totalN?doneN+'/'+totalN:'')+'</span>'+
       '<button class="btn tiny ghost" onclick="event.stopPropagation();openDay(\''+k+'\')">open</button></div>'+
       '<div class="pdbody">';
    dayTasks.forEach(function(tk){ h+=taskRowHTML(tk,'plan'); });
    p.items.forEach(function(it,idx){
      h+='<div class="plangoal'+(it.done?' done':'')+'"><input type="checkbox"'+(it.done?' checked':'')+' onchange="togglePlanItem(\''+k+'\','+idx+')">'+
         '<span class="pgt">'+String(it.t).replace(/</g,'&lt;')+'</span>'+
         '<button class="rowbtn" style="opacity:.4" onclick="delPlanItem(\''+k+'\','+idx+',event)">✕</button></div>';
    });
    h+='<div class="addtiny"><input id="planIn-'+k+'" placeholder="add a goal…" maxlength="50" onkeydown="if(event.key===\'Enter\'){event.preventDefault();addPlanItem(\''+k+'\')}">'+
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
        '<div class="ring" style="'+(dn?'background:var(--lav-deep);border-color:var(--lav-deep);color:#fff':'')+'">\u2713</div>'+
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
  return '<div class="taskrow2'+(dn?' done':'')+(worst?' worst':'')+(sk?' skipped':'')+'" draggable="true" ondragstart="onTaskDragStart(event,\''+t.id+'\')" '+
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
    '</div>';
}
function renderTaskChip(t){
  const prioColor=t.priority==='High'?'var(--pink-deep)':t.priority==='Medium'?'var(--sun-deep)':t.priority==='Low'?'var(--lav-deep)':'';
  const dn=itemDone(t);
  return '<div class="tbchip'+(dn?' done':'')+'" draggable="true" ondragstart="onTaskDragStart(event,\''+t.id+'\')" '+
    'ondragover="event.preventDefault();event.stopPropagation();this.classList.add(\'drophover\')" ondragleave="this.classList.remove(\'drophover\')" ondrop="onTaskRowDrop(event,\''+t.id+'\')">'+
    '<div class="tbchip-title">'+
    '<div class="ring" onclick="toggleUnit(\''+t.id+'\')" style="'+(dn?'background:var(--lav-deep);border-color:var(--lav-deep);color:#fff':'')+'">\u2713</div>'+
    (prioColor?'<span class="prio" style="background:'+prioColor+'" title="'+t.priority+' priority">'+t.priority+'</span>':'')+
    '<span class="nm" contenteditable="true" onclick="event.stopPropagation()" onblur="setTaskText(\''+t.id+'\',this.textContent)">'+String(t.text).replace(/</g,'&lt;')+'</span>'+
    '</div>'+
    unitProgressHTML(t)+
    '<div class="tbchip-meta">'+unitCtlHTML(t,'bank')+'</div>'+
    (editing==='more:'+t.id?unitMoreHTML(t,'bank'):'')+
    (editing==='sched:'+t.id?schedEditorHTML(t.id):'')+
    (editing==='sess:'+t.id?sessEditorHTML(t.id):'')+
    (editing==='mode:'+t.id?modeEditorHTML(t.id):'')+
    '</div>';
}
function renderTaskBank(){
  const catChipsEl=document.getElementById('catChips');
  if(catChipsEl){
    catChipsEl.innerHTML=S.categories.map(function(c){
      const dArm=armed==='cat:'+c, col=categoryColor(c);
      return '<span class="catchip" style="border-color:'+col.edge+'"><span class="tagdot" style="background:'+col.edge+'"></span>'+c+
        '<button class="rowbtn'+(dArm?' arm':'')+'" style="opacity:.5" onclick="delCategory(\''+c+'\',event)">'+(dArm?'sure?':'✕')+'</button></span>';
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
      const tgCol=categoryColor(tg);
      h+='<div class="tbtag"><div class="tbtaghead"><span class="tagdot" style="background:'+tgCol.edge+'"></span>'+tg+'</div>';
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
  if(!allToday.length||allToday.every(function(t){return t.done;})){ card.style.display='none'; return; }
  card.style.display='';
  const doneN=allToday.filter(function(t){return t.done;}).length;
  const bar=document.getElementById('todayTasksBar'); if(bar) bar.style.width=Math.round(doneN/allToday.length*100)+'%';
  const n=document.getElementById('todayTasksN'); if(n) n.textContent=doneN+'/'+allToday.length;
  const unpinned=allToday.filter(function(t){return !t.blockId;}).sort(byOrder);
  const list=document.getElementById('todayTasksList');
  if(list) list.innerHTML=unpinned.length?unpinned.map(function(t){return taskRowHTML(t,'flat');}).join(''):'<div class="qempty">everything is pinned into the calendar below</div>';
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
  let req=[], doneC=0;
  (S.ritualDefs||[]).forEach(function(rd){ itemsFor(rd.id).forEach(function(i){ if(i.type==='core'||i.type==='med'){ req.push(i); if(isDone(i.id)) doneC++; } }); });
  const overall=Math.round(((doneC/Math.max(1,req.length))*0.7+Math.min(1,d.water/WATER_GOAL)*0.3)*100);
  document.getElementById('dayPct').textContent=overall+'%';
  document.getElementById('dayFill').style.width=overall+'%';
  document.getElementById('pointsPill').textContent=ptsStr(S.cents);
  renderFocusSession();
  /* water lives in the app header now (waterHeader/waterFillHeader/cupCaptionHeader), so it has
     to render on every view, not just today — this block runs before the view branches below,
     and the detail card (still full waterCard, now parked in the more tab) is refreshed further
     down alongside the rest of the more-tab cards so its elements only get touched when present. */
  const hv=vessel();
  const hNumCups=Math.max(1,Math.round(WATER_GOAL/hv.oz));
  const hWaterPct=Math.min(100,Math.round(d.water/WATER_GOAL*100));
  const waterFillHeaderEl=document.getElementById('waterFillHeader');
  if(waterFillHeaderEl) waterFillHeaderEl.style.width=hWaterPct+'%';
  const waterHeaderEl=document.getElementById('waterHeader');
  if(waterHeaderEl) waterHeaderEl.classList.toggle('full',d.water>=WATER_GOAL);
  const cupCaptionHeaderEl=document.getElementById('cupCaptionHeader');
  if(cupCaptionHeaderEl) cupCaptionHeaderEl.textContent=d.water+'/'+WATER_GOAL+'oz';
  if(viewMode==='notes'){ renderNotes(); return; }
  if(viewMode==='month'){ renderMonth(); return; }
  if(viewMode==='planning'){ renderTaskBank(); renderFutureLog(); renderPlan(); return; }
  /* everything below here used to be gated to the today view only, back when every one of these
     cards lived there. Now most of them (water detail, habit streaks, meditation, books,
     movement, treats, spend, papers, today's-tasks) live in the more tab instead — but their
     DOM nodes are always present (display:none on the container, not removed), so it's simplest
     to just keep refreshing them every render() regardless of which tab is on screen, and only
     gate the two genuinely today-only pieces (the timeline itself and the quest dock). */
  if(viewMode==='today'){ renderTimeline(); renderDock(); }
  renderTodayTasksCard(); renderPapers();
  document.getElementById('cnt-day').textContent=d.blocks.filter(isBlockCleared).length+'/'+d.blocks.length+' blocks cleared';
  const v=vessel();
  const numCups=Math.max(1,Math.round(WATER_GOAL/v.oz));
  const halfSteps=Math.min(numCups,Math.round(d.water/v.oz*2)/2);
  const waterPct=Math.min(100,Math.round(d.water/WATER_GOAL*100));
  const waterBarEl=document.getElementById('waterBar');
  if(waterBarEl) waterBarEl.classList.toggle('full',d.water>=WATER_GOAL);
  const waterFillEl=document.getElementById('waterFill');
  if(waterFillEl) waterFillEl.style.width=waterPct+'%';
  const waterDivEl=document.getElementById('waterDividers');
  if(waterDivEl){
    /* dividers mark real cup-sized boundaries (i cups * this vessel's oz), not an even 1/numCups
       split — numCups is rounded, so an even split drifts away from where the fill bar actually
       is whenever WATER_GOAL isn't a clean multiple of the vessel size */
    let dh='';
    for(let i=1;i<numCups;i++){
      const pos=Math.min(100,Math.round(i*v.oz/WATER_GOAL*100));
      if(pos>=100) continue;
      const past=pos<=waterPct;
      dh+='<div class="wdiv'+(past?' past':'')+'" style="left:'+pos+'%"></div>';
    }
    waterDivEl.innerHTML=dh;
  }
  document.getElementById('cupCaption').textContent=d.water+' / '+WATER_GOAL+' oz · '+fmtCups(halfSteps)+' of '+numCups+' '+v.name.toLowerCase()+' cups';
  document.getElementById('waterHint').textContent=d.water>=WATER_GOAL?'goal met':(WATER_GOAL-d.water)+' oz to go';
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
    /* just morning + evening, always — no ritual-block creation UI. Adding a new HABIT (an item
       within one of those two) is the one thing this card still needs a quick path for. */
    let habitAddHtml='<div class="habitaddquick">'+
      '<input id="newHabitName" placeholder="new habit…" maxlength="60" onkeydown="if(event.key===\'Enter\'){event.preventDefault();submitAddHabit()}">'+
      '<select id="newHabitRitual">'+(S.ritualDefs||[]).map(function(rd){return '<option value="'+rd.id+'">'+rd.name+'</option>';}).join('')+'</select>'+
      '<button class="btn tiny soft" onclick="submitAddHabit()">+ habit</button></div>';
    hsEl.innerHTML='<div class="hscols">'+hsColsHtml+'</div>'+habitAddHtml;
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
  paintRing('readGoalRing',S.readGoal?wk/S.readGoal:0,40);
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
  const bankVEl=document.getElementById('bankV');
  bankVEl.textContent=fmtSigned(S.cents);
  bankVEl.style.color=S.cents<0?'var(--pink-deep)':'';
  document.getElementById('bankLbl').textContent=S.cents<0?'in deficit':'saved up';
  const wkCents=weeklyCents();
  document.getElementById('weekV').textContent=fmtSigned(wkCents)+' of $'+(WEEKLY_TARGET_CENTS/100).toFixed(0)+' goal · $'+(WEEKLY_CAP_CENTS/100).toFixed(0)+' cap';
  document.getElementById('weekBarFill').style.width=Math.min(100,Math.max(0,Math.round(wkCents/WEEKLY_CAP_CENTS*100)))+'%';
  document.getElementById('weekBarTarget').style.left=Math.round(WEEKLY_TARGET_CENTS/WEEKLY_CAP_CENTS*100)+'%';
  document.getElementById('treatList').innerHTML=S.treats.map(function(t){
    const cost=Math.round(t.points);
    const pct=Math.min(100,Math.round(S.cents/cost*100));
    const rArm=armed==='redeem:'+t.id, dArm=armed==='tr:'+t.id;
    return '<div class="treat"><span class="nm">'+t.name+'</span>'+
      '<div class="bar sun"><div class="fill" style="width:'+pct+'%"></div></div>'+
      '<span class="cost">'+t.points+' pts</span>'+
      '<button class="btn tiny soft'+(rArm?' danger':'')+'" onclick="redeem(\''+t.id+'\')"'+(S.cents<cost?' disabled':'')+'>'+(rArm?'confirm':'redeem')+'</button>'+
      '<button class="rowbtn'+(dArm?' arm':'')+'" style="opacity:.4" onclick="delTreat(\''+t.id+'\',event)">'+(dArm?'sure?':'✕')+'</button></div>';}).join('');
  document.getElementById('redeemedLine').textContent=S.redeemed.length?
    'redeemed: '+S.redeemed.slice(-3).map(function(r){return r.name;}).join(' · '):'';
  const spendListEl=document.getElementById('spendList');
  if(spendListEl){
    spendListEl.innerHTML=S.spendLog.length?S.spendLog.slice(0,25).map(function(s){
      const dArm=armed==='sp:'+s.id;
      const dp=(s.day||today()).split('-').map(Number);
      const when=new Date(dp[0],dp[1]-1,dp[2]).toLocaleDateString(undefined,{month:'short',day:'numeric'});
      const balClass=s.balanceAfter<0?'neg':'pos';
      const balTxt=s.balanceAfter<0?fmtSigned(s.balanceAfter)+' deficit':fmtSigned(s.balanceAfter)+' left';
      return '<div class="spend"><span class="nm">'+String(s.name).replace(/</g,'&lt;')+'</span>'+
        '<span class="amt">'+dollarsStr(s.amount)+'</span>'+
        '<span class="bal '+balClass+'">'+balTxt+'</span>'+
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
  return {habitPct:req.length?doneN/req.length:0, pages:dd.pagesLogged||0, exMin:exMin, waterHit:dd.water>=WATER_GOAL, quests:quests, hasData:true};
}
let monthCursor=null;
function curMonthCursor(){ if(!monthCursor){ const n=new Date(); monthCursor={y:n.getFullYear(),m:n.getMonth()}; } return monthCursor; }
function shiftMonth(delta){
  const c=curMonthCursor(); let y=c.y, m=c.m+delta;
  if(m<0){ m=11; y--; } else if(m>11){ m=0; y++; }
  const now=new Date();
  if(y>now.getFullYear()||(y===now.getFullYear()&&m>now.getMonth())){ y=now.getFullYear(); m=now.getMonth(); }
  monthCursor={y:y,m:m}; renderMonth();
}
function renderMonth(){
  const cur=curMonthCursor(); const y=cur.y, m=cur.m;
  const now=new Date();
  document.getElementById('monthLbl').textContent=new Date(y,m,1).toLocaleDateString(undefined,{month:'long',year:'numeric'});
  const atCurrentMonth=(y===now.getFullYear()&&m===now.getMonth());
  const nextBtn=document.getElementById('monthNextBtn');
  if(nextBtn) nextBtn.disabled=atCurrentMonth;
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
  const firstDow=new Date(y,m,1).getDay();
  let hh=''; for(let i=0;i<firstDow;i++) hh+='<div></div>';
  for(let dnum=1;dnum<=nDays;dnum++){
    const dt=new Date(y,m,dnum);
    const k=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
    if(dt>now){ hh+='<div class="hcell" style="background:transparent;border-style:dashed"></div>'; continue; }
    const st=dayStats(k);
    const alpha=st.hasData?Math.max(0.08,st.habitPct):0.05;
    hh+='<div class="hcell" style="background:rgba(122,156,125,'+alpha.toFixed(2)+')" title="'+k+' · '+Math.round(st.habitPct*100)+'%">'+
      (st.hasData?'<span class="hcelldot"></span>':'')+'</div>';
  }
  document.getElementById('heatmap').innerHTML=hh;
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
const TOUCH_HOLD_MS=280, TOUCH_SLOP=12;
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
  setInterval(tickTimers,1000);
  setInterval(function(){ if(today()!==S.lastDate){ reconcile(); render(); } },60000);
  /* these inputs only exist if the old ritual panels are still in the page — habits are added
     from inside their routine block now, so guard rather than assume */
  (S.ritualDefs||[]).forEach(function(rd){
    const r=rd.id;
    const el=document.getElementById('add-'+r);
    if(el) el.addEventListener('keydown',function(e){ if(e.key==='Enter')addCustom(r); });
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&focusBlockId){ exitFocus(); return; }
    if(e.key==='Escape'&&pendingBlockStart!==null){ cancelPendingBlock(); return; }
    if(e.key==='Escape'&&openBlockId()){ closeBlockPanel(); return; }
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
     needs a re-render to pick up the new ratio — just the timeline, not the whole render(),
     which would also re-touch unrelated things like the greeting and water bars on every tick. */
  let resizeRenderTimer=null;
  window.addEventListener('resize',function(){
    clearTimeout(resizeRenderTimer);
    resizeRenderTimer=setTimeout(function(){ if(viewMode==='today') renderTimeline(); },150);
  });
})();
