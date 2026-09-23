/**
 * Content schema — the single description of everything the website editor can change.
 *
 * Used by:
 *   - the editor (src/admin): builds every form, the "Add section" menu and the new-page templates from it;
 *   - the server (server/): knows which documents exist and validates what is saved;
 *   - scripts/check-config.mjs: knows the section types.
 *
 * To add a section type: build the component in src/sections/, register it in src/sections/registry.js, and add
 * an entry to SECTION_TYPES below (fields + defaults). Nothing else is needed — the editor picks it up.
 */

/* ---------- field builders ---------- */
const F = (type) => (name, label, opts = {}) => ({ type, name, label, ...opts })
export const f = {
  text: F('text'),
  textarea: F('textarea'),
  markup: (name, label, opts = {}) => ({ type: 'text', name, label, markup: true, ...opts }),
  toggle: F('toggle'),
  number: F('number'),
  select: (name, label, options, opts = {}) => ({ type: 'select', name, label, options: options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)), ...opts }),
  color: F('color'),
  image: (name, label = 'Image', opts = {}) => ({ type: 'image', name, label, ...opts }),
  video: (name, label = 'Video', opts = {}) => ({ type: 'video', name, label, ...opts }),
  cinematic: (name = 'cinematic', label = 'Cinematic', opts = {}) => ({ type: 'cinematic', name, label, ...opts }),
  ref: (name, label, collection, opts = {}) => ({ type: 'ref', name, label, collection, ...opts }),
  lines: (name, label, opts = {}) => ({ type: 'lines', name, label, ...opts }),
  link: (name, label, opts = {}) => ({ type: 'link', name, label, ...opts }),
  object: (name, label, fields, opts = {}) => ({ type: 'object', name, label, fields, ...opts }),
  list: (name, label, fields, opts = {}) => ({ type: 'list', name, label, fields, ...opts }),
  typed: (name, label, types, opts = {}) => ({ type: 'typed', name, label, types, ...opts }),
  devices: F('devices'),
}

const MARKUP = 'Wrap words in *asterisks* to set them in the italic serif.'
export const THEMES = [{ value: 'dark', label: 'Dark' }, { value: 'dark2', label: 'Dark (secondary)' }, { value: 'light', label: 'Light (white)' }]
const theme = (def) => f.select('theme', 'Background', THEMES, { default: def, group: 'layout' })
const item3 = [f.text('number', 'Number'), f.text('title', 'Title'), f.textarea('text', 'Text')]

/* ---------- settings every section has ---------- */
export const COMMON_SECTION_FIELDS = [
  f.text('id', 'Section name', { hint: 'A short unique name, e.g. "why-us". Used for links to this section (/page#why-us).', group: 'section' }),
  f.toggle('hidden', 'Hide this section', { hint: 'Hidden sections stay in the list and can be switched back on.', group: 'section' }),
  f.devices('hideOn', 'Hide on', { hint: 'Hide this section on some screen sizes only.', group: 'layout' }),
  f.select('spacing', 'Spacing above and below', [
    { value: 'default', label: 'As designed' }, { value: 'small', label: 'Tighter' }, { value: 'large', label: 'More space' },
    { value: 'none', label: 'None' }, { value: 'flush-top', label: 'No space above' },
  ], { default: 'default', group: 'layout' }),
  f.select('motion', 'Motion', [
    { value: 'inherit', label: 'Site setting' }, { value: 'none', label: 'None (still)' }, { value: 'subtle', label: 'Subtle' },
    { value: 'standard', label: 'Standard' }, { value: 'cinematic', label: 'Cinematic' }, { value: 'dramatic', label: 'Dramatic' },
  ], { default: 'inherit', group: 'motion', hint: 'A section can be calmer than the site, but never livelier than a visitor who asked for reduced motion.' }),
]

