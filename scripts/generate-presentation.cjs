const pptxgen = require('pptxgenjs');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Weightloss Tracker Team';
pptx.subject = 'Weightloss Tracker Project Presentation';
pptx.title = 'Weightloss Tracker';
pptx.company = 'BSIT';
pptx.lang = 'en-US';
pptx.theme = {
  headFontFace: 'Aptos Display',
  bodyFontFace: 'Aptos',
  lang: 'en-US',
};
pptx.defineSlideMaster({
  title: 'MASTER',
  background: { color: '0B1120' },
  objects: [
    { rect: { x: 0, y: 7.18, w: 13.33, h: 0.32, fill: { color: '111827' }, line: { color: '111827' } } },
    { text: { text: 'WEIGHTLOSS TRACKER', options: { x: 0.45, y: 7.23, w: 4, h: 0.12, fontFace: 'Aptos', fontSize: 7, color: '94A3B8', bold: true, margin: 0 } } },
  ],
  slideNumber: { x: 12.55, y: 7.2, color: '94A3B8', fontFace: 'Aptos', fontSize: 8 },
});

const C = {
  bg: '0B1120',
  panel: '111827',
  panel2: '172033',
  text: 'F8FAFC',
  muted: 'CBD5E1',
  dim: '94A3B8',
  amber: 'F59E0B',
  yellow: 'FACC15',
  line: '334155',
  green: '34D399',
  red: 'FB7185',
};

function addTitle(slide, title, subtitle) {
  slide.addText(title, { x: 0.55, y: 0.35, w: 12.2, h: 0.45, fontSize: 25, bold: true, color: C.text, margin: 0 });
  if (subtitle) slide.addText(subtitle, { x: 0.58, y: 0.88, w: 11.8, h: 0.25, fontSize: 10.5, color: C.dim, margin: 0 });
  slide.addShape(pptx.ShapeType.line, { x: 0.58, y: 1.18, w: 12.15, h: 0, line: { color: C.amber, width: 1.5 } });
}

function addPanel(slide, x, y, w, h, fill = C.panel) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: fill }, line: { color: C.line, width: 0.7 } });
}

function addBulletList(slide, items, x, y, w, fontSize = 16, color = C.muted, gap = 0.48) {
  items.forEach((item, i) => {
    slide.addShape(pptx.ShapeType.ellipse, { x, y: y + i * gap + 0.08, w: 0.1, h: 0.1, fill: { color: C.amber }, line: { color: C.amber } });
    slide.addText(item, { x: x + 0.22, y: y + i * gap, w, h: gap, fontSize, color, breakLine: false, margin: 0.01, valign: 'mid' });
  });
}

function addLabel(slide, text, x, y, w, color = C.amber) {
  slide.addText(text.toUpperCase(), { x, y, w, h: 0.18, fontSize: 9, bold: true, color, charSpacing: 1.2, margin: 0 });
}

function addStep(slide, text, x, y, w, fill = C.panel2) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 0.58, rectRadius: 0.05, fill: { color: fill }, line: { color: C.amber, width: 1 } });
  slide.addText(text, { x: x + 0.08, y: y + 0.15, w: w - 0.16, h: 0.2, fontSize: 12, bold: true, color: C.text, align: 'center', margin: 0 });
}

// Slide 1
{
  const s = pptx.addSlide('MASTER');
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 7.18, fill: { color: C.bg }, line: { color: C.bg } });
  s.addShape(pptx.ShapeType.ellipse, { x: 9.8, y: -1.05, w: 4.7, h: 4.7, fill: { color: '3B2A0A', transparency: 20 }, line: { color: '3B2A0A', transparency: 100 } });
  s.addShape(pptx.ShapeType.ellipse, { x: 10.55, y: -0.3, w: 3.2, h: 3.2, fill: { color: C.amber, transparency: 78 }, line: { color: C.amber, transparency: 100 } });
  s.addText('WEIGHTLOSS', { x: 0.85, y: 1.25, w: 8, h: 0.6, fontSize: 34, bold: true, color: C.text, margin: 0 });
  s.addText('TRACKER', { x: 0.85, y: 1.88, w: 8, h: 0.6, fontSize: 34, bold: true, color: C.amber, margin: 0 });
  s.addText('A personalized fitness and progress monitoring system', { x: 0.9, y: 2.75, w: 7.5, h: 0.3, fontSize: 16, color: C.muted, margin: 0 });
  s.addShape(pptx.ShapeType.line, { x: 0.9, y: 3.35, w: 1.2, h: 0, line: { color: C.yellow, width: 3 } });
  s.addText('Group: Weightloss Tracker Team', { x: 0.9, y: 4.0, w: 5, h: 0.25, fontSize: 14, bold: true, color: C.text, margin: 0 });
  s.addText('AGANAN, GEREDWIN R.\nBRAGADO, JOHN MICHAEL V.\nESPARTERO, KENJIE\nMASDO, JHON LAURENCE G.\nRAYAN, KARL B.', { x: 0.9, y: 4.42, w: 5.1, h: 1.25, fontSize: 11.5, color: C.muted, breakLine: false, margin: 0.02, breakLine: false });
  s.addText('BSIT  •  ITE Elective 1 & Advanced Database Systems  •  React', { x: 0.9, y: 6.35, w: 10, h: 0.25, fontSize: 10.5, color: C.dim, margin: 0 });
}

