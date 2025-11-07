// --- Globals ---
let data;
const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSsvadCya4BShqzIPbYdqQTHN9cQ-ZcOSRbQW1uHj24zDHrgc7Tj3TyLcvqm4s19ostiODQQuvfd4RC/pub?output=csv";

let bgImg;
let filmstripImg; // filmstrip texture

let sliderStart, sliderEnd;
const minYear = 1937, maxYear = 2016;

// Layout
const topY = 140;   // first bar Y (also top of scrollable viewport)
const rowH = 58;    // vertical spacing between bars

// Genre filter UI
let selectedGenre = "All";
let genreButtons = [];
const GENRES = ["All", "Musical", "Comedy", "Adventure", "Action", "Drama"];

// Hover tracking
let hoveredIndex = -1;

// --- Cursor setup ---
const CURSOR_DEFAULT = 'url("assets/mickeydefault.png") 8 0, default'; // CSS default
const CURSOR_TINK   = 'url("assets/tinkerbellcursor.png") 12 10, pointer'; // canvas bars
const CURSOR_MICKEY = 'url("assets/mickeypoint.png") 10 0, pointer';       // UI hover (buttons + sliders)

// canvas ref (lets us set CSS cursor on the actual element)
let cnv;

// ---- Scroll state (virtual scrolling inside canvas) ----
let scrollOffset = 0;
let maxScroll = 0;

/* ----- 🎵 YouTube on-click embed ----- */
const YT_VIDEO_ID = "aw2JQC9ljwE";   // your video
let ytIframe = null;                  // will hold the created iframe
/* ------------------------------------ */

// --- Helpers ---
function spacedText(txt, x, y, spacing) {
  for (let i = 0; i < txt.length; i++) text(txt[i], x + i * spacing, y);
}

function formatUSD(n) {
  if (n == null || isNaN(n)) return "N/A";
  return "$" + Math.round(n).toLocaleString("en-US");
}

function drawTooltip(lines, mx, my) {
  textFont("Arial");
  textSize(12);
  textAlign(LEFT, TOP);

  let w = 0, h = 0, lineH = 18;
  for (const s of lines) w = max(w, textWidth(s));
  h = lineH * lines.length;

  const pad = 10;
  let boxW = w + pad * 2;
  let boxH = h + pad * 2;

  let bx = constrain(mx + 14, 8, width - boxW - 8);
  let by = constrain(my + 14, 8, height - boxH - 8);

  noStroke();
  fill(255, 255, 255, 235);
  rect(bx, by, boxW, boxH, 8);
  stroke(0, 40);
  noFill();
  rect(bx, by, boxW, boxH, 8);

  noStroke();
  fill(20);
  let ty = by + pad;
  for (const s of lines) {
    text(s, bx + pad, ty);
    ty += lineH;
  }
}

/* ---------- helper to apply Mickey cursor on hover for sliders/buttons ---------- */
function installRangeCursorCSS(cursorString) {
  const id = 'custom-cursor-css';
  if (document.getElementById(id)) return;

  const style = document.createElement('style');
  style.id = id;
  style.type = 'text/css';

  style.textContent = `
    .c-cursor:hover { cursor: ${cursorString}; }
    .c-cursor[type="range"]:hover { cursor: ${cursorString}; }
    .c-cursor[type="range"]::-webkit-slider-thumb:hover { cursor: ${cursorString}; }
    .c-cursor[type="range"]::-moz-range-thumb:hover { cursor: ${cursorString}; }
    .c-cursor[type="range"]::-ms-thumb:hover { cursor: ${cursorString}; }
    .c-cursor[type="range"]::-webkit-slider-runnable-track:hover { cursor: ${cursorString}; }
    .c-cursor[type="range"]::-moz-range-track:hover { cursor: ${cursorString}; }
    .c-cursor[type="range"]::-ms-track:hover { cursor: ${cursorString}; }
  `;
  document.head.appendChild(style);
}
/* ---------- END helper ---------- */

function preload() {
  // Data
  data = loadTable(url, "csv", "header");

  // Images
  bgImg = loadImage("assets/disneywallpaper.jpg");
  filmstripImg = loadImage("assets/filmstrip.png"); // filmstrip texture
}

