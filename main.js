/* global AFRAME, THREE */

/**
 * 1. LocationService (GPS 위치 관리자) - [ 수정됨 ]
 * 10초 이내에 실제 GPS 신호를 받지 못하면,
 * 'simulationCoords'에 설정된 가짜 위치로 시뮬레이션 모드를 시작합니다.
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

    // 10초 후 시뮬레이션 모드 강제 실행 (실제 GPS가 실패할 경우)
    const simulationTimeout = setTimeout(() => {
      if (!this.hasLocation) {
        console.warn(
          "LocationService: Real GPS timeout. Activating SIMULATION MODE."
        );
        this.simulationActive = true;
        this.useSimulationData();
      }
    }, 10000); // 10초 타임아웃

    // 1. 실제 GPS 시도
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        // 실제 GPS 성공!
        if (this.simulationActive) return; // 시뮬레이션이 이미 켜졌으면 무시

        clearTimeout(simulationTimeout); // 시뮬레이션 타임아웃 취소
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
        // 실제 GPS 오류 (스크린샷의 오류들)
        if (this.simulationActive) return; // 시뮬레이션이 켜졌으면 무시
        console.error("LocationService Error (as seen in screenshot):", err.message);
        // 타임아웃이 시뮬레이션을 처리하도록 둡니다.
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  },

  // 2. 시뮬레이션 데이터 사용
  useSimulationData: function () {
    this.hasLocation = true; // 위치 잡힘으로 처리

    const loadingText = document.getElementById("loadingText");
    if (loadingText) {
      loadingText.setAttribute("value", "SIMULATION MODE ACTIVE");
      loadingText.setAttribute("color", "#FFD700"); // 노란색으로 표시
    }

    const fakeCoords = this.simulationCoords;
    console.log(
      `LocationService: Emitting FAKE location: ${fakeCoords.lat}, ${fakeCoords.lon}`
    );

    // 3초마다 가짜 위치를 계속 전송 (watchPosition 흉내)
    setInterval(() => {
      this.el.emit("gps-updated", { coords: fakeCoords }, false);
    }, 3000);
  },

  remove: function () {
    if (this.watchId) navigator.geolocation.clearWatch(this.watchId);
  },
});

/**
 * 2. LocationChecker (특정 주소 근접 확인) - [ 수정됨 ]
 * '금하로24나길 48' (관악산 신도브래뉴)의 실제 좌표를 하드코딩합니다.
 */
