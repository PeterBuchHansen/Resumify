var mainEdit = document.getElementById("mainEdit");
var ta = document.getElementById("src");
var headerEdit = document.getElementById("headerEdit");
var headerTa = document.getElementById("header-src");
var pdf = document.getElementById("pdf");
var statusEl = document.getElementById("status");
var compileErrorToast = document.getElementById("compile-toast");
var compileErrorToastText = document.getElementById("compile-toast-text");
var tabMain = document.getElementById("tab-main");
var tabHeader = document.getElementById("tab-header");
var tabSidebar = document.getElementById("tab-sidebar");
var sidebarEdit = document.getElementById("sidebarEdit");
var profilesMount = document.getElementById("profilesMount");
var referencesMount = document.getElementById("referencesMount");
var referencesShowContact = document.getElementById("references-show-contact");
var skillsShowRatings = document.getElementById("skills-show-ratings");
var skillsMount = document.getElementById("skillsMount");
var languagesMount = document.getElementById("languagesMount");
var certificationsMount = document.getElementById("certificationsMount");
var awardsMount = document.getElementById("awardsMount");
var photoDrop = document.getElementById("photo-drop");
var photoFile = document.getElementById("photo-file");
var photoDelete = document.getElementById("photo-delete");
var photoPreviewRev = 0;
var iconEyeOn = '<i class="fa-solid fa-eye" aria-hidden="true"></i>';
var iconEyeOff = '<i class="fa-solid fa-eye-slash" aria-hidden="true"></i>';
var iconCross = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
var iconTrash = '<i class="fa-solid fa-trash" aria-hidden="true"></i>';
/** Values written to YAML `languages[].level` (CEFR-style labels). */
var LANGUAGE_LEVEL_OPTIONS = [
  "A1 / Beginner",
  "A2 / Elementary",
  "B1 / Intermediate",
  "B2 / Upper Intermediate",
  "C1 / Advanced",
  "C2 / Proficiency",
  "Native",
];
var compileTimer = null;
var compileAbort = null;
/** Résumé sources directory: `models_demo` or `models_vault` from GET /api/resumify-config. */
var MODELS_PREFIX = "models_demo";

function modelsFileUrl(name) {
  return MODELS_PREFIX + "/" + name;
}

function modelsProfileUrl() {
  return MODELS_PREFIX + "/profile.png?t=" + photoPreviewRev;
}
var mainSource = "";
var headerSource = "";
var sidebarData = {
  use_photo: false,
  show_skill_ratings: true,
  profiles: [],
  languages: [],
  certifications: [],
  skills: [],
  awards: [],
  references: {
    show_contact_info: true,
    entries: [{ name: "", phone: "", url: "", label: "", text: "" }],
  },
};
var mode = "main";

function emptyReferenceEntry() {
  return { name: "", phone: "", url: "", label: "", text: "" };
}

function normalizeReferencesSection(ref) {
  if (ref == null) {
    return { show_contact_info: true, entries: [emptyReferenceEntry()] };
  }
  if (typeof ref === "string") {
    return { show_contact_info: true, entries: [Object.assign(emptyReferenceEntry(), { text: ref })] };
  }
  var show =
    ref.show_contact_info !== undefined
      ? ref.show_contact_info !== false
      : ref.show_contact !== false;
  var entries = ref.entries;
  if (!Array.isArray(entries)) {
    entries = [
      {
        name: ref.name != null ? String(ref.name) : "",
        phone: ref.phone != null ? String(ref.phone) : "",
        url:
          ref.url != null
            ? String(ref.url)
            : ref.link != null
              ? String(ref.link)
              : "",
        label: ref.label != null ? String(ref.label) : "",
        text: ref.text != null ? String(ref.text) : "",
      },
    ];
  } else {
    entries = entries.map(function (e) {
      return {
        name: e.name != null ? String(e.name) : "",
        phone: e.phone != null ? String(e.phone) : "",
        url:
          e.url != null ? String(e.url) : e.link != null ? String(e.link) : "",
        label: e.label != null ? String(e.label) : "",
        text: e.text != null ? String(e.text) : "",
      };
    });
  }
  if (entries.length === 0) entries.push(emptyReferenceEntry());
  return { show_contact_info: show, entries: entries };
}