/* ---------- section types ---------- */
export const SECTION_TYPES = [
  {
    type: 'hero', label: 'Home hero (cinematic)', category: 'Story scenes', description: 'The opening scene: a film that closes into a window beside a three-line headline.',
    fields: [f.text('eyebrow', 'Eyebrow'), f.lines('lines', 'Headline (three lines)', { hint: MARKUP, markup: true }), f.textarea('lead', 'Lead text'),
      f.link('primaryCta', 'Primary button'), f.link('secondaryCta', 'Secondary link'), f.cinematic('cinematic', 'Film', { group: 'media' }),
      f.text('figureLabel', 'Small label over the film'), f.text('liveLabel', 'Small live label'), f.text('scrollLabel', 'Scroll cue'),
      f.number('scrollLength', 'Scroll length', { hint: '1 = as designed, 1.5 = 50% longer', default: 1, group: 'motion', min: 0.5, max: 2, step: 0.1 })],
    defaults: { eyebrow: 'Eyebrow', lines: ['Your', '*headline*', 'here.'], lead: 'One or two sentences.', primaryCta: { label: 'Start a conversation', to: '/contact' }, secondaryCta: { label: 'Explore our work', to: '/work' }, cinematic: 'hero-plunge', scrollLength: 1 },
  },
  {
    type: 'transition', label: 'Transition (colour change)', category: 'Story scenes', description: 'A statement revealed while the page changes from dark to white (or back).',
    fields: [f.select('from', 'From', THEMES, { default: 'dark', group: 'layout' }), f.select('to', 'To', THEMES, { default: 'light', group: 'layout' }),
      f.select('variant', 'Style', ['circle', 'diagonal', 'rise', 'shutter', 'hbars', 'fade', 'cut'], { default: 'circle', group: 'motion', hint: '"cut" = no scroll scene, just the statement.' }),
      f.text('kicker', 'Small label'), f.lines('lines', 'Statement lines', { hint: MARKUP, markup: true }),
      f.select('height', 'Scroll length', [140, 150, 160, 170, 180, 190, 200, 210, 220, 240, 260].map((n) => ({ value: `${n}vh`, label: `${(n / 100).toFixed(1)} screens` })), { default: '200vh', group: 'motion' }),
      f.object('origin', 'Circle starts from', [f.number('0', 'Across (0–1)', { step: 0.05, min: 0, max: 1 }), f.number('1', 'Down (0–1)', { step: 0.05, min: 0, max: 1 })], { group: 'motion', asArray: true })],
    defaults: { from: 'dark', to: 'light', variant: 'circle', kicker: '', lines: ['A new', '*statement.*'], height: '200vh', origin: [0.76, 0.58] },
  },
  {
    type: 'proof', label: 'Proof', category: 'Story scenes', description: 'A headline claim, an image and three supporting points.',
    fields: [f.text('eyebrow', 'Eyebrow'), f.markup('heading', 'Heading', { hint: MARKUP }), f.textarea('lead', 'Lead'), f.image('image', 'Image', { group: 'media' }), f.text('imageAlt', 'Image description', { group: 'media' }),
      f.text('backgroundWord', 'Large background words'), f.list('items', 'Proof points', [f.text('title', 'Title'), f.textarea('text', 'Text')], { itemLabel: 'title' })],
    defaults: { eyebrow: 'Proof', heading: 'A *clear* claim.', lead: '', items: [] },
  },
  {
    type: 'problem', label: 'Problem (scroll scene)', category: 'Story scenes', description: 'A pinned story told in beats, with three image fragments.',
    fields: [f.text('label', 'Label'), f.lines('backgroundWords', 'Background words (3)'), f.list('images', 'Fragments (3 images)', [f.image('src', 'Image')], { asStrings: 'src', group: 'media' }),
      f.list('beats', 'Beats', [f.text('lineA', 'First line'), f.markup('lineB', 'Second line', { hint: MARKUP }), f.lines('list', 'Or: a list of lines'), f.toggle('highlight', 'Second line in accent colour')], { itemLabel: 'lineA' }),
      f.number('scrollLength', 'Scroll length', { default: 1, group: 'motion', min: 0.5, max: 2, step: 0.1 })],
    defaults: { label: 'The problem', backgroundWords: [], images: [], beats: [{ lineA: 'First line.', lineB: 'Second line.', list: [] }], scrollLength: 1 },
  },
  {
    type: 'system', label: 'Connected system (scroll scene)', category: 'Story scenes', description: 'The Strategy → Growth system line. Stages are edited under System.',
    fields: [f.text('label', 'Label'), f.lines('introLines', 'Intro lines', { hint: MARKUP, markup: true }), f.cinematic('cinematic', 'Film', { group: 'media' }), f.number('scrollLength', 'Scroll length', { default: 1, group: 'motion', min: 0.5, max: 2, step: 0.1 })],
    defaults: { label: 'The connected system', introLines: ['One connected', '*system.*'], cinematic: 'system-loop', scrollLength: 1 },
  },
  {
    type: 'capabilities', label: 'Capabilities', category: 'Lists', description: 'Every capability with its image. Capabilities are edited under Capabilities.',
    fields: [theme('light'), f.text('eyebrow', 'Eyebrow'), f.markup('heading', 'Heading', { hint: MARKUP }), f.textarea('intro', 'Intro'), f.text('linkLabel', 'Link label'), f.text('linkTo', 'Link to', { linkTarget: true })],
    defaults: { theme: 'light', eyebrow: 'Capabilities', heading: 'What we *do.*', intro: '', linkLabel: 'All capabilities', linkTo: '/capabilities' },
  },
  {
    type: 'selected-work', label: 'Selected work', category: 'Lists', description: 'One lead case study with a film, then two more.',
    fields: [f.text('eyebrow', 'Eyebrow'), f.markup('heading', 'Heading', { hint: MARKUP }), f.text('linkLabel', 'Link label'), f.text('linkTo', 'Link to', { linkTarget: true }),
      f.object('lead', 'Lead case study', [f.ref('caseStudy', 'Case study', 'case'), f.lines('titleLines', 'Title lines', { hint: MARKUP, markup: true }), f.textarea('summary', 'Summary'), f.cinematic('cinematic', 'Film'), f.text('caption', 'Caption'), f.text('linkLabel', 'Link label')], { open: true }),
      f.ref('pair', 'Two more case studies', 'case', { multiple: true, max: 2 }), f.number('scrollLength', 'Scroll length', { default: 1, group: 'motion', min: 0.5, max: 2, step: 0.1 })],
    defaults: { eyebrow: 'Selected work', heading: 'Systems in the *world.*', linkLabel: 'All work', linkTo: '/work', lead: {}, pair: [], scrollLength: 1 },
  },
  {
    type: 'case-list', label: 'All case studies', category: 'Lists', description: 'The full list of case studies with “Maps to” capabilities.',
    fields: [theme('light'), f.textarea('note', 'Note under the list'), f.text('linkLabel', 'Link label'), f.toggle('showCapabilities', 'Show “Maps to” capabilities', { default: true }), f.text('mapsToLabel', '“Maps to” label')],
    defaults: { theme: 'light', linkLabel: 'View case study', showCapabilities: true, mapsToLabel: 'Maps to' },
  },
  { type: 'capability-list', label: 'All capabilities', category: 'Lists', description: 'The full list of capabilities.', fields: [theme('light')], defaults: { theme: 'light' } },
  { type: 'insight-list', label: 'All insights', category: 'Lists', description: 'The full list of articles.', fields: [theme('light'), f.text('linkLabel', 'Link label'), f.text('readLabel', '“min read” label')], defaults: { theme: 'light', linkLabel: 'Read insight', readLabel: 'min read' } },
  {
    type: 'audience', label: 'Who this is for', category: 'Content', description: 'A short list of who the work is for.',
    fields: [theme('light'), f.text('eyebrow', 'Eyebrow'), f.textarea('lead', 'Lead'), f.select('source', 'Items', [{ value: 'audience', label: 'Company facts → Who we work with' }, { value: 'why', label: 'Company facts → Why USFL' }, { value: '', label: 'This section’s own items' }], { default: 'audience' }), f.list('items', 'Own items', item3, { itemLabel: 'title' })],
    defaults: { theme: 'light', eyebrow: 'Who this is for', source: 'audience', items: [] },
  },
  {
    type: 'why', label: 'Why (list with signal line)', category: 'Content', description: 'Reasons, with an image and the signal line.',
    fields: [theme('dark'), f.text('eyebrow', 'Eyebrow'), f.markup('heading', 'Heading', { hint: MARKUP }), f.textarea('lead', 'Lead'), f.image('image', 'Image', { group: 'media' }), f.text('imageAlt', 'Image description', { group: 'media' }),
      f.select('source', 'Items', [{ value: 'why', label: 'Company facts → Why USFL' }, { value: 'audience', label: 'Company facts → Who we work with' }, { value: '', label: 'This section’s own items' }], { default: 'why' }), f.list('items', 'Own items', item3, { itemLabel: 'title' })],
    defaults: { theme: 'dark', eyebrow: 'Why us', heading: 'Why *us.*', source: 'why', items: [] },
  },
  {
    type: 'trust', label: 'Partners & trust', category: 'Content', description: 'The partnership, facts and a moving marquee.',
    fields: [theme('dark'), f.text('eyebrow', 'Eyebrow'), f.text('heading', 'Heading (blank = partner line)'), f.toggle('showMarquee', 'Show moving marquee', { default: true, group: 'motion' }),
      f.list('facts', 'Facts', [f.text('label', 'Label'), f.textarea('text', 'Text', { hint: '{namedClients} and {sectors} are filled in from Company facts.' })], { itemLabel: 'label' }),
      f.object('seal', 'Seal', [f.toggle('show', 'Show seal', { default: true }), f.text('ring', 'Ring text'), f.text('top', 'Top word'), f.text('line1', 'Line 1'), f.text('line2', 'Line 2 (italic)'), f.text('label', 'Accessible label')])],
    defaults: { theme: 'dark', eyebrow: 'Partners', showMarquee: true, facts: [], seal: { show: false } },
  },
  {
    type: 'statement', label: 'Statement', category: 'Content', description: 'One strong line or two, large.',
    fields: [theme('dark'), f.text('eyebrow', 'Eyebrow'), f.lines('lines', 'Lines', { hint: MARKUP, markup: true }), f.select('align', 'Alignment', ['left', 'center'], { default: 'left', group: 'layout' }),
      f.select('size', 'Size', [{ value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }, { value: 'xl', label: 'Extra large' }], { default: 'lg', group: 'layout' }), f.toggle('accentLast', 'Last line in accent colour')],
    defaults: { theme: 'dark', lines: ['A strong', '*statement.*'], align: 'left', size: 'lg' },
  },
  {
    type: 'rich-text', label: 'Rich text', category: 'Content', description: 'Longer copy: paragraphs, sub-headings, lists and quotes.',
    fields: [theme('light'), f.text('eyebrow', 'Eyebrow'), f.markup('heading', 'Heading', { hint: MARKUP }),
      f.list('blocks', 'Text', [f.select('type', 'Kind', [{ value: 'paragraph', label: 'Paragraph' }, { value: 'heading', label: 'Sub-heading' }, { value: 'list', label: 'List' }, { value: 'quote', label: 'Quote' }], { default: 'paragraph' }), f.textarea('text', 'Text'), f.lines('items', 'List items (for lists)')], { itemLabel: 'text' }),
      f.link('link', 'Link')],
    defaults: { theme: 'light', heading: 'Heading', blocks: [{ type: 'paragraph', text: 'Your text.' }] },
  },
  {
    type: 'text-image', label: 'Text + image', category: 'Content', description: 'Copy beside a picture (editorial split).',
    fields: [theme('light'), f.text('eyebrow', 'Eyebrow'), f.markup('heading', 'Heading', { hint: MARKUP }), f.list('paragraphs', 'Paragraphs', [f.textarea('p', 'Paragraph')], { asStrings: 'p' }),
      f.image('image', 'Image', { group: 'media' }), f.text('imageAlt', 'Image description', { group: 'media' }),
      f.select('imageAspect', 'Image shape', [{ value: '4/5', label: 'Portrait 4:5' }, { value: '3/4', label: 'Portrait 3:4' }, { value: '1/1', label: 'Square' }, { value: '4/3', label: 'Landscape 4:3' }, { value: '16/9', label: 'Wide 16:9' }], { default: '4/5', group: 'layout' }),
      f.select('imageSide', 'Image side', ['right', 'left'], { default: 'right', group: 'layout' }), f.link('link', 'Link')],
    defaults: { theme: 'light', eyebrow: 'Eyebrow', heading: 'Heading beside an *image.*', paragraphs: ['Your text.'], image: '/images/paper-b.webp', imageAspect: '4/5', imageSide: 'right' },
  },
  {
    type: 'split-statement', label: 'Split statement', category: 'Content', description: 'A heading on the left, supporting text on the right.',
    fields: [theme('dark'), f.text('eyebrow', 'Eyebrow'), f.markup('heading', 'Heading', { hint: MARKUP }), f.textarea('text', 'Text'), f.link('link', 'Link')],
    defaults: { theme: 'dark', heading: 'Heading', text: 'Supporting text.' },
  },
  {
    type: 'cards', label: 'Cards', category: 'Content', description: 'Two to four tall cards, each with a large mark.',
    fields: [theme('dark'), f.text('eyebrow', 'Eyebrow'), f.markup('heading', 'Heading', { hint: MARKUP }),
      f.list('items', 'Cards', [f.text('mark', 'Large mark (letter / number)'), f.text('title', 'Title'), f.textarea('text', 'Text'), f.select('tone', 'Tone', [{ value: 'plain', label: 'Plain' }, { value: 'accent', label: 'Accent' }, { value: 'accent2', label: 'Second accent' }, { value: 'invert', label: 'White card' }], { default: 'plain' })], { itemLabel: 'title', max: 4 })],
    defaults: { theme: 'dark', heading: 'Heading', items: [{ mark: 'A', title: 'Title', tone: 'plain' }] },
  },
  {
    type: 'columns', label: 'Columns', category: 'Content', description: 'Numbered points in columns.',
    fields: [theme('dark2'), f.text('eyebrow', 'Eyebrow'), f.select('columns', 'Columns on desktop', [{ value: 2, label: 'Two' }, { value: 3, label: 'Three' }, { value: 4, label: 'Four' }], { default: 3, group: 'layout' }),
      f.select('source', 'Items', [{ value: '', label: 'This section’s own items' }, { value: 'audience', label: 'Company facts → Who we work with' }, { value: 'why', label: 'Company facts → Why USFL' }], { default: '' }), f.list('items', 'Own items', item3, { itemLabel: 'title' })],
    defaults: { theme: 'dark2', columns: 3, source: '', items: [{ number: '01', title: 'Title', text: 'Text.' }] },
  },
  {
    type: 'video-feature', label: 'Video / image feature', category: 'Media', description: 'Copy beside a film or picture.',
    fields: [theme('dark'), f.text('eyebrow', 'Eyebrow'), f.markup('heading', 'Heading', { hint: MARKUP }), f.textarea('text', 'Text'), f.link('link', 'Link'),
      f.cinematic('cinematic', 'Film', { group: 'media' }), f.image('image', 'Image (when there is no film)', { group: 'media' }), f.text('imageAlt', 'Image description', { group: 'media' }),
      f.select('aspect', 'Media shape', [{ value: '16/9', label: 'Wide 16:9' }, { value: '4/3', label: 'Landscape 4:3' }, { value: '1/1', label: 'Square' }, { value: '4/5', label: 'Portrait 4:5' }], { default: '16/9', group: 'layout' }),
      f.select('mediaSide', 'Media position', ['right', 'left', 'full'], { default: 'right', group: 'layout' }), f.select('reveal', 'Reveal', ['up', 'down', 'left', 'right', 'none'], { default: 'up', group: 'motion' })],
    defaults: { theme: 'dark', eyebrow: 'Film', heading: 'Heading beside a *film.*', text: 'Supporting text.', cinematic: 'system-loop', aspect: '16/9', mediaSide: 'right', reveal: 'up' },
  },
  {
    type: 'fullscreen-media', label: 'Full-screen media', category: 'Media', description: 'An edge-to-edge film or picture with an optional heading.',
    fields: [f.text('eyebrow', 'Eyebrow'), f.markup('heading', 'Heading', { hint: MARKUP }), f.link('link', 'Link'),
      f.cinematic('cinematic', 'Film', { group: 'media' }), f.image('image', 'Image (when there is no film)', { group: 'media' }), f.text('imageAlt', 'Image description', { group: 'media' }),
      f.select('height', 'Height', [{ value: '100svh', label: 'Full screen' }, { value: '80svh', label: '80% of the screen' }, { value: '60svh', label: '60% of the screen' }], { default: '100svh', group: 'layout' }),
      f.select('textPosition', 'Text position', ['bottom-left', 'center'], { default: 'bottom-left', group: 'layout' }), f.toggle('scrim', 'Darken behind text', { default: true, group: 'layout' })],
    defaults: { eyebrow: 'Campaign', heading: 'A full-screen *headline.*', cinematic: 'towers-rise', height: '100svh', textPosition: 'bottom-left', scrim: true },
  },
  {
    type: 'page-hero', label: 'Page hero', category: 'Page', description: 'The opening of an inner page: headline, intro and image.',
    fields: [f.text('eyebrow', 'Eyebrow'), f.text('index', 'Index number'), f.lines('lines', 'Headline lines', { hint: MARKUP, markup: true }), f.textarea('intro', 'Intro'),
      f.image('image', 'Image', { group: 'media' }), f.text('imageAlt', 'Image description', { group: 'media' }),
      f.select('size', 'Headline size', [{ value: 'display-xl', label: 'Extra large' }, { value: 'display-lg', label: 'Large' }, { value: 'display-md', label: 'Medium' }], { default: 'display-xl', group: 'layout' }),
      f.select('imageAspect', 'Image shape', [{ value: '4/5', label: 'Portrait 4:5' }, { value: '3/4', label: 'Portrait 3:4' }, { value: '1/1', label: 'Square' }, { value: '4/3', label: 'Landscape 4:3' }], { default: '4/5', group: 'layout' })],
    defaults: { eyebrow: 'Page', index: '', lines: ['A new', '*page.*'], intro: 'One or two sentences about this page.', image: '/images/paper-a.webp', size: 'display-xl', imageAspect: '4/5' },
  },
  {
    type: 'contact', label: 'Contact', category: 'Page', description: 'How to reach USFL, with a form when a destination is set.',
    fields: [theme('light'), f.text('eyebrow', 'Eyebrow'), f.text('heading', 'Heading'), f.text('linkedinLabel', 'LinkedIn button label'), f.image('image', 'Image', { group: 'media' }), f.text('imageAlt', 'Image description', { group: 'media' }),
      f.list('topics', 'Conversation starters', [f.text('title', 'Title'), f.textarea('text', 'Text')], { itemLabel: 'title' }),
      f.toggle('showForm', 'Show the contact form', { default: true, group: 'form', hint: 'Messages are kept in the editor under Inbox.' }),
      f.list('fields', 'Form fields', [f.text('label', 'Label'), f.text('name', 'Field key', { hint: 'lower-case, e.g. "phone"' }), f.select('kind', 'Kind', ['text', 'email', 'tel', 'textarea', 'select'], { default: 'text' }), f.toggle('required', 'Required'), f.lines('options', 'Choices (for “select”)'), f.toggle('wide', 'Full width')], { itemLabel: 'label', group: 'form' }),
      f.object('form', 'Form messages', [f.text('submitLabel', 'Send button'), f.text('sendingLabel', 'While sending'), f.text('successMessage', 'Thank-you message'), f.text('errorMessage', 'Error message'), f.text('consentLabel', 'Consent line (optional)')], { group: 'form' })],
    defaults: { theme: 'light', heading: 'Start a conversation', showForm: true, topics: [], fields: [], form: {} },
  },
  {
    type: 'cta', label: 'Call to action', category: 'Page', description: 'The closing invitation with a button and image.',
    fields: [theme('dark'), f.text('eyebrow', 'Eyebrow (blank = site default)'), f.markup('heading', 'Heading', { hint: MARKUP }), f.textarea('text', 'Text'), f.link('button', 'Button'),
      f.image('image', 'Image', { group: 'media' }), f.text('imageAlt', 'Image description', { group: 'media' })],
    defaults: { theme: 'dark' },
  },
]
export const SECTION_BY_TYPE = Object.fromEntries(SECTION_TYPES.map((s) => [s.type, s]))

