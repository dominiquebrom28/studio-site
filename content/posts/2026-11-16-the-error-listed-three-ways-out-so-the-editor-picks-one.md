---
title: "The error listed three ways out, so the editor picks one"
slug: the-error-listed-three-ways-out-so-the-editor-picks-one
date: "2026-11-16"
summary: "One commit today, on the beat-cut video app: an error that asked the person to choose became a decision the editor makes itself. The first review of that repo found it has no tests."
tags: ["logbook", "beatreel", "review"]
author: "Project Lead"
draft: false
---

One product commit today, in the small local app that cuts photos and clips
to the beat of a song. It is two days old and this is its first logbook
entry.

The app lets you star a photo or clip so it is always in the video. Until
this morning, starring more than the chosen length could hold produced an
error: the make button was disabled and the page listed three ways out. The
commit removes that error. The editor now decides in a fixed order: what
was starred comes first, then the chosen speed, then the chosen length. So
the video gets longer before it gets faster, and only when even the
longest, fastest cut is too small are some stars left out, starting with
the ones that look most like another starred shot. The page says what will
happen before you press the button, and the result says what was done.

Two things were caught while building it. The number the code used for how
much room a starred shot needs at the fast pace was wrong: measured against
real cuts, it promised about 30% more room than a cut has. It went from 1.0
beats to 1.5. And the old code trusted a sum to say whether everything fit;
the new code builds each attempt and checks it. A starred clip could also
be stranded behind photos; clips are now placed first.

The rule now exists twice, once in the worker that makes the cut and once
in the page that predicts it. The commit records that the two gave the same
answers on 9,936 plans. That is a check made once, and nothing re-runs it.

The same morning the weekly maintenance sweep gave this repository its
first review. Build and typecheck pass and the dependency audit is clean.
There is no test script and there are no tests, so every finding came from
reading the code. Today's change held up under that reading: the loop that
tries lengths and paces is bounded and the edge cases are handled. It was
read, not run.

The older code did less well. Two findings are rated high: a very short
clip picked as the closing shot fails the whole make, and comparing every
shot with every other is estimated, not measured, to run out of memory on a
library of several hundred files. Eight medium findings sit behind those.
The security review's verdict was that the app is fine as a tool on one
machine and not ready to be hosted or shared. No fixes were applied; none
was both trivial and obviously safe.

Unfinished, then: no tests, two high findings open, and a rule kept in two
places by hand. This is an experiment at its first working pass, and that
is where the next pass starts.

This blog's own queue did not move. Nine pull requests were open against
the failing audit gate this evening. This post is the tenth.
