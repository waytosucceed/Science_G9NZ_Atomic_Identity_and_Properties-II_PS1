var questions = [];
var count = 0;
var score = 0;
var Ansgiven = []; // Store answers given by the user
var topicName = ''; // Variable to store the topic name
const submitSound = document.getElementById("submit-sound");
let timerId = null;

const uniqueKey = "G9NZ_Atomic Identity and Properties-II";

// ── localStorage helpers ──────────────────────────────────────────────────────
function saveToLocalStorage(key, value) {
  let storageData = JSON.parse(localStorage.getItem(uniqueKey)) || {};
  storageData[key] = value;
  localStorage.setItem(uniqueKey, JSON.stringify(storageData));
}

function getFromLocalStorage(key) {
  let storageData = JSON.parse(localStorage.getItem(uniqueKey)) || {};
  return storageData[key];
}

// ── Fetch questions ───────────────────────────────────────────────────────────
fetch('questions.json')
  .then(response => response.json())
  .then(data => {
    const urlParams = new URLSearchParams(window.location.search);
    topicName = urlParams.get('topic');
    const selectedTopic = data.topics.find(t => t.heading === topicName);

    if (selectedTopic) {
      questions = selectedTopic.questions;
      count = questions.length;

      saveToLocalStorage(topicName + '_totalQuestions', count);
      document.getElementById('heading').innerText = topicName || 'PS';

      loadAllQuestions();

      // ── Save topic into the uniqueKey object (NOT plain localStorage) ──
      const existingTopics = getFromLocalStorage('topics') || [];
      if (!existingTopics.find(t => t.heading === topicName)) {
        existingTopics.push(selectedTopic);
        saveToLocalStorage('topics', existingTopics);
      }
    } else {
      document.getElementById('heading').innerText = 'Topic not found';
      document.getElementById('questiondiv').innerHTML = 'No questions available for this topic.';
    }
  })
  .catch(err => {
    console.error('Failed to load questions.json', err);
    document.getElementById('questiondiv').innerHTML = 'Failed to load questions.';
  });

/* =============================================================================
   Render all questions grouped by section
   ============================================================================= */
function loadAllQuestions() {
  const questionDiv = document.getElementById('questiondiv');
  questionDiv.innerHTML = '';

  const allQuestionsContainer = document.createElement('div');
  allQuestionsContainer.className = 'all-questions-container';

  const mcqQuestions   = questions.filter(q => (q.section || 'mcq') === 'mcq');
  const shortQuestions = questions.filter(q => (q.section || 'mcq') === 'short');
  const longQuestions  = questions.filter(q => (q.section || 'mcq') === 'long');

  // MCQ Section
  if (mcqQuestions.length > 0) {
    const secTitle = document.createElement('h2');
    secTitle.innerText = `1 Mark Questions (MCQ) — Total: ${mcqQuestions.length}`;
    secTitle.style.color = 'blue';
    allQuestionsContainer.appendChild(secTitle);

    mcqQuestions.forEach(question => {
      const globalIndex = questions.indexOf(question);
      allQuestionsContainer.appendChild(buildQuestionContainer(question, globalIndex));
    });
  }

  // Short answer section
  if (shortQuestions.length > 0) {
    const secTitle = document.createElement('h2');
    secTitle.innerText = ``;
    secTitle.style.color = 'blue';
    allQuestionsContainer.appendChild(secTitle);

    shortQuestions.forEach(question => {
      const globalIndex = questions.indexOf(question);
      allQuestionsContainer.appendChild(buildQuestionContainer(question, globalIndex));
    });
  }

  // Long answer section
  if (longQuestions.length > 0) {
    const secTitle = document.createElement('h2');
    secTitle.innerText = ``;
    secTitle.style.color = 'blue';
    allQuestionsContainer.appendChild(secTitle);

    longQuestions.forEach(question => {
      const globalIndex = questions.indexOf(question);
      allQuestionsContainer.appendChild(buildQuestionContainer(question, globalIndex));
    });
  }

  questionDiv.appendChild(allQuestionsContainer);

  const submitButton = document.createElement('button');
  submitButton.className = 'submit-btn-centered';
  submitButton.textContent = 'Submit Answers';
  submitButton.onclick = submitAllAnswers;
  questionDiv.appendChild(submitButton);
}

function getDisplayQuestionNumber(question, index) {
  if (question.questionNo !== undefined && question.questionNo !== null) {
    return question.questionNo;
  }
  return index + 1;
}

/* =============================================================================
   Helper: does this array-part need special (non-text) rendering?
   Covers fraction objects AND isotope-notation objects.
   ============================================================================= */
function isSpecialPart(p) {
  return typeof p === 'object' && p !== null && (p.fraction || p.isotope);
}

function isInsideSup(str, offset) {
  const before = str.slice(0, offset);
  return before.lastIndexOf('<sup>') > before.lastIndexOf('</sup>');
}

/* =============================================================================
   Build a single question container (shared for all types)

   ROUTING ORDER (important — do not reorder):
   1. TABLE       — uses array question.question, must come before Array.isArray
   2. TEXT AREA   — explicit type check
   3. INLINE BLANK — has question.input + ______ in text (string OR array question)
                     must come before Array.isArray so input-type array questions
                     don't fall into the mixed-array renderer
   4. MIXED ARRAY — array question with fraction/isotope/blank parts (no question.input)
   5. RADIO/MCQ
   6. fallback textarea
   ============================================================================= */
