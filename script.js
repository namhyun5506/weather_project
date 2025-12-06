// DOM이 모두 만들어진 다음에 실행되도록 감싸기
document.addEventListener("DOMContentLoaded", () => {
  // OpenWeatherMap 설정
  const API_KEY = "c048cc830faf9d37b921132c905c8906"; // TODO: 실제 키로 교체
  const CURRENT_API_URL = "https://api.openweathermap.org/data/2.5/weather";
  const FORECAST_API_URL = "https://api.openweathermap.org/data/2.5/forecast";
  const GEO_DIRECT_API_URL = "https://api.openweathermap.org/geo/1.0/direct";
  const GEO_REVERSE_API_URL = "https://api.openweathermap.org/geo/1.0/reverse";
  const STORAGE_KEY = "weatherAppState";

  // DOM 요소
  const cityInput = document.getElementById("cityInput");
  const searchBtn = document.getElementById("searchBtn");
  const geoBtn = document.getElementById("geoBtn");
  const tempEl = document.getElementById("temp");
  const descEl = document.getElementById("description");
  const unitButtons = document.querySelectorAll(".unit-btn");
  const forecastListEl = document.getElementById("forecastList");
  const hourlyListEl = document.getElementById("hourlyList");
  const currentDateEl = document.getElementById("currentDate");
  const currentLabelEl = document.getElementById("currentLabel");
  const currentLocationEl = document.getElementById("currentLocation");
  const weatherInfoEl = document.getElementById("weatherInfo");
  const forecastSectionEl = document.getElementById("forecastSection");
  const hourlySectionEl = document.getElementById("hourlySection");
  const currentIconEl = document.getElementById("currentIcon");
  const todayRangeEl = document.getElementById("todayRange");
  const todayPopEl = document.getElementById("todayPop");
  const feelsLikeEl = document.getElementById("feelsLike");
  const humidityEl = document.getElementById("humidity");
  const sunInfoEl = document.getElementById("sunInfo");

  const favoritesListEl = document.getElementById("favoritesList");
  const recentsListEl = document.getElementById("recentsList");
  const addFavoriteBtn = document.getElementById("addFavoriteBtn");
  const themeButtons = document.querySelectorAll(".theme-btn");
  const recentsDropdown = document.getElementById("recentsDropdown");
  const titleEl = document.querySelector(".title");

  // 상태
  let currentTempC = null; // 현재 온도(°C)
  let currentFeelsLikeC = null; // 체감 온도(°C)
  let currentHumidity = null; // 습도
  let sunInfoText = ""; // 일출/일몰 문자열

  let currentUnit = "C"; // "C" 또는 "F"
  let currentForecast = []; // 내일/모레/글피
  let hourlyForecast = []; // 24시간
  let todayHighC = null;
  let todayLowC = null;
  let todayPop = null; // 0~1

  let lastLat = null;
  let lastLon = null;
  let lastLocationKo = null;
  let lastLocationEn = null;

  let favorites = []; // [{label, ko, en}]
  let recents = []; // [label(string)]
  let currentTheme = "light";

  let recentsHideTimeout = null;

  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  /** 아이콘 URL */
  function getIconUrl(iconCode) {
    if (!iconCode) return "";
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  }

  /** 로컬 YYYY-MM-DD */
  function getLocalDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  /** 코드 → 한글 설명 */
  function getPrettyDescription(id, fallback = "") {
    const map = {
      // Thunderstorm
      200: "약한 비를 동반한 뇌우",
      201: "비를 동반한 뇌우",
      202: "강한 비를 동반한 뇌우",
      210: "약한 뇌우",
      211: "뇌우",
      212: "강한 뇌우",
      221: "불규칙한 뇌우",
      230: "약한 이슬비를 동반한 뇌우",
      231: "이슬비를 동반한 뇌우",
      232: "강한 이슬비를 동반한 뇌우",

      // Drizzle
      300: "약한 이슬비",
      301: "이슬비",
      302: "강한 이슬비",
      310: "약한 비와 이슬비",
      311: "비와 이슬비",
      312: "강한 비와 이슬비",
      313: "소나기 비와 이슬비",
      314: "강한 소나기 비와 이슬비",
      321: "소나기 이슬비",

      // Rain
      500: "약한 비",
      501: "비",
      502: "강한 비",
      503: "매우 강한 비",
      504: "극심한 비",
      511: "어는 비",
      520: "약한 소나기 비",
      521: "소나기 비",
      522: "강한 소나기 비",
      531: "불규칙한 소나기 비",

      // Snow
      600: "약한 눈",
      601: "눈",
      602: "강한 눈",
      611: "진눈깨비",
      612: "진눈깨비 소나기",
      613: "소나기 진눈깨비",
      615: "약한 비와 눈",
      616: "비와 눈",
      620: "약한 눈 소나기",
      621: "눈 소나기",
      622: "강한 눈 소나기",

      // Atmosphere
      701: "옅은 안개(박무)",
      711: "연기",
      721: "연무(뿌연 대기)",
      731: "모래/먼지 바람",
      741: "짙은 안개",
      751: "모래",
      761: "먼지",
      762: "화산재",
      771: "돌풍",
      781: "토네이도",

      // Clear
      800: "맑음",

      // Clouds
      801: "구름 조금",
      802: "구름 약간",
      803: "구름 많음(튼구름)",
      804: "흐림",
    };

    return map[id] || fallback || "";
  }

  function handleError(error) {
    console.error("Weather API Error:", error);
  }

  function toFahrenheit(celsius) {
    return celsius * (9 / 5) + 32;
  }

  /** 테마 적용 */
  function applyTheme(theme) {
    currentTheme = theme === "dark" ? "dark" : "light";
    if (currentTheme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
    themeButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.theme === currentTheme);
    });
  }

  /** localStorage 저장 */
  function saveState() {
    const state = {
      lat: lastLat,
      lon: lastLon,
      unit: currentUnit,
      lastLocationKo,
      lastLocationEn,
      favorites,
      recents,
      theme: currentTheme,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save state:", e);
    }
  }

  /** localStorage 불러오기 */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error("Failed to load state:", e);
      return null;
    }
  }

  /** 오늘 메인 온도 */
  function renderTemperature() {
    if (currentTempC == null) {
      tempEl.textContent = "";
      return;
    }
    if (currentUnit === "C") {
      tempEl.textContent = `${Math.round(currentTempC)}°C`;
    } else {
      tempEl.textContent = `${Math.round(toFahrenheit(currentTempC))}°F`;
    }
  }

  /** 오늘 체감온도 / 습도 / 일출일몰 */
  function renderExtraInfo() {
    // 체감온도
    if (currentFeelsLikeC == null) {
      feelsLikeEl.textContent = "";
    } else {
      let feels = currentFeelsLikeC;
      if (currentUnit === "F") {
        feels = toFahrenheit(feels);
      }
      feelsLikeEl.textContent = `${Math.round(feels)}°`;
    }

    // 습도
    if (typeof currentHumidity === "number") {
      humidityEl.textContent = `${currentHumidity}%`;
    } else {
      humidityEl.textContent = "";
    }

    // 일출/일몰
    sunInfoEl.textContent = sunInfoText || "";
  }

  /** 오늘 최고/최저 + 강수확률 */
  function renderTodayExtras() {
    // 최고/최저
    if (todayHighC == null || todayLowC == null) {
      todayRangeEl.textContent = "";
    } else {
      let high = todayHighC;
      let low = todayLowC;
      if (currentUnit === "F") {
        high = toFahrenheit(high);
        low = toFahrenheit(low);
      }
      todayRangeEl.textContent = `최고 ${Math.round(high)}° / 최저 ${Math.round(
        low
      )}°`;
    }

    // 강수확률
    if (typeof todayPop === "number") {
      const pct = Math.round(todayPop * 100);
      todayPopEl.textContent = `강수확률 ${pct}%`;
    } else {
      todayPopEl.textContent = "";
    }
  }

  function formatDateLabel(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayName = dayNames[date.getDay()];
    return `${month}/${day}(${dayName})`;
  }

  function formatDateTime(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayName = dayNames[date.getDay()];
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${month}/${day}(${dayName}) ${hours}:${minutes}`;
  }

  function formatTime(date) {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }

  /** 즐겨찾기 렌더링 */
  function renderFavorites() {
    favoritesListEl.innerHTML = "";
    if (!favorites.length) {
      const span = document.createElement("span");
      span.className = "empty-text";
      span.textContent = "없음";
      favoritesListEl.appendChild(span);
      return;
    }
    favorites.forEach((fav, index) => {
      const btn = document.createElement("button");
      btn.className = "chip-btn";

      const labelSpan = document.createElement("span");
      labelSpan.className = "chip-label";
      labelSpan.textContent = fav.label;

      const closeSpan = document.createElement("span");
      closeSpan.className = "chip-close";
      closeSpan.textContent = "×";

      btn.appendChild(labelSpan);
      btn.appendChild(closeSpan);

      // 클릭하면 해당 즐겨찾기 지역으로 검색
      btn.addEventListener("click", () => {
        const query = fav.ko || fav.en || fav.label;
        if (query) {
          if (cityInput) cityInput.value = query;
          getWeather(query);
        }
      });

      // X 클릭 시 삭제
      closeSpan.addEventListener("click", (event) => {
        event.stopPropagation();
        favorites.splice(index, 1);
        renderFavorites();
        saveState();
      });

      favoritesListEl.appendChild(btn);
    });
  }

  /** 최근 검색 렌더링 */
  function renderRecents() {
    recentsListEl.innerHTML = "";
    if (!recents.length) {
      const span = document.createElement("span");
      span.className = "empty-text";
      span.textContent = "없음";
      recentsListEl.appendChild(span);
      return;
    }
    recents.forEach((label, index) => {
      const btn = document.createElement("button");
      btn.className = "chip-btn";

      const labelSpan = document.createElement("span");
      labelSpan.className = "chip-label";
      labelSpan.textContent = label;

      const closeSpan = document.createElement("span");
      closeSpan.className = "chip-close";
      closeSpan.textContent = "×";

      btn.appendChild(labelSpan);
      btn.appendChild(closeSpan);

      // 클릭하면 해당 검색어로 검색
      btn.addEventListener("click", () => {
        const cityPart = label.split(",")[0].trim();
        if (cityInput) cityInput.value = cityPart;
        hideRecentsDropdown();
        getWeather(cityPart);
      });

      // X 클릭 시 삭제
      closeSpan.addEventListener("click", (event) => {
        event.stopPropagation();
        recents.splice(index, 1);
        renderRecents();
        saveState();
      });

      recentsListEl.appendChild(btn);
    });
  }

  /** 최근 검색 추가 */
  function addRecent(label) {
    if (!label) return;
    const idx = recents.indexOf(label);
    if (idx !== -1) {
      recents.splice(idx, 1);
    }
    recents.unshift(label);
    if (recents.length > 10) {
      recents.length = 10;
    }
    renderRecents();
    saveState();
  }

  /** 3일 단기 예보 렌더링 */
  function renderForecast() {
    forecastListEl.innerHTML = "";
    if (!currentForecast.length) return;

    currentForecast.forEach((item) => {
      const card = document.createElement("article");
      card.className = "forecast-card";

      // 대표 온도
      let displayTemp =
        currentUnit === "C"
          ? `${Math.round(item.tempC)}°C`
          : `${Math.round(toFahrenheit(item.tempC))}°F`;

      // 최고/최저
      let high = item.highC;
      let low = item.lowC;
      if (currentUnit === "F") {
        high = toFahrenheit(high);
        low = toFahrenheit(low);
      }
      const rangeText = `최고 ${Math.round(high)}° / 최저 ${Math.round(
        low
      )}°`;

      // 강수확률
      const popPct =
        typeof item.pop === "number"
          ? `${Math.round(item.pop * 100)}%`
          : "-";

      const iconUrl = getIconUrl(item.icon);
      const iconHtml = iconUrl
        ? `<img class="forecast-icon" src="${iconUrl}" alt="날씨 아이콘" />`
        : "";

      card.innerHTML = `
        <div class="forecast-date">${item.label}</div>
        ${iconHtml}
        <div class="forecast-temp">${displayTemp}</div>
        <div class="forecast-range">${rangeText}</div>
        <div class="forecast-pop">강수확률 ${popPct}</div>
        <div class="forecast-desc">${item.description || "-"}</div>
      `;

      forecastListEl.appendChild(card);
    });
  }

  /** 시간별 24시간 예보 렌더링 */
  function renderHourlyForecast() {
    hourlyListEl.innerHTML = "";
    if (!hourlyForecast.length) return;

    hourlyForecast.forEach((item) => {
      const card = document.createElement("article");
      card.className = "hourly-card";

      let displayTemp =
        currentUnit === "C"
          ? `${Math.round(item.tempC)}°C`
          : `${Math.round(toFahrenheit(item.tempC))}°F`;

      const popPct =
        typeof item.pop === "number"
          ? `${Math.round(item.pop * 100)}%`
          : "-";

      const iconUrl = getIconUrl(item.icon);
      const iconHtml = iconUrl
        ? `<img class="hourly-icon" src="${iconUrl}" alt="날씨 아이콘" />`
        : "";

      card.innerHTML = `
        <div class="hourly-time">${item.label}</div>
        ${iconHtml}
        <div class="hourly-temp">${displayTemp}</div>
        <div class="hourly-desc">${item.description || "-"}</div>
        <div class="hourly-pop">강수확률 ${popPct}</div>
      `;

      hourlyListEl.appendChild(card);
    });
  }

  /** 지오코딩: 도시명 → 위도/경도 */
  async function getCoordinates(city) {
    const url = `${GEO_DIRECT_API_URL}?q=${encodeURIComponent(
      city
    )}&limit=1&appid=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`지오코딩 HTTP 에러: ${res.status}`);
    const data = await res.json();
    if (!data.length) throw new Error("해당 도시를 찾을 수 없습니다.");
    return data[0]; // { lat, lon, name, local_names?, ... }
  }

  /** 리버스 지오코딩: 위도/경도 → 지역명 (한글 포함 가능) */
  async function getReverseGeocode(lat, lon) {
    const url = `${GEO_REVERSE_API_URL}?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`리버스 지오코딩 HTTP 에러: ${res.status}`);
    const data = await res.json();
    if (!data.length) return null;
    return data[0]; // { name, local_names?, ... }
  }

  /** 현재 날씨 */
  async function fetchCurrentWeather(lat, lon) {
    const url = `${CURRENT_API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`현재 날씨 HTTP 에러: ${response.status}`);

    const data = await response.json();

    const temperature = data.main?.temp;
    const feels = data.main?.feels_like;
    const humidity = data.main?.humidity;
    const id = data.weather?.[0]?.id;
    const rawDescription = data.weather?.[0]?.description;
    const prettyDescription = getPrettyDescription(id, rawDescription);
    const iconCode = data.weather?.[0]?.icon;

    // 날짜/시간 (도시 현지)
    if (typeof data.dt === "number" && typeof data.timezone === "number") {
      const localMs = (data.dt + data.timezone) * 1000;
      const localDate = new Date(localMs);
      currentDateEl.textContent = formatDateTime(localDate);
    } else {
      currentDateEl.textContent = "";
    }

    // 일출/일몰
    sunInfoText = "";
    if (
      typeof data.sys?.sunrise === "number" &&
      typeof data.sys?.sunset === "number" &&
      typeof data.timezone === "number"
    ) {
      const sunriseMs = (data.sys.sunrise + data.timezone) * 1000;
      const sunsetMs = (data.sys.sunset + data.timezone) * 1000;
      const sunriseDate = new Date(sunriseMs);
      const sunsetDate = new Date(sunsetMs);
      sunInfoText = `${formatTime(sunriseDate)} / ${formatTime(sunsetDate)}`;
    }

    // 위치 (한글 + 영어)
    const cityName = data.name;
    const country = data.sys?.country;

    let displayName = "";
    if (lastLocationKo) {
      displayName = lastLocationKo;
      if (
        lastLocationEn &&
        lastLocationEn.toLowerCase() !== lastLocationKo.toLowerCase()
      ) {
        displayName += ` (${lastLocationEn})`;
      }
    } else if (lastLocationEn) {
      displayName = lastLocationEn;
    } else if (cityName) {
      displayName = cityName;
    }

    const parts = [];
    if (displayName) parts.push(displayName);
    if (country) parts.push(country);

    const fullLabel = parts.join(", ");
    currentLocationEl.textContent = fullLabel || "";

    // 최근 검색 추가
    if (fullLabel) {
      addRecent(fullLabel);
    }

    // 아이콘
    if (iconCode) {
      currentIconEl.src = getIconUrl(iconCode);
      currentIconEl.alt = prettyDescription || rawDescription || "날씨 아이콘";
      currentIconEl.classList.remove("hidden");
    } else {
      currentIconEl.src = "";
      currentIconEl.alt = "";
      currentIconEl.classList.add("hidden");
    }

    currentLabelEl.textContent = "오늘";

    if (typeof temperature === "number") {
      currentTempC = temperature;
      renderTemperature();
    } else {
      currentTempC = null;
      tempEl.textContent = "";
    }

    if (typeof feels === "number") {
      currentFeelsLikeC = feels;
    } else {
      currentFeelsLikeC = null;
    }

    if (typeof humidity === "number") {
      currentHumidity = humidity;
    } else {
      currentHumidity = null;
    }

    renderExtraInfo();

    descEl.textContent = prettyDescription || rawDescription || "";
  }

  /** 예보(3시간 간격) → 오늘/3일/24시간 정리 */
  async function fetchForecast(lat, lon) {
    const url = `${FORECAST_API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`예보 HTTP 에러: ${response.status}`);

    const data = await response.json();
    const list = data.list || [];

    const dailyMap = {}; // dateKey -> {rep, items[]}
    const now = new Date();
    const todayKey = getLocalDateKey(now);

    const points = []; // 시간별용

    // 예보 데이터 전체 한 번 순회
    for (const item of list) {
      const dtLocal = new Date(item.dt * 1000);
      const dateKey = getLocalDateKey(dtLocal);

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { rep: item, items: [] };
      }
      dailyMap[dateKey].items.push(item);

      const tempC = typeof item.main?.temp === "number" ? item.main.temp : 0;
      const id = item.weather?.[0]?.id;
      const rawDescription = item.weather?.[0]?.description ?? "";
      const prettyDescription = getPrettyDescription(id, rawDescription);
      const iconCode = item.weather?.[0]?.icon ?? "";
      const pop = typeof item.pop === "number" ? item.pop : 0;

      points.push({
        timeMs: dtLocal.getTime(),
        tempC,
        description: prettyDescription || rawDescription,
        icon: iconCode,
        pop,
      });
    }

    // --- 오늘 최고/최저 + 강수확률 ---
    todayHighC = null;
    todayLowC = null;
    todayPop = null;

    const todayInfo = dailyMap[todayKey];
    if (todayInfo) {
      const temps = [];
      const pops = [];
      todayInfo.items.forEach((it) => {
        if (typeof it.main?.temp === "number") temps.push(it.main.temp);
        if (typeof it.pop === "number") pops.push(it.pop);
      });
      if (temps.length) {
        todayHighC = Math.max(...temps);
        todayLowC = Math.min(...temps);
      }
      if (pops.length) {
        todayPop = Math.max(...pops); // 그날 중 가장 높은 강수확률
      }
    }
    renderTodayExtras();

    // --- 내일/모레/글피 3일 ---
    const futureKeys = Object.keys(dailyMap)
      .filter((k) => k > todayKey)
      .sort();
    const selectedKeys = futureKeys.slice(0, 3);

    currentForecast = selectedKeys.map((key) => {
      const info = dailyMap[key];
      const items = info.items;
      const rep = info.rep;

      const temps = [];
      const pops = [];
      items.forEach((it) => {
        if (typeof it.main?.temp === "number") temps.push(it.main.temp);
        if (typeof it.pop === "number") pops.push(it.pop);
      });

      const highC = temps.length ? Math.max(...temps) : rep.main?.temp ?? 0;
      const lowC = temps.length ? Math.min(...temps) : rep.main?.temp ?? 0;
      const pop = pops.length ? Math.max(...pops) : rep.pop ?? 0;

      const dtLocal = new Date(rep.dt * 1000);
      const id = rep.weather?.[0]?.id;
      const rawDescription = rep.weather?.[0]?.description ?? "";
      const prettyDescription = getPrettyDescription(id, rawDescription);
      const iconCode = rep.weather?.[0]?.icon ?? "";

      let tempC;
      if (typeof rep.main?.temp === "number") {
        tempC = rep.main.temp;
      } else if (Number.isFinite(highC) && Number.isFinite(lowC)) {
        tempC = (highC + lowC) / 2;
      } else {
        tempC = 0;
      }

      return {
        label: formatDateLabel(dtLocal),
        tempC,
        highC,
        lowC,
        pop,
        description: prettyDescription || rawDescription,
        icon: iconCode,
      };
    });

    renderForecast();

    // --- 시간별 24시간 ---
    const nowMs = now.getTime();
    const hourly = [];

    for (let h = 0; h < 24; h++) {
      const targetMs = nowMs + h * 60 * 60 * 1000;
      let best = null;
      let bestDiff = Infinity;

      for (const p of points) {
        const diff = Math.abs(p.timeMs - targetMs);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = p;
        }
      }

      if (!best) continue;

      const tDate = new Date(targetMs);
      const hourLabel = `${String(tDate.getHours()).padStart(2, "0")}시`;

      hourly.push({
        label: hourLabel,
        tempC: best.tempC,
        description: best.description,
        icon: best.icon,
        pop: best.pop,
      });
    }

    hourlyForecast = hourly;
    renderHourlyForecast();
  }

  /** 위도/경도로 전체 날씨 */
  async function getWeatherByCoords(lat, lon) {
    try {
      lastLat = lat;
      lastLon = lon;

      await Promise.all([
        fetchCurrentWeather(lat, lon),
        fetchForecast(lat, lon),
      ]);

      weatherInfoEl.classList.remove("hidden");
      hourlySectionEl.classList.remove("hidden");
      forecastSectionEl.classList.remove("hidden");

      saveState();
    } catch (error) {
      handleError(error);
      currentTempC = null;
      tempEl.textContent = "";
      descEl.textContent = "날씨 정보를 가져오지 못했습니다.";
      currentForecast = [];
      forecastListEl.innerHTML = "";
      hourlyForecast = [];
      hourlyListEl.innerHTML = "";
      currentDateEl.textContent = "";
      currentLocationEl.textContent = "";
      currentIconEl.src = "";
      currentIconEl.alt = "";
      currentIconEl.classList.add("hidden");
      todayHighC = todayLowC = todayPop = null;
      currentFeelsLikeC = null;
      currentHumidity = null;
      sunInfoText = "";
      renderTodayExtras();
      renderExtraInfo();
    }
  }

  /** 최근 검색 드롭다운 표시/숨김 */
  function showRecentsDropdown() {
    if (!recentsDropdown) return;
    recentsDropdown.classList.remove("hidden");
  }

  function hideRecentsDropdown() {
    if (!recentsDropdown) return;
    recentsDropdown.classList.add("hidden");
  }

  /** 도시명으로 전체 날씨 */
  async function getWeather(city) {
    // 검색 실행 시 구글처럼 드롭다운 닫기
    hideRecentsDropdown();

    if (!city) {
      tempEl.textContent = "";
      descEl.textContent = "도시명을 입력해주세요.";
      currentTempC = null;
      currentForecast = [];
      forecastListEl.innerHTML = "";
      hourlyForecast = [];
      hourlyListEl.innerHTML = "";
      currentDateEl.textContent = "";
      currentLocationEl.textContent = "";
      currentIconEl.src = "";
      currentIconEl.alt = "";
      currentIconEl.classList.add("hidden");
      todayHighC = todayLowC = todayPop = null;
      currentFeelsLikeC = null;
      currentHumidity = null;
      sunInfoText = "";
      renderTodayExtras();
      renderExtraInfo();
      return;
    }

    try {
      const location = await getCoordinates(city);
      const { lat, lon } = location;

      lastLocationEn = location.name || null;
      lastLocationKo =
        (location.local_names && location.local_names.ko) || null;

      await getWeatherByCoords(lat, lon);
    } catch (error) {
      handleError(error);
      currentTempC = null;
      tempEl.textContent = "";
      descEl.textContent = "해당 도시의 날씨를 찾을 수 없습니다.";
      currentForecast = [];
      forecastListEl.innerHTML = "";
      hourlyForecast = [];
      hourlyListEl.innerHTML = "";
      currentDateEl.textContent = "";
      currentLocationEl.textContent = "";
      currentIconEl.src = "";
      currentIconEl.alt = "";
      currentIconEl.classList.add("hidden");
      todayHighC = todayLowC = todayPop = null;
      currentFeelsLikeC = null;
      currentHumidity = null;
      sunInfoText = "";
      renderTodayExtras();
      renderExtraInfo();
    }
  }

  /** 새로고침 시 저장된 상태에서 복원 */
  async function restoreFromStorage() {
    const saved = loadState();

    if (saved && saved.theme) {
      applyTheme(saved.theme);
    } else {
      applyTheme("light");
    }

    // 즐겨찾기, 최근검색, 단위
    if (saved) {
      favorites = Array.isArray(saved.favorites) ? saved.favorites : [];
      recents = Array.isArray(saved.recents) ? saved.recents : [];
      renderFavorites();
      renderRecents();

      currentUnit = saved.unit === "F" ? "F" : "C";
      unitButtons.forEach((b) => {
        b.classList.toggle("active", b.dataset.unit === currentUnit);
      });

      lastLat = typeof saved.lat === "number" ? saved.lat : null;
      lastLon = typeof saved.lon === "number" ? saved.lon : null;
      lastLocationKo = saved.lastLocationKo || null;
      lastLocationEn = saved.lastLocationEn || null;

      if (cityInput) {
        if (lastLocationKo || lastLocationEn) {
          cityInput.value = lastLocationKo || lastLocationEn;
        } else {
          cityInput.value = "";
        }
      }

      if (lastLat != null && lastLon != null) {
        await getWeatherByCoords(lastLat, lastLon);
      }
    } else {
      favorites = [];
      recents = [];
      renderFavorites();
      renderRecents();
    }
  }

  /** 현재 위치를 즐겨찾기에 추가 */
  function addCurrentToFavorites() {
    const locText = currentLocationEl.textContent.trim();
    if (!locText) {
      descEl.textContent = "먼저 위치를 조회한 뒤 즐겨찾기에 추가할 수 있습니다.";
      return;
    }

    const label = locText.split(",")[0].trim(); // "서울 (Seoul)" 부분

    const exists = favorites.some((f) => f.label === label);
    if (exists) {
      descEl.textContent = "이미 즐겨찾기에 추가된 지역입니다.";
      return;
    }

    const newFav = {
      label,
      ko: lastLocationKo,
      en: lastLocationEn,
    };

    favorites = [newFav, ...favorites];
    if (favorites.length > 5) {
      favorites = favorites.slice(0, 5);
    }

    renderFavorites();
    saveState();
  }

  /** 초기 화면으로 리셋 */
  function resetToInitialView() {
    if (cityInput) cityInput.value = "";

    weatherInfoEl.classList.add("hidden");
    hourlySectionEl.classList.add("hidden");
    forecastSectionEl.classList.add("hidden");

    currentLabelEl.textContent = "오늘";
    currentDateEl.textContent = "";
    currentLocationEl.textContent = "";
    tempEl.textContent = "";
    descEl.textContent = "";

    currentIconEl.src = "";
    currentIconEl.alt = "";
    currentIconEl.classList.add("hidden");

    todayRangeEl.textContent = "";
    todayPopEl.textContent = "";
    feelsLikeEl.textContent = "";
    humidityEl.textContent = "";
    sunInfoEl.textContent = "";

    currentTempC = null;
    currentFeelsLikeC = null;
    currentHumidity = null;
    todayHighC = todayLowC = todayPop = null;
    sunInfoText = "";

    hourlyForecast = [];
    hourlyListEl.innerHTML = "";
    currentForecast = [];
    forecastListEl.innerHTML = "";
  }

  /** 이벤트 연결 */
  function setupEventListeners() {
    // 검색 버튼
    searchBtn.addEventListener("click", () => {
      const city = cityInput.value.trim();
      getWeather(city);
    });

    // Enter 검색
    cityInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const city = cityInput.value.trim();
        getWeather(city);
      }
    });

    // 검색창 포커스 -> 최근 검색 드롭다운 표시
    cityInput.addEventListener("focus", () => {
      if (recentsHideTimeout) {
        clearTimeout(recentsHideTimeout);
        recentsHideTimeout = null;
      }
      showRecentsDropdown();
    });

    // 검색창 포커스 아웃 -> 약간 딜레이 후 숨김 (chip 클릭 이벤트 처리 위해)
    cityInput.addEventListener("blur", () => {
      recentsHideTimeout = setTimeout(() => {
        hideRecentsDropdown();
      }, 150);
    });

    // 현재 위치 버튼
    geoBtn.addEventListener("click", () => {
      if (!("geolocation" in navigator)) {
        descEl.textContent = "이 브라우저에서는 위치 정보를 지원하지 않습니다.";
        return;
      }

      geoBtn.disabled = true;
      const originalText = geoBtn.textContent;
      geoBtn.textContent = "위치 확인 중...";

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          // 현재 위치로 찾기 누르면 검색창 비우기
          if (cityInput) {
            cityInput.value = "";
          }

          (async () => {
            try {
              // 한글/영문 지역명 얻기
              const rev = await getReverseGeocode(latitude, longitude);
              if (rev) {
                lastLocationEn = rev.name || null;
                lastLocationKo =
                  (rev.local_names && rev.local_names.ko) || null;
              } else {
                lastLocationEn = null;
                lastLocationKo = null;
              }

              await getWeatherByCoords(latitude, longitude);
            } catch (err) {
              handleError(err);
              descEl.textContent = "현재 위치를 가져올 수 없습니다.";
            } finally {
              geoBtn.disabled = false;
              geoBtn.textContent = originalText;
            }
          })();
        },
        (error) => {
          handleError(error);
          descEl.textContent = "현재 위치를 가져올 수 없습니다.";
          geoBtn.disabled = false;
          geoBtn.textContent = originalText;
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    });

    // 단위 전환 버튼
    unitButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const selectedUnit = btn.dataset.unit;
        if (currentUnit === selectedUnit) return;

        currentUnit = selectedUnit;

        unitButtons.forEach((b) => {
          b.classList.toggle("active", b.dataset.unit === currentUnit);
        });

        renderTemperature();
        renderTodayExtras();
        renderExtraInfo();
        renderForecast();
        renderHourlyForecast();
        saveState();
      });
    });

    // 다크 모드 토글 버튼들
    themeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextTheme = btn.dataset.theme;
        applyTheme(nextTheme);
        saveState();
      });
    });

    // 즐겨찾기 추가 버튼
    if (addFavoriteBtn) {
      addFavoriteBtn.addEventListener("click", () => {
        addCurrentToFavorites();
      });
    }

    // 제목 클릭 -> 초기 화면으로
    if (titleEl) {
      titleEl.addEventListener("click", () => {
        resetToInitialView();
      });
    }
  }

  // 초기화
  setupEventListeners();
  // 새로고침 시 마지막 상태 복원
  restoreFromStorage();
});
