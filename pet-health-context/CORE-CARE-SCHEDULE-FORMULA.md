# Core Care Schedule Formula

Last updated: 2026-06-14

## Purpose

This document explains the current schedule calculation used by the `Sổ tiêm & Lịch nhắc` / `Vaccines & Reminders` page.

The feature is intentionally positioned as a **care reminder and reference schedule**, not a diagnosis, prescription, or final veterinary protocol. Every generated reminder should be verified by Sen and, when needed, a licensed veterinarian.

## Page Context

### Main Page: `Sổ tiêm & Lịch nhắc`

Screen: `pet-health-frontend/src/screens/CoreCareScreen.tsx`

This page helps Sen:

- View upcoming vaccine and deworming reminders under `Lịch tiếp theo của {petName}`.
- View completed or historical records under `Lịch sử gần đây`.
- Create a schedule from two different contexts:
  - Pet **has been vaccinated**: Sen enters prior vaccine type(s) and injection date(s), then the app calculates the next vaccine reminders from history.
  - Pet **has not been vaccinated**: Sen enters birth date and desired vaccine type, then the app creates an initial reference schedule.
- Add manual vaccine/reminder records.
- Open `Thông tin thêm` for vaccine/deworming education and FAQ.

### First-Time Guidance Popup

When a user account first enters the page, the app shows a one-time guidance popup:

- Title: `Sen ơi nhớ nhé!`
- Body: vaccine/deworming schedules vary by vaccine type, age, health status, prior history, and lifestyle.
- Actions:
  - `Thông tin thêm`: opens the info page and marks the popup as seen.
  - `Sen hiểu rồi`: dismisses and marks the popup as seen.

Storage is scoped by user:

```text
pet-health-care:core-care-intro-guide-seen:v1:{user_id}
```

This means a new account on the same device should still see the popup once.

### Info Page: `Thông tin thêm`

Screen: `pet-health-frontend/src/screens/CoreCareInfoScreen.tsx`

This page contains:

- Cat vaccine overview.
- Kitten schedule explanation.
- Adult booster explanation.
- Deworming guidance.
- How the app models schedules.
- FAQ list. Tapping a FAQ navigates to a detail view within the same screen.
- Guideline/reference links.

FAQ topics currently include:

- What a kitten usually needs in the first year.
- Whether deworming should happen before vaccination.
- What to do if a vaccine schedule is missed.
- Whether indoor-only cats still need vaccines.
- When FeLV vaccine is needed.
- Rabies vaccine and booster schedule.

## Core Data Model

Schedule logic lives in:

```text
pet-health-frontend/src/utils/coreCareSchedule.ts
```

Main output type:

```ts
type CoreCareScheduleRecommendation = {
  id: string;
  kind: 'vaccine' | 'deworming';
  family:
    | 'dogDhpp'
    | 'dogRabies'
    | 'dogLepto'
    | 'dogDeworming'
    | 'dogPreVaccineDeworming'
    | 'catFvrcp'
    | 'catRabies'
    | 'catFelv'
    | 'catDeworming'
    | 'catPreVaccineDeworming';
  doseNumber: number;
  dueDate: string;     // YYYY-MM-DD, actual reminder date
  targetDate: string;  // YYYY-MM-DD, guideline target date
  sourceLabel: string;
  sourceUrl: string;
  isCatchUp: boolean;  // true when dueDate is later than targetDate
};
```

Date helpers:

- All formula dates are normalized to start-of-day.
- `dueDate = max(today, targetDate)`.
- If `targetDate` is already in the past, the reminder is due `today` and `isCatchUp = true`.
- A week is treated as `7 days`.
- A month is approximated as `30 days` for the deworming loop.

Supported species:

- `dog`
- `cat`

Any other species returns no generated recommendation.

## Vaccine IDs

Defined in:

```text
pet-health-frontend/src/constants/petVaccineOptions.ts
```

Dog vaccine IDs:

