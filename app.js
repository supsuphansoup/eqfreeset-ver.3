import { StepManager } from './ui/stepManager.js?v=11';
import { AudioEngine } from './engine/audioEngine.js?v=11';
import { SegmentDetector } from './engine/segmentDetector.js?v=11';
import { AttributeEngine, INTERNAL_BANDS, ATTRIBUTE_MAP } from './engine/attributeEngine.js?v=11';
import { AttributeUI } from './ui/attributeUI.js?v=11';
import { WaveformUI } from './ui/waveformUI.js?v=11';
import { ResultUI } from './ui/resultUI.js?v=11';

class App {
  constructor() {
    this.stepManager = new StepManager();
    this.audioEngine = new AudioEngine();
    this.waveformUI = new WaveformUI('waveform');
    this.resultUI = new ResultUI();
    
    this.attributeEngine = null;
    this.attributeUI = new AttributeUI('attr-test-container', (id, val) => this.handleAnswer(id, val));

    this.state = {
      eqType: '5band',
      file: null,
      fileName: '',
      segment: null,
      bandSegments: {}, // Cache for 11 internal bands
      selectedProfile: null
    };

    this.init();
  }

  async init() {
    this.bindStep0();
    this.bindStep1();
    this.bindStep2();
    this.bindStep5();
    this.bindMushra();

    this.waveformInitPromise = this.waveformUI.init();
  }

  bindStep0() {
    document.getElementById('btn-start').onclick = () => this.stepManager.goTo('step-1');
  }

  bindStep1() {
    const btn5 = document.getElementById('btn-5band');
    const btn10 = document.getElementById('btn-10band');
    
    const select = (type) => {
      this.state.eqType = type;
      btn5.classList.toggle('selected', type === '5band');
      btn10.classList.toggle('selected', type === '10band');
      setTimeout(() => this.stepManager.goTo('step-2'), 300);
    };

    btn5.onclick = () => select('5band');
    btn10.onclick = () => select('10band');
  }