/* ---------- page templates for "New page" ---------- */
export const PAGE_TEMPLATES = [
  { id: 'blank', label: 'Blank page', description: 'A page hero and a call to action.', sections: ['page-hero', 'cta'] },
  { id: 'landing', label: 'Landing page', description: 'Hero, statement, text + image, columns, call to action.', sections: ['page-hero', 'transition', 'statement', 'text-image', 'columns', 'cta'] },
  { id: 'campaign', label: 'Campaign page', description: 'Full-screen media, split statement, cards, film feature, call to action.', sections: ['fullscreen-media', 'split-statement', 'cards', 'video-feature', 'cta'] },
  { id: 'services', label: 'Services page', description: 'Hero, capabilities list, why, call to action.', sections: ['page-hero', 'capability-list', 'why', 'cta'] },
  { id: 'article', label: 'Long-form page', description: 'Hero and rich text.', sections: ['page-hero', 'rich-text', 'cta'] },
]

/* ---------- shared groups ---------- */
const SEO = f.object('seo', 'Search & sharing', [
  f.text('title', 'Page title (browser tab and search results)', { hint: 'Shown as “Title — USFL”. Blank = the page title.' }), f.textarea('description', 'Description (about 150 characters)'),
  f.text('ogTitle', 'Social title'), f.textarea('ogDescription', 'Social description'), f.image('image', 'Social image (1200×630)'),
  f.text('canonical', 'Canonical address'), f.select('robots', 'Search engines', [{ value: '', label: 'Index this page' }, { value: 'noindex, follow', label: 'Do not index this page' }], { default: '' }),
], { group: 'seo' })
const LINKROW = [f.text('label', 'Label'), f.text('to', 'Link to', { linkTarget: true }), f.toggle('visible', 'Show', { default: true }), f.toggle('external', 'Opens another website')]

