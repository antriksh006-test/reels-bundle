/**
 * sharing.js - Multi-Platform Viral Sharing, Native Web Share, User Rating & Reporting
 */

const Sharing = {
  /**
   * Initializes all share triggers on the page
   */
  init(promptData) {
    if (!promptData) return;

    const pageUrl = window.location.href;
    const title = promptData.title || document.title;
    const shareText = `Check out this AI prompt: "${title}" on PromptForge!`;

    // 1. Native Web Share API
    const nativeBtn = document.getElementById('share-native-btn');
    if (nativeBtn) {
      if (navigator.share) {
        nativeBtn.addEventListener('click', async () => {
          try {
            await navigator.share({
              title: title,
              text: shareText,
              url: pageUrl
            });
            window.showToast('Thanks for sharing! 🚀');
          } catch (err) {
            if (err.name !== 'AbortError') this.copyPageLink(pageUrl);
          }
        });
      } else {
        nativeBtn.style.display = 'none'; // hide if browser doesn't support Web Share API
      }
    }

    // 2. WhatsApp
    const waBtn = document.getElementById('share-whatsapp-btn');
    if (waBtn) {
      waBtn.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + pageUrl)}`;
      waBtn.target = '_blank';
      waBtn.rel = 'noopener noreferrer';
    }

    // 3. Telegram
    const tgBtn = document.getElementById('share-telegram-btn');
    if (tgBtn) {
      tgBtn.href = `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(shareText)}`;
      tgBtn.target = '_blank';
      tgBtn.rel = 'noopener noreferrer';
    }

    // 4. X / Twitter
    const xBtn = document.getElementById('share-x-btn');
    if (xBtn) {
      xBtn.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(shareText)}`;
      xBtn.target = '_blank';
      xBtn.rel = 'noopener noreferrer';
    }

    // 5. Facebook
    const fbBtn = document.getElementById('share-facebook-btn');
    if (fbBtn) {
      fbBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
      fbBtn.target = '_blank';
      fbBtn.rel = 'noopener noreferrer';
    }

    // 6. Copy Link Button
    const copyLinkBtn = document.getElementById('share-copy-link-btn');
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', () => this.copyPageLink(pageUrl));
    }

    // 7. Master Copy Prompt Button
    const masterCopyBtn = document.getElementById('master-copy-prompt-btn');
    if (masterCopyBtn) {
      masterCopyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(promptData.prompt_content);
          const orig = masterCopyBtn.innerHTML;
          masterCopyBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Copied to Clipboard!</span>
          `;
          masterCopyBtn.classList.add('copied');
          window.showToast('Prompt Copied to Clipboard!', 'Ready to paste into ChatGPT, Gemini, or Midjourney', 'success');
          
          if (promptData.id) API.trackPromptCopy(promptData.id);

          setTimeout(() => {
            masterCopyBtn.innerHTML = orig;
            masterCopyBtn.classList.remove('copied');
          }, 2400);
        } catch (err) {
          window.showToast('Could not copy automatically. Please select text manually.', 'info');
        }
      });
    }

    // 8. User Rating System
    this.initRatingSystem(promptData.id);

    // 9. Report Prompt Modal
    this.initReportModal(promptData);
  },

  copyPageLink(url) {
    navigator.clipboard.writeText(url).then(() => {
      window.showToast('Page link copied to clipboard! 🔗');
    }).catch(() => {
      window.showToast('Failed to copy link', 'info');
    });
  },

  initRatingSystem(promptId) {
    const starContainer = document.getElementById('user-rating-stars');
    const scoreText = document.getElementById('user-rating-score');
    if (!starContainer) return;

    const storageKey = `prompt_rating_${promptId}`;
    let savedRating = localStorage.getItem(storageKey);

    if (savedRating) {
      this.updateStarVisuals(starContainer, parseInt(savedRating, 10));
      if (scoreText) scoreText.textContent = `You rated this ${savedRating}/5 stars`;
    }

    const stars = starContainer.querySelectorAll('.star-btn');
    stars.forEach(star => {
      star.addEventListener('click', () => {
        const rating = parseInt(star.dataset.star, 10);
        localStorage.setItem(storageKey, rating);
        this.updateStarVisuals(starContainer, rating);
        if (scoreText) scoreText.textContent = `Thank you! (${rating}/5 stars)`;
        window.showToast(`Rated ${rating} out of 5 stars! ⭐`);
      });
    });
  },

  updateStarVisuals(container, rating) {
    const stars = container.querySelectorAll('.star-btn');
    stars.forEach(s => {
      const val = parseInt(s.dataset.star, 10);
      if (val <= rating) s.classList.add('active');
      else s.classList.remove('active');
    });
  },

  initReportModal(promptData) {
    const openBtn = document.getElementById('btn-open-report');
    const modal = document.getElementById('report-modal');
    const closeBtn = document.getElementById('modal-close-report');
    const form = document.getElementById('report-prompt-form');

    if (!modal) return;

    if (openBtn) {
      openBtn.addEventListener('click', () => modal.classList.add('active'));
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        window.showToast('Report received. Our editors will review this prompt. Thank you!');
        modal.classList.remove('active');
        form.reset();
      });
    }
  }
};