function buildQuestionContainer(question, index) {
  const singleQuestionContainer = document.createElement('div');
  singleQuestionContainer.className = 'question-container';
  singleQuestionContainer.style.marginBottom = '30px';
  singleQuestionContainer.style.padding = '20px';
  singleQuestionContainer.style.border = '1px solid #ddd';
  singleQuestionContainer.style.borderRadius = '8px';
  singleQuestionContainer.style.fontSize = '2.4rem';

  const questionNumber = document.createElement('div');
  questionNumber.className = 'question-text';
  const displayNo = getDisplayQuestionNumber(question, index);
  questionNumber.innerHTML = `<strong>Question ${displayNo}:</strong>`;
  singleQuestionContainer.appendChild(questionNumber);

  const isTableType = question.type === "table" && question.table;

  // Check if any part is a fraction/isotope object — those must go to createMixedArrayQuestion
  const hasFraction = Array.isArray(question.question) &&
    question.question.some(p => isSpecialPart(p));

  // Flatten question text for detection
  const rawQ = Array.isArray(question.question)
    ? question.question.map(p => isSpecialPart(p) ? '' : p).join(' ')
    : (question.question || '');

  // Inline blank: has question.input + ______ in text + NO fraction/isotope parts
  const isInlineBlank = question.input && rawQ.includes("______") && !hasFraction;

  // Show question text:
  // - TABLE and INLINE BLANK render their own question text internally
  // - MIXED ARRAY (hasFraction): do NOT pre-render — createMixedArrayQuestion renders inline
  // - Everything else: render rawQ above the input widget
  if (!isTableType && !isInlineBlank && !hasFraction) {
    const questionText = document.createElement('div');
    questionText.innerHTML = rawQ;
    singleQuestionContainer.appendChild(questionText);
  }

  // ── Route to correct renderer ──
  if (isTableType) {
    singleQuestionContainer.appendChild(createTableQuestion(question, index));
  } else if (question.text_area !== undefined || question.type === 'text') {
    singleQuestionContainer.appendChild(createTextAreaQuestion(question, index));
  } else if (isInlineBlank) {
    singleQuestionContainer.appendChild(createInlineBlankQuestion(question, index));
  } else if (Array.isArray(question.question)) {
    // covers: hasFraction/hasIsotope mixed arrays AND plain fill-in-blank arrays without question.input
    singleQuestionContainer.appendChild(createMixedArrayQuestion(question, index));
  } else if (question.options && Array.isArray(question.options)) {
    singleQuestionContainer.appendChild(createRadioQuestion(question, index));
  } else {
    singleQuestionContainer.appendChild(createTextAreaQuestion(question, index));
  }

  return singleQuestionContainer;
}

/* =============================================================================
   Text area question
   ============================================================================= */
function createTextAreaQuestion(question, questionIndex) {
  const textAreaContainer = document.createElement('div');
  textAreaContainer.className = 'textarea-container';
  textAreaContainer.style.marginTop = '20px';

  const textArea = document.createElement('textarea');
  textArea.className = 'answer-textarea';
  textArea.style.width = '100%';
  textArea.style.minHeight = '200px';
  textArea.style.padding = '10px';
  textArea.style.fontSize = '18px';
  textArea.style.border = '2px solid #D6B65B';
  textArea.style.borderRadius = '4px';
  textArea.style.resize = 'vertical';
  textArea.placeholder = 'Enter your answer here...';

  if (Ansgiven[questionIndex]) {
    if (typeof Ansgiven[questionIndex] === 'string') {
      textArea.value = Ansgiven[questionIndex];
    } else if (Array.isArray(Ansgiven[questionIndex]) && question.type !== 'table') {
      textArea.value = Ansgiven[questionIndex].join(' ');
    }
  }

  textArea.oninput = (e) => { saveAnswer(questionIndex, e.target.value); };

  textAreaContainer.appendChild(textArea);
  return textAreaContainer;
}

/* =============================================================================
   TABLE question
   ============================================================================= */
function createTableQuestion(question, questionIndex) {
  const tableContainer = document.createElement('div');
  tableContainer.style.marginTop = '20px';

  // Show question text (array or string)
  const rawQ = Array.isArray(question.question)
    ? question.question.join(' ')
    : (question.question || '');
  if (rawQ) {
    const qText = document.createElement('div');
    qText.style.marginBottom = '12px';
    qText.innerHTML = rawQ;
    tableContainer.appendChild(qText);
  }

  const table = document.createElement('table');
  table.style.border = '2px solid #D6B65B';
  table.style.borderCollapse = 'collapse';
  table.style.width = '100%';

  const headerRow = document.createElement('tr');
  question.table.columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    th.style.border = '1px solid #D6B65B';
    th.style.padding = '10px';
    th.style.backgroundColor = '#f0f0f0';
    th.style.fontSize = '20px';
    th.style.textAlign = 'center';
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  if (!Ansgiven[questionIndex]) Ansgiven[questionIndex] = [];

  question.table.rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    if (!Ansgiven[questionIndex][rowIndex]) Ansgiven[questionIndex][rowIndex] = [];

    row.forEach((cellValue, colIndex) => {
      const td = document.createElement('td');
      td.style.border = '1px solid #D6B65B';
      td.style.padding = '10px';
      td.style.fontSize = '18px';
      td.style.textAlign = 'center';

      if (cellValue && cellValue.trim() !== "") {
        td.innerHTML = `<span style="font-size:18px;">${cellValue}</span>`;
        if (!Ansgiven[questionIndex][rowIndex][colIndex]) {
          Ansgiven[questionIndex][rowIndex][colIndex] = cellValue;
          saveToLocalStorage('Ansgiven', Ansgiven);
        }
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.style.width = '100%';
        input.style.textAlign = 'center';
        input.style.fontSize = '18px';
        input.style.border = 'none';
        input.style.backgroundColor = '#f9f9f9';

        if (Ansgiven[questionIndex]?.[rowIndex]?.[colIndex]) {
          input.value = Ansgiven[questionIndex][rowIndex][colIndex];
        }

        input.oninput = (e) => {
          if (!Ansgiven[questionIndex]) Ansgiven[questionIndex] = [];
          if (!Ansgiven[questionIndex][rowIndex]) Ansgiven[questionIndex][rowIndex] = [];
          Ansgiven[questionIndex][rowIndex][colIndex] = e.target.value;
          saveToLocalStorage('Ansgiven', Ansgiven);
        };

        td.appendChild(input);
      }

      tr.appendChild(td);
    });

    table.appendChild(tr);
  });

  tableContainer.appendChild(table);
  return tableContainer;
}

/* =============================================================================
   Radio / MCQ rendering
   ============================================================================= */
