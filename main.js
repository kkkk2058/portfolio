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
	scrollIntoView(link);
});


//Handle click on 'contact me' button on home
const homeContactBtn = document.querySelector('.home__contact');
homeContactBtn.addEventListener('click', () =>{
	scrollIntoView('#contact');
	
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






function scrollIntoView(selector) {
	const scrollTo = document.querySelector(selector);
	scrollTo.scrollIntoView({ behavior: 'smooth' });
}


