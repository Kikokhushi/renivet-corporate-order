/* Renivet Auto-Prototype — wires html.to.design frames into the mobile flow.
   Frames are auto-detected by the screen's heading text, so imported frames
   keep whatever name html.to.design gives them. Run once after all 11
   screen imports are on the current page. */
(async () => {
  const HEADINGS = {
    landing:   'Corporate Orders',
    product:   'Choose your product',
    customise: 'Customise your product',
    artwork:   'Upload your artwork',
    quantity:  'How many units do you need?',
    quote:     'Your estimated quote',
    details:   'Company details',
    review:    'Review your order',
    requested: 'Your corporate order request is submitted',
    payment:   'Your final quotation',
    confirmed: 'Your corporate order is confirmed'
  };
  const SCREENS = Object.keys(HEADINGS);

  const frames = {};
  const candidates = figma.currentPage.children.filter(n =>
    n.type === 'FRAME' || n.type === 'GROUP' || n.type === 'SECTION');

  /* pass 1: detect by heading text inside the frame */
  for (const node of candidates) {
    let hit = null;
    for (const t of node.findAllWithCriteria({ types: ['TEXT'] })) {
      const c = t.characters.trim();
      for (const s of SCREENS) {
        if (!hit && c === HEADINGS[s]) hit = s;
      }
      if (hit) break;
    }
    if (hit && !frames[hit]) {
      frames[hit] = node;
      node.name = hit; /* rename so future runs and the layers list are clear */
    }
  }

  /* pass 2: fallback — any frame already named with a screen keyword */
  for (const node of candidates) {
    const lower = node.name.toLowerCase();
    for (const s of SCREENS) {
      if (frames[s] || node.name === s) continue;
      if (lower.includes(s)) frames[s] = node;
    }
  }

  const missing = SCREENS.filter(s => !frames[s]);
  if (missing.length) {
    figma.notify('Renivet: could not find screens: ' + missing.join(', '));
    return;
  }

  const WIRE = {
    landing:   [[/Explore Apparel/i, 'product'], [/Explore Merchandise/i, 'product']],
    product:   [[/Continue to Customisation/i, 'customise']],
    customise: [[/Continue to Artwork/i, 'artwork'], [/^Back$/i, 'product']],
    artwork:   [[/Continue to Quantity/i, 'quantity'], [/^Back$/i, 'customise']],
    quantity:  [[/Continue to Quotation/i, 'quote'], [/^Back$/i, 'artwork']],
    quote:     [[/Continue to Company Details/i, 'details'], [/Edit product/i, 'product']],
    details:   [[/^Review Order$/i, 'review']],
    review:    [[/^Submit Order Request$/i, 'requested'], [/^Back$/i, 'details']],
    requested: [[/Preview final quotation/i, 'payment'], [/^Back to Renivet$/i, 'landing']],
    payment:   [[/Pay 50% Advance/i, 'confirmed'], [/^Back$/i, 'requested']],
    confirmed: [[/^Back to Renivet$/i, 'landing']]
  };
  const SECTIONS = [
    [/^Product$/i, 'product'], [/^Customisation$/i, 'customise'],
    [/^Artwork$/i, 'artwork'], [/^Quantity$/i, 'quantity'],
    [/Company and delivery/i, 'details'], [/Estimated cost/i, 'quote']
  ];

  const link = async (node, dest) => {
    await node.setReactionsAsync([{
      trigger: { type: 'ON_CLICK' },
      action: { type: 'NODE', destinationId: dest.id, navigation: 'NAVIGATE' }
    }]);
  };

  let count = 0;
  for (const src of Object.keys(WIRE)) {
    const texts = frames[src].findAllWithCriteria({ types: ['TEXT'] });
    for (const [re, dest] of WIRE[src]) {
      for (const t of texts) {
        if (re.test(t.characters.trim())) {
          await link(t, frames[dest]);
          count++;
        }
      }
    }
  }

  /* review screen: each "Edit" links to the section heading above it */
  let section = null;
  for (const t of frames.review.findAllWithCriteria({ types: ['TEXT'] })) {
    const c = t.characters.trim();
    for (const [re, dest] of SECTIONS) if (re.test(c)) section = dest;
    if (/^Edit$/i.test(c) && section) {
      await link(t, frames[section]);
      section = null;
      count++;
    }
  }

  figma.notify('Renivet: wired ' + count + ' prototype links across ' + SCREENS.length + ' screens');
})();
