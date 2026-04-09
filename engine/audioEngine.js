export class AudioEngine {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.audioBuffer = null;
    this.filters = [];
    this.gainNode = this.ctx.createGain();
    this.sourceNode = null;
    
    this.gainNode.connect(this.ctx.destination);
    
    this.isPlaying = false;
    this.currentOffset = 0;
    this.currentDuration = 0;
  }

  async loadAudio(fileOrUrl) {
    let arrayBuffer;
    if (fileOrUrl instanceof File) {
      arrayBuffer = await fileOrUrl.arrayBuffer();
    } else {
      const resp = await fetch(fileOrUrl);
      arrayBuffer = await resp.arrayBuffer();
    }
    
    this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    return this.audioBuffer;
  }

  setupFilters(bands) {
    // bands: [{hz: 60, Q: 1.41}, ...]
    this.filters.forEach(f => f.disconnect());
    
    const newFilters = [];
    bands.forEach((band, idx) => {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = band.hz;
      filter.Q.value = band.Q || 1.41;
      filter.gain.value = 0;

      if (idx > 0) {
        newFilters[idx - 1].connect(filter);
      }
      newFilters.push(filter);
    });
    this.filters = newFilters;

    if (this.filters.length > 0) {
      this.filters[this.filters.length - 1].connect(this.gainNode);
    }
  }

  applyEQ(bandGains) {
    // bandGains: [{hz: 60, gain: 3}, ...]
    bandGains.forEach(bg => {
      const filter = this.filters.find(f => f.frequency.value === bg.hz);
      if (filter) {
        // 부드러운 전환을 위해 rampToValue 사용
        filter.gain.setTargetAtTime(bg.gain, this.ctx.currentTime, 0.03);
      }
    });
  }

  playSegment(offset, duration) {
    this.stopWrapper();

    this.currentOffset = offset;
    this.currentDuration = duration;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    
    if (this.filters.length > 0) {
      this.sourceNode.connect(this.filters[0]);
    } else {
      this.sourceNode.connect(this.gainNode);
    }

    this.sourceNode.start(0, offset, duration);
    this.isPlaying = true;

    // 반복 재생 설정
    this.sourceNode.onended = () => {
      if (this.isPlaying) {
        // 약간의 갭을 두고 다시 재생
        setTimeout(() => {
          if (this.isPlaying) {
            this.playSegment(this.currentOffset, this.currentDuration);
          }
        }, 100);
      }
    };
  }

  stopWrapper() {
    this.isPlaying = false;
    if (this.sourceNode) {
      this.sourceNode.onended = null;
      try {
        this.sourceNode.stop();
      } catch (e) {
        // 이미 종료된 경우 무시
      }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
  }

  stop() {
    this.stopWrapper();
  }
}