function createRadioQuestion(question, questionIndex) {
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'options-container';
  const hasImageOptions = question.options?.some(opt => opt.image) || false;

  if (hasImageOptions) {
    optionsContainer.style.display = 'grid';
    optionsContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
    optionsContainer.style.gap = '1rem';
  } else {
    optionsContainer.style.display = 'flex';
    optionsContainer.style.flexDirection = 'column';
    optionsContainer.style.gap = '10px';
  }

  question.options.forEach((option, optIndex) => {
    optionsContainer.appendChild(createOptionElement(option, questionIndex, optIndex));
  });

  return optionsContainer;
}

function createOptionElement(option, questionIndex, optionIndex) {
  const optionWrapper = document.createElement('div');
  optionWrapper.className = 'option-wrapper';
  optionWrapper.style.position = 'relative';
  optionWrapper.style.display = 'flex';
  optionWrapper.style.alignItems = 'center';
  optionWrapper.style.gap = '10px';
  optionWrapper.style.cursor = 'pointer';

  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = `question${questionIndex}`;
  radio.value = optionIndex;
  radio.style.marginRight = '10px';

  if (Number(Ansgiven[questionIndex]) === optionIndex) {
    radio.checked = true;
  }

  if (option.image) {
    const img = document.createElement('img');
    img.src = option.image;
    img.alt = 'Option Image';
    img.style.height = '150px';
    img.style.borderRadius = '12px';
    img.style.cursor = 'pointer';

    if (option.sound) {
      img.onmouseover = () => playOptionSound(option.sound);
    }

    optionWrapper.appendChild(radio);
    optionWrapper.appendChild(img);
  } else {
    const textSpan = document.createElement('span');
    textSpan.innerHTML = option.text;
    textSpan.style.flex = '1';
    optionWrapper.appendChild(radio);
    optionWrapper.appendChild(textSpan);
  }

  optionWrapper.addEventListener('click', (e) => {
    radio.checked = true;
    saveAnswer(questionIndex, Number(optionIndex));
    e.stopPropagation();
  });

  return optionWrapper;
}

/* =============================================================================
   Inline blank question
   Handles BOTH:
     - string questions:  question.question is a string with ______
     - array questions:   question.question is an array, joined text has ______
   Both require question.input to be present.
   ============================================================================= */
function createInlineBlankQuestion(question, questionIndex) {
  const container = document.createElement('div');
  container.style.marginTop = '10px';
  container.style.fontSize = '2.2rem';
  container.style.lineHeight = '2.0';

  if (!Ansgiven[questionIndex]) Ansgiven[questionIndex] = [];

  const rawText = Array.isArray(question.question)
    ? question.question.join(' ')
    : question.question;

  let blankIndex = 0;

  const html = rawText.replace(/______+/g, (match, offset, str) => {
    const value = Ansgiven[questionIndex][blankIndex] || "";
    const currentIndex = blankIndex;
    blankIndex++;

    const inSup = isInsideSup(str, offset);

    // Small + raised box for superscript blanks, normal box otherwise
    const boxStyle = inSup
      ? `width:48px; height:22px; font-size:14px; text-align:center;
         border:2px solid #D6B65B; border-radius:4px; margin:0 2px;
         outline:none; padding:0 2px; vertical-align:baseline;
         position:relative; top:-6px;`
      : `width:160px; height:42px; font-size:20px; text-align:center;
         border:2px solid #D6B65B; border-radius:6px; margin:4px 6px;
         outline:none; padding:0 6px; vertical-align:middle;`;

    return `<input
      type="text"
      data-q="${questionIndex}"
      data-i="${currentIndex}"
      value="${value}"
      style="${boxStyle}"
      onfocus="this.style.borderColor='#f0a500'"
      onblur="this.style.borderColor='#D6B65B'"
      oninput="handleInlineInput(event)"
    />`;
  });

  container.innerHTML = html;
  return container;
}

function handleInlineInput(e) {
  const qIndex = Number(e.target.dataset.q);
  const iIndex = Number(e.target.dataset.i);
  if (!Ansgiven[qIndex]) Ansgiven[qIndex] = [];
  Ansgiven[qIndex][iIndex] = e.target.value;
  saveToLocalStorage('Ansgiven', Ansgiven);
}

// Accepts "{2,4,6}" or "2|4|6" or a plain "2"
function getAcceptedAnswers(sme) {
  let s = String(sme ?? '').trim();
  let parts;
  if (s.startsWith('{') && s.endsWith('}')) {
    parts = s.slice(1, -1).split(',');
  } else if (s.includes('|')) {
    parts = s.split('|');
  } else {
    parts = [s];
  }
  return parts.map(p => p.trim()).filter(p => p !== '');
}

function isAnswerCorrect(userVal, smeVal) {
  const uv = String(userVal ?? '').trim().toLowerCase();
  if (!uv) return false;
  return getAcceptedAnswers(smeVal).some(a => a.toLowerCase() === uv);
}

// For showing in "SME's Answer": 2 or 4 or 6
function formatAcceptedAnswers(sme) {
  const list = getAcceptedAnswers(sme);
  return list.length ? list.join(' or ') : '__';
}

/* =============================================================================
   Save answer helper
   ============================================================================= */
function saveAnswer(questionIndex, answer) {
  Ansgiven[questionIndex] = answer;
  saveToLocalStorage('Ansgiven', Ansgiven);
}

/* =============================================================================
   Submit all answers
   ============================================================================= */
