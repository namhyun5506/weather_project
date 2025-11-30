// DOM이 모두 만들어진 다음에 실행되도록 감싸기
document.addEventListener("DOMContentLoaded", () => {
  // OpenWeatherMap 설정 (예제용, 실제 사용 시 본인 키 필요)
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
  const currentDateEl = document.getElementById("currentDate");
  const currentLabelEl = document.getElementById("currentLabel");
  const currentLocationEl = document.getElementById("currentLocation");
  const weatherInfoEl = document.getElementById("weatherInfo");
  const forecastSectionEl = document.getElementById("forecastSection");

  // 현재 온도(섭씨 기준)와 선택된 단위 상태 + 예보 데이터
  let currentTempC = null;      // 현재 날씨 온도 (°C)
  let currentUnit = "C";        // "C" 또는 "F"
  let currentForecast = [];     // 3일 예보 [{ label, tempC, description }, ...]

  // 요일 이름 (공용)
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  /**
   * 오류 처리 함수
   * 요구사항: 오류 발생 시 콘솔에 출력
   */
  function handleError(error) {
    console.error("Weather API Error:", error);
  }

  /**
   * 섭씨 -> 화씨 변환
   */
  function toFahrenheit(celsius) {
    return celsius * (9 / 5) + 32;
  }

  /**
   * 현재 온도 렌더링
   */
  function renderTemperature() {
    if (currentTempC === null) {
      tempEl.textContent = "";
      return;
    }

    if (currentUnit === "C") {
      tempEl.textContent = `${Math.round(currentTempC)}°C`;
    } else {
      const tempF = toFahrenheit(currentTempC);
      tempEl.textContent = `${Math.round(tempF)}°F`;
    }
  }

  /**
   * 날짜 포맷: "MM/DD(요일)" 형태
   */
  function formatDateLabel(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayName = dayNames[date.getDay()];
    return `${month}/${day}(${dayName})`;
  }

  /**
   * 현재 날씨용 날짜/시간 포맷
   * 예: "12/1(월) 14:30"
   */
  function formatDateTime(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayName = dayNames[date.getDay()];
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${month}/${day}(${dayName}) ${hours}:${minutes}`;
  }

  /**
   * 3일 단기 예보 렌더링
   * 반복문 활용해서 카드 생성
   */
  function renderForecast() {
    forecastListEl.innerHTML = "";

    if (!currentForecast.length) return;

    for (let i = 0; i < currentForecast.length; i++) {
      const item = currentForecast[i];
      const card = document.createElement("article");
      card.className = "forecast-card";

      let displayTemp;
      if (currentUnit === "C") {
        displayTemp = `${Math.round(item.tempC)}°C`;
      } else {
        displayTemp = `${Math.round(toFahrenheit(item.tempC))}°F`;
      }

      card.innerHTML = `
        <div class="forecast-date">${item.label}</div>
        <div class="forecast-temp">${displayTemp}</div>
        <div class="forecast-desc">${item.description || "-"}</div>
      `;

      forecastListEl.appendChild(card);
    }
  }

  /**
   * 지오코딩: 도시명을 위도/경도로 변환 (한글/영어 모두 가능)
   * @param {string} city - 검색 도시명
   * @returns {Promise<{lat:number, lon:number, name:string, country:string}>}
   */
  async function getCoordinates(city) {
    const url = `${GEO_API_URL}?q=${encodeURIComponent(
      city
    )}&limit=1&appid=${API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`지오코딩 HTTP 에러: ${res.status}`);
    }

    const data = await res.json();
    if (!data.length) {
      throw new Error("해당 도시를 찾을 수 없습니다.");
    }

    return data[0]; // { lat, lon, name, country, ... }
  }

  /**
   * 위도/경도로 현재 날씨 가져오기
   */
  async function fetchCurrentWeather(lat, lon) {
    const url = `${CURRENT_API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`현재 날씨 HTTP 에러: ${response.status}`);
    }

    const data = await response.json();

    const temperature = data.main?.temp;
    const description = data.weather?.[0]?.description;

    // 날짜/시간 표시 (도시 현지 시간 기준)
    if (typeof data.dt === "number" && typeof data.timezone === "number") {
      const localMs = (data.dt + data.timezone) * 1000;
      const localDate = new Date(localMs);

      if (currentDateEl) {
        currentDateEl.textContent = formatDateTime(localDate);
      }
    } else if (currentDateEl) {
      currentDateEl.textContent = "";
    }

    // 위치 표시: 도시 이름 + 국가 코드
    if (currentLocationEl) {
      const cityName = data.name;
      const country = data.sys?.country;
      let locText = "";
      if (cityName) locText = cityName;
      if (country) locText = locText ? `${locText}, ${country}` : country;
      currentLocationEl.textContent = locText || "";
    }

    // "오늘" 라벨은 고정
    if (currentLabelEl) {
      currentLabelEl.textContent = "오늘";
    }

    if (typeof temperature === "number") {
      currentTempC = temperature;
      renderTemperature();
    } else {
      currentTempC = null;
      tempEl.textContent = "";
    }

    if (description) {
      descEl.textContent = description;
    } else {
      descEl.textContent = "날씨 정보를 불러올 수 없습니다.";
    }
  }

  /**
   * 위도/경도로 3일 단기 예보 가져오기
   * OpenWeatherMap 5일/3시간 간격 예보(/forecast)에서 3일치만 추출
   */
  async function fetchForecast(lat, lon) {
    const url = `${FORECAST_API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`예보 HTTP 에러: ${response.status}`);
    }

    const data = await response.json();
    const list = data.list || [];
    const dailyMap = {};
    const dailyItems = [];

    const todayKey = new Date().toISOString().substring(0, 10); // 오늘 날짜 "YYYY-MM-DD"

    // 날짜별로 하나씩만 뽑기 (보통 3시간 간격 데이터 여러 개)
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const dt = new Date(item.dt * 1000);
      const dateKey = dt.toISOString().substring(0, 10); // "YYYY-MM-DD"

      // 과거 데이터는 건너뛰기
      if (dateKey < todayKey) continue;

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = item;
        dailyItems.push(item);
      }

      if (dailyItems.length >= 3) break; // 3일치만 사용
    }

    currentForecast = dailyItems.map((item) => {
      const dt = new Date(item.dt * 1000);
      const tempC = item.main?.temp ?? 0;
      const description = item.weather?.[0]?.description ?? "";
      return {
        label: formatDateLabel(dt),
        tempC,
        description,
      };
    });

    renderForecast();
  }

  /**
   * 위도/경도로 현재 날씨 + 3일 예보 모두 가져오기
   */
  async function getWeatherByCoords(lat, lon) {
    try {
      await Promise.all([
        fetchCurrentWeather(lat, lon),
        fetchForecast(lat, lon),
      ]);

      // 데이터 가져오기에 성공하면 섹션 보이게 (초기 화면 → 결과 화면)
      if (weatherInfoEl) weatherInfoEl.classList.remove("hidden");
      if (forecastSectionEl) forecastSectionEl.classList.remove("hidden");
    } catch (error) {
      handleError(error);
      currentTempC = null;
      tempEl.textContent = "";
      descEl.textContent = "현재 위치의 날씨를 가져오지 못했습니다.";
      currentForecast = [];
      forecastListEl.innerHTML = "";
      if (currentDateEl) currentDateEl.textContent = "";
      if (currentLocationEl) currentLocationEl.textContent = "";
    }
  }

  /**
   * 요구사항에 맞춘 getWeather(city):
   * - 도시명을 받아서 지오코딩 후
   * - 현재 날씨 + 3일 예보를 모두 가져옴
   */
  async function getWeather(city) {
    if (!city) {
      tempEl.textContent = "";
      descEl.textContent = "도시명을 입력해주세요.";
      currentTempC = null;
      currentForecast = [];
      forecastListEl.innerHTML = "";
      if (currentDateEl) currentDateEl.textContent = "";
      if (currentLocationEl) currentLocationEl.textContent = "";
      return;
    }

    try {
      // 1) 도시명을 위도/경도로 변환 (한글/영어 모두 OK)
      const location = await getCoordinates(city);
      const { lat, lon } = location;

      // 2) 현재 날씨 + 3일 예보를 병렬로 가져오기
      await getWeatherByCoords(lat, lon);
    } catch (error) {
      handleError(error);
      currentTempC = null;
      tempEl.textContent = "";
      descEl.textContent = "해당 도시의 날씨를 찾을 수 없습니다.";
      currentForecast = [];
      forecastListEl.innerHTML = "";
      if (currentDateEl) currentDateEl.textContent = "";
      if (currentLocationEl) currentLocationEl.textContent = "";
    }
  }

  /**
   * 이벤트 연결
   */
  function setupEventListeners() {
    // 버튼 클릭 시 getWeather() 호출 (요구사항)
    if (searchBtn) {
      searchBtn.addEventListener("click", () => {
        const city = cityInput.value.trim();
        getWeather(city);
      });
    }

    // Enter 키로도 검색
    if (cityInput) {
      cityInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          const city = cityInput.value.trim();
          getWeather(city);
        }
      });
    }

    // 현재 위치 버튼 (Geolocation API)
    if (geoBtn) {
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
    }

    // 단위 전환 버튼 (°C, °F)
    unitButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const selectedUnit = btn.dataset.unit; // "C" 또는 "F"

        if (currentUnit === selectedUnit) return;

        currentUnit = selectedUnit;

        // active 클래스 토글
        unitButtons.forEach((b) => {
          b.classList.toggle("active", b.dataset.unit === currentUnit);
        });

        // 현재 저장된 온도/예보 다시 렌더링
        renderTemperature();
        renderForecast();
      });
    });
  }

  // 초기화
  setupEventListeners();
});
