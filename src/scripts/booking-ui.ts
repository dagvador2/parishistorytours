/**
 * Tour selection and participant count UI logic.
 * Used on homepage booking section.
 */
export function initBookingUI() {
  // Tour selection
  const tourOptions = document.querySelectorAll('.tour-option');
  const selectedTourDiv = document.getElementById('selected-tour');
  const changeTourBtn = document.getElementById('change-tour');
  const stepParticipants = document.getElementById('step-participants');

  tourOptions.forEach((option) => {
    option.addEventListener('click', () => {
      // Hide other options with animation
      tourOptions.forEach((opt) => {
        if (opt !== option) {
          (opt as HTMLElement).style.opacity = '0';
          (opt as HTMLElement).style.transform = 'scale(0.8)';
          setTimeout(() => {
            (opt as HTMLElement).style.display = 'none';
          }, 300);
        }
      });

      // Animate selected option
      setTimeout(() => {
        option.classList.remove('md:w-1/2');
        option.classList.add('max-w-sm', 'mx-auto');
        (option as HTMLElement).style.transition = 'transform 0.6s ease-out';
        (option as HTMLElement).style.transform = 'scale(1.05)';
        setTimeout(() => {
          (option as HTMLElement).style.transform = 'scale(1)';
        }, 400);
      }, 300);

      // Show back button
      setTimeout(() => {
        if (selectedTourDiv) {
          selectedTourDiv.classList.remove('hidden');
          selectedTourDiv.style.opacity = '0';
          selectedTourDiv.style.transition = 'opacity 0.4s ease-in';
          setTimeout(() => {
            selectedTourDiv.style.opacity = '1';
          }, 50);
        }
      }, 700);

      // Show step 2
      setTimeout(() => {
        if (stepParticipants) {
          stepParticipants.classList.remove('hidden');
          stepParticipants.style.opacity = '0';
          stepParticipants.style.transition = 'opacity 0.5s ease-in';
          setTimeout(() => {
            stepParticipants.style.opacity = '1';
          }, 50);
        }
      }, 800);
    });
  });

  // Back button
  changeTourBtn?.addEventListener('click', () => {
    if (selectedTourDiv) {
      selectedTourDiv.style.opacity = '0';
      setTimeout(() => {
        selectedTourDiv.classList.add('hidden');
      }, 200);
    }

    tourOptions.forEach((opt) => {
      (opt as HTMLElement).style.display = 'block';
      (opt as HTMLElement).style.opacity = '0';
      (opt as HTMLElement).style.transform = 'scale(0.8)';
      opt.classList.add('md:w-1/2');
      opt.classList.remove('max-w-sm', 'mx-auto');
      setTimeout(() => {
        (opt as HTMLElement).style.opacity = '1';
        (opt as HTMLElement).style.transform = 'scale(1)';
      }, 100);
    });

    if (stepParticipants) {
      stepParticipants.style.opacity = '0';
      setTimeout(() => {
        stepParticipants.classList.add('hidden');
      }, 200);
    }
  });

  // Participant selection
  const participantOptions = document.querySelectorAll('.participant-option');
  const moreParticipantsSelect = document.getElementById('more-participants') as HTMLSelectElement;

  function selectParticipantCount(_count: number) {
    participantOptions.forEach((opt) => {
      opt.classList.remove('border-blue-500', 'bg-blue-600', 'text-white');
      opt.classList.add('border-gray-200', 'opacity-50');
      const numberDiv = opt.querySelector('div:first-child');
      const textDiv = opt.querySelector('div:last-child');
      if (numberDiv) numberDiv.classList.remove('text-white');
      if (textDiv) textDiv.classList.remove('text-white');
    });
    if (moreParticipantsSelect) {
      moreParticipantsSelect.value = '';
    }
  }

  participantOptions.forEach((option) => {
    option.addEventListener('click', () => {
      const count = parseInt((option as HTMLElement).dataset.count || '0');
      selectParticipantCount(count);

      option.classList.remove('border-gray-200', 'opacity-50');
      option.classList.add('border-blue-500', 'bg-blue-600', 'text-white');

      const numberDiv = option.querySelector('div:first-child');
      const textDiv = option.querySelector('div:last-child');
      if (numberDiv) numberDiv.classList.add('text-white');
      if (textDiv) textDiv.classList.add('text-white');
    });
  });

  moreParticipantsSelect?.addEventListener('change', () => {
    const count = parseInt(moreParticipantsSelect.value);
    if (count) {
      participantOptions.forEach((opt) => {
        opt.classList.remove('border-blue-500', 'bg-blue-600', 'text-white');
        opt.classList.add('border-gray-200', 'opacity-50');
        const numberDiv = opt.querySelector('div:first-child');
        const textDiv = opt.querySelector('div:last-child');
        if (numberDiv) numberDiv.classList.remove('text-white');
        if (textDiv) textDiv.classList.remove('text-white');
      });
    }
  });
}