```ts
['dog_5in1_dhppl', 'dog_7in1', 'dog_rabies', 'dog_bordetella']
```

Cat vaccine IDs:

```ts
['cat_3in1_fvrcp', 'cat_4in1', 'cat_rabies', 'cat_felv']
```

Important mapping:

- `cat_3in1_fvrcp` and `cat_4in1` both map to the same core vaccine series family: `catFvrcp`.
- UI title uses the selected vaccine label, so if Sen chooses `Vaccine 4-trong-1`, the displayed plan title should say `Vaccine 4-trong-1 mũi 1`, not generic `FVRCP`.
- `cat_felv` maps to `catFelv` and is only generated when Sen selects FeLV.

## Flow A: Pet Has Not Been Vaccinated

Function:

```ts
calculateCoreCareSchedule({
  species,
  birthDate,
  today,
  selectedVaccineId,
})
```

Required UI inputs:

- `Ngày sinh chính xác của bé`
- `Loại vaccine bạn muốn`

If either is missing, inline validation appears below the field. No popup should appear for missing inputs.

### Selected Vaccine Filtering

When `selectedVaccineId` is provided, the app does **not** blindly create every optional vaccine series.

It keeps:

- The selected vaccine series.
- Rabies series.
- Deworming reminders.
- A special pre-vaccine deworming reminder before the first vaccine.

It excludes:

- Other optional/non-selected vaccine families.
- Example: if Sen selects `cat_4in1`, the app keeps `catFvrcp`, `catRabies`, deworming, and pre-vaccine deworming, but excludes `catFelv`.

### Pre-Vaccine Deworming

When a selected vaccine schedule has a first vaccine date:

```text
preVaccineDeworming.targetDate = firstVaccineDate - 7 days
preVaccineDeworming.dueDate = max(today, preVaccineDeworming.targetDate)
```

Family:

- Dog: `dogPreVaccineDeworming`
- Cat: `catPreVaccineDeworming`

Purpose:

- Reflects common practice: if the pet has not been dewormed recently or has worm exposure risk, deworm around `5-7 days` before vaccination.

Conflict handling:

- Routine deworming reminders whose `dueDate` falls from `preVaccineDeworming.dueDate` through the first vaccine date are removed.
- This avoids confusing sequences like:

```text
Tẩy giun lần 1
Tẩy giun lần 2
Tẩy giun trước tiêm vaccine
Tẩy giun lần 3
Vaccine mũi 1
```

Expected sequence should be closer to:

```text
Routine deworming before the pre-vaccine window, if any
Tẩy giun trước tiêm vaccine
Vaccine mũi 1
Future deworming reminders after the first vaccine window, if any
```

### Catch-Up Collision Staggering

Special handling is applied when a pet has no vaccine history and the selected vaccine's first theoretical target date is already in the past.

Collision condition:

```text
firstSelectedVaccine.dueDate == today
firstSelectedVaccine.targetDate < today
```

Without special handling, `max(today, targetDate)` would force multiple items to today:

```text
Tẩy giun trước tiêm vaccine = today
Selected vaccine dose 1 = today
Rabies = today
```

That is unsafe/confusing because it removes the 5-7 day deworming window and can suggest multiple vaccines on the same day for a pet with empty history.

Current staggering rule:

```text
baselineVaccineDate = today + 7 days
preVaccineDeworming.dueDate = today
selected vaccine dose 1.dueDate = baselineVaccineDate
selected vaccine dose 2.dueDate = baselineVaccineDate + 4 weeks
selected vaccine dose 3.dueDate = baselineVaccineDate + 8 weeks
rabies.dueDate = baselineVaccineDate + 4 weeks
```

Routine deworming adjustment:

- Routine deworming reminders from `today` through the second selected-vaccine date are removed.
- If the selected series has a second dose, the app inserts one optimized routine deworming reminder:

```text
routineDeworming.dueDate = selected vaccine dose 2.dueDate - 7 days
```

Example:

