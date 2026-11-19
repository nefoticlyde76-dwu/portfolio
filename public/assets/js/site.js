const form = document.querySelector("[data-contact-form]");

function fieldError(input) {
  return document.getElementById(`${input.id}-error`);
}

function setFieldError(input, message) {
  const error = fieldError(input);
  input.setAttribute("aria-invalid", message ? "true" : "false");
  if (error) error.textContent = message;
}

function validateField(input) {
  const value = input.value.trim();
  if (input.required && !value) {
    setFieldError(input, "This field is required.");
    return false;
  }
  if (input.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    setFieldError(input, "Enter a valid email address.");
    return false;
  }
  setFieldError(input, "");
  return true;
}

if (form) {
  const fields = [...form.querySelectorAll("input, textarea")].filter((input) => input.name !== "bot-field" && input.type !== "hidden");
  fields.forEach((input) => {
    input.addEventListener("blur", () => validateField(input));
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true") validateField(input);
    });
  });

  form.addEventListener("submit", (event) => {
    const valid = fields.map((input) => validateField(input)).every(Boolean);
    if (!valid) {
      event.preventDefault();
      fields.find((input) => input.getAttribute("aria-invalid") === "true")?.focus();
      return;
    }

    if (!window.fetch) return;

    event.preventDefault();
    const status = document.getElementById("form-status");
    if (status) status.textContent = "Sending…";
    const body = new URLSearchParams(new FormData(form)).toString();
    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Request failed");
        window.location.assign("/contact/success/");
      })
      .catch(() => {
        if (status) status.textContent = "The message could not be sent. Check the form and try again.";
      });
  });
}

const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileNav = document.querySelector("[data-mobile-nav]");

function setMenu(open) {
  if (!menuToggle || !mobileNav) return;
  mobileNav.hidden = !open;
  menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
  menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  if (open) mobileNav.querySelector("a")?.focus();
}

if (menuToggle && mobileNav) {
  menuToggle.addEventListener("click", () => setMenu(mobileNav.hidden));
  mobileNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenu(false);
  });
}

const searchLayer = document.querySelector("[data-search-layer]");
const searchInput = document.querySelector("[data-search-input]");
const searchResults = document.querySelector("[data-search-results]");
const searchStatus = document.querySelector("[data-search-status]");
const searchClear = document.querySelector("[data-search-clear]");
let searchMatches = [];
let searchActive = -1;
let searchReturn = null;

function renderSearch(query) {
  const term = query.trim().toLowerCase();
  const source = Array.isArray(window.PORTFOLIO_SEARCH) ? window.PORTFOLIO_SEARCH : [];
  searchMatches = term.length < 2
    ? []
    : source
      .filter((item) => `${item.title} ${item.text}`.toLowerCase().includes(term))
      .sort((a, b) => Number(!a.title.toLowerCase().includes(term)) - Number(!b.title.toLowerCase().includes(term)))
      .slice(0, 8);
  searchActive = searchMatches.length ? 0 : -1;
  searchResults.replaceChildren();
  searchMatches.forEach((item, index) => {
    const option = document.createElement("li");
    const link = document.createElement("a");
    link.href = item.url;
    link.id = `search-option-${index}`;
    link.setAttribute("role", "option");
    if (index === searchActive) link.className = "is-active";
    const kind = document.createElement("span");
    kind.className = "search-type";
    kind.textContent = item.type;
    const title = document.createElement("span");
    title.textContent = item.title;
    link.append(title, kind);
    option.append(link);
    searchResults.append(option);
  });
  if (searchStatus) {
    searchStatus.textContent = term.length < 2
      ? "Type at least two characters."
      : (searchMatches.length ? `${searchMatches.length} published results.` : "No matching published records.");
  }
  searchInput.setAttribute("aria-activedescendant", searchActive >= 0 ? `search-option-${searchActive}` : "");
}

function markActive() {
  [...searchResults.querySelectorAll("a")].forEach((link, index) => {
    link.classList.toggle("is-active", index === searchActive);
  });
  searchInput.setAttribute("aria-activedescendant", searchActive >= 0 ? `search-option-${searchActive}` : "");
}

function openSearch() {
  if (!searchLayer || !searchInput) return;
  searchReturn = document.activeElement;
  searchLayer.hidden = false;
  searchInput.value = "";
  renderSearch("");
  searchInput.focus();
}

function closeSearch() {
  if (!searchLayer) return;
  searchLayer.hidden = true;
  if (searchReturn && typeof searchReturn.focus === "function") searchReturn.focus();
}

document.querySelectorAll("[data-search-open]").forEach((button) => {
  button.addEventListener("click", openSearch);
});

if (searchInput) {
  searchInput.addEventListener("input", () => renderSearch(searchInput.value));
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!searchMatches.length) return;
      searchActive = event.key === "ArrowDown"
        ? (searchActive + 1) % searchMatches.length
        : (searchActive - 1 + searchMatches.length) % searchMatches.length;
      markActive();
    }
    if (event.key === "Enter" && searchMatches[searchActive]) {
      event.preventDefault();
      window.location.assign(searchMatches[searchActive].url);
    }
  });
}

if (searchClear && searchInput) {
  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    renderSearch("");
    searchInput.focus();
  });
}

if (searchLayer) {
  searchLayer.addEventListener("click", (event) => {
    if (event.target === searchLayer) closeSearch();
  });
}

document.addEventListener("keydown", (event) => {
  const command = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
  if (command) {
    event.preventDefault();
    if (searchLayer?.hidden) openSearch();
    else closeSearch();
    return;
  }
  if (event.key !== "Escape") return;
  if (searchLayer && !searchLayer.hidden) closeSearch();
  else if (mobileNav && !mobileNav.hidden) {
    setMenu(false);
    menuToggle?.focus();
  }
});