function readReferencesFromForm() {
  if (!sidebarData.references) sidebarData.references = normalizeReferencesSection(null);
  sidebarData.references.show_contact_info = referencesShowContact.checked;
  var entries = [];
  referencesMount.querySelectorAll(".references-entry").forEach(function (row) {
    var n = row.querySelector(".ref-name");
    var ph = row.querySelector(".ref-phone");
    var u = row.querySelector(".ref-url");
    var lab = row.querySelector(".ref-label");
    var tx = row.querySelector(".ref-text");
    entries.push({
      name: n ? n.value : "",
      phone: ph ? ph.value : "",
      url: u ? u.value : "",
      label: lab ? lab.value : "",
      text: tx ? tx.value : "",
    });
  });
  if (entries.length === 0) entries.push(emptyReferenceEntry());
  sidebarData.references.entries = entries;
}

function renderReferences() {
  referencesMount.replaceChildren();
  var sec = normalizeReferencesSection(sidebarData.references);
  sidebarData.references = sec;
  referencesShowContact.checked = sec.show_contact_info !== false;
  sec.entries.forEach(function (e, ei) {
    var wrap = document.createElement("div");
    wrap.className = "references-entry";
    var rm = document.createElement("button");
    rm.type = "button";
    rm.className = "remove skill-remove-x";
    rm.innerHTML = iconCross;
    rm.title = "Remove reference";
    rm.setAttribute("aria-label", "Remove reference");
    rm.addEventListener("click", function () {
      readReferencesFromForm();
      sidebarData.references.entries.splice(ei, 1);
      if (sidebarData.references.entries.length === 0) {
        sidebarData.references.entries.push(emptyReferenceEntry());
      }
      renderReferences();
      scheduleCompile();
    });
    var headRow = document.createElement("div");
    headRow.className = "references-entry-head";
    headRow.appendChild(rm);
    var inner = document.createElement("div");
    inner.className = "references-entry-fields";
    headRow.appendChild(inner);
    wrap.appendChild(headRow);

    var namePhone = document.createElement("div");
    namePhone.className = "references-name-phone-row";
    [
      { type: "text", cls: "ref-name", ph: "Name", aria: "Reference name", val: e.name, ac: "name" },
      { type: "tel", cls: "ref-phone", ph: "Phone", aria: "Reference phone", val: e.phone, ac: "tel" },
    ].forEach(function (f) {
      var fg = document.createElement("div");
      fg.className = "references-field-group";
      var inp = document.createElement("input");
      inp.type = f.type;
      inp.className = "references-input " + f.cls;
      inp.placeholder = f.ph;
      inp.spellcheck = false;
      inp.autocomplete = f.ac;
      inp.setAttribute("aria-label", f.aria);
      inp.id = "ref-" + ei + "-" + f.cls;
      inp.value = f.val;
      inp.addEventListener("input", scheduleReferencesCompile);
      fg.appendChild(inp);
      namePhone.appendChild(fg);
    });
    inner.appendChild(namePhone);

    var urlLab = document.createElement("div");
    urlLab.className = "references-url-label-row";
    [
      {
        cls: "ref-url",
        ph: "URL (https://…)",
        aria: "Reference URL",
        val: e.url,
      },
      {
        cls: "ref-label",
        ph: "Link label (e.g. linkedin.com/in/you)",
        aria: "Link label shown in PDF",
        val: e.label,
      },
    ].forEach(function (f) {
      var fg = document.createElement("div");
      fg.className = "references-field-group references-field-group--grow";
      var inp = document.createElement("input");
      inp.type = "text";
      inp.className = "references-input " + f.cls;
      inp.spellcheck = false;
      inp.placeholder = f.ph;
      inp.setAttribute("aria-label", f.aria);
      inp.id = "ref-" + ei + "-" + f.cls;
      inp.value = f.val;
      inp.addEventListener("input", scheduleReferencesCompile);
      fg.appendChild(inp);
      urlLab.appendChild(fg);
    });
    inner.appendChild(urlLab);

    var ta = document.createElement("textarea");
    ta.className = "sidebar-refs references-text ref-text";
    ta.rows = 4;
    ta.spellcheck = true;
    ta.placeholder = "Notes (multiline, e.g. role & dates)";
    ta.setAttribute("aria-label", "Reference notes");
    ta.id = "ref-" + ei + "-text";
    ta.value = e.text;
    ta.addEventListener("input", scheduleReferencesCompile);
    inner.appendChild(ta);

    referencesMount.appendChild(wrap);
  });
}