// Slide 2
{
  const s = pptx.addSlide('MASTER');
  addTitle(s, 'Project Logo', 'Simple visual identity of the system');
  addPanel(s, 0.7, 1.65, 4.1, 4.75, '0F172A');
  s.addShape(pptx.ShapeType.ellipse, { x: 1.62, y: 2.15, w: 2.25, h: 2.25, fill: { color: C.amber }, line: { color: C.yellow, width: 2 } });
  s.addText('WL', { x: 1.86, y: 2.68, w: 1.8, h: 0.7, fontSize: 40, bold: true, color: C.bg, align: 'center', margin: 0 });
  s.addText('WEIGHTLOSS\nTRACKER', { x: 1.12, y: 4.85, w: 3.25, h: 0.7, fontSize: 17, bold: true, color: C.text, align: 'center', margin: 0 });
  addPanel(s, 5.35, 1.65, 7.2, 4.75);
  addLabel(s, 'Logo concept', 5.8, 2.05);
  s.addText('The “WL” mark represents Weightloss Tracker. The circular form symbolizes a complete fitness cycle: plan, track, and improve.', { x: 5.8, y: 2.45, w: 6.1, h: 0.8, fontSize: 20, bold: true, color: C.text, margin: 0.02, breakLine: false, valign: 'mid' });
  s.addText('Amber and yellow accents represent energy, progress, and motivation, while the dark background reflects the system’s modern interface.', { x: 5.8, y: 3.65, w: 5.9, h: 0.7, fontSize: 15, color: C.muted, margin: 0.02 });
}

// Slide 3
{
  const s = pptx.addSlide('MASTER');
  addTitle(s, 'Project Overview & Objectives', 'What the system does and what it aims to achieve');
  addPanel(s, 0.7, 1.5, 6.0, 4.95);
  addLabel(s, 'Project overview', 1.05, 1.9);
  s.addText('Weightloss Tracker is a web-based fitness companion that helps users create a personal plan, track daily activities, and monitor progress in one system.', { x: 1.05, y: 2.25, w: 5.25, h: 1.1, fontSize: 20, bold: true, color: C.text, margin: 0.02 });
  s.addText('It addresses the difficulty of organizing workouts, meals, and weight records separately. The intended users are people who want a simple and guided way to manage their fitness journey.', { x: 1.05, y: 3.7, w: 5.25, h: 1.0, fontSize: 14, color: C.muted, margin: 0.02 });
  addPanel(s, 7.05, 1.5, 5.5, 4.95);
  addLabel(s, 'Objectives', 7.4, 1.9);
  addBulletList(s, ['Create a personalized fitness plan from user profile data.', 'Record meals, workouts, and weight progress.', 'Provide analytics and history for informed tracking.'], 7.4, 2.35, 4.65, 17, C.muted, 0.92);
}

// Slide 4
{
  const s = pptx.addSlide('MASTER');
  addTitle(s, 'Scope', 'Users and features included in the proposed system');
  addPanel(s, 0.7, 1.55, 3.4, 4.95);
  addLabel(s, 'Users', 1.05, 1.95);
  addBulletList(s, ['Registered user', 'New user completing setup', 'User tracking personal progress'], 1.05, 2.4, 2.4, 16, C.muted, 0.82);
  addPanel(s, 4.45, 1.55, 8.1, 4.95);
  addLabel(s, 'Main features', 4.8, 1.95);
  addBulletList(s, ['Account access with regular login/OTP or Google Login', 'Profile setup and personalized plan generation', 'Planner for daily workouts and completion status', 'Food Scanner and meal tracking', 'Workout logging and exercise catalog', 'Weight monitoring, analytics, and history'], 4.8, 2.35, 6.9, 16, C.muted, 0.62);
}

