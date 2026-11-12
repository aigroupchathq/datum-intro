#!/usr/bin/env python3
"""Builds the static pages of datumatelier.uk from one shared head, header and footer.

Run from the repository root:  python3 _build/build.py
GitHub Pages does not publish folders starting with "_", so this script is never served.
Every page is written to the repository root. Edit content here, not in the HTML files.
"""
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://datumatelier.uk"
OG_IMAGE = f"{SITE}/assets/hero/og-datum-1200x630.jpg"

NAV = [
    ("record", "/record.html", "The record"),
    ("keepers", "/keepers.html", "Keepers"),
    ("workshops", "/workshops.html", "Workshops"),
    ("buyers", "/buyers.html", "Buyers"),
    ("partners", "/partners.html", "Partners"),
]

# Operator details: fill these before the redesign goes live.
OPERATOR = 'Vaishnav Deshmukh'
ADDRESS = '<span class="todo">[Service address]</span>'
EMAIL = '<a href="mailto:www.vaishnavdeshmukh@gmail.com">www.vaishnavdeshmukh@gmail.com</a>'


def head(title, description, path, robots="index, follow", extra=""):
    canonical = f'<link rel="canonical" href="{SITE}{path}">' if robots.startswith("index") else ""
    return f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{escape(title)}</title>
<meta name="description" content="{escape(description)}">
<meta name="robots" content="{robots}">
{canonical}
<meta name="theme-color" content="#050505">
<meta property="og:site_name" content="Datum Atelier">
<meta property="og:title" content="{escape(title)}">
<meta property="og:description" content="{escape(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="{SITE}{path}">
<meta property="og:image" content="{OG_IMAGE}">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<link rel="preload" href="/fonts/Archivo-Var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/Inter-Var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/site.css?v=1">
{extra}</head>
"""


def header(current):
    def cur(key):
        return ' aria-current="page"' if key == current else ""
    links = "".join(f'<a href="{href}"{cur(key)}>{label}</a>' for key, href, label in NAV)
    return f"""<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="top">
  <div class="wrap top-row">
    <a class="brand" href="/"{cur("home")}>DATUM <small>ATELIER</small></a>
    <nav class="nav nav-desk" aria-label="Primary">{links}</nav>
    <div class="top-right">
      <span class="status">In development</span>
      <a class="btn primary sm" href="/invite.html">Request an invitation</a>
    </div>
  </div>
  <div class="nav-row"><nav class="nav" aria-label="Primary, small screens">{links}<a href="/invite.html"{cur("invite")}>Invitation</a></nav></div>
</header>
<main id="main" tabindex="-1" class="wrap"><div class="spine">
"""


def footer(film=False):
    film_link = '<button class="js-film" type="button">Play the film</button>' if film else ""
    return f"""</div></main>
<footer><div class="wrap foot">
  <div>
    <a class="brand" href="/">DATUM <small>ATELIER</small></a>
    <p style="margin-top:10px">An independent project in development. Free while in development; pricing will be published before anyone pays.</p>
    <p class="note">Datum is not a vehicle ownership registry, a government database or an inspection authority. Examples on this site are illustrative.</p>
  </div>
  <div>
    <nav class="foot-links" aria-label="Site information"><a href="/invite.html">Request an invitation</a><a href="/privacy.html">Privacy and site information</a>{film_link}</nav>
    <p class="copy" style="margin-top:12px">Copyright &copy; 2026 Datum Atelier</p>
  </div>