function writeReferencesToForm() {
  sidebarData.references = normalizeReferencesSection(sidebarData.references);
  renderReferences();
}

function scheduleReferencesCompile() {
  readReferencesFromForm();
  scheduleCompile();
}

function normalizeLanguageLevelForYaml(lev) {
  var s = String(lev == null ? "" : lev).trim();
  var legacy = {
    "C2 (Proficiency)": "C2 / Proficiency",
    "B1 (Intermediate)": "B1 / Intermediate",
    "B2 (Upper Intermediate)": "B2 / Upper Intermediate",
    "C1 (Advanced)": "C1 / Advanced",
    "A1 (Beginner)": "A1 / Beginner",
    "A2 (Elementary)": "A2 / Elementary",
  };
  return legacy[s] || s;
}

function setStatus(msg, cls) {
  statusEl.textContent = msg || "";
  statusEl.className = "status" + (cls ? " " + cls : "");
}

function hideCompileErrorToast() {
  if (compileErrorToast) compileErrorToast.hidden = true;
}

function showCompileErrorToast(message) {
  var msg = message != null && String(message).trim() !== "" ? String(message) : "Typst compile failed.";
  if (!compileErrorToast || !compileErrorToastText) return;
  compileErrorToastText.textContent = msg;
  compileErrorToast.hidden = false;
}

function applyPhotoDropBackground(url) {
  var hint = photoDrop.querySelector(".photo-drop-hint");
  if (url) {
    photoDrop.classList.add("has-image");
    photoDrop.style.backgroundImage = 'url("' + url + '")';
    hint.hidden = true;
    photoDelete.hidden = false;
  } else {
    photoDrop.classList.remove("has-image");
    photoDrop.style.backgroundImage = "";
    hint.hidden = false;
    photoDelete.hidden = true;
  }
}

function syncPhotoPreviewFromState() {
  if (sidebarData.use_photo === true) {
    applyPhotoDropBackground(modelsProfileUrl());
  } else {
    applyPhotoDropBackground(null);
  }
}

function convertFileToPngBlob(file) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    var u = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(u);
      try {
        var canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(function (b) {
          if (b) resolve(b);
          else reject(new Error("toBlob"));
        }, "image/png");
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = function () {
      URL.revokeObjectURL(u);
      reject(new Error("image"));
    };
    img.src = u;
  });
}

function handlePhotoFile(file) {
  if (!file || !/^image\//.test(file.type)) {
    setStatus("Choose an image file", "err");
    return;
  }
  setStatus("Uploading photo…");
  convertFileToPngBlob(file)
    .then(function (blob) {
      return fetch("/api/profile-photo", {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: blob,
      });
    })
    .then(function (r) {
      if (!r.ok) throw new Error("upload");
      sidebarData.use_photo = true;
      photoPreviewRev = Date.now();
      syncPhotoPreviewFromState();
      scheduleCompile();
      setStatus("Photo saved", "ok");
    })
    .catch(function () {
      setStatus("Photo upload failed (PNG required after conversion)", "err");
    });
}

