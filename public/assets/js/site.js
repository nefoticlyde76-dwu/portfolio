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
