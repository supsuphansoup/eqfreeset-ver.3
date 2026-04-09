export class StepManager {
  constructor() {
    this.steps = document.querySelectorAll('.step');
    this.currentStepIndex = 0;
  }

  goTo(targetStepId) {
    const targetIndex = Array.from(this.steps).findIndex(s => s.id === targetStepId);
    if (targetIndex === -1) return;

    // 현재 스텝 애니메이션 아웃
    const currentStep = this.steps[this.currentStepIndex];
    if (currentStep) {
      currentStep.classList.remove('active');
      currentStep.classList.add('leaving');
      
      setTimeout(() => {
          currentStep.classList.remove('leaving');
      }, 450); // CSS transition delay
    }

    // 대상 스텝 애니메이션 인
    this.currentStepIndex = targetIndex;
    const targetStep = this.steps[this.currentStepIndex];
    
    // 강제 리플로우
    void targetStep.offsetWidth;
    
    targetStep.classList.add('active');
    targetStep.classList.remove('leaving');
  }

  showToast(message, duration = 3000) {
      const toast = document.getElementById('toast-global');
      if (!toast) return;
      
      toast.textContent = message;
      toast.classList.remove('hidden');
      
      clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
          toast.classList.add('hidden');
      }, duration);
  }
}
