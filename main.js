/* global AFRAME, THREE */

/**
 * 1. LocationService (GPS 위치 관리자)
 * 사용자의 현재 GPS 좌표를 가져오고, 'gps-updated' 이벤트를 발생시킵니다.
 */
AFRAME.registerComponent("location-service", {
  init: function () {
    this.hasLocation = false;
    this.watchId = null;

    console.log("LocationService: Initializing...");

    // navigator.geolocation.watchPosition을 사용하여 실시간 위치 추적
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };

        if (!this.hasLocation) {
          this.hasLocation = true;
          // 로딩 텍스트 숨기기
          const loadingText = document.getElementById("loadingText");
          if (loadingText) loadingText.setAttribute("visible", false);
          console.log("LocationService: GPS Signal Acquired!");
        }

        // 위치 정보가 업데이트될 때마다 이벤트 발생
        this.el.emit("gps-updated", { coords: coords }, false);
      },
      (err) => {
        console.error("LocationService Error:", err.message);
        const loadingText = document.getElementById("loadingText");
        if (loadingText)
          loadingText.setAttribute("value", `Error: ${err.message}`);
      },
      {
        enableHighAccuracy: true, // 높은 정확도
        timeout: 20000, // 20초 타임아웃
        maximumAge: 1000, // 1초 캐시
      }
    );
  },
  remove: function () {
    // 컴포넌트 제거 시 위치 추적 중지
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
    }
  },
});

/**
 * 2. MerchantManager (가맹점 데이터 및 근접 확인)
 * 'gps-updated' 이벤트를 수신하여 가짜 가맹점과의 거리를 계산합니다.
 */
AFRAME.registerComponent("merchant-manager", {
  schema: {
    proximityThreshold: { type: "number", default: 200 }, // '근처'로 판단할 거리 (미터)
  },
  init: function () {
    this.isUserNearby = false;

    // --- 시뮬레이션: 실제로는 백엔드 API로 이 목록을 가져와야 합니다. ---
    // 가짜 가맹점 위치 (서울역)
    this.fakeMerchant = {
      id: "store_01",
      name: "Fake Toss Merchant (Seoul Station)",
      lat: 37.5547, // 서울역 위도
      lon: 126.9704, // 서울역 경도
    };
    // -----------------------------------------------------------------

    console.log(`MerchantManager: Watching for location near ${this.fakeMerchant.name}`);

    // 'location-service'가 발생시킨 'gps-updated' 이벤트를 수신
    this.el.sceneEl.addEventListener("gps-updated", (event) => {
      const userCoords = event.detail.coords;
      const distance = this.calculateDistance(
        userCoords.lat,
        userCoords.lon,
        this.fakeMerchant.lat,
        this.fakeMerchant.lon
      );

      // console.log(`Distance to merchant: ${distance.toFixed(2)} meters`);

      if (distance <= this.data.proximityThreshold) {
        if (!this.isUserNearby) {
          // '근처' 상태가 됨
          this.isUserNearby = true;
          console.log("MerchantManager: User is NEAR merchant!");
          // 'ar-spawn-manager'가 들을 수 있도록 이벤트 발생
          this.el.emit("user-near-merchant", null, false);
        }
      } else {
        if (this.isUserNearby) {
          // '근처' 상태에서 벗어남
          this.isUserNearby = false;
          console.log("MerchantManager: User left merchant area.");
          // 'ar-spawn-manager'가 들을 수 있도록 이벤트 발생
          this.el.emit("user-far-merchant", null, false);
        }
      }
    });
  },

  // Haversine 공식을 사용한 거리 계산 (미터 단위)
  calculateDistance: function (lat1, lon1, lat2, lon2) {
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
  },
});

/**
 * 3. ARSpawnManager (AR 객체 생성기)
 * 가맹점 근처에 있을 때 3D 포인트 객체를 생성/제거합니다.
 */
AFRAME.registerComponent("ar-spawn-manager", {
  schema: {
    maxPoints: { type: "number", default: 5 }, // 최대 포인트 수
    spawnRadius: { type: "number", default: 10 }, // 스폰 반경 (미터)
  },
  init: function () {
    this.spawnedPoints = [];

    // 'user-near-merchant' 이벤트 수신
    this.el.addEventListener("user-near-merchant", () => {
      console.log("ARSpawnManager: Spawning points...");
      this.spawnPoints();
    });

    // 'user-far-merchant' 이벤트 수신
    this.el.addEventListener("user-far-merchant", () => {
      console.log("ARSpawnManager: Clearing points...");
      this.clearPoints();
    });
  },

  spawnPoints: function () {
    this.clearPoints(); // 기존 포인트 정리
    const scene = this.el.sceneEl;

    for (let i = 0; i < this.data.maxPoints; i++) {
      // 사용자 주변 랜덤한 위치에 생성
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * this.data.spawnRadius + 5; // 5m ~ 15m
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const y = Math.random() * 2 + 1; // 1m ~ 3m 높이

      const point = document.createElement("a-entity");
      point.setAttribute("toss-point", ""); // 포인트 컴포넌트
      point.setAttribute("class", "clickable"); // 터치 감지를 위한 클래스
      
      // gps-projected-entity-place: 이 컴포넌트가 GPS 좌표를 3D 공간에 매핑
      point.setAttribute("gps-projected-entity-place", {
        latitude: 0, // 0,0을 기준으로 상대 위치(x,z)를 사용
        longitude: 0,
      });
      point.object3D.position.set(x, y, z); // AR.js의 projected position 사용

      scene.appendChild(point);
      this.spawnedPoints.push(point);
    }
  },

  clearPoints: function () {
    this.spawnedPoints.forEach((point) => point.parentNode?.removeChild(point));
    this.spawnedPoints = [];
  },
});

