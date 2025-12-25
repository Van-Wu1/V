// --- Logic: Dark Mode & Language ---
const html = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');
const langToggle = document.getElementById('lang-toggle');

// Theme Toggle
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        html.classList.toggle('dark');
    });
}

// Lang Toggle
if (langToggle) {
    langToggle.addEventListener('click', () => {
        html.classList.toggle('lang-cn');
    });
}

// --- Logic: Custom Cursor ---
const cursor = document.getElementById('cursor');
const hoverTriggers = document.querySelectorAll('.hover-trigger');

if (cursor) {
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });
}

// Add hover effect to all hover-trigger elements
hoverTriggers.forEach(trigger => {
    trigger.addEventListener('mouseenter', () => {
        if (cursor) cursor.classList.add('cursor-hover');
    });
    trigger.addEventListener('mouseleave', () => {
        if (cursor) cursor.classList.remove('cursor-hover');
    });
});

// --- Logic: Scroll Reveal ---
const observerOptions = { 
    threshold: 0.1, 
    rootMargin: "0px 0px -50px 0px" 
};
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
    });
}, observerOptions);

document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));

// --- Logic: Tilt Effect ---
const tiltCards = document.querySelectorAll('.tilt-card');
tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -3;
        const rotateY = ((x - centerX) / centerX) * 3;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
});

// --- Logic: Parallax Effect ---
const heroTitle = document.getElementById('hero-title');
if (heroTitle) {
    window.addEventListener('scroll', () => {
        heroTitle.style.transform = `translateY(${window.scrollY * 0.15}px)`;
    });
}

// --- Logic: Audio Player ---
const playButton = document.querySelector('.hover-trigger.w-12.h-12');
if (playButton) {
    let isPlaying = false;
    const progressBar = document.querySelector('.absolute.left-0.top-1/2');
    const timeDisplay = document.querySelector('.font-mono.text-xs.text-neutral-400');
    
    playButton.addEventListener('click', () => {
        isPlaying = !isPlaying;
        const playIcon = playButton.querySelector('.iconify');
        
        if (isPlaying) {
            playIcon.setAttribute('data-icon', 'lucide:pause');
            // Simulate progress
            let progress = 0;
            const interval = setInterval(() => {
                if (progress >= 100) {
                    clearInterval(interval);
                    isPlaying = false;
                    playIcon.setAttribute('data-icon', 'lucide:play');
                    progressBar.style.width = '0%';
                    timeDisplay.textContent = '00:00';
                    return;
                }
                progress += 0.5;
                progressBar.style.width = `${progress}%`;
                
                // Update time display (simulated)
                const totalSeconds = 84; // 1:24 in seconds
                const currentSeconds = Math.floor(totalSeconds * (progress / 100));
                const minutes = Math.floor(currentSeconds / 60);
                const seconds = currentSeconds % 60;
                timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }, 100);
            
            // Store interval ID to clear if needed
            playButton.dataset.intervalId = interval;
        } else {
            playIcon.setAttribute('data-icon', 'lucide:play');
            if (playButton.dataset.intervalId) {
                clearInterval(parseInt(playButton.dataset.intervalId));
            }
        }
    });
}

// --- Initialize on DOM Load ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Portfolio initialized');
});