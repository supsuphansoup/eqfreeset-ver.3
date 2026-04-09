/**
 * 주파수 대역별 자동 하이라이트(코러스/피크) 추출 엔진
 */
export class SegmentDetector {
  /**
   * 해당 주파수(Hz) 소리가 가장 강한 구간을 자동으로 찾아냅니다.
   * @param {AudioBuffer} audioBuffer
   * @param {number} hz 타겟 주파수
   * @param {number} desiredDurationSec 원하는 구간 길이(초)
   */
  static async findBandSpecificSegment(audioBuffer, hz, desiredDurationSec = 10) {
    const duration = audioBuffer.duration;
    const sampleRate = audioBuffer.sampleRate;
    
    // 오프라인 오디오 컨텍스트 렌더링 (즉시 계산)
    const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, sampleRate * duration, sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    
    // 타겟 주파수 대역만 통과시키는 필터
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = hz;
    filter.Q.value = 1.0;
    
    source.connect(filter);
    filter.connect(ctx.destination);
    source.start();
    
    const renderedBuffer = await ctx.startRendering();
    const channelData = renderedBuffer.getChannelData(0);
    
    // 에너지 스캔 (초격차 서브샘플링: 10배 건너뜀)
    const windowSizeSec = 0.2;
    const windowSizeSamples = Math.floor(sampleRate * windowSizeSec);
    const totalWindows = Math.floor(channelData.length / windowSizeSamples);
    
    const energies = new Float32Array(totalWindows);
    const step = Math.max(1, Math.floor(windowSizeSamples / 10)); 
    
    for (let w = 0; w < totalWindows; w++) {
      let sumSquares = 0;
      let count = 0;
      const start = w * windowSizeSamples;
      for (let i = 0; i < windowSizeSamples; i += step) {
        const val = channelData[start + i];
        sumSquares += val * val;
        count++;
      }
      energies[w] = Math.sqrt(sumSquares / count);
    }
    
    // 지정된 초(10초) 길이만큼의 슬라이딩 윈도우로 묶어 가장 에너지가 높은 곳 선택
    const segmentWindows = Math.floor(desiredDurationSec / windowSizeSec);
    const minOffsetWindows = Math.floor(5 / windowSizeSec); // 첫 5초 배제 (페이드인 등)
    const paddingEndWindows = Math.floor(5 / windowSizeSec); // 끝부분 5초 배제
    
    let bestScore = -1;
    let bestOffset = 0;
    
    for (let i = minOffsetWindows; i < totalWindows - segmentWindows - paddingEndWindows; i++) {
        let currentEnergySum = 0;
        for (let j = 0; j < segmentWindows; j++) {
            currentEnergySum += energies[i + j];
        }
        if (currentEnergySum > bestScore) {
             bestScore = currentEnergySum;
             bestOffset = i * windowSizeSec;
        }
    }
    
    // 만약 곡이 10초보다 극도로 짧은 등 예외 상황
    if (bestScore === -1) {
        return { offsetSec: 0, durationSec: Math.min(duration, desiredDurationSec), score: 0 };
    }
    
    return {
        offsetSec: bestOffset,
        durationSec: desiredDurationSec,
        score: bestScore
    };
  }
}