  bindStep2() {
    const zone = document.getElementById('upload-zone');
    const input = document.getElementById('file-input');
    
    const handleFile = async (file) => {
      if (!file || !file.type.startsWith('audio/')) return;
      this.state.file = file;
      this.state.fileName = file.name;
      
      document.getElementById('upload-zone').classList.add('hidden');
      document.getElementById('upload-progress').classList.remove('hidden');
      
      try {
        const audioBuffer = await this.audioEngine.loadAudio(file);
        this.currentAudioBuffer = audioBuffer;
        this.prepareTest(file);
      } catch (err) {
        console.error(err);
      }
    };

    input.onchange = (e) => handleFile(e.target.files[0]);
    zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('drag-over'); };
    zone.ondragleave = () => zone.classList.remove('drag-over');
    zone.ondrop = (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    };
  }

  async prepareTest(file) {
    if (this.waveformInitPromise) await this.waveformInitPromise;
    this.waveformUI.loadBlob(file);
    
    this.waveformUI.wavesurfer.once('ready', async () => {
      document.getElementById('progress-bar').style.width = '100%';
      this.attributeEngine = new AttributeEngine();
      
      // 11개 내부 정밀 밴드 각각에 대한 하이라이트 분석 (캐싱)
      for (let i = 0; i < INTERNAL_BANDS.length; i++) {
          const hz = INTERNAL_BANDS[i].hz;
          document.getElementById('progress-text').textContent = `주파수 분석 중 (${i+1}/${INTERNAL_BANDS.length})`;
          const cand = await SegmentDetector.findBandSpecificSegment(this.currentAudioBuffer, hz, 10);
          this.state.bandSegments[hz] = cand;
      }
      
      this.startTest();
    });

    this.waveformUI.onRegionSelect((start, end) => {
        const segment = { offsetSec: start, durationSec: end - start };
        this.state.segment = segment;
        this.updateSelectedSegmentUI(start, end);
        if (this.audioEngine.isPlaying) this.audioEngine.playSegment(start, end - start);
    });
  }

  startTest() {
    this.audioEngine.setupFilters(INTERNAL_BANDS);
    this.stepManager.goTo('step-4');
    this.renderNextQuestion();
  }

  renderNextQuestion() {
    const q = this.attributeEngine.getCurrentQuestion();
    if (q) {
      // 밴드별 하이라이트 구간 자동 설정
      const attrConfig = ATTRIBUTE_MAP[q.id];
      if (attrConfig && attrConfig.bands) {
          const mainHz = attrConfig.bands[0];
          const cand = this.state.bandSegments[mainHz];
          if (cand) {
              this.state.segment = cand;
              this.waveformUI.addManualRegion(cand.offsetSec, cand.offsetSec + cand.durationSec);
              this.updateSelectedSegmentUI(cand.offsetSec, cand.offsetSec + cand.durationSec);
          }
      }

      this.attributeUI.render(q);
      this.applyCurrentEQ();
    } else {
      // Stage 2 종료 -> Stage 3 (MUSHRA) 진입
      this.startMushraStage();
    }
  }

  handleAnswer(id, val) {
    this.attributeEngine.recordResponse(id, val);
    this.renderNextQuestion();
  }

  applyCurrentEQ() {
    const gains = this.attributeEngine.getGains();
    this.audioEngine.applyEQ(gains);
    if (this.state.segment) {
        this.audioEngine.playSegment(this.state.segment.offsetSec, this.state.segment.durationSec);
    }
  }

  // --- Stage 3: Mushra-lite ---
  startMushraStage() {
    document.getElementById('attr-test-container').classList.add('hidden');
    document.getElementById('mushra-container').classList.remove('hidden');
    
    this.profiles = this.attributeEngine.getProfiles();
    this.state.selectedProfile = this.profiles[0]; // 기본 A 선택
    this.applyProfile(this.profiles[0]);
  }

  bindMushra() {
    const btns = ['btn-mushra-a', 'btn-mushra-b', 'btn-mushra-c'];
    btns.forEach((id, idx) => {
      const btn = document.getElementById(id);
      btn.onclick = () => {
        btns.forEach(bId => document.getElementById(bId).classList.remove('active'));
        btn.classList.add('active');
        this.state.selectedProfile = this.profiles[idx];
        this.applyProfile(this.profiles[idx]);
        document.getElementById('btn-mushra-confirm').disabled = false;
      };
    });

    document.getElementById('btn-mushra-confirm').onclick = () => {
      this.audioEngine.stop();
      this.showResults();
    };
  }

  applyProfile(profile) {
    this.audioEngine.applyEQ(profile.gains);
    if (this.state.segment) {
      this.audioEngine.playSegment(this.state.segment.offsetSec, this.state.segment.durationSec);
    }
  }

  showResults() {
    const formatted = this.attributeEngine.getFormattedResults(this.state.eqType, this.state.selectedProfile.gains);
    
    this.resultUI.render(formatted, {
      filename: this.state.fileName,
      eqType: this.state.eqType,
      duration: this.state.segment ? this.state.segment.durationSec : 10
    });
    
    this.stepManager.goTo('step-5');
  }

  bindStep5() {
    const btnPlay = document.getElementById('btn-demo-play');
    btnPlay.onclick = () => {
      if (this.audioEngine.isPlaying) {
        this.audioEngine.stop();
        btnPlay.textContent = '▶ 재생';
      } else {
        const isEqMode = document.getElementById('btn-demo-eq').classList.contains('active');
        const gains = isEqMode 
            ? this.state.selectedProfile.gains 
            : INTERNAL_BANDS.map(b => ({ hz: b.hz, gain: 0 }));
        this.audioEngine.applyEQ(gains);
        this.audioEngine.playSegment(this.state.segment.offsetSec, this.state.segment.durationSec);
        btnPlay.textContent = '⏸ 일시정지';
      }
    };

    const toggle = (mode) => {
      document.getElementById('btn-demo-raw').classList.toggle('active', mode === 'raw');
      document.getElementById('btn-demo-eq').classList.toggle('active', mode === 'eq');
      const gains = mode === 'raw' 
          ? INTERNAL_BANDS.map(b => ({ hz: b.hz, gain: 0 }))
          : this.state.selectedProfile.gains;
      this.audioEngine.applyEQ(gains);
    };

    document.getElementById('btn-demo-raw').onclick = () => toggle('raw');
    document.getElementById('btn-demo-eq').onclick = () => toggle('eq');

    document.getElementById('btn-retest').onclick = () => window.location.reload();
  }

  updateSelectedSegmentUI(start, end) {
      const display = document.getElementById('selected-segment-display');
      const min = Math.floor(start / 60);
      const sec = Math.floor(start % 60);
      const emin = Math.floor(end / 60);
      const esec = Math.floor(end % 60);
      display.textContent = `${min}:${sec.toString().padStart(2, '0')} ~ ${emin}:${esec.toString().padStart(2, '0')}`;
  }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new App(); });
