(function () {
  var editNav = document.getElementById("edit-nav");
  var local =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (local) {
    editNav.removeAttribute("aria-disabled");
    editNav.removeAttribute("tabindex");
    editNav.removeAttribute("title");
  } else {
    editNav.setAttribute("aria-disabled", "true");
    editNav.setAttribute("tabindex", "-1");
  }
  document.getElementById("print-btn").addEventListener("click", function () {
    var f = document.getElementById("pdf");
    if (f.contentWindow) {
      f.contentWindow.focus();
      f.contentWindow.print();
    }
  });
})();
