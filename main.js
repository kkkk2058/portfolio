'use strict';

//Make navbar transparent when it is on the top
const navbar= document.querySelector('#navbar');
const navbarHeight= navbar.getBoundingClientRect().height;
document.addEventListener('scroll', () => {
	
	if(window.scrollY > navbarHeight){
		navbar.classList.add('navbar--dark')
	}else{
		navbar.classList.remove('navbar--dark')
	}
});


//Handing scrolling when tapping in the navbar menu.

const navbarMenu = document.querySelector('.navbar__menu');
navbarMenu.addEventListener('click', (event) => {
  const target = event.target;
  const link = target.dataset.link;
  if (link == null) {
    return;
  }
  navbarMenu.classList.remove('open');
  scrollIntoView(link);
	
});


//Handle click on 'contact me' button on home
const homeContactBtn = document.querySelector('.home__contact');
homeContactBtn.addEventListener('click', () =>{
	scrollIntoView('#contact');
	
});

//Navbar toogle button for small screen
const navbarToggleBtn = document.querySelector('.navbar__toggle-btn');
 navbarToggleBtn.addEventListener('click', () =>{
	navbarMenu.classList.toggle('open');
	
});




//Make home slowly fade to transparent as the wondow window scrolls down
const home= document.querySelector('.home__container');
const homeHeight= home.getBoundingClientRect().height;
document.addEventListener('scroll', () => {
	home.style.opacity=1- window.scrollY/ homeHeight;
});



//Show arrow up botton when scrolling down
document.addEventListener('scroll', () => {
const arrowUp = document.querySelector('.arrow-up');
	if(window.scrollY > navbarHeight/2){
		arrowUp.classList.add('visible')
	}else{
		arrowUp.classList.remove('visible')
	}
});

//raise up to home when click arrow up botton
//Handle click on the arrow up botton
const arrowUpBtn = document.querySelector('.arrow-up');
arrowUpBtn.addEventListener('click', () =>{
	scrollIntoView('#home');
	
});

//Display(show) content when clicking on menu

const workBtnContainer= document.querySelector('.work_categories');
const projectContainer= document.querySelector('.work_projects');
const projects = document.querySelectorAll('.project');
workBtnContainer.addEventListener('click', (e) => {
  	const filter = e.target.dataset.filter || e.target.parentNode.dataset.filter;
	if (filter==null){
		return;
	}
	
//Remove selection from the previous item and select the new one

	const active= document.querySelector('.categorie__btn.selected');
	active.classList.remove('selected');
	const target = e.target.Nodename ==='BUTTON' ? e.target : e.target.parantNode;
	e.target.classList.add('selected');
	
	
	
	
	projectContainer.classList.add('anim-out');
	
	setTimeout(()  =>{
		
		projects.forEach( (project) => {
			if(filter === '*' || filter === project.dataset.type ){
			project.classList.remove('invisible');
			}else{
				project.classList.add('invisible');
			}
		});
		projectContainer.classList.remove('anim-out');
	}, 300);
});




		

	const sectionIds = ['#home','#about','#skills','#work','#testimonials','#contact'];
	const sections = sectionIds.map(id => document.querySelector(id));
	const navItems = sectionIds.map(id => document.querySelector(`[data-link="${id}"]`));
	
	
	let selectedNavIndex=0;
	let selectedNavItem=navItems[0];
	
	function selectNavItem(selected){
				selectedNavItem.classList.remove('active');
				selectedNavItem =selected;
				selectedNavItem.classList.add('active');
	}
	


	function scrollIntoView(selector) {
	const scrollTo = document.querySelector(selector);
	scrollTo.scrollIntoView({ behavior: 'smooth' });
	selectNavItem(navItems[sectionIds.indexOf(selector)]);
		
}
		



	const observerOption={
	root:null,
	rootMargin:'0px',
	threshold:0.3,
};




		const observerCallback =(entries, observer) => {
			 entries.forEach(entry => {
			if(!entry.isIntersecting && entry.intersectionRatio>0){
				const index=sectionIds.indexOf(`#${entry.target.id}`)

				if(entry.boundingClientRect.y<0){
					selectedNavIndex=index+1;
				}
				else{
					selectedNavIndex=index-1;
				}
			}
				

			});
		};


		

		const observer = new IntersectionObserver(observerCallback,observerOption);
		
		sections.forEach(section => observer.observe(section));
		

	
		window.addEventListener('wheel', () => {
  if (window.scrollY === 0) {
    selectedNavIndex = 0;
  } else if (
    window.scrollY + window.innerHeight ===
    document.body.clientHeight
  ) {
    selectedNavIndex = navItems.length - 1;
  }
  selectNavItem(navItems[selectedNavIndex]);
});

	
