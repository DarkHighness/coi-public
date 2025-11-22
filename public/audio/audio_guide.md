# Audio Ambience Guide

This game uses an environment-based audio system. The AI detects the current scene's atmosphere and selects an environment tag. The game then plays the corresponding audio loop.

## Environment Enums & File Mappings

Place your `.mp3` or `.wav` files in the corresponding folders. The system will look for a file named `ambience.mp3` in each folder by default, or you can configure specific mappings in the code.

| Environment Tag | Folder Path        | Recommended Audio Style                                      |
| :-------------- | :----------------- | :----------------------------------------------------------- |
| `forest`        | `/audio/forest/`   | Birds, wind in trees, rustling leaves, nature sounds.        |
| `dungeon`       | `/audio/dungeon/`  | Dripping water, echoes, low rumble, chains, eerie silence.   |
| `city`          | `/audio/city/`     | Crowd noise, carriages/cars, distant chatter, street bustle. |
| `tavern`        | `/audio/tavern/`   | Laughter, clinking glasses, fireplace crackle, bard music.   |
| `ocean`         | `/audio/ocean/`    | Waves crashing, seagulls, wind, ship creaking.               |
| `combat`        | `/audio/combat/`   | Intense music, drums, weapon clashes, fast-paced rhythm.     |
| `mystical`      | `/audio/mystical/` | Chimes, ethereal pads, magical hum, soft choir.              |
| `quiet`         | `/audio/quiet/`    | Minimal sound, soft wind, room tone, silence.                |
| `cave`          | `/audio/cave/`     | Wind howling, bats, echoey drips, hollow sounds.             |
| `market`        | `/audio/market/`   | Haggling voices, coins jingling, animals, busy atmosphere.   |
| `rain`          | `/audio/rain/`     | Rain falling, thunder (distant), puddles splashing.          |
| `storm`         | `/audio/storm/`    | Heavy rain, loud thunder, howling wind, intense atmosphere.  |
| `snow`          | `/audio/snow/`     | Wind howling, crunching snow, silence, icy atmosphere.       |
| `desert`        | `/audio/desert/`   | Wind blowing sand, heat shimmer sounds, silence.             |
| `Unknown`       | N/A                | No audio plays.                                              |

## Implementation Details

- **File Format**: MP3 or OGG is recommended for web compatibility and size.
- **Looping**: Ensure audio files are seamless loops for the best experience.
- **Volume**: Normalize audio files to -14 LUFS to ensure consistent volume levels across tracks.

## Adding New Environments

1.  Add the new enum to `GameResponse` in `types.ts`.
2.  Add the new enum to `gameResponseSchema` in `services/schemas.ts`.
3.  Create a new folder in `public/audio/`.
4.  Add the mapping to `hooks/useStoryAudio.ts` (or wherever the audio logic resides).
