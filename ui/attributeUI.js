
/**
 * AttributeUI
 * 
 * 테스트 질문과 다양한 화답 방식을 렌더링하고 사용자 입력을 처리합니다.
 */

export class AttributeUI {
  constructor(containerId, onAnswer) {
    this.container = document.getElementById(containerId);
    this.onAnswer = onAnswer; // (attrId, value) -> void
  }

  render(question) {
    if (!question) return;

    this.container.innerHTML = '';
    
    // 외곽 컨테이너 (애니메이션용)
    const wrapper = document.createElement('div');
    wrapper.className = 'attr-q-wrapper animate-in';
    
    // 질문 헤더
    const header = document.createElement('div');
    header.className = 'attr-header';
    
    const stageBadge = document.createElement('span');
    stageBadge.className = 'attr-stage-badge';
    stageBadge.textContent = question.stage === 1 ? '1단계: 진단' : '2단계: 미세 조정';
    
    const title = document.createElement('h2');
    title.className = 'attr-title';
    title.textContent = question.question;
    
    header.appendChild(stageBadge);
    header.appendChild(title);
    wrapper.appendChild(header);

    // 질문 유형별 입력부 생성
    const inputArea = document.createElement('div');
    inputArea.className = 'attr-input-area';
    
    switch (question.type) {
      case 'likert5':
        this.renderLikert(inputArea, question, 5);
        break;
      case 'likert3':
        this.renderLikert(inputArea, question, 3);
        break;
      case 'diff':
        this.renderSemanticDiff(inputArea, question);
        break;
      case 'slider':
        this.renderSlider(inputArea, question);
        break;
    }
    
    wrapper.appendChild(inputArea);
    this.container.appendChild(wrapper);
  }

  // 리커트 척도 (3점 또는 5점 버튼)
  renderLikert(container, question, count) {
    const group = document.createElement('div');
    group.className = `likert-group count-${count}`;
    
    const values = count === 5 ? [-2, -1, 0, 1, 2] : [-1, 0, 1];
    
    values.forEach((val, idx) => {
      const btn = document.createElement('button');
      btn.className = 'btn-likert';
      if (val === 0) btn.classList.add('neutral');
      
      const label = document.createElement('span');
      label.className = 'likert-label';
      label.textContent = question.labels[idx];
      
      const circle = document.createElement('div');
      circle.className = 'likert-circle';
      
      btn.appendChild(circle);
      btn.appendChild(label);
      
      btn.onclick = () => {
        // 선택 효과
        btn.classList.add('selected');
        setTimeout(() => this.onAnswer(question.id, val), 400);
      };
      
      group.appendChild(btn);
    });
    
    container.appendChild(group);
  }

  // 의미 분별 척도 (Semantic Differential - 7단계 슬라이더)
  renderSemanticDiff(container, question) {
    const diffWrap = document.createElement('div');
    diffWrap.className = 'diff-wrap';
    
    const labelsRow = document.createElement('div');
    labelsRow.className = 'diff-labels-row';
    
    const leftLabel = document.createElement('span');
    leftLabel.className = 'diff-label left';
    leftLabel.textContent = question.labels[0];
    
    const rightLabel = document.createElement('span');
    rightLabel.className = 'diff-label right';
    rightLabel.textContent = question.labels[1];
    
    labelsRow.appendChild(leftLabel);
    labelsRow.appendChild(rightLabel);
    
    const track = document.createElement('div');
    track.className = 'diff-track';
    
    // 7개의 포인트 생성 (-3 to 3)
    const points = [-3, -2, -1, 0, 1, 2, 3];
    points.forEach(p => {
      const point = document.createElement('div');
      point.className = 'diff-point';
      if (p === 0) point.classList.add('center');
      
      point.onclick = () => {
        point.classList.add('active');
        // 매핑: -3~3 -> -2~2 (또는 엔진에서 처리)
        // 여기서는 -3~3을 그대로 보내고 엔진에서 스케일링하거나, 여기서 -2~2로 정규화
        const normalized = (p / 3) * 2; 
        setTimeout(() => this.onAnswer(question.id, normalized), 400);
      };
      
      track.appendChild(point);
    });
    
    diffWrap.appendChild(labelsRow);
    diffWrap.appendChild(track);
    container.appendChild(diffWrap);
    
    // 안내 멘트
    const hint = document.createElement('p');
    hint.className = 'attr-hint';
    hint.textContent = '가장 가깝게 느껴지는 곳을 선택하세요.';
    container.appendChild(hint);
  }

  // 자유 슬라이더 (0~100)
  renderSlider(container, question) {
    const sliderWrap = document.createElement('div');
    sliderWrap.className = 'slider-wrap-custom';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = '50';
    slider.className = 'custom-range-slider';
    
    const labelsRow = document.createElement('div');
    labelsRow.className = 'slider-labels-row';
    
    question.labels.forEach((l, idx) => {
        const span = document.createElement('span');
        span.textContent = l;
        labelsRow.appendChild(span);
    });
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-primary btn-confirm-slider';
    confirmBtn.textContent = '확인';
    confirmBtn.onclick = () => {
      this.onAnswer(question.id, parseInt(slider.value));
    };
    
    sliderWrap.appendChild(slider);
    sliderWrap.appendChild(labelsRow);
    sliderWrap.appendChild(confirmBtn);
    container.appendChild(sliderWrap);
  }
}