</div></footer>
"""


def end(scripts=""):
    return f"{scripts}</body>\n</html>\n"


def sec(inner, mark="", cls=""):
    m = f'<span class="mark{(" " + mark) if mark else ""}" aria-hidden="true"></span>' if mark is not None else ""
    return f'<section class="sec{(" " + cls) if cls else ""}">\n{m}\n{inner}\n</section>\n'


def cta(primary_href, primary, secondary_href=None, secondary=None):
    s = f'<a class="btn primary" href="{primary_href}">{primary}</a>'
    if secondary:
        s += f'<a class="btn ghost" href="{secondary_href}">{secondary}</a>'
    return f'<div class="cta">{s}</div>'


def tag(state):
    cls = {"Live": "tag live"}.get(state, "tag")
    return f'<span class="{cls}">{state}</span>'


def row(title, body, state):
    return f'<div class="row"><h3>{title}</h3><p>{body}</p>{tag(state)}</div>'


STILL = """<div>
  <div class="still" role="img" aria-label="Illustration: a faded handwritten service book page, a black and white photograph of an old car, and a crisp Datum record entry for the same timing belt job, signed at the ramp and kept with the car. Marked illustrative specimen.">
    <div class="still-top">
      <div class="paper" aria-hidden="true">
        <div class="ph"><span>Service record</span><span>1991 coupé</span></div>
        <div class="hw">
          <span class="f1">12.4.96 &nbsp;Oil + filter</span>
          <span class="f1">3.3.99 &nbsp;Clutch, Le Mans trip</span>
          <span class="f2">11.03 &nbsp;Brakes all round</span>
          <span class="f3">Timing belt + pump, 64,2</span>
          <span class="f4">receipt in glovebox?</span>
        </div>
        <span class="stamp">ILLUSTRATIVE SPECIMEN</span>
      </div>
      <div class="print" aria-hidden="true"><img src="/assets/hero/acquire_480.webp" alt="" width="480" height="321" fetchpriority="high"></div>
    </div>
    <div class="entry" aria-hidden="true">
      <div class="eh"><span>Entry 14</span><span>Signed at the ramp</span></div>
      <p class="et">Timing belt and water pump</p>
      <div class="odo"><i class="lz">0</i><i>6</i><i>4</i><i>2</i><i>1</i><i class="last">0</i><b>miles</b></div>
      <dl>
        <div class="erow"><dt>Evidence</dt><dd>Invoice, four ramp photos<br><span class="grade">Supported by evidence</span></dd></div>
        <div class="erow"><dt>Keeper</dt><dd class="keeper-note">Done before the coast run. Worth it.</dd></div>
      </dl>
    </div>
  </div>
  <p class="still-cap">The ink fades. The record holds. Illustrative specimen: the car, people and entries are imagined. Photograph: Egor Vikhrev, Unsplash.</p>
</div>"""

SPLASH = """<div class="splash" id="splash" aria-hidden="true" inert>
  <canvas id="splash-c" aria-hidden="true"></canvas>
  <div class="splash-word" id="splash-word" aria-hidden="true"><b>DATUM</b><span>ATELIER</span></div>
  <div class="splash-count" id="splash-count">31 records, converging</div>
  <button class="splash-skip" id="splash-skip" type="button">Esc, skip</button>
  <div class="splash-still" id="splash-still"><b>31 records.</b><b>One history.</b><span>Reduced motion: the picture arrives whole</span></div>
</div>
"""

FILM_JS = """<script src="/splash-unity.js?v=5"></script>
<script>
[].forEach.call(document.querySelectorAll('.js-film'),function(b){b.addEventListener('click',function(){if(window.DATUM_WORLD)window.DATUM_WORLD.ignite({after:null,source:b});});});
</script>
"""

# ---------------------------------------------------------------- home
JSONLD = """<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
 {"@type":"WebSite","@id":"https://datumatelier.uk/#website","url":"https://datumatelier.uk/","name":"Datum Atelier","inLanguage":"en-GB","publisher":{"@id":"https://datumatelier.uk/#org"}},
 {"@type":"Organization","@id":"https://datumatelier.uk/#org","name":"Datum Atelier","url":"https://datumatelier.uk/","description":"An independent project in development: a custodianship record for cars.","founder":{"@type":"Person","name":"Vaishnav Deshmukh"}}
]}
</script>
"""
home = head("Datum Atelier, a custodianship record for cars",
            "Datum Atelier, now in development, keeps a car's work, evidence and people together through every change of keeper.",
            "/", extra=JSONLD)
home += header("home") + SPLASH.replace("<div class=\"splash\"", "<div class=\"splash\"", 1)
home += sec(f"""<div class="hero-grid">
  <div>
    <h1>Ownership fades.<br><span class="c">Custodianship holds.</span></h1>
    <p class="value">A record that tells you what's there, and what isn't.</p>
    <p class="lede">Datum, now in development, keeps a car's work, evidence and people together through every change of keeper.</p>
    {cta("/invite.html", "Request an invitation", "/record.html", "See a specimen record")}
  </div>
  {STILL}
