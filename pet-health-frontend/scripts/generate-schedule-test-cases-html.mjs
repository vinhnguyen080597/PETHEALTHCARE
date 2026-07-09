import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  calculateCoreCareSchedule,
  calculateCoreCareScheduleFromHistory,
  calculateNextVaccinationSchedule,
} from '../src/utils/coreCareSchedule.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'docs', 'core-care-schedule-test-cases.html');

function d(value) {
  return new Date(`${value}T00:00:00`);
}

function ageWeeks(birth, today) {
  return Math.floor((d(today).getTime() - d(birth).getTime()) / (24 * 60 * 60 * 1000 * 7));
}

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatOutput(recs) {
  if (recs.length === 0) return '<em>Không có lịch</em>';
  return `<table class="mini"><thead><tr><th>Loại</th><th>Mũi</th><th>Due</th><th>Target</th><th>Catch-up</th></tr></thead><tbody>${recs
    .map((r) => {
      const family = r.family ?? r.vaccineId ?? '—';
      return `<tr><td>${esc(family)}</td><td>${r.doseNumber}</td><td><code>${r.dueDate}</code></td><td><code>${r.targetDate}</code></td><td>${r.isCatchUp ? '✓' : ''}${r.isRestartRequired ? ' restart' : ''}</td></tr>`;
    })
    .join('')}</tbody></table>`;
}