function submitAllAnswers() {
  try {
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new Error('No questions available');
    }
    if (!Ansgiven) Ansgiven = [];

    const sound1 = new Audio('./assests/sounds/submit.mp3');
    sound1.onerror = () => console.warn('Submit sound failed to load');
    sound1.play().catch(err => console.warn('Submit sound failed to play:', err));

    if (!topicName) topicName = 'default_topic';

    try { saveToLocalStorage(topicName + '_completed', 'true'); }
    catch (e) { console.error('Failed to save completed flag:', e); }

    const mcqScore = calculateMCQScore();

    try { saveToLocalStorage(uniqueKey + "_mcq_score", mcqScore); }
    catch (e) { console.error('Failed to save mcq score:', e); }

    const home = "<a href='./graph.html'><b class='btn btn-success next-btn-progress'>Click here to View Report</b></a><br>";
    try { saveToLocalStorage(topicName + '_results_content', home); }
    catch (e) { console.error('Failed to save results content:', e); }

    let questionContent = generateQuestionReview(mcqScore);
    try { saveToLocalStorage(topicName + '_question_content', questionContent); }
    catch (e) { console.error('Failed to save question content:', e); }

    try { saveToLocalStorage('Ansgiven', Ansgiven); }
    catch (e) { console.error('Failed to save Ansgiven:', e); }

    const questionDiv = document.getElementById("questiondiv");
    if (questionDiv) questionDiv.style.display = "none";

    try {
      confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
    } catch (e) { console.warn('Confetti failed:', e); }

    try {
      const sound = new Audio('./assests/sounds/well-done.mp3');
      sound.onerror = () => console.warn('Completion sound failed to load');
      sound.play().catch(err => console.warn('Completion sound failed to play:', err));
    } catch (e) { console.warn('Failed to play completion sound:', e); }

    window.location.href = "./graph.html";
  } catch (error) {
    console.error('Error in submitAllAnswers:', error);
    alert('There was an error submitting your answers. Please try again or contact support.');
  }
}

/* =============================================================================
   Calculate MCQ score
   ============================================================================= */
function calculateMCQScore() {
  let total = 0;

  questions.forEach((q, idx) => {
    const section = q.section || 'mcq';
    if (section !== 'mcq') return;

    const correctIndex = Number(q.answer);
    const rawGiven = Ansgiven[idx];
    const given = Array.isArray(rawGiven) ? Number(rawGiven[0]) : Number(rawGiven);
    const marks = Number(q.marks || 1);

    if (!isNaN(given) && given === correctIndex) {
      total += marks;
    }
  });

  return total;
}

/* =============================================================================
   Generate full question review HTML
   ============================================================================= */
function generateQuestionReview(mcqScore = 0) {
  try {
    let questionContent = '';

    const mcqQuestions = questions
      .filter(q => (q.section || 'mcq') === 'mcq')
      .map(q => ({ question: q, originalIndex: questions.indexOf(q) }));

    const shortQuestions = questions
      .filter(q => (q.section || 'mcq') === 'short')
      .map(q => ({ question: q, originalIndex: questions.indexOf(q) }));

    const longQuestions = questions
      .filter(q => (q.section || 'mcq') === 'long')
      .map(q => ({ question: q, originalIndex: questions.indexOf(q) }));

    let pageNumber = 0;

    // MCQ Questions: 5 per page
    const mcqPerPage = 5;
    const mcqPages = Math.ceil(mcqQuestions.length / mcqPerPage);

    for (let page = 0; page < mcqPages; page++) {
      const start = page * mcqPerPage;
      const end = Math.min(start + mcqPerPage, mcqQuestions.length);
      let pageDiv = `<div class='question-page' style='display:${pageNumber === 0 ? "block" : "none"};'><h2>Page ${pageNumber + 1}</h2>`;

      for (let j = start; j < end; j++) {
        const { question, originalIndex } = mcqQuestions[j];
        pageDiv += generateQuestionReviewItem(question, originalIndex);
      }

      pageDiv += "</div>";
      questionContent += pageDiv;
      pageNumber++;
    }

    // Short Questions: 1 per page
    for (let i = 0; i < shortQuestions.length; i++) {
      const { question, originalIndex } = shortQuestions[i];
      let pageDiv = `<div class='question-page' style='display:none;'><h2>Page ${pageNumber + 1}</h2>`;
      pageDiv += generateQuestionReviewItem(question, originalIndex);
      pageDiv += "</div>";
      questionContent += pageDiv;
      pageNumber++;
    }

    // Long Questions: 1 per page
    for (let i = 0; i < longQuestions.length; i++) {
      const { question, originalIndex } = longQuestions[i];
      let pageDiv = `<div class='question-page' style='display:none;'><h2>Page ${pageNumber + 1}</h2>`;
      pageDiv += generateQuestionReviewItem(question, originalIndex);
      pageDiv += "</div>";
      questionContent += pageDiv;
      pageNumber++;
    }

    return questionContent;
  } catch (error) {
    console.error('Error generating question review:', error);
    return "<div>Error generating question review</div>";
  }
}

/* =============================================================================
   Helper: render a fraction object as HTML string (for review)
   ============================================================================= */
function renderFractionHtml(frac, userAnswers, smeAnswers, blankIndexRef) {
  const renderSlot = (slot) => {
    if (slot === '______') {
      const userVal = String(userAnswers[blankIndexRef.idx] || '').trim();
      const smeVal  = String(smeAnswers[blankIndexRef.idx]  || '').trim();
      blankIndexRef.idx++;
      const isWrong = !userVal || userVal !== smeVal;
      const color   = isWrong ? 'red' : 'green';
      const display = userVal || '__';
      return `<span style="display:inline-block;min-width:60px;border-bottom:2px solid #999;
        text-align:center;padding:0 4px;color:${color};font-weight:bold;">${display}</span>`;
    }
    return slot;
  };

  const numHtml = renderSlot(frac.numerator);
  const denHtml = renderSlot(frac.denominator);

  return `<span style="display:inline-flex;flex-direction:column;align-items:center;
    margin:0 8px;vertical-align:middle;">
    <span style="text-align:center;min-width:80px;">${numHtml}</span>
    <span style="width:100%;height:2px;background:#333;display:block;min-width:80px;margin:2px 0;"></span>
    <span style="text-align:center;min-width:80px;">${denHtml}</span>
  </span>`;
}

/* =============================================================================
   Helper: render an isotope-notation object as HTML string (for review)
   Layout matches the interactive version: small superscript (mass) on top,
   small subscript (atomic number) on bottom, both left of a large symbol box.
   ============================================================================= */