/* ---------- collections (each item is one document) ---------- */
export const COLLECTIONS = {
  page: {
    label: 'Pages', singular: 'Page', idField: 'id', titleField: 'title',
    fields: [f.text('title', 'Page title', { required: true }), f.text('path', 'Address', { required: true, hint: 'e.g. /campaign. The home page is “/”.' }),
      f.toggle('visible', 'Published on the site', { default: true, hint: 'Off = the page exists in the editor only.' }), f.number('order', 'Order'),
      f.text('transitionLabel', 'Name on the page-change curtain'), f.text('transitionIndex', 'Number on the curtain'), SEO],
  },
  case: {
    label: 'Case studies', singular: 'Case study', titleField: 'title', previewPath: (d, site) => `${(site?.routes?.caseStudies || '/work').replace(/\/$/, '')}/${d.slug}`,
    fields: [
      f.text('title', 'Title', { required: true }), f.text('slug', 'Address name', { required: true, hint: 'The end of the address, e.g. “lifecycle-architecture”' }),
      f.toggle('hidden', 'Hide from the site'), f.number('order', 'Order'), f.text('number', 'Number (e.g. 01)'),
      f.lines('display', 'Display title lines', { hint: MARKUP, markup: true }), f.text('kicker', 'Kicker'), f.textarea('summary', 'Summary'),
      f.ref('capabilities', 'Maps to capabilities', 'capability', { multiple: true }),
      f.image('image', 'Main image', { group: 'media' }), f.image('imageSecondary', 'Second image', { group: 'media' }), f.text('imageAlt', 'Image description', { group: 'media' }), f.cinematic('cinematic', 'Film (optional)', { group: 'media' }),
      f.select('layout', 'Story layout', ['journey', 'principles', 'roadmap'], { default: 'journey', group: 'layout' }),
      f.list('meta', 'Facts', [f.text('label', 'Label'), f.text('value', 'Value')], { itemLabel: 'label' }),
      f.textarea('context', 'Context'), f.object('challenge', 'Challenge', [f.textarea('lead', 'Lead'), f.textarea('body', 'Body')], { open: true }),
      f.lines('objectives', 'Objectives'), f.text('principlesTitle', 'Principles title'), f.list('principles', 'Principles', [f.text('title', 'Title'), f.textarea('text', 'Text')], { itemLabel: 'title' }),
      f.list('approach', 'Approach', [f.text('title', 'Title'), f.textarea('text', 'Text')], { itemLabel: 'title' }), f.list('roadmap', 'Roadmap', [f.text('title', 'Title'), f.textarea('text', 'Text')], { itemLabel: 'title' }),
      f.textarea('built', 'What was built'), f.lines('statement', 'Challenge statement', { hint: MARKUP, markup: true }), f.textarea('quote', 'Quote (only real, approved quotes)'), f.textarea('reflection', 'Reflection'),
      f.object('result', 'Result', [f.textarea('headline', 'Headline'), f.list('metrics', 'Metrics (only published figures)', [f.text('value', 'Value'), f.text('label', 'Label')], { itemLabel: 'label' }), f.textarea('note', 'Note')], { open: true }),
      f.lines('takeaways', 'Takeaways'), f.object('cta', 'Closing button', [f.text('label', 'Label'), f.text('to', 'Link to', { linkTarget: true })]), SEO,
    ],
    defaults: { title: 'New case study', slug: 'new-case-study', hidden: true, order: 99, display: ['New case', '*study.*'], capabilities: [], layout: 'journey', meta: [], approach: [], takeaways: [], result: {}, seo: {} },
  },
  capability: {
    label: 'Capabilities', singular: 'Capability', titleField: 'name', previewPath: (d, site) => `${(site?.routes?.capabilities || '/capabilities').replace(/\/$/, '')}/${d.slug}`,
    fields: [
      f.text('name', 'Name', { required: true }), f.text('slug', 'Address name', { required: true }), f.toggle('hidden', 'Hide from the site'), f.number('order', 'Order'), f.text('number', 'Number'),
      f.textarea('short', 'Short description'), f.lines('statement', 'Statement lines', { hint: MARKUP, markup: true }),
      f.image('image', 'Image', { group: 'media' }), f.text('imageAlt', 'Image description', { group: 'media' }),
      f.lines('services', 'Services'), f.textarea('intro', 'Intro'), f.list('body', 'Body paragraphs', [f.textarea('p', 'Paragraph')], { asStrings: 'p' }),
      f.list('principles', 'Principles', [f.text('title', 'Title'), f.textarea('text', 'Text')], { itemLabel: 'title' }),
      f.ref('stages', 'System stages it serves', 'stage', { multiple: true }),
      f.ref('relatedInsights', 'Related insights', 'insight', { multiple: true }), SEO,
    ],
    defaults: { name: 'New capability', slug: 'new-capability', hidden: true, order: 99, statement: ['New', '*capability.*'], services: [], body: [], principles: [], seo: {} },
  },
  insight: {
    label: 'Insights', singular: 'Insight', titleField: 'title', previewPath: (d, site) => `${(site?.routes?.insights || '/insights').replace(/\/$/, '')}/${d.slug}`,
    fields: [
      f.text('title', 'Title', { required: true }), f.text('slug', 'Address name', { required: true }), f.toggle('hidden', 'Hide from the site'), f.number('order', 'Order'),
      f.lines('display', 'Display title lines', { hint: MARKUP, markup: true }), f.text('category', 'Category'), f.number('readMinutes', 'Reading time (minutes)'), f.textarea('dek', 'Summary'),
      f.image('image', 'Image', { group: 'media' }), f.text('imageAlt', 'Image description', { group: 'media' }),
      f.typed('body', 'Article', [
        { type: 'paragraph', label: 'Paragraph', fields: [f.textarea('text', 'Text')] },
        { type: 'heading', label: 'Heading', fields: [f.text('text', 'Text')] },
        { type: 'pullquote', label: 'Pull quote', fields: [f.textarea('text', 'Text')] },
        { type: 'list', label: 'List', fields: [f.lines('items', 'Items')] },
        { type: 'formula', label: 'Formula', fields: [f.text('text', 'Text')] },
        { type: 'step', label: 'Numbered step', fields: [f.text('number', 'Number'), f.text('heading', 'Heading'), f.textarea('text', 'Text')] },
        { type: 'cta', label: 'Call-out', fields: [f.textarea('text', 'Text')] },
      ]),
      SEO,
    ],
    defaults: { title: 'New insight', slug: 'new-insight', hidden: true, order: 99, display: ['New', '*insight.*'], body: [{ type: 'paragraph', text: 'Your text.' }], seo: {} },
  },
}

