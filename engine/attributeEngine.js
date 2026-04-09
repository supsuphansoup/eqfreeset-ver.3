
/**
 * AttributeEngine
 * 
 * 지각 속성(Semantic Attributes)을 기반으로 EQ 게인 값을 계산하고
 * 테스트 단계를 관리하는 엔진입니다.
 */

export const INTERNAL_BANDS = [
  { hz: 60,   label: "60Hz" },
  { hz: 125,  label: "125Hz" },
  { hz: 230,  label: "230Hz" },
  { hz: 500,  label: "500Hz" },
  { hz: 910,  label: "910Hz" },
  { hz: 1000, label: "1kHz" },
  { hz: 2000, label: "2kHz" },
  { hz: 4000, label: "4kHz" },
  { hz: 8000, label: "8kHz" },
  { hz: 14000,label: "14kHz" },
  { hz: 16000,label: "16kHz" }
];

export const ATTRIBUTE_MAP = {
  // --- Stage 1: Diagnostic ---
  diag_low: { bands: [60, 125, 230], stepSize: 1.5, type: 'scale' },
  diag_vocal: { bands: [910, 1000, 2000], stepSize: 1.5, type: 'scale' },
  diag_high: { bands: [4000, 8000, 14000], stepSize: 1.5, type: 'scale' },

  // --- Stage 2: Fine-Tuning ---
  // 저역
  low_quantity: { bands: [60, 125], stepSize: 2.0, type: 'scale' },
  low_muddiness: { bands: [230], stepSize: 1.5, type: 'diff', inverse: true }, 
  low_punch: { 
    bands: [60, 230], 
    weights: { 60: 1.0, 230: -0.5 }, 
    stepSize: 1.5, 
    type: 'scale' 
  },
  // 중저역
  warmth_vs_muffled: { bands: [230, 500], stepSize: 1.5, type: 'diff' },
  // 중역
  vocal_distance: { bands: [910, 1000, 2000], stepSize: 1.5, type: 'scale' },
  thickness: { bands: [500, 910], stepSize: 1.5, type: 'diff' },
  // 상중역
  clarity: { bands: [2000, 4000], stepSize: 1.5, type: 'scale' },
  fatigue: { bands: [4000], stepSize: 1.5, type: 'diff', inverse: true },
  // 고역
  brightness: { bands: [4000, 8000], stepSize: 1.5, type: 'scale' },
  sibilance: { bands: [8000], stepSize: 1.5, type: 'diff', inverse: true },
  harshness: { bands: [4000, 8000], stepSize: 1.5, type: 'scale', inverse: true },
  // 초고역
  airness: { bands: [14000, 16000], stepSize: 2.0, type: 'slider' }
};

export class AttributeEngine {
  constructor() {
    this.responses = {}; // attributeId -> value (-2 to 2 or slider value)
    this.stage = 1; // 1: Diagnostic, 2: Fine-Tuning, 3: Comparison
    this.currentAttrIdx = 0;
    
    // 진행할 속성 목록 정의 (기획서 순서)
    this.testFlow = [
      { id: 'diag_low', stage: 1, question: "저음의 양은 어떤가요?", type: 'likert5', labels: ['너무 적음', '조금 적음', '적당함', '조금 많음', '너무 많음'] },
      { id: 'diag_vocal', stage: 1, question: "보컬의 거리는 어떤가요?", type: 'likert5', labels: ['너무 멂', '조금 멂', '적당함', '조금 가까움', '너무 가까움'] },
      { id: 'diag_high', stage: 1, question: "고음의 밝기는 어떤가요?", type: 'likert5', labels: ['너무 어두움', '조금 어두움', '적당함', '조금 밝음', '너무 밝음'] },
      
      // Stage 2
      { id: 'low_quantity', stage: 2, question: "저음의 양(무게감)을 조절해볼까요?", type: 'likert5', labels: ['훨씬 부족', '조금 부족', '적당함', '조금 많음', '너무 많음'] },
      { id: 'low_muddiness', stage: 2, question: "저음이 깔끔한가요, 먹먹한가요?", type: 'diff', labels: ['깔끔함', '먹먹함'] },
      { id: 'low_punch', stage: 2, question: "킥 드럼의 타격감이 어떤가요?", type: 'likert3', labels: ['단단함', '중간', '퍼짐'] },
      
      { id: 'warmth_vs_muffled', stage: 2, question: "소리의 질감이 어떤가요?", type: 'diff', labels: ['따뜻하지만 깔끔', '답답하고 붕붕거림'] },
      
      { id: 'vocal_distance', stage: 2, question: "보컬이 들리는 위치가 어떤가요?", type: 'likert5', labels: ['너무 멀다', '약간 멀다', '적당함', '약간 가깝다', '너무 가깝다'] },
      { id: 'thickness', stage: 2, question: "보컬과 악기의 두께감이 어떤가요?", type: 'diff', labels: ['얇음', '두꺼움'] },
      
      { id: 'clarity', stage: 2, question: "소리의 선명도는 어떤가요?", type: 'likert5', labels: ['흐릿함', '조금 흐릿', '적당함', '또렷함', '매우 또렷'] },
      { id: 'fatigue', stage: 2, question: "오래 들었을 때 편안한가요?", type: 'diff', labels: ['편안함', '피곤함'] },
      
      { id: 'brightness', stage: 2, question: "전체적인 밝기는 어떤가요?", type: 'likert5', labels: ['어두움', '조금 어둠', '적당함', '밝음', '매우 밝음'] },
      { id: 'sibilance', stage: 2, question: "치찰음(ㅅ, ㅈ 소리)이 거슬리나요?", type: 'diff', labels: ['괜찮음', '거슬림'] },
      
      { id: 'airness', stage: 2, question: "소리의 개방감(공기감)을 조절해보세요.", type: 'slider', labels: ['답답함', '개방적'] }
    ];
  }

