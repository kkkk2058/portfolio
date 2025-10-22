/* global AFRAME, THREE */

/**
 * 1. LocationService (GPS 위치 관리자) - [ 수정됨 ]
 * AR.js 카메라에 시뮬레이션 좌표를 직접 주입하도록 수정되었습니다.
 */
AFRAME.registerComponent("location-service", {
  init: function () {
    this.hasLocation = false;
    this.watchId = null;
    this.simulationActive = false;
    console.log("LocationService: Trying to get real GPS signal...");

    // --- 시뮬레이션을 위한 가짜 사용자 위치 ---
    // (테스트를 위해 '목표 주소'와 동일하게 설정)
    this.simulationCoords = {
      lat: 37.4728, // [임시] 금하로24나길 48 근처 좌표
      lon: 126.9080, // [임시] 금하로24나길 48 근처 좌표
    };
    // ------------------------------------

    const simulationTimeout = setTimeout(() => {
      if (!this.hasLocation) {
        console.warn(
          "LocationService: Real GPS timeout. Activating SIMULATION MODE."
        );
        this.simulationActive = true;
        this.useSimulationData(); // 시뮬레이션 모드 시작
      }
    }, 10000);

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (this.simulationActive) return;
        clearTimeout(simulationTimeout);
        this.hasLocation = true;

        const coords = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };

        const loadingText = document.getElementById("loadingText");
        if (loadingText) loadingText.setAttribute("visible", false);
        console.log("LocationService: Real GPS Signal Acquired!");

        this.el.emit("gps-updated", { coords: coords }, false);
      },
      (err) => {
        if (this.simulationActive) return;
        console.error("LocationService Error (as seen in screenshot):", err.message);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  },

  // 2. 시뮬레이션 데이터 사용
  useSimulationData: function () {
    this.hasLocation = true;
    const sceneEl = this.el.sceneEl;
    const cameraEl = sceneEl.camera.el; // 씬의 카메라를 찾습니다.

    const loadingText = document.getElementById("loadingText");
    if (loadingText) {
      loadingText.setAttribute("value", "SIMULATION MODE ACTIVE");
      loadingText.setAttribute("color", "#FFD700");
    }

    const fakeCoords = this.simulationCoords;
    console.log(
      `LocationService: Emitting FAKE location: ${fakeCoords.lat}, ${fakeCoords.lon}`
    );

    // ================== [ !! 핵심 수정 !! ] ==================
    // AR.js의 'gps-projected-camera' 컴포넌트에 시뮬레이션 좌표를 강제로 설정합니다.
    // 이것이 'undefined' 오류를 해결합니다.
    console.log("Setting AR.js simulation coordinates...");
    cameraEl.setAttribute("gps-projected-camera", {
      simulateLatitude: fakeCoords.lat,
      simulateLongitude: fakeCoords.lon,
    });
    // ========================================================

    // 3초마다 'location-checker'가 사용할 커스텀 이벤트를 전송합니다.
    setInterval(() => {
      this.el.emit("gps-updated", { coords: fakeCoords }, false);
    }, 3000);
  },

  remove: function () {
    if (this.watchId) navigator.geolocation.clearWatch(this.watchId);
  },
});

/**
 * 2. LocationChecker (특정 주소 근접 확인)
 * (이전 코드와 동일)
 */
AFRAME.registerComponent("location-checker", {
  schema: {
    proximityThreshold: { type: "number", default: 100 }, // 100미터 반경
  },
  init: function () {
    this.isUserNearby = false;

    // '금하로24나길 48' (서울 금천구 시흥동 1017)의 실제 좌표
    this.targetAddressLocation = {
      name: "금하로24나길 48 (목표 지점)",
      lat: 37.47281,
      lon: 126.90805,
    };

    console.log(
      `LocationChecker: Watching for location near ${this.targetAddressLocation.name} (${this.targetAddressLocation.lat}, ${this.targetAddressLocation.lon})`
    );

    this.el.sceneEl.addEventListener("gps-updated", (event) => {
      const userCoords = event.detail.coords;
      const distance = this.calculateDistance(
        userCoords.lat,
        userCoords.lon,
        this.targetAddressLocation.lat,
        this.targetAddressLocation.lon
      );

      console.log(`Distance to target: ${distance.toFixed(2)} meters`);

      if (distance <= this.data.proximityThreshold) {
        if (!this.isUserNearby) {
          this.isUserNearby = true;
          console.log("LocationChecker: User is NEAR target address!");
          this.el.emit("user-near-target", null, false);
        }
      } else {
        if (this.isUserNearby) {
          this.isUserNearby = false;
          console.log("LocationChecker: User left target area.");
          this.el.emit("user-far-target", null, false);
        }
      }
    });
  },

  calculateDistance: function (lat1, lon1, lat2, lon2) {
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
  },
});