</div>""", cls="hero")
home += sec("""<span class="label">Who it is for</span>
<h2>Everyone in a car's life has a reason to keep the record.</h2>
<div class="cols c4">
  <a class="door" href="/keepers.html"><span class="who">Keepers and collectors</span><h3>Keep the story your car has earned.</h3><p>Every service, receipt and drive, with its evidence beside it and the gaps in plain sight.</p><span class="go">For keepers</span></a>
  <a class="door" href="/workshops.html"><span class="who">Workshops and technicians</span><h3>Your work, signed and kept with the car.</h3><p>Designed to log a job at the ramp from the invoice you already send. No new software.</p><span class="go">For workshops</span></a>
  <a class="door" href="/buyers.html"><span class="who">The next keeper</span><h3>Know what you're buying, and what's missing.</h3><p>See how each entry is supported before you hand over the money.</p><span class="go">What a buyer sees</span></a>
  <a class="door" href="/partners.html"><span class="who">Clubs, industry and press</span><h3>Your certificates count as evidence.</h3><p>Registers, heritage certificates and specialists are recognised in the record, never replaced.</p><span class="go">Partners and press</span></a>
</div>""")
home += sec(f"""<span class="label">Where Datum stands</span>
<h2>Every claim on this site is marked, like an entry in the record.</h2>
<div class="cols c3">
  <div class="state">{tag("Live")}<ul><li>This site</li><li>The specimen record</li></ul></div>
  <div class="state">{tag("In development")}<ul><li>The record and its evidence grades</li><li>Handover to the next keeper</li></ul></div>
  <div class="state">{tag("Planned")}<ul><li>Entries signed at the ramp</li><li>Independent corroboration</li></ul></div>
</div>""", mark="keeper")
home += sec(f"""<span class="label">If Datum stops</span>
<h2>Your record should outlive us.</h2>
<p class="lede sm">Owner apps and connected-car services have closed before and taken their records with them. Datum is designed so that cannot happen to yours.</p>
<div class="cols c3">
  <div><h3>Export everything</h3><p>A readable PDF and an open data file, with every entry, document and photograph.</p>{tag("Planned")}</div>
  <div><h3>A copy on your device</h3><p>The record opens without our servers, so it keeps working if we do not.</p>{tag("Planned")}</div>
  <div><h3>Fair notice</h3><p>If the service ever closes, you would be told well in advance, with time to take your record with you.</p>{tag("Planned")}</div>
</div>""")
home += sec("""<span class="label">An interlude</span>
<h2>Hold REV.</h2>
<p class="lede sm">The needle answers and settles on its own. The odometer counts your time on this page, on this device only.</p>
<div class="instrument" id="instrument">
  <div class="instrument-stage">
    <div class="instrument-dial"><canvas id="instrument-canvas" role="img" aria-label="Datum rev counter with an odometer counting time spent on this page"></canvas></div>
    <button type="button" class="instrument-rev" id="instrument-rev" aria-label="Hold to rev the engine">REV</button>
  </div>
</div>""")
home += sec(f"""<span class="label">Who is behind Datum</span>
<h2>An independent project, built by one person who keeps cars.</h2>
<div class="cols c3">
  <div><h3>Who</h3><p>Datum Atelier is run by {OPERATOR}. It is a trading name, not a limited company.</p></div>
  <div><h3>How Datum will earn</h3><p>Free while in development. Pricing will be published before anyone pays.</p></div>
  <div><h3>What we will not do</h3><p>No adverts, no insurance upsell, and your data is not sold.</p></div>