/* ---------- site-wide settings (one document each) ---------- */
const colors = [
  ['ink', 'Dark background'], ['ink2', 'Dark background (secondary)'], ['ink3', 'Dark background (menus, curtains)'], ['paper', 'Light background'],
  ['textOnDark', 'Text on dark'], ['mutedOnDark', 'Secondary text on dark'], ['faintOnDark', 'Decorative numbers on dark'],
  ['textOnLight', 'Text on light'], ['mutedOnLight', 'Secondary text on light'], ['faintOnLight', 'Decorative text on light'], ['recedeOnLight', 'Receding text on light (hover)'],
  ['accent', 'Accent (signal)'], ['accentOnLight', 'Accent on light backgrounds'], ['accent2', 'Second accent'],
  ['buttonBackground', 'Button'], ['buttonText', 'Button text'], ['buttonHoverBackground', 'Button hover'],
  ['buttonOnLightBackground', 'Button on light sections'], ['buttonOnLightText', 'Button text on light sections'], ['buttonOnLightHoverBackground', 'Button hover on light sections'],
  ['hairlineOnDark', 'Hairlines on dark'], ['hairlineOnLight', 'Hairlines on light'], ['decorOnDark', 'Background words on dark'], ['decorOnLight', 'Background words on light'],
  ['overlay', 'Film / image overlay'], ['selectionBackground', 'Text selection'], ['selectionText', 'Selected text'], ['focusOnDark', 'Focus ring on dark'], ['focusOnLight', 'Focus ring on light'],
].map(([k, l]) => f.color(k, l))
const casing = ['uppercase', 'none', 'lowercase', 'capitalize']