function runCompile() {
  compileTimer = null;
  if (compileAbort) compileAbort.abort();
  compileAbort = new AbortController();
  setStatus("Saving & compiling…");
  if (mode === "main") mainSource = ta.value;
  else if (mode === "header") {
    headerSource = headerTa.value;
  }
  readReferencesFromForm();
  if (skillsShowRatings) sidebarData.show_skill_ratings = skillsShowRatings.checked;
  fetch("/api/compile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: mainSource, header: headerSource, sidebar: sidebarData }),
    signal: compileAbort.signal,
  })
    .then(function (r) {
      return r.text().then(function (text) {
        if (!r.ok) throw new Error("http");
        return JSON.parse(text);
      });
    })
    .then(function (data) {
      if (!data.ok) {
        showCompileErrorToast(data.error || "Compile failed.");
        setStatus("Compile failed", "err");
        return;
      }
      hideCompileErrorToast();
      setStatus("Saved · PDF updated", "ok");
      pdf.src = "resume.pdf?t=" + Date.now();
    })
    .catch(function (e) {
      if (e.name === "AbortError") return;
      showCompileErrorToast(
        "Could not reach the editor server or the response was invalid.\n\n" +
          "Run from the repo root:\n" +
          "cargo run --manifest-path controller/Cargo.toml -- .",
      );
      setStatus("Compile failed", "err");
    });
}

function scheduleCompile() {
  if (compileTimer) clearTimeout(compileTimer);
  compileTimer = setTimeout(runCompile, 450);
}

function setMode(next) {
  if (mode === "main") mainSource = ta.value;
  else if (mode === "header") {
    headerSource = headerTa.value;
  }
  mode = next;
  var isMain = next === "main";
  var isHeader = next === "header";
  var isSidebar = next === "sidebar";
  tabMain.classList.toggle("active", isMain);
  tabHeader.classList.toggle("active", isHeader);
  tabSidebar.classList.toggle("active", isSidebar);
  tabMain.setAttribute("aria-selected", isMain ? "true" : "false");
  tabHeader.setAttribute("aria-selected", isHeader ? "true" : "false");
  tabSidebar.setAttribute("aria-selected", isSidebar ? "true" : "false");
  tabMain.setAttribute("aria-pressed", isMain ? "true" : "false");
  tabHeader.setAttribute("aria-pressed", isHeader ? "true" : "false");
  tabSidebar.setAttribute("aria-pressed", isSidebar ? "true" : "false");
  mainEdit.hidden = !isMain;
  headerEdit.hidden = !isHeader;
  sidebarEdit.hidden = !isSidebar;
  if (isHeader) {
    headerTa.value = headerSource;
  }
  if (isSidebar) {
    syncPhotoPreviewFromState();
  }
}

tabMain.addEventListener("click", function () {
  setMode("main");
});
tabHeader.addEventListener("click", function () {
  setMode("header");
});
tabSidebar.addEventListener("click", function () {
  setMode("sidebar");
});

ta.addEventListener("input", function () {
  mainSource = ta.value;
  scheduleCompile();
});

headerTa.addEventListener("input", function () {
  headerSource = headerTa.value;
  scheduleCompile();
});

photoDrop.addEventListener("click", function (e) {
  if (e.target.closest("#photo-delete")) return;
  photoFile.click();
});
photoDrop.addEventListener("dragover", function (e) {
  e.preventDefault();
  e.stopPropagation();
  photoDrop.classList.add("photo-drop-zone--drag");
});
photoDrop.addEventListener("dragleave", function (e) {
  e.preventDefault();
  photoDrop.classList.remove("photo-drop-zone--drag");
});
photoDrop.addEventListener("drop", function (e) {
  e.preventDefault();
  e.stopPropagation();
  photoDrop.classList.remove("photo-drop-zone--drag");
  var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) handlePhotoFile(f);
});
photoDrop.addEventListener("keydown", function (e) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    photoFile.click();
  }
});
photoFile.addEventListener("change", function () {
  var f = photoFile.files && photoFile.files[0];
  if (f) handlePhotoFile(f);
  photoFile.value = "";
});
photoDelete.addEventListener("click", function (e) {
  e.preventDefault();
  e.stopPropagation();
  setStatus("Removing photo…");
  fetch("/api/profile-photo", { method: "DELETE" })
    .then(function (r) {
      if (!r.ok) throw new Error("del");
      sidebarData.use_photo = false;
      photoPreviewRev = Date.now();
      syncPhotoPreviewFromState();
      scheduleCompile();
      setStatus("Photo removed", "ok");
    })
    .catch(function () {
      setStatus("Could not remove photo file", "err");
    });
});

