const script = document.createElement("script");
script.src = "decap-cms.js";
script.addEventListener("error", () => {
  const box = document.getElementById("cms-error");
  if (box) box.hidden = false;
});
document.body.appendChild(script);