export const SETTINGS = [
  {
    key: 'site', label: 'Site settings & SEO', section: 'Site', previewPath: '/',
    fields: [
      f.text('name', 'Site name'), f.text('tagline', 'Tagline'), f.textarea('positioning', 'Positioning line'), f.textarea('descriptor', 'Descriptor'), f.textarea('audience', 'Audience line'),
      f.text('url', 'Live website address', { hint: 'e.g. https://usfl.co.za' }), f.text('locale', 'Locale'), f.text('language', 'Language'),
      f.object('social', 'Social profiles', [f.text('linkedin', 'LinkedIn'), f.text('instagram', 'Instagram'), f.text('x', 'X'), f.text('youtube', 'YouTube')]),
      f.object('contact', 'Contact', [f.text('email', 'Public email address', { hint: 'Leave blank until confirmed. Never shown unless filled in.' }), f.text('phone', 'Public phone number'), f.textarea('address', 'Address'), f.text('formEndpoint', 'Also send form messages to (webhook URL, optional)')]),
      f.object('seo', 'Default search & sharing', [f.text('titleTemplate', 'Title template', { hint: '{title} is replaced with the page title' }), f.text('defaultTitle', 'Home page title'), f.textarea('description', 'Default description'), f.image('socialImage', 'Default social image'), f.text('robots', 'Robots'), f.toggle('structuredData', 'Organisation data for search engines', { default: true })]),
      f.object('intro', 'Intro animation', [f.toggle('enabled', 'Show intro on the home page', { default: true }), f.toggle('oncePerSession', 'Only once per visit', { default: true }), f.lines('words', 'Four words (U · S · F · L)'), f.text('skipLabel', 'Skip label')]),
      f.object('finalCta', 'Default call to action', [f.text('eyebrow', 'Eyebrow'), f.markup('heading', 'Heading', { hint: MARKUP }), f.textarea('text', 'Text'), f.link('button', 'Button'), f.image('image', 'Image'), f.text('imageAlt', 'Image description')]),
      f.object('notFound', 'Page not found', [f.text('eyebrow', 'Eyebrow'), f.text('title', 'Title'), f.text('message', 'Message'), f.link('primary', 'Button'), f.link('secondary', 'Link')]),
      f.list('redirects', 'Redirects', [f.text('from', 'Old address', { hint: 'e.g. /old-page' }), f.text('to', 'New address', { linkTarget: true }), f.toggle('permanent', 'Permanent (301)', { default: true })], { itemLabel: 'from', hint: 'Send visitors from an old address to a new one.' }),
      f.object('analytics', 'Analytics', [f.text('plausibleDomain', 'Plausible domain (optional)'), f.text('googleTagId', 'Google tag ID (optional, e.g. G-XXXX)'), f.toggle('requireConsent', 'Ask for consent before analytics', { default: true })]),
      f.object('privacy', 'Privacy & cookies', [f.toggle('showNotice', 'Show a privacy notice', { default: false }), f.textarea('noticeText', 'Notice text'), f.link('policyLink', 'Privacy policy link'), f.text('acceptLabel', 'Accept button'), f.text('declineLabel', 'Decline button')]),
      f.object('routes', 'Address prefixes (advanced)', [f.text('caseStudies', 'Case studies'), f.text('capabilities', 'Capabilities'), f.text('insights', 'Insights')]),
    ],
  },
  {
    key: 'brand', label: 'Branding', section: 'Design', previewPath: '/',
    fields: [
      f.object('logo', 'Logo', [f.select('type', 'Logo', [{ value: 'wordmark', label: 'Built-in usfl wordmark' }, { value: 'image', label: 'An uploaded logo file' }], { default: 'wordmark' }), f.image('image', 'Logo file (for dark backgrounds)'), f.image('imageOnLight', 'Logo file for light backgrounds (optional)'), f.text('alt', 'Logo name (for screen readers)'), f.text('height', 'Height', { default: '26px' })], { open: true }),
      f.object('wordmark', 'Wordmark', [f.toggle('showSignalTicks', 'Show the four signal marks', { default: true }), f.list('tickColors', 'Signal colours (4)', [f.color('c', 'Colour')], { asStrings: 'c', max: 4 })]),
      f.object('footerMark', 'Large footer mark', [f.toggle('show', 'Show', { default: true })]),
      f.image('favicon', 'Browser icon (favicon)'), f.color('themeColor', 'Browser theme colour'), f.image('socialImage', 'Social sharing image (1200×630)'),
    ],
  },
  {
    key: 'theme', label: 'Colours, type & spacing', section: 'Design', previewPath: '/',
    fields: [
      f.object('colors', 'Colours', colors, { open: true }),
      f.object('opacity', 'Strengths', [f.number('hairlineOnDark', 'Hairline strength on dark (0–1)', { step: 0.01 }), f.number('hairlineOnLight', 'Hairline strength on light (0–1)', { step: 0.01 }), f.number('videoOverlay', 'Film overlay (0 = off, 1 = as designed)', { step: 0.05 }), f.number('grain', 'Film grain (0–0.2)', { step: 0.005 }), f.number('glow', 'Signal glow (0–1)', { step: 0.05 })]),
      f.object('typography', 'Typography', [
        f.text('displayFont', 'Headline font'), f.text('bodyFont', 'Body font'), f.text('serifFont', 'Italic accent font'), f.text('monoFont', 'Label font'),
        f.lines('fontStylesheets', 'Extra font stylesheets', { hint: 'e.g. a Google Fonts link — only for fonts that are not already part of the site' }),
        f.number('displayWeight', 'Headline weight', { step: 50, min: 100, max: 900 }), f.text('displayWidth', 'Headline width'), f.text('displayLetterSpacing', 'Headline letter-spacing'), f.number('displayLineHeight', 'Headline line-height', { step: 0.01 }),
        f.text('sizeXXL', 'Size XXL (home headline)'), f.text('sizeXL', 'Size XL'), f.text('sizeLG', 'Size L'), f.text('sizeMD', 'Size M'), f.text('sizeSM', 'Size S'),
        f.number('bodyWeight', 'Body weight', { step: 50 }), f.text('bodySize', 'Body size'), f.number('bodyLineHeight', 'Body line-height', { step: 0.05 }),
        f.text('leadSize', 'Lead size'), f.number('leadLineHeight', 'Lead line-height', { step: 0.02 }), f.text('leadMaxWidth', 'Lead max width'),
        f.text('bodyCopySize', 'Long-text size'), f.number('bodyCopyLineHeight', 'Long-text line-height', { step: 0.02 }), f.text('bodyCopyMaxWidth', 'Long-text max width'),
        f.text('eyebrowSize', 'Label size'), f.text('eyebrowLetterSpacing', 'Label letter-spacing'), f.select('eyebrowCase', 'Label casing', casing, { default: 'uppercase' }), f.number('eyebrowWeight', 'Label weight', { step: 50 }),
        f.text('navSize', 'Navigation size'), f.text('buttonSize', 'Button text size'), f.text('buttonLetterSpacing', 'Button letter-spacing'), f.select('buttonCase', 'Button casing', casing, { default: 'uppercase' }), f.number('buttonWeight', 'Button weight', { step: 50 }),
      ]),
      f.object('spacing', 'Spacing', [f.text('gutter', 'Page side padding'), f.number('sectionScale', 'Section spacing (1 = as designed)', { step: 0.05, min: 0.4, max: 2 }), f.text('navHeight', 'Navigation height'), f.text('buttonHeight', 'Button height'), f.text('buttonPaddingX', 'Button side padding'), f.text('gridGap', 'Grid gap')]),
      f.object('layout', 'Layout', [f.text('maxWidth', 'Maximum content width'), f.text('heroImageAspect', 'Default hero image shape')]),
      f.object('borders', 'Borders & corners', [f.text('hairlineWidth', 'Hairline width'), f.text('buttonRadius', 'Button corners'), f.text('tagRadius', 'Tag corners'), f.text('mediaRadius', 'Image corners'), f.text('cardRadius', 'Card corners')]),
    ],
  },
  {
    key: 'motion', label: 'Motion & interactions', section: 'Design', previewPath: '/',
    fields: [
      f.select('preset', 'Motion preset', [{ value: 'none', label: 'None — everything still' }, { value: 'subtle', label: 'Subtle' }, { value: 'standard', label: 'Standard (as designed)' }, { value: 'cinematic', label: 'Cinematic' }, { value: 'dramatic', label: 'Dramatic' }], { default: 'standard' }),
      f.number('speed', 'Speed (1 = as designed, 1.5 = slower, 0.8 = faster)', { step: 0.05, min: 0.5, max: 2 }), f.number('intensity', 'Intensity (distance of movement)', { step: 0.05, min: 0, max: 2 }),
      f.toggle('respectReducedMotion', 'Respect visitors who ask for reduced motion', { default: true }),
      f.object('text', 'Text reveals', [f.select('reveal', 'Style', [{ value: 'as-designed', label: 'As designed' }, { value: 'rise', label: 'Rise' }, { value: 'fade', label: 'Fade' }, { value: 'none', label: 'None' }], { default: 'as-designed' }), f.number('duration', 'Duration (s)', { step: 0.05 }), f.number('stagger', 'Delay between words (s)', { step: 0.01 }), f.text('triggerPoint', 'Starts when (e.g. "top 86%")')]),
      f.object('blocks', 'Block reveals', [f.select('reveal', 'Style', [{ value: 'as-designed', label: 'As designed' }, { value: 'rise', label: 'Rise' }, { value: 'fade', label: 'Fade' }, { value: 'none', label: 'None' }], { default: 'as-designed' }), f.number('duration', 'Duration (s)', { step: 0.05 }), f.number('distance', 'Distance (px)'), f.text('triggerPoint', 'Starts when')]),
      f.object('images', 'Image motion', [f.select('reveal', 'Reveal', [{ value: 'as-designed', label: 'As designed' }, { value: 'fade', label: 'Fade' }, { value: 'none', label: 'None' }], { default: 'as-designed' }), f.number('revealDuration', 'Reveal duration (s)', { step: 0.05 }), f.number('parallax', 'Parallax strength (1 = as designed, 0 = off)', { step: 0.05 }), f.number('revealScaleFrom', 'Reveal zoom', { step: 0.01 }), f.text('triggerPoint', 'Starts when')]),
      f.object('scenes', 'Scroll scenes', [f.number('scrollLength', 'Length of scroll scenes (1 = as designed)', { step: 0.05, min: 0.5, max: 2 })]),
      f.object('easing', 'Easing (advanced)', [f.text('entrance', 'Entrance'), f.text('inOut', 'In-out'), f.text('css', 'CSS entrance curve'), f.text('cssInOut', 'CSS in-out curve')]),
      f.object('features', 'Effects', [
        f.toggle('introSplash', 'Intro animation'), f.toggle('pageTransitions', 'Page-change curtain'), f.toggle('sharedImageTransitions', 'Image grows into the next page'),
        f.select('sectionTransitions', 'Colour-change transitions', [{ value: 'as-designed', label: 'As designed' }, { value: 'fade', label: 'All fade' }, { value: 'cut', label: 'All hard cut' }], { default: 'as-designed' }),
        f.toggle('customCursor', 'Custom cursor glow'), f.toggle('magneticButtons', 'Magnetic buttons'), f.toggle('hoverTilt', 'Image hover movement'), f.toggle('filmGrain', 'Film grain'), f.toggle('scrollProgressLine', 'Scroll progress line'), f.toggle('navigationAutoTheme', 'Navigation turns dark on white sections'),
      ], { open: true }),
    ],
  },
  {
    key: 'navigation', label: 'Navigation & footer', section: 'Site', previewPath: '/',
    fields: [
      f.list('primary', 'Main menu', [...LINKROW, f.list('children', 'Dropdown links (desktop)', LINKROW, { itemLabel: 'label' })], { itemLabel: 'label' }),
      f.object('cta', 'Menu button', [f.text('label', 'Label'), f.text('to', 'Link to', { linkTarget: true }), f.toggle('visible', 'Show', { default: true })], { open: true }),
      f.object('mobile', 'Mobile menu', [f.text('menuLabel', 'Menu label'), f.toggle('includeHome', 'Include Home', { default: true }), f.toggle('showCta', 'Show button', { default: true }), f.list('extraLinks', 'Extra links', LINKROW, { itemLabel: 'label' })]),
      f.object('footer', 'Footer', [
        f.text('eyebrow', 'Eyebrow'), f.markup('heading', 'Heading', { hint: MARKUP }), f.toggle('showCta', 'Show button', { default: true }),
        f.list('columns', 'Columns', [f.text('title', 'Title'), f.select('style', 'Link style', ['large', 'small'], { default: 'small' }), f.toggle('usePrimaryNavigation', 'Use the main menu'), f.toggle('includeHome', 'Include Home'), f.list('links', 'Links', LINKROW, { itemLabel: 'label' }), f.textarea('text', 'Text'), f.toggle('showContact', 'Show contact details (from Site settings)')], { itemLabel: 'title' }),
        f.list('legalLinks', 'Legal links', LINKROW, { itemLabel: 'label' }),
        f.text('copyright', 'Copyright', { hint: '{year} becomes the current year' }), f.text('bottomRight', 'Bottom-right text'),
      ], { open: true }),
    ],
  },
  {
    key: 'media', label: 'Films & cinematics', section: 'Media', previewPath: '/',
    fields: [
      f.list('cinematics', 'Cinematics', [
        f.text('id', 'Name (used to place it)', { hint: 'lower-case with dashes, e.g. "launch-film"' }), f.toggle('enabled', 'Switched on', { default: true }),
        f.select('type', 'Kind', [{ value: 'video', label: 'Video file' }, { value: 'still', label: 'Photo with a camera move' }], { default: 'video' }),
        f.textarea('description', 'Notes'), f.text('label', 'Description for screen readers'),
        f.video('src', 'Video (MP4)'), f.video('webm', 'Video (WebM, optional)'), f.video('mobileSrc', 'Phone video (MP4, optional)'), f.video('mobileWebm', 'Phone video (WebM, optional)'),
        f.image('poster', 'Poster (first frame / fallback)'), f.image('posterReducedMotion', 'Still for reduced motion (optional)'), f.image('sourceImage', 'Source photo'),
        f.select('playback', 'Playback', [{ value: 'loop', label: 'Loop' }, { value: 'once', label: 'Play once' }, { value: 'once-after-intro', label: 'Play once after the intro' }, { value: 'manual', label: 'Controlled by the scene' }], { default: 'loop' }),
        f.toggle('muted', 'Muted (needed for autoplay)', { default: true }), f.number('playbackRate', 'Playback speed (1 = normal)', { step: 0.05, min: 0.25, max: 2 }),
        f.text('position', 'Focal point', { hint: '“50% 50%” = centre' }), f.select('fit', 'Fit', ['cover', 'contain'], { default: 'cover' }), f.number('overlay', 'Legibility overlay (0 = off, 1 = on)', { step: 1, min: 0, max: 1 }),
        f.object('still', 'Camera move (for photos)', [
          f.object('from', 'From', [f.number('scale', 'Zoom', { step: 0.01 }), f.number('x', 'Pan across (%)', { step: 0.5 }), f.number('y', 'Pan down (%)', { step: 0.5 })]),
          f.object('to', 'To', [f.number('scale', 'Zoom', { step: 0.01 }), f.number('x', 'Pan across (%)', { step: 0.5 }), f.number('y', 'Pan down (%)', { step: 0.5 })]),
          f.number('duration', 'Duration (s)'), f.text('ease', 'Easing'), f.select('repeat', 'Repeat', ['yoyo', 'loop', 'once'], { default: 'yoyo' }),
        ]),
      ], { itemLabel: 'id' }),
    ],
  },
  {
    key: 'system', label: 'The connected system', section: 'Content', previewPath: '/',
    fields: [f.text('title', 'Title'), f.list('stages', 'Stages', [f.text('key', 'Key', { hint: 'lower-case, e.g. "data"' }), f.text('name', 'Name'), f.textarea('line', 'Line'), f.lines('tags', 'Tags'), f.textarea('detail', 'Supporting text (optional)'), f.ref('capabilities', 'Related capabilities', 'capability', { multiple: true }), f.ref('cases', 'Related case studies', 'case', { multiple: true }), f.toggle('hidden', 'Hide')], { itemLabel: 'name' })],
  },
  {
    key: 'company', label: 'Company facts', section: 'Content', previewPath: '/',
    fields: [
      f.list('audience', 'Who we work with', item3, { itemLabel: 'title' }), f.list('why', 'Why USFL', item3, { itemLabel: 'title' }), f.lines('marquee', 'Marquee words'),
      f.object('partner', 'Partnership', [f.text('name', 'Partner badge'), f.text('line', 'Partner line'), f.lines('namedClients', 'Clients named with permission'), f.lines('sectors', 'Sectors')], { open: true }),
    ],
  },
]
export const SETTINGS_BY_KEY = Object.fromEntries(SETTINGS.map((s) => [s.key, s]))

