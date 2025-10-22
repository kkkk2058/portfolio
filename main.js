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
    name: "금하로24나길 48",
    lat: 37.47915,
    lon: 126.9059,
  };

  // 3. Geofence 반경 설정 (100미터)
  const zoneRadius = 100; // 미터

  // 4. 상태 변수 (알림이 반복해서 울리는 것을 방지)
  let isInsideZone = false;

  // 5. 시뮬레이션 모드 설정
  // (테스트를 위해 목표 지점과 동일하게 설정)
  const simulationCoords = {
    lat: targetLocation.lat,
    lon: targetLocation.lon,
  };

  console.log("LocationService: Trying to get real GPS signal...");
  statusMessage.textContent =
    "실제 GPS 신호를 10초간 수신합니다. (실패 시 시뮬레이션 모드 전환)";

  // 10초 후 시뮬레이션 모드 강제 실행 (실제 GPS가 실패할 경우)
  const simulationTimeout = setTimeout(() => {
    console.warn("LocationService: Real GPS timeout. Activating SIMULATION MODE.");
    statusTitle.textContent = "시뮬레이션 모드";
    statusTitle.style.color = "#FFD700"; // 노란색
    // 가짜 위치 정보로 'successCallback'을 직접 호출
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
    enableHighAccuracy: true, // 높은 정확도
    timeout: 5000,
    maximumAge: 0,
  });

  /**
   * (성공) 위치 정보가 업데이트될 때마다 호출됩니다.
   */
  function successCallback(pos) {
    // 실제 GPS가 성공하면, 시뮬레이션 타이머를 멈춥니다.
    clearTimeout(simulationTimeout);

    const userCoords = pos.coords;

    // (디버깅) 콘솔에 현재 위치 표시
    console.log(
      `Current Coords: ${userCoords.latitude}, ${userCoords.longitude} (Accuracy: ${userCoords.accuracy}m)`
    );

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
    // (A) 목표 반경(100m) 안에 들어왔고, *아직 알림을 받지 않았다면*
    if (distance <= zoneRadius && !isInsideZone) {
      isInsideZone = true; // (중요) 상태 변경으로 반복 알림 방지
      console.log("GEOFENCE: ENTERED ZONE");
      showAlert();
      showCoupon();
    }
    // (B) 목표 반경 밖에 있고, *이전에 안에 있었다면*
    else if (distance > zoneRadius && isInsideZone) {
      isInsideZone = false; // (중요) 상태 리셋
      console.log("GEOFENCE: EXITED ZONE");
      hideCoupon();
    }
  }

  /**
   * (실패) 위치 정보를 가져오지 못했을 때 호출됩니다.
   */
  function errorCallback(err) {
    console.error(`Geolocation Error: ${err.message}`);
    // 실제 GPS가 실패하면, 10초 후의 'simulationTimeout'이
    // 시뮬레이션 모드를 자동으로 실행할 것입니다.
    statusMessage.textContent =
      "실제 GPS 수신 실패. 시뮬레이션 모드를 대기합니다...";
  }

  // --- 헬퍼 함수 ---

  /**
   * (알림) 사용자에게 알림을 띄웁니다.
   */
  function showAlert() {
    // 실제 앱에서는 Push Notification을 사용하겠지만,
    // 프로토타입에서는 alert이 가장 확실합니다.
    alert("🏠 집 근처 도착! 쿠폰을 확인하세요!");
  }

  /**
   * (쿠폰 표시) 숨겨진 쿠폰 UI를 화면에 보여줍니다.
   */
  function showCoupon() {
    couponContainer.style.display = "block";
    statusTitle.textContent = "🎉 쿠폰 발급 완료!";
  }

  /**
   * (쿠폰 숨김) 쿠폰을 다시 숨깁니다.
   */
  function hideCoupon() {
    couponContainer.style.display = "none";
  }

  /**
   * (계산) 두 GPS 좌표 간의 거리를 미터(m) 단위로 계산합니다.
   */
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // 지구 반지름 (미터)
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