function renderIsotopeHtml(iso, userAnswers, smeAnswers, blankIndexRef) {
  const renderSlot = (slot, big) => {
    if (slot === '______') {
      const userVal = String(userAnswers[blankIndexRef.idx] || '').trim();
      const smeVal  = String(smeAnswers[blankIndexRef.idx]  || '').trim();
      blankIndexRef.idx++;
      const isWrong = !userVal || userVal.toLowerCase() !== smeVal.toLowerCase();
      const color   = isWrong ? 'red' : 'green';
      const display = userVal || '__';
      const fontSize = big ? '2rem' : '0.95rem';
      return `<span style="display:inline-block;min-width:${big ? '46px' : '26px'};
        border-bottom:2px solid #999;text-align:center;padding:0 2px;
        color:${color};font-weight:bold;font-size:${fontSize};">${display}</span>`;
    }
    const fontSize = big ? '2rem' : '0.95rem';
    return `<span style="font-size:${fontSize};font-weight:bold;">${slot}</span>`;
  };

  // Consume blank indices in the SAME order they were assigned when saving
  // (buildIsotopeElement: mass -> symbol -> atomic)
  const massHtml   = renderSlot(iso.mass, false);
  const symbolHtml = renderSlot(iso.symbol, true);
  const atomicHtml = renderSlot(iso.atomic, false);

  // Visual layout stays the same: mass on top, atomic below, symbol big on the side
  return `<span style="display:inline-flex;align-items:center;margin:0 8px;vertical-align:middle;">
    <span style="display:inline-flex;flex-direction:column;align-items:flex-start;margin-right:4px;">
      ${massHtml}
      ${atomicHtml}
    </span>
    ${symbolHtml}
  </span>`;
}

/* =============================================================================
   Helper: render a mixed-array question as HTML string (for review)
   ============================================================================= */
function renderMixedArrayHtml(questionParts, userAnswers, smeAnswers, currentQuestion = {}) {
  const blankRef = { idx: 0 };

  const renderBlank = (userVal, smeVal, blankIdx) => {
    const uv = String(userVal || '').trim();
    const sv = String(smeVal  || '').trim();
    const unordered = currentQuestion?.unorderIndecis || [];
    let isWrong;
    if (unordered.includes(blankIdx)) {
      const validVals = unordered.map(i => String(smeAnswers[i] || '').trim().toLowerCase());
      isWrong = !uv || !validVals.includes(uv.toLowerCase());
    } else {
      isWrong = !uv || uv.toLowerCase() !== sv.toLowerCase();
    }
    const color   = isWrong ? 'red' : 'green';
    const display = uv || '__';
    return `<span style="display:inline-block;min-width:80px;padding:2px 8px;
      border-bottom:2px solid #999;text-align:center;font-weight:bold;color:${color};">${display}</span>`;
  };

  let html = '';

  questionParts.forEach(part => {
    if (typeof part === 'object' && part.fraction) {
      html += renderFractionHtml(part.fraction, userAnswers, smeAnswers, blankRef);
    } else if (typeof part === 'object' && part.isotope) {
      html += renderIsotopeHtml(part.isotope, userAnswers, smeAnswers, blankRef);
    } else if (typeof part === 'string') {
      const segs = part.split(/______/g);
      segs.forEach((seg, si) => {
        html += seg;
        if (si < segs.length - 1) {
          const uv = userAnswers[blankRef.idx] || '';
          const sv = smeAnswers[blankRef.idx]  || '';
          html += renderBlank(uv, sv, blankRef.idx);
          blankRef.idx++;
        }
      });
    }
  });

  return html;
}

/* =============================================================================
   Generate review HTML for a single question

   ROUTING ORDER (mirrors buildQuestionContainer — must stay in sync):
   1. TEXT AREA
   2. TABLE        (before Array.isArray)
   3. INLINE BLANK (question.input + ______ — before Array.isArray)
   4. MIXED ARRAY
   5. RADIO/MCQ
   ============================================================================= */