```text
birthDate = 2026-01-14
today = 2026-06-14
selectedVaccineId = cat_3in1_fvrcp
```

Expected generated schedule:

```text
2026-06-14: Tẩy giun cho mèo trước tiêm vaccine
2026-06-21: Vaccine 3-trong-1/FVRCP mũi 1
2026-07-12: Tẩy giun cho mèo lần 1
2026-07-19: Vaccine 3-trong-1/FVRCP mũi 2
2026-07-19: Vaccine dại cho mèo
```

## Dog Initial Schedule

### Puppy: age <= 26 weeks

Age is:

```text
ageDays = today - birthDate
```

If `ageDays <= 26 weeks`, puppy rules apply.

#### Core DHPP/DAPP-like Series

Family: `dogDhpp`

Formula:

```text
firstDueDate = max(today, birthDate + 8 weeks)
finalMinDate = birthDate + 16 weeks
interval = 4 weeks
maxPrimaryDoseCount = 3
```

Recommendations:

- Dose 1 at `firstDueDate`.
- Continue every 4 weeks until 3 primary doses have been created.
- This prevents an accidental 4th primary dose when the calculated series crosses the minimum final age.
- Flow A no longer auto-generates a 26-week booster because that can look like a 4th primary dose. Boosters are handled by Flow B after real administered doses exist in history.

Source label:

```text
WSAVA 2024 / AAHA 2022
```

#### Leptospirosis Series

Family: `dogLepto`

Formula:

```text
firstDueDate = max(today, birthDate + 12 weeks)
secondDose = firstDueDate + 4 weeks
```

Source label:

```text
AAHA 2022 / WSAVA 2024
```

Note:

- Current mapping treats `dog_5in1_dhppl` and `dog_7in1` as including `dogDhpp` and `dogLepto`.

#### Rabies

Family: `dogRabies`

Formula:

```text
targetDate = birthDate + 12 weeks
dueDate = max(today, targetDate)
```

Source label:

```text
WSAVA Asia / Vietnam rabies requirement
```

#### Deworming

Family: `dogDeworming`

Early weeks:

```text
[2, 4, 6, 8]
```

Then monthly from:

```text
birthDate + 12 weeks
```

Until:

```text
birthDate + 6 months
```

Only future/today dates are kept.

### Adult Dog / Unknown History: age > 26 weeks

If `ageDays > 26 weeks`, catch-up rules apply.

Generated recommendations:

- `dogDhpp` two-dose series:
  - Dose 1: today
  - Dose 2: today + 4 weeks
- `dogLepto` two-dose series:
  - Dose 1: today
  - Dose 2: today + 4 weeks
- `dogRabies`:
  - Dose 1: today
- `dogDeworming`:
  - Dose 1: today

Then selected vaccine filtering is applied.

## Cat Initial Schedule

### Kitten: age <= 26 weeks

If `ageDays <= 26 weeks`, kitten rules apply.

#### Core FVRCP / 3-in-1 / 4-in-1 Series

Family: `catFvrcp`

Formula:

```text
firstDueDate = max(today, birthDate + 8 weeks)
finalMinDate = birthDate + 16 weeks
interval = 4 weeks
maxPrimaryDoseCount = 3
```

Recommendations:

- Dose 1 at `firstDueDate`.
- Continue every 4 weeks until 3 primary doses have been created.
- This prevents the 8-12-16-20 week over-vaccination pattern for kitten core vaccines.
- Flow A no longer auto-generates a 26-week booster because that can look like a 4th primary dose. Boosters are handled by Flow B after real administered doses exist in history.

Source label:

```text
WSAVA 2024 / AAHA-AAFP 2020
```

Important UI detail:

- If Sen chooses `cat_4in1`, this still maps to family `catFvrcp` internally, but UI should display the selected label (`Vaccine 4-trong-1`) in the title.

#### FeLV

Family: `catFelv`

Only generated when selected vaccine ID is:

```text
cat_felv
```