const CASES = [
  {
    id: 'CAT-01',
    fn: 'calculateCoreCareSchedule',
    group: 'Mèo — lịch mới',
    desc: 'Mèo con mới sinh, không chọn vaccine (đủ FVRCP + FeLV + tẩy giun + dại)',
    birth: '2026-01-01',
    today: '2026-01-01',
    vaccine: '—',
    history: 'Không có',
    path: 'buildCatKittenIntegratedSchedule',
    run: () => calculateCoreCareSchedule({ species: 'cat', birthDate: d('2026-01-01'), today: d('2026-01-01') }),
    checks: [
      'Tẩy giun #1 due 2026-01-22 (3 tuần tuổi)',
      'Tẩy giun #3 due 2026-02-19 (7 tuần tuổi)',
      'FVRCP #1 due 2026-02-26 (= tẩy #3 + 7 ngày)',
      'Tẩy giun #4 due 2026-03-05 (= FVRCP #1 + 7 ngày)',
      'Dại #1 due 2026-04-02 (sau FVRCP #2, không trùng FVRCP #1)',
    ],
  },
  {
    id: 'CAT-02',
    fn: 'calculateCoreCareSchedule',
    group: 'Mèo — lịch mới',
    desc: 'Mèo con mới sinh, chọn FVRCP 3-in-1 (loại FeLV)',
    birth: '2026-01-01',
    today: '2026-01-01',
    vaccine: 'cat_3in1_fvrcp',
    history: 'Không có',
    path: 'filterInitialScheduleBySelection (cat)',
    run: () =>
      calculateCoreCareSchedule({
        species: 'cat',
        birthDate: d('2026-01-01'),
        today: d('2026-01-01'),
        selectedVaccineId: 'cat_3in1_fvrcp',
      }),
    checks: [
      'Có FVRCP, dại, tẩy giun',
      'Không có FeLV',
      'Không có mũi tẩy giun trùng ngày FVRCP #1',
      'Tẩy giun #3 vẫn 2026-02-19',
    ],
  },
  {
    id: 'CAT-03',
    fn: 'calculateCoreCareSchedule',
    group: 'Mèo — catch-up',
    desc: 'Mèo ~4 tuần, trễ mốc tẩy giun đầu, chọn FVRCP',
    birth: '2026-06-02',
    today: '2026-06-28',
    vaccine: 'cat_3in1_fvrcp',
    history: 'Không có',
    path: 'catch-up: due = max(today, target)',
    run: () =>
      calculateCoreCareSchedule({
        species: 'cat',
        birthDate: d('2026-06-02'),
        today: d('2026-06-28'),
        selectedVaccineId: 'cat_3in1_fvrcp',
      }),
    checks: [
      'Tẩy giun #1 due 2026-06-28, catch-up',
      'Tẩy giun #3 due 2026-07-26',
      'FVRCP #1 due 2026-08-02 (= tẩy #3 + 7 ngày)',
    ],
  },
  {
    id: 'CAT-04',
    fn: 'calculateCoreCareSchedule',
    group: 'Mèo — catch-up muộn',
    desc: 'Mèo ~22 tuần, trễ toàn bộ lịch, chọn FVRCP → staggerInitialCatchUpSchedule',
    birth: '2026-01-14',
    today: '2026-06-14',
    vaccine: 'cat_3in1_fvrcp',
    history: 'Không có',
    path: 'staggerInitialCatchUpSchedule (dog-style cho mèo khi due=today & target quá khứ)',
    run: () =>
      calculateCoreCareSchedule({
        species: 'cat',
        birthDate: d('2026-01-14'),
        today: d('2026-06-14'),
        selectedVaccineId: 'cat_3in1_fvrcp',
      }),
    checks: [
      'Tẩy giun #1 due 2026-06-14 (hôm nay)',
      'FVRCP #1 due 2026-07-19 (= hôm nay + 7 + 28*0)',
      'Tẩy giun #2 due 2026-07-19 hoặc #4 due 2026-07-26 (xem output)',
      'FVRCP #2 due 2026-08-16',
      'Dại due 2026-08-23',
    ],
  },
  {
    id: 'CAT-05',
    fn: 'calculateCoreCareSchedule',
    group: 'Mèo — người lớn',
    desc: 'Mèo >26 tuần (~1 tuổi), không lịch sử, chọn FVRCP → adultCatCatchUp',
    birth: '2025-01-01',
    today: '2026-01-01',
    vaccine: 'cat_3in1_fvrcp',
    history: 'Không có',
    path: 'adultCatCatchUp',
    run: () =>
      calculateCoreCareSchedule({
        species: 'cat',
        birthDate: d('2025-01-01'),
        today: d('2026-01-01'),
        selectedVaccineId: 'cat_3in1_fvrcp',
      }),
    checks: ['Tẩy giun due hôm nay', 'FVRCP #1 due hôm nay', 'FVRCP #2 due 2026-01-29 (+28 ngày)'],
  },
  {
    id: 'CAT-H01',
    fn: 'calculateCoreCareScheduleFromHistory',
    group: 'Mèo — có lịch sử',
    desc: 'Đã tẩy giun lần 1 (24/06), chưa tiêm vaccine',
    birth: '2026-06-02',
    today: '2026-06-28',
    vaccine: 'cat_3in1_fvrcp',
    history: 'Tẩy giun: 2026-06-24',
    path: 'cat_kitten_history',
    run: () =>
      calculateCoreCareScheduleFromHistory({
        species: 'cat',
        birthDate: d('2026-06-02'),
        today: d('2026-06-28'),
        selectedVaccineId: 'cat_3in1_fvrcp',
        administeredVaccines: [],
        administeredDewormings: [{ administeredAt: d('2026-06-24') }],
      }),
    checks: [
      'Tẩy giun #2 due 2026-07-08 (+14 ngày từ 24/06)',
      'Tẩy giun #3 due 2026-07-22',
      'FVRCP #1 due 2026-07-29 (= tẩy #3 + 7 ngày)',
    ],
  },
  {
    id: 'CAT-H02',
    fn: 'calculateCoreCareScheduleFromHistory',
    group: 'Mèo — edge case (cần review)',
    desc: 'Bé >6 tháng (~30 tuần), chưa tẩy/tiêm gì, hôm nay vừa tiêm FVRCP mũi 1',
    birth: '2025-12-12',
    today: '2026-07-09',
    vaccine: 'cat_3in1_fvrcp',
    history: 'FVRCP mũi 1: 2026-07-09',
    path: 'adult_catch_up (vì ageDays > 26 tuần — bỏ qua lịch sử vaccine)',
    run: () =>
      calculateCoreCareScheduleFromHistory({
        species: 'cat',
        birthDate: d('2025-12-12'),
        today: d('2026-07-09'),
        selectedVaccineId: 'cat_3in1_fvrcp',
        administeredVaccines: [{ vaccineId: 'cat_3in1_fvrcp', administeredAt: d('2026-07-09') }],
        administeredDewormings: [],
      }),
    checks: [
      '⚠ Hiện tại: path adult_catch_up, có thể gợi ý lại FVRCP #1 cùng ngày',
      '⚠ Tẩy giun due cùng ngày tiêm — chưa xử lý edge case',
      'Đây là case cần cập nhật trong bước review tiếp theo',
    ],
  },
  {
    id: 'CAT-H03',
    fn: 'calculateCoreCareScheduleFromHistory',
    group: 'Mèo — có lịch sử',
    desc: 'Mèo 9 tuần, vừa tiêm FVRCP mũi 1 hôm nay, chưa tẩy giun',
    birth: '2025-12-12',
    today: '2026-02-14',
    vaccine: 'cat_3in1_fvrcp',
    history: 'FVRCP mũi 1: 2026-02-14',
    path: 'cat_kitten_history (≤26 tuần)',
    run: () =>
      calculateCoreCareScheduleFromHistory({
        species: 'cat',
        birthDate: d('2025-12-12'),
        today: d('2026-02-14'),
        selectedVaccineId: 'cat_3in1_fvrcp',
        administeredVaccines: [{ vaccineId: 'cat_3in1_fvrcp', administeredAt: d('2026-02-14') }],
        administeredDewormings: [],
      }),
    checks: [
      'Vẫn tạo tẩy giun #1–3 catch-up theo tuổi',
      'Tẩy giun #4 = FVRCP #1 + 7 ngày (có thể xung đột thứ tự với #3)',
      'FVRCP #2 cách mũi 1 đã tiêm 4 tuần',
      '⚠ Cần review khi tiêm trước tẩy giun',
    ],
  },
  {
    id: 'DOG-01',
    fn: 'calculateCoreCareSchedule',
    group: 'Chó — lịch mới',
    desc: 'Chó con mới sinh, không chọn vaccine',
    birth: '2026-01-01',
    today: '2026-01-01',
    vaccine: '—',
    history: 'Không có',
    path: 'calculateDogSchedule + spaceInitialSchedule',
    run: () => calculateCoreCareSchedule({ species: 'dog', birthDate: d('2026-01-01'), today: d('2026-01-01') }),
    checks: [
      'Tẩy giun #1 due 2026-01-15 (2 tuần tuổi)',
      'DHPP #1 due 2026-02-26 (8 tuần tuổi)',
      'Dại due 2026-03-26 (12 tuần tuổi)',
    ],
  },
  {
    id: 'DOG-02',
    fn: 'calculateCoreCareSchedule',
    group: 'Chó — người lớn',
    desc: 'Chó >26 tuần, không lịch sử',
    birth: '2025-01-01',
    today: '2026-01-01',
    vaccine: '—',
    history: 'Không có',
    path: 'adultDogCatchUp',
    run: () => calculateCoreCareSchedule({ species: 'dog', birthDate: d('2025-01-01'), today: d('2026-01-01') }),
    checks: ['DHPP #1, dại, tẩy giun due hôm nay', 'DHPP #2 due 2026-01-29'],
  },
  {
    id: 'NEXT-01',
    fn: 'calculateNextVaccinationSchedule',
    group: 'Mũi tiêm kế tiếp (chó trong app)',
    desc: 'Chó 3 tháng, vừa tiêm 5-in-1 mũi 1 → còn 2 mũi primary',
    birth: '—',
    today: '2026-06-12',
    vaccine: '—',
    history: 'dog_5in1_dhppl: 2026-06-12, petAgeMonths=3',
    path: 'primary series, interval 28 ngày',
    run: () =>
      calculateNextVaccinationSchedule({
        species: 'dog',
        petAgeMonths: 3,
        today: d('2026-06-12'),
        administeredDoses: [{ vaccineId: 'dog_5in1_dhppl', administeredAt: d('2026-06-12') }],
      }),
    checks: ['Mũi #2 due 2026-07-10', 'Mũi #3 due 2026-08-07'],
  },
  {
    id: 'NEXT-02',
    fn: 'calculateNextVaccinationSchedule',
    group: 'Mũi tiêm kế tiếp',
    desc: 'Mèo 12 tháng, vừa tiêm dại → booster 1 năm',
    birth: '—',
    today: '2026-06-12',
    vaccine: '—',
    history: 'cat_rabies: 2026-06-12, petAgeMonths=12',
    path: 'booster ONE_YEAR_DAYS',
    run: () =>
      calculateNextVaccinationSchedule({
        species: 'cat',
        petAgeMonths: 12,
        today: d('2026-06-12'),
        administeredDoses: [{ vaccineId: 'cat_rabies', administeredAt: d('2026-06-12') }],
      }),
    checks: ['1 mũi due 2027-06-12'],
  },
  {
    id: 'NEXT-03',
    fn: 'calculateNextVaccinationSchedule',
    group: 'Mũi tiêm kế tiếp',
    desc: 'Mèo 4 tháng, mũi 1 cách >42 ngày → isRestartRequired',
    birth: '—',
    today: '2026-06-12',
    vaccine: '—',
    history: 'cat_4in1: 2026-04-15, petAgeMonths=4',
    path: 'LAPSED_PRIMARY_SERIES_DAYS=42',
    run: () =>
      calculateNextVaccinationSchedule({
        species: 'cat',
        petAgeMonths: 4,
        today: d('2026-06-12'),
        administeredDoses: [{ vaccineId: 'cat_4in1', administeredAt: d('2026-04-15') }],
      }),
    checks: ['Mũi #2', 'isRestartRequired = true'],
  },
  {
    id: 'EDGE-01',
    fn: 'calculateCoreCareSchedule',
    group: 'Biên / lỗi',
    desc: 'Species không hỗ trợ',
    birth: '2026-01-01',
    today: '2026-01-01',
    vaccine: '—',
    history: 'species=hamster',
    path: 'return []',
    run: () => calculateCoreCareSchedule({ species: 'hamster', birthDate: d('2026-01-01'), today: d('2026-01-01') }),
    checks: ['Kết quả rỗng'],
  },
];