function generateQuestionReviewItem(question, index) {
  try {
    const section = question.section || 'mcq';
    const marks   = question.marks || (section === 'short' ? 3 : section === 'long' ? 5 : 1);
    const qNum    = getDisplayQuestionNumber(question, index);
    const userAns = Ansgiven[index];

    const hasFraction = Array.isArray(question.question) &&
      question.question.some(p => isSpecialPart(p));

    const rawQ = Array.isArray(question.question)
      ? question.question.map(p => isSpecialPart(p) ? '' : p).join(' ')
      : (question.question || '');

    const isInlineBlank = question.input && rawQ.includes("______") && !hasFraction;
    const isTableType   = question.type === "table" && question.table;

    // ── TEXT AREA ─────────────────────────────────────────────────────────
    if (question.text_area !== undefined || question.type === 'text') {
      const correctAnswer    = Array.isArray(question.answer) ? question.answer[0] : question.answer;
      const formattedCorrect = (correctAnswer || "").replace(/\n/g, "<br>");
      const rawUser          = userAns || "";
      const userAnswer       = (typeof rawUser === 'string' ? rawUser : String(rawUser)).replace(/\n/g, "<br>");

      return `
        <div style="padding:15px;border:1px solid #ddd;border-radius:8px;margin-bottom:25px;">
          <strong>Q.${qNum}:</strong> ${rawQ}<br><br>
          <strong>Your Answer:</strong><br>
          <div style="padding:10px;font-size:1.1rem;border-radius:4px;">
            ${userAnswer || "<span style='color:gray'>Not Answered</span>"}
          </div>
          <br><strong>SME's Answer:</strong><br>
          <div style="padding:10px;font-size:1.1rem;border-radius:4px;">
            ${formattedCorrect || "<span style='color:gray'>No sample answer</span>"}
          </div>
        </div>`;
    }

    // ── TABLE (before Array.isArray) ──────────────────────────────────────
    if (isTableType) {
      const tableUserAns = Array.isArray(userAns) ? userAns : [];
      const smeAns       = question.answer || [];
      const baseRows     = question.table.rows;

      const tableFontSize = '13px';
      const tableCellPad   = '6px';

      let userTable = `<div style="width:100%;">
  <table style="width:100%;border-collapse:collapse;border:1px solid #ccc;margin-top:10px;font-size:${tableFontSize};table-layout:fixed;">
  <tr>${question.table.columns.map(c =>
    `<th style="border:1px solid #ccc;padding:${tableCellPad};background:#f5f5f5;font-size:${tableFontSize};white-space:normal;word-wrap:break-word;overflow-wrap:break-word;">${c}</th>`
  ).join("")}</tr>`;

      baseRows.forEach((row, rIndex) => {
        userTable += "<tr>";
        row.forEach((originalCell, cIndex) => {
          let finalValue = "";
          if (originalCell && String(originalCell).trim() !== "") finalValue = originalCell;
          if (tableUserAns?.[rIndex]?.[cIndex]) finalValue = tableUserAns[rIndex][cIndex];
          userTable += `<td style="border:1px solid #ccc;padding:${tableCellPad};text-align:center;font-size:${tableFontSize};">
            ${String(finalValue).trim() === "" ? "<span style='color:red'>__</span>" : finalValue}
          </td>`;
        });
        userTable += "</tr>";
      });
      userTable += "</table></div>";

      let smeTable = '';
      if (Array.isArray(smeAns) && smeAns.length) {
       smeTable = `<br><strong>SME's Answer:</strong><br>
  <div style="width:100%;">
  <table style="width:100%;border-collapse:collapse;border:1px solid #ccc;margin-top:10px;font-size:${tableFontSize};table-layout:fixed;">
    <tr>${question.table.columns.map(c =>
      `<th style="border:1px solid #ccc;padding:${tableCellPad};background:#f5f5f5;font-size:${tableFontSize};white-space:normal;word-wrap:break-word;overflow-wrap:break-word;">${c}</th>`
    ).join("")}</tr>`;
        smeAns.forEach(row => {
          smeTable += "<tr>";
          row.forEach(col => {
            smeTable += `<td style="border:1px solid #ccc;padding:${tableCellPad};text-align:center;font-size:${tableFontSize};">${col}</td>`;
          });
          smeTable += "</tr>";
        });
        smeTable += "</table></div>";
      }

      return `
        <div style="padding:15px;border:1px solid #ddd;border-radius:8px;margin-bottom:25px;">
          <strong>Q.${qNum}:</strong> ${rawQ}<br><br>
          <strong>Your Answer:</strong><br>${userTable}
          ${smeTable}
        </div>`;
    }

    // ── INLINE BLANK — input array + ______ + NO fraction/isotope parts ───
    if (isInlineBlank) {
      const userAnswers = Array.isArray(userAns) ? userAns : [];
      const smeAnswers  = question.answer || [];
      const unordered   = question.unorderIndecis || [];

            let blankIndex = 0;
      const renderedQuestion = rawQ.replace(/______+/g, (m, offset, str) => {
        const idx     = blankIndex;
        const userVal = String(userAnswers[idx] || '').trim();
        const smeVal  = String(smeAnswers[idx]  || '').trim();
        blankIndex++;

        let isWrong;
        if (unordered.includes(idx)) {
          const validVals = unordered.map(i => String(smeAnswers[i] || '').trim().toLowerCase());
          isWrong = !userVal || !validVals.includes(userVal.toLowerCase());
        } else {
          isWrong = !isAnswerCorrect(userVal, smeVal);   // supports {2,4,6}
        }

        const color   = isWrong ? 'red' : 'green';
        const display = userVal || '__';
        const inSup   = isInsideSup(str, offset);

        return `<span style="
          display:inline-block;
          min-width:${inSup ? '30px' : '80px'};
          padding:${inSup ? '0 4px' : '2px 10px'};
          border-bottom:2px solid #999;text-align:center;
          font-weight:bold;color:${color};
          font-size:${inSup ? '0.9rem' : 'inherit'};
          vertical-align:middle;
        ">${display}</span>`;
      });

      let smeIndex = 0;
      const smeRendered = rawQ.replace(/______+/g, () => {
        const val = formatAcceptedAnswers(smeAnswers[smeIndex++]);
        return `<strong style="color:green;">${val}</strong>`;
      });

      return `
        <div style="padding:15px;border:1px solid #ddd;border-radius:8px;margin-bottom:25px;font-size:1.6rem;line-height:2.4;">
          <strong>Q.${qNum}:</strong><br><br>
          <div style="margin-bottom:16px;">${renderedQuestion}</div>
          <hr>
          <strong>SME's Answer:</strong><br>
          <div style="margin-top:10px;">${smeRendered}</div>
        </div>`;
    }

    // ── MIXED ARRAY (fraction/isotope objects, or array without question.input) ──
    if (Array.isArray(question.question)) {
      const answers   = question.answer || [];
      const userAnsw  = Array.isArray(userAns) ? userAns : [];
      const builtHtml = renderMixedArrayHtml(question.question, userAnsw, answers, question);

      const smeRef = { idx: 0 };
      let smeHtml  = '';
      question.question.forEach(part => {
        if (typeof part === 'object' && part.fraction) {
          const frac   = part.fraction;
          const numVal = frac.numerator   === '______' ? (answers[smeRef.idx++] || '__') : frac.numerator;
          const denVal = frac.denominator === '______' ? (answers[smeRef.idx++] || '__') : frac.denominator;
          smeHtml += `<span style="display:inline-flex;flex-direction:column;align-items:center;
            margin:0 8px;vertical-align:middle;">
            <span style="min-width:80px;text-align:center;">${numVal}</span>
            <span style="width:100%;height:2px;background:#333;display:block;min-width:80px;margin:2px 0;"></span>
            <span style="min-width:80px;text-align:center;">${denVal}</span>
          </span>`;
        } else if (typeof part === 'object' && part.isotope) {
          const iso    = part.isotope;
          const massVal   = iso.mass   === '______' ? (answers[smeRef.idx++] || '__') : iso.mass;
          const symbolVal = iso.symbol === '______' ? (answers[smeRef.idx++] || '__') : iso.symbol;
          const atomicVal = iso.atomic === '______' ? (answers[smeRef.idx++] || '__') : iso.atomic;
          smeHtml += `<span style="display:inline-flex;align-items:center;margin:0 8px;vertical-align:middle;">
            <span style="display:inline-flex;flex-direction:column;align-items:flex-start;margin-right:4px;">
              <span style="font-size:0.95rem;font-weight:bold;">${massVal}</span>
              <span style="font-size:0.95rem;font-weight:bold;">${atomicVal}</span>
            </span>
            <span style="font-size:2rem;font-weight:bold;">${symbolVal}</span>
          </span>`;
        } else if (typeof part === 'string') {
          const segs = part.split(/______/g);
          segs.forEach((seg, si) => {
            smeHtml += seg;
            if (si < segs.length - 1) {
              smeHtml += `<strong style="color:green;">${answers[smeRef.idx++] || '__'}</strong>`;
            }
          });
        }
      });

      return `
        <div style="padding:15px;border:1px solid #ddd;border-radius:8px;
          margin-bottom:25px;font-size:1.6rem;line-height:2.8;">
          <strong>Q.${qNum}:</strong><br><br>
          <div style="margin-bottom:12px;">${builtHtml}</div>
          <hr>
          <strong>SME's Answer:</strong><br>
          <div style="margin-bottom:12px;">${smeHtml}</div>
        </div>`;
    }

    // ── RADIO / MCQ ───────────────────────────────────────────────────────
    if (question.options && Array.isArray(question.options)) {
      const correctOptIndex = Number(question.answer);
      const givenIndex      = (userAns !== undefined && userAns !== null) ? Number(userAns) : null;
      const isCorrect       = (givenIndex !== null && givenIndex === correctOptIndex);

      const optionText = (i) => {
        const opt = question.options[i];
        if (!opt) return '';
        return opt.image
          ? `<img src="${opt.image}" style="width:60px;height:60px;">`
          : (opt.text || '');
      };

      const correctHtml = optionText(correctOptIndex) ||
        (typeof question.answer === 'string' ? question.answer : 'N/A');

      let givenHtml = "";
      if (givenIndex === null) {
        givenHtml = `<span style="color:red">Not Answered</span>`;
      } else {
        const gOpt = question.options[givenIndex];
        if (gOpt) {
          givenHtml = gOpt.image
            ? `<img src="${gOpt.image}" style="width:60px;height:60px;${isCorrect ? '' : 'border:2px solid red;'}">`
            : `<span style="color:${isCorrect ? 'green' : 'red'}">${gOpt.text}</span>`;
        } else {
          givenHtml = `<span style="color:red">Invalid option</span>`;
        }
      }

      return `
        <div style="padding:10px;border:1px solid #eee;border-radius:6px;margin-bottom:18px;">
          <strong>Q.${qNum}:</strong> ${rawQ}<br>
          <strong>Correct Answer:</strong> ${correctHtml}<br>
          <strong>Your Answer:</strong> ${givenHtml}
        </div>`;
    }

    // Default fallback
    return `<div><strong>Q.${qNum}:</strong> ${rawQ}<br><em>No renderer matched</em></div>`;

  } catch (err) {
    console.error("Review generation error:", err);
    return `<div>Error rendering question</div>`;
  }
}