// Slide 5
{
  const s = pptx.addSlide('MASTER');
  addTitle(s, 'Delimitation', 'What the system does not cover');
  addPanel(s, 0.75, 1.55, 7.1, 4.95);
  addLabel(s, 'The system will not include', 1.1, 1.95);
  addBulletList(s, ['Professional medical diagnosis or treatment', 'Direct connection to wearable devices', 'Online payment, product selling, or delivery services', 'Live consultation with doctors or fitness coaches'], 1.1, 2.4, 6.1, 17, C.muted, 0.8);
  addPanel(s, 8.15, 1.55, 4.4, 4.95, '1A2436');
  addLabel(s, 'System boundary', 8.5, 1.95, 3.5, C.yellow);
  s.addText('The project is limited to a web-based personal fitness tracker that manages user data, plans, activity logs, and progress records.', { x: 8.5, y: 2.45, w: 3.6, h: 1.55, fontSize: 20, bold: true, color: C.text, margin: 0.02 });
}

// Slide 6 (no image)
{
  const s = pptx.addSlide('MASTER');
  addTitle(s, 'System Flowchart', 'Vector summary of the actual system workflow — no image inserted');
  const steps = [
    ['1', 'Login / Register'],
    ['2', 'Setup Profile'],
    ['3', 'Generate Fitness Plan'],
    ['4', 'Track Daily Activities'],
    ['5', 'View Progress & History'],
  ];
  steps.forEach((item, i) => {
    const x = 0.8 + i * 2.48;
    s.addShape(pptx.ShapeType.ellipse, { x: x + 0.83, y: 2.05, w: 0.52, h: 0.52, fill: { color: C.amber }, line: { color: C.yellow, width: 1 } });
    s.addText(item[0], { x: x + 0.83, y: 2.18, w: 0.52, h: 0.16, fontSize: 12, bold: true, color: C.bg, align: 'center', margin: 0 });
    addStep(s, item[1], x, 2.9, 2.2);
    if (i < steps.length - 1) s.addShape(pptx.ShapeType.chevron, { x: x + 2.22, y: 3.08, w: 0.3, h: 0.25, fill: { color: C.yellow }, line: { color: C.yellow } });
  });
  addPanel(s, 1.0, 4.35, 11.2, 1.55);
  addLabel(s, 'Brief explanation', 1.35, 4.7);
  s.addText('Starting point: user login. Main process: profile setup and plan generation. Decision: new user goes to Setup; existing user loads the current plan. End result: the user tracks activities and views progress.', { x: 1.35, y: 5.08, w: 10.4, h: 0.52, fontSize: 16, color: C.muted, margin: 0.02 });
}

// Slide 7 (no image)
{
  const s = pptx.addSlide('MASTER');
  addTitle(s, 'Entity Relationship Diagram (ERD)', 'Simplified relationship view — no image inserted');
  addLabel(s, 'Database: MongoDB / weightloss', 0.75, 1.5, 5, C.yellow);
  const boxes = [
    ['UserAccount', 0.8, 2.1, 2.1, 0.68, C.amber],
    ['UserProfile', 3.3, 2.1, 2.1, 0.68, C.amber],
    ['FitnessPlan', 5.8, 2.1, 2.1, 0.68, C.amber],
    ['PlanDay / PlanMeal', 8.3, 2.1, 2.25, 0.68, C.amber],
    ['Activity Logs', 10.95, 2.1, 1.7, 0.68, C.amber],
    ['Exercise Catalog', 6.05, 4.0, 2.1, 0.68, C.yellow],
  ];
  boxes.forEach(([text, x, y, w, h, fill]) => {
    s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.04, fill: { color: fill }, line: { color: C.yellow, width: 1 } });
    s.addText(text, { x, y: y + 0.22, w, h: 0.2, fontSize: 13, bold: true, color: C.bg, align: 'center', margin: 0 });
  });
  const arrows = [
    [2.9, 2.44, 0.38, 0], [5.4, 2.44, 0.38, 0], [7.9, 2.44, 0.38, 0], [10.55, 2.44, 0.38, 0],
    [6.85, 2.78, 0, 1.2],
  ];
  arrows.forEach(([x, y, w, h]) => s.addShape(pptx.ShapeType.line, { x, y, w, h, line: { color: C.muted, width: 1.3, beginArrowType: 'none', endArrowType: 'triangle' } }));
  addPanel(s, 0.9, 5.25, 11.7, 0.95);
  s.addText('The account owns the user profile and records. The profile creates fitness plans, which contain plan days, meals, and exercises. Activity logs store the user’s meals, workouts, and weight history.', { x: 1.2, y: 5.53, w: 11.0, h: 0.35, fontSize: 15, color: C.muted, align: 'center', margin: 0.02 });
}

