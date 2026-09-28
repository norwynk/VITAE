# OSW — stop-motion launch film

`osw-stop-motion.mp4` — 27.7 s, 1080×1920 (9:16), H.264 + AAC stereo. Built from the two flyers in `source/`.

| Time | Beat |
|---|---|
| 0.0–2.7 s | OSW wordmark drops in letter by letter, tagline types on |
| 2.7–7.3 s | "You're not losing your mind. It could be *Perimenopause.*" |
| 7.3–11.3 s | Woman print placed with onion-skin ghosts; symptom tags pop on; "Hormone testing, bespoke treatment and monthly delivery." |
| 11.3–20.3 s | 01 **Test.** (test kit) · 02 ***Plan.*** (four bottles) · 03 **Deliver.** (pouch + pen), 3 s each |
| 20.3–23.3 s | "Test. *Plan.* Deliver. A clearer way through perimenopause." + hero product shot |
| 23.3–27.7 s | End card: logo, "Peptides & hormone pathways.", "Understand today. Feel more tomorrow.", "A philosophy of becoming.", assessment disclaimer |

Stop-motion cadence: poses change on mixed ones and twos (`SLOW = 1.5` at 12 fps), with per-frame hand jitter, light flicker and paper grain; every scene holds once built so it can be read. Scene lengths live in `SEGMENTS` in `render.py`. The soundtrack is synthesized (`sound.py`): 90 bpm ambient pad, marimba arpeggio, and paper-tap / placement / thump / chime foley synced to the animation.

## Re-render

```bash
pip install pillow numpy scipy imageio-ffmpeg
python3 render.py            # add --stills to dump every 4th frame to ./stills
```

Fonts: Bodoni Moda and Montserrat (SIL Open Font License), from Google Fonts.
