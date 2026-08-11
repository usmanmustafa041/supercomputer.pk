# Scroll unfold, demo

A test of what the home page could be, built around the disassembly video. Not
wired into the site: this folder stands on its own so it can be thrown away or
rebuilt without touching anything.

Open `index.html` in a browser. No build, no server needed.

## What is going on

The video is 8 seconds, 192 frames. Playing it back on scroll by setting
`currentTime` on a `<video>` stutters, because seeking a compressed stream is
not free. So the frames are pulled out as stills and drawn to a canvas instead.

Two things make it feel smooth rather than merely functional:

**The frames are not evenly spaced in time.** Motion in the clip is very uneven:
almost nothing happens for the first half second, it unfolds hard between
frames 30 and 85, then settles slowly for the last two seconds. Sampling that
evenly would feel stuck at both ends and rushed in the middle. So the per-frame
difference was measured, and frames were picked at equal steps of *visual
change* rather than equal steps of time. 103 of the 192 survive, every single
one through the fast unfold and roughly one in five through the quiet parts.
Scroll then maps straight to the frame list and the speed feels constant.

**Scroll position is chased, not followed.** Scroll events arrive in coarse
bursts, especially on a trackpad. Drawing exactly where the scroll says lands
you on visible steps. The render loop eases toward the target instead and parks
itself once they agree.

## Where the type goes

The machine starts as a narrow tower and ends as a wide flat layout almost four
times the width. Text placed by eye works at one end and collides at the other.

So the subject's bounding box was measured on every frame (`bbox.js`) and the
canvas frames the *machine*, not the plate: its box is scaled to a set share of
the height and parked at a set point, so it stays a constant size and the band
underneath is always free. The box is also published as CSS variables
(`--mx0`, `--mx1`, `--my1`), so the layout can sit beside the machine while it
is narrow and below it once it is wide, and the callout labels ride along with
it instead of drifting off the parts they name.

The plate background is not quite black, so once it is drawn smaller than the
window its edge shows as a faint rectangle. The last tenth of each side is faded
into the page colour to hide the seam.

## Regenerating the frames

Needs ffmpeg. The source is `video.mp4`.

Frames are 1280px wide WebP at quality 74, about 6.7MB for all 103. Higher
than that is not worth it: the footage is grainy dark metal, which WebP does
not compress well, and 1600px cost another 60% for no visible gain.

## The rest of the page

The site header, category grid, pillars, call to action and footer are all in
here too, so the hero can be judged as part of a home page rather than on its
own. They are static markup copied to match the real components, not wired to
anything.

The header fades out over the hero so the machine is not boxed in, then goes
solid once the sticky section is behind you, because text scrolling under a
see-through bar looks scruffy.

## Known gaps

- Not integrated with the site, and deliberately so.
- Frames are eagerly loaded. It starts once 24 have landed, which is fine on a
  desk and untested on a slow phone connection.
- The label positions are hand-placed against the final frame. If the video is
  re-rendered they will need moving.
- Copy is a first pass, written to show how the type behaves rather than to be
  final.
- The white rim glow is baked into the footage. It can be removed, but not
  cheaply: a brightness curve cannot do it, because the halo peaks brighter
  than the case panel behind it and much of the machine sits in the same range.
  Edge detection plus a flood fill from the border gets most of the way there,
  and then leaks through the top edge of the case, which has no strong gradient
  to stop it. Left alone for now.