</div>""")
home += sec(f"""<span class="label">Invitations</span>
<h2>We invite keepers and workshops in small groups, so we can talk to every one.</h2>
{cta("/invite.html", "Request an invitation")}
<p class="note">Emails only if you ask for them.</p>""", cls="last")
home += footer(film=True) + end(FILM_JS + '<script src="/instrument.js?v=2" defer></script>\n')

# ---------------------------------------------------------------- the record
MOMENTS = [
    ("keeper", "The day it becomes yours", "A 1991 coupé changes hands. Its record opens with identity, starting mileage and the papers that came with it.",
     [("Entry", "Change of keeper"), ("Starting mileage", '<span class="fig">61,380</span> miles, photographed'), ("Evidence", "Three founding documents")],
     "acquire", "A white vintage car parked in a garage. Photograph: Egor Vikhrev, Unsplash."),
    ("", "Kept where the work happens", "A specialist records the service at the ramp, with the invoice and photographs beside it.",
     [("Entry", "Timing belt and water pump"), ("Mileage", '<span class="fig">64,210</span> miles'), ("Evidence", 'Invoice and four ramp photos, <span class="grade">Supported by evidence</span>')],
     "care", "A man working on a car engine in a garage. Photograph: Ahmet Debelemez, Unsplash."),
    ("", "A dawn pass, remembered", "The route is kept as a memory. The home address never leaves the keeper's device.",
     [("Entry", "Keeper's memory, kept apart from the mechanical facts"), ("Route", '<span class="fig">118</span> km, <span class="fig">05:42</span> start'), ("Privacy", "Start and finish trimmed before sharing")],
     "drive", "A long road with a mountain in the background. Photograph: Andrew Svk, Unsplash."),
    ("", "Years later, it reads whole", "Work, evidence, people and memory in one dated history, ready for the next keeper.",
     [("Entries", '<span class="fig">31</span>, each with its source'), ("Gaps", "Two periods with no record found, shown plainly"), ("Handover", "The whole history travels with the car")],
     "reflect", "A red and black steering wheel. Photograph: Stephanie Valencia, Unsplash."),
]
moments = ""
for i, (mk, h, p, facts, img, alt) in enumerate(MOMENTS):
    dl = "".join(f"<dt>{a}</dt><dd>{b}</dd>" for a, b in facts)
    moments += f"""<article class="moment">
  <span class="mark{(" " + mk) if mk else ""}" aria-hidden="true"></span>
  <div><h2 class="h3">{h}</h2><p class="muted" style="margin-top:8px">{p}</p><dl class="facts">{dl}</dl></div>
  <figure class="photo"><img src="/assets/hero/{img}_1280.webp" alt="{alt}" width="1280" height="853" loading="{"eager" if i == 0 else "lazy"}"><figcaption>{alt.split(". ", 1)[1]}</figcaption></figure>
</article>
"""
record = head("The record, Datum Atelier",
              "One car, one dated history: every entry says where it came from and what supports it, and gaps are shown plainly.",
              "/record.html")
record += header("record")
record += sec(f"""<span class="label">The record</span>
<h1>One car, one record.</h1>
<p class="lede">Four moments from an imagined car's life, kept in one dated history. Every entry says where it came from and what supports it.</p>
<p class="note">Illustrative specimen. The car, people and entries are imagined. The filled marker shows a change of keeper.</p>
<div class="timeline">{moments}</div>""")
record += sec(f"""<span class="label">The evidence ladder</span>
<h2>Recorded, supported, corroborated.</h2>
<p class="lede sm">The record never claims more than it can support. It does not certify ownership, condition or mileage.</p>
<div class="cols c3">
  <div><h3>Recorded</h3><p>Each entry carries a source, a date and the person who made it.</p>{tag("In development")}</div>
  <div><h3>Supported by evidence</h3><p>Invoices, photographs and documents sit beside the claim they support.</p>{tag("In development")}</div>
  <div><h3>Independently corroborated</h3><p>A second qualified party confirms the work, so one voice is never the only witness.</p>{tag("Planned")}</div>