Formula:

```text
firstDueDate = max(today, birthDate + 8 weeks)
secondDose = firstDueDate + 4 weeks
```

Source label:

```text
AAHA-AAFP 2020
```

Safety note:

- FeLV is risk-based.
- App notes should say FeLV should be based on lifestyle/risk and testing/vet discussion is recommended before vaccination.

#### Rabies

Family: `catRabies`

Formula:

```text
targetDate = birthDate + 12 weeks
dueDate = max(today, targetDate)
```

Source label:

```text
WSAVA 2024 / Vietnam rabies requirement
```

#### Deworming

Family: `catDeworming`

Early weeks:

```text
[2, 4, 6, 8, 10]
```

Then monthly from:

```text
birthDate + 12 weeks
```

Until:

```text
birthDate + 6 months
```

Only future/today dates are kept.

### Adult Cat / Unknown History: age > 26 weeks

If `ageDays > 26 weeks`, catch-up rules apply.

Generated recommendations:

- `catFvrcp` two-dose series:
  - Dose 1: today
  - Dose 2: today + 4 weeks
- `catFelv` two-dose series:
  - Dose 1: today
  - Dose 2: today + 4 weeks
- `catRabies`:
  - Dose 1: today
- `catDeworming`:
  - Dose 1: today

Then selected vaccine filtering is applied.

Example:

- If Sen selects `cat_4in1`, the final plan keeps:
  - `catPreVaccineDeworming`
  - `catFvrcp`
  - `catRabies`
  - deworming outside the pre-vaccine window
- It excludes:
  - `catFelv`

## Flow B: Pet Has Been Vaccinated

Function:

```ts
calculateNextVaccinationSchedule({
  species,
  administeredDoses,
  petAgeMonths,
  today,
  horizonMonths = 12,
})
```

Required UI inputs for each prior dose:

- Vaccine type
- Injection date

The injection date defaults to `null`, not today. Missing field errors are shown inline.

The function receives:

- Existing historical vaccine records.
- The dose drafts currently being entered by Sen.

Future administered dates are ignored.

### Manual / Fuzzy Vaccine Name Normalization

Before a historical vaccine record is ignored for missing `metadata.vaccineId`, the app now tries to normalize manually typed text from:

```text
metadata.vaccineName || record.title || record.note
```

The helper is:

```ts
normalizeManualVaccineId(text, species)
```

Current examples:

| Species | Manual text patterns | Normalized ID |
|---|---|---|
| Cat | `3 trong 1`, `3 in 1`, `FVRCP`, `RCP`, `Purevax`, giảm bạch cầu/calici/herpes/cúm mèo | `cat_3in1_fvrcp` |
| Cat | `4 trong 1`, `4 in 1`, `Felocell`, `RCPCh`, `Chlamydia` | `cat_4in1` |
| Cat | `dại`, `rabies`, `Rabisin`, `Defensor` | `cat_rabies` |
| Cat | `FeLV`, bạch cầu, leukemia | `cat_felv` |
| Dog | `5 trong 1`, `DHPP`, `DAPP`, `DHPPL`, care/parvo/adenovirus/distemper | `dog_5in1_dhppl` |
| Dog | `7 trong 1`, `Lepto`, `Leptospira` | `dog_7in1` |
| Dog | `dại`, `rabies`, `Rabisin`, `Defensor` | `dog_rabies` |
| Dog | `Bordetella`, kennel cough, ho cũi | `dog_bordetella` |

This reduces the risk that manually typed history like `Mũi 1 4 trong 1` is ignored by Flow B.

### Grouping Logic

Administered doses are mapped into vaccine series.

Dog:

- `dog_rabies` -> `dog-rabies`
- `dog_bordetella` -> `dog-bordetella`
- `dog_5in1_dhppl` or `dog_7in1` -> `dog-core-combo`

Cat:

- `cat_rabies` -> `cat-rabies`
- `cat_3in1_fvrcp` or `cat_4in1` -> `cat-core-combo`
- `cat_felv` -> `cat-felv`

