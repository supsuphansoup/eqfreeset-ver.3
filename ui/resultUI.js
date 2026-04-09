export class ResultUI {
  constructor() {
    this.tableBody = document.getElementById('result-tbody');
    this.visualContainer = document.getElementById('result-eq-visual');
    this.btnCopy = document.getElementById('btn-copy');
    this.copyToast = document.getElementById('copy-toast');
  }

  render(results, meta) {
    // meta: { filename, eqType, duration }
    document.getElementById('r-filename').textContent = meta.filename;
    document.getElementById('r-eqtype').textContent = meta.eqType === '10band' ? '10밴드' : '5밴드';
    document.getElementById('r-segment').textContent = `${Math.round(meta.duration)}초 구간`;

    this.renderTable(results);
    this.renderVisual(results);
    this.setupCopy(results);
  }

  renderTable(results) {
    this.tableBody.innerHTML = '';
    
    results.forEach(band => {
      const tr = document.createElement('tr');
      
      const hzStr = band.hz >= 1000 ? `${band.hz/1000}kHz` : `${band.hz}Hz`;
      let gainStr = `${band.gain > 0 ? '+' : ''}${band.gain} dB`;
      let dirClass = band.gain > 0 ? 'up' : (band.gain < 0 ? 'down' : 'flat');
      let dirStr = band.gain > 0 ? '▲ 올림' : (band.gain < 0 ? '▼ 내림' : '─ 유지');
      let valClass = band.gain > 0 ? 'positive' : (band.gain < 0 ? 'negative' : 'neutral');

      tr.innerHTML = `
        <td class="td-hz">${hzStr}</td>
        <td>${band.role}</td>
        <td class="td-db ${valClass}">${gainStr}</td>
        <td class="td-dir ${dirClass}">${dirStr}</td>
      `;
      this.tableBody.appendChild(tr);
    });
  }

  renderVisual(results) {
    this.visualContainer.innerHTML = '';
    
    // gain range: -6 to +6. map to 0% ~ 100% heights
    results.forEach(band => {
      const wrap = document.createElement('div');
      wrap.className = 'result-eq-bar-wrap';
      
      const hzStr = band.hz >= 1000 ? `${band.hz/1000}k` : `${band.hz}`;
      
      let topH = 0;
      let botH = 0;
      
      if (band.gain > 0) {
        topH = (band.gain / 6) * 100;
      } else if (band.gain < 0) {
        botH = (Math.abs(band.gain) / 6) * 100;
      }
      
      const topColor = `linear-gradient(to top, var(--violet), var(--cyan))`;
      const botColor = `linear-gradient(to bottom, var(--pink), rgba(236,72,153,0.3))`;
      
      wrap.innerHTML = `
        <div class="result-eq-db" style="opacity: ${band.gain > 0 ? 1 : 0}">+${Math.max(0, band.gain)}</div>
        <div class="result-eq-bar-inner">
           <div style="flex:1; display:flex; flex-direction:column; justify-content:flex-end;">
              <div class="result-bar-top" style="height: ${topH}%; background: ${topColor}"></div>
           </div>
           <div class="result-bar-mid"></div>
           <div style="flex:1; display:flex; flex-direction:column; justify-content:flex-start;">
              <div class="result-bar-bot" style="height: ${botH}%; background: ${botColor}"></div>
           </div>
        </div>
        <div class="result-eq-db" style="opacity: ${band.gain < 0 ? 1 : 0}">${Math.min(0, band.gain)}</div>
        <div class="result-eq-label">${hzStr}</div>
      `;
      
      this.visualContainer.appendChild(wrap);
    });
  }

  setupCopy(results) {
    this.btnCopy.onclick = () => {
      let text = `🎧 내 EQ 설정\n`;
      results.forEach(band => {
        const hzStr = band.hz >= 1000 ? `${band.hz/1000}kHz` : `${band.hz}Hz`;
        const gainStr = `${band.gain > 0 ? '+' : ''}${band.gain}dB`;
        text += `- ${hzStr}: ${gainStr}\n`;
      });
      
      navigator.clipboard.writeText(text).then(() => {
        this.copyToast.classList.remove('hidden');
        setTimeout(() => this.copyToast.classList.add('hidden'), 2500);
      }).catch(err => {
        alert('복사 실패: ' + err);
      });
    };
  }
}