</div>""")
record += sec(f"""<span class="label">What isn't there</span>
<h2>Gaps are part of the story.</h2>
<p class="lede sm">A missing year is shown as "no record found", never hidden and never called neglect. Keepers can explain a gap, for example a car laid up off the road, and official records can support the explanation.</p>
{tag("Planned")}""")
record += sec(f"""<span class="label">How it works</span>
<h2>From the garage to the record.</h2>
<ol class="steps s4">
  <li><h3>The car</h3><p>Kept in the garage, used on the road.</p></li>
  <li><h3>A passport</h3><p>A QR code links the car to its record. {tag("Planned")}</p></li>
  <li><h3>The work</h3><p>Recorded at the ramp and signed by the person who did it.</p></li>
  <li><h3>The record</h3><p>Evidence beside each entry, in one history that lasts.</p></li>
</ol>
{cta("/invite.html", "Request an invitation", "/keepers.html", "For keepers")}""", cls="last")
record += footer() + end()

# ---------------------------------------------------------------- keepers
keepers = head("For keepers and collectors, Datum Atelier",
               "Keep the story your car has earned: every service, receipt and drive, with its evidence beside it and the gaps in plain sight.",
               "/keepers.html")
keepers += header("keepers")
keepers += sec(f"""<span class="label">For keepers and collectors</span>
<h1>Keep the story your car has earned.</h1>
<p class="lede">One dated history for each car. Evidence beside every entry. Your own notes and memories kept apart from the mechanical facts.</p>
{cta("/invite.html?role=owner", "Request an invitation")}""")
keepers += sec(f"""<span class="label">What worries keepers, answered</span>
<h2>The usual ways a car's history gets lost.</h2>
<div class="rows">
  {row("Paperwork goes missing", "Photograph a receipt once and it stays with the car's record, next to the work it proves.", "In development")}
  {row("Gaps cost money at sale", "Gaps are shown plainly, with room to explain them, so a buyer is not left guessing.", "Planned")}
  {row("Your address gets shared", "The home address never leaves your device, and nothing is shared unless you choose to share it.", "In development")}
  {row("The app shuts down", "Export everything as a PDF and an open data file, and keep a copy that opens without us.", "Planned")}
  {row("Being sold to", "No adverts, no insurance upsell, and your data is not sold.", "Live")}
</div>""")
keepers += sec(f"""<span class="label">Several cars</span>
<h2>One record per car, ready for any handover.</h2>
<p class="lede sm">Export a car's full history for an insurer, an auction house or your family, in a form they can read without an account.</p>
{tag("Planned")}
{cta("/invite.html?role=collector", "Request an invitation as a collector", "/record.html", "See a specimen record")}""", cls="last")
keepers += footer() + end()

# ---------------------------------------------------------------- workshops
workshops = head("For workshops and technicians, Datum Atelier",
                 "Your work, signed and kept with the car. Designed for independent specialists: log a job at the ramp from the invoice you already send.",
                 "/workshops.html")
workshops += header("workshops")
workshops += sec(f"""<span class="label">For workshops and technicians</span>
<h1>Your work, signed and kept with the car.</h1>
<p class="lede">Designed for independent specialists who want good work to stay visible long after the car leaves the ramp.</p>
{cta("/invite.html?role=workshop", "Join the workshop pilot")}""")
workshops += sec(f"""<span class="label">How it would work</span>
<h2>No new software. A minute at the ramp.</h2>
<ol class="steps">
  <li><h3>Scan or forward</h3><p>Scan the car's code, or forward the invoice you already email to the customer.</p></li>
  <li><h3>Add the proof</h3><p>Two photographs and a line about what you found.</p></li>
  <li><h3>Signed and kept</h3><p>The entry carries your name and stays with the car through every keeper.</p></li>
</ol>
<p class="note">{tag("Planned")} &nbsp;This is the design we want to test with workshops, not a working service yet.</p>""")
workshops += sec(f"""<span class="label">What is in it for you</span>
<h2>Credit where the work happens.</h2>
<div class="rows">
  {row("Your name on your work", "Every car you have worked on carries a signed record of what you did.", "Planned")}
  {row("Fewer disputes", "The invoice and photographs sit beside the claim, so questions are settled by evidence.", "Planned")}
  {row("What we will not do", "No ratings, no leaderboards, no selling your customers' data, and no system to replace the one you run.", "Live")}