/* =============================================================================
   Mixed Array Question — interactive renderer (for quiz input)
   Handles: fraction objects, isotope-notation objects, plain ______ blanks,
   and regular text spans.
   ============================================================================= */
function createMixedArrayQuestion(question, questionIndex) {
  const wrapper = document.createElement('div');
  wrapper.style.marginTop = '16px';
  wrapper.style.fontSize = '2.2rem';
  wrapper.style.lineHeight = '1.8';

  if (!Ansgiven[questionIndex]) Ansgiven[questionIndex] = [];
  let blankIndex = 0;

  question.question.forEach(part => {
    if (typeof part === 'object' && part.fraction) {
      const frac = part.fraction;
      const fracEl = buildFractionElement(frac, questionIndex, blankIndex);
      wrapper.appendChild(fracEl);
      if (frac.numerator   === '______') blankIndex++;
      if (frac.denominator === '______') blankIndex++;
      return;
    }

    if (typeof part === 'object' && part.isotope) {
      const iso = part.isotope;
      const isoEl = buildIsotopeElement(iso, questionIndex, blankIndex);
      wrapper.appendChild(isoEl);
      if (iso.mass   === '______') blankIndex++;
      if (iso.symbol === '______') blankIndex++;
      if (iso.atomic === '______') blankIndex++;
      return;
    }

    if (typeof part === 'string') {
      const segments = part.split(/______/g);
      segments.forEach((seg, si) => {
        if (seg) {
          const span = document.createElement('span');
          span.innerHTML = seg;
          wrapper.appendChild(span);
        }
        if (si < segments.length - 1) {
          wrapper.appendChild(buildBlankInput(questionIndex, blankIndex));
          blankIndex++;
        }
      });
    }
  });

  return wrapper;
}

function buildFractionElement(frac, questionIndex, startBlankIndex) {
  const fracWrapper = document.createElement('span');
  fracWrapper.style.cssText = `
    display: inline-flex; flex-direction: column;
    align-items: center; margin: 0 6px; vertical-align: middle;
  `;

  const numBI = startBlankIndex;
  const denBI = frac.numerator === '______' ? startBlankIndex + 1 : startBlankIndex;

  const numEl = frac.numerator   === '______' ? buildBlankInput(questionIndex, numBI)
                                              : buildFixedFracLabel(frac.numerator);
  const line = document.createElement('div');
  line.style.cssText = `width:100%; min-width:130px; height:2px; background:#333; margin:4px 0;`;

  const denEl = frac.denominator === '______' ? buildBlankInput(questionIndex, denBI)
                                              : buildFixedFracLabel(frac.denominator);

  fracWrapper.appendChild(numEl);
  fracWrapper.appendChild(line);
  fracWrapper.appendChild(denEl);
  return fracWrapper;
}

/* =============================================================================
   Isotope / atomic-notation element
   Renders:  [small mass box]      [big symbol box]
             [small atomic box]
   i.e. superscript (mass number) stacked above subscript (atomic number),
   both to the left of one large element-symbol box — matching the
   standard "A over Z, Symbol" isotope notation layout.
   Blank indices are assigned in JSON order: mass, symbol, atomic.
   ============================================================================= */