Within each series:

- Doses are sorted by administered date.
- The latest dose date becomes the base for the next target date.

### Primary Dose Count

Young pet condition:

```text
isYoungPet = petAgeMonths < 6
```

Series specs:

| Series | Primary dose count | Primary interval | Booster interval |
|---|---:|---:|---:|
| Dog rabies | 1 | 4 weeks | 365 days |
| Dog bordetella | 1 | 4 weeks | 365 days |
| Dog core combo | 3 if young, otherwise 2 | 4 weeks | 365 days |
| Cat rabies | 1 | 4 weeks | 365 days |
| Cat core combo | 3 if young, otherwise 2 | 4 weeks | 365 days |
| Cat FeLV | 2 | 4 weeks | 365 days |

### If Prior Doses Are Fewer Than Primary Dose Count

For each missing primary dose:

```text
targetDate = lastDate + primaryIntervalDays
dueDate = max(today, targetDate)
```

The output stops if the next due date is beyond:

```text
today + horizonMonths
```

Default horizon is 12 months.

### Lapsed Primary Series Warning

If a young pet is still in the primary series and the latest dose is too old, the next recommendation is flagged:

```text
isYoungPet = petAgeMonths < 6
daysSinceLastDose = today - latestDoseDate
isRestartRequired = isYoungPet && daysSinceLastDose > 42
```

The app does **not** automatically reset dose numbering to dose 1, because that decision should be made by a veterinarian.

Instead, generated reminders include a warning note:

```text
Cảnh báo: chuỗi tiêm primary đã trễ quá lâu so với mũi trước, có thể cần tiêm lại từ mũi 1. Sen nên hỏi bác sĩ thú y trước khi tiếp tục.
```

### If Primary Series Is Complete

Generate booster:

```text
targetDate = latestDoseDate + boosterIntervalDays
dueDate = max(today, targetDate)
```

Only generate if due date is within the 12-month horizon.

## UI Notes and Safety Wording

Generated notes include:

```text
Dựa trên guideline tham khảo, không thay thế tư vấn bác sĩ thú y.
```

FeLV reminders add:

```text
Với FeLV: lịch nên quyết định theo nguy cơ, nên xét nghiệm/trao đổi bác sĩ trước.
```

Pre-vaccine deworming reminders add:

```text
Thực hành thường gặp là tẩy giun trước vaccine khoảng 5-7 ngày nếu bé chưa tẩy gần đây hoặc có nguy cơ nhiễm giun. Nếu bé đang yếu, nôn, tiêu chảy hoặc nghi nhiễm ký sinh trùng nặng, nên hỏi bác sĩ thú y trước.
```

Lapsed primary-series reminders add:

```text
Cảnh báo: chuỗi tiêm primary đã trễ quá lâu so với mũi trước, có thể cần tiêm lại từ mũi 1. Sen nên hỏi bác sĩ thú y trước khi tiếp tục.
```

## Display Rules

### Upcoming Schedule

Upcoming list shows pending reminders:

- Must have `due_at`.
- Must not have `status === 'done'`.
- Vaccine records with type `vaccine` are not treated as upcoming reminders.

Upcoming card display:

- Date is shown first and emphasized.
- Type/kind appears under date.
- Vaccine/reminder name appears below.
- For generated deworming reminders, icon uses `medkit-outline`.
- For generated vaccine reminders, icon uses `shield-checkmark-outline`.

### Recent History

Recent history excludes upcoming records and sorts by occurrence timestamp descending.

Historical vaccine records should appear here after Sen records that a vaccine was already administered.

## Current Reference Sources

The schedule logic cites these sources in metadata:

- WSAVA 2024 vaccination guidelines
- AAHA 2022 canine vaccination guidance
- AAHA/AAFP 2020 feline vaccination guidance
- TroCCAP tropical parasite guidance
- Vietnam rabies requirement / rabies prevention context