function renderSkills() {
  skillsMount.replaceChildren();
  sidebarData.skills.forEach(function (cat, ci) {
    var fs = document.createElement("fieldset");
    var rmCat = document.createElement("button");
    rmCat.type = "button";
    rmCat.className = "skill-cat-remove";
    rmCat.innerHTML = iconTrash;
    rmCat.title = "Remove category";
    rmCat.setAttribute("aria-label", "Remove category");
    rmCat.addEventListener("click", function () {
      sidebarData.skills.splice(ci, 1);
      renderSkills();
      scheduleCompile();
    });
    var leg = document.createElement("legend");
    leg.className = "skill-category-legend";
    var legTitle = document.createElement("span");
    legTitle.className = "skill-category-legend-title";
    legTitle.textContent = "Category";
    leg.appendChild(legTitle);
    leg.appendChild(rmCat);
    fs.appendChild(leg);
    var titleRow = document.createElement("div");
    titleRow.className = "cat-title-row";
    var rat = document.createElement("select");
    rat.className = "skill-rating-select";
    rat.title = "Rating 0–5 (card-suit diamonds in PDF)";
    for (var ri = 0; ri <= 5; ri++) {
      var opt = document.createElement("option");
      opt.value = String(ri);
      opt.textContent = String(ri);
      rat.appendChild(opt);
    }
    var rVal = Math.min(5, Math.max(0, parseInt(String(cat.rating), 10) || 0));
    rat.value = String(rVal);
    rat.addEventListener("change", function () {
      var v = parseInt(rat.value, 10);
      sidebarData.skills[ci].rating = isNaN(v) ? 0 : Math.min(5, Math.max(0, v));
      scheduleCompile();
    });
    var titleInp = document.createElement("input");
    titleInp.type = "text";
    titleInp.placeholder = "Category title (e.g. Programming languages)";
    titleInp.value = cat.category;
    titleInp.dataset.catIdx = String(ci);
    titleInp.addEventListener("input", function () {
      sidebarData.skills[ci].category = titleInp.value;
      scheduleCompile();
    });
    titleRow.appendChild(titleInp);
    titleRow.appendChild(rat);
    fs.appendChild(titleRow);
    cat.items.forEach(function (item, ii) {
      var row = document.createElement("div");
      row.className = "skill-row";
      var rm = document.createElement("button");
      rm.type = "button";
      rm.className = "remove skill-remove-x";
      rm.innerHTML = iconCross;
      rm.title = "Remove this skill";
      rm.setAttribute("aria-label", "Remove skill");
      rm.addEventListener("click", function () {
        sidebarData.skills[ci].items.splice(ii, 1);
        renderSkills();
        scheduleCompile();
      });
      row.appendChild(rm);
      var nameInp = document.createElement("input");
      nameInp.type = "text";
      nameInp.placeholder = "Skill (e.g. Rust)";
      nameInp.value = item.name;
      nameInp.addEventListener("input", function () {
        sidebarData.skills[ci].items[ii].name = nameInp.value;
        scheduleCompile();
      });
      row.appendChild(nameInp);
      var eyeBtn = document.createElement("button");
      eyeBtn.type = "button";
      eyeBtn.className = "skill-eye-toggle";
      function syncEyeUi() {
        var on = sidebarData.skills[ci].items[ii].enabled !== false;
        eyeBtn.innerHTML = on ? iconEyeOn : iconEyeOff;
        eyeBtn.setAttribute("aria-pressed", on ? "true" : "false");
        eyeBtn.title = on ? "Shown in PDF — click to hide" : "Hidden in PDF — click to show";
      }
      syncEyeUi();
      eyeBtn.addEventListener("click", function () {
        var on = sidebarData.skills[ci].items[ii].enabled !== false;
        sidebarData.skills[ci].items[ii].enabled = !on;
        syncEyeUi();
        scheduleCompile();
      });
      row.appendChild(eyeBtn);
      var boldBtn = document.createElement("button");
      boldBtn.type = "button";
      boldBtn.className = "skill-bold-toggle";
      boldBtn.textContent = "B";
      function syncBoldUi() {
        var b = sidebarData.skills[ci].items[ii].bold === true;
        boldBtn.setAttribute("aria-pressed", b ? "true" : "false");
        boldBtn.title = b ? "Bold in PDF — click for normal" : "Normal in PDF — click for bold";
      }
      syncBoldUi();
      boldBtn.addEventListener("click", function () {
        sidebarData.skills[ci].items[ii].bold = !sidebarData.skills[ci].items[ii].bold;
        syncBoldUi();
        scheduleCompile();
      });
      row.appendChild(boldBtn);
      fs.appendChild(row);
    });
    var addRow = document.createElement("div");
    addRow.className = "skill-fieldset-add";
    var addSkill = document.createElement("button");
    addSkill.type = "button";
    addSkill.className = "btn-sidebar-add";
    addSkill.textContent = "+ Add skill";
    addSkill.addEventListener("click", function () {
      sidebarData.skills[ci].items.push({ name: "", enabled: true, bold: false });
      renderSkills();
      scheduleCompile();
    });
    addRow.appendChild(addSkill);
    fs.appendChild(addRow);
    skillsMount.appendChild(fs);
  });
}