/**
 * 4. TossPoint (3D 포인트 정의)
 * 3D 모델(간단한 도넛)과 애니메이션을 정의합니다.
 */
AFRAME.registerComponent("toss-point", {
  init: function () {
    // 3D 모델 (간단한 파란색 도넛으로 대체)
    this.el.setAttribute("geometry", {
      primitive: "torus",
      radius: 0.5,
      radiusTubular: 0.1,
    });
    this.el.setAttribute("material", {
      color: "#0075FF", // 토스 블루
      shader: "standard",
    });

    // 회전 애니메이션
    this.el.setAttribute("animation", {
      property: "rotation",
      to: "0 360 0",
      loop: true,
      dur: 3000,
      easing: "linear",
    });

    // 'look-at' 컴포넌트를 사용하여 항상 사용자를 바라보게 함
    this.el.setAttribute("look-at", "[gps-projected-camera]");
  },
});

/**
 * 5. InteractionManager (터치 및 수집)
 * '.clickable' 클래스를 가진 엔티티를 터치(클릭)하는 것을 감지합니다.
 */
AFRAME.registerComponent("interaction-manager", {
  init: function () {
    this.sceneEl = this.el.sceneEl;
    this.cameraEl = this.sceneEl.camera.el;
    
    // AR.js는 커서(raycaster)를 자동으로 추가하지 않으므로, 직접 추가
    this.cameraEl.setAttribute("cursor", "rayOrigin: mouse; fuse: false;");
    this.cameraEl.setAttribute("raycaster", "objects: .clickable;");

    console.log("InteractionManager: Ready to collect points.");
    
    // 레이캐스터가 '.clickable' 엔티티와 교차(클릭)했을 때 이벤트 수신
    this.cameraEl.addEventListener("click", (evt) => {
        // AR.js 에서는 intersectedEl을 직접 참조하기 어려울 수 있으므로
        // raycaster의 'intersectedEls'를 확인
        const intersectedEl = this.cameraEl.components.raycaster?.intersectedEls[0];
        
        if (intersectedEl && intersectedEl.classList.contains("clickable")) {
            this.collectPoint(intersectedEl);
        }
    });
  },

  collectPoint: function (pointEl) {
    console.log("InteractionManager: Point Collected!");

    // (선택) 수집 애니메이션
    pointEl.setAttribute("animation", {
      property: "scale",
      to: "0 0 0",
      dur: 300,
      easing: "easeInQuad",
    });

    // 0.3초 뒤에 엔티티 제거
    setTimeout(() => {
      pointEl.parentNode.removeChild(pointEl);
    }, 300);

    // 'toss-integration'이 들을 수 있도록 이벤트 발생
    this.el.emit("point-collected", { points: 10 }, false);
  },
});

/**
 * 6. TossIntegration (토스 SDK 연동 시뮬레이션)
 * 'point-collected' 이벤트를 수신하여 "우리 백엔드 서버"를 호출합니다.
 */
AFRAME.registerComponent("toss-integration", {
  init: function () {
    // --- 시뮬레이션: 실제로는 백엔드 서버 주소를 사용 ---
    this.collectionApiUrl = "https://your-backend-server.com/api/collect-point";
    this.tossUserId = "SIMULATED_USER_ID_456"; // 실제로는 SDK에서 받아옴
    // ----------------------------------------------------

    // 'point-collected' 이벤트 수신
    this.el.addEventListener("point-collected", (event) => {
      const points = event.detail.points;
      console.log(`TossIntegration: Notifying server of ${points} points collected...`);
      
      // (시뮬레이션) fetch API를 사용하여 우리 백엔드 서버에 알림
      this.notifyServer(points);
    });
  },

  notifyServer: function (points) {
    // fetch는 시뮬레이션이므로, 실제로는 존재하지 않는 URL이라 실패(catch)합니다.
    // 하지만 이 코드가 "실행 시도"된다는 것이 중요합니다.
    
    fetch(this.collectionApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // "Authorization": "Bearer " + tossSdkAuthToken // 실제 인증 토큰
      },
      body: JSON.stringify({
        userId: this.tossUserId,
        pointsCollected: points,
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Server responded ${response.status}`);
        return response.json();
      })
      .then((data) => {
        console.log("TossIntegration: Server notified successfully!", data);
        // (성공 시) "10 포인트 적립 완료!" 같은 UI 표시
      })
      .catch((error) => {
        console.warn(
          `TossIntegration: Server notification simulation (failed as expected): ${error.message}`
        );
        // (실패 시) "포인트 적립에 실패했습니다." UI 표시
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

	