</div>""")
workshops += sec(f"""<span class="label">The pilot</span>
<h2>We are looking for a few independent workshops to shape this with us.</h2>
<p class="lede sm">A short conversation, then trying early versions on real jobs if it suits you. No cost, and no commitment.</p>
{cta("/invite.html?role=workshop", "Join the workshop pilot")}""", cls="last")
workshops += footer() + end()

# ---------------------------------------------------------------- buyers
buyers = head("For buyers, Datum Atelier",
              "Know what you're buying, and what's missing: a Datum record shows how each entry is supported and where the history has gaps.",
              "/buyers.html")
buyers += header("buyers")
buyers += sec(f"""<span class="label">For the next keeper</span>
<h1>Know what you're buying, and what's missing.</h1>
<p class="lede">When a car comes with a Datum record, you see how each entry is supported before you hand over the money.</p>
{cta("/record.html", "See a specimen record")}""")
buyers += sec(f"""<span class="label">What a buyer sees</span>
<h2>The whole history, graded honestly.</h2>
<div class="rows">
  {row("Every entry graded", "Recorded, supported by evidence, or independently corroborated. You see which.", "In development")}
  {row("Gaps in plain sight", "Missing periods show as \"no record found\", with any explanation the keeper has given.", "Planned")}
  {row("Nothing quietly removed", "The seller cannot hide entries before a sale. A removal leaves a visible mark.", "Planned")}
</div>""")
buyers += sec(f"""<span class="label">What a record cannot do</span>
<h2>A good record is not an inspection.</h2>
<p class="lede sm">A Datum record does not prove ownership, condition or that a mileage reading is true. Check the car's official history and have it inspected by someone you trust.</p>
{cta("/invite.html?role=other", "Request an invitation", "/keepers.html", "For keepers")}""", cls="last")
buyers += footer() + end()

# ---------------------------------------------------------------- partners
partners = head("Partners and press, Datum Atelier",
                "Clubs, registers, heritage bodies, industry and press: certificates count as evidence in the record, shared only with the keeper's permission.",
                "/partners.html")
partners += header("partners")
partners += sec(f"""<span class="label">Clubs, industry and press</span>
<h1>Your certificates count as evidence.</h1>
<p class="lede">Datum works alongside the people who already keep marque history. It recognises your records, and never replaces them.</p>
{cta("/invite.html?role=other", "Start a conversation")}""")
partners += sec(f"""<span class="label">Who we want to talk to</span>
<h2>Partners in the car's life.</h2>
<div class="rows">
  {row("Clubs, registers and heritage bodies", "Certificates and register entries can sit in the record as evidence, credited to you. Datum has no marketplace and does not compete for your members.", "Planned")}
  {row("Insurers, valuers and auction houses", "Records shared only with the keeper's permission, in open formats you can read without an account.", "Planned")}
  {row("Garage software", "Connections to the systems workshops already use, so nobody types a job twice.", "Planned")}
</div>""")
partners += sec(f"""<span class="label">Engineering directions</span>
<h2>Further out, and clearly labelled.</h2>
<p class="lede sm">The record comes first. These are directions under exploration, with no performance claims or launch dates.</p>
<div class="cols c2">
  <div><h3>Datum ADAS</h3><p>Presenting the car's own information in the windscreen: navigation, diagnostics and its record, with no subscription fees and no data selling. Early technology preview, SAE Level 0.</p>{tag("Planned")}</div>
  <div><h3>Vision intelligence</h3><p>Computer vision that understands the scene on the device, rather than streaming footage to a cloud.</p>{tag("Planned")}</div>