function renderProfiles() {
  profilesMount.replaceChildren();
  if (!sidebarData.profiles) sidebarData.profiles = [];
  sidebarData.profiles.forEach(function (p, pi) {
    var row = document.createElement("div");
    row.className = "lang-row";
    var rm = document.createElement("button");
    rm.type = "button";
    rm.className = "remove skill-remove-x";
    rm.innerHTML = iconCross;
    rm.title = "Remove profile link";
    rm.setAttribute("aria-label", "Remove profile link");
    rm.addEventListener("click", function () {
      sidebarData.profiles.splice(pi, 1);
      renderProfiles();
      scheduleCompile();
    });
    row.appendChild(rm);
    var urlInp = document.createElement("input");
    urlInp.type = "text";
    urlInp.placeholder = "URL (https://… or mailto:…)";
    urlInp.value = p.url;
    urlInp.addEventListener("input", function () {
      sidebarData.profiles[pi].url = urlInp.value;
      scheduleCompile();
    });
    row.appendChild(urlInp);
    var labInp = document.createElement("input");
    labInp.type = "text";
    labInp.placeholder = "Link label (e.g. linkedin.com/in/you)";
    labInp.value = p.label;
    labInp.addEventListener("input", function () {
      sidebarData.profiles[pi].label = labInp.value;
      scheduleCompile();
    });
    row.appendChild(labInp);
    var iconSel = document.createElement("select");
    iconSel.title = "PDF icon (Font Awesome Brands)";
    [["", "(no icon)"], ["linkedin", "LinkedIn"], ["github", "GitHub"]].forEach(function (opt) {
      var o = document.createElement("option");
      o.value = opt[0];
      o.textContent = opt[1];
      iconSel.appendChild(o);
    });
    iconSel.value = p.icon != null && p.icon !== undefined ? String(p.icon) : "";
    iconSel.addEventListener("change", function () {
      sidebarData.profiles[pi].icon = iconSel.value;
      scheduleCompile();
    });
    row.appendChild(iconSel);
    profilesMount.appendChild(row);
  });
}

/** Multiline text cards (same layout classes as References). */
function renderSidebarTextBlocks(mount, dataKey, placeholder, removeTitle) {
  mount.replaceChildren();
  if (!sidebarData[dataKey]) sidebarData[dataKey] = [];
  sidebarData[dataKey].forEach(function (text, i) {
    var wrap = document.createElement("div");
    wrap.className = "references-entry";
    var headRow = document.createElement("div");
    headRow.className = "references-entry-head";
    var rm = document.createElement("button");
    rm.type = "button";
    rm.className = "remove skill-remove-x";
    rm.innerHTML = iconCross;
    rm.title = removeTitle;
    rm.setAttribute("aria-label", removeTitle);
    rm.addEventListener("click", function () {
      sidebarData[dataKey].splice(i, 1);
      renderSidebarTextBlocks(mount, dataKey, placeholder, removeTitle);
      scheduleCompile();
    });
    headRow.appendChild(rm);
    var inner = document.createElement("div");
    inner.className = "references-entry-fields";
    var ta = document.createElement("textarea");
    ta.className = "sidebar-refs references-text ref-text";
    ta.rows = 4;
    ta.spellcheck = true;
    ta.placeholder = placeholder;
    ta.setAttribute("aria-label", dataKey + " text");
    ta.value = text != null ? String(text) : "";
    ta.addEventListener("input", function () {
      sidebarData[dataKey][i] = ta.value;
      scheduleCompile();
    });
    inner.appendChild(ta);
    headRow.appendChild(inner);
    wrap.appendChild(headRow);
    mount.appendChild(wrap);
  });
}