/**
 * 3. ARSpawnManager (AR 쿠폰 생성기)
 * (이전 코드와 동일)
 */
AFRAME.registerComponent("ar-spawn-manager", {
  schema: {
    maxItems: { type: "number", default: 3 },
    spawnRadius: { type: "number", default: 10 },
  },
  init: function () {
    this.spawnedItems = [];
    this.el.addEventListener("user-near-target", () => {
      console.log("ARSpawnManager: Spawning coupons...");
      this.spawnCoupons();
    });
    this.el.addEventListener("user-far-target", () => {
      console.log("ARSpawnManager: Clearing coupons...");
      this.clearCoupons();
    });
  },
  spawnCoupons: function () {
    this.clearCoupons();
    const scene = this.el.sceneEl;
    for (let i = 0; i < this.data.maxItems; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * this.data.spawnRadius + 5;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const y = Math.random() * 2 + 1;
      const coupon = document.createElement("a-entity");
      coupon.setAttribute("toss-coupon", "");
      coupon.setAttribute("class", "clickable");
      coupon.setAttribute("gps-projected-entity-place", {
        latitude: 0,
        longitude: 0,
      });
      coupon.object3D.position.set(x, y, z);
      scene.appendChild(coupon);
      this.spawnedItems.push(coupon);
    }
  },
  clearCoupons: function () {
    this.spawnedItems.forEach((item) => item.parentNode?.removeChild(item));
    this.spawnedItems = [];
  },
});

/**
 * 4. TossCoupon (3D 쿠폰 정의)
 * (이전 코드와 동일)
 */
AFRAME.registerComponent("toss-coupon", {
  init: function () {
    this.el.setAttribute("geometry", { primitive: "plane", width: 1.5, height: 1 });
    this.el.setAttribute("material", {
      src: "#coupon-texture",
      transparent: true,
      shader: "flat",
    });
    this.el.setAttribute("animation", {
      property: "rotation",
      to: "0 360 0",
      loop: true,
      dur: 4000,
      easing: "linear",
    });
    this.el.setAttribute("look-at", "[gps-projected-camera]");
  },
});

/**
 * 5. InteractionManager (터치 및 수집)
 * (이전 코드와 동일)
 */
AFRAME.registerComponent("interaction-manager", {
  init: function () {
    this.sceneEl = this.el.sceneEl;
    this.cameraEl = this.sceneEl.camera.el;
    this.cameraEl.setAttribute("cursor", "rayOrigin: mouse; fuse: false;");
    this.cameraEl.setAttribute("raycaster", "objects: .clickable;");
    console.log("InteractionManager: Ready to collect coupons.");
    this.cameraEl.addEventListener("click", () => {
      const intersectedEl = this.cameraEl.components.raycaster?.intersectedEls[0];
      if (intersectedEl && intersectedEl.classList.contains("clickable")) {
        this.collectItem(intersectedEl);
      }
    });
  },
  collectItem: function (itemEl) {
    console.log("InteractionManager: Coupon Collected!");
    itemEl.setAttribute("animation", {
      property: "scale",
      to: "0 0 0",
      dur: 300,
      easing: "easeInQuad",
    });
    setTimeout(() => {
      itemEl.parentNode.removeChild(itemEl);
    }, 300);
    this.el.emit("coupon-collected", { couponId: "TOSS-1000" }, false);
  },
});

/**
 * 6. TossIntegration (서버 연동 시뮬레이션)
 * (이전 코드와 동일)
 */
AFRAME.registerComponent("toss-integration", {
  init: function () {
    this.collectionApiUrl = "https://your-backend-server.com/api/collect-coupon";
    this.tossUserId = "SIMULATED_USER_ID_789";
    this.el.addEventListener("coupon-collected", (event) => {
      const couponId = event.detail.couponId;
      console.log(
        `TossIntegration: Notifying server of coupon [${couponId}] collected...`
      );
      this.notifyServer(couponId);
    });
  },
  notifyServer: function (couponId) {
    fetch(this.collectionApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: this.tossUserId,
        couponId: couponId,
      }),
    })
      .then((response) => {
        if (!response.ok)
          throw new Error(`Server responded ${response.status}`);
        return response.json();
      })
      .then((data) => {
        console.log("TossIntegration: Server notified successfully!", data);
        alert("쿠폰이 발급되었습니다!");
      })
      .catch((error) => {
        console.warn(
          `TossIntegration: Server notification simulation (failed as expected): ${error.message}`
        );
        alert("쿠폰 발급 완료! (Test Mode)");
      });
  },
});

	