function setup() {
  cnv = createCanvas(1270, 735); // w, h

  // Start with default cursor on the canvas
  cnv.style('cursor', CURSOR_DEFAULT);

  // Mickey cursor CSS for sliders/buttons (on hover)
  installRangeCursorCSS(CURSOR_MICKEY);

  // Range sliders (placed away from bars)
  sliderStart = createSlider(minYear, maxYear - 1, minYear, 1);
  sliderStart.position(900, 98);
  sliderStart.style('width', '300px');
  sliderStart.addClass('c-cursor');

  sliderEnd = createSlider(minYear + 1, maxYear, maxYear, 1);
  sliderEnd.position(900, 115);
  sliderEnd.style('width', '300px');
  sliderEnd.addClass('c-cursor');

  // Genre buttons
  let bx = 400, by = 90, gap = 8;
  for (let g of GENRES) {
    const btn = createButton(g);
    btn.position(bx, by);
    btn.mousePressed(() => {
      selectedGenre = g;
      scrollOffset = 0; // reset scroll when changing filters
    });
    btn.style('padding', '6px 10px');
    btn.style('border-radius', '8px');
    btn.style('border', 'none');
    btn.style('background-color', '#d6d6d6');

    // Mickey on hover for buttons
    btn.addClass('c-cursor');

    genreButtons.push(btn);

    const s = btn.size();
    bx += s.width + gap;
  }

  textFont("Arial");
}

function draw() {
  // Constant Disney wallpaper background
  image(bgImg, 0, 0, width, height);

  // Normalize the range
  let yStart = sliderStart.value();
  let yEnd = sliderEnd.value();
  if (yStart > yEnd) [yStart, yEnd] = [yEnd, yStart];

  // Labels (white)
  textAlign(LEFT, CENTER);
  textFont("Arial");
  fill(255);
  stroke(255);
  textSize(12);
  text(`Start Year: ${yStart}`, 960, 85);
  text(`End Year: ${yEnd}`, 1060, 85);
  text(`Genre: ${selectedGenre}`, 290, 108);

  // Active button highlight
  for (const btn of genreButtons) {
    btn.style('background-color', btn.html() === selectedGenre ? '#84b6f4' : '#d6d6d6');
  }

  // Title
  textAlign(CENTER, CENTER);
  stroke(255);
  fill(255);
  textFont("Henny Penny");
  textSize(30);
  const title = `Inflation Adjusted Gross of Disney Movies (${yStart}–${yEnd})`;
  spacedText(title, width / 2 - textWidth(title) / 1.5, 45, 20);

  if (!data) return;

  // Columns
  const numRows = data.getRowCount();
  const movies  = data.getColumn("movie_title");
  const years   = data.getColumn("year");
  const inflCol = data.getColumn("inflation_adjusted_gross");
  const genres  = data.getColumn("genre");
  const date    = data.getColumn("release_date");
  const rating  = data.getColumn("mpaa_rating");
  const gross   = data.getColumn("total_gross");

  // Parse numbers
  const inflationNumbers = inflCol.map(v => Number(String(v).replace(/[^0-9.-]+/g, "")));
  const grossNumbers     = gross.map(v   => Number(String(v).replace(/[^0-9.-]+/g, "")));

  // Scale max
  const MAX = Math.max(936662225, ...inflationNumbers, 1);

  // Legend (fixed — not scrolled)
  textFont("Arial");
  noStroke();
  fill(100, 150, 200);
  const legendRef = 100000000;
  const legendW = map(legendRef, 0, MAX, 0, 690);
  rect(60, 82, legendW, 50);
  fill(255);
  textAlign(LEFT, CENTER);
  stroke(255);
  textSize(12);
  text("= $100,000,000 (inflation-adjusted)", 60 + legendW + 8, 108);

  // Collect indices that pass filters
  const rows = [];
  for (let j = 0; j < numRows; j++) {
    const movieYear  = int(years[j]);
    const movieGenre = (genres[j] || "").trim();
    if (movieYear < yStart || movieYear > yEnd) continue;
    if (selectedGenre !== "All" && movieGenre !== selectedGenre) continue;
    rows.push(j);
  }

  // ---- Viewport & scrolling math ----
  const viewX = 0;
  const viewY = topY;              // bars start here
  const viewW = width;
  const viewH = height - viewY - 10; // leave a small bottom margin

  const contentHeight = rows.length * rowH;
  maxScroll = max(0, contentHeight - viewH);
  scrollOffset = constrain(scrollOffset, 0, maxScroll);

  // ---- Clip to the scrolling viewport so bars never cover header/legend ----
  push();
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(viewX, viewY, viewW, viewH);
  drawingContext.clip();

  // Draw filtered rows inside the clipped area
  textSize(14);
  textAlign(LEFT, CENTER);
  hoveredIndex = -1;

  const x = 60;        // bar left
  const h = 180;       // bar height
  const labelPad = 8;  // space between bar and label
  const cornerR = 2;   // rounded corner radius for bars

  for (let idx = 0; idx < rows.length; idx++) {
    const i = rows[idx];
    const y = viewY + idx * rowH - scrollOffset; // position inside viewport

    // Skip if off-screen (perf)
    if (y + h < viewY || y > viewY + viewH) continue;

    const wVal = inflationNumbers[i];
    const w_resize = map(wVal, 0, MAX, 0, 690);

    // ---- BAR: fill with filmstrip image using the SAME rect height (h) ----
    if (filmstripImg) {
      drawingContext.save();
      drawingContext.beginPath();

      // Rounded clip so image respects the same rounded rect shape
      if (typeof drawingContext.roundRect === "function") {
        drawingContext.roundRect(x, y, w_resize, h, cornerR);
      } else {
        drawingContext.rect(x, y, w_resize, h);
      }
      drawingContext.clip();

      // Draw the image stretched only to the bar width, with the ORIGINAL fixed height (h)
      image(filmstripImg, x, y, w_resize, h);

      drawingContext.restore();
    } else {
      // Fallback color if image hasn't loaded yet
      noStroke();
      fill(100, 150, 200);
      rect(x, y, w_resize, h, cornerR);
    }
    // ---- END BAR ----

    // label
    fill(255);
    textFont("mouse memoirs");
    textSize(30);
    text(`${movies[i]} (${years[i]})`, x + w_resize + 8, y + h / 2);

    // Hover detection only within viewport
    const withinX = mouseX >= x && mouseX <= x + w_resize;
    const withinY = mouseY >= y && mouseY <= y + h;
    const inViewport = mouseY >= viewY && mouseY <= viewY + viewH;
    if (inViewport && withinX && withinY) {
      hoveredIndex = i;
    }
  }

  // remove clipping
  drawingContext.restore();
  pop();

  // Cursor + tooltip (draw AFTER clipping so tooltip can overlap header if needed)
  if (hoveredIndex !== -1) {
    cnv.style('cursor', CURSOR_TINK);
    const i = hoveredIndex;
    const lines = [
      `${movies[i]} (${years[i]})`,
      `Release date: ${date[i] || "N/A"}`,
      `MPAA rating: ${rating[i] || "N/A"}`,
      `Total gross: ${formatUSD(grossNumbers[i])}`,
      `Inflation-adjusted: ${formatUSD(inflationNumbers[i])}`,
    ];
    drawTooltip(lines, mouseX, mouseY);
  } else {
    cnv.style('cursor', CURSOR_DEFAULT);
  }
}