</div>""")
partners += sec(f"""<span class="label">Press and investors</span>
<h2>Who is behind Datum.</h2>
<p class="lede sm">Datum Atelier is an independent project run by {OPERATOR}. Write to {EMAIL}.</p>
{cta("/invite.html?role=other", "Start a conversation")}""", cls="last")
partners += footer() + end()

# ---------------------------------------------------------------- invite
invite = head("Request an invitation, Datum Atelier",
              "Request an invitation to try Datum. We invite keepers and workshops in small groups, so we can talk to every one.",
              "/invite.html")
invite += header("invite")
invite += sec("""<span class="label">Invitation</span>
<h1>Request an invitation.</h1>
<div class="invite-grid">
  <div>
    <p class="lede" id="invite-lede" data-live="We invite keepers and workshops in small groups, so we can talk to every one. We use your email only to arrange that.">This form is a preview. It does not send an invitation request or collect your details yet.</p>
    <p class="note">Free while in development. Pricing will be published before anyone pays.</p>
    <p class="note prose"><a href="/privacy.html">Privacy and site information</a></p>
  </div>
  <form class="invite-form" id="invite-form" novalidate data-endpoint="/api/invite" data-sitekey="">
    <div class="field">
      <label for="if-email">Email</label>
      <input id="if-email" name="email" type="email" autocomplete="email" inputmode="email" required maxlength="254" placeholder="you@example.com" aria-describedby="if-email-err">
      <p class="field-err" id="if-email-err" hidden></p>
    </div>
    <fieldset class="field" aria-describedby="if-role-err">
      <legend>Which describes you best?</legend>
      <label class="choice"><input type="radio" name="role" value="owner"> I keep a car</label>
      <label class="choice"><input type="radio" name="role" value="collector"> I keep several cars</label>
      <label class="choice"><input type="radio" name="role" value="workshop"> I run or work in a workshop</label>
      <label class="choice"><input type="radio" name="role" value="other"> Something else</label>
      <p class="field-err" id="if-role-err" hidden></p>
    </fieldset>
    <div class="field">
      <label for="if-note">Your car, or your workshop <span class="opt">(optional)</span></label>
      <textarea id="if-note" name="note" maxlength="500" placeholder="A sentence is enough."></textarea>
    </div>
    <label class="choice consent"><input type="checkbox" name="updates" id="if-updates"> Email me occasional news about Datum. Optional, and you can stop at any time.</label>
    <div class="hp" aria-hidden="true"><label for="if-company">Company</label><input id="if-company" name="company" type="text" tabindex="-1" autocomplete="off"></div>
    <div id="if-turnstile" class="turnstile-slot"></div>
    <button class="btn primary" type="submit">Preview response</button>
    <p class="form-note" id="form-note" role="status" aria-live="polite">Preview only. Nothing leaves your device yet.</p>
  </form>
</div>""", cls="last")
invite += footer() + end('<script src="/invite.js?v=2" defer></script>\n')

# ---------------------------------------------------------------- privacy
privacy = head("Privacy and site information, Datum Atelier",
               "Who runs datumatelier.uk, what the site stores and sends, and your rights.",
               "/privacy.html")
privacy += header("privacy")
privacy += sec(f"""<span class="label">Site information</span>
<h1>Privacy and site information</h1>
<p class="lede">Who runs this website, what it stores and sends, and what you can ask of us. Written for the site as it works today.</p>
<div class="prose">
<h2 style="margin-top:40px">Who runs this site</h2>
<p style="margin-top:10px">Datum Atelier is an independent automotive software project in development. It is a trading name, not a limited company.</p>
<dl class="facts"><dt>Operated by</dt><dd>{OPERATOR}</dd><dt>Email</dt><dd>{EMAIL}</dd></dl>

<h2 style="margin-top:40px">What this site collects today</h2>
<p style="margin-top:10px"><b>Form status: preview.</b> The invitation form does not send anything yet, and nothing you enter leaves your device. When it is switched on, this line will say so and give the date.</p>
<p style="margin-top:10px">There are no analytics, advertising or tracking cookies on this site, and your browser stores nothing for it.</p>

