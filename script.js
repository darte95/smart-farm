(() => {
  'use strict';

  /* ---------- ตั้งค่า ---------- */
  const AUTO_REFRESH_MS = 3000;   // สุ่มค่าใหม่ทุกกี่ ms (0 = สุ่มครั้งเดียวตอนโหลด)
  const RANGES = {                // [ต่ำสุด, สูงสุด]
    temp:     [20, 40],           // °C
    humidity: [30, 95],           // %
    light:    [50, 999],          // cd
    water:    [1, 50],            // cm.
  };

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  /* ---------- 1) ตัวเลขสุ่ม ---------- */
  const sensors = [...document.querySelectorAll('.sensor')];

  function setValue(el, to) {
    const from = parseInt(el.textContent, 10) || 0;
    const start = performance.now();
    const dur = 500;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function randomizeAll(animate = true) {
    sensors.forEach((s) => {
      const el = s.querySelector('.value');
      const [min, max] = RANGES[s.dataset.key];
      const v = rand(min, max);
      animate ? setValue(el, v) : (el.textContent = v);
    });
  }

  randomizeAll(false);
  if (AUTO_REFRESH_MS > 0) setInterval(randomizeAll, AUTO_REFRESH_MS);

  /* ---------- 2) Toggle: กด / ลาก / คีย์บอร์ด ---------- */
  const STORAGE_KEY = 'smartfarm-toggles';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (_) {}
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch (_) {} };

  sensors.forEach((sensor) => {
    const key = sensor.dataset.key;
    const toggle = sensor.querySelector('.toggle');

    let on = false, dragging = false, moved = false;
    let startX = 0, startP = 0, travel = 1;

    const render = (p) => toggle.style.setProperty('--p', p);

    function setState(next, silent) {
      on = next;
      toggle.classList.toggle('on', on);
      sensor.classList.toggle('on', on);
      toggle.setAttribute('aria-checked', String(on));
      render(on ? 1 : 0);
      if (!silent) {
        saved[key] = on;
        save();
        document.dispatchEvent(new CustomEvent('toggle-change', { detail: { sensor: key, on } }));
      }
    }

    setState(!!saved[key], true);   // กู้คืนสถานะล่าสุด

    toggle.addEventListener('pointerdown', (e) => {
      toggle.setPointerCapture(e.pointerId);
      dragging = true;
      moved = false;
      startX = e.clientX;
      startP = on ? 1 : 0;
      travel = toggle.getBoundingClientRect().width * (104 / 163);
    });

    toggle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      if (!moved) return;
      toggle.classList.add('dragging');
      const p = Math.max(0, Math.min(1, startP + dx / travel));
      render(p);
      toggle.classList.toggle('on', p > 0.5);
      toggle.dataset.p = p;
    });

    const end = () => {
      if (!dragging) return;
      dragging = false;
      toggle.classList.remove('dragging');
      moved ? setState(parseFloat(toggle.dataset.p) > 0.5)   // ลาก -> snap ไปด้านที่ใกล้กว่า
            : setState(!on);                                  // คลิก -> สลับ
    };
    toggle.addEventListener('pointerup', end);
    toggle.addEventListener('pointercancel', end);

    toggle.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setState(!on); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setState(true); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); setState(false); }
    });
  });
})();