function buildIsotopeElement(iso, questionIndex, startBlankIndex) {
  const wrapper = document.createElement('span');
  wrapper.style.cssText = `
    display: inline-flex; align-items: center;
    margin: 0 10px; vertical-align: middle;
  `;

  let bi = startBlankIndex;

  const massBI = bi;
  if (iso.mass === '______') bi++;
  const symbolBI = bi;
  if (iso.symbol === '______') bi++;
  const atomicBI = bi;
  if (iso.atomic === '______') bi++;

  const stack = document.createElement('span');
  stack.style.cssText = `
    display: inline-flex; flex-direction: column;
    align-items: flex-start; margin-right: 4px; gap: 20px;
  `;

  const massEl = iso.mass === '______'
    ? buildSmallBlankInput(questionIndex, massBI)
    : buildFixedSmallLabel(iso.mass);

  const atomicEl = iso.atomic === '______'
    ? buildSmallBlankInput(questionIndex, atomicBI)
    : buildFixedSmallLabel(iso.atomic);

  stack.appendChild(massEl);
  stack.appendChild(atomicEl);

  const symbolEl = iso.symbol === '______'
    ? buildBigBlankInput(questionIndex, symbolBI)
    : buildFixedBigLabel(iso.symbol);

  wrapper.appendChild(stack);
  wrapper.appendChild(symbolEl);

  return wrapper;
}

function buildBlankInput(questionIndex, blankIndex) {
  const val = (Ansgiven[questionIndex] && Ansgiven[questionIndex][blankIndex]) || '';
  const input = document.createElement('input');
  input.type = 'text';
  input.value = val;
  input.dataset.q = questionIndex;
  input.dataset.i = blankIndex;
  input.style.cssText = `
    width:130px; height:46px; font-size:1.8rem;
    text-align:center; border:2px solid black; border-radius:6px;
    margin:3px; outline:none;
  `;
  input.onfocus = () => { input.style.borderColor = '#f0a500'; };
  input.onblur  = () => { input.style.borderColor = '#D6B65B'; };
  input.oninput = (e) => {
    const qi = Number(e.target.dataset.q);
    const ii = Number(e.target.dataset.i);
    if (!Ansgiven[qi]) Ansgiven[qi] = [];
    Ansgiven[qi][ii] = e.target.value;
    saveToLocalStorage('Ansgiven', Ansgiven);
  };
  return input;
}

/* Small input box — used for superscript (mass number) / subscript (atomic
   number) slots in the isotope notation. Kept deliberately narrow/short. */
function buildSmallBlankInput(questionIndex, blankIndex) {
  const val = (Ansgiven[questionIndex] && Ansgiven[questionIndex][blankIndex]) || '';
  const input = document.createElement('input');
  input.type = 'text';
  input.value = val;
  input.dataset.q = questionIndex;
  input.dataset.i = blankIndex;
  input.style.cssText = `
    width:46px; height:20px; font-size:1rem;
    text-align:center; border:2px solid black; border-radius:4px;
    margin:0; outline:none; padding:0;
  `;
  input.onfocus = () => { input.style.borderColor = '#f0a500'; };
  input.onblur  = () => { input.style.borderColor = '#D6B65B'; };
  input.oninput = (e) => {
    const qi = Number(e.target.dataset.q);
    const ii = Number(e.target.dataset.i);
    if (!Ansgiven[qi]) Ansgiven[qi] = [];
    Ansgiven[qi][ii] = e.target.value;
    saveToLocalStorage('Ansgiven', Ansgiven);
  };
  return input;
}

/* Large input box — used for the element-symbol slot in the isotope
   notation (the big "P" in the reference image). */
function buildBigBlankInput(questionIndex, blankIndex) {
  const val = (Ansgiven[questionIndex] && Ansgiven[questionIndex][blankIndex]) || '';
  const input = document.createElement('input');
  input.type = 'text';
  input.value = val;
  input.dataset.q = questionIndex;
  input.dataset.i = blankIndex;
  input.style.cssText = `
    width:70px; height:70px; font-size:2.4rem; font-weight:bold;
    text-align:center; border:2px solid black; border-radius:6px;
    margin:0; outline:none; padding:0;
  `;
  input.onfocus = () => { input.style.borderColor = '#f0a500'; };
  input.onblur  = () => { input.style.borderColor = '#D6B65B'; };
  input.oninput = (e) => {
    const qi = Number(e.target.dataset.q);
    const ii = Number(e.target.dataset.i);
    if (!Ansgiven[qi]) Ansgiven[qi] = [];
    Ansgiven[qi][ii] = e.target.value;
    saveToLocalStorage('Ansgiven', Ansgiven);
  };
  return input;
}

function buildFixedFracLabel(text) {
  const span = document.createElement('span');
  span.innerHTML = text;
  span.style.cssText = `
    font-size:1.9rem; text-align:center;
    min-width:80px; display:inline-block;
  `;
  return span;
}

function buildFixedSmallLabel(text) {
  const span = document.createElement('span');
  span.innerHTML = text;
  span.style.cssText = `
    font-size:1rem; min-width:30px; display:inline-block; line-height:1.2;
  `;
  return span;
}

function buildFixedBigLabel(text) {
  const span = document.createElement('span');
  span.innerHTML = text;
  span.style.cssText = `
    font-size:2.4rem; font-weight:bold; min-width:50px;
    display:inline-block; text-align:center;
  `;
  return span;
}

/* =============================================================================
   Misc helpers
   ============================================================================= */
function showPage(pageNumber) {
  const pages = document.getElementsByClassName('question-page');
  for (let i = 0; i < pages.length; i++) {
    pages[i].style.display = "none";
  }
  if (pages[pageNumber]) pages[pageNumber].style.display = "block";
}

function playOptionSound(soundPath) {
  const sound = new Audio(soundPath);
  sound.play();
}

function getOptionLabel(option) {
  return typeof option === 'string' ? option : option.text || '';
}