/**
 * Waveform UI Handler using WaveSurfer.js + Regions
 */
export class WaveformUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.wavesurfer = null;
    this.regions = null;
    this.selectedRegion = null;
  }

  async init() {
    // Dynamic import to avoid blocking load
    const WaveSurfer = (await import('https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.esm.js')).default;
    const RegionsPlugin = (await import('https://unpkg.com/wavesurfer.js@7/dist/plugins/regions.esm.js')).default;

    this.wavesurfer = WaveSurfer.create({
      container: this.container,
      waveColor: 'rgba(124, 58, 237, 0.4)',
      progressColor: '#06b6d4',
      cursorColor: '#f1f5f9',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 80,
      normalize: true
    });

    this.regions = this.wavesurfer.registerPlugin(RegionsPlugin.create());

    // Only allow one region to be active/selected at a time
    this.regions.on('region-created', region => {
        // We handle selection manually
    });
    
    this.regions.on('region-clicked', (region, e) => {
        e.stopPropagation();
        this.selectRegion(region);
    });

    this.regions.on('region-updated', region => {
        if(this.onRegionUpdateCallback) {
            this.onRegionUpdateCallback(region.start, region.end);
        }
    });
    
    return this.wavesurfer;
  }

  loadBlob(blob) {
    if(this.wavesurfer) {
        this.wavesurfer.loadBlob(blob);
    }
  }

  clear() {
      if(this.regions) this.regions.clearRegions();
  }

  addCandidates(candidates) {
    this.clear();
    
    candidates.forEach((cand, idx) => {
        const isFirst = idx === 0;
        const color = isFirst ? 'rgba(34, 211, 238, 0.3)' : 'rgba(124, 58, 237, 0.2)'; // Cyan for 1st, Violet for others
        
        const r = this.regions.addRegion({
            start: cand.offsetSec,
            end: cand.offsetSec + cand.durationSec,
            color: color,
            drag: true,
            resize: true,
            id: `cand-${idx}`
        });

        if (isFirst) {
            this.selectRegion(r);
        }
    });
  }

  addManualRegion(start, end) {
      this.clear();
      const r = this.regions.addRegion({
          start,
          end,
          color: 'rgba(236, 72, 153, 0.3)', // Pink for manual
          drag: true,
          resize: true,
          id: 'manual'
      });
      this.selectRegion(r);
  }

  selectRegion(region) {
      this.selectedRegion = region;
      // Visual feedback
      this.regions.getRegions().forEach(r => {
         if (r === region) {
             r.setOptions({ color: 'rgba(34, 211, 238, 0.4)' }); // Highlighted Cyan
         } else {
             r.setOptions({ color: 'rgba(124, 58, 237, 0.15)' }); // Faded Violet
         }
      });
      
      if(this.onRegionSelectCallback) {
          this.onRegionSelectCallback(region.start, region.end);
      }
  }

  onRegionSelect(cb) {
      this.onRegionSelectCallback = cb;
  }

  onRegionUpdate(cb) {
      this.onRegionUpdateCallback = cb;
  }

  getSelectedSegment() {
      if (!this.selectedRegion) return null;
      return {
          offsetSec: this.selectedRegion.start,
          durationSec: this.selectedRegion.end - this.selectedRegion.start
      };
  }
}