  getCurrentQuestion() {
    if (this.currentAttrIdx >= this.testFlow.length) return null;
    return this.testFlow[this.currentAttrIdx];
  }

  recordResponse(attrId, value) {
    this.responses[attrId] = value;
    this.currentAttrIdx++;
    
    // Stage 전환 체크
    if (this.getCurrentQuestion() && this.getCurrentQuestion().stage !== this.stage) {
      this.stage = this.getCurrentQuestion().stage;
    }
  }

  getGains(weightSet = null) {
    const gains = {};
    INTERNAL_BANDS.forEach(b => gains[b.hz] = 0);

    for (const [attrId, value] of Object.entries(this.responses)) {
      const config = ATTRIBUTE_MAP[attrId];
      if (!config) continue;

      let multiplier = value; 
      // 3점 리커트(-1, 0, 1) 또는 5점(-2, -1, 0, 1, 2) 기준
      // 슬라이더는 0~100 -> -2~2로 변환 필요 (필요시)
      if (config.type === 'slider') {
        multiplier = (value - 50) / 25; // 0~100 -> -2~2
      }

      if (config.inverse) multiplier *= -1;

      // 가중치 적용 (Stage 3용)
      let customWeight = 1.0;
      if (weightSet) {
          if (weightSet.type === 'bass' && attrId.startsWith('low')) customWeight = 1.4;
          if (weightSet.type === 'bass' && (attrId.includes('high') || attrId.includes('bright'))) customWeight = 0.8;
          if (weightSet.type === 'treble' && (attrId.includes('high') || attrId.includes('bright') || attrId === 'clarity')) customWeight = 1.4;
          if (weightSet.type === 'treble' && attrId.startsWith('low')) customWeight = 0.8;
      }

      config.bands.forEach(hz => {
        const bandWeight = (config.weights && config.weights[hz]) || 1.0;
        gains[hz] += multiplier * config.stepSize * bandWeight * customWeight;
      });
    }

    return Object.entries(gains).map(([hz, gain]) => ({ hz: parseInt(hz), gain }));
  }

  // Stage 3용 프로필 생성
  getProfiles() {
    return [
      { id: 'P1', name: '표준 (Standard)', gains: this.getGains(null) },
      { id: 'P2', name: '저음 보강 (Warm/Bass)', gains: this.getGains({ type: 'bass' }) },
      { id: 'P3', name: '고음 선명 (Clear/Bright)', gains: this.getGains({ type: 'treble' }) }
    ];
  }

  // 5/10밴드 포맷 변환 루틴
  getFormattedResults(type = '5band', customGains = null) {
    const rawGains = customGains || this.getGains();
    
    if (type === '10band') {
      const targetHz = [
        { hz: 31, role: "초저역" },
        { hz: 62, role: "저역 타격감" },
        { hz: 125, role: "저역 두께" },
        { hz: 250, role: "중저역 탁함" },
        { hz: 500, role: "중역 바디" },
        { hz: 1000, role: "중역 중심" },
        { hz: 2000, role: "보컬 존재감" },
        { hz: 4000, role: "선명도/또렷함" },
        { hz: 8000, role: "고음 밝기" },
        { hz: 16000, role: "초고역 공기감" }
      ];
      return targetHz.map(t => {
        const matching = rawGains.find(r => Math.abs(r.hz - t.hz) < 100);
        return { hz: t.hz, role: t.role, gain: matching ? this.round05(matching.gain) : 0 };
      });
    } else {
      const groups = [
        { out: 60, src: [60, 125], role: "저역 양감 및 무게" },
        { out: 230, src: [230, 500], role: "중저역 밀도 및 탁함" },
        { out: 910, src: [910, 1000, 2000], role: "중역 보컬 중심" },
        { out: 3600, src: [4000], role: "상중역 선명도" },
        { out: 14000, src: [8000, 14000, 16000], role: "고역 밝기 및 공기감" }
      ];
      
      return groups.map(g => {
        const sum = g.src.reduce((acc, hz) => {
          const match = rawGains.find(r => r.hz === hz);
          return acc + (match ? match.gain : 0);
        }, 0);
        return { hz: g.out, role: g.role, gain: this.round05(sum / g.src.length) };
      });
    }
  }

  round05(val) {
    return Math.round(val * 2) / 2;
  }
}
