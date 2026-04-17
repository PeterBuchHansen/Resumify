#import "theme.typ": *

#let resume-powered-by-footer = [
  #block(width: 100%, spacing: 0em)[
    Powered by #link("https://github.com/PeterBuchHansen/Resumify")[github.com/PeterBuchHansen/Resumify]
  ]
]

#show: apply-cv-theme.with(page-footer: resume-powered-by-footer)

#let sidebar-data = yaml("resume-sidebar.yaml")

#let enabled-skill-line(items) = {
  // One `box` per skill so line breaks only between items (not at `-` / `/` inside a name).
  let parts = items
    .filter(it => it.at("enabled", default: true) != false)
    .map(it => {
      let n = str(it.at("name", default: ""))
      if n == "" {
        none
      } else if it.at("bold", default: false) == true {
        box[#strong[#n]]
      } else {
        box[#n]
      }
    })
    .filter(it => it != none)
  if parts.len() == 0 {
    ""
  } else {
    parts.join([, ])
  }
}

/// Sidebar cert/award lines: muted SoMe size; em dash → middot; each line is Typst markup
/// (e.g. *bold title* for strong; use \# for a literal hash).
#let sidebar-cert-award-line(s) = {
  let t = str(s).replace(" — ", " · ").replace("—", " · ")
  text(size: sidebar-some-link-size, fill: c-muted)[
    #eval(t, mode: "markup")
  ]
}

/// One editor textarea / YAML string; non-empty lines rendered like SoMe-sized muted text.
#let sidebar-cert-award-entry(raw) = block(spacing: 0.55em)[
  #{
    let parts = ()
    for line in str(raw).replace("\r", "").split("\n") {
      let t = line.trim()
      if t != "" {
        parts.push(t)
      }
    }
    for (idx, t) in parts.enumerate() [
      #if idx > 0 [#linebreak()]
      #sidebar-cert-award-line(t)
    ]
  }
]

/// URL shown in PDF: optional `label`, else strip scheme / leading `www.`.
#let ref-link-href(entry) = str(entry.at("url", default: entry.at("link", default: ""))).trim()

#let strip-url-prefix(s) = {
  let x = s.trim()
  let x = if x.starts-with("https://") { x.slice(8) } else { x }
  let x = if x.starts-with("http://") { x.slice(7) } else { x }
  let x = if x.starts-with("www.") { x.slice(4) } else { x }
  x
}

#let ref-link-display-text(href, lab) = {
  let l = str(lab).trim()
  if l != "" { l } else { strip-url-prefix(href) }
}

#let ref-raw = sidebar-data.at("references", default: (:))
#let (ref-show-contact-info, ref-entries) = if type(ref-raw) == str {
  (true, ( (text: ref-raw), ))
} else {
  let sc = ref-raw.at("show_contact_info", default: ref-raw.at("show_contact", default: true))
  let sc = if type(sc) == bool { sc } else { true }
  let ent = ref-raw.at("entries", default: none)
  if ent != none {
    (sc, ent)
  } else {
    let has = (
      str(ref-raw.at("name", default: "")).trim() != ""
        or str(ref-raw.at("text", default: "")).trim() != ""
        or str(ref-raw.at("phone", default: "")).trim() != ""
        or str(ref-raw.at("url", default: "")).trim() != ""
        or str(ref-raw.at("link", default: "")).trim() != ""
    )
    if has {
      (sc, (ref-raw,))
    } else {
      (sc, ())
    }
  }
}

#let ref-visible-entries = ref-entries.filter(e => {
  let href = ref-link-href(e)
  let nm = str(e.at("name", default: "")).trim()
  let ph = str(e.at("phone", default: "")).trim()
  let tx = str(e.at("text", default: "")).trim()
  tx != "" or nm != "" or (ref-show-contact-info and (ph != "" or href != ""))
})
#let has-ref-block = ref-visible-entries.len() > 0

#let use-photo-flag = {
  let v = sidebar-data.at("use_photo", default: false)
  if type(v) == bool { v } else { false }
}

