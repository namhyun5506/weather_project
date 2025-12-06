document.addEventListener("DOMContentLoaded", () => {
  const API_KEY = "c048cc830faf9d37b921132c905c8906"; // 실제 키로 교체
  const CURRENT_API_URL = "https://api.openweathermap.org/data/2.5/weather";
  const FORECAST_API_URL = "https://api.openweathermap.org/data/2.5/forecast";
  const GEO_DIRECT_API_URL = "https://api.openweathermap.org/geo/1.0/direct";
  const GEO_REVERSE_API_URL = "https://api.openweathermap.org/geo/1.0/reverse";
  const STORAGE_KEY = "weatherAppState";

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
  const lifeIndexEl = document.getElementById("lifeIndex");

  const favoritesListEl = document.getElementById("favoritesList");
  const recentsListEl = document.getElementById("recentsList");
  const addFavoriteBtn = document.getElementById("addFavoriteBtn");
  const themeButtons = document.querySelectorAll(".theme-btn");
  const recentsDropdown = document.getElementById("recentsDropdown");
  const titleEl = document.querySelector(".title");

  let currentTempC = null;
  let currentFeelsLikeC = null;
  let currentHumidity = null;
  let sunInfoText = "";

  let currentUnit = "C";
  let currentForecast = [];
  let hourlyForecast = [];
  let todayHighC = null;
  let todayLowC = null;
  let todayPop = null;

  let lastLat = null;
  let lastLon = null;
  let lastLocationKo = null;
  let lastLocationEn = null;

  let favorites = []; // [{label, ko, en}]
  let recents = []; // [label]
  let currentTheme = "light";

  let recentsHideTimeout = null;

  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  function getIconUrl(iconCode) {
    if (!iconCode) return "";
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  }

  function getLocalDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function getPrettyDescription(id, fallback = "") {
    const map = {
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
      300: "약한 이슬비",
      301: "이슬비",
      302: "강한 이슬비",
      310: "약한 비와 이슬비",
      311: "비와 이슬비",
      312: "강한 비와 이슬비",
      313: "소나기 비와 이슬비",
      314: "강한 소나기 비와 이슬비",
      321: "소나기 이슬비",
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
      800: "맑음",
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

  function applyTempColor(element, celsiusValue) {
    if (!element) return;
    element.classList.remove("temp-cold", "temp-warm");
    if (typeof celsiusValue !== "number") return;

    if (celsiusValue <= 0) {
      element.classList.add("temp-cold");
    } else {
      element.classList.add("temp-warm");
    }
  }

  // 현재 즐겨찾기 라벨: 검색창 → ko → en → 현재위치 텍스트
  function getCurrentFavoriteLabel() {
    if (cityInput) {
      const fromInput = cityInput.value.trim();
      if (fromInput) return fromInput;
    }

    if (lastLocationKo) return lastLocationKo;
    if (lastLocationEn) return lastLocationEn;

    const locText = currentLocationEl.textContent.trim();
    if (!locText) return "";
    return locText.split(",")[0].trim();
  }

  function isLabelFavorited(label) {
    return favorites.some((f) => f.label === label);
  }

  // +추가 버튼에 단순히 강조만 줄 수 있음(현재 즐겨찾기인지 여부)
  function updateFavoriteStars() {
    if (!addFavoriteBtn) return;
    const label = getCurrentFavoriteLabel();
    const isFav = label && isLabelFavorited(label);
    addFavoriteBtn.classList.toggle("fav-on", !!isFav);
  }

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

  function renderTemperature() {
    if (currentTempC == null) {
      tempEl.textContent = "";
      tempEl.classList.remove("temp-cold", "temp-warm");
      return;
    }

    if (currentUnit === "C") {
      tempEl.textContent = `${Math.round(currentTempC)}°C`;
    } else {
      tempEl.textContent = `${Math.round(toFahrenheit(currentTempC))}°F`;
    }
    applyTempColor(tempEl, currentTempC);
  }

  function renderExtraInfo() {
    if (currentFeelsLikeC == null) {
      feelsLikeEl.textContent = "";
      feelsLikeEl.classList.remove("temp-cold", "temp-warm");
    } else {
      let display = currentFeelsLikeC;
      if (currentUnit === "F") {
        display = toFahrenheit(display);
      }
      feelsLikeEl.textContent = `${Math.round(display)}°`;
      applyTempColor(feelsLikeEl, currentFeelsLikeC);
    }

    if (typeof currentHumidity === "number") {
      humidityEl.textContent = `${currentHumidity}%`;
    } else {
      humidityEl.textContent = "";
    }

    sunInfoEl.textContent = sunInfoText || "";
  }

  function renderTodayExtras() {
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

    if (typeof todayPop === "number") {
      const pct = Math.round(todayPop * 100);
      todayPopEl.textContent = `강수확률 ${pct}%`;
    } else {
      todayPopEl.textContent = "";
    }
  }

  function renderLifeIndex() {
    if (!lifeIndexEl) return;

    const tempC =
      typeof currentFeelsLikeC === "number"
        ? currentFeelsLikeC
        : typeof currentTempC === "number"
        ? currentTempC
        : null;

    if (tempC == null && typeof todayPop !== "number") {
      lifeIndexEl.textContent = "";
      return;
    }

    let message = "";

    if (typeof todayPop === "number" && todayPop >= 0.7) {
      message = "비가 올 가능성이 매우 높아요. 우산 꼭 챙기세요 ☔";
    } else if (typeof todayPop === "number" && todayPop >= 0.4) {
      message = "비가 올 수 있는 날이에요. 가벼운 우산을 챙기면 좋아요 ☂️";
    }

    if (tempC != null) {
      if (!message) {
        if (tempC >= 28) {
          message =
            "덥고 후덥지근한 날씨예요. 물 자주 마시고 실내에서 쉬는 걸 추천해요 🥵";
        } else if (tempC >= 23) {
          message = "야외 활동하기 좋은 따뜻한 날씨예요 😎";
        } else if (tempC >= 15) {
          message = "선선한 날씨예요. 가벼운 겉옷 하나 있으면 좋아요 🙂";
        } else if (tempC >= 5) {
          message = "조금 쌀쌀한 편이에요. 외투를 챙겨 입는 걸 추천해요 🧥";
        } else {
          message =
            "많이 추운 날씨예요. 두꺼운 옷과 장갑, 모자를 챙기는 게 좋아요 🥶";
        }
      }

      if (
        typeof currentHumidity === "number" &&
        currentHumidity >= 80 &&
        tempC >= 22
      ) {
        message += " 습도가 높아서 다소 후덥지근하게 느껴질 수 있어요.";
      } else if (
        typeof currentHumidity === "number" &&
        currentHumidity <= 30 &&
        tempC <= 10
      ) {
        message += " 공기가 건조할 수 있어요. 보습과 수분 섭취를 신경 써주세요.";
      }
    }

    lifeIndexEl.textContent = message;
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

      btn.addEventListener("click", () => {
        const query = fav.ko || fav.en || fav.label;
        if (query) {
          if (cityInput) cityInput.value = fav.ko || fav.en || fav.label;
          getWeather(query);
        }
      });

      closeSpan.addEventListener("click", (event) => {
        event.stopPropagation();
        favorites.splice(index, 1);
        renderFavorites();
        updateFavoriteStars();
        saveState();
      });

      favoritesListEl.appendChild(btn);
    });
  }

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

      btn.addEventListener("click", () => {
        const cityPart = label.split(",")[0].trim();
        if (cityInput) cityInput.value = cityPart;
        hideRecentsDropdown();
        getWeather(cityPart);
      });

      closeSpan.addEventListener("click", (event) => {
        event.stopPropagation();
        recents.splice(index, 1);
        renderRecents();
        saveState();
        if (recentsHideTimeout) {
          clearTimeout(recentsHideTimeout);
          recentsHideTimeout = null;
        }
        showRecentsDropdown();
      });

      recentsListEl.appendChild(btn);
    });

    const maxLines = 3;
    const approxLineHeight = 24;
    const maxHeight = maxLines * approxLineHeight;

    let safety = 0;
    while (
      recentsListEl.scrollHeight > maxHeight &&
      recents.length > 0 &&
      safety < 50
    ) {
      recents.pop();
      if (recentsListEl.lastElementChild) {
        recentsListEl.removeChild(recentsListEl.lastElementChild);
      }
      safety++;
    }

    if (!recents.length) {
      recentsListEl.innerHTML = "";
      const span = document.createElement("span");
      span.className = "empty-text";
      span.textContent = "없음";
      recentsListEl.appendChild(span);
    }

    saveState();
  }

  function addRecent(label) {
    if (!label) return;
    const idx = recents.indexOf(label);
    if (idx !== -1) {
      recents.splice(idx, 1);
    }
    recents.unshift(label);
    renderRecents();
  }

  function renderForecast() {
    forecastListEl.innerHTML = "";
    if (!currentForecast.length) return;

    currentForecast.forEach((item) => {
      const card = document.createElement("article");
      card.className = "forecast-card";

      let displayTemp =
        currentUnit === "C"
          ? `${Math.round(item.tempC)}°C`
          : `${Math.round(toFahrenheit(item.tempC))}°F`;

      let high = item.highC;
      let low = item.lowC;
      if (currentUnit === "F") {
        high = toFahrenheit(high);
        low = toFahrenheit(low);
      }
      const rangeText = `최고 ${Math.round(high)}° / 최저 ${Math.round(
        low
      )}°`;

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

      const tempSpan = card.querySelector(".forecast-temp");
      applyTempColor(tempSpan, item.tempC);
    });
  }

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

      const tempSpan = card.querySelector(".hourly-temp");
      applyTempColor(tempSpan, item.tempC);
    });
  }

  async function getCoordinates(city) {
    const url = `${GEO_DIRECT_API_URL}?q=${encodeURIComponent(
      city
    )}&limit=1&appid=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`지오코딩 HTTP 에러: ${res.status}`);
    const data = await res.json();
    if (!data.length) throw new Error("해당 도시를 찾을 수 없습니다.");
    return data[0];
  }

  async function getReverseGeocode(lat, lon) {
    const url = `${GEO_REVERSE_API_URL}?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`리버스 지오코딩 HTTP 에러: ${res.status}`);
    const data = await res.json();
    if (!data.length) return null;
    return data[0];
  }

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

    if (typeof data.dt === "number" && typeof data.timezone === "number") {
      const localMs = (data.dt + data.timezone) * 1000;
      const localDate = new Date(localMs);
      currentDateEl.textContent = formatDateTime(localDate);
    } else {
      currentDateEl.textContent = "";
    }

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

    const recentsLabel = lastLocationKo || lastLocationEn || cityName || "";
    if (recentsLabel) {
      addRecent(recentsLabel);
    }

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
      tempEl.classList.remove("temp-cold", "temp-warm");
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

    renderLifeIndex();
    updateFavoriteStars();
  }

  async function fetchForecast(lat, lon) {
    const url = `${FORECAST_API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`예보 HTTP 에러: ${response.status}`);

    const data = await response.json();
    const list = data.list || [];

    const dailyMap = {};
    const now = new Date();
    const todayKey = getLocalDateKey(now);

    const points = [];

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
        todayPop = Math.max(...pops);
      }
    }
    renderTodayExtras();
    renderLifeIndex();

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
    renderLifeIndex();
  }

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
      tempEl.classList.remove("temp-cold", "temp-warm");
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
      renderLifeIndex();
      updateFavoriteStars();
    }
  }

  function showRecentsDropdown() {
    if (!recentsDropdown) return;
    recentsDropdown.classList.remove("hidden");
  }

  function hideRecentsDropdown() {
    if (!recentsDropdown) return;
    recentsDropdown.classList.add("hidden");
  }

  async function getWeather(city) {
    hideRecentsDropdown();

    if (!city) {
      tempEl.textContent = "";
      tempEl.classList.remove("temp-cold", "temp-warm");
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
      renderLifeIndex();
      updateFavoriteStars();
      return;
    }

    try {
      const location = await getCoordinates(city);
      const { lat, lon } = location;

      lastLocationEn = location.name || null;
      lastLocationKo =
        (location.local_names && location.local_names.ko) || null;

      await getWeatherByCoords(lat, lon);

      if (cityInput) {
        if (lastLocationKo) cityInput.value = lastLocationKo;
        else if (lastLocationEn) cityInput.value = lastLocationEn;
        else cityInput.value = city;
      }

      updateFavoriteStars();
      saveState();
    } catch (error) {
      handleError(error);
      currentTempC = null;
      tempEl.textContent = "";
      tempEl.classList.remove("temp-cold", "temp-warm");
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
      renderLifeIndex();
      updateFavoriteStars();
    }
  }

  async function restoreFromStorage() {
    const saved = loadState();

    if (saved && saved.theme) {
      applyTheme(saved.theme);
    } else {
      applyTheme("light");
    }

    if (saved) {
      favorites = Array.isArray(saved.favorites) ? saved.favorites : [];
      recents = Array.isArray(saved.recents) ? saved.recents : [];
      recents = recents
        .map((label) =>
          typeof label === "string" ? label.split(",")[0].trim() : ""
        )
        .filter(Boolean);

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

      updateFavoriteStars();
    } else {
      favorites = [];
      recents = [];
      renderFavorites();
      renderRecents();
      updateFavoriteStars();
    }
  }

  function toggleCurrentFavorite() {
    const label = getCurrentFavoriteLabel();
    if (!label) {
      descEl.textContent = "먼저 위치를 조회한 뒤 즐겨찾기로 등록할 수 있습니다.";
      return;
    }

    const index = favorites.findIndex((f) => f.label === label);
    if (index !== -1) {
      favorites.splice(index, 1);
    } else {
      const newFav = {
        label,
        ko: lastLocationKo,
        en: lastLocationEn,
      };
      favorites = [newFav, ...favorites];
      if (favorites.length > 5) {
        favorites = favorites.slice(0, 5);
      }
    }

    renderFavorites();
    updateFavoriteStars();
    saveState();
  }

  function resetToInitialView() {
    if (cityInput) cityInput.value = "";

    weatherInfoEl.classList.add("hidden");
    hourlySectionEl.classList.add("hidden");
    forecastSectionEl.classList.add("hidden");

    currentLabelEl.textContent = "오늘";
    currentDateEl.textContent = "";
    currentLocationEl.textContent = "";
    tempEl.textContent = "";
    tempEl.classList.remove("temp-cold", "temp-warm");
    descEl.textContent = "";

    currentIconEl.src = "";
    currentIconEl.alt = "";
    currentIconEl.classList.add("hidden");

    todayRangeEl.textContent = "";
    todayPopEl.textContent = "";
    feelsLikeEl.textContent = "";
    feelsLikeEl.classList.remove("temp-cold", "temp-warm");
    humidityEl.textContent = "";
    sunInfoEl.textContent = "";
    if (lifeIndexEl) lifeIndexEl.textContent = "";

    currentTempC = null;
    currentFeelsLikeC = null;
    currentHumidity = null;
    todayHighC = todayLowC = todayPop = null;
    sunInfoText = "";

    hourlyForecast = [];
    hourlyListEl.innerHTML = "";
    currentForecast = [];
    forecastListEl.innerHTML = "";

    updateFavoriteStars();
  }

  function setupEventListeners() {
    searchBtn.addEventListener("click", () => {
      const city = cityInput.value.trim();
      getWeather(city);
    });

    cityInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const city = cityInput.value.trim();
        getWeather(city);
      }
    });

    cityInput.addEventListener("input", () => {
      updateFavoriteStars();
    });

    cityInput.addEventListener("focus", () => {
      if (recentsHideTimeout) {
        clearTimeout(recentsHideTimeout);
        recentsHideTimeout = null;
      }
      showRecentsDropdown();
    });

    cityInput.addEventListener("blur", () => {
      recentsHideTimeout = setTimeout(() => {
        hideRecentsDropdown();
      }, 150);
    });

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

          (async () => {
            try {
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

              if (cityInput) {
                if (lastLocationKo) cityInput.value = lastLocationKo;
                else if (lastLocationEn) cityInput.value = lastLocationEn;
                else cityInput.value = "";
              }

              updateFavoriteStars();
              saveState();
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
        renderLifeIndex();
        saveState();
      });
    });

    themeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextTheme = btn.dataset.theme;
        applyTheme(nextTheme);
        saveState();
      });
    });

    if (addFavoriteBtn) {
      addFavoriteBtn.addEventListener("click", () => {
        toggleCurrentFavorite();
      });
    }

    if (titleEl) {
      titleEl.addEventListener("click", () => {
        resetToInitialView();
      });
    }
  }

  setupEventListeners();
  restoreFromStorage();
});