function renderCertifications() {
  renderSidebarTextBlocks(
    certificationsMount,
    "certifications",
    "Typst markup per line, e.g.\n*Certificate title* · Org, year",
    "Remove certification",
  );
}

function renderAwards() {
  renderSidebarTextBlocks(
    awardsMount,
    "awards",
    "Typst markup per line, e.g.\n*Award name* · short detail",
    "Remove award",
  );
}

function renderLanguages() {
  languagesMount.replaceChildren();
  sidebarData.languages.forEach(function (lang, li) {
    var row = document.createElement("div");
    row.className = "lang-row";
    var rm = document.createElement("button");
    rm.type = "button";
    rm.className = "remove skill-remove-x";
    rm.innerHTML = iconCross;
    rm.title = "Remove language";
    rm.setAttribute("aria-label", "Remove language");
    rm.addEventListener("click", function () {
      sidebarData.languages.splice(li, 1);
      renderLanguages();
      scheduleCompile();
    });
    row.appendChild(rm);
    var n = document.createElement("input");
    n.type = "text";
    n.placeholder = "Language";
    n.value = lang.name;
    n.addEventListener("input", function () {
      sidebarData.languages[li].name = n.value;
      scheduleCompile();
    });
    row.appendChild(n);
    var lvSel = document.createElement("select");
    lvSel.title = "Level (YAML)";
    var ph = document.createElement("option");
    ph.value = "";
    ph.textContent = "— Level —";
    lvSel.appendChild(ph);
    LANGUAGE_LEVEL_OPTIONS.forEach(function (label) {
      var o = document.createElement("option");
      o.value = label;
      o.textContent = label;
      lvSel.appendChild(o);
    });
    var cur = normalizeLanguageLevelForYaml(lang.level);
    if (cur && LANGUAGE_LEVEL_OPTIONS.indexOf(cur) < 0) {
      var custom = document.createElement("option");
      custom.value = cur;
      custom.textContent = cur + " (custom)";
      lvSel.insertBefore(custom, lvSel.children[1] || null);
    }
    lvSel.value = cur;
    lvSel.addEventListener("change", function () {
      sidebarData.languages[li].level = lvSel.value;
      scheduleCompile();
    });
    row.appendChild(lvSel);
    languagesMount.appendChild(row);
  });
}

function renderSidebarForm() {
  renderProfiles();
  renderLanguages();
  renderCertifications();
  renderSkills();
  renderAwards();
  renderReferences();
}

document.getElementById("addProfile").addEventListener("click", function () {
  if (!sidebarData.profiles) sidebarData.profiles = [];
  sidebarData.profiles.push({ url: "", label: "", icon: "" });
  renderProfiles();
  scheduleCompile();
});

referencesShowContact.addEventListener("change", scheduleReferencesCompile);

skillsShowRatings.addEventListener("change", function () {
  sidebarData.show_skill_ratings = skillsShowRatings.checked;
  scheduleCompile();
});

document.getElementById("addReference").addEventListener("click", function () {
  readReferencesFromForm();
  sidebarData.references.entries.push(emptyReferenceEntry());
  renderReferences();
  scheduleCompile();
});

document.getElementById("addCategory").addEventListener("click", function () {
  sidebarData.skills.push({
    category: "New category",
    rating: 4,
    items: [{ name: "", enabled: true, bold: false }],
  });
  renderSidebarForm();
  scheduleCompile();
});

