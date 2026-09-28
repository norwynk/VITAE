# OSW — stop-motion launch film

`osw-stop-motion.mp4` — 15 s, 1080×1920 (9:16), H.264 + AAC stereo. Built from the two flyers in `source/`.

| Time | Beat |
|---|---|
| 0.0–1.7 s | OSW wordmark drops in letter by letter, tagline types on |
| 1.7–4.0 s | "You're not losing your mind. It could be *Perimenopause.*" |
| 4.0–6.3 s | Woman print placed with onion-skin ghosts; symptom tags pop on; "We come to you." |
| 6.3–11.3 s | 01 **Test.** (test kit) · 02 ***Plan.*** (four bottles) · 03 **Deliver.** (pouch + pen) |
| 11.3–13.0 s | "Test. *Plan.* Deliver. A clearer way through perimenopause." + hero product shot |
| 13.0–15.0 s | End card: logo, "Peptides & hormone pathways.", "We come to you.", "A philosophy of becoming.", assessment disclaimer |

Animated at 12 fps (true stop-motion cadence) with per-frame hand jitter, light flicker and paper grain; soundtrack is synthesized (`sound.py`): 90 bpm ambient pad, marimba arpeggio, and paper-tap / placement / thump / chime foley synced to the animation.

## Re-render

```bash
pip install pillow numpy scipy imageio-ffmpeg
python3 render.py            # add --stills to dump every 4th frame to ./stills
```

Fonts: Bodoni Moda and Montserrat (SIL Open Font License), from Google Fonts.
