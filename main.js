'use strict';

//Make navbar transparent when it is on the top
const navbar= document.querySelector('#navbar');
const navbarHeight= navbar.getBoundingClientRect().height;
document.addEventListener('scroll', () => {
	/*
	console.log(window.scrollY)
	console.log(navbarHeight)
	*/
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
//navbarMenu.classList.remove('open');
//scrollIntoView(link);
//});


//Handle click on 'contact me' button on home
const homeContactBtn = document.querySelector('.home__contact');
homeContactBtn.addEventListener('click', () =>{
	scrollIntoView('#contact');
	
});


function scrollIntoView(selector) {
	const scrollTo = document.querySelector(selector);
	scrollTo.scrollIntoView({ behavior: 'smooth' });
}
