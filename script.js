// DOM이 모두 만들어진 다음에 실행되도록 감싸기
document.addEventListener("DOMContentLoaded", () => {
  // OpenWeatherMap 설정 (예제용)
  const API_KEY = "c048cc830faf9d37b921132c905c8906"; // TODO: 실제 키로 교체
  const CURRENT_API_URL = "https://api.openweathermap.org/data/2.5/weather";
  const FORECAST_API_URL = "https://api.openweathermap.org/data/2.5/forecast";
  const GEO_API_URL = "https://api.openweathermap.org/geo/1.0/direct";

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

  // 상태
  let currentTempC = null;      // 현재 온도(°C)
  let currentUnit = "C";        // "C" 또는 "F"
  let currentForecast = [];     // 내일/모레/글피 [{label,tempC,highC,lowC,pop,...}]
  let hourlyForecast = [];      // 24시간 [{label,tempC,pop,...}]
  let todayHighC = null;
  let todayLowC = null;
  let todayPop = null;          // 0~1

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

  /** 오늘 최고/최저 + 강수 */
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
      todayPopEl.textContent = `강수 ${pct}%`;
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
        <div class="forecast-pop">강수 ${popPct}</div>
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
        <div class="hourly-pop">강수 ${popPct}</div>
      `;

      hourlyListEl.appendChild(card);
    });
  }

  /** 지오코딩: 도시명 → 위도/경도 */
  async function getCoordinates(city) {
    const url = `${GEO_API_URL}?q=${encodeURIComponent(
      city
    )}&limit=1&appid=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`지오코딩 HTTP 에러: ${res.status}`);
    const data = await res.json();
    if (!data.length) throw new Error("해당 도시를 찾을 수 없습니다.");
    return data[0];
  }

  /** 현재 날씨 */
  async function fetchCurrentWeather(lat, lon) {
    const url = `${CURRENT_API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`현재 날씨 HTTP 에러: ${response.status}`);

    const data = await response.json();

    const temperature = data.main?.temp;
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

    // 위치
    const cityName = data.name;
    const country = data.sys?.country;
    let locText = "";
    if (cityName) locText = cityName;
    if (country) locText = locText ? `${locText}, ${country}` : country;
    currentLocationEl.textContent = locText || "";

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

      const tempC = item.main?.temp ?? 0;
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

    // --- 오늘 최고/최저 + 강수 ---
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

      // 여기 부분이 문제였던 줄 -> if 블록으로 분리
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
      await Promise.all([
        fetchCurrentWeather(lat, lon),
        fetchForecast(lat, lon),
      ]);

      weatherInfoEl.classList.remove("hidden");
      hourlySectionEl.classList.remove("hidden");
      forecastSectionEl.classList.remove("hidden");
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
      renderTodayExtras();
    }
  }

  /** 도시명으로 전체 날씨 */
  async function getWeather(city) {
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
      renderTodayExtras();
      return;
    }

    try {
      const location = await getCoordinates(city);
      const { lat, lon } = location;
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
      renderTodayExtras();
    }
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
          getWeatherByCoords(latitude, longitude).finally(() => {
            geoBtn.disabled = false;
            geoBtn.textContent = originalText;
          });
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
        renderForecast();
        renderHourlyForecast();
      });
    });
  }

  // 초기화
  setupEventListeners();
});
