// OpenWeatherMap 더미 설정 (실제 사용 시 API_KEY를 발급 받아 넣어야 합니다)
const API_URL = "https://api.openweathermap.org/data/2.5/weather";
const API_KEY = "c048cc830faf9d37b921132c905c8906"; // TODO: 실제 키로 교체

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const tempEl = document.getElementById("temp");
const descEl = document.getElementById("description");
const unitButtons = document.querySelectorAll(".unit-btn");

// 현재 온도(섭씨 기준)와 선택된 단위 상태
let currentTempC = null; // 항상 °C 기준으로 저장
let currentUnit = "C";   // "C" 또는 "F"

/**
 * 오류 처리 함수
 * 요구사항: 오류 발생 시 콘솔에 출력
 */
function handleError(error) {
  console.error("Weather API Error:", error);
}

/**
 * 현재 상태(currentTempC, currentUnit)에 따라
 * 화면에 표시할 온도 텍스트를 업데이트
 */
function renderTemperature() {
  if (currentTempC === null) {
    tempEl.textContent = "";
    return;
  }

  if (currentUnit === "C") {
    tempEl.textContent = `${Math.round(currentTempC)}°C`;
  } else {
    const tempF = currentTempC * (9 / 5) + 32;
    tempEl.textContent = `${Math.round(tempF)}°F`;
  }
}

/**
 * 날씨 정보 가져오기
 * @param {string} city - 조회할 도시 이름
 */
async function getWeather(city) {
  if (!city) {
    tempEl.textContent = "";
    descEl.textContent = "도시명을 입력해주세요.";
    currentTempC = null;
    return;
  }

  try {
    // 쿼리 파라미터 구성 (metric: 섭씨)
    const url = `${API_URL}?q=${encodeURIComponent(
      city
    )}&appid=${API_KEY}&units=metric&lang=kr`;

    const response = await fetch(url);

    if (!response.ok) {
      // 4xx, 5xx 에러 처리
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // OpenWeatherMap 응답 구조 기준
    const temperature = data.main?.temp;
    const description = data.weather?.[0]?.description;

    if (typeof temperature === "number") {
      // 항상 섭씨로 저장
      currentTempC = temperature;
      renderTemperature(); // 현재 선택된 단위 기준으로 출력
    } else {
      currentTempC = null;
      tempEl.textContent = "";
    }

    if (description) {
      descEl.textContent = description;
    } else {
      descEl.textContent = "날씨 정보를 불러올 수 없습니다.";
    }
  } catch (error) {
    handleError(error);
    currentTempC = null;
    tempEl.textContent = "";
    descEl.textContent = "날씨 정보를 가져오지 못했습니다.";
  }
}

/**
 * 검색 버튼 및 Enter 키 / 단위 전환 이벤트 연결
 */
function setupEventListeners() {
  // 버튼 클릭 시 검색
  searchBtn.addEventListener("click", () => {
    const city = cityInput.value.trim();
    getWeather(city);
  });

  // 입력창에서 Enter 키를 눌렀을 때도 검색
  cityInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const city = cityInput.value.trim();
      getWeather(city);
    }
  });

  // 단위 전환 버튼(°C, °F) 클릭 시 단위 변경
  unitButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const selectedUnit = btn.dataset.unit; // "C" 또는 "F"

      if (currentUnit === selectedUnit) return; // 동일 단위면 무시

      currentUnit = selectedUnit;

      // active 클래스 토글
      unitButtons.forEach((b) => {
        b.classList.toggle("active", b.dataset.unit === currentUnit);
      });

      // 현재 저장된 온도가 있으면 단위만 재렌더링
      renderTemperature();
    });
  });
}

// 초기화
setupEventListeners();
