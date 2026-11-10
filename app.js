(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const money = new Intl.NumberFormat("ru-RU");

  /* ---------- header / progress ---------- */
  const header = $("#siteHeader");
  const progress = $("#progressBar");
  let ticking = false;

  function onScroll() {
    const y = window.scrollY || document.documentElement.scrollTop;
    header.classList.toggle("is-scrolled", y > 40);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + "%";
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  const burger = $("#burger");
  const nav = $("#mainNav");
  function closeMenu() {
    nav.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("is-locked", "is-menu-open");
  }
  burger.addEventListener("click", () => {
    const open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    document.body.classList.toggle("is-locked", open);
    document.body.classList.toggle("is-menu-open", open);
  });
  $$("a", nav).forEach(a => a.addEventListener("click", closeMenu));

  /* ---------- reveal ---------- */
  const revealTargets = [
    ...$$(".section__head, .scope, .program, .scale__card, .case, .package, .calc, .venue, .process__step, .guarantee, .review, .person, .faq__list, .cta__copy, .cta__actions")
  ];
  revealTargets.forEach((el, i) => {
    el.classList.add("reveal");
    el.style.transitionDelay = Math.min(i % 6, 4) * 55 + "ms";
  });
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -8% 0px" });
    revealTargets.forEach(el => io.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add("is-visible"));
  }
  // Fallback: never leave content invisible if the observer misses fast programmatic scrolls.
  setTimeout(() => revealTargets.forEach(el => el.classList.add("is-visible")), 1200);

  /* ---------- program tabs ---------- */
  const tabs = $$(".program__tab");
  const panels = $$(".program__panel");
  function activateTab(id) {
    tabs.forEach(t => {
      const active = t.dataset.tab === id;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
      t.tabIndex = active ? 0 : -1;
    });
    panels.forEach(p => {
      const active = p.id === "panel-" + id;
      p.classList.toggle("is-active", active);
      p.hidden = !active;
    });
  }
  tabs.forEach(tab => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
    tab.addEventListener("keydown", e => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const i = tabs.indexOf(tab);
      const next = e.key === "ArrowRight" ? (i + 1) % tabs.length : (i - 1 + tabs.length) % tabs.length;
      tabs[next].focus();
      activateTab(tabs[next].dataset.tab);
    });
  });

  /* ---------- calculator ---------- */
  const guestsRange = $("#guestsRange");
  const guestsValue = $("#guestsValue");
  const formatSelect = $("#formatSelect");
  const dateSelect = $("#dateSelect");
  const calcSum = $("#calcSum");
  const calcPer = $("#calcPer");
  const optionChecks = $$("[data-option]");

  function calc() {
    const guests = Number(guestsRange.value);
    const per = Number(formatSelect.value);
    const mult = Number(dateSelect.value);
    let extras = 0;
    optionChecks.forEach(c => { if (c.checked) extras += Number(c.value); });

    const base = guests * per * mult + extras;
    const min = Math.round((base * 0.9) / 10000) * 10000;
    const max = Math.round((base * 1.15) / 10000) * 10000;
    const perMin = Math.round(min / guests / 100) * 100;
    const perMax = Math.round(max / guests / 100) * 100;

    guestsValue.textContent = guests;
    calcSum.textContent = `${money.format(min)} — ${money.format(max)} ₽`;
    calcPer.textContent = `≈ ${money.format(perMin)}–${money.format(perMax)} ₽ / гость`;
  }
  guestsRange.addEventListener("input", calc);
  formatSelect.addEventListener("change", calc);
  dateSelect.addEventListener("change", calc);
  optionChecks.forEach(c => c.addEventListener("change", calc));
  calc();

  /* ---------- quiz ---------- */
  const modal = $("#quizModal");
  const form = $("#quizForm");
  const steps = $$(".quiz__step");
  const stepLabel = $("#quizStepLabel");
  const progressBar = $("#quizProgress");
  const backBtn = $("#quizBack");
  const nextBtn = $("#quizNext");
  const quizNav = $("#quizNav");
  const success = $("#quizSuccess");
  const errorEl = $("#quizError");
  const globalError = document.createElement("p");
  globalError.className = "quiz__error";
  globalError.id = "quizGlobalError";
  globalError.setAttribute("role", "alert");
  $(".quiz__meta").after(globalError);

  const state = {
    step: 1,
    guests: null,
    date: null,
    format: null,
    budget: null,
    needs: [],
    name: "",
    phone: "",
    company: "",
    consent: false,
    completed: false
  };

  function setChip(field, value) {
    $$(`[data-field="${field}"] button`).forEach(b => {
      b.classList.toggle("is-selected", b.dataset.value === String(value));
    });
  }

  function syncChips() {
    if (state.guests) {
      let chip = "30";
      if (state.guests > 300) chip = "350";
      else if (state.guests > 150) chip = "200";
      else if (state.guests > 50) chip = "100";
      setChip("guests", chip);
      $("#quizGuests").value = state.guests;
    }
    setChip("date", state.date);
    setChip("format", state.format);
    setChip("budget", state.budget);
  }

  function showStep(n) {
    state.step = Math.max(1, Math.min(5, n));
    steps.forEach(s => {
      const active = Number(s.dataset.step) === state.step;
      s.hidden = !active;
      s.classList.toggle("is-active", active);
    });
    stepLabel.textContent = `Шаг ${state.step} из 5`;
    progressBar.style.width = (state.step / 5) * 100 + "%";
    backBtn.disabled = state.step === 1;
    nextBtn.textContent = state.step === 5 ? "Отправить заявку →" : "Дальше →";
    globalError.textContent = "";
    syncChips();
    const first = $(`.quiz__step[data-step="${state.step}"] h3`);
    if (first) first.focus({ preventScroll: true });
  }

  let lastTrigger = null;

  function openQuiz(opts = {}) {
    lastTrigger = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    if (state.completed) resetQuiz();
    if (opts.guests) {
      state.guests = Number(opts.guests);
      $("#quizGuests").value = state.guests;
    }
    if (opts.format) state.format = opts.format;
    showStep(opts.guests ? 2 : 1);
    setTimeout(() => $(".quiz__close").focus({ preventScroll: true }), 80);
  }

  function closeQuiz() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    if (lastTrigger && typeof lastTrigger.focus === "function") {
      lastTrigger.focus({ preventScroll: true });
    }
  }

  function resetQuiz() {
    Object.assign(state, { step: 1, guests: null, date: null, format: null, budget: null, needs: [], name: "", phone: "", company: "", consent: false, completed: false });
    form.reset();
    $$(".quiz__chips button").forEach(b => b.classList.remove("is-selected"));
    steps.forEach(s => { s.hidden = Number(s.dataset.step) !== 1; s.classList.toggle("is-active", Number(s.dataset.step) === 1); });
    success.hidden = true;
    quizNav.hidden = false;
    nextBtn.disabled = false;
    nextBtn.textContent = "Дальше →";
    progressBar.style.width = "20%";
    stepLabel.textContent = "Шаг 1 из 5";
    errorEl.textContent = "";
    globalError.textContent = "";
    $("#quizGuests").value = "";
  }

  $$("[data-quiz]").forEach(btn => {
    btn.addEventListener("click", () => {
      const opts = {};
      if (btn.dataset.guests) opts.guests = btn.dataset.guests;
      if (btn.dataset.package) {
        opts.guests = btn.dataset.package === "Камерный" ? 50 : btn.dataset.package === "Классический" ? 100 : 200;
        opts.format = "Гала-ужин";
      }
      closeMenu();
      openQuiz(opts);
    });
  });
  $$("[data-close-quiz]").forEach(el => el.addEventListener("click", closeQuiz));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeQuiz();
  });

  modal.addEventListener("keydown", e => {
    if (e.key !== "Tab" || !modal.classList.contains("is-open")) return;
    const focusable = $$('button:not([disabled]), a[href], input:not([type="hidden"]), select, textarea', modal)
      .filter(el => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });

  $$(".quiz__chips").forEach(group => {
    group.addEventListener("click", e => {
      const btn = e.target.closest("button[data-value]");
      if (!btn) return;
      const field = group.dataset.field;
      const value = btn.dataset.value;
      $$("button", group).forEach(b => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      if (field === "guests") {
        state.guests = Number(value);
        $("#quizGuests").value = state.guests;
      } else {
        state[field] = value;
      }
      globalError.textContent = "";
    });
  });

  $("#quizGuests").addEventListener("input", e => {
    const v = Number(e.target.value);
    state.guests = v > 0 ? v : null;
    $$('[data-field="guests"] button').forEach(b => b.classList.remove("is-selected"));
    if (v > 0) {
      let chip = "30";
      if (v > 300) chip = "350";
      else if (v > 150) chip = "200";
      else if (v > 50) chip = "100";
      setChip("guests", chip);
    }
  });

  function validateStep() {
    if (state.step === 1) {
      if (!state.guests || state.guests < 10) return "Укажите число гостей — примерно.";
    }
    if (state.step === 2 && !state.date) return "Выберите дату или период.";
    if (state.step === 3 && !state.format) return "Выберите формат — или «ещё не решили».";
    if (state.step === 4 && !state.budget) return "Выберите бюджетный ориентир.";
    if (state.step === 5) {
      const name = $("#quizName").value.trim();
      const phone = $("#quizPhone").value.replace(/\D/g, "");
      const consent = $("#quizConsent").checked;
      if (name.length < 2) return "Напишите, как к вам обращаться.";
      if (phone.length < 11) return "Проверьте телефон — нужно 11 цифр.";
      if (!consent) return "Нужно согласие на обработку данных.";
      state.name = name;
      state.phone = $("#quizPhone").value;
      state.company = $("#quizCompany").value.trim();
      state.consent = consent;
    }
    return "";
  }

  nextBtn.addEventListener("click", () => {
    const error = validateStep();
    if (error) {
      globalError.textContent = error;
      return;
    }
    if (state.step < 5) {
      showStep(state.step + 1);
      return;
    }
    // Demo submit. Replace with fetch("/api/lead", ...) on production.
    nextBtn.disabled = true;
    nextBtn.textContent = "Отправляем…";
    state.needs = $$(".quiz__needs input:checked").map(i => i.value);
    setTimeout(() => {
      state.completed = true;
      steps.forEach(s => s.hidden = true);
      success.hidden = false;
      quizNav.hidden = true;
      progressBar.style.width = "100%";
      stepLabel.textContent = "Готово";
      console.info("PLANDA demo lead", state);
    }, 850);
  });

  backBtn.addEventListener("click", () => {
    if (state.step > 1) showStep(state.step - 1);
  });

  $("#quizPhone").addEventListener("input", e => {
    let d = e.target.value.replace(/\D/g, "");
    if (!d) { e.target.value = ""; return; }
    if (d[0] === "8") d = "7" + d.slice(1);
    if (d[0] !== "7") d = "7" + d;
    d = d.slice(0, 11);
    let out = "+7";
    if (d.length > 1) out += " (" + d.slice(1, 4);
    if (d.length >= 5) out += ") " + d.slice(4, 7);
    if (d.length >= 8) out += "-" + d.slice(7, 9);
    if (d.length >= 10) out += "-" + d.slice(9, 11);
    e.target.value = out;
  });

  // open quiz from contacts link? keep simple
  $$('a[href="#contact"]').forEach(a => a.addEventListener("click", e => { e.preventDefault(); openQuiz(); }));

  /* ---------- cookie ---------- */
  const cookieBar = $("#cookieBar");
  if (!localStorage.getItem("panda_cookie_choice")) {
    setTimeout(() => { cookieBar.hidden = false; }, 1600);
  }
  function chooseCookie(value) {
    localStorage.setItem("panda_cookie_choice", value);
    cookieBar.hidden = true;
  }
  $("#cookieAccept").addEventListener("click", () => chooseCookie("all"));
  $("#cookieDecline").addEventListener("click", () => chooseCookie("necessary"));
})();
