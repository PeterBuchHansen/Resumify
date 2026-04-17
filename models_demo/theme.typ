// Resume theme: light page, orange accents, sans-serif, square photo,
// Skill ratings: card-suit diamonds (filled vs hollow), orange hero band.

// --- Palette ---
#let c-orange = rgb(217, 119, 6)
#let c-orange-dark = rgb(217, 119, 6)
/// Solid fill for the resume name band (~#E67E22 reference).
#let c-orange-header = rgb(230, 126, 34)
#let c-page = rgb("#f3f3f1")
#let c-ink = rgb("#1c1917")
#let c-muted = rgb("#57534e")
#let c-link = rgb("#2563eb")
/// Gray middle dot (·) between date and tenure, or location segments (see résumé reference).
#let cv-mid-dot = text(fill: c-muted)[·]
/// Right-hand dates / tenure on `==` rows (`c-muted`); position text stays `c-ink` from the heading `set text`.
#let cv-date-range(body) = text(weight: "bold", fill: c-muted)[#body]

/// Main column `==` (job / education row): keep below `=` sections; smaller than body default looks too timid.
#let cv-main-h2-size = 9.5pt

// --- Layout ---
#let cv-sidebar-width = 2.0in
#let cv-column-gutter = 0.28in
/// Sidebar: gap under Languages / SoMe / … title row before that section’s body (`sidebar-section` grid).
#let cv-sidebar-header-below = 1.05em

#let cv-font = ("DejaVu Sans",)

/// Experience / education **line 1** (left): employer or school — bold black (same sans as sidebar).
#let cv-exp-company(body) = text(
  weight: "bold",
  fill: c-ink,
  font: cv-font,
  size: cv-main-h2-size,
)[#body]
/// **Line 2**: job title or degree — regular, slightly smaller (LinkedIn-style stack under company \| dates).
#let cv-exp-role-line(body) = block(width: 100%, spacing: 0.1em)[
  #text(font: cv-font, size: 9.35pt, weight: "regular", fill: c-ink)[#body]
]

// Header contact row: Font Awesome 6 (Solid + Brands). Requires `models/fonts/*.otf` and `--font-path`.
#let _fa-free = "Font Awesome 6 Free"
#let _fa-brands = "Font Awesome 6 Brands"
#let _hdr-fa(glyph, font: _fa-free, weight: 900) = text(font: font, weight: weight, size: 1.08em, fill: white)[#glyph]

#let cv-header-icon-pin = _hdr-fa("\u{f3c5}")
#let cv-header-icon-phone = _hdr-fa("\u{f095}")
#let cv-header-icon-at = _hdr-fa("\u{f1fa}")

/// Map YAML `icon` id (`linkedin`, `github`, …) to a Font Awesome Brands codepoint; unknown / empty → plain link only.
#let sidebar-profile-glyph(icon-id) = {
  let s = str(icon-id).trim()
  if s == "linkedin" {
    "\u{f08c}"
  } else if s == "github" {
    "\u{f09b}"
  } else {
    none
  }
}

/// SoMe row: compact so long labels (e.g. LinkedIn) fit the narrow sidebar without wrapping.
#let sidebar-some-link-size = 7.2pt
#let sidebar-some-icon-size = 7.65pt

/// Sidebar profile row: FA Brands glyph + link.
#let sidebar-brand-profile(url, label, glyph) = block(
  spacing: 0em,
  width: 100%,
)[
  #grid(
    columns: (auto, 1fr),
    column-gutter: 0.3em,
    align: horizon,
  )[
    #text(font: _fa-brands, weight: 400, fill: c-link, size: sidebar-some-icon-size)[#glyph]
  ][
    #link(url)[#text(size: sidebar-some-link-size, fill: c-link)[#label]]
  ]
]

// U+2666 BLACK DIAMOND SUIT, U+2662 WHITE DIAMOND SUIT (playing cards).
#let _card-dia-filled = "\u{2666}"
#let _card-dia-empty = "\u{2662}"

