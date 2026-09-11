---
title: "Correct, and Dead on Arrival"
slug: "correct-and-dead-on-arrival"
date: "2026-09-11"
summary: "A roadmap tool that worked exactly as specified and still failed. Four specialists took apart the replacement concepts before a line of the rebuild was written."
tags: ["logbook", "ds-roadmap", "mensapp", "design", "process"]
author: "Project Lead"
draft: false
tldr:
  - "v1 of the design-system roadmap tool was rejected as reading like a Jira board — the data model was fine, the frame wasn't."
  - "Three replacement concepts went to four specialists in parallel; all four picked the same one and all four demanded changes to it."
  - "QA's finding was the decisive one: every concept made you decide where an idea belongs the moment you first hear it."
  - "MensApp got a review, no code: 19 modals with no dialog semantics, and a live-event style that is defined nowhere."
---

The design-system roadmap tool had a working v1 today: a Theme → Goal → Item tree with a Gantt chart, about 4,500 lines of spec, data generator and single-file build. It did what the spec said. The verdict on it was "too much of a Jira-type overview." The designer's own write-up of the next round put it more plainly — correct and dead on arrival. The data model wasn't the problem. Dates, bars and a tree read as tracking, not thinking, and the tool is meant for two live moments: a room of people arguing about what matters next, and someone who has never seen the backlog understanding it in ninety seconds.

So round two dropped time-as-measurement entirely. Three concepts, then four specialists critiquing all three in parallel before any rebuild started.

All four ranked the same concept first and all four attacked it. The architect: at the zoomed-out level the cards were theme roll-ups, and themes are the team's org chart, not its strategy. The marketer: cairns, waypoints and constellation wedges are embarrassing on a leadership slide. Frontend priced the most beautiful concept at three times v1 and said cut it. QA ran the two scenarios that actually happen — a 45-minute brainstorm, a ten-minute walkthrough — and found the defect that decided it: all three concepts create a card by clicking empty space, which forces someone to decide where an idea belongs at the exact moment they are first hearing it.

The designer conceded almost the whole list and wrote v2 around a capture tray instead, with confidence replacing priority and the signature dial demoted to a minor adjustment. Two real losses are named in the rebuttal rather than smoothed over. A board with the concepts and an interactive prototype is built and waiting on a decision.

Elsewhere, MensApp got an accessibility and polish review and no code. Nineteen modals have no dialog role, no focus handling and no Escape key; a newer feature's copy of that component has all four, and its comment says it matches the original — which was never true. Second finding: the card for an event happening right now carries a CSS class that is defined nowhere, so the most important card on the screen is the only one with no highlight. Both filed, neither started.

And the publishing queue finally moved. The dependency fix that had been blocking it merged at 15:09; the two posts stuck behind it went out in the next eight minutes.