const results = CASES.map((testCase) => {
  const recs = testCase.run();
  return { ...testCase, recs, age: testCase.birth !== '—' ? `${ageWeeks(testCase.birth, testCase.today)} tuần` : '—' };
});

const rows = results
  .map((testCase) => {
    const reviewFlag = testCase.checks.some((c) => c.startsWith('⚠')) ? 'review' : '';
    return `<tr class="${reviewFlag}">
      <td><code>${esc(testCase.id)}</code></td>
      <td>${esc(testCase.group)}</td>
      <td><code>${esc(testCase.fn)}</code></td>
      <td>${esc(testCase.desc)}</td>
      <td>${esc(testCase.birth)}</td>
      <td>${esc(testCase.today)}</td>
      <td>${esc(testCase.age)}</td>
      <td>${esc(testCase.vaccine)}</td>
      <td>${esc(testCase.history)}</td>
      <td><code>${esc(testCase.path)}</code></td>
      <td>${formatOutput(testCase.recs)}</td>
      <td><ul>${testCase.checks.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></td>
    </tr>`;
  })
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Core Care Schedule — Bảng test cases</title>
  <style>
    :root {
      --bg: #f4f7fb;
      --card: #fff;
      --text: #152238;
      --muted: #5b6b82;
      --border: #d7e0ee;
      --accent: #1e6fe8;
      --review: #fff6e8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.45;
    }
    header {
      background: linear-gradient(135deg, #123f86, #1e6fe8);
      color: #fff;
      padding: 24px 28px;
    }
    header h1 { margin: 0 0 8px; font-size: 1.5rem; }
    header p { margin: 0; opacity: 0.92; max-width: 900px; }
    main { padding: 20px 28px 40px; }
    section {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px 20px;
      margin-bottom: 18px;
    }
    h2 { margin: 0 0 10px; font-size: 1.1rem; }
    ul { margin: 8px 0; padding-left: 20px; }
    li { margin: 4px 0; }
    code { font-family: Consolas, "Courier New", monospace; font-size: 0.9em; }
    .table-wrap { overflow: auto; border: 1px solid var(--border); border-radius: 10px; }
    table.matrix { width: 100%; border-collapse: collapse; min-width: 1400px; font-size: 0.88rem; }
    table.matrix th, table.matrix td {
      border-bottom: 1px solid var(--border);
      padding: 10px 12px;
      vertical-align: top;
      text-align: left;
    }
    table.matrix th { background: #eef3fb; position: sticky; top: 0; z-index: 1; }
    table.matrix tr.review { background: var(--review); }
    table.mini { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    table.mini th, table.mini td { border: 1px solid var(--border); padding: 4px 6px; }
    table.mini th { background: #f8fafc; }
    .legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 0.9rem; color: var(--muted); }
    .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #eef3fb; }
    footer { color: var(--muted); font-size: 0.85rem; padding: 0 28px 24px; }
  </style>
</head>
<body>
  <header>
    <h1>Core Care Schedule — Bảng test cases (công thức hiện tại)</h1>
    <p>
      Sinh tự động từ <code>src/utils/coreCareSchedule.ts</code> lúc ${esc(new Date().toISOString())}.
      Cột <strong>Output thực tế</strong> chạy trực tiếp hàm tính lịch — dùng để review trước khi sửa công thức.
    </p>
  </header>
  <main>
    <section>
      <h2>Hằng số &amp; nhánh logic chính</h2>
      <ul>
        <li><code>PRE_VACCINE_DEWORMING_DAYS = 7</code> — tẩy giun trước vaccine (mốc guideline trong app)</li>
        <li><code>weeks(26)</code> — ngưỡng chuyển sang lịch catch-up người lớn (~6 tháng)</li>
        <li><code>MONTH_DAYS = 30</code> — tẩy giun duy trì hàng tháng (mèo con)</li>
        <li>Mèo ≤26 tuần + có lịch sử → <code>calculateCoreCareScheduleFromHistory</code> → <code>buildCatKittenIntegratedSchedule</code></li>
        <li>Mèo &gt;26 tuần + có lịch sử → <code>adultCatCatchUp</code> (không đọc vaccine đã tiêm)</li>
        <li>Chó trong app (màn hình chăm sóc) dùng <code>calculateNextVaccinationSchedule</code> cho mũi kế tiếp</li>
      </ul>
      <div class="legend">
        <span class="pill">Due = max(hôm nay, target)</span>
        <span class="pill">Catch-up = due &gt; target</span>
        <span class="pill" style="background:#fff6e8">Dòng vàng = case cần review</span>
      </div>
    </section>
    <section>
      <h2>Công thức tẩy giun mèo con (tóm tắt)</h2>
      <ul>
        <li><strong>Mũi 1–3:</strong> target theo tuổi 3, 5, 7 tuần; catch-up cách nhau 2 tuần</li>
        <li><strong>FVRCP #1:</strong> target = tẩy giun #3 + 7 ngày</li>
        <li><strong>Tẩy giun #4:</strong> target = FVRCP #1 + 7 ngày</li>
        <li><strong>Tẩy giun #5:</strong> target = tẩy #4 + 2 tuần</li>
        <li><strong>FVRCP #2+:</strong> cách mũi trước 4 tuần</li>
        <li><strong>Dại:</strong> max(FVRCP #2, 12 tuần tuổi); nếu trùng FVRCP #2 thì +7 ngày</li>
        <li><strong>Duy trì #6+:</strong> hàng tháng từ 3–6 tháng tuổi, sau đó 3 tháng/lần đến 26 tuần</li>
      </ul>
    </section>
    <section>
      <h2>Bảng test cases (${results.length} case)</h2>
      <div class="table-wrap">
        <table class="matrix">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nhóm</th>
              <th>Hàm</th>
              <th>Mô tả</th>
              <th>Ngày sinh</th>
              <th>Hôm nay</th>
              <th>Tuổi</th>
              <th>Vaccine chọn</th>
              <th>Lịch sử</th>
              <th>Nhánh code</th>
              <th>Output thực tế (${results.reduce((n, r) => n + r.recs.length, 0)} mũi)</th>
              <th>Điểm cần kiểm tra</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </section>
  </main>
  <footer>
  Regenerate: <code>node --experimental-strip-types scripts/generate-schedule-test-cases-html.mjs</code>
  </footer>
</body>
</html>`;

writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}`);