<h2 style="margin-top:40px">If you request an invitation</h2>
<p style="margin-top:10px">Once the form is switched on, this is exactly what happens to what you send.</p>
<dl class="facts">
  <dt>What we keep</dt><dd>Your email address, the option that describes you (keeper, collector, workshop or something else), the note you write if any, and whether you asked for news by email, with the exact wording you agreed to and the date.</dd>
  <dt>Why</dt><dd>To invite you to try Datum and talk to you about it. If, and only if, you tick the separate news box, to send occasional news about Datum.</dd>
  <dt>Lawful basis</dt><dd>Your consent. You can withdraw it at any time by writing to {EMAIL}, and every news email will include a way to stop.</dd>
  <dt>Where it is kept</dt><dd>In a database run by Cloudflare, which acts on our instructions as our processor. Cloudflare may process data outside the UK under the safeguards in its data processing terms.</dd>
  <dt>Spam check</dt><dd>Cloudflare Turnstile checks that a person is using the form. It loads only on the invitation page and processes technical information about your browser for that purpose. See the <a href="https://www.cloudflare.com/turnstile-privacy-policy/">Turnstile privacy notice</a>.</dd>
  <dt>How long</dt><dd>Deleted automatically 24 months after you last sent the form, or sooner if you ask.</dd>
  <dt>Who sees it</dt><dd>Only the person who runs Datum. It is not sold, published or shared.</dd>
</dl>
<p style="margin-top:10px">Sending the form does not trigger an automatic email.</p>

<h2 style="margin-top:40px">Hosting and security</h2>
<p style="margin-top:10px">The site is hosted by GitHub Pages and delivered through Cloudflare. To deliver and protect the site, they process technical information about each request, such as your IP address and browser type. Cloudflare may run a security check and set a cookie that is strictly necessary to tell people from automated traffic. See the <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub privacy statement</a> and the <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare privacy policy</a>.</p>

<h2 style="margin-top:40px">Your rights</h2>
<p style="margin-top:10px">Under UK data protection law you can ask what information we hold about you, and ask for it to be corrected or deleted. Write to {EMAIL}. If you are unhappy with how we handle your information, you can complain to the Information Commissioner's Office at <a href="https://ico.org.uk/make-a-complaint/">ico.org.uk</a>.</p>

<h2 style="margin-top:40px">Photographs and type</h2>
<p style="margin-top:10px">Photographs by Egor Vikhrev, Ahmet Debelemez, Andrew Svk and Stephanie Valencia, used under the free Unsplash Licence and shown in black and white. Every vehicle shown is illustrative, not a customer car. Typefaces: Archivo, Inter, IBM Plex Mono and Caveat, used under the SIL Open Font Licence.</p>
<p class="note" style="margin-top:28px">Last updated 12 November 2026.</p>
</div>""", cls="last")
privacy += footer() + end()

# ---------------------------------------------------------------- 404
notfound = head("No record at this address, Datum Atelier", "This page does not exist.", "/404.html", robots="noindex")
notfound += header("")
notfound += sec(f"""<span class="label">404</span>
<h1>No record found at this address.</h1>
<p class="lede">The page may have moved when the site was reorganised. Start again from the beginning.</p>
{cta("/", "Go to the home page", "/record.html", "See a specimen record")}""", cls="last")
notfound += footer() + end()

PAGES = {
    "index.html": home, "record.html": record, "keepers.html": keepers, "workshops.html": workshops,
    "buyers.html": buyers, "partners.html": partners, "invite.html": invite, "privacy.html": privacy,
    "404.html": notfound,
}
# compact.html is the old noindex preview address: keep it as a copy of the home page, not indexed.
PAGES["compact.html"] = home.replace('<meta name="robots" content="index, follow">', '<meta name="robots" content="noindex">').replace(f'<link rel="canonical" href="{SITE}/">', "")

for name, html in PAGES.items():
    (ROOT / name).write_text(html, encoding="utf-8")

urls = ["/", "/record.html", "/keepers.html", "/workshops.html", "/buyers.html", "/partners.html", "/invite.html", "/privacy.html"]
sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
for u in urls:
    sitemap += f"  <url>\n    <loc>{SITE}{u}</loc>\n    <lastmod>2026-11-12</lastmod>\n  </url>\n"
sitemap += "</urlset>\n"
(ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8")
print("built", ", ".join(PAGES))
