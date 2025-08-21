'use strict';

    // Storage keys
    const STORAGE_KEYS = {
      library: 'dt_v1_library',
      defaults: 'dt_v1_defaults',
      template: 'dt_v1_template',
      theme: 'dt_v1_theme',
      day: (dateStr) => `dt_v1_day_${dateStr}`,
    };
 
    // Defaults
    const DEFAULT_TARGETS = { calories: 2000, protein: 160, carbs: 165, fat: 41 };

    const DEFAULT_LIBRARY = [
      { name: 'Smoked Turkey (100 g)', calories: 100, protein: 16, carbs: 1, fat: 3 },
      { name: 'Kashkawan Cheese (50 g)', calories: 180, protein: 12, carbs: 1, fat: 14 },
      { name: 'Oat Loaf', calories: 140, protein: 5, carbs: 25, fat: 2 },
      { name: 'Chicken Breast (200 g, raw)', calories: 240, protein: 46, carbs: 0, fat: 4 },
      { name: 'Olive Oil (1 tsp, with chicken)', calories: 40, protein: 0, carbs: 0, fat: 4.5 },
      { name: 'Potato (300 g, raw)', calories: 258, protein: 7, carbs: 60, fat: 0.4 },
      { name: 'Taanayel Greek Yogurt Cup', calories: 128, protein: 10, carbs: 6, fat: 5 },
      { name: 'Tuna Can', calories: 145, protein: 24, carbs: 0, fat: 1 },
      { name: 'Olive Oil (1 tsp, with tuna)', calories: 40, protein: 0, carbs: 0, fat: 4.5 },
      { name: 'Lettuce (100 g)', calories: 15, protein: 1, carbs: 3, fat: 0 },
      { name: 'Banana (medium ~120 g)', calories: 105, protein: 1, carbs: 27, fat: 0 },
      { name: 'Apple (medium ~150 g)', calories: 95, protein: 0, carbs: 25, fat: 0 },
      { name: 'Almonds (15 g)', calories: 87, protein: 3, carbs: 3, fat: 7 },
      { name: 'Whey Protein (1 scoop)', calories: 130, protein: 30, carbs: 3, fat: 2 },
      { name: 'Lactose-Free Milk (250 ml)', calories: 117, protein: 8, carbs: 12, fat: 4 },
    ];

    // Utilities
    const qs = (sel, root = document) => root.querySelector(sel);
    const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
    const round1 = (n) => Math.round((Number(n) + Number.EPSILON) * 10) / 10;
    const round0 = (n) => Math.round(Number(n));

    function formatDateInputValue(date) {
      const pad = (n) => `${n}`.padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    function parseDateFromInput(value) {
      const [y, m, d] = value.split('-').map((v) => Number(v));
      const dt = new Date(y, m - 1, d);
      dt.setHours(0, 0, 0, 0);
      return dt;
    }

    // Data access
    function loadJson(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        if (!v) return fallback;
        return JSON.parse(v);
      } catch (e) {
        console.error('Failed to parse localStorage key', key, e);
        return fallback;
      }
    }

    function saveJson(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    }

    // Day model
    function makeItemFromLibraryEntry(entry) {
      return {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        name: entry.name,
        calories: Number(entry.calories),
        protein: Number(entry.protein),
        carbs: Number(entry.carbs),
        fat: Number(entry.fat),
        plannedServings: 1,
        consumedServings: 0,
      };
    }

    function makeNewDayFromLibrary(dateStr, library) {
      return {
        date: dateStr,
        items: library.map(makeItemFromLibraryEntry),
      };
    }

    function ensureDefaults() {
      const defaults = loadJson(STORAGE_KEYS.defaults, DEFAULT_TARGETS);
      const library = loadJson(STORAGE_KEYS.library, DEFAULT_LIBRARY);
      if (!localStorage.getItem(STORAGE_KEYS.defaults)) saveJson(STORAGE_KEYS.defaults, defaults);
      if (!localStorage.getItem(STORAGE_KEYS.library)) saveJson(STORAGE_KEYS.library, library);
    }

    function loadDay(dateStr) {
      const key = STORAGE_KEYS.day(dateStr);
      let day = loadJson(key, null);
      if (!day) {
        const library = loadJson(STORAGE_KEYS.library, DEFAULT_LIBRARY);
        day = makeNewDayFromLibrary(dateStr, library);
        saveJson(key, day);
      }
      return day;
    }

    function saveDay(day) {
      saveJson(STORAGE_KEYS.day(day.date), day);
    }

    // Calculations
    function calcConsumedTotals(day) {
      return day.items.reduce(
        (acc, it) => {
          const ratio = Number(it.consumedServings || 0);
          acc.calories += it.calories * ratio;
          acc.protein += it.protein * ratio;
          acc.carbs += it.carbs * ratio;
          acc.fat += it.fat * ratio;
          acc.plannedServings += Number(it.plannedServings || 0);
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0, plannedServings: 0 }
      );
    }

    // UI state
    let state = {
      dateStr: formatDateInputValue(new Date()),
      day: null,
      targets: { ...DEFAULT_TARGETS },
      library: [...DEFAULT_LIBRARY],
      theme: 'dark',
    };

    function loadAllState() {
      ensureDefaults();
      state.targets = loadJson(STORAGE_KEYS.defaults, DEFAULT_TARGETS);
      state.library = loadJson(STORAGE_KEYS.library, DEFAULT_LIBRARY);
      state.theme = loadJson(STORAGE_KEYS.theme, 'dark');
      state.day = loadDay(state.dateStr);
    }

    function setTheme(theme) {
      state.theme = theme;
      const root = document.documentElement;
      if (theme === 'light') {
        root.classList.add('light');
      } else {
        root.classList.remove('light');
      }
      saveJson(STORAGE_KEYS.theme, theme);
    }

    // Rendering
    function renderTargets() {
      qs('#targetCalories').value = state.targets.calories;
      qs('#targetProtein').value = state.targets.protein;
      qs('#targetCarbs').value = state.targets.carbs;
      qs('#targetFat').value = state.targets.fat;
    }

    function renderItemsTable() {
      const tbody = qs('#itemsTbody');
      tbody.innerHTML = '';
      const rowTpl = qs('#rowTemplate');

      for (const item of state.day.items) {
        const row = rowTpl.content.firstElementChild.cloneNode(true);
        row.dataset.id = item.id;

        const nameCell = row.querySelector('.name');
        nameCell.textContent = item.name;

        const plannedInput = row.querySelector('input.planned');
        plannedInput.value = item.plannedServings;

        row.querySelector('.kcal').textContent = item.calories;
        row.querySelector('.prot').textContent = item.protein;
        row.querySelector('.carbs').textContent = item.carbs;
        row.querySelector('.fat').textContent = item.fat;

        const eatCheck = row.querySelector('.eat-check');
        eatCheck.checked = item.consumedServings > 0;

        tbody.appendChild(row);
      }

      renderTotals();
    }

    function renderTotals() {
      const totals = calcConsumedTotals(state.day);
      qs('#totalCalories').textContent = round0(totals.calories);
      qs('#totalProtein').textContent = round1(totals.protein);
      qs('#totalCarbs').textContent = round1(totals.carbs);
      qs('#totalFat').textContent = round1(totals.fat);
      qs('#totalPlannedServings').textContent = round1(totals.plannedServings);

      // progress bars
      const kinds = [
        ['calories', totals.calories, state.targets.calories],
        ['protein', totals.protein, state.targets.protein],
        ['carbs', totals.carbs, state.targets.carbs],
        ['fat', totals.fat, state.targets.fat],
      ];
      for (const [kind, value, target] of kinds) {
        const wrap = qsa(`.progress-bar[data-kind="${kind}"]`)[0];
        const bar = wrap.querySelector('.bar');
        const pct = target > 0 ? clamp((value / target) * 100, 0, 140) : 0;
        bar.style.width = `${pct}%`;

        const valueLabel = qsa(`.progress-value[data-kind="${kind}"]`)[0];
        const units = kind === 'calories' ? 'kcal' : 'g';
        valueLabel.textContent = `${round1(value)} / ${target} ${units}`;
      }
    }

    function renderDate() {
      qs('#datePicker').value = state.dateStr;
    }

    function renderAll() {
      renderDate();
      renderTargets();
      renderItemsTable();
    }

    // Event handlers
    function onChangeTargets() {
      state.targets = {
        calories: Number(qs('#targetCalories').value || 0),
        protein: Number(qs('#targetProtein').value || 0),
        carbs: Number(qs('#targetCarbs').value || 0),
        fat: Number(qs('#targetFat').value || 0),
      };
      renderTotals();
    }

    function attachEvents() {
      // Theme toggle
      qs('#themeToggle').addEventListener('click', () => {
        setTheme(state.theme === 'dark' ? 'light' : 'dark');
      });

      // Targets
      ['#targetCalories','#targetProtein','#targetCarbs','#targetFat'].forEach((sel) => {
        qs(sel).addEventListener('input', onChangeTargets);
      });
      qs('#saveTargetsBtn').addEventListener('click', () => {
        saveJson(STORAGE_KEYS.defaults, state.targets);
        // Show feedback
        const btn = qs('#saveTargetsBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Saved!';
        setTimeout(() => btn.textContent = originalText, 1000);
      });
      qs('#resetTargetsBtn').addEventListener('click', () => {
        state.targets = loadJson(STORAGE_KEYS.defaults, DEFAULT_TARGETS);
        renderTargets();
        renderTotals();
      });

      // Date
      qs('#datePicker').addEventListener('change', (e) => {
        const newDateStr = e.target.value;
        if (!newDateStr) return;
        state.dateStr = newDateStr;
        state.day = loadDay(state.dateStr);
        renderAll();
      });
      qs('#todayBtn').addEventListener('click', () => {
        const todayStr = formatDateInputValue(new Date());
        state.dateStr = todayStr;
        state.day = loadDay(state.dateStr);
        renderAll();
      });

      // Table interactions (event delegation)
      qs('#itemsTbody').addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;
        const id = row.dataset.id;
        const item = state.day.items.find((x) => x.id === id);
        if (!item) return;

        if (e.target.classList.contains('remove')) {
          if (confirm('Remove this food item?')) {
            state.day.items = state.day.items.filter((x) => x.id !== id);
            saveDay(state.day);
            renderItemsTable();
          }
          return;
        }
        if (e.target.classList.contains('consume-half')) {
          item.consumedServings = round1(item.plannedServings * 0.5);
          saveDay(state.day);
          renderItemsTable();
          return;
        }
        if (e.target.classList.contains('consume-full')) {
          item.consumedServings = Number(item.plannedServings || 0);
          saveDay(state.day);
          renderItemsTable();
          return;
        }
        if (e.target.classList.contains('minus')) {
          item.plannedServings = Math.max(0, round1(Number(item.plannedServings) - 0.5));
          if (item.consumedServings > item.plannedServings) {
            item.consumedServings = item.plannedServings;
          }
          saveDay(state.day);
          renderItemsTable();
          return;
        }
        if (e.target.classList.contains('plus')) {
          item.plannedServings = round1(Number(item.plannedServings) + 0.5);
          saveDay(state.day);
          renderItemsTable();
          return;
        }
      });

      qs('#itemsTbody').addEventListener('input', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;
        const id = row.dataset.id;
        const item = state.day.items.find((x) => x.id === id);
        if (!item) return;

        if (e.target.classList.contains('planned')) {
          item.plannedServings = Math.max(0, Number(e.target.value || 0));
          if (item.consumedServings > item.plannedServings) {
            item.consumedServings = item.plannedServings;
          }
          saveDay(state.day);
          renderItemsTable();
        }
      });

      qs('#itemsTbody').addEventListener('change', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;
        const id = row.dataset.id;
        const item = state.day.items.find((x) => x.id === id);
        if (!item) return;

        if (e.target.classList.contains('eat-check')) {
          const checked = e.target.checked;
          item.consumedServings = checked ? Number(item.plannedServings || 0) : 0;
          saveDay(state.day);
          renderItemsTable();
        }
      });

      // Add item dialog
      const dialog = qs('#itemDialog');
      const form = qs('#itemForm');
      
      qs('#addItemBtn').addEventListener('click', () => {
        form.reset();
        form.elements['plannedServings'].value = 1;
        dialog.showModal();
      });
      
      // Handle form submission
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        const entry = {
          name: String(data.name).trim(),
          calories: Number(data.calories || 0),
          protein: Number(data.protein || 0),
          carbs: Number(data.carbs || 0),
          fat: Number(data.fat || 0),
        };
        const item = makeItemFromLibraryEntry(entry);
        item.plannedServings = Number(data.plannedServings || 1);
        state.day.items.push(item);
        saveDay(state.day);

        // Always save to library
        {
          const exists = state.library.some((x) => x.name.toLowerCase() === entry.name.toLowerCase());
          if (!exists) {
            state.library.push(entry);
            saveJson(STORAGE_KEYS.library, state.library);
          }
        }

        renderItemsTable();
        dialog.close();
      });

      // Handle cancel button
      form.querySelector('[value="cancel"]').addEventListener('click', () => {
        dialog.close();
      });

      // Template
      qs('#saveTemplateBtn').addEventListener('click', () => {
        const template = state.day.items.map((it) => ({
          name: it.name,
          calories: it.calories,
          protein: it.protein,
          carbs: it.carbs,
          fat: it.fat,
          plannedServings: it.plannedServings,
        }));
        saveJson(STORAGE_KEYS.template, template);
        const btn = qs('#saveTemplateBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Saved!';
        setTimeout(() => btn.textContent = originalText, 1000);
      });

      qs('#loadTemplateBtn').addEventListener('click', () => {
        const template = loadJson(STORAGE_KEYS.template, null);
        if (!template) {
          alert('No template found. Save a template first.');
          return;
        }
        if (confirm('Load template? This will replace current items.')) {
          state.day.items = template.map((t) => {
            const it = makeItemFromLibraryEntry(t);
            it.plannedServings = Number(t.plannedServings || 1);
            return it;
          });
          saveDay(state.day);
          renderItemsTable();
        }
      });

      // Reset day
      qs('#resetDayBtn').addEventListener('click', () => {
        if (confirm('Reset today\'s plan? This cannot be undone.')) {
          state.day = makeNewDayFromLibrary(state.dateStr, state.library);
          saveDay(state.day);
          renderAll();
        }
      });

      // Prevent form submission on enter in number inputs
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.type === 'number') {
          e.target.blur();
        }
      });
    }

    // Init
    function init() {
      state.dateStr = formatDateInputValue(new Date());
      loadAllState();
      setTheme(state.theme);
      renderAll();
      attachEvents();
      
      // Add loading class removal after initial render
      setTimeout(() => {
        document.body.classList.add('loaded');
      }, 100);
    }

    window.addEventListener('DOMContentLoaded', init);