/// Five card-suit diamonds: `level` filled (0–5), rest outline.
#let rating-diamonds(level) = {
  let n = calc.min(5, calc.max(0, level))
  for i in range(5) {
    if i < n {
      text(fill: c-orange, size: 9.2pt, weight: "bold")[#_card-dia-filled]
    } else {
      text(fill: c-orange, size: 9.2pt)[#_card-dia-empty]
    }
  }
}

/// Left column: bold title with orange rule on the same row, then body.
/// One grid (header row + full-width body row) avoids extra paragraph glue between rule and body.
#let sidebar-section(title, body) = block(spacing: 0em)[
  #grid(
    columns: (auto, 1fr),
    column-gutter: 0.35em,
    row-gutter: cv-sidebar-header-below,
    align: (bottom + left, bottom + right),
    text(size: 10pt, weight: "bold", fill: c-ink)[#title],
    line(length: 100%, stroke: 0.85pt + c-orange),
    grid.cell(colspan: 2, align: top + left)[#body],
  )
  // Gap before the *next* sidebar section (`par.spacing` does not apply between these blocks).
  #v(1.08em)
]

/// Skill group: category title on the left, rating diamonds on the right (optional), then tech line.
/// When ratings are hidden, the header row keeps the same two-column grid and spacer size as when
/// diamonds show, so the skill item lines do not shift upward.
#let skill-category(rating: 3, show_rating: true, title, items) = block(spacing: 0em)[
  #grid(
    columns: (1fr, auto),
    column-gutter: 0.35em,
    align: horizon,
    text(size: 9pt, weight: "bold", fill: c-ink)[#title],
    align(right)[
      #if show_rating [
        #rating-diamonds(rating)
      ] else [
        #context {
          let sz = measure(rating-diamonds(rating))
          box(width: sz.width, height: sz.height)
        }
      ]
    ],
  )
  #text(size: 8.4pt, fill: c-muted, hyphenate: false)[#items]
  #v(1.0em)
]

/// Profile image: full sidebar width, square crop, rounded corners, no border.
/// Renders nothing when `use-photo: false`.
#let cv-photo-square(
  use-photo: false,
  photo-path: "profile.png",
) = block(width: 100%, spacing: 0em)[
  #if use-photo {
    box(
      width: 100%,
      height: cv-sidebar-width,
      clip: true,
      radius: 6pt,
      stroke: none,
    )[#image(photo-path, width: 100%, height: 100%, fit: "cover")]
    v(0.75em)
  }
]

/// Orange band around structured header markup (`resume-header.typ`): use `==` for
/// the name, `=` for the tagline, `#line(...)`, then an inline contact row (see `resume-header.typ`).
#let resume-header-band(body) = block(
  width: 100%,
  inset: (x: 16pt, y: 16pt, bottom: 10pt),
  fill: c-orange-header,
  breakable: false,
  spacing: 0.5em,
  radius: (top: 5pt, bottom: 5pt, left: 0pt, right: 5pt),
)[
  #set text(fill: white)
  #set par(justify: false, leading: 0.65em, spacing: 0em)
  #show heading.where(level: 2): it => block(spacing: 0em, breakable: false)[
    #text(
      font: cv-font,
      size: 25pt,
      weight: "bold",
      tracking: -0.02em,
    )[#it.body]
    #v(0.34em)
  ]
  #show heading.where(level: 1): it => block(spacing: 0em, breakable: false)[
    #text(font: cv-font, size: 8.85pt, weight: "regular", tracking: -0.015em)[#it.body]
    #v(0.38em)
  ]
  #set line(stroke: 0.55pt + white)
  #set text(font: cv-font, size: 8.5pt, fill: white)
  // No underline: still clickable; `text(..)[#it]` keeps the link without re-matching `show link`.
  #show link: it => text(fill: white)[#it]
  #body
]

/// Page fill, sans body text, orange underlines on `=` headings.
/// Pass `page-footer` for content repeated at the bottom of every page (e.g. attribution).
#let apply-cv-theme(body, page-footer: none) = {
  set page(paper: "a4", margin: 1.05cm, fill: c-page, footer: page-footer)
  set text(font: cv-font, size: 10pt, lang: "en", fill: c-ink)
  set heading(numbering: none)
  set par(justify: true, leading: 0.62em)
  set list(indent: 0.6em, body-indent: 0.35em, marker: sym.bullet)

  // `=`: title + orange rule on one row (not a full-width hline under the title).
  show heading.where(level: 1): it => block(spacing: 0.38em, breakable: false)[
    #grid(
      columns: (auto, 1fr),
      column-gutter: 0.35em,
      align: horizon,
      text(size: 13pt, weight: "bold", fill: c-ink, font: cv-font)[#it.body],
      line(length: 100%, stroke: 0.9pt + c-orange),
    )
  ]

  // `==`: line 1 = employer \| dates (sans, same as sidebar); line 2 = `#cv-exp-role-line`.
  show heading.where(level: 2): it => block(width: 100%, spacing: 0.32em, breakable: false)[
    #set text(font: cv-font, size: cv-main-h2-size, fill: c-ink)
    #it.body
  ]

  body
}

#let cv-columns(left-column, right-column) = grid(
  columns: (cv-sidebar-width, 1fr),
  column-gutter: cv-column-gutter,
  align: top,
)[#left-column][#right-column]
