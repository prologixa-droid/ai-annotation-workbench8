(function() {
  // ============ CONFIGURATION ============
  const TOTAL_IMAGES_PER_SESSION = 50;
  const IMAGE_WIDTH = 1600;
  const IMAGE_HEIGHT = 1067;

  // ============ SESSION STATE ============
  let sessionStartTime = Date.now();
  let currentImageIndex = 0;
  let annotations = [];
  let currentClass = 'car';
  let currentTool = 'bbox';
  let isDrawing = false;
  let startX, startY;
  let imageStartTime = Date.now();
  let imageCommentary = ''; // Commentary for current image
  let allCommentaries = []; // Store all commentaries for session
  let customClassLabel = ''; // Label for custom class box
  let canvasScale = { x: 1, y: 1 }; // Current canvas scale vs original image dims

  let completedCount = 0;
  let sessionScores = [];
  let excellentCount = 0;
  let goodCount = 0;
  let poorCount = 0;
  let customLabelCount = 0; // Track total custom labels used in session

  // Generate today's batch ID from date
  const today = new Date();
  const batchId = '' + today.getFullYear() + String(today.getMonth()+1).padStart(2,'0') + String(today.getDate()).padStart(2,'0');

  // Generate 50 unique high-res image URLs based on today's date
  function generateDailyImages() {
    const images = [];
    const keywords = ['street','city','road','traffic','highway','intersection','avenue','downtown','crosswalk','pedestrian'];
    for (let i = 0; i < TOTAL_IMAGES_PER_SESSION; i++) {
      const seed = batchId + '_' + i;
      const keyword = keywords[i % keywords.length];
      images.push({
        id: i + 1,
        name: keyword + '_' + String(i+1).padStart(3,'0') + '.jpg',
        url: 'https://picsum.photos/seed/' + seed + '/' + IMAGE_WIDTH + '/' + IMAGE_HEIGHT,
        type: 'Bounding Box'
      });
    }
    return images;
  }

  const imageData = generateDailyImages();

  // ============ EXPANDED CLASS DEFINITIONS ============
  const classColors = {
    custom: '#f97316',
    car: '#3b82f6', truck: '#f59e0b', pedestrian: '#22c55e',
    cyclist: '#a855f7', traffic_light: '#ef4444',
    tree: '#15803d', flower: '#ec4899', mountain: '#78716c',
    building: '#6366f1', bench: '#92400e', dog: '#d97706',
    cat: '#0d9488', bird: '#06b6d4', sign: '#dc2626',
    bus: '#7c3aed', motorcycle: '#f97316', fire_hydrant: '#b91c1c',
    parking_meter: '#475569', stop_sign: '#991b1b', bridge: '#64748b',
    river: '#0ea5e9', lake: '#0284c7', cloud: '#94a3b8',
    fence: '#a16207', mailbox: '#c2410c', trash_can: '#374151'
  };
  const classNames = {
    custom: 'Custom',
    car: 'Car', truck: 'Truck', pedestrian: 'Pedestrian',
    cyclist: 'Cyclist', traffic_light: 'Traffic Light',
    tree: 'Tree', flower: 'Flower', mountain: 'Mountain',
    building: 'Building', bench: 'Bench', dog: 'Dog',
    cat: 'Cat', bird: 'Bird', sign: 'Street Sign',
    bus: 'Bus', motorcycle: 'Motorcycle', fire_hydrant: 'Fire Hydrant',
    parking_meter: 'Parking Meter', stop_sign: 'Stop Sign', bridge: 'Bridge',
    river: 'River', lake: 'Lake', cloud: 'Cloud',
    fence: 'Fence', mailbox: 'Mailbox', trash_can: 'Trash Can'
  };
  const classDescriptions = {
    custom: 'User-defined object class',
    car: '4-wheel passenger vehicle',
    truck: 'Commercial freight vehicle',
    pedestrian: 'Person walking',
    cyclist: 'Bike/motorcycle rider',
    traffic_light: 'Traffic signal device',
    tree: 'Any standing woody plant',
    flower: 'Flowering plant or bush',
    mountain: 'Large natural elevation',
    building: 'Man-made structure with walls',
    bench: 'Public seating furniture',
    dog: 'Domestic canine animal',
    cat: 'Domestic feline animal',
    bird: 'Flying avian creature',
    sign: 'Road/street informational sign',
    bus: 'Public transit vehicle',
    motorcycle: '2-wheel motorized vehicle',
    fire_hydrant: 'Red roadside water access',
    parking_meter: 'Coin-operated parking device',
    stop_sign: 'Octagonal red traffic sign',
    bridge: 'Structure spanning obstacle',
    river: 'Natural flowing waterway',
    lake: 'Large inland body of water',
    cloud: 'Visible atmospheric vapor',
    fence: 'Barrier structure',
    mailbox: 'Postal delivery receptacle',
    trash_can: 'Public waste container'
  };
  const classShortcuts = {
    custom: 'Z',
    car: '1', truck: '2', pedestrian: '3', cyclist: '4', traffic_light: '5',
    tree: '6', flower: '7', mountain: '8', building: '9', bench: '0',
    dog: 'Q', cat: 'W', bird: 'E', sign: 'R', bus: 'T',
    motorcycle: 'Y', fire_hydrant: 'U', parking_meter: 'I', stop_sign: 'O', bridge: 'P',
    river: 'A', lake: 'S', cloud: 'D', fence: 'F', mailbox: 'G', trash_can: 'H'
  };

  // ============ DOM ELEMENTS ============
  const canvas = document.getElementById('annotationCanvas');
  const ctx = canvas.getContext('2d');
  const imageLoader = document.getElementById('imageLoader');
  const canvasContainer = document.getElementById('canvasContainer');
  const commentaryInput = document.getElementById('commentaryInput');
  const commentaryCount = document.getElementById('commentaryCount');
  const commentaryBadge = document.getElementById('commentaryBadge');

  // ============ CLOCK ============
  function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString('en-US', {hour12: false});
  }
  setInterval(updateClock, 1000);
  updateClock();

  // ============ STATS UPDATE ============
  function updateStats() {
    document.getElementById('statCompleted').textContent = completedCount;

    if (sessionScores.length > 0) {
      const avgPrecision = sessionScores.reduce((a,b) => a + b.precision, 0) / sessionScores.length;
      document.getElementById('statAccuracy').textContent = avgPrecision.toFixed(1) + '%';
    } else {
      document.getElementById('statAccuracy').textContent = '--';
    }

    const hours = ((Date.now() - sessionStartTime) / 3600000).toFixed(1);
    document.getElementById('statTime').textContent = hours + 'h';

    const progress = Math.floor((completedCount / TOTAL_IMAGES_PER_SESSION) * 100);
    document.getElementById('projectProgress').style.width = progress + '%';
    document.getElementById('progressText').textContent = progress + '%';
  }

  // ============ RESPONSIVE CANVAS SIZING ============
  function fitCanvasToContainer() {
    const container = canvasContainer.parentElement;
    const containerW = container.clientWidth - 16; // padding
    const containerH = container.clientHeight - 16;

    const imgRatio = IMAGE_WIDTH / IMAGE_HEIGHT;
    const containerRatio = containerW / containerH;

    let w, h;
    if (imgRatio > containerRatio) {
      w = containerW;
      h = w / imgRatio;
    } else {
      h = containerH;
      w = h * imgRatio;
    }

    // Ensure minimum size
    w = Math.max(w, 400);
    h = Math.max(h, 300);

    // Cap at container
    w = Math.min(w, containerW);
    h = Math.min(h, containerH);

    // Calculate scale factors for annotation coordinate conversion
    canvasScale.x = w / IMAGE_WIDTH;
    canvasScale.y = h / IMAGE_HEIGHT;

    canvasContainer.style.width = w + 'px';
    canvasContainer.style.height = h + 'px';
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    return { width: w, height: h };
  }

  // ============ COMMENTARY ============
  function updateCommentaryUI() {
    const len = imageCommentary.length;
    commentaryCount.textContent = len + '/500';
    if (len > 0) {
      commentaryCount.classList.add('text-blue-600');
      commentaryCount.classList.remove('text-slate-400');
      commentaryBadge.style.display = 'inline-flex';
    } else {
      commentaryCount.classList.remove('text-blue-600');
      commentaryCount.classList.add('text-slate-400');
      commentaryBadge.style.display = 'none';
    }
  }

  commentaryInput.addEventListener('input', function() {
    imageCommentary = this.value;
    updateCommentaryUI();
  });

  // ============ IMAGE LOADING ============
  let currentImage = null;

  function loadImage(index) {
    // Save previous image's commentary before switching
    if (currentImageIndex !== undefined && allCommentaries[currentImageIndex] === undefined) {
      allCommentaries[currentImageIndex] = imageCommentary;
    }

    currentImageIndex = index;
    annotations = [];
    imageStartTime = Date.now();

    // Load saved commentary or reset
    imageCommentary = allCommentaries[index] || '';
    commentaryInput.value = imageCommentary;
    updateCommentaryUI();

    updateAnnotationList();

    const data = imageData[index];
    document.getElementById('imageName').textContent = data.name;
    document.getElementById('imageNum').textContent = String(index + 1).padStart(3, '0');
    document.getElementById('imageCounter').textContent = (index + 1) + ' / ' + TOTAL_IMAGES_PER_SESSION;
    document.getElementById('canvasOverlay').style.display = 'flex';

    imageLoader.style.display = 'block';

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      currentImage = img;
      imageLoader.style.display = 'none';

      const dims = fitCanvasToContainer();

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      updateTaskQueue();
    };
    img.onerror = function() {
      imageLoader.style.display = 'none';
      const dims = fitCanvasToContainer();
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Image loading failed. Please refresh.', canvas.width/2, canvas.height/2);
    };
    img.src = data.url;
  }

  function updateTaskQueue() {
    const queueEl = document.getElementById('taskQueue');
    queueEl.innerHTML = '';
    imageData.forEach((img, idx) => {
      const status = idx < currentImageIndex ? 'done' : idx === currentImageIndex ? 'active' : 'pending';
      const hasComment = allCommentaries[idx] && allCommentaries[idx].length > 0;
      const div = document.createElement('div');
      div.className = 'flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer transition-colors ' + 
        (status === 'active' ? 'bg-blue-50 border border-blue-200' : status === 'done' ? 'opacity-60' : 'hover:bg-slate-50 border border-transparent');
      div.innerHTML = '<div class="w-1.5 h-1.5 rounded-full ' + 
        (status === 'active' ? 'bg-blue-500 animate-pulse' : status === 'done' ? 'bg-green-400' : 'bg-slate-300') + '"></div>' +
        '<div class="flex-1 min-w-0"><div class="font-medium text-slate-700 truncate">' + img.name + '</div>' +
        '<div class="text-xs text-slate-400">' + img.type + (hasComment ? ' &bull; <span class=\'text-blue-500\'>note</span>' : '') + '</div></div>' +
        (status === 'active' ? '<span class="text-xs bg-blue-100 text-blue-700 px-1 py-0 rounded">Active</span>' : 
         status === 'done' ? '<span class="text-xs bg-green-100 text-green-700 px-1 py-0 rounded">Done</span>' : '');
      div.addEventListener('click', () => {
        if (status !== 'done') loadImage(idx);
      });
      queueEl.appendChild(div);
    });
  }

  // ============ CANVAS ANNOTATION ============
  function redrawCanvas() {
    if (!currentImage) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
    annotations.forEach(a => drawAnnotation(a));
  }

  canvas.addEventListener('mousedown', e => {
    if (currentTool !== 'bbox') return;
    const rect = canvas.getBoundingClientRect();
    isDrawing = true;
    // Store normalized coordinates (0-1 relative to image dimensions)
    startX = ((e.clientX - rect.left) * (canvas.width / rect.width)) / canvasScale.x;
    startY = ((e.clientY - rect.top) * (canvas.height / rect.height)) / canvasScale.y;
  });

  canvas.addEventListener('mousemove', e => {
    if (!isDrawing || currentTool !== 'bbox') return;
    const rect = canvas.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) * (canvas.width / rect.width)) / canvasScale.x;
    const currentY = ((e.clientY - rect.top) * (canvas.height / rect.height)) / canvasScale.y;

    redrawCanvas();

    ctx.strokeStyle = classColors[currentClass];
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(startX * canvasScale.x, startY * canvasScale.y, (currentX - startX) * canvasScale.x, (currentY - startY) * canvasScale.y);
    ctx.setLineDash([]);
    ctx.fillStyle = classColors[currentClass] + '40';
    ctx.fillRect(startX * canvasScale.x, startY * canvasScale.y, (currentX - startX) * canvasScale.x, (currentY - startY) * canvasScale.y);
  });

  canvas.addEventListener('mouseup', e => {
    if (!isDrawing || currentTool !== 'bbox') return;
    isDrawing = false;
    const rect = canvas.getBoundingClientRect();
    // Normalize end coordinates to image dimensions (0-1 scale)
    const endX = ((e.clientX - rect.left) * (canvas.width / rect.width)) / canvasScale.x;
    const endY = ((e.clientY - rect.top) * (canvas.height / rect.height)) / canvasScale.y;

    if (Math.abs(endX - startX) > 10 / canvasScale.x && Math.abs(endY - startY) > 10 / canvasScale.y) {
      let customLabel = '';
      if (currentClass === 'custom') {
        customLabel = prompt('Enter a label for this custom object (max 30 characters):', '');
        if (customLabel === null) {
          redrawCanvas();
          return;
        }
        customLabel = customLabel.trim().substring(0, 30);
        if (customLabel.length === 0) {
          showToast('Custom label required. Box discarded.');
          redrawCanvas();
          return;
        }
      }
      const ann = {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        w: Math.abs(endX - startX),
        h: Math.abs(endY - startY),
        class: currentClass,
        customLabel: customLabel,
        id: Date.now()
      };
      annotations.push(ann);
      updateAnnotationList();
      showToast('Added ' + (customLabel || classNames[currentClass]) + ' bounding box');
      document.getElementById('canvasOverlay').style.display = 'none';
    }
    redrawCanvas();
  });

  function drawAnnotation(a) {
    // Scale normalized coordinates (0-1) to current canvas pixels
    const sx = a.x * canvasScale.x;
    const sy = a.y * canvasScale.y;
    const sw = a.w * canvasScale.x;
    const sh = a.h * canvasScale.y;

    ctx.strokeStyle = classColors[a.class];
    ctx.lineWidth = 2;
    if (a.class === 'custom') {
      ctx.setLineDash([6, 4]);
    }
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.setLineDash([]);
    ctx.fillStyle = classColors[a.class] + '30';
    ctx.fillRect(sx, sy, sw, sh);

    const labelText = a.class === 'custom' && a.customLabel ? a.customLabel : classNames[a.class];
    const labelWidth = ctx.measureText(labelText).width + 12;
    ctx.fillStyle = classColors[a.class];
    ctx.fillRect(sx, sy - 20, labelWidth, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.fillText(labelText, sx + 6, sy - 5);
  }

  function updateAnnotationList() {
    const list = document.getElementById('annotationList');
    if (annotations.length === 0) {
      list.innerHTML = '<div class="text-xs text-slate-400 italic">No annotations yet. Draw a box to begin.</div>';
      // FIX: Show overlay when all annotations are cleared
      document.getElementById('canvasOverlay').style.display = 'flex';
      return;
    }
    list.innerHTML = annotations.map(a => {
      const displayName = a.class === 'custom' && a.customLabel ? a.customLabel : classNames[a.class];
      const isCustom = a.class === 'custom';
      return '<div class="flex items-center gap-1.5 text-xs p-1 rounded hover:bg-slate-100 group animate-slide-in">' +
      '<div class="w-2.5 h-2.5 rounded shrink-0" style="background:' + classColors[a.class] + '"></div>' +
      '<span class="flex-1 font-medium text-slate-700 truncate' + (isCustom ? ' text-orange-600' : '') + '">' + displayName + '</span>' +
      '<span class="text-xs text-slate-400 font-mono">' + Math.round(a.x * canvasScale.x) + ',' + Math.round(a.y * canvasScale.y) + '</span>' +
      '<button onclick="window.deleteAnnotation(' + a.id + ')" class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">' +
      '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button></div>';
    }).join('');
  }

  window.deleteAnnotation = function(id) {
    annotations = annotations.filter(a => a.id !== id);
    redrawCanvas();
    updateAnnotationList();
  };

  // ============ TOOL & CLASS SWITCHING ============
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn').forEach(b => {
        b.classList.remove('active', 'border-blue-500', 'bg-blue-50', 'text-blue-600');
        b.classList.add('border-slate-200', 'text-slate-500');
      });
      btn.classList.add('active', 'border-blue-500', 'bg-blue-50', 'text-blue-600');
      btn.classList.remove('border-slate-200', 'text-slate-500');
      currentTool = btn.dataset.tool;

      if (btn.dataset.tool === 'erase') {
        annotations = [];
        redrawCanvas();
        updateAnnotationList();
        showToast('All annotations cleared');
        document.querySelector('.tool-btn[data-tool="bbox"]').click();
      }
    });
  });

  document.querySelectorAll('.class-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.class-btn').forEach(b => {
        b.classList.remove('border-blue-500', 'bg-blue-50');
        b.classList.add('border-transparent');
      });
      btn.classList.add('border-blue-500', 'bg-blue-50');
      btn.classList.remove('border-transparent');
      currentClass = btn.dataset.class;
    });
  });

  // ============ KEYBOARD SHORTCUTS ============
  document.addEventListener('keydown', e => {
    // Don't trigger shortcuts when typing in inputs or modals are open
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (!document.getElementById('reviewModal').classList.contains('hidden')) return;
    if (!document.getElementById('finalReportModal').classList.contains('hidden')) return;
    if (!document.getElementById('helpModal').classList.contains('hidden')) return;

    const key = e.key.toUpperCase();

    // Class shortcuts
    for (const [cls, shortcut] of Object.entries(classShortcuts)) {
      if (key === shortcut) {
        const btn = document.querySelector('.class-btn[data-class="' + cls + '"]');
        if (btn) btn.click();
        e.preventDefault();
        return;
      }
    }

    // Navigation shortcuts
    if (key === 'ARROWLEFT' || key === 'P') {
      document.getElementById('prevBtn').click();
      e.preventDefault();
    } else if (key === 'ARROWRIGHT' || key === 'N') {
      document.getElementById('nextBtn').click();
      e.preventDefault();
    } else if (key === 'S') {
      document.getElementById('skipBtn').click();
      e.preventDefault();
    } else if (key === 'ENTER' || key === ' ') {
      document.getElementById('submitBtn').click();
      e.preventDefault();
    } else if (key === 'E') {
      document.querySelector('.tool-btn[data-tool="erase"]').click();
      e.preventDefault();
    }
  });

  // ============ NAVIGATION ============
  document.getElementById('nextBtn').addEventListener('click', () => {
    if (currentImageIndex < TOTAL_IMAGES_PER_SESSION - 1) loadImage(currentImageIndex + 1);
  });

  document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentImageIndex > 0) loadImage(currentImageIndex - 1);
  });

  document.getElementById('skipBtn').addEventListener('click', () => {
    showToast('Image skipped');
    if (currentImageIndex < TOTAL_IMAGES_PER_SESSION - 1) {
      loadImage(currentImageIndex + 1);
    } else {
      showFinalReport();
    }
  });

  // ============ HELP MODAL ============
  document.getElementById('helpBtn').addEventListener('click', () => {
    document.getElementById('helpModal').classList.remove('hidden');
    document.getElementById('helpModal').classList.add('flex');
  });

  document.getElementById('closeHelp').addEventListener('click', () => {
    document.getElementById('helpModal').classList.add('hidden');
    document.getElementById('helpModal').classList.remove('flex');
  });

  // ============ IMPROVED PRECISION CALCULATION ============
  // Deterministic pseudo-random based on image seed for consistency
  function seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function getImageSeed(index) {
    return parseInt(batchId) * 1000 + index;
  }

  function calculatePrecision(imageIndex, annotationCount, annotations) {
    const seed = getImageSeed(imageIndex);

    // Deterministic expected objects based on image content type
    const imageType = imageIndex % 10; // 0-9 based on keyword cycle
    const baseExpected = [3, 5, 4, 6, 2, 4, 5, 3, 7, 4][imageType];
    const variance = Math.floor(seededRandom(seed + 1) * 3); // 0-2
    const expectedObjects = baseExpected + variance;

    // Calculate count-based precision
    let countPrecision = 0;
    if (annotationCount > 0) {
      const countRatio = Math.min(annotationCount / expectedObjects, expectedObjects / annotationCount);
      countPrecision = Math.floor(countRatio * 70); // Count is worth up to 70%
    }

    // Calculate size-based precision (boxes should be reasonably sized)
    let sizePrecision = 0;
    if (annotations.length > 0) {
      const validSizes = annotations.filter(a => {
        const areaRatio = (a.w * a.h) / (canvas.width * canvas.height);
        // Boxes should be between 0.1% and 30% of image area
        return areaRatio >= 0.001 && areaRatio <= 0.3;
      }).length;
      sizePrecision = Math.floor((validSizes / annotations.length) * 15); // Size is worth up to 15%
    }

    // Calculate diversity bonus (using multiple classes)
    let diversityPrecision = 0;
    if (annotations.length > 0) {
      const uniqueClasses = new Set(annotations.map(a => a.class)).size;
      const diversityRatio = Math.min(uniqueClasses / Math.min(expectedObjects, 5), 1);
      diversityPrecision = Math.floor(diversityRatio * 10); // Diversity is worth up to 10%
    }

    // Time factor (not too fast, not too slow)
    const timeSpent = Math.floor((Date.now() - imageStartTime) / 1000);
    let timePrecision = 0;
    const idealTime = expectedObjects * 15; // ~15s per object
    if (timeSpent >= idealTime * 0.3 && timeSpent <= idealTime * 3) {
      timePrecision = 5; // Time is worth 5%
    } else if (timeSpent >= idealTime * 0.1) {
      timePrecision = 2;
    }

    // Commentary bonus (up to 5% for writing a description)
    let commentaryPrecision = 0;
    if (imageCommentary && imageCommentary.trim().length > 20) {
      commentaryPrecision = 5;
    } else if (imageCommentary && imageCommentary.trim().length > 0) {
      commentaryPrecision = 2;
    }

    // Custom class bonus (up to 8% for using custom labels)
    let customPrecision = 0;
    const customAnnotations = annotations.filter(a => a.class === 'custom' && a.customLabel && a.customLabel.trim().length > 0);
    if (customAnnotations.length > 0) {
      customPrecision = Math.min(8, customAnnotations.length * 4); // +4% per custom box, max 8%
    }

    // Base minimum if any annotations exist
    const basePrecision = annotationCount > 0 ? 5 : 0;

    let precision = basePrecision + countPrecision + sizePrecision + diversityPrecision + timePrecision + commentaryPrecision + customPrecision;

    // Add small deterministic variation based on image seed (±3)
    const seedVariation = Math.floor(seededRandom(seed + 99) * 7) - 3;
    precision += seedVariation;

    // Clamp to 0-100
    precision = Math.min(100, Math.max(0, precision));

    return { precision, expectedObjects, timeSpent };
  }

  // ============ SUBMIT & REVIEW ============
  document.getElementById('submitBtn').addEventListener('click', () => {
    // Save current commentary before submitting
    allCommentaries[currentImageIndex] = imageCommentary;

    const { precision, expectedObjects, timeSpent } = calculatePrecision(
      currentImageIndex, 
      annotations.length, 
      annotations
    );

    // Time bonus
    const timeBonus = timeSpent < 60 ? 10 : timeSpent < 120 ? 5 : 0;
    const imageScore = Math.min(100, precision + timeBonus);

    sessionScores.push({ precision: precision, time: timeSpent, score: imageScore });
    if (precision >= 90) excellentCount++;
    else if (precision >= 70) goodCount++;
    else poorCount++;
    // Count custom labels in this image
    const imageCustomCount = annotations.filter(a => a.class === 'custom' && a.customLabel).length;
    customLabelCount += imageCustomCount;

    completedCount++;
    updateStats();

    const modal = document.getElementById('reviewModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    document.getElementById('reviewObjects').textContent = annotations.length + ' / ' + expectedObjects;
    document.getElementById('reviewPrecision').textContent = precision + '%';
    document.getElementById('reviewPrecision').className = 'font-medium ' + (precision >= 90 ? 'text-green-600' : precision >= 70 ? 'text-amber-600' : 'text-red-600');
    document.getElementById('reviewTime').textContent = timeSpent + 's';
    const reviewCustom = annotations.filter(a => a.class === 'custom' && a.customLabel).length;
    document.getElementById('reviewCustomCount').textContent = reviewCustom + (reviewCustom === 1 ? ' label' : ' labels') + ' (+4% each)';
    document.getElementById('reviewScore').textContent = imageScore + '/100';

    // Show commentary in review if exists
    const reviewCommentaryEl = document.getElementById('reviewCommentary');
    if (imageCommentary && imageCommentary.trim().length > 0) {
      reviewCommentaryEl.textContent = imageCommentary.trim();
      reviewCommentaryEl.parentElement.style.display = 'block';
    } else {
      reviewCommentaryEl.parentElement.style.display = 'none';
    }

    if (precision >= 90) {
      document.getElementById('reviewIcon').className = 'w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center';
      document.getElementById('reviewIcon').innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
      document.getElementById('reviewTitle').textContent = 'Excellent Work!';
      document.getElementById('reviewTitle').className = 'font-semibold text-sm text-green-700';
      document.getElementById('reviewSubtitle').textContent = 'Annotations meet quality standards.';
    } else if (precision >= 70) {
      document.getElementById('reviewIcon').className = 'w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center';
      document.getElementById('reviewIcon').innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
      document.getElementById('reviewTitle').textContent = 'Good Job';
      document.getElementById('reviewTitle').className = 'font-semibold text-sm text-amber-700';
      document.getElementById('reviewSubtitle').textContent = 'Decent work, room for improvement.';
    } else {
      document.getElementById('reviewIcon').className = 'w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center';
      document.getElementById('reviewIcon').innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
      document.getElementById('reviewTitle').textContent = 'Needs Improvement';
      document.getElementById('reviewTitle').className = 'font-semibold text-sm text-red-700';
      document.getElementById('reviewSubtitle').textContent = 'Please review the guidelines.';
    }
  });

  document.getElementById('closeReview').addEventListener('click', () => {
    document.getElementById('reviewModal').classList.add('hidden');
    document.getElementById('reviewModal').classList.remove('flex');
  });

  document.getElementById('continueBtn').addEventListener('click', () => {
    document.getElementById('reviewModal').classList.add('hidden');
    document.getElementById('reviewModal').classList.remove('flex');

    if (completedCount >= TOTAL_IMAGES_PER_SESSION) {
      showFinalReport();
    } else if (currentImageIndex < TOTAL_IMAGES_PER_SESSION - 1) {
      loadImage(currentImageIndex + 1);
      showToast('Loading next image...');
    }
  });

  // ============ FINAL REPORT ============
  function showFinalReport() {
    const modal = document.getElementById('finalReportModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const totalPrecision = sessionScores.reduce((a,b) => a + b.precision, 0);
    const avgPrecision = sessionScores.length > 0 ? (totalPrecision / sessionScores.length).toFixed(1) : '0.0';
    const totalScore = sessionScores.reduce((a,b) => a + b.score, 0);
    const hours = ((Date.now() - sessionStartTime) / 3600000).toFixed(1);

    document.getElementById('finalAccuracy').textContent = avgPrecision + '%';
    document.getElementById('finalScore').textContent = totalScore.toLocaleString();
    document.getElementById('finalCompleted').textContent = completedCount;
    document.getElementById('finalTime').textContent = hours + 'h';
    document.getElementById('excellentCount').textContent = excellentCount;
    document.getElementById('goodCount').textContent = goodCount;
    document.getElementById('poorCount').textContent = poorCount;

    // Count images with commentary
    const commentedCount = allCommentaries.filter(c => c && c.trim().length > 0).length;
    document.getElementById('finalCommented').textContent = commentedCount;
    document.getElementById('finalCustomCount').textContent = customLabelCount;

    for (let i = 0; i < 50; i++) {
      setTimeout(() => createConfetti(), i * 50);
    }
  }

  function createConfetti() {
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899'];
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 4000);
  }

  // ============ RESTART SESSION ============
  document.getElementById('restartBtn').addEventListener('click', () => {
    window.location.reload();
  });

  // ============ TOAST ============
  function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
  }

  // ============ WINDOW RESIZE ============
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (currentImage) {
        fitCanvasToContainer();
        redrawCanvas();
      }
    }, 200);
  });

  // ============ INITIALIZE ============
  document.getElementById('batchId').textContent = batchId;
  document.getElementById('imageBatchId').textContent = batchId;
  document.getElementById('totalImagesDisplay').textContent = TOTAL_IMAGES_PER_SESSION;
  updateStats();
  loadImage(0);
})();