// Only scroll when the mouse is inside the bars' viewport
function mouseWheel(event) {
  const viewY = topY;
  const viewH = height - viewY - 10;
  const inViewport = mouseY >= viewY && mouseY <= viewY + viewH;
  if (inViewport) {
    scrollOffset = constrain(scrollOffset + event.delta, 0, maxScroll);
    return false; // prevent page scroll
  }
  // allow normal page scroll if mouse isn't over the list
  return true;
}

/* ====== 🎵 Play YouTube when the user clicks the CANVAS ======
   - Works because it's triggered by a user gesture (mouse press)
   - Keeps the iframe "rendered" but off-screen so playback isn't paused
================================================================ */
function mousePressed() {
  // Only respond to clicks inside the canvas area
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;

  // If we've already created it, do nothing
  if (ytIframe) return;

  // Create the YouTube iframe
  ytIframe = createElement('iframe');
  // Keep it rendered but off-screen (avoid display:none which can pause playback)
  ytIframe.style('position', 'absolute');
  ytIframe.style('left', '-9999px');
  ytIframe.style('width', '1px');
  ytIframe.style('height', '1px');
  ytIframe.style('opacity', '0');
  ytIframe.style('pointer-events', 'none');

  // Build the autoplaying, UNMUTED url (allowed because this is a user gesture)
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '0',
    loop: '1',
    playlist: YT_VIDEO_ID,
    playsinline: '1'
  }).toString();

  ytIframe.attribute('src', `https://www.youtube.com/embed/${YT_VIDEO_ID}?${params}`);
  ytIframe.attribute('title', 'Background Music');
  ytIframe.attribute('frameborder', '0');
  ytIframe.attribute('allow', 'autoplay; encrypted-media');
  ytIframe.attribute('referrerpolicy', 'strict-origin-when-cross-origin');
}
