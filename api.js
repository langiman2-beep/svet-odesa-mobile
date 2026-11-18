const BASE_URL = "https://svet.odesa.org.ua";
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || "";

const headers = {
  "Content-Type": "application/json",
  "x-api-key": API_KEY,
};

const STATUS_MAP = {
  yes: {
    label: "Є світло",
    reason: "За графіком",
    color: "#22C55E",
    icon: "🟢",
  },
  no: {
    label: "Немає світла",
    reason: "Стабілізаційне відключення",
    color: "#EF4444",
    icon: "🔴",
  },
  maybe: {
    label: "Можливе відключення",
    reason: "Сіра зона (за потреби)",
    color: "#EAB308",
    icon: "🟡",
  },
  unknown: {
    label: "Немає даних",
    reason: "Очікується оновлення",
    color: "#94A3B8",
    icon: "⚪",
  },
};

function splitHourToHalves(start, end, status) {
  const hour = start.split(":")[0];
  const mid = `${hour}:30`;
  const map = {
    yes: ["yes", "yes"],
    no: ["no", "no"],
    maybe: ["maybe", "maybe"],
    first: ["no", "yes"],
    second: ["yes", "no"],
    mfirst: ["maybe", "yes"],
    msecond: ["yes", "maybe"],
  };
  const [firstHalf, secondHalf] = map[status] || ["unknown", "unknown"];
  return [
    { start, end: mid, status: firstHalf },
    { start, mid, end, status: secondHalf },
  ];
}

export function formatScheduleIntervals(hourlyList) {
  if (!Array.isArray(hourlyList) || hourlyList.length === 0) return [];
  const halfSlots = hourlyList.flatMap((item) => {
    const [start, end] = item.time.split(" - ");
    return splitHourToHalves(start.trim(), end.trim(), item.status);
  });
  const intervals = [];
  let current = null;
  for (const slot of halfSlots) {
    if (!current) {
      current = { ...slot };
    } else if (current.status === slot.status) {
      current.end = slot.end;
    } else {
      intervals.push(buildRow(current));
      current = { ...slot };
    }
  }
  if (current) intervals.push(buildRow(current));
  return intervals;
}

function buildRow({ start, end, status }) {
  const meta = STATUS_MAP[status] || STATUS_MAP.unknown;
  return { time: `${start} – ${end}`, status, ...meta };
}

async function safeFetch(url) {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Немає інтернету");
    return await res.json();
  } catch {
    throw new Error("Немає інтернету");
  }
}

export function fetchCities() {
  return safeFetch(`${BASE_URL}/api/cities`);
}

export function fetchWeather(cityKey = "odesa") {
  return safeFetch(
    `${BASE_URL}/api/weather?city=${encodeURIComponent(cityKey)}`,
  );
}

export function fetchSchedule(group = "1.1") {
  return safeFetch(
    `${BASE_URL}/api/schedule?group=${encodeURIComponent(group)}`,
  );
}

export function fetchAppVersion() {
  return safeFetch(`${BASE_URL}/api/version`);
}
