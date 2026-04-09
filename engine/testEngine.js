export const BANDS_5 = [
  { hz: 60, role: "저음 양감, 킥, 서브베이스" },
  { hz: 230, role: "중저역 두께, 탁함 제어" },
  { hz: 910, role: "중역 중심감, 보컬 본체" },
  { hz: 3600, role: "존재감, 선명도" },
  { hz: 14000, role: "공기감, 밝기" }
];

export const BANDS_10 = [
  { hz: 31, role: "초저역" },
  { hz: 62, role: "저역 타격감" },
  { hz: 125, role: "저역 두께" },
  { hz: 250, role: "중저역 탁함" },
  { hz: 500, role: "중역 바디" },
  { hz: 1000, role: "중역 중심" },
  { hz: 2000, role: "보컬 존재감" },
  { hz: 4000, role: "선명도" },
  { hz: 8000, role: "고음 밝기" },
  { hz: 16000, role: "공기감" }
];

export class TestEngine {
  constructor(eqType = '5band') {
    this.bands = eqType === '10band' ? BANDS_10 : BANDS_5;
    this.currentBandIdx = 0;
    
    this.testState = this.bands.map(band => ({
      hz: band.hz,
      role: band.role,
      minGain: -3,
      maxGain: 6,
      currentStep: 0,
      maxSteps: 3, 
      finalGain: 0
    }));
  }

  getTotalQuestions() {
    return this.bands.length * 3; // 3 steps per band
  }

  getCurrentQuestionNumber() {
    let count = 0;
    for (let i = 0; i < this.currentBandIdx; i++) {
        count += this.testState[i].maxSteps;
    }
    count += this.testState[this.currentBandIdx].currentStep + 1;
    return count;
  }

  isFinished() {
    return this.currentBandIdx >= this.bands.length;
  }

  getCurrentQuestion() {
    if (this.isFinished()) return null;
    const state = this.testState[this.currentBandIdx];
    
    let a, b;
    if (state.currentStep === 0) {
      a = -3; 
      b = 6;
    } else if (state.currentStep === 1) {
      a = state.minGain; 
      b = state.maxGain;
    } else if (state.currentStep === 2) {
      // 2회차 결과(min, max 폭 3dB) 비교
      a = state.minGain;
      b = state.maxGain;
    }
    
    return {
      hz: state.hz,
      role: state.role,
      optionA: { gain: a },
      optionB: { gain: b }
    };
  }

  recordAnswer(chosenOption) { // 'A' or 'B'
    if (this.isFinished()) return;
    const state = this.testState[this.currentBandIdx];
    const q = this.getCurrentQuestion();
    
    const chosenGain = chosenOption === 'A' ? q.optionA.gain : q.optionB.gain;
    
    if (state.currentStep === 0) {
      if (chosenGain > 0) { state.minGain = 0; state.maxGain = 6; }
      else { state.minGain = -3; state.maxGain = 0; }
    } else if (state.currentStep === 1) {
      const mid = (state.minGain + state.maxGain) / 2;
      if (chosenGain === state.maxGain) { state.minGain = mid; }
      else { state.maxGain = mid; }
    } else {
      // 3회차: 최종 선택
      state.finalGain = chosenGain;
    }
    
    state.currentStep++;
    
    if (state.currentStep >= state.maxSteps) {
      this.currentBandIdx++;
    }
  }

  getResults() {
    return this.testState.map(s => ({
      hz: s.hz,
      role: s.role,
      gain: s.finalGain || 0
    }));
  }
}
