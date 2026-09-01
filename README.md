# DataLabel Pro - AI Annotation Workbench

A realistic AI data annotation work environment simulator for training students on bounding box labeling, object classification, image description writing, and quality review workflows.

## Features

- **50 New Images Daily**: Uses Picsum Photos with date-based seeds — same 50 images all day, new set tomorrow
- **High Resolution Images**: 1600x1067 pixels for crisp annotation detail
- **26 Object Classes**: 25 predefined categories + Custom Object for user-defined labels
- **Image Commentary**: Write detailed scene descriptions before submitting — improves scoring and aids review
- **No Scroll Needed**: Entire interface fits in viewport — image auto-scales to available space
- **Session-Based Scoring**: Every page reload starts a brand new session with zero stats (no persistence)
- **Per-Image Review**: After each image, see precision %, time spent, commentary, and a score out of 100
- **Final Report**: After 50 images, see overall accuracy, total score, time spent, commentary count, and performance breakdown
- **Responsive Canvas**: Image resizes automatically on window resize, maintains aspect ratio
- **Real Photos**: Street scene images from Picsum Photos (free, no attribution)
- **Interactive Canvas**: Click and drag to draw bounding boxes on real photos
- **Keyboard Shortcuts**: Full hotkey support for classes, navigation, submit, skip, and clear

## Object Classes

### Vehicles
| Class | Shortcut | Description |
|-------|----------|-------------|
| Car | `1` | 4-wheel passenger vehicle |
| Truck | `2` | Commercial freight vehicle |
| Bus | `T` | Public transit vehicle |
| Motorcycle | `Y` | 2-wheel motorized vehicle |
| Cyclist | `4` | Bike/motorcycle rider |

### People & Animals
| Class | Shortcut | Description |
|-------|----------|-------------|
| Pedestrian | `3` | Person walking |
| Dog | `Q` | Domestic canine animal |
| Cat | `W` | Domestic feline animal |
| Bird | `E` | Flying avian creature |

### Nature
| Class | Shortcut | Description |
|-------|----------|-------------|
| Tree | `6` | Any standing woody plant |
| Flower | `7` | Flowering plant or bush |
| Mountain | `8` | Large natural elevation |
| River | `A` | Natural flowing waterway |
| Lake | `S` | Large inland body of water |
| Cloud | `D` | Visible atmospheric vapor |

### Infrastructure
| Class | Shortcut | Description |
|-------|----------|-------------|
| Building | `9` | Man-made structure with walls |
| Bridge | `P` | Structure spanning obstacle |
| Fence | `F` | Barrier structure |
| Mailbox | `G` | Postal delivery receptacle |
| Trash Can | `H` | Public waste container |
| Bench | `0` | Public seating furniture |

### Traffic & Signs
| Class | Shortcut | Description |
|-------|----------|-------------|
| Traffic Light | `5` | Traffic signal device |
| Street Sign | `R` | Road/street informational sign |
| Stop Sign | `O` | Octagonal red traffic sign |
| Fire Hydrant | `U` | Red roadside water access |
| Parking Meter | `I` | Coin-operated parking device |

### Other
| Class | Shortcut | Description |
|-------|----------|-------------|
| Custom Object | `Z` | User-defined object class — draw box, then type a label (max 30 chars) |

## Image Commentary

Each image includes a **commentary textarea** where annotators can write a free-text description of the scene. This simulates real-world annotation workflows where context notes help reviewers and QA teams.

### How it works
- The commentary box is pinned below the class list in the right panel
- Write up to **500 characters** per image
- Commentary is **saved per image** — switching images preserves your notes
- The task queue shows a blue "note" indicator for images that have commentary
- Your commentary is displayed in the per-image review modal after submission

### Scoring impact
| Commentary Length | Precision Bonus |
|-------------------|-----------------|
| 0 characters | +0% |
| 1–19 characters | +2% |
| 20+ characters | +5% |

### Best practices
- Describe lighting conditions (sunny, overcast, night)
- Note weather elements (rain, snow, fog)
- Mention unusual or ambiguous objects
- Describe the overall scene context (busy intersection, quiet residential street)
- Flag any image quality issues (blur, glare, occlusion)