AFRAME.registerComponent("location-checker", {
  schema: {
    proximityThreshold: { type: "number", default: 100 }, // 100미터 반경
  },
  init: function () {
    this.isUserNearby = false;

    // ================== [ 목표 주소 좌표 ] ==================
    // '금하로24나길 48' (서울 금천구 시흥동 1017)의 실제 좌표입니다.
    this.targetAddressLocation = {
      name: "금하로24나길 48 (목표 지점)",
      lat: 37.47915,
      lon: 126.9059,
    };
    // ======================================================

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

      // (디버깅용) 콘솔에 남은 거리 표시
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
// 'use strict';

// //Make navbar transparent when it is on the top
// const navbar= document.querySelector('#navbar');
// const navbarHeight= navbar.getBoundingClientRect().height;
// document.addEventListener('scroll', () => {
	
// 	if(window.scrollY > navbarHeight){
// 		navbar.classList.add('navbar--dark')
// 	}else{
// 		navbar.classList.remove('navbar--dark')
// 	}
// });


// //Handing scrolling when tapping in the navbar menu.

// const navbarMenu = document.querySelector('.navbar__menu');
// navbarMenu.addEventListener('click', (event) => {
//   const target = event.target;
//   const link = target.dataset.link;
//   if (link == null) {
//     return;
//   }
//   navbarMenu.classList.remove('open');
//   scrollIntoView(link);
	
// });


// //Handle click on 'contact me' button on home
// const homeContactBtn = document.querySelector('.home__contact');
// homeContactBtn.addEventListener('click', () =>{
// 	scrollIntoView('#contact');
	
// });

// //Navbar toogle button for small screen
// const navbarToggleBtn = document.querySelector('.navbar__toggle-btn');
//  navbarToggleBtn.addEventListener('click', () =>{
// 	navbarMenu.classList.toggle('open');
	
// });




// //Make home slowly fade to transparent as the wondow window scrolls down
// const home= document.querySelector('.home__container');
// const homeHeight= home.getBoundingClientRect().height;
// document.addEventListener('scroll', () => {
// 	home.style.opacity=1- window.scrollY/ homeHeight;
// });



// //Show arrow up botton when scrolling down
// document.addEventListener('scroll', () => {
// const arrowUp = document.querySelector('.arrow-up');
// 	if(window.scrollY > navbarHeight/2){
// 		arrowUp.classList.add('visible')
// 	}else{
// 		arrowUp.classList.remove('visible')
// 	}
// });

// //raise up to home when click arrow up botton
// //Handle click on the arrow up botton
// const arrowUpBtn = document.querySelector('.arrow-up');
// arrowUpBtn.addEventListener('click', () =>{
// 	scrollIntoView('#home');
	
// });

// //Display(show) content when clicking on menu

// const workBtnContainer= document.querySelector('.work_categories');
// const projectContainer= document.querySelector('.work_projects');
// const projects = document.querySelectorAll('.project');
// workBtnContainer.addEventListener('click', (e) => {
//   	const filter = e.target.dataset.filter || e.target.parentNode.dataset.filter;
// 	if (filter==null){
// 		return;
// 	}
	
// //Remove selection from the previous item and select the new one

// 	const active= document.querySelector('.categorie__btn.selected');
// 	active.classList.remove('selected');
// 	const target = e.target.Nodename ==='BUTTON' ? e.target : e.target.parantNode;
// 	e.target.classList.add('selected');
	
	
	
	
// 	projectContainer.classList.add('anim-out');
	
// 	setTimeout(()  =>{
		
// 		projects.forEach( (project) => {
// 			if(filter === '*' || filter === project.dataset.type ){
// 			project.classList.remove('invisible');
// 			}else{
// 				project.classList.add('invisible');
// 			}
// 		});
// 		projectContainer.classList.remove('anim-out');
// 	}, 300);
// });




		

// 	const sectionIds = ['#home','#about','#skills','#work','#testimonials','#contact'];
// 	const sections = sectionIds.map(id => document.querySelector(id));
// 	const navItems = sectionIds.map(id => document.querySelector(`[data-link="${id}"]`));
	
	
// 	let selectedNavIndex=0;
// 	let selectedNavItem=navItems[0];
	
// 	function selectNavItem(selected){
// 				selectedNavItem.classList.remove('active');
// 				selectedNavItem =selected;
// 				selectedNavItem.classList.add('active');
// 	}
	


// 	function scrollIntoView(selector) {
// 	const scrollTo = document.querySelector(selector);
// 	scrollTo.scrollIntoView({ behavior: 'smooth' });
// 	selectNavItem(navItems[sectionIds.indexOf(selector)]);
		
// }
		



// 	const observerOption={
// 	root:null,
// 	rootMargin:'0px',
// 	threshold:0.3,
// };




// 		const observerCallback =(entries, observer) => {
// 			 entries.forEach(entry => {
// 			if(!entry.isIntersecting && entry.intersectionRatio>0){
// 				const index=sectionIds.indexOf(`#${entry.target.id}`)

// 				if(entry.boundingClientRect.y<0){
// 					selectedNavIndex=index+1;
// 				}
// 				else{
// 					selectedNavIndex=index-1;
// 				}
// 			}
				

// 			});
// 		};


		

// 		const observer = new IntersectionObserver(observerCallback,observerOption);
		
// 		sections.forEach(section => observer.observe(section));
		

	
// 		window.addEventListener('wheel', () => {
//   if (window.scrollY === 0) {
//     selectedNavIndex = 0;
//   } else if (
//     window.scrollY + window.innerHeight ===
//     document.body.clientHeight
//   ) {
//     selectedNavIndex = navItems.length - 1;
//   }
//   selectNavItem(navItems[selectedNavIndex]);
// });

	