#let resume-sidebar = [
  #set text(size: 9.5pt, font: cv-font)

  #cv-photo-square(use-photo: use-photo-flag)

  // Sidebar order: SoMe → Languages → Certifications → Skills → Awards → References
  #let profiles = sidebar-data.at("some_profiles", default: sidebar-data.at("some-profiles", default: ()))
  #if profiles.len() > 0 [
    #sidebar-section[SoMe Profiles][
      #set block(spacing: 0em)
      #for (i, p) in profiles.enumerate() [
        #let u = str(p.at("url", default: ""))
        #let lab = p.at("label", default: "")
        #let g = sidebar-profile-glyph(p.at("icon", default: ""))
        #block(width: 100%, spacing: 0.5em)[
          #if g != none [
            #sidebar-brand-profile(u, lab, g)
          ] else [
            #link(u)[#text(size: sidebar-some-link-size, fill: c-link)[#lab]]
          ]
        ]
      ]
    ]
  ]

  #sidebar-section[Languages][
    #set block(spacing: 0em)
    #for (i, lang) in sidebar-data.at("languages", default: ()).enumerate() [
      #if i > 0 [ \ ]
      #text(size: 8.4pt)[
        #strong[#lang.at("name", default: "")]
        #h(0.35em)
        #text(fill: c-muted)[#lang.at("level", default: "")]
      ]
    ]
  ]

  #let cert-lines = sidebar-data.at("certifications", default: ()).filter(x => str(x).trim() != "")
  #if cert-lines.len() > 0 [
    #sidebar-section[Certifications][
      #for item in cert-lines [
        #sidebar-cert-award-entry(item)
      ]
    ]
  ]

  #let show-skill-ratings = sidebar-data.at("show_skill_ratings", default: true) != false
  #sidebar-section[Skills][
    #for cat in sidebar-data.at("skills", default: ()) {
      let items = cat.at("items", default: ())
      let line = enabled-skill-line(items)
      let title = cat.at("category", default: "")
      let r = int(cat.at("rating", default: 3))
      if line != "" [
        #skill-category(rating: r, show_rating: show-skill-ratings)[#title][#line]
      ]
    }
  ]

  #let award-lines = sidebar-data.at("awards", default: ()).filter(x => str(x).trim() != "")
  #if award-lines.len() > 0 [
    #sidebar-section[Awards][
      #for item in award-lines [
        #sidebar-cert-award-entry(item)
      ]
    ]
  ]

  #if has-ref-block [
    #sidebar-section[References][
      #for (ei, e) in ref-visible-entries.enumerate() [
        #if ei > 0 [#v(0.55em)]
        #let nm = str(e.at("name", default: "")).trim()
        #let ph = str(e.at("phone", default: "")).trim()
        #let href = ref-link-href(e)
        #let disp = ref-link-display-text(href, e.at("label", default: ""))
        #if nm != "" [#text(size: 8.4pt)[#strong[#nm]]]
        #if ref-show-contact-info and ph != "" [
          #if nm != "" [ ]
          #text(size: sidebar-some-link-size, fill: c-muted)[#ph]
        ]
        #if (nm != "" or (ref-show-contact-info and ph != "")) [
          #linebreak()
        ]
        #if ref-show-contact-info and href != "" [
          #link(href)[#text(size: sidebar-some-link-size, fill: c-link)[#disp]]
          #linebreak()
        ]
        #let tx = str(e.at("text", default: ""))
        #for line in tx.replace("\r", "").split("\n") {
          let t = line.trim()
          if t != "" [
            #text(size: sidebar-some-link-size, fill: c-muted)[#t]
            #linebreak()
          ]
        }
      ]
    ]
  ]
]

#let resume-header = [
  #resume-header-band[
    #include "resume-header.typ"
  ]
]

#let resume-detailed-cv-link = [
  #align(right)[
    #text(size: sidebar-some-link-size, fill: c-link)[
      #emph[Online CV (demo): ]
      #link("https://eksempel.dk/cv/john-doe")[
        #text(size: sidebar-some-link-size, fill: c-link)[eksempel.dk/cv/john-doe]
      ]
    ]
  ]
]

#let resume-content = [
  #include "resume-content.typ"
]

#cv-columns[
  #resume-sidebar
][
  #resume-header
  #resume-detailed-cv-link
  #resume-content
]