## Custom Object Labels

When an object doesn't fit any of the 25 predefined classes, use the **Custom Object** class (`Z`).

### How it works
1. Press `Z` or click the **Custom Object** button in the class list
2. Draw a bounding box around the object
3. A prompt will ask you to type a descriptive label (max 30 characters)
4. The box renders with a **dashed orange border** and your custom label
5. Custom labels boost your precision score (+4% per label, max +8%)

### When to use
- Rare or unusual objects not in the class list
- Ambiguous objects that could fit multiple categories
- New object types discovered during annotation
- Objects you want to flag for reviewer attention

### Scoring impact
| Custom Labels Used | Precision Bonus |
|-------------------|-----------------|
| 0 | +0% |
| 1 | +4% |
| 2+ | +8% (max) |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1`–`0` | Select class (first 10 classes) |
| `Q`, `W`, `E`, `R`, `T`, `Y`, `U`, `I`, `O`, `P` | Select class (next 10 classes) |
| `A`, `S`, `D`, `F`, `G`, `H` | Select class (last 6 classes) |
| `Z` | Select Custom Object class |
| `Enter` / `Space` | Submit current image |
| `←` / `P` | Previous image |
| `→` / `N` | Next image |
| `S` | Skip image |
| `E` | Clear all annotations |

## How Daily Images Work

Images are generated using the formula:
```
https://picsum.photos/seed/YYYYMMDD_i/1600/1067
```
Where `YYYYMMDD` is today's date and `i` is the image index (0-49). This means:
- **Same date = same 50 images** (everyone gets the same batch)
- **New date = new 50 images** (fresh batch every day)
- **High resolution** — 1600x1067 for clear annotation detail
- **No storage needed** — images load directly from Picsum CDN

## Deployment

### GitHub Pages (Free)
1. Upload these files to a GitHub repo
2. Go to **Settings → Pages**
3. Select source: `main` branch, `/ (root)`
4. Visit `https://yourusername.github.io/repo-name/`

## File Structure

```
ai-annotation-workbench/
├── index.html      # Main UI with modals, 25-class sidebar, commentary panel
├── app.js          # Session logic, daily images, multi-factor scoring, commentary state
├── .nojekyll       # Disables Jekyll (GitHub Pages)
└── README.md       # This file
```

## Scoring System

| Metric | Calculation |
|--------|-------------|
| **Count Precision** | How close annotation count is to expected objects per image type (up to 70%) |
| **Size Validity** | Boxes should be 0.1%–30% of image area (up to 15%) |
| **Class Diversity** | Using multiple different labels per image (up to 10%) |
| **Time Appropriateness** | Not too fast, not too slow (~15s per expected object) (up to 5%) |
| **Commentary Bonus** | Detailed scene description (up to 5%) |
| **Custom Label Bonus** | +4% per custom label used, max +8% (up to 8%) |
| **Time Bonus** | +10 pts if under 60s, +5 pts if under 120s |
| **Image Score** | Precision sum + Time Bonus (max 100) |
| **Overall Accuracy** | Average precision across all 50 images |
| **Total Score** | Sum of all 50 image scores |

The expected object count is **deterministic per image type** (street, city, road, etc.) with a seeded variation, so the same image always expects the same number of objects. This makes scoring consistent and trainable.

## Training Skills Covered

| Skill | Method |
|-------|--------|
| Bounding Box Precision | Multi-factor precision scoring (count, size, diversity, time, commentary) |
| Class Selection | 25 classes with keyboard shortcuts for speed |
| Scene Description | Image commentary textarea with scoring incentive |
| Workflow Discipline | Submit → Review → Next cycle |
| Speed vs Accuracy | Time tracking + precision scoring |
| Daily Consistency | Fresh batch every day prevents memorization |
| Keyboard Efficiency | Hotkeys for all common actions |
| Quality Awareness | Size validity, diversity, commentary, and custom label bonuses |
| Handling Edge Cases | Custom object labels for uncovered categories |