document.getElementById("addLanguage").addEventListener("click", function () {
  sidebarData.languages.push({ name: "", level: "" });
  renderLanguages();
  scheduleCompile();
});

document.getElementById("addCertification").addEventListener("click", function () {
  if (!sidebarData.certifications) sidebarData.certifications = [];
  sidebarData.certifications.push("");
  renderCertifications();
  scheduleCompile();
});

document.getElementById("addAward").addEventListener("click", function () {
  if (!sidebarData.awards) sidebarData.awards = [];
  sidebarData.awards.push("");
  renderAwards();
  scheduleCompile();
});

function loadAll() {
  fetch("/api/resumify-config")
    .then(function (r) {
      return r.ok ? r.json() : {};
    })
    .then(function (cfg) {
      var p = cfg.models_path != null ? String(cfg.models_path).trim() : "";
      MODELS_PREFIX = p !== "" ? p.replace(/\/+$/, "") : "models_demo";
      return Promise.all([
        fetch(modelsFileUrl("resume-content.typ")).then(function (r) {
          if (!r.ok) throw new Error("content");
          return r.text();
        }),
        fetch(modelsFileUrl("resume-header.typ")).then(function (r) {
          if (!r.ok) throw new Error("header");
          return r.text();
        }),
        fetch("/api/sidebar-data").then(function (r) {
          if (!r.ok) throw new Error("sidebar");
          return r.json();
        }),
      ]);
    })
    .then(function (triple) {
      mainSource = triple[0];
      ta.value = mainSource;
      headerSource = triple[1];
      headerTa.value = headerSource;
      sidebarData = triple[2];
      var someProfiles =
        sidebarData.some_profiles != null
          ? sidebarData.some_profiles
          : sidebarData["some-profiles"];
      if (someProfiles != null) {
        sidebarData.profiles = someProfiles;
        delete sidebarData.some_profiles;
        delete sidebarData["some-profiles"];
      }
      if (!sidebarData.profiles) sidebarData.profiles = [];
      sidebarData.profiles.forEach(function (p) {
        if (p.icon === undefined || p.icon === null) p.icon = "";
        else p.icon = String(p.icon).trim().toLowerCase();
      });
      sidebarData.references = normalizeReferencesSection(sidebarData.references);
      if (!sidebarData.skills) sidebarData.skills = [];
      if (sidebarData.show_skill_ratings === undefined) sidebarData.show_skill_ratings = true;
      sidebarData.show_skill_ratings = sidebarData.show_skill_ratings !== false;
      if (skillsShowRatings) skillsShowRatings.checked = sidebarData.show_skill_ratings;
      if (!sidebarData.languages) sidebarData.languages = [];
      if (!sidebarData.certifications) sidebarData.certifications = [];
      if (!sidebarData.awards) sidebarData.awards = [];
      sidebarData.languages.forEach(function (lang) {
        lang.level = normalizeLanguageLevelForYaml(lang.level);
      });
      writeReferencesToForm();
      photoPreviewRev = Date.now();
      return fetch(modelsProfileUrl(), { cache: "no-store" }).catch(function () {
        return { ok: false };
      });
    })
    .then(function (r) {
      sidebarData.use_photo = !!(r && r.ok);
      syncPhotoPreviewFromState();
      renderSidebarForm();
      runCompile();
    })
    .catch(function () {
      ta.value =
        "// Could not load résumé sources or /api/sidebar-data.\n" +
        "// Use: cargo run --manifest-path controller/Cargo.toml -- .\n// Then open http://localhost/editor.html\n\n";
      mainSource = ta.value;
      headerSource = "";
      headerTa.value = "";
      sidebarData = {
        use_photo: false,
        show_skill_ratings: true,
        profiles: [],
        languages: [],
        certifications: [],
        skills: [],
        awards: [],
        references: {
          show_contact_info: true,
          entries: [emptyReferenceEntry()],
        },
      };
      if (skillsShowRatings) skillsShowRatings.checked = true;
      writeReferencesToForm();
      applyPhotoDropBackground(null);
      renderSidebarForm();
      setStatus("Load failed — use preview server", "err");
    });
}

loadAll();