// Slide 8
{
  const s = pptx.addSlide('MASTER');
  addTitle(s, 'Technology Stack', 'Technologies used to build the system');
  const rows = [
    ['Frontend / Framework', 'React + Vite'],
    ['Database', 'MongoDB + Mongoose'],
    ['Backend / API', 'Node.js + Express'],
    ['Authentication', 'JWT, bcryptjs, OTP, Google Identity Services'],
    ['Other Tools', 'Axios, Recharts, Lucide React, Gemini API'],
    ['Development Tools', 'VS Code, Git, GitHub, diagrams.net'],
  ];
  addPanel(s, 0.9, 1.55, 11.55, 4.95);
  rows.forEach((r, i) => {
    const y = 1.9 + i * 0.68;
    s.addShape(pptx.ShapeType.line, { x: 1.15, y: y + 0.45, w: 11.0, h: 0, line: { color: C.line, width: 0.7 } });
    s.addText(r[0], { x: 1.25, y, w: 3.35, h: 0.25, fontSize: 15, bold: true, color: C.amber, margin: 0 });
    s.addText(r[1], { x: 4.8, y, w: 6.4, h: 0.25, fontSize: 15, color: C.text, margin: 0 });
  });
}

// Slide 9
{
  const s = pptx.addSlide('MASTER');
  addTitle(s, 'Current Project Progress', 'Actual development status');
  const rows = [
    ['Authentication and routing', 'Completed', C.green],
    ['Setup and personalized plan', 'Completed', C.green],
    ['Planner persistence', 'Completed', C.green],
    ['Meals / Food Scanner', 'Completed', C.green],
    ['Workouts and exercise catalog', 'Completed', C.green],
    ['Analytics and history', 'Completed', C.green],
    ['Documentation and diagrams', 'In Progress', C.yellow],
  ];
  addPanel(s, 0.75, 1.45, 7.3, 5.15);
  s.addText('MODULE / FEATURE', { x: 1.1, y: 1.82, w: 4.3, h: 0.2, fontSize: 10, bold: true, color: C.dim, margin: 0 });
  s.addText('STATUS', { x: 6.0, y: 1.82, w: 1.2, h: 0.2, fontSize: 10, bold: true, color: C.dim, margin: 0 });
  rows.forEach((r, i) => {
    const y = 2.18 + i * 0.58;
    s.addShape(pptx.ShapeType.line, { x: 1.1, y: y + 0.35, w: 6.5, h: 0, line: { color: C.line, width: 0.6 } });
    s.addText(r[0], { x: 1.1, y, w: 4.45, h: 0.2, fontSize: 13.5, color: C.text, margin: 0 });
    s.addText(r[1], { x: 5.9, y, w: 1.55, h: 0.2, fontSize: 12.5, bold: true, color: r[2], margin: 0 });
  });
  addPanel(s, 8.45, 1.45, 4.1, 5.15, '1A2436');
  addLabel(s, 'Evidence of development', 8.8, 1.85, 3.2, C.yellow);
  addBulletList(s, ['Working React pages and routing', 'Persisted MongoDB records', '300 image-backed exercises', 'Passing build and regression tests'], 8.8, 2.35, 3.1, 15, C.muted, 0.78);
}

// Slide 10 (no images)
{
  const s = pptx.addSlide('MASTER');
  addTitle(s, 'System Demonstration', 'Live demonstration plan — no screenshots inserted');
  addPanel(s, 0.85, 1.55, 5.8, 4.95);
  addLabel(s, 'Live demo sequence', 1.2, 1.95);
  addBulletList(s, ['Open the login page and sign in.', 'Complete or load the fitness profile.', 'Show the generated plan in Overview and Planner.', 'Log a meal, workout, and weight entry.', 'Show analytics and History.'], 1.2, 2.45, 4.85, 16, C.muted, 0.7);
  addPanel(s, 7.0, 1.55, 5.45, 4.95, '1A2436');
  addLabel(s, 'Expected output', 7.35, 1.95, 3, C.yellow);
  s.addText('A working end-to-end flow from account access to progress monitoring.', { x: 7.35, y: 2.45, w: 4.45, h: 0.85, fontSize: 22, bold: true, color: C.text, margin: 0.02 });
  s.addText('The actual application will be demonstrated live during the presentation.', { x: 7.35, y: 3.75, w: 4.3, h: 0.6, fontSize: 16, color: C.muted, margin: 0.02 });
}

pptx.writeFile({ fileName: 'C:\\Users\\Admin\\Desktop\\Weightloss\\docs\\Weightloss-Tracker-Project-Presentation.pptx' });