The `Thông tin thêm` page also links to:

- WSAVA 2024
- AAHA/AAFP feline vaccination guidelines
- Vietnam Circular 07/2016/TT-BNNPTNT
- TroCCAP feline parasite guidance
- ESCCAP worm control guidance

## Known Assumptions To Verify

Please verify these assumptions before treating the formula as production-ready:

1. Kitten FVRCP primary series is capped at 3 generated primary doses.
   - First generated dose is anchored at 8 weeks.
   - The formula intentionally avoids creating a 4th primary dose just because a 20-week boundary is crossed.
   - Confirm whether Vietnam clinic practice should prefer 6-week or 8-week first scheduling in the app.

2. Puppy DHPP primary series is capped at 3 generated primary doses.
   - First generated dose is anchored at 8 weeks.
   - Confirm whether dog clinics in target markets prefer 6-week or 8-week first scheduling.

3. App uses a fixed 4-week interval for primary series.
   - Real product labels may use 3-4 weeks.
   - Future optimization: expose an interval preference or clinic/product-specific override.

4. Rabies first target is modeled as 12 weeks.
   - Confirm by vaccine label and Vietnam/local clinic practice.

5. FeLV is not generated unless selected.
   - This is intentional because FeLV is risk-based.

6. Deworming uses fixed early week arrays:
   - Dog: 2, 4, 6, 8 weeks.
   - Cat: 2, 4, 6, 8, 10 weeks.
   - Then monthly from 12 weeks until 6 months.

7. Months are approximated as 30 days in the deworming loop.

8. Pre-vaccine deworming is modeled as 7 days before the first selected vaccine.
   - The UI note describes common practice as 5-7 days.
   - If the target date has passed, reminder due date becomes today.

9. Routine deworming between pre-vaccine deworming and first vaccine is suppressed.
   - This avoids confusing overlap, but should be verified against desired veterinary workflow.

10. Adult catch-up is triggered when age is more than 26 weeks.
    - Adult catch-up generates due-today vaccine and deworming reminders before selected filtering.

11. Existing historical dose counts prefer `metadata.vaccineId`, then fall back to fuzzy text normalization.
    - Manual text normalization covers common Vietnamese/English terms, but will not catch every typo or brand name.
    - The normalized ID should be reviewed if the app later stores a confidence score.

12. Booster interval is modeled as 365 days for all supported vaccine series.
    - Some products/guidelines allow longer intervals, especially for core vaccines in low-risk adult cats/dogs.

13. If a primary series is delayed by more than 42 days in a pet under 6 months, app adds a warning but does not automatically reset to dose 1.
    - This is intentional because restart decisions should be confirmed by a veterinarian.

14. The output is a reminder schedule, not a medical order.
    - Final plan should remain editable and should always allow Sen to confirm with a veterinarian.

## Example: Kitten, Selected `cat_4in1`

Input:

```text
species = cat
birthDate = 2026-06-13
today = 2026-06-13
selectedVaccineId = cat_4in1
```

Core FVRCP/4-in-1 target:

```text
first vaccine = birthDate + 8 weeks
```

Pre-vaccine deworming:

```text
first vaccine - 7 days
```

Generated families should include:

- `catPreVaccineDeworming`
- `catFvrcp` shown in UI using selected label `Vaccine 4-trong-1`
- `catRabies`
- `catDeworming` outside the pre-vaccine window

Generated families should not include:

- `catFelv`

## Example: Already Vaccinated Cat With One 4-in-1 Dose

Input:

```text
species = cat
petAgeMonths < 6
administeredDoses = [{ vaccineId: cat_4in1, administeredAt: today }]
```

Series:

```text
cat-core-combo
primaryDoseCount = 3
primaryIntervalDays = 28
```

Generated reminders:

```text
dose 2 target = today + 28 days
dose 3 target = dose 2 dueDate + 28 days
```

If `today` is later than target, due date becomes today and reminder is catch-up.

