// 페이지가 모두 로드되면 스크립트 실행
window.addEventListener("DOMContentLoaded", () => {
  initLocationService();
});

function initLocationService() {
  // 1. UI 요소 가져오기
  const statusTitle = document.getElementById("status-title");
  const statusMessage = document.getElementById("status-message");
  const couponContainer = document.getElementById("coupon-container");

  // 2. 목표 지점 설정 (금하로24나길 48)
  const targetLocation = {
    name: "금하로24나길 48 dd",
    lat: 37.4505472,
    lon: 126.9006336,
  };

  // 3. Geofence 반경 설정 (100미터)
  const zoneRadius = 100; // 미터

  // 4. 상태 변수
  let isInsideZone = false;

  // 5. 시뮬레이션 모드 설정
  const simulationCoords = {
    lat: targetLocation.lat,
    lon: targetLocation.lon,
  };

  console.log("LocationService: Trying to get real GPS signal...");
  statusMessage.textContent =
    "실제 GPS 신호를 10초간 수신합니다. (실패 또는 부정확 시 시뮬레이션 모드 전환)";

  // 10초 후 시뮬레이션 모드 강제 실행
  const simulationTimeout = setTimeout(() => {
    console.warn("LocationService: Real GPS timeout. Activating SIMULATION MODE.");
    statusTitle.textContent = "시뮬레이션 모드";
    statusTitle.style.color = "#FFD700"; // 노란색
    // 가짜 위치 정보로 'successCallback'을 직접 호출 (정확도 10m로 설정)
    successCallback({
      coords: {
        latitude: simulationCoords.lat,
        longitude: simulationCoords.lon,
        accuracy: 10,
      },
    });
  }, 10000); // 10초 타임아웃

  // 6. 실제 GPS 위치 모니터링 시작
  navigator.geolocation.watchPosition(successCallback, errorCallback, {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
  });

  /**
   * (성공) 위치 정보가 업데이트될 때마다 호출됩니다.
   */
  function successCallback(pos) {
    const userCoords = pos.coords;

    // (디버깅) 콘솔에 현재 위치 표시
    console.log(
      `Current Coords: ${userCoords.latitude}, ${userCoords.longitude} (Accuracy: ${userCoords.accuracy}m)`
    );

    // ================== [ !! 핵심 수정 !! ] ==================
    // 정확도가 150m보다 높으면(신호가 나쁘면) 이 데이터를 무시하고
    // 10초 시뮬레이션 타이머가 실행되도록 둡니다.
    if (userCoords.accuracy > 150) {
      console.warn(`Ignoring bad signal. Accuracy: ${userCoords.accuracy}m`);
      statusMessage.textContent = `GPS 신호가 너무 약합니다... (정확도 ${userCoords.accuracy.toFixed(
        0
      )}m)`;
      return; // 여기서 함수 종료
    }
    // ======================================================

    // (성공) 정확도가 150m 이내로 좋으면 시뮬레이션 타이머를 멈춥니다.
    clearTimeout(simulationTimeout);

    // 7. 목표 지점과의 거리 계산
    const distance = calculateDistance(
      userCoords.latitude,
      userCoords.longitude,
      targetLocation.lat,
      targetLocation.lon
    );

    // 8. UI 업데이트
    statusTitle.textContent = "위치 확인 완료";
    statusMessage.innerHTML = `목표 지점(${
      targetLocation.name
    })까지<br><b>${distance.toFixed(0)} 미터</b> 남았습니다.`;

    // 9. Geofence 로직
    if (distance <= zoneRadius && !isInsideZone) {
      isInsideZone = true;
      console.log("GEOFENCE: ENTERED ZONE");
      showAlert();
      showCoupon();
    } else if (distance > zoneRadius && isInsideZone) {
      isInsideZone = false;
      console.log("GEOFENCE: EXITED ZONE");
      hideCoupon();
    }
  }

  /**
   * (실패) 위치 정보를 가져오지 못했을 때 호출됩니다.
   */
  function errorCallback(err) {
    console.error(`Geolocation Error: ${err.message}`);
    // 10초 후의 'simulationTimeout'이 시뮬레이션을 자동으로 실행할 것입니다.
    statusMessage.textContent =
      "실제 GPS 수신 실패. 시뮬레이션 모드를 대기합니다...";
  }

  // --- 헬퍼 함수 ---

  function showAlert() {
    alert("🏠 집 근처 도착! 쿠폰을 확인하세요!");
  }

  function showCoupon() {
    couponContainer.style.display = "block";
    statusTitle.textContent = "🎉 쿠폰 발급 완료!";
  }

  function hideCoupon() {
    couponContainer.style.display = "none";
  }

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) *
        Math.cos(phi2) *
        Math.sin(deltaLambda / 2) *
        Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