/* ---------- theme presets offered in the editor (applied to the draft only) ---------- */
export const THEME_PRESETS = [
  {
    id: 'signal', label: 'USFL Signal (current)', description: 'Near-black and pure white with the lime signal accent — the approved design.',
    colors: { ink: '#080A0D', ink2: '#10141A', ink3: '#161C23', paper: '#FFFFFF', textOnDark: '#F3F6F8', mutedOnDark: '#AAB3BC', faintOnDark: '#5D6873', textOnLight: '#080A0D', mutedOnLight: '#4C5660', faintOnLight: '#8A939C', recedeOnLight: '#B9C0C7', accent: '#C8FF3D', accentOnLight: '#4A7300', accent2: '#B8F7FF', buttonBackground: '#C8FF3D', buttonText: '#080A0D', buttonHoverBackground: '#F3F6F8', buttonOnLightBackground: '#080A0D', buttonOnLightText: '#F3F6F8', buttonOnLightHoverBackground: '#4A7300', hairlineOnDark: '#FFFFFF', hairlineOnLight: '#080A0D', decorOnDark: '#0F1318', decorOnLight: '#F1F3F5', overlay: '#080A0D', selectionBackground: '#C8FF3D', selectionText: '#080A0D', focusOnDark: '#C8FF3D', focusOnLight: '#080A0D' },
  },
  {
    id: 'copper', label: 'Copper & Paper', description: 'Ink, warm paper and a copper accent.',
    colors: { ink: '#0E1116', ink2: '#161A21', ink3: '#1D222A', paper: '#FFFFFF', textOnDark: '#F7F5F0', mutedOnDark: '#B5B0A6', faintOnDark: '#6B6861', textOnLight: '#0E1116', mutedOnLight: '#555249', faintOnLight: '#8D897F', recedeOnLight: '#BDB8AD', accent: '#C4622A', accentOnLight: '#A34F1F', accent2: '#F7F5F0', buttonBackground: '#C4622A', buttonText: '#FFFFFF', buttonHoverBackground: '#F7F5F0', buttonOnLightBackground: '#0E1116', buttonOnLightText: '#F7F5F0', buttonOnLightHoverBackground: '#A34F1F', hairlineOnDark: '#F7F5F0', hairlineOnLight: '#0E1116', decorOnDark: '#151920', decorOnLight: '#F7F5F0', overlay: '#0E1116', selectionBackground: '#C4622A', selectionText: '#FFFFFF', focusOnDark: '#C4622A', focusOnLight: '#0E1116' },
  },
]

/* ---------- document keys ---------- */
export const SETTING_KEYS = SETTINGS.map((s) => s.key)
export const KINDS = Object.keys(COLLECTIONS) // page, case, capability, insight
export const docKind = (key) => (key.includes(':') ? key.split(':')[0] : 'setting')
export const docId = (key) => (key.includes(':') ? key.slice(key.indexOf(':') + 1) : key)
export const isValidKey = (key) => SETTING_KEYS.includes(key) || (KINDS.includes(docKind(key)) && /^[a-z0-9][a-z0-9-]{0,80}$/.test(docId(key)))
